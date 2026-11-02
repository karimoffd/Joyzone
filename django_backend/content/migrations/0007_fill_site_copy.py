"""Fill every CMS text in uz/ru/en and update the copy for rent + sale.

site_copy_0007.json is generated from src/data/defaultContent.js: for each key
and language it holds the new text ("value") and the previous default ("old").

A row is written when it is empty, unreadable, still the previous default, or
one of the outdated texts below. Texts an admin wrote by hand stay as they are.
"""

import json
from pathlib import Path

from django.db import migrations

COPY_FILE = Path(__file__).with_name('site_copy_0007.json')
LANG_FIELDS = {'uz': 'value_uz', 'ru': 'value_ru', 'en': 'value_en'}

# Rent-only or test texts that the new copy replaces even though they differ
# from the previous defaults.
OUTDATED = {
    ('hero_title', 'ru'), ('hero_animated_words', 'uz'), ('hero_animated_words', 'ru'),
    ('hero_animated_words', 'en'), ('hero_subtitle', 'uz'), ('hero_subtitle', 'ru'),
    ('hero_subtitle', 'en'), ('how_step1', 'ru'), ('how_step2', 'ru'), ('how_step3', 'ru'),
}


def parse(raw):
    if raw in (None, ''):
        return None
    text = str(raw)
    if not text.lstrip().startswith(('[', '{')):
        return text
    try:
        return json.loads(text)
    except ValueError:
        return None  # e.g. a Python repr saved by an old seed: unreadable on the site


def serialize(value):
    return value if isinstance(value, str) else json.dumps(value, ensure_ascii=False)


CATALOG_LABELS = {'uz': 'Katalog', 'ru': 'Каталог', 'en': 'Catalog'}


def rename_catalog_link(row):
    """The catalog now lists places for sale too, so «Ijaraga joylar» becomes «Katalog»."""
    changed = False
    for lang, field in LANG_FIELDS.items():
        links = parse(getattr(row, field))
        if not isinstance(links, list):
            continue
        for link in links:
            if isinstance(link, dict) and link.get('href') == '/filter' and link.get('label') != CATALOG_LABELS[lang]:
                link['label'] = CATALOG_LABELS[lang]
                changed = True
        setattr(row, field, serialize(links))
    return changed


def fill(apps, schema_editor):
    SiteContent = apps.get_model('content', 'SiteContent')
    copy = json.loads(COPY_FILE.read_text(encoding='utf-8'))
    rows = {row.key: row for row in SiteContent.objects.filter(key__in=copy)}

    for key, languages in copy.items():
        row = rows.get(key) or SiteContent(key=key)
        changed = row.pk is None
        for lang, entry in languages.items():
            field = LANG_FIELDS[lang]
            current = parse(getattr(row, field))
            if current is None or current == entry['old'] or (key, lang) in OUTDATED:
                if current != entry['value']:
                    setattr(row, field, serialize(entry['value']))
                    changed = True
        if key == 'nav_links_arr':
            changed = rename_catalog_link(row) or changed
        if changed:
            row.save()


class Migration(migrations.Migration):
    dependencies = [
        ('content', '0006_hero_interiors_and_subtitle'),
    ]

    operations = [
        migrations.RunPython(fill, migrations.RunPython.noop),
    ]
