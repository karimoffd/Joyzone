import React from "react";

export function formatMoney(value) {
  return `${new Intl.NumberFormat("uz-UZ").format(value)} so'm`;
}

export const weekdayLabels = ["D", "S", "Ch", "P", "J", "Sh", "Ya"];

export const hourlySlots = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

// "HH:MM[:SS]" -> hour number, or the fallback for missing/invalid values.
// roundUp: 08:30 -> 9 (first full hour after opening); otherwise 20:30 -> 20.
export function parseHour(value, fallback, roundUp = false) {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})/);
  if (!match) return fallback;
  return Number(match[1]) + (roundUp && Number(match[2]) > 0 ? 1 : 0);
}

// Bookable hourly slots that fit fully between opening and closing time.
export function buildHourlySlots(opensAt, closesAt) {
  const start = parseHour(opensAt, 9, true);
  const end = parseHour(closesAt, 18);
  const slots = [];
  for (let hour = Math.floor(start); hour < end; hour += 1) slots.push(`${String(hour).padStart(2, "0")}:00`);
  return slots.length ? slots : hourlySlots;
}

export function formatWorkingHours(opensAt, closesAt) {
  const short = (value, fallback) => (String(value || fallback).slice(0, 5));
  return `${short(opensAt, "09:00")} – ${short(closesAt, "18:00")}`;
}

export function toDateKey(date) {
  return date.toISOString().split("T")[0];
}

export function fromDateKey(dateKey) {
  return new Date(`${dateKey}T00:00:00Z`);
}

export function addDays(dateKey, amount) {
  const date = fromDateKey(dateKey);
  date.setUTCDate(date.getUTCDate() + amount);
  return toDateKey(date);
}

export function addMonths(dateKey, amount) {
  const date = fromDateKey(dateKey);
  date.setUTCMonth(date.getUTCMonth() + amount);
  return toDateKey(date);
}

export function getDefaultBookingDate() {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 3);
  return toDateKey(date);
}

export function getMonthOffset(year, month, offset) {
  const date = new Date(Date.UTC(year, month + offset, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() };
}

export function buildCalendarDays(year, month) {
  const date = new Date(Date.UTC(year, month, 1));
  const daysArr = [];
  let startDay = date.getUTCDay();
  startDay = startDay === 0 ? 6 : startDay - 1;

  for (let i = 0; i < startDay; i++) {
    daysArr.push({ label: "", dateStr: null, isMuted: true });
  }

  const totalDays = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  for (let d = 1; d <= totalDays; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    daysArr.push({ label: d, dateStr, isMuted: false });
  }

  return daysArr;
}

export function buildDateRange(startDate, endDate) {
  if (!startDate) return [];
  const start = fromDateKey(startDate);
  const end = fromDateKey(endDate || startDate);
  const first = start <= end ? start : end;
  const last = start <= end ? end : start;
  const dates = [];
  const current = new Date(first);

  while (current <= last) {
    dates.push(toDateKey(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}

export function getDayDiff(startDate, endDate) {
  if (!startDate || !endDate) return 1;
  const diff = fromDateKey(endDate).getTime() - fromDateKey(startDate).getTime();
  return Math.max(1, Math.round(diff / 86400000) + 1);
}

export function formatShortDate(dateKey) {
  if (!dateKey) return "";
  const date = fromDateKey(dateKey);
  return `${String(date.getUTCDate()).padStart(2, "0")}.${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function formatReviewDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("uz-UZ", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
}

// Demo reviews shown only in development when the API has none.
const reviewList = [
  {
    name: "Dilshod",
    role: "Startup asoschisi",
    date: "May 2026",
    rating: 5,
    text: "Joy toza, yorug' va jamoa bilan sprint o'tkazish uchun juda qulay bo'ldi. Bron qilish jarayoni ham tez."
  },
  {
    name: "Madina",
    role: "HR manager",
    date: "April 2026",
    rating: 5,
    text: "Trening uchun kerakli jihozlar tayyor edi. Mehmonlarni kutib olish va parkovka masalasi yaxshi hal qilingan."
  },
  {
    name: "Aziz",
    role: "Product lead",
    date: "March 2026",
    rating: 4,
    text: "Lokatsiya qulay, internet barqaror. Keyingi safar ham shu joyni bron qilishimiz mumkin."
  }
];

export function normalizeReview(review = {}) {
  const rating = Number(review.rating ?? review.stars ?? 5);
  const name = review.user_name || review.name || review.user?.name || review.user?.username || "Foydalanuvchi";
  return {
    ...review,
    id: review.id || `${name}-${review.created_at || review.date || Math.random()}`,
    name,
    role: review.role || "Joyzone mehmoni",
    date: formatReviewDate(review.created_at || review.date) || "Yaqinda",
    rating: Number.isFinite(rating) ? rating : 5,
    text: review.comment || review.text || ""
  };
}

export function getReviewFallback() {
  return import.meta.env.DEV ? reviewList.map(normalizeReview) : [];
}

export function isBlockingBooking(booking) {
  const status = String(booking?.status || "").toLowerCase();
  return ["booked", "closed", "paid", "pending", "confirmed", "blocked"].includes(status);
}
