from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from .models import SiteContent


class ContentPermissionTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.client = APIClient()
        self.partner = User.objects.create_user(username='partner', password='pass', role='partner')
        self.moderator = User.objects.create_user(username='moderator', password='pass', role='moderator')
        self.staff = User.objects.create_user(username='staff', password='pass', is_staff=True)

    def test_get_content_is_public(self):
        SiteContent.objects.create(key='hero_title', value_ru='Привет', value_uz='Salom', value_en='Hello')

        response = self.client.get('/api/content/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['ru']['hero_title'], 'Привет')
        self.assertEqual(response.data['uz']['hero_title'], 'Salom')
        self.assertEqual(response.data['en']['hero_title'], 'Hello')

    def test_put_content_rejects_anonymous_and_partner(self):
        payload = {'lang': 'ru', 'data': {'hero_title': 'Новое'}}

        anonymous_response = self.client.put('/api/content/', payload, format='json')
        self.assertIn(anonymous_response.status_code, (401, 403))

        self.client.force_authenticate(self.partner)
        partner_response = self.client.put('/api/content/', payload, format='json')
        self.assertEqual(partner_response.status_code, 403)

    def test_put_content_allows_moderator_or_staff(self):
        payload = {'lang': 'ru', 'data': {'hero_title': 'Новое'}}

        self.client.force_authenticate(self.moderator)
        moderator_response = self.client.put('/api/content/', payload, format='json')
        self.assertEqual(moderator_response.status_code, 200)

        self.client.force_authenticate(self.staff)
        staff_response = self.client.put('/api/content/', {'lang': 'en', 'data': {'hero_title': 'New'}}, format='json')
        self.assertEqual(staff_response.status_code, 200)

        item = SiteContent.objects.get(key='hero_title')
        self.assertEqual(item.value_ru, 'Новое')
        self.assertEqual(item.value_en, 'New')

    def test_put_content_accepts_json_compatible_values_and_returns_typed_data(self):
        self.client.force_authenticate(self.moderator)
        payload = {
            'lang': 'en',
            'data': {
                'nav_links_arr': [
                    {'label': 'Home', 'href': '#home'},
                    {'label': 'Rent', 'href': '#filter'},
                ],
            }
        }

        put_response = self.client.put('/api/content/', payload, format='json')
        get_response = self.client.get('/api/content/')

        self.assertEqual(put_response.status_code, 200)
        self.assertEqual(get_response.status_code, 200)
        self.assertEqual(get_response.data['en']['nav_links_arr'][0]['label'], 'Home')

    def test_put_content_rejects_invalid_language_and_key(self):
        self.client.force_authenticate(self.moderator)

        bad_lang = self.client.put('/api/content/', {'lang': 'fr', 'data': {'hero_title': 'Bonjour'}}, format='json')
        bad_key = self.client.put('/api/content/', {'lang': 'en', 'data': {'': 'Empty'}}, format='json')

        self.assertEqual(bad_lang.status_code, 400)
        self.assertEqual(bad_key.status_code, 400)


class BannerApiTests(TestCase):
    def setUp(self):
        from django.contrib.auth import get_user_model
        from rest_framework.test import APIClient
        from .models import Banner

        User = get_user_model()
        self.client = APIClient()
        self.admin = User.objects.create_user(username='banner-admin', password='pass', role='admin')
        self.user = User.objects.create_user(username='banner-user', password='pass', role='client')
        Banner.objects.all().delete()
        self.active = Banner.objects.create(title_uz='Active', image='https://example.com/a.jpg', order=1)
        self.hidden = Banner.objects.create(title_uz='Hidden', image='https://example.com/b.jpg', is_active=False)

    def test_public_sees_only_active_banners(self):
        response = self.client.get('/api/content/banners/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual([item['title_uz'] for item in response.data], ['Active'])

    def test_admin_manages_banners_and_client_cannot(self):
        self.client.force_authenticate(self.user)
        denied = self.client.post('/api/content/banners/', {'title_uz': 'X', 'image': 'https://example.com/x.jpg'}, format='json')
        self.assertEqual(denied.status_code, 403)

        self.client.force_authenticate(self.admin)
        listing = self.client.get('/api/content/banners/')
        created = self.client.post('/api/content/banners/', {'title_uz': 'New', 'image': 'https://example.com/n.jpg', 'order': 0}, format='json')
        updated = self.client.patch(f'/api/content/banners/{self.hidden.id}/', {'is_active': True}, format='json')
        deleted = self.client.delete(f'/api/content/banners/{self.active.id}/')

        self.assertEqual(len(listing.data), 2)
        self.assertEqual(created.status_code, 201)
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(deleted.status_code, 204)
