# Joyzone Backend API Contract

This document is the frontend/backend contract for the Joyzone Django REST API.
The generated OpenAPI schema is available at:

- `GET /api/schema/`
- `GET /api/docs/`

Frontend base URL:

```js
import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"
```

Auth token key:

```js
localStorage.getItem("joyzone-access")
```

Authenticated requests must send:

```http
Authorization: Bearer <access_token>
```

## Permissions

- Public: no JWT required.
- Authenticated: valid JWT required.
- Partner/host: authenticated user with `role="partner"` and ownership of the related place where required.
- Admin/moderator/staff: `role in ("admin", "moderator")`, `is_staff`, or `is_superuser`.
- Admin only: `role="admin"`, `is_staff`, or `is_superuser`.

## Auth

### `POST /api/auth/send-otp/`

Public. Sends/stores an OTP. The fixed `111111` bypass is available only when
both `DEBUG=True` and `DEV_OTP_ENABLED=True`; it is never a public-stand login.
Each successful resend invalidates all earlier unused codes for that phone.
Requests are limited independently by IP (`3/minute`) and normalized phone
(`OTP_SEND_ACCOUNT_RATE`, also `3/minute` by default).

Request:

```json
{
  "phone_number": "+998901234567"
}
```

Response:

```json
{
  "detail": "OTP sent successfully."
}
```

### `POST /api/auth/verify-otp/`

Public. Creates the user if needed and returns JWT tokens.

Stored OTP codes are single-use and valid strictly before `OTP_TTL_SECONDS`
(300 seconds by default). A code is expired exactly at the TTL boundary. An
expired, invalidated, or previously consumed code returns HTTP 400 and does not
create a user or issue JWTs.

Verification is limited independently by IP (`5/minute`) and normalized phone
(`OTP_VERIFY_ACCOUNT_RATE`, also `5/minute` by default). Formatting changes and
IP rotation do not reset the account counter. A blocked request returns HTTP
429 with a generic detail and a `Retry-After` header; it does not disclose
whether an account exists or is privileged.

Request:

```json
{
  "phone_number": "+998901234567",
  "otp_code": "111111"
}
```

Response:

```json
{
  "refresh": "...",
  "access": "...",
  "is_new_user": true,
  "profile": {
    "id": 1,
    "username": "+998901234567",
    "phone_number": "+998901234567",
    "role": "client",
    "tariff": null,
    "tariff_expires_at": null,
    "tariff_details": null
  }
}
```

### `POST /api/auth/token/refresh/`

Public with a valid refresh token. The submitted refresh token is consumed and
blacklisted. The response always contains a new access token and, because
rotation is enabled, a new refresh token. Clients must atomically replace both
cached values; replaying the old refresh returns HTTP 401.

```json
{
  "refresh": "current-refresh-token"
}
```

```json
{
  "access": "new-access-token",
  "refresh": "new-refresh-token"
}
```

### `POST /api/auth/logout/`

Authenticated. Blacklists the submitted refresh token when it belongs to the
authenticated user. Repeating logout with the same access/refresh pair is a
successful no-op. A refresh belonging to another user is rejected and is not
revoked.

```json
{
  "refresh": "current-refresh-token"
}
```

Logout prevents further refresh. The stateless access token can remain valid
until `JWT_ACCESS_TOKEN_MINUTES` elapses; the default is 15 minutes. Refresh
tokens default to 7 days (`JWT_REFRESH_TOKEN_DAYS`) and rotate on every use.

### `GET /api/auth/profile/`

Authenticated. Returns the current user profile.

### `PUT/PATCH /api/auth/profile/`

Authenticated. Updates editable profile fields such as `first_name`, `last_name`, `email`, `phone_number`, `avatar`.

### `POST /api/auth/dev-admin-login/`

Public only when both `DEBUG=True` and `DEV_OTP_ENABLED=True`. Returns admin JWT
for isolated local testing. Disabled otherwise.

### `GET /api/auth/demo-login/status/`

Public. Returns whether operator-controlled public demo access is currently
available, its expiry, and session duration. It never returns account names or
credentials.

### `POST /api/auth/demo-login/`

Public and rate-limited. Separate from OTP. Accepts only dedicated client or
partner users in the backend allowlist and never creates an account.

Request:

```json
{
  "account": "public_demo_client_a1b2c3",
  "password": "operator-issued-random-secret"
}
```

Response follows the normal JWT/profile shape and also includes
`demo_session_expires_at`. Demo access requires all of the following backend
settings: `PUBLIC_DEMO_LOGIN_ENABLED=True`, `PUBLIC_DEMO_DATA_ISOLATED=True`, a
future `PUBLIC_DEMO_LOGIN_EXPIRES_AT`, and a non-empty
`PUBLIC_DEMO_ACCOUNT_USERNAMES` allowlist. Admin, moderator, staff, and
superuser accounts are always rejected.

## Places

### `GET /api/places/`

Public users see only `status="approved"` places. Partners see only their own places. Admin/moderator/staff see all places.

Query params:

- `search`: title/location/RU/UZ description contains.
- `category`: category id or slug through `subcategory.category`.
- `subcategory`: subcategory id or slug.
- `location`: contains filter.
- `people` or `min_people`: `people >= value`.
- `min_price`, `max_price`: checks normalized price fields, `prices` JSON, and legacy `price`.
- `amenities`: comma-separated amenity slugs, all must match.
- `promoted`: `true` or `false`.
- Admin only: `status`, `owner`.

Response item shape:

```json
{
  "id": 10,
  "owner": 3,
  "owner_name": "Partner Name",
  "owner_email": "partner@example.com",
  "owner_phone": "+998901234567",
  "title": "Atlas Meeting Room",
  "subcategory": 2,
  "subcategory_info": {
    "id": 2,
    "slug": "meeting-room",
    "category": 1,
    "category_name": "Coworking",
    "category_slug": "coworking",
    "name_uz": "...",
    "name_ru": "...",
    "name_en": "..."
  },
  "category": "legacy category text",
  "category_name": "Coworking",
  "subcategory_name": "Meeting room",
  "location": "Tashkent",
  "latitude": "41.3110810",
  "longitude": "69.2405620",
  "price": "100000 UZS",
  "prices": {
    "soatlik": 50000,
    "kunlik": 400000
  },
  "price_hourly": "50000.00",
  "price_daily": "400000.00",
  "price_weekly": null,
  "price_monthly": null,
  "currency": "UZS",
  "booking_type": "request",
  "discounts": [1, 2],
  "discount_ids": [1, 2],
  "area": 45,
  "people": 12,
  "promoted": false,
  "images": ["https://..."],
  "characteristics": {
    "rooms": 1
  },
  "amenities": ["wifi", "parking"],
  "description_uz": "...",
  "description_ru": "...",
  "description_en": "...",
  "status": "approved",
  "moderator_note": "",
  "moderated_by": 1,
  "moderated_by_name": "Admin",
  "moderated_at": "2026-09-15T10:00:00Z",
  "bookings_count": 4,
  "rating_avg": 4.7,
  "reviews_count": 12,
  "moderation_logs": []
}
```

### `POST /api/places/`

Authenticated. Creates a place. Backend sets `owner=request.user` and `status="pending"`.

Request:

```json
{
  "title": "Atlas Meeting Room",
  "subcategory": 2,
  "category": "legacy category text",
  "location": "Tashkent",
  "latitude": "41.3110810",
  "longitude": "69.2405620",
  "price": "100000 UZS",
  "prices": {
    "soatlik": "50000",
    "kunlik": "400000"
  },
  "currency": "UZS",
  "booking_type": "request",
  "discounts": [1, 2],
  "area": 45,
  "people": 12,
  "images": ["https://..."],
  "characteristics": {
    "rooms": 1
  },
  "amenities": ["wifi"],
  "description_uz": "...",
  "description_ru": "...",
  "description_en": "..."
}
```

`discount_ids` is also accepted and mapped to `discounts`.

### `PATCH/PUT /api/places/{id}/`

Authenticated. Owner or admin/moderator/staff. If a partner edits their own approved/rejected place, status becomes `pending` again and moderation fields are cleared.

### `DELETE /api/places/{id}/`

Owner or admin/moderator/staff.

### `POST /api/places/upload_image/`

Authenticated. Multipart upload.

Request:

```http
image=<file>
```

Response:

```json
{
  "url": "http://localhost:8000/media/uploads/file.png"
}
```

### `POST /api/places/{id}/approve/`

Admin/moderator/staff. Sets status `approved`, stores `moderated_by`, `moderated_at`, optional `moderator_note`, creates owner notification and moderation log.

Request:

```json
{
  "note": "Looks good"
}
```

### `POST /api/places/{id}/reject/`

Admin/moderator/staff. Requires `note`. Sets status `rejected`, creates owner notification and moderation log.

Request:

```json
{
  "note": "Photos are unclear"
}
```

## Categories, Subcategories, Parameters, Discounts

### `GET /api/categories/`

Public. Returns categories with nested subcategories.

### `GET /api/subcategories/`

Public. Returns subcategories with `category_name`, `category_slug`, and parameters.

### `GET /api/parameter-groups/`

Public. Returns parameter groups with nested parameters.

### `GET /api/parameters/`

Public. Returns all parameters.

### `GET /api/discounts/`

Public. Returns discounts.

Write operations on these resources require admin/moderator/staff.

## Bookings

### `GET /api/bookings/`

Authenticated. The default scope is role-compatible: admin/moderator/staff see
all bookings, clients see their own bookings, and partners see the union of
their personal bookings and bookings for places they own. The union is distinct,
so a booking of a partner's own place is returned once.

Query params:

- `scope=mine` returns bookings where the current user is the client
- `scope=host` returns bookings for places owned by the current partner; clients receive HTTP 403
- `place` or `space_id`
- `status`
- `client`
- `date_from=YYYY-MM-DD`
- `date_to=YYYY-MM-DD`

`scope` narrows visibility before all other filters. It never grants access to
another user's booking or place. Admin/moderator/staff retain the unscoped
all-bookings default used by the admin bookings page.

Known query values are validated before filtering. `place`, `space_id`, and
`client` must be positive integer IDs; `status` must be a booking status enum;
dates must be real `YYYY-MM-DD` calendar dates; and `date_from` cannot be after
`date_to`. Invalid values return HTTP 400 as field-keyed DRF errors, for example
`{"place": ["A valid integer is required."]}`. Empty optional values are ignored.
The list endpoint has no maximum date span; the availability endpoint keeps its
separate 366-day limit. Unknown query names are ignored for compatibility and
cannot expand the role/scope queryset.

### `POST /api/bookings/`

Authenticated. Creates a booking and rejects overlapping bookings for the same place/time.

Canonical request:

```json
{
  "place": 10,
  "start_time": "2026-09-20T10:00:00Z",
  "end_time": "2026-09-20T12:00:00Z",
  "duration_type": "hourly",
  "guests": 2,
  "amount": "120000",
  "currency": "UZS",
  "note": "Need projector"
}
```

Temporary frontend-compatible aliases accepted:

```json
{
  "space_id": 10,
  "start_date": "2026-09-20",
  "end_date": "2026-09-20",
  "total_price": "120000"
}
```

If `start_date/end_date` are used, backend creates default time range `09:00-18:00`.

`status` and `payment_status` are server-controlled fields:

- client create requests must omit both fields; backend creates `pending/unpaid`;
- a partner may explicitly create `blocked/unpaid` only for availability on a place they own;
- admin/moderator/staff may set them during an explicit manual booking create;
- generic `PUT/PATCH /api/bookings/{id}/` rejects both fields for every role;
- status changes use the actions below, while payment changes use payment/refund endpoints.

Sending a controlled field outside these contracts returns a field-level `400`
and does not create or modify a booking.

Assignment rules:

- client/partner create requests must omit `client`; backend always assigns the requester;
- client/partner cannot change `client` or move an existing booking to another `place`;
- the place aliases `place_id` and `space_id` follow the same update restriction;
- admin/moderator/staff may assign an existing user and place during manual operations;
- invalid assignment IDs return `400`, and successful manager assignment changes are audited.
- ordinary client bookings can target only publicly visible (`approved`) places;
- pending/rejected or deleted place IDs are rejected without exposing private place data;
- an owner may still create a `blocked/unpaid` availability record for their own non-public place;
- admin/moderator/staff manual booking remains available for non-public places.

Guest capacity rules:

- `guests` must be a positive JSON integer; strings, booleans and fractional values are rejected;
- ordinary bookings accept `1..place.people`, including an exact-capacity booking;
- a legacy place with missing or non-positive `people` is not treated as unlimited and cannot be booked;
- `blocked/unpaid` availability records do not require `guests` and skip guest-capacity validation.

Interval rules:

- create requires `start_time`, `end_time`, and `duration_type` after legacy aliases are normalized;
- canonical datetimes use ISO 8601 with an explicit timezone offset or `Z` suffix;
- legacy `start_date` and `end_date` must both be present and become aware `09:00`/`18:00` values;
- `end_time` must be strictly later than `start_time`; no additional commercial minimum is imposed;
- duration is one of `hourly`, `daily`, `weekly`, or `monthly` (documented legacy aliases remain accepted);
- clients and partners cannot create or move an interval into the past;
- admin/moderator/staff may create historical manual bookings for backfill;
- partial updates reuse existing interval values, but any submitted interval fields are revalidated.

Response shape:

```json
{
  "id": 1,
  "client": 5,
  "client_name": "Client Name",
  "client_phone": "+998...",
  "place": 10,
  "place_id": 10,
  "space_id": 10,
  "place_title": "Atlas Meeting Room",
  "start_time": "2026-09-20T10:00:00Z",
  "end_time": "2026-09-20T12:00:00Z",
  "start_date": "2026-09-20",
  "end_date": "2026-09-20",
  "duration_type": "hourly",
  "guests": 2,
  "amount": "120000.00",
  "total_price": "120000.00",
  "currency": "UZS",
  "note": "Need projector",
  "status": "pending",
  "payment_status": "unpaid"
}
```

Status choices:

- `pending`
- `confirmed`
- `cancelled`
- `completed`
- `blocked`

Status transition policy:

| Current | Next | Allowed actor | Notes |
| --- | --- | --- | --- |
| `pending` | `confirmed` | place owner, admin/moderator/staff | Normal confirmation |
| `pending` | `cancelled` | booking client, place owner, admin/moderator/staff | Cancels request |
| `confirmed` | `cancelled` | booking client, place owner, admin/moderator/staff | Cancels confirmed booking |
| `pending` | `blocked` | place owner, admin/moderator/staff | Only an unpaid slot whose client is the place owner |
| `blocked` | `cancelled` | place owner, admin/moderator/staff | Releases owner availability block |
| `cancelled` | any different status | nobody | Terminal; no implicit reopen |
| `completed` | any different status | nobody | Terminal; no implicit reopen |

Repeating the current action (`confirm`, `cancel`, or `block`) is idempotent for an
authorized actor and does not create another notification or audit record. Generic
`PUT/PATCH` cannot change status. A paid booking cannot become `blocked`; blocking
is an owner availability slot, not a replacement state for a client booking.
There is currently no automatic transition into `completed`; that status is only
accepted during explicit admin historical creation until a completion policy is agreed.

Every real status transition, its system notifications, and its audit record are
written in one database transaction. A rollback leaves the booking status unchanged
and creates neither event. The audit metadata contains `booking_id`, `place_id`,
`client_id`, `previous_status`, and `next_status`; it excludes booking notes and other
sensitive payload. Future external notification delivery must start after commit.

Payment status choices:

- `unpaid`
- `test_paid`
- `paid`
- `refunded`

### `POST /api/bookings/{id}/confirm/`

Place owner or admin/moderator/staff. Sets `status="confirmed"`.

### `POST /api/bookings/{id}/cancel/`

Booking client, place owner, or admin/moderator/staff. Sets `status="cancelled"`.

### `POST /api/bookings/{id}/block/`

Place owner or admin/moderator/staff. Applies only to an unpaid owner availability
slot. It cannot convert a client booking or paid booking into a block.

### `GET /api/bookings/availability/?place={id}&date_from=YYYY-MM-DD&date_to=YYYY-MM-DD`

Public for approved places. Owner/admin can inspect non-public owned places.

Response:

```json
{
  "place": 10,
  "date_from": "2026-09-20",
  "date_to": "2026-09-21",
  "days": {
    "2026-09-20": {
      "status": "booked",
      "booked": true,
      "blocked": false,
      "full_day": false,
      "slots": {
        "10:00": {
          "status": "booked",
          "booking_id": 1,
          "start_time": "2026-09-20T10:00:00Z",
          "end_time": "2026-09-20T12:00:00Z"
        }
      },
      "bookings": []
    }
  },
  "bookings": []
}
```

## Payments Test Flow

Real Click/Payme/Uzum is not connected. Current provider is `test` and is replaceable.

### `POST /api/payments/test-pay/`

Authenticated. Send exactly one target:

- `booking_id`
- `subscription_id` or `tariff_subscription_id`
- `tariff_id` legacy fallback

Booking payment request:

```json
{
  "booking_id": 1,
  "amount": "120000",
  "currency": "UZS",
  "metadata": {
    "method": "card"
  }
}
```

Tariff subscription payment request:

```json
{
  "subscription_id": 7,
  "amount": "100000",
  "currency": "UZS",
  "metadata": {
    "method": "card"
  }
}
```

Booking success response:

```json
{
  "payment": {
    "id": 20,
    "booking": 1,
    "booking_id": 1,
    "provider": "test",
    "amount": "120000.00",
    "currency": "UZS",
    "status": "test_paid",
    "external_id": "test_..."
  },
  "booking": {
    "id": 1,
    "payment_status": "test_paid"
  }
}
```

Tariff success response:

```json
{
  "payment": {
    "id": 21,
    "tariff_subscription": 7,
    "tariff_subscription_id": 7,
    "status": "test_paid"
  },
  "subscription": {
    "id": 7,
    "status": "active"
  },
  "tariff": {
    "id": 2,
    "slug": "comfort"
  }
}
```

### `POST /api/payments/{id}/refund/`

Admin only. Test refund. Can refund only `test_paid` or `paid`.

Side effects:

- `Payment.status="refunded"`
- related `Booking.payment_status="refunded"`
- related active tariff subscription becomes `cancelled`

## Tariffs

### `GET /api/tariffs/`

Public. Returns active tariff plans.

### `POST /api/tariffs/subscribe/`

Authenticated.

Request:

```json
{
  "tariff_id": 2
}
```

Free tariff response:

```json
{
  "detail": "Free tariff activated successfully",
  "subscription_id": 1,
  "status": "active",
  "requires_payment": false,
  "tariff": {}
}
```

Paid tariff response:

```json
{
  "detail": "Subscription created and awaiting test payment",
  "subscription_id": 2,
  "status": "pending_payment",
  "requires_payment": true,
  "tariff": {}
}
```

Important: paid tariff must not be activated by `/api/tariffs/subscribe/`. Frontend must open `PaymentModal` and call `/api/payments/test-pay/` with `subscription_id`.

### Admin tariff endpoints

- `POST /api/tariffs/create/`
- `GET /api/tariffs/{id}/`
- `PATCH/PUT /api/tariffs/{id}/`
- `DELETE /api/tariffs/{id}/`
- `GET /api/tariffs/admin/subscriptions/?status=pending,pending_payment`
- `GET /api/tariffs/admin/subscriptions/?status=active`
- `POST /api/tariffs/admin/subscriptions/{id}/activate/`

Write/admin subscription endpoints require admin/moderator/staff unless noted otherwise.

## Reviews

### `GET /api/reviews/?place={id}&user={id}`

Public. Optional filters by place/user.

### `POST /api/reviews/`

Authenticated. Non-admin users should have a confirmed/completed booking for the place.

Request:

```json
{
  "place": 10,
  "rating": 5,
  "comment": "Great place"
}
```

### `DELETE /api/reviews/{id}/`

Admin/moderator/staff.

## Favorites

### `GET /api/favorites/?token={anonymous_token}`

Public. Authenticated users are resolved by JWT. Guests are resolved by `token`.

### `POST /api/favorites/toggle/`

Public. Authenticated users use `request.user`; guests use `token`.

Request:

```json
{
  "place_id": 10,
  "token": "guest-token"
}
```

Response:

```json
{
  "favorited": true,
  "favorites": [
    {
      "id": 1,
      "user_token": "guest-token",
      "place": {}
    }
  ]
}
```

### `POST /api/favorites/merge/`

Authenticated. Moves guest token favorites to the current user after login.

Request:

```json
{
  "token": "guest-token"
}
```

## Notifications

### `GET /api/notifications/`

Authenticated. Returns only current user's notifications.

### `GET /api/notifications/unread-count/`

Authenticated.

### `POST /api/notifications/read-all/`

Authenticated.

### `POST /api/notifications/{id}/read/`

Authenticated. Can mark only own notification.

## REST Chat

No WebSocket yet. Frontend should poll every 5-10 seconds while chat UI is open.

### `GET /api/notifications/chats/`

Authenticated. Filtered by current user:

- Guest sees own chats.
- Partner/host sees chats for owned places.
- Admin/moderator/staff sees all chats.

Optional query:

- `place` or `place_id`

Response item:

```json
{
  "id": "place-10-guest-5",
  "name": "Guest Name",
  "host_name": "Host Name",
  "host_user_name": "Host Name",
  "space": "Atlas Meeting Room",
  "space_title": "Atlas Meeting Room",
  "place_id": 10,
  "guest_id": 5,
  "guest_name": "Guest Name",
  "host_id": 3,
  "color": "#e46630",
  "unread": true,
  "last_read_by_guest": null,
  "last_read_by_host": null,
  "preview": "Hello",
  "time": "14:30",
  "messages": [
    {
      "id": 1,
      "sender": "guest",
      "from": "guest",
      "from_sender": "guest",
      "text": "Hello",
      "created_at": "2026-09-15T10:00:00Z"
    }
  ]
}
```

### `POST /api/notifications/chats/`

Authenticated. Creates or returns a chat for the current guest and place.

Request:

```json
{
  "place_id": 10,
  "name": "Guest Name",
  "host_name": "Host Name"
}
```

Backend sets:

- `place`
- `guest=request.user`
- `host=place.owner`
- `thread_id="place-{place_id}-guest-{guest_id}"`

### `POST /api/notifications/chats/message/`

Authenticated. Sends a message to an accessible chat.

Request:

```json
{
  "chat_id": "place-10-guest-5",
  "from": "guest",
  "text": "Is this place available tomorrow?"
}
```

Backend computes trusted sender from the authenticated user:

- place owner/host sends as `host`
- guest sends as `guest`
- admin may send either

### `GET /api/notifications/chats/unread-count/`

Authenticated. Returns unread chat count for current user.

### `POST /api/notifications/chats/{thread_id}/read/`

Authenticated. Marks chat read for current user side.

## Content CMS

### `GET /api/content/`

Public.

Response:

```json
{
  "ru": {
    "hero_title": "..."
  },
  "uz": {
    "hero_title": "..."
  },
  "en": {
    "hero_title": "..."
  }
}
```

### `PUT /api/content/`

Admin/moderator/staff.

Request:

```json
{
  "lang": "en",
  "data": {
    "hero_title": "Joyzone",
    "nav_links_arr": [
      {
        "label": "Home",
        "href": "#home"
      }
    ]
  }
}
```

Values may be strings or JSON-compatible objects/arrays.

## Admin Overview

### `GET /api/admin/overview/`

Admin/moderator/staff.

Response:

```json
{
  "users_count": 100,
  "partners_count": 12,
  "places_total": 30,
  "places_pending": 4,
  "places_approved": 20,
  "bookings_total": 80,
  "bookings_pending": 10,
  "revenue_month_test": "1500000",
  "reviews_count": 40,
  "average_rating": 4.6,
  "latest_bookings": [],
  "latest_reviews": [],
  "top_places": []
}
```

## Audit Logs

Audit logs record important backend actions for later investigation. Logs are append-only from the application side.

Logged actions include:

- `place.created`, `place.updated`, `place.deleted`
- `place.approved`, `place.rejected`
- `booking.confirmed`, `booking.cancelled`, `booking.blocked`
- `payment.test_paid`, `payment.refunded`
- `tariff.activated`
- `user.role_updated`

### `GET /api/audit-logs/`

Admin/moderator/staff only.

Optional query:

- `action=place.approved`
- `object_type=Place`
- `object_id=123`
- `actor=1`
- `limit=100`, max `500`

Response:

```json
[
  {
    "id": 1,
    "actor": 2,
    "actor_name": "admin",
    "action": "place.approved",
    "object_type": "Place",
    "object_id": "15",
    "metadata": {
      "previous_status": "pending",
      "status": "approved",
      "note": "OK"
    },
    "created_at": "2026-09-16T10:00:00+05:00"
  }
]
```

## Finance

### `GET /api/finance/transactions/`

Admin only.

Optional query:

- `status=test_paid,paid,refunded`
- `limit=100`

### `GET /api/finance/summary/`

Admin only.

Response:

```json
{
  "total_revenue": "2000000",
  "month_revenue": "1500000",
  "pending_payouts": "900000",
  "refunds_total": "100000",
  "payments_count": 12
}
```

## Schema Maintenance

When API payloads change, update this file and verify:

```powershell
cd django_backend
.\venv\Scripts\python.exe manage.py spectacular --file schema.yml --validate
.\venv\Scripts\python.exe manage.py test
```
