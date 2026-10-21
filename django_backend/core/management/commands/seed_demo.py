import os
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from places.models import Category, Parameter, ParameterGroup, Place, SubCategory
from tariffs.models import TariffPlan


DEMO_USERNAMES = ('demo_admin', 'demo_partner', 'demo_client')

PARAMETER_GROUPS = [
    {
        'slug': 'workspace',
        'name_uz': 'Ish maydoni',
        'name_ru': 'Рабочее пространство',
        'name_en': 'Workspace',
        'order': 1,
        'parameters': [
            ('workplaces', 'Рабочих мест', 'Workplaces', 'Ish orinlari', 'counter', {'min': 1, 'default': 6}),
            ('meeting_rooms', 'Переговорных комнат', 'Meeting rooms', 'Muzokara xonalari', 'counter', {'min': 0, 'default': 1}),
            ('restrooms', 'Санузлов', 'Restrooms', 'Hojatxonalar', 'counter', {'min': 0, 'default': 1}),
            ('floor', 'Этаж', 'Floor', 'Qavat', 'counter', {'min': 1, 'default': 1}),
        ],
    },
    {
        'slug': 'amenities',
        'name_uz': 'Qulayliklar',
        'name_ru': 'Удобства',
        'name_en': 'Amenities',
        'order': 2,
        'parameters': [
            ('wifi', 'Wi-Fi', 'Wi-Fi', 'Wi-Fi', 'boolean', {}),
            ('parking', 'Парковка', 'Parking', 'Avtoturargoh', 'boolean', {}),
            ('projector', 'Проектор', 'Projector', 'Proyektor', 'boolean', {}),
            ('coffee_tea', 'Кофе и чай', 'Coffee and tea', 'Qahva va choy', 'boolean', {}),
            ('access_24_7', 'Доступ 24/7', '24/7 access', '24/7 kirish', 'boolean', {}),
        ],
    },
]

CATEGORIES = [
    {
        'slug': 'ofis',
        'name_uz': 'Ofis',
        'name_ru': 'Офис',
        'name_en': 'Office',
        'icon': '🏢',
        'order': 1,
        'subcategories': [
            ('mini-ofis', 'Мини-офис', 'Mini Office', 'Mini-ofis', 1, ['workplaces', 'meeting_rooms', 'restrooms', 'wifi', 'parking']),
            ('kabinet', 'Отдельный кабинет', 'Private Office', 'Alohida kabinet', 2, ['workplaces', 'floor', 'wifi', 'parking', 'access_24_7']),
        ],
    },
    {
        'slug': 'kovorking',
        'name_uz': 'Kovorking',
        'name_ru': 'Коворкинг',
        'name_en': 'Coworking',
        'icon': '💻',
        'order': 2,
        'subcategories': [
            ('hot-desk', 'Горячий стол', 'Hot Desk', 'Erkin ish joyi', 1, ['workplaces', 'wifi', 'coffee_tea']),
            ('fixed-desk', 'Закрепленное место', 'Fixed Desk', 'Belgilangan ish joyi', 2, ['workplaces', 'wifi', 'coffee_tea', 'access_24_7']),
        ],
    },
    {
        'slug': 'zal-tadbir',
        'name_uz': 'Zal / Tadbir joyi',
        'name_ru': 'Зал / Мероприятие',
        'name_en': 'Hall / Event Venue',
        'icon': '🎭',
        'order': 3,
        'subcategories': [
            ('konferens-zal', 'Конференц-зал', 'Conference Hall', 'Konferens-zal', 1, ['workplaces', 'projector', 'wifi', 'parking']),
            ('muzokaralar-xonasi', 'Переговорная комната', 'Meeting Room', 'Muzokaralar xonasi', 2, ['workplaces', 'projector', 'wifi', 'coffee_tea']),
        ],
    },
]

TARIFFS = [
    {
        'slug': 'standard',
        'name': 'Standard',
        'name_ru': 'Стандарт',
        'name_en': 'Standard',
        'description': 'Boshlangich tarif. 1 ta joy joylashtirishga ruxsat.',
        'description_ru': 'Базовый тариф. Разрешено 1 место.',
        'description_en': 'Basic plan. 1 listing allowed.',
        'price': Decimal('0'),
        'duration_days': 36500,
        'max_places': 1,
        'is_active': True,
        'sort_order': 1,
        'features': ['1 ta faol elon', 'Bron sorovlari', 'Mijozlar bilan aloqa'],
        'features_ru': ['1 активное объявление', 'Запросы бронирования', 'Связь с клиентами'],
        'features_en': ['1 active listing', 'Booking requests', 'Client communication'],
    },
    {
        'slug': 'comfort',
        'name': 'Comfort',
        'name_ru': 'Комфорт',
        'name_en': 'Comfort',
        'description': 'Kengaytirilgan imkoniyatlar. 5 tagacha joy.',
        'description_ru': 'Расширенные возможности. До 5 мест.',
        'description_en': 'Extended features. Up to 5 listings.',
        'price': Decimal('99000'),
        'duration_days': 30,
        'max_places': 5,
        'is_active': True,
        'sort_order': 2,
        'features': ['5 tagacha faol elon', 'Bron statistikasi', 'Ustuvor korsatish'],
        'features_ru': ['До 5 активных объявлений', 'Статистика бронирования', 'Приоритетный показ'],
        'features_en': ['Up to 5 active listings', 'Booking statistics', 'Priority display'],
    },
    {
        'slug': 'premium',
        'name': 'Premium',
        'name_ru': 'Премиум',
        'name_en': 'Premium',
        'description': 'Maksimal imkoniyatlar. 10 tagacha joy.',
        'description_ru': 'Максимальные возможности. До 10 мест.',
        'description_en': 'Maximum features. Up to 10 listings.',
        'price': Decimal('199000'),
        'duration_days': 30,
        'max_places': 10,
        'is_active': True,
        'sort_order': 3,
        'features': ['10 tagacha faol elon', 'Premium badge', 'Shaxsiy menejer'],
        'features_ru': ['До 10 активных объявлений', 'Premium badge', 'Личный менеджер'],
        'features_en': ['Up to 10 active listings', 'Premium badge', 'Personal manager'],
    },
]

DEMO_PLACES = [
    {
        'title': 'C-Space Yunusobod',
        'subcategory': 'hot-desk',
        'location': 'Tashkent, Yunusobod tumani',
        'price': "Kuniga 80000 so'm",
        'prices': {'daily': 80000, 'hourly': 15000},
        'price_daily': Decimal('80000'),
        'price_hourly': Decimal('15000'),
        'area': 450,
        'people': 50,
        'promoted': True,
        'status': 'approved',
        'amenities': ['wifi', 'coffee_tea', 'parking'],
        'characteristics': {'workplaces': 50, 'meeting_rooms': 3, 'restrooms': 4},
        'description_ru': 'Демо-коворкинг с открытыми рабочими местами и переговорными.',
        'description_uz': 'Ochiq ish joylari va muzokara xonalari bor demo kovorking.',
        'description_en': 'Demo coworking with open desks and meeting rooms.',
        'images': [
            'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80',
        ],
    },
    {
        'title': 'GroundZero KitobOlam',
        'subcategory': 'konferens-zal',
        'location': 'Tashkent, Mirzo Ulugbek',
        'price': "Soatiga 200000 so'm",
        'prices': {'hourly': 200000, 'daily': 1200000},
        'price_hourly': Decimal('200000'),
        'price_daily': Decimal('1200000'),
        'area': 120,
        'people': 80,
        'promoted': False,
        'status': 'pending',
        'amenities': ['wifi', 'projector', 'parking'],
        'characteristics': {'workplaces': 80, 'restrooms': 2},
        'description_ru': 'Демо-зал для презентаций, лекций и небольших событий.',
        'description_uz': 'Taqdimotlar va kichik tadbirlar uchun demo zal.',
        'description_en': 'Demo hall for presentations, lectures and small events.',
        'images': [
            'https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=1200&q=80',
        ],
    },
    {
        'title': 'Impact Technology Hub',
        'subcategory': 'mini-ofis',
        'location': 'Tashkent, Yakkasaroy',
        'price': "Oyiga 5000000 so'm",
        'prices': {'monthly': 5000000, 'weekly': 1500000},
        'price_monthly': Decimal('5000000'),
        'price_weekly': Decimal('1500000'),
        'area': 35,
        'people': 8,
        'promoted': False,
        'status': 'approved',
        'amenities': ['wifi', 'parking', 'access_24_7'],
        'characteristics': {'workplaces': 8, 'meeting_rooms': 1, 'restrooms': 1},
        'description_ru': 'Демо-мини офис для небольшой команды.',
        'description_uz': 'Kichik jamoa uchun demo mini-ofis.',
        'description_en': 'Demo mini office for a small team.',
        'images': [
            'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80',
        ],
    },
]


class Command(BaseCommand):
    help = 'Seed idempotent Joyzone demo data: admin user, categories, parameters, tariffs, and demo places.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clean',
            action='store_true',
            help='Delete known demo data before seeding. Superusers are never deleted by this option.',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if options['clean']:
            self.clean_demo_data()

        users = self.seed_users()
        parameters = self.seed_parameters()
        subcategories = self.seed_categories(parameters)
        self.seed_tariffs()
        self.seed_places(users['partner'], subcategories)

        self.stdout.write(self.style.SUCCESS('Joyzone demo data seeded successfully.'))

    def clean_demo_data(self):
        self.stdout.write('Cleaning known demo data...')

        place_titles = [place['title'] for place in DEMO_PLACES]
        deleted_places, _ = Place.objects.filter(title__in=place_titles).delete()

        subcategory_slugs = [sub[0] for category in CATEGORIES for sub in category['subcategories']]
        category_slugs = [category['slug'] for category in CATEGORIES]
        parameter_slugs = [item[0] for group in PARAMETER_GROUPS for item in group['parameters']]
        group_slugs = [group['slug'] for group in PARAMETER_GROUPS]
        tariff_slugs = [tariff['slug'] for tariff in TARIFFS]

        SubCategory.objects.filter(slug__in=subcategory_slugs).delete()
        Category.objects.filter(slug__in=category_slugs).delete()
        Parameter.objects.filter(slug__in=parameter_slugs).delete()
        ParameterGroup.objects.filter(slug__in=group_slugs).delete()
        TariffPlan.objects.filter(slug__in=tariff_slugs).delete()

        User = get_user_model()
        demo_users = User.objects.filter(username__in=DEMO_USERNAMES, is_superuser=False)
        deleted_users, _ = demo_users.delete()
        preserved_superusers = User.objects.filter(username__in=DEMO_USERNAMES, is_superuser=True).count()

        self.stdout.write(f'  deleted demo place rows: {deleted_places}')
        self.stdout.write(f'  deleted demo non-superuser rows: {deleted_users}')
        if preserved_superusers:
            self.stdout.write(self.style.WARNING(
                f'  preserved {preserved_superusers} demo superuser(s); --clean never deletes superusers.'
            ))

    def seed_users(self):
        User = get_user_model()
        admin_password = os.environ.get('JOYZONE_DEMO_ADMIN_PASSWORD', 'admin12345')
        partner_password = os.environ.get('JOYZONE_DEMO_PARTNER_PASSWORD', 'partner12345')
        client_password = os.environ.get('JOYZONE_DEMO_CLIENT_PASSWORD', 'client12345')

        admin, created = User.objects.update_or_create(
            username='demo_admin',
            defaults={
                'phone_number': '+998900000001',
                'role': 'admin',
                'is_staff': True,
                'is_superuser': True,
                'first_name': 'Demo',
                'last_name': 'Admin',
            },
        )
        if created or not admin.has_usable_password():
            admin.set_password(admin_password)
            admin.save(update_fields=['password'])

        partner, partner_created = User.objects.update_or_create(
            username='demo_partner',
            defaults={
                'phone_number': '+998900000002',
                'role': 'partner',
                'is_staff': False,
                'is_superuser': False,
                'first_name': 'Demo',
                'last_name': 'Partner',
            },
        )
        if partner_created or not partner.has_usable_password():
            partner.set_password(partner_password)
            partner.save(update_fields=['password'])

        client, client_created = User.objects.update_or_create(
            username='demo_client',
            defaults={
                'phone_number': '+998900000003',
                'role': 'client',
                'is_staff': False,
                'is_superuser': False,
                'first_name': 'Demo',
                'last_name': 'Client',
            },
        )
        if client_created or not client.has_usable_password():
            client.set_password(client_password)
            client.save(update_fields=['password'])

        self.stdout.write('  users: demo_admin, demo_partner, demo_client')
        return {'admin': admin, 'partner': partner, 'client': client}

    def seed_parameters(self):
        parameters = {}
        for group_data in PARAMETER_GROUPS:
            group, _ = ParameterGroup.objects.update_or_create(
                slug=group_data['slug'],
                defaults={
                    'name_uz': group_data['name_uz'],
                    'name_ru': group_data['name_ru'],
                    'name_en': group_data['name_en'],
                    'order': group_data['order'],
                },
            )
            for order, (slug, name_ru, name_en, name_uz, field_type, config) in enumerate(group_data['parameters'], start=1):
                parameter, _ = Parameter.objects.update_or_create(
                    slug=slug,
                    defaults={
                        'group': group,
                        'name_uz': name_uz,
                        'name_ru': name_ru,
                        'name_en': name_en,
                        'type': field_type,
                        'config': config,
                        'order': order,
                    },
                )
                parameters[slug] = parameter
        self.stdout.write(f'  parameters: {len(parameters)}')
        return parameters

    def seed_categories(self, parameters):
        subcategories = {}
        for category_data in CATEGORIES:
            category, _ = Category.objects.update_or_create(
                slug=category_data['slug'],
                defaults={
                    'name_uz': category_data['name_uz'],
                    'name_ru': category_data['name_ru'],
                    'name_en': category_data['name_en'],
                    'icon': category_data['icon'],
                    'order': category_data['order'],
                },
            )

            for slug, name_ru, name_en, name_uz, order, parameter_slugs in category_data['subcategories']:
                subcategory, _ = SubCategory.objects.update_or_create(
                    slug=slug,
                    defaults={
                        'category': category,
                        'name_uz': name_uz,
                        'name_ru': name_ru,
                        'name_en': name_en,
                        'order': order,
                    },
                )
                subcategory.parameters.set([parameters[item] for item in parameter_slugs if item in parameters])
                subcategories[slug] = subcategory

        self.stdout.write(f'  categories: {len(CATEGORIES)}, subcategories: {len(subcategories)}')
        return subcategories

    def seed_tariffs(self):
        for tariff_data in TARIFFS:
            TariffPlan.objects.update_or_create(
                slug=tariff_data['slug'],
                defaults=tariff_data,
            )
        self.stdout.write(f'  tariffs: {len(TARIFFS)}')

    def seed_places(self, owner, subcategories):
        for place_data in DEMO_PLACES:
            subcategory = subcategories[place_data['subcategory']]
            category = subcategory.category
            defaults = {
                key: value for key, value in place_data.items()
                if key not in {'title', 'subcategory'}
            }
            defaults.update({
                'owner': owner,
                'subcategory': subcategory,
                'category': category.name_ru,
                'currency': 'UZS',
            })
            Place.objects.update_or_create(
                title=place_data['title'],
                defaults=defaults,
            )
        self.stdout.write(f'  places: {len(DEMO_PLACES)}')
