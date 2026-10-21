from django.db import models

class SiteContent(models.Model):
    key = models.CharField(max_length=255, unique=True, verbose_name="Ключ контента")
    value_ru = models.TextField(blank=True, verbose_name="Текст (RU)")
    value_uz = models.TextField(blank=True, verbose_name="Текст (UZ)")
    value_en = models.TextField(blank=True, verbose_name="Text (EN)")
    
    def __str__(self):
        return self.key

    class Meta:
        verbose_name = "Контент сайта"
        verbose_name_plural = "Контент сайта"


class Banner(models.Model):
    """Home page slider and auth-screen slider, managed from the admin panel."""

    eyebrow_uz = models.CharField(max_length=120, blank=True)
    eyebrow_ru = models.CharField(max_length=120, blank=True)
    eyebrow_en = models.CharField(max_length=120, blank=True)
    title_uz = models.CharField(max_length=255)
    title_ru = models.CharField(max_length=255, blank=True)
    title_en = models.CharField(max_length=255, blank=True)
    image = models.URLField(max_length=500)
    link = models.CharField(max_length=255, blank=True, help_text='Optional URL or path, e.g. /filter')
    order = models.PositiveSmallIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('order', 'id')
        verbose_name = 'Баннер'
        verbose_name_plural = 'Баннеры'

    def __str__(self):
        return self.title_uz
