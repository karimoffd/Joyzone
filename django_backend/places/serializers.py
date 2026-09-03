from rest_framework import serializers
from .models import Place, Category, SubCategory, Review, ParameterGroup, Parameter, Discount, Favorite


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
            'id', 'slug', 'category', 'name_uz', 'name_ru', 'name_en',
            'parameters', 'parameter_ids', 'order'
        )


class CategoryWithSubsSerializer(serializers.ModelSerializer):
    """Full category tree with nested subcategories - used by frontend forms."""
    subcategories = SubCategorySerializer(many=True, read_only=True)

    class Meta:
        model = Category
        fields = ('id', 'slug', 'name_uz', 'name_ru', 'name_en', 'icon', 'order', 'subcategories')


class PlaceSerializer(serializers.ModelSerializer):
    owner_name = serializers.SerializerMethodField()
    moderated_by_name = serializers.SerializerMethodField()
    subcategory_info = SubCategorySerializer(source='subcategory', read_only=True)
    category_name = serializers.SerializerMethodField()
    subcategory_name = serializers.SerializerMethodField()

    class Meta:
        model = Place
        fields = '__all__'
        read_only_fields = ('status', 'moderated_by', 'moderated_at', 'created_at', 'updated_at', 'owner')

    def get_owner_name(self, obj):
        if obj.owner:
            return obj.owner.get_full_name() or obj.owner.username
        return None

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
    
    class Meta:
        model = Review
        fields = '__all__'
        read_only_fields = ('user',)

    def get_user_name(self, obj):
        if obj.user:
            return obj.user.get_full_name() or obj.user.username
        return "Foydalanuvchi"


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
