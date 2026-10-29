import React, { useCallback, useEffect, useRef, useState } from "react";
import { PackIcon } from "./ui/iconPack.jsx";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { chatPartnerName, getStoredChats } from "../utils/chatManager.js";
import {
  canUseBackendNotifications,
  fetchNotifications,
  fetchUnreadNotificationsCount,
  markAllNotificationsRead,
  markNotificationRead,
  openNotificationTarget
} from "../utils/notificationsManager.js";
import "./FloatingNotificationBell.css";
import { useVisiblePolling } from "../utils/polling.js";

function typeLabel(type) {
  const labels = {
    place_approved: "Модерация",
    place_rejected: "Модерация",
    place_submitted: "Новая заявка",
    booking_created: "Бронирование",
    booking_paid: "Оплата",
    booking_confirmed: "Подтверждение",
    booking_cancelled: "Отмена",
    booking_blocked: "Календарь",
    tariff_activated: "Тариф",
    system: "Система"
  };
  return labels[type] || "Уведомление";
}

// Icon and colour tone per notification type.
const TYPE_LOOK = {
  place_approved: ["check", "green"],
  place_rejected: ["cancel", "red"],
  place_submitted: ["building", "orange"],
  booking_created: ["calendar", "orange"],
  booking_paid: ["wallet", "green"],
  booking_confirmed: ["check", "green"],
  booking_cancelled: ["cancel", "red"],
  booking_blocked: ["lock", "blue"],
  tariff_activated: ["star", "orange"],
};

// Wheel over the open panel scrolls only the panel's lists, never the page
// (the home page also listens to wheel events for its section snapping).
function useContainWheel(ref, active) {
  useEffect(() => {
    const panel = ref.current;
    if (!active || !panel) return undefined;
    const onWheel = (event) => {
      event.stopPropagation();
      const list = event.target.closest?.(".fnb-notifications-list");
      const canScroll = list && (event.deltaY < 0
        ? list.scrollTop > 0
        : list.scrollTop + list.clientHeight < list.scrollHeight - 1);
      if (!canScroll) event.preventDefault();
    };
    panel.addEventListener("wheel", onWheel, { passive: false });
    return () => panel.removeEventListener("wheel", onWheel);
  }, [ref, active]);
}

export function FloatingNotificationBell({ onOpenChat }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chats, setChats] = useState(() => getStoredChats());
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notificationError, setNotificationError] = useState("");
  const [authEnabled, setAuthEnabled] = useState(() => canUseBackendNotifications());
  const dropdownRef = useRef(null);
  useContainWheel(dropdownRef, isOpen);

  const unreadChats = chats.filter((chat) => chat.unread);

  const refreshNotifications = useCallback(async () => {
    if (!canUseBackendNotifications()) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      setLoading(true);
      const [items, count] = await Promise.all([
        fetchNotifications(),
        fetchUnreadNotificationsCount()
      ]);
      setNotifications(items);
      setUnreadCount(count);
      setNotificationError("");
    } catch (err) {
      console.warn("Failed to load backend notifications:", err);
      setNotifications([]);
      setUnreadCount(0);
      setNotificationError("Не удалось загрузить системные уведомления.");
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshChats = useCallback(() => {
    setChats(getStoredChats());
  }, []);

  useEffect(() => {
    const refreshAuth = () => {
      const enabled = canUseBackendNotifications();
      setAuthEnabled(enabled);
      if (enabled) {
        refreshNotifications();
      } else {
        setIsOpen(false);
        setNotifications([]);
        setUnreadCount(0);
      }
    };

    refreshNotifications();
    refreshChats();

    window.addEventListener("joyzone-auth-update", refreshAuth);
    window.addEventListener("joyzone-chat-update", refreshChats);
    window.addEventListener("storage", refreshChats);
    return () => {
      window.removeEventListener("joyzone-auth-update", refreshAuth);
      window.removeEventListener("joyzone-chat-update", refreshChats);
      window.removeEventListener("storage", refreshChats);
    };
  }, [refreshChats, refreshNotifications]);

  useEffect(() => {
    if (isOpen) refreshNotifications();
  }, [isOpen, refreshNotifications]);

  useVisiblePolling(refreshNotifications, 30000, { enabled: authEnabled });

  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      gsap.fromTo(
        dropdownRef.current,
        { y: -12, opacity: 0, scale: 0.95 },
        { y: 0, opacity: 1, scale: 1, duration: 0.3, ease: "back.out(1.4)" }
      );
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) && !e.target.closest(".fnb-bell-btn")) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  const handleNotificationClick = async (notification) => {
    if (!notification) return;

    setNotifications((current) => current.map((item) => (
      item.id === notification.id ? { ...item, isRead: true } : item
    )));
    if (!notification.isRead) {
      setUnreadCount((current) => Math.max(0, current - 1));
      await markNotificationRead(notification.id).catch((err) => {
        console.warn("Failed to mark notification as read:", err);
        setNotificationError("Не удалось отметить уведомление прочитанным.");
        refreshNotifications();
      });
    }

    setIsOpen(false);
    openNotificationTarget(notification);
  };

  const handleReadAll = async () => {
    setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
    setUnreadCount(0);
    await markAllNotificationsRead().catch((err) => {
      console.warn("Failed to mark all notifications as read:", err);
      setNotificationError("Не удалось отметить уведомления прочитанными.");
      refreshNotifications();
    });
  };

  if (!authEnabled) return null;

  return createPortal(
    <div className="fnb-container">
      <button
        type="button"
        data-testid="notification-bell"
        className={`fnb-bell-btn ${unreadCount > 0 ? "has-unread" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Уведомления"
        title="Уведомления"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && <span className="fnb-badge-count">{unreadCount}</span>}
      </button>

      {isOpen && (
        <div className="fnb-dropdown" ref={dropdownRef}>
          <div className="fnb-dropdown-header">
            <h3>Уведомления</h3>
            <span className="fnb-unread-tag">{unreadCount} новых</span>
          </div>

          <div className="fnb-actions-row">
            <span>Системные уведомления</span>
            <button type="button" onClick={handleReadAll} disabled={unreadCount === 0}>
              Прочитать все
            </button>
          </div>

          <div className="fnb-notifications-list">
            {notificationError ? (
              <div className="fnb-empty">
                <div>{notificationError}</div>
                <button type="button" className="fnb-retry-btn" onClick={refreshNotifications}>Повторить</button>
              </div>
            ) : loading && notifications.length === 0 ? (
              <div className="fnb-empty">Загрузка...</div>
            ) : notifications.length === 0 ? (
              <div className="fnb-empty">Новых системных уведомлений нет</div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  data-testid={`notification-${notification.type}-${notification.id}`}
                  className={`fnb-item tone-${(TYPE_LOOK[notification.type] || ["bell", "blue"])[1]} ${notification.isRead ? "" : "is-unread"}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <span className="fnb-item-icon">
                    <PackIcon name={(TYPE_LOOK[notification.type] || ["bell"])[0]} size={18} />
                  </span>
                  <span className="fnb-item-info">
                    <span className="fnb-item-top">
                      <small>{typeLabel(notification.type)}</small>
                      <time>{notification.time}</time>
                    </span>
                    <strong>{notification.title}</strong>
                    {notification.message ? <p>{notification.message}</p> : null}
                  </span>
                  {notification.isRead ? null : <i className="fnb-dot" aria-label="Новое" />}
                </button>
              ))
            )}
          </div>

          <div className="fnb-chat-section">
            <div className="fnb-actions-row">
              <span>Сообщения чата</span>
              <small>{unreadChats.length} новых</small>
            </div>
            <div className="fnb-notifications-list">
              {unreadChats.length === 0 ? (
                <div className="fnb-empty">Новых сообщений нет</div>
              ) : (
                unreadChats.map((chat) => {
                  const lastMsg = chat.messages?.[chat.messages.length - 1];
                  return (
                    <button
                      key={chat.id}
                      type="button"
                      className="fnb-item is-chat"
                      onClick={() => {
                        setIsOpen(false);
                        if (onOpenChat) onOpenChat(chat.id);
                      }}
                    >
                      <span className="fnb-item-icon is-avatar" style={{ background: chat.color || "#e46630" }}>
                        {(chatPartnerName(chat) || "J").slice(0, 2).toUpperCase()}
                      </span>
                      <span className="fnb-item-info">
                        <span className="fnb-item-top">
                          <small>Чат</small>
                          <time>{chat.time || "Hozir"}</time>
                        </span>
                        <strong>{chatPartnerName(chat)}</strong>
                        <p>{lastMsg?.text || chat.preview || "Chat ochilgan"}</p>
                      </span>
                      <i className="fnb-dot" aria-label="Новое" />
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
