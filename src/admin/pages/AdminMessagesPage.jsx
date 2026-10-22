import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getApiErrorMessage } from '../../api/client.js';
import { getMessageSender, markChatRead, sendMessageToChat, syncChatsWithBackend } from '../../utils/chatManager.js';
import { useVisiblePolling } from '../../utils/polling.js';
import { Icon } from '../AdminIcons.jsx';
import { Avatar } from '../AdminLayout.jsx';
import './messages.css';

function formatTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const today = new Date().toDateString() === date.toDateString();
  return today
    ? date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
}

export default function AdminMessagesPage() {
  const [chats, setChats] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bodyRef = useRef(null);

  const refreshChats = useCallback(async () => {
    try {
      const synced = await syncChatsWithBackend({ silent: true, allowDevFallback: false });
      setChats(synced || []);
      setError('');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Не удалось загрузить чаты.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refreshChats(); }, [refreshChats]);
  useVisiblePolling(refreshChats, 7000);

  const activeChat = chats.find((chat) => String(chat.id) === String(activeId));
  const messageCount = activeChat?.messages?.length || 0;

  // Scroll only the message list, so the composer always stays visible.
  useEffect(() => {
    const body = bodyRef.current;
    if (body) body.scrollTop = body.scrollHeight;
  }, [activeId, messageCount]);

  const activeUnread = Boolean(activeChat?.unread);
  useEffect(() => {
    if (!activeId || !activeUnread) return;
    markChatRead(activeId, { allowDevFallback: false })
      .then((updated) => {
        if (updated) setChats((current) => current.map((chat) => (String(chat.id) === String(updated.id) ? updated : chat)));
      })
      .catch(() => {});
  }, [activeId, activeUnread]);

  const visibleChats = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return chats.filter((chat) => {
      if (onlyUnread && !chat.unread) return false;
      if (!needle) return true;
      return `${chat.name} ${chat.hostName} ${chat.space} ${chat.preview}`.toLowerCase().includes(needle);
    });
  }, [chats, search, onlyUnread]);
  const unreadCount = chats.filter((chat) => chat.unread).length;

  const send = async () => {
    const text = draft.trim();
    if (!text || !activeChat || sending) return;
    setSending(true);
    try {
      const updated = await sendMessageToChat(activeChat.id, { from: 'host', text }, { allowDevFallback: false });
      if (updated) setChats((current) => current.map((chat) => (String(chat.id) === String(updated.id) ? updated : chat)));
      setDraft('');
      setError('');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Сообщение не отправлено.'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={`msg-shell${activeChat ? ' has-active' : ''}`}>
      <aside className="msg-list">
        <div className="msg-list-head">
          <div>
            <h3>Чаты</h3>
            <small>{chats.length} диалогов · {unreadCount} непрочитанных</small>
          </div>
        </div>
        <div className="msg-search">
          <Icon name="search" size={16} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Гость, место или текст" />
        </div>
        <div className="msg-filter">
          <button type="button" className={!onlyUnread ? 'is-active' : ''} onClick={() => setOnlyUnread(false)}>Все</button>
          <button type="button" className={onlyUnread ? 'is-active' : ''} onClick={() => setOnlyUnread(true)}>Непрочитанные {unreadCount ? <b>{unreadCount}</b> : null}</button>
        </div>
        <div className="msg-items">
          {loading ? <p className="msg-empty">Загружаем чаты…</p> : null}
          {!loading && !visibleChats.length ? <p className="msg-empty">{chats.length ? 'Ничего не найдено' : 'Чатов пока нет'}</p> : null}
          {visibleChats.map((chat) => (
            <button
              key={chat.id}
              type="button"
              className={`msg-item${String(chat.id) === String(activeId) ? ' is-active' : ''}${chat.unread ? ' is-unread' : ''}`}
              onClick={() => setActiveId(chat.id)}
            >
              <Avatar src={chat.guestAvatar} name={chat.name} size={42} />
              <span className="msg-item-text">
                <span className="msg-item-top">
                  <strong>{chat.name}</strong>
                  <em>{formatTime(chat.updated_at) || chat.time}</em>
                </span>
                <small>{chat.space} · {chat.hostName}</small>
                <span className="msg-item-preview">{chat.preview}</span>
              </span>
              {chat.unread ? <i aria-label="Непрочитано" /> : null}
            </button>
          ))}
        </div>
      </aside>

      <section className="msg-thread">
        {activeChat ? (
          <>
            <header className="msg-thread-head">
              <button type="button" className="msg-back" onClick={() => setActiveId(null)} aria-label="Назад к чатам">
                <Icon name="chevronLeft" size={20} />
              </button>
              <Avatar src={activeChat.guestAvatar} name={activeChat.name} size={40} />
              <div className="msg-thread-title">
                <strong>{activeChat.name}</strong>
                <small>{activeChat.space} · владелец: {activeChat.hostName}</small>
              </div>
            </header>
            <div className="msg-body" ref={bodyRef}>
              {(activeChat.messages || []).length === 0 ? <p className="msg-empty">Сообщений пока нет</p> : null}
              {(activeChat.messages || []).map((message, index) => {
                const fromHost = getMessageSender(message) === 'host';
                return (
                  <div key={message.id || index} className={`msg-bubble ${fromHost ? 'is-host' : 'is-guest'}`}>
                    <span className="msg-bubble-author">{fromHost ? activeChat.hostName : activeChat.name}</span>
                    <p>{message.text}</p>
                    <time>{formatTime(message.created_at)}</time>
                  </div>
                );
              })}
            </div>
            {error ? <div className="msg-error">{error}</div> : null}
            <form className="msg-composer" onSubmit={(event) => { event.preventDefault(); send(); }}>
              <textarea
                value={draft}
                rows={1}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    send();
                  }
                }}
                placeholder="Ответить от имени владельца… (Shift+Enter — новая строка)"
              />
              <button type="submit" disabled={!draft.trim() || sending} aria-label="Отправить">
                <Icon name="chevronRight" size={20} strokeWidth={2.5} />
              </button>
            </form>
          </>
        ) : (
          <div className="msg-placeholder">
            <span><Icon name="chat" size={28} /></span>
            <h3>Выберите диалог</h3>
            <p>Здесь видны все переписки гостей с владельцами мест. Ответ уходит гостю от имени владельца.</p>
            {error ? <div className="msg-error">{error}</div> : null}
          </div>
        )}
      </section>
    </div>
  );
}
