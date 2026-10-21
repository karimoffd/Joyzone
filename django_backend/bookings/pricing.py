"""Server-side booking price calculation.

The client never decides how much a booking costs. These rules mirror the
quote shown in SpaceDetail.jsx so the UI and the stored amount agree:

    subtotal     = unit price * units
    discount     = best matching active discount (percent of subtotal)
    service fee  = max(SERVICE_FEE_MIN, SERVICE_FEE_RATE * (subtotal - discount))
    tax          = TAX_RATE * (subtotal - discount + service fee)
    amount       = subtotal - discount + service fee + tax
"""

import calendar
import math
from dataclasses import asdict, dataclass
from datetime import date, datetime, time, timedelta
from decimal import ROUND_HALF_UP, Decimal

from django.utils import timezone
from rest_framework.exceptions import ValidationError

from places.serializers import _normalized_price_fields_from_prices, _parse_price_value


SERVICE_FEE_RATE = Decimal('0.08')
SERVICE_FEE_MIN = Decimal('25000')
TAX_RATE = Decimal('0.12')

PRICE_FIELD_BY_DURATION = {
    'hourly': 'price_hourly',
    'daily': 'price_daily',
    'weekly': 'price_weekly',
    'monthly': 'price_monthly',
}


@dataclass(frozen=True)
class BookingQuote:
    duration_type: str
    units: int
    unit_price: Decimal
    subtotal: Decimal
    discount_id: int | None
    discount_name: str
    discount_percent: int
    discount_amount: Decimal
    service_fee: Decimal
    tax: Decimal
    amount: Decimal
    currency: str

    def as_dict(self):
        data = asdict(self)
        for key, value in data.items():
            if isinstance(value, Decimal):
                data[key] = str(value)
        return data


def _round_money(value):
    return Decimal(value).quantize(Decimal('1'), rounding=ROUND_HALF_UP)


def _add_months(day, months):
    month_index = day.month - 1 + months
    year = day.year + month_index // 12
    month = month_index % 12 + 1
    return date(year, month, min(day.day, calendar.monthrange(year, month)[1]))


def get_unit_price(place, duration_type):
    field_name = PRICE_FIELD_BY_DURATION[duration_type]
    value = getattr(place, field_name, None)
    if value is None:
        value = _normalized_price_fields_from_prices(place.prices).get(field_name)
    if value is None:
        # Legacy listings only have the free-text `price`; the booking widget
        # uses it as the rate for any duration, so the server does the same.
        value = _parse_price_value(place.price)
    parsed = _parse_price_value(value)
    if parsed is None or parsed <= 0:
        raise ValidationError({
            'duration_type': f'This place has no {duration_type} price.'
        })
    return parsed


def count_units(duration_type, start_time, end_time):
    """Return billable units and the day count used by discount rules."""
    if end_time <= start_time:
        raise ValidationError({'end_time': 'End time must be after start time.'})

    if duration_type == 'hourly':
        hours = math.ceil((end_time - start_time).total_seconds() / 3600)
        return max(1, hours), 1

    start_day = timezone.localtime(start_time).date()
    end_day = timezone.localtime(end_time).date()
    days = max(1, (end_day - start_day).days + 1)

    if duration_type == 'daily':
        return days, days
    if duration_type == 'weekly':
        weeks = max(1, math.ceil(days / 7))
        return weeks, weeks

    months = 1
    while _add_months(start_day, months) - timedelta(days=1) < end_day:
        months += 1
    return months, months


def _discount_applies(discount, *, duration_type, days, start_time, now):
    discount_type = discount.discount_type
    if discount_type == 'new_listing':
        return True
    if discount_type == 'weekly':
        return duration_type == 'weekly' or (
            duration_type == 'daily' and days >= (discount.min_nights or 7)
        )
    if discount_type == 'monthly':
        return duration_type == 'monthly' or (
            duration_type == 'daily' and days >= (discount.min_nights or 28)
        )
    if discount_type == 'last_minute':
        start_day = timezone.localtime(start_time).date()
        start_midnight = timezone.make_aware(
            datetime.combine(start_day, time.min),
            timezone.get_current_timezone(),
        )
        diff_days = math.ceil((start_midnight - now).total_seconds() / 86400)
        return 0 <= diff_days <= (discount.days_before or 14)
    if discount_type == 'custom':
        return days >= (discount.min_nights or 1)
    return False


def find_best_discount(place, *, duration_type, days, start_time, now=None):
    from places.models import Discount

    now = now or timezone.now()
    linked_ids = set(place.discounts.values_list('id', flat=True)) if place.pk else set()
    best = None
    for discount in Discount.objects.filter(is_active=True):
        if discount.id not in linked_ids and discount.applicable_to != 'all':
            continue
        if not _discount_applies(
            discount,
            duration_type=duration_type,
            days=days,
            start_time=start_time,
            now=now,
        ):
            continue
        if best is None or discount.percent > best.percent:
            best = discount
    return best


def quote_booking(place, *, duration_type, start_time, end_time, now=None):
    if duration_type not in PRICE_FIELD_BY_DURATION:
        raise ValidationError({'duration_type': 'Unknown duration type.'})

    unit_price = get_unit_price(place, duration_type)
    units, days = count_units(duration_type, start_time, end_time)
    subtotal = _round_money(unit_price * units)

    discount = find_best_discount(
        place,
        duration_type=duration_type,
        days=days,
        start_time=start_time,
        now=now,
    )
    discount_percent = min(discount.percent, 100) if discount else 0
    discount_amount = _round_money(subtotal * discount_percent / 100)

    discounted = subtotal - discount_amount
    service_fee = max(SERVICE_FEE_MIN, _round_money(discounted * SERVICE_FEE_RATE)) if subtotal > 0 else Decimal('0')
    final_total = max(Decimal('0'), discounted + service_fee)
    tax = _round_money(final_total * TAX_RATE)

    return BookingQuote(
        duration_type=duration_type,
        units=units,
        unit_price=_round_money(unit_price),
        subtotal=subtotal,
        discount_id=discount.id if discount else None,
        discount_name=(discount.name_uz or discount.name_ru) if discount else '',
        discount_percent=discount_percent,
        discount_amount=discount_amount,
        service_fee=service_fee,
        tax=tax,
        amount=final_total + tax,
        currency=place.currency or 'UZS',
    )
