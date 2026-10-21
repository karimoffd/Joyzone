from rest_framework import generics, permissions, serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import PermissionDenied
from drf_spectacular.utils import extend_schema, inline_serializer
from django.utils import timezone
from datetime import timedelta
from core.audit import create_audit_log
from core.permissions import IsAdminOrModerator, IsAdminUserRole, is_admin_or_moderator
from notifications.services import notify_tariff_activated
from .models import TariffPlan, TariffSubscription
from .serializers import TariffPlanSerializer, TariffSubscriptionSerializer


def activate_tariff_subscription(subscription, actor=None):
    previous_status = subscription.status
    now = timezone.now()
    subscription.status = 'active'
    subscription.start_date = now
    subscription.end_date = now + timedelta(days=subscription.tariff.duration_days) if subscription.tariff and not subscription.tariff.is_free else None
    subscription.save()

    partner = subscription.partner
    previous_role = partner.role
    partner.tariff = subscription.tariff
    partner.tariff_expires_at = subscription.end_date
    partner.role = 'partner'
    partner.save(update_fields=['tariff', 'tariff_expires_at', 'role'])
    create_audit_log(
        actor=actor or partner,
        action='tariff.activated',
        object_type='TariffSubscription',
        object_id=subscription.id,
        metadata={
            'partner_id': partner.id,
            'tariff_id': subscription.tariff_id,
            'previous_status': previous_status,
            'status': subscription.status,
            'start_date': subscription.start_date,
            'end_date': subscription.end_date,
        },
    )
    if previous_role != partner.role:
        create_audit_log(
            actor=actor or partner,
            action='user.role_updated',
            object_type='User',
            object_id=partner.id,
            metadata={
                'username': partner.username,
                'previous_role': previous_role,
                'role': partner.role,
                'source': 'tariff_activation',
                'tariff_subscription_id': subscription.id,
            },
        )
    notify_tariff_activated(subscription)
    return subscription


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
        return [IsAdminOrModerator()]


class TariffPlanCreateView(generics.CreateAPIView):
    """Admin: create a new tariff plan"""
    queryset = TariffPlan.objects.all()
    serializer_class = TariffPlanSerializer
    permission_classes = [IsAdminOrModerator]


class SubscribeToTariffView(APIView):
    """Partner requests a tariff subscription.

    Free tariffs activate immediately. Paid tariffs stay pending_payment until
    the test payment provider marks the subscription paid.
    """
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        request=inline_serializer(
            name='TariffSubscribeRequest',
            fields={'tariff_id': serializers.IntegerField()},
        ),
        responses=inline_serializer(
            name='TariffSubscribeResponse',
            fields={
                'detail': serializers.CharField(),
                'subscription_id': serializers.IntegerField(),
                'status': serializers.CharField(),
                'requires_payment': serializers.BooleanField(),
                'tariff': TariffPlanSerializer(),
            },
        ),
        tags=['tariffs'],
    )
    def post(self, request):
        tariff_id = request.data.get('tariff_id')
        if not tariff_id:
            return Response({'detail': 'tariff_id required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            tariff = TariffPlan.objects.get(id=tariff_id, is_active=True)
        except TariffPlan.DoesNotExist:
            return Response({'detail': 'Tariff not found'}, status=status.HTTP_404_NOT_FOUND)

        user = request.user

        sub = TariffSubscription.objects.create(
            partner=user,
            tariff=tariff,
            status='active' if tariff.is_free else 'pending_payment',
        )

        if tariff.is_free:
            activate_tariff_subscription(sub, actor=user)

        return Response({
            'detail': 'Free tariff activated successfully' if tariff.is_free else 'Subscription created and awaiting test payment',
            'subscription_id': sub.id,
            'status': sub.status,
            'requires_payment': not tariff.is_free,
            'tariff': TariffPlanSerializer(tariff).data,
        })


class MySubscriptionsView(generics.ListAPIView):
    """Current user's subscriptions"""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TariffSubscriptionSerializer

    def get_queryset(self):
        return TariffSubscription.objects.filter(partner=self.request.user).order_by('-created_at')


class AdminSubscriptionsView(generics.ListAPIView):
    """Admin: list subscriptions, optionally filtered by status or status_group."""
    permission_classes = [IsAdminOrModerator]
    serializer_class = TariffSubscriptionSerializer

    def get_queryset(self):
        if not is_admin_or_moderator(self.request.user):
            raise PermissionDenied("Admin or moderator only")
        queryset = TariffSubscription.objects.all()
        status_filter = self.request.query_params.get('status')
        status_group = self.request.query_params.get('status_group')

        if status_filter:
            statuses = [item.strip() for item in status_filter.split(',') if item.strip()]
            queryset = queryset.filter(status__in=statuses)
        elif status_group == 'pending_manual':
            queryset = queryset.filter(status__in=('pending', 'pending_payment'))
        elif status_group == 'paid_active':
            queryset = queryset.filter(status='active')

        return queryset.order_by('-created_at')


class ActivateSubscriptionView(APIView):
    """Admin: activate a pending subscription"""
    permission_classes = [IsAdminUserRole]

    @extend_schema(
        request=None,
        responses=inline_serializer(
            name='ActivateSubscriptionResponse',
            fields={
                'detail': serializers.CharField(),
                'subscription_id': serializers.IntegerField(),
            },
        ),
        tags=['tariffs'],
    )
    def post(self, request, pk):
        user = request.user
        try:
            sub = TariffSubscription.objects.get(pk=pk)
        except TariffSubscription.DoesNotExist:
            return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

        activate_tariff_subscription(sub, actor=user)

        return Response({'detail': 'Subscription activated', 'subscription_id': sub.id})
