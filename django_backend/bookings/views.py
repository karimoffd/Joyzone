from rest_framework import viewsets, permissions
from .models import Booking
from .serializers import BookingSerializer

class BookingViewSet(viewsets.ModelViewSet):
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Booking.objects.none()
        
        # Admin sees all bookings
        if user.role in ('admin', 'moderator') or user.is_superuser:
            return Booking.objects.all().order_by('-start_time')
            
        # Partner sees bookings for their places
        if user.role == 'partner':
            return Booking.objects.filter(place__owner=user).order_by('-start_time')
            
        # Client sees their own bookings
        return Booking.objects.filter(client=user).order_by('-start_time')

    def perform_create(self, serializer):
        serializer.save(client=self.request.user)
