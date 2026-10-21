from django.urls import path
from .views import (
    NotificationListView,
    ChatMarkReadView,
    NotificationMarkAllReadView,
    NotificationMarkReadView,
    chat_list_create,
    chat_send_message,
    chat_unread_count,
    unread_count,
)

urlpatterns = [
    path('', NotificationListView.as_view(), name='notification-list'),
    path('unread-count/', unread_count, name='notification-unread-count'),
    path('read-all/', NotificationMarkAllReadView.as_view(), name='notification-read-all'),
    path('<int:pk>/read/', NotificationMarkReadView.as_view(), name='notification-mark-read'),
    path('chats/', chat_list_create, name='chat-list-create'),
    path('chats/message/', chat_send_message, name='chat-send-message'),
    path('chats/unread-count/', chat_unread_count, name='chat-unread-count'),
    path('chats/<str:thread_id>/read/', ChatMarkReadView.as_view(), name='chat-mark-read'),
]
