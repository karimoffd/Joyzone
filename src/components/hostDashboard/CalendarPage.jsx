import { FALLBACK_HOST_LISTINGS, formatMoneyShort, buildHostCalendarDays, formatCalendarMonthTitle, EmptyPanel, DashboardIcon } from "./shared.jsx";
import React, { useMemo, useState, useEffect, useCallback } from "react";
import api, { getApiErrorMessage } from "../../api/client.js";
import { fetchPlaceAvailability, getAvailabilityDay, getAvailabilitySlotStatus, getCalendarAvailabilityRange } from "../../utils/availability.js";
import { buildBlockedBookingPayload, isDateInSelectedRange, selectCalendarDate } from "../../utils/partnerCalendar.js";
import { PlacePricingModal } from "./PlacePricingModal.jsx";
import "./calendar.css";
import "./pricingModal.css";

const PRICE_ROWS = [
  { key: "price_hourly", label: "За час" },
  { key: "price_daily", label: "За день" },
  { key: "price_weekly", label: "За неделю" },
  { key: "price_monthly", label: "За месяц" },
];

const PLACE_STATUS = {
  approved: { label: "Опубликовано", tone: "good" },
  pending: { label: "На модерации", tone: "warn" },
  rejected: { label: "Отклонено", tone: "bad" },
};

const BOOKING_STATUS = {
  pending: { label: "Ждёт ответа", tone: "warn" },
  confirmed: { label: "Подтверждено", tone: "good" },
  completed: { label: "Завершено", tone: "muted" },
  blocked: { label: "Закрыто вами", tone: "muted" },
  cancelled: { label: "Отменено", tone: "bad" },
};

const WEEKDAY_FORMAT = new Intl.DateTimeFormat("ru-RU", { weekday: "long", day: "numeric", month: "long" });
const SHORT_DATE_FORMAT = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" });

function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateFromKey(key) {
  const [year, month, day] = String(key).split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatPrice(value) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? `${amount.toLocaleString("ru-RU")} сум` : null;
}

function hhmm(value, fallback) {
  const match = String(value || "").match(/^(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : fallback;
}

function clock(iso) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

// Bookings of one place that overlap the [startKey, endKey] day range.
function bookingsInRange(bookings, startKey, endKey) {
  if (!startKey) return [];
  const from = dateFromKey(startKey).getTime();
  const to = dateFromKey(endKey || startKey).getTime() + 24 * 3600 * 1000;
  return bookings
    .filter((booking) => booking.status !== "cancelled")
    .filter((booking) => new Date(booking.start_time).getTime() < to && new Date(booking.end_time).getTime() > from)
    .sort((left, right) => new Date(left.start_time).getTime() - new Date(right.start_time).getTime());
}

function Pill({ tone, children }) {
  return <span className={`hcal-pill is-${tone}`}>{children}</span>;
}

export function CalendarPage({ listings = [], bookings = [], usingFallback = false, onBookingCreated, onPlaceUpdated, onEditPlace }) {
  const displayListings = useMemo(
    () => listings.length > 0 ? listings : (usingFallback && import.meta.env.DEV ? FALLBACK_HOST_LISTINGS : []),
    [listings, usingFallback],
  );
  const [selectedSpaceId, setSelectedSpaceId] = useState(null);
  // Derived from the list so a refreshed place (after saving prices) shows up at once.
  const activeSpace = displayListings.find((item) => item.id === selectedSpaceId) || displayListings[0] || null;
  const setActiveSpace = (space) => setSelectedSpaceId(space?.id ?? null);
  const [pricingOpen, setPricingOpen] = useState(false);
  const today = useMemo(() => new Date(), []);
  const todayKey = toDateKey(today);
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
  const [busyBookingId, setBusyBookingId] = useState(null);
  const [calendarNotice, setCalendarNotice] = useState("");
  const [discounts, setDiscounts] = useState([]);

  useEffect(() => {
    let alive = true;
    api.get("/api/discounts/", { skipAuth: true })
      .then((response) => {
        const items = response.data?.results || response.data || [];
        if (alive) setDiscounts(Array.isArray(items) ? items : []);
      })
      .catch(() => alive && setDiscounts([]));
    return () => { alive = false; };
  }, []);

  const activeSpaceId = activeSpace?.id || activeSpace?._id;
  const opensAt = hhmm(activeSpace?.opens_at, "09:00");
  const closesAt = hhmm(activeSpace?.closes_at, "18:00");

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

  useEffect(() => {
    setBlockStartTime(opensAt);
    setBlockEndTime(closesAt);
  }, [opensAt, closesAt]);

  const changeMonth = (offset) => {
    const nextMonth = new Date(calendarYear, calendarMonth + offset, 1);
    setCalendarYear(nextMonth.getFullYear());
    setCalendarMonth(nextMonth.getMonth());
  };

  const goToday = () => {
    setCalendarYear(today.getFullYear());
    setCalendarMonth(today.getMonth());
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

  const refreshAll = async () => {
    await loadAvailability();
    await onBookingCreated?.();
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
      await refreshAll();
      setCalendarNotice("Готово: период закрыт, клиенты не смогут его забронировать.");
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

  const handleBookingAction = async (booking, action) => {
    const messages = {
      confirm: "Бронь подтверждена, клиент получит уведомление.",
      cancel: booking.status === "blocked" ? "Период снова открыт для бронирования." : "Бронь отклонена.",
    };
    setBusyBookingId(booking.id);
    setCalendarError("");
    setCalendarNotice("");
    try {
      await api.post(`/api/bookings/${booking.id}/${action}/`);
      await refreshAll();
      setCalendarNotice(messages[action]);
    } catch (error) {
      setCalendarError(getApiErrorMessage(error, "Не удалось изменить бронь."));
    } finally {
      setBusyBookingId(null);
    }
  };

  const placeBookings = useMemo(
    () => bookings.filter((booking) => String(booking.place_id) === String(activeSpaceId)),
    [bookings, activeSpaceId],
  );

  const dayPriceLabel = useMemo(() => {
    const daily = Number(activeSpace?.price_daily);
    const hourly = Number(activeSpace?.price_hourly);
    if (daily > 0) return `${formatMoneyShort(daily)} сум`;
    if (hourly > 0) return `${formatMoneyShort(hourly)}/ч`;
    return "";
  }, [activeSpace]);

  const calendarDays = useMemo(
    () => buildHostCalendarDays(calendarYear, calendarMonth, availability, dayPriceLabel),
    [calendarYear, calendarMonth, availability, dayPriceLabel],
  );

  const monthStats = useMemo(() => {
    const realDays = calendarDays.filter((day) => day.label);
    const monthStart = new Date(calendarYear, calendarMonth, 1).getTime();
    const monthEnd = new Date(calendarYear, calendarMonth + 1, 1).getTime();
    const monthBookings = placeBookings.filter((booking) => {
      const start = new Date(booking.start_time).getTime();
      return start >= monthStart && start < monthEnd && !["cancelled", "blocked"].includes(booking.status);
    });
    return {
      free: realDays.filter((day) => day.status === "free").length,
      booked: realDays.filter((day) => day.status === "booked").length,
      blocked: realDays.filter((day) => day.status === "blocked").length,
      bookings: monthBookings.length,
      pending: monthBookings.filter((booking) => booking.status === "pending").length,
      revenue: monthBookings.reduce((sum, booking) => sum + (Number(booking.amount) || 0), 0),
    };
  }, [calendarDays, placeBookings, calendarYear, calendarMonth]);

  const placeDiscounts = useMemo(() => {
    const ids = new Set((activeSpace?.discount_ids || []).map(String));
    return discounts.filter((item) => item.is_active !== false && ids.has(String(item.id)));
  }, [discounts, activeSpace]);

  const isSingleDay = selection.startDate && selection.startDate === selection.endDate;
  const selectedBookings = useMemo(
    () => bookingsInRange(placeBookings, selection.startDate, selection.endDate),
    [placeBookings, selection.startDate, selection.endDate],
  );
  const selectedDayAvailability = getAvailabilityDay(availability, selection.startDate);
  const workingSlots = useMemo(() => {
    const first = Number(opensAt.slice(0, 2));
    const last = Math.max(first + 1, Number(closesAt.slice(0, 2)) + (closesAt.endsWith(":00") ? 0 : 1));
    return Array.from({ length: last - first }, (_, index) => {
      const label = `${String(first + index).padStart(2, "0")}:00`;
      return { label, status: getAvailabilitySlotStatus(availability, selection.startDate, label) };
    });
  }, [availability, selection.startDate, opensAt, closesAt]);
  const selectionTitle = !selection.startDate
    ? ""
    : isSingleDay
      ? WEEKDAY_FORMAT.format(dateFromKey(selection.startDate))
      : `${SHORT_DATE_FORMAT.format(dateFromKey(selection.startDate))} — ${SHORT_DATE_FORMAT.format(dateFromKey(selection.endDate))}`;
  const selectionInPast = selection.startDate && selection.startDate < todayKey;
  const placeStatus = PLACE_STATUS[activeSpace?.status] || PLACE_STATUS.pending;
  const monthName = formatCalendarMonthTitle(calendarYear, calendarMonth);

  return (
    <div className="host-calendar-page-container hcal">
      <div className="host-spaces-top-bar" style={{ marginBottom: "24px" }}>
        <div className="host-section-head compact" style={{ marginBottom: "14px" }}>
          <div>
            <span>{usingFallback ? "Объекты · DEV fallback" : "Шаг 1"}</span>
            <h2>Выберите место</h2>
          </div>
        </div>
        <div className="host-spaces-list-horizontal">
          {displayListings.length > 0 ? displayListings.map((space) => {
            const isActive = activeSpace && activeSpace.id === space.id;
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
            <EmptyPanel title="Нет мест для календаря" text="Добавьте или дождитесь модерации места, чтобы управлять доступностью." action="Добавить место" href="/partner" />
          )}
        </div>
      </div>

      {activeSpace ? (
        <div className="hcal-layout">
          <aside className="hcal-side">
            <section className="hcal-card">
              <div className="hcal-card-head">
                <span>Условия</span>
                <Pill tone={placeStatus.tone}>{placeStatus.label}</Pill>
              </div>
              <ul className="hcal-prices">
                {PRICE_ROWS.map((row) => {
                  const value = formatPrice(activeSpace[row.key]);
                  return (
                    <li key={row.key} className={value ? "" : "is-empty"}>
                      <span>{row.label}</span>
                      <strong>{value || "не задано"}</strong>
                    </li>
                  );
                })}
              </ul>
              <div className="hcal-hours">
                <DashboardIcon type="clock" />
                <div>
                  <small>Часы работы</small>
                  <strong>{opensAt} – {closesAt}</strong>
                </div>
              </div>
              <div className="hcal-discounts">
                <small>Скидки</small>
                {placeDiscounts.length ? (
                  <div>
                    {placeDiscounts.map((item) => (
                      <span key={item.id} title={item.description_ru || ""}>−{item.percent}% · {item.name_ru}</span>
                    ))}
                  </div>
                ) : <p>Скидки не подключены</p>}
              </div>
              {!usingFallback ? (
                <>
                  <button type="button" className="hcal-edit" onClick={() => setPricingOpen(true)}>
                    <DashboardIcon type="price" />
                    Изменить цены и часы
                  </button>
                  {onEditPlace ? (
                    <button type="button" className="hcal-edit-link" onClick={() => onEditPlace(activeSpace)}>
                      Редактировать всё объявление
                    </button>
                  ) : null}
                </>
              ) : null}
            </section>

            <section className="hcal-card">
              <div className="hcal-card-head">
                <span>{monthName}</span>
              </div>
              <div className="hcal-month-stats">
                <div className="is-free"><strong>{monthStats.free}</strong><small>свободно</small></div>
                <div className="is-booked"><strong>{monthStats.booked}</strong><small>с бронями</small></div>
                <div className="is-blocked"><strong>{monthStats.blocked}</strong><small>закрыто</small></div>
              </div>
              <ul className="hcal-month-list">
                <li><span>Броней за месяц</span><strong>{monthStats.bookings}</strong></li>
                <li className={monthStats.pending ? "is-warn" : ""}><span>Ждут ответа</span><strong>{monthStats.pending}</strong></li>
                <li><span>Сумма броней</span><strong>{formatPrice(monthStats.revenue) || "0 сум"}</strong></li>
              </ul>
            </section>

            <section className="hcal-card hcal-help">
              <div className="hcal-card-head"><span>Как пользоваться</span></div>
              <ol>
                <li>Нажмите на день — увидите брони и почасовую занятость.</li>
                <li>Нажмите второй день — выделится период.</li>
                <li>Закройте день или период, если место недоступно.</li>
              </ol>
            </section>
          </aside>

          <section className="hcal-main">
            <header className="hcal-main-head">
              <div>
                <span>Шаг 2 · Календарь</span>
                <h2>{monthName}</h2>
                <p>{activeSpace.title}</p>
              </div>
              <div className="hcal-nav">
                <button type="button" className="hcal-today" onClick={goToday}>Сегодня</button>
                <button type="button" onClick={() => changeMonth(-1)} aria-label="Предыдущий месяц"><DashboardIcon type="chevronLeft" /></button>
                <button type="button" onClick={() => changeMonth(1)} aria-label="Следующий месяц"><DashboardIcon type="chevronRight" /></button>
              </div>
            </header>

            <div className="hcal-legend">
              <span><i className="is-free" />Свободно (цена за день)</span>
              <span><i className="is-booked" />Есть брони</span>
              <span><i className="is-blocked" />Закрыто вами</span>
              <span><i className="is-today" />Сегодня</span>
            </div>

            {calendarError ? <div className="hcal-alert is-error" role="alert">{calendarError}</div> : null}
            {calendarNotice ? <div className="hcal-alert is-success" role="status">{calendarNotice}</div> : null}

            <div className={`hcal-grid-wrap${availabilityLoading ? " is-loading" : ""}`}>
              <div className="hcal-weekdays">
                {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => <span key={day}>{day}</span>)}
              </div>
              <div className="hcal-grid">
                {calendarDays.map((day, index) => {
                  if (!day.label) return <span key={`empty-${index}`} className="hcal-day is-empty" aria-hidden="true" />;
                  const isSelected = isDateInSelectedRange(day.dateStr, selection.startDate, selection.endDate);
                  const count = getAvailabilityDay(availability, day.dateStr)?.bookings?.filter((item) => item.status !== "blocked").length || 0;
                  const isPast = day.dateStr < todayKey;
                  const caption = day.status === "blocked"
                    ? "Закрыто"
                    : count
                      ? `${count} ${count === 1 ? "бронь" : count < 5 ? "брони" : "броней"}`
                      : day.price || "Свободно";
                  return (
                    <button
                      key={day.dateStr}
                      type="button"
                      className={[
                        "hcal-day",
                        `is-${day.status}`,
                        isSelected ? "is-selected" : "",
                        day.dateStr === todayKey ? "is-today" : "",
                        isPast ? "is-past" : "",
                      ].join(" ")}
                      disabled={availabilityLoading}
                      onClick={() => handleDayClick(day.dateStr)}
                      aria-pressed={isSelected}
                      aria-label={`${day.label}: ${caption}`}
                    >
                      <strong>{day.label}</strong>
                      <small className="hcal-day-long">{caption}</small>
                      <small className="hcal-day-short" aria-hidden="true">{day.status === "blocked" ? "закр." : count ? `${count} бр.` : ""}</small>
                    </button>
                  );
                })}
              </div>
            </div>

            {selection.startDate ? (
              <div className="hcal-day-panel">
                <div className="hcal-day-panel-head">
                  <div>
                    <span>{isSingleDay ? "Выбранный день" : "Выбранный период"}</span>
                    <h3>{selectionTitle}</h3>
                  </div>
                  <button type="button" onClick={() => setSelection({ startDate: "", endDate: "" })} aria-label="Сбросить выбор">
                    <DashboardIcon type="close" />
                  </button>
                </div>

                {isSingleDay ? (
                  <div className="hcal-slots" aria-label="Занятость по часам">
                    {workingSlots.map((slot) => (
                      <span key={slot.label} className={`is-${slot.status}`} title={`${slot.label}: ${slot.status === "booked" ? "занято" : slot.status === "blocked" ? "закрыто" : "свободно"}`}>
                        {slot.label}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="hcal-bookings">
                  <h4>Брони {isSingleDay ? "в этот день" : "в этот период"} <small>{selectedBookings.length}</small></h4>
                  {selectedBookings.length ? selectedBookings.map((booking) => {
                    const status = BOOKING_STATUS[booking.status] || BOOKING_STATUS.pending;
                    const isBlock = booking.status === "blocked";
                    const busy = busyBookingId === booking.id;
                    return (
                      <article key={booking.id} className={`hcal-booking is-${booking.status}`}>
                        <div className="hcal-booking-time">
                          <strong>{clock(booking.start_time)}</strong>
                          <small>{clock(booking.end_time)}</small>
                        </div>
                        <div className="hcal-booking-body">
                          <strong>{isBlock ? (booking.note && booking.note !== "Без заметки" ? booking.note : "Закрыто владельцем") : (booking.client_name || "Клиент Joyzone")}</strong>
                          <small>
                            {isBlock ? booking.durationLabel : [booking.client_phone !== booking.client_name ? booking.client_phone : "", booking.durationLabel, formatPrice(booking.amount)].filter(Boolean).join(" · ")}
                          </small>
                        </div>
                        <Pill tone={status.tone}>{status.label}</Pill>
                        <div className="hcal-booking-actions">
                          {booking.status === "pending" ? (
                            <>
                              <button type="button" className="is-primary" disabled={busy} onClick={() => handleBookingAction(booking, "confirm")}>Подтвердить</button>
                              <button type="button" disabled={busy} onClick={() => handleBookingAction(booking, "cancel")}>Отклонить</button>
                            </>
                          ) : null}
                          {isBlock ? (
                            <button type="button" disabled={busy} onClick={() => handleBookingAction(booking, "cancel")}>Открыть снова</button>
                          ) : null}
                        </div>
                      </article>
                    );
                  }) : <p className="hcal-muted">Броней нет — день свободен.</p>}
                </div>

                {selectionInPast ? (
                  <p className="hcal-muted">Прошедшие дни закрыть нельзя.</p>
                ) : (
                  <div className="hcal-block-form">
                    <h4>Закрыть {isSingleDay ? "день" : "период"} для клиентов</h4>
                    <div className="hcal-segment" aria-label="Тип блокировки">
                      <button type="button" className={blockMode === "daily" ? "is-active" : ""} onClick={() => setBlockMode("daily")}>Весь день</button>
                      <button
                        type="button"
                        className={blockMode === "hourly" ? "is-active" : ""}
                        disabled={!isSingleDay}
                        title={isSingleDay ? "" : "По часам можно закрыть только один день"}
                        onClick={() => setBlockMode("hourly")}
                      >
                        Только часы
                      </button>
                    </div>
                    <div className="hcal-form-row">
                      {blockMode === "hourly" && isSingleDay ? (
                        <>
                          <label>С<input type="time" value={blockStartTime} onChange={(event) => setBlockStartTime(event.target.value)} /></label>
                          <label>До<input type="time" value={blockEndTime} onChange={(event) => setBlockEndTime(event.target.value)} /></label>
                        </>
                      ) : null}
                      <label className="is-grow">
                        Причина (видите только вы)
                        <input value={blockNote} onChange={(event) => setBlockNote(event.target.value)} placeholder="Например: ремонт, частное мероприятие" />
                      </label>
                    </div>
                    <button
                      type="button"
                      className="hcal-submit"
                      disabled={blocking || availabilityLoading || usingFallback || !activeSpaceId}
                      onClick={handleCreateBlock}
                    >
                      {blocking ? "Сохраняем..." : `Закрыть ${isSingleDay ? "день" : "период"}`}
                    </button>
                    {selectedDayAvailability?.bookings?.length && blockMode === "daily" ? (
                      <p className="hcal-hint">В этом дне уже есть брони — закрыть можно только свободное время.</p>
                    ) : null}
                  </div>
                )}
              </div>
            ) : (
              <p className="hcal-pick-hint">Нажмите на любой день, чтобы увидеть брони или закрыть его.</p>
            )}
          </section>
        </div>
      ) : null}

      {pricingOpen && activeSpace ? (
        <PlacePricingModal
          place={activeSpace}
          onClose={() => setPricingOpen(false)}
          onSaved={async (place) => {
            setPricingOpen(false);
            await onPlaceUpdated?.();
            setCalendarNotice(place?.status === "pending"
              ? "Цены и часы сохранены. Место отправлено на модерацию."
              : "Цены и часы сохранены.");
          }}
        />
      ) : null}
    </div>
  );
}
