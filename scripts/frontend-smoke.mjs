import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const issues = [];
const sourceCache = new Map();

const EXTERNAL_FETCH_ALLOWLIST = [
  {
    path: "src/context/CurrencyContext.jsx",
    call: /fetch\(\s*CBU_API\s*\)/,
    reason: "Central Bank of Uzbekistan exchange-rate API",
  },
  {
    path: "src/components/partnerOnboarding/AddressStep.jsx",
    call: /fetch\(\s*`https:\/\/nominatim\.openstreetmap\.org\/reverse\?/,
    reason: "OpenStreetMap Nominatim reverse geocoding API",
  },
];

const MOCK_SCAN_EXEMPT_FILES = new Set([
  "src/data/content.js", // Demo fixture definitions, not a production screen.
  "src/components/CardVariants.jsx", // Explicit internal card-design showcase.
]);

function read(path) {
  if (!sourceCache.has(path)) sourceCache.set(path, readFileSync(join(root, path), "utf8"));
  return sourceCache.get(path);
}

function sourceFiles(directory = join(root, "src")) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(absolute);
    if (!/\.(?:js|jsx|ts|tsx)$/.test(entry.name)) return [];
    return [relative(root, absolute).replaceAll("\\", "/")];
  });
}

function locationFor(source, index) {
  const before = source.slice(0, Math.max(0, index));
  const line = before.split("\n").length;
  const column = index - before.lastIndexOf("\n");
  const text = source.split("\n")[line - 1]?.trim() || "";
  return { line, column, text };
}

function addIssue(path, problem, source = "", index = 0) {
  const location = source ? locationFor(source, index) : { line: 1, column: 1, text: "" };
  issues.push({ path, problem, ...location });
}

function findMatches(source, regex) {
  const matches = [];
  for (const match of source.matchAll(regex)) matches.push(match);
  return matches;
}

function assertIncludes(path, needle, label = needle) {
  const source = read(path);
  if (!source.includes(needle)) {
    addIssue(path, `missing required integration: ${label}`);
  }
}

function assertExcludes(path, needle, label = needle) {
  const source = read(path);
  const index = source.indexOf(needle);
  if (index !== -1) {
    addIssue(path, `still contains forbidden integration: ${label}`, source, index);
  }
}

function isInsideDevGuard(source, index) {
  const localContext = source.slice(Math.max(0, index - 240), index + 120);
  if (localContext.includes("import.meta.env.DEV")) return true;

  const guardPattern = /if\s*\([^)]*import\.meta\.env\.DEV[^)]*\)\s*\{/g;
  for (const guard of source.matchAll(guardPattern)) {
    const openBrace = source.indexOf("{", guard.index);
    let depth = 0;
    for (let cursor = openBrace; cursor < source.length; cursor += 1) {
      if (source[cursor] === "{") depth += 1;
      if (source[cursor] === "}") depth -= 1;
      if (depth === 0) {
        if (index > openBrace && index < cursor) return true;
        break;
      }
    }
  }
  return false;
}

function runRepositoryGuards() {
  for (const path of sourceFiles()) {
    const source = read(path);

    for (const match of findMatches(source, /http:\/\/localhost:8000\/api(?:\/|\b)/g)) {
      addIssue(path, "hardcoded Django API URL; use src/api/client.js and VITE_API_BASE_URL", source, match.index);
    }

    for (const match of findMatches(source, /joyzone_access_token/g)) {
      addIssue(path, "legacy JWT key; use joyzone-access or the shared storage/API helper", source, match.index);
    }

    if (path !== "src/api/client.js") {
      for (const match of findMatches(source, /\bfetch\s*\([^\n]*/g)) {
        const allowed = EXTERNAL_FETCH_ALLOWLIST.some((entry) => (
          entry.path === path && entry.call.test(match[0])
        ));
        if (!allowed) {
          addIssue(path, "direct fetch bypasses the shared API client and is not in EXTERNAL_FETCH_ALLOWLIST", source, match.index);
        }
      }

      for (const match of findMatches(source, /(?:\bimport\s+axios\b|\baxios\s*\.)/g)) {
        addIssue(path, "direct axios usage outside src/api/client.js", source, match.index);
      }

      const apiCalls = findMatches(source, /\bapi\.(?:get|post|put|patch|delete|request)\s*\(/g);
      const importsSharedClient = /from\s+["'][^"']*api\/client\.js["']/.test(source);
      if (apiCalls.length > 0 && !importsSharedClient) {
        addIssue(path, "calls api.* without importing the shared src/api/client.js client", source, apiCalls[0].index);
      }
    }

    const productionSensitive = (
      path.startsWith("src/components/")
      || path.startsWith("src/admin/pages/")
    ) && !MOCK_SCAN_EXEMPT_FILES.has(path);

    if (productionSensitive) {
      for (const match of findMatches(source, /\b(?:FALLBACK_[A-Z0-9_]*|INIT_[A-Z0-9_]*|propertyCards)\b/g)) {
        const { text } = locationFor(source, match.index);
        const isImport = /^import\b/.test(text);
        const isDeclaration = /^(?:export\s+)?const\s+(?:FALLBACK_|INIT_)/.test(text);
        if (!isImport && !isDeclaration && !isInsideDevGuard(source, match.index)) {
          addIssue(
            path,
            `${match[0]} is used outside an explicit import.meta.env.DEV guard`,
            source,
            match.index,
          );
        }
      }
    }
  }
}

const checks = [
  ["src/api/client.js", "export function parseApiError", "common API error parser"],
  ["src/api/client.js", "export function getApiErrorMessage", "API error message helper"],
  ["src/api/client.js", "timeout: API_TIMEOUT_MS", "finite shared API timeout"],
  ["src/api/client.js", "export const API_UPLOAD_TIMEOUT_MS", "separate upload timeout"],
  ["src/api/client.js", "export function isRequestCanceled", "AbortController cancellation classifier"],
  ["src/api/client.js", "fieldErrors: collectFieldErrors(data)", "normalized validation field errors"],
  ["src/components/FilterPage.jsx", "signal: controller.signal", "catalog request cancellation"],
  ["src/admin/pages/OverviewPage.jsx", "signal: controller.signal", "admin overview request cancellation"],
  ["src/components/PartnerOnboarding.jsx", "withUploadTimeout", "explicit image upload timeout"],
  ["src/api/client.js", "export function isTerminalRefreshFailure", "terminal refresh failure classifier"],
  ["src/api/client.js", "joyzone-session-error", "retryable session outage event"],
  ["src/api/client.js", "clearAuthStorage(\"refresh_invalid\")", "invalid refresh session cleanup"],
  ["src/api/client.js", "originalRequest._joyzoneRetry", "single auth replay guard"],
  ["src/api/client.js", "JOYZONE_SESSION_CHANGED", "stale session response guard"],
  ["src/api/client.js", "refreshRequest?.generation === generation", "generation-keyed shared refresh"],
  ["src/utils/storageKeys.js", "joyzone-session-generation", "session generation storage key"],
  ["src/utils/storageKeys.js", "export function advanceSessionGeneration", "session generation invalidation"],
  ["src/utils/favoritesManager.js", "isStaleSessionError", "stale favorites response guard"],
  ["src/utils/chatManager.js", "isStaleSessionError", "stale chat response guard"],
  ["src/App.jsx", "window.addEventListener(\"storage\"", "cross-tab session synchronization"],
  ["src/App.jsx", "joyzone-session-error", "retryable session outage UI"],
  ["src/App.jsx", "api.get(\"/api/content/\"", "single app-level CMS request"],
  ["src/App.jsx", "setContent(mergeSiteContent(response.data))", "CMS and defaults merge"],
  ["src/context/LanguageContext.jsx", "export function useSiteContent", "shared CMS content hook"],
  ["src/utils/content.js", "...defaultContent[language]", "per-language missing key fallback"],
  ["src/components/home/HeroBanner.jsx", "content?.[lang]?.home_partner_title", "CMS-driven home partner promo"],
  ["src/components/StaticInfoPages.jsx", "cms.about_page_title", "CMS-driven about page"],
  ["src/components/StaticInfoPages.jsx", "cms.partner_guide_title", "CMS-driven partner guide"],
  ["src/admin/pages/ContentPage.jsx", "['uz', 'ru', 'en']", "CMS language editor"],
  ["src/admin/pages/ContentPage.jsx", "joyzone-content-updated", "CMS refresh after save"],
  ["src/components/FilterPage.jsx", "getApiErrorMessage", "visible API errors"],
  ["src/components/FilterPage.jsx", "useDebouncedValue(filters.search", "debounced catalog search"],
  ["src/components/FilterPage.jsx", "params.set(\"min_people\"", "backend people filter"],
  ["src/components/FilterPage.jsx", "params.set(\"amenities\"", "backend amenities filter"],
  ["src/components/FilterPage.jsx", "params.set(\"promoted\", \"true\")", "backend promoted filter"],
  ["src/components/FilterPage.jsx", "selectedCategorySlug", "category-specific backend filters"],
  ["src/components/FilterPage.jsx", "Ничего не найдено", "catalog empty state"],
  ["src/components/SpaceDetail.jsx", "getApiErrorMessage", "booking/detail API errors"],
  ["src/components/BookingCheckout.jsx", "/api/payments/test-pay/", "test payment flow"],
  ["src/components/PaymentModal.jsx", "/api/payments/test-pay/", "test tariff payment flow"],
  ["src/components/PaymentModal.jsx", "payload.subscription_id = subscriptionId", "subscription-targeted tariff payment"],
  ["src/components/PaymentModal.jsx", "['test_paid', 'paid'].includes(paymentStatus)", "confirmed payment status guard"],
  ["src/components/PaymentModal.jsx", "response.data?.subscription?.status !== \"active\"", "active subscription guard"],
  ["src/components/HostDashboard.jsx", "getApiErrorMessage", "partner dashboard API errors"],
  ["src/components/hostDashboard/HostTariffsPage.jsx", "if (res.data?.requires_payment)", "dashboard paid tariff branch"],
  ["src/components/hostDashboard/HostTariffsPage.jsx", "subscriptionId: res.data?.subscription_id", "dashboard pending subscription handoff"],
  ["src/components/StaticInfoPages.jsx", "if (res.data?.requires_payment)", "public paid tariff branch"],
  ["src/components/StaticInfoPages.jsx", "<PaymentModal", "public tariff payment modal"],
  ["src/components/PartnerOnboarding.jsx", "getApiErrorMessage", "place creation API errors"],
  ["src/components/UserProfile.jsx", "profileError", "profile API error banner"],
  ["src/components/UserProfile.jsx", "api.get(\"/api/bookings/\", { params: { scope: \"mine\" } })", "scoped client booking history API"],
  ["src/components/UserProfile.jsx", "api.get(\"/api/payments/my/\")", "user payment history API"],
  ["src/components/UserProfile.jsx", "activeTab === \"payments\"", "user payment history tab"],
  ["src/components/UserProfile.jsx", "paymentsLoading", "payment history loading state"],
  ["src/components/UserProfile.jsx", "paymentsError", "payment history error state"],
  ["src/components/UserProfile.jsx", "Hozircha to'lovlar yo'q", "payment history empty state"],
  ["src/components/UserProfile.jsx", "setAllBookings(normalizeBookingResponse", "normalized client booking history"],
  ["src/components/UserProfile.jsx", "ACTIVE_BOOKING_STATUSES.has", "backend-derived active booking"],
  ["src/components/UserProfile.jsx", "`/api/bookings/${booking.id}/cancel/`", "client booking cancel action"],
  ["src/components/UserProfile.jsx", "className=\"profile-cancel-modal\"", "client booking cancel confirmation modal"],
  ["src/components/UserProfile.jsx", "const refreshedBookingsResponse = await api.get(\"/api/bookings/\", {", "booking refresh after cancellation"],
  ["src/components/HostDashboard.jsx", "params: { scope: \"host\" }", "partner incoming booking scope"],
  ["src/components/UserProfile.jsx", "setBookingsSuccess", "booking cancellation success state"],
  ["src/components/UserProfile.jsx", "Hozircha bronlar yo'q", "booking history empty state"],
  ["src/utils/favoritesManager.js", "getOrCreateGuestFavoritesToken", "stable guest favorites token"],
  ["src/utils/favoritesManager.js", "const pendingToggles = new Map()", "favorite double-click guard"],
  ["src/utils/favoritesManager.js", "if (!import.meta.env.DEV) throw error", "production favorites API enforcement"],
  ["src/components/UserProfile.jsx", "fetchFavoritesFromBackend", "saved places backend loading"],
  ["src/components/UserProfile.jsx", "favoritesUsingDevFallback", "explicit favorites DEV fallback"],
  ["src/components/UserProfile.jsx", "Hozircha saqlangan joylar yo'q", "saved places empty state"],
  ["src/components/ListingsSection.jsx", "await toggleFavoritePlace(item)", "card favorite manager integration"],
  ["src/components/SpaceDetail.jsx", "await toggleFavoritePlace(space)", "detail favorite manager integration"],
  ["src/admin/pages/BookingsPage.jsx", "/api/bookings/", "admin bookings API"],
  ["src/admin/pages/BookingsPage.jsx", "params.place = filterPlace", "admin booking place filter"],
  ["src/admin/pages/BookingsPage.jsx", "params.client = filterClient.trim()", "admin booking client filter"],
  ["src/admin/pages/BookingsPage.jsx", "params.date_from = dateFrom", "admin booking date from filter"],
  ["src/admin/pages/BookingsPage.jsx", "params.date_to = dateTo", "admin booking date to filter"],
  ["src/admin/pages/BookingsPage.jsx", "params.search = debouncedSearch", "admin booking backend search"],
  ["src/admin/pages/BookingsPage.jsx", "api.post(`/api/bookings/${booking.id}/${action}/`)", "admin booking status actions"],
  ["src/admin/pages/BookingsPage.jsx", "await loadBookings();", "admin booking refresh after mutation"],
  ["src/admin/pages/SpacesPage.jsx", "/api/places/", "admin spaces API"],
  ["src/admin/pages/OverviewPage.jsx", "/api/admin/overview/", "admin overview API"],
  ["src/admin/pages/AuditLogPage.jsx", "/api/audit-logs/", "admin audit log API"],
  ["src/admin/pages/AuditLogPage.jsx", "date_from", "audit date from filter"],
  ["src/admin/pages/AuditLogPage.jsx", "date_to", "audit date to filter"],
  ["src/admin/pages/AuditLogPage.jsx", "formatMetadata", "audit metadata preview"],
  ["src/admin/pages/AuditLogPage.jsx", "Журнал загружается", "audit loading state"],
  ["src/admin/pages/AuditLogPage.jsx", "По выбранным фильтрам записей нет", "audit empty state"],
  ["src/admin/AdminApp.jsx", "component: AuditLogPage", "audit admin page registration"],
  ["src/admin/AdminRouteGuard.jsx", "api.get(\"/api/auth/profile/\"", "backend-authoritative admin route guard"],
  ["src/admin/AdminRouteGuard.jsx", "VITE_DEV_ADMIN_AUTOLOGIN", "explicit DEV-only admin autologin flag"],
  ["src/admin/AdminRouteGuard.jsx", "AdminAccessState status={access.status}", "admin access state gate"],
  ["src/admin/AdminApp.jsx", "export function hasAdminShellAccess", "admin shell role contract"],
  ["src/admin/AdminApp.jsx", "adminOnly: true", "narrow admin page permissions"],
  ["src/admin/AdminLayout.jsx", "allowedPages.includes(item.id)", "permission-filtered admin navigation"],
  ["src/admin/AdminLayout.jsx", "id: \"audit\"", "audit admin navigation"],
  ["src/admin/pages/SettingsPage.jsx", "api.get('/api/auth/profile/')", "admin profile loading"],
  ["src/admin/pages/SettingsPage.jsx", "api.patch('/api/auth/profile/'", "admin profile saving"],
  ["src/admin/pages/SettingsPage.jsx", "first_name: firstName.trim()", "admin first name payload"],
  ["src/admin/pages/SettingsPage.jsx", "last_name: lastName.trim()", "admin last name payload"],
  ["src/admin/pages/SettingsPage.jsx", "cacheProfile(response.data)", "admin profile cache sync"],
  ["src/admin/pages/SettingsPage.jsx", "adminNotifications: notifs", "local-only admin preferences"],
  ["src/utils/notificationsManager.js", "/api/notifications/", "notifications API manager"],
  ["src/components/HomeHero.jsx", "promoted: \"true\"", "promoted home places request"],
  ["src/components/HomeHero.jsx", "place.status === \"approved\"", "approved-only home places"],
  ["src/components/HomeHero.jsx", "api.get(\"/api/categories/\"", "backend home categories"],
  ["src/components/HomeHero.jsx", "import.meta.env.DEV", "development-only home fallback"],
  ["src/components/ListingsSection.jsx", "api.get(\"/api/places/\", { skipAuth: true })", "public listings API"],
  ["src/components/ListingsSection.jsx", ".map(normalizePlace)", "listings place normalization"],
  ["src/components/ListingsSection.jsx", "const [empty, setEmpty]", "listings empty state"],
  ["src/components/SpaceDetail.jsx", "api.get(`/api/places/${value}/`", "backend place route by ID"],
  ["src/components/SpaceDetail.jsx", "params: { place: placeId }", "backend place reviews"],
  ["src/components/SpaceDetail.jsx", "fetchPlaceAvailability", "backend place availability"],
  ["src/components/SpaceDetail.jsx", "isAvailabilityDateCovered", "availability range coverage"],
  ["src/components/SpaceDetail.jsx", "getRangeAvailabilityError", "strict date-range availability validation"],
  ["src/components/SpaceDetail.jsx", "getCheckoutAvailabilityError", "checkout availability revalidation"],
  ["src/components/SpaceDetail.jsx", "Tanlangan vaqt band bo'lib qoldi", "stale slot removal warning"],
  ["src/components/SpaceDetail.jsx", "/api/reviews/eligibility/", "backend review eligibility"],
  ["src/components/SpaceDetail.jsx", "loadReviews({ allowDevFallback: false })", "review refresh after submit"],
  ["src/components/SpaceDetail.jsx", "api.get(`/api/places/${placeId}/`", "place rating refresh after review"],
  ["src/components/SpaceDetail.jsx", "if (!usingMockReviews) return Number(space?.rating_avg", "backend rating source of truth"],
  ["src/admin/pages/ReviewsPage.jsx", "api.delete(`/api/reviews/${review.id}/`)", "admin review deletion"],
  ["src/admin/pages/ReviewsPage.jsx", "const refreshed = await loadReviews()", "admin reviews refresh after deletion"],
  ["src/utils/bookingDraft.js", "export function createBookingDraft", "booking draft factory"],
  ["src/utils/bookingDraft.js", "export function draftToBookingPayload", "booking payload mapper"],
  ["src/utils/bookingDraft.js", "export function clearBookingDraft", "booking draft cleanup"],
  ["src/components/SpaceDetail.jsx", "saveBookingDraft(draft)", "SpaceDetail draft save"],
  ["src/components/BookingCheckout.jsx", "const draft = loadBookingDraft()", "checkout draft load"],
  ["src/components/BookingCheckout.jsx", "const bookingPayload = draftToBookingPayload", "checkout canonical payload"],
  ["src/components/BookingCheckout.jsx", "clearBookingDraft();", "draft cleanup after booking"],
  ["src/components/BookingCheckout.jsx", "paymentResponse.data?.booking", "payment booking source of truth"],
  ["src/components/BookingCheckout.jsx", "api.get(`/api/bookings/${booking.id}/`", "payment booking sync fallback"],
  ["src/components/BookingCheckout.jsx", "includes(activeBooking.payment_status)", "synced payment status validation"],
  ["src/components/BookingCheckout.jsx", "setSuccess(true);", "backend-confirmed payment success"],
];

for (const [path, needle, label] of checks) {
  assertIncludes(path, needle, label);
}

runRepositoryGuards();

assertExcludes("src/components/SpaceDetail.jsx", "buildBookingPayload", "legacy booking payload builder");
assertExcludes("src/components/BookingCheckout.jsx", "joyzone-pending-booking", "direct booking draft storage key");
assertExcludes("src/components/UserProfile.jsx", "Atlas Meeting Room", "demo booking history");
assertExcludes("src/components/UserProfile.jsx", "window.confirm", "native booking cancellation confirm");
assertExcludes("src/admin/pages/BookingsPage.jsx", "INIT_BOOKINGS", "admin booking mock fallback");
assertExcludes("src/admin/pages/BookingsPage.jsx", "alert(", "admin booking browser alerts");

if (issues.length > 0) {
  console.error(`\n[frontend-smoke] ${issues.length} problem(s) found:\n`);
  issues.forEach((issue, index) => {
    console.error(`${index + 1}. ${issue.path}:${issue.line}:${issue.column}`);
    console.error(`   ${issue.problem}`);
    if (issue.text) console.error(`   > ${issue.text}`);
  });
  console.error("\nFix the reported source or add a narrowly scoped external-fetch/showcase exemption with a reason.\n");
  process.exitCode = 1;
} else {
  console.log(`[ok] frontend smoke static checks passed (${checks.length} contract checks + repository guards)`);
}
