from dataclasses import dataclass

from django.db import transaction
from rest_framework.exceptions import PermissionDenied, ValidationError

from core.audit import create_audit_log
from core.permissions import is_admin_or_moderator, is_partner
from notifications.services import notify_booking_event

from .models import Booking


BOOKING_STATUS_TRANSITIONS = {
    'pending': frozenset({'confirmed', 'cancelled', 'blocked'}),
    'confirmed': frozenset({'cancelled'}),
    'cancelled': frozenset(),
    'completed': frozenset(),
    'blocked': frozenset({'cancelled'}),
}


@dataclass(frozen=True)
class BookingTransitionResult:
    booking: Booking
    changed: bool


def can_manage_place_availability(user, place):
    if is_admin_or_moderator(user):
        return True
    return bool(
        user.is_authenticated
        and is_partner(user)
        and place.owner_id == user.id
    )


def can_cancel_booking(user, booking):
    return bool(
        can_manage_place_availability(user, booking.place)
        or (user.is_authenticated and booking.client_id == user.id)
    )


def _is_owner_availability_slot(booking):
    return bool(
        booking.place.owner_id
        and booking.client_id == booking.place.owner_id
        and booking.payment_status == 'unpaid'
    )


def validate_block_creation(*, actor, place, client, payment_status):
    if not can_manage_place_availability(actor, place):
        raise PermissionDenied(
            'Only the place owner, admin, moderator, or staff can block availability.'
        )
    if payment_status != 'unpaid':
        raise ValidationError({
            'payment_status': 'Blocked availability must be unpaid.'
        })
    if not place.owner_id or not client or client.id != place.owner_id:
        raise ValidationError({
            'client': 'Blocked availability must belong to the place owner.'
        })


def validate_booking_transition(*, actor, booking, next_status):
    current_status = booking.status
    if next_status not in BOOKING_STATUS_TRANSITIONS:
        raise ValidationError({'status': 'Unknown booking status.'})

    if next_status == 'confirmed':
        if not can_manage_place_availability(actor, booking.place):
            raise PermissionDenied(
                'Only the place owner, admin, moderator, or staff can confirm this booking.'
            )
    elif next_status == 'cancelled':
        if not can_cancel_booking(actor, booking):
            raise PermissionDenied('You do not have access to cancel this booking.')
    elif next_status == 'blocked':
        if not can_manage_place_availability(actor, booking.place):
            raise PermissionDenied(
                'Only the place owner, admin, moderator, or staff can block availability.'
            )

    if current_status == next_status:
        if next_status == 'blocked' and not _is_owner_availability_slot(booking):
            raise ValidationError({
                'status': 'Only an unpaid owner availability slot can be blocked.'
            })
        return False

    if next_status not in BOOKING_STATUS_TRANSITIONS.get(current_status, frozenset()):
        raise ValidationError({
            'status': f'Booking cannot transition from {current_status} to {next_status}.'
        })

    if next_status == 'blocked' and not _is_owner_availability_slot(booking):
        raise ValidationError({
            'status': 'Only an unpaid owner availability slot can be blocked.'
        })

    return True


def _validate_transition_invariants(booking, next_status):
    if next_status != 'confirmed':
        return

    capacity = getattr(booking.place, 'people', None)
    if not isinstance(capacity, int) or capacity <= 0:
        raise ValidationError({
            'guests': 'Booking is unavailable because place capacity is not configured.'
        })
    if booking.guests > capacity:
        raise ValidationError({
            'guests': f'Guests cannot exceed place capacity of {capacity}.'
        })


def transition_booking_status(*, actor, booking_id, next_status):
    """Apply one status transition together with its database events."""
    with transaction.atomic():
        booking = Booking.objects.select_for_update().select_related(
            'client', 'place__owner'
        ).get(pk=booking_id)
        previous_status = booking.status
        should_change = validate_booking_transition(
            actor=actor,
            booking=booking,
            next_status=next_status,
        )
        if not should_change:
            return BookingTransitionResult(booking=booking, changed=False)

        _validate_transition_invariants(booking, next_status)
        booking.status = next_status
        booking.save(update_fields=['status', 'updated_at'])

        notify_booking_event(
            booking,
            f'booking_{next_status}',
            actor=actor,
            include_actor=next_status == 'blocked',
        )
        audit = create_audit_log(
            actor=actor,
            action=f'booking.{next_status}',
            object_type='Booking',
            object_id=booking.id,
            metadata={
                'booking_id': booking.id,
                'previous_status': previous_status,
                'next_status': next_status,
                'place_id': booking.place_id,
                'client_id': booking.client_id,
            },
        )
        if audit is None:
            raise RuntimeError('Booking status audit log could not be created.')

        # Any future external delivery must be scheduled with transaction.on_commit().
        return BookingTransitionResult(booking=booking, changed=True)
