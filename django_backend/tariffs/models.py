from django.db import models
from users.models import User

class PartnerTariff(models.Model):
    name = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    duration_days = models.IntegerField(default=30)
    
    def __str__(self):
        return self.name

class PartnerSubscription(models.Model):
    partner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='subscriptions')
    tariff = models.ForeignKey(PartnerTariff, on_delete=models.SET_NULL, null=True)
    start_date = models.DateTimeField(auto_now_add=True)
    end_date = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    
    def __str__(self):
        return f"{self.partner.username} - {self.tariff.name if self.tariff else 'Custom'}"
