from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from django.utils import timezone
from .models import Place, Category, SubCategory, Review, ParameterGroup, Parameter, Discount
from .serializers import PlaceSerializer, CategoryWithSubsSerializer, SubCategorySerializer, ReviewSerializer, ParameterGroupSerializer, ParameterSerializer, DiscountSerializer
from notifications.models import Notification


# ─── Permission classes ────────────────────────────────────────────────────────

class IsAdminOrModerator(permissions.BasePermission):
    """Grants access only to users with admin/moderator role or Django staff/superuser."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.role in ('admin', 'moderator')
            or request.user.is_superuser
            or request.user.is_staff
        )


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

    def get_queryset(self):
        user = self.request.user
        # Admin / Moderator / Staff → see ALL places, filterable by status
        if user.is_authenticated and (
            user.role in ('admin', 'moderator')
            or user.is_superuser
            or user.is_staff
        ):
            status_filter = self.request.query_params.get('status')
            qs = Place.objects.all().select_related('owner', 'moderated_by', 'subcategory__category')
            if status_filter:
                qs = qs.filter(status=status_filter)
            return qs

        # Partners → only their OWN places
        if user.is_authenticated and user.role == 'partner':
            return Place.objects.filter(owner=user).select_related('subcategory__category')

        # Public → only approved places
        return Place.objects.filter(status='approved').select_related('subcategory__category')

    def get_permissions(self):
        if self.action in ('approve', 'reject'):
            return [IsAdminOrModerator()]
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
        if user.role not in ('admin', 'moderator') and not user.is_superuser and not user.is_staff:
            serializer.save(owner=user, status='pending')
        else:
            serializer.save(owner=user, status='pending')

        place = serializer.instance

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
        if instance.owner != user and not (
            user.role in ('admin', 'moderator') or user.is_superuser or user.is_staff
        ):
            raise PermissionDenied("You don't have permission to edit this listing.")

        # Re-send to moderation if partner edits their own place
        if instance.owner == user and user.role not in ('admin', 'moderator'):
            serializer.save(status='pending')
        else:
            serializer.save()

    def perform_destroy(self, instance):
        user = self.request.user
        # ── Security: only owner or admin can delete ──────────────────────────
        if instance.owner != user and not (
            user.role in ('admin', 'moderator') or user.is_superuser or user.is_staff
        ):
            raise PermissionDenied("You don't have permission to delete this listing.")
        instance.delete()

    # ── Moderation actions ────────────────────────────────────────────────────


    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def upload_image(self, request):
        if 'image' not in request.FILES:
            return Response({'error': 'No image file provided'}, status=400)
        
        image_file = request.FILES['image']
        
        import os
        from django.conf import settings
        from django.core.files.storage import FileSystemStorage
        
        # Ensure uploads directory exists
        uploads_dir = os.path.join(settings.MEDIA_ROOT, 'uploads')
        os.makedirs(uploads_dir, exist_ok=True)
        
        fs = FileSystemStorage(location=uploads_dir)
        filename = fs.save(image_file.name, image_file)
        file_url = request.build_absolute_uri(settings.MEDIA_URL + 'uploads/' + filename)
        
        return Response({'url': file_url})

    @action(detail=True, methods=['post'], permission_classes=[IsAdminOrModerator])

    def approve(self, request, pk=None):
        place = self.get_object()
        place.status = 'approved'
        place.moderator_note = request.data.get('note', '')
        place.moderated_by = request.user
        place.moderated_at = timezone.now()
        place.save()

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

    @action(detail=True, methods=['post'], permission_classes=[IsAdminOrModerator])
    def reject(self, request, pk=None):
        note = request.data.get('note', '').strip()
        if not note:
            raise ValidationError({'note': 'A rejection reason is required.'})

        place = self.get_object()
        place.status = 'rejected'
        place.moderator_note = note
        place.moderated_by = request.user
        place.moderated_at = timezone.now()
        place.save()

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
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        place_id = self.request.query_params.get('place_id')
        if place_id:
            return Review.objects.filter(place_id=place_id)
        return Review.objects.all()

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

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
