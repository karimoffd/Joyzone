from django.db.models import Q
from django.utils import timezone
from rest_framework import generics, permissions, serializers, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import OpenApiParameter, extend_schema, inline_serializer
from core.permissions import is_admin_or_moderator, is_partner
from places.models import Place
from .models import Notification, ChatThread, ChatMessage
from .serializers import NotificationSerializer, ChatThreadSerializer, ChatMessageSerializer

VALID_CHAT_SENDERS = {'guest', 'host'}


def _display_name(user):
    return user.get_full_name() or user.username or user.email or str(user.id)


def normalize_chat_sender(value):
    sender = str(value or 'guest').strip().lower()
    aliases = {
        'client': 'guest',
        'user': 'guest',
        'partner': 'host',
        'owner': 'host',
    }
    return aliases.get(sender, sender)


def _chat_queryset_for_user(user):
    base = ChatThread.objects.select_related(
        'place',
        'guest',
        'host',
    ).prefetch_related('messages')

    if is_admin_or_moderator(user):
        return base.all()
    if is_partner(user):
        return base.filter(Q(host=user) | Q(place__owner=user))
    return base.filter(guest=user)


def _can_access_thread(user, thread):
    if is_admin_or_moderator(user):
        return True
    if thread.guest_id == user.id:
        return True
    if thread.host_id == user.id:
        return True
    if thread.place and thread.place.owner_id == user.id:
        return True
    return False


def _sender_for_user(user, thread, requested_sender='guest'):
    requested_sender = normalize_chat_sender(requested_sender)
    if is_admin_or_moderator(user):
        return requested_sender if requested_sender in VALID_CHAT_SENDERS else 'host'
    if thread.host_id == user.id or (thread.place and thread.place.owner_id == user.id):
        return 'host'
    return 'guest'


def _mark_thread_read_for_user(thread, user):
    now = timezone.now()
    if is_admin_or_moderator(user) or thread.host_id == user.id or (thread.place and thread.place.owner_id == user.id):
        thread.last_read_by_host = now
        update_fields = ['last_read_by_host', 'updated_at']
    else:
        thread.last_read_by_guest = now
        update_fields = ['last_read_by_guest', 'updated_at']
    thread.unread = False
    thread.save(update_fields=['unread', *update_fields])
    return thread


def _unread_for_user(thread, user):
    last_msg = thread.messages.last()
    if not last_msg:
        return False
    if thread.guest_id == user.id:
        return last_msg.sender == 'host' and (
            not thread.last_read_by_guest or last_msg.created_at > thread.last_read_by_guest
        )
    if is_admin_or_moderator(user) or thread.host_id == user.id or (thread.place and thread.place.owner_id == user.id):
        return last_msg.sender == 'guest' and (
            not thread.last_read_by_host or last_msg.created_at > thread.last_read_by_host
        )
    return False


@extend_schema(
    methods=['GET'],
    parameters=[OpenApiParameter('place', int, OpenApiParameter.QUERY, description='Optional place id filter.')],
    responses=ChatThreadSerializer(many=True),
    tags=['chat'],
)
@extend_schema(
    methods=['POST'],
    request=inline_serializer(
        name='ChatThreadCreateRequest',
        fields={
            'place_id': serializers.IntegerField(required=False),
            'place': serializers.IntegerField(required=False),
            'space_id': serializers.IntegerField(required=False),
            'guest': serializers.IntegerField(required=False),
            'name': serializers.CharField(required=False, allow_blank=True),
            'host_name': serializers.CharField(required=False, allow_blank=True),
            'color': serializers.CharField(required=False, allow_blank=True),
        },
    ),
    responses=ChatThreadSerializer,
    tags=['chat'],
)
@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated])
def chat_list_create(request):
    if request.method == 'GET':
        threads = _chat_queryset_for_user(request.user).order_by('-updated_at')
        place_id = request.query_params.get('place') or request.query_params.get('place_id')
        if place_id:
            threads = threads.filter(place_id=place_id)
        serializer = ChatThreadSerializer(threads, many=True, context={'request': request})
        return Response(serializer.data)

    elif request.method == 'POST':
        place_id = request.data.get('place') or request.data.get('place_id') or request.data.get('space_id')
        if not place_id:
            return Response({'error': 'place_id is required'}, status=400)

        try:
            place = Place.objects.select_related('owner').get(pk=place_id)
        except (Place.DoesNotExist, ValueError):
            return Response({'error': 'Place not found'}, status=404)

        if place.status != 'approved' and not (is_admin_or_moderator(request.user) or place.owner_id == request.user.id):
            return Response({'error': 'Place is not available for chat'}, status=403)

        guest = request.user if place.owner_id != request.user.id else None
        if is_admin_or_moderator(request.user) and request.data.get('guest'):
            from django.contrib.auth import get_user_model
            User = get_user_model()
            try:
                guest = User.objects.get(pk=request.data.get('guest'))
            except (User.DoesNotExist, ValueError):
                return Response({'error': 'Guest not found'}, status=404)

        if not guest:
            return Response({'error': 'guest user is required to create a place chat'}, status=400)

        host = place.owner
        thread_id = f'place-{place.id}-guest-{guest.id}'
        thread, created = ChatThread.objects.get_or_create(
            place=place,
            guest=guest,
            defaults={
                'thread_id': thread_id,
                'host': host,
                'name': request.data.get('name') or _display_name(guest),
                'space_title': place.title,
                'host_name': _display_name(host) if host else request.data.get('host_name') or 'Ega / Host',
                'color': request.data.get('color') or '#e46630',
                'last_read_by_guest': timezone.now(),
            }
        )
        if not created:
            changed = False
            if thread.host_id != (host.id if host else None):
                thread.host = host
                changed = True
            if thread.space_title != place.title:
                thread.space_title = place.title
                changed = True
            if changed:
                thread.save()

        serializer = ChatThreadSerializer(thread, context={'request': request})
        return Response(serializer.data)


@extend_schema(
    methods=['POST'],
    request=inline_serializer(
        name='ChatMessageCreateRequest',
        fields={
            'chat_id': serializers.CharField(required=False),
            'thread_id': serializers.CharField(required=False),
            'from': serializers.ChoiceField(choices=['guest', 'host'], required=False),
            'sender': serializers.ChoiceField(choices=['guest', 'host'], required=False),
            'from_sender': serializers.ChoiceField(choices=['guest', 'host'], required=False),
            'text': serializers.CharField(),
        },
    ),
    responses=ChatThreadSerializer,
    tags=['chat'],
)
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def chat_send_message(request):
    thread_id = request.data.get('chat_id') or request.data.get('thread_id')
    requested_sender = request.data.get('from') or request.data.get('sender') or request.data.get('from_sender') or 'guest'
    text = request.data.get('text')

    if not thread_id or not text:
        return Response({'error': 'chat_id and text are required'}, status=400)

    try:
        thread = ChatThread.objects.select_related('place', 'guest', 'host').get(thread_id=thread_id)
    except ChatThread.DoesNotExist:
        return Response({'error': 'Chat not found'}, status=404)

    if not _can_access_thread(request.user, thread):
        return Response({'error': 'You do not have access to this chat'}, status=403)

    sender = _sender_for_user(request.user, thread, requested_sender)

    msg = ChatMessage.objects.create(thread=thread, sender=sender, text=text.strip())
    if sender == 'guest':
        thread.last_read_by_guest = msg.created_at
    else:
        thread.last_read_by_host = msg.created_at
    thread.unread = sender == 'guest'
    thread.save(update_fields=['last_read_by_guest', 'last_read_by_host', 'unread', 'updated_at'])

    serializer = ChatThreadSerializer(thread, context={'request': request})
    return Response(serializer.data)


class ChatMarkReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(request=None, responses=ChatThreadSerializer, tags=['chat'])
    def post(self, request, thread_id):
        try:
            thread = ChatThread.objects.select_related('place', 'guest', 'host').get(thread_id=thread_id)
        except ChatThread.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not _can_access_thread(request.user, thread):
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        _mark_thread_read_for_user(thread, request.user)
        return Response(ChatThreadSerializer(thread, context={'request': request}).data)


@extend_schema(
    methods=['GET'],
    responses=inline_serializer(
        name='ChatUnreadCountResponse',
        fields={'count': serializers.IntegerField()},
    ),
    tags=['chat'],
)
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def chat_unread_count(request):
    threads = _chat_queryset_for_user(request.user)
    count = sum(1 for thread in threads if _unread_for_user(thread, request.user))
    return Response({'count': count})


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


class NotificationMarkReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        request=None,
        responses=inline_serializer(
            name='NotificationReadResponse',
            fields={'id': serializers.IntegerField(), 'is_read': serializers.BooleanField()},
        ),
        tags=['notifications'],
    )
    def post(self, request, pk):
        try:
            notif = Notification.objects.get(pk=pk, user=request.user)
        except Notification.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        notif.is_read = True
        notif.save(update_fields=['is_read'])
        return Response({'id': notif.id, 'is_read': True})


class NotificationMarkAllReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        request=None,
        responses=inline_serializer(
            name='NotificationReadAllResponse',
            fields={'status': serializers.CharField()},
        ),
        tags=['notifications'],
    )
    def post(self, request):
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({'status': 'ok'})


@extend_schema(
    methods=['GET'],
    responses=inline_serializer(
        name='NotificationUnreadCountResponse',
        fields={'count': serializers.IntegerField()},
    ),
    tags=['notifications'],
)
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def unread_count(request):
    count = Notification.objects.filter(user=request.user, is_read=False).count()
    return Response({'count': count})
