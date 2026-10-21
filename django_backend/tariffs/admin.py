from django.contrib import admin
from .models import TariffPlan, TariffSubscription


@admin.register(TariffPlan)
class TariffPlanAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'slug',
        'name',
        'price',
        'duration_days',
        'max_places',
        'is_free',
        'is_active',
        'sort_order',
    )
    list_filter = ('slug', 'is_free', 'is_active')
    list_editable = ('sort_order', 'is_active')
    search_fields = ('slug', 'name', 'name_ru', 'name_en', 'description', 'description_ru')
    ordering = ('sort_order', 'price')


@admin.register(TariffSubscription)
class TariffSubscriptionAdmin(admin.ModelAdmin):
    list_display = ('id', 'partner', 'tariff', 'status', 'start_date', 'end_date', 'created_at')
    list_filter = ('status', 'tariff', 'start_date', 'end_date')
    search_fields = ('partner__username', 'partner__email', 'partner__phone_number', 'tariff__name', 'tariff__slug')
    autocomplete_fields = ('partner', 'tariff')
    readonly_fields = ('created_at',)

