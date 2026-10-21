import React, { useEffect, useMemo, useState } from 'react';
import api, { getApiErrorMessage } from '../../api/client.js';

const ACTION_OPTIONS = [
  'place.created',
  'place.updated',
  'place.deleted',
  'place.approved',
  'place.rejected',
  'booking.confirmed',
  'booking.cancelled',
  'booking.blocked',
  'tariff.activated',
  'payment.test_paid',
  'payment.refunded',
  'user.role_updated',
];

const OBJECT_TYPE_OPTIONS = ['Place', 'Booking', 'TariffSubscription', 'Payment', 'User'];

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') return '—';
  const entries = Object.entries(metadata);
  if (entries.length === 0) return '—';

  const preview = entries.slice(0, 4).map(([key, value]) => {
    const rendered = typeof value === 'object' && value !== null
      ? JSON.stringify(value)
      : String(value);
    return `${key}: ${rendered}`;
  }).join(' · ');
  const suffix = entries.length > 4 ? ` · +${entries.length - 4}` : '';
  return `${preview}${suffix}`.slice(0, 240);
}

const EMPTY_FILTERS = {
  action: '',
  object_type: '',
  actor: '',
  date_from: '',
  date_to: '',
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAuditLogs = async (activeFilters = appliedFilters) => {
    setLoading(true);
    setError('');
    try {
      const params = { limit: 200 };
      Object.entries(activeFilters).forEach(([key, value]) => {
        if (String(value || '').trim()) params[key] = String(value).trim();
      });
      const response = await api.get('/api/audit-logs/', { params });
      const data = response.data?.results || response.data || [];
      setLogs(Array.isArray(data) ? data : []);
    } catch (requestError) {
      setLogs([]);
      setError(getApiErrorMessage(requestError, 'Не удалось загрузить журнал действий.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs(appliedFilters);
  }, [appliedFilters]);

  const availableActions = useMemo(() => (
    Array.from(new Set([...ACTION_OPTIONS, ...logs.map((item) => item.action).filter(Boolean)])).sort()
  ), [logs]);

  const availableObjectTypes = useMemo(() => (
    Array.from(new Set([...OBJECT_TYPE_OPTIONS, ...logs.map((item) => item.object_type).filter(Boolean)])).sort()
  ), [logs]);

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const applyFilters = (event) => {
    event.preventDefault();
    setAppliedFilters({ ...filters });
  };

  const resetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
  };

  return (
    <div className="adm-anim adm-anim-1">
      <div className="adm-card" style={{ marginBottom: 20 }}>
        <div className="adm-card-pad">
          <div className="adm-card-head" style={{ marginBottom: 16 }}>
            <div>
              <div className="adm-card-title">Фильтры журнала</div>
              <div className="adm-card-sub">Фильтрация выполняется на backend</div>
            </div>
            <button type="button" className="adm-btn adm-btn-outline" onClick={() => loadAuditLogs()} disabled={loading}>
              Обновить
            </button>
          </div>

          <form onSubmit={applyFilters} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, alignItems: 'end' }}>
            <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 }}>
              Действие
              <select value={filters.action} onChange={(event) => updateFilter('action', event.target.value)} style={controlStyle}>
                <option value="">Все действия</option>
                {availableActions.map((action) => <option key={action} value={action}>{action}</option>)}
              </select>
            </label>
            <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 }}>
              Тип объекта
              <select value={filters.object_type} onChange={(event) => updateFilter('object_type', event.target.value)} style={controlStyle}>
                <option value="">Все типы</option>
                {availableObjectTypes.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </label>
            <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 }}>
              Actor ID
              <input type="number" min="1" value={filters.actor} onChange={(event) => updateFilter('actor', event.target.value)} placeholder="Например, 1" style={controlStyle} />
            </label>
            <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 }}>
              Дата от
              <input type="date" value={filters.date_from} onChange={(event) => updateFilter('date_from', event.target.value)} style={controlStyle} />
            </label>
            <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 }}>
              Дата до
              <input type="date" value={filters.date_to} onChange={(event) => updateFilter('date_to', event.target.value)} style={controlStyle} />
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="adm-btn adm-btn-primary" disabled={loading}>Применить</button>
              <button type="button" className="adm-btn adm-btn-outline" onClick={resetFilters} disabled={loading}>Сбросить</button>
            </div>
          </form>
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-card-pad">
          <div className="adm-card-head">
            <div>
              <div className="adm-card-title">Журнал действий</div>
              <div className="adm-card-sub">{loading ? 'Загрузка...' : `${logs.length} записей`}</div>
            </div>
          </div>

          {error ? (
            <div role="alert" style={{ marginBottom: 16, padding: 12, borderRadius: 10, background: '#fef2f2', color: '#991b1b', fontSize: 13 }}>
              {error}
              <button type="button" className="adm-btn adm-btn-outline" onClick={() => loadAuditLogs()} style={{ marginLeft: 12, padding: '5px 10px', fontSize: 12 }}>Повторить</button>
            </div>
          ) : null}

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 980, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  {['Дата', 'Actor', 'Действие', 'Объект', 'ID', 'Metadata'].map((heading) => (
                    <th key={heading} style={headingStyle}>{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={cellStyle}>{formatDateTime(log.created_at)}</td>
                    <td style={cellStyle}>
                      <strong style={{ display: 'block', color: 'var(--text)' }}>{log.actor_name || 'Система'}</strong>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{log.actor ? `ID ${log.actor}` : 'Без actor'}</span>
                    </td>
                    <td style={cellStyle}><code style={codeStyle}>{log.action}</code></td>
                    <td style={cellStyle}>{log.object_type || '—'}</td>
                    <td style={cellStyle}>{log.object_id || '—'}</td>
                    <td style={{ ...cellStyle, maxWidth: 360, color: 'var(--text-muted)', lineHeight: 1.45 }} title={JSON.stringify(log.metadata || {})}>
                      {formatMetadata(log.metadata)}
                    </td>
                  </tr>
                ))}
                {!loading && !error && logs.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
                      По выбранным фильтрам записей нет
                    </td>
                  </tr>
                ) : null}
                {loading ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
                      Журнал загружается...
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

const controlStyle = {
  width: '100%',
  minHeight: 40,
  border: '1px solid var(--border)',
  borderRadius: 10,
  background: '#fff',
  color: 'var(--text)',
  padding: '8px 10px',
  fontFamily: 'Inter, sans-serif',
  fontSize: 13,
};

const headingStyle = {
  padding: '11px 12px',
  textAlign: 'left',
  color: 'var(--text-muted)',
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.6px',
};

const cellStyle = {
  padding: '12px',
  color: 'var(--text)',
  fontSize: 13,
  verticalAlign: 'top',
};

const codeStyle = {
  display: 'inline-block',
  borderRadius: 7,
  background: 'rgba(228,102,48,0.1)',
  color: '#b54718',
  padding: '4px 7px',
  fontFamily: 'monospace',
  fontSize: 12,
};
