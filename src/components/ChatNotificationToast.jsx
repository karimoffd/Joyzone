import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { chatPartnerName, getStoredChats, isOwnMessage } from "../utils/chatManager.js";
import "./ChatNotificationToast.css";

export function ChatNotificationToast({ onOpenChat, activeChatId = null }) {
  const toastRef = useRef(null);
  const [notification, setNotification] = useState(null);
  const seenRef = useRef(null);
  const activeChatRef = useRef(activeChatId);
  activeChatRef.current = activeChatId;

  useEffect(() => {
    const messageKey = (chat) => {
      const last = chat.messages?.[chat.messages.length - 1];
      return last ? `${chat.id}:${last.id || `${chat.messages.length}-${last.text}`}` : null;
    };
    // Messages that already existed when the app opened are not announced.
    seenRef.current = new Set(getStoredChats().map(messageKey).filter(Boolean));

    const checkNewMessages = () => {
      for (const chat of getStoredChats()) {
        const lastMsg = chat.messages?.[chat.messages.length - 1];
        const key = messageKey(chat);
        if (!lastMsg || !key || seenRef.current.has(key)) continue;
        seenRef.current.add(key);
        if (!chat.unread || isOwnMessage(chat, lastMsg)) continue;
        if (String(activeChatRef.current) === String(chat.id)) continue;
        setNotification({
          chatId: chat.id,
          senderName: chatPartnerName(chat) || "Joyzone",
          spaceTitle: chat.space || chat.spaceTitle || "Joyzone Space",
          text: lastMsg.text,
          avatarColor: chat.color || "#e46630"
        });
      }
    };

    window.addEventListener("joyzone-chat-update", checkNewMessages);
    window.addEventListener("storage", checkNewMessages);
    return () => {
      window.removeEventListener("joyzone-chat-update", checkNewMessages);
      window.removeEventListener("storage", checkNewMessages);
    };
  }, []);

  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });

  const handlePointerDown = (e) => {
    if (e.target.closest('.cnt-close-btn') || e.target.closest('.cnt-action-btn')) return;
    isDraggingRef.current = true;
    startPosRef.current = { x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDraggingRef.current) return;
    setDragOffset({
      x: e.clientX - startPosRef.current.x,
      y: e.clientY - startPosRef.current.y
    });
  };

  const handlePointerUp = (e) => {
    isDraggingRef.current = false;
  };

  useEffect(() => {
    if (!notification) return;
    setDragOffset({ x: 0, y: 0 });
    const el = toastRef.current;
    if (el) {
      gsap.fromTo(
        el,
        { x: 140, opacity: 0, scale: 0.85, filter: "blur(10px)" },
        { x: 0, opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.45, ease: "back.out(1.4)" }
      );
    }
    const timer = setTimeout(() => {
      dismissToast();
    }, 35000);

    return () => clearTimeout(timer);
  }, [notification]);

  const dismissToast = () => {
    const el = toastRef.current;
    if (el) {
      gsap.to(el, {
        x: 120,
        opacity: 0,
        scale: 0.9,
        filter: "blur(8px)",
        duration: 0.3,
        ease: "power2.in",
        onComplete: () => setNotification(null)
      });
    } else {
      setNotification(null);
    }
  };

  if (!notification) return null;

  return createPortal(
    <div 
      className="chat-notification-toast" 
      ref={toastRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        transform: `translate(${dragOffset.x}px, calc(-50% + ${dragOffset.y}px))`,
        cursor: 'grab'
      }}
    >
      <button type="button" className="cnt-close-btn" onClick={dismissToast} aria-label="Yopish">
        ✕
      </button>

      <div className="cnt-header">
        <div className="cnt-avatar" style={{ background: notification.avatarColor }}>
          {notification.senderName.slice(0, 2).toUpperCase()}
          <span className="cnt-pulse-dot" />
        </div>
        <div className="cnt-title-group">
          <strong>Yangi xabar</strong>
          <small>{notification.senderName}</small>
        </div>
      </div>

      <p className="cnt-message-text">{notification.text}</p>

      <div className="cnt-actions">
        <button
          type="button"
          className="cnt-action-btn open"
          onClick={() => {
            const targetId = notification.chatId;
            dismissToast();
            if (onOpenChat) onOpenChat(targetId);
          }}
        >
          Javob berish
        </button>
      </div>
    </div>,
    document.body
  );
}
