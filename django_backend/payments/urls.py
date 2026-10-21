from django.urls import path

from .views import MyPaymentsView, PaymentRefundView, TestPayView


urlpatterns = [
    path('test-pay/', TestPayView.as_view(), name='test-pay'),
    path('my/', MyPaymentsView.as_view(), name='my-payments'),
    path('<int:pk>/refund/', PaymentRefundView.as_view(), name='payment-refund'),
]
