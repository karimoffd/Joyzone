from django.contrib import admin

from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('created_at', 'actor', 'action', 'object_type', 'object_id')
    list_filter = ('action', 'object_type', 'created_at')
    search_fields = ('action', 'object_type', 'object_id', 'actor__username', 'actor__phone_number')
    readonly_fields = ('actor', 'action', 'object_type', 'object_id', 'metadata', 'created_at')
    ordering = ('-created_at',)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
