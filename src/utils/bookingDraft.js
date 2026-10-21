import { getStorageItem, removeStorageItem, setStorageItem, STORAGE_KEYS } from "./storageKeys.js";

const BOOKING_DRAFT_VERSION = 1;
const BOOKING_DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const DURATION_TYPES = {
  soatlik: "hourly",
  kunlik: "daily",
  haftalik: "weekly",
  oylik: "monthly",
  hourly: "hourly",
  daily: "daily",
  weekly: "weekly",
  monthly: "monthly",
  hour: "hourly",
  day: "daily",
  week: "weekly",
  month: "monthly",
};

function normalizeDurationType(value) {
  return DURATION_TYPES[String(value || "").trim().toLowerCase()] || "daily";
}

function datePart(value) {
  return String(value || new Date().toISOString()).split("T")[0];
}

function slotHour(slot, fallback) {
  const match = String(slot || "").match(/(\d{1,2})(?::(\d{2}))?/);
  if (!match) return fallback;
  const hour = Number(match[1]);
  return Number.isFinite(hour) ? Math.max(0, Math.min(23, hour)) : fallback;
}

function localDateTimeToIso(date, hour, minute = 0) {
  const hh = String(Math.max(0, Math.min(23, Number(hour) || 0))).padStart(2, "0");
  const mm = String(Math.max(0, Math.min(59, Number(minute) || 0))).padStart(2, "0");
  const parsed = new Date(`${datePart(date)}T${hh}:${mm}:00`);
  if (Number.isNaN(parsed.getTime())) throw new Error("Booking date is invalid.");
  return parsed.toISOString();
}

function buildBookingTimes({ durationType, startDate, endDate, slots = [] }) {
  const start = datePart(startDate);
  const end = datePart(endDate || start);

  if (durationType === "hourly") {
    const sortedSlots = [...slots].filter(Boolean).sort();
    if (sortedSlots.length === 0) throw new Error("At least one hourly slot is required.");
    const firstHour = slotHour(sortedSlots[0], 9);
    const lastHour = slotHour(sortedSlots[sortedSlots.length - 1], firstHour);
    return {
      start_time: localDateTimeToIso(start, firstHour),
      end_time: localDateTimeToIso(start, Math.min(lastHour + 1, 23), lastHour >= 23 ? 59 : 0),
    };
  }

  const startTime = localDateTimeToIso(start, 9);
  let endTime = localDateTimeToIso(end, 18);
  if (new Date(endTime).getTime() <= new Date(startTime).getTime()) {
    endTime = new Date(new Date(startTime).getTime() + 60 * 60 * 1000).toISOString();
  }
  return { start_time: startTime, end_time: endTime };
}

function positiveInteger(value, fallback = 1) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function money(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function placeIdFrom(place) {
  if (place && typeof place === "object") return place.id ?? place._id ?? null;
  return place ?? null;
}

function migrateLegacyDraft(raw) {
  if (!raw || typeof raw !== "object") return null;
  const legacyPlace = raw.placeSnapshot || {
    id: raw.place || raw.placeId || raw.spaceId,
    title: raw.spaceTitle,
  };
  const subtotal = money(raw.total ?? raw.amount);
  return createBookingDraft({
    place: legacyPlace,
    selection: {
      duration_type: raw.duration || raw.duration_type,
      startDate: raw.startDate || raw.start_date,
      endDate: raw.endDate || raw.end_date,
      slots: raw.slots || [],
      guests: raw.guests,
      subtotal,
      tax: Math.round(subtotal * 0.12),
      amount: subtotal + Math.round(subtotal * 0.12),
      currency: raw.currency || "UZS",
      note: raw.note || "",
      discount: raw.discount,
      discountName: raw.discountName,
    },
    user: raw.user,
  });
}

export function createBookingDraft({ place, selection = {}, user = null }) {
  const placeId = placeIdFrom(place);
  if (!placeId) throw new Error("Booking place id is missing.");

  const durationType = normalizeDurationType(selection.duration_type || selection.duration);
  const startDate = datePart(selection.startDate || selection.start_date);
  const endDate = datePart(selection.endDate || selection.end_date || startDate);
  const slots = Array.isArray(selection.slots) ? [...selection.slots].sort() : [];
  const times = buildBookingTimes({ durationType, startDate, endDate, slots });
  const subtotal = money(selection.subtotal ?? selection.total ?? selection.amount);
  const tax = money(selection.tax ?? Math.round(subtotal * Number(selection.taxRate || 0)));
  const amount = money(selection.amount ?? subtotal + tax);
  const placeSnapshot = place && typeof place === "object" ? place : { id: placeId };

  return {
    version: BOOKING_DRAFT_VERSION,
    created_at: new Date().toISOString(),
    place: placeId,
    place_title: placeSnapshot.title || placeSnapshot.name || "Joyzone Space",
    place_snapshot: placeSnapshot,
    start_time: times.start_time,
    end_time: times.end_time,
    start_date: startDate,
    end_date: endDate,
    duration_type: durationType,
    slots,
    guests: positiveInteger(selection.guests),
    amount,
    currency: selection.currency || "UZS",
    note: String(selection.note || "").trim(),
    pricing: {
      subtotal,
      tax,
      amount,
      discount: money(selection.discount),
      discount_name: selection.discountName || selection.discount_name || null,
    },
    user: user ? {
      id: user.id ?? null,
      name: user.name || user.full_name || "",
      phone: user.phone || user.phone_number || "",
    } : null,
  };
}

export function serializeBookingDraft(draft) {
  if (!draft || typeof draft !== "object") throw new Error("Booking draft is invalid.");
  return JSON.stringify(draft);
}

export function draftToBookingPayload(draft) {
  if (!draft || typeof draft !== "object") throw new Error("Booking draft is missing.");
  if (!draft.place || !draft.start_time || !draft.end_time) throw new Error("Booking draft is incomplete.");
  if (new Date(draft.end_time).getTime() <= new Date(draft.start_time).getTime()) {
    throw new Error("Booking end time must be after start time.");
  }

  return {
    place: draft.place,
    start_time: draft.start_time,
    end_time: draft.end_time,
    duration_type: normalizeDurationType(draft.duration_type),
    guests: positiveInteger(draft.guests),
    amount: money(draft.amount),
    currency: draft.currency || "UZS",
    note: String(draft.note || "").trim(),
  };
}

export function saveBookingDraft(draft) {
  return setStorageItem(STORAGE_KEYS.booking.draft, serializeBookingDraft(draft));
}

export function loadBookingDraft() {
  const stored = getStorageItem(STORAGE_KEYS.booking.draft);
  if (!stored) return null;
  try {
    const raw = JSON.parse(stored);
    const draft = raw.version === BOOKING_DRAFT_VERSION ? raw : migrateLegacyDraft(raw);
    if (!draft) throw new Error("Booking draft is invalid.");
    const createdAt = new Date(draft.created_at).getTime();
    if (!Number.isFinite(createdAt) || Date.now() - createdAt > BOOKING_DRAFT_MAX_AGE_MS) {
      clearBookingDraft();
      return null;
    }
    draftToBookingPayload(draft);
    return draft;
  } catch (error) {
    clearBookingDraft();
    return null;
  }
}

export function clearBookingDraft() {
  return removeStorageItem(STORAGE_KEYS.booking.draft);
}
