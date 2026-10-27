import React, { useMemo, useState } from "react";
import { normalizePlace } from "../../utils/placeMapper.js";
import {
  CANCELLABLE_BOOKING_STATUSES,
  DURATION_LABELS_UZ,
  EmptyState,
  PAID_PAYMENT_STATUSES,
  ProfileIcon,
  bookingStatusLabel,
  bookingStatusTone,
  formatBookingPeriod,
  formatClock,
  formatMoney,
  formatShortDate,
  paymentProviderLabel,
  paymentStatusLabel,
  paymentStatusTone,
  paymentSubject,
} from "./helpers.jsx";
import "./historyTabs.css";

export function StatusPill({ tone = "muted", children }) {
  return <span className={`upx-pill is-${tone}`}>{children}</span>;
}

function SummaryCard({ label, value, hint, accent = false }) {
  return (
    <div className={`upx-summary-card${accent ? " is-accent" : ""}`}>
      <small>{label}</small>
      <strong>{value}</strong>
      {hint ? <span>{hint}</span> : null}
    </div>
  );
}

function StateBox({ tone, children }) {
  return <div className={`profile-bookings-state${tone ? ` is-${tone}` : ""}`} role={tone === "error" ? "alert" : "status"}>{children}</div>;
}

function bookingImage(booking) {
  const details = booking.place_details;
  if (!details) return "";
  return normalizePlace(details).images?.[0] || "";
}

export function isActiveBooking(booking) {
  return ["pending", "confirmed"].includes(booking.status) && new Date(booking.end_time).getTime() >= Date.now();
}

const BOOKING_FILTERS = [
  { id: "all", label: "Hammasi", test: () => true },
  { id: "active", label: "Faol", test: isActiveBooking },
  { id: "past", label: "O'tgan", test: (booking) => booking.status === "completed" || (booking.status === "confirmed" && new Date(booking.end_time).getTime() < Date.now()) },
  { id: "cancelled", label: "Bekor qilingan", test: (booking) => booking.status === "cancelled" },
];

export function BookingHistory({
  bookings,
  loading,
  error,
  success,
  actionError,
  cancellingId,
  onRetry,
  onCancel,
}) {
  const [filter, setFilter] = useState("all");
  const counts = useMemo(
    () => Object.fromEntries(BOOKING_FILTERS.map((item) => [item.id, bookings.filter(item.test).length])),
    [bookings],
  );
  const visible = useMemo(() => {
    const active = BOOKING_FILTERS.find((item) => item.id === filter) || BOOKING_FILTERS[0];
    return [...bookings]
      .filter(active.test)
      .sort((left, right) => new Date(right.start_time).getTime() - new Date(left.start_time).getTime());
  }, [bookings, filter]);
  const spent = bookings
    .filter((booking) => PAID_PAYMENT_STATUSES.has(booking.payment_status) && booking.status !== "cancelled")
    .reduce((sum, booking) => sum + (Number(booking.amount) || 0), 0);

  return (
    <div className="profile-tab-panel" key="history">
      <div className="profile-section-head">
        <div>
          <span>Tarix</span>
          <h2>Bronlar tarixi</h2>
        </div>
        <a href="/filter">Joy bron qilish</a>
      </div>

      {success ? <StateBox tone="success">{success}</StateBox> : null}
      {actionError ? <StateBox tone="error">{actionError}</StateBox> : null}

      {loading ? (
        <div className="upx-skeleton-list">{[0, 1, 2].map((key) => <div key={key} className="upx-skeleton" />)}</div>
      ) : error ? (
        <StateBox tone="error">
          <p>{error}</p>
          <button type="button" className="profile-booking-link" onClick={onRetry}>Qayta urinish</button>
        </StateBox>
      ) : bookings.length === 0 ? (
        <EmptyState
          title="Hozircha bronlar yo'q"
          text="Joy tanlab bron qilganingizdan keyin u shu yerda ko'rinadi."
          action="Joy tanlash"
          href="/filter"
        />
      ) : (
        <>
          <div className="upx-summary-row">
            <SummaryCard label="Jami bronlar" value={bookings.length} accent />
            <SummaryCard label="Faol" value={counts.active} hint="Kutilmoqda yoki tasdiqlangan" />
            <SummaryCard label="Sarflangan" value={formatMoney(spent)} hint="To'langan bronlar bo'yicha" />
          </div>

          <div className="upx-filter-row" role="tablist" aria-label="Bronlar filtri">
            {BOOKING_FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={filter === item.id}
                className={filter === item.id ? "is-active" : ""}
                onClick={() => setFilter(item.id)}
              >
                {item.label}
                <small>{counts[item.id]}</small>
              </button>
            ))}
          </div>

          {visible.length === 0 ? (
            <p className="upx-filter-empty">Bu bo'limda bronlar yo'q.</p>
          ) : (
            <div className="upx-booking-list">
              {visible.map((booking) => {
                const image = bookingImage(booking);
                const canCancel = CANCELLABLE_BOOKING_STATUSES.has(booking.status);
                return (
                  <article key={booking.id} className={`upx-booking is-${booking.status}`}>
                    <a className="upx-booking-thumb" href={booking.href} aria-label={booking.place_title}>
                      {image ? <img src={image} alt="" loading="lazy" /> : <ProfileIcon type="listing" />}
                    </a>

                    <div className="upx-booking-main">
                      <div className="upx-booking-pills">
                        <StatusPill tone={bookingStatusTone(booking.status)}>{bookingStatusLabel(booking.status)}</StatusPill>
                        <StatusPill tone={paymentStatusTone(booking.payment_status)}>{paymentStatusLabel(booking.payment_status)}</StatusPill>
                      </div>
                      <h3><a href={booking.href}>{booking.place_title}</a></h3>
                      <ul className="upx-booking-meta">
                        <li><ProfileIcon type="calendar" />{formatBookingPeriod(booking)}</li>
                        <li><ProfileIcon type="clock" />{DURATION_LABELS_UZ[booking.duration_type] || booking.durationLabel}</li>
                        {booking.location ? <li className="is-location" title={booking.location}><ProfileIcon type="pin" /><span>{booking.location}</span></li> : null}
                        {booking.guests > 1 ? <li><ProfileIcon type="user" />{booking.guests} kishi</li> : null}
                      </ul>
                      {booking.note ? <p className="upx-booking-note">“{booking.note}”</p> : null}
                    </div>

                    <div className="upx-booking-side">
                      <small>Summa</small>
                      <strong>{formatMoney(booking.amount, booking.currency)}</strong>
                      <span>#{booking.id} · {formatShortDate(booking.created_at, true)}</span>
                      <div className="upx-booking-actions">
                        <a href={booking.href} className="upx-btn">Joyni ochish</a>
                        {canCancel ? (
                          <button
                            type="button"
                            className="upx-btn is-danger"
                            disabled={cancellingId === booking.id}
                            onClick={() => onCancel(booking)}
                          >
                            {cancellingId === booking.id ? "Bekor qilinmoqda..." : "Bekor qilish"}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function PaymentHistory({ payments, loading, error, onRetry }) {
  const [copiedId, setCopiedId] = useState(null);
  const sorted = useMemo(
    () => [...payments].sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime()),
    [payments],
  );
  const paid = payments.filter((payment) => PAID_PAYMENT_STATUSES.has(payment.status));
  const totalPaid = paid.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
  const currency = payments[0]?.currency || "UZS";
  const last = sorted[0];

  const copyId = async (payment) => {
    try {
      await navigator.clipboard.writeText(payment.external_id || String(payment.id));
      setCopiedId(payment.id);
      window.setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // Clipboard can be blocked; the id stays visible in the row.
    }
  };

  return (
    <div className="profile-tab-panel" key="payments">
      <div className="profile-section-head">
        <div>
          <span>To'lovlar</span>
          <h2>To'lovlar tarixi</h2>
        </div>
      </div>

      {loading ? (
        <div className="upx-skeleton-list">{[0, 1].map((key) => <div key={key} className="upx-skeleton is-short" />)}</div>
      ) : error ? (
        <StateBox tone="error">
          <p>{error}</p>
          <button type="button" className="profile-booking-link" onClick={onRetry}>Qayta urinish</button>
        </StateBox>
      ) : payments.length === 0 ? (
        <EmptyState
          title="Hozircha to'lovlar yo'q"
          text="Bron yoki tarif uchun qilingan to'lovlar shu yerda ko'rinadi."
        />
      ) : (
        <>
          <div className="upx-summary-row">
            <SummaryCard label="Jami to'langan" value={formatMoney(totalPaid, currency)} accent />
            <SummaryCard label="To'lovlar soni" value={payments.length} hint={`${paid.length} ta muvaffaqiyatli`} />
            <SummaryCard label="Oxirgi to'lov" value={formatShortDate(last?.created_at, true)} hint={last ? formatMoney(last.amount, last.currency) : ""} />
          </div>

          <div className="upx-payment-list">
            <div className="upx-payment-head" aria-hidden="true">
              <span>To'lov</span>
              <span>Sana</span>
              <span>Usul</span>
              <span>Holat</span>
              <span>Summa</span>
            </div>
            {sorted.map((payment) => {
              const isTariff = Boolean(payment.tariff_subscription_id);
              const reference = payment.external_id || `#${payment.id}`;
              return (
                <article key={payment.id} className="upx-payment">
                  <div className="upx-payment-subject">
                    <span className={`upx-payment-icon${isTariff ? " is-tariff" : ""}`}>
                      <ProfileIcon type={isTariff ? "star" : "calendar"} />
                    </span>
                    <div>
                      <strong>{paymentSubject(payment)}</strong>
                      <button type="button" className="upx-ref" onClick={() => copyId(payment)} title="Nusxa olish">
                        {copiedId === payment.id ? "Nusxa olindi" : reference.length > 18 ? `${reference.slice(0, 16)}…` : reference}
                      </button>
                    </div>
                  </div>
                  <div className="upx-payment-cell" data-label="Sana">
                    {formatShortDate(payment.created_at, true)}
                    <small>{formatClock(payment.created_at)}</small>
                  </div>
                  <div className="upx-payment-cell" data-label="Usul">{paymentProviderLabel(payment.provider)}</div>
                  <div className="upx-payment-cell" data-label="Holat">
                    <StatusPill tone={paymentStatusTone(payment.status)}>{paymentStatusLabel(payment.status)}</StatusPill>
                  </div>
                  <div className="upx-payment-amount" data-label="Summa">{formatMoney(payment.amount, payment.currency)}</div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

const OVERVIEW_FIELDS = [
  { key: "city", label: "Shahar", icon: "pin" },
  { key: "birthYear", label: "Tug'ilgan yil", icon: "calendar" },
  { key: "languages", label: "Tillar", icon: "globe" },
  { key: "work", label: "Ish yoki soha", icon: "listing" },
  { key: "company", label: "Kompaniya", icon: "star" },
  { key: "phone", label: "Telefon", icon: "phone" },
  { key: "email", label: "Email", icon: "mail" },
];

export function ProfileDetailsCard({ profileData, missing }) {
  return (
    <section className="upx-details">
      <div className="upx-details-head">
        <div>
          <span>Anketa</span>
          <h2>Men haqimda</h2>
        </div>
        <a href="/profile-edit" className="upx-btn">
          <ProfileIcon type="edit" />
          Tahrirlash
        </a>
      </div>

      {missing.length ? (
        <div className="upx-missing">
          <strong>Profilni to'ldiring:</strong>
          {missing.map((item) => <a key={item} href="/profile-edit">{item}</a>)}
        </div>
      ) : null}

      <dl className="upx-facts">
        {OVERVIEW_FIELDS.map((field) => {
          const value = String(profileData[field.key] || "").trim();
          return (
            <div key={field.key} className={value ? "" : "is-empty"}>
              <span><ProfileIcon type={field.icon} /></span>
              <div>
                <dt>{field.label}</dt>
                <dd>{value || "Ko'rsatilmagan"}</dd>
              </div>
            </div>
          );
        })}
      </dl>

      <div className="upx-text-blocks">
        <div>
          <h3>O'zim haqimda</h3>
          <p className={profileData.about ? "" : "is-empty"}>{profileData.about || "Hali hech narsa yozilmagan."}</p>
        </div>
        <div>
          <h3>Qiziqishlar</h3>
          {profileData.interests ? (
            <div className="upx-tags">
              {String(profileData.interests).split(/[,\n]/).map((item) => item.trim()).filter(Boolean).map((item) => <span key={item}>{item}</span>)}
            </div>
          ) : <p className="is-empty">Ko'rsatilmagan</p>}
        </div>
      </div>
    </section>
  );
}

export function ProfileStats({ bookingsCount, activeCount, paidTotal, favoritesCount, onOpen }) {
  const items = [
    { id: "history", label: "Bronlar", value: bookingsCount, hint: activeCount ? `${activeCount} ta faol` : "Faol bron yo'q", icon: "calendar" },
    { id: "payments", label: "To'langan", value: formatMoney(paidTotal), hint: "Barcha to'lovlar", icon: "payment" },
    { id: "likes", label: "Saqlangan", value: favoritesCount, hint: "Yoqtirgan joylar", icon: "heart" },
  ];
  return (
    <div className="upx-stats">
      {items.map((item) => (
        <button key={item.id} type="button" onClick={() => onOpen(item.id)}>
          <span><ProfileIcon type={item.icon} /></span>
          <div>
            <small>{item.label}</small>
            <strong>{item.value}</strong>
            <em>{item.hint}</em>
          </div>
          <ProfileIcon type="arrow" />
        </button>
      ))}
    </div>
  );
}
