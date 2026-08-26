from django.urls import path
from .views import SendOTPView, VerifyOTPView, ProfileView, DevAdminLoginView, UserListView, UserDetailView

urlpatterns = [
    path('send-otp/', SendOTPView.as_view(), name='send_otp'),
    path('verify-otp/', VerifyOTPView.as_view(), name='verify_otp'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('dev-admin-login/', DevAdminLoginView.as_view(), name='dev_admin_login'),
    path('users/', UserListView.as_view(), name='users_list'),
    path('users/<int:pk>/', UserDetailView.as_view(), name='user_detail'),
]
