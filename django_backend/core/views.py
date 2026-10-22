from datetime import timedelta
from django.contrib.auth import get_user_model
from django.db.models import Avg, Count, Q, Sum
from django.utils.dateparse import parse_date
from django.utils import timezone
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import OpenApiParameter, extend_schema, inline_serializer

from bookings.models import Booking
from core.permissions import IsAdminOrModerator, IsAdminUserRole, is_admin_user
from core.serializers import AuditLogSerializer
from payments.models import Payment
from places.models import Place, Review
from .models import AuditLog


def _sum_amount(queryset):
    return queryset.aggregate(total=Sum('amount'))['total'] or 0


def _user_label(user):
    if not user:
        return ''
    return user.get_full_name() or user.username or user.email or str(user.id)


def _place_category_name(place):
    if place.subcategory and place.subcategory.category:
        return place.subcategory.category.name_ru
    return place.category or ''


def _latest_booking_item(booking):
    return {
        'id': booking.id,
        'client': booking.client_id,
        'client_name': _user_label(booking.client),
        'client_phone': getattr(booking.client, 'phone_number', '') or '',
        'place': booking.place_id,
        'place_title': booking.place.title if booking.place else '',
        'start_time': booking.start_time,
        'end_time': booking.end_time,
        'amount': str(booking.amount),
        'currency': booking.currency,
        'status': booking.status,
        'payment_status': booking.payment_status,
    }


def _latest_review_item(review):
    return {
        'id': review.id,
        'user': review.user_id,
        'user_name': _user_label(review.user),
        'user_avatar': (review.user.avatar or '') if review.user else '',
        'place': review.place_id,
        'place_title': review.place.title if review.place else '',
        'rating': review.rating,
        'comment': review.comment,
        'created_at': review.created_at,
    }


def _top_place_item(place):
    return {
        'id': place.id,
        'title': place.title,
        'name': place.title,
        'category_name': _place_category_name(place),
        'subcategory_name': place.subcategory.name_ru if place.subcategory else '',
        'owner': place.owner_id,
        'owner_name': _user_label(place.owner),
        'bookings_count': place.bookings_count,
        'revenue_test': str(place.revenue_test or 0),
        'reviews_count': place.reviews_count,
        'rating_avg': round(float(place.rating_avg or 0), 1),
        'status': place.status,
    }


WEEKDAY_LABELS = ('Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс')
MONTH_LABELS = ('Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек')
OVERVIEW_PERIODS = {'7d': 7, '30d': 30, '90d': 90, '365d': 365}
PAID_STATUSES = ('test_paid', 'paid')
BOOKING_STATUS_LABELS = {
    'pending': 'Ожидают',
    'confirmed': 'Подтверждены',
    'completed': 'Завершены',
    'cancelled': 'Отменены',
}
ROLE_LABELS = {'client': 'Клиенты', 'partner': 'Партнёры', 'moderator': 'Модераторы', 'admin': 'Админы'}


def _change(current, previous):
    """Percent change vs the previous period, or None when there is no base."""
    current = float(current or 0)
    previous = float(previous or 0)
    if previous == 0:
        return None if current == 0 else 100.0
    return round((current - previous) / previous * 100, 1)


def _kpi(current, previous):
    return {'value': current, 'previous': previous, 'change': _change(current, previous)}


def _series_buckets(start_date, days):
    """Chart buckets: one per day up to 90 days, one per month for a year."""
    if days > 90:
        buckets = []
        year, month = start_date.year, start_date.month
        for _ in range(12):
            buckets.append(((year, month), f'{MONTH_LABELS[month - 1]} {str(year)[2:]}'))
            month += 1
            if month > 12:
                month, year = 1, year + 1
        return buckets, lambda day: (day.year, day.month)
    buckets = []
    for offset in range(days):
        day = start_date + timedelta(days=offset)
        label = WEEKDAY_LABELS[day.weekday()] if days <= 7 else day.strftime('%d.%m')
        buckets.append((day, label))
    return buckets, lambda day: day


def _overview_series(start, days, include_revenue):
    User = get_user_model()
    buckets, key_for = _series_buckets(timezone.localdate(start), days)
    rows = {key: {'label': label, 'revenue': 0, 'bookings': 0, 'users': 0} for key, label in buckets}

    def add(field, pairs):
        for moment, amount in pairs:
            key = key_for(timezone.localtime(moment).date())
            if key in rows:
                rows[key][field] += amount

    bookings = Booking.objects.exclude(status='blocked').filter(created_at__gte=start)
    add('bookings', ((moment, 1) for moment in bookings.values_list('created_at', flat=True)))
    add('users', ((moment, 1) for moment in User.objects.filter(date_joined__gte=start).values_list('date_joined', flat=True)))
    if include_revenue:
        payments = Payment.objects.filter(status__in=PAID_STATUSES, created_at__gte=start)
        add('revenue', ((moment, float(amount or 0)) for moment, amount in payments.values_list('created_at', 'amount')))

    series = []
    for key, _label in buckets:
        row = rows[key]
        row['revenue'] = round(row['revenue']) if include_revenue else None
        series.append(row)
    return series


def _unread_chats_for(user):
    from notifications.views import _chat_queryset_for_user, _unread_for_user
    return sum(1 for thread in _chat_queryset_for_user(user) if _unread_for_user(thread, user))


def _latest_user_item(user):
    return {
        'id': user.id,
        'name': _user_label(user),
        'role': user.role,
        'avatar': user.avatar or '',
        'phone': user.phone_number or '',
        'date_joined': user.date_joined,
    }


class AdminOverviewView(APIView):
    """Dashboard data. Moderators get the operational part without money."""
    permission_classes = [IsAdminOrModerator]

    @extend_schema(
        parameters=[OpenApiParameter('period', str, OpenApiParameter.QUERY, enum=list(OVERVIEW_PERIODS))],
        responses=inline_serializer(
            name='AdminOverviewResponse',
            fields={
                'period': serializers.CharField(),
                'can_view_finance': serializers.BooleanField(),
                'kpis': serializers.DictField(),
                'totals': serializers.DictField(),
                'attention': serializers.DictField(),
                'series': serializers.ListField(child=serializers.DictField()),
                'bookings_by_status': serializers.ListField(child=serializers.DictField()),
                'bookings_by_category': serializers.ListField(child=serializers.DictField()),
                'users_by_role': serializers.ListField(child=serializers.DictField()),
                'latest_bookings': serializers.ListField(child=serializers.DictField()),
                'latest_reviews': serializers.ListField(child=serializers.DictField()),
                'latest_users': serializers.ListField(child=serializers.DictField()),
                'top_places': serializers.ListField(child=serializers.DictField()),
            },
        ),
        tags=['admin'],
    )
    def get(self, request):
        User = get_user_model()
        period = request.query_params.get('period', '30d')
        if period not in OVERVIEW_PERIODS:
            period = '30d'
        days = OVERVIEW_PERIODS[period]
        can_view_finance = is_admin_user(request.user)

        now = timezone.localtime()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        start = today_start - timedelta(days=days - 1)
        if days > 90:
            start = (today_start.replace(day=1) - timedelta(days=330)).replace(day=1)
        previous_start = start - (now - start)

        real_bookings = Booking.objects.exclude(status='blocked')
        current_bookings = real_bookings.filter(created_at__gte=start)
        previous_bookings = real_bookings.filter(created_at__gte=previous_start, created_at__lt=start)
        current_count = current_bookings.count()
        previous_count = previous_bookings.count()

        def cancel_rate(queryset, total):
            return round(queryset.filter(status='cancelled').count() / total * 100, 1) if total else 0

        kpis = {
            'bookings': _kpi(current_count, previous_count),
            'new_users': _kpi(
                User.objects.filter(date_joined__gte=start).count(),
                User.objects.filter(date_joined__gte=previous_start, date_joined__lt=start).count(),
            ),
            'new_places': _kpi(
                Place.objects.filter(created_at__gte=start).count(),
                Place.objects.filter(created_at__gte=previous_start, created_at__lt=start).count(),
            ),
            'cancel_rate': _kpi(cancel_rate(current_bookings, current_count), cancel_rate(previous_bookings, previous_count)),
        }
        if can_view_finance:
            paid = Payment.objects.filter(status__in=PAID_STATUSES)
            current_paid = paid.filter(created_at__gte=start)
            previous_paid = paid.filter(created_at__gte=previous_start, created_at__lt=start)
            current_revenue = float(_sum_amount(current_paid))
            previous_revenue = float(_sum_amount(previous_paid))
            current_paid_count = current_paid.count()
            previous_paid_count = previous_paid.count()
            kpis['revenue'] = _kpi(round(current_revenue), round(previous_revenue))
            kpis['avg_check'] = _kpi(
                round(current_revenue / current_paid_count) if current_paid_count else 0,
                round(previous_revenue / previous_paid_count) if previous_paid_count else 0,
            )

        status_counts = dict(current_bookings.values_list('status').annotate(total=Count('id')))
        bookings_by_status = [
            {'status': key, 'label': label, 'count': status_counts.get(key, 0)}
            for key, label in BOOKING_STATUS_LABELS.items()
        ]

        category_rows = {}
        for booking in current_bookings.select_related('place__subcategory__category'):
            name = (_place_category_name(booking.place) if booking.place else '') or 'Без категории'
            row = category_rows.setdefault(name, {'name': name, 'count': 0, 'revenue': 0})
            row['count'] += 1
            if booking.payment_status in PAID_STATUSES:
                row['revenue'] += float(booking.amount or 0)
        bookings_by_category = sorted(category_rows.values(), key=lambda row: -row['count'])[:6]
        for row in bookings_by_category:
            row['revenue'] = round(row['revenue']) if can_view_finance else None

        role_counts = dict(User.objects.values_list('role').annotate(total=Count('id')))
        users_by_role = [
            {'role': key, 'label': label, 'count': role_counts.get(key, 0)}
            for key, label in ROLE_LABELS.items()
        ]

        top_places = Place.objects.filter(status='approved').select_related(
            'owner',
            'subcategory__category',
        ).annotate(
            bookings_count=Count(
                'bookings',
                filter=Q(bookings__created_at__gte=start) & ~Q(bookings__status='blocked'),
                distinct=True,
            ),
            reviews_count=Count('reviews', distinct=True),
            rating_avg=Avg('reviews__rating'),
            revenue_test=Sum(
                'bookings__payments__amount',
                filter=Q(bookings__payments__status__in=PAID_STATUSES, bookings__payments__created_at__gte=start),
            ),
        ).order_by('-bookings_count', '-revenue_test', '-created_at')[:5]
        top_items = [_top_place_item(place) for place in top_places]
        if not can_view_finance:
            for item in top_items:
                item['revenue_test'] = None

        latest_bookings = real_bookings.select_related('client', 'place').order_by('-created_at')[:6]
        latest_reviews = Review.objects.select_related('user', 'place').order_by('-created_at')[:5]
        latest_users = User.objects.order_by('-date_joined')[:6]
        rating_avg = Review.objects.aggregate(avg=Avg('rating'))['avg']

        return Response({
            'period': period,
            'can_view_finance': can_view_finance,
            'kpis': kpis,
            'totals': {
                'users': User.objects.count(),
                'partners': role_counts.get('partner', 0),
                'places_total': Place.objects.count(),
                'places_approved': Place.objects.filter(status='approved').count(),
                'bookings_total': real_bookings.count(),
                'reviews': Review.objects.count(),
                'average_rating': round(float(rating_avg or 0), 1),
            },
            'attention': {
                'places_pending': Place.objects.filter(status='pending').count(),
                'bookings_pending': real_bookings.filter(status='pending').count(),
                'unread_chats': _unread_chats_for(request.user),
                'low_reviews': Review.objects.filter(
                    rating__lte=2,
                    created_at__gte=today_start - timedelta(days=30),
                ).count(),
            },
            'series': _overview_series(start, days, can_view_finance),
            'bookings_by_status': bookings_by_status,
            'bookings_by_category': bookings_by_category,
            'users_by_role': users_by_role,
            'latest_bookings': [_latest_booking_item(booking) for booking in latest_bookings],
            'latest_reviews': [_latest_review_item(review) for review in latest_reviews],
            'latest_users': [_latest_user_item(user) for user in latest_users],
            'top_places': top_items,
        })


class AuditLogListView(APIView):
    permission_classes = [IsAdminUserRole]

    @extend_schema(responses=AuditLogSerializer(many=True), tags=['admin'])
    def get(self, request):
        queryset = AuditLog.objects.select_related('actor').all()

        action = request.query_params.get('action')
        if action:
            queryset = queryset.filter(action=action)

        object_type = request.query_params.get('object_type')
        if object_type:
            queryset = queryset.filter(object_type=object_type)

        object_id = request.query_params.get('object_id')
        if object_id:
            queryset = queryset.filter(object_id=str(object_id))

        actor = request.query_params.get('actor')
        if actor:
            queryset = queryset.filter(actor_id=actor)

        date_from = request.query_params.get('date_from')
        if date_from:
            parsed_date_from = parse_date(date_from)
            if not parsed_date_from:
                return Response({'date_from': ['Use YYYY-MM-DD format.']}, status=400)
            queryset = queryset.filter(created_at__date__gte=parsed_date_from)

        date_to = request.query_params.get('date_to')
        if date_to:
            parsed_date_to = parse_date(date_to)
            if not parsed_date_to:
                return Response({'date_to': ['Use YYYY-MM-DD format.']}, status=400)
            queryset = queryset.filter(created_at__date__lte=parsed_date_to)

        try:
            limit = max(1, min(int(request.query_params.get('limit', 100)), 500))
        except ValueError:
            limit = 100

        serializer = AuditLogSerializer(queryset[:limit], many=True)
        return Response(serializer.data)


class AdminBadgesView(APIView):
    """Small counters for the admin menu badges, cheap enough to poll."""
    permission_classes = [IsAdminOrModerator]

    @extend_schema(
        responses=inline_serializer(
            name='AdminBadgesResponse',
            fields={
                'moderation': serializers.IntegerField(),
                'bookings': serializers.IntegerField(),
                'messages': serializers.IntegerField(),
            },
        ),
        tags=['admin'],
    )
    def get(self, request):
        return Response({
            'moderation': Place.objects.filter(status='pending').count(),
            'bookings': Booking.objects.filter(status='pending').count(),
            'messages': _unread_chats_for(request.user),
        })
