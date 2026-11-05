import React, { useContext, useEffect, useRef, useState } from "react";
import { LanguageContext } from "../../context/LanguageContext.jsx";
import { navigate, useRoute } from "../../utils/router.js";
import { BECOME_PARTNER_PATH, useAccountRole } from "../../utils/partnerAccess.js";
import api from "../../api/client.js";
import { getPlacesFromApiResponse, normalizePlace } from "../../utils/placeMapper.js";
import "./partnerPromo.css";

// "Become a partner" promo: shows once per visit, 1–2 minutes after the site
// opens, to visitors who are not partners yet. "Later" hides it for 3 days.

const DELAY_MIN_MS = 60_000;
const DELAY_MAX_MS = 120_000;
const SNOOZE_MS = 3 * 24 * 60 * 60 * 1000;
const SNOOZE_KEY = "joyzone-partner-promo-snoozed";
const SHOWN_KEY = "joyzone-partner-promo-shown";
// Focused flows where a popup would get in the way.
const QUIET_ROUTES = /^(?:partner|partner-guide|login|register|verify|forgot|admin|host-|book-|settings|profile-edit)/;

const TEXT = {
  uz: {
    kicker: "Hamkorlar uchun",
    title: "Joyingiz bormi? Uni Joyzone'da ijaraga bering",
    text: "Ofis, kovorking, zal yoki omboringizni joylashtiring — mijozlar o'zi topadi.",
    points: ["Standard tarifda 1 ta joy bepul", "Arizalar va chat bitta kabinetda", "Ariza — atigi 2 daqiqa"],
    cta: "Hamkor bo'lish",
    later: "Keyinroq",
    close: "Yopish",
    listed: "Joyzone'da",
    booking: "Yangi bron so'rovi",
    bookingMeta: "4 kishi · Ertaga, 10:00",
    approve: "Tasdiqlash",
    approved: "Tasdiqlandi",
    income: "Bu oy daromad",
    incomeValue: "+4 200 000 so'm",
  },
  ru: {
    kicker: "Для владельцев",
    title: "Есть свободное место? Сдавайте его через Joyzone",
    text: "Разместите офис, коворкинг, зал или склад — клиенты найдут его сами.",
    points: ["1 место бесплатно на тарифе Standard", "Заявки и чат в одном кабинете", "Заявка — всего 2 минуты"],
    cta: "Стать партнёром",
    later: "Позже",
    close: "Закрыть",
    listed: "На Joyzone",
    booking: "Новая заявка на бронь",
    bookingMeta: "4 чел. · Завтра, 10:00",
    approve: "Подтвердить",
    approved: "Подтверждено",
    income: "Доход за месяц",
    incomeValue: "+4 200 000 сум",
  },
  en: {
    kicker: "For owners",
    title: "Got a free space? Rent it out on Joyzone",
    text: "List your office, coworking, hall or warehouse — clients will find it.",
    points: ["1 place free on the Standard plan", "Requests and chat in one cabinet", "Apply in just 2 minutes"],
    cta: "Become a partner",
    later: "Later",
    close: "Close",
    listed: "On Joyzone",
    booking: "New booking request",
    bookingMeta: "4 people · Tomorrow, 10:00",
    approve: "Approve",
    approved: "Approved",
    income: "Income this month",
    incomeValue: "+4,200,000 UZS",
  },
};

function storageGet(storage, key) {
  try {
    return storage.getItem(key);
  } catch (error) {
    return null;
  }
}

function storageSet(storage, key, value) {
  try {
    storage.setItem(key, value);
  } catch (error) {
    // Without storage the promo simply may show again on the next visit.
  }
}

function isSnoozed() {
  const until = Number(storageGet(localStorage, SNOOZE_KEY) || 0);
  return until > Date.now() || storageGet(sessionStorage, SHOWN_KEY) === "1";
}

export default function PartnerPromo() {
  const { lang } = useContext(LanguageContext);
  const t = TEXT[lang] || TEXT.uz;
  const route = useRoute();
  const { canListPlaces } = useAccountRole();
  const [due, setDue] = useState(false);
  const [open, setOpen] = useState(false);
  const ctaRef = useRef(null);
  const [place, setPlace] = useState(null);

  // The timer runs from the moment the site opens, across page changes.
  useEffect(() => {
    if (isSnoozed()) return undefined;
    // In development ?promo=now shows it right away.
    const instant = import.meta.env.DEV && new URLSearchParams(window.location.search).get("promo") === "now";
    const delay = instant ? 1500 : DELAY_MIN_MS + Math.random() * (DELAY_MAX_MS - DELAY_MIN_MS);
    const timer = setTimeout(() => setDue(true), delay);
    return () => clearTimeout(timer);
  }, []);

  // Once due, it waits for a page where it does not interrupt anything.
  useEffect(() => {
    if (!due || open || canListPlaces || QUIET_ROUTES.test(route) || isSnoozed()) return;
    storageSet(sessionStorage, SHOWN_KEY, "1");
    setOpen(true);
  }, [due, open, canListPlaces, route]);

  // The picture is a real listing from the site, loaded once the promo opens.
  useEffect(() => {
    if (!open || place) return;
    api.get("/api/places/popular/", { skipAuth: true })
      .then((res) => {
        const places = getPlacesFromApiResponse(res.data)
          .map((item) => ({ ...normalizePlace(item), categoryName: String(item.category || "") }))
          .filter((item) => /^https?:/.test(item.images?.[0] || ""));
        // Offices and coworkings say "workspace" best; any listing with a photo is the fallback.
        const withPhoto = places.find((item) => /ковор|офис|kovork|ofis|cowork|office/i.test(item.categoryName)) || places[0];
        if (withPhoto) setPlace({ title: withPhoto.title, image: withPhoto.images[0] });
      })
      .catch(() => {});
  }, [open, place]);

  useEffect(() => {
    if (!open) return undefined;
    ctaRef.current?.focus({ preventScroll: true });
    const onKey = (event) => {
      if (event.key === "Escape") snooze();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const snooze = () => {
    storageSet(localStorage, SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
    setOpen(false);
    setDue(false);
  };

  const accept = () => {
    setOpen(false);
    setDue(false);
    navigate(BECOME_PARTNER_PATH);
  };

  if (!open || canListPlaces) return null;

  return (
    <div className="pp-overlay" onClick={snooze}>
      <div className="pp-card" role="dialog" aria-modal="true" aria-labelledby="pp-title" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="pp-close" aria-label={t.close} onClick={snooze}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>

        <div className="pp-art" aria-hidden="true">
          <div className="pp-photo" style={place ? { backgroundImage: `url("${place.image}")` } : undefined} />
          {place ? (
            <span className="pp-listed">
              <svg viewBox="0 0 24 24"><path d="M12 21s7-5.1 7-11a7 7 0 0 0-14 0c0 5.9 7 11 7 11Z" /><circle cx="12" cy="10" r="2.6" /></svg>
              <span><small>{t.listed}</small>{place.title}</span>
            </span>
          ) : null}

          <div className="pp-booking">
            <span className="pp-booking-icon">
              <svg viewBox="0 0 24 24"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
            </span>
            <span className="pp-booking-text"><strong>{t.booking}</strong><small>{t.bookingMeta}</small></span>
            <span className="pp-booking-action">
              <b>{t.approve}</b>
              <b className="is-done">
                <svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5" /></svg>
                {t.approved}
              </b>
            </span>
          </div>

          <div className="pp-income">
            <span><small>{t.income}</small><strong>{t.incomeValue}</strong></span>
            <span className="pp-bars">
              {[38, 52, 46, 64, 58, 80, 100].map((height, index) => <i key={index} style={{ "--h": `${height}%`, "--i": index }} />)}
            </span>
          </div>
        </div>

        <div className="pp-body">
          <span className="pp-kicker">{t.kicker}</span>
          <h2 id="pp-title">{t.title}</h2>
          <p>{t.text}</p>
          <ul>
            {t.points.map((point) => <li key={point}>{point}</li>)}
          </ul>
          <div className="pp-actions">
            <button ref={ctaRef} type="button" className="pp-cta" onClick={accept}>
              {t.cta}
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </button>
            <button type="button" className="pp-later" onClick={snooze}>{t.later}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
