from django.contrib.auth import get_user_model
from django.db.models import Avg, Count, Q, Sum
from django.utils.dateparse import parse_date
from django.utils import timezone
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema, inline_serializer

from bookings.models import Booking
from core.permissions import IsAdminOrModerator
from core.serializers import AuditLogSerializer
from payments.models import Payment
from places.models import Place, Review
from .models import AuditLog


def _sum_amount(queryset):
    return queryset.aggregate(total=Sum('amount'))['total'] or 0


def _user_label(user):
    if not user:
        return ''
    return user.get_full_name() or user.username or user.email or str(user.id)


def _place_category_name(place):
    if place.subcategory and place.subcategory.category:
        return place.subcategory.category.name_ru
    return place.category or ''


def _latest_booking_item(booking):
    return {
        'id': booking.id,
        'client': booking.client_id,
        'client_name': _user_label(booking.client),
        'client_phone': getattr(booking.client, 'phone_number', '') or '',
        'place': booking.place_id,
        'place_title': booking.place.title if booking.place else '',
        'start_time': booking.start_time,
        'end_time': booking.end_time,
        'amount': str(booking.amount),
        'currency': booking.currency,
        'status': booking.status,
        'payment_status': booking.payment_status,
    }


def _latest_review_item(review):
    return {
        'id': review.id,
        'user': review.user_id,
        'user_name': _user_label(review.user),
        'place': review.place_id,
        'place_title': review.place.title if review.place else '',
        'rating': review.rating,
        'comment': review.comment,
        'created_at': review.created_at,
    }


def _top_place_item(place):
    return {
        'id': place.id,
        'title': place.title,
        'name': place.title,
        'category_name': _place_category_name(place),
        'subcategory_name': place.subcategory.name_ru if place.subcategory else '',
        'owner': place.owner_id,
        'owner_name': _user_label(place.owner),
        'bookings_count': place.bookings_count,
        'revenue_test': str(place.revenue_test or 0),
        'reviews_count': place.reviews_count,
        'rating_avg': round(float(place.rating_avg or 0), 1),
        'status': place.status,
    }


class AdminOverviewView(APIView):
    permission_classes = [IsAdminOrModerator]

    @extend_schema(
        responses=inline_serializer(
            name='AdminOverviewResponse',
            fields={
                'users_count': serializers.IntegerField(),
                'partners_count': serializers.IntegerField(),
                'places_total': serializers.IntegerField(),
                'places_pending': serializers.IntegerField(),
                'places_approved': serializers.IntegerField(),
                'bookings_total': serializers.IntegerField(),
                'bookings_pending': serializers.IntegerField(),
                'revenue_month_test': serializers.CharField(),
                'reviews_count': serializers.IntegerField(),
                'average_rating': serializers.FloatField(),
                'latest_bookings': serializers.ListField(child=serializers.DictField()),
                'latest_reviews': serializers.ListField(child=serializers.DictField()),
                'top_places': serializers.ListField(child=serializers.DictField()),
            },
        ),
        tags=['admin'],
    )
    def get(self, request):
        User = get_user_model()
        now = timezone.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        paid_statuses = ('test_paid', 'paid')

        latest_bookings = Booking.objects.select_related(
            'client',
            'place',
        ).order_by('-created_at')[:5]

        latest_reviews = Review.objects.select_related(
            'user',
            'place',
        ).order_by('-created_at')[:5]

        top_places = Place.objects.select_related(
            'owner',
            'subcategory__category',
        ).annotate(
            bookings_count=Count('bookings', distinct=True),
            reviews_count=Count('reviews', distinct=True),
            rating_avg=Avg('reviews__rating'),
            revenue_test=Sum(
                'bookings__payments__amount',
                filter=Q(bookings__payments__status__in=paid_statuses),
            ),
        ).order_by('-bookings_count', '-revenue_test', '-created_at')[:5]

        return Response({
            'users_count': User.objects.count(),
            'partners_count': User.objects.filter(role='partner').count(),
            'places_total': Place.objects.count(),
            'places_pending': Place.objects.filter(status='pending').count(),
            'places_approved': Place.objects.filter(status='approved').count(),
            'bookings_total': Booking.objects.count(),
            'bookings_pending': Booking.objects.filter(status='pending').count(),
            'revenue_month_test': str(_sum_amount(Payment.objects.filter(
                status__in=paid_statuses,
                created_at__gte=month_start,
            ))),
            'reviews_count': Review.objects.count(),
            'average_rating': round(float(Review.objects.aggregate(avg=Avg('rating'))['avg'] or 0), 1),
            'latest_bookings': [_latest_booking_item(booking) for booking in latest_bookings],
            'latest_reviews': [_latest_review_item(review) for review in latest_reviews],
            'top_places': [_top_place_item(place) for place in top_places],
        })


class AuditLogListView(APIView):
    permission_classes = [IsAdminOrModerator]

    @extend_schema(responses=AuditLogSerializer(many=True), tags=['admin'])
    def get(self, request):
        queryset = AuditLog.objects.select_related('actor').all()

        action = request.query_params.get('action')
        if action:
            queryset = queryset.filter(action=action)

        object_type = request.query_params.get('object_type')
        if object_type:
            queryset = queryset.filter(object_type=object_type)

        object_id = request.query_params.get('object_id')
        if object_id:
            queryset = queryset.filter(object_id=str(object_id))

        actor = request.query_params.get('actor')
        if actor:
            queryset = queryset.filter(actor_id=actor)

        date_from = request.query_params.get('date_from')
        if date_from:
            parsed_date_from = parse_date(date_from)
            if not parsed_date_from:
                return Response({'date_from': ['Use YYYY-MM-DD format.']}, status=400)
            queryset = queryset.filter(created_at__date__gte=parsed_date_from)

        date_to = request.query_params.get('date_to')
        if date_to:
            parsed_date_to = parse_date(date_to)
            if not parsed_date_to:
                return Response({'date_to': ['Use YYYY-MM-DD format.']}, status=400)
            queryset = queryset.filter(created_at__date__lte=parsed_date_to)

        try:
            limit = max(1, min(int(request.query_params.get('limit', 100)), 500))
        except ValueError:
            limit = 100

        serializer = AuditLogSerializer(queryset[:limit], many=True)
        return Response(serializer.data)
