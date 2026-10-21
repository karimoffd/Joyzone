import React from "react";
import logoImage from "../../assets/img/logoLight.png";
import { navigate } from "../../utils/router.js";

export const iconAliases = {
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
  request: "calendarCheck",
  pin: "pin",
  upload: "upload",
  chevronsDown: "chevronsDown"
};

export const iconPaths = {
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
  square: ["M5 5h14v14H5z"],
  "check-circle": ["M22 11.08V12a10 10 0 1 1-5.93-9.14", "M22 4L12 14.01l-3-3"]
};

export function Icon({ name }) {
  const paths = iconPaths[iconAliases[name] || name] || iconPaths.square;
  return (
    <svg className="partner-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {paths.map((path, idx) => <path key={idx} d={path} />)}
    </svg>
  );
}

export function Header({ profile }) {
  return (
    <header className="partner-onboarding-header">
      <a href="/" className="partner-onboarding-logo" aria-label="Joyzone bosh sahifa">
        <img src={logoImage} alt="Joyzone" />
      </a>
      
      {profile && (
        <div 
          onClick={() => { navigate("/host-tariffs"); }}
          className="header-tariff-badge-clickable"
          title="Смотреть список тарифов"
        >
          <span>
            Тариф: <strong className="tariff-name">{profile.tariff_details ? (profile.tariff_details.name_ru || profile.tariff_details.name) : "Standard (Базовый)"}</strong>
          </span>
          <span className="header-tariff-badge-divider" />
          <span>
            Лимит мест: <strong className="tariff-limit">{profile.tariff_details ? profile.tariff_details.max_places : 1}</strong>
          </span>
        </div>
      )}

      <div className="partner-onboarding-actions">
        <a href="/">Есть вопросы?</a>
        <a href="/">Выйти</a>
      </div>
    </header>
  );
}

export function SelectionCard({ item, active, onClick }) {
  return (
    <button
      type="button"
      data-testid={`onboarding-selection-${item.slug || item.id}`}
      className={`selection-card ${active ? "is-selected" : ""}`}
      onClick={onClick}
    >
      <span className="selection-icon" aria-hidden="true">
        <Icon name={item.icon || "building"} />
      </span>
      <span>
        <strong>{item.name_ru || item.name}</strong>
      </span>
    </button>
  );
}

export function CounterRow({ label, value, onChange }) {
  return (
    <div className="counter-row">
      <span>{label}</span>
      <div className="counter-controls">
        <button type="button" onClick={() => onChange(Math.max(0, value - 1))}>−</button>
        <strong>{value}</strong>
        <button type="button" onClick={() => onChange(value + 1)}>+</button>
      </div>
    </div>
  );
}
