from django.db import models

class SiteContent(models.Model):
    key = models.CharField(max_length=255, unique=True, verbose_name="Ключ контента")
    value_ru = models.TextField(blank=True, verbose_name="Текст (RU)")
    value_uz = models.TextField(blank=True, verbose_name="Текст (UZ)")
    
    def __str__(self):
        return self.key

    class Meta:
        verbose_name = "Контент сайта"
        verbose_name_plural = "Контент сайта"
