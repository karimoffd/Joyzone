import React, { useMemo, useState, useEffect, useRef, useCallback, useContext } from "react";
import { createPortal } from "react-dom";
import api, { getAccessToken, getApiErrorMessage } from "../api/client.js";
import { LanguageContext } from "../context/LanguageContext.jsx";

import { Header as JoyNavbar } from "./HomeHero.jsx";
import { SimpleFooter, PropertyCard } from "./ListingsSection.jsx";
import { HostListingDetailModal } from "./HostListingDetailModal.jsx";
import { getMessageSender, getStoredChats, markChatRead, sendMessageToChat, syncChatsWithBackend } from "../utils/chatManager.js";
import { propertyCards } from "../data/content.js";
import {
  fetchPlaceAvailability,
  getAvailabilityDay,
  getAvailabilityDayStatus,
  getAvailabilitySlotStatus,
  getCalendarAvailabilityRange
} from "../utils/availability.js";
import { parseMoneyValue } from "../utils/placePricing.js";
import { normalizePlace } from "../utils/placeMapper.js";
import { formatBookingDate, normalizeBooking as normalizeBookingContract } from "../utils/bookingMapper.js";
import { buildPartnerStats, selectTodayBookings, selectUpcomingBookings } from "../utils/partnerDashboard.js";
import { buildBlockedBookingPayload, isDateInSelectedRange, selectCalendarDate } from "../utils/partnerCalendar.js";
import { removeStorageItem, setStorageItem, STORAGE_KEYS } from "../utils/storageKeys.js";
import { cacheProfile } from "../utils/profileMapper.js";
import PaymentModal from "./PaymentModal.jsx";
import "./HostDashboard.css";

const pageMeta = {
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

const navIndex = {
  today: 0,
  calendar: 1,
  listings: 2,
  messages: 3,
  tariffs: 4
};

const FALLBACK_TODAY_BOOKINGS = [
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

const FALLBACK_UPCOMING_BOOKINGS = [
  { date: "4 июня", title: "Focus Hub Coworking", type: "Дневной доступ" },
  { date: "6 июня", title: "Blue Line Office", type: "Просмотр офиса" },
  { date: "9 июня", title: "Orange Desk Office", type: "Месячная аренда" }
];

const FALLBACK_DISCOUNTS = [
  { label: "Первые 3 брони", value: "20%", active: true },
  { label: "От 3 месяцев", value: "10%", active: true },
  { label: "Нерабочие часы", value: "7%", active: false }
];

function buildHostCalendarDays(year, month, availability, priceLabel = "") {
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

function formatCalendarMonthTitle(year, month) {
  return new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" })
    .format(new Date(Date.UTC(year, month, 1)));
}

function formatMoneyShort(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return "0";
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(amount >= 10000000 ? 0 : 1)}M`;
  if (amount >= 1000) return `${Math.round(amount / 1000)}k`;
  return String(Math.round(amount));
}

function buildHostListingView(place = {}, index = 0) {
  const normalized = normalizePlace(place, { index, fallbackId: `fallback-place-${index}` });
  return {
    ...normalized,
    occupancy: place.occupancy || "0%",
  };
}

function buildHostBookingView(booking = {}, listingsById = new Map()) {
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

function filterPartnerChats(chats = [], listings = [], partnerId = null) {
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

const FALLBACK_HOST_LISTINGS = propertyCards.slice(0, 4).map((item, index) => ({
  ...item,
  status: index === 1 ? "Нужно обновить цену" : index === 2 ? "Черновик" : "Опубликовано",
  bookings: [12, 8, 0, 5][index],
  score: ["98%", "91%", "64%", "87%"][index]
}));

function DashboardIcon({ type }) {
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
    empty: ["M5 5h14v14H5z", "M9 9h6M9 13h4"]
  };

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {(paths[type] || paths.listing).map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  );
}

function DashboardHero({ page, profile }) {
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

function EmptyPanel({ title, text, action, href }) {
  return (
    <div className="host-empty-panel">
      <span><DashboardIcon type="empty" /></span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action ? <a href={href}>{action}<DashboardIcon type="arrow" /></a> : null}
    </div>
  );
}

function TodayPage({ todayBookings = [], upcomingBookings = [], stats, usingFallback = false }) {
  const hasBookings = todayBookings.length > 0;
  const statCards = [
    { label: "Активные места", value: stats.activeListings, icon: "listing" },
    { label: "Места на модерации", value: stats.pendingPlaces, icon: "clock" },
    { label: "Отклонённые места", value: stats.rejectedPlaces, icon: "empty" },
    { label: "Ожидающие брони", value: stats.pendingBookings, icon: "clock" },
    { label: "Подтверждённые брони", value: stats.confirmedBookings, icon: "check" },
    { label: "Завершённые брони", value: stats.completedBookings, icon: "check" },
    { label: "Закрытые слоты", value: stats.blockedSlots, icon: "calendar" },
    { label: "Доход", value: `${formatMoneyShort(stats.approximateRevenue)} UZS`, icon: "price" },
  ];

  return (
    <div className="host-page-grid host-page-grid-today">
      <section className="host-main-surface">
        <div className="host-section-head">
          <div>
            <span>{usingFallback ? "Сегодня · DEV fallback" : "Сегодня"}</span>
            <h2>{hasBookings ? `У вас ${todayBookings.length} бронирования` : "Сегодня бронирований нет"}</h2>
          </div>
          <a href="#host-calendar">Предстоящие<DashboardIcon type="arrow" /></a>
        </div>

        {hasBookings ? (
          <div className="host-booking-list">
            {todayBookings.map((booking) => (
              <article data-testid={`host-booking-${booking.id}`} className="host-booking-card" key={booking.id || `${booking.space}-${booking.time}`}>
                <div className="host-booking-time">
                  <DashboardIcon type="clock" />
                  <strong>{booking.time}</strong>
                </div>
                <div>
                  <span>{booking.statusLabel || booking.status}</span>
                  <h3>{booking.space}</h3>
                  <p>{booking.company} · {booking.guests}</p>
                </div>
                <p>{booking.note}</p>
              </article>
            ))}
          </div>
        ) : (
          <EmptyPanel title="Броней на сегодня нет" text="Можно проверить календарь или открыть свободные слоты для быстрых заявок." action="Открыть график" href="#host-calendar" />
        )}
      </section>

      <aside className="host-side-surface">
        <div className="host-section-head compact">
          <div>
            <span>Ближайшее</span>
            <h2>Предстоящие</h2>
          </div>
        </div>
        <div className="host-upcoming-list" style={{ marginBottom: 18 }}>
          {statCards.map((item) => (
            <article key={item.label}>
              <span><DashboardIcon type={item.icon} /></span>
              <strong>{item.value}</strong>
              <small>{item.label}</small>
            </article>
          ))}
        </div>
        <div className="host-upcoming-list">
          {upcomingBookings.length > 0 ? (
            upcomingBookings.map((booking) => (
              <article data-testid={`host-upcoming-booking-${booking.id}`} key={booking.id || `${booking.title}-${booking.date}`}>
                <span>{booking.date}</span>
                <strong>{booking.title}</strong>
                <small>{booking.type}</small>
              </article>
            ))
          ) : (
            <article>
              <span>Нет</span>
              <strong>Ближайших броней нет</strong>
              <small>Новые заявки появятся здесь</small>
            </article>
          )}
        </div>
      </aside>
    </div>
  );
}

function CalendarPage({ listings = [], usingFallback = false, onBookingCreated }) {
  const displayListings = useMemo(
    () => listings.length > 0 ? listings : (usingFallback && import.meta.env.DEV ? FALLBACK_HOST_LISTINGS : []),
    [listings, usingFallback],
  );
  const [activeSpace, setActiveSpace] = useState(displayListings[0] || null);
  const [price, setPrice] = useState("320000");
  const [period, setPeriod] = useState("за день");
  const [activeDiscounts, setActiveDiscounts] = useState(() => (
    import.meta.env.DEV
      ? FALLBACK_DISCOUNTS.reduce((acc, item) => ({ ...acc, [item.label]: item.active }), {})
      : {}
  ));
  const today = useMemo(() => new Date(), []);
  const [calendarYear, setCalendarYear] = useState(() => today.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(() => today.getMonth());
  const [availability, setAvailability] = useState(null);
  const [calendarError, setCalendarError] = useState("");
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [selection, setSelection] = useState({ startDate: "", endDate: "" });
  const [blockMode, setBlockMode] = useState("daily");
  const [blockStartTime, setBlockStartTime] = useState("09:00");
  const [blockEndTime, setBlockEndTime] = useState("18:00");
  const [blockNote, setBlockNote] = useState("");
  const [blocking, setBlocking] = useState(false);
  const [calendarNotice, setCalendarNotice] = useState("");
  
  useEffect(() => {
    if (displayListings.length === 0) {
      if (activeSpace) setActiveSpace(null);
      return;
    }
    if (displayListings.length > 0 && (!activeSpace || !displayListings.some(l => l.id === activeSpace.id))) {
      setActiveSpace(displayListings[0]);
    }
  }, [displayListings, activeSpace]);

  const activeSpaceId = activeSpace?.id || activeSpace?._id;

  const loadAvailability = useCallback(async () => {
    if (!activeSpaceId) {
      setAvailability(null);
      return;
    }
    setAvailabilityLoading(true);
    const range = getCalendarAvailabilityRange(calendarYear, calendarMonth);
    try {
      const data = await fetchPlaceAvailability({ placeId: activeSpaceId, ...range, skipAuth: false });
      setAvailability(data);
      setCalendarError("");
    } catch (err) {
      setCalendarError(getApiErrorMessage(err, "Не удалось загрузить календарь доступности"));
      setAvailability(null);
    } finally {
      setAvailabilityLoading(false);
    }
  }, [activeSpaceId, calendarYear, calendarMonth]);

  useEffect(() => {
    loadAvailability();
  }, [loadAvailability]);

  useEffect(() => {
    setSelection({ startDate: "", endDate: "" });
    setCalendarNotice("");
  }, [activeSpaceId, calendarYear, calendarMonth]);

  const changeMonth = (offset) => {
    const nextMonth = new Date(calendarYear, calendarMonth + offset, 1);
    setCalendarYear(nextMonth.getFullYear());
    setCalendarMonth(nextMonth.getMonth());
  };

  const handleDayClick = (dateStr) => {
    if (!dateStr) return;
    setSelection((current) => {
      const next = selectCalendarDate(current.startDate, current.endDate, dateStr);
      if (next.startDate !== next.endDate) setBlockMode("daily");
      return next;
    });
    setCalendarError("");
    setCalendarNotice("");
  };

  const handleCreateBlock = async () => {
    if (usingFallback) {
      setCalendarError("Блокировка недоступна для DEV fallback объекта.");
      return;
    }

    let payload;
    try {
      payload = buildBlockedBookingPayload({
        placeId: activeSpaceId,
        startDate: selection.startDate,
        endDate: selection.endDate,
        mode: blockMode,
        startTime: blockStartTime,
        endTime: blockEndTime,
        note: blockNote,
      });
    } catch (error) {
      setCalendarError(error.message);
      return;
    }

    setBlocking(true);
    setCalendarError("");
    setCalendarNotice("");
    try {
      await api.post("/api/bookings/", payload);
      await loadAvailability();
      await onBookingCreated?.();
      setCalendarNotice("Период закрыт для бронирования.");
      setSelection({ startDate: "", endDate: "" });
      setBlockNote("");
    } catch (error) {
      const hasOverlap = Boolean(error.response?.data?.non_field_errors);
      setCalendarError(hasOverlap
        ? "Выбранный день или время уже заняты. Выберите свободный период."
        : getApiErrorMessage(error, "Не удалось закрыть выбранный период."));
    } finally {
      setBlocking(false);
    }
  };

  // Parse base price from active space if it exists, otherwise fallback
  const currentBasePrice = useMemo(() => {
    if (activeSpace) {
      const parsedPrice = parseMoneyValue(activeSpace.priceValue || activeSpace.price_daily || activeSpace.price);
      if (parsedPrice !== null) return String(Math.round(parsedPrice));
    }
    return price;
  }, [activeSpace, price]);

  const formattedPrice = useMemo(() => Number(currentBasePrice || 0).toLocaleString("ru-RU"), [currentBasePrice]);
  const dayPriceLabel = useMemo(() => `${formatMoneyShort(currentBasePrice)} сум`, [currentBasePrice]);
  const calendarDays = useMemo(
    () => buildHostCalendarDays(calendarYear, calendarMonth, availability, dayPriceLabel),
    [calendarYear, calendarMonth, availability, dayPriceLabel]
  );
  const selectedDayAvailability = getAvailabilityDay(availability, selection.startDate);
  const hourlySlots = useMemo(() => (
    Array.from({ length: 24 }, (_, hour) => {
      const label = `${String(hour).padStart(2, "0")}:00`;
      return { label, status: getAvailabilitySlotStatus(availability, selection.startDate, label) };
    })
  ), [availability, selection.startDate]);

  return (
    <div className="host-calendar-page-container">
      {/* Top: Spaces List */}
      <div className="host-spaces-top-bar" style={{ marginBottom: "28px" }}>
        <div className="host-section-head compact" style={{ marginBottom: "16px" }}>
          <div>
            <span>{usingFallback ? "Объекты · DEV fallback" : "Объекты"}</span>
            <h2>Выберите место</h2>
          </div>
        </div>
        <div className="host-spaces-list-horizontal">
          {displayListings.length > 0 ? displayListings.map((space) => {
            const isActive = activeSpace && (activeSpace.id === space.id || activeSpace.title === space.title);
            return (
              <button 
                key={space.id || space.title} 
                className={`space-card-widget-horizontal ${isActive ? "is-active" : ""}`}
                onClick={() => setActiveSpace(space)}
                type="button"
              >
                <div className="space-widget-img-horizontal">
                  <img src={space.images?.[0] || "/placeholder-space.jpg"} alt={space.title} />
                </div>
                <div className="space-widget-info">
                  <strong>{space.title}</strong>
                  <small>{space.location}</small>
                  <span>{space.price || "0 UZS"}</span>
                </div>
              </button>
            );
          }) : (
            <EmptyPanel title="Нет мест для календаря" text="Добавьте или дождитесь модерации места, чтобы управлять доступностью." action="Добавить место" href="#partner" />
          )}
        </div>
      </div>

      <div className="host-calendar-layout">
        {/* Left Column: Price and Discount Panel */}
        <aside className="host-price-panel">
          <span>Базовая цена ({activeSpace?.title || "Место"})</span>
          <label className="host-price-input">
            <input value={currentBasePrice} onChange={(event) => setPrice(event.target.value.replace(/\D/g, "").slice(0, 8))} inputMode="numeric" aria-label="Базовая цена" />
            <small>сум</small>
          </label>
          <p>{formattedPrice} сум {period}</p>

          <div className="host-period-group" aria-label="Период цены">
            {["за час", "за день", "за месяц"].map((item) => (
              <button key={item} type="button" className={period === item ? "is-active" : ""} onClick={() => setPeriod(item)}>
                {item}
              </button>
            ))}
          </div>

          <div className="host-discount-stack">
            <h3>Скидки и надбавки</h3>
            {(import.meta.env.DEV && usingFallback ? FALLBACK_DISCOUNTS : []).map((item) => (
              <button
                key={item.label}
                type="button"
                className={activeDiscounts[item.label] ? "is-active" : ""}
                onClick={() => setActiveDiscounts((current) => ({ ...current, [item.label]: !current[item.label] }))}
              >
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </button>
            ))}
            {!usingFallback ? <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>Скидки управляются через backend и применяются на странице места.</p> : null}
          </div>
        </aside>

        {/* Right Column: Calendar Panel */}
        <section className="host-calendar-panel">
          <div className="host-calendar-top">
            <div>
              <span>{formatCalendarMonthTitle(calendarYear, calendarMonth)}</span>
              <h2>{activeSpace?.title || "Место"}</h2>
              {availabilityLoading ? <small style={{ color: "#64748b", fontWeight: 700 }}>Обновление календаря...</small> : null}
              {calendarError ? <small style={{ color: "#dc2626", fontWeight: 800 }}>{calendarError}</small> : null}
              {calendarNotice ? <small style={{ color: "#15803d", fontWeight: 800 }}>{calendarNotice}</small> : null}
            </div>
            <div className="host-calendar-actions">
              <div className="host-calendar-month-nav">
                <button type="button" onClick={() => changeMonth(-1)} aria-label="Предыдущий месяц"><DashboardIcon type="chevronLeft" /></button>
                <button type="button" onClick={() => changeMonth(1)} aria-label="Следующий месяц"><DashboardIcon type="chevronRight" /></button>
              </div>
              <div className="host-calendar-legend">
                <span><i className="free" />Свободно</span>
                <span><i className="booked" />Бронь</span>
                <span><i className="blocked" />Закрыто</span>
              </div>
            </div>
          </div>

          <div className="host-calendar-weekdays">
            {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="host-calendar-grid">
            {calendarDays.map((day, index) => {
              const isSelected = isDateInSelectedRange(day.dateStr, selection.startDate, selection.endDate);
              const statusText = day.status === "booked"
                ? "Забронировано"
                : day.status === "blocked"
                  ? "Закрыто"
                  : day.price;
              return (
              <button
                key={`${day.label}-${index}`}
                type="button"
                className={`host-day ${day.status} ${day.discount ? "has-discount" : ""} ${day.label ? "" : "is-muted"} ${isSelected ? "is-selected" : ""}`}
                disabled={!day.label || availabilityLoading}
                onClick={() => handleDayClick(day.dateStr)}
                title={day.label ? statusText : undefined}
              >
                <strong>{day.label}</strong>
                {day.label ? <small>{statusText}</small> : null}
                {day.discount ? <em>-10%</em> : null}
              </button>
              );
            })}
          </div>

          {selection.startDate ? (
            <div className="host-calendar-block-editor">
              <div className="host-calendar-block-head">
                <div>
                  <span>Выбранный период</span>
                  <strong>
                    {selection.startDate === selection.endDate
                      ? selection.startDate
                      : `${selection.startDate} — ${selection.endDate}`}
                  </strong>
                </div>
                <button type="button" onClick={() => setSelection({ startDate: "", endDate: "" })} aria-label="Сбросить выбранный период">×</button>
              </div>

              {selection.startDate === selection.endDate ? (
                <div className="host-calendar-slots" aria-label={`Слоты на ${selection.startDate}`}>
                  {hourlySlots.map((slot) => (
                    <span key={slot.label} className={slot.status} title={`${slot.label}: ${slot.status}`}>
                      {slot.label}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="host-calendar-block-controls">
                <div className="host-period-group" aria-label="Тип блокировки">
                  <button type="button" className={blockMode === "daily" ? "is-active" : ""} onClick={() => setBlockMode("daily")}>Целый день</button>
                  <button
                    type="button"
                    className={blockMode === "hourly" ? "is-active" : ""}
                    disabled={selection.startDate !== selection.endDate}
                    onClick={() => setBlockMode("hourly")}
                  >
                    По часам
                  </button>
                </div>

                {blockMode === "hourly" && selection.startDate === selection.endDate ? (
                  <div className="host-calendar-time-range">
                    <label>С <input type="time" value={blockStartTime} onChange={(event) => setBlockStartTime(event.target.value)} /></label>
                    <label>До <input type="time" value={blockEndTime} onChange={(event) => setBlockEndTime(event.target.value)} /></label>
                  </div>
                ) : null}

                <label className="host-calendar-note">
                  <span>Причина или заметка</span>
                  <input value={blockNote} onChange={(event) => setBlockNote(event.target.value)} placeholder="Например: технические работы" />
                </label>

                <button
                  type="button"
                  className="host-calendar-block-submit"
                  disabled={blocking || availabilityLoading || usingFallback || !activeSpaceId}
                  onClick={handleCreateBlock}
                >
                  {blocking ? "Сохраняем..." : "Закрыть выбранный период"}
                </button>
              </div>

              {selectedDayAvailability?.bookings?.length ? (
                <small className="host-calendar-existing-count">
                  В выбранный день занятых интервалов: {selectedDayAvailability.bookings.length}
                </small>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function ListingsPage({ listings = [], onEdit, onDelete }) {
  const [selectedListing, setSelectedListing] = useState(null);

  return (
    <section className="host-main-surface">
      <div className="host-section-head">
        <div>
          <span>Объявления</span>
          <h2>Мои места</h2>
        </div>
        <a href="#partner" onClick={() => removeStorageItem(STORAGE_KEYS.workflow.editPlaceId)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Добавить место
        </a>
      </div>

      <div className="host-listings-grid">
        {listings.length === 0 ? (
          <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "60px 20px", color: "#64748b", background: "#f8fafc", borderRadius: 20, border: "1.5px dashed #e2e8f0" }}>
            <h3 style={{ margin: "0 0 8px 0", color: "#111820", fontSize: 18 }}>У вас пока нет объявлений</h3>
            <p style={{ margin: "0 0 20px 0", fontSize: 14 }}>Добавьте ваше первое пространство, чтобы начать принимать бронирования.</p>
            <a href="#partner" className="host-alert-btn confirm" style={{ display: "inline-block", textDecoration: "none", width: "auto", background: "var(--orange)", color: "#fff", padding: "10px 24px", borderRadius: 12, fontWeight: 700 }} onClick={() => removeStorageItem(STORAGE_KEYS.workflow.editPlaceId)}>Добавить место</a>
          </div>
        ) : (
          listings.map((item, index) => (
            <article className="host-listing-shell" key={item.id || item.title}>
              <PropertyCard
                item={{
                  ...item,
                  price: item.price || "0 UZS"
                }}
                index={index}
                onClick={() => setSelectedListing(item)}
              />
              <div className="host-listing-meta">
                <span className={item.status === "approved" ? "is-live" : ""}>
                  {item.status === "approved" ? "Опубликовано" : item.status === "rejected" ? "Отклонено" : "Модерация"}
                </span>
                {item.status === "rejected" && item.moderator_note ? (
                  <div className="host-listing-moderation-note">
                    <strong>Причина отклонения</strong>
                    <p>{item.moderator_note}</p>
                  </div>
                ) : null}
                <div className="host-card-actions">
                  <button onClick={() => onEdit(item)} className="host-card-act-btn edit" title="Редактировать">✏️</button>
                  <button onClick={() => onDelete(item)} className="host-card-act-btn delete" title="Удалить">🗑️</button>
                </div>
                <strong>{item.bookings_count || 0} броней</strong>
                <small>Заполненность {item.occupancy || "0%"}</small>
              </div>
            </article>
          ))
        )}
      </div>

      {selectedListing && (
        <HostListingDetailModal
          item={selectedListing}
          onClose={() => setSelectedListing(null)}
          onEdit={onEdit}
        />
      )}
    </section>
  );
}

function MessagesPage({ listings = [], partnerId = null }) {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [draft, setDraft] = useState("");
  const [messageError, setMessageError] = useState("");
  const [usingOfflineFallback, setUsingOfflineFallback] = useState(false);
  const [inboxLoading, setInboxLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  
  const refreshChats = useCallback(async () => {
    try {
      const backendChats = await syncChatsWithBackend({ silent: true, allowDevFallback: false });
      setChats(filterPartnerChats(backendChats, listings, partnerId));
      setUsingOfflineFallback(false);
      setMessageError("");
    } catch (err) {
      setMessageError(getApiErrorMessage(err, "Не удалось загрузить inbox"));
      // Dev fallback keeps the partner inbox inspectable while the REST chat API is unavailable.
      setChats(import.meta.env.DEV ? filterPartnerChats(getStoredChats(), listings, partnerId) : []);
      setUsingOfflineFallback(import.meta.env.DEV);
    } finally {
      setInboxLoading(false);
    }
  }, [listings, partnerId]);

  useEffect(() => {
    refreshChats();
    const poll = setInterval(refreshChats, 7000);
    return () => {
      clearInterval(poll);
    };
  }, [refreshChats]);

  const activeChat = chats.find((chat) => chat.id === selectedChat);

  useEffect(() => {
    if (selectedChat && !activeChat) {
      setSelectedChat(null);
    }
  }, [activeChat, selectedChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages]);

  const handleSelectChat = async (chat) => {
    setSelectedChat(chat.id);
    if (!chat.unread || usingOfflineFallback) return;
    try {
      const updated = await markChatRead(chat.threadId || chat.id, { allowDevFallback: false });
      if (updated) {
        setChats((current) => current.map((item) => String(item.id) === String(updated.id) ? updated : item));
      }
      setMessageError("");
    } catch (err) {
      setMessageError(getApiErrorMessage(err, "Не удалось отметить чат прочитанным"));
    }
  };

  const handleSend = async () => {
    if (!draft.trim() || !selectedChat || sending) return;
    setSending(true);
    try {
      await sendMessageToChat(selectedChat, { from: "host", text: draft }, { allowDevFallback: false });
      setDraft("");
      setMessageError("");
      await refreshChats();
    } catch (err) {
      setMessageError(getApiErrorMessage(err, "Не удалось отправить сообщение"));
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (selectedChat && window.innerWidth <= 980) {
      document.body.classList.add("chat-fullscreen-open");
    } else {
      document.body.classList.remove("chat-fullscreen-open");
    }
    return () => document.body.classList.remove("chat-fullscreen-open");
  }, [selectedChat]);

  return (
    <section className={`host-messages-layout ${selectedChat ? "chat-open" : ""}`}>
      <aside className="host-inbox-panel">
        <div className="host-section-head compact">
          <div>
            <span>{usingOfflineFallback ? "Входящие · DEV offline fallback" : "Входящие"}</span>
            <h2>Чаты</h2>
            {messageError ? <small style={{ color: "#dc2626", fontWeight: 800 }}>{messageError}</small> : null}
          </div>
        </div>
        <div className="host-inbox-list">
          {inboxLoading ? (
            <p style={{ color: "#64748b", fontSize: 14 }}>Загрузка чатов...</p>
          ) : chats.length > 0 ? chats.map((chat) => (
            <button key={chat.id} type="button" className={chat.id === selectedChat ? "is-active" : ""} onClick={() => handleSelectChat(chat)}>
              <span>{chat.name.slice(0, 2).toUpperCase()}</span>
              <div>
                <strong>{chat.name}</strong>
                <small>{chat.space}</small>
                <p>{chat.preview}</p>
              </div>
              <em>{chat.time}</em>
              {chat.unread ? <i /> : null}
            </button>
          )) : (
            <EmptyPanel title="Диалогов по вашим местам нет" text="Сообщения появятся здесь, когда гости напишут по одному из ваших объектов." />
          )}
        </div>
      </aside>

      <section className="host-chat-panel">
        {activeChat ? (
          <>
            <div className="host-chat-head">
              <button className="mobile-chat-back" onClick={() => setSelectedChat(null)} aria-label="Назад к чатам">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
              </button>
              <div>
                <span>{activeChat.space}</span>
                <h2>{activeChat.name}</h2>
              </div>
              <a href="#host-calendar" className="desktop-only-link">Открыть бронь</a>
            </div>
            <div className="host-chat-body">
              {activeChat.messages.map((message, index) => (
                <p key={message.id || `${message.text}-${index}`} className={`${getMessageSender(message) === "host" ? "is-host" : ""} ${message.isNew ? "msg-pop" : ""}`}>{message.text}</p>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="host-chat-composer">
              <button type="button" className="composer-icon-btn" aria-label="GIFs">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><path d="M10.5 14.5c-.8 0-1.5-.7-1.5-1.5v-2c0-.8.7-1.5 1.5-1.5s1.5.7 1.5 1.5"/><path d="M14 9h2v6h-2z"/><path d="M18 9v6"/><path d="M18 12h2"/></svg>
              </button>
              <input 
                placeholder="Напишите сообщение..." 
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={sending || usingOfflineFallback}
              />
              <button 
                type="button" 
                className={`composer-icon-btn send-btn ${draft.trim() ? "active" : ""}`} 
                onClick={handleSend}
                disabled={sending || usingOfflineFallback || !draft.trim()}
                aria-label="Отправить"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </div>
          </>
        ) : (
          <EmptyPanel title="Выберите диалог" text="Слева показаны резиденты и команды. После выбора здесь откроется переписка." />
        )}
      </section>
    </section>
  );
}

function DashboardToast({ message, type, onClose }) {
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

function HostTariffsPage({ showToast, profile, fetchProfile }) {
  const [tariffs, setTariffs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(null);
  const [paymentTarget, setPaymentTarget] = useState(null);
  const { lang } = useContext(LanguageContext);

  const fetchTariffs = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/tariffs/");
      setTariffs(res.data?.results || res.data || []);
    } catch (e) {
      showToast(getApiErrorMessage(e, "Не удалось загрузить тарифы."), "error");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTariffs();
  }, []);

  const handleSubscribe = async (tariff) => {
    const token = getAccessToken();
    if (!token) {
      showToast("Войдите в аккаунт, чтобы выбрать тариф.", "error");
      return;
    }
    setSubmitting(tariff.id);

    try {
      const res = await api.post(
        "/api/tariffs/subscribe/",
        { tariff_id: tariff.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.requires_payment) {
        if (!res.data?.subscription_id) {
          throw new Error("Backend не вернул subscription_id для оплаты.");
        }
        setPaymentTarget({
          ...tariff,
          subscriptionId: res.data?.subscription_id,
          subscriptionStatus: res.data?.status
        });
        return;
      }

      if (res.data?.status !== "active") {
        throw new Error("Backend не подтвердил активацию бесплатного тарифа.");
      }

      const refreshedProfile = await fetchProfile();
      if (!refreshedProfile) {
        throw new Error("Тариф активирован, но профиль не удалось обновить.");
      }

      showToast(`Тариф «${tariff.name_ru || tariff.name}» успешно активирован!`, "success");
    } catch (e) {
      const errMsg = getApiErrorMessage(e, "Не удалось выбрать тариф");
      showToast(`Ошибка: ${errMsg}`, "error");
    } finally {
      setSubmitting(null);
    }
  };

  const formatPrice = (t) => {
    if (t.is_free) return "Бесплатно";
    return new Intl.NumberFormat("ru-RU").format(t.price) + " UZS";
  };

  return (
    <section className="host-main-surface">
      {/* Current Tariff Info Card */}
      {profile && (
        <div className="host-current-tariff-card" style={{
          background: "linear-gradient(135deg, #1e1e38 0%, #111122 100%)",
          color: "#fff",
          padding: "24px 28px",
          borderRadius: "20px",
          marginBottom: "32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "20px",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.15)",
          border: "1px solid rgba(255, 255, 255, 0.08)"
        }}>
          <div>
            <span style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "1.5px", color: "var(--orange)", fontWeight: 700 }}>Текущий тариф</span>
            <h2 style={{ fontSize: "28px", fontWeight: 800, margin: "6px 0", color: "#fff" }}>
              {profile.tariff_details ? (profile.tariff_details.name_ru || profile.tariff_details.name) : "Базовый (Standard)"}
            </h2>
            <p style={{ color: "#94a3b8", fontSize: "14px", margin: 0 }}>
              Лимит: <strong>{profile.tariff_details ? profile.tariff_details.max_places : 1}</strong> активных объявлений
            </p>
          </div>
          {profile.tariff_expires_at && (
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: "12px", color: "#94a3b8", display: "block" }}>Активен до:</span>
              <strong style={{ fontSize: "16px", color: "#22c55e" }}>
                {new Date(profile.tariff_expires_at).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
              </strong>
            </div>
          )}
        </div>
      )}

      <div className="host-section-head" style={{ marginBottom: "24px" }}>
        <div>
          <span>Сравнение тарифов</span>
          <h2>Тарифные планы</h2>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px" }}>
          <div className="joy-spinner" style={{ display: "inline-block", width: 40, height: 40, border: "3px solid rgba(228, 102, 48, 0.2)", borderTopColor: "var(--orange)", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
        </div>
      ) : (
        <div className="host-tariffs-grid" style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "24px"
        }}>
          {tariffs.map(t => {
            const isCurrent = profile?.tariff === t.id || (!profile?.tariff && t.slug === 'standard');
            const name = t.name_ru || t.name;
            const features = t.features_ru || t.features || [];
            const isPremium = t.slug === 'premium';
            
            return (
              <div key={t.id} className={`tariff-card ${isPremium ? 'tariff-card--premium' : ''}`} style={{
                background: "#fff",
                border: isCurrent ? "2.5px solid var(--orange)" : "1px solid #e2e8f0",
                borderRadius: "20px",
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                position: "relative",
                boxShadow: isCurrent ? "0 10px 25px rgba(228, 102, 48, 0.12)" : "0 4px 12px rgba(0,0,0,0.03)",
                transition: "all 0.3s ease"
              }}>
                {isCurrent && (
                  <span style={{
                    position: "absolute",
                    top: "-12px",
                    left: "24px",
                    background: "var(--orange)",
                    color: "#fff",
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "3px 12px",
                    borderRadius: "10px",
                    textTransform: "uppercase"
                  }}>Активен</span>
                )}

                <div>
                  <h3 style={{ fontSize: "20px", fontWeight: 800, margin: "0 0 8px 0" }}>{name}</h3>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "4px", margin: "12px 0 20px 0" }}>
                    <strong style={{ fontSize: "24px", fontWeight: 800 }}>{formatPrice(t)}</strong>
                    {!t.is_free && <span style={{ color: "#64748b", fontSize: "13px" }}>/ мес</span>}
                  </div>

                  <ul style={{ listStyle: "none", padding: 0, margin: "20px 0", display: "flex", flexDirection: "column", gap: "12px" }}>
                    <li style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 600 }}>
                      <span style={{ color: "var(--orange)" }}>✓</span>
                      Лимит мест: {t.max_places}
                    </li>
                    {features.map((f, i) => (
                      <li key={i} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#475569" }}>
                        <span style={{ color: "#22c55e" }}>✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => handleSubscribe(t)}
                  disabled={isCurrent || submitting === t.id}
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: "12px",
                    border: "none",
                    fontWeight: 700,
                    cursor: isCurrent ? "default" : "pointer",
                    background: isCurrent ? "#e2e8f0" : "var(--orange)",
                    color: isCurrent ? "#64748b" : "#fff",
                    transition: "all 0.2s ease"
                  }}
                >
                  {submitting === t.id ? "Обработка..." : isCurrent ? "Ваш текущий тариф" : "Выбрать тариф"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {paymentTarget && (
        <PaymentModal
          isOpen={!!paymentTarget}
          onClose={() => setPaymentTarget(null)}
          amount={formatPrice(paymentTarget)}
          title="Покупка тарифа"
          defaultPhone={profile?.phone_number}
          productDetails={{
            subscriptionId: paymentTarget.subscriptionId,
            name: paymentTarget.name_ru || paymentTarget.name,
            description: paymentTarget.description_ru || paymentTarget.description,
            limit: paymentTarget.max_places
          }}
          onSuccess={async () => {
            const t = paymentTarget;
            const refreshedProfile = await fetchProfile();
            if (!refreshedProfile) {
              throw new Error("Оплата прошла, но профиль не удалось обновить. Обновите страницу.");
            }
            showToast(`Тариф «${t.name_ru || t.name}» успешно оплачен и активирован!`, "success");
          }}
        />
      )}
    </section>
  );
}

function HostDashboard({ page = "today", userState, setUserState }) {
  const normalizedPage = pageMeta[page] ? page : "today";
  const [listings, setListings] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [listingsApiFailed, setListingsApiFailed] = useState(false);
  const [bookingsApiFailed, setBookingsApiFailed] = useState(false);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [apiErrors, setApiErrors] = useState({ profile: "", listings: "", bookings: "" });
  const [deleteConfirmSpace, setDeleteConfirmSpace] = useState(null);
  const [toast, setToast] = useState({ open: false, message: "", type: "success" });

  const showToast = (msg, type = "success") => {
    setToast({ open: true, message: msg, type });
  };

  const setApiError = useCallback((section, message) => {
    setApiErrors((current) => ({ ...current, [section]: message }));
  }, []);

  const fetchProfile = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    try {
      const res = await api.get("/api/auth/profile/", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const normalizedProfile = cacheProfile(res.data);
      setProfile(normalizedProfile);
      setApiError("profile", "");
      return normalizedProfile;
    } catch (e) {
      setApiError("profile", getApiErrorMessage(e, "Не удалось загрузить профиль партнёра."));
      return null;
    }
  }, [setApiError]);

  const fetchListings = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.get("/api/places/", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = res.data?.results || res.data || [];
      setListings(Array.isArray(data) ? data.map(buildHostListingView) : []);
      setListingsApiFailed(false);
      setApiError("listings", "");
    } catch (e) {
      setApiError("listings", getApiErrorMessage(e, "Не удалось загрузить ваши объекты."));
      setListings([]);
      setListingsApiFailed(true);
    }
    setLoading(false);
  }, [setApiError]);

  const fetchBookings = useCallback(async () => {
      const token = getAccessToken();
      if (!token) return;
      try {
        const res = await api.get("/api/bookings/", {
          params: { scope: "host" },
          headers: { Authorization: `Bearer ${token}` }
        });
      const data = res.data?.results || res.data || [];
      setBookings(Array.isArray(data) ? data : []);
      setBookingsApiFailed(false);
      setApiError("bookings", "");
    } catch (e) {
      setApiError("bookings", getApiErrorMessage(e, "Не удалось загрузить бронирования партнёра."));
      setBookings([]);
      setBookingsApiFailed(true);
    }
  }, [setApiError]);

  useEffect(() => {
    fetchProfile();
    fetchListings();
    fetchBookings();
  }, [fetchProfile, fetchListings, fetchBookings]);

  useEffect(() => {
    const refreshAfterPlaceSave = () => {
      fetchListings();
      fetchBookings();
    };
    window.addEventListener("joyzone-place-saved", refreshAfterPlaceSave);
    return () => window.removeEventListener("joyzone-place-saved", refreshAfterPlaceSave);
  }, [fetchListings, fetchBookings]);

  const listingsById = useMemo(() => (
    new Map(listings.map((item) => [String(item.id), item]))
  ), [listings]);

  const normalizedBookings = useMemo(
    () => bookings.map((booking) => buildHostBookingView(booking, listingsById)),
    [bookings, listingsById]
  );

  const usingListingsFallback = import.meta.env.DEV && listingsApiFailed;
  const usingBookingsFallback = import.meta.env.DEV && bookingsApiFailed;
  const usingFallbackData = usingListingsFallback || usingBookingsFallback;
  const displayListings = useMemo(
    () => usingListingsFallback ? FALLBACK_HOST_LISTINGS.map(buildHostListingView) : listings,
    [listings, usingListingsFallback],
  );
  const dashboardError = useMemo(
    () => Object.values(apiErrors).filter(Boolean).join(" "),
    [apiErrors],
  );

  const dashboardStats = useMemo(
    () => buildPartnerStats(listings, normalizedBookings),
    [listings, normalizedBookings]
  );

  const todayItems = useMemo(() => {
    if (import.meta.env.DEV && usingBookingsFallback) return FALLBACK_TODAY_BOOKINGS;
    return selectTodayBookings(normalizedBookings);
  }, [normalizedBookings, usingBookingsFallback]);

  const upcomingItems = useMemo(() => {
    const source = import.meta.env.DEV && usingBookingsFallback
      ? FALLBACK_UPCOMING_BOOKINGS
      : selectUpcomingBookings(normalizedBookings)
      .map((booking) => ({
        id: booking.id,
        date: booking.date,
        title: booking.space,
        type: booking.durationLabel,
      }));
    return source;
  }, [normalizedBookings, usingBookingsFallback]);

  const handleEdit = (item) => {
    setStorageItem(STORAGE_KEYS.workflow.editPlaceId, item.id);
    window.location.hash = "#partner";
  };

  const askDelete = (item) => {
    setDeleteConfirmSpace(item);
  };

  const performDelete = async (id) => {
    const token = getAccessToken();
    try {
      await api.delete(`/api/places/${id}/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast("Пространство успешно удалено!", "success");
      setDeleteConfirmSpace(null);
      fetchListings();
      fetchBookings();
    } catch (e) {
      showToast(getApiErrorMessage(e, "Ошибка при удалении объекта"), "error");
      setDeleteConfirmSpace(null);
    }
  };

  return (
    <main className="host-dashboard-shell">
      <JoyNavbar userState={userState} setUserState={setUserState} activeIndex={navIndex[normalizedPage]} variant="dashboard" />
      <section className={`host-dashboard-container ${normalizedPage === "messages" ? "is-messages-page" : ""}`}>
        <DashboardHero page={normalizedPage} profile={profile} />
        {dashboardError ? (
          <div style={{ marginBottom: 16, padding: "10px 12px", borderRadius: 10, background: "#fef2f2", color: "#991b1b", fontSize: 13 }}>
            {dashboardError}
            {usingFallbackData ? " · DEV fallback data is shown." : ""}
          </div>
        ) : null}
        {normalizedPage === "today" ? (
          <TodayPage
            todayBookings={todayItems}
            upcomingBookings={upcomingItems}
            stats={dashboardStats}
            usingFallback={usingBookingsFallback}
          />
        ) : null}
        {normalizedPage === "calendar" ? (
          <CalendarPage
            listings={listings}
            usingFallback={usingListingsFallback}
            onBookingCreated={fetchBookings}
          />
        ) : null}
        {normalizedPage === "listings" ? (
          loading ? (
            <div style={{ textAlign: "center", padding: "80px 20px" }}>
              <div className="joy-spinner" style={{ display: "inline-block", width: 40, height: 40, border: "3px solid rgba(228, 102, 48, 0.2)", borderTopColor: "var(--orange)", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
              <p style={{ marginTop: 16, color: "#64748b" }}>Загрузка ваших объявлений...</p>
            </div>
          ) : (
            <ListingsPage listings={displayListings} onEdit={handleEdit} onDelete={askDelete} />
          )
        ) : null}
        {normalizedPage === "messages" ? <MessagesPage listings={displayListings} partnerId={profile?.id} /> : null}
        {normalizedPage === "tariffs" ? <HostTariffsPage showToast={showToast} profile={profile} fetchProfile={fetchProfile} /> : null}
      </section>

      {/* Beautiful Custom Alert Popup portal */}
      {deleteConfirmSpace && createPortal(
        <div className="host-custom-alert-overlay" onClick={() => setDeleteConfirmSpace(null)}>
          <div className="host-custom-alert-box animate-pop" onClick={e => e.stopPropagation()}>
            <div className="host-custom-alert-icon">⚠️</div>
            <h3>Удалить пространство?</h3>
            <p>Вы действительно хотите удалить <strong>«{deleteConfirmSpace.title}»</strong>? Это действие нельзя будет отменить.</p>
            <div className="host-custom-alert-buttons">
              <button className="host-alert-btn cancel" onClick={() => setDeleteConfirmSpace(null)}>Отмена</button>
              <button className="host-alert-btn confirm" onClick={() => performDelete(deleteConfirmSpace.id)}>Да, удалить</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Beautiful Toast alert portal */}
      {toast.open && createPortal(
        <DashboardToast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(prev => ({ ...prev, open: false }))} 
        />,
        document.body
      )}
    </main>
  );
}

export default HostDashboard;
