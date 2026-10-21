from rest_framework import serializers

from .models import Banner


class BannerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Banner
        fields = (
            'id', 'eyebrow_uz', 'eyebrow_ru', 'eyebrow_en',
            'title_uz', 'title_ru', 'title_en',
            'image', 'link', 'order', 'is_active', 'created_at',
        )
        read_only_fields = ('id', 'created_at')
