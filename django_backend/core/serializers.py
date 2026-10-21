from rest_framework import serializers

from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = (
            'id',
            'actor',
            'actor_name',
            'action',
            'object_type',
            'object_id',
            'metadata',
            'created_at',
        )
        read_only_fields = fields

    def get_actor_name(self, obj) -> str:
        if not obj.actor:
            return ''
        return obj.actor.get_full_name() or obj.actor.username
