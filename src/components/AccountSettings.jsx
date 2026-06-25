import React, { useMemo, useState } from "react";
import logoImage from "../assets/img/Logo.png";
import { SimpleFooter } from "./ListingsSection.jsx";
import "./AccountSettings.css";

const settingsSections = [
  {
    id: "personal",
    title: "Личная информация",
    description: "Данные профиля и контакты для бронирований.",
    items: [
      { key: "legalName", title: "Имя по документам", value: "Aziz Karimov", action: "Редактировать", type: "text" },
      { key: "preferredName", title: "Предпочитаемое имя", value: "", empty: "Нет данных", action: "Добавить", type: "text" },
      { key: "email", title: "Электронный адрес", value: "a***@mail.com", action: "Редактировать", type: "email" },
      {
        key: "phone",
        title: "Номер телефона",
        value: "+998 ** *** 45 67",
        note: "Нужен для связи по подтвержденным бронированиям.",
        action: "Редактировать",
        type: "tel"
      },
      { key: "identity", title: "Подтверждение личности", value: "Не начато", action: "Начать", type: "text" },
      { key: "address", title: "Адрес проживания", value: "Toshkent, Uzbekistan", action: "Редактировать", type: "text" }
    ]
  },
  {
    id: "security",
    title: "Вход и безопасность",
    description: "Пароль, вход в аккаунт и защита профиля.",
    items: [
      { key: "password", title: "Пароль", value: "Обновлен недавно", action: "Редактировать", type: "password" },
      { key: "twoFactor", title: "Двухэтапная проверка", value: "Выключено", action: "Включить", type: "text" },
      { key: "sessions", title: "Активные устройства", value: "2 устройства", action: "Посмотреть", type: "text" }
    ]
  },
  {
    id: "privacy",
    title: "Конфиденциальность",
    description: "Что видно партнерам и как используются ваши данные.",
    items: [
      { key: "profileVisibility", title: "Видимость профиля", value: "Видно после заявки", action: "Редактировать", type: "text" },
      { key: "savedSpaces", title: "Сохраненные места", value: "Только мне", action: "Редактировать", type: "text" }
    ]
  },
  {
    id: "notifications",
    title: "Уведомления",
    description: "Как Joyzone сообщает о заявках, ответах и изменениях.",
    items: [
      { key: "bookingAlerts", title: "Заявки и бронирования", value: "Email и Telegram", action: "Редактировать", type: "text" },
      { key: "marketing", title: "Рекомендации и подборки", value: "Включено", action: "Редактировать", type: "text" }
    ]
  },
  {
    id: "payments",
    title: "Платежи",
    description: "Способы оплаты и документы по бронированиям.",
    items: [
      { key: "paymentMethod", title: "Способ оплаты", value: "", empty: "Нет данных", action: "Добавить", type: "text" },
      { key: "receipts", title: "Закрывающие документы", value: "На email", action: "Редактировать", type: "text" }
    ]
  },
  {
    id: "language",
    title: "Язык и валюта",
    description: "Настройки интерфейса и отображения цен.",
    items: [
      { key: "language", title: "Язык", value: "Русский", action: "Редактировать", type: "text" },
      { key: "currency", title: "Валюта", value: "UZS", action: "Редактировать", type: "text" }
    ]
  },
  {
    id: "booking",
    title: "Разрешения на бронирование",
    description: "Кто может отправлять заявки и какие данные прикладывать.",
    items: [
      { key: "companyBooking", title: "Бронирование от компании", value: "Разрешено", action: "Редактировать", type: "text" },
      { key: "autoShare", title: "Данные для партнера", value: "После отправки заявки", action: "Редактировать", type: "text" }
    ]
  }
];

function SettingsIcon({ type }) {
  const paths = {
    personal: ["M20 21a8 8 0 0 0-16 0", "M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z"],
    security: ["M12 3 20 7v5c0 5-3.4 8.1-8 9-4.6-.9-8-4-8-9V7z", "m9 12 2 2 4-5"],
    privacy: ["M12 2s7 4 7 10-7 10-7 10-7-4-7-10 7-10 7-10Z", "M12 8v5l3 2"],
    notifications: ["M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9", "M10 21h4"],
    payments: ["M4 7h16v12H4z", "M4 11h16", "M8 15h3"],
    language: ["M4 5h9M9 3v2c0 4-2 7-5 9", "M5 9c1 3 3 5 7 6", "M13 21l4-9 4 9M15 17h4"],
    booking: ["M8 6h13", "M8 12h13", "M8 18h13", "M3 6h.01M3 12h.01M3 18h.01"],
    chevron: ["m9 18 6-6-6-6"],
    close: ["M18 6 6 18", "M6 6l12 12"]
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {(paths[type] || paths.personal).map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  );
}

function AccountSettings() {
  const [activeSectionId, setActiveSectionId] = useState("personal");
  const [editingKey, setEditingKey] = useState("");
  const [values, setValues] = useState(() => {
    const initial = {};
    settingsSections.forEach((section) => {
      section.items.forEach((item) => {
        initial[item.key] = item.value;
      });
    });
    return initial;
  });
  const [draftValue, setDraftValue] = useState("");
  const activeSection = useMemo(
    () => settingsSections.find((section) => section.id === activeSectionId) || settingsSections[0],
    [activeSectionId]
  );

  const startEditing = (item) => {
    setEditingKey(item.key);
    setDraftValue(values[item.key] || "");
  };

  const cancelEditing = () => {
    setEditingKey("");
    setDraftValue("");
  };

  const saveEditing = () => {
    setValues((current) => ({ ...current, [editingKey]: draftValue }));
    cancelEditing();
  };

  return (
    <main className="account-settings-page">
      <header className="settings-topbar">
        <a href="#home" aria-label="Joyzone home">
          <img src={logoImage} alt="Joyzone" />
        </a>
        <a className="settings-done" href="#profile">Готово</a>
      </header>

      <section className="settings-shell">
        <aside className="settings-sidebar" aria-label="Настройки аккаунта">
          <h1>Настройки аккаунта</h1>
          <div className="settings-nav-list">
            {settingsSections.map((section) => (
              <button
                key={section.id}
                type="button"
                className={activeSection.id === section.id ? "is-active" : ""}
                onClick={() => {
                  setActiveSectionId(section.id);
                  cancelEditing();
                }}
              >
                <span><SettingsIcon type={section.id} /></span>
                <b>{section.title}</b>
                <SettingsIcon type="chevron" />
              </button>
            ))}
          </div>
        </aside>

        <section className="settings-content">
          <div className="settings-content-head">
            <span>Joyzone account</span>
            <h2>{activeSection.title}</h2>
            <p>{activeSection.description}</p>
          </div>

          <div className="settings-row-list">
            {activeSection.items.map((item) => {
              const isEditing = editingKey === item.key;
              const value = values[item.key];

              return (
                <article className={`settings-row ${isEditing ? "is-editing" : ""}`} key={item.key}>
                  <div className="settings-row-copy">
                    <h3>{item.title}</h3>
                    {item.note ? <p>{item.note}</p> : null}
                    <strong className={!value ? "is-empty" : ""}>{value || item.empty || "Нет данных"}</strong>
                  </div>

                  {isEditing ? (
                    <div className="settings-edit-box">
                      <input
                        type={item.type === "password" ? "text" : item.type}
                        value={draftValue}
                        placeholder={item.empty || item.title}
                        onChange={(event) => setDraftValue(event.target.value)}
                      />
                      <div>
                        <button type="button" className="settings-save" onClick={saveEditing}>Сохранить</button>
                        <button type="button" className="settings-cancel" onClick={cancelEditing}>Отмена</button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" className="settings-row-action" onClick={() => startEditing(item)}>
                      {item.action}
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      </section>
      <SimpleFooter />
    </main>
  );
}

export default AccountSettings;
