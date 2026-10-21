import logging

from django.core.serializers.json import DjangoJSONEncoder

logger = logging.getLogger(__name__)


def _clean_actor(actor):
    if actor is not None and getattr(actor, 'is_authenticated', False):
        return actor
    return None


def _json_safe_metadata(metadata):
    if metadata is None:
        return {}
    try:
        encoded = DjangoJSONEncoder().encode(metadata)
        import json
        return json.loads(encoded)
    except (TypeError, ValueError):
        return {'raw': str(metadata)}


def create_audit_log(actor, action, object_type, object_id='', metadata=None):
    """Create an audit record without letting logging failures break the action."""
    try:
        from .models import AuditLog

        return AuditLog.objects.create(
            actor=_clean_actor(actor),
            action=action,
            object_type=object_type,
            object_id=str(object_id or ''),
            metadata=_json_safe_metadata(metadata),
        )
    except Exception:
        logger.exception('Failed to create audit log for action=%s object=%s:%s', action, object_type, object_id)
        return None
