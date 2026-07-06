from django.db import models
from users.models import User
from places.models import Place

class Booking(models.Model):
    client = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bookings')
    place = models.ForeignKey(Place, on_delete=models.CASCADE, related_name='bookings')
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    status = models.CharField(max_length=20, default='pending')

    def __str__(self):
        return f"{self.client.username} - {self.place.name}"
