from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from .models import OTPVerification
from .serializers import UserSerializer, SendOTPSerializer, VerifyOTPSerializer
import random

User = get_user_model()

class SendOTPView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        serializer = SendOTPSerializer(data=request.data)
        if serializer.is_valid():
            phone = serializer.validated_data['phone_number']
            otp_code = str(random.randint(100000, 999999))
            
            # Save to DB
            OTPVerification.objects.create(phone_number=phone, otp_code=otp_code)
            
            # TODO: Send via Telegram Bot. For now, print to console.
            print(f"=== OTP for {phone} is: {otp_code} ===")
            
            return Response({"detail": "OTP sent successfully (check server console for now)."})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class VerifyOTPView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        if serializer.is_valid():
            phone = serializer.validated_data['phone_number']
            otp_code = serializer.validated_data['otp_code']
            
            # Verify OTP
            otp_obj = OTPVerification.objects.filter(
                phone_number=phone, otp_code=otp_code, is_used=False
            ).order_by('-created_at').first()
            
            if not otp_obj:
                return Response({"detail": "Invalid or expired OTP code."}, status=status.HTTP_400_BAD_REQUEST)
                
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
