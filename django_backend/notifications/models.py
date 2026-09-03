from django.db import models
from users.models import User


class Notification(models.Model):
    """
    In-app notification for partners about moderation results,
    and for admins/moderators about new pending submissions.
    """
    TYPE_CHOICES = (
        ('place_approved', 'Place Approved'),
        ('place_rejected', 'Place Rejected'),
        ('place_submitted', 'New Place Submitted'),
        ('system', 'System'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=30, choices=TYPE_CHOICES, default='system')

    # Localised titles and messages (fallback to _ru if others missing)
    title_uz = models.CharField(max_length=255, blank=True)
    title_ru = models.CharField(max_length=255)
    title_en = models.CharField(max_length=255, blank=True)

    message_uz = models.TextField(blank=True)
    message_ru = models.TextField()
    message_en = models.TextField(blank=True)

    # Optional link back to the related place
    related_place_id = models.IntegerField(null=True, blank=True)

    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = 'notifications'
        ordering = ['-created_at']
        verbose_name = 'Notification'
        verbose_name_plural = 'Notifications'

    def __str__(self):
        return f"[{self.notification_type}] → {self.user.username}: {self.title_ru}"


class ChatThread(models.Model):
    thread_id = models.CharField(max_length=100, unique=True)
    name = models.CharField(max_length=255)
    host_name = models.CharField(max_length=255, default='Ega / Host')
    space_title = models.CharField(max_length=255)
    color = models.CharField(max_length=50, default='#e46630')
    unread = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'notifications'
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.name} - {self.space_title}"


class ChatMessage(models.Model):
    thread = models.ForeignKey(ChatThread, on_delete=models.CASCADE, related_name='messages')
    sender = models.CharField(max_length=20, choices=(('guest', 'Guest'), ('host', 'Host')))
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = 'notifications'
        ordering = ['created_at']

    def __str__(self):
        return f"[{self.sender}] {self.text[:30]}"
