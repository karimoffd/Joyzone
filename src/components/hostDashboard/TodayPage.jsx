import { DashboardIcon, EmptyPanel } from "./shared.jsx";
import { formatMoneyShort } from "./shared.jsx";
import React from "react";

export function TodayPage({ todayBookings = [], upcomingBookings = [], stats, usingFallback = false }) {
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
