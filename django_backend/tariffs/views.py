from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import PermissionDenied
from django.utils import timezone
from datetime import timedelta
from .models import TariffPlan, TariffSubscription
from .serializers import TariffPlanSerializer, TariffSubscriptionSerializer


class TariffPlanListView(generics.ListAPIView):
    """Public list of active tariff plans"""
    permission_classes = [permissions.AllowAny]
    serializer_class = TariffPlanSerializer

    def get_queryset(self):
        return TariffPlan.objects.filter(is_active=True).order_by('sort_order', 'price')


class TariffPlanDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Admin: view/edit/delete a tariff plan"""
    queryset = TariffPlan.objects.all()
    serializer_class = TariffPlanSerializer

    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]


class TariffPlanCreateView(generics.CreateAPIView):
    """Admin: create a new tariff plan"""
    queryset = TariffPlan.objects.all()
    serializer_class = TariffPlanSerializer
    permission_classes = [permissions.IsAuthenticated]


class SubscribeToTariffView(APIView):
    """Partner requests a tariff subscription"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        tariff_id = request.data.get('tariff_id')
        if not tariff_id:
            return Response({'detail': 'tariff_id required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            tariff = TariffPlan.objects.get(id=tariff_id, is_active=True)
        except TariffPlan.DoesNotExist:
            return Response({'detail': 'Tariff not found'}, status=status.HTTP_404_NOT_FOUND)

        user = request.user

        # Create subscription record
        end_date = timezone.now() + timedelta(days=tariff.duration_days) if not tariff.is_free else None
        sub = TariffSubscription.objects.create(
            partner=user,
            tariff=tariff,
            status='active' if tariff.is_free else 'pending',
            end_date=end_date,
        )

        # If free tariff, activate immediately
        if tariff.is_free:
            user.tariff = tariff
            user.tariff_expires_at = None
            user.role = 'partner'
            user.save()

        return Response({
            'detail': 'Subscribed successfully' if tariff.is_free else 'Subscription request sent. Admin will activate it shortly.',
            'subscription_id': sub.id,
            'status': sub.status,
            'tariff': TariffPlanSerializer(tariff).data,
        })


class MySubscriptionsView(generics.ListAPIView):
    """Current user's subscriptions"""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TariffSubscriptionSerializer

    def get_queryset(self):
        return TariffSubscription.objects.filter(partner=self.request.user).order_by('-created_at')


class AdminSubscriptionsView(generics.ListAPIView):
    """Admin: list all pending subscriptions"""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TariffSubscriptionSerializer

    def get_queryset(self):
        user = self.request.user
        if not (user.role in ('admin', 'moderator') or user.is_superuser or user.is_staff):
            raise PermissionDenied("Admin or moderator only")
        status_filter = self.request.query_params.get('status', 'pending')
        return TariffSubscription.objects.filter(status=status_filter).order_by('-created_at')


class ActivateSubscriptionView(APIView):
    """Admin: activate a pending subscription"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        user = request.user
        if not (user.role in ('admin',) or user.is_superuser or user.is_staff):
            raise PermissionDenied("Admin only")
        try:
            sub = TariffSubscription.objects.get(pk=pk)
        except TariffSubscription.DoesNotExist:
            return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

        sub.status = 'active'
        sub.start_date = timezone.now()
        if sub.tariff:
            sub.end_date = timezone.now() + timedelta(days=sub.tariff.duration_days)
        sub.save()

        # Update user's tariff
        partner = sub.partner
        partner.tariff = sub.tariff
        partner.tariff_expires_at = sub.end_date
        partner.role = 'partner'
        partner.save()

        return Response({'detail': 'Subscription activated', 'subscription_id': sub.id})
