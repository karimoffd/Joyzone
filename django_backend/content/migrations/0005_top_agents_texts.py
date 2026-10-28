"""Rename the home "partners" block to "Top agents".

Only values still equal to the old defaults are replaced, so texts an admin
already edited stay untouched. The single "Premium partner" badge is retired:
badges now follow each agent's tariff (agent_badge_premium / agent_badge_comfort).
"""

from django.db import migrations

OLD_TO_NEW = {
    'agent_title': {
        'value_uz': ('Joyzone hamkorlari', 'Top agentlar'),
        'value_ru': ('Партнеры Joyzone', 'Топ агенты'),
        'value_en': ('Joyzone Partners', 'Top agents'),
    },
    'agent_sub': {
        'value_uz': (
            "Katta brendlar va ishonchli hamkorlar o'z ofis, kovorking, uy va tadbir maydonlarini Joyzone orqali joylashtiradi.",
            "Joyzone'dagi eng faol va ishonchli joy egalari.",
        ),
        'value_ru': (
            'Крупные бренды и надежные партнеры размещают свои офисы и залы через Joyzone.',
            'Самые активные и надёжные владельцы мест на Joyzone.',
        ),
        'value_en': (
            'Top brands and reliable partners list their spaces on Joyzone.',
            'The most active and trusted space owners on Joyzone.',
        ),
    },
}


def forwards(apps, schema_editor):
    SiteContent = apps.get_model('content', 'SiteContent')
    for key, fields in OLD_TO_NEW.items():
        item = SiteContent.objects.filter(key=key).first()
        if item is None:
            continue
        changed = False
        for field, (old, new) in fields.items():
            if getattr(item, field) == old:
                setattr(item, field, new)
                changed = True
        if changed:
            item.save()
    SiteContent.objects.filter(key='agent_premium').delete()


class Migration(migrations.Migration):
    dependencies = [
        ('content', '0004_seed_banners'),
    ]

    operations = [
        migrations.RunPython(forwards, migrations.RunPython.noop),
    ]
