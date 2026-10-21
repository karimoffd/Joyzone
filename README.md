# Joyzone

Joyzone is a React/Vite frontend with a Django REST backend.

## Project Layout

- `src/` - React frontend
- `django_backend/` - Django backend API
- `django_backend/README.md` - detailed backend setup

## Backend

```powershell
cd django_backend
py -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python seed_categories.py
python seed_tariffs.py
python seed_places.py
python manage.py runserver 0.0.0.0:8000
```

## Frontend

Open a second terminal from the repository root:

```powershell
npm install
$env:VITE_API_BASE_URL="http://localhost:8000"
$env:VITE_API_TIMEOUT_MS="15000"
$env:VITE_API_UPLOAD_TIMEOUT_MS="60000"
npm run dev
```

The shared axios client applies the regular timeout to all API requests. Image
uploads use the longer upload timeout. Components may pass an AbortController
`signal` so unmounted screens cancel pending requests without showing an error.

Frontend URL:

```text
http://localhost:5173
```

Backend URL:

```text
http://localhost:8000
```

## Checks

```powershell
cd django_backend
.\venv\Scripts\python.exe manage.py check
.\venv\Scripts\python.exe manage.py test
.\venv\Scripts\python.exe manage.py smoke_mvp
```

```powershell
npm run smoke
```

## MVP Smoke Flow

Backend smoke flow:

```powershell
cd django_backend
.\venv\Scripts\python.exe manage.py migrate
.\venv\Scripts\python.exe manage.py smoke_mvp
```

`smoke_mvp` creates only `smoke-mvp-*` records and verifies:

- dev OTP login for partner/client
- test paid tariff activation
- partner place creation
- admin pending moderation and approve
- public approved place listing
- client booking creation
- backend test payment
- partner booking visibility
- owner/client notifications

Frontend smoke:

```powershell
npm run smoke
```

This command does not require a running backend. It builds the production
frontend and runs static contract checks. The frontend smoke fails with a
file, line and explanation when it finds:

- a hardcoded `http://localhost:8000/api` URL;
- the legacy `joyzone_access_token` key;
- direct `fetch`/Axios backend calls outside `src/api/client.js`;
- production-sensitive `FALLBACK_*`, `INIT_*` or `propertyCards` usage without
  an explicit `import.meta.env.DEV` guard.

Direct `fetch` is intentionally allowlisted only for external services. The
current whitelist contains the CBU exchange-rate API and OpenStreetMap
Nominatim; every new exception must be narrow and documented in
`scripts/frontend-smoke.mjs`.

## Browser E2E

Install dependencies and the Playwright Chromium browser once:

```powershell
npm install
npx playwright install chromium
```

Run the full browser MVP flow:

```powershell
npm run test:e2e
```

Playwright starts Django on `127.0.0.1:8010` and Vite on `127.0.0.1:4173`.
Every run creates a fresh isolated SQLite database at
`django_backend/.e2e/db.sqlite3`, runs migrations and `seed_demo`, then verifies
dev OTP login, paid test tariff activation, partner place creation, admin
approval, public visibility, client booking/test payment, partner booking
visibility, and owner/client notifications. The normal `db.sqlite3` is never
read or modified by this test.
