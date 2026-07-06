from django.db import models
from users.models import User

class Place(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='places', null=True, blank=True)
    title = models.CharField(max_length=255)
    category = models.CharField(max_length=100)
    location = models.CharField(max_length=255)
    price = models.CharField(max_length=100)
    area = models.IntegerField()
    people = models.IntegerField()
    promoted = models.BooleanField(default=False)
    images = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title
