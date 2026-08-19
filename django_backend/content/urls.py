from django.urls import path
from .views import ContentView

urlpatterns = [
    path('', ContentView.as_view(), name='content-api'),
]
