from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework.routers import DefaultRouter
from places.views import PlaceViewSet, CategoryViewSet, SubCategoryViewSet, ReviewViewSet, ParameterGroupViewSet, ParameterViewSet, DiscountViewSet, favorite_list, favorite_toggle, favorite_merge
from bookings.views import BookingViewSet
from payments.views import FinanceSummaryView, FinanceTransactionsView
from core.views import AdminOverviewView, AuditLogListView
from core.seo import sitemap_xml

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
    path('sitemap.xml', sitemap_xml, name='sitemap'),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/auth/', include('users.urls')),
    path('api/content/', include('content.urls')),
    path('api/tariffs/', include('tariffs.urls')),
    path('api/payments/', include('payments.urls')),
    path('api/finance/transactions/', FinanceTransactionsView.as_view(), name='finance-transactions'),
    path('api/finance/summary/', FinanceSummaryView.as_view(), name='finance-summary'),
    path('api/notifications/', include('notifications.urls')),
    path('api/admin/overview/', AdminOverviewView.as_view(), name='admin-overview'),
    path('api/audit-logs/', AuditLogListView.as_view(), name='audit-log-list'),
    path('api/favorites/', favorite_list, name='favorite-list'),
    path('api/favorites/toggle/', favorite_toggle, name='favorite-toggle'),
    path('api/favorites/merge/', favorite_merge, name='favorite-merge'),
    path('api/', include(router.urls)),
]


from django.conf import settings
from django.conf.urls.static import static

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
