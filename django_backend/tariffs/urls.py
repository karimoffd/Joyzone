from django.urls import path
from .views import (
    TariffPlanListView, TariffPlanDetailView, TariffPlanCreateView,
    SubscribeToTariffView, MySubscriptionsView,
    AdminSubscriptionsView, ActivateSubscriptionView
)

urlpatterns = [
    path('', TariffPlanListView.as_view(), name='tariff-list'),
    path('create/', TariffPlanCreateView.as_view(), name='tariff-create'),
    path('<int:pk>/', TariffPlanDetailView.as_view(), name='tariff-detail'),
    path('subscribe/', SubscribeToTariffView.as_view(), name='tariff-subscribe'),
    path('my-subscriptions/', MySubscriptionsView.as_view(), name='my-subscriptions'),
    path('admin/subscriptions/', AdminSubscriptionsView.as_view(), name='admin-subscriptions'),
    path('admin/subscriptions/<int:pk>/activate/', ActivateSubscriptionView.as_view(), name='activate-subscription'),
]
