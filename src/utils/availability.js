import api from "../api/client.js";

const BLOCKING_STATUSES = new Set(["booked", "blocked", "unavailable"]);

function toDateKey(date) {
  return date.toISOString().split("T")[0];
}

export function getCalendarAvailabilityRange(year, month, extraMonths = 0) {
  const start = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(year, month + 1 + extraMonths, 0));
  return {
    date_from: toDateKey(start),
    date_to: toDateKey(end)
  };
}

export async function fetchPlaceAvailability({ placeId, date_from, date_to, skipAuth = true }) {
  if (!placeId) return null;
  const response = await api.get("/api/bookings/availability/", {
    params: { place: placeId, date_from, date_to },
    skipAuth
  });
  return response.data;
}

export function getAvailabilityDay(availability, dateStr) {
  return availability?.days?.[dateStr] || null;
}

export function isAvailabilityDateCovered(availability, dateStr) {
  if (!availability || !dateStr) return false;
  const date = String(dateStr).split("T")[0];
  if (availability.date_from && date < availability.date_from) return false;
  if (availability.date_to && date > availability.date_to) return false;
  return Object.prototype.hasOwnProperty.call(availability.days || {}, date);
}

export function getAvailabilityDayStatus(availability, dateStr) {
  return getAvailabilityDay(availability, dateStr)?.status || "free";
}

export function isAvailabilityStatusBlocked(status) {
  return BLOCKING_STATUSES.has(String(status || "").toLowerCase());
}

export function isAvailabilityDayUnavailable(availability, dateStr, { hourly = false } = {}) {
  const day = getAvailabilityDay(availability, dateStr);
  if (!day || !isAvailabilityStatusBlocked(day.status)) return false;
  return hourly ? Boolean(day.full_day) : true;
}

export function getAvailabilitySlotStatus(availability, dateStr, slot) {
  const day = getAvailabilityDay(availability, dateStr);
  if (!day) return "free";

  if (day.full_day && isAvailabilityStatusBlocked(day.status)) {
    return day.status;
  }

  const slotInfo = day.slots?.[slot];
  if (!slotInfo) return "free";
  return typeof slotInfo === "string" ? slotInfo : slotInfo.status || "booked";
}
