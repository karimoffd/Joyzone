import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import api, { getApiErrorMessage } from "../../api/client.js";
import { DashboardIcon } from "./shared.jsx";

const PRICE_TIERS = [
  { key: "price_hourly", label: "За час", hint: "Почасовая аренда", placeholder: "50 000" },
  { key: "price_daily", label: "За день", hint: "С открытия до закрытия", placeholder: "250 000" },
  { key: "price_weekly", label: "За неделю", hint: "7 дней подряд", placeholder: "1 500 000" },
  { key: "price_monthly", label: "За месяц", hint: "Долгосрочная аренда", placeholder: "5 000 000" },
];

const TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => (
  `${String(Math.floor(index / 2)).padStart(2, "0")}:${index % 2 ? "30" : "00"}`
));

function digitsOnly(value) {
  return String(value ?? "").replace(/\D/g, "").slice(0, 11);
}

function groupDigits(value) {
  const digits = digitsOnly(value);
  return digits ? Number(digits).toLocaleString("ru-RU") : "";
}

function hhmm(value, fallback) {
  const match = String(value || "").match(/^(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : fallback;
}

function initialPrices(place) {
  return Object.fromEntries(PRICE_TIERS.map(({ key }) => {
    const amount = Math.round(Number(place?.[key]) || 0);
    return [key, amount > 0 ? String(amount) : ""];
  }));
}

function placeCategoryId(place) {
  const category = place?.subcategory_info?.category;
  return typeof category === "object" ? category?.id : category;
}

// Quick editor for the commercial terms of one place: prices, hours, booking mode, discounts.
export function PlacePricingModal({ place, onClose, onSaved }) {
  const [prices, setPrices] = useState(() => initialPrices(place));
  const [enabled, setEnabled] = useState(() => {
    const start = initialPrices(place);
    return Object.fromEntries(PRICE_TIERS.map(({ key }) => [key, Boolean(start[key])]));
  });
  const [opensAt, setOpensAt] = useState(() => hhmm(place?.opens_at, "09:00"));
  const [closesAt, setClosesAt] = useState(() => hhmm(place?.closes_at, "18:00"));
  const [bookingType, setBookingType] = useState(place?.booking_type || "request");
  const [discountIds, setDiscountIds] = useState(() => (place?.discount_ids || []).map(Number));
  const [discounts, setDiscounts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmModeration, setConfirmModeration] = useState(false);
  const needsModeration = place?.status === "approved";

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

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  const categoryId = placeCategoryId(place);
  const availableDiscounts = useMemo(() => discounts.filter((item) => (
    item.is_active && (item.applicable_to === "all" || (item.category_ids || []).includes(categoryId) || discountIds.includes(item.id))
  )), [discounts, categoryId, discountIds]);

  const problems = useMemo(() => {
    const list = [];
    const active = PRICE_TIERS.filter(({ key }) => enabled[key]);
    if (!active.length) list.push("Включите хотя бы один формат цены.");
    active.forEach(({ key, label }) => {
      if (!(Number(prices[key]) > 0)) list.push(`Укажите сумму «${label}».`);
    });
    if (closesAt <= opensAt) list.push("Время закрытия должно быть позже открытия.");
    return list;
  }, [enabled, prices, opensAt, closesAt]);

  const save = async () => {
    if (problems.length) {
      setError(problems[0]);
      return;
    }
    if (needsModeration && !confirmModeration) {
      setConfirmModeration(true);
      return;
    }
    setSaving(true);
    setError("");
    const payload = {
      opens_at: opensAt,
      closes_at: closesAt,
      booking_type: bookingType,
      discounts: discountIds,
    };
    PRICE_TIERS.forEach(({ key }) => {
      payload[key] = enabled[key] ? Number(prices[key]) : null;
    });
    try {
      const response = await api.patch(`/api/places/${place.id}/`, payload);
      onSaved?.(response.data);
    } catch (err) {
      setConfirmModeration(false);
      setError(getApiErrorMessage(err, "Не удалось сохранить изменения."));
    } finally {
      setSaving(false);
    }
  };

  const toggleDiscount = (id) => {
    setDiscountIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  return createPortal(
    <div className="hpm-overlay" onClick={() => !saving && onClose()}>
      <div className="hpm" role="dialog" aria-modal="true" aria-labelledby="hpm-title" onClick={(event) => event.stopPropagation()}>
        <header className="hpm-head">
          <div>
            <span>Цены и условия</span>
            <h2 id="hpm-title">{place?.title}</h2>
          </div>
          <button type="button" className="hpm-close" onClick={onClose} disabled={saving} aria-label="Закрыть">
            <DashboardIcon type="close" />
          </button>
        </header>

        <div className="hpm-body">
          <section className="hpm-section">
            <h3>Стоимость</h3>
            <p>Включите форматы, в которых сдаёте место, и укажите цену в сумах. Клиент увидит только включённые.</p>
            <div className="hpm-prices">
              {PRICE_TIERS.map((tier) => {
                const isOn = enabled[tier.key];
                return (
                  <div key={tier.key} className={`hpm-price${isOn ? " is-on" : ""}`}>
                    <label className="hpm-switch">
                      <input
                        type="checkbox"
                        checked={isOn}
                        onChange={() => setEnabled((current) => ({ ...current, [tier.key]: !isOn }))}
                      />
                      <i aria-hidden="true" />
                      <span>
                        <strong>{tier.label}</strong>
                        <small>{tier.hint}</small>
                      </span>
                    </label>
                    <div className="hpm-money">
                      <input
                        inputMode="numeric"
                        disabled={!isOn}
                        value={isOn ? groupDigits(prices[tier.key]) : ""}
                        placeholder={isOn ? tier.placeholder : "выключено"}
                        onChange={(event) => setPrices((current) => ({ ...current, [tier.key]: digitsOnly(event.target.value) }))}
                        aria-label={`Цена ${tier.label}`}
                      />
                      <span>сум</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="hpm-section">
            <h3>Часы работы</h3>
            <p>Почасовые брони доступны только в это время, дневные — с открытия до закрытия.</p>
            <div className="hpm-hours">
              <label>
                Открытие
                <select value={opensAt} onChange={(event) => setOpensAt(event.target.value)}>
                  {TIME_OPTIONS.map((time) => <option key={time} value={time}>{time}</option>)}
                </select>
              </label>
              <span aria-hidden="true">—</span>
              <label>
                Закрытие
                <select value={closesAt} onChange={(event) => setClosesAt(event.target.value)}>
                  {[...TIME_OPTIONS.slice(1), "23:59"].map((time) => <option key={time} value={time}>{time}</option>)}
                </select>
              </label>
            </div>
            {closesAt <= opensAt ? <small className="hpm-field-error">Время закрытия должно быть позже открытия.</small> : null}
          </section>

          <section className="hpm-section">
            <h3>Как принимать брони</h3>
            <div className="hpm-modes">
              <button type="button" className={bookingType === "request" ? "is-active" : ""} onClick={() => setBookingType("request")}>
                <strong>По запросу</strong>
                <small>Вы подтверждаете каждую бронь сами</small>
              </button>
              <button type="button" className={bookingType === "instant" ? "is-active" : ""} onClick={() => setBookingType("instant")}>
                <strong>Мгновенно</strong>
                <small>Бронь подтверждается сразу</small>
              </button>
            </div>
          </section>

          <section className="hpm-section">
            <h3>Скидки</h3>
            {availableDiscounts.length ? (
              <div className="hpm-discounts">
                {availableDiscounts.map((item) => {
                  const isOn = discountIds.includes(item.id);
                  return (
                    <button key={item.id} type="button" className={isOn ? "is-active" : ""} onClick={() => toggleDiscount(item.id)} aria-pressed={isOn}>
                      <b>−{item.percent}%</b>
                      <span>
                        <strong>{item.name_ru}</strong>
                        {item.description_ru ? <small>{item.description_ru}</small> : null}
                      </span>
                      <i aria-hidden="true">{isOn ? "✓" : ""}</i>
                    </button>
                  );
                })}
              </div>
            ) : <p>Для этой категории скидок пока нет — их добавляет администратор.</p>}
          </section>
        </div>

        <footer className="hpm-foot">
          {error ? <div className="hpm-error" role="alert">{error}</div> : null}
          {confirmModeration ? (
            <div className="hpm-confirm">
              <strong>Место уйдёт на повторную модерацию</strong>
              <span>Пока модератор не проверит изменения, место не будет видно в поиске.</span>
            </div>
          ) : needsModeration ? (
            <p className="hpm-note">После сохранения место снова пройдёт модерацию.</p>
          ) : null}
          <div className="hpm-actions">
            <button type="button" className="hpm-btn" onClick={confirmModeration ? () => setConfirmModeration(false) : onClose} disabled={saving}>
              {confirmModeration ? "Назад" : "Отмена"}
            </button>
            <button type="button" className="hpm-btn is-primary" onClick={save} disabled={saving}>
              {saving ? "Сохраняем..." : confirmModeration ? "Да, сохранить" : "Сохранить"}
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
