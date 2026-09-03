import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { getStoredChats } from "../utils/chatManager.js";
import "./FloatingNotificationBell.css";

export function FloatingNotificationBell({ onOpenChat }) {
  const [chats, setChats] = useState(() => getStoredChats());
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const refreshChats = () => {
    setChats(getStoredChats());
  };

  useEffect(() => {
    refreshChats();
    window.addEventListener("joyzone-chat-update", refreshChats);
    window.addEventListener("storage", refreshChats);
    return () => {
      window.removeEventListener("joyzone-chat-update", refreshChats);
      window.removeEventListener("storage", refreshChats);
    };
  }, []);

  // Compute unread host messages
  const unreadChats = chats.filter((c) => {
    const lastMsg = c.messages?.[c.messages.length - 1];
    return lastMsg && lastMsg.from === "host";
  });

  const unreadCount = unreadChats.length;

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

  return createPortal(
    <div className="fnb-container">
      {/* Floating Bell Icon Button */}
      <button
        type="button"
        className={`fnb-bell-btn ${unreadCount > 0 ? "has-unread" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Uvedomleniyalar"
        title="Uvedomleniyalar"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && <span className="fnb-badge-count">{unreadCount}</span>}
      </button>

      {/* Notifications Dropdown Drawer */}
      {isOpen && (
        <div className="fnb-dropdown" ref={dropdownRef}>
          <div className="fnb-dropdown-header">
            <h3>🔔 Uvedomleniyalar</h3>
            <span className="fnb-unread-tag">{unreadCount} yangi</span>
          </div>

          <div className="fnb-notifications-list">
            {chats.length === 0 ? (
              <div className="fnb-empty">Yangi bildirishnomalar yo'q</div>
            ) : (
              chats.map((chat) => {
                const lastMsg = chat.messages?.[chat.messages.length - 1];
                const isHostReply = lastMsg?.from === "host";
                return (
                  <div
                    key={chat.id}
                    className={`fnb-item ${isHostReply ? "is-unread" : ""}`}
                    onClick={() => {
                      setIsOpen(false);
                      if (onOpenChat) onOpenChat(chat.id);
                    }}
                  >
                    <div className="fnb-item-avatar" style={{ background: chat.color || "#e46630" }}>
                      {chat.name?.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="fnb-item-info">
                      <div className="fnb-item-top">
                        <strong>{chat.name}</strong>
                        <small>{chat.time || "Hozir"}</small>
                      </div>
                      <p>{lastMsg?.text || chat.preview || "Chat ochilgan"}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
