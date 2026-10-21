import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/utils/storageKeys.js", import.meta.url), "utf8");
const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const storage = await import(moduleUrl);

const values = new Map();
globalThis.localStorage = {
  getItem: (key) => values.has(key) ? values.get(key) : null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: (key) => values.delete(key),
};

const {
  STORAGE_KEYS: keys,
  beginAuthSession,
  clearAccountStorage,
  getSessionGeneration,
  setStorageItem,
} = storage;

setStorageItem(keys.ui.language, "ru");
setStorageItem(keys.ui.currency, "USD");
setStorageItem(keys.offline.guestFavoritesToken, "guest-token");
setStorageItem(keys.offline.guestFavorites, "guest-favorites");
setStorageItem(keys.profile.name, "Old User");
setStorageItem(keys.booking.active, "old-booking");
setStorageItem(keys.booking.draft, "old-draft");
setStorageItem(keys.offline.favorites, "old-favorites");
setStorageItem(keys.offline.chats, "old-chats");

const initialGeneration = getSessionGeneration();
const loginGeneration = beginAuthSession("new-access", "new-refresh");

const expectedAfterLogin = [
  [keys.auth.access, "new-access"],
  [keys.auth.refresh, "new-refresh"],
  [keys.ui.language, "ru"],
  [keys.ui.currency, "USD"],
  [keys.offline.guestFavoritesToken, "guest-token"],
  [keys.offline.guestFavorites, "guest-favorites"],
];
const clearedAfterLogin = [
  keys.profile.name,
  keys.booking.active,
  keys.booking.draft,
  keys.offline.favorites,
  keys.offline.chats,
];

if (expectedAfterLogin.some(([key, value]) => values.get(key) !== value)) {
  throw new Error("New login did not preserve the expected storage values.");
}
if (clearedAfterLogin.some((key) => values.has(key))) {
  throw new Error("New login leaked account-scoped data from the previous user.");
}
if (loginGeneration === initialGeneration || getSessionGeneration() !== loginGeneration) {
  throw new Error("New login did not advance the session generation.");
}

clearAccountStorage();
const logoutGeneration = getSessionGeneration();

if (values.has(keys.auth.access) || values.has(keys.auth.refresh)) {
  throw new Error("Logout did not clear authentication tokens.");
}
if (
  values.get(keys.ui.language) !== "ru"
  || values.get(keys.ui.currency) !== "USD"
  || values.get(keys.offline.guestFavoritesToken) !== "guest-token"
  || values.get(keys.offline.guestFavorites) !== "guest-favorites"
) {
  throw new Error("Logout removed UI preferences or the guest favorites token.");
}
if (logoutGeneration === loginGeneration) {
  throw new Error("Logout did not invalidate pending work from the previous generation.");
}

console.log("[ok] frontend storage isolation checks passed");
