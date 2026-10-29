"""Public partner profiles ("Top agentlar" block and /agent-<id> page).

Only partners with at least one approved place are public. Phone numbers and
usernames are never exposed here.
"""

from django.contrib.auth import get_user_model
from django.db.models import Avg, Case, Count, DecimalField, F, Q, Value, When
from django.utils import timezone
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


def _active_tariff_q(now):
    return Q(tariff__isnull=False) & (Q(tariff_expires_at__isnull=True) | Q(tariff_expires_at__gt=now))


def has_active_paid_tariff(user, now=None):
    tariff = getattr(user, 'tariff', None)
    if tariff is None or tariff.is_free:
        return False
    expires = user.tariff_expires_at
    return expires is None or expires > (now or timezone.now())


def public_partners():
    """Top agents first: featured, then by active paid tariff, then by catalogue size."""
    now = timezone.now()
    return (
        User.objects.filter(role='partner', is_active=True)
        .select_related('tariff')
        .annotate(
            places_count=Count('places', filter=APPROVED_PLACES, distinct=True),
            reviews_count=Count('places__reviews', filter=APPROVED_PLACES, distinct=True),
            rating_avg=Avg('places__reviews__rating', filter=APPROVED_PLACES),
            tariff_rank=Case(
                When(_active_tariff_q(now), then=F('tariff__price')),
                default=Value(0),
                output_field=DecimalField(max_digits=10, decimal_places=2),
            ),
        )
        .filter(places_count__gt=0)
        .order_by('-is_featured_partner', '-tariff_rank', '-places_count', 'id')
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
    # Active paid tariff ({slug, name}) or null — drives the badge on the card.
    tariff = serializers.SerializerMethodField()

    def get_name(self, user):
        return user.company_name or user.get_full_name() or 'Joyzone hamkori'

    def get_tariff(self, user):
        if not has_active_paid_tariff(user):
            return None
        tariff = user.tariff
        return {'slug': tariff.slug, 'name': tariff.name, 'name_ru': tariff.name_ru or tariff.name}

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
        if request.query_params.get('home'):
            return Response(home_partners())
        partners = public_partners()[:limit]
        return Response(PublicPartnerSerializer(partners, many=True).data)


HOME_PARTNERS_LIMIT = 8
HOME_PARTNER_AD_SLOTS = 2  # ads lead the slider


def home_partners():
    """Home "Top agentlar" slider: 8 partners, the first two of them ads.

    Featured partners and partners on an active paid tariff are the ad pool;
    both the ads and the rest are picked at random on every request.
    """
    now = timezone.now()
    base = public_partners()
    ad_q = Q(is_featured_partner=True) | (_active_tariff_q(now) & Q(tariff__is_free=False))
    ads = list(base.filter(ad_q).order_by('?')[:HOME_PARTNER_AD_SLOTS])
    rest = list(
        base.exclude(pk__in=[partner.pk for partner in ads])
        .order_by('?')[:HOME_PARTNERS_LIMIT - len(ads)]
    )
    data = PublicPartnerSerializer(ads + rest, many=True).data
    for index, item in enumerate(data):
        item['is_ad'] = index < len(ads)
    return data


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
