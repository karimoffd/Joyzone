# Joyzone Backend Permission Matrix

This document is the source of truth for the intended Joyzone backend role model.
The shared permission helpers live in `core/permissions.py`.

## Role Definitions

### `client`

Default authenticated user. A client can manage their profile, create bookings,
pay for their own booking in test mode, use favorites, write eligible reviews,
receive notifications, and chat as a guest.

### `partner`

Host/place owner. A partner can do everything a client can, plus create and
manage their own places, see bookings for their own places, block availability
for their own places, and chat as host for their places.

### `moderator`

Operational moderation role. A moderator can review places, approve/reject
places, manage public content, see moderation/admin operational listings, see
all chats, and view audit/admin summaries where allowed.

### `admin`

Project administrator. An admin can manage users, tariffs, finance/test
payments, content, moderation, audit logs, and all operational data.

Django `is_staff` and `is_superuser` are treated as admin-level access by the
shared helpers unless an endpoint intentionally uses a narrower Django admin
rule.

## Shared Helpers

Use these from `core.permissions` instead of repeating role checks:

- `is_client(user)`
- `is_partner(user)`
- `is_moderator(user)`
- `is_admin_user(user)`
- `is_admin_or_moderator(user)`
- `owns_object(user, obj, owner_attr="owner")`
- `can_manage_owned_object(user, obj, owner_attr="owner")`
- `IsAdminUserRole`
- `IsAdminOrModerator`

## Area Matrix

| Area | Public | client | partner | moderator | admin |
| --- | --- | --- | --- | --- | --- |
| Auth OTP | Send/verify OTP | Same | Same | Same | Same |
| Profile | No | Read/update own profile | Read/update own profile | Read/update own profile | Read/update own profile |
| Users API | No | No | No | No | List/update/delete users |
| Places list | Approved only | Approved only | Own places plus approved public flow where applicable | All places | All places |
| Places create | No | Authenticated create is currently allowed and owner becomes requester | Create own place | Create place | Create place |
| Places update/delete | No | Own only if owner | Own places | Any place | Any place |
| Moderation approve/reject | No | No | No | Yes | Yes |
| Categories/subcategories/parameters/discounts | Read public | Read public | Read public | CRUD | CRUD |
| Bookings list | No | Own bookings | Bookings for own places | All bookings | All bookings |
| Bookings create | No | Yes, client becomes requester | Yes, also can block own place availability | Yes | Yes |
| Booking confirm/block | No | No | Own places only | Any place | Any place |
| Booking cancel | No | Own booking | Own booking or own place booking | Any booking | Any booking |
| Availability | Approved places | Approved places | Own places, including non-approved | Any place | Any place |
| Tariff plans | Read public | Read public, subscribe | Read public, subscribe | Create/update/delete plans | Create/update/delete plans |
| Tariff subscriptions admin list | No | No | No | Yes | Yes |
| Manual tariff activation | No | No | No | No | Admin/staff/superuser only |
| Test payment | No | Own booking/subscription | Own booking/subscription | Any target | Any target |
| Refund/finance | No | No | No | No | Admin/staff/superuser only |
| Content CMS read | Public | Public | Public | Public | Public |
| Content CMS write | No | No | No | Yes | Yes |
| Notifications | No | Own notifications | Own notifications | Own notifications | Own notifications |
| Chat list | No | Own guest chats | Chats for own places | All chats | All chats |
| Chat create/send/read | No | Own/approved place chat as guest | Own place chat as host | Any chat | Any chat |
| Favorites | Guest token flow | User-bound favorites | User-bound favorites | User-bound favorites | User-bound favorites |
| Reviews | Public read | Create only after confirmed/completed booking | Create only after confirmed/completed booking | Delete/manage | Delete/manage |
| Audit logs | No | No | No | Yes | Yes |
| Admin overview | No | No | No | Yes | Yes |

## Endpoint Notes

### Auth/Profile

- `POST /api/auth/send-otp/` and `POST /api/auth/verify-otp/` are public.
- `GET/PATCH/PUT /api/auth/profile/` requires authentication and only returns the current user.
- `POST /api/auth/dev-admin-login/` is local development only and is guarded by `DEBUG=True`.

### Places

- Public users see only `status="approved"` places.
- Partners see their own places, regardless of status.
- Moderators/admins see all places and may filter by `status` and `owner`.
- Approve/reject requires `IsAdminOrModerator`.
- Place update/delete requires owner or admin/moderator/staff/superuser.

### Bookings

- Anonymous users cannot list or create bookings.
- Clients see their own bookings.
- Partners see bookings for places they own.
- Moderators/admins see all bookings.
- `blocked` bookings are availability blocks and can only be created/managed by the place owner or admin/moderator/staff/superuser.

### Tariffs

- Active tariff plans are public.
- Creating/updating/deleting tariff plans requires `IsAdminOrModerator`.
- Free tariff subscription activates immediately.
- Paid tariff subscription requires the test payment flow before activation.
- Manual activation is admin/staff/superuser only.

### Payments

- Test payment is authenticated and target-scoped:
  - client/partner can pay their own booking/subscription;
  - moderator/admin can pay any target for test operations.
- Refunds and finance summary/transactions are admin/staff/superuser only.

### Content

- `GET /api/content/` is public.
- `PUT /api/content/` requires `IsAdminOrModerator`.

### Chat And Notifications

- Notifications are user-scoped.
- Chat is REST/polling based:
  - clients see guest chats where they are `guest`;
  - partners see chats for their places;
  - moderators/admins see all chats.

### Audit

- Important actions are logged through `create_audit_log(...)`.
- `GET /api/audit-logs/` requires `IsAdminOrModerator`.
