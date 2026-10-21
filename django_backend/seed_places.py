import os
import django
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from places.models import Place
from users.models import User


def normalized_price_fields(price_text):
    digits = ''.join(ch for ch in str(price_text) if ch.isdigit())
    if not digits:
        return {}

    text = str(price_text).lower()
    value = int(digits)
    if 'soat' in text:
        return {'price_hourly': value, 'currency': 'UZS'}
    if 'hafta' in text:
        return {'price_weekly': value, 'currency': 'UZS'}
    if 'oy' in text:
        return {'price_monthly': value, 'currency': 'UZS'}
    return {'price_daily': value, 'currency': 'UZS'}


reset = '--reset' in sys.argv
if reset:
    print("Reset mode enabled: clearing existing places...")
    Place.objects.all().delete()
else:
    print("Safe mode: updating/creating demo places without deleting existing places.")

# Get a default owner if users exist
owner = User.objects.first()
if owner:
    print(f"Assigning places to user: {owner.username}")
else:
    print("No users found in database, places will have no owner.")

places_data = [
    {
        "title": "C-Space Yunusobod",
        "category": "Kovorking",
        "location": "Yunusobod tumani, 19-mavze",
        "price": "Kuniga 80,000 so'm",
        "area": 450,
        "people": 50,
        "images": [
            "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=800&q=80"
        ],
        "promoted": True,
        "status": "pending"
    },
    {
        "title": "GroundZero KitobOlam",
        "category": "Konferentsiya zallari",
        "location": "Mirzo Ulug'bek, Mustaqillik shoh ko'chasi",
        "price": "Soatiga 200,000 so'm",
        "area": 120,
        "people": 80,
        "images": [
            "https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=800&q=80"
        ],
        "promoted": False,
        "status": "pending"
    },
    {
        "title": "Impact Technology Hub",
        "category": "Ofislar",
        "location": "Yakkasaroy, Shota Rustaveli",
        "price": "Oyiga 5,000,000 so'm",
        "area": 35,
        "people": 8,
        "images": [
            "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=800&q=80"
        ],
        "promoted": False,
        "status": "approved",
        "moderator_note": "Проверено и соответствует стандартам площадки."
    },
    {
        "title": "TechHub Tashkent",
        "category": "Muzokara xonalari",
        "location": "Mirobod, Afrosiyob ko'chasi",
        "price": "Soatiga 150,000 so'm",
        "area": 20,
        "people": 12,
        "images": [
            "https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&fit=crop&w=800&q=80"
        ],
        "promoted": True,
        "status": "rejected",
        "moderator_note": "Фотографии размыты. Пожалуйста, сделайте более чёткие снимки при дневном освещении."
    }
]

for item in places_data:
    place, created = Place.objects.update_or_create(
        title=item["title"],
        defaults={
            "owner": owner,
            "category": item["category"],
            "location": item["location"],
            "price": item["price"],
            "area": item["area"],
            "people": item["people"],
            "promoted": item["promoted"],
            "images": item["images"],
            "status": item["status"],
            "moderator_note": item.get("moderator_note", ""),
            **normalized_price_fields(item["price"]),
        },
    )
    print(f"{'Created' if created else 'Updated'}: {place.title}")

print("Mock places for moderation seeded successfully.")
