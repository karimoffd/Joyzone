from datetime import timedelta
from io import StringIO
import json
import os
from pathlib import Path
import subprocess
import sys

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import SimpleTestCase, TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from bookings.models import Booking
from payments.models import Payment
from places.models import Category, Parameter, ParameterGroup, Place, Review, SubCategory
from tariffs.models import TariffPlan
from .audit import create_audit_log
from .models import AuditLog


class ProductionSettingsImportTests(SimpleTestCase):
    security_env_keys = (
        'DEBUG',
        'SECRET_KEY',
        'ALLOWED_HOSTS',
        'CORS_ALLOWED_ORIGINS',
        'CORS_ALLOW_ALL_ORIGINS',
        'CSRF_TRUSTED_ORIGINS',
        'JWT_ACCESS_TOKEN_MINUTES',
        'JWT_REFRESH_TOKEN_DAYS',
    )
    script = (
        "import json; import core.settings as settings; "
        "print(json.dumps({"
        "'debug': settings.DEBUG, "
        "'uses_dev_secret': settings.SECRET_KEY.startswith('django-insecure-'), "
        "'allowed_hosts': settings.ALLOWED_HOSTS, "
        "'cors_origins': settings.CORS_ALLOWED_ORIGINS, "
        "'cors_all': settings.CORS_ALLOW_ALL_ORIGINS, "
        "'csrf_origins': settings.CSRF_TRUSTED_ORIGINS, "
        "'jwt_access_minutes': settings.JWT_ACCESS_TOKEN_MINUTES, "
        "'jwt_refresh_days': settings.JWT_REFRESH_TOKEN_DAYS, "
        "'jwt_rotate': settings.SIMPLE_JWT['ROTATE_REFRESH_TOKENS'], "
        "'jwt_blacklist': settings.SIMPLE_JWT['BLACKLIST_AFTER_ROTATION']"
        "}))"
    )

    def run_settings_import(self, overrides=None):
        environment = os.environ.copy()
        for key in self.security_env_keys:
            environment.pop(key, None)
        environment.update(overrides or {})
        environment['PYTHONDONTWRITEBYTECODE'] = '1'
        return subprocess.run(
            [sys.executable, '-c', self.script],
            cwd=Path(__file__).resolve().parent.parent,
            env=environment,
            capture_output=True,
            text=True,
            check=False,
        )

    def valid_production_env(self, **overrides):
        environment = {
            'DEBUG': 'False',
            'SECRET_KEY': 'production-test-secret-key-with-more-than-32-characters',
            'ALLOWED_HOSTS': 'api.joyzone.test',
            'CORS_ALLOWED_ORIGINS': 'https://joyzone.test,https://www.joyzone.test',
            'CORS_ALLOW_ALL_ORIGINS': 'False',
            'CSRF_TRUSTED_ORIGINS': 'https://joyzone.test',
        }
        environment.update(overrides)
        return environment

    def assert_import_error(self, result, setting_name, secret_value=None):
        self.assertNotEqual(result.returncode, 0)
        output = f'{result.stdout}\n{result.stderr}'
        self.assertIn('ImproperlyConfigured', output)
        self.assertIn(setting_name, output)
        if secret_value:
            self.assertNotIn(secret_value, output)

    def test_no_env_keeps_zero_config_debug_development(self):
        result = self.run_settings_import()
        self.assertEqual(result.returncode, 0, result.stderr)
        payload = json.loads(result.stdout.strip())
        self.assertTrue(payload['debug'])
        self.assertTrue(payload['uses_dev_secret'])
        self.assertEqual(payload['allowed_hosts'], ['*'])
        self.assertTrue(payload['cors_all'])
        self.assertEqual(payload['jwt_access_minutes'], 15)
        self.assertEqual(payload['jwt_refresh_days'], 7)
        self.assertTrue(payload['jwt_rotate'])
        self.assertTrue(payload['jwt_blacklist'])

    def test_production_missing_secret_fails_without_echoing_secret(self):
        result = self.run_settings_import({'DEBUG': 'False', 'ALLOWED_HOSTS': 'api.joyzone.test'})
        self.assert_import_error(result, 'SECRET_KEY')

    def test_production_rejects_dev_or_short_secret_without_echoing_it(self):
        for secret in (
            'short-secret',
            'django-insecure-l+3m&((ixa2!e8n+2r&mkf%kal11^q9a2g6d&loi_(e=8lau8q',
        ):
            with self.subTest(secret_kind='dev' if secret.startswith('django-') else 'short'):
                result = self.run_settings_import(self.valid_production_env(SECRET_KEY=secret))
                self.assert_import_error(result, 'SECRET_KEY', secret_value=secret)

    def test_production_missing_allowed_hosts_fails(self):
        environment = self.valid_production_env()
        environment.pop('ALLOWED_HOSTS')
        result = self.run_settings_import(environment)
        self.assert_import_error(result, 'ALLOWED_HOSTS')

    def test_valid_production_environment_imports_and_parses_lists(self):
        result = self.run_settings_import(self.valid_production_env(
            ALLOWED_HOSTS=' api.joyzone.test , .internal.joyzone.test ',
            CORS_ALLOWED_ORIGINS=' https://joyzone.test , https://www.joyzone.test ',
            CSRF_TRUSTED_ORIGINS=' https://joyzone.test ',
        ))
        self.assertEqual(result.returncode, 0, result.stderr)
        payload = json.loads(result.stdout.strip())
        self.assertFalse(payload['debug'])
        self.assertFalse(payload['uses_dev_secret'])
        self.assertEqual(payload['allowed_hosts'], ['api.joyzone.test', '.internal.joyzone.test'])
        self.assertEqual(payload['cors_origins'], ['https://joyzone.test', 'https://www.joyzone.test'])
        self.assertEqual(payload['csrf_origins'], ['https://joyzone.test'])
        self.assertFalse(payload['cors_all'])

    def test_jwt_lifetimes_are_env_configurable_and_must_be_positive(self):
        result = self.run_settings_import(self.valid_production_env(
            JWT_ACCESS_TOKEN_MINUTES='10', JWT_REFRESH_TOKEN_DAYS='2',
        ))
        self.assertEqual(result.returncode, 0, result.stderr)
        payload = json.loads(result.stdout.strip())
        self.assertEqual(payload['jwt_access_minutes'], 10)
        self.assertEqual(payload['jwt_refresh_days'], 2)
        for setting_name in ('JWT_ACCESS_TOKEN_MINUTES', 'JWT_REFRESH_TOKEN_DAYS'):
            with self.subTest(setting_name=setting_name):
                invalid = self.run_settings_import(self.valid_production_env(**{setting_name: '0'}))
                self.assert_import_error(invalid, setting_name)

    def test_production_rejects_wildcard_hosts_and_cors(self):
        invalid_environments = (
            ('ALLOWED_HOSTS', self.valid_production_env(ALLOWED_HOSTS='*')),
            ('CORS_ALLOW_ALL_ORIGINS', self.valid_production_env(CORS_ALLOW_ALL_ORIGINS='True')),
            ('CORS_ALLOWED_ORIGINS', self.valid_production_env(CORS_ALLOWED_ORIGINS='https://*.joyzone.test')),
        )
        for setting_name, environment in invalid_environments:
            with self.subTest(setting_name=setting_name):
                result = self.run_settings_import(environment)
                self.assert_import_error(result, setting_name)

    def test_production_rejects_malformed_cors_and_csrf_origins(self):
        invalid_environments = (
            ('CORS_ALLOWED_ORIGINS', self.valid_production_env(CORS_ALLOWED_ORIGINS='joyzone.test')),
            ('CORS_ALLOWED_ORIGINS', self.valid_production_env(CORS_ALLOWED_ORIGINS='https://joyzone.test/path')),
            ('CSRF_TRUSTED_ORIGINS', self.valid_production_env(CSRF_TRUSTED_ORIGINS='https://joyzone.test?next=1')),
        )
        for setting_name, environment in invalid_environments:
            with self.subTest(setting_name=setting_name):
                result = self.run_settings_import(environment)
                self.assert_import_error(result, setting_name)


class AdminOverviewApiTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.client = APIClient()
        self.admin = User.objects.create_user(username='overview-admin', password='pass', role='admin')
        self.moderator = User.objects.create_user(username='overview-moderator', password='pass', role='moderator')
        self.staff = User.objects.create_user(username='overview-staff', password='pass', is_staff=True)
        self.user = User.objects.create_user(username='overview-user', password='pass', role='client')
        self.partner = User.objects.create_user(username='overview-partner', password='pass', role='partner')
        self.approved_place = Place.objects.create(
            owner=self.partner, title='Overview Approved', location='Tashkent',
            price='100000', area=20, people=4, status='approved',
        )
        self.pending_place = Place.objects.create(
            owner=self.partner, title='Overview Pending', location='Tashkent',
            price='90000', area=18, people=3, status='pending',
        )
        now = timezone.now()
        self.booking = Booking.objects.create(
            client=self.user, place=self.approved_place,
            start_time=now + timedelta(days=1), end_time=now + timedelta(days=1, hours=2),
            amount='150000', status='pending', payment_status='test_paid',
        )
        Payment.objects.create(
            user=self.user, booking=self.booking, provider='test', amount='150000',
            currency='UZS', status='test_paid',
        )
        Review.objects.create(user=self.user, place=self.approved_place, rating=5, comment='Great')
        Review.objects.create(user=self.partner, place=self.approved_place, rating=3, comment='Okay')

    def test_admin_overview_requires_admin_moderator_or_staff(self):
        anonymous = self.client.get('/api/admin/overview/')
        self.assertIn(anonymous.status_code, (401, 403))
        self.client.force_authenticate(self.user)
        self.assertEqual(self.client.get('/api/admin/overview/').status_code, 403)
        for account in (self.moderator, self.staff, self.admin):
            self.client.force_authenticate(account)
            self.assertEqual(self.client.get('/api/admin/overview/').status_code, 200)

    def test_admin_overview_returns_counts_and_latest_data(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get('/api/admin/overview/')
        self.assertEqual(response.status_code, 200)
        totals = response.data['totals']
        self.assertEqual(totals['users'], 5)
        self.assertEqual(totals['partners'], 1)
        self.assertEqual(totals['places_total'], 2)
        self.assertEqual(totals['places_approved'], 1)
        self.assertEqual(totals['bookings_total'], 1)
        self.assertEqual(totals['reviews'], 2)
        self.assertEqual(totals['average_rating'], 4.0)
        self.assertEqual(response.data['attention']['places_pending'], 1)
        self.assertEqual(response.data['attention']['bookings_pending'], 1)
        self.assertTrue(response.data['can_view_finance'])
        self.assertEqual(response.data['kpis']['revenue']['value'], 150000)
        self.assertEqual(response.data['kpis']['bookings']['value'], 1)
        self.assertEqual(response.data['kpis']['avg_check']['value'], 150000)
        pending = next(row for row in response.data['bookings_by_status'] if row['status'] == 'pending')
        self.assertEqual(pending['count'], 1)
        self.assertEqual(len(response.data['series']), 30)
        self.assertEqual(len(response.data['latest_users']), 5)
        self.assertEqual(response.data['latest_bookings'][0]['id'], self.booking.id)
        self.assertEqual(response.data['latest_reviews'][0]['place_title'], self.approved_place.title)
        self.assertEqual(response.data['top_places'][0]['id'], self.approved_place.id)
        self.assertEqual(response.data['top_places'][0]['bookings_count'], 1)

    def test_moderator_overview_hides_money(self):
        self.client.force_authenticate(self.moderator)
        response = self.client.get('/api/admin/overview/')
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data['can_view_finance'])
        self.assertNotIn('revenue', response.data['kpis'])
        self.assertNotIn('avg_check', response.data['kpis'])
        self.assertTrue(all(row['revenue'] is None for row in response.data['series']))
        self.assertIsNone(response.data['top_places'][0]['revenue_test'])

    def test_profile_lists_admin_sections_per_role(self):
        self.client.force_authenticate(self.moderator)
        moderator_sections = self.client.get('/api/auth/profile/').data['admin_sections']
        self.assertIn('moderation', moderator_sections)
        self.assertNotIn('users', moderator_sections)
        self.assertNotIn('finance', moderator_sections)
        self.client.force_authenticate(self.admin)
        self.assertIn('finance', self.client.get('/api/auth/profile/').data['admin_sections'])
        self.client.force_authenticate(self.user)
        self.assertEqual(self.client.get('/api/auth/profile/').data['admin_sections'], [])


class AuditLogTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.client = APIClient()
        self.admin = User.objects.create_user(username='audit-admin', password='pass', role='admin')
        self.moderator = User.objects.create_user(username='audit-moderator', password='pass', role='moderator')
        self.user = User.objects.create_user(username='audit-user', password='pass', role='client')
        self.partner = User.objects.create_user(username='audit-partner', password='pass', role='partner')
        self.place = Place.objects.create(
            owner=self.partner, title='Audit Place', location='Tashkent',
            price='100000', area=20, people=4, status='approved',
        )
        now = timezone.now()
        self.booking = Booking.objects.create(
            client=self.user, place=self.place, start_time=now + timedelta(days=1),
            end_time=now + timedelta(days=1, hours=2), amount='150000', status='pending',
        )

    def test_create_audit_log_helper_and_admin_api(self):
        audit = create_audit_log(
            actor=self.admin, action='test.action', object_type='TestObject',
            object_id='123', metadata={'ok': True},
        )
        self.assertIsNotNone(audit)
        self.client.force_authenticate(self.user)
        self.assertEqual(self.client.get('/api/audit-logs/').status_code, 403)
        self.client.force_authenticate(self.moderator)
        self.assertEqual(self.client.get('/api/audit-logs/').status_code, 403)
        self.client.force_authenticate(self.admin)
        response = self.client.get('/api/audit-logs/', {'action': 'test.action'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data[0]['action'], 'test.action')
        self.assertEqual(response.data[0]['object_type'], 'TestObject')
        self.assertEqual(response.data[0]['metadata']['ok'], True)

    def test_audit_log_filters_by_actor_object_type_and_dates(self):
        matching = create_audit_log(
            actor=self.admin, action='place.approved', object_type='Place',
            object_id=self.place.id, metadata={'status': 'approved'},
        )
        create_audit_log(
            actor=self.partner, action='place.updated', object_type='Place',
            object_id=self.place.id, metadata={'status': 'pending'},
        )
        create_audit_log(
            actor=self.admin, action='place.approved', object_type='Place',
            object_id='different-place', metadata={'status': 'approved'},
        )
        today = timezone.localdate().isoformat()
        self.client.force_authenticate(self.admin)
        response = self.client.get('/api/audit-logs/', {
            'actor': self.admin.id, 'action': 'place.approved', 'object_type': 'Place',
            'object_id': self.place.id, 'date_from': today, 'date_to': today,
        })
        self.assertEqual(response.status_code, 200)
        self.assertEqual([row['id'] for row in response.data], [matching.id])

    def test_audit_log_rejects_invalid_date_filter(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get('/api/audit-logs/', {'date_from': '18-09-2026'})
        self.assertEqual(response.status_code, 400)
        self.assertIn('date_from', response.data)

    def test_booking_confirm_creates_audit_log(self):
        self.client.force_authenticate(self.partner)
        response = self.client.post(f'/api/bookings/{self.booking.id}/confirm/')
        self.assertEqual(response.status_code, 200)
        audit = AuditLog.objects.get(action='booking.confirmed', object_id=str(self.booking.id))
        self.assertEqual(audit.actor, self.partner)
        self.assertEqual(audit.metadata['previous_status'], 'pending')
        self.assertEqual(audit.metadata['next_status'], 'confirmed')
        self.assertEqual(audit.metadata['booking_id'], self.booking.id)


class SeedDemoCommandTests(TestCase):
    def test_seed_demo_is_idempotent_and_clean_preserves_superuser(self):
        output = StringIO()
        call_command('seed_demo', stdout=output)
        call_command('seed_demo', stdout=output)
        User = get_user_model()
        self.assertEqual(User.objects.filter(username__in=('demo_admin', 'demo_partner', 'demo_client')).count(), 3)
        self.assertTrue(User.objects.get(username='demo_admin').is_superuser)
        self.assertEqual(Category.objects.filter(slug__in=('ofis', 'kovorking', 'zal-tadbir')).count(), 3)
        self.assertEqual(SubCategory.objects.filter(slug__in=(
            'mini-ofis', 'kabinet', 'hot-desk', 'fixed-desk',
            'konferens-zal', 'muzokaralar-xonasi',
        )).count(), 6)
        self.assertEqual(ParameterGroup.objects.filter(slug__in=('workspace', 'amenities')).count(), 2)
        self.assertEqual(Parameter.objects.filter(slug__in=(
            'workplaces', 'meeting_rooms', 'restrooms', 'floor', 'wifi',
            'parking', 'projector', 'coffee_tea', 'access_24_7',
        )).count(), 9)
        self.assertEqual(TariffPlan.objects.filter(slug__in=('standard', 'comfort', 'premium')).count(), 3)
        self.assertEqual(Place.objects.filter(title__in=(
            'C-Space Yunusobod', 'GroundZero KitobOlam', 'Impact Technology Hub',
        )).count(), 3)
        call_command('seed_demo', '--clean', stdout=output)
        self.assertEqual(User.objects.filter(username='demo_admin', is_superuser=True).count(), 1)
        self.assertEqual(User.objects.filter(username__in=('demo_admin', 'demo_partner', 'demo_client')).count(), 3)
        self.assertEqual(Place.objects.filter(title__in=(
            'C-Space Yunusobod', 'GroundZero KitobOlam', 'Impact Technology Hub',
        )).count(), 3)


class SitemapTests(TestCase):
    @override_settings(FRONTEND_BASE_URL='https://joyzone.uz')
    def test_sitemap_lists_only_approved_places(self):
        from places.models import Place

        approved = Place.objects.create(title='Open', location='Tashkent', area=10, people=2, status='approved')
        hidden = Place.objects.create(title='Hidden', location='Tashkent', area=10, people=2, status='pending')

        response = self.client.get('/sitemap.xml')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/xml; charset=utf-8')
        body = response.content.decode()
        self.assertIn('<loc>https://joyzone.uz/</loc>', body)
        self.assertIn(f'<loc>https://joyzone.uz/space-{approved.id}</loc>', body)
        self.assertNotIn(f'/space-{hidden.id}<', body)


class AdminOverviewRevenueChartTests(TestCase):
    def test_overview_series_sums_paid_payments_by_period(self):
        User = get_user_model()
        admin = User.objects.create_user(username='chart-admin', password='pass', role='admin')
        payer = User.objects.create_user(username='chart-payer', password='pass')
        Payment.objects.create(user=payer, amount='150000', status='test_paid')
        Payment.objects.create(user=payer, amount='50000', status='test_paid')
        Payment.objects.create(user=payer, amount='999999', status='created')
        client = APIClient()
        client.force_authenticate(admin)

        week = client.get('/api/admin/overview/', {'period': '7d'})
        year = client.get('/api/admin/overview/', {'period': '365d'})

        self.assertEqual(week.status_code, 200)
        self.assertEqual(len(week.data['series']), 7)
        self.assertEqual(week.data['series'][-1]['revenue'], 200000)
        self.assertEqual(week.data['kpis']['revenue']['value'], 200000)
        self.assertEqual(len(year.data['series']), 12)
        self.assertEqual(year.data['series'][-1]['revenue'], 200000)
