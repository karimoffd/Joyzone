from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .models import Notification
from .serializers import NotificationSerializer


class NotificationListView(generics.ListAPIView):
    """
    GET /api/notifications/
    Returns the current user's notifications ordered by newest first.
    Security: only authenticated users, and they only see their own notifications.
    """
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def mark_read(request, pk):
    """
    POST /api/notifications/{pk}/read/
    Marks a notification as read.
    Security: users can only mark their OWN notifications as read.
    """
    try:
        notif = Notification.objects.get(pk=pk, user=request.user)
    except Notification.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    notif.is_read = True
    notif.save(update_fields=['is_read'])
    return Response({'id': notif.id, 'is_read': True})


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def mark_all_read(request):
    """
    POST /api/notifications/read-all/
    Marks ALL of the current user's notifications as read.
    """
    Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
    return Response({'status': 'ok'})


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def unread_count(request):
    """
    GET /api/notifications/unread-count/
    Returns count of unread notifications for badge display.
    """
    count = Notification.objects.filter(user=request.user, is_read=False).count()
    return Response({'count': count})
