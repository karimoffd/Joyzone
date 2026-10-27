import { DashboardIcon, EmptyPanel } from "./shared.jsx";
import { formatMoneyShort } from "./shared.jsx";
import React from "react";

export function TodayPage({ todayBookings = [], upcomingBookings = [], stats, usingFallback = false }) {
  const hasBookings = todayBookings.length > 0;
  const statCards = [
    { label: "Доход", value: `${formatMoneyShort(stats.approximateRevenue)} UZS`, icon: "price", tone: "accent", wide: true },
    { label: "Активные места", value: stats.activeListings, icon: "listing" },
    { label: "На модерации", value: stats.pendingPlaces, icon: "clock", tone: stats.pendingPlaces ? "warn" : "" },
    { label: "Отклонённые", value: stats.rejectedPlaces, icon: "empty", tone: stats.rejectedPlaces ? "bad" : "" },
    { label: "Ждут ответа", value: stats.pendingBookings, icon: "clock", tone: stats.pendingBookings ? "warn" : "" },
    { label: "Подтверждённые", value: stats.confirmedBookings, icon: "check", tone: "good" },
    { label: "Завершённые", value: stats.completedBookings, icon: "check" },
    { label: "Закрытые слоты", value: stats.blockedSlots, icon: "calendar" },
  ];

  return (
    <div className="host-page-grid host-page-grid-today">
      <section className="host-main-surface">
        <div className="host-section-head">
          <div>
            <span>{usingFallback ? "Сегодня · DEV fallback" : "Сегодня"}</span>
            <h2>{hasBookings ? `У вас ${todayBookings.length} бронирования` : "Сегодня бронирований нет"}</h2>
          </div>
          <a href="/host-calendar">Предстоящие<DashboardIcon type="arrow" /></a>
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
          <EmptyPanel title="Броней на сегодня нет" text="Можно проверить календарь или открыть свободные слоты для быстрых заявок." action="Открыть график" href="/host-calendar" />
        )}
      </section>

      <aside className="host-side-surface">
        <div className="host-section-head compact">
          <div>
            <span>Кабинет</span>
            <h2>Сводка</h2>
          </div>
        </div>
        <div className="host-stat-grid">
          {statCards.map((item) => (
            <article key={item.label} className={`${item.tone ? `is-${item.tone}` : ""}${item.wide ? " is-wide" : ""}`}>
              <span className="host-stat-icon"><DashboardIcon type={item.icon} /></span>
              <small>{item.label}</small>
              <strong>{item.value}</strong>
            </article>
          ))}
        </div>
        <div className="host-section-head compact host-side-subhead">
          <div>
            <span>Ближайшее</span>
            <h2>Предстоящие брони</h2>
          </div>
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
