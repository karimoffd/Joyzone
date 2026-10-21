"""Keep price_hourly/daily/weekly/monthly as the only stored prices.

Before the legacy `price` text and `prices` dict columns are dropped, any value
that only exists there is copied into the matching price_* field.
"""

from django.db import migrations

from places.prices import (
    legacy_price_field,
    normalized_price_fields_from_prices,
    parse_price_value,
)


def copy_legacy_prices(apps, schema_editor):
    Place = apps.get_model('places', 'Place')

    for place in Place.objects.all().iterator():
        updates = {}
        for field_name, value in normalized_price_fields_from_prices(place.prices).items():
            if getattr(place, field_name) is None:
                updates[field_name] = parse_price_value(value)

        has_any_price = any(
            getattr(place, name) is not None or name in updates
            for name in ('price_hourly', 'price_daily', 'price_weekly', 'price_monthly')
        )
        legacy = parse_price_value(place.price)
        if legacy is not None and not has_any_price:
            updates[legacy_price_field(place.price)] = legacy

        if updates:
            Place.objects.filter(pk=place.pk).update(**updates)


class Migration(migrations.Migration):

    dependencies = [
        ('places', '0019_placemoderationlog'),
    ]

    operations = [
        migrations.RunPython(copy_legacy_prices, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name='place',
            name='price',
        ),
        migrations.RemoveField(
            model_name='place',
            name='prices',
        ),
    ]
