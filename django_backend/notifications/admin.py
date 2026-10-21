from django.contrib import admin
from .models import ChatMessage, ChatThread, Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'user', 'notification_type', 'title_ru', 'is_read',
        'related_place_id', 'related_booking_id', 'related_tariff_subscription_id', 'created_at',
    )
    list_filter = ('notification_type', 'is_read', 'created_at')
    search_fields = ('user__username', 'user__email', 'title_ru', 'message_ru', 'related_place_id')
    autocomplete_fields = ('user',)
    readonly_fields = ('created_at',)


class ChatMessageInline(admin.TabularInline):
    model = ChatMessage
    extra = 0
    readonly_fields = ('created_at',)
    fields = ('sender', 'text', 'created_at')


@admin.register(ChatThread)
class ChatThreadAdmin(admin.ModelAdmin):
    list_display = ('id', 'thread_id', 'place', 'guest', 'host', 'name', 'host_name', 'space_title', 'unread', 'updated_at', 'created_at')
    list_filter = ('unread', 'place', 'created_at', 'updated_at')
    search_fields = ('thread_id', 'name', 'host_name', 'space_title', 'guest__username', 'host__username', 'place__title')
    autocomplete_fields = ('place', 'guest', 'host')
    readonly_fields = ('created_at', 'updated_at')
    inlines = (ChatMessageInline,)


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'thread', 'sender', 'short_text', 'created_at')
    list_filter = ('sender', 'created_at')
    search_fields = ('thread__thread_id', 'thread__name', 'thread__space_title', 'text')
    autocomplete_fields = ('thread',)
    readonly_fields = ('created_at',)

    def short_text(self, obj):
        return obj.text[:80]
