from django.contrib import admin
from .models import Place

@admin.register(Place)
class PlaceAdmin(admin.ModelAdmin):
    list_display = ('title', 'category', 'location', 'price', 'owner')
    search_fields = ('title', 'location', 'category')
