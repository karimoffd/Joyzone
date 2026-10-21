export const STORAGE_KEYS = Object.freeze({
  auth: Object.freeze({
    access: "joyzone-access",
    refresh: "joyzone-refresh",
    authenticated: "joyzone-auth",
    generation: "joyzone-session-generation",
  }),
  profile: Object.freeze({
    role: "joyzone-role",
    name: "joyzone-name",
    email: "joyzone-email",
    phone: "joyzone-phone",
    avatar: "joyzone-avatar",
    localQuestionnaire: "joyzone-profile-local",
    localAccountSettings: "joyzone-account-settings-local",
    legacyUsername: "joyzone-username",
  }),
  ui: Object.freeze({
    language: "joyzone-lang",
    legacyLanguage: "joyzone-language",
    currency: "joyzone-currency",
    currencyRates: "joyzone-currency-rates",
  }),
  booking: Object.freeze({
    active: "joyzone-booking",
    draft: "joyzone-pending-booking",
  }),
  offline: Object.freeze({
    guestFavoritesToken: "joyzone-user-token",
    guestFavorites: "joyzone-guest-favorite-places",
    favorites: "joyzone-favorite-places",
    chats: "joyzone-shared-chats",
  }),
  workflow: Object.freeze({
    editPlaceId: "joyzone-edit-place-id",
    editPlaceReturnHash: "joyzone-edit-place-return-hash",
    adminPage: "joyzone-admin-page",
    highlightPlaceId: "joyzone-highlight-place-id",
  }),
});

const AUTH_KEYS = [
  STORAGE_KEYS.auth.access,
  STORAGE_KEYS.auth.refresh,
  STORAGE_KEYS.auth.authenticated,
];
const PROFILE_KEYS = Object.values(STORAGE_KEYS.profile);
const BOOKING_KEYS = Object.values(STORAGE_KEYS.booking);
const ACCOUNT_SCOPED_FALLBACK_KEYS = [
  STORAGE_KEYS.offline.favorites,
  STORAGE_KEYS.offline.chats,
];
const WORKFLOW_KEYS = Object.values(STORAGE_KEYS.workflow);

export function getStorageItem(key, fallback = null) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch (error) {
    return fallback;
  }
}

export function setStorageItem(key, value) {
  try {
    if (value === undefined || value === null) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, String(value));
    }
    return true;
  } catch (error) {
    return false;
  }
}

export function removeStorageItem(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    return false;
  }
}

function createSessionGeneration() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function getSessionGeneration() {
  return getStorageItem(STORAGE_KEYS.auth.generation, "initial");
}

export function isSessionGenerationCurrent(generation) {
  return generation === getSessionGeneration();
}

export function advanceSessionGeneration(reason = "session_changed") {
  const generation = createSessionGeneration();
  setStorageItem(STORAGE_KEYS.auth.generation, generation);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("joyzone-session-generation", {
      detail: { generation, reason },
    }));
  }
  return generation;
}

export function clearAccountStorage({ includeTokens = true, reason = "session_cleared" } = {}) {
  const keys = [
    ...(includeTokens ? AUTH_KEYS : [STORAGE_KEYS.auth.authenticated]),
    ...PROFILE_KEYS,
    ...BOOKING_KEYS,
    ...ACCOUNT_SCOPED_FALLBACK_KEYS,
    ...WORKFLOW_KEYS,
  ];
  keys.forEach(removeStorageItem);

  // UI preferences and guestFavoritesToken intentionally survive logout.
  setStorageItem(STORAGE_KEYS.auth.authenticated, "false");
  return advanceSessionGeneration(reason);
}

export function beginAuthSession(access, refresh) {
  const generation = clearAccountStorage({ reason: "login" });
  setStorageItem(STORAGE_KEYS.auth.access, access);
  setStorageItem(STORAGE_KEYS.auth.refresh, refresh);
  setStorageItem(STORAGE_KEYS.auth.authenticated, "true");
  return generation;
}

export function readJsonStorage(key, fallback = null) {
  const raw = getStorageItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch (error) {
    return fallback;
  }
}

export function writeJsonStorage(key, value) {
  try {
    return setStorageItem(key, JSON.stringify(value));
  } catch (error) {
    return false;
  }
}

export function getStoredLanguage(fallback = "uz") {
  const canonical = getStorageItem(STORAGE_KEYS.ui.language);
  if (canonical) return canonical.toLowerCase();

  const legacy = getStorageItem(STORAGE_KEYS.ui.legacyLanguage);
  if (!legacy) return fallback;
  const migrated = legacy.toLowerCase();
  setStorageItem(STORAGE_KEYS.ui.language, migrated);
  removeStorageItem(STORAGE_KEYS.ui.legacyLanguage);
  return migrated;
}

export function setStoredLanguage(language) {
  setStorageItem(STORAGE_KEYS.ui.language, String(language).toLowerCase());
  removeStorageItem(STORAGE_KEYS.ui.legacyLanguage);
}
