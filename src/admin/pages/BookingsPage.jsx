import React, { useState, useMemo } from 'react';
import '../../components/HostDashboard.css'; 
import '../../components/SpaceDetail.css';

const INIT_BOOKINGS = [
  // Почасовые
  { id: 101, type: 'hourly', client: 'Amir Karimov', phone: '+998 90 123 45 67', space: 'Focus Hub Coworking', date: '2026-08-14', startTime: '10:00', endTime: '14:00', amount: 280000, status: 'confirmed', color: '#294a6d', guests: 1, notes: 'Нужен флипчарт' },
  { id: 102, type: 'hourly', client: 'Dilnoza Yusupova', phone: '+998 91 987 65 43', space: 'Atlas Meeting Room', date: '2026-08-14', startTime: '09:00', endTime: '11:00', amount: 120000, status: 'pending', color: '#e46630', guests: 4, notes: '' },
  { id: 103, type: 'hourly', client: 'Bekzod Tursunov', phone: '+998 93 111 22 33', space: 'Navoiy Event Space', date: '2026-08-15', startTime: '15:00', endTime: '18:00', amount: 540000, status: 'paid', color: '#1a6b6b', guests: 20, notes: 'Кейтеринг от партнера' },
  { id: 104, type: 'hourly', client: 'Aziz Rahmatov', phone: '+998 97 777 66 55', space: 'Atlas Meeting Room', date: '2026-08-20', startTime: '14:00', endTime: '20:00', amount: 360000, status: 'confirmed', color: '#2a5a8a', guests: 3, notes: 'Долгий митинг' }, // fully booked example
  
  // Долгосрочные
  { id: 106, type: 'daily', client: 'Nodira Aliyeva', phone: '+998 94 444 55 66', space: 'Focus Hub Coworking', date: '2026-08-18', endDate: '2026-08-18', amount: 150000, status: 'paid', color: '#4a3070', guests: 1, notes: 'Дневной абонемент' },
  { id: 107, type: 'weekly', client: 'Rustam Qosimov', phone: '+998 90 999 88 77', space: 'Quiet Work Studio', date: '2026-08-12', endDate: '2026-08-18', amount: 750000, status: 'paid', color: '#1a6b6b', guests: 1, notes: 'Недельный абонемент' },
];

const STATUS_MAP = { pending: 'Ожидание', confirmed: 'Подтверждено', paid: 'Оплачено', cancelled: 'Отменено' };
const STATUS_COLORS = { pending: 'var(--orange)', confirmed: 'var(--navy)', paid: '#16a34a', cancelled: '#dc2626' };
const TYPE_MAP = { hourly: 'Почасовая', daily: 'На день', weekly: 'На неделю', monthly: 'На месяц' };

const monthNames = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];

function buildCalendarDays(year, month) {
  const date = new Date(Date.UTC(year, month, 1));
  const daysArr = [];
  let startDay = date.getUTCDay();
  startDay = startDay === 0 ? 6 : startDay - 1; 
  for (let i = 0; i < startDay; i++) {
    daysArr.push({ label: "", dateStr: null, isMuted: true });
  }
  const totalDays = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  for (let d = 1; d <= totalDays; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    daysArr.push({ label: d, dateStr, isMuted: false });
  }
  return daysArr;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 9); // 09:00 - 20:00

export default function BookingsPage() {
  const [bookings, setBookings] = useState(INIT_BOOKINGS);
  
  // List Filters
  const [filterStatus, setFilterStatus] = useState('Все');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Navigation states
  const [activeSpaceContext, setActiveSpaceContext] = useState(null); 
  const [selectedDetails, setSelectedDetails] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  // Calendar State
  const [calYear, setCalYear] = useState(2026);
  const [calMonth, setCalMonth] = useState(7);
  
  // Drill-down to hourly view
  const [calendarViewLevel, setCalendarViewLevel] = useState('month'); 
  const [selectedDayDateStr, setSelectedDayDateStr] = useState(null);

  const filtered = useMemo(() => {
    return bookings.filter(b => {
      const matchStatus = filterStatus === 'Все' || b.status === filterStatus;
      const q = searchQuery.toLowerCase();
      const matchSearch = b.client.toLowerCase().includes(q) || b.space.toLowerCase().includes(q) || String(b.id).includes(q);
      return matchStatus && matchSearch;
    });
  }, [bookings, filterStatus, searchQuery]);

  const monthDays = useMemo(() => buildCalendarDays(calYear, calMonth), [calYear, calMonth]);

  const moveMonth = (dir) => {
    let newM = calMonth + dir;
    let newY = calYear;
    if (newM > 11) { newM = 0; newY++; }
    else if (newM < 0) { newM = 11; newY--; }
    setCalMonth(newM);
    setCalYear(newY);
  };

  const getBookingsForDate = (dateStr) => {
    if (!activeSpaceContext) return [];
    return bookings.filter(b => {
      if (b.space !== activeSpaceContext.space) return false;
      if (b.type === 'hourly') return b.date === dateStr;
      const target = new Date(dateStr).getTime();
      const start = new Date(b.date).getTime();
      const end = new Date(b.endDate).getTime();
      return target >= start && target <= end;
    });
  };

  const isHourBooked = (dateStr, hour) => {
    const dayBookings = getBookingsForDate(dateStr).filter(b => b.type === 'hourly');
    for (let b of dayBookings) {
      const s = parseInt(b.startTime.split(':')[0]);
      const e = parseInt(b.endTime.split(':')[0]);
      if (hour >= s && hour < e) return b;
    }
    return null;
  };

  const handleBookingClickFromList = (b) => {
    setActiveSpaceContext({ space: b.space });
    setSelectedDetails(b);
    const d = new Date(b.date);
    setCalYear(d.getFullYear());
    setCalMonth(d.getMonth());
    
    if (b.type === 'hourly') {
      setCalendarViewLevel('day');
      setSelectedDayDateStr(b.date);
    } else {
      setCalendarViewLevel('month');
    }
  };

  const handleCalendarDateClick = (dateStr) => {
    const dayBookings = getBookingsForDate(dateStr);
    
    setSelectedDayDateStr(dateStr);
    // If it's a range booking, don't auto-drill to day, stay in month view to show range
    if (dayBookings.length > 0 && dayBookings[0].type !== 'hourly') {
      setCalendarViewLevel('month');
      setSelectedDetails(dayBookings[0]);
    } else {
      setCalendarViewLevel('day');
      if (dayBookings.length > 0) {
        setSelectedDetails(dayBookings[0]);
      } else {
        setSelectedDetails(null);
      }
    }
  };

  const handleHourClick = (bookingForHour) => {
    if (bookingForHour) {
      setSelectedDetails(bookingForHour);
    }
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const newB = {
      id: Date.now(),
      type: fd.get('type'),
      client: fd.get('client'),
      phone: fd.get('phone'),
      space: fd.get('space'),
      date: fd.get('date'),
      endDate: fd.get('type') === 'hourly' ? fd.get('date') : fd.get('endDate'),
      startTime: fd.get('startTime') || '10:00',
      endTime: fd.get('endTime') || '11:00',
      amount: parseInt(fd.get('amount') || 0),
      status: 'pending',
      color: '#294a6d',
      guests: fd.get('guests') || 1,
      notes: fd.get('notes') || ''
    };
    setBookings(prev => [...prev, newB]);
    setIsCreating(false);
    setActiveSpaceContext({ space: newB.space });
    setSelectedDetails(newB);
    
    const d = new Date(newB.date);
    setCalYear(d.getFullYear());
    setCalMonth(d.getMonth());
    if (newB.type === 'hourly') {
      setCalendarViewLevel('day');
      setSelectedDayDateStr(newB.date);
    }
  };

  return (
    <div className="adm-anim adm-anim-1" style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      
      {/* Main Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0 }}>
        
        {/* HEADER SECTION */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flex: 1 }}>
            {!activeSpaceContext ? (
              // MAIN LIST HEADER
              <>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--navy)', whiteSpace: 'nowrap' }}>Все бронирования</div>
                <div style={{ width: 1, height: 24, background: 'var(--border)' }} />
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                  <div style={{ position: 'relative', maxWidth: 300, flex: 1 }}>
                    <input 
                      placeholder="Поиск по имени, ID или месту..." 
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: 8, border: '1px solid var(--border)', outline: 'none', fontSize: 13, fontFamily: 'Inter,sans-serif' }} 
                    />
                    <svg style={{ position: 'absolute', left: 12, top: 9, color: 'var(--text-muted)' }} width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {['Все', 'pending', 'confirmed', 'paid'].map(f => (
                      <button key={f} onClick={() => setFilterStatus(f)} style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: filterStatus === f ? 'var(--navy)' : 'var(--cream-2)', color: filterStatus === f ? '#fff' : 'var(--text-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}>
                        {f === 'Все' ? 'Все статусы' : STATUS_MAP[f]}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              // CALENDAR HEADER
              <>
                <button 
                  onClick={() => { setActiveSpaceContext(null); setSelectedDetails(null); setCalendarViewLevel('month'); }} 
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', color: 'var(--text)', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s', whiteSpace: 'nowrap' }}
                >
                  ← К списку
                </button>
              </>
            )}
          </div>
        </div>

        {/* CONTENT SECTION */}
        {!activeSpaceContext ? (
          
          // 1. MAIN LIST VIEW
          <div className="adm-card" style={{ flex: 1, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 5, boxShadow: '0 1px 0 var(--border)' }}>
                <tr>
                  {['Клиент','Детали брони','Сумма','Статус'].map(h => (
                    <th key={h} style={{ padding: '16px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(b => (
                  <tr 
                    key={b.id} 
                    onClick={() => handleBookingClickFromList(b)}
                    style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--cream)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: b.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700 }}>
                          {b.client.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{b.client}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{b.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)', marginBottom: 4 }}>{b.space}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ padding: '2px 8px', background: 'var(--cream-2)', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>{TYPE_MAP[b.type]}</span>
                        {b.type === 'hourly' ? `${b.date} • ${b.startTime}-${b.endTime}` : `С ${b.date} по ${b.endDate}`}
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{b.amount.toLocaleString()} UZS</div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, color: STATUS_COLORS[b.status], background: `${STATUS_COLORS[b.status]}1A` }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLORS[b.status] }} />
                        {STATUS_MAP[b.status]}
                      </span>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Ничего не найдено</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        ) : (

          // 2. SPACE CALENDAR VIEW
          <div className="adm-anim-1" style={{ flex: 1, padding: '0', display: 'flex', flexDirection: 'column' }}>
            <section className="host-calendar-panel" style={{ background: 'transparent', padding: 0, border: 'none', boxShadow: 'none' }}>
              
              <div className="host-calendar-top" style={{ marginBottom: 24, alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>{activeSpaceContext.space}</span>
                  <h2 style={{ fontSize: 24, margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: 12 }}>
                    {calendarViewLevel === 'month' ? `${monthNames[calMonth]} ${calYear}` : selectedDayDateStr}
                    {calendarViewLevel === 'day' && (
                      <button 
                        onClick={() => setCalendarViewLevel('month')}
                        style={{ fontSize: 13, padding: '4px 12px', background: 'var(--cream-2)', border: 'none', borderRadius: 20, cursor: 'pointer', fontWeight: 600, color: 'var(--navy)' }}
                      >
                        Вернуться к месяцу
                      </button>
                    )}
                  </h2>
                </div>
                
                <div className="host-calendar-legend" style={{ margin: '0 auto', display: 'flex', gap: 16 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}><i className="free" style={{ width: 10, height: 10, borderRadius: '50%', background: '#e2e8f0', display: 'inline-block' }} />Свободно</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}><i className="booked" style={{ width: 10, height: 10, borderRadius: '50%', background: 'linear-gradient(to top, rgba(228, 102, 48, 0.4) 50%, #fff 50%)', border: '1px solid rgba(228, 102, 48, 0.15)', display: 'inline-block' }} />Частично (Часы)</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}><i className="blocked" style={{ width: 10, height: 10, borderRadius: '2px', background: 'rgba(26, 107, 107, 0.2)', border: '1px solid rgba(26, 107, 107, 1)', display: 'inline-block' }} />Долгосрок (Диапазон)</span>
                </div>
                
                {calendarViewLevel === 'month' && (
                  <div className="sd-calendar-arrows" style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                    <button type="button" onClick={() => moveMonth(-1)} style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', borderRadius: '50%', background: '#fff', cursor: 'pointer', transition: 'background 0.2s' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                    </button>
                    <button type="button" onClick={() => moveMonth(1)} style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', borderRadius: '50%', background: '#fff', cursor: 'pointer', transition: 'background 0.2s' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
                    </button>
                  </div>
                )}
              </div>

              {calendarViewLevel === 'month' ? (
                // MONTHLY GRID
                <div className="adm-anim-1">
                  <div className="host-calendar-weekdays">
                    {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => <span key={day}>{day}</span>)}
                  </div>
                  <div className="host-calendar-grid">
                    {monthDays.map((day, index) => {
                      const dateStr = day.dateStr;
                      const dayBookings = getBookingsForDate(dateStr);
                      const isBooked = dayBookings.length > 0;
                      
                      const rangeBookings = dayBookings.filter(b => b.type !== 'hourly');
                      const hourlyBookings = dayBookings.filter(b => b.type === 'hourly');
                      
                      let customStyle = {};
                      let labelText = null;

                      // RANGE (Daily/Weekly/Monthly)
                      if (rangeBookings.length > 0) {
                        const rb = rangeBookings[0];
                        const isRangeStart = rb.date === dateStr;
                        const isRangeEnd = rb.endDate === dateStr;
                        const isRangeMiddle = !isRangeStart && !isRangeEnd;
                        
                        const rangeBg = 'rgba(26, 107, 107, 0.15)';
                        const rangeSolid = 'rgba(26, 107, 107, 1)';
                        
                        customStyle = {
                          background: rangeBg,
                          color: rangeSolid,
                          border: `1px solid ${rangeBg}`,
                          zIndex: 1
                        };
                        labelText = rb.client.split(' ')[0];

                        // Chain them together across the 8px grid gap
                        if (isRangeStart && !isRangeEnd) {
                          customStyle.borderRadius = '18px 0 0 18px';
                          customStyle.boxShadow = `4px 0 0 0 ${rangeBg}`; // bridge the gap to the right
                        } else if (isRangeEnd && !isRangeStart) {
                          customStyle.borderRadius = '0 18px 18px 0';
                          customStyle.boxShadow = `-4px 0 0 0 ${rangeBg}`; // bridge the gap to the left
                        } else if (isRangeMiddle) {
                          customStyle.borderRadius = '0';
                          customStyle.boxShadow = `-4px 0 0 0 ${rangeBg}, 4px 0 0 0 ${rangeBg}`; // bridge both gaps
                        }
                      } 
                      // HOURLY
                      else if (hourlyBookings.length > 0) {
                        let totalHours = 0;
                        hourlyBookings.forEach(b => {
                          totalHours += (parseInt(b.endTime) - parseInt(b.startTime));
                        });
                        // 10 hour workday (e.g. 10:00 - 20:00)
                        const fillPercent = Math.min((totalHours / 10) * 100, 100);
                        
                        const orangeBg = 'rgba(228, 102, 48, 0.2)';
                        const orangeSolid = '#e46630';
                        
                        customStyle = {
                          background: `linear-gradient(to top, ${orangeBg} ${fillPercent}%, #fbfcfd ${fillPercent}%)`,
                          color: orangeSolid,
                          border: `1px solid rgba(228, 102, 48, 0.15)`
                        };
                        
                        labelText = fillPercent >= 80 ? 'Полностью' : `${totalHours} ч.`;
                      }

                      const isSelectedDate = selectedDayDateStr === dateStr && selectedDetails;
                      if (isSelectedDate) {
                        customStyle.boxShadow = '0 0 0 2px var(--navy)';
                        customStyle.zIndex = 2;
                      }

                      return (
                        <button 
                          key={`${day.label}-${index}`} 
                          type="button" 
                          className={`host-day ${isBooked ? 'booked' : 'free'} ${day.label ? "" : "is-muted"}`}
                          onClick={() => !day.isMuted && handleCalendarDateClick(dateStr)}
                          style={Object.keys(customStyle).length > 0 ? customStyle : {}}
                        >
                          <strong>{day.label}</strong>
                          {isBooked ? <small style={{ fontWeight: 700 }}>{labelText}</small> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                // HOURLY GRID FOR SELECTED DAY
                <div className="adm-anim-1">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                    {HOURS.map(h => {
                      const bookingForHour = isHourBooked(selectedDayDateStr, h);
                      const isBooked = !!bookingForHour;
                      const isSelected = selectedDetails && selectedDetails.id === bookingForHour?.id;

                      return (
                        <div 
                          key={h}
                          onClick={() => handleHourClick(bookingForHour)}
                          style={{ 
                            padding: '16px', borderRadius: 16, 
                            border: isBooked ? '1px solid rgba(228, 102, 48, 0.2)' : '1px solid var(--border)', 
                            cursor: isBooked ? 'pointer' : 'default',
                            background: isBooked ? 'rgba(228, 102, 48, 0.1)' : '#fff', 
                            color: isBooked ? 'var(--orange)' : 'var(--text-muted)',
                            boxShadow: isSelected ? '0 0 0 1.5px rgba(228, 102, 48, 0.6)' : 'none',
                            transition: 'all 0.2s',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4
                          }}
                        >
                          <strong style={{ fontSize: 18, fontWeight: 700, color: isBooked ? 'var(--orange)' : 'var(--text)' }}>
                            {String(h).padStart(2, '0')}:00
                          </strong>
                          <span style={{ fontSize: 12, fontWeight: 600 }}>
                            {isBooked ? bookingForHour.client.split(' ')[0] : 'Свободно'}
                          </span>
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

      {/* === RIGHT SIDE PANEL === */}

      {selectedDetails && !isCreating && (
        <div className="adm-card adm-anim-1" style={{ width: 340, height: '100%', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Детали брони</div>
            <button onClick={() => {
              setSelectedDetails(null);
            }} style={{ background: 'var(--cream-2)', border: 'none', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)' }}>✕</button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
            {/* Status */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, padding: '12px 16px', background: 'var(--cream-2)', borderRadius: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Статус</span>
              <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, color: STATUS_COLORS[selectedDetails.status], background: `${STATUS_COLORS[selectedDetails.status]}1A` }}>{STATUS_MAP[selectedDetails.status]}</span>
            </div>

            {/* Client Info */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>Клиент</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: selectedDetails.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 15, fontWeight: 700 }}>
                  {selectedDetails.client.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{selectedDetails.client}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{selectedDetails.phone}</div>
                </div>
              </div>
              <button className="adm-btn adm-btn-outline" style={{ width: '100%', justifyContent: 'center', padding: '8px 0', fontSize: 13 }}>💬 Написать сообщение</button>
            </div>

            <div style={{ height: 1, background: 'var(--border)', margin: '0 -20px 24px' }} />

            {/* Booking Details */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>Условия ({TYPE_MAP[selectedDetails.type]})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div><div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>Пространство</div><div style={{ fontSize: 14, fontWeight: 600 }}>{selectedDetails.space}</div></div>
                {selectedDetails.type === 'hourly' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div><div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>Дата</div><div style={{ fontSize: 14, fontWeight: 600 }}>{selectedDetails.date}</div></div>
                    <div><div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>Время</div><div style={{ fontSize: 14, fontWeight: 600 }}>{selectedDetails.startTime} - {selectedDetails.endTime}</div></div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div><div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>Начало</div><div style={{ fontSize: 14, fontWeight: 600 }}>{selectedDetails.date}</div></div>
                    <div><div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>Конец</div><div style={{ fontSize: 14, fontWeight: 600 }}>{selectedDetails.endDate}</div></div>
                  </div>
                )}
                <div><div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>Гостей</div><div style={{ fontSize: 14, fontWeight: 600 }}>{selectedDetails.guests} чел.</div></div>
                {selectedDetails.notes && (
                  <div style={{ padding: '10px 12px', background: '#fffbe4', border: '1px solid #fef08a', borderRadius: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#a16207', marginBottom: 4 }}>Комментарий</div>
                    <div style={{ fontSize: 13, color: '#854d0e' }}>{selectedDetails.notes}</div>
                  </div>
                )}
              </div>
            </div>
            
            <div style={{ height: 1, background: 'var(--border)', margin: '0 -20px 24px' }} />
            
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>Оплата</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, color: 'var(--text)' }}>Сумма к оплате</span>
                <span style={{ fontSize: 18, fontWeight: 700 }}>{selectedDetails.amount.toLocaleString()} UZS</span>
              </div>
            </div>
          </div>

          <div style={{ padding: '20px', borderTop: '1px solid var(--border)', background: '#fff', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {selectedDetails.status === 'pending' && <><button className="adm-btn adm-btn-primary" style={{ justifyContent: 'center' }}>Подтвердить</button><button className="adm-btn adm-btn-ghost" style={{ justifyContent: 'center', color: '#dc2626' }}>Отклонить</button></>}
            {selectedDetails.status === 'confirmed' && <button className="adm-btn adm-btn-primary" style={{ justifyContent: 'center', background: '#16a34a' }}>Отметить оплаченным</button>}
            {selectedDetails.status === 'paid' && <button className="adm-btn adm-btn-outline" style={{ justifyContent: 'center' }}>Скачать чек (PDF)</button>}
          </div>
        </div>
      )}

      {/* Creation Modal */}
      {isCreating && (
        <div className="adm-card adm-anim-1" style={{ width: 400, height: '100%', display: 'flex', flexDirection: 'column', flexShrink: 0, boxShadow: '-5px 0 30px rgba(0,0,0,0.1)' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Создать бронь</div>
            <button onClick={() => setIsCreating(false)} style={{ background: 'var(--cream-2)', border: 'none', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)' }}>✕</button>
          </div>
          <form onSubmit={handleCreateSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div><label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Тип брони</label>
                <select name="type" style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--border)', outline: 'none' }} onChange={(e) => {
                  const val = e.target.value;
                  document.getElementById('date-range').style.display = val === 'hourly' ? 'none' : 'block';
                  document.getElementById('time-range').style.display = val === 'hourly' ? 'flex' : 'none';
                }}>
                  <option value="hourly">Почасовая (Переговорки)</option><option value="daily">На день (Hot Desk)</option><option value="weekly">На неделю</option><option value="monthly">На месяц</option>
                </select>
              </div>
              <div><label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Клиент (Имя)</label><input name="client" required placeholder="Иван Иванов" style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--border)', outline: 'none' }} /></div>
              <div><label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Телефон</label><input name="phone" required placeholder="+998 90 000 00 00" style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--border)', outline: 'none' }} /></div>
              <div><label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Пространство</label>
                <select name="space" defaultValue={activeSpaceContext?.space || "Focus Hub Coworking"} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--border)', outline: 'none' }}>
                  <option>Focus Hub Coworking</option><option>Atlas Meeting Room</option><option>Navoiy Event Space</option><option>Quiet Work Studio</option><option>Blue Line Office</option>
                </select>
              </div>
              <div><label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Дата (Начало)</label><input type="date" name="date" required defaultValue="2026-08-14" style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--border)', outline: 'none' }} /></div>
              <div id="date-range" style={{ display: 'none' }}><label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Дата (Конец)</label><input type="date" name="endDate" defaultValue="2026-08-20" style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--border)', outline: 'none' }} /></div>
              <div id="time-range" style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}><label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Начало</label><input type="time" name="startTime" defaultValue="10:00" style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--border)', outline: 'none' }} /></div>
                <div style={{ flex: 1 }}><label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Конец</label><input type="time" name="endTime" defaultValue="12:00" style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--border)', outline: 'none' }} /></div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}><label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Сумма (UZS)</label><input type="number" name="amount" defaultValue="100000" style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--border)', outline: 'none' }} /></div>
                <div style={{ width: 80 }}><label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Гостей</label><input type="number" name="guests" defaultValue="1" min="1" style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--border)', outline: 'none' }} /></div>
              </div>
              <div><label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Комментарий</label><textarea name="notes" rows={2} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--border)', outline: 'none', resize: 'vertical' }} /></div>
            </div>
            <div style={{ padding: '20px', borderTop: '1px solid var(--border)', background: 'var(--cream)' }}>
              <button type="submit" className="adm-btn adm-btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Создать бронь</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
