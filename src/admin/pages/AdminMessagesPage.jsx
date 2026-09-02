import React, { useState, useEffect } from 'react';
import { getStoredChats, sendMessageToChat } from '../../utils/chatManager.js';

export default function AdminMessagesPage() {
  const [chats, setChats] = useState(() => getStoredChats());
  const [active, setActive] = useState(null);
  const [draft, setDraft] = useState('');

  const refreshChats = () => {
    setChats(getStoredChats());
  };

  useEffect(() => {
    refreshChats();
    window.addEventListener('joyzone-chat-update', refreshChats);
    window.addEventListener('storage', refreshChats);
    return () => {
      window.removeEventListener('joyzone-chat-update', refreshChats);
      window.removeEventListener('storage', refreshChats);
    };
  }, []);

  const send = () => {
    if (!draft.trim() || !active) return;
    sendMessageToChat(active, { from: 'host', text: draft });
    setDraft('');
    refreshChats();
  };

  const activeChat = chats.find((c) => String(c.id) === String(active));

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 0, height: 'calc(100vh - 160px)', borderRadius: 20, overflow: 'hidden', border: '1px solid var(--border)', background: '#fff' }}>
      {/* Chat list */}
      <div style={{ borderRight: '1px solid var(--border)', overflowY: 'auto' }}>
        <div style={{ padding: '16px 16px 10px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 15 }}>Чаты</div>
        {chats.map(c => (
          <div key={c.id} onClick={() => setActive(c.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', cursor: 'pointer', background: String(active) === String(c.id) ? 'rgba(228,102,48,0.07)' : 'transparent', borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: c.color || '#294a6d', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{c.name.slice(0,2).toUpperCase()}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{c.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.preview || c.last}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.time}</span>
              {c.unread && <span style={{ background: 'var(--orange)', color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 20, padding: '1px 6px', minWidth: 18, textAlign: 'center' }}>NEW</span>}
            </div>
          </div>
        ))}
      </div>
      {/* Chat panel */}
      {activeChat ? (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 15 }}>
            {activeChat.name} <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, marginLeft: 8 }}>({activeChat.space || activeChat.spaceTitle})</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(activeChat.messages || []).map((m, i) => (
              <div 
                key={i} 
                style={{ 
                  alignSelf: m.from === 'host' ? 'flex-end' : 'flex-start', 
                  width: 'fit-content',
                  maxWidth: 'min(62%, 380px)', 
                  background: m.from === 'host' ? '#294a6d' : '#f6f1ee', 
                  color: m.from === 'host' ? '#fff' : 'var(--text)', 
                  padding: '10px 14px', 
                  borderRadius: m.from === 'host' ? '16px 16px 4px 16px' : '16px 16px 16px 4px', 
                  fontSize: 14, 
                  lineHeight: 1.5,
                  overflowWrap: 'anywhere',
                  wordBreak: 'break-word',
                  wordWrap: 'break-word',
                  whiteSpace: 'pre-wrap',
                  boxSizing: 'border-box'
                }}
              >
                {m.text}
              </div>
            ))}
          </div>
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}>
            <input value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Напишите сообщение..." style={{ flex: 1, padding: '10px 16px', borderRadius: 24, border: '1px solid var(--border)', fontSize: 14, fontFamily: 'Inter,sans-serif', outline: 'none' }} />
            <button className="adm-btn adm-btn-primary" style={{ borderRadius: '50%', width: 44, height: 44, padding: 0, justifyContent: 'center' }} onClick={send}>
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 15 }}>Выберите чат</div>
      )}
    </div>
  );
}
