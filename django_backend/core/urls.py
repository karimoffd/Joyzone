from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from places.views import PlaceViewSet

router = DefaultRouter()
router.register(r'places', PlaceViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('users.urls')),
    path('api/', include(router.urls)),
]
