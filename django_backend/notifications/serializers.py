from rest_framework import serializers
from .models import Notification, ChatThread, ChatMessage


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = (
            'id', 'notification_type',
            'title_uz', 'title_ru', 'title_en',
            'message_uz', 'message_ru', 'message_en',
            'related_place_id', 'related_booking_id', 'related_tariff_subscription_id',
            'is_read', 'created_at'
        )
        read_only_fields = fields


class ChatMessageSerializer(serializers.ModelSerializer):
    locals()['from'] = serializers.CharField(source='sender', read_only=True)
    from_sender = serializers.CharField(source='sender', read_only=True)

    class Meta:
        model = ChatMessage
        fields = ['id', 'sender', 'from', 'from_sender', 'text', 'created_at']


class ChatThreadSerializer(serializers.ModelSerializer):
    messages = ChatMessageSerializer(many=True, read_only=True)
    id = serializers.CharField(source='thread_id')
    space = serializers.CharField(source='space_title')
    preview = serializers.SerializerMethodField()
    time = serializers.SerializerMethodField()
    unread = serializers.SerializerMethodField()
    place_id = serializers.IntegerField(source='place.id', read_only=True)
    guest_id = serializers.IntegerField(source='guest.id', read_only=True)
    host_id = serializers.IntegerField(source='host.id', read_only=True)
    guest_name = serializers.SerializerMethodField()
    host_user_name = serializers.SerializerMethodField()
    viewer_role = serializers.SerializerMethodField()
    guest_avatar = serializers.SerializerMethodField()
    host_avatar = serializers.SerializerMethodField()

    class Meta:
        model = ChatThread
        fields = [
            'id',
            'name',
            'host_name',
            'host_user_name',
            'space',
            'space_title',
            'place_id',
            'guest_id',
            'guest_name',
            'host_id',
            'color',
            'unread',
            'viewer_role',
            'guest_avatar',
            'host_avatar',
            'last_read_by_guest',
            'last_read_by_host',
            'preview',
            'time',
            'messages',
            'created_at',
            'updated_at',
        ]

    def get_preview(self, obj):
        last_msg = obj.messages.last()
        return last_msg.text if last_msg else "Диалог начат..."

    def get_time(self, obj):
        return obj.updated_at.strftime('%H:%M')

    def get_unread(self, obj):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        last_msg = obj.messages.last()
        if not last_msg or not user or not user.is_authenticated:
            return bool(obj.unread)

        if obj.guest_id == user.id:
            return last_msg.sender == 'host' and (
                not obj.last_read_by_guest or last_msg.created_at > obj.last_read_by_guest
            )

        if obj.host_id == user.id or getattr(user, 'role', None) in ('admin', 'moderator') or user.is_staff or user.is_superuser:
            return last_msg.sender == 'guest' and (
                not obj.last_read_by_host or last_msg.created_at > obj.last_read_by_host
            )

        return False

    def get_viewer_role(self, obj):
        """Which side of the conversation the requesting user is on."""
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if user and user.is_authenticated and obj.guest_id == user.id:
            return 'guest'
        return 'host'

    def get_guest_avatar(self, obj):
        return (obj.guest.avatar or '') if obj.guest else ''

    def get_host_avatar(self, obj):
        return (obj.host.avatar or '') if obj.host else ''

    def get_guest_name(self, obj):
        if obj.guest:
            return obj.guest.get_full_name() or obj.guest.username
        return obj.name

    def get_host_user_name(self, obj):
        if obj.host:
            return obj.host.get_full_name() or obj.host.username
        return obj.host_name
