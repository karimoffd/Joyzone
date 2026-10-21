# Joyzone Django Backend

Backend API for Joyzone. The Django project lives in `django_backend/`, while the React/Vite frontend lives in the repository root.

## Requirements

- Python with venv support
- SQLite is used by default for local development/demo
- PostgreSQL is selected automatically when `DATABASE_URL` is set

## Local Setup

```powershell
cd django_backend
py -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

If the venv already exists:

```powershell
cd django_backend
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

## Database

By default Joyzone uses SQLite:

```text
django_backend/db.sqlite3
```

SQLite is only for local development and disposable demo data. When
`DATABASE_URL` is not set, the backend keeps using `db.sqlite3`, so the normal
local setup does not require any environment variables.

Production must use PostgreSQL. Install the pinned requirements, then provide a
standard PostgreSQL URL:

```powershell
$env:DATABASE_URL="postgresql://joyzone:password@localhost:5432/joyzone?sslmode=require"
python manage.py migrate
```

URL-encode special characters in the username/password. The optional
`DB_CONN_MAX_AGE` and `DB_CONN_HEALTH_CHECKS` variables control persistent
connection reuse and health checks. The PostgreSQL driver is included in
`requirements.txt`.

For an isolated local or E2E SQLite database, leave `DATABASE_URL` unset and set:

```powershell
$env:SQLITE_PATH="tmp/e2e.sqlite3"
```

Run migrations:

```powershell
python manage.py migrate
```

Create an admin user:

```powershell
python manage.py createsuperuser
```

## Seed Data

Recommended demo seed command:

```powershell
python manage.py seed_demo
```

It creates/updates:

- `demo_admin`, `demo_partner`, `demo_client`
- categories and subcategories
- parameter groups and parameters
- Standard, Comfort, and Premium tariffs
- demo places

To reset only known demo records before recreating them:

```powershell
python manage.py seed_demo --clean
```

`--clean` never deletes superusers. If `demo_admin` is already a superuser, it is preserved and updated.

Optional legacy seed scripts are still present:

```powershell
python seed_categories.py
python seed_tariffs.py
python seed_places.py
```

Notes:

- `seed_categories.py` creates/updates demo categories and subcategories.
- `seed_tariffs.py` creates/updates Standard, Comfort, and Premium tariffs.
- `seed_places.py` creates/updates demo places without deleting existing places.
- `python seed_places.py --reset` clears existing places first. Use it only on a disposable demo database.

## Run Server

Optional local environment variables:

```powershell
$env:SECRET_KEY="local-dev-secret"
$env:DEBUG="True"
$env:DEV_OTP_ENABLED="True"
$env:OTP_TTL_SECONDS="300"
$env:DEV_OTP_CONSOLE_LOG_ENABLED="True"
$env:JWT_ACCESS_TOKEN_MINUTES="15"
$env:JWT_REFRESH_TOKEN_DAYS="7"
$env:ALLOWED_HOSTS="localhost,127.0.0.1"
$env:CORS_ALLOWED_ORIGINS="http://localhost:5173,http://127.0.0.1:5173"
```

See `.env.example` for the full backend environment template. The current
settings read OS environment variables directly; install a `.env` loader only if
your deployment/runtime needs one.

Stored OTP codes are single-use and expire after `OTP_TTL_SECONDS` (five
minutes by default). The validity interval is strict: a code exactly five
minutes old is expired. Requesting a new OTP invalidates every previous unused
code for the same phone. The fixed local `111111` bypass is governed separately
by `DEBUG` and `DEV_OTP_ENABLED` and is not stored as a normal OTP.

OTP endpoints keep strict per-IP limits (`send=3/minute`, `verify=5/minute`)
and also apply the same default limits to a normalized phone across all IPs.
Account limits can be configured with `OTP_SEND_ACCOUNT_RATE` and
`OTP_VERIFY_ACCOUNT_RATE`. Throttled responses return HTTP 429 and
`Retry-After`.

With `DEV_OTP_CONSOLE_LOG_ENABLED=True`, and only while `DEBUG=True`, the local
console may show the OTP together with a masked phone. Otherwise logs contain
only an irreversible short login reference: never the OTP, JWT, or full phone.

JWT access tokens last 15 minutes and refresh tokens last 7 days by default;
both values are configurable through `JWT_ACCESS_TOKEN_MINUTES` and
`JWT_REFRESH_TOKEN_DAYS`. Every refresh rotates the refresh token and
blacklists the consumed token. The frontend must save both returned tokens.
`POST /api/auth/logout/` blacklists the current refresh token and is safe to
repeat with that same token. An already-issued access token is not stored
server-side and remains valid until its short expiry; logout therefore revokes
future refresh, not the remaining minutes of the access token.

The browser keeps `joyzone-access` and `joyzone-refresh` in `localStorage` for
the current MVP contract. This is exposed to successful same-origin XSS, so the
short access lifetime, refresh rotation, blacklist, CSP/input hardening, and
strict dependency hygiene are important mitigations. Moving refresh sessions
to Secure, HttpOnly, SameSite cookies is the recommended later production
hardening step and requires a coordinated API/CSRF contract change.

```powershell
python manage.py runserver 0.0.0.0:8000
```

API base URL for the frontend:

```powershell
$env:VITE_API_BASE_URL="http://localhost:8000"
```

## Production Security

Production must use an HTTPS reverse proxy and explicit hosts/origins. A typical
environment includes:

```powershell
$env:DEBUG="False"
$env:DEV_OTP_ENABLED="False"
$env:DEV_OTP_CONSOLE_LOG_ENABLED="False"
$env:CACHE_URL="redis://redis:6379/1"
$env:CACHE_KEY_PREFIX="joyzone-production"
$env:JWT_ACCESS_TOKEN_MINUTES="15"
$env:JWT_REFRESH_TOKEN_DAYS="7"
$env:SECRET_KEY="replace-with-a-long-random-production-secret"
$env:ALLOWED_HOSTS="api.joyzone.uz"
$env:CORS_ALLOWED_ORIGINS="https://joyzone.uz,https://www.joyzone.uz"
$env:CORS_ALLOW_ALL_ORIGINS="False"
$env:CSRF_TRUSTED_ORIGINS="https://joyzone.uz,https://www.joyzone.uz"
$env:SECURE_SSL_REDIRECT="True"
$env:SESSION_COOKIE_SECURE="True"
$env:CSRF_COOKIE_SECURE="True"
$env:SECURE_HSTS_SECONDS="31536000"
```

With `DEBUG=False`, settings import stops with `ImproperlyConfigured` unless
`SECRET_KEY` is a separate value of at least 32 characters and
`ALLOWED_HOSTS` is explicitly provided. The error names the missing/invalid
setting without printing its secret value. `ALLOWED_HOSTS=*` and
`CORS_ALLOW_ALL_ORIGINS=True` are forbidden in production.

`CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS` are comma-separated absolute
`http://` or `https://` origins. Wildcards, credentials, paths, queries, and
fragments are rejected. Empty CORS/CSRF lists are valid for same-origin API
deployments. Local `DEBUG=True` still starts without env and keeps localhost
origins plus the development secret fallback.

Do not enable `SECURE_SSL_REDIRECT` until HTTPS and proxy forwarding are
configured, or health checks may enter redirect loops. Start HSTS with a small
value while validating the deployment, then raise it deliberately.

OTP account throttles use Django's default cache. With no `CACHE_URL`, Joyzone
uses `LocMemCache`, which is acceptable only for a single local development
process. Every production/test-stand deployment with multiple workers or
instances must set one shared Redis `CACHE_URL`; otherwise each worker would
maintain a separate attempt window. Redis client support is pinned in
`requirements.txt`.

The fixed OTP `111111` and `/api/auth/dev-admin-login/` are development-only
authentication shortcuts. They work only when both `DEBUG=True` and
`DEV_OTP_ENABLED=True`; neither shortcut logs returned JWTs. With `DEBUG=False`,
both paths stay disabled even if `DEV_OTP_ENABLED` was accidentally left true.
Set the dev flag explicitly only for an isolated local smoke/E2E process, and
point that process at a disposable database, for example:

```powershell
$env:DATABASE_URL=""
$env:SQLITE_PATH="tmp/smoke.sqlite3"
$env:MEDIA_ROOT="tmp/smoke-media"
$env:DEBUG="True"
$env:DEV_OTP_ENABLED="True"
python manage.py migrate --noinput
python manage.py smoke_mvp
```

## Public Test Stand Access

Public demo login is separate from OTP and from `DEBUG`. It is disabled by
default and accepts only dedicated `public_demo_*` client/partner accounts from
a server-side allowlist. It never creates users and rejects admin, moderator,
staff, and superuser accounts even if an operator accidentally allowlists one.

Before publishing a test stand, the owner/operator must approve the account
roles, expiration time, and disposable dataset. Use a database dedicated to the
stand; never enable `PUBLIC_DEMO_DATA_ISOLATED` against the user/production
database.

Provision each account with a random credential on that isolated database:

```powershell
$env:DATABASE_URL=""
$env:SQLITE_PATH="tmp/public-demo.sqlite3"
$env:PUBLIC_DEMO_DATA_ISOLATED="True"
python manage.py migrate --noinput
python manage.py create_public_demo_account --role=client --acknowledge-isolated-database
python manage.py create_public_demo_account --role=partner --acknowledge-isolated-database
```

The command prints each random account/password once. Transfer credentials to
approved testers out of band. Do not commit them, put them in `VITE_*`, or add
them to frontend code. Add only generated account names to the backend env,
choose a UTC expiration, and enable access last:

```powershell
$env:PUBLIC_DEMO_ACCOUNT_USERNAMES="public_demo_client_a1b2c3,public_demo_partner_d4e5f6"
$env:PUBLIC_DEMO_ACCOUNT_PREFIX="public_demo_"
$env:PUBLIC_DEMO_LOGIN_EXPIRES_AT="2026-10-01T18:00:00Z"
$env:PUBLIC_DEMO_SESSION_MINUTES="30"
$env:PUBLIC_DEMO_LOGIN_RATE="5/minute"
$env:PUBLIC_DEMO_DATA_ISOLATED="True"
$env:PUBLIC_DEMO_LOGIN_ENABLED="True"
```

Disable the stand by setting `PUBLIC_DEMO_LOGIN_ENABLED=False` and restarting
the backend. This immediately blocks new demo logins. Already issued demo JWTs
expire within the configured session duration (clamped to 5-120 minutes), so
use a short duration for public review. Rotate demo credentials and recreate
the disposable database between review rounds.

## Static And Media Files

Local uploads use Django `FileSystemStorage` and are saved under
`django_backend/media/uploads/`. With `DEBUG=True`, Django serves them from
`/media/`. Existing media files are not touched by setup or `collectstatic`.

Image uploads accept JPEG, PNG, and WebP by default, with a 5 MB limit. The API
checks the extension, declared MIME type, and file signature, then stores the
file under a generated safe name. Configure the policy with:

```powershell
$env:MAX_IMAGE_UPLOAD_SIZE="5242880"
$env:ALLOWED_IMAGE_CONTENT_TYPES="image/jpeg,image/png,image/webp"
$env:ALLOWED_IMAGE_EXTENSIONS=".jpg,.jpeg,.png,.webp"
```

Collect production static assets into `STATIC_ROOT` before deployment:

```powershell
python manage.py collectstatic --noinput
```

The production web server or CDN must serve `STATIC_ROOT`; Django does not serve
static or media files when `DEBUG=False`. For media, either mount `MEDIA_ROOT` as
a persistent volume and serve `MEDIA_URL` through the reverse proxy, or install
an S3-compatible Django storage backend and set `MEDIA_STORAGE_BACKEND`. The
upload endpoint uses `default_storage`, so switching storage does not require an
API change. No S3 dependency is installed by default.

## Useful Checks

```powershell
python manage.py check
python manage.py makemigrations --check --dry-run
python manage.py test
```

## MVP Smoke Flow

Run this after migrations when you want to verify the main Joyzone MVP API flow:

```powershell
python manage.py smoke_mvp
```

The command creates only `smoke-mvp-*` records, then checks dev OTP login,
paid tariff test payment, partner place creation, admin approve, public place
visibility, booking creation, booking test payment, partner booking visibility,
and owner/client notifications.

Use this from the repository root for the frontend side:

```powershell
npm run smoke
```

## Local Runtime Files

The local SQLite database and uploaded media are ignored by git by default:

- `db.sqlite3`
- `media/uploads/`

Do not delete or reset those files if they contain data you need.
