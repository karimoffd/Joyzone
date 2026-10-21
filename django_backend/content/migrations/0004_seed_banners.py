"""Move the three slides that used to be hardcoded in the frontend into the DB."""

from django.db import migrations


SLIDES = [
    {
        'eyebrow_uz': 'Konferensiya zallari', 'eyebrow_ru': 'Конференц-залы', 'eyebrow_en': 'Conference rooms',
        'title_uz': "Premium uchrashuvlar uchun tayyor zallar",
        'title_ru': 'Залы, готовые для премиальных встреч',
        'title_en': 'Halls ready for premium meetings',
        'image': 'https://images.unsplash.com/photo-1758711516684-e7a87556015e?auto=format&fit=crop&w=1400&q=88',
    },
    {
        'eyebrow_uz': 'Kovorking', 'eyebrow_ru': 'Коворкинг', 'eyebrow_en': 'Coworking',
        'title_uz': "Jamoalar uchun yorug' va qulay ish maydoni",
        'title_ru': 'Светлое и удобное рабочее пространство для команд',
        'title_en': 'A bright, comfortable workspace for teams',
        'image': 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1200&q=88',
    },
    {
        'eyebrow_uz': 'Apartamentlar', 'eyebrow_ru': 'Апартаменты', 'eyebrow_en': 'Apartments',
        'title_uz': "Safarlar, uchrashuvlar va dam olish bir joyda",
        'title_ru': 'Поездки, встречи и отдых в одном месте',
        'title_en': 'Trips, meetings and rest in one place',
        'image': 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=88',
    },
]


def seed(apps, schema_editor):
    Banner = apps.get_model('content', 'Banner')
    if Banner.objects.exists():
        return
    for order, slide in enumerate(SLIDES):
        Banner.objects.create(order=order, **slide)


class Migration(migrations.Migration):

    dependencies = [
        ('content', '0003_banner'),
    ]

    operations = [
        migrations.RunPython(seed, migrations.RunPython.noop),
    ]
