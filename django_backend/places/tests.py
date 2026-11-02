from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import RequestFactory, TestCase, override_settings
from django.utils import timezone
from django.views.static import serve
from rest_framework.test import APIClient
from datetime import timedelta
import base64
import tempfile
from pathlib import Path
from urllib.parse import urlparse

from .models import Category, Discount, Favorite, Place, PlaceModerationLog, Review, SubCategory
from .serializers import SubCategorySerializer
from bookings.models import Booking
from notifications.models import Notification


class SubCategorySerializerTests(TestCase):
    def test_exposes_category_name_and_slug_without_nested_category_object(self):
        category = Category.objects.create(
            slug='coworking',
            name_uz='Kovorking',
            name_ru='Коворкинг',
            name_en='Coworking',
        )
        subcategory = SubCategory.objects.create(
            category=category,
            slug='hot-desk-test',
            name_uz='Erkin joy',
            name_ru='Свободное место',
            name_en='Hot desk',
        )

        data = SubCategorySerializer(subcategory).data

        self.assertEqual(data['category'], category.id)
        self.assertEqual(data['category_name'], category.name_ru)
        self.assertEqual(data['category_slug'], category.slug)


class PlaceUploadImagePermissionTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.client = APIClient()
        self.partner = User.objects.create_user(username='upload-partner', password='pass', role='partner')

    def _image_file(self):
        # Valid 1x1 PNG; upload validation checks the file signature.
        image_bytes = base64.b64decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
        )
        return SimpleUploadedFile('Unsafe place name.png', image_bytes, content_type='image/png')

    def test_upload_image_requires_authentication(self):
        response = self.client.post('/api/places/upload_image/', {'image': self._image_file()}, format='multipart')

        self.assertIn(response.status_code, (401, 403))

    def test_authenticated_user_can_upload_image(self):
        self.client.force_authenticate(self.partner)

        with tempfile.TemporaryDirectory() as media_root, override_settings(MEDIA_ROOT=media_root):
            response = self.client.post('/api/places/upload_image/', {'image': self._image_file()}, format='multipart')
            self.assertEqual(response.status_code, 200)
            uploaded_path = urlparse(response.data['url']).path
            self.assertRegex(uploaded_path, r'^/media/uploads/[0-9a-f]{32}\.png$')
            self.assertTrue((Path(media_root) / uploaded_path.removeprefix('/media/')).is_file())

            media_response = serve(
                RequestFactory().get(uploaded_path),
                uploaded_path.removeprefix('/media/'),
                document_root=media_root,
            )
            self.assertEqual(media_response.status_code, 200)
            media_response.close()

    def test_upload_image_rejects_invalid_file_type(self):
        self.client.force_authenticate(self.partner)
        invalid_file = SimpleUploadedFile(
            'place.pdf',
            b'%PDF-1.4 not an image',
            content_type='application/pdf',
        )

        with tempfile.TemporaryDirectory() as media_root, override_settings(MEDIA_ROOT=media_root):
            response = self.client.post('/api/places/upload_image/', {'image': invalid_file}, format='multipart')

        self.assertEqual(response.status_code, 400)
        self.assertIn('image', response.data)

    def test_upload_image_rejects_spoofed_image_content(self):
        self.client.force_authenticate(self.partner)
        invalid_file = SimpleUploadedFile(
            'fake.png',
            b'not actually a png',
            content_type='image/png',
        )

        with tempfile.TemporaryDirectory() as media_root, override_settings(MEDIA_ROOT=media_root):
            response = self.client.post('/api/places/upload_image/', {'image': invalid_file}, format='multipart')

        self.assertEqual(response.status_code, 400)
        self.assertIn('image', response.data)

    def test_upload_image_rejects_file_larger_than_five_megabytes(self):
        self.client.force_authenticate(self.partner)
        oversized_file = SimpleUploadedFile(
            'place.png',
            b'x' * (5 * 1024 * 1024 + 1),
            content_type='image/png',
        )

        with tempfile.TemporaryDirectory() as media_root, override_settings(MEDIA_ROOT=media_root):
            response = self.client.post('/api/places/upload_image/', {'image': oversized_file}, format='multipart')

        self.assertEqual(response.status_code, 400)
        self.assertIn('image', response.data)


class PlaceFilterTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.office_category = Category.objects.create(
            slug='office',
            name_uz='Ofis',
            name_ru='Офис',
            name_en='Office',
        )
        self.hall_category = Category.objects.create(
            slug='hall',
            name_uz='Zal',
            name_ru='Зал',
            name_en='Hall',
        )
        self.office_subcategory = SubCategory.objects.create(
            category=self.office_category,
            slug='private-office',
            name_uz='Alohida ofis',
            name_ru='Отдельный офис',
            name_en='Private office',
        )
        self.hall_subcategory = SubCategory.objects.create(
            category=self.hall_category,
            slug='meeting-room',
            name_uz='Muzokara xonasi',
            name_ru='Переговорная',
            name_en='Meeting room',
        )

        self.office = Place.objects.create(
            title='Alpha Office',
            subcategory=self.office_subcategory,
            category='Legacy Office',
            location='Tashkent, Yunusabad',
            price='700 000 UZS',
            prices={'kunlik': 700000},
            area=45,
            people=8,
            promoted=True,
            amenities=['wifi', 'projector'],
            description_ru='Тихий офис для команды',
            description_uz='Maxsus tinch ofis',
            status='approved',
        )
        self.hall = Place.objects.create(
            title='Beta Hall',
            subcategory=self.hall_subcategory,
            category='Legacy Hall',
            location='Samarkand',
            price='2 500 000 UZS',
            prices={'kunlik': 2500000},
            area=180,
            people=80,
            promoted=False,
            amenities=['parking'],
            description_ru='Большой зал для встреч',
            description_uz='Katta zal',
            status='approved',
        )
        self.studio = Place.objects.create(
            title='String Price Studio',
            subcategory=self.office_subcategory,
            category='Legacy Studio',
            location='Tashkent, Chilanzar',
            price="350 000 so'm",
            prices={},
            area=25,
            people=3,
            promoted=False,
            amenities=['wifi'],
            description_ru='Компактная студия',
            description_uz='Ixcham joy',
            status='approved',
        )
        self.numeric_place = Place.objects.create(
            title='Normalized Price Loft',
            subcategory=self.office_subcategory,
            category='Legacy Loft',
            location='Tashkent, Mirzo Ulugbek',
            price='contact us',
            prices={},
            price_daily=900000,
            area=60,
            people=10,
            promoted=False,
            amenities=['wifi'],
            description_ru='Лофт с нормализованной ценой',
            description_uz='Loft',
            status='approved',
        )
        Place.objects.create(
            title='Hidden Draft',
            subcategory=self.office_subcategory,
            location='Tashkent',
            price='100000',
            area=10,
            people=2,
            status='pending',
        )

    def _ids(self, params):
        response = self.client.get('/api/places/', params)
        self.assertEqual(response.status_code, 200)
        data = response.data.get('results', response.data) if isinstance(response.data, dict) else response.data
        return {item['id'] for item in data}

    def test_search_matches_title_location_and_descriptions(self):
        self.assertEqual(self._ids({'search': 'Alpha'}), {self.office.id})
        self.assertEqual(self._ids({'search': 'Samarkand'}), {self.hall.id})
        self.assertEqual(self._ids({'search': 'Maxsus'}), {self.office.id})

    def test_category_filter_supports_slug_and_id(self):
        office_ids = {self.office.id, self.studio.id, self.numeric_place.id}

        self.assertEqual(self._ids({'category': 'office'}), office_ids)
        self.assertEqual(self._ids({'category': self.office_category.id}), office_ids)

    def test_subcategory_filter_supports_slug_and_id(self):
        self.assertEqual(self._ids({'subcategory': 'meeting-room'}), {self.hall.id})
        self.assertEqual(self._ids({'subcategory': self.hall_subcategory.id}), {self.hall.id})

    def test_location_people_and_promoted_filters(self):
        self.assertEqual(self._ids({'location': 'Chilanzar'}), {self.studio.id})
        self.assertEqual(self._ids({'min_people': 10}), {self.hall.id, self.numeric_place.id})
        self.assertEqual(self._ids({'people': 10}), {self.hall.id, self.numeric_place.id})
        self.assertEqual(self._ids({'promoted': 'true'}), {self.office.id})
        self.assertEqual(self._ids({'promoted': 'false'}), {self.hall.id, self.studio.id, self.numeric_place.id})

    def test_price_filters_use_json_prices_and_legacy_price_string(self):
        self.assertEqual(self._ids({'min_price': 2400000, 'max_price': 2600000}), {self.hall.id})
        self.assertEqual(self._ids({'min_price': 300000, 'max_price': 400000}), {self.studio.id})

    def test_price_filters_use_normalized_numeric_prices(self):
        self.assertEqual(self._ids({'min_price': 850000, 'max_price': 950000}), {self.numeric_place.id})

    def test_amenities_filter_requires_all_requested_slugs(self):
        self.assertEqual(self._ids({'amenities': 'wifi'}), {self.office.id, self.studio.id, self.numeric_place.id})
        self.assertEqual(self._ids({'amenities': 'wifi,projector'}), {self.office.id})


class PlaceOwnerFilterTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.admin = User.objects.create_user(username='admin', password='pass', role='admin')
        self.owner = User.objects.create_user(username='owner', password='pass', role='partner')
        self.other_owner = User.objects.create_user(username='other-owner', password='pass', role='partner')
        self.client = APIClient()

        self.owner_place = Place.objects.create(
            owner=self.owner,
            title='Owner approved place',
            location='Tashkent',
            price='100000',
            area=20,
            people=4,
            status='approved',
        )
        self.owner_pending_place = Place.objects.create(
            owner=self.owner,
            title='Owner pending place',
            location='Tashkent',
            price='120000',
            area=24,
            people=5,
            status='pending',
        )
        Place.objects.create(
            owner=self.other_owner,
            title='Other owner place',
            location='Samarkand',
            price='90000',
            area=18,
            people=3,
            status='approved',
        )

    def test_admin_can_filter_places_by_owner(self):
        self.client.force_authenticate(self.admin)

        response = self.client.get('/api/places/', {'owner': self.owner.id})

        self.assertEqual(response.status_code, 200)
        data = response.data.get('results', response.data) if isinstance(response.data, dict) else response.data
        self.assertTrue(data)
        self.assertEqual({item['owner'] for item in data}, {self.owner.id})

    def test_admin_owner_filter_keeps_status_filter(self):
        self.client.force_authenticate(self.admin)

        response = self.client.get('/api/places/', {'owner': self.owner.id, 'status': 'pending'})

        self.assertEqual(response.status_code, 200)
        data = response.data.get('results', response.data) if isinstance(response.data, dict) else response.data
        self.assertEqual([item['id'] for item in data], [self.owner_pending_place.id])

    def test_partner_owner_param_does_not_expose_other_users_places(self):
        self.client.force_authenticate(self.owner)

        response = self.client.get('/api/places/', {'owner': self.other_owner.id})

        self.assertEqual(response.status_code, 200)
        data = response.data.get('results', response.data) if isinstance(response.data, dict) else response.data
        self.assertTrue(data)
        self.assertEqual({item['owner'] for item in data}, {self.owner.id})

    def test_partner_sees_only_own_places(self):
        self.client.force_authenticate(self.owner)

        response = self.client.get('/api/places/')

        self.assertEqual(response.status_code, 200)
        data = response.data.get('results', response.data) if isinstance(response.data, dict) else response.data
        self.assertEqual({item['owner'] for item in data}, {self.owner.id})
        self.assertEqual({item['id'] for item in data}, {self.owner_place.id, self.owner_pending_place.id})

    def test_admin_sees_all_places(self):
        self.client.force_authenticate(self.admin)

        response = self.client.get('/api/places/')

        self.assertEqual(response.status_code, 200)
        data = response.data.get('results', response.data) if isinstance(response.data, dict) else response.data
        self.assertEqual(len(data), 3)

    def test_admin_places_include_bookings_count(self):
        Booking.objects.create(
            client=self.other_owner,
            place=self.owner_place,
            start_time='2026-09-20T09:00:00Z',
            end_time='2026-09-20T18:00:00Z',
            status='confirmed',
        )
        self.client.force_authenticate(self.admin)

        response = self.client.get('/api/places/', {'owner': self.owner.id, 'status': 'approved'})

        self.assertEqual(response.status_code, 200)
        data = response.data.get('results', response.data) if isinstance(response.data, dict) else response.data
        self.assertEqual(data[0]['id'], self.owner_place.id)
        self.assertEqual(data[0]['bookings_count'], 1)


class PlaceModerationFlowTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.client = APIClient()
        self.partner = User.objects.create_user(
            username='moderation-owner',
            password='pass',
            role='partner',
            phone_number='+998901112233',
            email='owner@example.com',
        )
        self.admin = User.objects.create_user(username='moderation-admin', password='pass', role='admin')
        self.approved_place = Place.objects.create(
            owner=self.partner,
            title='Approved Studio',
            location='Tashkent',
            price='100000',
            area=30,
            people=6,
            status='approved',
            moderator_note='Looks good',
            moderated_by=self.admin,
            moderated_at=timezone.now(),
        )
        self.pending_place = Place.objects.create(
            owner=self.partner,
            title='Pending Studio',
            location='Tashkent',
            price='90000',
            area=24,
            people=4,
            status='pending',
        )
        self.rejected_place = Place.objects.create(
            owner=self.partner,
            title='Rejected Studio',
            location='Tashkent',
            price='80000',
            area=20,
            people=3,
            status='rejected',
            moderator_note='Upload brighter photos',
        )

    def _response_items(self, response):
        return response.data.get('results', response.data) if isinstance(response.data, dict) else response.data

    def test_public_places_list_shows_only_approved(self):
        response = self.client.get('/api/places/')

        self.assertEqual(response.status_code, 200)
        ids = {item['id'] for item in self._response_items(response)}
        self.assertIn(self.approved_place.id, ids)
        self.assertNotIn(self.pending_place.id, ids)
        self.assertNotIn(self.rejected_place.id, ids)

    def test_partner_editing_approved_place_returns_it_to_pending(self):
        self.client.force_authenticate(self.partner)

        response = self.client.patch(
            f'/api/places/{self.approved_place.id}/',
            {'title': 'Updated Approved Studio'},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.approved_place.refresh_from_db()
        self.assertEqual(self.approved_place.status, 'pending')
        self.assertEqual(self.approved_place.moderator_note, '')
        self.assertIsNone(self.approved_place.moderated_by)
        self.assertIsNone(self.approved_place.moderated_at)
        self.assertTrue(
            PlaceModerationLog.objects.filter(
                place=self.approved_place,
                actor=self.partner,
                action='resubmitted',
                from_status='approved',
                to_status='pending',
            ).exists()
        )

    def test_admin_editing_approved_place_keeps_it_approved(self):
        self.client.force_authenticate(self.admin)
        original_owner_id = self.approved_place.owner_id

        response = self.client.patch(
            f'/api/places/{self.approved_place.id}/',
            {'title': 'Admin Updated Studio'},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.approved_place.refresh_from_db()
        self.assertEqual(self.approved_place.status, 'approved')
        self.assertEqual(self.approved_place.owner_id, original_owner_id)
        self.assertEqual(response.data['status'], 'approved')

    def test_admin_editing_pending_place_keeps_owner_and_status(self):
        self.client.force_authenticate(self.admin)
        original_owner_id = self.pending_place.owner_id

        response = self.client.patch(
            f'/api/places/{self.pending_place.id}/',
            {'title': 'Admin Updated Pending Studio', 'owner': self.admin.id},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.pending_place.refresh_from_db()
        self.assertEqual(self.pending_place.status, 'pending')
        self.assertEqual(self.pending_place.owner_id, original_owner_id)
        self.assertEqual(response.data['status'], 'pending')

    def test_admin_approve_writes_log_and_owner_notification(self):
        self.client.force_authenticate(self.admin)

        response = self.client.post(f'/api/places/{self.pending_place.id}/approve/', {'note': 'OK'}, format='json')

        self.assertEqual(response.status_code, 200)
        self.pending_place.refresh_from_db()
        self.assertEqual(self.pending_place.status, 'approved')
        self.assertEqual(self.pending_place.moderator_note, 'OK')
        self.assertEqual(self.pending_place.moderated_by, self.admin)
        self.assertTrue(
            PlaceModerationLog.objects.filter(
                place=self.pending_place,
                actor=self.admin,
                action='approved',
                from_status='pending',
                to_status='approved',
                note='OK',
            ).exists()
        )
        self.assertTrue(
            Notification.objects.filter(
                user=self.partner,
                notification_type='place_approved',
                related_place_id=self.pending_place.id,
                is_read=False,
            ).exists()
        )

    def test_admin_reject_writes_log_and_owner_notification_with_note(self):
        self.client.force_authenticate(self.admin)

        response = self.client.post(
            f'/api/places/{self.pending_place.id}/reject/',
            {'note': 'Photos are unclear'},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.pending_place.refresh_from_db()
        self.assertEqual(self.pending_place.status, 'rejected')
        self.assertEqual(self.pending_place.moderator_note, 'Photos are unclear')
        self.assertTrue(
            PlaceModerationLog.objects.filter(
                place=self.pending_place,
                actor=self.admin,
                action='rejected',
                from_status='pending',
                to_status='rejected',
                note='Photos are unclear',
            ).exists()
        )
        notification = Notification.objects.get(
            user=self.partner,
            notification_type='place_rejected',
            related_place_id=self.pending_place.id,
        )
        self.assertIn('Photos are unclear', notification.message_ru)


class PlaceDiscountTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.partner = User.objects.create_user(username='discount-owner', password='pass', role='partner')
        self.client = APIClient()
        self.client.force_authenticate(self.partner)
        self.discount_a = Discount.objects.create(
            name_uz='A chegirma',
            name_ru='A скидка',
            percent=10,
            discount_type='new_listing',
            applicable_to='all',
            is_active=True,
        )
        self.discount_b = Discount.objects.create(
            name_uz='B chegirma',
            name_ru='B скидка',
            percent=20,
            discount_type='weekly',
            applicable_to='all',
            is_active=True,
        )

    def test_create_place_saves_discount_ids(self):
        response = self.client.post('/api/places/', {
            'title': 'Discount place',
            'location': 'Tashkent',
            'price': '100000 UZS',
            'area': 20,
            'people': 4,
            'images': [],
            'discounts': [self.discount_a.id, self.discount_b.id],
        }, format='json')

        self.assertEqual(response.status_code, 201)
        place = Place.objects.get(pk=response.data['id'])
        self.assertEqual(
            set(place.discounts.values_list('id', flat=True)),
            {self.discount_a.id, self.discount_b.id},
        )
        self.assertEqual(set(response.data['discounts']), {self.discount_a.id, self.discount_b.id})
        self.assertEqual(set(response.data['discount_ids']), {self.discount_a.id, self.discount_b.id})

    def test_update_place_replaces_discounts(self):
        place = Place.objects.create(
            owner=self.partner,
            title='Editable discount place',
            location='Tashkent',
            price='100000 UZS',
            area=20,
            people=4,
            status='approved',
        )
        place.discounts.set([self.discount_a])

        response = self.client.patch(f'/api/places/{place.id}/', {
            'discounts': [self.discount_b.id],
        }, format='json')

        self.assertEqual(response.status_code, 200)
        place.refresh_from_db()
        self.assertEqual(set(place.discounts.values_list('id', flat=True)), {self.discount_b.id})


class PlacePriceNormalizationTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.partner = User.objects.create_user(username='price-owner', password='pass', role='partner')
        self.client = APIClient()
        self.client.force_authenticate(self.partner)

    def test_create_place_populates_normalized_prices_from_prices(self):
        response = self.client.post('/api/places/', {
            'title': 'Normalized prices place',
            'location': 'Tashkent',
            'price': '400000 UZS',
            'prices': {
                'soatlik': '50000',
                'kunlik': '400000',
                'haftalik': 2500000,
                'oylik': '9000000.00',
            },
            'area': 30,
            'people': 6,
            'images': [],
        }, format='json')

        self.assertEqual(response.status_code, 201)
        place = Place.objects.get(pk=response.data['id'])
        self.assertEqual(place.status, 'pending')
        self.assertEqual(response.data['status'], 'pending')
        self.assertEqual(str(place.price_hourly), '50000.00')
        self.assertEqual(str(place.price_daily), '400000.00')
        self.assertEqual(str(place.price_weekly), '2500000.00')
        self.assertEqual(str(place.price_monthly), '9000000.00')
        self.assertEqual(place.currency, 'UZS')
        self.assertEqual(response.data['price_daily'], '400000.00')
        self.assertEqual(response.data['currency'], 'UZS')

    def test_explicit_normalized_price_wins_over_prices_alias(self):
        place = Place.objects.create(
            owner=self.partner,
            title='Editable normalized price',
            location='Tashkent',
            price='100000 UZS',
            prices={},
            area=20,
            people=4,
            status='approved',
        )

        response = self.client.patch(f'/api/places/{place.id}/', {
            'prices': {'kunlik': '900000'},
            'price_daily': '800000',
        }, format='json')

        self.assertEqual(response.status_code, 200)
        place.refresh_from_db()
        self.assertEqual(str(place.price_daily), '800000.00')
        self.assertEqual(response.data['price_daily'], '800000.00')

    def _approved_place(self):
        return Place.objects.create(
            owner=self.partner, title='Quick edit place', location='Tashkent',
            price_hourly=50000, price_daily=300000, area=20, people=4, status='approved',
        )

    def test_quick_price_edit_can_switch_formats_and_returns_to_moderation(self):
        place = self._approved_place()

        response = self.client.patch(f'/api/places/{place.id}/', {
            'price_hourly': None,
            'price_weekly': 1500000,
            'opens_at': '08:30',
            'closes_at': '20:00',
            'booking_type': 'instant',
        }, format='json')

        self.assertEqual(response.status_code, 200, response.data)
        place.refresh_from_db()
        self.assertIsNone(place.price_hourly)
        self.assertEqual(str(place.price_weekly), '1500000.00')
        self.assertEqual(str(place.opens_at), '08:30:00')
        self.assertEqual(place.booking_type, 'instant')
        self.assertEqual(place.status, 'pending')

    def test_price_edit_cannot_clear_every_price(self):
        place = self._approved_place()

        response = self.client.patch(f'/api/places/{place.id}/', {
            'price_hourly': None,
            'price_daily': None,
        }, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertIn('prices', response.data)
        place.refresh_from_db()
        self.assertEqual(place.status, 'approved')

    def test_price_must_be_positive(self):
        place = self._approved_place()

        response = self.client.patch(f'/api/places/{place.id}/', {'price_daily': 0}, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertIn('price_daily', response.data)


class ReviewApiTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='review-user',
            password='pass',
            first_name='Review',
            last_name='User',
        )
        self.other_user = User.objects.create_user(username='other-review-user', password='pass')
        self.admin = User.objects.create_user(username='review-admin', password='pass', role='admin')
        self.place = Place.objects.create(
            title='Reviewable Place',
            location='Tashkent',
            price='100000',
            area=20,
            people=4,
            status='approved',
        )
        self.other_place = Place.objects.create(
            title='Other Reviewable Place',
            location='Samarkand',
            price='200000',
            area=30,
            people=8,
            status='approved',
        )

    def _booking_for(self, user, place, status='confirmed'):
        start = timezone.now() + timedelta(days=1)
        return Booking.objects.create(
            client=user,
            place=place,
            start_time=start,
            end_time=start + timedelta(hours=2),
            status=status,
        )

    def test_place_response_includes_rating_avg_and_reviews_count(self):
        Review.objects.create(user=self.user, place=self.place, rating=5, comment='Great')
        Review.objects.create(user=self.other_user, place=self.place, rating=3, comment='Okay')

        response = self.client.get('/api/places/')

        self.assertEqual(response.status_code, 200)
        data = response.data.get('results', response.data) if isinstance(response.data, dict) else response.data
        item = next(place for place in data if place['id'] == self.place.id)
        self.assertEqual(item['reviews_count'], 2)
        self.assertEqual(item['rating_avg'], 4.0)

    def test_create_review_requires_authenticated_user(self):
        response = self.client.post('/api/reviews/', {
            'place': self.place.id,
            'rating': 5,
            'comment': 'Nice place',
        }, format='json')

        self.assertIn(response.status_code, (401, 403))

    def test_user_can_create_review_after_confirmed_booking(self):
        self._booking_for(self.user, self.place, status='confirmed')
        self.client.force_authenticate(self.user)

        response = self.client.post('/api/reviews/', {
            'place': self.place.id,
            'rating': 5,
            'comment': 'Nice place',
        }, format='json')

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['user'], self.user.id)
        self.assertEqual(response.data['user_name'], 'Review User')
        self.assertEqual(response.data['place_title'], self.place.title)

    def test_user_can_create_review_after_completed_booking(self):
        self._booking_for(self.user, self.place, status='completed')
        self.client.force_authenticate(self.user)

        response = self.client.post('/api/reviews/', {
            'place': self.place.id,
            'rating': 4,
            'comment': 'Completed booking review',
        }, format='json')

        self.assertEqual(response.status_code, 201)
        self.assertTrue(Review.objects.filter(user=self.user, place=self.place).exists())

    def test_review_validates_rating_and_comment(self):
        self._booking_for(self.user, self.place, status='confirmed')
        self.client.force_authenticate(self.user)

        response = self.client.post('/api/reviews/', {
            'place': self.place.id,
            'rating': 6,
            'comment': '   ',
        }, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertIn('rating', response.data)
        self.assertIn('comment', response.data)

    def test_user_without_confirmed_or_completed_booking_cannot_create_review(self):
        self._booking_for(self.user, self.place, status='pending')
        self.client.force_authenticate(self.user)

        response = self.client.post('/api/reviews/', {
            'place': self.place.id,
            'rating': 4,
            'comment': 'Trying early',
        }, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertIn('place', response.data)

    def test_review_eligibility_requires_confirmed_or_completed_booking(self):
        self.client.force_authenticate(self.user)

        denied = self.client.get('/api/reviews/eligibility/', {'place': self.place.id})
        self.assertEqual(denied.status_code, 200)
        self.assertFalse(denied.data['allowed'])
        self.assertTrue(denied.data['reason'])

        self._booking_for(self.user, self.place, status='confirmed')
        allowed = self.client.get('/api/reviews/eligibility/', {'place': self.place.id})
        self.assertEqual(allowed.status_code, 200)
        self.assertTrue(allowed.data['allowed'])
        self.assertEqual(allowed.data['reason'], '')

    def test_review_eligibility_requires_authentication(self):
        response = self.client.get('/api/reviews/eligibility/', {'place': self.place.id})

        self.assertIn(response.status_code, (401, 403))

    def test_reviews_can_be_filtered_by_place_and_user(self):
        self._booking_for(self.user, self.place, status='completed')
        own_review = Review.objects.create(user=self.user, place=self.place, rating=5, comment='Own')
        Review.objects.create(user=self.other_user, place=self.place, rating=4, comment='Other user')
        Review.objects.create(user=self.user, place=self.other_place, rating=3, comment='Other place')

        response = self.client.get('/api/reviews/', {'place': self.place.id, 'user': self.user.id})

        self.assertEqual(response.status_code, 200)
        data = response.data.get('results', response.data) if isinstance(response.data, dict) else response.data
        self.assertEqual([item['id'] for item in data], [own_review.id])

    def test_review_filters_reject_non_numeric_ids(self):
        response = self.client.get('/api/reviews/', {'place': 'place-0'})

        self.assertEqual(response.status_code, 400)
        self.assertIn('place', response.data)

    def test_admin_can_delete_bad_review(self):
        review = Review.objects.create(user=self.user, place=self.place, rating=1, comment='Bad')
        self.client.force_authenticate(self.admin)

        response = self.client.delete(f'/api/reviews/{review.id}/')

        self.assertEqual(response.status_code, 204)
        self.assertFalse(Review.objects.filter(id=review.id).exists())


class FavoriteApiTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.client = APIClient()
        self.user = User.objects.create_user(username='favorite-user', password='pass')
        self.place = Place.objects.create(
            title='Favorite Place',
            location='Tashkent',
            price='100000',
            area=20,
            people=4,
            status='approved',
        )
        self.other_place = Place.objects.create(
            title='Other Favorite Place',
            location='Samarkand',
            price='200000',
            area=30,
            people=8,
            status='approved',
        )

    def test_guest_favorites_use_user_token(self):
        response = self.client.post('/api/favorites/toggle/', {
            'place_id': self.place.id,
            'token': 'guest-token',
        }, format='json')

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['favorited'])
        self.assertTrue(Favorite.objects.filter(user__isnull=True, user_token='guest-token', place=self.place).exists())
        self.assertEqual(response.data['favorites'][0]['place']['id'], self.place.id)

    def test_guest_favorites_require_a_non_shared_token(self):
        list_response = self.client.get('/api/favorites/')
        toggle_response = self.client.post('/api/favorites/toggle/', {
            'place_id': self.place.id,
        }, format='json')

        self.assertEqual(list_response.status_code, 400)
        self.assertEqual(toggle_response.status_code, 400)
        self.assertFalse(Favorite.objects.filter(place=self.place).exists())

    def test_authenticated_favorites_use_request_user_even_with_token(self):
        self.client.force_authenticate(self.user)

        response = self.client.post('/api/favorites/toggle/', {
            'place_id': self.place.id,
            'token': 'guest-token',
        }, format='json')

        self.assertEqual(response.status_code, 200)
        self.assertTrue(Favorite.objects.filter(user=self.user, place=self.place).exists())
        self.assertFalse(Favorite.objects.filter(user__isnull=True, user_token='guest-token', place=self.place).exists())

        list_response = self.client.get('/api/favorites/')
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual([item['place']['id'] for item in list_response.data], [self.place.id])

    def test_merge_moves_guest_favorites_to_authenticated_user_without_duplicates(self):
        Favorite.objects.create(user_token='guest-token', place=self.place)
        Favorite.objects.create(user_token='guest-token', place=self.other_place)
        Favorite.objects.create(user=self.user, place=self.other_place)
        self.client.force_authenticate(self.user)

        response = self.client.post('/api/favorites/merge/', {'token': 'guest-token'}, format='json')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['merged'], 1)
        self.assertEqual(
            set(Favorite.objects.filter(user=self.user).values_list('place_id', flat=True)),
            {self.place.id, self.other_place.id},
        )
        self.assertFalse(Favorite.objects.filter(user__isnull=True, user_token='guest-token').exists())
        returned_place_ids = {item['place']['id'] for item in response.data['favorites']}
        self.assertEqual(returned_place_ids, {self.place.id, self.other_place.id})

    def test_merge_requires_authenticated_user(self):
        response = self.client.post('/api/favorites/merge/', {'token': 'guest-token'}, format='json')

        self.assertIn(response.status_code, (401, 403))


class PublicPartnerApiTests(TestCase):
    def setUp(self):
        from rest_framework.test import APIClient

        User = get_user_model()
        self.client = APIClient()
        self.partner = User.objects.create_user(
            username='+998901234001', password='pass', role='partner',
            company_name='Acme Offices', partner_bio='Ofislar', is_featured_partner=True,
        )
        self.no_places = User.objects.create_user(username='+998901234002', password='pass', role='partner')
        self.pending_only = User.objects.create_user(username='+998901234003', password='pass', role='partner')
        self.client_user = User.objects.create_user(username='+998901234004', password='pass', role='client')
        self.place = Place.objects.create(owner=self.partner, title='Acme Hub', location='Toshkent', area=50, people=10, status='approved', images=['https://example.com/a.jpg'])
        Place.objects.create(owner=self.partner, title='Hidden', location='Toshkent', area=10, people=2, status='pending')
        Place.objects.create(owner=self.pending_only, title='Pending', location='Toshkent', area=10, people=2, status='pending')
        Review.objects.create(user=self.client_user, place=self.place, rating=4, comment='Yaxshi')

    def test_list_shows_only_partners_with_approved_places_without_phone(self):
        response = self.client.get('/api/partners/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual([item['id'] for item in response.data], [self.partner.id])
        item = response.data[0]
        self.assertEqual(item['name'], 'Acme Offices')
        self.assertEqual(item['places_count'], 1)
        self.assertEqual(item['reviews_count'], 1)
        self.assertEqual(item['rating_avg'], 4.0)
        self.assertEqual(item['cover_image'], 'https://example.com/a.jpg')
        self.assertNotIn('username', item)
        self.assertNotIn('phone_number', item)

    def test_detail_lists_only_approved_places_and_reviews(self):
        response = self.client.get(f'/api/partners/{self.partner.id}/')
        hidden = self.client.get(f'/api/partners/{self.pending_only.id}/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual([place['title'] for place in response.data['places']], ['Acme Hub'])
        self.assertEqual(len(response.data['reviews']), 1)
        self.assertEqual(hidden.status_code, 404)

    def test_tariff_badge_follows_active_paid_tariff_and_ranks_partners(self):
        from datetime import timedelta
        from django.utils import timezone
        from tariffs.models import TariffPlan

        User = get_user_model()
        free = TariffPlan.objects.create(slug='standard', name='Standard', price=0)
        premium = TariffPlan.objects.create(slug='premium', name='Premium', price=500000)
        self.partner.is_featured_partner = False
        self.partner.tariff = free
        self.partner.save()
        paid = User.objects.create_user(
            username='+998901234005', password='pass', role='partner', company_name='Paid Co',
            tariff=premium, tariff_expires_at=timezone.now() + timedelta(days=10),
        )
        expired = User.objects.create_user(
            username='+998901234006', password='pass', role='partner', company_name='Expired Co',
            tariff=premium, tariff_expires_at=timezone.now() - timedelta(days=1),
        )
        for owner in (paid, expired):
            Place.objects.create(owner=owner, title=f'{owner.company_name} hub', location='Toshkent', area=10, people=2, status='approved')

        response = self.client.get('/api/partners/')

        self.assertEqual(response.status_code, 200)
        by_name = {item['name']: item for item in response.data}
        self.assertEqual(by_name['Paid Co']['tariff']['slug'], 'premium')
        self.assertIsNone(by_name['Acme Offices']['tariff'])
        self.assertIsNone(by_name['Expired Co']['tariff'])
        self.assertEqual(response.data[0]['name'], 'Paid Co')


class PublicReviewsFilterTests(TestCase):
    def setUp(self):
        from rest_framework.test import APIClient

        User = get_user_model()
        self.client = APIClient()
        owner = User.objects.create_user(username='review-owner', password='pass', role='partner')
        author = User.objects.create_user(username='review-author', password='pass', role='client')
        approved = Place.objects.create(owner=owner, title='Open', location='T', area=10, people=2, status='approved')
        pending = Place.objects.create(owner=owner, title='Hidden', location='T', area=10, people=2, status='pending')
        Review.objects.create(user=author, place=approved, rating=5, comment='Zo\'r')
        Review.objects.create(user=author, place=approved, rating=2, comment='Yomon')
        Review.objects.create(user=author, place=pending, rating=5, comment='Yashirin')

    def test_public_list_hides_unapproved_places_and_filters_rating(self):
        response = self.client.get('/api/reviews/?min_rating=4&limit=5')

        self.assertEqual(response.status_code, 200)
        rows = response.data.get('results', response.data) if isinstance(response.data, dict) else response.data
        self.assertEqual([row['comment'] for row in rows], ["Zo'r"])


class PopularPlacesApiTests(TestCase):
    def setUp(self):
        from rest_framework.test import APIClient

        self.client = APIClient()
        self.owner = get_user_model().objects.create_user(username='popular-owner', password='pass', role='partner')
        self.guest = get_user_model().objects.create_user(username='popular-guest', password='pass', role='client')

    def _place(self, title, **extra):
        extra.setdefault('status', 'approved')
        return Place.objects.create(owner=self.owner, title=title, location='Toshkent', area=10, people=2, **extra)

    def test_returns_eight_places_with_two_ads_first(self):
        organic = [self._place(f'Organic {index}') for index in range(9)]
        ads = [self._place(f'Ad {index}', promoted=True) for index in range(3)]
        self._place('Hidden', status='pending')
        Review.objects.create(user=self.guest, place=organic[4], rating=5, comment='Zo\'r')

        response = self.client.get('/api/places/popular/')

        self.assertEqual(response.status_code, 200)
        results = response.data['results']
        self.assertEqual(len(results), 8)
        self.assertEqual(response.data['total'], 12)
        ad_positions = [index for index, item in enumerate(results) if item['is_ad']]
        self.assertEqual(ad_positions, [0, 1])
        self.assertTrue(all(item['id'] in {ad.id for ad in ads} for item in results if item['is_ad']))
        self.assertEqual(results[2]['title'], 'Organic 4')
        self.assertNotIn('Hidden', [item['title'] for item in results])

    def test_without_ads_all_slots_are_organic(self):
        for index in range(3):
            self._place(f'Organic {index}')

        response = self.client.get('/api/places/popular/')

        self.assertEqual(len(response.data['results']), 3)
        self.assertFalse(any(item['is_ad'] for item in response.data['results']))

    def test_many_ads_rotate_between_requests(self):
        for index in range(6):
            self._place(f'Organic {index}')
        ads = {self._place(f'Ad {index}', promoted=True).id for index in range(10)}

        seen = set()
        for _ in range(25):
            results = self.client.get('/api/places/popular/').data['results']
            shown = [item['id'] for item in results if item['is_ad']]
            self.assertEqual(len(shown), 2)
            self.assertTrue(set(shown) <= ads)
            seen.update(shown)

        # 25 random draws of 2 out of 10 ads practically always cover more than one pair.
        self.assertGreater(len(seen), 2)

    def test_home_slider_returns_eight_partners_with_two_ads_first(self):
        from datetime import timedelta
        from django.utils import timezone
        from tariffs.models import TariffPlan

        User = get_user_model()
        premium = TariffPlan.objects.create(slug='premium', name='Premium', price=500000)
        ads = set()
        for index in range(10):
            paid = index < 3
            owner = User.objects.create_user(
                username=f'+99890999{index:04d}', password='pass', role='partner', company_name=f'Co {index}',
                tariff=premium if paid else None,
                tariff_expires_at=timezone.now() + timedelta(days=10) if paid else None,
            )
            Place.objects.create(owner=owner, title=f'Hub {index}', location='Toshkent', area=10, people=2, status='approved')
            if paid:
                ads.add(owner.id)

        response = self.client.get('/api/partners/', {'home': 1})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 8)
        self.assertEqual([item['is_ad'] for item in response.data], [True, True] + [False] * 6)
        self.assertTrue({item['id'] for item in response.data[:2]} <= ads)
        self.assertEqual(len({item['id'] for item in response.data}), 8)


class SaleListingTests(TestCase):
    """Places in a sale category have one sale price and are never booked."""

    def setUp(self):
        User = get_user_model()
        self.partner = User.objects.create_user(username='+998901239001', password='pass', role='partner')
        self.buyer = User.objects.create_user(username='+998901239002', password='pass', role='client')
        self.client = APIClient()
        self.client.force_authenticate(self.partner)
        sale = Category.objects.create(slug='sale-test', name_uz='Sotuv', name_ru='Продажа', name_en='Sale', deal_types='sale')
        rent = Category.objects.create(slug='rent-test', name_uz='Ofis', name_ru='Офис', name_en='Office')
        self.sale_sub = SubCategory.objects.create(category=sale, slug='sale-office-test', name_uz='Ofis', name_ru='Офис', name_en='Office')
        self.rent_sub = SubCategory.objects.create(category=rent, slug='rent-office-test', name_uz='Ofis', name_ru='Офис', name_en='Office')

    def payload(self, **extra):
        return {
            'title': 'Ofis sotiladi', 'location': 'Toshkent', 'area': 120, 'people': 15,
            'images': [], 'subcategory': self.sale_sub.id, **extra,
        }

    def test_sale_listing_requires_sale_price(self):
        response = self.client.post('/api/places/', self.payload(), format='json')

        self.assertEqual(response.status_code, 400)
        self.assertIn('sale_price', response.data)

    def test_sale_listing_keeps_only_sale_price(self):
        response = self.client.post('/api/places/', self.payload(
            sale_price='1500000000', price_daily='300000', booking_type='instant',
        ), format='json')

        self.assertEqual(response.status_code, 201)
        place = Place.objects.get(pk=response.data['id'])
        self.assertEqual(place.sale_price, 1500000000)
        self.assertIsNone(place.price_daily)
        self.assertEqual(place.booking_type, 'request')
        self.assertEqual(response.data['deal_type'], 'sale')
        self.assertEqual(response.data['price'], '1500000000 UZS')

    def test_rent_listing_drops_sale_price(self):
        response = self.client.post('/api/places/', self.payload(
            subcategory=self.rent_sub.id, price_daily='300000', sale_price='999',
        ), format='json')

        self.assertEqual(response.status_code, 201)
        self.assertIsNone(Place.objects.get(pk=response.data['id']).sale_price)
        self.assertEqual(response.data['deal_type'], 'rent')

    def test_sale_listing_cannot_be_booked(self):
        place = Place.objects.create(
            owner=self.partner, title='Sotuvdagi ofis', location='Toshkent', area=80, people=10,
            subcategory=self.sale_sub, deal_type='sale', sale_price=900000000, status='approved',
        )
        buyer_client = APIClient()
        buyer_client.force_authenticate(self.buyer)
        start = timezone.now() + timedelta(days=3)

        response = buyer_client.post('/api/bookings/', {
            'place': place.id, 'duration_type': 'daily',
            'start_time': start.isoformat(), 'end_time': (start + timedelta(hours=8)).isoformat(),
        }, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertIn('place', response.data)
        self.assertFalse(Booking.objects.filter(place=place).exists())

    def test_deal_type_filter_and_sale_price_range(self):
        sale = Place.objects.create(
            owner=self.partner, title='Sale', location='Toshkent', area=80, people=10,
            subcategory=self.sale_sub, deal_type='sale', sale_price=900000000, status='approved',
        )
        rent = Place.objects.create(
            owner=self.partner, title='Rent', location='Toshkent', area=80, people=10,
            subcategory=self.rent_sub, price_daily=300000, status='approved',
        )
        public = APIClient()

        def ids(params):
            data = public.get('/api/places/', params).data
            return {item['id'] for item in (data['results'] if isinstance(data, dict) else data)}

        self.assertEqual(ids({'deal_type': 'sale'}), {sale.id})
        self.assertEqual(ids({'deal_type': 'rent'}), {rent.id})
        self.assertEqual(ids({'min_price': 500000000}), {sale.id})

    def test_category_with_both_deals_lets_the_listing_choose(self):
        both = Category.objects.create(slug='both-test', name_uz='Savdo', name_ru='Торговля', name_en='Retail', deal_types='both')
        shop = SubCategory.objects.create(category=both, slug='shop-test', name_uz="Do'kon", name_ru='Магазин', name_en='Shop')

        sold = self.client.post('/api/places/', self.payload(subcategory=shop.id, deal_type='sale', sale_price='700000000'), format='json')
        # A second partner, so the one-listing tariff limit does not apply.
        other = APIClient()
        other.force_authenticate(get_user_model().objects.create_user(username='+998901239003', password='pass', role='partner'))
        rented = other.post('/api/places/', self.payload(subcategory=shop.id, price_monthly='9000000'), format='json')

        self.assertEqual(sold.status_code, 201)
        self.assertEqual(sold.data['deal_type'], 'sale')
        self.assertEqual(rented.status_code, 201)
        self.assertEqual(rented.data['deal_type'], 'rent')
        self.assertIsNone(rented.data['sale_price'])

    def test_rent_only_category_rejects_a_sale_listing(self):
        response = self.client.post('/api/places/', self.payload(
            subcategory=self.rent_sub.id, deal_type='sale', sale_price='500000000',
        ), format='json')

        self.assertEqual(response.status_code, 400)
        self.assertIn('deal_type', response.data)

    def test_area_and_characteristic_filters(self):
        big = Place.objects.create(
            owner=self.partner, title='Big', location='Toshkent', area=1200, people=10, subcategory=self.rent_sub,
            price_monthly=50000000, status='approved',
            characteristics={'ceiling_height': 9, 'temperature': 'isitiladi'},
        )
        Place.objects.create(
            owner=self.partner, title='Small', location='Toshkent', area=60, people=5, subcategory=self.rent_sub,
            price_monthly=9000000, status='approved',
            characteristics={'ceiling_height': 3, 'temperature': 'isitilmaydi'},
        )
        public = APIClient()

        def ids(params):
            data = public.get('/api/places/', params).data
            return {item['id'] for item in (data['results'] if isinstance(data, dict) else data)}

        self.assertEqual(ids({'min_area': 1000}), {big.id})
        self.assertEqual(ids({'char_min': 'ceiling_height:6'}), {big.id})
        self.assertEqual(ids({'char': 'temperature:isitiladi'}), {big.id})


class MarketplaceCatalogTests(TestCase):
    def test_migration_seeds_six_categories_with_their_deals(self):
        deals = dict(Category.objects.filter(
            slug__in=('ofis', 'kovorking', 'zal-tadbir', 'savdo', 'tijorat', 'ombor'),
        ).values_list('slug', 'deal_types'))

        self.assertEqual(deals, {
            'ofis': 'both', 'kovorking': 'rent', 'zal-tadbir': 'rent',
            'savdo': 'both', 'tijorat': 'both', 'ombor': 'both',
        })
        warehouse = SubCategory.objects.get(slug='ombor')
        self.assertTrue(warehouse.parameters.filter(slug='ceiling_height').exists())
        self.assertGreaterEqual(SubCategory.objects.filter(category__slug='savdo').count(), 5)

    def test_seed_marketplace_fills_every_category(self):
        from django.core.management import call_command
        from io import StringIO
        call_command('seed_marketplace', stdout=StringIO())
        call_command('seed_marketplace', stdout=StringIO())

        for slug in ('ofis', 'kovorking', 'zal-tadbir', 'savdo', 'tijorat', 'ombor'):
            self.assertTrue(Place.objects.filter(subcategory__category__slug=slug, status='approved').exists(), slug)
        self.assertTrue(Place.objects.filter(deal_type='sale', sale_price__gt=0).exists())
        self.assertFalse(Place.objects.filter(deal_type='sale', price_monthly__isnull=False).exists())


class CategoryFilterConfigTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        User = get_user_model()
        self.admin = User.objects.create_user(username='filter-admin', password='pass', role='admin')
        self.category = Category.objects.create(slug='filter-cat', name_uz='F', name_ru='Ф', name_en='F')
        self.url = f'/api/categories/{self.category.id}/'

    def test_admin_saves_filter_config_in_clean_shape(self):
        self.client.force_authenticate(self.admin)
        response = self.client.patch(self.url, {'filter_config': {
            'base': {'area': False, 'price': 1, 'unknown': True},
            'labels': {'price': '  Narxi ', 'area': '', 'durations': 'x'},
            'area_ranges': [{'min': '', 'max': '50'}, {'min': 50, 'max': None}],
            'params': {'ceiling_height': {'show': True, 'order': '2', 'steps': [6, '3', 3]}, 'wifi': {'separate': True}},
            'junk': 1,
        }}, format='json')

        self.assertEqual(response.status_code, 200, response.data)
        self.category.refresh_from_db()
        self.assertEqual(self.category.filter_config, {
            'base': {'area': False, 'price': True},
            'labels': {'price': 'Narxi'},
            'area_ranges': [{'min': None, 'max': 50}, {'min': 50, 'max': None}],
            'params': {'ceiling_height': {'show': True, 'order': 2, 'steps': [3, 6]}, 'wifi': {'separate': True}},
        })
        self.assertEqual(self.client.get(self.url).data['filter_config'], self.category.filter_config)

    def test_rejects_area_range_where_min_is_not_below_max(self):
        self.client.force_authenticate(self.admin)
        response = self.client.patch(self.url, {'filter_config': {'area_ranges': [{'min': 100, 'max': 50}]}}, format='json')
        self.assertEqual(response.status_code, 400)

    def test_non_admin_cannot_change_filter_config(self):
        User = get_user_model()
        partner = User.objects.create_user(username='filter-partner', password='pass', role='partner')
        self.client.force_authenticate(partner)
        response = self.client.patch(self.url, {'filter_config': {'base': {'price': False}}}, format='json')
        self.assertEqual(response.status_code, 403)
