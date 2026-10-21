from django.contrib import admin
from .models import (
    Category,
    Discount,
    Favorite,
    Parameter,
    ParameterGroup,
    Place,
    PlaceModerationLog,
    Review,
    SubCategory,
)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'slug', 'name_ru', 'name_uz', 'name_en', 'icon', 'order')
    list_editable = ('order',)
    search_fields = ('slug', 'name_ru', 'name_uz', 'name_en')
    ordering = ('order', 'name_ru')


@admin.register(ParameterGroup)
class ParameterGroupAdmin(admin.ModelAdmin):
    list_display = ('id', 'slug', 'name_ru', 'name_uz', 'name_en', 'order')
    list_editable = ('order',)
    search_fields = ('slug', 'name_ru', 'name_uz', 'name_en')
    ordering = ('order', 'name_ru')


@admin.register(Parameter)
class ParameterAdmin(admin.ModelAdmin):
    list_display = ('id', 'slug', 'name_ru', 'group', 'type', 'order')
    list_filter = ('group', 'type')
    list_editable = ('order',)
    search_fields = ('slug', 'name_ru', 'name_uz', 'name_en', 'group__name_ru')
    autocomplete_fields = ('group',)
    ordering = ('group__order', 'order', 'name_ru')


@admin.register(SubCategory)
class SubCategoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'slug', 'name_ru', 'category', 'order')
    list_filter = ('category',)
    list_editable = ('order',)
    search_fields = ('slug', 'name_ru', 'name_uz', 'name_en', 'category__name_ru')
    autocomplete_fields = ('category',)
    filter_horizontal = ('parameters',)
    ordering = ('category__order', 'order', 'name_ru')


@admin.register(Place)
class PlaceAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'title',
        'owner',
        'subcategory',
        'category',
        'location',
        'price_daily',
        'price_hourly',
        'status',
        'booking_type',
        'promoted',
        'created_at',
    )
    list_filter = ('status', 'booking_type', 'promoted', 'subcategory__category', 'subcategory')
    search_fields = ('title', 'location', 'category', 'owner__username', 'owner__email', 'subcategory__name_ru')
    autocomplete_fields = ('owner', 'subcategory', 'moderated_by')
    filter_horizontal = ('discounts',)
    readonly_fields = ('created_at', 'updated_at', 'moderated_at')


@admin.register(PlaceModerationLog)
class PlaceModerationLogAdmin(admin.ModelAdmin):
    list_display = ('id', 'place', 'action', 'from_status', 'to_status', 'actor', 'created_at')
    list_filter = ('action', 'from_status', 'to_status', 'created_at')
    search_fields = ('place__title', 'actor__username', 'actor__email', 'note')
    autocomplete_fields = ('place', 'actor')
    readonly_fields = ('created_at',)


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('id', 'place', 'user', 'rating', 'created_at')
    list_filter = ('rating', 'created_at')
    search_fields = ('place__title', 'user__username', 'user__email', 'comment')
    autocomplete_fields = ('place', 'user')
    readonly_fields = ('created_at',)


@admin.register(Discount)
class DiscountAdmin(admin.ModelAdmin):
    list_display = ('id', 'name_ru', 'percent', 'discount_type', 'applicable_to', 'is_active', 'created_at')
    list_filter = ('discount_type', 'applicable_to', 'is_active')
    search_fields = ('name_ru', 'name_uz', 'name_en', 'description_ru')
    filter_horizontal = ('categories',)
    readonly_fields = ('created_at',)


@admin.register(Favorite)
class FavoriteAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'user_token', 'place', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('user__username', 'user__email', 'user_token', 'place__title')
    autocomplete_fields = ('user', 'place')
    readonly_fields = ('created_at',)
