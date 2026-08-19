from rest_framework import serializers
from .models import Notification


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
