"""sitemap.xml for the public frontend.

The React app is a separate site, so URLs point at FRONTEND_BASE_URL. The
frontend web server proxies /sitemap.xml here (see deploy/nginx.conf).
"""

from xml.sax.saxutils import escape

from django.conf import settings
from django.http import HttpResponse
from django.views.decorators.cache import cache_page
from django.views.decorators.http import require_GET

from places.visibility import publicly_visible_places


STATIC_PAGES = (
    ('/', 'daily', '1.0'),
    ('/filter', 'daily', '0.9'),
    ('/partner', 'monthly', '0.6'),
    ('/about-us', 'monthly', '0.5'),
    ('/mobile-info', 'monthly', '0.4'),
    ('/partner-guide', 'monthly', '0.4'),
)


def _url(loc, changefreq, priority, lastmod=None):
    parts = [f'<loc>{escape(loc)}</loc>']
    if lastmod:
        parts.append(f'<lastmod>{lastmod.date().isoformat()}</lastmod>')
    parts.append(f'<changefreq>{changefreq}</changefreq>')
    parts.append(f'<priority>{priority}</priority>')
    return f'  <url>{"".join(parts)}</url>'


@require_GET
@cache_page(60 * 15)
def sitemap_xml(request):
    base = settings.FRONTEND_BASE_URL.rstrip('/')
    urls = [_url(f'{base}{path}', freq, priority) for path, freq, priority in STATIC_PAGES]
    places = publicly_visible_places().only('id', 'updated_at').order_by('-updated_at')
    urls.extend(
        _url(f'{base}/space-{place.id}', 'weekly', '0.8', place.updated_at)
        for place in places.iterator()
    )
    body = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + '\n'.join(urls)
        + '\n</urlset>\n'
    )
    return HttpResponse(body, content_type='application/xml; charset=utf-8')
