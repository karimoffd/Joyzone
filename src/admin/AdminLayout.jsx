import React, { useState } from "react";

const NAV = [
  {
    section: "Главное",
    items: [
      { id: "overview", label: "Обзор", icon: "home" },
      { id: "bookings", label: "Бронирования", icon: "calendar", badge: 3 },
      { id: "spaces", label: "Пространства", icon: "building" },
      { id: "moderation", label: "Модерация", icon: "shield", badge: null },
    ],
  },
  {
    section: "Общение",
    items: [
      { id: "messages", label: "Сообщения", icon: "chat", badge: 7 },
      { id: "reviews", label: "Отзывы", icon: "star" },
    ],
  },
  {
    section: "Аналитика",
    items: [
      { id: "users", label: "Пользователи", icon: "users" },
      { id: "finance", label: "Финансы", icon: "money" },
    ],
  },
  {
    section: "Платформа",
    items: [
      { id: "tariffs", label: "Тарифы", icon: "layers" },
      { id: "categories", label: "Категории", icon: "tag" },
      { id: "content", label: "Контент сайта", icon: "edit" },
      { id: "settings", label: "Настройки", icon: "settings" },
      { 
        id: "features_group",
        label: "Удобства",
        icon: "layers",
        subItems: [
          { id: "parameters", label: "Счетчики и характеристики" },
          { id: "amenities", label: "Список удобств" },
          { id: "discounts", label: "Скидки" },
        ]
      }
    ],
  },
];

function NavGroup({ item, page, setPage, collapsed }) {
  const isActive = item.subItems.some(sub => sub.id === page);
  const [isOpen, setIsOpen] = React.useState(isActive);

  React.useEffect(() => {
    if (collapsed) setIsOpen(false);
  }, [collapsed]);

  return (
    <div className={`adm-nav-group ${isOpen ? 'open' : ''}`}>
      <button
        className={`adm-nav-item${isActive ? " active-parent" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        style={{ marginBottom: isOpen ? '4px' : '0' }}
      >
        <span className="adm-nav-icon"><Icon name={item.icon} /></span>
        <span className="adm-nav-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          {item.label}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.2s' }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </span>
      </button>
      <div className="adm-nav-subitems" style={{ height: isOpen && !collapsed ? 'auto' : 0, overflow: 'hidden', paddingLeft: '32px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {item.subItems.map(sub => (
          <button
            key={sub.id}
            className={`adm-nav-subitem${page === sub.id ? " active" : ""}`}
            onClick={() => setPage(sub.id)}
            title={sub.label}
          >
            <span className="adm-nav-sub-dot"></span>
            <span className="adm-nav-sub-label">{sub.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Icon({ name }) {
  const icons = {
    home: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    calendar: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    building: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>,
    chat: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
    star: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    users: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    money: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
    edit: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    settings: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
    bell: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
    search: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    chevronLeft: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>,
    shield: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    layers: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
    tag: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
  };
  return icons[name] || null;
}

export { Icon };

export default function AdminLayout({ page, setPage, title, eyebrow, children }) {
  const [collapsed, setCollapsed] = useState(false);

  const userName = localStorage.getItem("joyzone-name") || "Admin";
  const initials = userName.slice(0, 2).toUpperCase();

  return (
    <div className="adm-shell">
      {/* SIDEBAR */}
      <aside className={`adm-sidebar${collapsed ? " collapsed" : ""}`}>
        <button className="adm-sidebar-toggle" onClick={() => setCollapsed(c => !c)} aria-label="Toggle sidebar">
          <Icon name="chevronLeft" />
        </button>

        {/* Logo */}
        <a className="adm-sidebar-logo" href="#home">
          <div className="adm-sidebar-logo-mark">J</div>
          <div className="adm-sidebar-logo-text">
            <strong>Joyzone</strong>
            <span>Admin Panel</span>
          </div>
        </a>

        {/* Nav */}
        <nav className="adm-nav">
          {NAV.map(section => (
            <React.Fragment key={section.section}>
              <div className="adm-nav-section-label">{section.section}</div>
              {section.items.map(item => (
                item.subItems ? (
                  <NavGroup key={item.id} item={item} page={page} setPage={setPage} collapsed={collapsed} />
                ) : (
                  <button
                    key={item.id}
                    className={`adm-nav-item${page === item.id ? " active" : ""}`}
                    onClick={() => setPage(item.id)}
                  >
                    <span className="adm-nav-icon"><Icon name={item.icon} /></span>
                    <span className="adm-nav-label">{item.label}</span>
                    {item.badge ? <span className="adm-nav-badge">{item.badge}</span> : null}
                  </button>
                )
              ))}
            </React.Fragment>
          ))}
        </nav>

        {/* User */}
        <div className="adm-sidebar-bottom">
          <div className="adm-sidebar-user" onClick={() => setPage("settings")}>
            <div className="adm-sidebar-avatar">{initials}</div>
            <div className="adm-sidebar-user-info">
              <strong>{userName}</strong>
              <span>Администратор</span>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <div className={`adm-main${collapsed ? " collapsed" : ""}`}>
        {/* Topbar */}
        <header className="adm-topbar">
          <div className="adm-topbar-left">
            <span className="adm-topbar-eyebrow">{eyebrow}</span>
            <h1 className="adm-topbar-title">{title}</h1>
          </div>
          <div className="adm-topbar-right">
            <button className="adm-topbar-btn" aria-label="Search">
              <Icon name="search" />
            </button>
            <button className="adm-topbar-btn" aria-label="Notifications">
              <Icon name="bell" />
              <span className="badge" />
            </button>
            <div className="adm-topbar-avatar" onClick={() => setPage("settings")}>{initials}</div>
          </div>
        </header>

        {/* Page Content */}
        <main className="adm-page">
          {children}
        </main>
      </div>
    </div>
  );
}
