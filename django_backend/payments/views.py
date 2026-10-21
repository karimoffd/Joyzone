from django.core.exceptions import ObjectDoesNotExist, PermissionDenied, ValidationError
from django.db.models import Q, Sum
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import generics, permissions, serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import OpenApiParameter, extend_schema, inline_serializer

from bookings.serializers import BookingSerializer
from bookings.models import Booking
from core.audit import create_audit_log
from core.permissions import IsAdminUserRole
from tariffs.serializers import TariffPlanSerializer, TariffSubscriptionSerializer
from .models import Payment
from .serializers import PaymentSerializer, UserPaymentHistorySerializer
from .services import TestPaymentProvider


def _sum_amount(queryset):
    return queryset.aggregate(total=Sum('amount'))['total'] or 0


def _payment_subject(payment):
    if payment.booking:
        return 'booking'
    if payment.tariff_subscription:
        return 'tariff_subscription'
    return 'manual'


def _payment_to_transaction(payment):
    booking = payment.booking
    subscription = payment.tariff_subscription
    place = booking.place if booking else None
    tariff = subscription.tariff if subscription else None
    user = payment.user
    amount = payment.amount or 0
    is_refund = payment.status == 'refunded'

    return {
        'id': payment.id,
        'payment_id': payment.id,
        'date': payment.created_at,
        'updated_at': payment.updated_at,
        'client': user.get_full_name() or user.username,
        'client_phone': getattr(user, 'phone_number', '') or user.username,
        'space': place.title if place else '',
        'place_id': place.id if place else None,
        'tariff': tariff.name if tariff else '',
        'tariff_subscription_id': subscription.id if subscription else None,
        'type': 'refund' if is_refund else _payment_subject(payment),
        'amount': f'-{amount}' if is_refund else str(amount),
        'raw_amount': str(amount),
        'currency': payment.currency,
        'status': payment.status,
        'provider': payment.provider,
        'external_id': payment.external_id,
        'metadata': payment.metadata,
    }


class TestPayView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        request=inline_serializer(
            name='TestPaymentRequest',
            fields={
                'booking_id': serializers.IntegerField(required=False),
                'tariff_id': serializers.IntegerField(required=False),
                'subscription_id': serializers.IntegerField(required=False),
                'tariff_subscription_id': serializers.IntegerField(required=False),
                'amount': serializers.DecimalField(max_digits=12, decimal_places=2, required=False),
                'currency': serializers.CharField(required=False, default='UZS'),
                'metadata': serializers.DictField(required=False),
            },
        ),
        responses=inline_serializer(
            name='TestPaymentResponse',
            fields={
                'payment': PaymentSerializer(),
                'booking': BookingSerializer(required=False),
                'subscription': TariffSubscriptionSerializer(required=False),
                'tariff': TariffPlanSerializer(required=False),
            },
        ),
        tags=['payments'],
    )
    def post(self, request):
        booking_id = request.data.get('booking_id')
        tariff_id = request.data.get('tariff_id')
        subscription_id = request.data.get('subscription_id') or request.data.get('tariff_subscription_id')

        selected_targets = [bool(booking_id), bool(tariff_id), bool(subscription_id)]
        if selected_targets.count(True) != 1:
            return Response(
                {'detail': 'Send exactly one of booking_id, tariff_id, or subscription_id.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        provider = TestPaymentProvider(request.user)
        metadata = request.data.get('metadata') if isinstance(request.data.get('metadata'), dict) else {}
        amount = request.data.get('amount')
        currency = request.data.get('currency') or 'UZS'

        try:
            if booking_id:
                payment = provider.pay_booking(
                    booking_id=booking_id,
                    amount=amount,
                    currency=currency,
                    metadata=metadata,
                )
                return Response(
                    {
                        'payment': PaymentSerializer(payment).data,
                        'booking': BookingSerializer(payment.booking).data,
                    },
                    status=status.HTTP_201_CREATED,
                )

            if subscription_id:
                payment = provider.pay_tariff_subscription(
                    subscription_id=subscription_id,
                    amount=amount,
                    currency=currency,
                    metadata=metadata,
                )
            else:
                payment = provider.pay_tariff(
                    tariff_id=tariff_id,
                    amount=amount,
                    currency=currency,
                    metadata=metadata,
                )
            subscription = payment.tariff_subscription
            return Response(
                {
                    'payment': PaymentSerializer(payment).data,
                    'subscription': TariffSubscriptionSerializer(subscription).data,
                    'tariff': TariffPlanSerializer(subscription.tariff).data if subscription and subscription.tariff else None,
                },
                status=status.HTTP_201_CREATED,
            )
        except ObjectDoesNotExist:
            return Response({'detail': 'Payment target not found.'}, status=status.HTTP_404_NOT_FOUND)
        except PermissionDenied as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_403_FORBIDDEN)
        except ValidationError as exc:
            return Response({'detail': exc.message if hasattr(exc, 'message') else exc.messages}, status=status.HTTP_400_BAD_REQUEST)


class MyPaymentsView(generics.ListAPIView):
    """Authenticated user's own booking and tariff payment history."""

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserPaymentHistorySerializer

    def get_queryset(self):
        return Payment.objects.filter(user=self.request.user).select_related(
            'booking',
            'booking__place',
            'tariff_subscription',
            'tariff_subscription__tariff',
        ).order_by('-created_at')


class PaymentRefundView(APIView):
    permission_classes = [IsAdminUserRole]

    @extend_schema(
        request=inline_serializer(
            name='PaymentRefundRequest',
            fields={'note': serializers.CharField(required=False, allow_blank=True)},
        ),
        responses=inline_serializer(
            name='PaymentRefundResponse',
            fields={'payment': PaymentSerializer()},
        ),
        tags=['payments'],
    )
    def post(self, request, pk):
        try:
            payment = Payment.objects.select_related(
                'booking',
                'tariff_subscription',
                'tariff_subscription__partner',
            ).get(pk=pk)
        except Payment.DoesNotExist:
            return Response({'detail': 'Payment not found.'}, status=status.HTTP_404_NOT_FOUND)

        if payment.status == 'refunded':
            return Response({'payment': PaymentSerializer(payment).data}, status=status.HTTP_200_OK)

        if payment.status not in ('test_paid', 'paid'):
            return Response(
                {'detail': 'Only paid test payments can be refunded.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payment.status = 'refunded'
        metadata = payment.metadata or {}
        metadata['refund_note'] = request.data.get('note', '')
        metadata['refunded_by'] = request.user.id
        metadata['refunded_at'] = timezone.now().isoformat()
        payment.metadata = metadata
        payment.save(update_fields=['status', 'metadata', 'updated_at'])

        if payment.booking:
            payment.booking.payment_status = 'refunded'
            payment.booking.save(update_fields=['payment_status', 'updated_at'])

        subscription = payment.tariff_subscription
        if subscription and subscription.status == 'active':
            subscription.status = 'cancelled'
            subscription.save(update_fields=['status'])
            partner = subscription.partner
            if partner.tariff_id == subscription.tariff_id:
                partner.tariff = None
                partner.tariff_expires_at = None
                partner.save(update_fields=['tariff', 'tariff_expires_at'])

        create_audit_log(
            actor=request.user,
            action='payment.refunded',
            object_type='Payment',
            object_id=payment.id,
            metadata={
                'booking_id': payment.booking_id,
                'tariff_subscription_id': payment.tariff_subscription_id,
                'amount': payment.amount,
                'currency': payment.currency,
                'provider': payment.provider,
                'note': request.data.get('note', ''),
            },
        )
        return Response({'payment': PaymentSerializer(payment).data})


class FinanceTransactionsView(APIView):
    permission_classes = [IsAdminUserRole]

    @extend_schema(
        parameters=[
            OpenApiParameter('status', str, OpenApiParameter.QUERY, description='Comma-separated payment statuses.'),
            OpenApiParameter('type', str, OpenApiParameter.QUERY, description='booking, tariff_subscription, or refund.'),
            OpenApiParameter('date_from', str, OpenApiParameter.QUERY, description='Created on or after YYYY-MM-DD.'),
            OpenApiParameter('date_to', str, OpenApiParameter.QUERY, description='Created on or before YYYY-MM-DD.'),
            OpenApiParameter('search', str, OpenApiParameter.QUERY, description='Search client, phone, place, tariff, or external id.'),
            OpenApiParameter('limit', int, OpenApiParameter.QUERY, description='Maximum number of transactions, capped at 200.'),
        ],
        responses=inline_serializer(
            name='FinanceTransactionResponse',
            fields={
                'id': serializers.IntegerField(),
                'payment_id': serializers.IntegerField(),
                'date': serializers.DateTimeField(),
                'updated_at': serializers.DateTimeField(),
                'client': serializers.CharField(),
                'client_phone': serializers.CharField(),
                'space': serializers.CharField(),
                'place_id': serializers.IntegerField(required=False, allow_null=True),
                'tariff': serializers.CharField(),
                'tariff_subscription_id': serializers.IntegerField(required=False, allow_null=True),
                'type': serializers.CharField(),
                'amount': serializers.CharField(),
                'raw_amount': serializers.CharField(),
                'currency': serializers.CharField(),
                'status': serializers.CharField(),
                'provider': serializers.CharField(),
                'external_id': serializers.CharField(required=False, allow_blank=True),
                'metadata': serializers.DictField(),
            },
            many=True,
        ),
        tags=['finance'],
    )
    def get(self, request):
        queryset = Payment.objects.select_related(
            'user',
            'booking',
            'booking__place',
            'tariff_subscription',
            'tariff_subscription__tariff',
        ).order_by('-created_at')

        status_filter = request.query_params.get('status')
        if status_filter:
            statuses = [item.strip() for item in status_filter.split(',') if item.strip()]
            queryset = queryset.filter(status__in=statuses)

        transaction_type = request.query_params.get('type', '').strip()
        if transaction_type == 'booking':
            queryset = queryset.filter(booking__isnull=False).exclude(status='refunded')
        elif transaction_type == 'tariff_subscription':
            queryset = queryset.filter(tariff_subscription__isnull=False).exclude(status='refunded')
        elif transaction_type == 'refund':
            queryset = queryset.filter(status='refunded')
        elif transaction_type:
            return Response(
                {'type': 'Use booking, tariff_subscription, or refund.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        date_from_value = request.query_params.get('date_from', '').strip()
        if date_from_value:
            date_from = parse_date(date_from_value)
            if not date_from:
                return Response({'date_from': 'Use YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)
            queryset = queryset.filter(created_at__date__gte=date_from)

        date_to_value = request.query_params.get('date_to', '').strip()
        if date_to_value:
            date_to = parse_date(date_to_value)
            if not date_to:
                return Response({'date_to': 'Use YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)
            queryset = queryset.filter(created_at__date__lte=date_to)

        search = request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                Q(user__username__icontains=search)
                | Q(user__first_name__icontains=search)
                | Q(user__last_name__icontains=search)
                | Q(user__phone_number__icontains=search)
                | Q(booking__place__title__icontains=search)
                | Q(tariff_subscription__tariff__name__icontains=search)
                | Q(external_id__icontains=search)
            ).distinct()

        limit = request.query_params.get('limit')
        if limit:
            try:
                queryset = queryset[:max(1, min(int(limit), 200))]
            except ValueError:
                queryset = queryset[:100]

        return Response([_payment_to_transaction(payment) for payment in queryset])


class FinanceSummaryView(APIView):
    permission_classes = [IsAdminUserRole]

    @extend_schema(
        responses=inline_serializer(
            name='FinanceSummaryResponse',
            fields={
                'total_revenue': serializers.CharField(),
                'month_revenue': serializers.CharField(),
                'pending_payouts': serializers.CharField(),
                'refunds_total': serializers.CharField(),
                'payments_count': serializers.IntegerField(),
            },
        ),
        tags=['finance'],
    )
    def get(self, request):
        now = timezone.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        paid_payments = Payment.objects.filter(status__in=('test_paid', 'paid'))
        refunded_payments = Payment.objects.filter(status='refunded')
        pending_payouts = Booking.objects.filter(
            payment_status__in=('test_paid', 'paid'),
            status__in=('confirmed', 'completed'),
        )

        return Response({
            'total_revenue': str(_sum_amount(paid_payments)),
            'month_revenue': str(_sum_amount(paid_payments.filter(created_at__gte=month_start))),
            'pending_payouts': str(pending_payouts.aggregate(total=Sum('amount'))['total'] or 0),
            'refunds_total': str(_sum_amount(refunded_payments)),
            'payments_count': paid_payments.count(),
        })
