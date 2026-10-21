from django.contrib import admin

from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'provider', 'amount', 'currency', 'status', 'booking', 'tariff_subscription', 'created_at')
    list_filter = ('provider', 'status', 'currency')
    search_fields = ('external_id', 'user__username', 'user__email')
    readonly_fields = ('created_at', 'updated_at')
