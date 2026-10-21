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
