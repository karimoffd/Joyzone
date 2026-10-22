from rest_framework import permissions


ROLE_CLIENT = 'client'
ROLE_PARTNER = 'partner'
ROLE_MODERATOR = 'moderator'
ROLE_ADMIN = 'admin'

ADMIN_ROLES = (ROLE_ADMIN,)
MODERATION_ROLES = (ROLE_ADMIN, ROLE_MODERATOR)


def is_authenticated_user(user):
    return bool(user and user.is_authenticated)


def has_role(user, *roles):
    return is_authenticated_user(user) and getattr(user, 'role', None) in roles


def is_client(user):
    return has_role(user, ROLE_CLIENT)


def is_partner(user):
    return has_role(user, ROLE_PARTNER)


def is_moderator(user):
    return has_role(user, ROLE_MODERATOR)


def is_admin_user(user):
    """Project admin: admin role, Django staff, or superuser."""
    return bool(
        is_authenticated_user(user)
        and (
            getattr(user, 'role', None) == ROLE_ADMIN
            or user.is_superuser
            or user.is_staff
        )
    )


def is_admin_or_moderator(user):
    """Project moderation/admin access: admin/moderator role, staff, or superuser."""
    return bool(
        is_authenticated_user(user)
        and (
            getattr(user, 'role', None) in MODERATION_ROLES
            or user.is_superuser
            or user.is_staff
        )
    )


def owns_object(user, obj, owner_attr='owner'):
    if not is_authenticated_user(user) or obj is None:
        return False
    owner = getattr(obj, owner_attr, None)
    owner_id = getattr(obj, f'{owner_attr}_id', None)
    return owner == user or owner_id == user.id


def can_manage_owned_object(user, obj, owner_attr='owner'):
    return is_admin_or_moderator(user) or owns_object(user, obj, owner_attr=owner_attr)


class IsAdminOrModerator(permissions.BasePermission):
    """Allow only admin/moderator role users, Django staff, or superusers."""

    def has_permission(self, request, view):
        return is_admin_or_moderator(request.user)


class IsAdminUserRole(permissions.BasePermission):
    """Allow project admins, Django staff, or superusers."""

    def has_permission(self, request, view):
        return is_admin_user(request.user)


# Admin panel sections each role may open. The frontend builds its menu from
# this list (profile.admin_sections) and the API enforces the same split.
MODERATOR_ADMIN_SECTIONS = (
    'overview', 'moderation', 'spaces', 'bookings', 'messages', 'reviews',
    'content', 'banners', 'settings',
)
ADMIN_ONLY_SECTIONS = (
    'users', 'finance', 'audit', 'tariffs', 'categories', 'amenities',
    'parameters', 'discounts',
)


def admin_sections_for(user):
    if is_admin_user(user):
        return [*MODERATOR_ADMIN_SECTIONS, *ADMIN_ONLY_SECTIONS]
    if is_admin_or_moderator(user):
        return list(MODERATOR_ADMIN_SECTIONS)
    return []
