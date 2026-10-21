from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from bookings.models import Booking
from places.models import Place
from notifications.models import Notification
from tariffs.models import TariffPlan, TariffSubscription
from core.models import AuditLog
from .models import Payment


class FinanceApiTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.client = APIClient()
        self.admin = User.objects.create_user(username='finance-admin', password='pass', role='admin')
        self.moderator = User.objects.create_user(username='finance-moderator', password='pass', role='moderator')
        self.user = User.objects.create_user(username='finance-user', password='pass', role='client')
        self.partner = User.objects.create_user(username='finance-partner', password='pass', role='partner')
        self.place = Place.objects.create(
            owner=self.partner,
            title='Finance Place',
            location='Tashkent',
            price='100000',
            area=20,
            people=4,
            status='approved',
        )
        self.booking = Booking.objects.create(
            client=self.user,
            place=self.place,
            start_time=timezone.now() + timedelta(days=1),
            end_time=timezone.now() + timedelta(days=1, hours=2),
            amount='100000',
            status='confirmed',
            payment_status='test_paid',
        )
        self.payment = Payment.objects.create(
            user=self.user,
            booking=self.booking,
            provider='test',
            amount='100000',
            currency='UZS',
            status='test_paid',
            external_id='test_payment',
        )
        self.refunded_payment = Payment.objects.create(
            user=self.user,
            provider='test',
            amount='25000',
            currency='UZS',
            status='refunded',
            external_id='test_refund',
        )

    def test_finance_endpoints_are_admin_only(self):
        anonymous = self.client.get('/api/finance/summary/')
        self.assertIn(anonymous.status_code, (401, 403))

        self.client.force_authenticate(self.moderator)
        moderator = self.client.get('/api/finance/summary/')
        self.assertEqual(moderator.status_code, 403)

        self.client.force_authenticate(self.admin)
        admin = self.client.get('/api/finance/summary/')
        self.assertEqual(admin.status_code, 200)

    def test_finance_summary_returns_revenue_refunds_and_counts(self):
        self.client.force_authenticate(self.admin)

        response = self.client.get('/api/finance/summary/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['total_revenue'], '100000')
        self.assertEqual(response.data['month_revenue'], '100000')
        self.assertEqual(response.data['pending_payouts'], '100000')
        self.assertEqual(response.data['refunds_total'], '25000')
        self.assertEqual(response.data['payments_count'], 1)

    def test_finance_transactions_return_payment_rows(self):
        self.client.force_authenticate(self.admin)

        response = self.client.get('/api/finance/transactions/')

        self.assertEqual(response.status_code, 200)
        ids = {row['id'] for row in response.data}
        self.assertIn(self.payment.id, ids)
        row = next(item for item in response.data if item['id'] == self.payment.id)
        self.assertEqual(row['client'], self.user.username)
        self.assertEqual(row['space'], self.place.title)
        self.assertEqual(row['type'], 'booking')
        self.assertEqual(row['status'], 'test_paid')

    def test_finance_transactions_support_type_date_and_search_filters(self):
        tariff = TariffPlan.objects.create(
            slug='premium',
            name='Premium Finance',
            price='250000',
            duration_days=30,
            max_places=10,
        )
        subscription = TariffSubscription.objects.create(
            partner=self.partner,
            tariff=tariff,
            status='active',
        )
        tariff_payment = Payment.objects.create(
            user=self.partner,
            tariff_subscription=subscription,
            amount='250000',
            status='test_paid',
            external_id='premium-finance-payment',
        )
        self.client.force_authenticate(self.admin)
        today = timezone.localdate().isoformat()

        booking_response = self.client.get('/api/finance/transactions/', {'type': 'booking'})
        tariff_response = self.client.get('/api/finance/transactions/', {'type': 'tariff_subscription'})
        refund_response = self.client.get('/api/finance/transactions/', {'type': 'refund'})
        search_response = self.client.get('/api/finance/transactions/', {'search': 'Premium Finance'})
        date_response = self.client.get('/api/finance/transactions/', {'date_from': today, 'date_to': today})

        self.assertEqual({row['id'] for row in booking_response.data}, {self.payment.id})
        self.assertEqual({row['id'] for row in tariff_response.data}, {tariff_payment.id})
        self.assertEqual({row['id'] for row in refund_response.data}, {self.refunded_payment.id})
        self.assertEqual({row['id'] for row in search_response.data}, {tariff_payment.id})
        self.assertEqual(
            {row['id'] for row in date_response.data},
            {self.payment.id, self.refunded_payment.id, tariff_payment.id},
        )

    def test_finance_transactions_reject_invalid_filters(self):
        self.client.force_authenticate(self.admin)

        invalid_type = self.client.get('/api/finance/transactions/', {'type': 'unknown'})
        invalid_date = self.client.get('/api/finance/transactions/', {'date_from': '18.09.2026'})

        self.assertEqual(invalid_type.status_code, 400)
        self.assertEqual(invalid_date.status_code, 400)

    def test_refund_action_marks_payment_and_booking_refunded(self):
        self.client.force_authenticate(self.admin)

        response = self.client.post(f'/api/payments/{self.payment.id}/refund/', {'note': 'Test refund'}, format='json')

        self.assertEqual(response.status_code, 200)
        self.payment.refresh_from_db()
        self.booking.refresh_from_db()
        self.assertEqual(self.payment.status, 'refunded')
        self.assertEqual(self.payment.metadata['refund_note'], 'Test refund')
        self.assertEqual(self.booking.payment_status, 'refunded')

    def test_refund_action_rejects_unpaid_payment(self):
        unpaid = Payment.objects.create(
            user=self.user,
            provider='test',
            amount='50000',
            currency='UZS',
            status='created',
        )
        self.client.force_authenticate(self.admin)

        response = self.client.post(f'/api/payments/{unpaid.id}/refund/', {}, format='json')

        self.assertEqual(response.status_code, 400)

    def test_refund_action_is_admin_staff_or_superuser_only(self):
        self.client.force_authenticate(self.moderator)
        moderator_response = self.client.post(f'/api/payments/{self.payment.id}/refund/', {}, format='json')
        self.assertEqual(moderator_response.status_code, 403)

        staff = get_user_model().objects.create_user(
            username='finance-staff',
            password='pass',
            role='client',
            is_staff=True,
        )
        self.client.force_authenticate(staff)
        staff_response = self.client.post(f'/api/payments/{self.payment.id}/refund/', {}, format='json')
        self.assertEqual(staff_response.status_code, 200)

    def test_test_payment_returns_backend_synced_booking(self):
        booking = Booking.objects.create(
            client=self.user,
            place=self.place,
            start_time=timezone.now() + timedelta(days=3),
            end_time=timezone.now() + timedelta(days=3, hours=2),
            amount='125000',
            currency='UZS',
            status='pending',
            payment_status='unpaid',
        )
        self.client.force_authenticate(self.user)

        response = self.client.post(
            '/api/payments/test-pay/',
            {'booking_id': booking.id, 'amount': '125000', 'currency': 'UZS'},
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['payment']['status'], 'test_paid')
        self.assertEqual(response.data['booking']['id'], booking.id)
        self.assertEqual(response.data['booking']['payment_status'], 'test_paid')
        payment = Payment.objects.get(pk=response.data['payment']['id'])
        self.assertEqual(payment.user, self.user)
        self.assertEqual(payment.booking, booking)
        self.assertEqual(payment.status, 'test_paid')
        self.assertTrue(payment.external_id.startswith('test_'))

        detail = self.client.get(f'/api/bookings/{booking.id}/')
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.data['payment_status'], 'test_paid')
        recipients = set(Notification.objects.filter(
            notification_type='booking_paid',
            related_booking_id=booking.id,
        ).values_list('user_id', flat=True))
        self.assertEqual(recipients, {self.user.id, self.partner.id})
        audit = AuditLog.objects.get(action='payment.test_paid', object_id=str(payment.id))
        self.assertEqual(audit.actor, self.user)
        self.assertEqual(audit.metadata['booking_id'], booking.id)


class MyPaymentsApiTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.client = APIClient()
        self.user = User.objects.create_user(username='payment-owner', password='pass', role='client')
        self.other_user = User.objects.create_user(username='payment-other', password='pass', role='client')
        self.partner = User.objects.create_user(username='payment-host', password='pass', role='partner')
        self.place = Place.objects.create(
            owner=self.partner,
            title='Private Payment Place',
            location='Tashkent',
            price='80000',
            area=25,
            people=6,
            status='approved',
        )
        self.booking = Booking.objects.create(
            client=self.user,
            place=self.place,
            start_time=timezone.now() + timedelta(days=2),
            end_time=timezone.now() + timedelta(days=2, hours=1),
            amount='80000',
            status='confirmed',
            payment_status='test_paid',
        )
        self.booking_payment = Payment.objects.create(
            user=self.user,
            booking=self.booking,
            provider='test',
            amount='80000',
            currency='UZS',
            status='test_paid',
            external_id='owner-booking-payment',
        )
        tariff = TariffPlan.objects.create(
            slug='comfort',
            name='Comfort',
            price='99000',
            duration_days=30,
            max_places=5,
        )
        subscription = TariffSubscription.objects.create(
            partner=self.user,
            tariff=tariff,
            status='active',
        )
        self.tariff_payment = Payment.objects.create(
            user=self.user,
            tariff_subscription=subscription,
            provider='test',
            amount='99000',
            currency='UZS',
            status='test_paid',
            external_id='owner-tariff-payment',
        )
        self.other_payment = Payment.objects.create(
            user=self.other_user,
            provider='test',
            amount='500000',
            currency='UZS',
            status='test_paid',
            external_id='private-other-payment',
        )

    def test_my_payments_requires_authentication(self):
        response = self.client.get('/api/payments/my/')

        self.assertIn(response.status_code, (401, 403))

    def test_my_payments_returns_only_current_user_payments(self):
        self.client.force_authenticate(self.user)

        response = self.client.get('/api/payments/my/')

        self.assertEqual(response.status_code, 200)
        ids = {row['id'] for row in response.data}
        self.assertEqual(ids, {self.booking_payment.id, self.tariff_payment.id})
        self.assertNotIn(self.other_payment.id, ids)

        booking_row = next(row for row in response.data if row['id'] == self.booking_payment.id)
        self.assertEqual(booking_row['booking_id'], self.booking.id)
        self.assertEqual(booking_row['booking_title'], self.place.title)
        self.assertIsNone(booking_row['tariff_subscription_id'])

        tariff_row = next(row for row in response.data if row['id'] == self.tariff_payment.id)
        self.assertEqual(tariff_row['tariff_subscription_id'], self.tariff_payment.tariff_subscription_id)
        self.assertEqual(tariff_row['tariff_name'], 'Comfort')
        self.assertIsNone(tariff_row['booking_id'])

    def test_user_cannot_select_another_users_payments(self):
        self.client.force_authenticate(self.other_user)

        response = self.client.get('/api/payments/my/')

        self.assertEqual(response.status_code, 200)
        ids = {row['id'] for row in response.data}
        self.assertEqual(ids, {self.other_payment.id})
        self.assertNotIn(self.booking_payment.id, ids)
        self.assertNotIn(self.tariff_payment.id, ids)


class TestPaymentSecurityTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.client = APIClient()
        self.user = User.objects.create_user(username='secure-pay-client', password='pass', role='client')
        self.partner = User.objects.create_user(username='secure-pay-host', password='pass', role='partner')
        self.place = Place.objects.create(
            owner=self.partner,
            title='Secure Payment Place',
            location='Tashkent',
            price='100000',
            area=20,
            people=4,
            status='approved',
        )
        self.booking = Booking.objects.create(
            client=self.user,
            place=self.place,
            start_time=timezone.now() + timedelta(days=2),
            end_time=timezone.now() + timedelta(days=2, hours=2),
            amount='250000',
            currency='UZS',
            status='pending',
            payment_status='unpaid',
        )
        self.premium = TariffPlan.objects.create(
            slug='premium',
            name='Premium',
            price='990000',
            duration_days=30,
            max_places=10,
        )
        self.client.force_authenticate(self.user)

    def test_client_amount_is_ignored_for_booking_payment(self):
        response = self.client.post(
            '/api/payments/test-pay/',
            {'booking_id': self.booking.id, 'amount': '1', 'currency': 'USD'},
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        payment = Payment.objects.get(pk=response.data['payment']['id'])
        self.assertEqual(str(payment.amount), '250000.00')
        self.assertEqual(payment.currency, 'UZS')

    def test_client_amount_is_ignored_for_tariff_payment(self):
        response = self.client.post(
            '/api/payments/test-pay/',
            {'tariff_id': self.premium.id, 'amount': '0'},
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        payment = Payment.objects.get(pk=response.data['payment']['id'])
        self.assertEqual(str(payment.amount), '990000.00')

    def test_booking_cannot_be_paid_twice(self):
        first = self.client.post('/api/payments/test-pay/', {'booking_id': self.booking.id}, format='json')
        second = self.client.post('/api/payments/test-pay/', {'booking_id': self.booking.id}, format='json')

        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 400)
        self.assertEqual(Payment.objects.filter(booking=self.booking).count(), 1)

    def test_cancelled_booking_cannot_be_paid(self):
        Booking.objects.filter(pk=self.booking.pk).update(status='cancelled')

        response = self.client.post('/api/payments/test-pay/', {'booking_id': self.booking.id}, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertFalse(Payment.objects.filter(booking=self.booking).exists())

    @override_settings(TEST_PAYMENTS_ENABLED=False)
    def test_test_payments_are_disabled_when_flag_is_off(self):
        response = self.client.post('/api/payments/test-pay/', {'tariff_id': self.premium.id}, format='json')

        self.assertEqual(response.status_code, 403)
        self.assertFalse(Payment.objects.exists())
        self.user.refresh_from_db()
        self.assertEqual(self.user.role, 'client')
