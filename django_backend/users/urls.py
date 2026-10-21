from django.urls import path
from .views import (
    DevAdminLoginView,
    ProfileView,
    JoyzoneTokenRefreshView,
    LogoutView,
    PublicDemoLoginStatusView,
    PublicDemoLoginView,
    SendOTPView,
    UserDetailView,
    UserListView,
    VerifyOTPView,
)

urlpatterns = [
    path('send-otp/', SendOTPView.as_view(), name='send_otp'),
    path('verify-otp/', VerifyOTPView.as_view(), name='verify_otp'),
    path('token/refresh/', JoyzoneTokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('dev-admin-login/', DevAdminLoginView.as_view(), name='dev_admin_login'),
    path('demo-login/status/', PublicDemoLoginStatusView.as_view(), name='public_demo_login_status'),
    path('demo-login/', PublicDemoLoginView.as_view(), name='public_demo_login'),
    path('users/', UserListView.as_view(), name='users_list'),
    path('users/<int:pk>/', UserDetailView.as_view(), name='user_detail'),
]
