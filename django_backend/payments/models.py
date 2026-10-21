from django.conf import settings
from django.db import models
from django.utils import timezone


class Payment(models.Model):
    STATUS_CHOICES = (
        ('created', 'Created'),
        ('test_paid', 'Test paid'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    )

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='payments')
    booking = models.ForeignKey(
        'bookings.Booking',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='payments',
    )
    tariff_subscription = models.ForeignKey(
        'tariffs.TariffSubscription',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='payments',
    )
    provider = models.CharField(max_length=40, default='test')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=10, default='UZS')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='created')
    external_id = models.CharField(max_length=120, blank=True, default='')
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        self.updated_at = timezone.now()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.provider}:{self.status} {self.amount} {self.currency}"
