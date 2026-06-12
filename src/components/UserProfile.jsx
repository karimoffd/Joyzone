import React, { useMemo, useState } from "react";

import { Header as JoyNavbar } from "./HomeHero.jsx";
import { JoyFooter, PropertyCard } from "./ListingsSection.jsx";
import { propertyCards } from "../data/content.js";
import "./UserProfile.css";

const initialProfile = {
  name: "Aziz Karimov",
  role: "Founder, product jamoasi",
  city: "Toshkent",
  birthYear: "",
  languages: "Uzbek, Russian",
  email: "aziz.karimov@mail.com",
  phone: "",
  work: "Product jamoasi asoschisi",
  company: "",
  interests: "",
  about:
    "Ish uchrashuvlari va jamoa sessiyalari uchun tinch, qulay joylarni tanlayman."
};

const profileSections = [
  {
    id: "identity",
    label: "Основное",
    title: "Как вас зовут",
    description: "Имя и короткое описание будут видны в профиле.",
    fields: [
      { key: "name", label: "Имя и фамилия", type: "text", placeholder: "Aziz Karimov" },
      { key: "role", label: "Короткое описание", type: "text", placeholder: "Founder, product jamoasi" }
    ]
  },
  {
    id: "location",
    label: "Город",
    title: "Где вы находитесь",
    description: "Город помогает партнерам быстрее понимать контекст заявки.",
    fields: [
      { key: "city", label: "Город", type: "text", placeholder: "Toshkent" },
      { key: "birthYear", label: "Год рождения", type: "text", placeholder: "1996" }
    ]
  },
  {
    id: "work",
    label: "Работа",
    title: "Чем вы занимаетесь",
    description: "Это помогает подобрать формат офиса, ковиркинга или зала.",
    fields: [
      { key: "work", label: "Работа или сфера", type: "text", placeholder: "Product jamoasi asoschisi" },
      { key: "company", label: "Компания или команда", type: "text", placeholder: "Joyzone client" }
    ]
  },
  {
    id: "languages",
    label: "Языки",
    title: "На каких языках говорите",
    description: "Укажите языки через запятую.",
    fields: [
      { key: "languages", label: "Языки", type: "text", placeholder: "Uzbek, Russian, English" }
    ]
  },
  {
    id: "about",
    label: "О себе",
    title: "Расскажите о себе",
    description: "Короткий текст делает профиль понятнее и живее.",
    fields: [
      { key: "about", label: "Описание", type: "textarea", placeholder: "Расскажите, какие места вы обычно ищете..." }
    ]
  },
  {
    id: "interests",
    label: "Интересы",
    title: "Что вам интересно",
    description: "Форматы мест, которые вы чаще всего выбираете.",
    fields: [
      { key: "interests", label: "Интересы", type: "textarea", placeholder: "Kovorkinglar, workshop zallari..." }
    ]
  },
  {
    id: "contacts",
    label: "Контакты",
    title: "Контактные данные",
    description: "Используются для связи по заявкам и бронированиям.",
    fields: [
      { key: "email", label: "Email", type: "email", placeholder: "name@mail.com" },
      { key: "phone", label: "Телефон", type: "tel", placeholder: "+998 90 123 45 67" }
    ]
  }
];

const bookings = [
  {
    title: "Atlas Meeting Room",
    type: "Konferensiya zali",
    date: "12 may 2026",
    time: "10:00 - 14:00",
    location: "Toshkent, Yunusobod",
    status: "Yakunlangan",
    href: "#space-atlas-meeting-room"
  },
  {
    title: "Quiet Work Studio",
    type: "Kovorking",
    date: "28 aprel 2026",
    time: "09:00 - 18:00",
    location: "Toshkent, Mirobod",
    status: "Yakunlangan",
    href: "#space-quiet-work-studio"
  }
];

function ProfileIcon({ type }) {
  const paths = {
    edit: ["M12 20h9", "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"],
    user: ["M20 21a8 8 0 0 0-16 0", "M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z"],
    calendar: ["M7 3v4M17 3v4", "M4 8h16v13H4z", "M8 12h.01M12 12h.01M16 12h.01M8 16h.01"],
    heart: ["M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 1 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z"],
    check: ["m5 13 4 4L19 7"],
    empty: ["M4 5h16v14H4z", "M8 9h8M8 13h5"],
    arrow: ["M5 12h14", "m13 6 6 6-6 6"],
    close: ["M18 6 6 18", "M6 6l12 12"]
  };

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {(paths[type] || paths.user).map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  );
}

function EmptyState({ title, text, action, href }) {
  return (
    <div className="profile-empty-state">
      <span><ProfileIcon type="empty" /></span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action ? <a href={href}>{action}<ProfileIcon type="arrow" /></a> : null}
    </div>
  );
}

function getCompletion(data) {
  const keys = ["name", "role", "city", "birthYear", "languages", "email", "phone", "work", "company", "interests", "about"];
  const filled = keys.filter((key) => String(data[key] || "").trim()).length;
  return Math.round((filled / keys.length) * 100);
}

function UserProfile({ userState, setUserState }) {
  const [activeTab, setActiveTab] = useState("about");
  const profileData = initialProfile;
  const completion = 50;
  const likedSpaces = propertyCards;

  const tabs = [
    { id: "about", label: "Обо мне", count: `${completion}%`, icon: "user" },
    { id: "history", label: "История", count: bookings.length, icon: "calendar" },
    { id: "likes", label: "Заметки", count: likedSpaces.length, icon: "heart" }
  ];

  return (
    <main className="user-profile-shell">
      <JoyNavbar userState={userState} setUserState={setUserState} activeIndex={-1} variant="dashboard" />

      <section className="profile-unified-panel">
        <section className="profile-content-panel">
          <aside className="profile-sidebar" aria-label="Разделы профиля">
            <span>Профиль</span>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={activeTab === tab.id ? "is-active" : ""}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="profile-tab-label">
                  <ProfileIcon type={tab.icon} />
                  <b>{tab.label}</b>
                </span>
                <small>{tab.count}</small>
              </button>
            ))}
          </aside>

          <div className="profile-tab-content">
            {activeTab === "about" ? (
              <div className="profile-tab-panel" key="about">
                <section className="profile-hero-panel profile-edit-hero">
                  <div className="profile-main-card">
                    <div className="profile-avatar">AK</div>
                    <div className="profile-heading">
                      <span>Joyzone profile</span>
                      <h1>{profileData.name}</h1>
                      <p>{profileData.role}</p>
                    </div>
                    <a className="profile-edit-button" href="#profile-edit">
                      <ProfileIcon type="edit" />
                      Редактировать анкету
                    </a>
                  </div>
                </section>

                <section className="profile-questionnaire">
                  <div className="profile-completion-card profile-questionnaire-summary">
                    <div className="profile-progress-ring" style={{ "--profile-progress": `${completion}%` }}>
                      <strong>{completion}%</strong>
                    </div>
                    <div className="profile-completion-copy">
                      <span>Анкета</span>
                      <h2>Заполнить профиль</h2>
                      <p>Добавьте недостающие данные, чтобы заявки выглядели надежнее и партнеры быстрее подтверждали бронирования.</p>
                    </div>
                    <div className="profile-checklist">
                      <span className="is-done"><ProfileIcon type="check" /> Имя и контакты</span>
                      <span className="is-done"><ProfileIcon type="check" /> Город</span>
                      <span><ProfileIcon type="check" /> О себе</span>
                      <span><ProfileIcon type="check" /> Интересы</span>
                    </div>
                    <div className="profile-questionnaire-actions">
                      <a href="#profile-edit" className="profile-save-action">Начать</a>
                      <a href="#profile-edit" className="profile-cancel-action">Редактировать</a>
                    </div>
                  </div>
                </section>
              </div>
            ) : null}

            {activeTab === "history" ? (
              <div className="profile-tab-panel" key="history">
                <div className="profile-section-head">
                  <div>
                    <span>История</span>
                    <h2>Прошлые бронирования</h2>
                  </div>
                  <a href="#filter">Забронировать место</a>
                </div>

                <div className="profile-bookings-grid">
                  {bookings.map((booking) => (
                    <article key={`${booking.title}-${booking.date}`} className="profile-booking-card">
                      <div>
                        <span>{booking.status}</span>
                        <h3>{booking.title}</h3>
                        <p>{booking.type}</p>
                      </div>
                      <dl>
                        <div>
                          <dt>Дата</dt>
                          <dd>{booking.date}</dd>
                        </div>
                        <div>
                          <dt>Время</dt>
                          <dd>{booking.time}</dd>
                        </div>
                        <div>
                          <dt>Локация</dt>
                          <dd>{booking.location}</dd>
                        </div>
                      </dl>
                      <a className="profile-booking-link" href={booking.href}>
                        Открыть пространство
                        <ProfileIcon type="arrow" />
                      </a>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}

            {activeTab === "likes" ? (
              <div className="profile-tab-panel" key="likes">
                <div className="profile-section-head">
                  <div>
                    <span>Заметки</span>
                    <h2>Сохраненные пространства</h2>
                  </div>
                  <a href="#filter">Смотреть все</a>
                </div>
                <div className="profile-liked-grid">
                  {likedSpaces.map((item, index) => (
                    <PropertyCard key={`liked-${item.title}`} item={item} index={index} />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </section>

      <JoyFooter />
    </main>
  );
}

function ProfileEditFormSection({ section, draft, onDraftChange }) {
  return (
    <article className="profile-edit-section is-editing">
      <div className="profile-edit-section-head">
        <div>
          <span>{section.label}</span>
          <h3>{section.title}</h3>
          <p>{section.description}</p>
        </div>
      </div>
      <div className="profile-edit-form">
        {section.fields.map((field) => (
          <label key={field.key} className={field.type === "textarea" ? "is-wide" : ""}>
            <span>{field.label}</span>
            {field.type === "textarea" ? (
              <textarea
                value={draft[field.key] || ""}
                placeholder={field.placeholder}
                rows="4"
                onChange={(event) => onDraftChange(field.key, event.target.value)}
              />
            ) : (
              <input
                value={draft[field.key] || ""}
                type={field.type}
                placeholder={field.placeholder}
                onChange={(event) => onDraftChange(field.key, event.target.value)}
              />
            )}
          </label>
        ))}
      </div>
    </article>
  );
}

function ProfileQuestionnaireEdit({ userState, setUserState }) {
  const [draft, setDraft] = useState(initialProfile);
  const completion = useMemo(() => getCompletion(draft), [draft]);

  const updateDraft = (key, value) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const saveProfile = () => {
    window.location.hash = "#profile";
  };

  return (
    <main className="user-profile-shell profile-edit-page-shell">
      <JoyNavbar userState={userState} setUserState={setUserState} activeIndex={-1} variant="dashboard" />
      <section className="profile-unified-panel profile-editor-panel">
        <div className="profile-editor-top">
          <a href="#profile" className="profile-cancel-action">
            <ProfileIcon type="arrow" />
            Назад
          </a>
          <div>
            <span>Анкета</span>
            <h1>Редактирование профиля</h1>
            <p>Заполните только нужные блоки. После сохранения пользователь вернется в профиль.</p>
          </div>
          <div className="profile-mini-completion">
            <strong>{completion}%</strong>
            <span>заполнено</span>
          </div>
        </div>

        <div className="profile-editor-layout">
          <aside className="profile-preview-card">
            <div className="profile-preview-avatar">AK</div>
            <h3>{draft.name || "Ваш профиль"}</h3>
            <p>{draft.city || "Город"} · {draft.work || "Сфера"}</p>
            <div>
              <span>{draft.languages || "Языки"}</span>
              <span>{draft.interests || "Интересы"}</span>
            </div>
          </aside>

          <div className="profile-edit-list">
            {profileSections.map((section) => (
              <ProfileEditFormSection
                key={section.id}
                section={section}
                draft={draft}
                onDraftChange={updateDraft}
              />
            ))}
          </div>
        </div>

        <div className="profile-editor-footer">
          <a href="#profile" className="profile-cancel-action">Отмена</a>
          <button type="button" className="profile-save-action" onClick={saveProfile}>Сохранить</button>
        </div>
      </section>
    </main>
  );
}

export { ProfileQuestionnaireEdit };
export default UserProfile;
