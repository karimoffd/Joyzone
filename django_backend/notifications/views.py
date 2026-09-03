from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .models import Notification, ChatThread, ChatMessage
from .serializers import NotificationSerializer, ChatThreadSerializer, ChatMessageSerializer


def seed_initial_chats():
    t1, _ = ChatThread.objects.get_or_create(
        thread_id='nosirov-abdulboriy',
        defaults={
            'name': 'Nosirov Abdulboriy',
            'space_title': 'Atlas Meeting Room',
            'host_name': 'Bekzod Tursunov',
            'color': '#e46630',
            'unread': True
        }
    )
    if t1.messages.count() == 0:
        ChatMessage.objects.create(thread=t1, sender='guest', text='Здравствуйте! Нам очень понравился ваш зал.')
        ChatMessage.objects.create(thread=t1, sender='host', text='Здравствуйте! Рады слышать, подскажите дату и время?')
        ChatMessage.objects.create(thread=t1, sender='guest', text='Хотим забронировать зал на 100 человек.')


@api_view(['GET', 'POST'])
@permission_classes([permissions.AllowAny])
def chat_list_create(request):
    if request.method == 'GET':
        threads = ChatThread.objects.prefetch_related('messages').all()
        if threads.count() == 0:
            seed_initial_chats()
            threads = ChatThread.objects.prefetch_related('messages').all()
        serializer = ChatThreadSerializer(threads, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        thread_id = request.data.get('id') or request.data.get('thread_id')
        name = request.data.get('name') or 'Nosirov Abdulboriy'
        space_title = request.data.get('space_title') or request.data.get('space') or 'Joyzone Space'
        host_name = request.data.get('host_name') or 'Ega / Host'

        if not thread_id:
            return Response({'error': 'thread_id is required'}, status=400)

        thread, created = ChatThread.objects.get_or_create(
            thread_id=thread_id,
            defaults={
                'name': name,
                'space_title': space_title,
                'host_name': host_name,
                'color': '#e46630'
            }
        )
        if not created and name and thread.name != name:
            thread.name = name
            thread.save()

        serializer = ChatThreadSerializer(thread)
        return Response(serializer.data)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def chat_send_message(request):
    thread_id = request.data.get('chat_id') or request.data.get('thread_id')
    sender = request.data.get('from') or 'guest'
    text = request.data.get('text')

    if not thread_id or not text:
        return Response({'error': 'chat_id and text are required'}, status=400)

    try:
        thread = ChatThread.objects.get(thread_id=thread_id)
    except ChatThread.DoesNotExist:
        thread = ChatThread.objects.create(
            thread_id=thread_id,
            name=request.data.get('name') or 'Nosirov Abdulboriy',
            space_title=request.data.get('space') or 'Joyzone Space',
            color='#e46630'
        )

    msg = ChatMessage.objects.create(thread=thread, sender=sender, text=text.strip())
    thread.unread = (sender == 'guest')
    thread.save()

    serializer = ChatThreadSerializer(thread)
    return Response(serializer.data)


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
    Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
    return Response({'status': 'ok'})


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def unread_count(request):
    count = Notification.objects.filter(user=request.user, is_read=False).count()
    return Response({'count': count})
