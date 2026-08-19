import React from 'react';

const REVIEWS = [
  { name: 'Amir Karimov', place: 'Focus Hub Coworking', stars: 5, text: 'Отличное место, всё чисто и удобно. HDMI кабели были заранее подготовлены. Обязательно вернёмся!', date: '14 авг', replied: false, color: '#294a6d' },
  { name: 'Dilnoza Yusupova', place: 'Atlas Meeting Room', stars: 4, text: 'Хорошая переговорная, только кондиционер немного шумит. В целом всё хорошо.', date: '12 авг', replied: true, color: '#1a6b6b' },
  { name: 'Bekzod Tursunov', place: 'Navoiy Event Space', stars: 5, text: 'Провели мероприятие на 100 человек, всё прошло отлично! Персонал очень помог с организацией.', date: '10 авг', replied: false, color: '#e46630' },
  { name: 'Gulnora Rashidova', place: 'Quiet Work Studio', stars: 3, text: 'Неплохо, но стул неудобный. Хотелось бы больше розеток на рабочих местах.', date: '9 авг', replied: false, color: '#4a3070' },
];

export default function ReviewsPage() {
  const avg = (REVIEWS.reduce((s, r) => s + r.stars, 0) / REVIEWS.length).toFixed(1);
  return (
    <div className="adm-anim adm-anim-1">
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 20, marginBottom: 24 }}>
        <div className="adm-card adm-card-pad" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 52, fontWeight: 900, color: 'var(--navy)', letterSpacing: -2 }}>{avg}</div>
          <div style={{ color: '#f59e0b', fontSize: 24, marginBottom: 4 }}>{'★'.repeat(Math.round(avg))}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Средний рейтинг</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{REVIEWS.length} отзывов</div>
        </div>
        <div className="adm-card adm-card-pad">
          {[5,4,3,2,1].map(s => { const count = REVIEWS.filter(r => r.stars === s).length; const pct = (count / REVIEWS.length) * 100; return (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 600, minWidth: 16, color: 'var(--text-muted)' }}>{s}</span>
              <span style={{ color: '#f59e0b', fontSize: 13 }}>★</span>
              <div style={{ flex: 1, height: 8, background: 'var(--cream)', borderRadius: 4, overflow: 'hidden' }}><div style={{ width: pct + '%', height: '100%', background: 'var(--orange)', borderRadius: 4 }} /></div>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 16 }}>{count}</span>
            </div>
          ); })}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {REVIEWS.map((r, i) => (
          <div key={i} className="adm-card adm-card-pad">
            <div style={{ display: 'flex', gap: 14 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: r.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{r.name.slice(0,2).toUpperCase()}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div><strong style={{ fontSize: 14 }}>{r.name}</strong> <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>{r.place}</span></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#f59e0b', fontSize: 14 }}>{'★'.repeat(r.stars)}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.date}</span>
                  </div>
                </div>
                <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 12 }}>{r.text}</p>
                {r.replied ? <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>✓ Ответ отправлен</span> : <button className="adm-btn adm-btn-outline" style={{ fontSize: 12, padding: '6px 14px' }}>Ответить</button>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
