import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import logoImage from '../../assets/img/Logo.png';

const ROLE_MAP = {
  client: { label: 'Клиент', bg: 'rgba(41,74,109,0.1)', color: '#294a6d' },
  partner: { label: 'Партнёр', bg: 'rgba(26,107,107,0.1)', color: '#1a6b6b' },
  admin: { label: 'Админ', bg: 'rgba(228,102,48,0.12)', color: '#e46630' },
  moderator: { label: 'Модератор', bg: 'rgba(74,48,112,0.1)', color: '#4a3070' }
};

const ROLE_OPTIONS = [
  { id: 'client', label: 'Клиент', desc: 'Аренда пространств и бронирование', icon: '👤', accent: '#2563eb', bg: 'rgba(37, 99, 235, 0.06)', glow: 'rgba(37, 99, 235, 0.15)' },
  { id: 'partner', label: 'Партнёр', desc: 'Сдача объектов и менеджмент мест', icon: '🏢', accent: '#059669', bg: 'rgba(5, 150, 105, 0.06)', glow: 'rgba(5, 150, 105, 0.15)' },
  { id: 'moderator', label: 'Модератор', desc: 'Контроль контента и объявлений', icon: '🛡️', accent: '#7c3aed', bg: 'rgba(124, 58, 237, 0.06)', glow: 'rgba(124, 58, 237, 0.15)' },
  { id: 'admin', label: 'Администратор', desc: 'Полный доступ ко всей системе', icon: '⚡', accent: '#ea580c', bg: 'rgba(234, 88, 12, 0.06)', glow: 'rgba(234, 88, 12, 0.15)' }
];

const TABS = ['Все', 'client', 'partner', 'moderator', 'admin'];

const getInitials = (user) => {
  const f = user.first_name || '';
  const l = user.last_name || '';
  if (f || l) {
    return (f.slice(0, 1) + l.slice(0, 1)).toUpperCase();
  }
  return (user.username || '').slice(0, 2).toUpperCase() || 'U';
};

const getAvatarColor = (id) => {
  const colors = ['#294a6d', '#1a6b6b', '#e46630', '#4a3070', '#2a5a8a', '#10b981', '#f59e0b'];
  return colors[(id || 0) % colors.length] || '#294a6d';
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' }).replace(' г.', '');
};

const formatMoney = (val) => {
  return new Intl.NumberFormat('ru-RU').format(Math.round(val)).replace(',', ' ') + " UZS";
};

function UserEditModal({ user, onClose, onSave }) {
  const [role, setRole] = useState(user.role || 'client');
  const [loading, setLoading] = useState(false);
  const [showWarningConfirm, setShowWarningConfirm] = useState(false);
  const [placesCount, setPlacesCount] = useState(user.places_count || 1);

  useEffect(() => {
    if (user.role === 'partner' || user.id) {
      const getHeaders = () => {
        const t = localStorage.getItem('joyzone-access');
        return t ? { Authorization: `Bearer ${t}` } : {};
      };
      axios.get(`http://localhost:8000/api/places/?owner=${user.id}`, { headers: getHeaders() })
        .then(res => {
          const list = res.data?.results || res.data || [];
          if (Array.isArray(list) && list.length > 0) {
            setPlacesCount(list.length);
          } else {
            setPlacesCount(user.places_count || 1);
          }
        })
        .catch(() => {
          setPlacesCount(user.places_count || 1);
        });
    }
  }, [user.id, user.role]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (user.role === 'partner' && role !== 'partner') {
      setShowWarningConfirm(true);
      return;
    }
    executeSave();
  };

  const executeSave = async () => {
    setLoading(true);
    await onSave(user.id, { role });
    setLoading(false);
  };

  const fullName = user.first_name || user.last_name 
    ? `${user.first_name || ''} ${user.last_name || ''}`.trim() 
    : user.username;

  const targetRoleObj = ROLE_OPTIONS.find(r => r.id === role);

  return createPortal(
    <div className="adm-user-modal-overlay" onClick={onClose}>
      <div className="adm-user-modal-card" onClick={(e) => e.stopPropagation()}>
        
        {/* Header with Joyzone Brand Logo */}
        <div className="adm-user-modal-header">
          <div className="adm-user-modal-brand">
            <img src={logoImage} alt="Joyzone Logo" className="adm-user-modal-logo" />
            <div className="adm-user-modal-brand-divider" />
            <h3 className="adm-user-modal-title">Профиль пользователя</h3>
          </div>
          <button type="button" className="adm-user-modal-close-btn" onClick={onClose} aria-label="Закрыть">
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="adm-user-modal-body">
            
            {/* User Profile Banner */}
            <div className="adm-user-profile-banner">
              <div 
                className="adm-user-avatar-wrap" 
                style={{ background: getAvatarColor(user.id) }}
              >
                {getInitials(user)}
                <span className="adm-user-status-dot" title="Активный аккаунт" />
              </div>
              <div className="adm-user-banner-info">
                <h4 className="adm-user-banner-name">{fullName}</h4>
                <span className="adm-user-banner-handle">@{user.username || 'user'}</span>
              </div>
            </div>

            {/* User Details Grid */}
            <div className="adm-user-details-grid">
              <div className="adm-user-detail-item">
                <span className="adm-user-detail-label">Телефон</span>
                <span className="adm-user-detail-val">{user.phone_number || user.phone || 'Не указан'}</span>
              </div>
              <div className="adm-user-detail-item">
                <span className="adm-user-detail-label">Email</span>
                <span className="adm-user-detail-val">{user.email || 'Не указан'}</span>
              </div>
              <div className="adm-user-detail-item">
                <span className="adm-user-detail-label">Дата регистрации</span>
                <span className="adm-user-detail-val">{formatDate(user.date_joined)}</span>
              </div>
              <div className="adm-user-detail-item">
                <span className="adm-user-detail-label">ID Пользователя</span>
                <span className="adm-user-detail-val">#{user.id}</span>
              </div>
            </div>

            {/* Role Selection */}
            <div>
              <div className="adm-role-selector-head">
                <h4>Роль пользователя</h4>
                <p>Выберите привилегии и уровень доступа в системе</p>
              </div>

              <div className="adm-role-cards-grid">
                {ROLE_OPTIONS.map((opt) => {
                  const isSelected = role === opt.id;
                  return (
                    <div
                      key={opt.id}
                      className={`adm-role-card-option ${isSelected ? 'is-selected' : ''}`}
                      style={{
                        '--role-accent': opt.accent,
                        '--role-bg': opt.bg,
                        '--role-glow': opt.glow
                      }}
                      onClick={() => setRole(opt.id)}
                    >
                      <div className="adm-role-icon-box">{opt.icon}</div>
                      <div className="adm-role-card-info">
                        <span className="adm-role-card-title">{opt.label}</span>
                        <span className="adm-role-card-desc">{opt.desc}</span>
                      </div>
                      {isSelected && <span className="adm-role-check-mark">✓</span>}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Modal Footer */}
          <div className="adm-user-modal-footer">
            <button type="button" onClick={onClose} className="adm-modal-btn cancel">
              Отмена
            </button>
            <button type="submit" disabled={loading} className="adm-modal-btn save">
              {loading ? 'Сохранение...' : 'Сохранить изменения'}
            </button>
          </div>
        </form>

      </div>

      {/* Partner Role Change Safety Warning Dialog */}
      {showWarningConfirm && (
        <div className="adm-confirm-overlay" onClick={() => setShowWarningConfirm(false)}>
          <div className="adm-confirm-card" onClick={(e) => e.stopPropagation()}>
            <div className="adm-confirm-icon-box">⚠️</div>
            <h3>Внимание! Перевод партнёра в другую роль</h3>
            <p>
              У пользователя <strong>{fullName}</strong> имеется <strong>{placesCount} {placesCount === 1 ? 'объект' : placesCount < 5 ? 'объекта' : 'объектов'}</strong>.
            </p>
            <div className="adm-confirm-alert-box">
              При изменении роли с <strong>"Партнёр"</strong> на <strong>"{targetRoleObj?.label || 'Клиент'}"</strong>, все <strong>{placesCount} {placesCount === 1 ? 'объект' : placesCount < 5 ? 'объекта' : 'объектов'}</strong> будут автоматически отправлены в <strong>архив</strong> и заблокированы для публичного бронирования!
            </div>
            <div className="adm-confirm-actions">
              <button 
                type="button" 
                className="adm-modal-btn confirm-archive" 
                disabled={loading}
                onClick={executeSave}
              >
                {loading ? 'Архивирование...' : 'Да, перевести в архив и изменить роль'}
              </button>
              <button 
                type="button" 
                className="adm-modal-btn cancel" 
                onClick={() => setShowWarningConfirm(false)}
              >
                Отмена (Сохранить роль)
              </button>
            </div>
          </div>
        </div>
      )}

    </div>,
    document.body
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('Все');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('date_joined');
  const [sortAsc, setSortAsc] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const getHeaders = () => {
    const t = localStorage.getItem('joyzone-access');
    return t ? { Authorization: `Bearer ${t}` } : {};
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get('http://localhost:8000/api/auth/users/', { headers: getHeaders() });
      setUsers(res.data?.results || res.data || []);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || err.response?.data?.error || err.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSave = async (userId, data) => {
    try {
      await axios.patch(`http://localhost:8000/api/auth/users/${userId}/`, data, { headers: getHeaders() });
      setEditTarget(null);
      fetchUsers();
    } catch (err) {
      console.error(err);
      alert('Ошибка при сохранении: ' + (err.response?.data?.detail || err.message));
    }
  };

  const stats = React.useMemo(() => {
    let clients = 0;
    let partners = 0;
    let admins = 0;
    let moderators = 0;
    let totalBalance = 0;

    users.forEach(u => {
      if (u.role === 'client') clients++;
      else if (u.role === 'partner') partners++;
      else if (u.role === 'admin') admins++;
      else if (u.role === 'moderator') moderators++;
      totalBalance += Number(u.balance) || 0;
    });

    return { clients, partners, admins, moderators, total: users.length, totalBalance };
  }, [users]);

  const filtered = React.useMemo(() => {
    return users.filter(u => {
      const roleMatch = tab === 'Все' || u.role === tab;
      const nameStr = `${u.first_name || ''} ${u.last_name || ''} ${u.username || ''} ${u.phone_number || ''} ${u.email || ''}`.toLowerCase();
      const searchMatch = !search.trim() || nameStr.includes(search.trim().toLowerCase());
      return roleMatch && searchMatch;
    });
  }, [users, tab, search]);

  const sorted = React.useMemo(() => {
    return [...filtered].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (sortField === 'name') {
        valA = `${a.first_name || ''} ${a.last_name || ''}`.trim();
        valB = `${b.first_name || ''} ${b.last_name || ''}`.trim();
        if (!valA) valA = a.username;
        if (!valB) valB = b.username;
      }

      if (typeof valA === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      valA = Number(valA) || 0;
      valB = Number(valB) || 0;
      return sortAsc ? valA - valB : valB - valA;
    });
  }, [filtered, sortField, sortAsc]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return '↕';
    return sortAsc ? '↑' : '↓';
  };

  if (loading && users.length === 0) {
    return <div className="adm-anim adm-anim-1" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>Загрузка пользователей...</div>;
  }

  if (error && users.length === 0) {
    return (
      <div className="adm-anim adm-anim-1" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ color: '#ef4444', marginBottom: 16, fontWeight: 600 }}>Ошибка при загрузке: {error}</div>
        <button onClick={fetchUsers} className="adm-btn" style={{ padding: '8px 18px', borderRadius: 8, background: 'var(--navy)', color: '#fff', border: 'none', cursor: 'pointer' }}>Попробовать снова</button>
      </div>
    );
  }

  return (
    <div className="adm-anim adm-anim-1">
      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="adm-card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Всего пользователей</span>
          <strong style={{ fontSize: 26, color: 'var(--navy)' }}>{stats.total}</strong>
        </div>
        <div className="adm-card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Клиенты</span>
          <strong style={{ fontSize: 26, color: '#294a6d' }}>{stats.clients}</strong>
        </div>
        <div className="adm-card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Партнёры</span>
          <strong style={{ fontSize: 26, color: '#1a6b6b' }}>{stats.partners}</strong>
        </div>
        <div className="adm-card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Баланс пользователей</span>
          <strong style={{ fontSize: 22, color: 'var(--orange)', marginTop: 4 }}>{formatMoney(stats.totalBalance)}</strong>
        </div>
      </div>

      {/* Filter and Search actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '7px 16px',
                borderRadius: 10,
                border: '1px solid var(--border)',
                background: tab === t ? 'var(--navy)' : '#fff',
                color: tab === t ? '#fff' : 'var(--text-muted)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'Inter,sans-serif',
                transition: 'all 0.15s'
              }}
            >
              {t === 'Все' ? 'Все' : ROLE_MAP[t].label}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: '300px' }}>
          <input
            type="text"
            placeholder="Поиск по имени или телефону..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 16px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              fontSize: 13,
              outline: 'none',
              fontFamily: 'Inter,sans-serif'
            }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', fontSize: 16, cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
          )}
        </div>
      </div>

      {/* Users table */}
      <div className="adm-card" style={{ overflowX: 'auto' }}>
        {sorted.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>Пользователи не найдены</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                <th onClick={() => handleSort('name')} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none' }}>
                  Пользователь {getSortIcon('name')}
                </th>
                <th onClick={() => handleSort('phone_number')} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none' }}>
                  Телефон {getSortIcon('phone_number')}
                </th>
                <th onClick={() => handleSort('role')} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none' }}>
                  Роль {getSortIcon('role')}
                </th>
                <th onClick={() => handleSort('date_joined')} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none' }}>
                  Дата рег. {getSortIcon('date_joined')}
                </th>
                <th onClick={() => handleSort('bookings_count')} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none' }}>
                  Брони {getSortIcon('bookings_count')}
                </th>
                <th onClick={() => handleSort('balance')} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none' }}>
                  Баланс {getSortIcon('balance')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(u => (
                <tr
                  key={u.id}
                  onClick={() => setEditTarget(u)}
                  title="Нажмите для редактирования"
                  style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--cream)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}
                >
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: getAvatarColor(u.id), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700 }}>
                        {getInitials(u)}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>
                          {u.first_name || u.last_name ? `${u.first_name || ''} ${u.last_name || ''}` : 'Без имени'}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>@{u.username}</span>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-muted)' }}>{u.phone_number || u.username}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ background: ROLE_MAP[u.role]?.bg || 'rgba(0,0,0,0.05)', color: ROLE_MAP[u.role]?.color || '#333', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
                      {ROLE_MAP[u.role]?.label || u.role}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-muted)' }}>{formatDate(u.date_joined)}</td>
                  <td style={{ padding: '14px 16px', fontSize: 14, fontWeight: 600 }}>{u.bookings_count}</td>
                  <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 500, color: 'var(--navy)' }}>{formatMoney(u.balance || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editTarget && (
        <UserEditModal
          user={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
