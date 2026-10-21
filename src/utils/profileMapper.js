import { removeStorageItem, setStorageItem, STORAGE_KEYS } from "./storageKeys.js";

export function splitFullName(value = "") {
  const parts = String(value).trim().split(/\s+/).filter(Boolean);
  return {
    first_name: parts.shift() || "",
    last_name: parts.join(" "),
  };
}

export function normalizeProfile(profile = {}) {
  const firstName = profile.first_name || "";
  const lastName = profile.last_name || "";
  const fallbackName = profile.name || profile.username || "Foydalanuvchi";

  return {
    ...profile,
    first_name: firstName,
    last_name: lastName,
    full_name: `${firstName} ${lastName}`.trim() || fallbackName,
    email: profile.email || "",
    phone_number: profile.phone_number || profile.phone || profile.username || "",
    avatar: profile.avatar || null,
  };
}

export function profileToUserState(profile, current = {}) {
  const normalized = normalizeProfile(profile);
  return {
    ...current,
    id: normalized.id ?? current.id,
    isAuthed: true,
    isPartner: normalized.role === "partner",
    name: normalized.full_name,
    email: normalized.email,
    phone: normalized.phone_number,
    avatar: normalized.avatar,
  };
}

export function cacheProfile(profile) {
  const normalized = normalizeProfile(profile);
  try {
    setStorageItem(STORAGE_KEYS.auth.authenticated, "true");
    setStorageItem(STORAGE_KEYS.profile.name, normalized.full_name);
    setStorageItem(STORAGE_KEYS.profile.email, normalized.email);
    setStorageItem(STORAGE_KEYS.profile.phone, normalized.phone_number);
    if (normalized.role) setStorageItem(STORAGE_KEYS.profile.role, normalized.role);
    if (normalized.avatar) {
      setStorageItem(STORAGE_KEYS.profile.avatar, normalized.avatar);
    } else {
      removeStorageItem(STORAGE_KEYS.profile.avatar);
    }
  } catch (error) {
    // The backend response remains authoritative when browser storage is unavailable.
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("joyzone-profile-update", {
      detail: normalized,
    }));
  }
  return normalized;
}
