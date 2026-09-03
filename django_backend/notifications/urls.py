from django.urls import path
from .views import NotificationListView, mark_read, mark_all_read, unread_count, chat_list_create, chat_send_message

urlpatterns = [
    path('', NotificationListView.as_view(), name='notification-list'),
    path('unread-count/', unread_count, name='notification-unread-count'),
    path('read-all/', mark_all_read, name='notification-read-all'),
    path('<int:pk>/read/', mark_read, name='notification-mark-read'),
    path('chats/', chat_list_create, name='chat-list-create'),
    path('chats/message/', chat_send_message, name='chat-send-message'),
]
