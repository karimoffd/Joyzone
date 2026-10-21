from datetime import timedelta
from io import StringIO
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.conf import settings
from django.core.cache import cache
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken

from core.models import AuditLog
from .models import OTPVerification
from .views import (
    OTPSendThrottle,
    OTPVerifyAccountThrottle,
    OTPVerifyThrottle,
)


class DevAdminLoginPermissionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        get_user_model().objects.create_user(username='dev-admin', password='pass', role='admin')

    @override_settings(DEBUG=True, DEV_OTP_ENABLED=True)
    def test_dev_admin_login_is_available_in_debug(self):
        response = self.client.post('/api/auth/dev-admin-login/')

        self.assertEqual(response.status_code, 200)
        self.assertIn('access', response.data)

    @override_settings(DEBUG=False, DEV_OTP_ENABLED=True)
    def test_dev_admin_login_is_blocked_in_production_mode(self):
        response = self.client.post('/api/auth/dev-admin-login/')

        self.assertEqual(response.status_code, 403)
        self.assertNotIn('access', response.data)

    @override_settings(DEBUG=True, DEV_OTP_ENABLED=False)
    def test_dev_admin_login_requires_explicit_dev_bypass_switch(self):
        response = self.client.post('/api/auth/dev-admin-login/')

        self.assertEqual(response.status_code, 403)
        self.assertNotIn('access', response.data)


@override_settings(DEBUG=True, DEV_OTP_ENABLED=True)
class AuthApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_verify_otp_with_dev_code_returns_jwt_and_profile(self):
        response = self.client.post(
            '/api/auth/verify-otp/',
            {'phone_number': '+998901234567', 'otp_code': '111111'},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['profile']['phone_number'], '+998901234567')

    def test_jwt_profile_access_requires_and_accepts_bearer_token(self):
        unauthenticated = self.client.get('/api/auth/profile/')
        self.assertIn(unauthenticated.status_code, (401, 403))

        login = self.client.post(
            '/api/auth/verify-otp/',
            {'phone_number': '+998909998877', 'otp_code': '111111'},
            format='json',
        )
        token = login.data['access']

        response = self.client.get('/api/auth/profile/', HTTP_AUTHORIZATION=f'Bearer {token}')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['username'], '+998909998877')

    def test_refresh_token_endpoint_returns_new_access_token(self):
        login = self.client.post(
            '/api/auth/verify-otp/',
            {'phone_number': '+998901112233', 'otp_code': '111111'},
            format='json',
        )

        response = self.client.post(
            '/api/auth/token/refresh/',
            {'refresh': login.data['refresh']},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn('access', response.data)

    def test_profile_patch_persists_supported_fields(self):
        login = self.client.post(
            '/api/auth/verify-otp/',
            {'phone_number': '+998907770011', 'otp_code': '111111'},
            format='json',
        )
        token = login.data['access']

        response = self.client.patch(
            '/api/auth/profile/',
            {
                'first_name': 'Aziz',
                'last_name': 'Karimov',
                'email': 'aziz@example.com',
                'phone_number': '+998907770022',
                'avatar': 'data:image/png;base64,dGVzdA==',
            },
            format='json',
            HTTP_AUTHORIZATION=f'Bearer {token}',
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['first_name'], 'Aziz')
        self.assertEqual(response.data['last_name'], 'Karimov')
        self.assertEqual(response.data['email'], 'aziz@example.com')
        self.assertEqual(response.data['phone_number'], '+998907770022')
        self.assertEqual(response.data['avatar'], 'data:image/png;base64,dGVzdA==')

        refreshed = self.client.get(
            '/api/auth/profile/',
            HTTP_AUTHORIZATION=f'Bearer {token}',
        )
        self.assertEqual(refreshed.data['first_name'], 'Aziz')
        self.assertEqual(refreshed.data['phone_number'], '+998907770022')


class JWTSessionLifecycleTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(
            username='+998901110001',
            phone_number='+998901110001',
            role='client',
        )

    def issue_session(self):
        refresh = RefreshToken.for_user(self.user)
        return str(refresh.access_token), str(refresh)

    def authenticated_client(self, access):
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')
        return client

    def test_logout_blacklists_refresh_and_refresh_after_logout_fails(self):
        access, refresh = self.issue_session()
        client = self.authenticated_client(access)

        logout = client.post('/api/auth/logout/', {'refresh': refresh}, format='json')
        refresh_attempt = self.client.post(
            '/api/auth/token/refresh/', {'refresh': refresh}, format='json'
        )

        self.assertEqual(logout.status_code, 200)
        self.assertEqual(refresh_attempt.status_code, 401)
        self.assertEqual(BlacklistedToken.objects.count(), 1)

    def test_repeated_logout_is_an_authenticated_idempotent_noop(self):
        access, refresh = self.issue_session()
        client = self.authenticated_client(access)

        first = client.post('/api/auth/logout/', {'refresh': refresh}, format='json')
        second = client.post('/api/auth/logout/', {'refresh': refresh}, format='json')

        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(second.data['detail'], 'Session already logged out.')
        self.assertEqual(BlacklistedToken.objects.count(), 1)

    def test_logout_rejects_anonymous_and_another_users_refresh(self):
        access, _ = self.issue_session()
        other = get_user_model().objects.create_user(username='+998901110002')
        other_refresh = str(RefreshToken.for_user(other))

        anonymous = self.client.post(
            '/api/auth/logout/', {'refresh': other_refresh}, format='json'
        )
        mismatch = self.authenticated_client(access).post(
            '/api/auth/logout/', {'refresh': other_refresh}, format='json'
        )

        self.assertEqual(anonymous.status_code, 401)
        self.assertEqual(mismatch.status_code, 400)
        self.assertFalse(
            BlacklistedToken.objects.filter(token__user=other).exists()
        )

    def test_refresh_rotation_returns_new_refresh_and_rejects_replay(self):
        _, refresh = self.issue_session()

        first = self.client.post(
            '/api/auth/token/refresh/', {'refresh': refresh}, format='json'
        )
        replay = self.client.post(
            '/api/auth/token/refresh/', {'refresh': refresh}, format='json'
        )
        next_refresh = first.data['refresh']
        second_rotation = self.client.post(
            '/api/auth/token/refresh/', {'refresh': next_refresh}, format='json'
        )

        self.assertEqual(first.status_code, 200)
        self.assertIn('access', first.data)
        self.assertIn('refresh', first.data)
        self.assertNotEqual(next_refresh, refresh)
        self.assertEqual(replay.status_code, 401)
        self.assertEqual(second_rotation.status_code, 200)
        self.assertIn('refresh', second_rotation.data)

    def test_two_refresh_attempts_can_consume_old_token_only_once(self):
        _, refresh = self.issue_session()

        responses = [
            self.client.post(
                '/api/auth/token/refresh/', {'refresh': refresh}, format='json'
            )
            for _ in range(2)
        ]

        self.assertEqual([response.status_code for response in responses], [200, 401])
        self.assertEqual(sum('refresh' in response.data for response in responses), 1)

    def test_expired_access_is_rejected_and_default_lifetime_is_short(self):
        expired = AccessToken.for_user(self.user)
        expired.set_exp(lifetime=timedelta(seconds=-1))

        response = self.client.get(
            '/api/auth/profile/',
            HTTP_AUTHORIZATION=f'Bearer {expired}',
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(
            settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'],
            timedelta(minutes=settings.JWT_ACCESS_TOKEN_MINUTES),
        )
        self.assertGreater(settings.JWT_ACCESS_TOKEN_MINUTES, 0)


class UniversalDevOTPGuardTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        User = get_user_model()
        self.accounts = (
            ('admin', '+998900001001', {'role': 'admin'}),
            ('moderator', '+998900001002', {'role': 'moderator'}),
            ('staff', '+998900001003', {'role': 'client', 'is_staff': True}),
            (
                'superuser',
                '+998900001004',
                {'role': 'client', 'is_staff': True, 'is_superuser': True},
            ),
            ('client', '+998900001005', {'role': 'client'}),
        )
        for _, phone, attributes in self.accounts:
            User.objects.create_user(
                username=phone,
                phone_number=phone,
                password='pass',
                **attributes,
            )

    @override_settings(DEBUG=False, DEV_OTP_ENABLED=True)
    def test_fixed_dev_code_never_issues_tokens_in_production(self):
        initial_user_count = get_user_model().objects.count()

        for index, (account_type, phone, _) in enumerate(self.accounts, start=1):
            with self.subTest(account_type=account_type):
                response = self.client.post(
                    '/api/auth/verify-otp/',
                    {'phone_number': phone, 'otp_code': '111111'},
                    format='json',
                    REMOTE_ADDR=f'127.0.1.{index}',
                )
                self.assertEqual(response.status_code, 400)
                self.assertNotIn('access', response.data)
                self.assertNotIn('refresh', response.data)

        missing_phone = '+998900001006'
        response = self.client.post(
            '/api/auth/verify-otp/',
            {'phone_number': missing_phone, 'otp_code': '111111'},
            format='json',
            REMOTE_ADDR='127.0.1.20',
        )
        self.assertEqual(response.status_code, 400)
        self.assertNotIn('access', response.data)
        self.assertFalse(get_user_model().objects.filter(username=missing_phone).exists())
        self.assertEqual(get_user_model().objects.count(), initial_user_count)

    @override_settings(DEBUG=False, DEV_OTP_ENABLED=True)
    def test_fixed_dev_code_is_rejected_even_if_stored_as_an_otp(self):
        phone = self.accounts[0][1]
        otp = OTPVerification.objects.create(phone_number=phone, otp_code='111111')

        response = self.client.post(
            '/api/auth/verify-otp/',
            {'phone_number': phone, 'otp_code': '111111'},
            format='json',
            REMOTE_ADDR='127.0.2.1',
        )

        self.assertEqual(response.status_code, 400)
        self.assertNotIn('access', response.data)
        otp.refresh_from_db()
        self.assertFalse(otp.is_used)

    @override_settings(DEBUG=True, DEV_OTP_ENABLED=False)
    def test_fixed_dev_code_requires_explicit_dev_bypass_switch(self):
        phone = self.accounts[-1][1]

        response = self.client.post(
            '/api/auth/verify-otp/',
            {'phone_number': phone, 'otp_code': '111111'},
            format='json',
            REMOTE_ADDR='127.0.2.2',
        )

        self.assertEqual(response.status_code, 400)
        self.assertNotIn('access', response.data)

    @override_settings(DEBUG=False, DEV_OTP_ENABLED=False)
    def test_regular_stored_otp_still_works_in_production(self):
        phone = self.accounts[-1][1]
        otp = OTPVerification.objects.create(phone_number=phone, otp_code='654321')

        response = self.client.post(
            '/api/auth/verify-otp/',
            {'phone_number': phone, 'otp_code': '654321'},
            format='json',
            REMOTE_ADDR='127.0.2.3',
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        otp.refresh_from_db()
        self.assertTrue(otp.is_used)


@override_settings(OTP_TTL_SECONDS=300, DEBUG=False, DEV_OTP_ENABLED=False)
class OTPExpirationAndConsumptionTests(TestCase):
    phone = '+998900002001'
    fixed_now = timezone.now().replace(microsecond=500000)

    def setUp(self):
        cache.clear()
        self.client = APIClient()

    def tearDown(self):
        cache.clear()

    def create_otp(self, code, age):
        otp = OTPVerification.objects.create(phone_number=self.phone, otp_code=code)
        OTPVerification.objects.filter(pk=otp.pk).update(
            created_at=self.fixed_now - age,
        )
        otp.refresh_from_db()
        return otp

    def verify(self, code, remote_addr):
        with patch('users.views.timezone.now', return_value=self.fixed_now):
            return self.client.post(
                '/api/auth/verify-otp/',
                {'phone_number': self.phone, 'otp_code': code},
                format='json',
                REMOTE_ADDR=remote_addr,
            )

    def test_otp_just_before_ttl_is_consumed_once(self):
        otp = self.create_otp('210001', timedelta(seconds=300) - timedelta(microseconds=1))

        response = self.verify('210001', '127.0.13.1')

        self.assertEqual(response.status_code, 200)
        self.assertIn('access', response.data)
        otp.refresh_from_db()
        self.assertTrue(otp.is_used)
        self.assertTrue(get_user_model().objects.filter(username=self.phone).exists())

    def test_otp_exactly_at_ttl_is_expired_without_side_effects(self):
        otp = self.create_otp('210002', timedelta(seconds=300))

        response = self.verify('210002', '127.0.13.2')

        self.assertEqual(response.status_code, 400)
        self.assertNotIn('access', response.data)
        otp.refresh_from_db()
        self.assertFalse(otp.is_used)
        self.assertFalse(get_user_model().objects.filter(username=self.phone).exists())

    def test_otp_after_ttl_is_expired_without_side_effects(self):
        otp = self.create_otp('210003', timedelta(seconds=301))

        response = self.verify('210003', '127.0.13.3')

        self.assertEqual(response.status_code, 400)
        self.assertNotIn('access', response.data)
        otp.refresh_from_db()
        self.assertFalse(otp.is_used)
        self.assertFalse(get_user_model().objects.filter(username=self.phone).exists())

    def test_two_verify_requests_can_consume_code_only_once(self):
        first_otp = self.create_otp('210004', timedelta(seconds=10))
        legacy_duplicate = self.create_otp('210004', timedelta(seconds=9))

        first = self.verify('210004', '127.0.13.4')
        second = self.verify('210004', '127.0.13.5')

        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 400)
        self.assertNotIn('access', second.data)
        first_otp.refresh_from_db()
        legacy_duplicate.refresh_from_db()
        self.assertTrue(first_otp.is_used)
        self.assertTrue(legacy_duplicate.is_used)
        self.assertEqual(get_user_model().objects.filter(username=self.phone).count(), 1)

    def test_resend_invalidates_previous_code_and_only_new_code_works(self):
        with patch('users.views.random.randint', side_effect=(210005, 210006)):
            first_send = self.client.post(
                '/api/auth/send-otp/',
                {'phone_number': self.phone},
                format='json',
                REMOTE_ADDR='127.0.14.1',
            )
            second_send = self.client.post(
                '/api/auth/send-otp/',
                {'phone_number': self.phone},
                format='json',
                REMOTE_ADDR='127.0.14.2',
            )

        self.assertEqual(first_send.status_code, 200)
        self.assertEqual(second_send.status_code, 200)
        first_otp = OTPVerification.objects.get(otp_code='210005')
        second_otp = OTPVerification.objects.get(otp_code='210006')
        self.assertTrue(first_otp.is_used)
        self.assertFalse(second_otp.is_used)

        old_verify = self.verify('210005', '127.0.14.3')
        self.assertEqual(old_verify.status_code, 400)
        self.assertNotIn('access', old_verify.data)
        self.assertFalse(get_user_model().objects.filter(username=self.phone).exists())

        new_verify = self.verify('210006', '127.0.14.4')
        self.assertEqual(new_verify.status_code, 200)
        second_otp.refresh_from_db()
        self.assertTrue(second_otp.is_used)
        self.assertEqual(get_user_model().objects.filter(username=self.phone).count(), 1)


class OTPThrottleSecurityTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()

    def tearDown(self):
        cache.clear()

    def test_existing_ip_rates_remain_strict(self):
        self.assertEqual(OTPSendThrottle.rate, '3/minute')
        self.assertEqual(OTPVerifyThrottle.rate, '5/minute')

    @override_settings(OTP_VERIFY_ACCOUNT_RATE='5/minute')
    def test_normalized_account_limit_cannot_be_bypassed_by_changing_ip(self):
        variants = (
            '+998 90 700 00 01',
            '+998907000001',
            '+998 (90) 700-00-01',
            '+998-90-700-00-01',
            '+998 907 000 001',
            '+998907000001',
        )
        responses = [
            self.client.post(
                '/api/auth/verify-otp/',
                {'phone_number': phone, 'otp_code': '987654'},
                format='json',
                REMOTE_ADDR=f'127.0.30.{index}',
            )
            for index, phone in enumerate(variants, start=1)
        ]

        self.assertEqual([response.status_code for response in responses[:5]], [400] * 5)
        throttled = responses[5]
        self.assertEqual(throttled.status_code, 429)
        self.assertIn('Retry-After', throttled)
        self.assertGreater(int(throttled['Retry-After']), 0)
        self.assertIn('Too many OTP attempts', throttled.data['detail'])
        self.assertNotIn('admin', throttled.data['detail'].lower())
        self.assertFalse(get_user_model().objects.filter(username='+998907000001').exists())
        self.assertEqual(OTPVerification.objects.count(), 0)

    @override_settings(OTP_VERIFY_ACCOUNT_RATE='50/minute')
    def test_ip_limit_still_applies_across_different_accounts(self):
        responses = [
            self.client.post(
                '/api/auth/verify-otp/',
                {'phone_number': f'+9989071000{index:02d}', 'otp_code': '987654'},
                format='json',
                REMOTE_ADDR='127.0.31.1',
            )
            for index in range(1, 7)
        ]

        self.assertEqual([response.status_code for response in responses[:5]], [400] * 5)
        self.assertEqual(responses[5].status_code, 429)
        self.assertIn('Retry-After', responses[5])

    def test_invalid_response_does_not_reveal_privileged_account_existence(self):
        admin_phone = '+998907110001'
        get_user_model().objects.create_user(
            username=admin_phone,
            phone_number=admin_phone,
            password='pass',
            role='admin',
            is_staff=True,
        )

        admin_response = self.client.post(
            '/api/auth/verify-otp/',
            {'phone_number': admin_phone, 'otp_code': '987654'},
            format='json',
            REMOTE_ADDR='127.0.31.2',
        )
        missing_response = self.client.post(
            '/api/auth/verify-otp/',
            {'phone_number': '+998907110002', 'otp_code': '987654'},
            format='json',
            REMOTE_ADDR='127.0.31.3',
        )

        self.assertEqual(admin_response.status_code, 400)
        self.assertEqual(missing_response.status_code, 400)
        self.assertEqual(admin_response.data, missing_response.data)
        self.assertNotIn('admin', str(admin_response.data).lower())

    @override_settings(OTP_SEND_ACCOUNT_RATE='3/minute', DEBUG=False, DEV_OTP_CONSOLE_LOG_ENABLED=False)
    def test_send_account_limit_applies_across_ips_without_extra_challenge(self):
        variants = (
            '+998 90 720 00 01',
            '+998907200001',
            '+998 (90) 720-00-01',
            '+998-90-720-00-01',
        )
        with patch('users.views.random.randint', side_effect=(310001, 310002, 310003)):
            responses = [
                self.client.post(
                    '/api/auth/send-otp/',
                    {'phone_number': phone},
                    format='json',
                    REMOTE_ADDR=f'127.0.32.{index}',
                )
                for index, phone in enumerate(variants, start=1)
            ]

        self.assertEqual([response.status_code for response in responses[:3]], [200] * 3)
        self.assertEqual(responses[3].status_code, 429)
        self.assertIn('Retry-After', responses[3])
        challenges = OTPVerification.objects.filter(phone_number='+998907200001')
        self.assertEqual(challenges.count(), 3)
        self.assertEqual(challenges.filter(is_used=False).count(), 1)

    @override_settings(OTP_VERIFY_ACCOUNT_RATE='2/second')
    def test_account_limit_window_resets_without_sleep(self):
        clock = [1000.0]
        with patch.object(OTPVerifyAccountThrottle, 'timer', new=lambda self: clock[0]):
            first = self.client.post(
                '/api/auth/verify-otp/',
                {'phone_number': '+998907300001', 'otp_code': '987654'},
                format='json',
                REMOTE_ADDR='127.0.33.1',
            )
            second = self.client.post(
                '/api/auth/verify-otp/',
                {'phone_number': '+998 90 730 00 01', 'otp_code': '987654'},
                format='json',
                REMOTE_ADDR='127.0.33.2',
            )
            blocked = self.client.post(
                '/api/auth/verify-otp/',
                {'phone_number': '+998-90-730-00-01', 'otp_code': '987654'},
                format='json',
                REMOTE_ADDR='127.0.33.3',
            )
            clock[0] += 1.1
            after_window = self.client.post(
                '/api/auth/verify-otp/',
                {'phone_number': '+998907300001', 'otp_code': '987654'},
                format='json',
                REMOTE_ADDR='127.0.33.4',
            )

        self.assertEqual(first.status_code, 400)
        self.assertEqual(second.status_code, 400)
        self.assertEqual(blocked.status_code, 429)
        self.assertEqual(after_window.status_code, 400)

    @override_settings(DEBUG=False, DEV_OTP_CONSOLE_LOG_ENABLED=True)
    def test_production_otp_log_contains_no_code_token_or_full_phone(self):
        phone = '+998 90 740 00 01'
        with patch('users.views.random.randint', return_value=417263):
            with self.assertLogs('joyzone.auth', level='INFO') as captured:
                response = self.client.post(
                    '/api/auth/send-otp/',
                    {'phone_number': phone},
                    format='json',
                    REMOTE_ADDR='127.0.34.1',
                )

        log_output = '\n'.join(captured.output)
        self.assertEqual(response.status_code, 200)
        self.assertNotIn('417263', log_output)
        self.assertNotIn(phone, log_output)
        self.assertNotIn('+998907400001', log_output)
        self.assertNotIn('access', log_output.lower())
        self.assertNotIn('refresh', log_output.lower())
        self.assertIn('login_ref=', log_output)

    @override_settings(DEBUG=True, DEV_OTP_CONSOLE_LOG_ENABLED=True)
    def test_explicit_dev_log_may_show_code_but_masks_phone(self):
        phone = '+998 90 750 00 01'
        with patch('users.views.random.randint', return_value=527364):
            with self.assertLogs('joyzone.auth', level='WARNING') as captured:
                response = self.client.post(
                    '/api/auth/send-otp/',
                    {'phone_number': phone},
                    format='json',
                    REMOTE_ADDR='127.0.35.1',
                )

        log_output = '\n'.join(captured.output)
        self.assertEqual(response.status_code, 200)
        self.assertIn('527364', log_output)
        self.assertNotIn(phone, log_output)
        self.assertNotIn('+998907500001', log_output)
        self.assertIn('+9***01', log_output)

class PublicDemoLoginTests(TestCase):
    password = 'correct-horse-demo-battery-92'

    def setUp(self):
        self.client = APIClient()
        User = get_user_model()
        self.demo_client = User.objects.create_user(
            username='public_demo_client_a7f2',
            password=self.password,
            role='client',
            first_name='Demo',
        )
        self.demo_partner = User.objects.create_user(
            username='public_demo_partner_b9e4',
            password=self.password,
            role='partner',
            first_name='Demo',
        )
        self.protected_accounts = (
            User.objects.create_user(
                username='public_demo_admin', password=self.password, role='admin'
            ),
            User.objects.create_user(
                username='public_demo_moderator', password=self.password, role='moderator'
            ),
            User.objects.create_user(
                username='public_demo_staff', password=self.password, role='client', is_staff=True
            ),
            User.objects.create_user(
                username='public_demo_superuser',
                password=self.password,
                role='client',
                is_staff=True,
                is_superuser=True,
            ),
        )
        self.regular_user = User.objects.create_user(
            username='+998909990099', password=self.password, role='client'
        )

    def demo_settings(self, **overrides):
        values = {
            'PUBLIC_DEMO_LOGIN_ENABLED': True,
            'PUBLIC_DEMO_DATA_ISOLATED': True,
            'PUBLIC_DEMO_ACCOUNT_USERNAMES': [
                self.demo_client.username,
                self.demo_partner.username,
            ],
            'PUBLIC_DEMO_ACCOUNT_PREFIX': 'public_demo_',
            'PUBLIC_DEMO_LOGIN_EXPIRES_AT': (
                timezone.now() + timedelta(hours=2)
            ).isoformat(),
            'PUBLIC_DEMO_SESSION_MINUTES': 30,
            'PUBLIC_DEMO_LOGIN_RATE': '100/minute',
        }
        values.update(overrides)
        return self.settings(**values)

    def test_allowlisted_client_and_partner_receive_short_lived_demo_tokens(self):
        initial_user_count = get_user_model().objects.count()

        with self.demo_settings():
            for index, user in enumerate((self.demo_client, self.demo_partner), start=1):
                with self.subTest(role=user.role):
                    response = self.client.post(
                        '/api/auth/demo-login/',
                        {'account': user.username, 'password': self.password},
                        format='json',
                        REMOTE_ADDR=f'127.0.6.{index}',
                    )
                    self.assertEqual(response.status_code, 200)
                    self.assertFalse(response.data['is_new_user'])
                    self.assertEqual(response.data['profile']['id'], user.id)

                    access = AccessToken(response.data['access'])
                    refresh = RefreshToken(response.data['refresh'])
                    self.assertTrue(access['demo_session'])
                    self.assertTrue(refresh['demo_session'])
                    self.assertLessEqual(access['exp'] - access['iat'], 30 * 60 + 1)
                    self.assertLessEqual(refresh['exp'] - refresh['iat'], 30 * 60 + 1)

                    refreshed_response = self.client.post(
                        '/api/auth/token/refresh/',
                        {'refresh': response.data['refresh']},
                        format='json',
                    )
                    self.assertEqual(refreshed_response.status_code, 200)
                    refreshed_access = AccessToken(refreshed_response.data['access'])
                    self.assertTrue(refreshed_access['demo_session'])
                    self.assertLessEqual(refreshed_access['exp'], refresh['exp'])

        self.assertEqual(get_user_model().objects.count(), initial_user_count)

    def test_protected_accounts_are_refused_even_if_operator_allowlists_them(self):
        usernames = [user.username for user in self.protected_accounts]
        with self.demo_settings(PUBLIC_DEMO_ACCOUNT_USERNAMES=usernames):
            for index, user in enumerate(self.protected_accounts, start=1):
                with self.subTest(username=user.username):
                    response = self.client.post(
                        '/api/auth/demo-login/',
                        {'account': user.username, 'password': self.password},
                        format='json',
                        REMOTE_ADDR=f'127.0.7.{index}',
                    )
                    self.assertEqual(response.status_code, 403)
                    self.assertNotIn('access', response.data)
                    self.assertNotIn('refresh', response.data)
                    user.refresh_from_db()
                    self.assertIsNone(user.last_login)

    def test_non_allowlisted_real_account_is_refused_without_side_effects(self):
        initial_user_count = get_user_model().objects.count()
        with self.demo_settings():
            response = self.client.post(
                '/api/auth/demo-login/',
                {'account': self.regular_user.username, 'password': self.password},
                format='json',
                REMOTE_ADDR='127.0.8.1',
            )

        self.assertEqual(response.status_code, 403)
        self.assertNotIn('access', response.data)
        self.assertEqual(get_user_model().objects.count(), initial_user_count)
        self.regular_user.refresh_from_db()
        self.assertIsNone(self.regular_user.last_login)

    def test_disabled_or_non_isolated_mode_refuses_demo_login(self):
        for isolated, enabled in ((True, False), (False, True)):
            with self.subTest(isolated=isolated, enabled=enabled):
                with self.demo_settings(
                    PUBLIC_DEMO_DATA_ISOLATED=isolated,
                    PUBLIC_DEMO_LOGIN_ENABLED=enabled,
                ):
                    response = self.client.post(
                        '/api/auth/demo-login/',
                        {'account': self.demo_client.username, 'password': self.password},
                        format='json',
                        REMOTE_ADDR=f'127.0.9.{int(isolated) + int(enabled) + 1}',
                    )
                self.assertEqual(response.status_code, 403)
                self.assertNotIn('access', response.data)

    def test_expired_mode_is_hidden_and_refuses_login(self):
        expired_at = (timezone.now() - timedelta(minutes=1)).isoformat()
        with self.demo_settings(PUBLIC_DEMO_LOGIN_EXPIRES_AT=expired_at):
            status_response = self.client.get('/api/auth/demo-login/status/')
            login_response = self.client.post(
                '/api/auth/demo-login/',
                {'account': self.demo_client.username, 'password': self.password},
                format='json',
                REMOTE_ADDR='127.0.10.1',
            )

        self.assertEqual(status_response.status_code, 200)
        self.assertFalse(status_response.data['enabled'])
        self.assertIsNone(status_response.data['expires_at'])
        self.assertEqual(login_response.status_code, 403)
        self.assertNotIn('access', login_response.data)

    def test_status_exposes_policy_but_not_accounts_or_credentials(self):
        with self.demo_settings():
            response = self.client.get('/api/auth/demo-login/status/')

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['enabled'])
        self.assertEqual(response.data['session_minutes'], 30)
        payload = str(response.data)
        self.assertNotIn(self.demo_client.username, payload)
        self.assertNotIn(self.password, payload)

    def test_demo_login_is_rate_limited(self):
        with self.demo_settings(PUBLIC_DEMO_LOGIN_RATE='1/minute'):
            first = self.client.post(
                '/api/auth/demo-login/',
                {'account': self.demo_client.username, 'password': 'wrong'},
                format='json',
                REMOTE_ADDR='127.0.11.1',
            )
            second = self.client.post(
                '/api/auth/demo-login/',
                {'account': self.demo_client.username, 'password': 'wrong'},
                format='json',
                REMOTE_ADDR='127.0.11.1',
            )

        self.assertEqual(first.status_code, 403)
        self.assertEqual(second.status_code, 429)


class PublicDemoAccountCommandTests(TestCase):
    @override_settings(
        PUBLIC_DEMO_DATA_ISOLATED=True,
        PUBLIC_DEMO_ACCOUNT_PREFIX='public_demo_',
    )
    def test_command_creates_random_non_privileged_account(self):
        output = StringIO()

        call_command(
            'create_public_demo_account',
            '--role=partner',
            '--acknowledge-isolated-database',
            stdout=output,
        )

        lines = output.getvalue().splitlines()
        account = next(line.split('=', 1)[1] for line in lines if line.startswith('account='))
        password = next(line.split('=', 1)[1] for line in lines if line.startswith('password='))
        user = get_user_model().objects.get(username=account)
        self.assertTrue(account.startswith('public_demo_partner_'))
        self.assertGreaterEqual(len(password), 24)
        self.assertTrue(user.check_password(password))
        self.assertEqual(user.role, 'partner')
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)

    @override_settings(PUBLIC_DEMO_DATA_ISOLATED=False)
    def test_command_refuses_non_isolated_database(self):
        with self.assertRaises(CommandError):
            call_command(
                'create_public_demo_account',
                '--acknowledge-isolated-database',
                stdout=StringIO(),
            )


class UserManagementApiTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.client = APIClient()
        self.admin = User.objects.create_user(username='users-admin', password='pass', role='admin')
        self.regular_user = User.objects.create_user(
            username='users-client',
            password='pass',
            role='client',
            first_name='Ali',
            last_name='Karimov',
            email='ali@example.com',
            phone_number='+998901234567',
        )

    def test_regular_user_cannot_list_or_update_users(self):
        self.client.force_authenticate(self.regular_user)

        list_response = self.client.get('/api/auth/users/')
        update_response = self.client.patch(
            f'/api/auth/users/{self.admin.id}/',
            {'role': 'client'},
            format='json',
        )

        self.assertEqual(list_response.status_code, 403)
        self.assertEqual(update_response.status_code, 403)

    def test_admin_user_list_exposes_management_fields(self):
        self.client.force_authenticate(self.admin)

        response = self.client.get('/api/auth/users/')

        self.assertEqual(response.status_code, 200)
        rows = response.data.get('results', response.data) if isinstance(response.data, dict) else response.data
        row = next(item for item in rows if item['id'] == self.regular_user.id)
        for field in (
            'id', 'username', 'first_name', 'last_name', 'phone_number', 'email',
            'role', 'tariff_details', 'tariff_expires_at', 'balance', 'bookings_count',
        ):
            self.assertIn(field, row)

    def test_admin_role_update_creates_audit_log(self):
        self.client.force_authenticate(self.admin)

        response = self.client.patch(
            f'/api/auth/users/{self.regular_user.id}/',
            {'role': 'partner', 'balance': '999999', 'is_superuser': True, 'is_staff': True},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.regular_user.refresh_from_db()
        self.assertEqual(self.regular_user.role, 'partner')
        self.assertEqual(self.regular_user.balance, 0)
        self.assertFalse(self.regular_user.is_superuser)
        self.assertFalse(self.regular_user.is_staff)

        audit = AuditLog.objects.get(
            action='user.role_updated',
            object_type='User',
            object_id=str(self.regular_user.id),
        )
        self.assertEqual(audit.actor, self.admin)
        self.assertEqual(audit.metadata['previous_role'], 'client')
        self.assertEqual(audit.metadata['role'], 'partner')

        audit_response = self.client.get('/api/audit-logs/', {
            'action': 'user.role_updated',
            'object_id': self.regular_user.id,
        })
        self.assertEqual(audit_response.status_code, 200)
        self.assertEqual(len(audit_response.data), 1)

    def test_admin_cannot_change_own_role(self):
        self.client.force_authenticate(self.admin)

        response = self.client.patch(
            f'/api/auth/users/{self.admin.id}/',
            {'role': 'client'},
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.admin.refresh_from_db()
        self.assertEqual(self.admin.role, 'admin')
