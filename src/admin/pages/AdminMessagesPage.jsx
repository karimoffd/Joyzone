import React, { useState } from 'react';

const CHATS = [
  { id: 1, name: 'Amir Karimov', last: 'Можно ли подготовить доску до 10:00?', time: '12 мин', unread: 2, color: '#294a6d' },
  { id: 2, name: 'Dilnoza Yusupova', last: 'Спасибо, всё отлично!', time: 'Вчера', unread: 0, color: '#1a6b6b' },
  { id: 3, name: 'Bekzod Tursunov', last: 'Хотим забронировать зал на 100 чел.', time: '2 дня', unread: 1, color: '#e46630' },
];

const MESSAGES = {
  1: [{from:'guest',text:'Здравствуйте! Можно ли подготовить доску и воду до 10:00?'},{from:'host',text:'Да, конечно! Всё будет готово.'},{from:'guest',text:'Отлично, спасибо большое!'}],
  2: [{from:'guest',text:'Спасибо, всё прошло отлично!'},{from:'host',text:'Рады помочь! Ждём вас снова.'}],
  3: [{from:'guest',text:'Хотим забронировать зал на 100 человек.'}],
};

export default function AdminMessagesPage() {
  const [active, setActive] = useState(null);
  const [draft, setDraft] = useState('');
  const [msgs, setMsgs] = useState(MESSAGES);

  const send = () => {
    if (!draft.trim() || !active) return;
    setMsgs(m => ({ ...m, [active]: [...(m[active] || []), { from: 'host', text: draft }] }));
    setDraft('');
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 0, height: 'calc(100vh - 160px)', borderRadius: 20, overflow: 'hidden', border: '1px solid var(--border)', background: '#fff' }}>
      {/* Chat list */}
      <div style={{ borderRight: '1px solid var(--border)', overflowY: 'auto' }}>
        <div style={{ padding: '16px 16px 10px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 15 }}>Чаты</div>
        {CHATS.map(c => (
          <div key={c.id} onClick={() => setActive(c.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', cursor: 'pointer', background: active === c.id ? 'rgba(228,102,48,0.07)' : 'transparent', borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{c.name.slice(0,2).toUpperCase()}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{c.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.last}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.time}</span>
              {c.unread > 0 && <span style={{ background: 'var(--orange)', color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 20, padding: '1px 6px', minWidth: 18, textAlign: 'center' }}>{c.unread}</span>}
            </div>
          </div>
        ))}
      </div>
      {/* Chat panel */}
      {active ? (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 15 }}>{CHATS.find(c=>c.id===active)?.name}</div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(msgs[active]||[]).map((m,i) => (
              <div key={i} style={{ alignSelf: m.from==='host' ? 'flex-end' : 'flex-start', maxWidth: '75%', background: m.from==='host' ? '#294a6d' : '#f6f1ee', color: m.from==='host' ? '#fff' : 'var(--text)', padding: '10px 14px', borderRadius: m.from==='host' ? '16px 16px 4px 16px' : '16px 16px 16px 4px', fontSize: 14, lineHeight: 1.5 }}>{m.text}</div>
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
