import React, { useCallback, useEffect, useRef, useState } from "react";
import api, { getAccessToken, getApiErrorMessage, isRequestCanceled } from "../api/client.js";
import { cacheProfile } from "../utils/profileMapper.js";
import {
  beginAuthSession,
  removeStorageItem,
  STORAGE_KEYS,
} from "../utils/storageKeys.js";
import AdminApp, { hasAdminShellAccess } from "./AdminApp.jsx";
import "./admin.css";

const DEV_AUTOLOGIN_ENABLED = import.meta.env.DEV
  && String(import.meta.env.VITE_DEV_ADMIN_AUTOLOGIN || "").toLowerCase() === "true";

function clearAdminRouteCache() {
  removeStorageItem(STORAGE_KEYS.workflow.adminPage);
}

function AdminAccessState({ status, message }) {
  const isLoading = status === "loading";
  const isUnauthenticated = status === "unauthenticated";
  return (
    <main className="adm-access-state" data-testid={`admin-access-${status}`}>
      <div className="adm-access-state__content">
        <div className="adm-sidebar-logo-mark" aria-hidden="true">J</div>
        <h1>{isLoading ? "Проверяем доступ" : isUnauthenticated ? "Требуется вход" : "Доступ запрещён"}</h1>
        <p>
          {message || (isLoading
            ? "Загружаем профиль и права доступа."
            : isUnauthenticated
              ? "Войдите в аккаунт с административными правами."
              : "У этого аккаунта нет доступа к панели управления.")}
        </p>
        {!isLoading && (
          <a className="adm-access-state__action" href={isUnauthenticated ? "#login" : "#home"}>
            {isUnauthenticated ? "Войти" : "На главную"}
          </a>
        )}
      </div>
    </main>
  );
}

export default function AdminRouteGuard() {
  const [access, setAccess] = useState({ status: "loading", profile: null, message: "" });
  const requestRef = useRef(null);
  const devLoginAttempted = useRef(false);

  const verifyAccess = useCallback(async ({ preserveAuthorized = false } = {}) => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;

    if (!getAccessToken()) {
      if (DEV_AUTOLOGIN_ENABLED && !devLoginAttempted.current) {
        devLoginAttempted.current = true;
        setAccess({ status: "loading", profile: null, message: "" });
        try {
          const response = await api.post("/api/auth/dev-admin-login/", null, {
            skipAuth: true,
            sessionGuard: true,
            signal: controller.signal,
          });
          beginAuthSession(response.data.access, response.data.refresh);
        } catch (error) {
          if (isRequestCanceled(error)) return;
          clearAdminRouteCache();
          setAccess({
            status: "unauthenticated",
            profile: null,
            message: getApiErrorMessage(error, "Не удалось выполнить DEV-вход."),
          });
          return;
        }
      } else {
        clearAdminRouteCache();
        setAccess({ status: "unauthenticated", profile: null, message: "" });
        return;
      }
    }

    if (!preserveAuthorized) {
      setAccess((current) => ({ ...current, status: "loading", message: "" }));
    }
    try {
      const response = await api.get("/api/auth/profile/", { signal: controller.signal });
      const profile = cacheProfile(response.data);
      if (!hasAdminShellAccess(profile)) {
        clearAdminRouteCache();
        setAccess({ status: "forbidden", profile: null, message: "" });
        return;
      }
      setAccess({ status: "authorized", profile, message: "" });
    } catch (error) {
      if (isRequestCanceled(error)) return;
      clearAdminRouteCache();
      setAccess({
        status: error?.response?.status === 403 ? "forbidden" : "unauthenticated",
        profile: null,
        message: getApiErrorMessage(error, "Не удалось проверить административный доступ."),
      });
    }
  }, []);

  useEffect(() => {
    verifyAccess();
    const handleSessionExpired = () => {
      requestRef.current?.abort();
      clearAdminRouteCache();
      setAccess({ status: "unauthenticated", profile: null, message: "" });
    };
    const handleAuthUpdate = () => verifyAccess();
    const handleWindowFocus = () => verifyAccess({ preserveAuthorized: true });
    const handleProfileUpdate = (event) => {
      if (event.detail && !hasAdminShellAccess(event.detail)) {
        requestRef.current?.abort();
        clearAdminRouteCache();
        setAccess({ status: "forbidden", profile: null, message: "" });
      }
    };

    window.addEventListener("joyzone-session-expired", handleSessionExpired);
    window.addEventListener("joyzone-auth-update", handleAuthUpdate);
    window.addEventListener("joyzone-profile-update", handleProfileUpdate);
    window.addEventListener("focus", handleWindowFocus);
    return () => {
      requestRef.current?.abort();
      window.removeEventListener("joyzone-session-expired", handleSessionExpired);
      window.removeEventListener("joyzone-auth-update", handleAuthUpdate);
      window.removeEventListener("joyzone-profile-update", handleProfileUpdate);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [verifyAccess]);

  if (access.status !== "authorized") {
    return <AdminAccessState status={access.status} message={access.message} />;
  }
  return <AdminApp profile={access.profile} />;
}
