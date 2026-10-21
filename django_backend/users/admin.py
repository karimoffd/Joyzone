from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.html import format_html
from .models import User


class CustomUserAdmin(UserAdmin):
    list_display = (
        'username',
        'email',
        'first_name',
        'last_name',
        'role',
        'phone_number',
        'balance',
        'tariff',
        'tariff_expires_at',
        'has_avatar',
        'is_staff',
    )
    list_filter = UserAdmin.list_filter + ('role', 'tariff')
    search_fields = UserAdmin.search_fields + ('phone_number',)
    autocomplete_fields = ('tariff',)
    readonly_fields = ('avatar_preview',)
    fieldsets = UserAdmin.fieldsets + (
        ('Joyzone profile', {
            'fields': (
                'phone_number',
                'role',
                'balance',
                'tariff',
                'tariff_expires_at',
                'avatar',
                'avatar_preview',
            )
        }),
    )

    def has_avatar(self, obj):
        return bool(obj.avatar)
    has_avatar.boolean = True
    has_avatar.short_description = 'avatar'

    def avatar_preview(self, obj):
        if not obj or not obj.avatar:
            return '-'
        if str(obj.avatar).startswith('data:image'):
            return format_html('<img src="{}" style="max-width: 120px; max-height: 120px; border-radius: 8px;" />', obj.avatar)
        return 'Stored'
    avatar_preview.short_description = 'avatar preview'


admin.site.register(User, CustomUserAdmin)
