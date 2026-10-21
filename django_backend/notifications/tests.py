from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from places.models import Place
from .models import ChatMessage, ChatThread, Notification


class RestChatTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.client = APIClient()
        self.guest = User.objects.create_user(username='chat-guest', password='pass', role='client')
        self.other_guest = User.objects.create_user(username='other-chat-guest', password='pass', role='client')
        self.host = User.objects.create_user(username='chat-host', password='pass', role='partner')
        self.other_host = User.objects.create_user(username='other-chat-host', password='pass', role='partner')
        self.admin = User.objects.create_user(username='chat-admin', password='pass', role='admin')
        self.place = Place.objects.create(
            owner=self.host,
            title='Chat Place',
            location='Tashkent',
            price='100000',
            area=20,
            people=4,
            status='approved',
        )
        self.other_place = Place.objects.create(
            owner=self.other_host,
            title='Other Chat Place',
            location='Tashkent',
            price='90000',
            area=18,
            people=3,
            status='approved',
        )

    def _create_thread(self, guest=None, place=None):
        guest = guest or self.guest
        place = place or self.place
        thread = ChatThread.objects.create(
            thread_id=f'place-{place.id}-guest-{guest.id}',
            place=place,
            guest=guest,
            host=place.owner,
            name=guest.username,
            host_name=place.owner.username,
            space_title=place.title,
        )
        ChatMessage.objects.create(thread=thread, sender='guest', text='Hello')
        return thread

    def test_guest_creates_chat_by_place_and_host_is_place_owner(self):
        self.client.force_authenticate(self.guest)

        response = self.client.post('/api/notifications/chats/', {'place_id': self.place.id}, format='json')

        self.assertEqual(response.status_code, 200)
        thread = ChatThread.objects.get(thread_id=response.data['id'])
        self.assertEqual(thread.place, self.place)
        self.assertEqual(thread.guest, self.guest)
        self.assertEqual(thread.host, self.host)
        self.assertEqual(response.data['space_title'], self.place.title)

    def test_chat_list_is_filtered_for_guest_host_and_admin(self):
        own_thread = self._create_thread(self.guest, self.place)
        other_thread = self._create_thread(self.other_guest, self.other_place)

        self.client.force_authenticate(self.guest)
        guest_response = self.client.get('/api/notifications/chats/')
        self.assertEqual([item['id'] for item in guest_response.data], [own_thread.thread_id])

        self.client.force_authenticate(self.host)
        host_response = self.client.get('/api/notifications/chats/')
        self.assertEqual([item['id'] for item in host_response.data], [own_thread.thread_id])

        self.client.force_authenticate(self.admin)
        admin_response = self.client.get('/api/notifications/chats/')
        self.assertEqual({item['id'] for item in admin_response.data}, {own_thread.thread_id, other_thread.thread_id})

    def test_user_cannot_send_message_to_unrelated_chat(self):
        thread = self._create_thread(self.guest, self.place)
        self.client.force_authenticate(self.other_guest)

        response = self.client.post('/api/notifications/chats/message/', {
            'chat_id': thread.thread_id,
            'text': 'Trying to intrude',
        }, format='json')

        self.assertEqual(response.status_code, 403)
        self.assertEqual(thread.messages.count(), 1)

    def test_guest_cannot_impersonate_host_sender(self):
        thread = self._create_thread(self.guest, self.place)
        self.client.force_authenticate(self.guest)

        response = self.client.post('/api/notifications/chats/message/', {
            'chat_id': thread.thread_id,
            'from': 'host',
            'text': 'I am not host',
        }, format='json')

        self.assertEqual(response.status_code, 200)
        last_message = ChatMessage.objects.filter(thread=thread).last()
        self.assertEqual(last_message.sender, 'guest')

    def test_unread_count_and_mark_read_are_per_user(self):
        thread = self._create_thread(self.guest, self.place)
        self.client.force_authenticate(self.host)

        unread = self.client.get('/api/notifications/chats/unread-count/')
        self.assertEqual(unread.status_code, 200)
        self.assertEqual(unread.data['count'], 1)

        mark_read = self.client.post(f'/api/notifications/chats/{thread.thread_id}/read/')
        self.assertEqual(mark_read.status_code, 200)
        self.assertFalse(mark_read.data['unread'])

        unread_after = self.client.get('/api/notifications/chats/unread-count/')
        self.assertEqual(unread_after.data['count'], 0)

    def test_host_reply_is_unread_for_guest(self):
        thread = self._create_thread(self.guest, self.place)
        self.client.force_authenticate(self.host)
        self.client.post('/api/notifications/chats/message/', {
            'chat_id': thread.thread_id,
            'from': 'guest',
            'text': 'Host reply',
        }, format='json')

        self.client.force_authenticate(self.guest)
        unread = self.client.get('/api/notifications/chats/unread-count/')

        self.assertEqual(unread.status_code, 200)
        self.assertEqual(unread.data['count'], 1)

    def test_guest_to_partner_rest_chat_round_trip(self):
        self.client.force_authenticate(self.guest)
        created = self.client.post('/api/notifications/chats/', {
            'place_id': self.place.id,
        }, format='json')
        self.assertEqual(created.status_code, 200)
        thread_id = created.data['id']

        guest_message = self.client.post('/api/notifications/chats/message/', {
            'chat_id': thread_id,
            'from': 'guest',
            'text': 'Is the room available tomorrow?',
        }, format='json')
        self.assertEqual(guest_message.status_code, 200)

        self.client.force_authenticate(self.host)
        host_inbox = self.client.get('/api/notifications/chats/')
        self.assertEqual(host_inbox.status_code, 200)
        self.assertEqual([item['id'] for item in host_inbox.data], [thread_id])
        self.assertEqual(host_inbox.data[0]['guest_name'], self.guest.username)
        self.assertEqual(host_inbox.data[0]['place_id'], self.place.id)
        self.assertTrue(host_inbox.data[0]['unread'])

        host_reply = self.client.post('/api/notifications/chats/message/', {
            'chat_id': thread_id,
            'from': 'host',
            'text': 'Yes, the room is available.',
        }, format='json')
        self.assertEqual(host_reply.status_code, 200)
        self.assertEqual(host_reply.data['messages'][-1]['from'], 'host')

        self.client.force_authenticate(self.guest)
        guest_inbox = self.client.get('/api/notifications/chats/')
        self.assertEqual(guest_inbox.status_code, 200)
        self.assertEqual(guest_inbox.data[0]['messages'][-1]['text'], 'Yes, the room is available.')
        self.assertTrue(guest_inbox.data[0]['unread'])


class SystemNotificationApiTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.client = APIClient()
        self.user = User.objects.create_user(username='notification-user', password='pass', role='client')
        self.other_user = User.objects.create_user(username='notification-other', password='pass', role='client')
        self.notification = Notification.objects.create(
            user=self.user,
            notification_type='booking_confirmed',
            title_ru='Confirmed',
            message_ru='Booking confirmed',
            related_place_id=10,
            related_booking_id=20,
        )
        Notification.objects.create(
            user=self.other_user,
            notification_type='tariff_activated',
            title_ru='Tariff',
            message_ru='Activated',
            related_tariff_subscription_id=30,
        )

    def test_list_unread_and_read_are_scoped_to_current_user(self):
        self.client.force_authenticate(self.user)

        listed = self.client.get('/api/notifications/')
        unread = self.client.get('/api/notifications/unread-count/')
        marked = self.client.post(f'/api/notifications/{self.notification.id}/read/')
        unread_after = self.client.get('/api/notifications/unread-count/')

        self.assertEqual(listed.status_code, 200)
        items = listed.data.get('results', listed.data) if isinstance(listed.data, dict) else listed.data
        self.assertEqual([item['id'] for item in items], [self.notification.id])
        self.assertEqual(items[0]['related_booking_id'], 20)
        self.assertEqual(unread.data['count'], 1)
        self.assertEqual(marked.status_code, 200)
        self.assertEqual(unread_after.data['count'], 0)
