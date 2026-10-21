from django.contrib import admin
from .models import Banner, SiteContent


@admin.register(SiteContent)
class SiteContentAdmin(admin.ModelAdmin):
    list_display = ('id', 'key')
    search_fields = ('key', 'value_ru', 'value_uz', 'value_en')
    ordering = ('key',)


@admin.register(Banner)
class BannerAdmin(admin.ModelAdmin):
    list_display = ('id', 'title_uz', 'order', 'is_active')
    list_editable = ('order', 'is_active')
    search_fields = ('title_uz', 'title_ru', 'title_en')
