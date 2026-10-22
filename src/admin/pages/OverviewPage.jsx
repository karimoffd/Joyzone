import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api, { getApiErrorMessage, isRequestCanceled } from '../../api/client.js';
import { Icon } from '../AdminIcons.jsx';
import { Avatar } from '../AdminLayout.jsx';
import './overview.css';

const PERIODS = [
  { id: '7d', label: '7 дней', short: 'за неделю' },
  { id: '30d', label: '30 дней', short: 'за 30 дней' },
  { id: '90d', label: '90 дней', short: 'за 90 дней' },
  { id: '365d', label: 'Год', short: 'за год' },
];

const STATUS_META = {
  pending: { label: 'Ожидает', color: '#f59e0b' },
  confirmed: { label: 'Подтверждена', color: '#294a6d' },
  completed: { label: 'Завершена', color: '#16a34a' },
  cancelled: { label: 'Отменена', color: '#ef4444' },
  blocked: { label: 'Блокировка', color: '#94a3b8' },
};

const ROLE_META = {
  client: { label: 'Клиент', color: '#294a6d' },
  partner: { label: 'Партнёр', color: '#e46630' },
  moderator: { label: 'Модератор', color: '#7c3aed' },
  admin: { label: 'Админ', color: '#0f766e' },
};

const numberFormat = new Intl.NumberFormat('ru-RU');

function formatNumber(value) {
  return numberFormat.format(Math.round(Number(value) || 0));
}

function formatMoney(value, { compact = false } = {}) {
  const amount = Number(value) || 0;
  if (compact && Math.abs(amount) >= 1_000_000) return `${(amount / 1_000_000).toFixed(amount >= 10_000_000 ? 0 : 1).replace('.', ',')} млн`;
  if (compact && Math.abs(amount) >= 10_000) return `${Math.round(amount / 1000)} тыс`;
  return `${formatNumber(amount)} сум`;
}

function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function formatRelative(value) {
  if (!value) return '';
  const diff = (Date.now() - new Date(value).getTime()) / 1000;
  if (diff < 60) return 'только что';
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} дн назад`;
  return new Date(value).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 6) return 'Доброй ночи';
  if (hour < 12) return 'Доброе утро';
  if (hour < 18) return 'Добрый день';
  return 'Добрый вечер';
}

function ChangeBadge({ change, inverse = false }) {
  if (change === null || change === undefined) {
    return <span className="ov-change is-flat">нет данных для сравнения</span>;
  }
  const positive = change > 0;
  const good = inverse ? change < 0 : change > 0;
  const tone = change === 0 ? 'is-flat' : good ? 'is-good' : 'is-bad';
  return (
    <span className={`ov-change ${tone}`}>
      {change !== 0 ? <Icon name={positive ? 'arrowUp' : 'arrowDown'} size={13} strokeWidth={2.5} /> : null}
      {change > 0 ? '+' : ''}{String(change).replace('.', ',')}%
      <em>к прошлому периоду</em>
    </span>
  );
}

function Sparkline({ values, color }) {
  const safe = values.length > 1 ? values : [0, 0];
  const max = Math.max(...safe, 1);
  const points = safe.map((value, index) => `${(index / (safe.length - 1)) * 100},${30 - (value / max) * 26}`).join(' ');
  return (
    <svg className="ov-spark" viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function KpiCard({ icon, label, value, kpi, tone, spark, inverse, hint }) {
  return (
    <article className={`ov-kpi ov-tone-${tone}`}>
      <div className="ov-kpi-top">
        <span className="ov-kpi-icon"><Icon name={icon} size={18} /></span>
        <span className="ov-kpi-label">{label}</span>
      </div>
      <strong className="ov-kpi-value">{value}</strong>
      <ChangeBadge change={kpi?.change} inverse={inverse} />
      {hint ? <small className="ov-kpi-hint">{hint}</small> : null}
      {spark ? <Sparkline values={spark} color="currentColor" /> : null}
    </article>
  );
}

const CHART_METRICS = {
  revenue: { label: 'Выручка', color: '#e46630', format: (value) => formatMoney(value) },
  bookings: { label: 'Бронирования', color: '#294a6d', format: (value) => `${formatNumber(value)} брон.` },
  users: { label: 'Новые пользователи', color: '#0f766e', format: (value) => `${formatNumber(value)} чел.` },
};

function TrendChart({ series, metric }) {
  const [hover, setHover] = useState(null);
  const meta = CHART_METRICS[metric];
  const values = series.map((row) => Number(row[metric]) || 0);
  const max = Math.max(...values, 1);
  const niceMax = (() => {
    const magnitude = 10 ** Math.floor(Math.log10(max));
    const rounded = Math.ceil(max / magnitude) * magnitude;
    // Small counts get a 0..4 axis so the gridline labels stay whole numbers.
    return metric === 'revenue' ? rounded : Math.max(4, Math.ceil(rounded / 4) * 4);
  })();
  const count = Math.max(values.length, 2);
  const x = (index) => (count === 1 ? 50 : (index / (count - 1)) * 100);
  const y = (value) => 100 - (value / niceMax) * 100;
  const line = values.map((value, index) => `${x(index)},${y(value)}`).join(' ');
  const area = `0,100 ${line} 100,100`;
  const labelStep = Math.ceil(series.length / 6);
  const total = values.reduce((sum, value) => sum + value, 0);
  const active = hover !== null ? series[hover] : null;

  return (
    <div className="ov-trend">
      <div className="ov-trend-total">
        <strong>{meta.format(total)}</strong>
        <span>всего за период</span>
      </div>
      <div className="ov-trend-plot">
        <div className="ov-trend-grid" aria-hidden="true">
          {[1, 0.75, 0.5, 0.25, 0].map((ratio) => (
            <div key={ratio}><span>{metric === 'revenue' ? formatMoney(niceMax * ratio, { compact: true }) : formatNumber(niceMax * ratio)}</span></div>
          ))}
        </div>
        <svg className="ov-trend-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id={`ov-grad-${metric}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={meta.color} stopOpacity="0.28" />
              <stop offset="100%" stopColor={meta.color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon points={area} fill={`url(#ov-grad-${metric})`} />
          <polyline points={line} fill="none" stroke={meta.color} strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
          {hover !== null ? (
            <line x1={x(hover)} x2={x(hover)} y1="0" y2="100" stroke={meta.color} strokeOpacity="0.35" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
          ) : null}
        </svg>
        {hover !== null ? (
          <span className="ov-trend-dot" style={{ left: `${x(hover)}%`, top: `${y(values[hover])}%`, background: meta.color }} />
        ) : null}
        <div className="ov-trend-hit" onMouseLeave={() => setHover(null)}>
          {series.map((row, index) => (
            <span key={`${row.label}-${index}`} onMouseEnter={() => setHover(index)} onTouchStart={() => setHover(index)} />
          ))}
        </div>
        {active ? (
          <div className={`ov-trend-tip${x(hover) > 70 ? ' is-left' : ''}`} style={{ left: `${x(hover)}%` }}>
            <small>{active.label}</small>
            {Object.entries(CHART_METRICS).map(([key, item]) => (
              active[key] === null || active[key] === undefined ? null : (
                <div key={key} className={key === metric ? 'is-current' : ''}>
                  <i style={{ background: item.color }} />{item.label}<b>{item.format(active[key])}</b>
                </div>
              )
            ))}
          </div>
        ) : null}
      </div>
      <div className="ov-trend-labels">
        {series.map((row, index) => (
          <span key={`${row.label}-${index}`} style={{ left: `${x(index)}%` }}>
            {index === series.length - 1 || (index % labelStep === 0 && series.length - 1 - index >= labelStep / 2) ? row.label : ''}
          </span>
        ))}
      </div>
    </div>
  );
}

function Donut({ rows }) {
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <div className="ov-donut-wrap">
      <div className="ov-donut">
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="#f1ece8" strokeWidth="12" />
          {total > 0 && rows.map((row) => {
            const length = (row.count / total) * circumference;
            const segment = (
              <circle
                key={row.status}
                cx="50" cy="50" r={radius} fill="none"
                stroke={STATUS_META[row.status]?.color || '#94a3b8'}
                strokeWidth="12"
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-offset}
                transform="rotate(-90 50 50)"
              />
            );
            offset += length;
            return segment;
          })}
        </svg>
        <div className="ov-donut-center">
          <strong>{formatNumber(total)}</strong>
          <span>броней</span>
        </div>
      </div>
      <ul className="ov-legend">
        {rows.map((row) => (
          <li key={row.status}>
            <i style={{ background: STATUS_META[row.status]?.color }} />
            <span>{row.label}</span>
            <b>{formatNumber(row.count)}</b>
            <em>{total ? Math.round((row.count / total) * 100) : 0}%</em>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BarList({ rows, valueKey = 'count', format = formatNumber, color = '#294a6d', empty }) {
  const max = Math.max(...rows.map((row) => Number(row[valueKey]) || 0), 1);
  if (!rows.length) return <p className="ov-empty">{empty}</p>;
  return (
    <ul className="ov-bars">
      {rows.map((row) => (
        <li key={row.name || row.role}>
          <div className="ov-bars-head">
            <span>{row.name || row.label}</span>
            <b>{format(row[valueKey])}</b>
          </div>
          <div className="ov-bars-track">
            <span style={{ width: `${Math.max(((Number(row[valueKey]) || 0) / max) * 100, 2)}%`, background: row.color || color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Panel({ title, subtitle, action, children, className = '' }) {
  return (
    <section className={`ov-panel ${className}`}>
      <header className="ov-panel-head">
        <div>
          <h3>{title}</h3>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

function LinkButton({ onClick, children }) {
  return (
    <button type="button" className="ov-link" onClick={onClick}>
      {children}<Icon name="chevronRight" size={15} />
    </button>
  );
}

function Stars({ rating }) {
  return (
    <span className="ov-stars" aria-label={`${rating} из 5`}>
      {[1, 2, 3, 4, 5].map((star) => <span key={star} className={star <= rating ? 'is-on' : ''}>★</span>)}
    </span>
  );
}

function OverviewSkeleton() {
  return (
    <div className="ov-skeleton" aria-busy="true" aria-label="Загрузка статистики">
      <div className="ov-skel ov-skel-hero" />
      <div className="ov-kpis">{[0, 1, 2, 3].map((item) => <div key={item} className="ov-skel ov-skel-kpi" />)}</div>
      <div className="ov-skel ov-skel-chart" />
    </div>
  );
}

export default function OverviewPage({ setPage, profile, allowedPages = [] }) {
  const [period, setPeriod] = useState('30d');
  const [metric, setMetric] = useState(null);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [loadedAt, setLoadedAt] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    async function loadOverview() {
      setLoading(true);
      try {
        const res = await api.get('/api/admin/overview/', { params: { period }, signal: controller.signal });
        setOverview(res.data);
        setError('');
        setLoadedAt(new Date());
      } catch (err) {
        if (isRequestCanceled(err)) return;
        setError(getApiErrorMessage(err, 'Не удалось загрузить статистику.'));
      }
      if (!controller.signal.aborted) setLoading(false);
    }
    loadOverview();
    return () => controller.abort();
  }, [period, reloadKey]);

  const canViewFinance = Boolean(overview?.can_view_finance);
  const activeMetric = metric || (canViewFinance ? 'revenue' : 'bookings');
  const series = useMemo(() => overview?.series || [], [overview]);
  const spark = useCallback((key) => series.map((row) => Number(row[key]) || 0), [series]);
  const go = (id) => (allowedPages.includes(id) ? () => setPage(id) : undefined);
  const periodMeta = PERIODS.find((item) => item.id === period);
  const firstName = String(profile?.first_name || profile?.full_name || '').split(' ')[0];

  if (!overview && loading) return <OverviewSkeleton />;
  if (!overview) {
    return (
      <div className="ov-error-state">
        <Icon name="info" size={28} />
        <h3>Статистика недоступна</h3>
        <p>{error}</p>
        <button type="button" className="adm-btn adm-btn-primary" onClick={() => setReloadKey((key) => key + 1)}>Повторить</button>
      </div>
    );
  }

  const { kpis = {}, totals = {}, attention = {} } = overview;
  const attentionItems = [
    { id: 'moderation', count: attention.places_pending, label: 'мест на модерации', icon: 'shield' },
    { id: 'bookings', count: attention.bookings_pending, label: 'броней ждут ответа', icon: 'calendar' },
    { id: 'messages', count: attention.unread_chats, label: 'непрочитанных чатов', icon: 'chat' },
    { id: 'reviews', count: attention.low_reviews, label: 'плохих отзывов за 30 дней', icon: 'star' },
  ].filter((item) => item.count > 0 && allowedPages.includes(item.id));

  const kpiCards = [
    canViewFinance && kpis.revenue ? { key: 'revenue', icon: 'money', label: 'Выручка', value: formatMoney(kpis.revenue.value), kpi: kpis.revenue, tone: 'orange', spark: spark('revenue') } : null,
    { key: 'bookings', icon: 'calendar', label: 'Бронирования', value: formatNumber(kpis.bookings?.value), kpi: kpis.bookings, tone: 'navy', spark: spark('bookings') },
    { key: 'users', icon: 'users', label: 'Новые пользователи', value: formatNumber(kpis.new_users?.value), kpi: kpis.new_users, tone: 'teal', spark: spark('users') },
    canViewFinance && kpis.avg_check
      ? { key: 'check', icon: 'trend', label: 'Средний чек', value: formatMoney(kpis.avg_check.value), kpi: kpis.avg_check, tone: 'plum' }
      : { key: 'places', icon: 'building', label: 'Новые места', value: formatNumber(kpis.new_places?.value), kpi: kpis.new_places, tone: 'plum' },
  ].filter(Boolean);

  const roleRows = (overview.users_by_role || []).map((row) => ({ ...row, color: ROLE_META[row.role]?.color, name: row.label }));
  const metricOptions = Object.entries(CHART_METRICS).filter(([key]) => key !== 'revenue' || canViewFinance);

  return (
    <div className={`ov-page${loading ? ' is-refreshing' : ''}`}>
      <section className="ov-hero">
        <div className="ov-hero-text">
          <span className="ov-hero-date">{new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          <h2>{greeting()}{firstName ? `, ${firstName}` : ''}!</h2>
          <p>
            {attentionItems.length
              ? `Есть ${attentionItems.reduce((sum, item) => sum + item.count, 0)} задач, которые ждут вас.`
              : 'Срочных задач нет — всё под контролем.'}
          </p>
        </div>
        <div className="ov-hero-controls">
          <div className="ov-segment" role="tablist" aria-label="Период">
            {PERIODS.map((item) => (
              <button key={item.id} type="button" role="tab" aria-selected={period === item.id} className={period === item.id ? 'is-active' : ''} onClick={() => setPeriod(item.id)}>
                {item.label}
              </button>
            ))}
          </div>
          <button type="button" className="ov-refresh" onClick={() => setReloadKey((key) => key + 1)} title="Обновить">
            <Icon name="undo" size={16} />
            {loadedAt ? <span>{loadedAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span> : null}
          </button>
        </div>
      </section>

      {error ? <div className="ov-inline-error"><Icon name="info" size={16} />{error}</div> : null}

      {attentionItems.length ? (
        <section className="ov-attention" aria-label="Требует внимания">
          {attentionItems.map((item) => (
            <button key={item.id} type="button" onClick={() => setPage(item.id)}>
              <span className="ov-attention-icon"><Icon name={item.icon} size={17} /></span>
              <span><b>{item.count}</b> {item.label}</span>
              <Icon name="chevronRight" size={16} />
            </button>
          ))}
        </section>
      ) : null}

      <section className="ov-kpis">
        {kpiCards.map(({ key, ...card }) => <KpiCard key={key} {...card} />)}
      </section>

      <div className="ov-grid ov-grid-main">
        <Panel
          title="Динамика"
          subtitle={`${CHART_METRICS[activeMetric].label} ${periodMeta?.short}`}
          className="ov-panel-chart"
          action={(
            <div className="ov-segment is-small">
              {metricOptions.map(([key, item]) => (
                <button key={key} type="button" className={activeMetric === key ? 'is-active' : ''} onClick={() => setMetric(key)}>{item.label}</button>
              ))}
            </div>
          )}
        >
          <TrendChart series={series} metric={activeMetric} />
        </Panel>

        <Panel title="Статусы броней" subtitle={periodMeta?.short} action={go('bookings') ? <LinkButton onClick={go('bookings')}>Все</LinkButton> : null}>
          <Donut rows={overview.bookings_by_status || []} />
          <div className="ov-mini-stats">
            <div>
              <span>Отмены</span>
              <strong>{String(kpis.cancel_rate?.value ?? 0).replace('.', ',')}%</strong>
              <ChangeBadge change={kpis.cancel_rate?.change} inverse />
            </div>
          </div>
        </Panel>
      </div>

      <div className="ov-grid ov-grid-three">
        <Panel title="Категории" subtitle={`Брони по типам мест ${periodMeta?.short}`}>
          <BarList rows={overview.bookings_by_category || []} empty="Броней за период пока нет" color="#e46630" />
        </Panel>
        <Panel title="Платформа" subtitle="Всего на сайте" action={go('users') ? <LinkButton onClick={go('users')}>Люди</LinkButton> : null}>
          <div className="ov-totals">
            <div><span>Пользователи</span><strong>{formatNumber(totals.users)}</strong></div>
            <div><span>Места онлайн</span><strong>{formatNumber(totals.places_approved)}<small> / {formatNumber(totals.places_total)}</small></strong></div>
            <div><span>Все брони</span><strong>{formatNumber(totals.bookings_total)}</strong></div>
            <div><span>Рейтинг</span><strong>{String(totals.average_rating || 0).replace('.', ',')}<small> ★ · {formatNumber(totals.reviews)} отз.</small></strong></div>
          </div>
          <BarList rows={roleRows} empty="Нет пользователей" />
        </Panel>
        <Panel title="Новые пользователи" subtitle="Последние регистрации" action={go('users') ? <LinkButton onClick={go('users')}>Все</LinkButton> : null}>
          {(overview.latest_users || []).length ? (
            <ul className="ov-people">
              {overview.latest_users.map((user) => (
                <li key={user.id}>
                  <Avatar src={user.avatar} name={user.name} size={36} />
                  <div>
                    <strong>{user.name}</strong>
                    <small>{user.phone || 'без телефона'}</small>
                  </div>
                  <span className="ov-role" style={{ '--role': ROLE_META[user.role]?.color || '#294a6d' }}>{ROLE_META[user.role]?.label || user.role}</span>
                  <em>{formatRelative(user.date_joined)}</em>
                </li>
              ))}
            </ul>
          ) : <p className="ov-empty">Регистраций пока нет</p>}
        </Panel>
      </div>

      <div className="ov-grid ov-grid-main">
        <Panel title="Последние бронирования" subtitle="Свежие заявки клиентов" action={go('bookings') ? <LinkButton onClick={go('bookings')}>Открыть</LinkButton> : null}>
          {(overview.latest_bookings || []).length ? (
            <div className="ov-table-wrap">
              <table className="ov-table">
                <thead>
                  <tr><th>Клиент</th><th>Место</th><th>Когда</th>{canViewFinance ? <th>Сумма</th> : null}<th>Статус</th></tr>
                </thead>
                <tbody>
                  {overview.latest_bookings.map((booking) => (
                    <tr key={booking.id}>
                      <td><strong>{booking.client_name || 'Клиент'}</strong><small>{booking.client_phone}</small></td>
                      <td className="ov-wrap">{booking.place_title}</td>
                      <td>{formatDateTime(booking.start_time)}</td>
                      {canViewFinance ? <td className="ov-num">{formatMoney(booking.amount)}</td> : null}
                      <td>
                        <span className="ov-status" style={{ '--status': STATUS_META[booking.status]?.color || '#94a3b8' }}>
                          {STATUS_META[booking.status]?.label || booking.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="ov-empty">Бронирований пока нет</p>}
        </Panel>

        <Panel title="Свежие отзывы" action={go('reviews') ? <LinkButton onClick={go('reviews')}>Все</LinkButton> : null}>
          {(overview.latest_reviews || []).length ? (
            <ul className="ov-reviews">
              {overview.latest_reviews.map((review) => (
                <li key={review.id}>
                  <div className="ov-reviews-head">
                    <span className="ov-reviews-user"><Avatar src={review.user_avatar} name={review.user_name} size={26} /><strong>{review.user_name}</strong></span>
                    <Stars rating={review.rating} />
                  </div>
                  <p>{review.comment || 'Без комментария'}</p>
                  <small>{review.place_title} · {formatRelative(review.created_at)}</small>
                </li>
              ))}
            </ul>
          ) : <p className="ov-empty">Отзывов пока нет</p>}
        </Panel>
      </div>

      <Panel title="Лучшие места" subtitle={`По числу броней ${periodMeta?.short}`} action={go('spaces') ? <LinkButton onClick={go('spaces')}>Все места</LinkButton> : null}>
        {(overview.top_places || []).length ? (
          <div className="ov-table-wrap">
            <table className="ov-table">
              <thead>
                <tr><th>#</th><th>Место</th><th>Категория</th><th>Владелец</th><th className="ov-num">Брони</th>{canViewFinance ? <th className="ov-num">Выручка</th> : null}<th className="ov-num">Рейтинг</th></tr>
              </thead>
              <tbody>
                {overview.top_places.map((place, index) => (
                  <tr key={place.id}>
                    <td><span className={`ov-rank ov-rank-${index + 1}`}>{index + 1}</span></td>
                    <td className="ov-wrap"><strong>{place.title}</strong></td>
                    <td>{place.category_name || '—'}</td>
                    <td>{place.owner_name || '—'}</td>
                    <td className="ov-num">{formatNumber(place.bookings_count)}</td>
                    {canViewFinance ? <td className="ov-num">{formatMoney(place.revenue_test)}</td> : null}
                    <td className="ov-num">{place.reviews_count ? `${String(place.rating_avg).replace('.', ',')} ★` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="ov-empty">Одобренных мест пока нет</p>}
      </Panel>
    </div>
  );
}
