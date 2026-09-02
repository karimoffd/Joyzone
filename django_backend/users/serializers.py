from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    tariff_details = serializers.SerializerMethodField()
    bookings_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'first_name', 'last_name', 'email', 'phone_number', 'role', 'avatar', 'balance', 'tariff', 'tariff_expires_at', 'tariff_details', 'is_superuser', 'is_staff', 'date_joined', 'bookings_count')
        read_only_fields = ('id', 'username', 'role', 'balance', 'tariff', 'tariff_expires_at', 'tariff_details', 'is_superuser', 'is_staff', 'date_joined', 'bookings_count')

    def get_tariff_details(self, obj):
        if obj.tariff:
            from tariffs.serializers import TariffPlanSerializer
            return TariffPlanSerializer(obj.tariff).data
        return None

    def get_bookings_count(self, obj):
        return obj.bookings.count()


class AdminUserSerializer(serializers.ModelSerializer):
    tariff_details = serializers.SerializerMethodField()
    bookings_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'first_name', 'last_name', 'email', 'phone_number', 'role', 'avatar', 'balance', 'tariff', 'tariff_expires_at', 'tariff_details', 'is_superuser', 'is_staff', 'date_joined', 'bookings_count')
        read_only_fields = ('id', 'username', 'tariff', 'tariff_expires_at', 'tariff_details', 'date_joined', 'bookings_count')

    def get_tariff_details(self, obj):
        if obj.tariff:
            from tariffs.serializers import TariffPlanSerializer
            return TariffPlanSerializer(obj.tariff).data
        return None

    def get_bookings_count(self, obj):
        return obj.bookings.count()

class SendOTPSerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=20)

class VerifyOTPSerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=20)
    otp_code = serializers.CharField(max_length=6)
