from django.db import models
from users.models import User


class Category(models.Model):
    """3 main top-level categories: Ofis, Kovorking, Zal/Tadbir"""
    slug = models.SlugField(unique=True)
    name_uz = models.CharField(max_length=100)
    name_ru = models.CharField(max_length=100)
    name_en = models.CharField(max_length=100)
    icon = models.CharField(max_length=10, default='🏢')
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['order']
        verbose_name = 'Category'
        verbose_name_plural = 'Categories'

    def __str__(self):
        return self.name_ru


class ParameterGroup(models.Model):
    slug = models.SlugField(unique=True)
    name_uz = models.CharField(max_length=100)
    name_ru = models.CharField(max_length=100)
    name_en = models.CharField(max_length=100)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['order']
        verbose_name = 'Parameter Group'
        verbose_name_plural = 'Parameter Groups'

    def __str__(self):
        return self.name_ru


class Parameter(models.Model):
    TYPE_CHOICES = (
        ('boolean', 'Checkbox (Да/Нет)'),
        ('counter', 'Counter (Число)'),
        ('select', 'Dropdown Select (Список)'),
    )
    group = models.ForeignKey(ParameterGroup, on_delete=models.CASCADE, related_name='parameters')
    slug = models.SlugField(unique=True)
    name_uz = models.CharField(max_length=100)
    name_ru = models.CharField(max_length=100)
    name_en = models.CharField(max_length=100)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='boolean')
    icon = models.CharField(max_length=50, blank=True)
    config = models.JSONField(default=dict, blank=True, help_text="Additional config for specific types (e.g. min, max, unit for counter; options for select)")
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['group__order', 'order']
        verbose_name = 'Parameter'
        verbose_name_plural = 'Parameters'

    def __str__(self):
        return f"{self.group.name_ru} -> {self.name_ru}"


class SubCategory(models.Model):
    """3 subcategories per each main category"""
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='subcategories')
    slug = models.SlugField(unique=True)
    name_uz = models.CharField(max_length=100)
    name_ru = models.CharField(max_length=100)
    name_en = models.CharField(max_length=100)
    
    parameters = models.ManyToManyField(Parameter, related_name='subcategories', blank=True)

    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['order']
        verbose_name = 'SubCategory'
        verbose_name_plural = 'SubCategories'

    def __str__(self):
        return f"{self.category.name_ru} → {self.name_ru}"


class Place(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending Moderation'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    )

    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='places', null=True, blank=True)
    title = models.CharField(max_length=255)

    # Category reference (replaces old plain text 'category' field)
    subcategory = models.ForeignKey(
        SubCategory, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='places'
    )
    # Keep legacy plain-text field for backwards compatibility with old seeds
    category = models.CharField(max_length=100, blank=True)

    location = models.CharField(max_length=255)
    # Precise geodata from Yandex Maps picker
    latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)

    # Pricing details (base minimum price as CharField for legacy, JSON for hourly/daily/weekly/monthly)
    price = models.CharField(max_length=100)
    prices = models.JSONField(default=dict, blank=True, help_text='Detailed prices e.g. {"soatlik": 50000, "kunlik": 400000}')
    
    # Booking preference
    booking_type = models.CharField(max_length=50, default='request', choices=[('instant', 'Instant Booking'), ('request', 'By Request')])

    area = models.IntegerField()
    people = models.IntegerField()
    promoted = models.BooleanField(default=False)
    images = models.JSONField(default=list)

    # Dynamic characteristics dict, keys defined by SubCategory.characteristics_schema
    # e.g. {"desks": 12, "cabinets": 3, "restrooms": 2}
    characteristics = models.JSONField(default=dict, blank=True)

    # Selected amenities: list of slugs e.g. ["wifi", "parking", "projector"]
    amenities = models.JSONField(default=list, blank=True)

    # Free-form description in multiple languages
    description_uz = models.TextField(blank=True)
    description_ru = models.TextField(blank=True)
    description_en = models.TextField(blank=True)

    # Moderation
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    moderator_note = models.TextField(blank=True)
    moderated_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='moderated_places'
    )
    moderated_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} [{self.status}]"

class Review(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews')
    place = models.ForeignKey(Place, on_delete=models.CASCADE, related_name='reviews')
    rating = models.IntegerField(default=5)
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Review by {self.user.username} on {self.place.title}"


class Discount(models.Model):
    DISCOUNT_TYPES = (
        ('new_listing', 'New Listing Promo'),
        ('last_minute', 'Last Minute Discount'),
        ('weekly', 'Weekly Discount'),
        ('monthly', 'Monthly Discount'),
        ('custom', 'Custom Discount'),
    )
    name_uz = models.CharField(max_length=255)
    name_ru = models.CharField(max_length=255)
    name_en = models.CharField(max_length=255, blank=True)
    description_ru = models.TextField(blank=True)
    percent = models.PositiveIntegerField()
    discount_type = models.CharField(max_length=50, choices=DISCOUNT_TYPES, default='new_listing')
    applicable_to = models.CharField(max_length=50, choices=[('all', 'All Categories'), ('specific', 'Specific Categories')], default='all')
    categories = models.ManyToManyField(Category, related_name='discounts', blank=True)
    is_active = models.BooleanField(default=True)
    min_nights = models.PositiveIntegerField(null=True, blank=True)
    max_bookings = models.PositiveIntegerField(null=True, blank=True)
    days_before = models.PositiveIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name_ru} ({self.percent}%)"


class Favorite(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='user_favorites', null=True, blank=True)
    user_token = models.CharField(max_length=255, blank=True, null=True, db_index=True)
    place = models.ForeignKey(Place, on_delete=models.CASCADE, related_name='favorited_by')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Favorite: {self.place.title}"
