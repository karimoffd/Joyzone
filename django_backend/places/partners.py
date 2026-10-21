"""Public partner profiles ("Joyzone hamkorlari" block and /agent-<id> page).

Only partners with at least one approved place are public. Phone numbers and
usernames are never exposed here.
"""

from django.contrib.auth import get_user_model
from django.db.models import Avg, Count, Q
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import permissions, serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Review
from .serializers import PlaceSerializer, ReviewSerializer
from .visibility import PUBLIC_PLACE_STATUS, publicly_visible_places

User = get_user_model()

APPROVED_PLACES = Q(places__status=PUBLIC_PLACE_STATUS)


def public_partners():
    return (
        User.objects.filter(role='partner', is_active=True)
        .annotate(
            places_count=Count('places', filter=APPROVED_PLACES, distinct=True),
            reviews_count=Count('places__reviews', filter=APPROVED_PLACES, distinct=True),
            rating_avg=Avg('places__reviews__rating', filter=APPROVED_PLACES),
        )
        .filter(places_count__gt=0)
        .order_by('-is_featured_partner', '-places_count', 'id')
    )


class PublicPartnerSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.SerializerMethodField()
    bio = serializers.CharField(source='partner_bio')
    avatar = serializers.CharField(allow_null=True)
    is_featured = serializers.BooleanField(source='is_featured_partner')
    places_count = serializers.IntegerField()
    reviews_count = serializers.IntegerField()
    rating_avg = serializers.SerializerMethodField()
    city = serializers.SerializerMethodField()
    cover_image = serializers.SerializerMethodField()

    def get_name(self, user):
        return user.company_name or user.get_full_name() or 'Joyzone hamkori'

    def get_rating_avg(self, user):
        return round(float(user.rating_avg), 1) if user.rating_avg is not None else 0

    def _latest_place(self, user):
        if not hasattr(user, '_latest_public_place'):
            user._latest_public_place = publicly_visible_places(user.places.all()).order_by('-created_at').first()
        return user._latest_public_place

    def get_city(self, user):
        place = self._latest_place(user)
        return place.location if place else ''

    def get_cover_image(self, user):
        place = self._latest_place(user)
        images = place.images if place and isinstance(place.images, list) else []
        return images[0] if images else None


class PartnerListView(APIView):
    permission_classes = (permissions.AllowAny,)

    @extend_schema(responses=PublicPartnerSerializer(many=True), tags=['partners'])
    def get(self, request):
        try:
            limit = max(1, min(int(request.query_params.get('limit', 12)), 50))
        except ValueError:
            limit = 12
        partners = public_partners()[:limit]
        return Response(PublicPartnerSerializer(partners, many=True).data)


class PartnerDetailView(APIView):
    permission_classes = (permissions.AllowAny,)

    @extend_schema(responses=PublicPartnerSerializer, tags=['partners'])
    def get(self, request, pk):
        partner = get_object_or_404(public_partners(), pk=pk)
        places = publicly_visible_places(partner.places.all()).order_by('-promoted', '-created_at')
        reviews = (
            Review.objects.filter(place__in=places)
            .select_related('user', 'place')
            .order_by('-created_at')[:10]
        )
        data = PublicPartnerSerializer(partner).data
        data['places'] = PlaceSerializer(places, many=True, context={'request': request}).data
        data['reviews'] = ReviewSerializer(reviews, many=True).data
        return Response(data)
