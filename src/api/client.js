import axios from "axios";
import {
  clearAccountStorage,
  getSessionGeneration,
  getStorageItem,
  hasServerSession,
  isSessionGenerationCurrent,
  setStorageItem,
  STORAGE_KEYS,
} from "../utils/storageKeys.js";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

function positiveEnvNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const API_TIMEOUT_MS = positiveEnvNumber(import.meta.env.VITE_API_TIMEOUT_MS, 15000);
export const API_UPLOAD_TIMEOUT_MS = positiveEnvNumber(import.meta.env.VITE_API_UPLOAD_TIMEOUT_MS, 60000);

export function getAccessToken() {
  try {
    return getStorageItem(STORAGE_KEYS.auth.access);
  } catch (error) {
    return null;
  }
}

export function setAccessToken(token, expectedGeneration = null) {
  if (!token) return false;
  if (expectedGeneration && !isSessionGenerationCurrent(expectedGeneration)) return false;
  try {
    setStorageItem(STORAGE_KEYS.auth.access, token);
    window.dispatchEvent(new Event("joyzone-auth-update"));
    return true;
  } catch (error) {
    return false;
  }
}

export function clearAuthStorage(reason = "session_expired") {
  try {
    clearAccountStorage({ reason });
  } catch (error) {
    // Keep dispatching events even if storage is unavailable.
  }

  window.dispatchEvent(new CustomEvent("joyzone-session-expired", {
    detail: { reason }
  }));
  window.dispatchEvent(new Event("joyzone-auth-update"));
}

export function apiUrl(path) {
  if (!path) return API_BASE_URL;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function flattenErrorData(data, prefix = "") {
  if (!data) return [];
  if (typeof data === "string") return [data];
  if (Array.isArray(data)) return data.flatMap((item) => flattenErrorData(item, prefix));
  if (typeof data === "object") {
    if (typeof data.detail === "string") return [data.detail];
    if (typeof data.error === "string") return [data.error];
    if (typeof data.message === "string") return [data.message];

    return Object.entries(data).flatMap(([key, value]) => {
      const label = prefix ? `${prefix}.${key}` : key;
      return flattenErrorData(value, label).map((message) => (
        label && !["detail", "error", "message", "non_field_errors"].includes(key)
          ? `${label}: ${message}`
          : message
      ));
    });
  }
  return [String(data)];
}

function collectFieldErrors(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};
  return Object.fromEntries(
    Object.entries(data)
      .filter(([key]) => !["detail", "error", "message", "non_field_errors"].includes(key))
      .map(([key, value]) => [key, flattenErrorData(value).filter(Boolean)])
      .filter(([, messages]) => messages.length > 0)
  );
}

export function isRequestCanceled(error) {
  return axios.isCancel(error)
    || error?.code === "ERR_CANCELED"
    || error?.name === "AbortError"
    || error?.name === "CanceledError";
}

export function parseApiError(error, fallback = "API request failed") {
  const status = error?.response?.status;
  const data = error?.response?.data;
  const isCanceled = isRequestCanceled(error);
  const isTimeout = error?.code === "ECONNABORTED" || error?.code === "ETIMEDOUT";
  const isNetworkError = !isCanceled && (error?.code === "ERR_NETWORK" || (!error?.response && !isTimeout));
  const messages = flattenErrorData(data);
  let message = messages.find(Boolean);

  if (!message) {
    if (isCanceled) {
      message = "Запрос отменён.";
    } else if (isNetworkError) {
      message = "Backend недоступен. Проверьте, что Django сервер запущен.";
    } else if (isTimeout) {
      message = "Запрос занял слишком много времени. Попробуйте ещё раз.";
    } else {
      message = error?.message || fallback;
    }
  }

  return {
    message,
    status,
    data,
    code: error?.code,
    fieldErrors: collectFieldErrors(data),
    isCanceled,
    isTimeout,
    isNetworkError,
    isPermissionError: status === 401 || status === 403,
    isValidationError: status === 400 || status === 422,
    isRetryable: !isCanceled && (isNetworkError || isTimeout || status === 408 || status === 429 || status >= 500),
    original: error,
  };
}

export function getApiErrorMessage(error, fallback) {
  return parseApiError(error, fallback).message;
}

export function withUploadTimeout(config = {}) {
  return { ...config, timeout: API_UPLOAD_TIMEOUT_MS };
}

// withCredentials lets the browser keep and send the httpOnly refresh cookie.
const api = axios.create({ baseURL: API_BASE_URL, timeout: API_TIMEOUT_MS, withCredentials: true });
const REFRESH_TIMEOUT_MS = positiveEnvNumber(import.meta.env.VITE_API_REFRESH_TIMEOUT_MS, 10000);
const TERMINAL_REFRESH_STATUSES = new Set([400, 401]);
let refreshRequest = null;

export function createStaleSessionError() {
  const error = new Error("The session changed while the request was in progress.");
  error.code = "JOYZONE_SESSION_CHANGED";
  error.isStaleSession = true;
  return error;
}

export function isStaleSessionError(error) {
  return error?.code === "JOYZONE_SESSION_CHANGED" || error?.isStaleSession === true;
}

export function isTerminalRefreshFailure(error) {
  return TERMINAL_REFRESH_STATUSES.has(error?.response?.status);
}

function dispatchRetryableSessionError(error) {
  const parsed = parseApiError(error);
  window.dispatchEvent(new CustomEvent("joyzone-session-error", {
    detail: {
      reason: "refresh_unavailable",
      retryable: true,
      status: parsed.status || null,
      code: parsed.code || null,
      message: "Не удалось обновить сессию. Проверьте соединение и повторите действие.",
    }
  }));
}

async function refreshAccessToken() {
  if (!hasServerSession()) return null;
  const generation = getSessionGeneration();

  if (refreshRequest?.generation === generation) return refreshRequest.promise;

  const requestState = { generation, promise: null };
  requestState.promise = axios.post(
    apiUrl("/api/auth/token/refresh/"),
    {},
    { timeout: REFRESH_TIMEOUT_MS, withCredentials: true }
  )
    .then((res) => {
      if (!isSessionGenerationCurrent(generation)) throw createStaleSessionError();
      const nextAccess = res.data?.access;
      if (!nextAccess) throw new Error("Refresh response did not include access token.");
      setAccessToken(nextAccess, generation);
      return nextAccess;
    })
    .catch((error) => {
      if (isStaleSessionError(error) || !isSessionGenerationCurrent(generation)) {
        throw createStaleSessionError();
      }
      if (isTerminalRefreshFailure(error)) {
        clearAuthStorage("refresh_invalid");
      } else {
        dispatchRetryableSessionError(error);
      }
      throw error;
    })
    .finally(() => {
      if (refreshRequest === requestState) refreshRequest = null;
    });
  refreshRequest = requestState;
  return requestState.promise;
}

api.interceptors.request.use(
  (config) => {
    const shouldGuardSession = !config.skipAuth || config.sessionGuard;
    if (shouldGuardSession) {
      const requestGeneration = config._joyzoneSessionGeneration;
      if (requestGeneration && !isSessionGenerationCurrent(requestGeneration)) {
        return Promise.reject(createStaleSessionError());
      }
      config._joyzoneSessionGeneration = requestGeneration || getSessionGeneration();
    }

    if (config.skipAuth) return config;

    const token = getAccessToken();
    if (token) {
      config.headers = config.headers || {};
      if (!config.headers.Authorization) config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    const generation = response?.config?._joyzoneSessionGeneration;
    if (generation && !isSessionGenerationCurrent(generation)) {
      return Promise.reject(createStaleSessionError());
    }
    return response;
  },
  async (error) => {
    const originalRequest = error?.config;
    const status = error?.response?.status;
    const requestGeneration = originalRequest?._joyzoneSessionGeneration;

    if (isStaleSessionError(error) || (
      requestGeneration && !isSessionGenerationCurrent(requestGeneration)
    )) {
      return Promise.reject(createStaleSessionError());
    }

    if (
      status !== 401
      || !originalRequest
      || originalRequest.skipAuth
      || originalRequest.skipAuthRefresh
      || originalRequest._joyzoneRetry
      || String(originalRequest.url || "").includes("/api/auth/token/refresh/")
    ) {
      return Promise.reject(error);
    }

    const access = getAccessToken();
    if (!hasServerSession()) {
      if (access) clearAuthStorage("missing_refresh");
      return Promise.reject(error);
    }

    try {
      const nextAccess = await refreshAccessToken();
      if (!nextAccess) {
        clearAuthStorage("refresh_missing_access");
        return Promise.reject(error);
      }

      // A definite 401 can be replayed once. Network/timeout failures never enter here.
      originalRequest._joyzoneRetry = true;
      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${nextAccess}`;
      return api(originalRequest);
    } catch (refreshError) {
      return Promise.reject(refreshError);
    }
  }
);

export async function logoutSession() {
  const access = getAccessToken();
  const hadSession = hasServerSession();
  let revoked = false;

  clearAccountStorage({ reason: "logout" });
  window.dispatchEvent(new CustomEvent("joyzone-session-expired", {
    detail: { reason: "logout" }
  }));
  window.dispatchEvent(new Event("joyzone-auth-update"));

  try {
    if (hadSession && access) {
      await axios.post(
        apiUrl("/api/auth/logout/"),
        {},
        {
          headers: { Authorization: `Bearer ${access}` },
          timeout: REFRESH_TIMEOUT_MS,
          withCredentials: true,
        }
      );
      revoked = true;
    }
  } catch (error) {
    if (!isTerminalRefreshFailure(error)) dispatchRetryableSessionError(error);
    throw error;
  }

  return { revoked };
}

export default api;
