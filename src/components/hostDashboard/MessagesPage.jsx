import { filterPartnerChats, EmptyPanel } from "./shared.jsx";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { getApiErrorMessage } from "../../api/client.js";
import { getMessageSender, getStoredChats, markChatRead, sendMessageToChat, syncChatsWithBackend } from "../../utils/chatManager.js";
import { useVisiblePolling } from "../../utils/polling.js";

export function MessagesPage({ listings = [], partnerId = null }) {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [draft, setDraft] = useState("");
  const [messageError, setMessageError] = useState("");
  const [usingOfflineFallback, setUsingOfflineFallback] = useState(false);
  const [inboxLoading, setInboxLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const chatBodyRef = useRef(null);
  
  const refreshChats = useCallback(async () => {
    try {
      const backendChats = await syncChatsWithBackend({ silent: true, allowDevFallback: false });
      setChats(filterPartnerChats(backendChats, listings, partnerId));
      setUsingOfflineFallback(false);
      setMessageError("");
    } catch (err) {
      setMessageError(getApiErrorMessage(err, "Не удалось загрузить inbox"));
      // Dev fallback keeps the partner inbox inspectable while the REST chat API is unavailable.
      setChats(import.meta.env.DEV ? filterPartnerChats(getStoredChats(), listings, partnerId) : []);
      setUsingOfflineFallback(import.meta.env.DEV);
    } finally {
      setInboxLoading(false);
    }
  }, [listings, partnerId]);

  useEffect(() => {
    refreshChats();
  }, [refreshChats]);

  useVisiblePolling(refreshChats, 7000);

  const activeChat = chats.find((chat) => chat.id === selectedChat);

  useEffect(() => {
    if (selectedChat && !activeChat) {
      setSelectedChat(null);
    }
  }, [activeChat, selectedChat]);

  // Scroll only the message list so the composer never leaves the screen.
  const activeMessageCount = activeChat?.messages?.length || 0;
  useEffect(() => {
    const body = chatBodyRef.current;
    if (body) body.scrollTop = body.scrollHeight;
  }, [selectedChat, activeMessageCount]);

  // A guest message that arrives while the chat is open counts as read.
  const activeUnread = Boolean(activeChat?.unread);
  useEffect(() => {
    if (!selectedChat || !activeUnread || usingOfflineFallback) return;
    markChatRead(selectedChat, { allowDevFallback: false })
      .then((updated) => {
        if (updated) setChats((current) => current.map((item) => String(item.id) === String(updated.id) ? updated : item));
      })
      .catch(() => {});
  }, [selectedChat, activeUnread, usingOfflineFallback]);

  const handleSelectChat = async (chat) => {
    setSelectedChat(chat.id);
    if (!chat.unread || usingOfflineFallback) return;
    try {
      const updated = await markChatRead(chat.threadId || chat.id, { allowDevFallback: false });
      if (updated) {
        setChats((current) => current.map((item) => String(item.id) === String(updated.id) ? updated : item));
      }
      setMessageError("");
    } catch (err) {
      setMessageError(getApiErrorMessage(err, "Не удалось отметить чат прочитанным"));
    }
  };

  const handleSend = async () => {
    if (!draft.trim() || !selectedChat || sending) return;
    setSending(true);
    try {
      await sendMessageToChat(selectedChat, { from: "host", text: draft }, { allowDevFallback: false });
      setDraft("");
      setMessageError("");
      await refreshChats();
    } catch (err) {
      setMessageError(getApiErrorMessage(err, "Не удалось отправить сообщение"));
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

  useEffect(() => {
    if (selectedChat && window.innerWidth <= 980) {
      document.body.classList.add("chat-fullscreen-open");
    } else {
      document.body.classList.remove("chat-fullscreen-open");
    }
    return () => document.body.classList.remove("chat-fullscreen-open");
  }, [selectedChat]);

  return (
    <section className={`host-messages-layout ${selectedChat ? "chat-open" : ""}`}>
      <aside className="host-inbox-panel">
        <div className="host-section-head compact">
          <div>
            <span>{usingOfflineFallback ? "Входящие · DEV offline fallback" : "Входящие"}</span>
            <h2>Чаты</h2>
            {messageError ? <small style={{ color: "#dc2626", fontWeight: 800 }}>{messageError}</small> : null}
          </div>
        </div>
        <div className="host-inbox-list">
          {inboxLoading ? (
            <p style={{ color: "#64748b", fontSize: 14 }}>Загрузка чатов...</p>
          ) : chats.length > 0 ? chats.map((chat) => (
            <button key={chat.id} type="button" className={chat.id === selectedChat ? "is-active" : ""} onClick={() => handleSelectChat(chat)}>
              <span style={chat.guestAvatar ? { overflow: "hidden", padding: 0 } : undefined}>
                {chat.guestAvatar ? <img src={chat.guestAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : chat.name.slice(0, 2).toUpperCase()}
              </span>
              <div>
                <strong>{chat.name}</strong>
                <small>{chat.space}</small>
                <p>{chat.preview}</p>
              </div>
              <em>{chat.time}</em>
              {chat.unread ? <i /> : null}
            </button>
          )) : (
            <EmptyPanel title="Диалогов по вашим местам нет" text="Сообщения появятся здесь, когда гости напишут по одному из ваших объектов." />
          )}
        </div>
      </aside>

      <section className="host-chat-panel">
        {activeChat ? (
          <>
            <div className="host-chat-head">
              <button className="mobile-chat-back" onClick={() => setSelectedChat(null)} aria-label="Назад к чатам">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
              </button>
              <div>
                <span>{activeChat.space}</span>
                <h2>{activeChat.name}</h2>
              </div>
              <a href="/host-calendar" className="desktop-only-link">Открыть бронь</a>
            </div>
            <div className="host-chat-body" ref={chatBodyRef}>
              {activeChat.messages.map((message, index) => (
                <p key={message.id || `${message.text}-${index}`} className={`${getMessageSender(message) === "host" ? "is-host" : ""} ${message.isNew ? "msg-pop" : ""}`}>{message.text}</p>
              ))}
            </div>
            <div className="host-chat-composer">
              <button type="button" className="composer-icon-btn" aria-label="GIFs">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><path d="M10.5 14.5c-.8 0-1.5-.7-1.5-1.5v-2c0-.8.7-1.5 1.5-1.5s1.5.7 1.5 1.5"/><path d="M14 9h2v6h-2z"/><path d="M18 9v6"/><path d="M18 12h2"/></svg>
              </button>
              <input 
                placeholder="Напишите сообщение..." 
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={sending || usingOfflineFallback}
              />
              <button 
                type="button" 
                className={`composer-icon-btn send-btn ${draft.trim() ? "active" : ""}`} 
                onClick={handleSend}
                disabled={sending || usingOfflineFallback || !draft.trim()}
                aria-label="Отправить"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </div>
          </>
        ) : (
          <EmptyPanel title="Выберите диалог" text="Слева показаны резиденты и команды. После выбора здесь откроется переписка." />
        )}
      </section>
    </section>
  );
}
