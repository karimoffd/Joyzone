"""Each subcategory gets its own characteristics and amenities.

0024 gave every subcategory of a category the same list, so the filter (home
search, catalog) and the listing form looked the same for, say, a private
office and a whole office building. Here every subcategory gets the set that
fits it. A subcategory whose list was already changed in the admin (it no
longer equals the 0024 list) is left alone.
"""

from django.db import migrations

# The lists 0024 gave, by category.
OFFICE = ['workplaces', 'rooms', 'meeting_rooms', 'restrooms', 'floor', 'renovation', 'building_type',
          'furniture', 'wifi', 'air_conditioning', 'parking', 'kitchen', 'reception', 'security', 'elevator',
          'access_24_7', 'separate_entrance', 'legal_address']
COWORKING = ['workplaces', 'meeting_rooms', 'wifi', 'coffee_tea', 'printer', 'lockers', 'kitchen', 'air_conditioning',
             'parking', 'reception', 'access_24_7', 'legal_address']
EVENTS = ['capacity', 'layout', 'projector', 'sound_system', 'microphone', 'video_conf', 'stage', 'catering',
          'coffee_tea', 'wifi', 'air_conditioning', 'parking']
RETAIL = ['floor', 'ceiling_height', 'building_type', 'renovation', 'shop_window', 'separate_entrance',
          'high_traffic', 'water_sewage', 'air_conditioning', 'security', 'parking']
COMMERCIAL = ['floor', 'rooms', 'restrooms', 'ceiling_height', 'power_kw', 'renovation', 'building_type',
              'separate_entrance', 'shop_window', 'ventilation', 'gas', 'water_sewage', 'air_conditioning', 'parking']
WAREHOUSE = ['ceiling_height', 'power_kw', 'temperature', 'ramp', 'truck_access', 'crane', 'security', 'cctv',
             'access_24_7', 'water_sewage', 'gas', 'parking']

OLD = {'ofis': OFFICE, 'kovorking': COWORKING, 'zal-tadbir': EVENTS, 'savdo': RETAIL, 'tijorat': COMMERCIAL, 'ombor': WAREHOUSE}

NEW = {
    # Offices
    'kabinet': ['workplaces', 'floor', 'renovation', 'building_type', 'furniture', 'wifi', 'air_conditioning',
                'kitchen', 'reception', 'security', 'elevator', 'access_24_7', 'parking', 'legal_address'],
    'mini-ofis': ['workplaces', 'rooms', 'meeting_rooms', 'restrooms', 'floor', 'renovation', 'building_type',
                  'furniture', 'wifi', 'air_conditioning', 'kitchen', 'security', 'elevator', 'access_24_7',
                  'separate_entrance', 'parking', 'legal_address'],
    'open-space-ofis': ['workplaces', 'meeting_rooms', 'restrooms', 'floor', 'ceiling_height', 'renovation',
                        'building_type', 'furniture', 'wifi', 'air_conditioning', 'kitchen', 'reception', 'security',
                        'elevator', 'access_24_7', 'parking', 'legal_address'],
    'ofis-qavat': ['rooms', 'meeting_rooms', 'restrooms', 'floor', 'ceiling_height', 'power_kw', 'renovation',
                   'building_type', 'air_conditioning', 'kitchen', 'security', 'elevator', 'access_24_7',
                   'separate_entrance', 'parking', 'legal_address'],
    'ofis-binosi': ['rooms', 'restrooms', 'floor', 'ceiling_height', 'power_kw', 'renovation', 'building_type',
                    'air_conditioning', 'security', 'cctv', 'elevator', 'separate_entrance', 'parking', 'legal_address'],
    # Coworking
    'hot-desk': ['wifi', 'coffee_tea', 'printer', 'lockers', 'kitchen', 'air_conditioning', 'access_24_7',
                 'legal_address', 'parking'],
    'fixed-desk': ['workplaces', 'wifi', 'coffee_tea', 'printer', 'lockers', 'kitchen', 'air_conditioning',
                   'reception', 'access_24_7', 'legal_address', 'parking'],
    'kovorking-kabinet': ['workplaces', 'meeting_rooms', 'furniture', 'wifi', 'coffee_tea', 'printer', 'kitchen',
                          'air_conditioning', 'reception', 'access_24_7', 'legal_address', 'parking'],
    'fokus-xona': ['workplaces', 'wifi', 'video_conf', 'air_conditioning', 'access_24_7'],
    # Meetings and events
    'muzokaralar-xonasi': ['capacity', 'projector', 'video_conf', 'coffee_tea', 'wifi', 'air_conditioning', 'parking'],
    'konferens-zal': ['capacity', 'layout', 'projector', 'sound_system', 'microphone', 'video_conf', 'stage',
                      'catering', 'coffee_tea', 'wifi', 'air_conditioning', 'parking'],
    'trening-zali': ['capacity', 'layout', 'projector', 'sound_system', 'microphone', 'coffee_tea', 'wifi',
                     'air_conditioning', 'parking'],
    'tadbir-maydoni': ['capacity', 'layout', 'ceiling_height', 'sound_system', 'microphone', 'stage', 'catering',
                       'wifi', 'air_conditioning', 'parking'],
    'studiya': ['capacity', 'sound_system', 'microphone', 'wifi', 'air_conditioning', 'parking'],
    # Retail
    'dokon': ['floor', 'ceiling_height', 'renovation', 'building_type', 'shop_window', 'separate_entrance',
              'high_traffic', 'water_sewage', 'air_conditioning', 'security', 'parking'],
    'savdo-markazi-joyi': ['floor', 'renovation', 'shop_window', 'high_traffic', 'air_conditioning', 'security', 'parking'],
    'butik': ['floor', 'renovation', 'shop_window', 'high_traffic', 'air_conditioning', 'security', 'parking'],
    'orolcha': ['floor', 'power_kw', 'high_traffic', 'security'],
    'shourum': ['floor', 'ceiling_height', 'renovation', 'building_type', 'shop_window', 'separate_entrance',
                'high_traffic', 'air_conditioning', 'security', 'parking'],
    'kiosk': ['power_kw', 'high_traffic', 'water_sewage', 'parking'],
    # Commercial premises
    'kafe-restoran': ['floor', 'rooms', 'restrooms', 'ceiling_height', 'power_kw', 'renovation', 'building_type',
                      'separate_entrance', 'shop_window', 'ventilation', 'gas', 'water_sewage', 'air_conditioning', 'parking'],
    'gozallik-saloni': ['floor', 'rooms', 'restrooms', 'power_kw', 'renovation', 'separate_entrance', 'shop_window',
                        'ventilation', 'water_sewage', 'air_conditioning', 'parking'],
    'klinika': ['floor', 'rooms', 'restrooms', 'power_kw', 'renovation', 'building_type', 'separate_entrance',
                'ventilation', 'water_sewage', 'air_conditioning', 'elevator', 'parking'],
    'oquv-markazi': ['floor', 'rooms', 'restrooms', 'renovation', 'building_type', 'separate_entrance',
                     'air_conditioning', 'wifi', 'projector', 'elevator', 'parking'],
    'erkin-maqsad': COMMERCIAL,
    'tijorat-binosi': ['rooms', 'restrooms', 'floor', 'ceiling_height', 'power_kw', 'renovation', 'building_type',
                       'separate_entrance', 'ventilation', 'gas', 'water_sewage', 'air_conditioning', 'security', 'parking'],
    # Warehouses and production
    'ombor': ['ceiling_height', 'power_kw', 'ramp', 'truck_access', 'security', 'cctv', 'access_24_7', 'parking'],
    'sovutgichli-ombor': ['ceiling_height', 'power_kw', 'temperature', 'ramp', 'truck_access', 'security', 'cctv',
                          'access_24_7'],
    'logistika-markazi': ['ceiling_height', 'power_kw', 'temperature', 'ramp', 'truck_access', 'crane', 'security',
                          'cctv', 'access_24_7', 'parking'],
    'mini-boks': ['temperature', 'security', 'cctv', 'access_24_7', 'parking'],
    'ishlab-chiqarish-sexi': ['ceiling_height', 'power_kw', 'crane', 'ramp', 'truck_access', 'ventilation', 'gas',
                              'water_sewage', 'security', 'parking'],
    'sanoat-bazasi': ['ceiling_height', 'power_kw', 'crane', 'ramp', 'truck_access', 'gas', 'water_sewage',
                      'security', 'cctv', 'access_24_7', 'parking'],
}


def apply(apps, schema_editor):
    SubCategory = apps.get_model('places', 'SubCategory')
    Parameter = apps.get_model('places', 'Parameter')
    parameters = {parameter.slug: parameter for parameter in Parameter.objects.all()}
    for subcategory in SubCategory.objects.select_related('category').filter(slug__in=NEW):
        old = OLD.get(subcategory.category.slug)
        current = set(subcategory.parameters.values_list('slug', flat=True))
        if old is None or current != {slug for slug in old if slug in parameters}:
            continue  # edited in the admin: keep it
        subcategory.parameters.set([parameters[slug] for slug in NEW[subcategory.slug] if slug in parameters])


class Migration(migrations.Migration):

    dependencies = [
        ('places', '0025_category_filter_config'),
    ]

    operations = [
        migrations.RunPython(apply, migrations.RunPython.noop),
    ]
