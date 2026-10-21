import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api, { getApiErrorMessage } from '../../api/client.js';

const STATUS_LABELS = {
  created: 'Создано',
  test_paid: 'Test paid',
  paid: 'Оплачено',
  failed: 'Ошибка',
  refunded: 'Возврат',
};

const TYPE_LABELS = {
  booking: 'Бронь',
  tariff_subscription: 'Тариф',
  refund: 'Возврат',
  manual: 'Ручная',
};

function formatMoney(value, currency = 'UZS') {
  const numeric = Number(String(value || 0).replace(/[^\d.-]/g, ''));
  if (!Number.isFinite(numeric)) return `0 ${currency}`;
  return `${new Intl.NumberFormat('ru-RU').format(Math.abs(numeric))} ${currency}`;
}

function formatCompact(value) {
  const numeric = Number(String(value || 0).replace(/[^\d.-]/g, ''));
  if (!Number.isFinite(numeric) || numeric === 0) return '0';
  if (numeric >= 1000000) return `${(numeric / 1000000).toFixed(numeric >= 10000000 ? 0 : 1)}M`;
  if (numeric >= 1000) return `${Math.round(numeric / 1000)}K`;
  return String(Math.round(numeric));
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || '';
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function signedAmount(transaction) {
  const sign = transaction.status === 'refunded' || transaction.type === 'refund' || String(transaction.amount).startsWith('-') ? '-' : '+';
  return `${sign}${formatMoney(transaction.raw_amount || transaction.amount, transaction.currency)}`;
}

export default function FinancePage() {
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [summaryError, setSummaryError] = useState('');
  const [transactionsError, setTransactionsError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [refundingId, setRefundingId] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    dateFrom: '',
    dateTo: '',
    search: '',
  });

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const summaryRes = await api.get('/api/finance/summary/');
      setSummary(summaryRes.data || {});
      setSummaryError('');
    } catch (error) {
      setSummary(null);
      setSummaryError(getApiErrorMessage(error, 'Не удалось загрузить финансовую сводку.'));
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const loadTransactions = useCallback(async (activeFilters = filters) => {
    setTransactionsLoading(true);
    try {
      const params = {};
      if (activeFilters.status !== 'all') params.status = activeFilters.status;
      if (activeFilters.type !== 'all') params.type = activeFilters.type;
      if (activeFilters.dateFrom) params.date_from = activeFilters.dateFrom;
      if (activeFilters.dateTo) params.date_to = activeFilters.dateTo;
      if (activeFilters.search.trim()) params.search = activeFilters.search.trim();

      const response = await api.get('/api/finance/transactions/', { params });
      setTransactions(response.data?.results || response.data || []);
      setTransactionsError('');
    } catch (error) {
      setTransactions([]);
      setTransactionsError(getApiErrorMessage(error, 'Не удалось загрузить транзакции.'));
    } finally {
      setTransactionsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    const timer = window.setTimeout(() => loadTransactions(filters), 300);
    return () => window.clearTimeout(timer);
  }, [filters, loadTransactions]);

  const kpis = useMemo(() => {
    const data = summary || {
      total_revenue: 0,
      month_revenue: 0,
      pending_payouts: 0,
      refunds_total: 0,
      payments_count: 0,
    };
    return [
      { tone: 'navy', label: 'Доход за месяц', value: formatCompact(data.month_revenue), delta: `${formatMoney(data.total_revenue)} всего` },
      { tone: 'orange', label: 'Ожидают выплаты', value: formatCompact(data.pending_payouts), delta: `${data.payments_count || 0} оплат` },
      { tone: 'teal', label: 'Возвраты', value: formatCompact(data.refunds_total), delta: 'Test refunds' },
    ];
  }, [summary]);

  const handleRefund = async (transaction) => {
    if (!transaction.payment_id && !transaction.id) return;
    const confirmed = window.confirm(`Оформить тестовый возврат по платежу #${transaction.payment_id || transaction.id}?`);
    if (!confirmed) return;

    setRefundingId(transaction.id);
    setActionMessage('');
    try {
      await api.post(`/api/payments/${transaction.payment_id || transaction.id}/refund/`, {});
      await Promise.all([loadSummary(), loadTransactions(filters)]);
      setActionMessage('Возврат выполнен, финансовые данные обновлены.');
    } catch (error) {
      setActionMessage(getApiErrorMessage(error, 'Не удалось выполнить возврат.'));
    } finally {
      setRefundingId(null);
    }
  };

  const resetFilters = () => {
    setFilters({ status: 'all', type: 'all', dateFrom: '', dateTo: '', search: '' });
  };

  const exportCsv = () => {
    if (!transactions.length) return;
    const escapeCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = [
      ['ID', 'Дата', 'Клиент', 'Телефон', 'Объект', 'Тариф', 'Тип', 'Сумма', 'Валюта', 'Статус'],
      ...transactions.map((transaction) => [
        transaction.payment_id || transaction.id,
        transaction.date || transaction.created_at,
        transaction.client,
        transaction.client_phone,
        transaction.space,
        transaction.tariff,
        transaction.type,
        transaction.amount,
        transaction.currency,
        transaction.status,
      ]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map(escapeCell).join(';')).join('\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `joyzone-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="adm-anim adm-anim-1">
      <div className="adm-kpi-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 24 }}>
        {kpis.map((item) => (
          <div key={item.label} className={`adm-kpi-card ${item.tone}`}>
            <div className="adm-kpi-label">{item.label}</div>
            <div className="adm-kpi-value">{summaryLoading ? '...' : item.value}</div>
            <div className="adm-kpi-delta up">{item.delta}</div>
          </div>
        ))}
      </div>

      <div className="adm-card">
        <div className="adm-card-pad">
          <div className="adm-card-head">
            <div>
              <div className="adm-card-title">Транзакции</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                {transactionsLoading ? 'Загрузка...' : `${transactions.length} записей`}
              </div>
            </div>
            <button className="adm-btn adm-btn-outline" disabled={!transactions.length} onClick={exportCsv} style={{ fontSize: 12, padding: '6px 12px' }}>
              Экспорт CSV
            </button>
          </div>
          {summaryError ? (
            <div style={{ marginBottom: 12, padding: 10, borderRadius: 8, background: '#fef2f2', color: '#991b1b', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <span>{summaryError}</span>
              <button className="adm-btn adm-btn-outline" type="button" onClick={loadSummary}>Повторить</button>
            </div>
          ) : null}
          {transactionsError ? (
            <div style={{ marginBottom: 12, padding: 10, borderRadius: 8, background: '#fef2f2', color: '#991b1b', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <span>{transactionsError}</span>
              <button className="adm-btn adm-btn-outline" type="button" onClick={() => loadTransactions(filters)}>Повторить</button>
            </div>
          ) : null}
          {actionMessage ? (
            <div style={{ marginBottom: 12, padding: 10, borderRadius: 8, background: actionMessage.startsWith('Возврат выполнен') ? '#f0fdf4' : '#fef2f2', color: actionMessage.startsWith('Возврат выполнен') ? '#166534' : '#991b1b', fontSize: 13 }}>
              {actionMessage}
            </div>
          ) : null}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 16, alignItems: 'end' }}>
            <label style={{ display: 'grid', gap: 5, fontSize: 11, color: 'var(--text-muted)' }}>
              Поиск
              <input value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Клиент, место или тариф" style={{ padding: '9px 10px', border: '1px solid var(--border)', borderRadius: 8, minWidth: 0 }} />
            </label>
            <label style={{ display: 'grid', gap: 5, fontSize: 11, color: 'var(--text-muted)' }}>
              Статус
              <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} style={{ padding: '9px 10px', border: '1px solid var(--border)', borderRadius: 8 }}>
                <option value="all">Все</option>
                <option value="created">Создано</option>
                <option value="test_paid">Test paid</option>
                <option value="paid">Оплачено</option>
                <option value="failed">Ошибка</option>
                <option value="refunded">Возврат</option>
              </select>
            </label>
            <label style={{ display: 'grid', gap: 5, fontSize: 11, color: 'var(--text-muted)' }}>
              Тип
              <select value={filters.type} onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))} style={{ padding: '9px 10px', border: '1px solid var(--border)', borderRadius: 8 }}>
                <option value="all">Все</option>
                <option value="booking">Бронь</option>
                <option value="tariff_subscription">Тариф</option>
                <option value="refund">Возврат</option>
              </select>
            </label>
            <label style={{ display: 'grid', gap: 5, fontSize: 11, color: 'var(--text-muted)' }}>
              Дата от
              <input type="date" value={filters.dateFrom} max={filters.dateTo || undefined} onChange={(event) => setFilters((current) => ({ ...current, dateFrom: event.target.value }))} style={{ padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 8 }} />
            </label>
            <label style={{ display: 'grid', gap: 5, fontSize: 11, color: 'var(--text-muted)' }}>
              Дата до
              <input type="date" value={filters.dateTo} min={filters.dateFrom || undefined} onChange={(event) => setFilters((current) => ({ ...current, dateTo: event.target.value }))} style={{ padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 8 }} />
            </label>
            <button className="adm-btn adm-btn-outline" type="button" onClick={resetFilters} style={{ whiteSpace: 'nowrap' }}>Сбросить</button>
          </div>

          <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                {['Дата', 'Клиент', 'Объект / тариф', 'Тип', 'Сумма', 'Статус', 'Действие'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions.map(t => {
                const isRefund = t.status === 'refunded' || t.type === 'refund';
                const canRefund = ['test_paid', 'paid'].includes(t.status);
                return (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-muted)' }}>{formatDate(t.date || t.created_at)}</td>
                    <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600 }}>
                      {t.client}
                      {t.client_phone ? <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{t.client_phone}</div> : null}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13 }}>{t.space || t.tariff || '-'}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13 }}>{TYPE_LABELS[t.type] || t.type}</td>
                    <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 700, color: isRefund ? '#dc2626' : '#16a34a' }}>
                      {signedAmount(t)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={`adm-status-pill ${isRefund ? 'cancelled' : 'paid'}`}>
                        {STATUS_LABELS[t.status] || t.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {canRefund ? (
                        <button
                          className="adm-btn adm-btn-outline"
                          disabled={refundingId !== null}
                          onClick={() => handleRefund(t)}
                          style={{ fontSize: 12, padding: '6px 10px' }}
                        >
                          {refundingId === t.id ? 'Refund...' : 'Refund'}
                        </button>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!transactionsLoading && transactions.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ padding: '28px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Транзакций пока нет
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </div>
  );
}
