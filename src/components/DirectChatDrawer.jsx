import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { chatPartnerAvatar, chatPartnerName, getChatById, isOwnMessage, markChatRead, sendMessageToChat, syncChatsWithBackend } from "../utils/chatManager.js";
import { useVisiblePolling } from "../utils/polling.js";
import "./DirectChatDrawer.css";

export function DirectChatDrawer({ chatId, spaceTitle, hostName, onClose }) {
  const overlayRef = useRef(null);
  const drawerRef = useRef(null);
  const feedRef = useRef(null);

  const [chat, setChat] = useState(() => getChatById(chatId));
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");

  const refreshChat = async () => {
    await syncChatsWithBackend({ silent: true });
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

  useVisiblePolling(refreshChat, 7000);

  useEffect(() => {
    if (chat?.id) {
      markChatRead(chat.id).catch(() => {});
    }
  }, [chat?.id, chat?.messages?.length]);

  // Scroll only the message feed, never the page, so the composer stays put.
  const messageCount = chat?.messages?.length || 0;
  useEffect(() => {
    const feed = feedRef.current;
    if (feed) feed.scrollTop = feed.scrollHeight;
  }, [messageCount]);

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

  const handleSend = async () => {
    if (!draft.trim() || !chat || sending) return;
    setSending(true);
    try {
      const updated = await sendMessageToChat(chat.id, { from: chat.viewerRole || "guest", text: draft });
      if (updated) setChat(updated);
      setDraft("");
      setSendError("");
    } catch (error) {
      setSendError("Xabar yuborilmadi. Qayta urinib ko'ring.");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  if (!chat) return null;

  const displayHostName = chatPartnerName(chat) || hostName || "Ega / Host";
  const displaySpaceTitle = chat.space || spaceTitle || "Joyzone Space";

  return createPortal(
    <div className="direct-chat-overlay" ref={overlayRef} onClick={handleClose}>
      <div className="direct-chat-drawer" ref={drawerRef} onClick={(e) => e.stopPropagation()}>
        
        {/* Drawer Header */}
        <div className="direct-chat-header">
          <div className="direct-chat-host-info">
            <div className="direct-chat-avatar" style={{ background: chat.color || "#294a6d" }}>
              {chatPartnerAvatar(chat)
                ? <img src={chatPartnerAvatar(chat)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }} />
                : displayHostName.slice(0, 2).toUpperCase()}
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
        <div className="direct-chat-messages-feed" ref={feedRef}>
          {chat.messages.map((msg, index) => (
            <div
              key={msg.id || index}
              className={`direct-chat-bubble ${isOwnMessage(chat, msg) ? "is-guest" : "is-host"}`}
            >
              {msg.text}
            </div>
          ))}
        </div>
        {sendError ? <p className="direct-chat-error">{sendError}</p> : null}

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
            disabled={!draft.trim() || sending}
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
