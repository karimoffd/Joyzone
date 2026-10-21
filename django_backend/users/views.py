from datetime import timedelta
import hashlib
import hmac
import logging
import secrets

from rest_framework import generics, permissions, serializers, status
from rest_framework.exceptions import Throttled
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.throttling import AnonRateThrottle, SimpleRateThrottle
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.settings import api_settings as jwt_api_settings
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken
from rest_framework_simplejwt.tokens import RefreshToken
from drf_spectacular.utils import extend_schema, inline_serializer
from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.db import transaction
from django.db.models import Count
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from core.audit import create_audit_log
from core.permissions import IsAdminUserRole
from .auth_cookies import (
    clear_refresh_cookie,
    get_refresh_from_request,
    set_refresh_cookie,
    token_payload,
)
from .models import OTPVerification
from .serializers import (
    AdminUserSerializer,
    DemoLoginSerializer,
    JoyzoneTokenRefreshSerializer,
    LogoutSerializer,
    SendOTPSerializer,
    UserSerializer,
    VerifyOTPSerializer,
    normalize_login_identifier,
)

User = get_user_model()
DEV_OTP_CODE = '111111'
logger = logging.getLogger('joyzone.auth')


def dev_auth_bypass_enabled():
    """Keep local auth shortcuts behind both explicit development guards."""
    return settings.DEBUG and settings.DEV_OTP_ENABLED


def login_cache_identifier(value):
    normalized = normalize_login_identifier(value)
    return hmac.new(
        settings.SECRET_KEY.encode('utf-8'),
        normalized.encode('utf-8'),
        hashlib.sha256,
    ).hexdigest()


def hash_otp_code(phone, code):
    """OTP codes are stored as keyed hashes so a DB leak does not reveal them."""
    return hmac.new(
        settings.SECRET_KEY.encode('utf-8'),
        f'{normalize_login_identifier(phone)}:{code}'.encode('utf-8'),
        hashlib.sha256,
    ).hexdigest()


def mask_login_identifier(value):
    normalized = normalize_login_identifier(value)
    if len(normalized) <= 4:
        return '***'
    return f'{normalized[:2]}***{normalized[-2:]}'


def public_demo_access_config():
    """Return the active public-demo policy without exposing its allowlist."""
    try:
        expires_at = parse_datetime(settings.PUBLIC_DEMO_LOGIN_EXPIRES_AT)
    except ValueError:
        expires_at = None
    if expires_at and timezone.is_naive(expires_at):
        expires_at = timezone.make_aware(expires_at, timezone.get_current_timezone())

    enabled = all((
        settings.PUBLIC_DEMO_LOGIN_ENABLED,
        settings.PUBLIC_DEMO_DATA_ISOLATED,
        settings.PUBLIC_DEMO_ACCOUNT_PREFIX,
        settings.PUBLIC_DEMO_ACCOUNT_USERNAMES,
        expires_at,
        expires_at and expires_at > timezone.now(),
    ))
    return {
        'enabled': bool(enabled),
        'expires_at': expires_at,
        'session_minutes': settings.PUBLIC_DEMO_SESSION_MINUTES,
    }


class OTPSendThrottle(AnonRateThrottle):
    """3 OTP send requests per minute per IP — prevents SMS spam."""
    rate = '3/minute'
    scope = 'otp_send'


class OTPVerifyThrottle(AnonRateThrottle):
    """5 OTP verify attempts per minute per IP — brute-force guard."""
    rate = '5/minute'
    scope = 'otp_verify'


class NormalizedLoginThrottle(SimpleRateThrottle):
    """Throttle a normalized login independently from the caller IP."""

    def get_cache_key(self, request, view):
        login = request.data.get('phone_number') if hasattr(request.data, 'get') else None
        normalized = normalize_login_identifier(login)
        if not normalized:
            return None
        return self.cache_format % {
            'scope': self.scope,
            'ident': login_cache_identifier(normalized),
        }


class OTPSendAccountThrottle(NormalizedLoginThrottle):
    scope = 'otp_send_account'

    def get_rate(self):
        return settings.OTP_SEND_ACCOUNT_RATE


class OTPVerifyAccountThrottle(NormalizedLoginThrottle):
    scope = 'otp_verify_account'

    def get_rate(self):
        return settings.OTP_VERIFY_ACCOUNT_RATE


class OTPThrottleResponseMixin:
    throttle_error_detail = 'Too many OTP attempts. Try again later.'

    def throttled(self, request, wait):
        raise Throttled(wait=wait, detail=self.throttle_error_detail)


class PublicDemoLoginThrottle(AnonRateThrottle):
    scope = 'public_demo_login'

    def get_rate(self):
        return settings.PUBLIC_DEMO_LOGIN_RATE

class SendOTPView(OTPThrottleResponseMixin, APIView):
    permission_classes = (permissions.AllowAny,)
    throttle_classes = [OTPSendThrottle, OTPSendAccountThrottle]
    throttle_error_detail = 'Too many OTP requests. Try again later.'

    @extend_schema(
        request=SendOTPSerializer,
        responses=inline_serializer(
            name='SendOTPResponse',
            fields={'detail': serializers.CharField()},
        ),
        tags=['auth'],
    )
    def post(self, request):
        serializer = SendOTPSerializer(data=request.data)
        if serializer.is_valid():
            if not settings.DEBUG and not settings.SMS_PROVIDER:
                logger.error('OTP requested but SMS_PROVIDER is not configured.')
                return Response(
                    {"detail": "SMS delivery is not configured yet."},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
            phone = serializer.validated_data['phone_number']
            otp_code = f'{secrets.randbelow(1_000_000):06d}'

            # A successful resend invalidates every earlier unused code for the
            # same phone. Exactly one newly-created code remains usable.
            with transaction.atomic():
                OTPVerification.objects.filter(
                    phone_number=phone,
                    is_used=False,
                ).update(is_used=True)
                OTPVerification.objects.create(
                    phone_number=phone,
                    otp_code=hash_otp_code(phone, otp_code),
                )
            
            if settings.DEBUG and settings.DEV_OTP_CONSOLE_LOG_ENABLED:
                logger.warning(
                    'Development OTP issued login=%s code=%s',
                    mask_login_identifier(phone),
                    otp_code,
                )
            else:
                logger.info(
                    'OTP challenge issued login_ref=%s',
                    login_cache_identifier(phone)[:12],
                )
            
            return Response({"detail": "OTP sent successfully."})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class VerifyOTPView(OTPThrottleResponseMixin, APIView):
    permission_classes = (permissions.AllowAny,)
    throttle_classes = [OTPVerifyThrottle, OTPVerifyAccountThrottle]

    @extend_schema(
        request=VerifyOTPSerializer,
        responses=inline_serializer(
            name='VerifyOTPResponse',
            fields={
                'access': serializers.CharField(),
                'is_new_user': serializers.BooleanField(),
                'profile': UserSerializer(),
            },
        ),
        tags=['auth'],
    )
    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        if serializer.is_valid():
            phone = serializer.validated_data['phone_number']
            otp_code = serializer.validated_data['otp_code']
            
            # The fixed code is reserved for isolated local development. Never
            # fall through to a stored OTP lookup for this value in production.
            if otp_code == DEV_OTP_CODE and not dev_auth_bypass_enabled():
                return Response(
                    {"detail": "Invalid or expired OTP code."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if otp_code == DEV_OTP_CODE:
                user, created = User.objects.get_or_create(
                    username=phone,
                    defaults={'phone_number': phone},
                )
            else:
                cutoff = timezone.now() - timedelta(seconds=settings.OTP_TTL_SECONDS)
                with transaction.atomic():
                    otp_obj = OTPVerification.objects.select_for_update().filter(
                        phone_number=phone,
                        otp_code=hash_otp_code(phone, otp_code),
                        is_used=False,
                        created_at__gt=cutoff,
                    ).order_by('-created_at').first()

                    if not otp_obj:
                        return Response(
                            {"detail": "Invalid or expired OTP code."},
                            status=status.HTTP_400_BAD_REQUEST,
                        )

                    consumed = OTPVerification.objects.filter(
                        pk=otp_obj.pk,
                        is_used=False,
                        created_at__gt=cutoff,
                    ).update(is_used=True)
                    if consumed != 1:
                        return Response(
                            {"detail": "Invalid or expired OTP code."},
                            status=status.HTTP_400_BAD_REQUEST,
                        )

                    # Close any legacy/concurrently-created sibling codes once
                    # one OTP wins consumption for this phone.
                    OTPVerification.objects.filter(
                        phone_number=phone,
                        is_used=False,
                    ).exclude(pk=otp_obj.pk).update(is_used=True)

                    user, created = User.objects.get_or_create(
                        username=phone,
                        defaults={'phone_number': phone},
                    )
            
            refresh = RefreshToken.for_user(user)
            response = Response(token_payload(
                refresh,
                refresh.access_token,
                is_new_user=created,
                profile=UserSerializer(user).data,
            ))
            return set_refresh_cookie(response, refresh)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_object(self):
        return self.request.user


class DevAdminLoginView(APIView):
    permission_classes = (permissions.AllowAny,)

    @extend_schema(
        request=None,
        responses=inline_serializer(
            name='DevAdminLoginResponse',
            fields={
                'access': serializers.CharField(),
                'profile': UserSerializer(),
            },
        ),
        tags=['auth'],
    )
    def post(self, request):
        # Local developer shortcut only. Tokens are returned to the caller but
        # must never be written to application logs.
        if not dev_auth_bypass_enabled():
            return Response({"detail": "Development login is disabled."}, status=403)
        
        admin_user = User.objects.filter(role='admin').first() or User.objects.filter(is_superuser=True).first()
        if not admin_user:
            return Response({"detail": "Admin user not found in database."}, status=404)
        
        refresh = RefreshToken.for_user(admin_user)
        response = Response(token_payload(
            refresh,
            refresh.access_token,
            profile=UserSerializer(admin_user).data,
        ))
        return set_refresh_cookie(response, refresh)


class PublicDemoLoginStatusView(APIView):
    permission_classes = (permissions.AllowAny,)

    @extend_schema(
        request=None,
        responses=inline_serializer(
            name='PublicDemoLoginStatusResponse',
            fields={
                'enabled': serializers.BooleanField(),
                'expires_at': serializers.DateTimeField(allow_null=True),
                'session_minutes': serializers.IntegerField(),
            },
        ),
        tags=['auth'],
    )
    def get(self, request):
        config = public_demo_access_config()
        return Response({
            'enabled': config['enabled'],
            'expires_at': config['expires_at'] if config['enabled'] else None,
            'session_minutes': config['session_minutes'],
        })


class PublicDemoLoginView(APIView):
    permission_classes = (permissions.AllowAny,)
    throttle_classes = [PublicDemoLoginThrottle]

    @extend_schema(
        request=DemoLoginSerializer,
        responses=inline_serializer(
            name='PublicDemoLoginResponse',
            fields={
                'access': serializers.CharField(),
                'is_new_user': serializers.BooleanField(),
                'profile': UserSerializer(),
                'demo_session_expires_at': serializers.DateTimeField(),
            },
        ),
        tags=['auth'],
    )
    def post(self, request):
        config = public_demo_access_config()
        if not config['enabled']:
            return Response(
                {'detail': 'Public demo access is disabled.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = DemoLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        account = serializer.validated_data['account']
        password = serializer.validated_data['password']
        allowed_accounts = set(settings.PUBLIC_DEMO_ACCOUNT_USERNAMES)

        if (
            account not in allowed_accounts
            or not account.startswith(settings.PUBLIC_DEMO_ACCOUNT_PREFIX)
        ):
            return Response(
                {'detail': 'Invalid demo credentials.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        user = authenticate(request=request, username=account, password=password)
        if (
            user is None
            or not user.is_active
            or user.role not in ('client', 'partner')
            or user.is_staff
            or user.is_superuser
        ):
            return Response(
                {'detail': 'Invalid demo credentials.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        remaining = config['expires_at'] - timezone.now()
        session_lifetime = min(
            timedelta(minutes=config['session_minutes']),
            remaining,
        )
        if session_lifetime.total_seconds() <= 0:
            return Response(
                {'detail': 'Public demo access is disabled.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        refresh = RefreshToken.for_user(user)
        refresh['demo_session'] = True
        refresh.set_exp(lifetime=session_lifetime)
        access = refresh.access_token
        access.set_exp(lifetime=min(settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'], session_lifetime))

        response = Response(token_payload(
            refresh,
            access,
            is_new_user=False,
            profile=UserSerializer(user).data,
            demo_session_expires_at=config['expires_at'],
        ))
        return set_refresh_cookie(response, refresh)


class JoyzoneTokenRefreshView(TokenRefreshView):
    serializer_class = JoyzoneTokenRefreshSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data={'refresh': get_refresh_from_request(request)})
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as exc:
            raise InvalidToken(exc.args[0]) from exc

        data = dict(serializer.validated_data)
        rotated_refresh = data.pop('refresh', None)
        if rotated_refresh and settings.JWT_REFRESH_IN_BODY:
            data['refresh'] = rotated_refresh
        response = Response(data, status=status.HTTP_200_OK)
        if rotated_refresh:
            set_refresh_cookie(response, rotated_refresh)
        return response


class LogoutView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    @extend_schema(
        request=LogoutSerializer,
        responses=inline_serializer(
            name='LogoutResponse',
            fields={'detail': serializers.CharField()},
        ),
        tags=['auth'],
    )
    def post(self, request):
        serializer = LogoutSerializer(data={'refresh': get_refresh_from_request(request)})
        serializer.is_valid(raise_exception=True)
        raw_refresh = serializer.validated_data['refresh']

        try:
            refresh = RefreshToken(raw_refresh)
        except TokenError:
            # A second logout with the same, already-blacklisted token is a
            # successful no-op. Never mutate state from an unverified token.
            try:
                unverified = RefreshToken(raw_refresh, verify=False)
                unverified.verify_token_type()
                jti = unverified[jwt_api_settings.JTI_CLAIM]
            except (TokenError, KeyError):
                raise serializers.ValidationError({'refresh': 'Invalid refresh token.'})

            already_revoked = BlacklistedToken.objects.filter(
                token__jti=jti,
                token__user=request.user,
            ).exists()
            if not already_revoked:
                raise serializers.ValidationError({'refresh': 'Invalid refresh token.'})
            return clear_refresh_cookie(Response({'detail': 'Session already logged out.'}))

        token_user_id = refresh.get(jwt_api_settings.USER_ID_CLAIM)
        request_user_id = getattr(request.user, jwt_api_settings.USER_ID_FIELD)
        if str(token_user_id) != str(request_user_id):
            raise serializers.ValidationError({'refresh': 'Invalid refresh token.'})

        refresh.blacklist()
        return clear_refresh_cookie(Response({'detail': 'Logged out.'}))


class UserListView(generics.ListAPIView):
    queryset = User.objects.select_related('tariff').annotate(
        bookings_total=Count('bookings'),
    ).order_by('-date_joined')
    serializer_class = AdminUserSerializer
    permission_classes = (IsAdminUserRole,)


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.select_related('tariff').annotate(
        bookings_total=Count('bookings'),
    )
    serializer_class = AdminUserSerializer
    permission_classes = (IsAdminUserRole,)

    def perform_update(self, serializer):
        user = self.get_object()
        previous_role = user.role
        requested_role = serializer.validated_data.get('role', previous_role)
        if user.pk == self.request.user.pk and requested_role != previous_role:
            raise serializers.ValidationError({
                'role': 'You cannot change your own role. Ask another administrator.',
            })
        updated_user = serializer.save()
        if previous_role != updated_user.role:
            create_audit_log(
                actor=self.request.user,
                action='user.role_updated',
                object_type='User',
                object_id=updated_user.id,
                metadata={
                    'username': updated_user.username,
                    'previous_role': previous_role,
                    'role': updated_user.role,
                },
            )
