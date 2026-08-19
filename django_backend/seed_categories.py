"""
Seed script: creates the 3 main categories and their 3 subcategories each,
complete with characteristics_schema and amenities_schema for the partner form.

Run:  python seed_categories.py
"""
import os
import sys
import django

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from places.models import Category, SubCategory

# ──────────────────────────────────────────────────────────────────────────────
# Helper
# ──────────────────────────────────────────────────────────────────────────────

def counter(key, label_uz, label_ru, label_en, min_val=1, default=1):
    return {"key": key, "type": "counter", "min": min_val, "default": default,
            "label_uz": label_uz, "label_ru": label_ru, "label_en": label_en}

# ──────────────────────────────────────────────────────────────────────────────
# Category + SubCategory data
# ──────────────────────────────────────────────────────────────────────────────

CATEGORIES = [
    {
        "slug": "ofis",
        "name_uz": "Ofis",
        "name_ru": "Офис",
        "name_en": "Office",
        "icon": "🏢",
        "order": 1,
        "subcategories": [
            {
                "slug": "mini-ofis",
                "name_uz": "Mini-ofis",
                "name_ru": "Мини-офис",
                "name_en": "Mini-Office",
                "order": 1,
                "characteristics_schema": [
                    counter("cabinets", "Xonalar soni", "Количество комнат", "Number of rooms", default=2),
                    counter("workplaces", "Ish o'rinlari", "Рабочих мест", "Workplaces", default=6),
                    counter("meeting_rooms", "Muzokaralar xonasi", "Переговорных комнат", "Meeting rooms", min_val=0, default=1),
                    counter("restrooms", "Hojatxona", "Санузлов", "Restrooms", default=1),
                ],
                "amenities_schema": ["wifi", "parking", "kitchen", "access_24_7", "security", "reception"],
            },
            {
                "slug": "kabinet",
                "name_uz": "Alohida kabinet",
                "name_ru": "Отдельный кабинет",
                "name_en": "Private Cabinet",
                "order": 2,
                "characteristics_schema": [
                    counter("workplaces", "Ish o'rinlari", "Рабочих мест", "Workplaces", default=4),
                    counter("floor", "Qavat", "Этаж", "Floor", min_val=1, default=3),
                    counter("area", "Maydon (m²)", "Площадь (м²)", "Area (m²)", min_val=5, default=25),
                    counter("restrooms", "Hojatxona", "Санузлов", "Restrooms", min_val=0, default=1),
                ],
                "amenities_schema": ["wifi", "printer", "air_conditioning", "parking", "kitchen", "access_24_7"],
            },
            {
                "slug": "open-space-ofis",
                "name_uz": "Open-space",
                "name_ru": "Open Space офис",
                "name_en": "Open Space Office",
                "order": 3,
                "characteristics_schema": [
                    counter("workplaces", "Ish o'rinlari", "Рабочих мест", "Workplaces", default=20),
                    counter("meeting_rooms", "Muzokaralar xonasi", "Переговорных зон", "Meeting areas", min_val=0, default=2),
                    counter("restrooms", "Hojatxona", "Санузлов", "Restrooms", default=2),
                    counter("floors", "Qavatlar soni", "Этажей", "Floors", min_val=1, default=1),
                ],
                "amenities_schema": ["wifi", "printer", "kitchen", "lounge", "parking", "access_24_7", "security"],
            },
        ],
    },
    {
        "slug": "kovorking",
        "name_uz": "Kovorking",
        "name_ru": "Коворкинг",
        "name_en": "Coworking",
        "icon": "💻",
        "order": 2,
        "subcategories": [
            {
                "slug": "hot-desk",
                "name_uz": "Erkin ish joyi",
                "name_ru": "Горячий стол (Hot Desk)",
                "name_en": "Hot Desk",
                "order": 1,
                "characteristics_schema": [
                    counter("hot_desks", "Erkin joylar", "Свободных мест", "Free desks", default=30),
                    counter("skype_booths", "Skype-kabinalar", "Skype-кабин", "Skype booths", min_val=0, default=2),
                    counter("restrooms", "Hojatxona", "Санузлов", "Restrooms", default=2),
                ],
                "amenities_schema": ["wifi", "coffee_tea", "locker", "lounge", "air_conditioning", "printer"],
            },
            {
                "slug": "fixed-desk",
                "name_uz": "Belgilangan ish joyi",
                "name_ru": "Закреплённое место (Fixed Desk)",
                "name_en": "Fixed Desk",
                "order": 2,
                "characteristics_schema": [
                    counter("fixed_desks", "Belgilangan joylar", "Закреплённых мест", "Fixed desks", default=15),
                    counter("skype_booths", "Skype-kabinalar", "Skype-кабин", "Skype booths", min_val=0, default=2),
                    counter("lockers", "Shaxsiy shkafchalar", "Личных локеров", "Personal lockers", min_val=0, default=10),
                    counter("restrooms", "Hojatxona", "Санузлов", "Restrooms", default=2),
                ],
                "amenities_schema": ["wifi", "locker", "coffee_tea", "access_24_7", "air_conditioning", "printer", "lounge"],
            },
            {
                "slug": "kunlik-abonement",
                "name_uz": "Kunlik abonement",
                "name_ru": "Дневной абонемент",
                "name_en": "Day Pass",
                "order": 3,
                "characteristics_schema": [
                    counter("total_seats", "Jami o'rinlar", "Всего мест", "Total seats", default=50),
                    counter("meeting_rooms", "Muzokaralar xonasi", "Переговорных комнат", "Meeting rooms", min_val=0, default=3),
                    counter("restrooms", "Hojatxona", "Санузлов", "Restrooms", default=3),
                ],
                "amenities_schema": ["wifi", "coffee_tea", "printer", "lounge", "air_conditioning", "projector"],
            },
        ],
    },
    {
        "slug": "zal-tadbir",
        "name_uz": "Zal / Tadbir joyi",
        "name_ru": "Зал / Мероприятие",
        "name_en": "Hall / Event Venue",
        "icon": "🎭",
        "order": 3,
        "subcategories": [
            {
                "slug": "konferens-zal",
                "name_uz": "Konferens-zal",
                "name_ru": "Конференц-зал",
                "name_en": "Conference Hall",
                "order": 1,
                "characteristics_schema": [
                    counter("capacity", "Sig'im (kishi)", "Вместимость (чел.)", "Capacity (people)", default=50),
                    counter("chairs", "Stullar soni", "Количество стульев", "Number of chairs", default=50),
                    counter("screens", "Ekranlar", "Экранов/Проекторов", "Screens/Projectors", min_val=0, default=1),
                    counter("microphones", "Mikrofonlar", "Микрофонов", "Microphones", min_val=0, default=2),
                    counter("restrooms", "Hojatxona", "Санузлов", "Restrooms", default=2),
                ],
                "amenities_schema": ["projector", "audio_system", "microphones", "flipchart", "wifi", "air_conditioning", "catering_zone"],
            },
            {
                "slug": "lektoriy",
                "name_uz": "Lektoriy",
                "name_ru": "Лекторий",
                "name_en": "Lecture Hall",
                "order": 2,
                "characteristics_schema": [
                    counter("capacity", "Sig'im (kishi)", "Вместимость (чел.)", "Capacity (people)", default=80),
                    counter("chairs", "Stullar soni", "Количество стульев", "Number of chairs", default=80),
                    counter("screens", "Ekranlar/Projektorlar", "Экранов/Проекторов", "Screens/Projectors", default=1),
                    counter("stages", "Sahnalar", "Сцен", "Stages", min_val=0, default=1),
                    counter("restrooms", "Hojatxona", "Санузлов", "Restrooms", default=3),
                ],
                "amenities_schema": ["projector", "audio_system", "microphones", "stage", "wifi", "air_conditioning", "catering_zone", "livestream"],
            },
            {
                "slug": "muzokaralar-xonasi",
                "name_uz": "Muzokaralar xonasi",
                "name_ru": "Переговорная комната",
                "name_en": "Meeting Room",
                "order": 3,
                "characteristics_schema": [
                    counter("capacity", "Sig'im (kishi)", "Вместимость (чел.)", "Capacity (people)", default=10),
                    counter("chairs", "Stullar soni", "Количество стульев", "Number of chairs", default=10),
                    counter("screens", "Ekranlar", "Экранов/ТВ", "Screens/TV", min_val=0, default=1),
                    counter("restrooms", "Hojatxona", "Санузлов", "Restrooms", min_val=0, default=1),
                ],
                "amenities_schema": ["projector", "tv_screen", "flipchart", "whiteboard", "wifi", "air_conditioning", "coffee_tea"],
            },
        ],
    },
]

# ──────────────────────────────────────────────────────────────────────────────
# Seed
# ──────────────────────────────────────────────────────────────────────────────

def seed():
    print("Seeding categories...")
    Category.objects.all().delete()
    SubCategory.objects.all().delete()

    for cat_data in CATEGORIES:
        subs = cat_data.pop("subcategories")
        cat, _ = Category.objects.update_or_create(
            slug=cat_data["slug"],
            defaults=cat_data,
        )
        print(f"  [OK] Category: {cat.name_ru}")
        for sub_data in subs:
            sub, _ = SubCategory.objects.update_or_create(
                slug=sub_data["slug"],
                defaults={**sub_data, "category": cat},
            )
            print(f"       -- SubCategory: {sub.name_ru}")

    print("\nDone! Categories seeded.")

if __name__ == "__main__":
    seed()
