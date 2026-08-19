from django.urls import path
from .views import NotificationListView, mark_read, mark_all_read, unread_count

urlpatterns = [
    path('', NotificationListView.as_view(), name='notification-list'),
    path('unread-count/', unread_count, name='notification-unread-count'),
    path('read-all/', mark_all_read, name='notification-read-all'),
    path('<int:pk>/read/', mark_read, name='notification-mark-read'),
]
