import json

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, serializers, status, viewsets
from drf_spectacular.utils import extend_schema, inline_serializer
from core.permissions import IsAdminOrModerator, is_admin_or_moderator
from .models import Banner, SiteContent
from .serializers import BannerSerializer


LANG_FIELDS = {
    'ru': 'value_ru',
    'uz': 'value_uz',
    'en': 'value_en',
}


def _deserialize_content_value(value):
    if value in (None, ''):
        return ''
    if not str(value).lstrip().startswith(('[', '{')):
        return value
    try:
        return json.loads(value)
    except (TypeError, ValueError):
        return value


def _serialize_content_value(value):
    if isinstance(value, str):
        return value
    try:
        return json.dumps(value, ensure_ascii=False)
    except (TypeError, ValueError):
        raise ValueError('Value must be a string or JSON-compatible data.')


class ContentView(APIView):
    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.AllowAny()]
        return [IsAdminOrModerator()]

    @extend_schema(
        responses=inline_serializer(
            name='SiteContentResponse',
            fields={
                'ru': serializers.DictField(),
                'uz': serializers.DictField(),
                'en': serializers.DictField(),
            },
        ),
        tags=['content'],
    )
    def get(self, request):
        # Return content in format: { "ru": { "key": "val" }, "uz": { "key": "val" }, "en": { "key": "val" } }
        contents = SiteContent.objects.all()
        response_data = {lang: {} for lang in LANG_FIELDS}
        
        for c in contents:
            for lang, field_name in LANG_FIELDS.items():
                response_data[lang][c.key] = _deserialize_content_value(getattr(c, field_name, ''))
            
        return Response(response_data)

    @extend_schema(
        request=inline_serializer(
            name='SiteContentUpdateRequest',
            fields={
                'lang': serializers.ChoiceField(choices=['ru', 'uz', 'en']),
                'data': serializers.DictField(),
            },
        ),
        responses=inline_serializer(
            name='SiteContentUpdateResponse',
            fields={'status': serializers.CharField()},
        ),
        tags=['content'],
    )
    def put(self, request):
        # Expected payload: { "lang": "ru", "data": { "key1": "value1", "key2": "value2" } }
        lang = request.data.get('lang')
        data = request.data.get('data')
        
        if lang not in LANG_FIELDS:
            return Response({"error": "Invalid language"}, status=status.HTTP_400_BAD_REQUEST)
            
        if not isinstance(data, dict):
            return Response({"error": "Data must be a dictionary"}, status=status.HTTP_400_BAD_REQUEST)
            
        errors = {}
        for key, value in data.items():
            if not isinstance(key, str) or not key.strip():
                errors[str(key)] = 'Key must be a non-empty string.'
                continue
            try:
                serialized_value = _serialize_content_value(value)
            except ValueError as exc:
                errors[key] = str(exc)
                continue

            clean_key = key.strip()
            obj, created = SiteContent.objects.get_or_create(key=clean_key)
            setattr(obj, LANG_FIELDS[lang], serialized_value)
            obj.save()

        if errors:
            return Response({"error": "Invalid content data", "fields": errors}, status=status.HTTP_400_BAD_REQUEST)
            
        return Response({"status": "success"})


class BannerViewSet(viewsets.ModelViewSet):
    """Public read of active banners; admins and moderators manage all of them."""

    serializer_class = BannerSerializer
    pagination_class = None

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.AllowAny()]
        return [IsAdminOrModerator()]

    def get_queryset(self):
        queryset = Banner.objects.all()
        if not is_admin_or_moderator(self.request.user):
            queryset = queryset.filter(is_active=True)
        return queryset
