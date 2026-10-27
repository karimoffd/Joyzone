import React, { useEffect } from "react";
import { propertyCards } from "../../data/content.js";
import { getAvailabilityDayStatus } from "../../utils/availability.js";
import { normalizePlace } from "../../utils/placeMapper.js";
import { formatBookingDate, normalizeBooking as normalizeBookingContract } from "../../utils/bookingMapper.js";

export const pageMeta = {
  today: {
    eyebrow: "Рабочий день",
    title: "Сегодня в Joyzone",
    text: "Брони, быстрые задачи и статусы пространств на ближайшие часы."
  },
  calendar: {
    eyebrow: "График и цены",
    title: "Управляйте доступностью",
    text: "Меняйте цены, скидки и свободные дни без лишних переходов."
  },
  listings: {
    eyebrow: "Портфель пространств",
    title: "Ваши места",
    text: "Следите за статусом объявлений и быстро добавляйте новые пространства."
  },
  messages: {
    eyebrow: "Диалоги",
    title: "Сообщения резидентов",
    text: "Отвечайте командам, уточняйте детали брони и держите историю рядом."
  },
  tariffs: {
    eyebrow: "Платформа",
    title: "Тарифные планы",
    text: "Выберите тарифный план для увеличения лимитов объявлений и доступа к premium-функциям."
  }
};

export const navIndex = {
  today: 0,
  calendar: 1,
  listings: 2,
  messages: 3,
  tariffs: 4
};

export const FALLBACK_TODAY_BOOKINGS = [
  {
    space: "Atlas Meeting Room",
    company: "Nova Labs",
    time: "10:00 - 14:00",
    status: "Заезд через 45 мин",
    guests: "8 человек",
    note: "Нужен HDMI и маркерная доска"
  },
  {
    space: "Quiet Work Studio",
    company: "Bridge Team",
    time: "16:30 - 19:00",
    status: "Подтверждено",
    guests: "4 человека",
    note: "Гость попросил тихую зону"
  }
];

export const FALLBACK_UPCOMING_BOOKINGS = [
  { date: "4 июня", title: "Focus Hub Coworking", type: "Дневной доступ" },
  { date: "6 июня", title: "Blue Line Office", type: "Просмотр офиса" },
  { date: "9 июня", title: "Orange Desk Office", type: "Месячная аренда" }
];

export const FALLBACK_DISCOUNTS = [
  { label: "Первые 3 брони", value: "20%", active: true },
  { label: "От 3 месяцев", value: "10%", active: true },
  { label: "Нерабочие часы", value: "7%", active: false }
];

export function buildHostCalendarDays(year, month, availability, priceLabel = "") {
  const days = [];
  const firstDate = new Date(Date.UTC(year, month, 1));
  let startDay = firstDate.getUTCDay();
  startDay = startDay === 0 ? 6 : startDay - 1;

  for (let i = 0; i < startDay; i += 1) {
    days.push({ label: "", status: "free", discount: false, price: "", isMuted: true });
  }

  const totalDays = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  for (let day = 1; day <= totalDays; day += 1) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const status = getAvailabilityDayStatus(availability, dateStr);
    days.push({
      label: day,
      dateStr,
      status,
      discount: false,
      price: priceLabel
    });
  }

  return days;
}

export function formatCalendarMonthTitle(year, month) {
  return new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" })
    .format(new Date(Date.UTC(year, month, 1)));
}

export function formatMoneyShort(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return "0";
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(amount >= 10000000 ? 0 : 1)}M`;
  if (amount >= 1000) return `${Math.round(amount / 1000)}k`;
  return String(Math.round(amount));
}

export function buildHostListingView(place = {}, index = 0) {
  const normalized = normalizePlace(place, { index, fallbackId: `fallback-place-${index}` });
  return {
    ...normalized,
    occupancy: place.occupancy || "0%",
  };
}

export function buildHostBookingView(booking = {}, listingsById = new Map()) {
  const normalized = normalizeBookingContract(booking, { listingsById });
  return {
    ...normalized,
    date: formatBookingDate(normalized.start_time || normalized.start_date),
    statusLabel: normalized.status === "confirmed"
      ? "Подтверждено"
      : normalized.status === "completed"
        ? "Завершено"
        : normalized.status === "blocked"
          ? "Закрыто владельцем"
          : normalized.status === "cancelled"
            ? "Отменено"
            : "Ожидает подтверждения",
    guests: `${normalized.guests || 1} человек`,
    note: normalized.note || "Без заметки",
  };
}

export function filterPartnerChats(chats = [], listings = [], partnerId = null) {
  const placeIds = new Set(
    listings
      .map((item) => item.id || item._id)
      .filter((id) => id !== null && id !== undefined)
      .map(String)
  );
  const titles = new Set(
    listings
      .map((item) => String(item.title || item.name || "").trim().toLowerCase())
      .filter(Boolean)
  );
  return chats.filter((chat) => {
    const hostMatches = partnerId !== null
      && partnerId !== undefined
      && String(chat.hostId || chat.host_id || "") === String(partnerId);
    const placeMatches = placeIds.has(String(chat.placeId || chat.place_id || chat.space_id || ""));
    if (hostMatches || placeMatches) return true;

    if (!import.meta.env.DEV || titles.size === 0) return false;
    // Legacy title matching is only for local DEV chat fixtures without relational ids.
    const chatSpace = String(chat.spaceTitle || chat.space_title || chat.space || "").trim().toLowerCase();
    return titles.has(chatSpace);
  });
}

export const FALLBACK_HOST_LISTINGS = propertyCards.slice(0, 4).map((item, index) => ({
  ...item,
  status: index === 1 ? "Нужно обновить цену" : index === 2 ? "Черновик" : "Опубликовано",
  bookings: [12, 8, 0, 5][index],
  score: ["98%", "91%", "64%", "87%"][index]
}));

export function DashboardIcon({ type }) {
  const paths = {
    calendar: ["M7 3v4M17 3v4", "M4 8h16v13H4z", "M8 12h8M8 16h5"],
    clock: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z", "M12 6v6l4 2"],
    listing: ["M4 5h16v14H4z", "M8 9h8M8 13h8M8 17h4"],
    message: ["M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"],
    price: ["M12 2v20", "M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6"],
    check: ["m5 13 4 4L19 7"],
    plus: ["M12 5v14M5 12h14"],
    arrow: ["M5 12h14", "m13 6 6 6-6 6"],
    chevronLeft: ["m15 18-6-6 6-6"],
    chevronRight: ["m9 18 6-6-6-6"],
    close: ["M18 6 6 18", "M6 6l12 12"],
    empty: ["M5 5h14v14H5z", "M9 9h6M9 13h4"]
  };

  return (
    // Explicit size: Tailwind's preflight makes unsized SVGs fill their container.
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {(paths[type] || paths.listing).map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  );
}

export function DashboardHero({ page, profile }) {
  const meta = pageMeta[page] || pageMeta.today;
  const rawTariff = profile?.tariff_details?.slug || "";
  const tariffName = profile?.tariff_details 
    ? (profile.tariff_details.name_ru || profile.tariff_details.name) 
    : "Standard";
    
  let badgeClass = "host-tariff-badge host-tariff-badge--standard";
  if (rawTariff === "premium") {
    badgeClass = "host-tariff-badge host-tariff-badge--premium";
  } else if (rawTariff === "comfort") {
    badgeClass = "host-tariff-badge host-tariff-badge--comfort";
  }

  return (
    <section className="host-dashboard-hero">
      <div>
        <span>{meta.eyebrow}</span>
        <h1>{meta.title}</h1>
        <p>{meta.text}</p>
      </div>
      <div className="host-dashboard-status">
        <div className="host-dashboard-status-title">
          <strong>Joyzone host</strong>
          <span className={badgeClass}>{tariffName}</span>
        </div>
        <small>Активность кабинета: высокая</small>
      </div>
    </section>
  );
}

export function EmptyPanel({ title, text, action, href }) {
  return (
    <div className="host-empty-panel">
      <span><DashboardIcon type="empty" /></span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action ? <a href={href}>{action}<DashboardIcon type="arrow" /></a> : null}
    </div>
  );
}

export function DashboardToast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`dash-toast ${type}`} style={{
      position: "fixed", top: 24, right: 24, zIndex: 1001,
      padding: "14px 24px", borderRadius: 14, background: type === "success" ? "#22c55e" : "#ef4444",
      color: "#fff", fontWeight: 600, boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
      fontFamily: "'Inter', sans-serif", fontSize: 14,
      animation: "toastFadeIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards"
    }}>
      {message}
    </div>
  );
}
