from rest_framework import serializers
from .models import Notification, ChatThread, ChatMessage


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = (
            'id', 'notification_type',
            'title_uz', 'title_ru', 'title_en',
            'message_uz', 'message_ru', 'message_en',
            'related_place_id', 'is_read', 'created_at'
        )
        read_only_fields = fields


class ChatMessageSerializer(serializers.ModelSerializer):
    from_sender = serializers.CharField(source='sender')

    class Meta:
        model = ChatMessage
        fields = ['id', 'sender', 'from_sender', 'text', 'created_at']


class ChatThreadSerializer(serializers.ModelSerializer):
    messages = ChatMessageSerializer(many=True, read_only=True)
    id = serializers.CharField(source='thread_id')
    space = serializers.CharField(source='space_title')
    preview = serializers.SerializerMethodField()
    time = serializers.SerializerMethodField()

    class Meta:
        model = ChatThread
        fields = ['id', 'name', 'host_name', 'space', 'space_title', 'color', 'unread', 'preview', 'time', 'messages']

    def get_preview(self, obj):
        last_msg = obj.messages.last()
        return last_msg.text if last_msg else "Диалог начат..."

    def get_time(self, obj):
        return obj.updated_at.strftime('%H:%M')
