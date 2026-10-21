"""Place price helpers.

`price_hourly/daily/weekly/monthly` are the only stored prices. The legacy
free-text `price` and the `prices` dict are derived from them for older
frontend code and seeds.
"""

import re
from decimal import Decimal, InvalidOperation


PRICE_FIELD_ALIASES = {
    'price_hourly': ('soatlik', 'hourly', 'hour'),
    'price_daily': ('kunlik', 'daily', 'day'),
    'price_weekly': ('haftalik', 'weekly', 'week'),
    'price_monthly': ('oylik', 'monthly', 'month'),
}
PRICE_FIELDS = tuple(PRICE_FIELD_ALIASES)
# Order used when a single "main" price is shown.
PRIMARY_PRICE_ORDER = ('price_daily', 'price_hourly', 'price_weekly', 'price_monthly')


def parse_price_value(value):
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


def normalized_price_fields_from_prices(prices):
    """Map a legacy {"kunlik": 400000, ...} dict onto price_* field values."""
    if not isinstance(prices, dict):
        return {}

    normalized = {}
    for field_name, aliases in PRICE_FIELD_ALIASES.items():
        for alias in aliases:
            if alias not in prices:
                continue
            parsed = parse_price_value(prices.get(alias))
            if parsed is not None:
                normalized[field_name] = str(parsed)
                break
    return normalized


def legacy_price_field(text):
    """Guess which price_* field a free-text price like "Soatiga 200 000" means."""
    text = str(text or '').lower()
    if any(marker in text for marker in ('soat', 'hour', 'час')):
        return 'price_hourly'
    if any(marker in text for marker in ('hafta', 'week', 'недел')):
        return 'price_weekly'
    if any(marker in text for marker in ('oy', 'month', 'месяц')):
        return 'price_monthly'
    return 'price_daily'


def _format_amount(value):
    value = Decimal(value)
    return str(value.quantize(Decimal('1'))) if value == value.to_integral() else str(value)


def prices_dict(place):
    """Legacy `prices` shape keyed by the Uzbek duration names."""
    result = {}
    for field_name, aliases in PRICE_FIELD_ALIASES.items():
        value = getattr(place, field_name)
        if value is not None:
            result[aliases[0]] = int(value) if Decimal(value) == Decimal(value).to_integral() else str(value)
    return result


def primary_price_text(place):
    for field_name in PRIMARY_PRICE_ORDER:
        value = getattr(place, field_name)
        if value is not None:
            return f'{_format_amount(value)} {place.currency or "UZS"}'
    return ''
