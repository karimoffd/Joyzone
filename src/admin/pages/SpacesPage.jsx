import React, { useState } from 'react';

const SPACES = [
  { id: 1, name: 'Focus Hub Coworking', type: 'Коворкинг', area: 180, people: 40, price: '70 000/ч', status: 'active', bookings: 48, revenue: '3.2M', occupancy: 84, color: 'linear-gradient(135deg,#294a6d,#12283f)' },
  { id: 2, name: 'Atlas Meeting Room', type: 'Переговорная', area: 45, people: 12, price: '40 000/ч', status: 'active', bookings: 31, revenue: '1.8M', occupancy: 67, color: 'linear-gradient(135deg,#1a6b6b,#0f4646)' },
  { id: 3, name: 'Navoiy Event Space', type: 'Ивент-зал', area: 350, people: 150, price: '180 000/ч', status: 'active', bookings: 12, revenue: '2.6M', occupancy: 42, color: 'linear-gradient(135deg,#e46630,#a0411a)' },
  { id: 4, name: 'Quiet Work Studio', type: 'Студия', area: 60, people: 6, price: '35 000/ч', status: 'active', bookings: 22, revenue: '1.1M', occupancy: 55, color: 'linear-gradient(135deg,#4a3070,#2e1a4f)' },
  { id: 5, name: 'Blue Line Office', type: 'Офис', area: 120, people: 20, price: '55 000/ч', status: 'draft', bookings: 0, revenue: '0', occupancy: 0, color: 'linear-gradient(135deg,#2a5a8a,#1a3a5f)' },
];

const STATUS_COLORS = { active: { bg: 'rgba(34,197,94,0.12)', color: '#16a34a', label: 'Активный' }, draft: { bg: 'rgba(228,102,48,0.12)', color: 'var(--orange)', label: 'Черновик' }, inactive: { bg: 'rgba(156,163,175,0.15)', color: '#6b7280', label: 'Неактивный' } };

export default function SpacesPage() {
  return (
    <div className="adm-anim adm-anim-1">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button className="adm-btn adm-btn-primary">+ Добавить пространство</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {SPACES.map(s => (
          <div key={s.id} className="adm-space-card">
            <div className="adm-space-img" style={{ background: s.color, height: 130 }}>
              <span className="adm-space-img-label">{s.type}</span>
              <div style={{ position: 'absolute', top: 10, right: 10 }}>
                <span style={{ background: STATUS_COLORS[s.status].bg, color: STATUS_COLORS[s.status].color, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, backdropFilter: 'blur(4px)' }}>{STATUS_COLORS[s.status].label}</span>
              </div>
            </div>
            <div className="adm-space-body">
              <div className="adm-space-name">{s.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>{s.area} м² · {s.people} чел · {s.price}</div>
              <div className="adm-space-stats">
                <div className="adm-space-stat"><span className="adm-space-stat-val">{s.bookings}</span><span className="adm-space-stat-lbl">Брони</span></div>
                <div className="adm-space-stat"><span className="adm-space-stat-val">{s.revenue}</span><span className="adm-space-stat-lbl">Доход</span></div>
                <div className="adm-space-stat"><span className="adm-space-stat-val">{s.occupancy}%</span><span className="adm-space-stat-lbl">Загрузка</span></div>
              </div>
              <div className="adm-occupancy-bar"><div className="adm-occupancy-fill" style={{ width: s.occupancy + '%' }} /></div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button className="adm-btn adm-btn-outline" style={{ flex: 1, fontSize: 12, padding: '7px 0', justifyContent: 'center' }}>Редактировать</button>
                <button className="adm-btn adm-btn-outline" style={{ fontSize: 12, padding: '7px 12px' }}>👁</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
