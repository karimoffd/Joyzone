import React, { useState, useEffect } from 'react';

function useCounter(target, duration = 1200) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setValue(target); clearInterval(timer); }
      else setValue(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target]);
  return value;
}

function RevenueChart({ data }) {
  const max = Math.max(...data.map(d => d.value));
  const min = Math.min(...data.map(d => d.value));
  const w = 600; const h = 180;
  const pad = { top: 10, right: 20, bottom: 10, left: 10 };
  const points = data.map((d, i) => ({
    x: pad.left + (i / (data.length - 1)) * (w - pad.left - pad.right),
    y: pad.top + (1 - (d.value - min) / (max - min || 1)) * (h - pad.top - pad.bottom),
    ...d
  }));
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaD = `${pathD} L${points[points.length-1].x},${h} L${points[0].x},${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="adm-chart-svg">
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e46630" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#e46630" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#chartGrad)" />
      <path d={pathD} fill="none" stroke="#e46630" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="4" fill="#e46630" stroke="#fff" strokeWidth="2" />)}
    </svg>
  );
}

const CHART_DATA = {
  week: [
    { label: 'Пн', value: 420000 }, { label: 'Вт', value: 680000 },
    { label: 'Ср', value: 510000 }, { label: 'Чт', value: 890000 },
    { label: 'Пт', value: 1100000 }, { label: 'Сб', value: 760000 }, { label: 'Вс', value: 430000 },
  ],
  month: [
    { label: '1', value: 2100000 }, { label: '7', value: 3400000 },
    { label: '14', value: 2800000 }, { label: '21', value: 4200000 }, { label: '28', value: 3900000 },
  ],
  quarter: [
    { label: 'Янв', value: 8200000 }, { label: 'Фев', value: 9100000 }, { label: 'Мар', value: 11500000 },
  ],
};

const BOOKINGS = [
  { id: 1, name: 'Amir Karimov', space: 'Focus Hub', time: '10:00–14:00', status: 'confirmed', color: '#294a6d' },
  { id: 2, name: 'Dilnoza Yusupova', space: 'Atlas Meeting', time: '09:00–11:00', status: 'pending', color: '#e46630' },
  { id: 3, name: 'Bekzod Tursunov', space: 'Navoiy Event', time: '15:00–18:00', status: 'paid', color: '#1a6b6b' },
  { id: 4, name: 'Gulnora Rashidova', space: 'Quiet Studio', time: '12:00–13:00', status: 'pending', color: '#4a3070' },
  { id: 5, name: 'Jasur Mirzaev', space: 'Blue Line', time: '16:00–17:00', status: 'confirmed', color: '#294a6d' },
];

const SPACES = [
  { id: 1, name: 'Focus Hub Coworking', type: 'Коворкинг', bookings: 48, revenue: '3.2M', occupancy: 84, color: 'linear-gradient(135deg,#294a6d,#12283f)' },
  { id: 2, name: 'Atlas Meeting Room', type: 'Переговорная', bookings: 31, revenue: '1.8M', occupancy: 67, color: 'linear-gradient(135deg,#1a6b6b,#0f4646)' },
  { id: 3, name: 'Navoiy Event Space', type: 'Ивент-зал', bookings: 12, revenue: '2.6M', occupancy: 42, color: 'linear-gradient(135deg,#e46630,#a0411a)' },
];

const REVIEWS = [
  { name: 'Amir K.', stars: 5, text: 'Отличное место, всё чисто и комфортно!' },
  { name: 'Dilnoza Y.', stars: 4, text: 'Хорошая переговорная, только кондиционер шумит.' },
  { name: 'Bekzod T.', stars: 5, text: 'Провели мероприятие на 100 человек — всё отлично!' },
];

const STATUS_LABELS = { pending: 'Ожидание', confirmed: 'Подтверждено', paid: 'Оплачено', cancelled: 'Отменено' };

export default function OverviewPage({ setPage }) {
  const [period, setPeriod] = useState('week');
  const bookingsCount = useCounter(27);
  const revenueVal = useCounter(5780);
  const ratingVal = useCounter(96);
  const spacesCount = useCounter(8);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? '☀️ Доброе утро' : hour < 17 ? '🌤 Добрый день' : '🌙 Добрый вечер';
  const userName = localStorage.getItem('joyzone-name') || 'Admin';
  const today = new Intl.DateTimeFormat('ru', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

  return (
    <>
      <div className="adm-welcome adm-anim adm-anim-1">
        <div className="adm-welcome-text">
          <h1>{greeting}, {userName}! 👋</h1>
          <p>{today} · Панель управления Joyzone</p>
        </div>
        <div className="adm-welcome-actions">
          <button className="adm-btn adm-btn-ghost" onClick={() => setPage('bookings')}>📅 Брони</button>
          <button className="adm-btn adm-btn-primary" onClick={() => setPage('spaces')}>+ Новое место</button>
        </div>
      </div>

      <div className="adm-kpi-grid adm-anim adm-anim-2">
        <div className="adm-kpi-card navy">
          <div className="adm-kpi-label">Активные брони</div>
          <div className="adm-kpi-value">{bookingsCount}</div>
          <div className="adm-kpi-delta up">↑ 12% vs прошлая неделя</div>
          <div className="adm-sparkline">
            {[40,65,50,80,60,90,70].map((h,i) => <div key={i} className={`adm-sparkline-bar${i===5?' accent':''}`} style={{height:h+'%'}} />)}
          </div>
        </div>
        <div className="adm-kpi-card orange">
          <div className="adm-kpi-label">Доход за месяц</div>
          <div className="adm-kpi-value">{revenueVal.toLocaleString()} K</div>
          <div className="adm-kpi-delta up">↑ 24% vs прошлый месяц</div>
          <div className="adm-sparkline">
            {[30,55,45,70,85,65,95].map((h,i) => <div key={i} className={`adm-sparkline-bar${i===6?' accent':''}`} style={{height:h+'%'}} />)}
          </div>
        </div>
        <div className="adm-kpi-card teal">
          <div className="adm-kpi-label">Средний рейтинг</div>
          <div className="adm-kpi-value">{(ratingVal/20).toFixed(1)} ⭐</div>
          <div className="adm-kpi-delta up">↑ +0.2 за месяц</div>
          <div className="adm-sparkline">
            {[75,80,78,82,85,83,88].map((h,i) => <div key={i} className={`adm-sparkline-bar${i===6?' accent':''}`} style={{height:h+'%'}} />)}
          </div>
        </div>
        <div className="adm-kpi-card purple">
          <div className="adm-kpi-label">Всего мест</div>
          <div className="adm-kpi-value">{spacesCount}</div>
          <div className="adm-kpi-delta up">6 Active · 2 Draft</div>
          <div className="adm-sparkline">
            {[60,60,65,65,70,75,75].map((h,i) => <div key={i} className={`adm-sparkline-bar${i===6?' accent':''}`} style={{height:h+'%'}} />)}
          </div>
        </div>
      </div>

      <div className="adm-overview-grid adm-anim adm-anim-3">
        <div className="adm-overview-left">
          <div className="adm-card">
            <div className="adm-card-pad">
              <div className="adm-card-head">
                <div>
                  <div className="adm-card-title">Доходы</div>
                  <div className="adm-card-sub">{period==='week'?'За 7 дней':period==='month'?'За месяц':'За квартал'}</div>
                </div>
                <div className="adm-chart-tabs">
                  {['week','month','quarter'].map(p => (
                    <button key={p} className={`adm-chart-tab${period===p?' active':''}`} onClick={() => setPeriod(p)}>
                      {p==='week'?'7д':p==='month'?'30д':'90д'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="adm-chart-wrap"><RevenueChart data={CHART_DATA[period]} /></div>
              <div className="adm-chart-labels">
                {CHART_DATA[period].map(d => <span key={d.label} className="adm-chart-label">{d.label}</span>)}
              </div>
            </div>
          </div>

          <div className="adm-card">
            <div className="adm-card-pad">
              <div className="adm-card-head">
                <div className="adm-card-title">Топ пространства</div>
                <button className="adm-btn adm-btn-outline" style={{fontSize:12,padding:'6px 12px'}} onClick={() => setPage('spaces')}>Все места</button>
              </div>
              <div className="adm-space-grid">
                {SPACES.map(space => (
                  <div key={space.id} className="adm-space-card">
                    <div className="adm-space-img" style={{background:space.color}}>
                      <span className="adm-space-img-label">{space.type}</span>
                    </div>
                    <div className="adm-space-body">
                      <div className="adm-space-name">{space.name}</div>
                      <div className="adm-space-stats">
                        <div className="adm-space-stat"><span className="adm-space-stat-val">{space.bookings}</span><span className="adm-space-stat-lbl">Брони</span></div>
                        <div className="adm-space-stat"><span className="adm-space-stat-val">{space.revenue}</span><span className="adm-space-stat-lbl">Доход</span></div>
                        <div className="adm-space-stat"><span className="adm-space-stat-val">{space.occupancy}%</span><span className="adm-space-stat-lbl">Загрузка</span></div>
                      </div>
                      <div className="adm-occupancy-bar"><div className="adm-occupancy-fill" style={{width:space.occupancy+'%'}} /></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="adm-overview-right">
          <div className="adm-card">
            <div className="adm-card-pad">
              <div className="adm-card-head">
                <div><div className="adm-card-title">Ближайшие брони</div><div className="adm-card-sub">Сегодня</div></div>
                <button className="adm-btn adm-btn-outline" style={{fontSize:12,padding:'6px 12px'}} onClick={() => setPage('bookings')}>Все</button>
              </div>
              <div className="adm-booking-list">
                {BOOKINGS.map(b => (
                  <div key={b.id} className="adm-booking-item">
                    <div className="adm-booking-avatar" style={{background:b.color}}>{b.name.slice(0,2).toUpperCase()}</div>
                    <div className="adm-booking-info">
                      <div className="adm-booking-name">{b.name}</div>
                      <div className="adm-booking-meta">{b.space} · {b.time}</div>
                    </div>
                    <span className={`adm-status-pill ${b.status}`}>{STATUS_LABELS[b.status]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="adm-card">
            <div className="adm-card-pad">
              <div className="adm-card-head">
                <div className="adm-card-title">Последние отзывы</div>
                <button className="adm-btn adm-btn-outline" style={{fontSize:12,padding:'6px 12px'}} onClick={() => setPage('reviews')}>Все</button>
              </div>
              {REVIEWS.map((r,i) => (
                <div key={i} className="adm-review-item">
                  <div className="adm-review-avatar">{r.name.slice(0,2).toUpperCase()}</div>
                  <div className="adm-review-body">
                    <div className="adm-review-header">
                      <span className="adm-review-name">{r.name}</span>
                      <span className="adm-review-stars">{'★'.repeat(r.stars)}</span>
                    </div>
                    <div className="adm-review-text">{r.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
