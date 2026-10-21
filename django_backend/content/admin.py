from django.contrib import admin
from .models import SiteContent


@admin.register(SiteContent)
class SiteContentAdmin(admin.ModelAdmin):
    list_display = ('id', 'key')
    search_fields = ('key', 'value_ru', 'value_uz', 'value_en')
    ordering = ('key',)
