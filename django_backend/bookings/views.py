from datetime import datetime, time, timedelta

from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import serializers, viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from drf_spectacular.utils import OpenApiParameter, extend_schema, inline_serializer
from core.audit import create_audit_log
from core.permissions import is_admin_or_moderator, is_partner
from .models import Booking
from .pricing import quote_booking
from .serializers import BookingListQuerySerializer, BookingQuoteSerializer, BookingSerializer
from .services import (
    can_manage_place_availability,
    transition_booking_status,
    validate_block_creation,
)
from places.models import Place
from places.visibility import is_place_publicly_visible
from notifications.services import notify_booking_event


BLOCKING_STATUSES = ('pending', 'confirmed', 'completed', 'blocked')
HOURLY_SLOT_LABELS = [f'{hour:02d}:00' for hour in range(24)]


def _make_aware_datetime(date_value, time_value):
    value = datetime.combine(date_value, time_value)
    if timezone.is_naive(value):
        return timezone.make_aware(value, timezone.get_current_timezone())
    return value


def _date_range(start_date, end_date):
    cursor = start_date
    while cursor <= end_date:
        yield cursor
        cursor += timedelta(days=1)


def _booking_blocks_full_day(booking, day):
    if booking.duration_type != 'hourly':
        return True

    local_start = timezone.localtime(booking.start_time)
    local_end = timezone.localtime(booking.end_time)
    day_start = _make_aware_datetime(day, time.min)
    next_day_start = _make_aware_datetime(day + timedelta(days=1), time.min)
    return local_start <= day_start and local_end >= next_day_start

class BookingViewSet(viewsets.ModelViewSet):
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['allow_admin_booking_assignment'] = is_admin_or_moderator(self.request.user)
        context['allow_past_booking_interval'] = is_admin_or_moderator(self.request.user)
        if self.action == 'create':
            context['allow_admin_manual_booking'] = is_admin_or_moderator(self.request.user)
            context['allow_partner_availability_block'] = is_partner(self.request.user)
        return context

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Booking.objects.none()

        query_serializer = BookingListQuerySerializer(data=self.request.query_params)
        query_serializer.is_valid(raise_exception=True)
        query_params = query_serializer.validated_data
        scope = query_params.get('scope', '')

        # Admin default remains all bookings so existing filters keep working.
        if is_admin_or_moderator(user):
            if scope == 'mine':
                queryset = Booking.objects.filter(client=user)
            elif scope == 'host':
                queryset = Booking.objects.filter(place__owner=user)
            else:
                queryset = Booking.objects.all()

        elif is_partner(user):
            if scope == 'mine':
                queryset = Booking.objects.filter(client=user)
            elif scope == 'host':
                queryset = Booking.objects.filter(place__owner=user)
            else:
                queryset = Booking.objects.filter(
                    Q(client=user) | Q(place__owner=user)
                ).distinct()

        else:
            if scope == 'host':
                raise PermissionDenied('Host booking scope requires partner access.')
            queryset = Booking.objects.filter(client=user)

        return self.apply_query_filters(queryset, query_params).order_by('-start_time')

    def apply_query_filters(self, queryset, params):
        place = params.get('place')
        if place:
            queryset = queryset.filter(place_id=place)

        status = params.get('status')
        if status:
            queryset = queryset.filter(status=status)

        client = params.get('client')
        if client:
            queryset = queryset.filter(client_id=client)

        search = params.get('search', '')
        if search:
            queryset = queryset.filter(
                Q(client__first_name__icontains=search)
                | Q(client__last_name__icontains=search)
                | Q(client__username__icontains=search)
                | Q(client__phone_number__icontains=search)
                | Q(place__title__icontains=search)
            )

        date_from = params.get('date_from')
        if date_from:
            queryset = queryset.filter(start_time__date__gte=date_from)

        date_to = params.get('date_to')
        if date_to:
            queryset = queryset.filter(start_time__date__lte=date_to)

        return queryset

    def _overlapping_bookings(self, place, start_time, end_time, exclude_pk=None):
        queryset = Booking.objects.filter(
            place=place,
            status__in=BLOCKING_STATUSES,
            start_time__lt=end_time,
            end_time__gt=start_time,
        )
        if exclude_pk:
            queryset = queryset.exclude(pk=exclude_pk)
        return queryset

    def _validate_booking_access_and_overlap(self, serializer):
        place = serializer.validated_data.get('place') or getattr(serializer.instance, 'place', None)
        start_time = serializer.validated_data.get('start_time') or getattr(serializer.instance, 'start_time', None)
        end_time = serializer.validated_data.get('end_time') or getattr(serializer.instance, 'end_time', None)
        booking_status = serializer.validated_data.get(
            'status',
            getattr(serializer.instance, 'status', 'pending')
        )

        if not place:
            return

        is_manager = is_admin_or_moderator(self.request.user)
        is_owner_block = (
            booking_status == 'blocked'
            and can_manage_place_availability(self.request.user, place)
        )
        is_status_action = serializer.context.get('allow_booking_status_action', False)
        if (
            not is_manager
            and not is_owner_block
            and not is_status_action
            and not is_place_publicly_visible(place)
        ):
            raise ValidationError({
                'place': ['This place is not available for booking.']
            })

        if not start_time or not end_time:
            return

        if booking_status not in BLOCKING_STATUSES:
            return

        if self._overlapping_bookings(place, start_time, end_time, getattr(serializer.instance, 'pk', None)).exists():
            raise ValidationError({
                'non_field_errors': ['Place is unavailable for the selected time range.']
            })

    def _lock_place(self, serializer):
        """Serialize writes per place so two requests cannot book one slot."""
        place = serializer.validated_data.get('place') or getattr(serializer.instance, 'place', None)
        if place is not None:
            Place.objects.select_for_update().only('id').get(pk=place.pk)

    def _apply_server_pricing(self, serializer, save_kwargs, *, is_manager):
        booking_status = serializer.validated_data.get(
            'status',
            getattr(serializer.instance, 'status', 'pending'),
        )
        if booking_status == 'blocked':
            save_kwargs.update(amount=0, pricing={})
            return
        if is_manager and 'amount' in serializer.validated_data:
            save_kwargs['pricing'] = {'manual': True}
            return

        place = serializer.validated_data.get('place') or serializer.instance.place
        quote = quote_booking(
            place,
            duration_type=serializer.validated_data.get('duration_type') or serializer.instance.duration_type,
            start_time=serializer.validated_data.get('start_time') or serializer.instance.start_time,
            end_time=serializer.validated_data.get('end_time') or serializer.instance.end_time,
        )
        save_kwargs.update(amount=quote.amount, currency=quote.currency, pricing=quote.as_dict())

    @transaction.atomic
    def perform_create(self, serializer):
        is_manager = is_admin_or_moderator(self.request.user)
        client = serializer.validated_data.pop('client', None) if is_manager else None
        booking_status = serializer.validated_data.get('status', 'pending')
        if booking_status == 'blocked':
            place = serializer.validated_data['place']
            block_client = client or self.request.user
            if is_manager and client is None:
                block_client = place.owner
            validate_block_creation(
                actor=self.request.user,
                place=place,
                client=block_client,
                payment_status=serializer.validated_data.get('payment_status', 'unpaid'),
            )
            client = block_client
        self._lock_place(serializer)
        self._validate_booking_access_and_overlap(serializer)
        save_kwargs = {'client': client or self.request.user}
        if not is_manager:
            save_kwargs['payment_status'] = 'unpaid'
            if serializer.validated_data.get('status') != 'blocked':
                save_kwargs['status'] = 'pending'
        self._apply_server_pricing(serializer, save_kwargs, is_manager=is_manager)
        booking = serializer.save(**save_kwargs)
        if is_manager and client:
            create_audit_log(
                actor=self.request.user,
                action='booking.assignment_created',
                object_type='Booking',
                object_id=booking.id,
                metadata={
                    'client_id': booking.client_id,
                    'place_id': booking.place_id,
                    'place_owner_id': booking.place.owner_id,
                },
            )
        notification_type = 'booking_blocked' if booking.status == 'blocked' else 'booking_created'
        notify_booking_event(booking, notification_type, actor=self.request.user, include_actor=True)

    @transaction.atomic
    def perform_update(self, serializer):
        previous_client_id = serializer.instance.client_id
        previous_place_id = serializer.instance.place_id
        previous_place_owner_id = serializer.instance.place.owner_id
        is_manager = is_admin_or_moderator(self.request.user)
        self._lock_place(serializer)
        self._validate_booking_access_and_overlap(serializer)
        save_kwargs = {}
        price_inputs_changed = any(
            field_name in serializer.validated_data
            and serializer.validated_data[field_name] != getattr(serializer.instance, field_name)
            for field_name in ('place', 'start_time', 'end_time', 'duration_type')
        )
        if price_inputs_changed or (is_manager and 'amount' in serializer.validated_data):
            if not is_manager and serializer.instance.payment_status != 'unpaid':
                raise ValidationError({
                    'non_field_errors': ['A paid booking cannot be rescheduled. Cancel it and create a new one.']
                })
            self._apply_server_pricing(serializer, save_kwargs, is_manager=is_manager)
        booking = serializer.save(**save_kwargs)
        assignment_changed = (
            previous_client_id != booking.client_id
            or previous_place_id != booking.place_id
        )
        if is_admin_or_moderator(self.request.user) and assignment_changed:
            create_audit_log(
                actor=self.request.user,
                action='booking.assignment_updated',
                object_type='Booking',
                object_id=booking.id,
                metadata={
                    'previous_client_id': previous_client_id,
                    'client_id': booking.client_id,
                    'previous_place_id': previous_place_id,
                    'place_id': booking.place_id,
                    'previous_place_owner_id': previous_place_owner_id,
                    'place_owner_id': booking.place.owner_id,
                },
            )

    def _set_booking_status(self, request, booking, next_status):
        result = transition_booking_status(
            actor=request.user,
            booking_id=booking.pk,
            next_status=next_status,
        )
        return Response(self.get_serializer(result.booking).data)

    @extend_schema(
        request=BookingQuoteSerializer,
        responses=inline_serializer(
            name='BookingQuoteResponse',
            fields={
                'duration_type': serializers.CharField(),
                'units': serializers.IntegerField(),
                'unit_price': serializers.CharField(),
                'subtotal': serializers.CharField(),
                'discount_id': serializers.IntegerField(allow_null=True),
                'discount_name': serializers.CharField(),
                'discount_percent': serializers.IntegerField(),
                'discount_amount': serializers.CharField(),
                'service_fee': serializers.CharField(),
                'tax': serializers.CharField(),
                'amount': serializers.CharField(),
                'currency': serializers.CharField(),
            },
        ),
        tags=['bookings'],
    )
    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def quote(self, request):
        """Price preview calculated with the same rules as booking creation."""
        serializer = BookingQuoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        place = serializer.validated_data['place']
        if not is_place_publicly_visible(place) and not can_manage_place_availability(request.user, place):
            raise ValidationError({'place': ['This place is not available for booking.']})
        quote = quote_booking(
            place,
            duration_type=serializer.validated_data['duration_type'],
            start_time=serializer.validated_data['start_time'],
            end_time=serializer.validated_data['end_time'],
        )
        return Response(quote.as_dict())

    @extend_schema(request=None, responses=BookingSerializer, tags=['bookings'])
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def confirm(self, request, pk=None):
        return self._set_booking_status(request, self.get_object(), 'confirmed')

    @extend_schema(request=None, responses=BookingSerializer, tags=['bookings'])
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def cancel(self, request, pk=None):
        return self._set_booking_status(request, self.get_object(), 'cancelled')

    @extend_schema(request=None, responses=BookingSerializer, tags=['bookings'])
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def block(self, request, pk=None):
        return self._set_booking_status(request, self.get_object(), 'blocked')

    @extend_schema(
        parameters=[
            OpenApiParameter('place', int, OpenApiParameter.QUERY, required=True),
            OpenApiParameter('date_from', str, OpenApiParameter.QUERY, description='YYYY-MM-DD'),
            OpenApiParameter('date_to', str, OpenApiParameter.QUERY, description='YYYY-MM-DD'),
        ],
        responses=inline_serializer(
            name='BookingAvailabilityResponse',
            fields={
                'place': serializers.IntegerField(),
                'date_from': serializers.DateField(),
                'date_to': serializers.DateField(),
                'days': serializers.DictField(),
                'bookings': serializers.ListField(child=serializers.DictField()),
            },
        ),
        tags=['bookings'],
    )
    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def availability(self, request):
        place_id = request.query_params.get('place') or request.query_params.get('space_id')
        if not place_id:
            return Response({'detail': 'Query param "place" is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            place = Place.objects.select_related('owner').get(pk=place_id)
        except (Place.DoesNotExist, ValueError):
            return Response({'detail': 'Place not found.'}, status=status.HTTP_404_NOT_FOUND)

        if place.status != 'approved' and not can_manage_place_availability(request.user, place):
            raise PermissionDenied('You do not have access to this place availability.')

        date_from = parse_date(request.query_params.get('date_from') or '')
        date_to = parse_date(request.query_params.get('date_to') or '')
        if not date_from:
            date_from = timezone.localdate()
        if not date_to:
            date_to = date_from + timedelta(days=30)
        if date_to < date_from:
            return Response({'detail': 'date_to must be greater than or equal to date_from.'}, status=status.HTTP_400_BAD_REQUEST)
        if (date_to - date_from).days > 366:
            return Response({'detail': 'Availability range cannot exceed 366 days.'}, status=status.HTTP_400_BAD_REQUEST)

        range_start = _make_aware_datetime(date_from, time.min)
        range_end = _make_aware_datetime(date_to + timedelta(days=1), time.min)
        bookings = self._overlapping_bookings(place, range_start, range_end).select_related('client').order_by('start_time')

        days = {
            day.isoformat(): {
                'status': 'free',
                'booked': False,
                'blocked': False,
                'full_day': False,
                'slots': {},
                'bookings': [],
            }
            for day in _date_range(date_from, date_to)
        }
        booking_items = []

        for booking in bookings:
            local_start = timezone.localtime(booking.start_time)
            local_end = timezone.localtime(booking.end_time)
            booking_item = {
                'id': booking.id,
                'place': place.id,
                'place_id': place.id,
                'space_id': place.id,
                'status': booking.status,
                'payment_status': booking.payment_status,
                'duration_type': booking.duration_type,
                'start_time': booking.start_time.isoformat(),
                'end_time': booking.end_time.isoformat(),
                'start_date': local_start.date().isoformat(),
                'end_date': local_end.date().isoformat(),
                'client': booking.client_id,
            }
            booking_items.append(booking_item)

            start_day = max(local_start.date(), date_from)
            end_day = min((local_end - timedelta(microseconds=1)).date(), date_to)

            for day in _date_range(start_day, end_day):
                day_key = day.isoformat()
                day_entry = days[day_key]
                is_blocked = booking.status == 'blocked'
                is_full_day = _booking_blocks_full_day(booking, day)

                if is_blocked:
                    day_entry['blocked'] = True
                    day_entry['status'] = 'blocked'
                elif day_entry['status'] == 'free':
                    day_entry['booked'] = True
                    day_entry['status'] = 'booked'
                else:
                    day_entry['booked'] = True

                if is_full_day:
                    day_entry['full_day'] = True

                day_entry['bookings'].append(booking_item)

                slot_start = max(local_start, _make_aware_datetime(day, time.min))
                slot_end = min(local_end, _make_aware_datetime(day + timedelta(days=1), time.min))
                for label in HOURLY_SLOT_LABELS:
                    hour = int(label[:2])
                    hour_start = _make_aware_datetime(day, time(hour=hour))
                    hour_end = hour_start + timedelta(hours=1)
                    if hour_start < slot_end and hour_end > slot_start:
                        existing = day_entry['slots'].get(label)
                        if existing and existing.get('status') == 'blocked':
                            continue
                        day_entry['slots'][label] = {
                            'status': 'blocked' if is_blocked else 'booked',
                            'booking_id': booking.id,
                            'start_time': booking.start_time.isoformat(),
                            'end_time': booking.end_time.isoformat(),
                        }

        return Response({
            'place': place.id,
            'date_from': date_from.isoformat(),
            'date_to': date_to.isoformat(),
            'days': days,
            'bookings': booking_items,
        })
