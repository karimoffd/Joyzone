"""Six marketplace categories, their subcategories and per-category parameters.

Categories follow how commercial space is listed in Uzbekistan (OLX.uz,
coworking operators in Tashkent): offices, coworking, meetings and events,
retail, other non-residential premises and warehouses/production. Offices,
retail, commercial and warehouses can be rented or sold; coworking and event
spaces are only rented.

Rows are matched by slug, so re-running keeps one copy. Listings that already
have a sale price become sale listings.
"""

from django.db import migrations

CATEGORIES = [
    dict(slug='ofis', name_uz='Ofislar', name_ru='Офисы', name_en='Offices', icon='🏢', deal_types='both'),
    dict(slug='kovorking', name_uz='Kovorking', name_ru='Коворкинг', name_en='Coworking', icon='💻', deal_types='rent'),
    dict(slug='zal-tadbir', name_uz='Muzokara va tadbirlar', name_ru='Переговорные и мероприятия', name_en='Meetings & events', icon='🎤', deal_types='rent'),
    dict(slug='savdo', name_uz='Savdo maydonlari', name_ru='Торговые площади', name_en='Retail space', icon='🛍️', deal_types='both'),
    dict(slug='tijorat', name_uz='Tijorat maydonlari', name_ru='Нежилые помещения', name_en='Commercial premises', icon='🏬', deal_types='both'),
    dict(slug='ombor', name_uz='Ombor va ishlab chiqarish', name_ru='Склады и производство', name_en='Warehouse & production', icon='🏭', deal_types='both'),
]

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

# (category slug, subcategory slug, uz, ru, en, parameter slugs)
SUBCATEGORIES = [
    ('ofis', 'kabinet', 'Alohida kabinet', 'Отдельный кабинет', 'Private office', OFFICE),
    ('ofis', 'mini-ofis', 'Tayyor ofis', 'Готовый офис', 'Ready office', OFFICE),
    ('ofis', 'open-space-ofis', 'Open-space ofis', 'Офис open space', 'Open-space office', OFFICE),
    ('ofis', 'ofis-qavat', 'Butun qavat', 'Этаж целиком', 'Whole floor', OFFICE),
    ('ofis', 'ofis-binosi', 'Biznes-bino', 'Офисное здание', 'Office building', OFFICE),
    ('kovorking', 'hot-desk', 'Erkin ish joyi', 'Свободное место', 'Hot desk', COWORKING),
    ('kovorking', 'fixed-desk', 'Belgilangan ish joyi', 'Закреплённое место', 'Fixed desk', COWORKING),
    ('kovorking', 'kovorking-kabinet', 'Kovorkingdagi kabinet', 'Кабинет в коворкинге', 'Coworking private office', COWORKING),
    ('kovorking', 'fokus-xona', "Fokus va qo'ng'iroq xonasi", 'Фокус-комната', 'Focus & call booth', COWORKING),
    ('zal-tadbir', 'muzokaralar-xonasi', 'Muzokaralar xonasi', 'Переговорная', 'Meeting room', EVENTS),
    ('zal-tadbir', 'konferens-zal', 'Konferens-zal', 'Конференц-зал', 'Conference hall', EVENTS),
    ('zal-tadbir', 'trening-zali', 'Trening va seminar zali', 'Зал для тренингов', 'Training room', EVENTS),
    ('zal-tadbir', 'tadbir-maydoni', 'Tadbir maydoni / loft', 'Event-площадка / лофт', 'Event venue / loft', EVENTS),
    ('zal-tadbir', 'studiya', 'Foto va podkast studiya', 'Фото- и подкаст-студия', 'Photo & podcast studio', EVENTS),
    ('savdo', 'dokon', "Ko'cha bo'yidagi do'kon", 'Магазин у дороги (стрит-ритейл)', 'Street shop', RETAIL),
    ('savdo', 'savdo-markazi-joyi', 'Savdo markazidagi joy', 'Помещение в ТЦ', 'Mall unit', RETAIL),
    ('savdo', 'butik', 'Butik', 'Бутик', 'Boutique', RETAIL),
    ('savdo', 'orolcha', 'Orolcha', 'Островок', 'Kiosk island', RETAIL),
    ('savdo', 'shourum', 'Shourum', 'Шоурум', 'Showroom', RETAIL),
    ('savdo', 'kiosk', 'Kiosk / MAF', 'Киоск / МАФ', 'Kiosk / pavilion', RETAIL),
    ('tijorat', 'kafe-restoran', 'Kafe va restoran uchun', 'Под кафе и ресторан', 'Cafe & restaurant', COMMERCIAL),
    ('tijorat', 'gozallik-saloni', "Go'zallik saloni uchun", 'Под салон красоты', 'Beauty salon', COMMERCIAL),
    ('tijorat', 'klinika', 'Klinika va tibbiyot', 'Под клинику', 'Clinic & medical', COMMERCIAL),
    ('tijorat', 'oquv-markazi', "O'quv markazi uchun", 'Под учебный центр', 'Training centre', COMMERCIAL),
    ('tijorat', 'erkin-maqsad', 'Erkin maqsadli joy', 'Свободного назначения', 'Flexible use', COMMERCIAL),
    ('tijorat', 'tijorat-binosi', 'Alohida tijorat binosi', 'Отдельно стоящее здание', 'Standalone building', COMMERCIAL),
    ('ombor', 'ombor', 'Ombor', 'Склад', 'Warehouse', WAREHOUSE),
    ('ombor', 'sovutgichli-ombor', 'Sovutgichli ombor', 'Холодильный склад', 'Cold storage', WAREHOUSE),
    ('ombor', 'logistika-markazi', 'Logistika markazi', 'Логистический комплекс', 'Logistics centre', WAREHOUSE),
    ('ombor', 'mini-boks', 'Mini-boks', 'Мини-склад (бокс)', 'Self-storage box', WAREHOUSE),
    ('ombor', 'ishlab-chiqarish-sexi', 'Ishlab chiqarish sexi', 'Производственный цех', 'Production workshop', WAREHOUSE),
    ('ombor', 'sanoat-bazasi', 'Sanoat bazasi', 'Производственная база', 'Industrial base', WAREHOUSE),
]

# Subcategories that only existed in an unreleased "Sotuvda" category: their
# listings move to the matching new subcategory.
LEGACY_SUBCATEGORIES = {
    'ofis-sotuvi': 'mini-ofis',
    'savdo-maydoni': 'dokon',
    'ombor-sotuvi': 'ombor',
}


def option(slug, uz, ru, en):
    return {'slug': slug, 'uz': uz, 'ru': ru, 'en': en}


GROUPS = [
    dict(slug='workspace', name_uz='Ish maydoni', name_ru='Рабочее пространство', name_en='Workspace', order=1),
    dict(slug='characteristics', name_uz='Xususiyatlar', name_ru='Счетчики и характеристики', name_en='Characteristics', order=2),
    dict(slug='amenities', name_uz='Qulayliklar', name_ru='Удобства', name_en='Amenities', order=4),
    dict(slug='condition', name_uz='Holati va turi', name_ru='Состояние и тип', name_en='Condition & type', order=3),
]

# (slug, group, type, icon, uz, ru, en, config)
PARAMETERS = [
    ('workplaces', 'workspace', 'counter', 'desk', "Ish o'rinlari", 'Рабочих мест', 'Workplaces', {'min': 1, 'default': 6}),
    ('meeting_rooms', 'workspace', 'counter', 'meeting', 'Muzokara xonalari', 'Переговорных комнат', 'Meeting rooms', {'min': 0, 'default': 1}),
    ('restrooms', 'workspace', 'counter', 'restroom', 'Hojatxonalar', 'Санузлов', 'Restrooms', {'min': 0, 'default': 1}),
    ('floor', 'workspace', 'counter', 'stairs', 'Qavat', 'Этаж', 'Floor', {'min': 0, 'default': 1}),
    ('rooms', 'characteristics', 'counter', 'door', 'Xonalar soni', 'Количество комнат', 'Rooms', {'min': 1, 'default': 1}),
    ('capacity', 'characteristics', 'counter', 'users', "Sig'imi (odam)", 'Вместимость (чел)', 'Capacity (people)', {'min': 1, 'default': 20}),
    ('ceiling_height', 'characteristics', 'counter', 'ruler', 'Shift balandligi (m)', 'Высота потолков (м)', 'Ceiling height (m)', {'min': 2, 'default': 3, 'unit': 'm'}),
    ('power_kw', 'characteristics', 'counter', 'bolt', 'Elektr quvvati (kVt)', 'Электромощность (кВт)', 'Power (kW)', {'min': 0, 'default': 15, 'unit': 'kVt'}),
    ('renovation', 'condition', 'select', 'brush', "Ta'mir holati", 'Состояние ремонта', 'Renovation', {'options': [
        option('qora-suvoq', 'Qora suvoq', 'Черновая отделка', 'Shell & core'),
        option('oq-suvoq', 'Oq suvoq', 'Предчистовая отделка', 'White box'),
        option('tamirlangan', "Ta'mirlangan", 'С ремонтом', 'Renovated'),
        option('dizayner', "Dizaynerlik ta'miri", 'Дизайнерский ремонт', 'Designer finish'),
    ]}),
    ('building_type', 'condition', 'select', 'building', 'Bino turi', 'Тип здания', 'Building type', {'options': [
        option('biznes-markaz', 'Biznes-markaz', 'Бизнес-центр', 'Business centre'),
        option('savdo-markazi', 'Savdo markazi', 'Торговый центр', 'Shopping mall'),
        option('turar-joy', "Turar-joy binosining 1-qavati", 'Первый этаж жилого дома', 'Residential ground floor'),
        option('alohida-bino', 'Alohida bino', 'Отдельное здание', 'Standalone building'),
        option('sanoat-zonasi', 'Sanoat zonasi', 'Промзона', 'Industrial zone'),
    ]}),
    ('layout', 'condition', 'select', 'chair', 'Zal joylashuvi', 'Рассадка', 'Seating layout', {'options': [
        option('teatr', 'Teatr', 'Театр', 'Theatre'),
        option('sinf', 'Sinf', 'Класс', 'Classroom'),
        option('u-shakl', 'U-shakl', 'П-образная', 'U-shape'),
        option('banket', 'Banket', 'Банкет', 'Banquet'),
        option('fursh', 'Furshet', 'Фуршет', 'Cocktail'),
    ]}),
    ('temperature', 'condition', 'select', 'snowflake', 'Harorat rejimi', 'Температурный режим', 'Temperature', {'options': [
        option('isitilmaydi', 'Isitilmaydi', 'Неотапливаемый', 'Unheated'),
        option('isitiladi', 'Isitiladi', 'Отапливаемый', 'Heated'),
        option('sovutgichli', 'Sovutgichli', 'Холодильный', 'Refrigerated'),
    ]}),
    ('wifi', 'amenities', 'boolean', 'wifi', 'Wi-Fi', 'Wi-Fi', 'Wi-Fi', {}),
    ('parking', 'amenities', 'boolean', 'parking', 'Avtoturargoh', 'Парковка', 'Parking', {}),
    ('projector', 'amenities', 'boolean', 'projector', 'Proyektor', 'Проектор', 'Projector', {}),
    ('coffee_tea', 'amenities', 'boolean', 'coffee', 'Qahva va choy', 'Кофе и чай', 'Coffee and tea', {}),
    ('access_24_7', 'amenities', 'boolean', 'access24', '24/7 kirish', 'Доступ 24/7', '24/7 access', {}),
    ('furniture', 'amenities', 'boolean', 'chair', 'Mebel bor', 'С мебелью', 'Furnished', {}),
    ('air_conditioning', 'amenities', 'boolean', 'wind', 'Konditsioner', 'Кондиционер', 'Air conditioning', {}),
    ('kitchen', 'amenities', 'boolean', 'utensils', 'Oshxona', 'Кухня', 'Kitchen', {}),
    ('reception', 'amenities', 'boolean', 'reception', 'Resepshn', 'Ресепшн', 'Reception', {}),
    ('security', 'amenities', 'boolean', 'shield', "Qo'riqlash", 'Охрана', 'Security', {}),
    ('cctv', 'amenities', 'boolean', 'cctv', 'Videokuzatuv', 'Видеонаблюдение', 'CCTV', {}),
    ('elevator', 'amenities', 'boolean', 'elevator', 'Lift', 'Лифт', 'Elevator', {}),
    ('separate_entrance', 'amenities', 'boolean', 'door', 'Alohida kirish', 'Отдельный вход', 'Separate entrance', {}),
    ('legal_address', 'amenities', 'boolean', 'mail', 'Yuridik manzil', 'Юридический адрес', 'Legal address', {}),
    ('printer', 'amenities', 'boolean', 'printer', 'Printer', 'Принтер', 'Printer', {}),
    ('lockers', 'amenities', 'boolean', 'locker', 'Shaxsiy shkafcha', 'Личный шкафчик', 'Lockers', {}),
    ('sound_system', 'amenities', 'boolean', 'speaker', 'Ovoz tizimi', 'Звуковая система', 'Sound system', {}),
    ('microphone', 'amenities', 'boolean', 'mic', 'Mikrofon', 'Микрофон', 'Microphone', {}),
    ('video_conf', 'amenities', 'boolean', 'video', 'Videokonferensiya', 'Видеосвязь', 'Video conferencing', {}),
    ('stage', 'amenities', 'boolean', 'star', 'Sahna', 'Сцена', 'Stage', {}),
    ('catering', 'amenities', 'boolean', 'utensils', 'Keytering', 'Кейтеринг', 'Catering', {}),
    ('shop_window', 'amenities', 'boolean', 'store', 'Vitrina', 'Витрина', 'Shop window', {}),
    ('high_traffic', 'amenities', 'boolean', 'users', "Odam oqimi yuqori", 'Высокий трафик', 'High foot traffic', {}),
    ('ventilation', 'amenities', 'boolean', 'wind', 'Ventilyatsiya / vytyajka', 'Вентиляция / вытяжка', 'Ventilation', {}),
    ('gas', 'amenities', 'boolean', 'flame', 'Gaz', 'Газ', 'Gas', {}),
    ('water_sewage', 'amenities', 'boolean', 'water', 'Suv va kanalizatsiya', 'Вода и канализация', 'Water & sewage', {}),
    ('ramp', 'amenities', 'boolean', 'truck', 'Rampa', 'Рампа', 'Loading ramp', {}),
    ('truck_access', 'amenities', 'boolean', 'truck', 'Fura kirishi', 'Подъезд для фур', 'Truck access', {}),
    ('crane', 'amenities', 'boolean', 'factory', 'Kran-balka', 'Кран-балка', 'Overhead crane', {}),
]


def seed(apps, schema_editor):
    Category = apps.get_model('places', 'Category')
    SubCategory = apps.get_model('places', 'SubCategory')
    ParameterGroup = apps.get_model('places', 'ParameterGroup')
    Parameter = apps.get_model('places', 'Parameter')
    Place = apps.get_model('places', 'Place')

    for fields in GROUPS:
        ParameterGroup.objects.get_or_create(slug=fields['slug'], defaults=fields)
    groups = {group.slug: group for group in ParameterGroup.objects.all()}

    order_in_group = {}
    for slug, group_slug, kind, icon, uz, ru, en, config in PARAMETERS:
        order_in_group[group_slug] = order_in_group.get(group_slug, 0) + 1
        parameter, created = Parameter.objects.get_or_create(slug=slug, defaults=dict(
            group=groups[group_slug], type=kind, icon=icon, name_uz=uz, name_ru=ru, name_en=en,
            config=config, order=order_in_group[group_slug],
        ))
        if not created and not parameter.icon:
            parameter.icon = icon
            parameter.save(update_fields=['icon'])
    parameters = {parameter.slug: parameter for parameter in Parameter.objects.all()}

    categories = {}
    for order, fields in enumerate(CATEGORIES, start=1):
        category, _ = Category.objects.update_or_create(
            slug=fields['slug'], defaults={**fields, 'order': order},
        )
        categories[category.slug] = category

    counters = {}
    for category_slug, slug, uz, ru, en, parameter_slugs in SUBCATEGORIES:
        counters[category_slug] = counters.get(category_slug, 0) + 1
        subcategory, _ = SubCategory.objects.update_or_create(slug=slug, defaults=dict(
            category=categories[category_slug], name_uz=uz, name_ru=ru, name_en=en,
            order=counters[category_slug],
        ))
        subcategory.parameters.set([parameters[item] for item in parameter_slugs if item in parameters])

    for old_slug, new_slug in LEGACY_SUBCATEGORIES.items():
        old = SubCategory.objects.filter(slug=old_slug).first()
        if old is not None:
            Place.objects.filter(subcategory=old).update(subcategory=SubCategory.objects.get(slug=new_slug))
            old.delete()
    Category.objects.filter(slug='sotuv', subcategories__isnull=True).delete()

    Place.objects.filter(sale_price__isnull=False).update(deal_type='sale')


class Migration(migrations.Migration):
    dependencies = [
        ('places', '0023_sale_listings'),
    ]

    operations = [
        migrations.RunPython(seed, migrations.RunPython.noop),
    ]
