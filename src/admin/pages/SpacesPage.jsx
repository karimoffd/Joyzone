import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api, { getApiErrorMessage } from '../../api/client.js';
import { normalizePlace } from '../../utils/placeMapper.js';
import { removeStorageItem, setStorageItem, STORAGE_KEYS } from '../../utils/storageKeys.js';
import { navigate } from "../../utils/router.js";

const STATUS_COLORS = {
  approved: { bg: 'rgba(34,197,94,0.12)', color: '#16a34a', label: 'Опубликовано' },
  pending: { bg: 'rgba(228,102,48,0.12)', color: 'var(--orange)', label: 'Модерация' },
  rejected: { bg: 'rgba(239,68,68,0.1)', color: '#dc2626', label: 'Отклонено' },
  active: { bg: 'rgba(34,197,94,0.12)', color: '#16a34a', label: 'Активный' },
  draft: { bg: 'rgba(228,102,48,0.12)', color: 'var(--orange)', label: 'Черновик' },
  inactive: { bg: 'rgba(156,163,175,0.15)', color: '#6b7280', label: 'Неактивный' },
};

const CARD_GRADIENTS = [
  'linear-gradient(135deg,#294a6d,#12283f)',
  'linear-gradient(135deg,#1a6b6b,#0f4646)',
  'linear-gradient(135deg,#e46630,#a0411a)',
  'linear-gradient(135deg,#4a3070,#2e1a4f)',
  'linear-gradient(135deg,#2a5a8a,#1a3a5f)',
];

function buildAdminSpaceView(space, index = 0) {
  const normalized = normalizePlace(space, { index });
  return {
    ...normalized,
    category_name: normalized.category_name || 'Без категории',
    revenue: space.revenue || '0',
    occupancy: Number(space.occupancy || 0),
    color: space.color || CARD_GRADIENTS[index % CARD_GRADIENTS.length],
  };
}

function uniqueOptions(items, key, labelKey = key) {
  const seen = new Map();
  items.forEach((item) => {
    const value = item[key];
    if (value === null || value === undefined || value === '') return;
    const label = item[labelKey] || value;
    if (!seen.has(String(value))) seen.set(String(value), { value: String(value), label: String(label) });
  });
  return [...seen.values()];
}

export default function SpacesPage() {
  const [spaces, setSpaces] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [moderationDialog, setModerationDialog] = useState(null);
  const [moderationNote, setModerationNote] = useState('');
  const [moderating, setModerating] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    category: 'all',
    owner: 'all',
    search: '',
  });

  const loadCategories = useCallback(async () => {
    try {
      const res = await api.get('/api/categories/');
      setCategories(res.data?.results || res.data || []);
    } catch (err) {
      setApiError(getApiErrorMessage(err, 'Не удалось загрузить категории для фильтра.'));
      setCategories([]);
    }
  }, []);

  const loadSpaces = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.status !== 'all') params.status = filters.status;
      if (filters.category !== 'all') params.category = filters.category;
      if (filters.owner !== 'all') params.owner = filters.owner;
      if (filters.search.trim()) params.search = filters.search.trim();

      const res = await api.get('/api/places/', { params });
      const data = res.data?.results || res.data || [];
      setSpaces(data.map((space, index) => buildAdminSpaceView(space, index)));
      setApiError('');
    } catch (err) {
      setApiError(getApiErrorMessage(err, 'Не удалось загрузить места.'));
      setSpaces([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    const timer = window.setTimeout(loadSpaces, 250);
    return () => window.clearTimeout(timer);
  }, [loadSpaces]);

  useEffect(() => {
    const refreshAfterEdit = () => loadSpaces();
    window.addEventListener('joyzone-place-saved', refreshAfterEdit);
    return () => window.removeEventListener('joyzone-place-saved', refreshAfterEdit);
  }, [loadSpaces]);

  const ownerOptions = useMemo(() => (
    uniqueOptions(spaces, 'owner_id', 'owner_name').filter((item) => item.value !== 'null')
  ), [spaces]);

  const categoryOptions = useMemo(() => {
    if (categories.length) {
      return categories.map((category) => ({
        value: String(category.id || category.slug),
        label: category.name_ru || category.name_uz || category.name_en || category.slug || `Category #${category.id}`,
      }));
    }
    return uniqueOptions(spaces, 'category_name');
  }, [categories, spaces]);

  const handleEdit = (space) => {
    setStorageItem(STORAGE_KEYS.workflow.editPlaceId, space.id);
    setStorageItem(STORAGE_KEYS.workflow.editPlaceReturnHash, '/admin');
    setStorageItem(STORAGE_KEYS.workflow.adminPage, 'spaces');
    navigate('/partner');
  };

  const handleView = (space) => {
    navigate(`/space-${space.id}`);
  };

  const handleAdd = () => {
    removeStorageItem(STORAGE_KEYS.workflow.editPlaceId);
    setStorageItem(STORAGE_KEYS.workflow.editPlaceReturnHash, '/admin');
    setStorageItem(STORAGE_KEYS.workflow.adminPage, 'spaces');
    navigate('/partner');
  };

  const openModerationDialog = (space, action) => {
    setActionMessage('');
    setModerationNote('');
    setModerationDialog({ space, action });
  };

  const closeModerationDialog = () => {
    if (moderating) return;
    setModerationDialog(null);
    setModerationNote('');
    setActionMessage('');
  };

  const submitModeration = async () => {
    if (!moderationDialog) return;
    const note = moderationNote.trim();
    if (moderationDialog.action === 'reject' && !note) {
      setActionMessage('Укажите причину отклонения.');
      return;
    }

    setModerating(true);
    setActionMessage('');
    try {
      const { space, action } = moderationDialog;
      await api.post(`/api/places/${space.id}/${action}/`, { note });
      setModerationDialog(null);
      setModerationNote('');
      setActionMessage(action === 'approve' ? 'Место одобрено.' : 'Место отклонено.');
      await loadSpaces();
    } catch (err) {
      setActionMessage(getApiErrorMessage(err, 'Не удалось изменить статус места.'));
    } finally {
      setModerating(false);
    }
  };

  return (
    <div className="adm-anim adm-anim-1">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
          <input
            value={filters.search}
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
            placeholder="Поиск по названию, адресу, описанию..."
            style={{ minWidth: 260, flex: '1 1 260px', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', outline: 'none', fontSize: 13 }}
          />
          <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', outline: 'none', fontSize: 13 }}>
            <option value="all">Все статусы</option>
            <option value="pending">Модерация</option>
            <option value="approved">Опубликовано</option>
            <option value="rejected">Отклонено</option>
          </select>
          <select value={filters.category} onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', outline: 'none', fontSize: 13 }}>
            <option value="all">Все категории</option>
            {categoryOptions.map((category) => (
              <option key={category.value} value={category.value}>{category.label}</option>
            ))}
          </select>
          <select value={filters.owner} onChange={(event) => setFilters((current) => ({ ...current, owner: event.target.value }))} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', outline: 'none', fontSize: 13 }}>
            <option value="all">Все владельцы</option>
            {ownerOptions.map((owner) => (
              <option key={owner.value} value={owner.value}>{owner.label}</option>
            ))}
          </select>
        </div>
        <button className="adm-btn adm-btn-primary" onClick={handleAdd}>+ Добавить пространство</button>
      </div>

      {apiError ? (
        <div className="adm-card" style={{ marginBottom: 12, padding: 12, color: '#dc2626', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <span>{apiError}</span>
          <button className="adm-btn adm-btn-outline" type="button" onClick={loadSpaces}>Повторить</button>
        </div>
      ) : null}
      {actionMessage ? (
        <div className="adm-card" style={{ marginBottom: 12, padding: 12, color: actionMessage.includes('Не удалось') || actionMessage.includes('Укажите') ? '#dc2626' : '#15803d', fontSize: 13 }}>
          {actionMessage}
        </div>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, opacity: loading ? 0.72 : 1 }}>
        {spaces.map((space, index) => {
          const status = STATUS_COLORS[space.status] || STATUS_COLORS.pending;
          return (
            <div key={space.id || `${space.title}-${index}`} className="adm-space-card">
              <div className="adm-space-img" style={{ background: space.color, height: 130 }}>
                <span className="adm-space-img-label">{space.category_name}</span>
                <div style={{ position: 'absolute', top: 10, right: 10 }}>
                  <span style={{ background: status.bg, color: status.color, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, backdropFilter: 'blur(4px)' }}>{status.label}</span>
                </div>
              </div>
              <div className="adm-space-body">
                <div className="adm-space-name">{space.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                  {space.subcategory_name || space.category_name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
                  {space.area} м² · {space.people} чел · {space.price}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
                  Владелец: <strong style={{ color: 'var(--text)' }}>{space.owner_name}</strong>
                  {space.owner_id ? ` · ID ${space.owner_id}` : ''}
                </div>
                {space.owner_phone || space.owner_email ? (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: -6, marginBottom: 10, overflowWrap: 'anywhere' }}>
                    {[space.owner_phone, space.owner_email].filter(Boolean).join(' · ')}
                  </div>
                ) : null}
                {space.moderator_note ? (
                  <div style={{ fontSize: 12, color: space.status === 'rejected' ? '#b91c1c' : 'var(--text-muted)', background: space.status === 'rejected' ? '#fef2f2' : 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', marginBottom: 10 }}>
                    <strong>Заметка модератора:</strong> {space.moderator_note}
                  </div>
                ) : null}
                <div className="adm-space-stats">
                  <div className="adm-space-stat"><span className="adm-space-stat-val">{space.bookings_count}</span><span className="adm-space-stat-lbl">Брони</span></div>
                  <div className="adm-space-stat"><span className="adm-space-stat-val">{space.revenue}</span><span className="adm-space-stat-lbl">Доход</span></div>
                  <div className="adm-space-stat"><span className="adm-space-stat-val">{space.occupancy}%</span><span className="adm-space-stat-lbl">Загрузка</span></div>
                </div>
                <div className="adm-occupancy-bar"><div className="adm-occupancy-fill" style={{ width: `${Math.max(0, Math.min(100, space.occupancy))}%` }} /></div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button className="adm-btn adm-btn-outline" style={{ flex: 1, fontSize: 12, padding: '7px 0', justifyContent: 'center' }} onClick={() => handleEdit(space)}>Редактировать</button>
                  <button className="adm-btn adm-btn-outline" style={{ fontSize: 12, padding: '7px 12px' }} onClick={() => handleView(space)}>Просмотр</button>
                </div>
                {(space.status === 'pending' || space.status === 'rejected') ? (
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button className="adm-btn adm-btn-primary" style={{ flex: 1, fontSize: 12, justifyContent: 'center' }} onClick={() => openModerationDialog(space, 'approve')}>Одобрить</button>
                    <button className="adm-btn adm-btn-outline" style={{ flex: 1, fontSize: 12, justifyContent: 'center', color: '#dc2626' }} onClick={() => openModerationDialog(space, 'reject')}>Отклонить</button>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}

        {spaces.length === 0 ? (
          <div className="adm-card" style={{ gridColumn: '1 / -1', padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            {loading ? 'Загрузка мест...' : 'Места не найдены'}
          </div>
        ) : null}
      </div>

      {moderationDialog ? (
        <div
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModerationDialog();
          }}
          style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(15, 23, 42, 0.48)', display: 'grid', placeItems: 'center', padding: 20 }}
        >
          <div className="adm-card" role="dialog" aria-modal="true" aria-labelledby="space-moderation-title" style={{ width: 'min(520px, 100%)', padding: 22 }}>
            <h3 id="space-moderation-title" style={{ margin: '0 0 8px', fontSize: 18 }}>
              {moderationDialog.action === 'approve' ? 'Одобрить место' : 'Отклонить место'}
            </h3>
            <p style={{ margin: '0 0 16px', color: 'var(--text-muted)', fontSize: 13 }}>
              {moderationDialog.space.title} · владелец {moderationDialog.space.owner_name}
            </p>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }} htmlFor="moderation-note">
              {moderationDialog.action === 'reject' ? 'Причина отклонения' : 'Комментарий модератора (необязательно)'}
            </label>
            <textarea
              id="moderation-note"
              value={moderationNote}
              onChange={(event) => setModerationNote(event.target.value)}
              rows={4}
              autoFocus
              style={{ width: '100%', resize: 'vertical', padding: 11, borderRadius: 8, border: '1px solid var(--border)', font: 'inherit', boxSizing: 'border-box' }}
            />
            {actionMessage ? <div style={{ color: '#dc2626', fontSize: 12, marginTop: 8 }}>{actionMessage}</div> : null}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button className="adm-btn adm-btn-outline" type="button" disabled={moderating} onClick={closeModerationDialog}>Отмена</button>
              <button className="adm-btn adm-btn-primary" type="button" disabled={moderating} onClick={submitModeration}>
                {moderating ? 'Сохранение...' : moderationDialog.action === 'approve' ? 'Одобрить' : 'Отклонить'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
