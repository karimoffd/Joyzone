from rest_framework import serializers
from .models import Booking
from places.serializers import PlaceSerializer

class BookingSerializer(serializers.ModelSerializer):
    place_details = PlaceSerializer(source='place', read_only=True)
    
    class Meta:
        model = Booking
        fields = '__all__'
        read_only_fields = ('client', 'status')
