import React, { useState, useEffect } from "react";
import api, { getAccessToken, getApiErrorMessage } from "../../api/client.js";

const styles = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

.mod-page {
  font-family: 'Inter', sans-serif;
  padding: 0;
  min-height: 100vh;
}
.mod-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 28px;
  flex-wrap: wrap;
  gap: 16px;
}
.mod-title { font-size: 26px; font-weight: 800; color: #1a1a2e; margin: 0; }
.mod-sub { font-size: 14px; color: #64748b; margin-top: 4px; }
.mod-tabs {
  display: flex;
  gap: 8px;
  background: #fff;
  border: 1px solid #e2e8f0;
  padding: 4px;
  border-radius: 12px;
}
.mod-tab {
  padding: 8px 20px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  background: none;
  color: #64748b;
  transition: all 0.2s;
}
.mod-tab.active { background: #1a1a2e; color: #fff; }
.mod-tab .badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  font-size: 11px;
  margin-left: 6px;
  background: #e46630;
  color: white;
}
.mod-list { display: flex; flex-direction: column; gap: 12px; }
.mod-card {
  background: #fff;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  padding: 20px 24px;
  display: flex;
  align-items: flex-start;
  gap: 20px;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0,0,0,0.03);
}
.mod-card:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.07); }
.mod-card-status {
  width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; margin-top: 6px;
}
.status-pending { background: #f59e0b; }
.status-approved { background: #10b981; }
.status-rejected { background: #ef4444; }
.mod-card-info { flex: 1; min-width: 0; }
.mod-card-title { font-size: 18px; font-weight: 800; color: #1a1a2e; margin: 0 0 6px; }
.mod-card-meta-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 6px 12px;
  margin-top: 10px;
  margin-bottom: 10px;
}
.meta-item {
  font-size: 13px;
  color: #1a1a2e;
}
.meta-label {
  font-weight: 600;
  color: #64748b;
  margin-right: 4px;
}
.meta-val {
  font-weight: 500;
}
.mod-card-preview {
  position: relative;
  width: 140px;
  height: 100px;
  border-radius: 12px;
  overflow: hidden;
  flex-shrink: 0;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  display: block;
}
.mod-card-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.mod-card-images-count {
  position: absolute;
  bottom: 6px;
  right: 6px;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
}
.mod-card-note {
  font-size: 13px;
  color: #64748b;
  background: #f8fafc;
  border-left: 3px solid #e2e8f0;
  padding: 8px 12px;
  border-radius: 0 6px 6px 0;
  margin-top: 12px;
}
.mod-card-note.rejected { border-color: #ef4444; color: #b91c1c; background: #fef2f2; }
.mod-card-note.approved { border-color: #10b981; }
.mod-actions { display: flex; gap: 8px; align-items: center; flex-shrink: 0; }
.btn-approve {
  padding: 8px 18px; border-radius: 8px; border: none; cursor: pointer;
  background: #10b981; color: #fff; font-weight: 600; font-size: 13px;
  transition: all 0.2s;
}
.btn-approve:hover { background: #059669; transform: translateY(-1px); }
.btn-reject {
  padding: 8px 18px; border-radius: 8px; border: none; cursor: pointer;
  background: #fef2f2; color: #ef4444; font-weight: 600; font-size: 13px;
  border: 1px solid #fecaca;
  transition: all 0.2s;
}
.btn-reject:hover { background: #ef4444; color: #fff; }
.mod-empty {
  text-align: center;
  padding: 60px 20px;
  color: #94a3b8;
  font-size: 15px;
}
.mod-empty svg { opacity: 0.3; margin-bottom: 16px; }
.mod-modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.4);
  backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  z-index: 9999;
}
.mod-modal {
  background: #fff;
  border-radius: 20px;
  padding: 32px;
  width: 460px;
  max-width: 95vw;
  box-shadow: 0 25px 50px rgba(0,0,0,0.15);
}
.mod-modal h3 { font-size: 18px; font-weight: 700; color: #1a1a2e; margin: 0 0 8px; }
.mod-modal p { font-size: 14px; color: #64748b; margin-bottom: 20px; }
.mod-modal textarea {
  width: 100%; box-sizing: border-box;
  border: 1.5px solid #e2e8f0; border-radius: 10px;
  padding: 12px; font-size: 14px; resize: vertical;
  font-family: inherit; outline: none; min-height: 100px;
  transition: border-color 0.2s;
}
.mod-modal textarea:focus { border-color: #e46630; }
.mod-modal-btns { display: flex; gap: 10px; margin-top: 16px; justify-content: flex-end; }
.mod-modal-cancel {
  padding: 10px 20px; border-radius: 8px; border: 1px solid #e2e8f0;
  background: none; color: #64748b; font-weight: 600; cursor: pointer;
}
.mod-modal-confirm {
  padding: 10px 20px; border-radius: 8px; border: none;
  background: #ef4444; color: #fff; font-weight: 700; cursor: pointer;
  transition: background 0.2s;
}
.mod-modal-confirm:hover { background: #dc2626; }
.stat-chips { display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
.stat-chip {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 12px 20px;
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
}
.stat-chip strong { display: block; font-size: 22px; font-weight: 800; color: #1a1a2e; }

/* Place Detail Modal */
.detail-modal {
  max-width: 980px;
  width: 90%;
  padding: 28px;
  max-height: 92vh;
  overflow-y: auto;
}
.detail-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.detail-modal-body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 28px;
  margin-bottom: 24px;
}
.detail-modal-main-img {
  width: 100%;
  height: 240px;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  margin-bottom: 12px;
}
.detail-modal-main-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.detail-modal-thumbs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
}
.detail-modal-thumb {
  width: 60px;
  height: 45px;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  flex-shrink: 0;
  transition: border-color 0.2s;
}
.detail-modal-thumb.active {
  border-color: #e46630;
}
.detail-modal-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.detail-modal-info {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.detail-modal-title {
  font-size: 22px;
  font-weight: 800;
  color: #1a1a2e;
  margin: 0 0 12px;
}
.detail-modal-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-size: 14px;
  color: #1a1a2e;
}
.detail-modal-grid-item {
  display: flex;
  gap: 6px;
}
.detail-modal-grid-item .label {
  font-weight: 600;
  color: #64748b;
  min-width: 110px;
}
.detail-modal-amenities {
  margin-top: 20px;
}
.detail-modal-section {
  margin-top: 18px;
}
.detail-modal-section h4,
.detail-modal-amenities h4 {
  margin: 0 0 8px;
  font-size: 13px;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.detail-modal-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.detail-modal-tag {
  font-size: 11px;
  background: #f1f5f9;
  padding: 4px 10px;
  border-radius: 6px;
  color: #475569;
  font-weight: 600;
}
.detail-modal-kv {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 8px;
}
.detail-modal-kv div {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 8px 10px;
  background: #f8fafc;
  font-size: 12px;
}
.detail-modal-kv span {
  display: block;
  color: #64748b;
  font-weight: 700;
  margin-bottom: 2px;
}
.detail-modal-desc {
  border-top: 1px solid #e2e8f0;
  padding-top: 16px;
  font-size: 13.5px;
  color: #475569;
  line-height: 1.5;
}
.mod-card-title {
  cursor: pointer;
  transition: color 0.2s;
}
.mod-card-title:hover {
  color: #e46630;
  text-decoration: underline;
}
.mod-card-preview {
  cursor: pointer;
}
`;

const priceLabels = {
  price_hourly: 'Почасовая',
  price_daily: 'Дневная',
  price_weekly: 'Недельная',
  price_monthly: 'Месячная',
  soatlik: 'Почасовая',
  hourly: 'Почасовая',
  hour: 'Почасовая',
  kunlik: 'Дневная',
  daily: 'Дневная',
  day: 'Дневная',
  haftalik: 'Недельная',
  weekly: 'Недельная',
  week: 'Недельная',
  oylik: 'Месячная',
  monthly: 'Месячная',
  month: 'Месячная',
};

function formatMoney(value, currency = 'UZS') {
  if (value === null || value === undefined || value === '') return '';
  const numeric = Number(value);
  if (!Number.isNaN(numeric)) {
    return `${new Intl.NumberFormat('ru-RU').format(numeric)} ${currency}`;
  }
  return String(value);
}

function getPriceDetails(place = {}) {
  const rows = [];
  ['price_hourly', 'price_daily', 'price_weekly', 'price_monthly'].forEach((key) => {
    if (place[key] !== null && place[key] !== undefined && place[key] !== '') {
      rows.push({ label: priceLabels[key], value: formatMoney(place[key], place.currency || 'UZS') });
    }
  });
  if (place.prices && typeof place.prices === 'object' && !Array.isArray(place.prices)) {
    Object.entries(place.prices).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        rows.push({ label: priceLabels[key] || key, value: formatMoney(value, place.currency || 'UZS') });
      }
    });
  }
  if (rows.length === 0 && place.price) {
    rows.push({ label: 'Основная', value: place.price });
  }
  return rows;
}

function getObjectEntries(value = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  return Object.entries(value).filter(([, item]) => item !== null && item !== undefined && item !== '');
}

function getAmenityItems(place = {}, allParameters = []) {
  const amenitySlugs = Array.isArray(place.amenities) ? place.amenities : [];
  const bySlug = new Map(allParameters.map((param) => [param.slug, param]));
  return amenitySlugs.map((slug) => {
    const param = bySlug.get(slug);
    return {
      slug,
      label: param?.name_ru || param?.name_uz || param?.name_en || slug,
    };
  });
}

function RejectModal({ place, onConfirm, onCancel }) {
  const [note, setNote] = useState('');
  return (
    <div className="mod-modal-overlay">
      <div className="mod-modal">
        <h3>❌ Reject: {place.title}</h3>
        <p>Leave a note for the partner explaining why the listing was rejected.</p>
        <textarea
          placeholder="e.g. Photos are too dark. Please upload higher quality images."
          value={note}
          onChange={e => setNote(e.target.value)}
        />
        <div className="mod-modal-btns">
          <button className="mod-modal-cancel" onClick={onCancel}>Cancel</button>
          <button className="mod-modal-confirm" onClick={() => onConfirm(note)}>Confirm Reject</button>
        </div>
      </div>
    </div>
  );
}

function PlaceDetailModal({ place, onClose, onApprove, onReject, activeTab, allParameters = [] }) {
  const [activeImage, setActiveImage] = useState(place.images?.[0] || '');

  const selectedAmenities = React.useMemo(
    () => getAmenityItems(place, allParameters),
    [place, allParameters]
  );
  const priceDetails = React.useMemo(() => getPriceDetails(place), [place]);
  const characteristicRows = React.useMemo(() => getObjectEntries(place.characteristics), [place.characteristics]);
  const moderationLogs = Array.isArray(place.moderation_logs) ? place.moderation_logs : [];

  return (
    <div className="mod-modal-overlay">
      <div className="mod-modal detail-modal">
        <div className="detail-modal-header">
          <span className="mod-slug-badge" style={{ background: '#e46630', color: '#fff', fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '20px' }}>
            {place.category_name} {place.subcategory_name ? ` › ${place.subcategory_name}` : ''}
          </span>
          <button className="btn-close-modal" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#64748b' }}>✕</button>
        </div>

        <div className="detail-modal-body">
          {/* Photos */}
          <div>
            <div className="detail-modal-main-img">
              {activeImage ? (
                <img src={activeImage} alt={place.title} />
              ) : (
                <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: '#94a3b8', fontWeight: 700 }}>
                  Нет фото
                </div>
              )}
            </div>
            {place.images && place.images.length > 1 && (
              <div className="detail-modal-thumbs">
                {place.images.map((img, i) => (
                  <div
                    key={i}
                    onClick={() => setActiveImage(img)}
                    className={`detail-modal-thumb ${activeImage === img ? 'active' : ''}`}
                  >
                    <img src={img} alt="" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="detail-modal-info">
            <div>
              <h2 className="detail-modal-title">{place.title}</h2>

              <div className="detail-modal-grid">
                <div className="detail-modal-grid-item">
                  <span className="label">Категория:</span>
                  <span>{place.category_name}</span>
                </div>
                <div className="detail-modal-grid-item">
                  <span className="label">Подкатегория:</span>
                  <span>{place.subcategory_name || 'Не указана'}</span>
                </div>
                <div className="detail-modal-grid-item">
                  <span className="label">Владелец:</span>
                  <span>{place.owner_name || 'Неизвестно'} {place.owner ? `#${place.owner}` : ''}</span>
                </div>
                <div className="detail-modal-grid-item">
                  <span className="label">Телефон:</span>
                  <span>{place.owner_phone || 'Не указан'}</span>
                </div>
                <div className="detail-modal-grid-item">
                  <span className="label">Email:</span>
                  <span>{place.owner_email || 'Не указан'}</span>
                </div>
                <div className="detail-modal-grid-item">
                  <span className="label">Адрес:</span>
                  <span>{place.location}</span>
                </div>
                <div className="detail-modal-grid-item">
                  <span className="label">Цена:</span>
                  <span>{place.price}</span>
                </div>
                <div className="detail-modal-grid-item">
                  <span className="label">Площадь:</span>
                  <span>{place.area} м²</span>
                </div>
                <div className="detail-modal-grid-item">
                  <span className="label">Вместимость:</span>
                  <span>{place.people} человек</span>
                </div>
              </div>

              <div className="detail-modal-amenities">
                <h4>Удобства и Оборудование</h4>
                <div className="detail-modal-tags">
                  {selectedAmenities.length === 0 ? (
                    <span style={{ color: "#94a3b8", fontSize: "12px" }}>Не указаны</span>
                  ) : (
                    selectedAmenities.map(a => (
                      <span key={a.slug} className="detail-modal-tag">
                        {a.label}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="detail-modal-section">
                <h4>Цены</h4>
                <div className="detail-modal-kv">
                  {priceDetails.map((row, index) => (
                    <div key={`${row.label}-${index}`}>
                      <span>{row.label}</span>
                      {row.value}
                    </div>
                  ))}
                </div>
              </div>

              <div className="detail-modal-section">
                <h4>Характеристики</h4>
                {characteristicRows.length === 0 ? (
                  <span style={{ color: "#94a3b8", fontSize: "12px" }}>Не указаны</span>
                ) : (
                  <div className="detail-modal-kv">
                    {characteristicRows.map(([key, value]) => (
                      <div key={key}>
                        <span>{key}</span>
                        {String(value)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {activeTab === 'pending' && (
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button
                  className="btn-approve"
                  onClick={() => { onApprove(place.id); onClose(); }}
                  style={{ flex: 1, padding: '12px 20px', fontSize: '14px' }}
                >
                  ✓ Одобрить
                </button>
                <button
                  className="btn-reject"
                  onClick={() => { onReject(place); onClose(); }}
                  style={{ flex: 1, padding: '12px 20px', fontSize: '14px' }}
                >
                  ✕ Отклонить
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="detail-modal-desc">
          <strong>Описание:</strong> {place.description_ru || place.description_uz || place.description_en || 'Описание отсутствует.'}
        </div>

        {moderationLogs.length > 0 && (
          <div className="detail-modal-section">
            <h4>История модерации</h4>
            <div className="detail-modal-kv">
              {moderationLogs.slice(0, 4).map((log) => (
                <div key={log.id}>
                  <span>{log.action} · {log.actor_name || 'system'}</span>
                  {log.from_status || '-'} → {log.to_status || '-'}
                  {log.note ? ` · ${log.note}` : ''}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ModerationPage() {
  const [activeTab, setActiveTab] = useState('pending');
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [detailTarget, setDetailTarget] = useState(null);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [allParameters, setAllParameters] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/api/parameters/")
      .then(res => setAllParameters(res.data?.results || res.data || []))
      .catch(err => console.log("Failed to load parameters:", err));
  }, []);

  const getHeaders = () => {
    const t = getAccessToken();
    return t ? { Authorization: `Bearer ${t}` } : {};
  };

  const fetchPlaces = async (status) => {
    setLoading(true);
    try {
      const res = await api.get(`/api/places/?status=${status}`, { headers: getHeaders() });
      setPlaces(res.data?.results || res.data || []);
      setError("");
    } catch (e) {
      setError(getApiErrorMessage(e, "Не удалось загрузить места для модерации"));
    }
    setLoading(false);
  };

  const fetchStats = async () => {
    try {
      const hdrs = getHeaders();
      const [p, a, r] = await Promise.all([
        api.get('/api/places/?status=pending', { headers: hdrs }),
        api.get('/api/places/?status=approved', { headers: hdrs }),
        api.get('/api/places/?status=rejected', { headers: hdrs }),
      ]);
      const count = d => (d.data?.count ?? (d.data?.results ?? d.data)?.length ?? 0);
      setStats({ pending: count(p), approved: count(a), rejected: count(r) });
    } catch (e) {}
  };

  useEffect(() => {
    fetchPlaces(activeTab);
    fetchStats();
  }, [activeTab]);

  const handleApprove = async (placeId) => {
    try {
      await api.post(`/api/places/${placeId}/approve/`, {}, { headers: getHeaders() });
      fetchPlaces(activeTab);
      fetchStats();
    } catch (e) {
      const errMsg = getApiErrorMessage(e, "Не удалось одобрить место");
      alert(`Ошибка при одобрении: ${errMsg}`);
    }
  };

  const handleReject = async (note) => {
    try {
      await api.post(`/api/places/${rejectTarget.id}/reject/`, { note }, { headers: getHeaders() });
      setRejectTarget(null);
      fetchPlaces(activeTab);
      fetchStats();
    } catch (e) {
      const errMsg = getApiErrorMessage(e, "Не удалось отклонить место");
      alert(`Ошибка при отклонении: ${errMsg}`);
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="mod-page">
        <div className="mod-header">
          <div>
            <h1 className="mod-title">Модерация мест</h1>
            <div className="mod-sub">Проверяйте и одобряйте места партнёров</div>
          </div>
          <div className="mod-tabs">
            {[
              { key: 'pending', label: 'На проверке', count: stats.pending },
              { key: 'approved', label: 'Одобрены', count: stats.approved },
              { key: 'rejected', label: 'Отклонены', count: stats.rejected },
            ].map(tab => (
              <button
                key={tab.key}
                className={`mod-tab ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
                {tab.count > 0 && <span className="badge">{tab.count}</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="stat-chips">
          <div className="stat-chip"><strong>{stats.pending}</strong>Ожидают</div>
          <div className="stat-chip"><strong>{stats.approved}</strong>Одобрено</div>
          <div className="stat-chip"><strong>{stats.rejected}</strong>Отклонено</div>
          <div className="stat-chip"><strong>{stats.pending + stats.approved + stats.rejected}</strong>Всего</div>
        </div>

        {error ? (
          <div style={{ margin: "0 0 16px", padding: "12px 14px", borderRadius: 10, background: "#fef2f2", color: "#991b1b", fontWeight: 700 }}>
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="mod-empty">Загрузка...</div>
        ) : places.length === 0 ? (
          <div className="mod-empty">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
              <rect x="9" y="3" width="6" height="4" rx="1"/>
            </svg>
            <div>Нет мест со статусом «{activeTab}»</div>
          </div>
        ) : (
          <div className="mod-list">
            {places.map(place => (
              <div key={place.id} data-testid={`moderation-place-${place.id}`} className="mod-card">
                <div className={`mod-card-status status-${place.status}`} />
                {place.images && place.images.length > 0 && (
                  <div className="mod-card-preview" onClick={() => setDetailTarget(place)} title="Посмотреть подробную информацию">
                    <img src={place.images[0]} alt={place.title} />
                    {place.images.length > 1 && (
                      <span className="mod-card-images-count">+{place.images.length - 1}</span>
                    )}
                  </div>
                )}
                <div className="mod-card-info">
                  <div className="mod-card-title" onClick={() => setDetailTarget(place)}>{place.title}</div>
                  <div className="mod-card-meta-grid">
                    <div className="meta-item"><span className="meta-label">Категория:</span><span className="meta-val">{place.category_name}</span></div>
                    <div className="meta-item"><span className="meta-label">Подкатегория:</span><span className="meta-val">{place.subcategory_name || 'Не указана'}</span></div>
                    <div className="meta-item"><span className="meta-label">Владелец:</span><span className="meta-val">{place.owner_name || 'Неизвестно'} {place.owner_phone ? `· ${place.owner_phone}` : ''}</span></div>
                    <div className="meta-item"><span className="meta-label">Адрес:</span><span className="meta-val">{place.location}</span></div>
                    <div className="meta-item"><span className="meta-label">Цена:</span><span className="meta-val">{getPriceDetails(place).map(row => row.value).join(' / ') || place.price}</span></div>
                    <div className="meta-item"><span className="meta-label">Площадь:</span><span className="meta-val">{place.area} м²</span></div>
                    <div className="meta-item"><span className="meta-label">Вместимость:</span><span className="meta-val">{place.people} чел.</span></div>
                    <div className="meta-item"><span className="meta-label">Фото:</span><span className="meta-val">{Array.isArray(place.images) ? place.images.length : 0}</span></div>
                    <div className="meta-item"><span className="meta-label">Удобства:</span><span className="meta-val">{Array.isArray(place.amenities) ? place.amenities.length : 0}</span></div>
                    <div className="meta-item"><span className="meta-label">Характеристики:</span><span className="meta-val">{getObjectEntries(place.characteristics).length}</span></div>
                  </div>
                  {place.moderator_note && (
                    <div className={`mod-card-note ${place.status}`}>
                      {place.status === 'rejected' ? '❌ ' : '✅ '}
                      {place.moderator_note}
                      {place.moderated_by_name && ` — ${place.moderated_by_name}`}
                    </div>
                  )}
                </div>
                {activeTab === 'pending' && (
                  <div className="mod-actions">
                    <button data-testid={`moderation-approve-${place.id}`} className="btn-approve" onClick={() => handleApprove(place.id)}>
                      ✓ Одобрить
                    </button>
                    <button className="btn-reject" onClick={() => setRejectTarget(place)}>
                      ✕ Отклонить
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {rejectTarget && (
          <RejectModal
            place={rejectTarget}
            onConfirm={handleReject}
            onCancel={() => setRejectTarget(null)}
          />
        )}

        {detailTarget && (
          <PlaceDetailModal
            place={detailTarget}
            onClose={() => setDetailTarget(null)}
            onApprove={handleApprove}
            onReject={setRejectTarget}
            activeTab={activeTab}
            allParameters={allParameters}
          />
        )}
      </div>
    </>
  );
}
