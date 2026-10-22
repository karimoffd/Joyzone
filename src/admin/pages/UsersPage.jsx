import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api, { getApiErrorMessage } from '../../api/client.js';
import logoImage from '../../assets/img/Logo.png';
import { fileToAvatarDataUrl } from '../../utils/avatarImage.js';

const PERSONAL_FIELDS = ['first_name', 'last_name', 'phone_number', 'email', 'avatar'];
const PROFILE_DETAIL_LABELS = {
  headline: 'О себе коротко',
  preferred_name: 'Предпочитаемое имя',
  city: 'Город',
  address: 'Адрес',
  birth_year: 'Год рождения',
  languages: 'Языки',
  work: 'Работа / сфера',
  company: 'Компания / команда',
  about: 'О себе',
  interests: 'Интересы',
};

function UserAvatar({ user, size = 36, radius = 10 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: radius, background: getAvatarColor(user.id), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: Math.round(size / 3), fontWeight: 700, overflow: 'hidden', flexShrink: 0 }}>
      {user.avatar ? <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : getInitials(user)}
    </div>
  );
}

const ROLE_MAP = {
  client: { label: 'Клиент', bg: 'rgba(41,74,109,0.1)', color: '#294a6d' },
  partner: { label: 'Партнёр', bg: 'rgba(26,107,107,0.1)', color: '#1a6b6b' },
  admin: { label: 'Админ', bg: 'rgba(228,102,48,0.12)', color: '#e46630' },
  moderator: { label: 'Модератор', bg: 'rgba(74,48,112,0.1)', color: '#4a3070' }
};

const ROLE_OPTIONS = [
  { id: 'client', label: 'Клиент', desc: 'Аренда пространств и бронирование', icon: 'C', accent: '#2563eb', bg: 'rgba(37, 99, 235, 0.06)', glow: 'rgba(37, 99, 235, 0.15)' },
  { id: 'partner', label: 'Партнёр', desc: 'Сдача объектов и менеджмент мест', icon: 'P', accent: '#059669', bg: 'rgba(5, 150, 105, 0.06)', glow: 'rgba(5, 150, 105, 0.15)' },
  { id: 'moderator', label: 'Модератор', desc: 'Контроль контента и объявлений', icon: 'M', accent: '#7c3aed', bg: 'rgba(124, 58, 237, 0.06)', glow: 'rgba(124, 58, 237, 0.15)' },
  { id: 'admin', label: 'Администратор', desc: 'Полный доступ ко всей системе', icon: 'A', accent: '#ea580c', bg: 'rgba(234, 88, 12, 0.06)', glow: 'rgba(234, 88, 12, 0.15)' }
];

const TABS = ['Все', 'client', 'partner', 'moderator', 'admin'];

const getInitials = (user) => {
  const f = user.first_name || '';
  const l = user.last_name || '';
  if (f || l) {
    return (f.slice(0, 1) + l.slice(0, 1)).toUpperCase();
  }
  const letters = (user.username || '').replace(/[^A-Za-zА-Яа-яЁё]/g, '');
  return letters.slice(0, 2).toUpperCase() || 'JZ';
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

function UserEditModal({ user, onClose, onSave }) {
  const [role, setRole] = useState(user.role || 'client');
  const [loading, setLoading] = useState(false);
  const [showWarningConfirm, setShowWarningConfirm] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [partnerProfile, setPartnerProfile] = useState({
    company_name: user.company_name || '',
    partner_bio: user.partner_bio || '',
    is_featured_partner: Boolean(user.is_featured_partner),
  });
  const [personal, setPersonal] = useState(() => Object.fromEntries(PERSONAL_FIELDS.map((key) => [key, user[key] || ''])));
  const [avatarError, setAvatarError] = useState('');
  const avatarInputRef = React.useRef(null);
  const profileChanged = partnerProfile.company_name !== (user.company_name || '')
    || partnerProfile.partner_bio !== (user.partner_bio || '')
    || partnerProfile.is_featured_partner !== Boolean(user.is_featured_partner);
  const personalChanges = Object.fromEntries(
    PERSONAL_FIELDS.filter((key) => personal[key] !== (user[key] || '')).map((key) => [key, personal[key] || (key === 'avatar' ? null : '')]),
  );
  const personalChanged = Object.keys(personalChanges).length > 0;

  const handleAvatarFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const avatar = await fileToAvatarDataUrl(file);
      setPersonal((current) => ({ ...current, avatar }));
      setAvatarError('');
    } catch (error) {
      setAvatarError(error.message);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (role === user.role) {
      if (profileChanged || personalChanged) executeSave();
      else onClose();
      return;
    }
    const privilegedChange = ['admin', 'moderator'].includes(user.role)
      || ['admin', 'moderator'].includes(role);
    if (privilegedChange || (user.role === 'partner' && role !== 'partner')) {
      setShowWarningConfirm(true);
      return;
    }
    executeSave();
  };

  const executeSave = async () => {
    setLoading(true);
    setSaveError('');
    try {
      await onSave(user.id, {
        role,
        ...personalChanges,
        ...(role === 'partner' && profileChanged ? partnerProfile : {}),
      });
    } catch (error) {
      setShowWarningConfirm(false);
      setSaveError(getApiErrorMessage(error, 'Не удалось изменить роль пользователя.'));
    } finally {
      setLoading(false);
    }
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
                style={{ background: getAvatarColor(user.id), overflow: 'hidden' }}
              >
                {personal.avatar ? <img src={personal.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : getInitials(user)}
              </div>
              <div className="adm-user-banner-info">
                <h4 className="adm-user-banner-name">{fullName}</h4>
                <span className="adm-user-banner-handle">@{user.username || 'user'}</span>
                <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                  <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarFile} style={{ display: 'none' }} />
                  <button type="button" className="adm-btn adm-btn-outline" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => avatarInputRef.current?.click()}>
                    {personal.avatar ? 'Заменить фото' : 'Загрузить фото'}
                  </button>
                  {personal.avatar ? (
                    <button type="button" className="adm-btn adm-btn-outline" style={{ padding: '6px 12px', fontSize: 12, color: '#dc2626' }} onClick={() => setPersonal((current) => ({ ...current, avatar: '' }))}>
                      Удалить фото
                    </button>
                  ) : null}
                </div>
                {avatarError ? <small style={{ color: '#dc2626', fontWeight: 600 }}>{avatarError}</small> : null}
              </div>
            </div>

            <div>
              <div className="adm-role-selector-head">
                <h4>Личные данные</h4>
                <p>Имя и контакты видны партнёрам в бронях и чатах</p>
              </div>
              <div className="adm-user-edit-grid">
                {[
                  ['first_name', 'Имя', 'text'],
                  ['last_name', 'Фамилия', 'text'],
                  ['phone_number', 'Телефон', 'tel'],
                  ['email', 'Email', 'email'],
                ].map(([key, label, type]) => (
                  <label key={key} className="adm-user-edit-field">
                    <span>{label}</span>
                    <input
                      type={type}
                      value={personal[key]}
                      onChange={(event) => setPersonal((current) => ({ ...current, [key]: event.target.value }))}
                    />
                  </label>
                ))}
              </div>
            </div>

            {Object.keys(user.profile_details || {}).length ? (
              <div>
                <div className="adm-role-selector-head">
                  <h4>Анкета пользователя</h4>
                  <p>Заполняет сам пользователь в профиле и настройках</p>
                </div>
                <div className="adm-user-details-grid">
                  {Object.entries(PROFILE_DETAIL_LABELS)
                    .filter(([key]) => user.profile_details[key])
                    .map(([key, label]) => (
                      <div key={key} className="adm-user-detail-item" style={['about', 'interests'].includes(key) ? { gridColumn: '1 / -1' } : undefined}>
                        <span className="adm-user-detail-label">{label}</span>
                        <span className="adm-user-detail-val" style={{ whiteSpace: 'pre-wrap', fontWeight: 600 }}>{user.profile_details[key]}</span>
                      </div>
                    ))}
                </div>
              </div>
            ) : null}

            {/* User Details Grid */}
            <div className="adm-user-details-grid">
              <div className="adm-user-detail-item">
                <span className="adm-user-detail-label">Дата регистрации</span>
                <span className="adm-user-detail-val">{formatDate(user.date_joined)}</span>
              </div>
              <div className="adm-user-detail-item">
                <span className="adm-user-detail-label">ID Пользователя</span>
                <span className="adm-user-detail-val">#{user.id}</span>
              </div>
              <div className="adm-user-detail-item">
                <span className="adm-user-detail-label">Тариф</span>
                <span className="adm-user-detail-val">{user.tariff_details?.name || user.tariff_details?.name_ru || 'Без тарифа'}</span>
              </div>
              <div className="adm-user-detail-item">
                <span className="adm-user-detail-label">Тариф действует до</span>
                <span className="adm-user-detail-val">{formatDate(user.tariff_expires_at)}</span>
              </div>
              <div className="adm-user-detail-item">
                <span className="adm-user-detail-label">Бронирования</span>
                <span className="adm-user-detail-val">{user.bookings_count || 0}</span>
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

            {role === 'partner' ? (
              <div data-testid="partner-public-profile" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="adm-role-selector-head">
                  <h4>Публичный профиль партнёра</h4>
                  <p>Показывается в блоке «Joyzone hamkorlari» и на странице партнёра</p>
                </div>
                <input
                  className="adm-input"
                  style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)' }}
                  placeholder="Название компании"
                  value={partnerProfile.company_name}
                  onChange={(e) => setPartnerProfile((p) => ({ ...p, company_name: e.target.value }))}
                />
                <textarea
                  rows={3}
                  style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', fontFamily: 'inherit' }}
                  placeholder="Короткое описание (чем занимается партнёр)"
                  value={partnerProfile.partner_bio}
                  onChange={(e) => setPartnerProfile((p) => ({ ...p, partner_bio: e.target.value }))}
                />
                <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
                  <input
                    type="checkbox"
                    checked={partnerProfile.is_featured_partner}
                    onChange={(e) => setPartnerProfile((p) => ({ ...p, is_featured_partner: e.target.checked }))}
                  />
                  Показывать первым на главной
                </label>
              </div>
            ) : null}

            {saveError ? (
              <div role="alert" style={{ padding: '10px 12px', borderRadius: 10, background: '#fef2f2', color: '#991b1b', fontSize: 13 }}>
                {saveError}
              </div>
            ) : null}

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
            <div className="adm-confirm-icon-box">!</div>
            <h3>Подтвердите изменение роли</h3>
            <p>
              Пользователь <strong>{fullName}</strong>: роль изменится с <strong>{ROLE_MAP[user.role]?.label || user.role}</strong> на <strong>{targetRoleObj?.label || role}</strong>.
            </p>
            <div className="adm-confirm-alert-box">
              {['admin', 'moderator'].includes(role)
                ? 'Новая роль предоставляет доступ к административным или модерационным операциям. Проверьте пользователя перед подтверждением.'
                : ['admin', 'moderator'].includes(user.role)
                  ? 'Пользователь потеряет административные или модерационные права сразу после сохранения.'
                  : 'Пользователь потеряет доступ к партнёрскому кабинету. Его существующие места не архивируются автоматически и требуют отдельной проверки.'}
            </div>
            <div className="adm-confirm-actions">
              <button 
                type="button" 
                className="adm-modal-btn confirm-archive"
                disabled={loading}
                onClick={executeSave}
              >
                {loading ? 'Сохранение...' : 'Подтвердить изменение роли'}
              </button>
              <button 
                type="button" 
                className="adm-modal-btn cancel" 
                onClick={() => setShowWarningConfirm(false)}
              >
                Отмена
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
  const [actionMessage, setActionMessage] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/auth/users/');
      setUsers(res.data?.results || res.data || []);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Не удалось загрузить пользователей'));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSave = async (userId, data) => {
    await api.patch(`/api/auth/users/${userId}/`, data);
    await fetchUsers();
    setEditTarget(null);
    setActionMessage('Данные пользователя сохранены. Запись добавлена в журнал действий.');
  };

  const stats = React.useMemo(() => {
    let clients = 0;
    let partners = 0;
    let admins = 0;
    let moderators = 0;

    users.forEach(u => {
      if (u.role === 'client') clients++;
      else if (u.role === 'partner') partners++;
      else if (u.role === 'admin') admins++;
      else if (u.role === 'moderator') moderators++;
    });

    return { clients, partners, admins, moderators, total: users.length };
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
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Админы и модераторы</span>
          <strong style={{ fontSize: 26, color: 'var(--orange)' }}>{stats.admins + stats.moderators}</strong>
        </div>
      </div>

      {/* Filter and Search actions */}
      {actionMessage ? (
        <div style={{ marginBottom: 14, padding: '11px 13px', borderRadius: 8, background: '#f0fdf4', color: '#166534', fontSize: 13 }}>
          {actionMessage}
        </div>
      ) : null}
      {error ? (
        <div style={{ marginBottom: 14, padding: '11px 13px', borderRadius: 8, background: '#fef2f2', color: '#991b1b', fontSize: 13 }}>
          {error}
        </div>
      ) : null}
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
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1080px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                <th onClick={() => handleSort('name')} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none' }}>
                  ID / Пользователь {getSortIcon('name')}
                </th>
                <th onClick={() => handleSort('phone_number')} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none' }}>
                  Контакты {getSortIcon('phone_number')}
                </th>
                <th onClick={() => handleSort('role')} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none' }}>
                  Роль {getSortIcon('role')}
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-muted)' }}>
                  Тариф / срок
                </th>
                <th onClick={() => handleSort('bookings_count')} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none' }}>
                  Брони {getSortIcon('bookings_count')}
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
                      <UserAvatar user={u} />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>
                          {u.first_name || u.last_name ? `${u.first_name || ''} ${u.last_name || ''}` : 'Без имени'}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>@{u.username}</span>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>ID #{u.id}</span>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-muted)' }}>
                    <div>{u.phone_number || 'Телефон не указан'}</div>
                    <div style={{ fontSize: 11, marginTop: 3, overflowWrap: 'anywhere' }}>{u.email || 'Email не указан'}</div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ background: ROLE_MAP[u.role]?.bg || 'rgba(0,0,0,0.05)', color: ROLE_MAP[u.role]?.color || '#333', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
                      {ROLE_MAP[u.role]?.label || u.role}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 13 }}>
                    <div style={{ fontWeight: 600 }}>{u.tariff_details?.name || u.tariff_details?.name_ru || 'Без тарифа'}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 3 }}>{u.tariff_expires_at ? `до ${formatDate(u.tariff_expires_at)}` : 'Срок не задан'}</div>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 14, fontWeight: 600 }}>{u.bookings_count}</td>
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
