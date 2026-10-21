from rest_framework import serializers

from .models import Payment


class PaymentSerializer(serializers.ModelSerializer):
    booking_id = serializers.IntegerField(source='booking.id', read_only=True)
    tariff_subscription_id = serializers.IntegerField(source='tariff_subscription.id', read_only=True)

    class Meta:
        model = Payment
        fields = (
            'id',
            'user',
            'booking',
            'booking_id',
            'tariff_subscription',
            'tariff_subscription_id',
            'provider',
            'amount',
            'currency',
            'status',
            'external_id',
            'metadata',
            'created_at',
            'updated_at',
        )
        read_only_fields = fields


class UserPaymentHistorySerializer(serializers.ModelSerializer):
    booking_id = serializers.IntegerField(source='booking.id', read_only=True, allow_null=True)
    booking_title = serializers.CharField(source='booking.place.title', read_only=True, allow_null=True)
    tariff_subscription_id = serializers.IntegerField(
        source='tariff_subscription.id',
        read_only=True,
        allow_null=True,
    )
    tariff_id = serializers.IntegerField(
        source='tariff_subscription.tariff.id',
        read_only=True,
        allow_null=True,
    )
    tariff_name = serializers.CharField(
        source='tariff_subscription.tariff.name',
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = Payment
        fields = (
            'id',
            'provider',
            'amount',
            'currency',
            'status',
            'booking_id',
            'booking_title',
            'tariff_subscription_id',
            'tariff_id',
            'tariff_name',
            'external_id',
            'created_at',
        )
        read_only_fields = fields
