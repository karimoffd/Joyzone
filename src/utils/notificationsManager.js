import api, { getAccessToken } from "../api/client.js";
import { getStorageItem, setStorageItem, STORAGE_KEYS } from "./storageKeys.js";
import { navigate } from "./router.js";

const NOTIFICATIONS_URL = "/api/notifications/";

export function canUseBackendNotifications() {
  return Boolean(getAccessToken());
}

export function normalizeNotification(notification = {}) {
  const type = notification.notification_type || "system";
  const title = notification.title_ru || notification.title_uz || notification.title_en || "Уведомление";
  const message = notification.message_ru || notification.message_uz || notification.message_en || "";
  const date = notification.created_at ? new Date(notification.created_at) : null;

  return {
    ...notification,
    id: notification.id,
    type,
    title,
    message,
    relatedPlaceId: notification.related_place_id,
    relatedBookingId: notification.related_booking_id,
    relatedTariffSubscriptionId: notification.related_tariff_subscription_id,
    isRead: Boolean(notification.is_read),
    time: date && !Number.isNaN(date.getTime())
      ? date.toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
      : "Сейчас",
  };
}

export async function fetchNotifications() {
  if (!canUseBackendNotifications()) return [];
  const response = await api.get(NOTIFICATIONS_URL);
  const data = response.data?.results || response.data || [];
  return Array.isArray(data) ? data.map(normalizeNotification) : [];
}

export async function fetchUnreadNotificationsCount() {
  if (!canUseBackendNotifications()) return 0;
  const response = await api.get(`${NOTIFICATIONS_URL}unread-count/`);
  return Number(response.data?.count || 0);
}

export async function markNotificationRead(id) {
  if (!canUseBackendNotifications() || !id) return null;
  const response = await api.post(`${NOTIFICATIONS_URL}${id}/read/`);
  return response.data;
}

export async function markAllNotificationsRead() {
  if (!canUseBackendNotifications()) return null;
  const response = await api.post(`${NOTIFICATIONS_URL}read-all/`);
  return response.data;
}

export function getNotificationTarget(notification = {}, role = "client") {
  const placeId = notification.relatedPlaceId || notification.related_place_id;
  const type = notification.type || notification.notification_type;
  const isAdmin = role === "admin" || role === "moderator";

  if (type.startsWith("booking_")) {
    if (isAdmin) return { hash: "/admin", adminPage: "bookings" };
    return { hash: role === "partner" ? "/host-today" : "/profile" };
  }

  if (type === "tariff_activated") {
    return { hash: "/host-tariffs" };
  }

  if (type === "place_submitted" && isAdmin) {
    return { hash: "/admin", adminPage: "moderation" };
  }

  if (role === "partner" && type === "place_rejected") {
    return { hash: "/partner", editPlaceId: placeId };
  }

  if (placeId && role === "partner") {
    return { hash: "/host-listings", highlightPlaceId: placeId };
  }

  if (placeId) return { hash: `/space-${placeId}` };
  return null;
}

export function openNotificationTarget(notification = {}) {
  const role = getStorageItem(STORAGE_KEYS.profile.role, "client");
  const target = getNotificationTarget(notification, role);
  if (!target) return;

  if (target.adminPage) {
    setStorageItem(STORAGE_KEYS.workflow.adminPage, target.adminPage);
  }
  if (target.editPlaceId) {
    setStorageItem(STORAGE_KEYS.workflow.editPlaceId, String(target.editPlaceId));
  }
  if (target.highlightPlaceId) {
    setStorageItem(STORAGE_KEYS.workflow.highlightPlaceId, String(target.highlightPlaceId));
  }
  navigate(target.hash);
}
