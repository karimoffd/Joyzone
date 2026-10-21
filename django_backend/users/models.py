from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone

class User(AbstractUser):
    ROLE_CHOICES = (
        ('client', 'Client'),
        ('partner', 'Partner (Club Owner)'),
        ('moderator', 'Moderator'),
        ('admin', 'Admin'),
    )

    phone_number = models.CharField(max_length=20, blank=True, null=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='client')
    avatar = models.TextField(blank=True, null=True)

    # Tariff info
    tariff = models.ForeignKey(
        'tariffs.TariffPlan',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='users'
    )
    tariff_expires_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.username

    @property
    def active_tariff(self):
        if self.tariff and (self.tariff.is_free or (self.tariff_expires_at and self.tariff_expires_at > timezone.now())):
            return self.tariff
        return None

    @property
    def max_places_allowed(self):
        t = self.active_tariff
        if t:
            return t.max_places
        # Default: free Standard = 1 place
        return 1

    @property
    def can_add_place(self):
        active_places = self.places.filter(status__in=['pending', 'approved']).count()
        return active_places < self.max_places_allowed


class OTPVerification(models.Model):
    phone_number = models.CharField(max_length=20)
    # HMAC-SHA256 of the code (see users.views.hash_otp_code), never plaintext.
    otp_code = models.CharField(max_length=64)
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.phone_number} ({self.created_at:%Y-%m-%d %H:%M})"
