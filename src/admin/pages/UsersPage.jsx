import React, { useState } from 'react';

const USERS = [
  { id: 1, name: 'Amir Karimov', phone: '+998 99 277 54 55', role: 'client', joined: '01 Янв 2026', bookings: 12, balance: '0', initials: 'AK', color: '#294a6d' },
  { id: 2, name: 'Dilnoza Yusupova', phone: '+998 91 234 56 78', role: 'partner', joined: '15 Фев 2026', bookings: 0, balance: '1 200 000', initials: 'DY', color: '#1a6b6b' },
  { id: 3, name: 'Bekzod Tursunov', phone: '+998 93 111 22 33', role: 'client', joined: '20 Мар 2026', bookings: 5, balance: '0', initials: 'BT', color: '#e46630' },
  { id: 4, name: 'Gulnora Rashidova', phone: '+998 97 555 44 33', role: 'admin', joined: '01 Янв 2025', bookings: 0, balance: '0', initials: 'GR', color: '#4a3070' },
  { id: 5, name: 'Jasur Mirzaev', phone: '+998 90 876 54 32', role: 'client', joined: '10 Июл 2026', bookings: 3, balance: '0', initials: 'JM', color: '#2a5a8a' },
];

const ROLE_MAP = { client: { label: 'Клиент', bg: 'rgba(41,74,109,0.1)', color: '#294a6d' }, partner: { label: 'Партнёр', bg: 'rgba(26,107,107,0.1)', color: '#1a6b6b' }, admin: { label: 'Админ', bg: 'rgba(228,102,48,0.12)', color: '#e46630' } };
const TABS = ['Все', 'client', 'partner', 'admin'];

export default function UsersPage() {
  const [tab, setTab] = useState('Все');
  const filtered = tab === 'Все' ? USERS : USERS.filter(u => u.role === tab);

  return (
    <div className="adm-anim adm-anim-1">
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '7px 16px', borderRadius: 10, border: '1px solid var(--border)', background: tab === t ? 'var(--navy)' : '#fff', color: tab === t ? '#fff' : 'var(--text-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>{t === 'Все' ? 'Все' : ROLE_MAP[t].label}</button>
        ))}
      </div>
      <div className="adm-card">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ borderBottom: '2px solid var(--border)' }}>{['Пользователь', 'Телефон', 'Роль', 'Дата рег.', 'Брони', 'Баланс'].map(h => <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-muted)' }}>{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--cream)'} onMouseLeave={e => e.currentTarget.style.background = ''}>
                <td style={{ padding: '14px 16px' }}><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><div style={{ width: 36, height: 36, borderRadius: 10, background: u.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700 }}>{u.initials}</div><span style={{ fontSize: 14, fontWeight: 600 }}>{u.name}</span></div></td>
                <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-muted)' }}>{u.phone}</td>
                <td style={{ padding: '14px 16px' }}><span style={{ background: ROLE_MAP[u.role].bg, color: ROLE_MAP[u.role].color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>{ROLE_MAP[u.role].label}</span></td>
                <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-muted)' }}>{u.joined}</td>
                <td style={{ padding: '14px 16px', fontSize: 14, fontWeight: 600 }}>{u.bookings}</td>
                <td style={{ padding: '14px 16px', fontSize: 13 }}>{u.balance} UZS</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
