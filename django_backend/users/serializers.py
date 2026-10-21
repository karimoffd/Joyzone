from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken
from rest_framework_simplejwt.utils import datetime_from_epoch

User = get_user_model()


def normalize_login_identifier(value):
    """Normalize phone-like logins while preserving non-phone dev identifiers."""
    value = str(value or '').strip()
    compact = ''.join(character for character in value if character not in ' -()')
    if compact.startswith('+') and compact[1:].isdigit():
        return f'+{compact[1:]}'
    if compact.isdigit():
        return compact
    return value.casefold()

class UserSerializer(serializers.ModelSerializer):
    tariff_details = serializers.SerializerMethodField()
    bookings_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'first_name', 'last_name', 'email', 'phone_number', 'role', 'avatar', 'company_name', 'partner_bio', 'is_featured_partner', 'tariff', 'tariff_expires_at', 'tariff_details', 'is_superuser', 'is_staff', 'date_joined', 'bookings_count')
        read_only_fields = ('id', 'username', 'role', 'is_featured_partner', 'tariff', 'tariff_expires_at', 'tariff_details', 'is_superuser', 'is_staff', 'date_joined', 'bookings_count')

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
        fields = ('id', 'username', 'first_name', 'last_name', 'email', 'phone_number', 'role', 'avatar', 'company_name', 'partner_bio', 'is_featured_partner', 'tariff', 'tariff_expires_at', 'tariff_details', 'is_superuser', 'is_staff', 'date_joined', 'bookings_count')
        read_only_fields = (
            'id', 'username', 'tariff', 'tariff_expires_at',
            'tariff_details', 'is_superuser', 'is_staff', 'date_joined', 'bookings_count',
        )

    def get_tariff_details(self, obj):
        if obj.tariff:
            from tariffs.serializers import TariffPlanSerializer
            return TariffPlanSerializer(obj.tariff).data
        return None

    def get_bookings_count(self, obj):
        if hasattr(obj, 'bookings_total'):
            return obj.bookings_total
        return obj.bookings.count()

class SendOTPSerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=20)

    def validate_phone_number(self, value):
        return normalize_login_identifier(value)

class VerifyOTPSerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=20)
    otp_code = serializers.CharField(max_length=6)

    def validate_phone_number(self, value):
        return normalize_login_identifier(value)


class DemoLoginSerializer(serializers.Serializer):
    account = serializers.CharField(max_length=150, trim_whitespace=True)
    password = serializers.CharField(max_length=128, trim_whitespace=False, write_only=True)


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField(trim_whitespace=False, write_only=True)


class JoyzoneTokenRefreshSerializer(TokenRefreshSerializer):
    """Keep refreshed demo access tokens inside the original demo session."""

    def validate(self, attrs):
        refresh = RefreshToken(attrs['refresh'])
        demo_expires_at = refresh['exp'] if refresh.get('demo_session') else None
        data = super().validate(attrs)
        if demo_expires_at:
            access = AccessToken(data['access'])
            access['exp'] = min(access['exp'], demo_expires_at)
            data['access'] = str(access)

            if data.get('refresh'):
                rotated_refresh = RefreshToken(data['refresh'])
                rotated_refresh['demo_session'] = True
                rotated_refresh['exp'] = demo_expires_at
                serialized_refresh = str(rotated_refresh)
                data['refresh'] = serialized_refresh
                OutstandingToken.objects.filter(jti=rotated_refresh['jti']).update(
                    token=serialized_refresh,
                    expires_at=datetime_from_epoch(demo_expires_at),
                )
        return data
