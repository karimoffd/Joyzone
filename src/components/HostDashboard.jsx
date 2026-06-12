import React, { useMemo, useState } from "react";

import { Header as JoyNavbar } from "./HomeHero.jsx";
import { JoyFooter, PropertyCard } from "./ListingsSection.jsx";
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
  }
};

const navIndex = {
  today: 0,
  calendar: 1,
  listings: 2,
  messages: 3
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

function CalendarPage() {
  const [price, setPrice] = useState("320000");
  const [period, setPeriod] = useState("за день");
  const [activeDiscounts, setActiveDiscounts] = useState(() => discounts.reduce((acc, item) => ({ ...acc, [item.label]: item.active }), {}));
  const formattedPrice = useMemo(() => Number(price || 0).toLocaleString("ru-RU"), [price]);

  return (
    <div className="host-calendar-layout">
      <aside className="host-price-panel">
        <span>Базовая цена</span>
        <label className="host-price-input">
          <input value={price} onChange={(event) => setPrice(event.target.value.replace(/\D/g, "").slice(0, 8))} inputMode="numeric" aria-label="Базовая цена" />
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

      <section className="host-calendar-panel">
        <div className="host-calendar-top">
          <div>
            <span>Июнь 2026</span>
            <h2>Доступность и цены</h2>
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
  );
}

function ListingsPage() {
  return (
    <section className="host-main-surface">
      <div className="host-section-head">
        <div>
          <span>Объявления</span>
          <h2>Мои места</h2>
        </div>
        <a href="#partner-start"><DashboardIcon type="plus" />Добавить место</a>
      </div>

      <div className="host-listings-grid">
        {hostListings.map((item, index) => (
          <article className="host-listing-shell" key={item.title}>
            <PropertyCard item={item} index={index} />
            <div className="host-listing-meta">
              <span className={item.status === "Опубликовано" ? "is-live" : ""}>{item.status}</span>
              <strong>{item.bookings} броней</strong>
              <small>Заполненность {item.score}</small>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function MessagesPage() {
  const [selectedChat, setSelectedChat] = useState(null);
  const activeChat = inbox.find((chat) => chat.id === selectedChat);

  return (
    <section className="host-messages-layout">
      <aside className="host-inbox-panel">
        <div className="host-section-head compact">
          <div>
            <span>Входящие</span>
            <h2>Чаты</h2>
          </div>
        </div>
        <div className="host-inbox-list">
          {inbox.map((chat) => (
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
              <div>
                <span>{activeChat.space}</span>
                <h2>{activeChat.name}</h2>
              </div>
              <a href="#host-calendar">Открыть бронь</a>
            </div>
            <div className="host-chat-body">
              {activeChat.messages.map((message, index) => (
                <p key={`${message.text}-${index}`} className={message.from === "host" ? "is-host" : ""}>{message.text}</p>
              ))}
            </div>
            <div className="host-chat-composer">
              <input placeholder="Напишите ответ..." />
              <button type="button">Отправить</button>
            </div>
          </>
        ) : (
          <EmptyPanel title="Выберите диалог" text="Слева показаны резиденты и команды. После выбора здесь откроется переписка." />
        )}
      </section>
    </section>
  );
}

function HostDashboard({ page = "today", userState, setUserState }) {
  const normalizedPage = pageMeta[page] ? page : "today";

  return (
    <main className="host-dashboard-shell">
      <JoyNavbar userState={userState} setUserState={setUserState} activeIndex={navIndex[normalizedPage]} variant="dashboard" />
      <section className="host-dashboard-container">
        <DashboardHero page={normalizedPage} />
        {normalizedPage === "today" ? <TodayPage /> : null}
        {normalizedPage === "calendar" ? <CalendarPage /> : null}
        {normalizedPage === "listings" ? <ListingsPage /> : null}
        {normalizedPage === "messages" ? <MessagesPage /> : null}
      </section>
      <JoyFooter />
    </main>
  );
}

export default HostDashboard;
