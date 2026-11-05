import { useEffect, useState } from "react";
import { getStorageItem, STORAGE_KEYS } from "./storageKeys.js";
import { navigate } from "./router.js";

// Who may list places: partners and staff. Everyone else first fills the
// partner form on /partner-guide (#become), which switches them to partner.
const LISTING_ROLES = new Set(["partner", "admin", "moderator"]);
export const BECOME_PARTNER_PATH = "/partner-guide#become";
export const ADD_PLACE_PATH = "/partner";

function readAccount() {
  const role = getStorageItem(STORAGE_KEYS.profile.role, "") || "";
  return {
    isAuthed: Boolean(getStorageItem(STORAGE_KEYS.auth.access)),
    role,
    canListPlaces: LISTING_ROLES.has(role),
  };
}

/** Current account role, kept in sync with login, logout and profile updates. */
export function useAccountRole() {
  const [account, setAccount] = useState(readAccount);

  useEffect(() => {
    const sync = () => setAccount(readAccount());
    window.addEventListener("joyzone-profile-update", sync);
    window.addEventListener("joyzone-session-expired", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("joyzone-profile-update", sync);
      window.removeEventListener("joyzone-session-expired", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return account;
}

/** Where a "list your place" button should lead for this role. */
export function partnerEntryHref(role) {
  return LISTING_ROLES.has(role) ? ADD_PLACE_PATH : BECOME_PARTNER_PATH;
}

// After logging in, the auth screen sends the user back to where they were.
const LOGIN_RETURN_KEY = "joyzone-login-return";

export function loginThenReturn(path) {
  try {
    sessionStorage.setItem(LOGIN_RETURN_KEY, path);
  } catch (error) {
    // Without storage the user simply lands on the home page after login.
  }
  navigate("/login");
}

export function consumeLoginReturn() {
  try {
    const path = sessionStorage.getItem(LOGIN_RETURN_KEY);
    sessionStorage.removeItem(LOGIN_RETURN_KEY);
    return path && path.startsWith("/") ? path : null;
  } catch (error) {
    return null;
  }
}

// Labels for the role-aware "list your place" buttons.
export const PARTNER_CTA_TEXT = {
  uz: { become: "Hamkor bo'lish", add: "Joy qo'shish", becomeDesc: "Ariza — 2 daqiqa", addDesc: "Yangi e'lon" },
  ru: { become: "Стать партнёром", add: "Добавить место", becomeDesc: "Заявка — 2 минуты", addDesc: "Новое объявление" },
  en: { become: "Become a partner", add: "Add a place", becomeDesc: "Apply in 2 minutes", addDesc: "New listing" },
};
