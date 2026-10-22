import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api, { logoutSession } from "../api/client.js";
import { useVisiblePolling } from "../utils/polling.js";
import { getStorageItem, setStorageItem, STORAGE_KEYS } from "../utils/storageKeys.js";
import { Icon } from "./AdminIcons.jsx";

const COLLAPSED_KEY = STORAGE_KEYS.ui.adminSidebarCollapsed;

const NAV = [
  {
    section: "Операции",
    items: [
      { id: "overview", label: "Обзор", icon: "dashboard", hint: "Статистика и сводка" },
      { id: "bookings", label: "Бронирования", icon: "calendar", badge: "bookings", hint: "Заявки и статусы броней" },
      { id: "moderation", label: "Модерация", icon: "shield", badge: "moderation", hint: "Проверка новых мест" },
      { id: "spaces", label: "Пространства", icon: "building", hint: "Все места на платформе" },
    ],
  },
  {
    section: "Общение",
    items: [
      { id: "messages", label: "Сообщения", icon: "chat", badge: "messages", hint: "Чаты гостей и владельцев" },
      { id: "reviews", label: "Отзывы", icon: "star", hint: "Оценки и комментарии" },
    ],
  },
  {
    section: "Сайт",
    items: [
      { id: "content", label: "Контент сайта", icon: "edit", hint: "Тексты всех страниц" },
      { id: "banners", label: "Баннеры", icon: "image", hint: "Слайды на главной" },
    ],
  },
  {
    section: "Управление",
    items: [
      { id: "users", label: "Пользователи", icon: "users", hint: "Роли, профили, партнёры" },
      { id: "finance", label: "Финансы", icon: "money", hint: "Платежи и возвраты" },
      { id: "audit", label: "Журнал действий", icon: "audit", hint: "Кто и что менял" },
    ],
  },
  {
    section: "Справочники",
    items: [
      { id: "categories", label: "Категории", icon: "tag", hint: "Типы пространств" },
      { id: "amenities", label: "Удобства", icon: "sparkles", hint: "Wi‑Fi, парковка и т.д." },
      { id: "parameters", label: "Характеристики", icon: "sliders", hint: "Счётчики и параметры" },
      { id: "discounts", label: "Скидки", icon: "percent", hint: "Скидки по длительности" },
      { id: "tariffs", label: "Тарифы", icon: "layers", hint: "Тарифы партнёров" },
    ],
  },
  {
    section: "Аккаунт",
    items: [
      { id: "settings", label: "Мой профиль", icon: "settings", hint: "Фото, имя, контакты" },
    ],
  },
];

const ROLE_LABELS = { admin: "Администратор", moderator: "Модератор" };

function readCollapsed() {
  try {
    return getStorageItem(COLLAPSED_KEY) === "true";
  } catch (error) {
    return false;
  }
}

export function Avatar({ src, name, size = 40, className = "" }) {
  const words = String(name || "").replace(/[^A-Za-zА-Яа-яЁё\s]/g, "").trim().split(/\s+/).filter(Boolean);
  const initials = words.map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "JZ";
  return (
    <span className={`adm-avatar ${className}`} style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}>
      {src ? <img src={src} alt={name || ""} /> : initials}
    </span>
  );
}

function useAdminBadges(enabled) {
  const [badges, setBadges] = useState({});
  const load = useCallback(async () => {
    try {
      const response = await api.get("/api/admin/badges/");
      setBadges(response.data || {});
    } catch (error) {
      // Badges are decorative; the pages themselves report API errors.
    }
  }, []);
  useEffect(() => {
    if (enabled) load();
  }, [enabled, load]);
  useVisiblePolling(load, 60000, { enabled });
  return badges;
}

function CommandPalette({ items, onSelect, onClose }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const results = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return items;
    return items.filter((item) => `${item.label} ${item.hint} ${item.section}`.toLowerCase().includes(value));
  }, [items, query]);

  useEffect(() => inputRef.current?.focus(), []);
  useEffect(() => setActive(0), [query]);

  const handleKeyDown = (event) => {
    if (event.key === "Escape") onClose();
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => Math.min(index + 1, results.length - 1));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    }
    if (event.key === "Enter" && results[active]) onSelect(results[active].id);
  };

  return (
    <div className="adm-palette-backdrop" onMouseDown={onClose}>
      <div className="adm-palette" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-label="Поиск раздела">
        <div className="adm-palette-input">
          <Icon name="search" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Куда перейти? Например: отзывы, баннеры…"
          />
          <kbd>Esc</kbd>
        </div>
        <div className="adm-palette-list">
          {results.length === 0 ? <p className="adm-palette-empty">Ничего не найдено</p> : results.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={index === active ? "is-active" : ""}
              onMouseEnter={() => setActive(index)}
              onClick={() => onSelect(item.id)}
            >
              <span className="adm-palette-icon"><Icon name={item.icon} /></span>
              <span className="adm-palette-text">
                <strong>{item.label}</strong>
                <small>{item.hint}</small>
              </span>
              <span className="adm-palette-section">{item.section}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function AttentionMenu({ badges, allowedPages, setPage, onClose }) {
  const rows = [
    { id: "moderation", count: badges.moderation, label: "мест ждут модерации", icon: "shield" },
    { id: "bookings", count: badges.bookings, label: "броней ждут подтверждения", icon: "calendar" },
    { id: "messages", count: badges.messages, label: "непрочитанных чатов", icon: "chat" },
  ].filter((row) => allowedPages.includes(row.id));
  const hasWork = rows.some((row) => row.count > 0);

  return (
    <div className="adm-attention-menu" role="menu">
      <div className="adm-attention-head">
        <strong>Требует внимания</strong>
        <small>{hasWork ? "Есть задачи" : "Всё под контролем"}</small>
      </div>
      {rows.map((row) => (
        <button
          key={row.id}
          type="button"
          className={row.count > 0 ? "has-count" : ""}
          onClick={() => { setPage(row.id); onClose(); }}
        >
          <span className="adm-attention-icon"><Icon name={row.icon} /></span>
          <span><b>{row.count || 0}</b> {row.label}</span>
          <Icon name="chevronRight" />
        </button>
      ))}
    </div>
  );
}

export default function AdminLayout({ page, setPage, title, eyebrow, allowedPages, profile, children }) {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [attentionOpen, setAttentionOpen] = useState(false);
  const badges = useAdminBadges(true);
  const attentionRef = useRef(null);

  const userName = profile?.full_name || getStorageItem(STORAGE_KEYS.profile.name, "Admin");
  const isAdmin = profile?.role === "admin" || profile?.is_staff || profile?.is_superuser;
  const roleLabel = isAdmin ? ROLE_LABELS.admin : ROLE_LABELS.moderator;
  const attentionTotal = ["moderation", "bookings", "messages"]
    .filter((id) => allowedPages.includes(id))
    .reduce((sum, id) => sum + (Number(badges[id]) || 0), 0);

  const visibleNav = useMemo(() => NAV
    .map((section) => ({ ...section, items: section.items.filter((item) => allowedPages.includes(item.id)) }))
    .filter((section) => section.items.length > 0), [allowedPages]);
  const paletteItems = useMemo(
    () => visibleNav.flatMap((section) => section.items.map((item) => ({ ...item, section: section.section }))),
    [visibleNav],
  );

  const toggleCollapsed = () => {
    setCollapsed((value) => {
      try { setStorageItem(COLLAPSED_KEY, String(!value)); } catch (error) { /* preference only */ }
      return !value;
    });
  };

  const goTo = (id) => {
    setPage(id);
    setMobileOpen(false);
    setPaletteOpen(false);
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!attentionOpen) return undefined;
    const handleClick = (event) => {
      if (!attentionRef.current?.contains(event.target)) setAttentionOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [attentionOpen]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const handleLogout = async () => {
    await logoutSession();
    window.location.assign("/");
  };

  return (
    <div className={`adm-shell${collapsed ? " is-collapsed" : ""}${mobileOpen ? " is-mobile-open" : ""}`}>
      <aside className="adm-sidebar" aria-label="Меню админки">
        <div className="adm-side-head">
          <a className="adm-side-brand" href="/" title="Открыть сайт">
            <span className="adm-side-logo">J</span>
            <span className="adm-side-brand-text">
              <strong>Joyzone</strong>
              <small>{isAdmin ? "Admin" : "Moderator"} panel</small>
            </span>
          </a>
          <button type="button" className="adm-side-collapse" onClick={toggleCollapsed} aria-label={collapsed ? "Развернуть меню" : "Свернуть меню"}>
            <Icon name="sidebar" />
          </button>
          <button type="button" className="adm-side-close" onClick={() => setMobileOpen(false)} aria-label="Закрыть меню">
            <Icon name="x" />
          </button>
        </div>

        <button type="button" className="adm-side-search" onClick={() => setPaletteOpen(true)} title="Поиск раздела (Ctrl+K)">
          <Icon name="search" />
          <span>Поиск раздела</span>
          <kbd>Ctrl K</kbd>
        </button>

        <nav className="adm-nav">
          {visibleNav.map((section) => (
            <div className="adm-nav-section" key={section.section}>
              <div className="adm-nav-section-label">{section.section}</div>
              {section.items.map((item) => {
                const count = item.badge ? Number(badges[item.badge]) || 0 : 0;
                return (
                  <button
                    key={item.id}
                    type="button"
                    data-testid={`admin-nav-${item.id}`}
                    className={`adm-nav-item${page === item.id ? " active" : ""}`}
                    onClick={() => goTo(item.id)}
                    title={collapsed ? item.label : item.hint}
                    aria-current={page === item.id ? "page" : undefined}
                  >
                    <span className="adm-nav-icon"><Icon name={item.icon} /></span>
                    <span className="adm-nav-label">{item.label}</span>
                    {count > 0 ? <span className="adm-nav-badge">{count > 99 ? "99+" : count}</span> : null}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="adm-side-foot">
          <button type="button" className="adm-side-user" onClick={() => goTo("settings")} title="Мой профиль">
            <Avatar src={profile?.avatar} name={userName} size={38} />
            <span className="adm-side-user-info">
              <strong>{userName}</strong>
              <small><i className={isAdmin ? "is-admin" : "is-moderator"} />{roleLabel}</small>
            </span>
          </button>
          <div className="adm-side-actions">
            <a href="/" className="adm-side-action" title="На сайт"><Icon name="external" /><span>На сайт</span></a>
            <button type="button" className="adm-side-action is-danger" onClick={handleLogout} title="Выйти"><Icon name="logout" /><span>Выйти</span></button>
          </div>
        </div>
      </aside>
      <div className="adm-backdrop" onClick={() => setMobileOpen(false)} aria-hidden="true" />

      <div className="adm-main">
        <header className="adm-topbar">
          <button type="button" className="adm-topbar-btn adm-burger" onClick={() => setMobileOpen(true)} aria-label="Открыть меню">
            <Icon name="menu" />
          </button>
          <div className="adm-topbar-left">
            <span className="adm-topbar-eyebrow">{eyebrow}</span>
            <h1 className="adm-topbar-title">{title}</h1>
          </div>
          <div className="adm-topbar-right">
            <button type="button" className="adm-topbar-search" onClick={() => setPaletteOpen(true)}>
              <Icon name="search" />
              <span>Поиск…</span>
              <kbd>Ctrl K</kbd>
            </button>
            <div className="adm-attention" ref={attentionRef}>
              <button
                type="button"
                className={`adm-topbar-btn${attentionOpen ? " is-open" : ""}`}
                onClick={() => setAttentionOpen((open) => !open)}
                aria-label="Задачи"
              >
                <Icon name="bell" />
                {attentionTotal > 0 ? <span className="adm-topbar-count">{attentionTotal > 99 ? "99+" : attentionTotal}</span> : null}
              </button>
              {attentionOpen ? (
                <AttentionMenu badges={badges} allowedPages={allowedPages} setPage={goTo} onClose={() => setAttentionOpen(false)} />
              ) : null}
            </div>
            <button type="button" className="adm-topbar-profile" onClick={() => goTo("settings")} title="Мой профиль">
              <Avatar src={profile?.avatar} name={userName} size={36} />
            </button>
          </div>
        </header>

        <main className="adm-page">
          {children}
        </main>
      </div>

      {paletteOpen ? <CommandPalette items={paletteItems} onSelect={goTo} onClose={() => setPaletteOpen(false)} /> : null}
    </div>
  );
}

export { Icon };
