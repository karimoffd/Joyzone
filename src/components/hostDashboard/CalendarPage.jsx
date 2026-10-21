import { FALLBACK_HOST_LISTINGS, FALLBACK_DISCOUNTS, formatMoneyShort, buildHostCalendarDays, formatCalendarMonthTitle, EmptyPanel, DashboardIcon } from "./shared.jsx";
import React, { useMemo, useState, useEffect, useCallback } from "react";
import api, { getApiErrorMessage } from "../../api/client.js";
import { fetchPlaceAvailability, getAvailabilityDay, getAvailabilitySlotStatus, getCalendarAvailabilityRange } from "../../utils/availability.js";
import { parseMoneyValue } from "../../utils/placePricing.js";
import { buildBlockedBookingPayload, isDateInSelectedRange, selectCalendarDate } from "../../utils/partnerCalendar.js";

export function CalendarPage({ listings = [], usingFallback = false, onBookingCreated }) {
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
            <EmptyPanel title="Нет мест для календаря" text="Добавьте или дождитесь модерации места, чтобы управлять доступностью." action="Добавить место" href="/partner" />
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
