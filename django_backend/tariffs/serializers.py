from rest_framework import serializers
from .models import TariffPlan, TariffSubscription


class TariffPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = TariffPlan
        fields = [
            'id', 'slug', 'name', 'name_ru', 'name_en',
            'description', 'description_ru', 'description_en',
            'price', 'duration_days', 'max_places',
            'is_free', 'is_active', 'features', 'features_ru', 'features_en', 'sort_order'
        ]


class TariffSubscriptionSerializer(serializers.ModelSerializer):
    tariff_name = serializers.SerializerMethodField()
    partner_name = serializers.SerializerMethodField()
    partner_phone = serializers.SerializerMethodField()

    class Meta:
        model = TariffSubscription
        fields = '__all__'

    def get_tariff_name(self, obj):
        return obj.tariff.name if obj.tariff else None

    def get_partner_name(self, obj):
        return obj.partner.get_full_name() or obj.partner.username

    def get_partner_phone(self, obj):
        return obj.partner.phone_number or obj.partner.username
