from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from places.views import PlaceViewSet, CategoryViewSet, SubCategoryViewSet, ReviewViewSet, ParameterGroupViewSet, ParameterViewSet, DiscountViewSet, favorite_list, favorite_toggle
from bookings.views import BookingViewSet

router = DefaultRouter()
router.register(r'places', PlaceViewSet, basename='place')
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'subcategories', SubCategoryViewSet, basename='subcategory')
router.register(r'bookings', BookingViewSet, basename='booking')
router.register(r'reviews', ReviewViewSet, basename='review')
router.register(r'parameter-groups', ParameterGroupViewSet, basename='parameter-group')
router.register(r'parameters', ParameterViewSet, basename='parameter')
router.register(r'discounts', DiscountViewSet, basename='discount')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('users.urls')),
    path('api/content/', include('content.urls')),
    path('api/tariffs/', include('tariffs.urls')),
    path('api/notifications/', include('notifications.urls')),
    path('api/favorites/', favorite_list, name='favorite-list'),
    path('api/favorites/toggle/', favorite_toggle, name='favorite-toggle'),
    path('api/', include(router.urls)),
]


from django.conf import settings
from django.conf.urls.static import static

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
