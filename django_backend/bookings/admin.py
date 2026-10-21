from django.contrib import admin
from .models import Booking

@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ('client', 'place', 'start_time', 'end_time', 'duration_type', 'guests', 'amount', 'currency', 'status', 'payment_status')
    list_filter = ('status', 'payment_status', 'duration_type', 'currency')
    search_fields = ('client__username', 'client__email', 'place__title', 'note')
