import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api, { getApiErrorMessage } from '../../api/client.js';
import { getBookingsFromApiResponse, normalizeBooking as normalizeBookingContract } from '../../utils/bookingMapper.js';
import '../../components/HostDashboard.css';
import '../../components/SpaceDetail.css';

const STATUS_MAP = {
  pending: 'Ожидание',
  confirmed: 'Подтверждено',
  cancelled: 'Отменено',
  completed: 'Завершено',
  blocked: 'Закрыто',
};
const PAYMENT_STATUS_MAP = {
  unpaid: 'Не оплачено',
  test_paid: 'Тест оплачено',
  paid: 'Оплачено',
  refunded: 'Возврат',
};
const STATUS_COLORS = {
  pending: 'var(--orange)',
  confirmed: 'var(--navy)',
  cancelled: '#dc2626',
  completed: '#16a34a',
  blocked: '#0f766e',
};
const STATUS_BACKGROUNDS = {
  pending: 'rgba(228, 102, 48, 0.12)',
  confirmed: 'rgba(41, 74, 109, 0.12)',
  cancelled: 'rgba(220, 38, 38, 0.10)',
  completed: 'rgba(22, 163, 74, 0.12)',
  blocked: 'rgba(15, 118, 110, 0.12)',
};
const TYPE_MAP = { hourly: 'Почасовая', daily: 'На день', weekly: 'На неделю', monthly: 'На месяц' };
const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const HOURS = Array.from({ length: 12 }, (_, i) => i + 9);

function buildLocalIso(date, time = '09:00') {
  return new Date(`${date}T${time || '09:00'}:00`).toISOString();
}

function formatAmount(value, currency = 'UZS') {
  const amount = Number(value || 0);
  return `${amount.toLocaleString('ru-RU')} ${currency || 'UZS'}`;
}

function getInitials(name) {
  return String(name || '?').slice(0, 2).toUpperCase();
}

function buildAdminBookingView(raw, index = 0) {
  const normalized = normalizeBookingContract(raw, { fallbackId: `booking-${index}` });
  return {
    ...normalized,
    client: normalized.client_name,
    phone: normalized.client_phone,
    color: STATUS_COLORS[normalized.status] || '#294a6d',
  };
}

function buildCalendarDays(year, month) {
  const date = new Date(Date.UTC(year, month, 1));
  const daysArr = [];
  let startDay = date.getUTCDay();
  startDay = startDay === 0 ? 6 : startDay - 1;
  for (let i = 0; i < startDay; i += 1) {
    daysArr.push({ label: '', dateStr: null, isMuted: true });
  }
  const totalDays = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  for (let d = 1; d <= totalDays; d += 1) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    daysArr.push({ label: d, dateStr, isMuted: false });
  }
  return daysArr;
}

function bookingOverlapsDate(booking, dateStr) {
  if (!dateStr) return false;
  const targetStart = new Date(`${dateStr}T00:00:00`).getTime();
  const targetEnd = new Date(`${dateStr}T23:59:59`).getTime();
  const start = new Date(booking.start_time || `${booking.date}T${booking.startTime}:00`).getTime();
  const end = new Date(booking.end_time || `${booking.endDate || booking.date}T${booking.endTime}:00`).getTime();
  return start <= targetEnd && end >= targetStart;
}

function statusStyle(status) {
  const color = STATUS_COLORS[status] || 'var(--text-muted)';
  return { color, background: STATUS_BACKGROUNDS[status] || 'var(--cream-2)' };
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [filterStatus, setFilterStatus] = useState('Все');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterPlace, setFilterPlace] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [activeSpaceContext, setActiveSpaceContext] = useState(null);
  const [selectedDetails, setSelectedDetails] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [actingId, setActingId] = useState(null);
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const [calendarViewLevel, setCalendarViewLevel] = useState('month');
  const [selectedDayDateStr, setSelectedDayDateStr] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus !== 'Все') params.status = filterStatus;
      if (filterPlace) params.place = filterPlace;
      if (filterClient.trim()) params.client = filterClient.trim();
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (debouncedSearch) params.search = debouncedSearch;
      const res = await api.get('/api/bookings/', { params });
      setBookings(getBookingsFromApiResponse(res.data).map(buildAdminBookingView));
      setApiError('');
    } catch (err) {
      setBookings([]);
      setApiError(getApiErrorMessage(err, 'Не удалось загрузить бронирования.'));
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, debouncedSearch, filterClient, filterPlace, filterStatus]);

  const loadPlaces = useCallback(async () => {
    try {
      const res = await api.get('/api/places/');
      setPlaces(res.data?.results || res.data || []);
    } catch (err) {
      setApiError(getApiErrorMessage(err, 'Не удалось загрузить места для формы бронирования.'));
      setPlaces([]);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  useEffect(() => {
    loadPlaces();
  }, [loadPlaces]);

  const monthDays = useMemo(() => buildCalendarDays(calYear, calMonth), [calYear, calMonth]);

  const moveMonth = (dir) => {
    let nextMonth = calMonth + dir;
    let nextYear = calYear;
    if (nextMonth > 11) {
      nextMonth = 0;
      nextYear += 1;
    } else if (nextMonth < 0) {
      nextMonth = 11;
      nextYear -= 1;
    }
    setCalMonth(nextMonth);
    setCalYear(nextYear);
  };

  const getBookingsForDate = useCallback((dateStr) => {
    if (!activeSpaceContext || !dateStr) return [];
    return bookings.filter((booking) => {
      const samePlace = activeSpaceContext.placeId
        ? String(booking.placeId) === String(activeSpaceContext.placeId)
        : booking.space === activeSpaceContext.space;
      return samePlace && booking.status !== 'cancelled' && bookingOverlapsDate(booking, dateStr);
    });
  }, [activeSpaceContext, bookings]);

  const isHourBooked = (dateStr, hour) => {
    const hourStart = new Date(`${dateStr}T${String(hour).padStart(2, '0')}:00:00`).getTime();
    const hourEnd = hourStart + 60 * 60 * 1000;
    return getBookingsForDate(dateStr).find((booking) => {
      const start = new Date(booking.start_time || `${booking.date}T${booking.startTime}:00`).getTime();
      const end = new Date(booking.end_time || `${booking.endDate || booking.date}T${booking.endTime}:00`).getTime();
      return start < hourEnd && end > hourStart;
    }) || null;
  };

  const openBooking = (booking) => {
    setActiveSpaceContext({ space: booking.space, placeId: booking.placeId });
    setSelectedDetails(booking);
    const parsedDate = new Date(`${booking.date}T00:00:00`);
    if (!Number.isNaN(parsedDate.getTime())) {
      setCalYear(parsedDate.getFullYear());
      setCalMonth(parsedDate.getMonth());
    }
    if (booking.type === 'hourly') {
      setCalendarViewLevel('day');
      setSelectedDayDateStr(booking.date);
    } else {
      setCalendarViewLevel('month');
    }
  };

  const handleCalendarDateClick = (dateStr) => {
    const dayBookings = getBookingsForDate(dateStr);
    setSelectedDayDateStr(dateStr);
    if (dayBookings.length > 0 && dayBookings[0].type !== 'hourly') {
      setCalendarViewLevel('month');
      setSelectedDetails(dayBookings[0]);
      return;
    }
    setCalendarViewLevel('day');
    setSelectedDetails(dayBookings[0] || null);
  };

  const handleCreateSubmit = async (event) => {
    event.preventDefault();
    setCreating(true);
    setCreateError('');
    setActionError('');
    const fd = new FormData(event.currentTarget);
    const durationType = fd.get('type');
    const date = fd.get('date');
    const endDate = durationType === 'hourly' ? date : (fd.get('endDate') || date);
    const startTime = durationType === 'hourly' ? fd.get('startTime') : '09:00';
    const endTime = durationType === 'hourly' ? fd.get('endTime') : '18:00';
    let startIso = buildLocalIso(date, startTime);
    let endIso = buildLocalIso(endDate, endTime);
    if (new Date(endIso).getTime() <= new Date(startIso).getTime()) {
      endIso = new Date(new Date(startIso).getTime() + 60 * 60 * 1000).toISOString();
    }

    const payload = {
      place: Number(fd.get('place')),
      start_time: startIso,
      end_time: endIso,
      duration_type: durationType,
      guests: Number(fd.get('guests')) || 1,
      amount: Number(fd.get('amount')) || 0,
      currency: 'UZS',
      status: fd.get('status') || 'pending',
      payment_status: fd.get('payment_status') || 'unpaid',
      note: fd.get('note') || '',
    };

    const clientId = String(fd.get('client') || '').trim();
    if (clientId) payload.client = Number(clientId);

    try {
      const res = await api.post('/api/bookings/', payload);
      const created = buildAdminBookingView(res.data);
      setBookings((current) => [created, ...current.filter((item) => item.id !== created.id)]);
      setIsCreating(false);
      openBooking(created);
      await loadBookings();
      setActionSuccess(`Бронирование #${created.id} создано.`);
    } catch (err) {
      setCreateError(getApiErrorMessage(err, 'Не удалось создать бронь.'));
    } finally {
      setCreating(false);
    }
  };

  const handleStatusAction = async (booking, action) => {
    setActingId(booking.id);
    setActionError('');
    setActionSuccess('');
    try {
      const res = await api.post(`/api/bookings/${booking.id}/${action}/`);
      const updated = buildAdminBookingView(res.data);
      setSelectedDetails(updated);
      await loadBookings();
      setActionSuccess(`Статус бронирования #${booking.id} обновлён: ${STATUS_MAP[updated.status] || updated.status}.`);
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Действие не выполнено.'));
    } finally {
      setActingId(null);
    }
  };

  const resetFilters = () => {
    setFilterStatus('Все');
    setSearchQuery('');
    setFilterPlace('');
    setFilterClient('');
    setDateFrom('');
    setDateTo('');
  };

  const placeOptions = places.length > 0
    ? places
    : bookings.filter((booking) => booking.placeId).map((booking) => ({ id: booking.placeId, title: booking.space }));

  return (
    <div className="adm-anim adm-anim-1" style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flex: 1 }}>
            {!activeSpaceContext ? (
              <>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--navy)', whiteSpace: 'nowrap' }}>Все бронирования</div>
                <div style={{ width: 1, height: 24, background: 'var(--border)' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                  <div style={{ position: 'relative', maxWidth: 300, flex: 1 }}>
                    <input
                      placeholder="Поиск по клиенту, месту или телефону..."
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: 8, border: '1px solid var(--border)', outline: 'none', fontSize: 13, fontFamily: 'Inter,sans-serif' }}
                    />
                    <svg style={{ position: 'absolute', left: 12, top: 9, color: 'var(--text-muted)' }} width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {['Все', 'pending', 'confirmed', 'cancelled', 'completed', 'blocked'].map((status) => (
                      <button key={status} onClick={() => setFilterStatus(status)} style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: filterStatus === status ? 'var(--navy)' : 'var(--cream-2)', color: filterStatus === status ? '#fff' : 'var(--text-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}>
                        {status === 'Все' ? 'Все статусы' : STATUS_MAP[status]}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <button
                onClick={() => { setActiveSpaceContext(null); setSelectedDetails(null); setCalendarViewLevel('month'); }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', color: 'var(--text)', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s', whiteSpace: 'nowrap' }}
              >
                ← К списку
              </button>
            )}
          </div>
          <button onClick={() => { setIsCreating(true); setSelectedDetails(null); }} className="adm-btn adm-btn-primary" style={{ flexShrink: 0 }}>+ Создать бронь</button>
        </div>

        {!activeSpaceContext ? (
          <div className="adm-card" style={{ marginBottom: 12, padding: 14, display: 'grid', gridTemplateColumns: 'minmax(180px, 1fr) minmax(140px, 0.7fr) repeat(2, minmax(145px, 0.7fr)) auto', gap: 10, alignItems: 'end' }}>
            <label style={{ display: 'grid', gap: 5, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>
              Место
              <select value={filterPlace} onChange={(event) => setFilterPlace(event.target.value)} style={filterControlStyle}>
                <option value="">Все места</option>
                {places.map((place) => <option key={place.id} value={place.id}>{place.title || place.name || `Place #${place.id}`}</option>)}
              </select>
            </label>
            <label style={{ display: 'grid', gap: 5, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>
              Client ID
              <input type="number" min="1" value={filterClient} onChange={(event) => setFilterClient(event.target.value)} placeholder="Все клиенты" style={filterControlStyle} />
            </label>
            <label style={{ display: 'grid', gap: 5, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>
              Дата от
              <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} style={filterControlStyle} />
            </label>
            <label style={{ display: 'grid', gap: 5, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>
              Дата до
              <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} style={filterControlStyle} />
            </label>
            <button type="button" className="adm-btn adm-btn-outline" onClick={resetFilters} disabled={loading}>Сбросить</button>
          </div>
        ) : null}

        {apiError ? (
          <div className="adm-card" role="alert" style={{ marginBottom: 12, padding: 12, color: '#dc2626', fontSize: 13 }}>
            {apiError}
            <button type="button" className="adm-btn adm-btn-outline" onClick={loadBookings} style={{ marginLeft: 12, padding: '5px 10px', fontSize: 12 }}>Повторить</button>
          </div>
        ) : null}
        {actionError ? <div className="adm-card" role="alert" style={{ marginBottom: 12, padding: 12, color: '#dc2626', fontSize: 13 }}>{actionError}</div> : null}
        {actionSuccess ? <div className="adm-card" role="status" style={{ marginBottom: 12, padding: 12, color: '#166534', fontSize: 13 }}>{actionSuccess}</div> : null}

        {!activeSpaceContext ? (
          <div className="adm-card" style={{ flex: 1, overflowY: 'auto', opacity: loading ? 0.72 : 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 5, boxShadow: '0 1px 0 var(--border)' }}>
                <tr>
                  {['Клиент', 'Детали брони', 'Сумма', 'Статус'].map((header) => (
                    <th key={header} style={{ padding: '16px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr
                    key={booking.id}
                    onClick={() => openBooking(booking)}
                    style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.2s' }}
                    onMouseEnter={(event) => { event.currentTarget.style.background = 'var(--cream)'; }}
                    onMouseLeave={(event) => { event.currentTarget.style.background = ''; }}
                  >
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: booking.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700 }}>{getInitials(booking.client)}</div>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{booking.client}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{booking.phone || `ID: ${booking.clientId || '-'}`}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)', marginBottom: 4 }}>{booking.space}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ padding: '2px 8px', background: 'var(--cream-2)', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>{TYPE_MAP[booking.type] || booking.type}</span>
                        {booking.type === 'hourly' ? `${booking.date} • ${booking.startTime}-${booking.endTime}` : `С ${booking.date} по ${booking.endDate}`}
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{formatAmount(booking.amount, booking.currency)}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{PAYMENT_STATUS_MAP[booking.paymentStatus] || booking.paymentStatus}</div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, ...statusStyle(booking.status) }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLORS[booking.status] || 'var(--text-muted)' }} />
                        {STATUS_MAP[booking.status] || booking.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {bookings.length === 0 && (
                  <tr><td colSpan="4" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>{loading ? 'Загрузка...' : 'Ничего не найдено'}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="adm-anim-1" style={{ flex: 1, padding: 0, display: 'flex', flexDirection: 'column' }}>
            <section className="host-calendar-panel" style={{ background: 'transparent', padding: 0, border: 'none', boxShadow: 'none' }}>
              <div className="host-calendar-top" style={{ marginBottom: 24, alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>{activeSpaceContext.space}</span>
                  <h2 style={{ fontSize: 24, margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: 12 }}>
                    {calendarViewLevel === 'month' ? `${monthNames[calMonth]} ${calYear}` : selectedDayDateStr}
                    {calendarViewLevel === 'day' && (
                      <button onClick={() => setCalendarViewLevel('month')} style={{ fontSize: 13, padding: '4px 12px', background: 'var(--cream-2)', border: 'none', borderRadius: 20, cursor: 'pointer', fontWeight: 600, color: 'var(--navy)' }}>Вернуться к месяцу</button>
                    )}
                  </h2>
                </div>
                {calendarViewLevel === 'month' && (
                  <div className="sd-calendar-arrows" style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                    <button type="button" onClick={() => moveMonth(-1)} style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', borderRadius: '50%', background: '#fff', cursor: 'pointer' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                    </button>
                    <button type="button" onClick={() => moveMonth(1)} style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', borderRadius: '50%', background: '#fff', cursor: 'pointer' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
                    </button>
                  </div>
                )}
              </div>

              {calendarViewLevel === 'month' ? (
                <div className="adm-anim-1">
                  <div className="host-calendar-weekdays">
                    {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day) => <span key={day}>{day}</span>)}
                  </div>
                  <div className="host-calendar-grid">
                    {monthDays.map((day, index) => {
                      const dayBookings = getBookingsForDate(day.dateStr);
                      const blocked = dayBookings.some((booking) => booking.status === 'blocked');
                      const isBooked = dayBookings.length > 0;
                      const labelText = blocked ? 'Закрыто' : isBooked ? `${dayBookings.length} бронь` : null;
                      return (
                        <button
                          key={`${day.label}-${index}`}
                          type="button"
                          className={`host-day ${blocked ? 'blocked' : isBooked ? 'booked' : 'free'} ${day.label ? '' : 'is-muted'}`}
                          onClick={() => !day.isMuted && handleCalendarDateClick(day.dateStr)}
                        >
                          <strong>{day.label}</strong>
                          {labelText ? <small style={{ fontWeight: 700 }}>{labelText}</small> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="adm-anim-1">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                    {HOURS.map((hour) => {
                      const bookingForHour = isHourBooked(selectedDayDateStr, hour);
                      const isBooked = Boolean(bookingForHour);
                      const isSelected = selectedDetails && selectedDetails.id === bookingForHour?.id;
                      return (
                        <div
                          key={hour}
                          onClick={() => bookingForHour && setSelectedDetails(bookingForHour)}
                          style={{ padding: '16px', borderRadius: 16, border: isBooked ? '1px solid rgba(228, 102, 48, 0.2)' : '1px solid var(--border)', cursor: isBooked ? 'pointer' : 'default', background: isBooked ? 'rgba(228, 102, 48, 0.1)' : '#fff', color: isBooked ? 'var(--orange)' : 'var(--text-muted)', boxShadow: isSelected ? '0 0 0 1.5px rgba(228, 102, 48, 0.6)' : 'none', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
                        >
                          <strong style={{ fontSize: 18, fontWeight: 700, color: isBooked ? 'var(--orange)' : 'var(--text)' }}>{String(hour).padStart(2, '0')}:00</strong>
                          <span style={{ fontSize: 12, fontWeight: 600 }}>{isBooked ? bookingForHour.client.split(' ')[0] : 'Свободно'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      {selectedDetails && !isCreating && (
        <div className="adm-card adm-anim-1" style={{ width: 360, height: '100%', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: 20, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Детали брони</div>
            <button onClick={() => setSelectedDetails(null)} style={{ background: 'var(--cream-2)', border: 'none', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)' }}>✕</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, padding: '12px 16px', background: 'var(--cream-2)', borderRadius: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Статус</span>
              <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, ...statusStyle(selectedDetails.status) }}>{STATUS_MAP[selectedDetails.status] || selectedDetails.status}</span>
            </div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>Клиент</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: selectedDetails.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 15, fontWeight: 700 }}>{getInitials(selectedDetails.client)}</div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{selectedDetails.client}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{selectedDetails.phone || `ID: ${selectedDetails.clientId || '-'}`}</div>
                </div>
              </div>
            </div>
            <div style={{ height: 1, background: 'var(--border)', margin: '0 -20px 24px' }} />
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>Условия ({TYPE_MAP[selectedDetails.type] || selectedDetails.type})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div><div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>Пространство</div><div style={{ fontSize: 14, fontWeight: 600 }}>{selectedDetails.space}</div></div>
                <div><div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>Start time</div><div style={{ fontSize: 14, fontWeight: 600 }}>{selectedDetails.start_time || `${selectedDetails.date} ${selectedDetails.startTime}`}</div></div>
                <div><div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>End time</div><div style={{ fontSize: 14, fontWeight: 600 }}>{selectedDetails.end_time || `${selectedDetails.endDate} ${selectedDetails.endTime}`}</div></div>
                <div><div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>Гостей</div><div style={{ fontSize: 14, fontWeight: 600 }}>{selectedDetails.guests} чел.</div></div>
                <div><div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>Payment status</div><div style={{ fontSize: 14, fontWeight: 600 }}>{PAYMENT_STATUS_MAP[selectedDetails.paymentStatus] || selectedDetails.paymentStatus}</div></div>
                <div><div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>Note</div><div style={{ fontSize: 14, fontWeight: 600 }}>{selectedDetails.note || '-'}</div></div>
              </div>
            </div>
            <div style={{ height: 1, background: 'var(--border)', margin: '0 -20px 24px' }} />
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>Оплата</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, color: 'var(--text)' }}>Amount</span>
                <span style={{ fontSize: 18, fontWeight: 700 }}>{formatAmount(selectedDetails.amount, selectedDetails.currency)}</span>
              </div>
            </div>
          </div>
          <div style={{ padding: 20, borderTop: '1px solid var(--border)', background: '#fff', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {selectedDetails.status !== 'confirmed' && selectedDetails.status !== 'cancelled' ? <button disabled={actingId === selectedDetails.id} onClick={() => handleStatusAction(selectedDetails, 'confirm')} className="adm-btn adm-btn-primary" style={{ justifyContent: 'center' }}>{actingId === selectedDetails.id ? 'Обработка...' : 'Подтвердить'}</button> : null}
            {selectedDetails.status !== 'cancelled' ? <button disabled={actingId === selectedDetails.id} onClick={() => handleStatusAction(selectedDetails, 'cancel')} className="adm-btn adm-btn-ghost" style={{ justifyContent: 'center', color: '#dc2626' }}>{actingId === selectedDetails.id ? 'Обработка...' : 'Отменить'}</button> : null}
            {selectedDetails.status !== 'blocked' && selectedDetails.status !== 'cancelled' ? <button disabled={actingId === selectedDetails.id} onClick={() => handleStatusAction(selectedDetails, 'block')} className="adm-btn adm-btn-outline" style={{ justifyContent: 'center' }}>{actingId === selectedDetails.id ? 'Обработка...' : 'Закрыть / block'}</button> : null}
          </div>
        </div>
      )}

      {isCreating && (
        <div className="adm-card adm-anim-1" style={{ width: 400, height: '100%', display: 'flex', flexDirection: 'column', flexShrink: 0, boxShadow: '-5px 0 30px rgba(0,0,0,0.1)' }}>
          <div style={{ padding: 20, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Создать бронь</div>
            <button onClick={() => setIsCreating(false)} style={{ background: 'var(--cream-2)', border: 'none', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)' }}>✕</button>
          </div>
          <form onSubmit={handleCreateSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {createError ? <div role="alert" style={{ padding: 10, borderRadius: 8, background: '#fef2f2', color: '#991b1b', fontSize: 13 }}>{createError}</div> : null}
              <div><label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Тип брони</label><select name="type" style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)', outline: 'none' }}><option value="hourly">Почасовая</option><option value="daily">На день</option><option value="weekly">На неделю</option><option value="monthly">На месяц</option></select></div>
              <div><label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Пространство</label><select name="place" required defaultValue={activeSpaceContext?.placeId || ''} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)', outline: 'none' }}><option value="" disabled>Выберите место</option>{placeOptions.map((place) => <option key={place.id} value={place.id}>{place.title || place.name || `Place #${place.id}`}</option>)}</select></div>
              <div><label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Client ID</label><input name="client" placeholder="Оставьте пустым, чтобы создать от текущего admin" style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)', outline: 'none' }} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}><div><label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Дата начала</label><input type="date" name="date" required defaultValue={new Date().toISOString().split('T')[0]} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)', outline: 'none' }} /></div><div><label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Дата конца</label><input type="date" name="endDate" style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)', outline: 'none' }} /></div></div>
              <div style={{ display: 'flex', gap: 12 }}><div style={{ flex: 1 }}><label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Начало</label><input type="time" name="startTime" defaultValue="10:00" style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)', outline: 'none' }} /></div><div style={{ flex: 1 }}><label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Конец</label><input type="time" name="endTime" defaultValue="12:00" style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)', outline: 'none' }} /></div></div>
              <div style={{ display: 'flex', gap: 12 }}><div style={{ flex: 1 }}><label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Сумма (UZS)</label><input type="number" name="amount" defaultValue="0" style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)', outline: 'none' }} /></div><div style={{ width: 95 }}><label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Гостей</label><input type="number" name="guests" defaultValue="1" min="1" style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)', outline: 'none' }} /></div></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}><div><label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Status</label><select name="status" defaultValue="pending" style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)', outline: 'none' }}><option value="pending">pending</option><option value="confirmed">confirmed</option><option value="blocked">blocked</option></select></div><div><label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Payment</label><select name="payment_status" defaultValue="unpaid" style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)', outline: 'none' }}><option value="unpaid">unpaid</option><option value="test_paid">test_paid</option><option value="paid">paid</option></select></div></div>
              <div><label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Note</label><textarea name="note" rows={2} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)', outline: 'none', resize: 'vertical' }} /></div>
            </div>
            <div style={{ padding: 20, borderTop: '1px solid var(--border)', background: 'var(--cream)' }}><button type="submit" className="adm-btn adm-btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={placeOptions.length === 0 || creating}>{creating ? 'Создание...' : 'Создать бронь'}</button></div>
          </form>
        </div>
      )}
    </div>
  );
}

const filterControlStyle = {
  width: '100%',
  minHeight: 38,
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: '#fff',
  color: 'var(--text)',
  fontFamily: 'Inter, sans-serif',
  fontSize: 13,
  outline: 'none',
};
