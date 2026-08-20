import React, { useMemo, useState, useEffect, useRef, useCallback, useContext } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { LanguageContext } from "../App.jsx";

import { Header as JoyNavbar } from "./HomeHero.jsx";
import { SimpleFooter, PropertyCard } from "./ListingsSection.jsx";
import { propertyCards } from "../data/content.js";
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

const todayBookings = [
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

const upcomingBookings = [
  { date: "4 июня", title: "Focus Hub Coworking", type: "Дневной доступ" },
  { date: "6 июня", title: "Blue Line Office", type: "Просмотр офиса" },
  { date: "9 июня", title: "Orange Desk Office", type: "Месячная аренда" }
];

const discounts = [
  { label: "Первые 3 брони", value: "20%", active: true },
  { label: "От 3 месяцев", value: "10%", active: true },
  { label: "Нерабочие часы", value: "7%", active: false }
];

const calendarDays = Array.from({ length: 35 }, (_, index) => {
  const day = index - 2;
  const inMonth = day > 0 && day <= 30;
  const status = [5, 12, 18, 24].includes(day) ? "booked" : [9, 21].includes(day) ? "blocked" : "free";
  const discount = [7, 14, 26].includes(day);
  return {
    label: inMonth ? day : "",
    status,
    discount,
    price: day % 6 === 0 ? "390k" : day % 4 === 0 ? "340k" : "320k"
  };
});

const hostListings = propertyCards.slice(0, 4).map((item, index) => ({
  ...item,
  status: index === 1 ? "Нужно обновить цену" : index === 2 ? "Черновик" : "Опубликовано",
  bookings: [12, 8, 0, 5][index],
  score: ["98%", "91%", "64%", "87%"][index]
}));

const inbox = [
  {
    id: "nova",
    name: "Nova Labs",
    space: "Atlas Meeting Room",
    time: "12 мин назад",
    preview: "Можно ли подготовить доску и воду до 10:00?",
    unread: true,
    messages: [
      { from: "guest", text: "Здравствуйте, можно ли подготовить доску и воду до 10:00?" },
      { from: "host", text: "Да, команда подготовит комнату заранее. HDMI тоже будет на столе." },
      { from: "guest", text: "Отлично, спасибо. Тогда подтверждаем встречу." }
    ]
  },
  {
    id: "bridge",
    name: "Bridge Team",
    space: "Quiet Work Studio",
    time: "Вчера",
    preview: "Нам нужна тихая зона для созвона.",
    unread: false,
    messages: [
      { from: "guest", text: "Нам нужна тихая зона для созвона на 4 человека." },
      { from: "host", text: "Подойдёт второй кабинет, там меньше проходного шума." }
    ]
  },
  {
    id: "aurora",
    name: "Aurora Studio",
    space: "Blue Line Office",
    time: "2 дня назад",
    preview: "Хотим посмотреть офис на следующей неделе.",
    unread: false,
    messages: [
      { from: "guest", text: "Хотим посмотреть офис на следующей неделе." },
      { from: "host", text: "Свободные слоты: вторник 12:00 или четверг 15:30." }
    ]
  }
];

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

function DashboardHero({ page }) {
  const meta = pageMeta[page] || pageMeta.today;

  return (
    <section className="host-dashboard-hero">
      <div>
        <span>{meta.eyebrow}</span>
        <h1>{meta.title}</h1>
        <p>{meta.text}</p>
      </div>
      <div className="host-dashboard-status">
        <strong>Joyzone host</strong>
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

function TodayPage() {
  const hasBookings = todayBookings.length > 0;

  return (
    <div className="host-page-grid host-page-grid-today">
      <section className="host-main-surface">
        <div className="host-section-head">
          <div>
            <span>Сегодня</span>
            <h2>{hasBookings ? `У вас ${todayBookings.length} бронирования` : "Сегодня бронирований нет"}</h2>
          </div>
          <a href="#host-calendar">Предстоящие<DashboardIcon type="arrow" /></a>
        </div>

        {hasBookings ? (
          <div className="host-booking-list">
            {todayBookings.map((booking) => (
              <article className="host-booking-card" key={`${booking.space}-${booking.time}`}>
                <div className="host-booking-time">
                  <DashboardIcon type="clock" />
                  <strong>{booking.time}</strong>
                </div>
                <div>
                  <span>{booking.status}</span>
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
        <div className="host-upcoming-list">
          {upcomingBookings.map((booking) => (
            <article key={`${booking.title}-${booking.date}`}>
              <span>{booking.date}</span>
              <strong>{booking.title}</strong>
              <small>{booking.type}</small>
            </article>
          ))}
        </div>
      </aside>
    </div>
  );
}

function CalendarPage({ listings = [] }) {
  const displayListings = listings.length > 0 ? listings : hostListings;
  const [activeSpace, setActiveSpace] = useState(displayListings[0] || hostListings[0]);
  const [price, setPrice] = useState("320000");
  const [period, setPeriod] = useState("за день");
  const [activeDiscounts, setActiveDiscounts] = useState(() => discounts.reduce((acc, item) => ({ ...acc, [item.label]: item.active }), {}));
  
  useEffect(() => {
    if (listings.length > 0 && (!activeSpace || !listings.some(l => l.id === activeSpace.id))) {
      setActiveSpace(listings[0]);
    }
  }, [listings]);

  // Parse base price from active space if it exists, otherwise fallback
  const currentBasePrice = useMemo(() => {
    if (activeSpace && activeSpace.price) {
      return activeSpace.price.replace(/\D/g, "");
    }
    return price;
  }, [activeSpace, price]);

  const formattedPrice = useMemo(() => Number(currentBasePrice || 0).toLocaleString("ru-RU"), [currentBasePrice]);

  return (
    <div className="host-calendar-page-container">
      {/* Top: Spaces List */}
      <div className="host-spaces-top-bar" style={{ marginBottom: "28px" }}>
        <div className="host-section-head compact" style={{ marginBottom: "16px" }}>
          <div>
            <span>Объекты</span>
            <h2>Выберите место</h2>
          </div>
        </div>
        <div className="host-spaces-list-horizontal">
          {displayListings.map((space) => {
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
          })}
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
            {discounts.map((item) => (
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
          </div>
        </aside>

        {/* Right Column: Calendar Panel */}
        <section className="host-calendar-panel">
          <div className="host-calendar-top">
            <div>
              <span>Июнь 2026</span>
              <h2>{activeSpace?.title || "Место"}</h2>
            </div>
            <div className="host-calendar-legend">
              <span><i className="free" />Свободно</span>
              <span><i className="booked" />Бронь</span>
              <span><i className="blocked" />Закрыто</span>
            </div>
          </div>

          <div className="host-calendar-weekdays">
            {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="host-calendar-grid">
            {calendarDays.map((day, index) => (
              <button key={`${day.label}-${index}`} type="button" className={`host-day ${day.status} ${day.discount ? "has-discount" : ""} ${day.label ? "" : "is-muted"}`}>
                <strong>{day.label}</strong>
                {day.label ? <small>{day.price}</small> : null}
                {day.discount ? <em>-10%</em> : null}
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function ListingsPage({ listings = [], onEdit, onDelete }) {
  return (
    <section className="host-main-surface">
      <div className="host-section-head">
        <div>
          <span>Объявления</span>
          <h2>Мои места</h2>
        </div>
        <a href="#partner" onClick={() => localStorage.removeItem("joyzone-edit-place-id")}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Добавить место
        </a>
      </div>

      <div className="host-listings-grid">
        {listings.length === 0 ? (
          <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "60px 20px", color: "#64748b", background: "#f8fafc", borderRadius: 20, border: "1.5px dashed #e2e8f0" }}>
            <h3 style={{ margin: "0 0 8px 0", color: "#111820", fontSize: 18 }}>У вас пока нет объявлений</h3>
            <p style={{ margin: "0 0 20px 0", fontSize: 14 }}>Добавьте ваше первое пространство, чтобы начать принимать бронирования.</p>
            <a href="#partner" className="host-alert-btn confirm" style={{ display: "inline-block", textDecoration: "none", width: "auto", background: "var(--orange)", color: "#fff", padding: "10px 24px", borderRadius: 12, fontWeight: 700 }} onClick={() => localStorage.removeItem("joyzone-edit-place-id")}>Добавить место</a>
          </div>
        ) : (
          listings.map((item, index) => (
            <article className="host-listing-shell" key={item.id || item.title}>
              <PropertyCard item={{
                ...item,
                price: item.price || "0 UZS"
              }} index={index} />
              <div className="host-listing-meta">
                <span className={item.status === "approved" ? "is-live" : ""}>
                  {item.status === "approved" ? "Опубликовано" : item.status === "rejected" ? "Отклонено" : "Модерация"}
                </span>
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
    </section>
  );
}

function MessagesPage() {
  const [chats, setChats] = useState(inbox);
  const [selectedChat, setSelectedChat] = useState(null);
  const [draft, setDraft] = useState("");
  const messagesEndRef = useRef(null);
  
  const activeChat = chats.find((chat) => chat.id === selectedChat);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages]);

  const handleSend = () => {
    if (!draft.trim() || !activeChat) return;
    setChats(prev => prev.map(chat => {
      if (chat.id === activeChat.id) {
        return {
          ...chat,
          messages: [...chat.messages, { from: "host", text: draft, isNew: true }]
        };
      }
      return chat;
    }));
    setDraft("");
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
            <span>Входящие</span>
            <h2>Чаты</h2>
          </div>
        </div>
        <div className="host-inbox-list">
          {chats.map((chat) => (
            <button key={chat.id} type="button" className={chat.id === selectedChat ? "is-active" : ""} onClick={() => setSelectedChat(chat.id)}>
              <span>{chat.name.slice(0, 2).toUpperCase()}</span>
              <div>
                <strong>{chat.name}</strong>
                <small>{chat.space}</small>
                <p>{chat.preview}</p>
              </div>
              <em>{chat.time}</em>
              {chat.unread ? <i /> : null}
            </button>
          ))}
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
                <p key={`${message.text}-${index}`} className={`${message.from === "host" ? "is-host" : ""} ${message.isNew ? "msg-pop" : ""}`}>{message.text}</p>
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
              />
              <button 
                type="button" 
                className={`composer-icon-btn send-btn ${draft.trim() ? "active" : ""}`} 
                onClick={handleSend}
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

function HostTariffsPage({ showToast }) {
  const [tariffs, setTariffs] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(null);
  const { lang } = useContext(LanguageContext);

  const fetchProfile = async () => {
    const token = localStorage.getItem("joyzone-access");
    if (!token) return;
    try {
      const res = await axios.get("http://localhost:8000/api/auth/profile/", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile(res.data);
    } catch (e) {
      console.warn("Failed to fetch user profile:", e);
    }
  };

  const fetchTariffs = async () => {
    setLoading(true);
    try {
      const res = await axios.get("http://localhost:8000/api/tariffs/");
      setTariffs(res.data?.results || res.data || []);
    } catch (e) {
      console.warn("Failed to fetch tariffs:", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProfile();
    fetchTariffs();
  }, []);

  const handleSubscribe = async (tariff) => {
    const token = localStorage.getItem("joyzone-access");
    if (!token) return;
    setSubmitting(tariff.id);
    try {
      const res = await axios.post(
        "http://localhost:8000/api/tariffs/subscribe/",
        { tariff_id: tariff.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast(
        tariff.is_free 
          ? `Тариф «${tariff.name_ru || tariff.name}» успешно активирован!` 
          : "Заявка отправлена! Администратор активирует её в ближайшее время.",
        "success"
      );
      fetchProfile();
    } catch (e) {
      const errMsg = e.response?.data?.detail || e.message;
      showToast(`Ошибка: ${errMsg}`, "error");
    }
    setSubmitting(null);
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
    </section>
  );
}

function HostDashboard({ page = "today", userState, setUserState }) {
  const normalizedPage = pageMeta[page] ? page : "today";
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleteConfirmSpace, setDeleteConfirmSpace] = useState(null);
  const [toast, setToast] = useState({ open: false, message: "", type: "success" });

  const showToast = (msg, type = "success") => {
    setToast({ open: true, message: msg, type });
  };

  const fetchListings = useCallback(async () => {
    const token = localStorage.getItem("joyzone-access");
    if (!token) return;
    setLoading(true);
    try {
      const res = await axios.get("http://localhost:8000/api/places/", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setListings(res.data?.results || res.data || []);
    } catch (e) {
      console.warn("Failed to fetch partner listings:", e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const handleEdit = (item) => {
    localStorage.setItem("joyzone-edit-place-id", item.id);
    window.location.hash = "#partner";
  };

  const askDelete = (item) => {
    setDeleteConfirmSpace(item);
  };

  const performDelete = async (id) => {
    const token = localStorage.getItem("joyzone-access");
    try {
      await axios.delete(`http://localhost:8000/api/places/${id}/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast("Пространство успешно удалено!", "success");
      setDeleteConfirmSpace(null);
      fetchListings();
    } catch (e) {
      showToast(e.response?.data?.detail || "Ошибка при удалении объекта", "error");
      setDeleteConfirmSpace(null);
    }
  };

  return (
    <main className="host-dashboard-shell">
      <JoyNavbar userState={userState} setUserState={setUserState} activeIndex={navIndex[normalizedPage]} variant="dashboard" />
      <section className={`host-dashboard-container ${normalizedPage === "messages" ? "is-messages-page" : ""}`}>
        <DashboardHero page={normalizedPage} />
        {normalizedPage === "today" ? <TodayPage /> : null}
        {normalizedPage === "calendar" ? <CalendarPage listings={listings} /> : null}
        {normalizedPage === "listings" ? (
          loading ? (
            <div style={{ textAlign: "center", padding: "80px 20px" }}>
              <div className="joy-spinner" style={{ display: "inline-block", width: 40, height: 40, border: "3px solid rgba(228, 102, 48, 0.2)", borderTopColor: "var(--orange)", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
              <p style={{ marginTop: 16, color: "#64748b" }}>Загрузка ваших объявлений...</p>
            </div>
          ) : (
            <ListingsPage listings={listings} onEdit={handleEdit} onDelete={askDelete} />
          )
        ) : null}
        {normalizedPage === "messages" ? <MessagesPage /> : null}
        {normalizedPage === "tariffs" ? <HostTariffsPage showToast={showToast} /> : null}
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
