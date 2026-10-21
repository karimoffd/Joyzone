import React, { useEffect, useMemo, useState } from 'react';
import api, { getAccessToken, getApiErrorMessage, isRequestCanceled } from '../../api/client.js';
import { getStorageItem, STORAGE_KEYS } from '../../utils/storageKeys.js';
import { normalizePlace as normalizeBackendPlace } from '../../utils/placeMapper.js';
import { normalizeBooking as normalizeBookingContract } from '../../utils/bookingMapper.js';

function useCounter(target, duration = 1200) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start = 0;
    const safeTarget = Number(target) || 0;
    const step = safeTarget / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= safeTarget) { setValue(safeTarget); clearInterval(timer); }
      else setValue(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return value;
}

function RevenueChart({ data }) {
  const safeData = data?.length ? data : [{ label: '', value: 0 }, { label: '', value: 0 }];
  const max = Math.max(...safeData.map(d => d.value));
  const min = Math.min(...safeData.map(d => d.value));
  const w = 600; const h = 180;
  const pad = { top: 10, right: 20, bottom: 10, left: 10 };
  const points = safeData.map((d, i) => ({
    x: pad.left + (i / Math.max(safeData.length - 1, 1)) * (w - pad.left - pad.right),
    y: pad.top + (1 - (d.value - min) / (max - min || 1)) * (h - pad.top - pad.bottom),
    ...d
  }));
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaD = `${pathD} L${points[points.length - 1].x},${h} L${points[0].x},${h} Z`;
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

const FALLBACK_OVERVIEW = {
  users_count: 42,
  partners_count: 9,
  places_total: 8,
  places_pending: 2,
  places_approved: 6,
  bookings_total: 27,
  bookings_pending: 4,
  revenue_month_test: '5780000',
  reviews_count: 12,
  average_rating: 4.8,
  latest_bookings: [
    { id: 1, client_name: 'Amir Karimov', place_title: 'Focus Hub', start_time: '2026-08-14T10:00:00Z', end_time: '2026-08-14T14:00:00Z', status: 'confirmed' },
    { id: 2, client_name: 'Dilnoza Yusupova', place_title: 'Atlas Meeting', start_time: '2026-08-14T09:00:00Z', end_time: '2026-08-14T11:00:00Z', status: 'pending' },
    { id: 3, client_name: 'Bekzod Tursunov', place_title: 'Navoiy Event', start_time: '2026-08-14T15:00:00Z', end_time: '2026-08-14T18:00:00Z', status: 'confirmed' },
  ],
  latest_reviews: [
    { id: 1, user_name: 'Amir K.', rating: 5, comment: 'Отличное место, всё чисто и комфортно!' },
    { id: 2, user_name: 'Dilnoza Y.', rating: 4, comment: 'Хорошая переговорная, только кондиционер шумит.' },
  ],
  top_places: [
    { id: 1, title: 'Focus Hub Coworking', category_name: 'Коворкинг', bookings_count: 48, revenue_test: '3200000', rating_avg: 4.8 },
    { id: 2, title: 'Atlas Meeting Room', category_name: 'Переговорная', bookings_count: 31, revenue_test: '1800000', rating_avg: 4.6 },
    { id: 3, title: 'Navoiy Event Space', category_name: 'Ивент-зал', bookings_count: 12, revenue_test: '2600000', rating_avg: 4.9 },
  ],
};

const EMPTY_OVERVIEW = {
  users_count: 0,
  partners_count: 0,
  places_total: 0,
  places_pending: 0,
  places_approved: 0,
  bookings_total: 0,
  bookings_pending: 0,
  revenue_month_test: 0,
  reviews_count: 0,
  average_rating: 0,
  latest_bookings: [],
  latest_reviews: [],
  top_places: [],
};

const STATUS_LABELS = {
  pending: 'Ожидание',
  confirmed: 'Подтверждено',
  completed: 'Завершено',
  blocked: 'Заблокировано',
  test_paid: 'Оплачено',
  paid: 'Оплачено',
  cancelled: 'Отменено',
};

const SPACE_COLORS = [
  'linear-gradient(135deg,#294a6d,#12283f)',
  'linear-gradient(135deg,#1a6b6b,#0f4646)',
  'linear-gradient(135deg,#e46630,#a0411a)',
  'linear-gradient(135deg,#4a3070,#24123e)',
  'linear-gradient(135deg,#2563eb,#1e3a8a)',
];

function getHeaders() {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function numeric(value) {
  const parsed = Number(String(value || 0).replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCompact(value) {
  const amount = numeric(value);
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(amount >= 10000000 ? 0 : 1)}M`;
  if (amount >= 1000) return `${Math.round(amount / 1000)}K`;
  return String(Math.round(amount));
}

function formatTimeRange(startValue, endValue) {
  const start = new Date(startValue);
  const end = new Date(endValue);
  if (Number.isNaN(start.getTime())) return '';
  const fmt = (date) => date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  return Number.isNaN(end.getTime()) ? fmt(start) : `${fmt(start)}-${fmt(end)}`;
}

function buildOverviewBookingView(booking = {}, index = 0) {
  const normalized = normalizeBookingContract(booking, { fallbackId: `booking-${index}` });
  return {
    id: normalized.id,
    name: normalized.client_name || 'Клиент Joyzone',
    space: normalized.place_title || 'Joyzone Space',
    time: formatTimeRange(normalized.start_time, normalized.end_time),
    status: normalized.status || normalized.payment_status || 'pending',
    color: SPACE_COLORS[index % SPACE_COLORS.length],
  };
}

function normalizeReview(review = {}) {
  return {
    id: review.id,
    name: review.user_name || review.name || 'User',
    stars: Number(review.rating || review.stars || 0),
    text: review.comment || review.text || '',
  };
}

function buildTopPlaceView(place = {}, index = 0) {
  const normalized = normalizeBackendPlace(place, { index });
  const bookings = normalized.bookings_count;
  const revenue = numeric(place.revenue_test || place.revenue || 0);
  const occupancy = bookings ? Math.min(100, Math.max(10, bookings * 6)) : 0;
  return {
    id: normalized.id,
    name: normalized.title || 'Joyzone Space',
    type: normalized.subcategory_name || normalized.category_name || place.type || 'Место',
    bookings,
    revenue: formatCompact(revenue),
    occupancy,
    rating: normalized.rating_avg,
    color: SPACE_COLORS[index % SPACE_COLORS.length],
  };
}

export default function OverviewPage({ setPage }) {
  const [period, setPeriod] = useState('week');
  const [overview, setOverview] = useState(EMPTY_OVERVIEW);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    async function loadOverview() {
      setLoading(true);
      try {
        const res = await api.get('/api/admin/overview/', { headers: getHeaders(), signal: controller.signal });
        setOverview(res.data || EMPTY_OVERVIEW);
        setError('');
        setUsingFallback(false);
      } catch (err) {
        if (isRequestCanceled(err)) return;
        setOverview(import.meta.env.DEV ? FALLBACK_OVERVIEW : EMPTY_OVERVIEW);
        setError(`${getApiErrorMessage(err, 'Failed to load overview')}${import.meta.env.DEV ? ' Показаны DEV fallback данные.' : ''}`);
        setUsingFallback(import.meta.env.DEV);
      }
      if (!controller.signal.aborted) setLoading(false);
    }
    loadOverview();
    return () => controller.abort();
  }, []);

  const bookings = useMemo(
    () => (overview.latest_bookings || []).map(buildOverviewBookingView),
    [overview.latest_bookings]
  );
  const reviews = useMemo(
    () => (overview.latest_reviews || []).map(normalizeReview),
    [overview.latest_reviews]
  );
  const spaces = useMemo(
    () => (overview.top_places || []).map(buildTopPlaceView),
    [overview.top_places]
  );

  const bookingsCount = useCounter(overview.bookings_total || 0);
  const revenueVal = useCounter(Math.round(numeric(overview.revenue_month_test) / 1000));
  const ratingVal = useCounter(Math.round(Number(overview.average_rating || 0) * 20));
  const spacesCount = useCounter(overview.places_total || 0);
  const revenueChartData = import.meta.env.DEV && usingFallback
    ? CHART_DATA[period]
    : (overview.revenue_chart?.[period] || overview.chart?.[period] || []);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? '☀️ Доброе утро' : hour < 17 ? '🌤 Добрый день' : '🌙 Добрый вечер';
  const userName = getStorageItem(STORAGE_KEYS.profile.name, 'Admin');
  const today = new Intl.DateTimeFormat('ru', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

  return (
    <>
      <div className="adm-welcome adm-anim adm-anim-1">
        <div className="adm-welcome-text">
          <h1>{greeting}, {userName}! 👋</h1>
          <p>
            {today} · Панель управления Joyzone
            {loading ? ' · загрузка...' : ''}
            {usingFallback ? ' · DEV fallback данные' : ''}
          </p>
          {error ? <p style={{ color: '#dc2626', marginTop: 8 }}>{error}</p> : null}
        </div>
        <div className="adm-welcome-actions">
          <button className="adm-btn adm-btn-ghost" onClick={() => setPage('bookings')}>📅 Брони</button>
          <button className="adm-btn adm-btn-primary" onClick={() => setPage('spaces')}>+ Новое место</button>
        </div>
      </div>

      <div className="adm-kpi-grid adm-anim adm-anim-2">
        <div className="adm-kpi-card navy">
          <div className="adm-kpi-label">Всего броней</div>
          <div className="adm-kpi-value">{bookingsCount}</div>
          <div className="adm-kpi-delta up">{overview.bookings_pending || 0} ожидают</div>
          <div className="adm-sparkline">
            {[40,65,50,80,60,90,70].map((h,i) => <div key={i} className={`adm-sparkline-bar${i===5?' accent':''}`} style={{height:h+'%'}} />)}
          </div>
        </div>
        <div className="adm-kpi-card orange">
          <div className="adm-kpi-label">Доход за месяц</div>
          <div className="adm-kpi-value">{revenueVal.toLocaleString()} K</div>
          <div className="adm-kpi-delta up">{formatCompact(overview.revenue_month_test)} UZS test</div>
          <div className="adm-sparkline">
            {[30,55,45,70,85,65,95].map((h,i) => <div key={i} className={`adm-sparkline-bar${i===6?' accent':''}`} style={{height:h+'%'}} />)}
          </div>
        </div>
        <div className="adm-kpi-card teal">
          <div className="adm-kpi-label">Средний рейтинг</div>
          <div className="adm-kpi-value">{(ratingVal/20).toFixed(1)} ⭐</div>
          <div className="adm-kpi-delta up">{overview.reviews_count || 0} отзывов</div>
          <div className="adm-sparkline">
            {[75,80,78,82,85,83,88].map((h,i) => <div key={i} className={`adm-sparkline-bar${i===6?' accent':''}`} style={{height:h+'%'}} />)}
          </div>
        </div>
        <div className="adm-kpi-card purple">
          <div className="adm-kpi-label">Всего мест</div>
          <div className="adm-kpi-value">{spacesCount}</div>
          <div className="adm-kpi-delta up">{overview.places_approved || 0} Active · {overview.places_pending || 0} Pending</div>
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
              <div className="adm-chart-wrap"><RevenueChart data={revenueChartData} /></div>
              <div className="adm-chart-labels">
                {revenueChartData.map(d => <span key={d.label} className="adm-chart-label">{d.label}</span>)}
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
                {spaces.map(space => (
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
                {!loading && spaces.length === 0 ? <div style={{ color: 'var(--text-muted)', padding: 16 }}>Мест пока нет</div> : null}
              </div>
            </div>
          </div>
        </div>

        <div className="adm-overview-right">
          <div className="adm-card">
            <div className="adm-card-pad">
              <div className="adm-card-head">
                <div><div className="adm-card-title">Ближайшие брони</div><div className="adm-card-sub">{bookings.length} последних</div></div>
                <button className="adm-btn adm-btn-outline" style={{fontSize:12,padding:'6px 12px'}} onClick={() => setPage('bookings')}>Все</button>
              </div>
              <div className="adm-booking-list">
                {bookings.map(b => (
                  <div key={b.id} className="adm-booking-item">
                    <div className="adm-booking-avatar" style={{background:b.color}}>{String(b.name).slice(0,2).toUpperCase()}</div>
                    <div className="adm-booking-info">
                      <div className="adm-booking-name">{b.name}</div>
                      <div className="adm-booking-meta">{b.space} · {b.time}</div>
                    </div>
                    <span className={`adm-status-pill ${b.status}`}>{STATUS_LABELS[b.status] || b.status}</span>
                  </div>
                ))}
                {!loading && bookings.length === 0 ? <div style={{ color: 'var(--text-muted)', padding: 12 }}>Броней пока нет</div> : null}
              </div>
            </div>
          </div>

          <div className="adm-card">
            <div className="adm-card-pad">
              <div className="adm-card-head">
                <div className="adm-card-title">Последние отзывы</div>
                <button className="adm-btn adm-btn-outline" style={{fontSize:12,padding:'6px 12px'}} onClick={() => setPage('reviews')}>Все</button>
              </div>
              {reviews.map((r) => (
                <div key={r.id || `${r.name}-${r.text}`} className="adm-review-item">
                  <div className="adm-review-avatar">{String(r.name).slice(0,2).toUpperCase()}</div>
                  <div className="adm-review-body">
                    <div className="adm-review-header">
                      <span className="adm-review-name">{r.name}</span>
                      <span className="adm-review-stars">{'★'.repeat(Math.max(0, Math.min(r.stars, 5)))}</span>
                    </div>
                    <div className="adm-review-text">{r.text}</div>
                  </div>
                </div>
              ))}
              {!loading && reviews.length === 0 ? <div style={{ color: 'var(--text-muted)', padding: 12 }}>Отзывов пока нет</div> : null}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
