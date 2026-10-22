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


class CategoryWithSubsSerializer(serializers.ModelSerializer):
    """Full category tree with nested subcategories - used by frontend forms."""
    subcategories = SubCategorySerializer(many=True, read_only=True)

    class Meta:
        model = Category
        fields = ('id', 'slug', 'name_uz', 'name_ru', 'name_en', 'icon', 'order', 'subcategories')


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
