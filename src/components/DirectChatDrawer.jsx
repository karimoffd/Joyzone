import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { getChatById, sendMessageToChat } from "../utils/chatManager.js";
import "./DirectChatDrawer.css";

export function DirectChatDrawer({ chatId, spaceTitle, hostName, onClose }) {
  const overlayRef = useRef(null);
  const drawerRef = useRef(null);
  const messagesEndRef = useRef(null);

  const [chat, setChat] = useState(() => getChatById(chatId));
  const [draft, setDraft] = useState("");

  const refreshChat = () => {
    const updated = getChatById(chatId);
    if (updated) {
      setChat(updated);
    }
  };

  useEffect(() => {
    refreshChat();
    const handleUpdate = () => refreshChat();
    window.addEventListener("joyzone-chat-update", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("joyzone-chat-update", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat?.messages]);

  useEffect(() => {
    const overlay = overlayRef.current;
    const drawer = drawerRef.current;
    if (overlay && drawer) {
      document.body.style.overflow = "hidden";
      gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power2.out" });
      gsap.fromTo(
        drawer,
        { x: "100%", opacity: 0 },
        { x: "0%", opacity: 1, duration: 0.4, ease: "power3.out" }
      );
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleClose = () => {
    const overlay = overlayRef.current;
    const drawer = drawerRef.current;
    if (overlay && drawer) {
      gsap.to(drawer, { x: "100%", opacity: 0, duration: 0.3, ease: "power3.in" });
      gsap.to(overlay, {
        opacity: 0,
        duration: 0.3,
        ease: "power2.in",
        onComplete: () => {
          document.body.style.overflow = "";
          onClose();
        }
      });
    } else {
      onClose();
    }
  };

  const handleSend = () => {
    if (!draft.trim() || !chat) return;
    sendMessageToChat(chat.id, { from: "guest", text: draft });
    setDraft("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  if (!chat) return null;

  const displayHostName = chat.name || hostName || "Ega / Host";
  const displaySpaceTitle = chat.space || spaceTitle || "Joyzone Space";

  return createPortal(
    <div className="direct-chat-overlay" ref={overlayRef} onClick={handleClose}>
      <div className="direct-chat-drawer" ref={drawerRef} onClick={(e) => e.stopPropagation()}>
        
        {/* Drawer Header */}
        <div className="direct-chat-header">
          <div className="direct-chat-host-info">
            <div className="direct-chat-avatar" style={{ background: chat.color || "#294a6d" }}>
              {displayHostName.slice(0, 2).toUpperCase()}
              <span className="direct-chat-status-dot" title="Onlayn" />
            </div>
            <div>
              <h3>{displayHostName}</h3>
              <small>{displaySpaceTitle}</small>
            </div>
          </div>

          <button type="button" className="direct-chat-close-btn" onClick={handleClose} aria-label="Yopish">
            ✕
          </button>
        </div>

        {/* Messages Feed */}
        <div className="direct-chat-messages-feed">
          {chat.messages.map((msg, index) => (
            <div
              key={index}
              className={`direct-chat-bubble ${msg.from === "guest" ? "is-guest" : "is-host"}`}
            >
              {msg.text}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Composer */}
        <div className="direct-chat-composer">
          <input
            type="text"
            placeholder="Xabar yozing..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            type="button"
            className={`direct-chat-send-btn ${draft.trim() ? "is-active" : ""}`}
            onClick={handleSend}
            disabled={!draft.trim()}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
