from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from bookings.models import Booking
from notifications.models import Notification
from payments.models import Payment
from places.models import Category, Place, SubCategory
from tariffs.models import TariffPlan


SMOKE_PREFIX = "smoke-mvp"
PARTNER_USERNAME = f"{SMOKE_PREFIX}-partner"
CLIENT_USERNAME = f"{SMOKE_PREFIX}-client"
ADMIN_USERNAME = f"{SMOKE_PREFIX}-admin"


class SmokeFailure(AssertionError):
    pass


class Command(BaseCommand):
    help = "Run a local Joyzone MVP smoke flow through the DRF API."

    def add_arguments(self, parser):
        parser.add_argument(
            "--keep-data",
            action="store_true",
            help="Do not remove previous smoke-* records before running.",
        )

    def handle(self, *args, **options):
        if "testserver" not in settings.ALLOWED_HOSTS and "*" not in settings.ALLOWED_HOSTS:
            settings.ALLOWED_HOSTS.append("testserver")

        if not options["keep_data"]:
            self.clean_smoke_data()

        try:
            self.run_flow()
        except SmokeFailure as exc:
            raise CommandError(str(exc)) from exc

        self.stdout.write(self.style.SUCCESS("Joyzone MVP smoke flow passed."))

    def clean_smoke_data(self):
        User = get_user_model()
        Place.objects.filter(title__startswith=SMOKE_PREFIX).delete()
        SubCategory.objects.filter(slug__startswith=SMOKE_PREFIX).delete()
        Category.objects.filter(slug__startswith=SMOKE_PREFIX).delete()
        TariffPlan.objects.filter(slug__startswith=SMOKE_PREFIX).delete()
        User.objects.filter(username__startswith=SMOKE_PREFIX, is_superuser=False).delete()

    def run_flow(self):
        admin_user = self.ensure_admin()
        tariff = self.ensure_paid_tariff()
        subcategory = self.ensure_place_taxonomy()

        admin = self.authenticated_client_for_user(admin_user)
        partner, partner_access = self.login_with_dev_otp(PARTNER_USERNAME)
        partner_client = self.client_with_token(partner_access)
        client_user, client_access = self.login_with_dev_otp(CLIENT_USERNAME)
        client = self.client_with_token(client_access)

        self.step("1. user login via dev OTP", partner["id"] and client_user["id"])

        sub_response = partner_client.post(
            "/api/tariffs/subscribe/",
            {"tariff_id": tariff.id},
            format="json",
        )
        self.expect_status(sub_response, 200, "paid tariff subscribe")
        self.expect(sub_response.data.get("requires_payment") is True, "paid tariff must require payment")
        subscription_id = sub_response.data.get("subscription_id")

        pay_sub = partner_client.post(
            "/api/payments/test-pay/",
            {"subscription_id": subscription_id},
            format="json",
        )
        self.expect_status(pay_sub, 201, "paid tariff test payment")
        partner_profile = partner_client.get("/api/auth/profile/")
        self.expect_status(partner_profile, 200, "partner profile after tariff")
        self.expect(partner_profile.data.get("role") == "partner", "test paid tariff must activate partner role")
        self.step("2. test paid tariff activates partner", True)

        place_payload = self.place_payload(subcategory.id)
        place_create = partner_client.post("/api/places/", place_payload, format="json")
        self.expect_status(place_create, 201, "partner creates place")
        place_id = place_create.data.get("id")
        self.expect(place_create.data.get("status") == "pending", "new partner place must be pending")
        self.step("3. partner creates pending place", True)

        pending = admin.get("/api/places/", {"status": "pending"})
        self.expect_status(pending, 200, "admin pending places")
        self.expect_contains_id(pending.data, place_id, "admin must see pending place")
        approve = admin.post(f"/api/places/{place_id}/approve/", {"note": "Smoke approved"}, format="json")
        self.expect_status(approve, 200, "admin approves place")
        self.step("4. admin sees pending place and approves it", True)

        public = APIClient().get("/api/places/", {"search": SMOKE_PREFIX})
        self.expect_status(public, 200, "public approved places")
        self.expect_contains_id(public.data, place_id, "public must see approved place")
        self.step("5. public user sees approved place", True)

        booking_payload = self.booking_payload(place_id)
        booking_create = client.post("/api/bookings/", booking_payload, format="json")
        self.expect_status(booking_create, 201, "client creates booking")
        booking_id = booking_create.data.get("id")
        self.expect(booking_create.data.get("payment_status") == "unpaid", "new booking should start unpaid")
        self.step("6. client creates booking", True)

        booking_payment = client.post(
            "/api/payments/test-pay/",
            {"booking_id": booking_id},
            format="json",
        )
        self.expect_status(booking_payment, 201, "client booking test payment")
        self.expect(booking_payment.data.get("booking", {}).get("payment_status") == "test_paid", "booking payment_status must be test_paid")
        self.expect(Payment.objects.filter(booking_id=booking_id, status="test_paid").exists(), "test payment row missing")
        self.step("7. client passes test payment", True)

        partner_bookings = partner_client.get("/api/bookings/")
        self.expect_status(partner_bookings, 200, "partner bookings dashboard data")
        self.expect_contains_id(partner_bookings.data, booking_id, "partner must see booking for owned place")
        self.step("8. partner sees booking in dashboard API", True)

        owner_notifs = partner_client.get("/api/notifications/")
        client_notifs = client.get("/api/notifications/")
        self.expect_status(owner_notifs, 200, "owner notifications")
        self.expect_status(client_notifs, 200, "client notifications")
        self.expect_notification_for_place(owner_notifs.data, place_id, "owner")
        self.expect_notification_for_place(client_notifs.data, place_id, "client")
        self.expect(Notification.objects.filter(user__username=PARTNER_USERNAME, related_place_id=place_id).exists(), "owner notification missing")
        self.expect(Notification.objects.filter(user__username=CLIENT_USERNAME, related_place_id=place_id).exists(), "client notification missing")
        self.step("9. owner/client notifications are returned", True)

        self.expect(Booking.objects.filter(id=booking_id, payment_status="test_paid").exists(), "final booking state mismatch")

    def ensure_admin(self):
        User = get_user_model()
        admin, _ = User.objects.update_or_create(
            username=ADMIN_USERNAME,
            defaults={
                "phone_number": ADMIN_USERNAME,
                "role": "admin",
                "is_staff": True,
                "is_superuser": False,
                "first_name": "Smoke",
                "last_name": "Admin",
            },
        )
        admin.set_unusable_password()
        admin.save()
        return admin

    def ensure_paid_tariff(self):
        tariff, _ = TariffPlan.objects.update_or_create(
            slug=f"{SMOKE_PREFIX}-paid",
            defaults={
                "name": "Smoke Paid",
                "name_ru": "Smoke Paid",
                "name_en": "Smoke Paid",
                "description": "Smoke paid tariff",
                "description_ru": "Smoke paid tariff",
                "description_en": "Smoke paid tariff",
                "price": Decimal("99000"),
                "duration_days": 30,
                "max_places": 3,
                "is_active": True,
                "sort_order": 99,
                "features": ["smoke"],
                "features_ru": ["smoke"],
                "features_en": ["smoke"],
            },
        )
        return tariff

    def ensure_place_taxonomy(self):
        category, _ = Category.objects.update_or_create(
            slug=f"{SMOKE_PREFIX}-category",
            defaults={
                "name_uz": "Smoke category",
                "name_ru": "Smoke category",
                "name_en": "Smoke category",
                "icon": "SM",
                "order": 99,
            },
        )
        subcategory, _ = SubCategory.objects.update_or_create(
            slug=f"{SMOKE_PREFIX}-subcategory",
            defaults={
                "category": category,
                "name_uz": "Smoke subcategory",
                "name_ru": "Smoke subcategory",
                "name_en": "Smoke subcategory",
                "order": 99,
            },
        )
        return subcategory

    def login_with_dev_otp(self, username):
        client = APIClient()
        send = client.post("/api/auth/send-otp/", {"phone_number": username}, format="json")
        self.expect_status(send, 200, f"send dev OTP for {username}")

        verify = client.post(
            "/api/auth/verify-otp/",
            {"phone_number": username, "otp_code": "111111"},
            format="json",
        )
        self.expect_status(verify, 200, f"verify dev OTP for {username}")
        access = verify.data.get("access")
        self.expect(access, f"verify response missing access token for {username}")
        return verify.data.get("profile"), access

    def authenticated_client_for_user(self, user):
        return self.client_with_token(str(RefreshToken.for_user(user).access_token))

    def client_with_token(self, token):
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        return client

    def place_payload(self, subcategory_id):
        return {
            "title": f"{SMOKE_PREFIX} place",
            "subcategory": subcategory_id,
            "location": "Tashkent smoke district",
            "latitude": "41.3110810",
            "longitude": "69.2405620",
            "price": "99000 UZS",
            "prices": {"hourly": 99000, "daily": 500000},
            "price_hourly": "99000",
            "price_daily": "500000",
            "currency": "UZS",
            "area": 42,
            "people": 8,
            "promoted": False,
            "images": ["https://example.com/smoke-place.jpg"],
            "amenities": ["wifi"],
            "characteristics": {"workplaces": 8},
            "description_ru": "Smoke test place",
            "description_uz": "Smoke test place",
            "description_en": "Smoke test place",
            "booking_type": "request",
        }

    def booking_payload(self, place_id):
        start = timezone.now().replace(minute=0, second=0, microsecond=0) + timedelta(days=7)
        end = start + timedelta(hours=2)
        return {
            "place": place_id,
            "start_time": start.isoformat(),
            "end_time": end.isoformat(),
            "duration_type": "hourly",
            "guests": 2,
            "amount": "198000",
            "currency": "UZS",
            "note": "Smoke booking",
        }

    def expect_status(self, response, expected, label):
        if response.status_code != expected:
            raise SmokeFailure(
                f"{label}: expected HTTP {expected}, got {response.status_code}: {getattr(response, 'data', response.content)}"
            )

    def expect(self, condition, message):
        if not condition:
            raise SmokeFailure(message)

    def expect_contains_id(self, payload, item_id, message):
        rows = payload.get("results", payload) if isinstance(payload, dict) else payload
        ids = {row.get("id") for row in rows if isinstance(row, dict)}
        if item_id not in ids:
            raise SmokeFailure(f"{message}; ids={sorted(ids)} expected={item_id}")

    def expect_notification_for_place(self, payload, place_id, owner_label):
        rows = payload.get("results", payload) if isinstance(payload, dict) else payload
        if not any(row.get("related_place_id") == place_id for row in rows if isinstance(row, dict)):
            raise SmokeFailure(f"{owner_label} notification for place {place_id} missing")

    def step(self, label, passed):
        if passed:
            self.stdout.write(self.style.SUCCESS(f"[ok] {label}"))
