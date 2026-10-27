import React from "react";
import { normalizeBooking } from "../../utils/bookingMapper.js";

export const initialProfile = {
  name: "",
  firstName: "",
  lastName: "",
  role: "Joyzone foydalanuvchisi",
  city: "Toshkent",
  birthYear: "",
  languages: "Uzbek, Russian",
  email: "",
  phone: "",
  work: "",
  company: "",
  interests: "",
  about: ""
};

export const profileSections = [
  {
    id: "identity",
    label: "Asosiy",
    title: "Ismingiz",
    description: "Ism va qisqa tavsif profilida ko'rinadi.",
    fields: [
      { key: "firstName", label: "Ism", type: "text", placeholder: "Aziz" },
      { key: "lastName", label: "Familiya", type: "text", placeholder: "Karimov" },
      { key: "role", label: "Qisqa tavsif", type: "text", placeholder: "Founder, product jamoasi" }
    ]
  },
  {
    id: "location",
    label: "Shahar",
    title: "Qayerdasiz",
    description: "Shahar hamkorlar uchun kontekstni tezroq tushunishga yordam beradi.",
    fields: [
      { key: "city", label: "Shahar", type: "text", placeholder: "Toshkent" },
      { key: "birthYear", label: "Tug'ilgan yil", type: "text", placeholder: "1996" }
    ]
  },
  {
    id: "work",
    label: "Ish",
    title: "Siz nima bilan shug'ullanasiz",
    description: "Bu ofis, kovorking yoki zal formatini tanlashga yordam beradi.",
    fields: [
      { key: "work", label: "Ish yoki soha", type: "text", placeholder: "Product jamoasi asoschisi" },
      { key: "company", label: "Kompaniya yoki jamoa", type: "text", placeholder: "Joyzone client" }
    ]
  },
  {
    id: "languages",
    label: "Tillar",
    title: "Qaysi tillarda gaplashasiz",
    description: "Tillarni vergul bilan ajrating.",
    fields: [
      { key: "languages", label: "Tillar", type: "text", placeholder: "Uzbek, Russian, English" }
    ]
  },
  {
    id: "about",
    label: "O'zim haqimda",
    title: "O'zingiz haqingizda ayting",
    description: "Qisqa matn profilni aniqroq va jonliroq qiladi.",
    fields: [
      { key: "about", label: "Tavsif", type: "textarea", placeholder: "Qaysi joylarni odatda izlashingiz haqida..." }
    ]
  },
  {
    id: "interests",
    label: "Qiziqishlar",
    title: "Sizga nima qiziqarli",
    description: "Eng ko'p tanlaydigan joy formatlari.",
    fields: [
      { key: "interests", label: "Qiziqishlar", type: "textarea", placeholder: "Kovorkinglar, workshop zallari..." }
    ]
  },
  {
    id: "contacts",
    label: "Kontaktlar",
    title: "Aloqa ma'lumotlari",
    description: "Arizalar va bronlar bo'yicha muloqot uchun ishlatiladi.",
    fields: [
      { key: "email", label: "Email", type: "email", placeholder: "name@mail.com" },
      { key: "phone", label: "Telefon", type: "tel", placeholder: "+998 90 123 45 67" }
    ]
  }
];

export const BACKEND_PROFILE_DRAFT_KEYS = new Set(["firstName", "lastName", "email", "phone"]);

export const CANCELLABLE_BOOKING_STATUSES = new Set(["pending", "confirmed"]);

export const ACTIVE_BOOKING_STATUSES = new Set(["pending", "confirmed"]);

export const BOOKING_STATUS_LABELS = {
  pending: "Kutilmoqda",
  confirmed: "Tasdiqlangan",
  cancelled: "Bekor qilingan",
  completed: "Yakunlangan",
  blocked: "Yopilgan",
};

export const PAYMENT_STATUS_LABELS = {
  created: "Yaratilgan",
  unpaid: "To'lanmagan",
  test_paid: "Test to'lov qilingan",
  paid: "To'langan",
  failed: "Muvaffaqiyatsiz",
  refunded: "Qaytarilgan",
};

export function ProfileIcon({ type }) {
  const paths = {
    edit: ["M12 20h9", "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"],
    user: ["M20 21a8 8 0 0 0-16 0", "M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z"],
    calendar: ["M7 3v4M17 3v4", "M4 8h16v13H4z", "M8 12h.01M12 12h.01M16 12h.01M8 16h.01"],
    payment: ["M3 6h18v12H3z", "M3 10h18", "M7 15h3"],
    heart: ["M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 1 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z"],
    check: ["m5 13 4 4L19 7"],
    empty: ["M4 5h16v14H4z", "M8 9h8M8 13h5"],
    arrow: ["M5 12h14", "m13 6 6 6-6 6"],
    close: ["M18 6 6 18", "M6 6l12 12"],
    listing: ["M4 5h16v14H4z", "M8 9h8M8 13h8M8 17h4"],
    clock: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", "M12 7v5l3 2"],
    pin: ["M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z", "M12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"],
    globe: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", "M3 12h18", "M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"],
    phone: ["M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"],
    mail: ["M4 5h16v14H4z", "m4 7 8 6 8-6"],
    star: ["m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9Z"]
  };

  // Explicit size: Tailwind's preflight makes unsized SVGs fill their container.
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {(paths[type] || paths.user).map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  );
}

export function EmptyState({ title, text, action, href }) {
  return (
    <div className="profile-empty-state">
      <span><ProfileIcon type="empty" /></span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action ? <a href={href}>{action}<ProfileIcon type="arrow" /></a> : null}
    </div>
  );
}

export function buildProfileBookingView(rawBooking = {}, index = 0) {
  const booking = normalizeBooking(rawBooking, { fallbackId: `profile-booking-${index}` });
  return {
    ...booking,
    title: booking.place_title,
    type: booking.durationLabel || rawBooking.type || "Bron",
    date: rawBooking.date || booking.start_date,
    time: rawBooking.time || booking.time || booking.durationLabel,
    location: rawBooking.location || booking.place_details?.location || "Toshkent",
    status: rawBooking.status || booking.status,
    href: rawBooking.href || `/space-${booking.place_id || booking.place_title}`,
  };
}

export function formatBookingDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("uz-UZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatBookingAmount(booking) {
  return `${new Intl.NumberFormat("uz-UZ").format(Number(booking.amount) || 0)} ${booking.currency || "UZS"}`;
}

export function bookingStatusLabel(status) {
  const value = String(status || "pending").toLowerCase();
  return BOOKING_STATUS_LABELS[value] || value;
}

export function paymentStatusLabel(status) {
  const value = String(status || "unpaid").toLowerCase();
  return PAYMENT_STATUS_LABELS[value] || value;
}

// Colour tone of a status pill: good / warn / bad / muted.
const BOOKING_STATUS_TONES = { pending: "warn", confirmed: "good", cancelled: "bad", completed: "muted", blocked: "muted" };
const PAYMENT_STATUS_TONES = { paid: "good", test_paid: "good", created: "warn", unpaid: "warn", failed: "bad", refunded: "muted" };

export function bookingStatusTone(status) {
  return BOOKING_STATUS_TONES[String(status || "pending").toLowerCase()] || "muted";
}

export function paymentStatusTone(status) {
  return PAYMENT_STATUS_TONES[String(status || "unpaid").toLowerCase()] || "muted";
}

export const PAID_PAYMENT_STATUSES = new Set(["paid", "test_paid"]);

export const DURATION_LABELS_UZ = {
  hourly: "Soatlik bron",
  daily: "Kunlik bron",
  weekly: "Haftalik ijara",
  monthly: "Oylik ijara",
};

const PROVIDER_LABELS = { test: "Test to'lov", click: "Click", payme: "Payme", uzum: "Uzum", cash: "Naqd" };

export function paymentProviderLabel(provider) {
  const value = String(provider || "").toLowerCase();
  return PROVIDER_LABELS[value] || provider || "—";
}

export function formatMoney(value, currency = "UZS") {
  return `${new Intl.NumberFormat("ru-RU").format(Math.round(Number(value) || 0))} ${currency}`;
}

function toDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

const UZ_MONTHS = ["yan", "fev", "mar", "apr", "may", "iyun", "iyul", "avg", "sen", "okt", "noy", "dek"];

export function formatShortDate(value, withYear = false) {
  const date = toDate(value);
  if (!date) return "—";
  const base = `${date.getDate()} ${UZ_MONTHS[date.getMonth()]}`;
  return withYear ? `${base} ${date.getFullYear()}` : base;
}

export function formatClock(value) {
  const date = toDate(value);
  return date ? `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}` : "";
}

// "23 okt · 09:00–19:00" for one day, "10 okt – 12 okt" for longer stays.
export function formatBookingPeriod(booking) {
  const start = toDate(booking.start_time);
  const end = toDate(booking.end_time);
  if (!start) return "—";
  if (!end) return `${formatShortDate(start)} · ${formatClock(start)}`;
  const sameDay = start.toDateString() === new Date(end.getTime() - 1).toDateString();
  if (sameDay) return `${formatShortDate(start)} · ${formatClock(start)}–${formatClock(end)}`;
  return `${formatShortDate(start)} – ${formatShortDate(new Date(end.getTime() - 1))}`;
}

export function normalizeBookingResponse(data) {
  const items = data?.results || data || [];
  return Array.isArray(items)
    ? items.map((booking, index) => normalizeBooking(booking, { fallbackId: `profile-booking-${index}` }))
    : [];
}

export function normalizePaymentResponse(data) {
  const items = data?.results || data || [];
  return Array.isArray(items) ? items : [];
}

export function paymentSubject(payment) {
  if (payment.booking_id) return `Bron: ${payment.booking_title || `#${payment.booking_id}`}`;
  if (payment.tariff_subscription_id) return `Tarif: ${payment.tariff_name || `#${payment.tariff_id || payment.tariff_subscription_id}`}`;
  return "To'lov";
}

export function formatPaymentAmount(payment) {
  return `${new Intl.NumberFormat("uz-UZ").format(Number(payment.amount) || 0)} ${payment.currency || "UZS"}`;
}

export function getCompletion(data) {
  const keys = ["firstName", "lastName", "role", "city", "birthYear", "languages", "email", "phone", "work", "company", "interests", "about"];
  const filled = keys.filter((key) => String(data[key] || "").trim()).length;
  return Math.round((filled / keys.length) * 100);
}
