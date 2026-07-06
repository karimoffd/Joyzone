from django.contrib import admin
from .models import PartnerTariff, PartnerSubscription

@admin.register(PartnerTariff)
class PartnerTariffAdmin(admin.ModelAdmin):
    list_display = ('name', 'price', 'duration_days')

@admin.register(PartnerSubscription)
class PartnerSubscriptionAdmin(admin.ModelAdmin):
    list_display = ('partner', 'tariff', 'start_date', 'end_date', 'is_active')
    list_filter = ('is_active',)
