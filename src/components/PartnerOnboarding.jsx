import React, { useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import logoImage from "../assets/img/Logo.png";
import "./PartnerOnboarding.css";

const objectTypes = [
  { id: "office", label: "Офис", description: "Готовое пространство для команды или компании.", icon: "OF" },
  { id: "coworking", label: "Коворкинг", description: "Гибкая зона для рабочих мест и резидентов.", icon: "CW" },
  { id: "conference", label: "Конференц-зал", description: "Переговоры, презентации и деловые события.", icon: "CN" }
];

const accessTypes = [
  { id: "whole", label: "Объект целиком", description: "Гость бронирует всё пространство без соседей." },
  { id: "cabinet", label: "Отдельный кабинет", description: "Закрытая комната внутри общего офиса." },
  { id: "fixed", label: "Фиксированное место", description: "Закреплённый стол для одного сотрудника." },
  { id: "flex", label: "Незакрепленное место", description: "Свободное место в общей рабочей зоне." }
];

const addressSuggestions = [
  "Kichik Xalqa Yo'li 2, Toshkent, Uzbekistan",
  "Amir Temur Avenue 107B, Toshkent, Uzbekistan",
  "Shota Rustaveli ko'chasi 53, Toshkent, Uzbekistan",
  "Mustaqillik shoh ko'chasi 88, Toshkent, Uzbekistan",
  "Oybek ko'chasi 18, Toshkent, Uzbekistan"
];

const initialCounters = {
  workplaces: 8,
  cabinets: 2,
  desks: 6,
  restrooms: 1
};

const amenityOptions = [
  { id: "wifi", label: "Высокоскоростной Wi-Fi", icon: "Wi" },
  { id: "printer", label: "Принтер/Сканер", icon: "Pr" },
  { id: "meeting", label: "Переговорная", icon: "Mt" },
  { id: "coffee", label: "Кофемашина", icon: "Cf" },
  { id: "lounge", label: "Зона отдыха", icon: "Ln" },
  { id: "board", label: "Маркерная доска", icon: "Bd" },
  { id: "parking", label: "Парковка", icon: "Pk" },
  { id: "access", label: "Круглосуточный доступ", icon: "24" }
];

const featureTags = ["Тихая зона", "Креативный дизайн", "Панорамные окна", "В центре"];

const bookingOptions = [
  {
    id: "instant",
    label: "Мгновенное бронирование",
    description: "Резидент получает подтверждение сразу после оплаты.",
    icon: "⚡"
  },
  {
    id: "request",
    label: "По запросу",
    description: "Администратор проверяет заявку и подтверждает бронирование вручную.",
    icon: "✓"
  }
];

const pricePeriods = ["за час", "за день", "за месяц"];

const discountOptions = [
  { id: "first", label: "Скидка первым 3 резидентам", value: "20%", description: "Поможет быстрее получить первые бронирования и отзывы." },
  { id: "quarter", label: "При аренде от 3 месяцев", value: "10%", description: "Для команд, которые выбирают стабильное размещение." },
  { id: "halfyear", label: "При аренде от полугода", value: "15%", description: "Для долгосрочных резидентов и офисных команд." }
];

const securityOptions = [
  "Видеонаблюдение в общих зонах",
  "Система контроля доступа (СКУД)",
  "Охрана на территории",
  "Доступ 24/7"
];

const iconAliases = {
  OF: "building",
  CW: "users",
  CN: "presentation",
  whole: "layers",
  cabinet: "door",
  fixed: "desk",
  flex: "spark",
  Wi: "wifi",
  Pr: "printer",
  Mt: "meeting",
  Cf: "coffee",
  Ln: "sofa",
  Bd: "board",
  Pk: "parking",
  "24": "clock",
  instant: "bolt",
  request: "calendarCheck"
};

const iconPaths = {
  building: ["M4 20V6l8-3 8 3v14", "M8 20v-4h8v4", "M8 9h.01M12 8h.01M16 9h.01M8 13h.01M12 12h.01M16 13h.01"],
  users: ["M16 19v-1a4 4 0 0 0-8 0v1", "M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6", "M19 19v-1.2a3 3 0 0 0-2-2.8M17 6.5a2.5 2.5 0 0 1 0 5"],
  presentation: ["M4 5h16v10H4z", "M12 15v5", "M8 20h8", "M8 9h8M8 12h5"],
  layers: ["M12 4 3 9l9 5 9-5-9-5Z", "M5 12l7 4 7-4", "M5 16l7 4 7-4"],
  door: ["M6 20V5l10-2v17", "M10 12h.01", "M16 20h3V6h-3"],
  desk: ["M4 10h16", "M6 10v8", "M18 10v8", "M8 14h8", "M10 6h4"],
  spark: ["M12 3l1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z", "M5 16l-1 3M19 16l1 3"],
  wifi: ["M5 9a10 10 0 0 1 14 0", "M8 12a6 6 0 0 1 8 0", "M11 15a2 2 0 0 1 2 0", "M12 19h.01"],
  printer: ["M7 8V4h10v4", "M6 17H4v-7h16v7h-2", "M7 14h10v6H7z", "M17 12h.01"],
  meeting: ["M4 5h16v10H4z", "M8 19h8", "M12 15v4", "M8 9h8"],
  coffee: ["M6 8h10v5a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4V8Z", "M16 9h1a2 2 0 0 1 0 4h-1", "M8 4v2M12 4v2M16 4v2"],
  sofa: ["M5 12V9a3 3 0 0 1 6 0v3", "M13 12V9a3 3 0 0 1 6 0v3", "M4 12h16v6H4z", "M6 18v2M18 18v2"],
  board: ["M5 5h14v10H5z", "M8 19h8", "M12 15v4", "M8 9h8M8 12h5"],
  parking: ["M7 20V4h6a4 4 0 0 1 0 8H7", "M7 12h6"],
  clock: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", "M12 7v5l3 2"],
  bolt: ["M13 2 4 14h7l-1 8 9-12h-7l1-8Z"],
  calendarCheck: ["M6 4v3M18 4v3", "M4 8h16v12H4z", "M8 13l2.5 2.5L16 11"],
  pin: ["M12 21s7-5.1 7-11a7 7 0 0 0-14 0c0 5.9 7 11 7 11Z", "M12 10h.01"],
  upload: ["M12 15V4", "M7 9l5-5 5 5", "M5 19h14"],
  chevronsDown: ["M7 7l5 5 5-5", "M7 13l5 5 5-5"],
  square: ["M5 5h14v14H5z"]
};

function Icon({ name }) {
  const paths = iconPaths[iconAliases[name] || name] || iconPaths.square;

  return (
    <svg className="partner-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {paths.map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  );
}

function Header() {
  return (
    <header className="partner-onboarding-header">
      <a href="#home" className="partner-onboarding-logo" aria-label="Joyzone bosh sahifa">
        <img src={logoImage} alt="Joyzone" />
      </a>
      <div className="partner-onboarding-actions">
        <a href="#home">Есть вопросы?</a>
        <a href="#home">Сохранить и выйти</a>
      </div>
    </header>
  );
}

function StepList() {
  const steps = [
    {
      title: "Расскажите о пространстве",
      text: "Выберите тип объекта, формат доступа, адрес и базовую вместимость.",
      mark: "01"
    },
    {
      title: "Соберите страницу объекта",
      text: "Добавьте фото, удобства, описание, правила и рабочее расписание.",
      mark: "02"
    },
    {
      title: "Опубликуйте на Joyzone",
      text: "Проверьте цену, подтвердите детали и отправьте объект на модерацию.",
      mark: "03"
    }
  ];

  return (
    <div className="partner-step-list">
      {steps.map((step) => (
        <article key={step.mark} className="partner-step-row">
          <span>{step.mark}</span>
          <div>
            <h3>{step.title}</h3>
            <p>{step.text}</p>
          </div>
          <div className="partner-step-thumb" aria-hidden="true">
            <i />
            <b />
          </div>
        </article>
      ))}
    </div>
  );
}

function WorkspaceIllustration() {
  return (
    <div className="workspace-illustration" aria-hidden="true">
      <div className="iso-floor" />
      <div className="iso-wall iso-wall-left" />
      <div className="iso-wall iso-wall-back" />
      <span className="iso-desk desk-one" />
      <span className="iso-desk desk-two" />
      <span className="iso-chair chair-one" />
      <span className="iso-chair chair-two" />
      <span className="iso-plant" />
      <span className="iso-screen" />
    </div>
  );
}

function SelectionCard({ item, active, onClick }) {
  return (
    <button type="button" className={`selection-card ${active ? "is-selected" : ""}`} onClick={onClick}>
      <span className="selection-icon" aria-hidden="true"><Icon name={item.icon || item.id} /></span>
      <span>
        <strong>{item.label}</strong>
        <small>{item.description}</small>
      </span>
    </button>
  );
}

function AddressStep({ address, setAddress, confirmed, setConfirmed }) {
  const [focused, setFocused] = useState(false);
  const suggestions = useMemo(() => {
    const query = address.trim().toLowerCase();
    if (!query) return addressSuggestions.slice(0, 3);
    return addressSuggestions.filter((item) => item.toLowerCase().includes(query)).slice(0, 4);
  }, [address]);

  return (
    <div className="address-layout">
      <div className="address-copy">
        <p className="partner-eyebrow">Адрес</p>
        <h1>Где расположено ваше пространство?</h1>
        <p>Клиенты увидят адрес только после подтверждения бронирования. Начните вводить улицу, а мы предложим варианты.</p>
      </div>

      <div className="map-card">
        <div className="map-confirm-bar">
          <button type="button" onClick={() => setConfirmed(Boolean(address.trim()))} disabled={!address.trim()}>
            {confirmed ? "Адрес подтверждён" : "Подтвердить адрес"}
          </button>
        </div>

        <label className="address-search">
          <span aria-hidden="true"><Icon name="pin" /></span>
          <input
            value={address}
            onChange={(event) => {
              setAddress(event.target.value);
              setConfirmed(false);
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => window.setTimeout(() => setFocused(false), 120)}
            placeholder="Введите адрес"
          />
        </label>

        {focused && suggestions.length > 0 ? (
          <div className="address-suggestions">
            {suggestions.map((item) => (
              <button
                type="button"
                key={item}
                onClick={() => {
                  setAddress(item);
                  setConfirmed(true);
                  setFocused(false);
                }}
              >
                {item}
              </button>
            ))}
          </div>
        ) : null}

        <div className="minimal-map" aria-label="Минималистичная карта">
          <span className="map-road road-one" />
          <span className="map-road road-two" />
          <span className="map-road road-three" />
          <span className="map-road road-four" />
          <span className="map-block block-one" />
          <span className="map-block block-two" />
          <span className="map-block block-three" />
          <span className="map-label label-one">Toshkent</span>
          <span className="map-label label-two">Chilonzor</span>
          <span className="map-label label-three">Yakkasaroy</span>
          <span className={`map-pin ${confirmed ? "is-confirmed" : ""}`} />
          <div className="map-controls" aria-hidden="true">
            <button type="button">+</button>
            <button type="button">−</button>
          </div>
          <div className="map-toast">Передвиньте карту или подтвердите адрес выше</div>
        </div>
      </div>
    </div>
  );
}

function CounterRow({ label, value, onChange }) {
  return (
    <div className="counter-row">
      <span>{label}</span>
      <div className="counter-controls">
        <button type="button" onClick={() => onChange(Math.max(0, value - 1))} aria-label={`Уменьшить ${label}`}>−</button>
        <strong>{value}</strong>
        <button type="button" onClick={() => onChange(value + 1)} aria-label={`Увеличить ${label}`}>+</button>
      </div>
    </div>
  );
}

function DetailsIllustration() {
  return (
    <div className="details-illustration" aria-hidden="true">
      <span className="details-plane" />
      <span className="details-panel panel-left" />
      <span className="details-panel panel-right" />
      <span className="details-card card-a" />
      <span className="details-card card-b" />
      <span className="details-dot dot-a" />
      <span className="details-dot dot-b" />
      <span className="details-line line-a" />
      <span className="details-line line-b" />
    </div>
  );
}

function AmenitiesStep({ selected, onToggle }) {
  return (
    <div className="details-section-layout">
      <div className="details-section-head">
        <p className="partner-eyebrow">Удобства</p>
        <h1>Какие возможности есть в пространстве?</h1>
        <p>Выберите ключевые удобства, которые помогают резидентам работать комфортно и без лишних уточнений.</p>
      </div>
      <div className="amenities-grid">
        {amenityOptions.map((item) => (
          <button
            type="button"
            key={item.id}
            className={`amenity-card ${selected.includes(item.id) ? "is-selected" : ""}`}
            onClick={() => onToggle(item.id)}
          >
            <span aria-hidden="true"><Icon name={item.icon} /></span>
            <strong>{item.label}</strong>
          </button>
        ))}
      </div>
    </div>
  );
}

function PhotoUploadStep({ photos, setPhotos }) {
  const [dragging, setDragging] = useState(false);
  const [draggedId, setDraggedId] = useState(null);

  const addFiles = (fileList) => {
    const files = Array.from(fileList || []).filter((file) => file.type.startsWith("image/"));
    if (files.length === 0) return;
    setPhotos((current) => [
      ...current,
      ...files.map((file) => ({
        id: `${file.name}-${file.lastModified}-${globalThis.crypto?.randomUUID?.() || Math.random()}`,
        name: file.name,
        url: URL.createObjectURL(file)
      }))
    ]);
  };

  const movePhoto = (id, direction) => {
    setPhotos((current) => {
      const index = current.findIndex((photo) => photo.id === id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  const dropOnPhoto = (targetId) => {
    if (!draggedId || draggedId === targetId) return;
    setPhotos((current) => {
      const fromIndex = current.findIndex((photo) => photo.id === draggedId);
      const toIndex = current.findIndex((photo) => photo.id === targetId);
      if (fromIndex < 0 || toIndex < 0) return current;
      const next = [...current];
      const [item] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      return next;
    });
    setDraggedId(null);
  };

  return (
    <div className="details-section-layout photo-layout">
      <div className="details-section-head">
        <p className="partner-eyebrow">Фотографии</p>
        <h1>Загрузите фотографии пространства</h1>
        <p>Перетащите изображения в зону загрузки. После загрузки карточки можно перетаскивать, чтобы изменить порядок.</p>
      </div>

      <label
        className={`photo-dropzone ${dragging ? "is-dragging" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          addFiles(event.dataTransfer.files);
        }}
      >
        <input type="file" accept="image/*" multiple onChange={(event) => addFiles(event.target.files)} />
        <span className="photo-drop-icon" aria-hidden="true"><Icon name="upload" /></span>
        <strong>{photos.length ? "Добавить ещё фотографии" : "Перетащите фото сюда"}</strong>
        <small>PNG, JPG или WEBP. Лучше использовать светлые снимки рабочих зон.</small>
      </label>

      {photos.length > 0 ? (
        <div className="photo-grid">
          {photos.map((photo, index) => (
            <article
              key={photo.id}
              className="photo-tile"
              draggable
              onDragStart={() => setDraggedId(photo.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => dropOnPhoto(photo.id)}
            >
              <img src={photo.url} alt={photo.name} />
              <div className="photo-tile-meta">
                <span>{index === 0 ? "Обложка" : `Фото ${index + 1}`}</span>
                <div>
                  <button type="button" onClick={() => movePhoto(photo.id, -1)} disabled={index === 0} aria-label="Переместить раньше">↑</button>
                  <button type="button" onClick={() => movePhoto(photo.id, 1)} disabled={index === photos.length - 1} aria-label="Переместить позже">↓</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function TagsStep({ selected, onToggle }) {
  return (
    <div className="details-section-layout tags-layout">
      <div className="details-section-head">
        <p className="partner-eyebrow">Особенности</p>
        <h1>Что выделяет ваше пространство?</h1>
        <p>Выберите несколько коротких тегов. Они помогут быстро передать атмосферу объекта.</p>
      </div>
      <div className="feature-pill-grid">
        {featureTags.map((tag) => (
          <button type="button" key={tag} className={selected.includes(tag) ? "is-selected" : ""} onClick={() => onToggle(tag)}>
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
}

function TextDetailStep({ type, value, onChange }) {
  const isTitle = type === "title";
  const maxLength = isTitle ? 50 : 500;
  const label = isTitle ? "Название" : "Описание";
  const heading = isTitle ? "Придумайте название пространства" : "Составьте описание";
  const description = isTitle
    ? "Короткое название поможет резидентам быстро понять формат и настроение объекта."
    : "Опишите рабочую атмосферу, удобства и кому особенно подойдёт это пространство.";

  return (
    <div className="text-detail-layout">
      <div className="details-section-head">
        <p className="partner-eyebrow">{label}</p>
        <h1>{heading}</h1>
        <p>{description}</p>
      </div>
      <label className="linear-field">
        <span>{label}</span>
        {isTitle ? (
          <input value={value} maxLength={maxLength} onChange={(event) => onChange(event.target.value)} placeholder="Например: Светлый офис у метро" />
        ) : (
          <textarea value={value} maxLength={maxLength} onChange={(event) => onChange(event.target.value)} placeholder="Опишите планировку, удобства, тишину, доступ и кому подходит объект." />
        )}
        <small>{value.length}/{maxLength}</small>
      </label>
    </div>
  );
}

function PublishIllustration() {
  return (
    <div className="publish-illustration" aria-hidden="true">
      <span className="publish-base" />
      <span className="publish-tower tower-a" />
      <span className="publish-tower tower-b" />
      <span className="publish-tower tower-c" />
      <span className="publish-glow" />
      <span className="publish-check">✓</span>
    </div>
  );
}

function BookingModeStep({ value, onChange }) {
  return (
    <div className="booking-layout">
      <div className="details-section-head">
        <p className="partner-eyebrow">Бронирование</p>
        <h1>Выберите параметры бронирования</h1>
        <p>Настройки можно менять в любой момент после публикации.</p>
      </div>
      <div className="booking-card-list">
        {bookingOptions.map((option) => (
          <button
            type="button"
            key={option.id}
            className={`booking-card ${value === option.id ? "is-selected" : ""}`}
            onClick={() => onChange(option.id)}
          >
            <span aria-hidden="true"><Icon name={option.id} /></span>
            <strong>{option.label}</strong>
            <small>{option.description}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

function PricingStep({ price, setPrice, period, setPeriod, surcharge, setSurcharge }) {
  const guestPrice = Math.round(Number(price || 0) * 1.12);

  return (
    <div className="pricing-layout">
      <div className="details-section-head">
        <p className="partner-eyebrow">Цена</p>
        <h1>Установите базовую цену</h1>
        <p>Укажите тариф для выбранного периода. Комиссии и налоги можно уточнить позже.</p>
      </div>

      <label className="price-input-wrap">
        <span>UZS</span>
        <input value={price} inputMode="numeric" onChange={(event) => setPrice(event.target.value.replace(/[^\d]/g, "").slice(0, 9))} />
      </label>

      <div className="period-selector" aria-label="Период цены">
        {pricePeriods.map((item) => (
          <button type="button" key={item} className={period === item ? "is-selected" : ""} onClick={() => setPeriod(item)}>
            {item}
          </button>
        ))}
      </div>

      <p className="guest-price">Цена для резидента: {guestPrice.toLocaleString("ru-RU")} сум {period}</p>

      <label className="surcharge-toggle">
        <span>
          <strong>Надбавка за нерабочие часы/выходные</strong>
          <small>Применять повышенный тариф для вечерних часов и выходных дней.</small>
        </span>
        <input type="checkbox" checked={surcharge} onChange={(event) => setSurcharge(event.target.checked)} />
        <i aria-hidden="true" />
      </label>
    </div>
  );
}

function DiscountStep({ selected, onToggle }) {
  return (
    <div className="details-section-layout discount-layout">
      <div className="details-section-head">
        <p className="partner-eyebrow">Скидки</p>
        <h1>Добавьте скидки</h1>
        <p>Скидки можно отключить позже. Они помогают быстрее привлечь первых резидентов.</p>
      </div>
      <div className="discount-card-list">
        {discountOptions.map((item) => (
          <label key={item.id} className={`discount-card ${selected.includes(item.id) ? "is-selected" : ""}`}>
            <input type="checkbox" checked={selected.includes(item.id)} onChange={() => onToggle(item.id)} />
            <span>{item.value}</span>
            <strong>{item.label}</strong>
            <small>{item.description}</small>
            <i aria-hidden="true">✓</i>
          </label>
        ))}
      </div>
    </div>
  );
}

function SecurityStep({ selected, onToggle }) {
  return (
    <div className="security-layout">
      <div className="details-section-head">
        <p className="partner-eyebrow">Безопасность</p>
        <h1>Сведения о безопасности и доступе</h1>
        <p>Отметьте всё, что есть в пространстве или на территории объекта.</p>
      </div>
      <div className="security-list">
        {securityOptions.map((item) => (
          <label key={item} className={selected.includes(item) ? "is-selected" : ""}>
            <span>{item}</span>
            <input type="checkbox" checked={selected.includes(item)} onChange={() => onToggle(item)} />
            <i aria-hidden="true" />
          </label>
        ))}
      </div>
    </div>
  );
}

function LegalStep({ details, setDetails }) {
  const update = (key, value) => setDetails((current) => ({ ...current, [key]: value }));

  return (
    <div className="legal-layout">
      <div className="details-section-head">
        <p className="partner-eyebrow">Юридические детали</p>
        <h1>Укажите оставшиеся детали</h1>
        <p>Эти данные помогают соблюдать финансовые правила и не показываются резидентам.</p>
      </div>

      <div className="legal-form-grid">
        <label>
          <span>Страна</span>
          <input value={details.country} onChange={(event) => update("country", event.target.value)} />
        </label>
        <label>
          <span>Город</span>
          <input value={details.city} onChange={(event) => update("city", event.target.value)} />
        </label>
        <label>
          <span>Индекс</span>
          <input value={details.zip} onChange={(event) => update("zip", event.target.value)} placeholder="Например: 100000" />
        </label>
      </div>

      <div className="legal-radio-group">
        <p>Как вы сдаёте пространство?</p>
        <label className={details.ownerType === "person" ? "is-selected" : ""}>
          <input type="radio" name="ownerType" checked={details.ownerType === "person"} onChange={() => update("ownerType", "person")} />
          <span>Я сдаю пространство как частное лицо</span>
        </label>
        <label className={details.ownerType === "company" ? "is-selected" : ""}>
          <input type="radio" name="ownerType" checked={details.ownerType === "company"} onChange={() => update("ownerType", "company")} />
          <span>Я представляю компанию (юр. лицо)</span>
        </label>
      </div>
    </div>
  );
}

function BottomNav({ step, maxStep, canContinue, onBack, onNext }) {
  return (
    <footer className="partner-bottom-nav">
      <div className="partner-progress" aria-hidden="true">
        {Array.from({ length: maxStep + 1 }, (_, index) => (
          <span key={index} className={index <= step ? "is-active" : ""} />
        ))}
      </div>
      <div className="partner-bottom-actions">
        <button type="button" className="partner-back" onClick={onBack}>{step === 0 ? "Выйти" : "Назад"}</button>
        <button type="button" className={`partner-next ${step === maxStep ? "is-publish" : ""}`} disabled={!canContinue} onClick={onNext}>
          {step === maxStep ? "Опубликовать объявление" : step === 0 ? "Начать" : "Далее"}
        </button>
      </div>
    </footer>
  );
}

export default function PartnerOnboarding() {
  const [step, setStep] = useState(0);
  const [objectType, setObjectType] = useState("office");
  const [accessType, setAccessType] = useState("whole");
  const [address, setAddress] = useState("");
  const [addressConfirmed, setAddressConfirmed] = useState(false);
  const [counters, setCounters] = useState(initialCounters);
  const [amenities, setAmenities] = useState(["wifi", "meeting"]);
  const [photos, setPhotos] = useState([]);
  const [tags, setTags] = useState(["Тихая зона"]);
  const [spaceTitle, setSpaceTitle] = useState("");
  const [spaceDescription, setSpaceDescription] = useState("");
  const [bookingMode, setBookingMode] = useState("request");
  const [price, setPrice] = useState("250000");
  const [pricePeriod, setPricePeriod] = useState("за день");
  const [surcharge, setSurcharge] = useState(false);
  const [discounts, setDiscounts] = useState(["first"]);
  const [security, setSecurity] = useState(["Доступ 24/7"]);
  const [showScrollHint, setShowScrollHint] = useState(false);
  const [legalDetails, setLegalDetails] = useState({
    country: "Узбекистан",
    city: "Ташкент",
    zip: "",
    ownerType: "person"
  });
  const photosRef = useRef([]);
  const screenRef = useRef(null);
  const transitionDirection = useRef(1);
  const maxStep = 17;

  const canContinue =
    (step !== 4 || addressConfirmed) &&
    (step !== 8 || photos.length > 0) &&
    (step !== 10 || spaceTitle.trim().length > 0) &&
    (step !== 11 || spaceDescription.trim().length > 0) &&
    (step !== 14 || Number(price) > 0) &&
    (step !== 17 || Boolean(legalDetails.country.trim() && legalDetails.city.trim() && legalDetails.zip.trim() && legalDetails.ownerType));

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(() => {
    return () => {
      photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.url));
    };
  }, []);

  useEffect(() => {
    const updateScrollHint = () => {
      const hasOverflow = document.documentElement.scrollHeight > window.innerHeight + 16;
      const isNearBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 18;
      setShowScrollHint(hasOverflow && !isNearBottom);
    };

    const frame = window.requestAnimationFrame(updateScrollHint);
    window.addEventListener("resize", updateScrollHint);
    window.addEventListener("scroll", updateScrollHint, { passive: true });

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateScrollHint);
      window.removeEventListener("scroll", updateScrollHint);
    };
  }, [step, photos.length]);

  useEffect(() => {
    const screen = screenRef.current;
    if (!screen) return undefined;

    const direction = transitionDirection.current;
    if (window.scrollY > 0) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    const animatedItems = gsap.utils.toArray(
      screen.querySelectorAll(
        [
          ".partner-eyebrow",
          "h1",
          "p",
          ".partner-step-row",
          ".selection-card",
          ".address-search",
          ".map-card",
          ".counter-row",
          ".details-section-head",
          ".amenity-card",
          ".photo-dropzone",
          ".photo-tile",
          ".feature-pill-grid button",
          ".linear-field",
          ".booking-card",
          ".price-input-wrap",
          ".period-selector",
          ".surcharge-toggle",
          ".discount-card",
          ".security-list label",
          ".legal-form-grid label",
          ".legal-radio-group label"
        ].join(", ")
      )
    );
    const structurePieces = gsap.utils.toArray(
      screen.querySelectorAll(
        [
          ".workspace-illustration .iso-floor",
          ".workspace-illustration .iso-wall",
          ".workspace-illustration .iso-desk",
          ".workspace-illustration .iso-chair",
          ".workspace-illustration .iso-plant",
          ".workspace-illustration .iso-screen",
          ".details-illustration span",
          ".publish-illustration span"
        ].join(", ")
      )
    );

    const ctx = gsap.context(() => {
      gsap.fromTo(
        screen,
        {
          autoAlpha: 0,
          x: direction * 32,
          y: 12,
          scale: 0.986,
          filter: "blur(12px)"
        },
        {
          autoAlpha: 1,
          x: 0,
          y: 0,
          scale: 1,
          filter: "blur(0px)",
          duration: 0.58,
          ease: "expo.out",
          clearProps: "filter"
        }
      );

      if (animatedItems.length > 0) {
        gsap.fromTo(
          animatedItems,
          { autoAlpha: 0, y: 18, filter: "blur(8px)" },
          {
            autoAlpha: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 0.5,
            stagger: { each: 0.035, from: "start" },
            delay: 0.08,
            ease: "power3.out",
            clearProps: "filter"
          }
        );
      }

      if (structurePieces.length > 0) {
        gsap.fromTo(
          structurePieces,
          {
            autoAlpha: 0,
            filter: "blur(10px)",
            clipPath: "inset(18% round 18px)"
          },
          {
            autoAlpha: 1,
            filter: "blur(0px)",
            clipPath: "inset(0% round 0px)",
            duration: 0.72,
            stagger: 0.045,
            delay: 0.12,
            ease: "power3.out",
            clearProps: "filter,clipPath"
          }
        );
      }
    }, screen);

    return () => ctx.revert();
  }, [step]);

  const updateCounter = (key, value) => {
    setCounters((current) => ({ ...current, [key]: value }));
  };

  const toggleAmenity = (id) => {
    setAmenities((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const toggleTag = (tag) => {
    setTags((current) => (current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]));
  };

  const toggleDiscount = (id) => {
    setDiscounts((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const toggleSecurity = (item) => {
    setSecurity((current) => (current.includes(item) ? current.filter((value) => value !== item) : [...current, item]));
  };

  const goBack = () => {
    if (step === 0) {
      window.location.hash = "#home";
      return;
    }
    transitionDirection.current = -1;
    setStep((current) => current - 1);
  };

  const goNext = () => {
    if (step === maxStep) {
      window.location.hash = "#home";
      return;
    }
    transitionDirection.current = 1;
    if (canContinue) setStep((current) => current + 1);
  };

  return (
    <main className="partner-onboarding-page">
      <Header />

      <section ref={screenRef} className={`partner-onboarding-screen screen-${step}`}>
        {step === 0 ? (
          <div className="partner-intro-grid">
            <div>
              <p className="partner-eyebrow">Joyzone для партнёров</p>
              <h1>Добавьте ваше пространство на «Жойзон» за 3 шага</h1>
            </div>
            <StepList />
          </div>
        ) : null}

        {step === 1 ? (
          <div className="step-intro-grid">
            <div>
              <p className="partner-eyebrow">Шаг 1</p>
              <h1>Расскажите о вашем пространстве</h1>
              <p>Сначала уточним тип объекта, формат доступа, адрес и базовую вместимость. Эти данные помогут клиентам быстрее понять, подходит ли им ваш офис.</p>
            </div>
            <WorkspaceIllustration />
          </div>
        ) : null}

        {step === 2 ? (
          <div className="selection-layout">
            <p className="partner-eyebrow">Тип объекта</p>
            <h1>Что вы хотите разместить на Joyzone?</h1>
            <div className="object-type-grid">
              {objectTypes.map((item) => (
                <SelectionCard key={item.id} item={item} active={objectType === item.id} onClick={() => setObjectType(item.id)} />
              ))}
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="selection-layout access-layout">
            <p className="partner-eyebrow">Тип доступа</p>
            <h1>Как гости будут пользоваться объектом?</h1>
            <div className="access-type-list">
              {accessTypes.map((item) => (
                <SelectionCard key={item.id} item={item} active={accessType === item.id} onClick={() => setAccessType(item.id)} />
              ))}
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <AddressStep address={address} setAddress={setAddress} confirmed={addressConfirmed} setConfirmed={setAddressConfirmed} />
        ) : null}

        {step === 5 ? (
          <div className="info-layout">
            <div>
              <p className="partner-eyebrow">Основная информация</p>
              <h1>Добавьте базовые параметры офиса</h1>
              <p>Детали, удобства и фотографии вы сможете добавить позже.</p>
            </div>
            <div className="counter-list">
              <CounterRow label="Рабочие места" value={counters.workplaces} onChange={(value) => updateCounter("workplaces", value)} />
              <CounterRow label="Кабинеты" value={counters.cabinets} onChange={(value) => updateCounter("cabinets", value)} />
              <CounterRow label="Столы" value={counters.desks} onChange={(value) => updateCounter("desks", value)} />
              <CounterRow label="Туалеты" value={counters.restrooms} onChange={(value) => updateCounter("restrooms", value)} />
            </div>
          </div>
        ) : null}

        {step === 6 ? (
          <div className="step-intro-grid">
            <div>
              <p className="partner-eyebrow">Шаг 2</p>
              <h1>Расскажите о вашем пространстве</h1>
              <p>Добавьте удобства, фотографии и описание, чтобы привлечь резидентов.</p>
            </div>
            <DetailsIllustration />
          </div>
        ) : null}

        {step === 7 ? (
          <AmenitiesStep selected={amenities} onToggle={toggleAmenity} />
        ) : null}

        {step === 8 ? (
          <PhotoUploadStep photos={photos} setPhotos={setPhotos} />
        ) : null}

        {step === 9 ? (
          <TagsStep selected={tags} onToggle={toggleTag} />
        ) : null}

        {step === 10 ? (
          <TextDetailStep type="title" value={spaceTitle} onChange={setSpaceTitle} />
        ) : null}

        {step === 11 ? (
          <TextDetailStep type="description" value={spaceDescription} onChange={setSpaceDescription} />
        ) : null}

        {step === 12 ? (
          <div className="step-intro-grid">
            <div>
              <p className="partner-eyebrow">Шаг 3</p>
              <h1>Завершите и опубликуйте объявление</h1>
              <p>Настройте тарифы, правила доступа и опубликуйте ваше пространство.</p>
            </div>
            <PublishIllustration />
          </div>
        ) : null}

        {step === 13 ? (
          <BookingModeStep value={bookingMode} onChange={setBookingMode} />
        ) : null}

        {step === 14 ? (
          <PricingStep price={price} setPrice={setPrice} period={pricePeriod} setPeriod={setPricePeriod} surcharge={surcharge} setSurcharge={setSurcharge} />
        ) : null}

        {step === 15 ? (
          <DiscountStep selected={discounts} onToggle={toggleDiscount} />
        ) : null}

        {step === 16 ? (
          <SecurityStep selected={security} onToggle={toggleSecurity} />
        ) : null}

        {step === 17 ? (
          <LegalStep details={legalDetails} setDetails={setLegalDetails} />
        ) : null}
      </section>

      {showScrollHint ? (
        <button type="button" className="partner-scroll-hint" onClick={() => window.scrollBy({ top: 320, behavior: "smooth" })}>
          <Icon name="chevronsDown" />
          <span>Есть еще ниже</span>
        </button>
      ) : null}

      <BottomNav step={step} maxStep={maxStep} canContinue={canContinue} onBack={goBack} onNext={goNext} />
    </main>
  );
}
