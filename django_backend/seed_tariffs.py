"""
Seed default tariff plans: Standard (free), Comfort, Premium
Run: python seed_tariffs.py
"""
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from tariffs.models import TariffPlan

plans = [
    {
        'slug': 'standard',
        'name': "Standard",
        'name_ru': "Стандарт",
        'name_en': "Standard",
        'description': "Boshlang'ich tarif. 1 ta joy joylashtirishga ruxsat.",
        'description_ru': "Базовый тариф. Разрешено 1 место.",
        'description_en': "Basic plan. 1 listing allowed.",
        'price': 0,
        'duration_days': 36500,
        'max_places': 1,
        'is_free': True,
        'is_active': True,
        'sort_order': 1,
        'features': [
            "1 ta faol e'lon",
            "Asosiy profil",
            "Bron so'rovlari",
            "Mijozlar bilan aloqa",
        ],
        'features_ru': [
            "1 активное объявление",
            "Базовый профиль",
            "Запросы бронирования",
            "Связь с клиентами",
        ],
        'features_en': [
            "1 active listing",
            "Basic profile",
            "Booking requests",
            "Client communication",
        ],
    },
    {
        'slug': 'comfort',
        'name': "Comfort",
        'name_ru': "Комфорт",
        'name_en': "Comfort",
        'description': "Kengaytirilgan imkoniyatlar. 5 tagacha joy.",
        'description_ru': "Расширенные возможности. До 5 мест.",
        'description_en': "Extended features. Up to 5 listings.",
        'price': 99000,
        'duration_days': 30,
        'max_places': 5,
        'is_free': False,
        'is_active': True,
        'sort_order': 2,
        'features': [
            "5 tagacha faol e'lon",
            "Kengaytirilgan profil",
            "Bron statistikasi",
            "Reklama qo'llab-quvvatlash",
            "Ustuvor ko'rsatish",
        ],
        'features_ru': [
            "До 5 активных объявлений",
            "Расширенный профиль",
            "Статистика бронирования",
            "Рекламная поддержка",
            "Приоритетный показ",
        ],
        'features_en': [
            "Up to 5 active listings",
            "Extended profile",
            "Booking statistics",
            "Advertising support",
            "Priority showing",
        ],
    },
    {
        'slug': 'premium',
        'name': "Premium",
        'name_ru': "Премиум",
        'name_en': "Premium",
        'description': "Maksimal imkoniyatlar. 10 tagacha joy.",
        'description_ru': "Максимальные возможности. До 10 мест.",
        'description_en': "Maximum features. Up to 10 listings.",
        'price': 199000,
        'duration_days': 30,
        'max_places': 10,
        'is_free': False,
        'is_active': True,
        'sort_order': 3,
        'features': [
            "10 tagacha faol e'lon",
            "Premium badge",
            "API integratsiya",
            "Ustuvor moderatsiya",
            "Shaxsiy menejer",
            "Batafsil tahlil",
        ],
        'features_ru': [
            "До 10 активных объявлений",
            "Премиум значок",
            "API интеграция",
            "Приоритетная модерация",
            "Личный менеджер",
            "Подробная аналитика",
        ],
        'features_en': [
            "Up to 10 active listings",
            "Premium badge",
            "API integration",
            "Priority moderation",
            "Personal manager",
            "Detailed analytics",
        ],
    },
]

created = 0
for plan_data in plans:
    obj, was_created = TariffPlan.objects.update_or_create(
        slug=plan_data['slug'],
        defaults=plan_data
    )
    if was_created:
        created += 1
        print(f"  Created: {obj}")
    else:
        print(f"  Updated: {obj}")

print(f"\nDone! {created} created, {len(plans)-created} updated.")
