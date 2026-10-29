"""Home hero: three people-free interiors (office, coworking, hall) and a
short one-line subtitle. Only rows still holding the seeded values change.
"""

from django.db import migrations

U = 'https://images.unsplash.com/photo-{}?auto=format&fit=crop&w=1600&q=85'

OLD_IMAGES = ('photo-1758711516684', 'photo-1518005020951', 'photo-1505693416388')

BANNERS = [
    dict(
        eyebrow_uz='Ofislar', eyebrow_ru='Офисы', eyebrow_en='Offices',
        title_uz='Jamoangiz uchun tayyor zamonaviy ofislar',
        title_ru='Готовые современные офисы для вашей команды',
        title_en='Modern offices ready for your team',
        image=U.format('1497366811353-6870744d04b2'),
    ),
    dict(
        eyebrow_uz='Kovorking', eyebrow_ru='Коворкинг', eyebrow_en='Coworking',
        title_uz="Yorug' va qulay kovorking zonalari",
        title_ru='Светлые и удобные коворкинг-зоны',
        title_en='Bright, comfortable coworking areas',
        image=U.format('1524758631624-e2822e304c36'),
    ),
    dict(
        eyebrow_uz='Konferens-zallar', eyebrow_ru='Конференц-залы', eyebrow_en='Conference halls',
        title_uz='Uchrashuv va taqdimotlar uchun zallar',
        title_ru='Залы для встреч и презентаций',
        title_en='Halls for meetings and presentations',
        image=U.format('1431540015161-0bf868a2d407'),
    ),
]

SUBTITLE = dict(
    value_uz='Ofis, kovorking va zallarni bir joyda toping va onlayn bron qiling.',
    value_ru='Офисы, коворкинги и залы в одном месте — найдите и забронируйте онлайн.',
    value_en='Find and book offices, coworkings and halls online — all in one place.',
)


def update(apps, schema_editor):
    Banner = apps.get_model('content', 'Banner')
    seeded = [
        banner for banner in Banner.objects.order_by('order', 'id')
        if any(old in banner.image for old in OLD_IMAGES)
    ]
    for banner, fields in zip(seeded, BANNERS):
        for name, value in fields.items():
            setattr(banner, name, value)
        banner.save()

    SiteContent = apps.get_model('content', 'SiteContent')
    row = SiteContent.objects.filter(key='hero_subtitle').first()
    if row and (not row.value_uz or row.value_uz.startswith('Tadbirkorlardan')):
        for name, value in SUBTITLE.items():
            setattr(row, name, value)
        row.save()


class Migration(migrations.Migration):
    dependencies = [
        ('content', '0005_top_agents_texts'),
    ]

    operations = [
        migrations.RunPython(update, migrations.RunPython.noop),
    ]
