from datetime import timedelta
from decimal import Decimal, InvalidOperation
from uuid import uuid4

from django.core.exceptions import ObjectDoesNotExist, PermissionDenied, ValidationError
from django.db import transaction
from django.utils import timezone

from bookings.models import Booking
from core.audit import create_audit_log
from core.permissions import is_admin_or_moderator
from notifications.services import notify_booking_event, notify_tariff_activated
from tariffs.models import TariffPlan, TariffSubscription
from .models import Payment


class TestPaymentProvider:
    provider = 'test'

    def __init__(self, user):
        self.user = user

    @transaction.atomic
    def pay_booking(self, booking_id, amount=None, currency='UZS', metadata=None):
        booking = Booking.objects.select_for_update().select_related('client').get(pk=booking_id)
        self._ensure_booking_access(booking)

        payment = Payment.objects.create(
            user=self.user,
            booking=booking,
            provider=self.provider,
            amount=self._resolve_amount(amount, booking.amount),
            currency=currency or booking.currency or 'UZS',
            status='created',
            metadata=metadata or {},
        )
        self._mark_test_paid(payment)
        create_audit_log(
            actor=self.user,
            action='payment.test_paid',
            object_type='Payment',
            object_id=payment.id,
            metadata={
                'booking_id': booking.id,
                'amount': payment.amount,
                'currency': payment.currency,
                'provider': payment.provider,
                'external_id': payment.external_id,
            },
        )

        booking.payment_status = 'test_paid'
        booking.save(update_fields=['payment_status', 'updated_at'])
        notify_booking_event(booking, 'booking_paid', actor=self.user, include_actor=True)
        return payment

    @transaction.atomic
    def pay_tariff(self, tariff_id, amount=None, currency='UZS', metadata=None):
        tariff = TariffPlan.objects.select_for_update().get(pk=tariff_id, is_active=True)
        subscription = TariffSubscription.objects.create(
            partner=self.user,
            tariff=tariff,
            status='pending_payment',
        )
        return self.pay_tariff_subscription(subscription.id, amount=amount, currency=currency, metadata=metadata)

    @transaction.atomic
    def pay_tariff_subscription(self, subscription_id, amount=None, currency='UZS', metadata=None):
        subscription = TariffSubscription.objects.select_for_update().select_related('partner', 'tariff').get(pk=subscription_id)
        self._ensure_subscription_access(subscription)

        if not subscription.tariff:
            raise ValidationError('Subscription tariff is missing.')
        if subscription.status not in ('pending', 'pending_payment'):
            raise ValidationError('Only pending subscriptions can be paid.')

        payment = Payment.objects.create(
            user=self.user,
            tariff_subscription=subscription,
            provider=self.provider,
            amount=self._resolve_amount(amount, subscription.tariff.price),
            currency=currency or 'UZS',
            status='created',
            metadata=metadata or {},
        )
        self._mark_test_paid(payment)
        create_audit_log(
            actor=self.user,
            action='payment.test_paid',
            object_type='Payment',
            object_id=payment.id,
            metadata={
                'tariff_subscription_id': subscription.id,
                'tariff_id': subscription.tariff_id,
                'amount': payment.amount,
                'currency': payment.currency,
                'provider': payment.provider,
                'external_id': payment.external_id,
            },
        )

        self._activate_subscription(subscription)
        return payment

    def _activate_subscription(self, subscription):
        previous_status = subscription.status
        now = timezone.now()
        tariff = subscription.tariff
        end_date = now + timedelta(days=tariff.duration_days) if not tariff.is_free else None

        subscription.status = 'active'
        subscription.start_date = now
        subscription.end_date = end_date
        subscription.save()

        partner = subscription.partner
        previous_role = partner.role
        partner.tariff = tariff
        partner.tariff_expires_at = end_date
        partner.role = 'partner'
        partner.save(update_fields=['tariff', 'tariff_expires_at', 'role'])
        create_audit_log(
            actor=self.user,
            action='tariff.activated',
            object_type='TariffSubscription',
            object_id=subscription.id,
            metadata={
                'partner_id': partner.id,
                'tariff_id': tariff.id,
                'previous_status': previous_status,
                'status': subscription.status,
                'start_date': subscription.start_date,
                'end_date': subscription.end_date,
                'source': 'test_payment',
            },
        )
        if previous_role != partner.role:
            create_audit_log(
                actor=self.user,
                action='user.role_updated',
                object_type='User',
                object_id=partner.id,
                metadata={
                    'username': partner.username,
                    'previous_role': previous_role,
                    'role': partner.role,
                    'source': 'tariff_activation',
                    'tariff_subscription_id': subscription.id,
                },
            )
        notify_tariff_activated(subscription)
        return subscription

    def _ensure_subscription_access(self, subscription):
        if subscription.partner_id == self.user.id:
            return
        if is_admin_or_moderator(self.user):
            return
        raise PermissionDenied('You cannot pay for this subscription.')

    def _ensure_booking_access(self, booking):
        if booking.client_id == self.user.id:
            return
        if is_admin_or_moderator(self.user):
            return
        raise PermissionDenied('You cannot pay for this booking.')

    def _mark_test_paid(self, payment):
        payment.status = 'test_paid'
        payment.external_id = f"test_{uuid4().hex}"
        payment.save(update_fields=['status', 'external_id', 'updated_at'])

    @staticmethod
    def _resolve_amount(requested_amount, fallback_amount):
        value = fallback_amount if requested_amount in (None, '') else requested_amount
        try:
            amount = Decimal(str(value))
        except (InvalidOperation, TypeError, ValueError) as exc:
            raise ValidationError('Invalid payment amount.') from exc
        if amount < 0:
            raise ValidationError('Payment amount cannot be negative.')
        return amount
