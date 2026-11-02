from django.db.models import Avg
from rest_framework import serializers
from .models import Place, Category, SubCategory, Review, ParameterGroup, Parameter, Discount, Favorite, PlaceModerationLog
from .prices import (
    PRICE_FIELDS,
    legacy_price_field,
    normalized_price_fields_from_prices,
    parse_price_value,
)


# Kept as module names because other apps import them from here.
_parse_price_value = parse_price_value
_normalized_price_fields_from_prices = normalized_price_fields_from_prices


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ('id', 'slug', 'name_uz', 'name_ru', 'name_en', 'icon', 'order')


class ParameterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Parameter
        fields = '__all__'


class ParameterGroupSerializer(serializers.ModelSerializer):
    parameters = ParameterSerializer(many=True, read_only=True)
    
    class Meta:
        model = ParameterGroup
        fields = ('id', 'slug', 'name_uz', 'name_ru', 'name_en', 'order', 'parameters')


class SubCategorySerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name_ru', read_only=True)
    category_slug = serializers.CharField(source='category.slug', read_only=True)
    parameters = ParameterSerializer(many=True, read_only=True)
    parameter_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Parameter.objects.all(),
        source='parameters',
        write_only=True,
        required=False
    )

    class Meta:
        model = SubCategory
        fields = (
            'id', 'slug', 'category', 'category_name', 'category_slug', 'name_uz', 'name_ru', 'name_en',
            'parameters', 'parameter_ids', 'order'
        )


FILTER_BASE_KEYS = ('location', 'price', 'area', 'capacity', 'durations', 'extra')
# Buttons whose caption the admin may rename ("features" is the «Qulayliklar» list).
FILTER_LABEL_KEYS = ('location', 'price', 'area', 'capacity', 'features', 'extra')
FILTER_MAX_LABEL = 40
FILTER_MAX_AREA_RANGES = 8
FILTER_MAX_STEPS = 8


def _filter_number(value, field):
    if value in (None, ''):
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        raise serializers.ValidationError(f'{field}: нужно число.')
    if number < 0:
        raise serializers.ValidationError(f'{field}: число не может быть отрицательным.')
    return int(number) if number.is_integer() else number


def clean_filter_config(value):
    """Keep only the known filter settings, in a fixed shape."""
    if value in (None, ''):
        return {}
    if not isinstance(value, dict):
        raise serializers.ValidationError('Настройки фильтра должны быть объектом.')

    clean = {}
    base = value.get('base') or {}
    if not isinstance(base, dict):
        raise serializers.ValidationError('base: нужен объект.')
    clean_base = {key: bool(base[key]) for key in FILTER_BASE_KEYS if key in base}
    if clean_base:
        clean['base'] = clean_base

    labels = value.get('labels') or {}
    if not isinstance(labels, dict):
        raise serializers.ValidationError('labels: нужен объект.')
    clean_labels = {}
    for key in FILTER_LABEL_KEYS:
        text = str(labels.get(key) or '').strip()
        if len(text) > FILTER_MAX_LABEL:
            raise serializers.ValidationError(f'Название кнопки длиннее {FILTER_MAX_LABEL} символов.')
        if text:
            clean_labels[key] = text
    if clean_labels:
        clean['labels'] = clean_labels

    if 'area_ranges' in value:
        ranges = value.get('area_ranges') or []
        if not isinstance(ranges, list) or len(ranges) > FILTER_MAX_AREA_RANGES:
            raise serializers.ValidationError(f'Диапазонов площади может быть не больше {FILTER_MAX_AREA_RANGES}.')
        clean_ranges = []
        for item in ranges:
            if not isinstance(item, dict):
                raise serializers.ValidationError('Диапазон площади: нужен объект {min, max}.')
            low = _filter_number(item.get('min'), 'Площадь от')
            high = _filter_number(item.get('max'), 'Площадь до')
            if low is None and high is None:
                raise serializers.ValidationError('Диапазон площади: укажите «от» или «до».')
            if low is not None and high is not None and low >= high:
                raise serializers.ValidationError('Диапазон площади: «от» должно быть меньше «до».')
            clean_ranges.append({'min': low, 'max': high})
        clean['area_ranges'] = clean_ranges

    params = value.get('params') or {}
    if not isinstance(params, dict):
        raise serializers.ValidationError('params: нужен объект.')
    clean_params = {}
    for slug, settings in params.items():
        if not isinstance(settings, dict):
            raise serializers.ValidationError(f'{slug}: нужен объект.')
        entry = {}
        if 'show' in settings:
            entry['show'] = bool(settings['show'])
        if 'separate' in settings:
            entry['separate'] = bool(settings['separate'])
        if settings.get('order') is not None:
            order = _filter_number(settings['order'], f'{slug}: порядок')
            entry['order'] = int(order)
        if 'steps' in settings:
            steps = settings.get('steps') or []
            if not isinstance(steps, list) or len(steps) > FILTER_MAX_STEPS:
                raise serializers.ValidationError(f'{slug}: шагов может быть не больше {FILTER_MAX_STEPS}.')
            numbers = [_filter_number(step, f'{slug}: шаг') for step in steps]
            entry['steps'] = sorted({number for number in numbers if number is not None})
        if entry:
            clean_params[str(slug)] = entry
    if clean_params:
        clean['params'] = clean_params
    return clean


class CategoryWithSubsSerializer(serializers.ModelSerializer):
    """Full category tree with nested subcategories - used by frontend forms."""
    subcategories = SubCategorySerializer(many=True, read_only=True)

    class Meta:
        model = Category
        fields = (
            'id', 'slug', 'name_uz', 'name_ru', 'name_en', 'icon', 'deal_types', 'filter_config', 'order',
            'subcategories',
        )

    def validate_filter_config(self, value):
        return clean_filter_config(value)


class PlaceSerializer(serializers.ModelSerializer):
    # Derived from price_* for older clients; writes are mapped in to_internal_value.
    price = serializers.CharField(read_only=True)
    prices = serializers.DictField(read_only=True)
    owner_name = serializers.SerializerMethodField()
    owner_email = serializers.SerializerMethodField()
    owner_phone = serializers.SerializerMethodField()
    moderated_by_name = serializers.SerializerMethodField()
    subcategory_info = SubCategorySerializer(source='subcategory', read_only=True)
    category_name = serializers.SerializerMethodField()
    subcategory_name = serializers.SerializerMethodField()
    bookings_count = serializers.SerializerMethodField()
    rating_avg = serializers.SerializerMethodField()
    reviews_count = serializers.SerializerMethodField()
    moderation_logs = serializers.SerializerMethodField()
    discounts = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Discount.objects.all(),
        required=False
    )
    discount_ids = serializers.SerializerMethodField()

    class Meta:
        model = Place
        fields = '__all__'
        read_only_fields = ('status', 'moderated_by', 'moderated_at', 'created_at', 'updated_at', 'owner')

    def to_internal_value(self, data):
        if isinstance(data, dict):
            data = data.copy()
            if 'discount_ids' in data and 'discounts' not in data:
                data['discounts'] = data.get('discount_ids')
            if 'prices' in data:
                for field_name, value in normalized_price_fields_from_prices(data.get('prices')).items():
                    data.setdefault(field_name, value)
            legacy_price = data.get('price')
            if legacy_price not in (None, '') and not any(data.get(name) not in (None, '') for name in PRICE_FIELDS):
                parsed = parse_price_value(legacy_price)
                if parsed is not None:
                    data[legacy_price_field(legacy_price)] = str(parsed)
        return super().to_internal_value(data)

    def get_owner_name(self, obj):
        if obj.owner:
            return obj.owner.get_full_name() or obj.owner.username
        return None

    def get_owner_email(self, obj):
        return obj.owner.email if obj.owner else ""

    def get_owner_phone(self, obj):
        return obj.owner.phone_number if obj.owner else ""

    def get_moderated_by_name(self, obj):
        if obj.moderated_by:
            return obj.moderated_by.get_full_name() or obj.moderated_by.username
        return None

    def get_category_name(self, obj):
        if obj.subcategory and obj.subcategory.category:
            return obj.subcategory.category.name_ru
        return obj.category

    def get_subcategory_name(self, obj):
        if obj.subcategory:
            return obj.subcategory.name_ru
        return ""

    def get_discount_ids(self, obj):
        return list(obj.discounts.values_list('id', flat=True))

    def get_bookings_count(self, obj):
        annotated = getattr(obj, 'bookings_count', None)
        if annotated is not None:
            return annotated
        return obj.bookings.count()

    def get_rating_avg(self, obj):
        annotated = getattr(obj, 'rating_avg', None)
        if annotated is None:
            annotated = obj.reviews.aggregate(avg=Avg('rating'))['avg']
        if annotated is None:
            return 0
        return round(float(annotated), 1)

    def get_reviews_count(self, obj):
        annotated = getattr(obj, 'reviews_count', None)
        if annotated is not None:
            return annotated
        return obj.reviews.count()

    def get_moderation_logs(self, obj):
        logs = getattr(obj, 'prefetched_moderation_logs', None)
        if logs is None:
            logs = obj.moderation_logs.select_related('actor').all()[:10]
        return PlaceModerationLogSerializer(logs, many=True).data

    def validate(self, attrs):
        attrs = super().validate(attrs)
        opens_at = attrs.get('opens_at', getattr(self.instance, 'opens_at', None))
        closes_at = attrs.get('closes_at', getattr(self.instance, 'closes_at', None))
        if opens_at and closes_at and closes_at <= opens_at:
            raise serializers.ValidationError({'closes_at': 'Closing time must be after opening time.'})
        for field_name in PRICE_FIELDS:
            value = attrs.get(field_name)
            if value is not None and value <= 0:
                raise serializers.ValidationError({field_name: 'Price must be greater than zero.'})
        subcategory = attrs.get('subcategory', getattr(self.instance, 'subcategory', None))
        deal_type = attrs.get('deal_type', getattr(self.instance, 'deal_type', None) or Category.DEAL_RENT)
        if subcategory is not None:
            allowed = subcategory.category.allowed_deal_types
            if 'deal_type' not in attrs and deal_type not in allowed:
                # A category with one deal decides it for the listing.
                deal_type = allowed[0]
            if deal_type not in allowed:
                raise serializers.ValidationError({'deal_type': 'This category does not allow this deal type.'})
        attrs['deal_type'] = deal_type
        if deal_type == Category.DEAL_SALE:
            # A sale listing has one price and is never booked: rental prices,
            # discounts and instant booking do not apply.
            sale_price = attrs.get('sale_price', getattr(self.instance, 'sale_price', None))
            if sale_price is None or sale_price <= 0:
                raise serializers.ValidationError({'sale_price': 'Sale price is required for a sale listing.'})
            for field_name in PRICE_FIELDS:
                attrs[field_name] = None
            attrs['discounts'] = []
            attrs['booking_type'] = 'request'
            return attrs
        attrs['sale_price'] = None
        # An edit that touches prices must leave at least one of them set.
        if self.instance is not None and any(name in attrs for name in PRICE_FIELDS):
            if all(attrs.get(name, getattr(self.instance, name)) is None for name in PRICE_FIELDS):
                raise serializers.ValidationError({'prices': 'At least one price is required.'})
        return attrs

    def validate_images(self, value):
        """Limit to max 10 images per place."""
        if not isinstance(value, list):
            raise serializers.ValidationError("Images must be a list.")
        if len(value) > 10:
            raise serializers.ValidationError("Maximum 10 images allowed per listing.")
        # Removed strict URL validation to allow base64 or blob URLs during frontend dev
        return value

    def validate_characteristics(self, value):
        """Ensure characteristics is a flat key->value dict."""
        if not isinstance(value, dict):
            raise serializers.ValidationError("Characteristics must be a JSON object.")
        for k, v in value.items():
            if not isinstance(v, (int, float, str)):
                raise serializers.ValidationError(f"Value for '{k}' must be a number or string.")
        return value

    def validate_amenities(self, value):
        """Ensure amenities is a list of strings."""
        if not isinstance(value, list):
            raise serializers.ValidationError("Amenities must be a list.")
        for a in value:
            if not isinstance(a, str):
                raise serializers.ValidationError("Each amenity must be a string slug.")
        return value

class ReviewSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    user_avatar = serializers.SerializerMethodField()
    place_title = serializers.CharField(source='place.title', read_only=True)
    
    class Meta:
        model = Review
        fields = '__all__'
        read_only_fields = ('user',)

    def get_user_name(self, obj):
        if obj.user:
            return obj.user.get_full_name() or obj.user.username
        return "Foydalanuvchi"

    def get_user_avatar(self, obj):
        return (obj.user.avatar or '') if obj.user else ''

    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError('Rating must be between 1 and 5.')
        return value

    def validate_comment(self, value):
        comment = str(value or '').strip()
        if not comment:
            raise serializers.ValidationError('Comment cannot be empty.')
        return comment


class PlaceModerationLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()

    class Meta:
        model = PlaceModerationLog
        fields = (
            'id', 'place', 'actor', 'actor_name', 'action',
            'from_status', 'to_status', 'note', 'created_at'
        )

    def get_actor_name(self, obj):
        if obj.actor:
            return obj.actor.get_full_name() or obj.actor.username
        return ""


class DiscountSerializer(serializers.ModelSerializer):
    category_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Category.objects.all(),
        source='categories',
        required=False
    )

    class Meta:
        model = Discount
        fields = (
            'id', 'name_uz', 'name_ru', 'name_en', 'description_ru',
            'percent', 'discount_type', 'applicable_to', 'category_ids',
            'is_active', 'min_nights', 'max_bookings', 'days_before', 'created_at'
        )


class FavoriteSerializer(serializers.ModelSerializer):
    place = PlaceSerializer(read_only=True)

    class Meta:
        model = Favorite
        fields = ('id', 'user_token', 'place', 'created_at')
