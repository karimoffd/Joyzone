from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import BannerViewSet, ContentView

router = DefaultRouter()
router.register(r'banners', BannerViewSet, basename='banner')

urlpatterns = [
    path('', ContentView.as_view(), name='content-api'),
    path('', include(router.urls)),
]
