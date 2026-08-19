from django.db import models


class TariffPlan(models.Model):
    SLUG_CHOICES = (
        ('standard', 'Standard'),
        ('comfort', 'Comfort'),
        ('premium', 'Premium'),
    )

    slug = models.CharField(max_length=50, unique=True, choices=SLUG_CHOICES, default='standard')
    name = models.CharField(max_length=100)
    name_ru = models.CharField(max_length=100, blank=True)
    name_en = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    description_ru = models.TextField(blank=True)
    description_en = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    duration_days = models.IntegerField(default=30)
    max_places = models.IntegerField(default=1)
    is_free = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    # Features list stored as JSON array of strings
    features = models.JSONField(default=list)
    features_ru = models.JSONField(default=list, blank=True)
    features_en = models.JSONField(default=list, blank=True)
    sort_order = models.IntegerField(default=0)

    class Meta:
        ordering = ['sort_order', 'price']

    def save(self, *args, **kwargs):
        self.is_free = (self.price == 0)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.max_places} places)"


class TariffSubscription(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('active', 'Active'),
        ('expired', 'Expired'),
        ('cancelled', 'Cancelled'),
    )

    partner = models.ForeignKey(
        'users.User', on_delete=models.CASCADE, related_name='tariff_subscriptions'
    )
    tariff = models.ForeignKey(TariffPlan, on_delete=models.SET_NULL, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    start_date = models.DateTimeField(auto_now_add=True)
    end_date = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.partner.username} → {self.tariff.name if self.tariff else '?'} [{self.status}]"


# Keep old model for backwards compat
class PartnerTariff(models.Model):
    name = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    duration_days = models.IntegerField(default=30)

    def __str__(self):
        return self.name


class PartnerSubscription(models.Model):
    partner = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='subscriptions')
    tariff = models.ForeignKey(PartnerTariff, on_delete=models.SET_NULL, null=True)
    start_date = models.DateTimeField(auto_now_add=True)
    end_date = models.DateTimeField()
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.partner.username} - {self.tariff.name if self.tariff else 'Custom'}"
