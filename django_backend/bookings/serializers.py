from datetime import datetime, time

from django.contrib.auth import get_user_model
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework import serializers
from .models import Booking
from places.models import Place
from places.serializers import PlaceSerializer


class ExplicitTimezoneDateTimeField(serializers.DateTimeField):
    default_error_messages = {
        **serializers.DateTimeField.default_error_messages,
        'timezone': 'Datetime must include an explicit timezone offset or Z suffix.',
    }

    def to_internal_value(self, value):
        if isinstance(value, str):
            parsed = parse_datetime(value)
            if parsed is not None and timezone.is_naive(parsed):
                self.fail('timezone')
        result = super().to_internal_value(value)
        if timezone.is_naive(result):
            self.fail('timezone')
        return result


class BookingListQuerySerializer(serializers.Serializer):
    scope = serializers.ChoiceField(choices=('mine', 'host'), required=False)
    place = serializers.IntegerField(min_value=1, required=False)
    space_id = serializers.IntegerField(min_value=1, required=False, write_only=True)
    status = serializers.ChoiceField(
        choices=tuple(choice[0] for choice in Booking.STATUS_CHOICES),
        required=False,
    )
    client = serializers.IntegerField(min_value=1, required=False)
    search = serializers.CharField(required=False, allow_blank=True, trim_whitespace=True)
    date_from = serializers.DateField(required=False, input_formats=('%Y-%m-%d',))
    date_to = serializers.DateField(required=False, input_formats=('%Y-%m-%d',))

    def to_internal_value(self, data):
        normalized = {
            key: value.strip() if isinstance(value, str) else value
            for key, value in data.items()
            if value not in ('', None)
        }
        for field_name in ('scope', 'status'):
            if isinstance(normalized.get(field_name), str):
                normalized[field_name] = normalized[field_name].lower()
        return super().to_internal_value(normalized)

    def validate(self, attrs):
        place = attrs.get('place')
        space_id = attrs.pop('space_id', None)
        if place and space_id and place != space_id:
            raise serializers.ValidationError({
                'place': 'place and space_id must identify the same place.'
            })
        if not place and space_id:
            attrs['place'] = space_id

        date_from = attrs.get('date_from')
        date_to = attrs.get('date_to')
        if date_from and date_to and date_from > date_to:
            raise serializers.ValidationError({
                'date_to': 'date_to must be greater than or equal to date_from.'
            })
        return attrs


class BookingSerializer(serializers.ModelSerializer):
    CONTROLLED_FIELD_ERRORS = {
        'status': 'Booking status is server-controlled. Use the confirm, cancel, or block action.',
        'payment_status': 'Payment status is server-controlled. Use the payment or refund endpoint.',
    }
    ASSIGNMENT_FIELD_ERRORS = {
        'client': 'Booking client assignment is restricted to admin, moderator, or staff.',
        'place': 'Booking place cannot be changed after creation. Create a new booking instead.',
    }
    DURATION_ALIASES = {
        'soatlik': 'hourly',
        'kunlik': 'daily',
        'haftalik': 'weekly',
        'oylik': 'monthly',
        'hour': 'hourly',
        'day': 'daily',
        'week': 'weekly',
        'month': 'monthly',
    }
    STATUS_ALIASES = {
        'booked': 'confirmed',
        'closed': 'blocked',
    }

    client = serializers.PrimaryKeyRelatedField(queryset=get_user_model().objects.all(), required=False)
    place = serializers.PrimaryKeyRelatedField(queryset=Place.objects.all(), required=False)
    place_details = PlaceSerializer(source='place', read_only=True)
    place_title = serializers.CharField(source='place.title', read_only=True)
    client_name = serializers.SerializerMethodField()
    client_phone = serializers.SerializerMethodField()
    place_id = serializers.ReadOnlyField()
    space_id = serializers.IntegerField(source='place_id', read_only=True)
    start_time = ExplicitTimezoneDateTimeField(required=False)
    end_time = ExplicitTimezoneDateTimeField(required=False)
    start_date = serializers.DateField(write_only=True, required=False)
    end_date = serializers.DateField(write_only=True, required=False)
    total_price = serializers.DecimalField(max_digits=12, decimal_places=2, write_only=True, required=False)
    duration_type = serializers.CharField(required=False)
    guests = serializers.IntegerField(required=False, min_value=1)
    status = serializers.CharField(required=False)
    payment_status = serializers.CharField(required=False)

    class Meta:
        model = Booking
        fields = (
            'id',
            'client',
            'client_name',
            'client_phone',
            'place',
            'place_id',
            'space_id',
            'place_details',
            'place_title',
            'start_time',
            'end_time',
            'start_date',
            'end_date',
            'duration_type',
            'guests',
            'amount',
            'total_price',
            'currency',
            'note',
            'status',
            'payment_status',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'client', 'place_id', 'space_id', 'place_details', 'created_at', 'updated_at')

    def to_internal_value(self, data):
        if isinstance(data, dict):
            data = data.copy()
            if 'guests' in data and (
                isinstance(data.get('guests'), bool)
                or not isinstance(data.get('guests'), int)
            ):
                raise serializers.ValidationError({
                    'guests': 'Guests must be provided as a whole JSON number.'
                })
            if data.get('space_id') and not data.get('place'):
                data['place'] = data.get('space_id')
            if data.get('place_id') and not data.get('place'):
                data['place'] = data.get('place_id')
            if data.get('total_price') is not None and data.get('amount') in (None, ''):
                data['amount'] = data.get('total_price')
            self._validate_assignment_input(data)
        return super().to_internal_value(data)

    def _validate_assignment_input(self, data):
        if self.context.get('allow_admin_booking_assignment'):
            return

        errors = {}
        if 'client' in data:
            errors['client'] = self.ASSIGNMENT_FIELD_ERRORS['client']

        if self.instance is not None and 'place' in data:
            requested_place = data.get('place')
            requested_place_id = getattr(requested_place, 'pk', requested_place)
            try:
                place_changed = int(requested_place_id) != self.instance.place_id
            except (TypeError, ValueError):
                place_changed = True
            if place_changed:
                errors['place'] = self.ASSIGNMENT_FIELD_ERRORS['place']

        if errors:
            raise serializers.ValidationError(errors)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['start_date'] = instance.start_time.date().isoformat() if instance.start_time else None
        data['end_date'] = instance.end_time.date().isoformat() if instance.end_time else None
        data['total_price'] = data.get('amount')
        return data

    def get_client_name(self, obj):
        if not obj.client:
            return ''
        return obj.client.get_full_name() or obj.client.username or obj.client.email or str(obj.client_id)

    def get_client_phone(self, obj):
        if not obj.client:
            return ''
        return getattr(obj.client, 'phone_number', '') or getattr(obj.client, 'phone', '') or obj.client.username or ''

    def validate_duration_type(self, value):
        return self._normalize_choice(value, Booking.DURATION_TYPE_CHOICES, self.DURATION_ALIASES, 'duration_type')

    def validate_status(self, value):
        return self._normalize_choice(value, Booking.STATUS_CHOICES, self.STATUS_ALIASES, 'status')

    def validate_payment_status(self, value):
        return self._normalize_choice(value, Booking.PAYMENT_STATUS_CHOICES, {}, 'payment_status')

    def validate_guests(self, value):
        if value < 1:
            raise serializers.ValidationError('Guests must be at least 1.')
        return value

    def validate_amount(self, value):
        if value < 0:
            raise serializers.ValidationError('Amount cannot be negative.')
        return value

    def validate(self, attrs):
        self._validate_controlled_fields()
        start_date = attrs.pop('start_date', None)
        end_date = attrs.pop('end_date', None)
        attrs.pop('total_price', None)

        if self.instance is None and not attrs.get('place'):
            raise serializers.ValidationError({'place': 'This field is required.'})

        if not attrs.get('start_time') and start_date:
            attrs['start_time'] = self._combine_date_time(start_date, time(hour=9))

        if not attrs.get('end_time') and end_date:
            attrs['end_time'] = self._combine_date_time(end_date, time(hour=18))

        requires_complete_interval = self.instance is None or not self.partial
        required_errors = {}
        if requires_complete_interval and not attrs.get('start_time'):
            required_errors['start_time'] = 'This field is required.'
        if requires_complete_interval and not attrs.get('end_time'):
            required_errors['end_time'] = 'This field is required.'
        if requires_complete_interval and not attrs.get('duration_type'):
            required_errors['duration_type'] = 'This field is required.'
        if required_errors:
            raise serializers.ValidationError(required_errors)

        start_time = attrs.get('start_time') or getattr(self.instance, 'start_time', None)
        end_time = attrs.get('end_time') or getattr(self.instance, 'end_time', None)
        interval_was_submitted = any(
            field_name in getattr(self, 'initial_data', {})
            for field_name in ('start_time', 'end_time', 'start_date', 'end_date')
        )
        if start_time and end_time and end_time <= start_time:
            raise serializers.ValidationError({'end_time': 'End time must be after start time.'})
        if (
            start_time
            and not self.context.get('allow_past_booking_interval', False)
            and (self.instance is None or interval_was_submitted)
            and start_time < timezone.now()
        ):
            raise serializers.ValidationError({
                'start_time': 'Booking start time cannot be in the past.'
            })

        self._validate_place_capacity(attrs)

        return attrs

    def _validate_place_capacity(self, attrs):
        place = attrs.get('place') or getattr(self.instance, 'place', None)
        booking_status = attrs.get(
            'status',
            getattr(self.instance, 'status', Booking._meta.get_field('status').default),
        )
        is_cancel_action = (
            booking_status == 'cancelled'
            and self.context.get('allow_booking_status_action', False)
        )
        if not place or booking_status == 'blocked' or is_cancel_action:
            return

        guests = attrs.get(
            'guests',
            getattr(self.instance, 'guests', Booking._meta.get_field('guests').default),
        )
        capacity = getattr(place, 'people', None)
        if not isinstance(capacity, int) or capacity <= 0:
            raise serializers.ValidationError({
                'guests': 'Booking is unavailable because place capacity is not configured.'
            })
        if guests > capacity:
            raise serializers.ValidationError({
                'guests': f'Guests cannot exceed place capacity of {capacity}.'
            })

    def _validate_controlled_fields(self):
        submitted = {
            field_name
            for field_name in self.CONTROLLED_FIELD_ERRORS
            if field_name in getattr(self, 'initial_data', {})
        }
        if not submitted or self.context.get('allow_booking_status_action'):
            return

        if self.instance is None and self.context.get('allow_admin_manual_booking'):
            return

        if self.instance is None and self.context.get('allow_partner_availability_block'):
            requested_status = str(self.initial_data.get('status', '')).strip().lower()
            requested_payment_status = str(self.initial_data.get('payment_status', 'unpaid')).strip().lower()
            if requested_status == 'blocked' and requested_payment_status == 'unpaid':
                return

        raise serializers.ValidationError({
            field_name: self.CONTROLLED_FIELD_ERRORS[field_name]
            for field_name in submitted
        })

    @classmethod
    def _normalize_choice(cls, value, choices, aliases, field_name):
        normalized = str(value or '').strip().lower()
        normalized = aliases.get(normalized, normalized)
        allowed = {choice[0] for choice in choices}
        if normalized not in allowed:
            raise serializers.ValidationError(f'Invalid {field_name}. Allowed values: {", ".join(sorted(allowed))}.')
        return normalized

    @staticmethod
    def _combine_date_time(date_value, default_time):
        value = datetime.combine(date_value, default_time)
        if timezone.is_naive(value):
            return timezone.make_aware(value, timezone.get_current_timezone())
        return value
