import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from places.models import Place

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
        "promoted": True
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
        "promoted": False
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
        "promoted": False
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
        "promoted": True
    }
]

for item in places_data:
    Place.objects.create(
        title=item["title"],
        category=item["category"],
        location=item["location"],
        price=item["price"],
        area=item["area"],
        people=item["people"],
        promoted=item["promoted"],
        images=item["images"]
    )

print("Mock places seeded successfully.")
