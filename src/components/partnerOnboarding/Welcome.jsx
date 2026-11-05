import React, { useEffect, useRef, useState } from "react";
import { Icon } from "./parts.jsx";
import "./welcome.css";

// Start screen of the partner wizard: a short pitch, a live preview of a
// listing assembling itself, then what the wizard asks for and what the
// owner's cabinet gives back.

const HOW_STEPS = [
  { title: "Расскажите о месте", text: "Тип, адрес на карте, фото и описание." },
  { title: "Задайте условия", text: "Цены, часы работы, формат брони и скидки." },
  { title: "Пройдите модерацию", text: "Проверяем объявление — обычно до 24 часов." },
];

const NEEDS = [
  { icon: "layers", title: "Тип и формат", text: "Офис, коворкинг, зал и т. д." },
  { icon: "pin", title: "Адрес", text: "Точка на карте для клиентов" },
  { icon: "image", title: "Минимум 4 фото", text: "Первое станет обложкой" },
  { icon: "text", title: "Название и описание", text: "На русском, узбекском и английском" },
  { icon: "area", title: "Площадь и удобства", text: "Вместимость, Wi-Fi, парковка…" },
  { icon: "tag", title: "Цены и часы", text: "За час, день, неделю или месяц" },
];

const PERKS = [
  { icon: "bell", title: "Заявки в кабинете", text: "Подтверждайте брони сами или включите мгновенное бронирование." },
  { icon: "chat", title: "Чат с клиентами", text: "Все переписки по вашим местам в одном окне." },
  { icon: "calendarCheck", title: "Календарь занятости", text: "Видно все брони, свободные дни можно закрыть." },
  { icon: "bolt", title: "Быстрая смена цен", text: "Меняйте цены в пару кликов, не открывая весь мастер." },
  { icon: "percent", title: "Скидки", text: "Скидки помогают быстрее получить первые брони." },
  { icon: "trend", title: "Доход и статистика", text: "Брони и доход за сегодня — на главной кабинета." },
];

// The preview runs on ticks; each element shows from its tick onwards.
const TICK_MS = 900;
const LAST_TICK = 14;
const STAGE_LABELS = [
  { label: "Фото", from: 1 },
  { label: "Описание", from: 5 },
  { label: "Цена", from: 7 },
  { label: "Модерация", from: 8 },
  { label: "Заявки", from: 10 },
];
const PHOTO_TILES = ["desk", "coffee", "sofa", "meeting"];

function usePreviewTick(stageRef) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setTick(11);
      return undefined;
    }
    let timer = null;
    const start = () => {
      if (!timer) timer = setInterval(() => setTick((value) => (value >= LAST_TICK ? 0 : value + 1)), TICK_MS);
    };
    const stop = () => {
      clearInterval(timer);
      timer = null;
    };
    // Runs only while the preview is on screen.
    const observer = new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop()));
    if (stageRef.current) observer.observe(stageRef.current);
    return () => {
      stop();
      observer.disconnect();
    };
  }, [stageRef]);

  return tick;
}

function ListingPreview() {
  const stageRef = useRef(null);
  const tick = usePreviewTick(stageRef);
  const on = (from) => (tick >= from ? " is-on" : "");
  const activeLabel = STAGE_LABELS.reduce((current, item, index) => (tick >= item.from ? index : current), -1);

  return (
    <div className="pw-stage" ref={stageRef} aria-hidden="true">
      <span className="pw-stage-glow" />

      <div className="pw-listing">
        <div className="pw-photos">
          {PHOTO_TILES.map((icon, index) => (
            <span key={icon} className={`pw-photo pw-photo-${index + 1}${on(index + 1)}`}>
              <Icon name={icon} />
            </span>
          ))}
        </div>
        <div className="pw-listing-body">
          <div className="pw-listing-top">
            <strong className={`pw-type${on(5)}`}>Офис в Юнусабаде</strong>
            <span className={`pw-status${tick >= 9 ? " is-live" : ""}${on(8)}`}>
              {tick >= 9 ? "Опубликовано" : "На модерации"}
            </span>
          </div>
          <div className="pw-chips">
            <span className={`pw-chip${on(6)}`}>40 м²</span>
            <span className={`pw-chip${on(6)}`}>8 мест</span>
            <span className={`pw-chip${on(6)}`}>Wi-Fi</span>
          </div>
          <div className={`pw-price${on(7)}`}>
            <b>250 000 сум</b>
            <small>/ день</small>
          </div>
        </div>
      </div>

      <div className={`pw-toast${on(10)}`}>
        <span className="pw-toast-icon"><Icon name="bell" /></span>
        <span>
          <strong>Новая заявка</strong>
          <small>Завтра, 10:00–14:00</small>
        </span>
      </div>

      <div className={`pw-income${on(11)}`}>
        <small>Доход за месяц</small>
        <strong>+4 200 000 сум</strong>
      </div>

      <ol className="pw-track">
        {STAGE_LABELS.map((item, index) => (
          <li key={item.label} className={index < activeLabel ? "is-done" : index === activeLabel ? "is-active" : ""}>
            {item.label}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function PartnerWelcome({ onStart }) {
  const scrollToHow = () => document.getElementById("pw-how")?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="pw">
      <section className="pw-hero">
        <div className="pw-copy">
          <span className="pow-eyebrow">Joyzone для владельцев</span>
          <h1>Сдавайте своё пространство через <em>Joyzone</em></h1>
          <p>Разместите офис, коворкинг или зал — клиенты найдут его в поиске, а заявки придут прямо в ваш кабинет.</p>
          <ul className="pw-facts">
            <li><Icon name="clock" />~5 минут</li>
            <li><Icon name="shield" />Модерация до 24 ч</li>
            <li><Icon name="users" />Заявки сразу в кабинет</li>
          </ul>
          <div className="pw-actions">
            <button data-testid="onboarding-start" type="button" className="pow-start" onClick={onStart}>
              Разместить место<Icon name="chevronRight" />
            </button>
            <button type="button" className="pw-link" onClick={scrollToHow}>Как это работает</button>
          </div>
        </div>
        <ListingPreview />
      </section>

      <section className="pw-section" id="pw-how">
        <header className="pw-head">
          <span className="pow-eyebrow">Как это работает</span>
          <h2>Три шага до первой заявки</h2>
        </header>
        <ol className="pw-how">
          {HOW_STEPS.map((item, index) => (
            <li key={item.title} style={{ "--i": index }}>
              <b>{index + 1}</b>
              <strong>{item.title}</strong>
              <p>{item.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="pw-section pw-split">
        <div className="pw-panel">
          <header className="pw-head">
            <span className="pow-eyebrow">Что понадобится</span>
            <h2>Подготовьте заранее</h2>
          </header>
          <ul className="pw-needs">
            {NEEDS.map((item) => (
              <li key={item.title}>
                <span className="pw-icon"><Icon name={item.icon} /></span>
                <span><strong>{item.title}</strong><small>{item.text}</small></span>
              </li>
            ))}
          </ul>
        </div>

        <div className="pw-panel is-dark">
          <header className="pw-head">
            <span className="pow-eyebrow">Что вы получите</span>
            <h2>Кабинет владельца</h2>
          </header>
          <ul className="pw-perks">
            {PERKS.map((item) => (
              <li key={item.title}>
                <span className="pw-icon"><Icon name={item.icon} /></span>
                <span><strong>{item.title}</strong><small>{item.text}</small></span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="pw-final">
        <div>
          <h2>Готовы начать?</h2>
          <p>Мастер ведёт по шагам — на любом из них можно вернуться назад и поправить.</p>
        </div>
        <button type="button" className="pow-start" onClick={onStart}>
          Разместить место<Icon name="chevronRight" />
        </button>
      </section>
    </div>
  );
}
