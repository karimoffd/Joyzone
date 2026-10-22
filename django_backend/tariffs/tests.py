from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from notifications.models import Notification
from payments.models import Payment
from core.models import AuditLog
from .models import TariffPlan, TariffSubscription


class TariffPlanPermissionTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.client = APIClient()
        self.partner = User.objects.create_user(username='tariff-partner', password='pass', role='partner')
        self.moderator = User.objects.create_user(username='tariff-moderator', password='pass', role='moderator')
        self.staff = User.objects.create_user(username='tariff-staff', password='pass', is_staff=True)
        self.plan = TariffPlan.objects.create(
            slug='standard',
            name='Standard',
            price=0,
            duration_days=30,
            max_places=1,
        )

    def test_tariff_list_and_detail_are_public(self):
        list_response = self.client.get('/api/tariffs/')
        detail_response = self.client.get(f'/api/tariffs/{self.plan.id}/')

        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(detail_response.status_code, 200)

    def test_tariff_create_requires_admin(self):
        payload = {
            'slug': 'comfort',
            'name': 'Comfort',
            'price': '100000.00',
            'duration_days': 30,
            'max_places': 3,
        }

        anonymous_response = self.client.post('/api/tariffs/create/', payload, format='json')
        self.assertIn(anonymous_response.status_code, (401, 403))

        self.client.force_authenticate(self.partner)
        partner_response = self.client.post('/api/tariffs/create/', payload, format='json')
        self.assertEqual(partner_response.status_code, 403)

        self.client.force_authenticate(self.moderator)
        moderator_response = self.client.post('/api/tariffs/create/', payload, format='json')
        self.assertEqual(moderator_response.status_code, 403)

        self.client.force_authenticate(self.staff)
        staff_response = self.client.post('/api/tariffs/create/', payload, format='json')
        self.assertEqual(staff_response.status_code, 201)

    def test_tariff_update_and_delete_require_admin_or_staff(self):
        self.client.force_authenticate(self.partner)
        partner_patch = self.client.patch(f'/api/tariffs/{self.plan.id}/', {'name': 'Blocked'}, format='json')
        partner_delete = self.client.delete(f'/api/tariffs/{self.plan.id}/')

        self.assertEqual(partner_patch.status_code, 403)
        self.assertEqual(partner_delete.status_code, 403)

        self.client.force_authenticate(self.moderator)
        moderator_patch = self.client.patch(f'/api/tariffs/{self.plan.id}/', {'name': 'Moderator Updated'}, format='json')
        self.assertEqual(moderator_patch.status_code, 403)

        self.client.force_authenticate(self.staff)
        staff_patch = self.client.patch(f'/api/tariffs/{self.plan.id}/', {'name': 'Staff Updated'}, format='json')
        self.assertEqual(staff_patch.status_code, 200)

        staff_delete = self.client.delete(f'/api/tariffs/{self.plan.id}/')
        self.assertEqual(staff_delete.status_code, 204)


class TariffSubscriptionFlowTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.client = APIClient()
        self.partner = User.objects.create_user(username='flow-partner', password='pass', role='client')
        self.admin = User.objects.create_user(username='flow-admin', password='pass', role='admin')
        self.free_plan = TariffPlan.objects.create(
            slug='standard',
            name='Standard',
            price=0,
            duration_days=30,
            max_places=1,
        )
        self.paid_plan = TariffPlan.objects.create(
            slug='comfort',
            name='Comfort',
            price='100000.00',
            duration_days=30,
            max_places=5,
        )

    def test_free_tariff_activates_immediately(self):
        self.client.force_authenticate(self.partner)

        response = self.client.post('/api/tariffs/subscribe/', {'tariff_id': self.free_plan.id}, format='json')

        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data['requires_payment'])
        self.assertEqual(response.data['status'], 'active')
        self.partner.refresh_from_db()
        self.assertEqual(self.partner.tariff_id, self.free_plan.id)
        self.assertEqual(self.partner.role, 'partner')
        self.assertTrue(Notification.objects.filter(
            user=self.partner,
            notification_type='tariff_activated',
            related_tariff_subscription_id=response.data['subscription_id'],
        ).exists())

    def test_paid_tariff_creates_pending_payment_subscription_without_activation(self):
        self.client.force_authenticate(self.partner)

        response = self.client.post('/api/tariffs/subscribe/', {'tariff_id': self.paid_plan.id}, format='json')

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['requires_payment'])
        self.assertEqual(response.data['status'], 'pending_payment')
        sub = TariffSubscription.objects.get(pk=response.data['subscription_id'])
        self.assertEqual(sub.status, 'pending_payment')
        self.partner.refresh_from_db()
        self.assertIsNone(self.partner.tariff)

    def test_test_payment_activates_pending_paid_subscription(self):
        sub = TariffSubscription.objects.create(
            partner=self.partner,
            tariff=self.paid_plan,
            status='pending_payment',
        )
        self.client.force_authenticate(self.partner)

        response = self.client.post('/api/payments/test-pay/', {'subscription_id': sub.id}, format='json')

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['payment']['status'], 'test_paid')
        payment = Payment.objects.get(pk=response.data['payment']['id'])
        self.assertEqual(payment.user, self.partner)
        self.assertEqual(payment.tariff_subscription, sub)
        self.assertEqual(payment.status, 'test_paid')
        sub.refresh_from_db()
        self.assertEqual(sub.status, 'active')
        self.partner.refresh_from_db()
        self.assertEqual(self.partner.tariff_id, self.paid_plan.id)
        self.assertEqual(self.partner.role, 'partner')
        self.assertTrue(Notification.objects.filter(
            user=self.partner,
            notification_type='tariff_activated',
            related_tariff_subscription_id=sub.id,
        ).exists())
        activation_audit = AuditLog.objects.get(
            action='tariff.activated',
            object_id=str(sub.id),
        )
        self.assertEqual(activation_audit.actor, self.partner)
        self.assertEqual(activation_audit.metadata['previous_status'], 'pending_payment')
        self.assertEqual(activation_audit.metadata['status'], 'active')

    def test_admin_subscription_filters_separate_pending_and_active(self):
        pending = TariffSubscription.objects.create(
            partner=self.partner,
            tariff=self.paid_plan,
            status='pending_payment',
        )
        active = TariffSubscription.objects.create(
            partner=self.partner,
            tariff=self.free_plan,
            status='active',
        )
        self.client.force_authenticate(self.admin)

        pending_response = self.client.get('/api/tariffs/admin/subscriptions/', {'status': 'pending,pending_payment'})
        active_response = self.client.get('/api/tariffs/admin/subscriptions/', {'status': 'active'})

        self.assertEqual(pending_response.status_code, 200)
        self.assertEqual(active_response.status_code, 200)
        self.assertEqual([item['id'] for item in pending_response.data], [pending.id])
        self.assertEqual([item['id'] for item in active_response.data], [active.id])
