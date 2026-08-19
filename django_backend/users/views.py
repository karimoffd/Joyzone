from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.throttling import AnonRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from .models import OTPVerification
from .serializers import UserSerializer, SendOTPSerializer, VerifyOTPSerializer
import random

User = get_user_model()


class OTPSendThrottle(AnonRateThrottle):
    """3 OTP send requests per minute per IP — prevents SMS spam."""
    rate = '3/minute'
    scope = 'otp_send'


class OTPVerifyThrottle(AnonRateThrottle):
    """5 OTP verify attempts per minute per IP — brute-force guard."""
    rate = '5/minute'
    scope = 'otp_verify'

class SendOTPView(APIView):
    permission_classes = (permissions.AllowAny,)
    throttle_classes = [OTPSendThrottle]

    def post(self, request):
        serializer = SendOTPSerializer(data=request.data)
        if serializer.is_valid():
            phone = serializer.validated_data['phone_number']
            otp_code = str(random.randint(100000, 999999))
            
            # Save to DB
            OTPVerification.objects.create(phone_number=phone, otp_code=otp_code)
            
            # TODO: Send via Telegram Bot. For now, print to console.
            print(f"=== OTP for {phone} is: {otp_code} ===", flush=True)
            
            return Response({"detail": "OTP sent successfully (check server console for now)."})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class VerifyOTPView(APIView):
    permission_classes = (permissions.AllowAny,)
    throttle_classes = [OTPVerifyThrottle]

    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        if serializer.is_valid():
            phone = serializer.validated_data['phone_number']
            otp_code = serializer.validated_data['otp_code']
            
            # Verify OTP (allow '111111' bypass for local dev)
            if otp_code == '111111':
                otp_obj = True
            else:
                otp_obj = OTPVerification.objects.filter(
                    phone_number=phone, otp_code=otp_code, is_used=False
                ).order_by('-created_at').first()
            
            if not otp_obj:
                return Response({"detail": "Invalid or expired OTP code."}, status=status.HTTP_400_BAD_REQUEST)
                
            if otp_obj is not True:
                otp_obj.is_used = True
                otp_obj.save()
            
            # Get or create user
            user, created = User.objects.get_or_create(username=phone, defaults={'phone_number': phone})
            
            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            
            profile_serializer = UserSerializer(user)
            
            return Response({
                "refresh": str(refresh),
                "access": str(refresh.access_token),
                "is_new_user": created,
                "profile": profile_serializer.data
            })
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_object(self):
        return self.request.user


class DevAdminLoginView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        from django.conf import settings
        if not settings.DEBUG:
            return Response({"detail": "Only allowed in DEBUG mode."}, status=403)
        
        admin_user = User.objects.filter(role='admin').first() or User.objects.filter(is_superuser=True).first()
        if not admin_user:
            return Response({"detail": "Admin user not found in database."}, status=404)
        
        refresh = RefreshToken.for_user(admin_user)
        profile_serializer = UserSerializer(admin_user)
        
        return Response({
            "refresh": str(refresh),
            "access": str(refresh.access_token),
            "profile": profile_serializer.data
        })
