import re
from decimal import Decimal, InvalidOperation

from django.db.models import Avg, Count, Q
from rest_framework import serializers, viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from drf_spectacular.utils import OpenApiParameter, extend_schema, inline_serializer
from core.audit import create_audit_log
from django.utils import timezone
from core.permissions import IsAdminOrModerator, can_manage_owned_object, is_admin_or_moderator, is_partner
from .models import Place, Category, SubCategory, Review, ParameterGroup, Parameter, Discount, Favorite, PlaceModerationLog
from .serializers import PlaceSerializer, CategoryWithSubsSerializer, SubCategorySerializer, ReviewSerializer, ParameterGroupSerializer, ParameterSerializer, DiscountSerializer, FavoriteSerializer
from bookings.models import Booking
from notifications.models import Notification
from .uploads import ImageUploadError, save_place_image
from .visibility import publicly_visible_places


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _send_notification(user, notification_type, title_ru, message_ru,
                        title_uz='', message_uz='',
                        title_en='', message_en='',
                        related_place_id=None):
    """Create a Notification record for the given user."""
    Notification.objects.create(
        user=user,
        notification_type=notification_type,
        title_ru=title_ru,
        title_uz=title_uz or title_ru,
        title_en=title_en or title_ru,
        message_ru=message_ru,
        message_uz=message_uz or message_ru,
        message_en=message_en or message_ru,
        related_place_id=related_place_id,
    )


def _notify_all_admins(notification_type, title_ru, message_ru, related_place_id=None):
    """Send a notification to every admin/moderator/superuser."""
    from users.models import User
    admins = User.objects.filter(
        role__in=('admin', 'moderator')
    ) | User.objects.filter(is_superuser=True) | User.objects.filter(is_staff=True)
    for admin in admins.distinct():
        _send_notification(admin, notification_type, title_ru, message_ru,
                           related_place_id=related_place_id)


def _log_place_moderation(place, actor, action, from_status='', to_status='', note=''):
    PlaceModerationLog.objects.create(
        place=place,
        actor=actor if actor and actor.is_authenticated else None,
        action=action,
        from_status=from_status or '',
        to_status=to_status or '',
        note=note or '',
    )


def _parse_bool(value):
    if value is None:
        return None
    normalized = str(value).strip().lower()
    if normalized in ('1', 'true', 'yes', 'y', 'on'):
        return True
    if normalized in ('0', 'false', 'no', 'n', 'off'):
        return False
    return None


def _parse_decimal(value):
    if value is None or value == '':
        return None
    if isinstance(value, Decimal):
        return value
    if isinstance(value, (int, float)):
        return Decimal(str(value))

    text = str(value).strip()
    if not text:
        return None

    compact = text.replace(' ', '')
    try:
        if re.fullmatch(r'\d+(\.\d+)?', compact):
            return Decimal(compact)
    except InvalidOperation:
        return None

    digits = re.sub(r'\D', '', text)
    if not digits:
        return None
    try:
        return Decimal(digits)
    except InvalidOperation:
        return None


def _query_values(params, key, split_commas=True):
    values = []
    raw_values = params.getlist(key) + params.getlist(f'{key}[]')

    for raw in raw_values:
        if raw is None:
            continue
        parts = str(raw).split(',') if split_commas else [str(raw)]
        values.extend(part.strip() for part in parts if part.strip())

    return values


def _is_int_like(value):
    try:
        int(str(value).strip())
        return True
    except (TypeError, ValueError):
        return False


def _place_price_values(place):
    raw_values = []
    raw_values.extend([
        place.price_hourly,
        place.price_daily,
        place.price_weekly,
        place.price_monthly,
    ])
    if isinstance(place.prices, dict):
        raw_values.extend(place.prices.values())
    elif isinstance(place.prices, list):
        raw_values.extend(place.prices)
    raw_values.append(place.price)

    values = []
    for raw in raw_values:
        parsed = _parse_decimal(raw)
        if parsed is not None:
            values.append(parsed)
    return values


def _place_matches_price(place, min_price=None, max_price=None):
    prices = _place_price_values(place)
    if not prices:
        return False

    return any(
        (min_price is None or price >= min_price)
        and (max_price is None or price <= max_price)
        for price in prices
    )


def _place_matches_amenities(place, required_amenities):
    raw_amenities = place.amenities or []
    if isinstance(raw_amenities, str):
        place_amenities = {item.strip().lower() for item in raw_amenities.split(',') if item.strip()}
    elif isinstance(raw_amenities, list):
        place_amenities = {str(item).strip().lower() for item in raw_amenities if str(item).strip()}
    else:
        place_amenities = set()

    return all(amenity.lower() in place_amenities for amenity in required_amenities)


# ─── Category ViewSet (read for all, write for admins only) ──────────────────

class CategoryViewSet(viewsets.ModelViewSet):
    """
    GET  /api/categories/           → list all categories with subcategories (public)
    GET  /api/categories/{id}/      → single category with subcategories (public)
    POST /api/categories/           → create category (admin only)
    PUT  /api/categories/{id}/      → update category (admin only)
    DELETE /api/categories/{id}/    → delete category (admin only)
    """
    queryset = Category.objects.prefetch_related('subcategories').all()
    serializer_class = CategoryWithSubsSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [permissions.AllowAny()]
        return [IsAdminOrModerator()]


class SubCategoryViewSet(viewsets.ModelViewSet):
    """
    Full CRUD for subcategories.
    GET  /api/subcategories/         → list (public)
    POST /api/subcategories/         → create (admin only)
    PUT  /api/subcategories/{id}/    → update (admin only)
    DELETE /api/subcategories/{id}/  → delete (admin only)
    """
    queryset = SubCategory.objects.select_related('category').all()
    serializer_class = SubCategorySerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [permissions.AllowAny()]
        return [IsAdminOrModerator()]


# ─── Place ViewSet ────────────────────────────────────────────────────────────

class PlaceViewSet(viewsets.ModelViewSet):
    serializer_class = PlaceSerializer

    def _with_place_stats(self, qs):
        return qs.annotate(
            bookings_count=Count('bookings', distinct=True),
            reviews_count=Count('reviews', distinct=True),
            rating_avg=Avg('reviews__rating'),
        )

    def get_queryset(self):
        user = self.request.user
        # Admin / Moderator / Staff → see ALL places, filterable by status
        if is_admin_or_moderator(user):
            status_filter = self.request.query_params.get('status')
            owner_filter = self.request.query_params.get('owner')
            qs = Place.objects.all().select_related(
                'owner',
                'moderated_by',
                'subcategory__category'
            ).prefetch_related('discounts', 'moderation_logs__actor')
            qs = self._with_place_stats(qs)
            if owner_filter:
                qs = qs.filter(owner_id=owner_filter)
            if status_filter:
                qs = qs.filter(status=status_filter)
            return self._apply_place_filters(qs)

        # Partners → only their OWN places
        if user.is_authenticated and is_partner(user):
            qs = Place.objects.filter(owner=user).select_related(
                'owner',
                'moderated_by',
                'subcategory__category'
            ).prefetch_related('discounts', 'moderation_logs__actor')
            qs = self._with_place_stats(qs)
            return self._apply_place_filters(qs)

        # Public → only approved places
        qs = publicly_visible_places().select_related(
            'owner',
            'moderated_by',
            'subcategory__category'
        ).prefetch_related('discounts', 'moderation_logs__actor')
        qs = self._with_place_stats(qs)
        return self._apply_place_filters(qs)

    def _apply_place_filters(self, qs):
        params = self.request.query_params

        search = (params.get('search') or '').strip()
        if search:
            qs = qs.filter(
                Q(title__icontains=search)
                | Q(location__icontains=search)
                | Q(description_ru__icontains=search)
                | Q(description_uz__icontains=search)
            )

        category = (params.get('category') or '').strip()
        if category:
            if _is_int_like(category):
                qs = qs.filter(subcategory__category_id=int(category))
            else:
                qs = qs.filter(subcategory__category__slug__iexact=category)

        subcategory = (params.get('subcategory') or '').strip()
        if subcategory:
            if _is_int_like(subcategory):
                qs = qs.filter(subcategory_id=int(subcategory))
            else:
                qs = qs.filter(subcategory__slug__iexact=subcategory)

        locations = _query_values(params, 'location', split_commas=False)
        if locations:
            location_q = Q()
            for location in locations:
                location_q |= Q(location__icontains=location)
            qs = qs.filter(location_q)

        min_people = params.get('min_people') or params.get('people')
        if min_people and _is_int_like(min_people):
            qs = qs.filter(people__gte=int(min_people))

        promoted = _parse_bool(params.get('promoted'))
        if promoted is not None:
            qs = qs.filter(promoted=promoted)

        amenities = _query_values(params, 'amenities')
        if amenities:
            matching_ids = [
                place.pk for place in qs
                if _place_matches_amenities(place, amenities)
            ]
            qs = qs.filter(pk__in=matching_ids)

        min_price = _parse_decimal(params.get('min_price'))
        max_price = _parse_decimal(params.get('max_price'))
        if min_price is not None or max_price is not None:
            matching_ids = [
                place.pk for place in qs
                if _place_matches_price(place, min_price=min_price, max_price=max_price)
            ]
            qs = qs.filter(pk__in=matching_ids)

        return qs.distinct()

    def get_permissions(self):
        if self.action in ('approve', 'reject'):
            return [IsAdminOrModerator()]
        if self.action == 'upload_image':
            return [permissions.IsAuthenticated()]
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def perform_create(self, serializer):
        user = self.request.user

        # ── Security: tariff limit check ──────────────────────────────────────
        if hasattr(user, 'can_add_place') and not user.can_add_place:
            raise PermissionDenied(
                f"Tariff limit reached. Your plan allows {user.max_places_allowed} "
                "active listing(s). Please upgrade your tariff."
            )

        # ── Security: partners can only create places for themselves ──────────
        if not is_admin_or_moderator(user):
            serializer.save(owner=user, status='pending')
        else:
            serializer.save(owner=user, status='pending')

        place = serializer.instance
        create_audit_log(
            actor=user,
            action='place.created',
            object_type='Place',
            object_id=place.id,
            metadata={
                'title': place.title,
                'owner_id': place.owner_id,
                'status': place.status,
            },
        )
        _log_place_moderation(
            place=place,
            actor=user,
            action='submitted',
            from_status='',
            to_status=place.status,
        )

        # ── Notify all admins/moderators of new submission ────────────────────
        _notify_all_admins(
            notification_type='place_submitted',
            title_ru=f'Новое объявление на проверку: «{place.title}»',
            message_ru=(
                f'Партнёр {user.get_full_name() or user.username} добавил новый объект '
                f'«{place.title}» ({place.location}). Пожалуйста, проверьте его в разделе Модерация.'
            ),
            related_place_id=place.id,
        )

    def perform_update(self, serializer):
        user = self.request.user
        instance = self.get_object()

        # ── Security: only owner or admin can update ──────────────────────────
        if not can_manage_owned_object(user, instance):
            raise PermissionDenied("You don't have permission to edit this listing.")

        # Re-send to moderation if partner edits their own place.
        if instance.owner == user and not is_admin_or_moderator(user):
            previous_status = instance.status
            serializer.save(
                status='pending',
                moderator_note='',
                moderated_by=None,
                moderated_at=None,
            )
            place = serializer.instance
            create_audit_log(
                actor=user,
                action='place.updated',
                object_type='Place',
                object_id=place.id,
                metadata={
                    'title': place.title,
                    'owner_id': place.owner_id,
                    'previous_status': previous_status,
                    'status': place.status,
                    'changed_fields': list(serializer.validated_data.keys()),
                },
            )
            if previous_status != 'pending':
                _log_place_moderation(
                    place=place,
                    actor=user,
                    action='resubmitted',
                    from_status=previous_status,
                    to_status='pending',
                    note='Edited by owner and returned to moderation.',
                )
                _notify_all_admins(
                    notification_type='place_submitted',
                    title_ru=f'Объявление снова на проверке: «{place.title}»',
                    message_ru=(
                        f'Партнёр {user.get_full_name() or user.username} обновил объект '
                        f'«{place.title}» ({place.location}). Проверьте изменения в разделе Модерация.'
                    ),
                    related_place_id=place.id,
                )
        else:
            serializer.save()
            place = serializer.instance
            create_audit_log(
                actor=user,
                action='place.updated',
                object_type='Place',
                object_id=place.id,
                metadata={
                    'title': place.title,
                    'owner_id': place.owner_id,
                    'status': place.status,
                    'changed_fields': list(serializer.validated_data.keys()),
                },
            )

    def perform_destroy(self, instance):
        user = self.request.user
        # ── Security: only owner or admin can delete ──────────────────────────
        if not can_manage_owned_object(user, instance):
            raise PermissionDenied("You don't have permission to delete this listing.")
        create_audit_log(
            actor=user,
            action='place.deleted',
            object_type='Place',
            object_id=instance.id,
            metadata={
                'title': instance.title,
                'owner_id': instance.owner_id,
                'status': instance.status,
            },
        )
        instance.delete()

    # ── Moderation actions ────────────────────────────────────────────────────


    @extend_schema(
        request=inline_serializer(
            name='PlaceImageUploadRequest',
            fields={'image': serializers.ImageField()},
        ),
        responses=inline_serializer(
            name='PlaceImageUploadResponse',
            fields={'url': serializers.URLField()},
        ),
        tags=['places'],
    )
    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def upload_image(self, request):
        if 'image' not in request.FILES:
            return Response({'error': 'No image file provided'}, status=400)

        try:
            file_url = save_place_image(request.FILES['image'])
        except ImageUploadError as exc:
            return Response(
                {'image': str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response({'url': request.build_absolute_uri(file_url)})

    @extend_schema(
        request=inline_serializer(
            name='PlaceApproveRequest',
            fields={'note': serializers.CharField(required=False, allow_blank=True)},
        ),
        responses=inline_serializer(
            name='PlaceApproveResponse',
            fields={'status': serializers.CharField(), 'id': serializers.IntegerField()},
        ),
        tags=['places'],
    )
    @action(detail=True, methods=['post'], permission_classes=[IsAdminOrModerator])
    def approve(self, request, pk=None):
        place = self.get_object()
        previous_status = place.status
        note = request.data.get('note', '')
        place.status = 'approved'
        place.moderator_note = note
        place.moderated_by = request.user
        place.moderated_at = timezone.now()
        place.save()
        _log_place_moderation(
            place=place,
            actor=request.user,
            action='approved',
            from_status=previous_status,
            to_status='approved',
            note=note,
        )
        create_audit_log(
            actor=request.user,
            action='place.approved',
            object_type='Place',
            object_id=place.id,
            metadata={
                'title': place.title,
                'owner_id': place.owner_id,
                'previous_status': previous_status,
                'status': place.status,
                'note': note,
            },
        )

        # Notify the place owner
        if place.owner:
            _send_notification(
                user=place.owner,
                notification_type='place_approved',
                title_ru='Ваше объявление одобрено! ✅',
                title_uz='Eloningiz tasdiqlandi! ✅',
                title_en='Your listing is approved! ✅',
                message_ru=(
                    f'Поздравляем! Объект «{place.title}» успешно прошёл модерацию '
                    'и теперь опубликован на сайте Joyzone.'
                ),
                message_uz=(
                    f'Tabriklaymiz! «{place.title}» ob\'ekti muvaffaqiyatli tekshirildi '
                    'va Joyzone saytida e\'lon qilindi.'
                ),
                message_en=(
                    f'Congratulations! Your listing «{place.title}» has passed moderation '
                    'and is now live on Joyzone.'
                ),
                related_place_id=place.id,
            )

        return Response({'status': 'approved', 'id': place.id})

    @extend_schema(
        request=inline_serializer(
            name='PlaceRejectRequest',
            fields={'note': serializers.CharField()},
        ),
        responses=inline_serializer(
            name='PlaceRejectResponse',
            fields={'status': serializers.CharField(), 'id': serializers.IntegerField()},
        ),
        tags=['places'],
    )
    @action(detail=True, methods=['post'], permission_classes=[IsAdminOrModerator])
    def reject(self, request, pk=None):
        note = request.data.get('note', '').strip()
        if not note:
            raise ValidationError({'note': 'A rejection reason is required.'})

        place = self.get_object()
        previous_status = place.status
        place.status = 'rejected'
        place.moderator_note = note
        place.moderated_by = request.user
        place.moderated_at = timezone.now()
        place.save()
        _log_place_moderation(
            place=place,
            actor=request.user,
            action='rejected',
            from_status=previous_status,
            to_status='rejected',
            note=note,
        )
        create_audit_log(
            actor=request.user,
            action='place.rejected',
            object_type='Place',
            object_id=place.id,
            metadata={
                'title': place.title,
                'owner_id': place.owner_id,
                'previous_status': previous_status,
                'status': place.status,
                'note': note,
            },
        )

        # Notify the place owner with reason
        if place.owner:
            _send_notification(
                user=place.owner,
                notification_type='place_rejected',
                title_ru='Объявление отклонено ❌',
                title_uz='Elon rad etildi ❌',
                title_en='Listing rejected ❌',
                message_ru=(
                    f'К сожалению, объект «{place.title}» не прошёл модерацию.\n'
                    f'Причина: {note}\n\n'
                    'Вы можете исправить проблемы и подать объявление повторно.'
                ),
                message_uz=(
                    f'Afsuski, «{place.title}» ob\'ekti tekshirishdan o\'tmadi.\n'
                    f'Sababi: {note}\n\n'
                    'Muammolarni tuzatib, e\'lonni qayta topshirishingiz mumkin.'
                ),
                message_en=(
                    f'Unfortunately, your listing «{place.title}» was rejected.\n'
                    f'Reason: {note}\n\n'
                    'You may fix the issues and resubmit.'
                ),
                related_place_id=place.id,
            )

        return Response({'status': 'rejected', 'id': place.id})

# ─── Review ViewSet ────────────────────────────────────────────────────────────

class ReviewViewSet(viewsets.ModelViewSet):
    serializer_class = ReviewSerializer

    def get_queryset(self):
        qs = Review.objects.select_related('user', 'place').all()

        place_id = self.request.query_params.get('place') or self.request.query_params.get('place_id')
        if place_id:
            if not _is_int_like(place_id):
                raise ValidationError({'place': 'A valid numeric place id is required.'})
            qs = qs.filter(place_id=place_id)

        user_id = self.request.query_params.get('user') or self.request.query_params.get('user_id')
        if user_id:
            if not _is_int_like(user_id):
                raise ValidationError({'user': 'A valid numeric user id is required.'})
            qs = qs.filter(user_id=user_id)

        return qs

    def get_permissions(self):
        if self.action in ('list', 'retrieve', 'space_reviews'):
            return [permissions.AllowAny()]
        if self.action in ('create', 'eligibility'):
            return [permissions.IsAuthenticated()]
        return [IsAdminOrModerator()]

    def perform_create(self, serializer):
        place = serializer.validated_data.get('place')
        if not place:
            raise ValidationError({'place': 'Place is required.'})

        if not is_admin_or_moderator(self.request.user):
            has_booking = Booking.objects.filter(
                client=self.request.user,
                place=place,
                status__in=('confirmed', 'completed'),
            ).exists()
            if not has_booking:
                raise ValidationError({
                    'place': 'Отзыв можно оставить только после подтверждённого или завершённого бронирования этого места.'
                })

        serializer.save(user=self.request.user)

    @extend_schema(
        parameters=[OpenApiParameter('place', int, OpenApiParameter.QUERY, required=True)],
        responses=inline_serializer(
            name='ReviewEligibilityResponse',
            fields={
                'allowed': serializers.BooleanField(),
                'reason': serializers.CharField(allow_blank=True),
            },
        ),
        tags=['reviews'],
    )
    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def eligibility(self, request):
        place_id = request.query_params.get('place') or request.query_params.get('place_id')
        if not place_id:
            raise ValidationError({'place': 'Query param "place" is required.'})

        try:
            place = Place.objects.get(pk=place_id)
        except (Place.DoesNotExist, ValueError):
            return Response({'detail': 'Place not found.'}, status=status.HTTP_404_NOT_FOUND)

        allowed = is_admin_or_moderator(request.user) or Booking.objects.filter(
            client=request.user,
            place=place,
            status__in=('confirmed', 'completed'),
        ).exists()
        reason = '' if allowed else (
            'Отзыв можно оставить после подтверждённого или завершённого бронирования этого места.'
        )
        return Response({'allowed': allowed, 'reason': reason})

    @extend_schema(
        parameters=[OpenApiParameter('space_id', int, OpenApiParameter.PATH)],
        responses=ReviewSerializer(many=True),
        tags=['reviews'],
    )
    @action(detail=False, methods=['get'], url_path='space/(?P<space_id>[^/.]+)')
    def space_reviews(self, request, space_id=None):
        reviews = self.get_queryset().filter(place_id=space_id)
        serializer = self.get_serializer(reviews, many=True)
        return Response(serializer.data)

# ─── Parameter ViewSets ──────────────────────────────────────────────────────

class ParameterGroupViewSet(viewsets.ModelViewSet):
    queryset = ParameterGroup.objects.prefetch_related('parameters').all()
    serializer_class = ParameterGroupSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [permissions.AllowAny()]
        return [IsAdminOrModerator()]


class ParameterViewSet(viewsets.ModelViewSet):
    queryset = Parameter.objects.select_related('group').all()
    serializer_class = ParameterSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [permissions.AllowAny()]
        return [IsAdminOrModerator()]


class DiscountViewSet(viewsets.ModelViewSet):
    queryset = Discount.objects.all()
    serializer_class = DiscountSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [permissions.AllowAny()]
        return [IsAdminOrModerator()]


def _favorite_identity(request, token=None):
    """Use account ownership when available, otherwise a browser-scoped guest token."""
    if request.user.is_authenticated:
        return {'user': request.user}
    normalized_token = str(token or '').strip()
    if not normalized_token:
        raise ValidationError({'token': 'Anonymous favorites require a guest token.'})
    return {'user_token': normalized_token}


@extend_schema(
    parameters=[OpenApiParameter('token', str, OpenApiParameter.QUERY, description='Anonymous favorites token.')],
    responses=FavoriteSerializer(many=True),
    tags=['favorites'],
)
@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def favorite_list(request):
    token = request.query_params.get('token')
    favs = Favorite.objects.filter(**_favorite_identity(request, token)).select_related('place')
    serializer = FavoriteSerializer(favs, many=True)
    return Response(serializer.data)


@extend_schema(
    request=inline_serializer(
        name='FavoriteToggleRequest',
        fields={
            'place_id': serializers.IntegerField(),
            'token': serializers.CharField(required=False, allow_blank=True),
        },
    ),
    responses=inline_serializer(
        name='FavoriteToggleResponse',
        fields={
            'favorited': serializers.BooleanField(),
            'favorites': FavoriteSerializer(many=True),
        },
    ),
    tags=['favorites'],
)
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def favorite_toggle(request):
    place_id = request.data.get('place_id')
    token = request.data.get('token')

    if not place_id:
        return Response({'error': 'place_id is required'}, status=400)

    try:
        place = Place.objects.get(pk=place_id)
    except Place.DoesNotExist:
        return Response({'error': 'Place not found'}, status=404)

    fav, created = Favorite.objects.get_or_create(place=place, **_favorite_identity(request, token))
    if not created:
        fav.delete()
        is_fav = False
    else:
        is_fav = True

    favs = Favorite.objects.filter(**_favorite_identity(request, token)).select_related('place')
    serializer = FavoriteSerializer(favs, many=True)
    return Response({'favorited': is_fav, 'favorites': serializer.data})


@extend_schema(
    request=inline_serializer(
        name='FavoriteMergeRequest',
        fields={'token': serializers.CharField(required=False, allow_blank=True)},
    ),
    responses=inline_serializer(
        name='FavoriteMergeResponse',
        fields={
            'merged': serializers.IntegerField(),
            'favorites': FavoriteSerializer(many=True),
        },
    ),
    tags=['favorites'],
)
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def favorite_merge(request):
    token = request.data.get('token') or request.query_params.get('token')
    if not token:
        return Response({'merged': 0, 'favorites': FavoriteSerializer(
            Favorite.objects.filter(user=request.user).select_related('place'),
            many=True,
        ).data})

    anonymous_favorites = Favorite.objects.filter(
        user__isnull=True,
        user_token=token,
    ).select_related('place')

    merged_count = 0
    for favorite in anonymous_favorites:
        _, created = Favorite.objects.get_or_create(
            user=request.user,
            place=favorite.place,
            defaults={'user_token': None},
        )
        if created:
            merged_count += 1
        favorite.delete()

    favorites = Favorite.objects.filter(user=request.user).select_related('place')
    serializer = FavoriteSerializer(favorites, many=True)
    return Response({'merged': merged_count, 'favorites': serializer.data})
