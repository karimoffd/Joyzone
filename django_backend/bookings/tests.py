from datetime import datetime, timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from places.models import Place
from notifications.models import Notification
from core.models import AuditLog
from .models import Booking
from .services import BOOKING_STATUS_TRANSITIONS, transition_booking_status


def aware_dt(year, month, day, hour, minute=0):
    return timezone.make_aware(datetime(year, month, day, hour, minute), timezone.get_current_timezone())


class BookingAvailabilityTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.client_api = APIClient()
        self.client_user = User.objects.create_user(username='client', password='pass', role='client')
        self.other_client = User.objects.create_user(username='other-client', password='pass', role='client')
        self.partner = User.objects.create_user(username='partner', password='pass', role='partner')
        self.other_partner = User.objects.create_user(username='other-partner', password='pass', role='partner')
        self.admin = User.objects.create_user(username='admin', password='pass', role='admin')
        self.place = Place.objects.create(
            owner=self.partner,
            title='Availability room',
            location='Tashkent',
            price='100000 UZS',
            area=20,
            people=4,
            status='approved',
        )
        self.other_place = Place.objects.create(
            owner=self.other_partner,
            title='Other room',
            location='Tashkent',
            price='100000 UZS',
            area=20,
            people=4,
            status='approved',
        )

    def test_authenticated_user_can_create_booking(self):
        self.client_api.force_authenticate(self.client_user)

        response = self.client_api.post('/api/bookings/', {
            'place': self.place.id,
            'start_time': aware_dt(2027, 9, 19, 10).isoformat(),
            'end_time': aware_dt(2027, 9, 19, 12).isoformat(),
            'duration_type': 'hourly',
            'guests': 2,
            'amount': '120000',
            'currency': 'UZS',
            'note': 'Need projector',
        }, format='json')

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['client'], self.client_user.id)
        self.assertEqual(response.data['place'], self.place.id)
        self.assertEqual(response.data['status'], 'pending')
        self.assertEqual(response.data['payment_status'], 'unpaid')
        notifications = Notification.objects.filter(
            notification_type='booking_created',
            related_booking_id=response.data['id'],
            related_place_id=self.place.id,
        )
        self.assertEqual(
            set(notifications.values_list('user_id', flat=True)),
            {self.client_user.id, self.partner.id},
        )
        self.assertEqual(notifications.count(), 2)

    def test_client_can_only_create_booking_for_approved_place(self):
        self.client_api.force_authenticate(self.client_user)

        for index, place_status in enumerate(('pending', 'rejected')):
            place = Place.objects.create(
                owner=self.partner,
                title=f'Hidden {place_status} room',
                location='Tashkent',
                price='100000 UZS',
                area=20,
                people=4,
                status=place_status,
            )
            initial_count = Booking.objects.count()

            with self.subTest(status=place_status):
                response = self.client_api.post('/api/bookings/', {
                    'place': place.id,
                    'start_time': aware_dt(2027, 5, 1 + index, 10).isoformat(),
                    'end_time': aware_dt(2027, 5, 1 + index, 12).isoformat(),
                    'duration_type': 'hourly',
                }, format='json')

                self.assertEqual(response.status_code, 400)
                self.assertEqual(
                    response.data['place'][0],
                    'This place is not available for booking.',
                )
                self.assertEqual(Booking.objects.count(), initial_count)
                self.assertFalse(Notification.objects.filter(
                    notification_type='booking_created',
                    related_place_id=place.id,
                ).exists())

    def test_deleted_place_id_is_rejected_without_side_effects(self):
        deleted_place = Place.objects.create(
            owner=self.partner,
            title='Deleted room',
            location='Tashkent',
            price='100000 UZS',
            area=20,
            people=4,
            status='approved',
        )
        deleted_place_id = deleted_place.id
        deleted_place.delete()
        self.client_api.force_authenticate(self.client_user)
        initial_count = Booking.objects.count()

        response = self.client_api.post('/api/bookings/', {
            'place': deleted_place_id,
            'start_time': aware_dt(2027, 5, 3, 10).isoformat(),
            'end_time': aware_dt(2027, 5, 3, 12).isoformat(),
            'duration_type': 'hourly',
        }, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertIn('place', response.data)
        self.assertEqual(Booking.objects.count(), initial_count)

    def test_hidden_place_alias_cannot_bypass_visibility(self):
        pending_place = Place.objects.create(
            owner=self.partner,
            title='Hidden alias room',
            location='Tashkent',
            price='100000 UZS',
            area=20,
            people=4,
            status='pending',
        )
        self.client_api.force_authenticate(self.client_user)
        initial_count = Booking.objects.count()

        response = self.client_api.post('/api/bookings/', {
            'space_id': pending_place.id,
            'start_time': aware_dt(2027, 5, 3, 10).isoformat(),
            'end_time': aware_dt(2027, 5, 3, 12).isoformat(),
            'duration_type': 'hourly',
        }, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertIn('place', response.data)
        self.assertEqual(Booking.objects.count(), initial_count)

    def test_owner_can_block_own_pending_place_but_not_foreign_place(self):
        own_pending_place = Place.objects.create(
            owner=self.partner,
            title='Own pending room',
            location='Tashkent',
            price='100000 UZS',
            area=20,
            people=4,
            status='pending',
        )
        foreign_pending_place = Place.objects.create(
            owner=self.other_partner,
            title='Foreign pending room',
            location='Tashkent',
            price='100000 UZS',
            area=20,
            people=4,
            status='pending',
        )
        self.client_api.force_authenticate(self.partner)

        own_response = self.client_api.post('/api/bookings/', {
            'place': own_pending_place.id,
            'start_time': aware_dt(2027, 5, 4, 10).isoformat(),
            'end_time': aware_dt(2027, 5, 4, 12).isoformat(),
            'duration_type': 'hourly',
            'status': 'blocked',
            'payment_status': 'unpaid',
        }, format='json')
        foreign_response = self.client_api.post('/api/bookings/', {
            'place': foreign_pending_place.id,
            'start_time': aware_dt(2027, 5, 5, 10).isoformat(),
            'end_time': aware_dt(2027, 5, 5, 12).isoformat(),
            'duration_type': 'hourly',
            'status': 'blocked',
            'payment_status': 'unpaid',
        }, format='json')

        self.assertEqual(own_response.status_code, 201)
        self.assertEqual(own_response.data['status'], 'blocked')
        self.assertEqual(foreign_response.status_code, 403)
        self.assertFalse(Booking.objects.filter(place=foreign_pending_place).exists())

    def test_admin_manual_booking_can_use_pending_place(self):
        pending_place = Place.objects.create(
            owner=self.partner,
            title='Pending admin room',
            location='Tashkent',
            price='100000 UZS',
            area=20,
            people=4,
            status='pending',
        )
        self.client_api.force_authenticate(self.admin)

        response = self.client_api.post('/api/bookings/', {
            'client': self.client_user.id,
            'place': pending_place.id,
            'start_time': aware_dt(2027, 5, 6, 10).isoformat(),
            'end_time': aware_dt(2027, 5, 6, 12).isoformat(),
            'duration_type': 'hourly',
            'status': 'pending',
            'payment_status': 'unpaid',
        }, format='json')

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['place'], pending_place.id)

    def test_client_generic_update_rejects_hidden_place_but_cancel_still_works(self):
        pending_place = Place.objects.create(
            owner=self.partner,
            title='Pending existing booking room',
            location='Tashkent',
            price='100000 UZS',
            area=20,
            people=4,
            status='pending',
        )
        booking = Booking.objects.create(
            client=self.client_user,
            place=pending_place,
            start_time=aware_dt(2027, 5, 7, 10),
            end_time=aware_dt(2027, 5, 7, 12),
            duration_type='hourly',
            note='Original note',
        )
        self.client_api.force_authenticate(self.client_user)

        update_response = self.client_api.patch(
            f'/api/bookings/{booking.id}/',
            {'note': 'Hidden-place update'},
            format='json',
        )
        booking.refresh_from_db()

        self.assertEqual(update_response.status_code, 400)
        self.assertIn('place', update_response.data)
        self.assertEqual(booking.note, 'Original note')

        cancel_response = self.client_api.post(f'/api/bookings/{booking.id}/cancel/')
        self.assertEqual(cancel_response.status_code, 200)
        booking.refresh_from_db()
        self.assertEqual(booking.status, 'cancelled')

    def test_guests_requires_strict_positive_integer(self):
        self.client_api.force_authenticate(self.client_user)

        invalid_values = (0, -1, 1.5, '2', True)
        for index, guests in enumerate(invalid_values):
            initial_count = Booking.objects.count()
            with self.subTest(guests=guests):
                response = self.client_api.post('/api/bookings/', {
                    'place': self.place.id,
                    'start_time': aware_dt(2027, 6, 1 + index, 10).isoformat(),
                    'end_time': aware_dt(2027, 6, 1 + index, 12).isoformat(),
                    'duration_type': 'hourly',
                    'guests': guests,
                }, format='json')

                self.assertEqual(response.status_code, 400)
                self.assertIn('guests', response.data)
                self.assertEqual(Booking.objects.count(), initial_count)

    def test_guests_capacity_boundary_and_update(self):
        self.client_api.force_authenticate(self.client_user)

        exact_response = self.client_api.post('/api/bookings/', {
            'place': self.place.id,
            'start_time': aware_dt(2027, 6, 10, 10).isoformat(),
            'end_time': aware_dt(2027, 6, 10, 12).isoformat(),
            'duration_type': 'hourly',
            'guests': self.place.people,
        }, format='json')
        self.assertEqual(exact_response.status_code, 201)
        self.assertEqual(exact_response.data['guests'], self.place.people)

        initial_count = Booking.objects.count()
        overflow_response = self.client_api.post('/api/bookings/', {
            'place': self.place.id,
            'start_time': aware_dt(2027, 6, 11, 10).isoformat(),
            'end_time': aware_dt(2027, 6, 11, 12).isoformat(),
            'duration_type': 'hourly',
            'guests': self.place.people + 1,
        }, format='json')
        self.assertEqual(overflow_response.status_code, 400)
        self.assertEqual(
            overflow_response.data['guests'][0],
            f'Guests cannot exceed place capacity of {self.place.people}.',
        )
        self.assertEqual(Booking.objects.count(), initial_count)

        booking = Booking.objects.get(pk=exact_response.data['id'])
        update_response = self.client_api.patch(
            f'/api/bookings/{booking.id}/',
            {'guests': self.place.people + 1},
            format='json',
        )
        self.assertEqual(update_response.status_code, 400)
        self.assertIn('guests', update_response.data)
        booking.refresh_from_db()
        self.assertEqual(booking.guests, self.place.people)

        valid_update_response = self.client_api.patch(
            f'/api/bookings/{booking.id}/',
            {'guests': self.place.people - 1},
            format='json',
        )
        self.assertEqual(valid_update_response.status_code, 200)
        booking.refresh_from_db()
        self.assertEqual(booking.guests, self.place.people - 1)

    def test_capacity_change_does_not_prevent_client_cancellation(self):
        booking = Booking.objects.create(
            client=self.client_user,
            place=self.place,
            start_time=aware_dt(2027, 6, 14, 10),
            end_time=aware_dt(2027, 6, 14, 12),
            duration_type='hourly',
            guests=self.place.people,
        )
        self.place.people = 1
        self.place.save(update_fields=['people'])
        self.client_api.force_authenticate(self.client_user)

        response = self.client_api.post(f'/api/bookings/{booking.id}/cancel/')

        self.assertEqual(response.status_code, 200)
        booking.refresh_from_db()
        self.assertEqual(booking.status, 'cancelled')

    def test_zero_capacity_place_is_not_treated_as_unlimited(self):
        zero_capacity_place = Place.objects.create(
            owner=self.partner,
            title='Legacy zero capacity room',
            location='Tashkent',
            price='100000 UZS',
            area=20,
            people=0,
            status='approved',
        )
        self.client_api.force_authenticate(self.client_user)
        initial_count = Booking.objects.count()

        response = self.client_api.post('/api/bookings/', {
            'place': zero_capacity_place.id,
            'start_time': aware_dt(2027, 6, 12, 10).isoformat(),
            'end_time': aware_dt(2027, 6, 12, 12).isoformat(),
            'duration_type': 'hourly',
            'guests': 1,
        }, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.data['guests'][0],
            'Booking is unavailable because place capacity is not configured.',
        )
        self.assertEqual(Booking.objects.count(), initial_count)

    def test_owner_block_does_not_require_guests_or_valid_capacity(self):
        zero_capacity_place = Place.objects.create(
            owner=self.partner,
            title='Zero capacity maintenance room',
            location='Tashkent',
            price='100000 UZS',
            area=20,
            people=0,
            status='pending',
        )
        self.client_api.force_authenticate(self.partner)

        response = self.client_api.post('/api/bookings/', {
            'place': zero_capacity_place.id,
            'start_time': aware_dt(2027, 6, 13, 10).isoformat(),
            'end_time': aware_dt(2027, 6, 13, 12).isoformat(),
            'duration_type': 'hourly',
            'status': 'blocked',
            'payment_status': 'unpaid',
        }, format='json')

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['status'], 'blocked')

    def test_create_requires_complete_interval_and_duration(self):
        self.client_api.force_authenticate(self.client_user)
        future_start = timezone.now() + timedelta(days=30)
        future_end = future_start + timedelta(hours=2)
        initial_count = Booking.objects.count()
        initial_notifications = Notification.objects.count()
        cases = (
            ({'place': self.place.id}, {'start_time', 'end_time', 'duration_type'}),
            ({
                'place': self.place.id,
                'start_time': future_start.isoformat(),
                'duration_type': 'hourly',
            }, {'end_time'}),
            ({
                'place': self.place.id,
                'end_time': future_end.isoformat(),
                'duration_type': 'hourly',
            }, {'start_time'}),
            ({
                'place': self.place.id,
                'start_time': future_start.isoformat(),
                'end_time': future_end.isoformat(),
            }, {'duration_type'}),
        )

        for payload, expected_fields in cases:
            with self.subTest(payload=payload):
                response = self.client_api.post('/api/bookings/', payload, format='json')
                self.assertEqual(response.status_code, 400)
                self.assertTrue(expected_fields.issubset(response.data.keys()))
                self.assertEqual(Booking.objects.count(), initial_count)
                self.assertEqual(Notification.objects.count(), initial_notifications)

    def test_create_rejects_invalid_intervals_and_duration(self):
        self.client_api.force_authenticate(self.client_user)
        future_start = timezone.now() + timedelta(days=31)
        initial_count = Booking.objects.count()
        initial_notifications = Notification.objects.count()
        cases = (
            ({
                'start_time': future_start.isoformat(),
                'end_time': future_start.isoformat(),
                'duration_type': 'hourly',
            }, 'end_time'),
            ({
                'start_time': future_start.isoformat(),
                'end_time': (future_start - timedelta(minutes=1)).isoformat(),
                'duration_type': 'hourly',
            }, 'end_time'),
            ({
                'start_time': future_start.isoformat(),
                'end_time': (future_start + timedelta(hours=1)).isoformat(),
                'duration_type': 'century',
            }, 'duration_type'),
            ({
                'start_time': 'not-an-iso-datetime',
                'end_time': (future_start + timedelta(hours=1)).isoformat(),
                'duration_type': 'hourly',
            }, 'start_time'),
            ({
                'start_time': future_start.replace(tzinfo=None).isoformat(),
                'end_time': (future_start + timedelta(hours=1)).isoformat(),
                'duration_type': 'hourly',
            }, 'start_time'),
        )

        for interval, expected_field in cases:
            with self.subTest(interval=interval):
                response = self.client_api.post('/api/bookings/', {
                    'place': self.place.id,
                    **interval,
                }, format='json')
                self.assertEqual(response.status_code, 400)
                self.assertIn(expected_field, response.data)
                self.assertEqual(Booking.objects.count(), initial_count)
                self.assertEqual(Notification.objects.count(), initial_notifications)

    def test_legacy_date_aliases_require_both_dates(self):
        self.client_api.force_authenticate(self.client_user)
        future_date = (timezone.localdate() + timedelta(days=32)).isoformat()

        missing_end = self.client_api.post('/api/bookings/', {
            'place': self.place.id,
            'start_date': future_date,
            'duration_type': 'daily',
        }, format='json')
        missing_start = self.client_api.post('/api/bookings/', {
            'place': self.place.id,
            'end_date': future_date,
            'duration_type': 'daily',
        }, format='json')

        self.assertEqual(missing_end.status_code, 400)
        self.assertIn('end_time', missing_end.data)
        self.assertEqual(missing_start.status_code, 400)
        self.assertIn('start_time', missing_start.data)

    def test_client_past_interval_is_rejected_but_admin_backfill_is_allowed(self):
        past_start = timezone.now() - timedelta(days=2)
        past_end = past_start + timedelta(hours=2)
        payload = {
            'place': self.place.id,
            'start_time': past_start.isoformat(),
            'end_time': past_end.isoformat(),
            'duration_type': 'hourly',
        }
        self.client_api.force_authenticate(self.client_user)
        initial_count = Booking.objects.count()

        client_response = self.client_api.post('/api/bookings/', payload, format='json')
        self.assertEqual(client_response.status_code, 400)
        self.assertIn('start_time', client_response.data)
        self.assertEqual(Booking.objects.count(), initial_count)

        self.client_api.force_authenticate(self.admin)
        admin_response = self.client_api.post('/api/bookings/', {
            **payload,
            'client': self.client_user.id,
            'status': 'completed',
            'payment_status': 'paid',
        }, format='json')
        self.assertEqual(admin_response.status_code, 201)
        self.assertEqual(admin_response.data['status'], 'completed')

    def test_partial_patch_uses_existing_interval_and_validates_changed_interval(self):
        future_start = timezone.now() + timedelta(days=33)
        booking = Booking.objects.create(
            client=self.client_user,
            place=self.place,
            start_time=future_start,
            end_time=future_start + timedelta(hours=2),
            duration_type='hourly',
            note='Original note',
        )
        self.client_api.force_authenticate(self.client_user)

        note_response = self.client_api.patch(
            f'/api/bookings/{booking.id}/',
            {'note': 'Updated note'},
            format='json',
        )
        invalid_interval_response = self.client_api.patch(
            f'/api/bookings/{booking.id}/',
            {'end_time': (future_start - timedelta(minutes=1)).isoformat()},
            format='json',
        )

        self.assertEqual(note_response.status_code, 200)
        self.assertEqual(invalid_interval_response.status_code, 400)
        self.assertIn('end_time', invalid_interval_response.data)
        booking.refresh_from_db()
        self.assertEqual(booking.note, 'Updated note')
        self.assertEqual(booking.end_time, future_start + timedelta(hours=2))

    def test_client_cannot_set_any_status_or_payment_status_on_create(self):
        self.client_api.force_authenticate(self.client_user)
        initial_count = Booking.objects.count()
        controlled_choices = {
            'status': [choice for choice, _ in Booking.STATUS_CHOICES],
            'payment_status': [choice for choice, _ in Booking.PAYMENT_STATUS_CHOICES],
        }

        for field_name, choices in controlled_choices.items():
            for index, choice in enumerate(choices):
                with self.subTest(field=field_name, choice=choice):
                    response = self.client_api.post('/api/bookings/', {
                        'place': self.place.id,
                        'start_time': aware_dt(2027, 1, 10 + index, 10).isoformat(),
                        'end_time': aware_dt(2027, 1, 10 + index, 12).isoformat(),
                        'duration_type': 'hourly',
                        field_name: choice,
                    }, format='json')

                    self.assertEqual(response.status_code, 400)
                    self.assertIn(field_name, response.data)
                    self.assertEqual(Booking.objects.count(), initial_count)

    def test_client_cannot_change_controlled_fields_through_patch_or_put(self):
        booking = Booking.objects.create(
            client=self.client_user,
            place=self.place,
            start_time=aware_dt(2027, 2, 1, 10),
            end_time=aware_dt(2027, 2, 1, 12),
            duration_type='hourly',
            status='pending',
            payment_status='unpaid',
        )
        self.client_api.force_authenticate(self.client_user)

        for choice, _ in Booking.STATUS_CHOICES:
            with self.subTest(method='patch', field='status', choice=choice):
                response = self.client_api.patch(
                    f'/api/bookings/{booking.id}/',
                    {'status': choice},
                    format='json',
                )
                self.assertEqual(response.status_code, 400)
                self.assertIn('status', response.data)

        for choice, _ in Booking.PAYMENT_STATUS_CHOICES:
            with self.subTest(method='put', field='payment_status', choice=choice):
                response = self.client_api.put(
                    f'/api/bookings/{booking.id}/',
                    {'payment_status': choice},
                    format='json',
                )
                self.assertEqual(response.status_code, 400)
                self.assertIn('payment_status', response.data)

        booking.refresh_from_db()
        self.assertEqual(booking.status, 'pending')
        self.assertEqual(booking.payment_status, 'unpaid')

    def test_admin_manual_create_accepts_controlled_fields_but_generic_update_does_not(self):
        self.client_api.force_authenticate(self.admin)
        response = self.client_api.post('/api/bookings/', {
            'client': self.client_user.id,
            'place': self.place.id,
            'start_time': aware_dt(2027, 3, 1, 10).isoformat(),
            'end_time': aware_dt(2027, 3, 1, 12).isoformat(),
            'duration_type': 'hourly',
            'status': 'confirmed',
            'payment_status': 'paid',
        }, format='json')

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['status'], 'confirmed')
        self.assertEqual(response.data['payment_status'], 'paid')
        booking = Booking.objects.get(pk=response.data['id'])

        patch_response = self.client_api.patch(
            f'/api/bookings/{booking.id}/',
            {'status': 'completed'},
            format='json',
        )
        put_response = self.client_api.put(
            f'/api/bookings/{booking.id}/',
            {'payment_status': 'test_paid'},
            format='json',
        )

        self.assertEqual(patch_response.status_code, 400)
        self.assertIn('status', patch_response.data)
        self.assertEqual(put_response.status_code, 400)
        self.assertIn('payment_status', put_response.data)
        booking.refresh_from_db()
        self.assertEqual(booking.status, 'confirmed')
        self.assertEqual(booking.payment_status, 'paid')

    def test_client_cannot_assign_or_transfer_booking(self):
        booking = Booking.objects.create(
            client=self.client_user,
            place=self.place,
            start_time=aware_dt(2027, 4, 1, 10),
            end_time=aware_dt(2027, 4, 1, 12),
            duration_type='hourly',
            status='confirmed',
            payment_status='test_paid',
        )
        self.client_api.force_authenticate(self.client_user)

        patch_response = self.client_api.patch(
            f'/api/bookings/{booking.id}/',
            {'client': self.other_client.id},
            format='json',
        )
        put_response = self.client_api.put(
            f'/api/bookings/{booking.id}/',
            {'client': self.other_client.id},
            format='json',
        )
        place_response = self.client_api.patch(
            f'/api/bookings/{booking.id}/',
            {'place': self.other_place.id},
            format='json',
        )

        self.assertEqual(patch_response.status_code, 400)
        self.assertIn('client', patch_response.data)
        self.assertEqual(put_response.status_code, 400)
        self.assertIn('client', put_response.data)
        self.assertEqual(place_response.status_code, 400)
        self.assertIn('place', place_response.data)
        booking.refresh_from_db()
        self.assertEqual(booking.client_id, self.client_user.id)
        self.assertEqual(booking.place_id, self.place.id)
        self.assertEqual(booking.payment_status, 'test_paid')

    def test_partner_cannot_transfer_visible_booking_to_another_owner(self):
        booking = Booking.objects.create(
            client=self.client_user,
            place=self.place,
            start_time=aware_dt(2027, 4, 2, 10),
            end_time=aware_dt(2027, 4, 2, 12),
            duration_type='hourly',
        )
        self.client_api.force_authenticate(self.partner)

        for alias in ('place', 'place_id', 'space_id'):
            with self.subTest(alias=alias):
                response = self.client_api.patch(
                    f'/api/bookings/{booking.id}/',
                    {alias: self.other_place.id},
                    format='json',
                )
                self.assertEqual(response.status_code, 400)
                self.assertIn('place', response.data)

        booking.refresh_from_db()
        self.assertEqual(booking.place_id, self.place.id)
        self.assertEqual(booking.place.owner_id, self.partner.id)

    def test_client_create_uses_request_user_and_rejects_client_assignment(self):
        self.client_api.force_authenticate(self.client_user)
        initial_count = Booking.objects.count()

        response = self.client_api.post('/api/bookings/', {
            'client': self.other_client.id,
            'place': self.place.id,
            'start_time': aware_dt(2027, 4, 3, 10).isoformat(),
            'end_time': aware_dt(2027, 4, 3, 12).isoformat(),
            'duration_type': 'hourly',
        }, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertIn('client', response.data)
        self.assertEqual(Booking.objects.count(), initial_count)

    def test_admin_assignment_validates_foreign_keys_and_creates_audit_log(self):
        booking = Booking.objects.create(
            client=self.client_user,
            place=self.place,
            start_time=aware_dt(2027, 4, 4, 10),
            end_time=aware_dt(2027, 4, 4, 12),
            duration_type='hourly',
        )
        self.client_api.force_authenticate(self.admin)

        invalid_response = self.client_api.patch(
            f'/api/bookings/{booking.id}/',
            {'client': 999999999},
            format='json',
        )
        self.assertEqual(invalid_response.status_code, 400)
        self.assertIn('client', invalid_response.data)
        booking.refresh_from_db()
        self.assertEqual(booking.client_id, self.client_user.id)
        self.assertEqual(booking.place_id, self.place.id)
        self.assertFalse(AuditLog.objects.filter(
            action='booking.assignment_updated',
            object_id=str(booking.id),
        ).exists())

        response = self.client_api.patch(
            f'/api/bookings/{booking.id}/',
            {
                'client': self.other_client.id,
                'place': self.other_place.id,
            },
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        booking.refresh_from_db()
        self.assertEqual(booking.client_id, self.other_client.id)
        self.assertEqual(booking.place_id, self.other_place.id)
        audit = AuditLog.objects.get(
            action='booking.assignment_updated',
            object_id=str(booking.id),
        )
        self.assertEqual(audit.actor_id, self.admin.id)
        self.assertEqual(audit.metadata['previous_client_id'], self.client_user.id)
        self.assertEqual(audit.metadata['client_id'], self.other_client.id)
        self.assertEqual(audit.metadata['previous_place_id'], self.place.id)
        self.assertEqual(audit.metadata['place_id'], self.other_place.id)
        self.assertEqual(audit.metadata['previous_place_owner_id'], self.partner.id)
        self.assertEqual(audit.metadata['place_owner_id'], self.other_partner.id)

    def test_booking_status_actions_notify_the_other_party(self):
        booking = Booking.objects.create(
            client=self.client_user,
            place=self.place,
            start_time=aware_dt(2026, 10, 12, 10),
            end_time=aware_dt(2026, 10, 12, 12),
            duration_type='hourly',
            status='pending',
        )

        self.client_api.force_authenticate(self.partner)
        confirmed = self.client_api.post(f'/api/bookings/{booking.id}/confirm/')
        self.assertEqual(confirmed.status_code, 200)
        self.assertEqual(confirmed.data['status'], 'confirmed')
        self.assertTrue(Notification.objects.filter(
            user=self.client_user,
            notification_type='booking_confirmed',
            related_booking_id=booking.id,
        ).exists())

        self.client_api.force_authenticate(self.client_user)
        cancelled = self.client_api.post(f'/api/bookings/{booking.id}/cancel/')
        self.assertEqual(cancelled.status_code, 200)
        self.assertEqual(cancelled.data['status'], 'cancelled')
        self.assertTrue(Notification.objects.filter(
            user=self.partner,
            notification_type='booking_cancelled',
            related_booking_id=booking.id,
        ).exists())
        confirm_audit = AuditLog.objects.get(action='booking.confirmed', object_id=str(booking.id))
        cancel_audit = AuditLog.objects.get(action='booking.cancelled', object_id=str(booking.id))
        self.assertEqual(confirm_audit.actor, self.partner)
        self.assertEqual(confirm_audit.metadata['previous_status'], 'pending')
        self.assertEqual(confirm_audit.metadata['next_status'], 'confirmed')
        self.assertEqual(confirm_audit.metadata['booking_id'], booking.id)
        self.assertEqual(confirm_audit.metadata['place_id'], self.place.id)
        self.assertEqual(confirm_audit.metadata['client_id'], self.client_user.id)
        self.assertEqual(cancel_audit.actor, self.client_user)
        self.assertEqual(cancel_audit.metadata['previous_status'], 'confirmed')
        self.assertEqual(cancel_audit.metadata['next_status'], 'cancelled')

        audit_count = AuditLog.objects.filter(object_id=str(booking.id)).count()
        notification_count = Notification.objects.filter(related_booking_id=booking.id).count()
        repeated_cancel = self.client_api.post(f'/api/bookings/{booking.id}/cancel/')
        self.assertEqual(repeated_cancel.status_code, 200)
        self.assertEqual(repeated_cancel.data['status'], 'cancelled')
        self.assertEqual(AuditLog.objects.filter(object_id=str(booking.id)).count(), audit_count)
        self.assertEqual(Notification.objects.filter(related_booking_id=booking.id).count(), notification_count)

    def test_admin_status_change_notifies_client_and_owner_once(self):
        booking = Booking.objects.create(
            client=self.client_user,
            place=self.place,
            start_time=aware_dt(2027, 10, 6, 10),
            end_time=aware_dt(2027, 10, 6, 12),
            duration_type='hourly',
            status='pending',
        )
        self.client_api.force_authenticate(self.admin)

        response = self.client_api.post(f'/api/bookings/{booking.id}/confirm/')

        self.assertEqual(response.status_code, 200)
        recipients = list(Notification.objects.filter(
            notification_type='booking_confirmed',
            related_booking_id=booking.id,
        ).order_by('user_id').values_list('user_id', flat=True))
        self.assertEqual(recipients, sorted([self.client_user.id, self.partner.id]))
        self.assertEqual(AuditLog.objects.filter(
            action='booking.confirmed', object_id=str(booking.id)
        ).count(), 1)

    def test_generic_status_patch_cannot_bypass_transition_events(self):
        booking = Booking.objects.create(
            client=self.client_user,
            place=self.place,
            start_time=aware_dt(2027, 10, 7, 10),
            end_time=aware_dt(2027, 10, 7, 12),
            duration_type='hourly',
            status='pending',
        )
        self.client_api.force_authenticate(self.partner)

        response = self.client_api.patch(
            f'/api/bookings/{booking.id}/',
            {'status': 'confirmed'},
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        booking.refresh_from_db()
        self.assertEqual(booking.status, 'pending')
        self.assertFalse(AuditLog.objects.filter(object_id=str(booking.id)).exists())
        self.assertFalse(Notification.objects.filter(related_booking_id=booking.id).exists())

    def test_transition_rolls_back_status_and_notification_when_audit_fails(self):
        booking = Booking.objects.create(
            client=self.client_user,
            place=self.place,
            start_time=aware_dt(2027, 10, 8, 10),
            end_time=aware_dt(2027, 10, 8, 12),
            duration_type='hourly',
            status='pending',
        )

        with patch('bookings.services.create_audit_log', return_value=None):
            with self.assertRaises(RuntimeError):
                transition_booking_status(
                    actor=self.partner,
                    booking_id=booking.id,
                    next_status='confirmed',
                )

        booking.refresh_from_db()
        self.assertEqual(booking.status, 'pending')
        self.assertFalse(AuditLog.objects.filter(object_id=str(booking.id)).exists())
        self.assertFalse(Notification.objects.filter(related_booking_id=booking.id).exists())

    def test_booking_block_action_creates_blocked_notifications(self):
        booking = Booking.objects.create(
            client=self.partner,
            place=self.place,
            start_time=aware_dt(2026, 10, 13, 10),
            end_time=aware_dt(2026, 10, 13, 12),
            duration_type='hourly',
            status='pending',
        )
        self.client_api.force_authenticate(self.partner)

        response = self.client_api.post(f'/api/bookings/{booking.id}/block/')

        self.assertEqual(response.status_code, 200)
        recipients = set(Notification.objects.filter(
            notification_type='booking_blocked',
            related_booking_id=booking.id,
        ).values_list('user_id', flat=True))
        self.assertEqual(recipients, {self.partner.id})

    def test_status_transition_table_is_explicit(self):
        self.assertEqual(BOOKING_STATUS_TRANSITIONS, {
            'pending': frozenset({'confirmed', 'cancelled', 'blocked'}),
            'confirmed': frozenset({'cancelled'}),
            'cancelled': frozenset(),
            'completed': frozenset(),
            'blocked': frozenset({'cancelled'}),
        })

    def test_cancelled_and_completed_bookings_are_terminal(self):
        cancelled = Booking.objects.create(
            client=self.client_user,
            place=self.place,
            start_time=aware_dt(2027, 10, 1, 10),
            end_time=aware_dt(2027, 10, 1, 12),
            duration_type='hourly',
            status='cancelled',
        )
        completed = Booking.objects.create(
            client=self.client_user,
            place=self.place,
            start_time=aware_dt(2027, 10, 2, 10),
            end_time=aware_dt(2027, 10, 2, 12),
            duration_type='hourly',
            status='completed',
        )
        self.client_api.force_authenticate(self.partner)
        initial_audits = AuditLog.objects.count()
        initial_notifications = Notification.objects.count()

        cancelled_confirm = self.client_api.post(f'/api/bookings/{cancelled.id}/confirm/')
        self.assertEqual(cancelled_confirm.status_code, 400)
        self.assertIn('status', cancelled_confirm.data)

        for action_name in ('confirm', 'cancel', 'block'):
            with self.subTest(status='completed', action=action_name):
                response = self.client_api.post(f'/api/bookings/{completed.id}/{action_name}/')
                self.assertEqual(response.status_code, 400)
                self.assertIn('status', response.data)

        cancelled.refresh_from_db()
        completed.refresh_from_db()
        self.assertEqual(cancelled.status, 'cancelled')
        self.assertEqual(completed.status, 'completed')
        self.assertEqual(AuditLog.objects.count(), initial_audits)
        self.assertEqual(Notification.objects.count(), initial_notifications)

    def test_confirm_permissions_and_repeated_confirm_are_idempotent(self):
        booking = Booking.objects.create(
            client=self.client_user,
            place=self.place,
            start_time=aware_dt(2027, 10, 3, 10),
            end_time=aware_dt(2027, 10, 3, 12),
            duration_type='hourly',
            status='pending',
        )
        self.client_api.force_authenticate(self.client_user)
        client_response = self.client_api.post(f'/api/bookings/{booking.id}/confirm/')
        self.assertEqual(client_response.status_code, 403)

        self.client_api.force_authenticate(self.partner)
        first_response = self.client_api.post(f'/api/bookings/{booking.id}/confirm/')
        self.assertEqual(first_response.status_code, 200)
        audit_count = AuditLog.objects.filter(
            action='booking.confirmed', object_id=str(booking.id)
        ).count()
        notification_count = Notification.objects.filter(
            notification_type='booking_confirmed', related_booking_id=booking.id
        ).count()

        repeated_response = self.client_api.post(f'/api/bookings/{booking.id}/confirm/')
        self.assertEqual(repeated_response.status_code, 200)
        self.assertEqual(repeated_response.data['status'], 'confirmed')
        self.assertEqual(AuditLog.objects.filter(
            action='booking.confirmed', object_id=str(booking.id)
        ).count(), audit_count)
        self.assertEqual(Notification.objects.filter(
            notification_type='booking_confirmed', related_booking_id=booking.id
        ).count(), notification_count)

    def test_paid_owner_slot_cannot_transition_to_blocked(self):
        booking = Booking.objects.create(
            client=self.partner,
            place=self.place,
            start_time=aware_dt(2027, 10, 4, 10),
            end_time=aware_dt(2027, 10, 4, 12),
            duration_type='hourly',
            status='pending',
            payment_status='paid',
        )
        self.client_api.force_authenticate(self.partner)
        initial_audits = AuditLog.objects.count()
        initial_notifications = Notification.objects.count()

        response = self.client_api.post(f'/api/bookings/{booking.id}/block/')

        self.assertEqual(response.status_code, 400)
        self.assertIn('status', response.data)
        booking.refresh_from_db()
        self.assertEqual(booking.status, 'pending')
        self.assertEqual(booking.payment_status, 'paid')
        self.assertEqual(AuditLog.objects.count(), initial_audits)
        self.assertEqual(Notification.objects.count(), initial_notifications)

    def test_owner_slot_can_be_blocked_idempotently_and_then_cancelled(self):
        booking = Booking.objects.create(
            client=self.partner,
            place=self.place,
            start_time=aware_dt(2027, 10, 5, 10),
            end_time=aware_dt(2027, 10, 5, 12),
            duration_type='hourly',
            status='pending',
            payment_status='unpaid',
        )
        self.client_api.force_authenticate(self.partner)

        first_block = self.client_api.post(f'/api/bookings/{booking.id}/block/')
        self.assertEqual(first_block.status_code, 200)
        audit_count = AuditLog.objects.filter(object_id=str(booking.id)).count()
        notification_count = Notification.objects.filter(related_booking_id=booking.id).count()

        repeated_block = self.client_api.post(f'/api/bookings/{booking.id}/block/')
        self.assertEqual(repeated_block.status_code, 200)
        self.assertEqual(AuditLog.objects.filter(object_id=str(booking.id)).count(), audit_count)
        self.assertEqual(Notification.objects.filter(related_booking_id=booking.id).count(), notification_count)

        cancelled = self.client_api.post(f'/api/bookings/{booking.id}/cancel/')
        self.assertEqual(cancelled.status_code, 200)
        booking.refresh_from_db()
        self.assertEqual(booking.status, 'cancelled')

    def test_client_history_lists_own_bookings_and_allows_cancel(self):
        own_booking = Booking.objects.create(
            client=self.client_user,
            place=self.place,
            start_time=aware_dt(2026, 10, 5, 10),
            end_time=aware_dt(2026, 10, 5, 12),
            duration_type='hourly',
            amount='120000',
            currency='UZS',
            status='pending',
            payment_status='unpaid',
            note='Client history test',
        )
        Booking.objects.create(
            client=self.other_partner,
            place=self.other_place,
            start_time=aware_dt(2026, 10, 6, 10),
            end_time=aware_dt(2026, 10, 6, 12),
            duration_type='hourly',
            status='pending',
        )
        self.client_api.force_authenticate(self.client_user)

        history = self.client_api.get('/api/bookings/')

        self.assertEqual(history.status_code, 200)
        history_items = history.data.get('results', []) if isinstance(history.data, dict) else history.data
        self.assertEqual([item['id'] for item in history_items], [own_booking.id])
        self.assertEqual(history_items[0]['note'], 'Client history test')

        cancelled = self.client_api.post(f'/api/bookings/{own_booking.id}/cancel/')
        self.assertEqual(cancelled.status_code, 200)
        self.assertEqual(cancelled.data['status'], 'cancelled')

    def test_partner_keeps_personal_history_and_can_separate_host_scope(self):
        partner_place = Place.objects.create(
            owner=self.client_user,
            title='New partner listing',
            location='Tashkent',
            price='150000 UZS',
            area=25,
            people=5,
            status='approved',
        )
        personal_booking = Booking.objects.create(
            client=self.client_user,
            place=self.other_place,
            start_time=aware_dt(2028, 1, 10, 10),
            end_time=aware_dt(2028, 1, 10, 12),
            duration_type='hourly',
            status='pending',
        )
        incoming_booking = Booking.objects.create(
            client=self.other_client,
            place=partner_place,
            start_time=aware_dt(2028, 1, 11, 10),
            end_time=aware_dt(2028, 1, 11, 12),
            duration_type='hourly',
            status='pending',
        )
        own_place_booking = Booking.objects.create(
            client=self.client_user,
            place=partner_place,
            start_time=aware_dt(2028, 1, 12, 10),
            end_time=aware_dt(2028, 1, 12, 12),
            duration_type='hourly',
            status='pending',
        )
        unrelated_booking = Booking.objects.create(
            client=self.other_client,
            place=self.other_place,
            start_time=aware_dt(2028, 1, 13, 10),
            end_time=aware_dt(2028, 1, 13, 12),
            duration_type='hourly',
            status='pending',
        )
        self.client_user.role = 'partner'
        self.client_user.save(update_fields=['role'])
        self.client_api.force_authenticate(self.client_user)

        default_response = self.client_api.get('/api/bookings/')
        mine_response = self.client_api.get('/api/bookings/', {'scope': 'mine'})
        host_response = self.client_api.get('/api/bookings/', {'scope': 'host'})
        foreign_host_response = self.client_api.get('/api/bookings/', {
            'scope': 'host',
            'place': self.other_place.id,
        })

        self.assertEqual(default_response.status_code, 200)
        default_items = default_response.data.get('results', []) if isinstance(default_response.data, dict) else default_response.data
        default_ids = [item['id'] for item in default_items]
        self.assertCountEqual(default_ids, [personal_booking.id, incoming_booking.id, own_place_booking.id])
        self.assertEqual(default_ids.count(own_place_booking.id), 1)
        mine_items = mine_response.data.get('results', []) if isinstance(mine_response.data, dict) else mine_response.data
        self.assertCountEqual(
            [item['id'] for item in mine_items],
            [personal_booking.id, own_place_booking.id],
        )
        host_items = host_response.data.get('results', []) if isinstance(host_response.data, dict) else host_response.data
        self.assertCountEqual(
            [item['id'] for item in host_items],
            [incoming_booking.id, own_place_booking.id],
        )
        foreign_host_items = (
            foreign_host_response.data.get('results', [])
            if isinstance(foreign_host_response.data, dict)
            else foreign_host_response.data
        )
        self.assertEqual(foreign_host_response.status_code, 200)
        self.assertEqual(foreign_host_items, [])
        self.assertNotIn(unrelated_booking.id, default_ids)

        self.assertEqual(
            self.client_api.get(f'/api/bookings/{personal_booking.id}/', {'scope': 'mine'}).status_code,
            200,
        )
        self.assertEqual(
            self.client_api.get(f'/api/bookings/{personal_booking.id}/', {'scope': 'host'}).status_code,
            404,
        )
        self.assertEqual(
            self.client_api.get(f'/api/bookings/{unrelated_booking.id}/').status_code,
            404,
        )

        cancelled = self.client_api.post(f'/api/bookings/{personal_booking.id}/cancel/')
        self.assertEqual(cancelled.status_code, 200)
        personal_booking.refresh_from_db()
        self.assertEqual(personal_booking.status, 'cancelled')

    def test_client_cannot_request_host_scope_and_unknown_scope_is_rejected(self):
        self.client_api.force_authenticate(self.client_user)

        host_response = self.client_api.get('/api/bookings/', {'scope': 'host'})
        invalid_response = self.client_api.get('/api/bookings/', {'scope': 'everything'})

        self.assertEqual(host_response.status_code, 403)
        self.assertEqual(invalid_response.status_code, 400)
        self.assertIn('scope', invalid_response.data)

    def test_booking_list_rejects_invalid_query_values_without_side_effects(self):
        self.client_api.force_authenticate(self.admin)
        initial_booking_ids = list(Booking.objects.order_by('id').values_list('id', flat=True))
        invalid_cases = (
            ({'place': 'invalid'}, 'place'),
            ({'place': '0'}, 'place'),
            ({'client': '-1'}, 'client'),
            ({'date_from': '2026-99-99'}, 'date_from'),
            ({'date_from': '2026-12-31', 'date_to': '2026-01-01'}, 'date_to'),
            ({'status': 'confirmd'}, 'status'),
            ({'place': self.place.id, 'space_id': self.other_place.id}, 'place'),
        )

        for params, expected_field in invalid_cases:
            with self.subTest(params=params):
                response = self.client_api.get('/api/bookings/', params)
                self.assertEqual(response.status_code, 400)
                self.assertIn(expected_field, response.data)

        self.assertEqual(
            list(Booking.objects.order_by('id').values_list('id', flat=True)),
            initial_booking_ids,
        )

    def test_booking_list_empty_and_valid_filters_do_not_expand_client_scope(self):
        own_booking = Booking.objects.create(
            client=self.client_user,
            place=self.place,
            start_time=aware_dt(2028, 2, 10, 10),
            end_time=aware_dt(2028, 2, 10, 12),
            duration_type='hourly',
            status='confirmed',
        )
        foreign_booking = Booking.objects.create(
            client=self.other_client,
            place=self.other_place,
            start_time=aware_dt(2028, 2, 11, 10),
            end_time=aware_dt(2028, 2, 11, 12),
            duration_type='hourly',
            status='confirmed',
        )
        self.client_api.force_authenticate(self.client_user)

        empty_response = self.client_api.get('/api/bookings/', {
            'place': '',
            'client': '',
            'status': '',
            'date_from': '',
            'date_to': '',
            'scope': '',
            'search': '',
        })
        foreign_filters = self.client_api.get('/api/bookings/', {
            'place': self.other_place.id,
            'client': self.other_client.id,
            'status': 'CONFIRMED',
            'search': self.other_place.title,
            'date_from': '2028-01-01',
            'date_to': '2028-12-31',
        })

        self.assertEqual(empty_response.status_code, 200)
        empty_items = empty_response.data.get('results', []) if isinstance(empty_response.data, dict) else empty_response.data
        self.assertEqual([item['id'] for item in empty_items], [own_booking.id])
        self.assertEqual(foreign_filters.status_code, 200)
        foreign_items = foreign_filters.data.get('results', []) if isinstance(foreign_filters.data, dict) else foreign_filters.data
        self.assertEqual(foreign_items, [])
        self.assertTrue(Booking.objects.filter(pk=foreign_booking.id).exists())

    def test_anonymous_user_cannot_create_booking(self):
        response = self.client_api.post('/api/bookings/', {
            'place': self.place.id,
            'start_time': aware_dt(2026, 9, 19, 13).isoformat(),
            'end_time': aware_dt(2026, 9, 19, 15).isoformat(),
            'duration_type': 'hourly',
            'guests': 1,
            'amount': '90000',
        }, format='json')

        self.assertIn(response.status_code, (401, 403))

    def test_availability_returns_booked_and_blocked_slots(self):
        Booking.objects.create(
            client=self.client_user,
            place=self.place,
            start_time=aware_dt(2027, 9, 20, 10),
            end_time=aware_dt(2027, 9, 20, 12),
            duration_type='hourly',
            status='confirmed',
            payment_status='test_paid',
        )
        Booking.objects.create(
            client=self.partner,
            place=self.place,
            start_time=aware_dt(2027, 9, 21, 9),
            end_time=aware_dt(2027, 9, 21, 18),
            duration_type='daily',
            status='blocked',
        )

        response = self.client_api.get('/api/bookings/availability/', {
            'place': self.place.id,
            'date_from': '2027-09-20',
            'date_to': '2027-09-21',
        })

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['days']['2027-09-20']['status'], 'booked')
        self.assertFalse(response.data['days']['2027-09-20']['full_day'])
        self.assertEqual(response.data['days']['2027-09-20']['slots']['10:00']['status'], 'booked')
        self.assertEqual(response.data['days']['2027-09-20']['slots']['11:00']['status'], 'booked')
        self.assertEqual(response.data['days']['2027-09-21']['status'], 'blocked')
        self.assertTrue(response.data['days']['2027-09-21']['full_day'])
        self.assertEqual(response.data['days']['2027-09-21']['slots']['09:00']['status'], 'blocked')

    def test_create_rejects_overlapping_booking(self):
        Booking.objects.create(
            client=self.client_user,
            place=self.place,
            start_time=aware_dt(2027, 9, 20, 10),
            end_time=aware_dt(2027, 9, 20, 12),
            duration_type='hourly',
            status='confirmed',
        )
        self.client_api.force_authenticate(self.client_user)

        response = self.client_api.post('/api/bookings/', {
            'place': self.place.id,
            'start_time': aware_dt(2027, 9, 20, 11).isoformat(),
            'end_time': aware_dt(2027, 9, 20, 13).isoformat(),
            'duration_type': 'hourly',
            'guests': 2,
            'amount': '100000',
        }, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertIn('non_field_errors', response.data)

    def test_partner_can_block_own_place(self):
        self.client_api.force_authenticate(self.partner)

        response = self.client_api.post('/api/bookings/', {
            'place': self.place.id,
            'start_date': '2027-09-22',
            'end_date': '2027-09-22',
            'duration_type': 'daily',
            'guests': 1,
            'amount': 0,
            'status': 'blocked',
        }, format='json')

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['status'], 'blocked')

    def test_client_cannot_create_blocked_booking(self):
        self.client_api.force_authenticate(self.client_user)

        response = self.client_api.post('/api/bookings/', {
            'place': self.place.id,
            'start_time': aware_dt(2026, 9, 25, 9).isoformat(),
            'end_time': aware_dt(2026, 9, 25, 18).isoformat(),
            'duration_type': 'daily',
            'status': 'blocked',
            'payment_status': 'unpaid',
            'note': 'Client must not be able to block',
        }, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertIn('status', response.data)

    def test_client_booking_cannot_overlap_partner_block(self):
        Booking.objects.create(
            client=self.partner,
            place=self.place,
            start_time=aware_dt(2027, 9, 26, 9),
            end_time=aware_dt(2027, 9, 26, 18),
            duration_type='daily',
            status='blocked',
            payment_status='unpaid',
            note='Owner maintenance block',
        )
        self.client_api.force_authenticate(self.client_user)

        response = self.client_api.post('/api/bookings/', {
            'place': self.place.id,
            'start_time': aware_dt(2027, 9, 26, 12).isoformat(),
            'end_time': aware_dt(2027, 9, 26, 14).isoformat(),
            'duration_type': 'hourly',
        }, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertIn('non_field_errors', response.data)

    def test_partner_cannot_block_other_place(self):
        self.client_api.force_authenticate(self.partner)

        response = self.client_api.post('/api/bookings/', {
            'place': self.other_place.id,
            'start_date': '2027-09-23',
            'end_date': '2027-09-23',
            'duration_type': 'daily',
            'guests': 1,
            'amount': 0,
            'status': 'blocked',
        }, format='json')

        self.assertEqual(response.status_code, 403)

    def test_admin_can_create_for_client_and_change_status(self):
        self.client_api.force_authenticate(self.admin)

        response = self.client_api.post('/api/bookings/', {
            'client': self.client_user.id,
            'place': self.place.id,
            'start_time': aware_dt(2026, 9, 24, 10).isoformat(),
            'end_time': aware_dt(2026, 9, 24, 12).isoformat(),
            'duration_type': 'hourly',
            'guests': 2,
            'amount': '150000',
            'status': 'pending',
            'note': 'Admin manual booking',
        }, format='json')

        self.assertEqual(response.status_code, 201)
        booking_id = response.data['id']
        self.assertEqual(response.data['client'], self.client_user.id)
        self.assertEqual(response.data['client_name'], self.client_user.username)
        self.assertEqual(response.data['place_title'], self.place.title)

        confirm_response = self.client_api.post(f'/api/bookings/{booking_id}/confirm/')
        self.assertEqual(confirm_response.status_code, 200)
        self.assertEqual(confirm_response.data['status'], 'confirmed')

        cancel_response = self.client_api.post(f'/api/bookings/{booking_id}/cancel/')
        self.assertEqual(cancel_response.status_code, 200)
        self.assertEqual(cancel_response.data['status'], 'cancelled')

        block_target = Booking.objects.create(
            client=self.partner,
            place=self.place,
            start_time=aware_dt(2026, 9, 27, 9),
            end_time=aware_dt(2026, 9, 27, 18),
            duration_type='daily',
            status='pending',
        )
        block_response = self.client_api.post(f'/api/bookings/{block_target.id}/block/')
        self.assertEqual(block_response.status_code, 200)
        self.assertEqual(block_response.data['status'], 'blocked')

    def test_admin_booking_list_supports_mvp_filters_and_search(self):
        self.client_user.first_name = 'Aziza'
        self.client_user.last_name = 'Karimova'
        self.client_user.phone_number = '+998901112233'
        self.client_user.save(update_fields=['first_name', 'last_name', 'phone_number'])
        matching = Booking.objects.create(
            client=self.client_user,
            place=self.place,
            start_time=aware_dt(2026, 11, 10, 10),
            end_time=aware_dt(2026, 11, 10, 12),
            duration_type='hourly',
            status='confirmed',
        )
        Booking.objects.create(
            client=self.other_partner,
            place=self.other_place,
            start_time=aware_dt(2026, 12, 10, 10),
            end_time=aware_dt(2026, 12, 10, 12),
            duration_type='hourly',
            status='pending',
        )
        self.client_api.force_authenticate(self.admin)

        response = self.client_api.get('/api/bookings/', {
            'status': 'confirmed',
            'place': self.place.id,
            'client': self.client_user.id,
            'date_from': '2026-11-01',
            'date_to': '2026-11-30',
            'search': '901112233',
        })

        self.assertEqual(response.status_code, 200)
        items = response.data.get('results', []) if isinstance(response.data, dict) else response.data
        self.assertEqual([item['id'] for item in items], [matching.id])

        place_search = self.client_api.get('/api/bookings/', {'search': 'Availability room'})
        place_items = place_search.data.get('results', []) if isinstance(place_search.data, dict) else place_search.data
        self.assertIn(matching.id, [item['id'] for item in place_items])


class BookingServerPricingTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.client_api = APIClient()
        self.client_user = User.objects.create_user(username='pricing-client', password='pass', role='client')
        self.partner = User.objects.create_user(username='pricing-partner', password='pass', role='partner')
        self.place = Place.objects.create(
            owner=self.partner,
            title='Pricing room',
            location='Tashkent',
            price='50000',
            price_hourly='50000',
            price_daily='400000',
            area=30,
            people=6,
            status='approved',
        )
        self.client_api.force_authenticate(self.client_user)

    def test_hourly_amount_is_calculated_on_server(self):
        response = self.client_api.post('/api/bookings/', {
            'place': self.place.id,
            'start_time': aware_dt(2027, 10, 5, 10).isoformat(),
            'end_time': aware_dt(2027, 10, 5, 12).isoformat(),
            'duration_type': 'hourly',
            'amount': '1',
            'total_price': '1',
            'currency': 'USD',
        }, format='json')

        self.assertEqual(response.status_code, 201)
        booking = Booking.objects.get(pk=response.data['id'])
        # 2h * 50 000 = 100 000; service fee min 25 000; tax 12% of 125 000.
        self.assertEqual(str(booking.amount), '140000.00')
        self.assertEqual(booking.currency, 'UZS')
        self.assertEqual(booking.pricing['units'], 2)
        self.assertEqual(booking.pricing['subtotal'], '100000')
        self.assertEqual(booking.pricing['service_fee'], '25000')
        self.assertEqual(booking.pricing['tax'], '15000')

    def test_daily_amount_applies_best_discount(self):
        from places.models import Discount

        Discount.objects.create(name_uz='Chegirma', name_ru='Скидка', percent=10, discount_type='custom')
        Discount.objects.create(name_uz='Off', name_ru='Выкл', percent=50, discount_type='custom', is_active=False)

        response = self.client_api.post('/api/bookings/', {
            'place': self.place.id,
            'start_time': aware_dt(2027, 10, 5, 9).isoformat(),
            'end_time': aware_dt(2027, 10, 7, 18).isoformat(),
            'duration_type': 'daily',
        }, format='json')

        self.assertEqual(response.status_code, 201)
        booking = Booking.objects.get(pk=response.data['id'])
        # 3 days * 400 000 = 1 200 000; -10% = 1 080 000; fee 8% = 86 400; tax 12% of 1 166 400.
        self.assertEqual(booking.pricing['units'], 3)
        self.assertEqual(booking.pricing['discount_percent'], 10)
        self.assertEqual(booking.pricing['discount_amount'], '120000')
        self.assertEqual(booking.pricing['service_fee'], '86400')
        self.assertEqual(str(booking.amount), '1306368.00')

    def test_quote_matches_created_booking(self):
        payload = {
            'place': self.place.id,
            'start_time': aware_dt(2027, 10, 9, 14).isoformat(),
            'end_time': aware_dt(2027, 10, 9, 17).isoformat(),
            'duration_type': 'soatlik',
        }
        self.client_api.force_authenticate(None)
        quote = self.client_api.post('/api/bookings/quote/', payload, format='json')
        self.client_api.force_authenticate(self.client_user)
        created = self.client_api.post('/api/bookings/', payload, format='json')

        self.assertEqual(quote.status_code, 200)
        self.assertEqual(created.status_code, 201)
        self.assertEqual(quote.data['units'], 3)
        self.assertEqual(quote.data['amount'], created.data['pricing']['amount'])

    def test_place_without_price_cannot_be_booked(self):
        place = Place.objects.create(
            owner=self.partner,
            title='No price room',
            location='Tashkent',
            price='',
            area=10,
            people=2,
            status='approved',
        )

        response = self.client_api.post('/api/bookings/', {
            'place': place.id,
            'start_time': aware_dt(2027, 10, 5, 10).isoformat(),
            'end_time': aware_dt(2027, 10, 5, 11).isoformat(),
            'duration_type': 'hourly',
        }, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertFalse(Booking.objects.filter(place=place).exists())

    def test_paid_booking_cannot_be_rescheduled_by_client(self):
        booking = Booking.objects.create(
            client=self.client_user,
            place=self.place,
            start_time=aware_dt(2027, 11, 1, 10),
            end_time=aware_dt(2027, 11, 1, 12),
            duration_type='hourly',
            amount='140000',
            status='pending',
            payment_status='test_paid',
        )

        response = self.client_api.patch(f'/api/bookings/{booking.id}/', {
            'start_time': aware_dt(2027, 11, 2, 10).isoformat(),
            'end_time': aware_dt(2027, 11, 2, 20).isoformat(),
        }, format='json')

        self.assertEqual(response.status_code, 400)
        booking.refresh_from_db()
        self.assertEqual(booking.start_time, aware_dt(2027, 11, 1, 10))

    def test_client_cannot_patch_amount(self):
        booking = Booking.objects.create(
            client=self.client_user,
            place=self.place,
            start_time=aware_dt(2027, 11, 1, 10),
            end_time=aware_dt(2027, 11, 1, 12),
            duration_type='hourly',
            amount='140000',
            status='pending',
            payment_status='unpaid',
        )

        response = self.client_api.patch(f'/api/bookings/{booking.id}/', {'amount': '1'}, format='json')

        self.assertIn(response.status_code, (200, 400))
        booking.refresh_from_db()
        self.assertEqual(str(booking.amount), '140000.00')
