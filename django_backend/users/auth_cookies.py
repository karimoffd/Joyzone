"""Refresh tokens travel in an httpOnly cookie, not in JSON/localStorage.

JavaScript (and therefore any XSS payload) can no longer read the long-lived
refresh token. The short-lived access token is still returned in the body.
"""

from django.conf import settings
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.utils import datetime_from_epoch


def _cookie_kwargs():
    return {
        'path': settings.JWT_REFRESH_COOKIE_PATH,
        'domain': settings.JWT_REFRESH_COOKIE_DOMAIN or None,
        'samesite': settings.JWT_REFRESH_COOKIE_SAMESITE,
    }


def get_refresh_from_request(request):
    """Prefer an explicit body value (API clients, tests), then the cookie."""
    body_value = request.data.get('refresh') if hasattr(request.data, 'get') else None
    return body_value or request.COOKIES.get(settings.JWT_REFRESH_COOKIE_NAME)


def set_refresh_cookie(response, refresh_token):
    """`refresh_token` is a RefreshToken or its encoded string."""
    if isinstance(refresh_token, str):
        refresh_token = RefreshToken(refresh_token, verify=False)
    expires_at = datetime_from_epoch(refresh_token['exp'])
    max_age = max(0, int((expires_at - timezone.now()).total_seconds()))
    response.set_cookie(
        settings.JWT_REFRESH_COOKIE_NAME,
        str(refresh_token),
        max_age=max_age,
        httponly=True,
        secure=settings.JWT_REFRESH_COOKIE_SECURE,
        **_cookie_kwargs(),
    )
    return response


def clear_refresh_cookie(response):
    response.delete_cookie(settings.JWT_REFRESH_COOKIE_NAME, **_cookie_kwargs())
    return response


def token_payload(refresh_token, access_token, **extra):
    """Response body for login/refresh. The refresh token stays out unless the
    deployment explicitly opts in for non-browser API clients."""
    data = {'access': str(access_token), **extra}
    if settings.JWT_REFRESH_IN_BODY:
        data['refresh'] = str(refresh_token)
    return data
