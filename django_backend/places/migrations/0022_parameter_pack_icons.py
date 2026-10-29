"""Give the seeded parameters icons from the Joyzone pack (src/components/ui/iconPack.jsx).

Only empty or emoji icons are replaced; icons an admin already picked stay.
"""

from django.db import migrations

PACK_ICONS = {
    'workplaces': 'desk',
    'desks': 'desk',
    'meeting_rooms': 'meeting',
    'restrooms': 'restroom',
    'floor': 'stairs',
    'area': 'area',
    'capacity': 'users',
    'rooms': 'door',
    'wifi': 'wifi',
    'parking': 'parking',
    'projector': 'projector',
    'coffee_tea': 'coffee',
    'access_24_7': 'access24',
}


def set_icons(apps, schema_editor):
    Parameter = apps.get_model('places', 'Parameter')
    for parameter in Parameter.objects.filter(slug__in=PACK_ICONS):
        if not parameter.icon or not parameter.icon.isascii():
            parameter.icon = PACK_ICONS[parameter.slug]
            parameter.save(update_fields=['icon'])


class Migration(migrations.Migration):
    dependencies = [
        ('places', '0021_place_working_hours'),
    ]

    operations = [
        migrations.RunPython(set_icons, migrations.RunPython.noop),
    ]
