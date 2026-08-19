import React, { useState, useEffect } from "react";
import axios from "axios";

const styles = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

.tar-page { font-family: 'Inter', sans-serif; min-height: 100vh; }
.tar-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; flex-wrap: wrap; gap: 16px; }
.tar-title { font-size: 26px; font-weight: 800; color: #1a1a2e; margin: 0; }
.tar-sub { font-size: 14px; color: #64748b; margin-top: 4px; }
.btn-new {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 20px; border-radius: 10px; border: none;
  background: linear-gradient(135deg, #e46630 0%, #d05320 100%);
  color: #fff; font-weight: 700; font-size: 14px; cursor: pointer;
  box-shadow: 0 4px 12px rgba(228,102,48,0.3);
  transition: all 0.2s;
}
.btn-new:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(228,102,48,0.4); }

.tar-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }
.tar-card {
  background: #fff;
  border-radius: 20px;
  border: 2px solid #e2e8f0;
  overflow: hidden;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(0,0,0,0.04);
}
.tar-card:hover { border-color: #e46630; transform: translateY(-3px); box-shadow: 0 12px 30px rgba(0,0,0,0.08); }
.tar-card-header {
  padding: 20px 24px 16px;
  border-bottom: 1px solid #f1f5f9;
  display: flex; align-items: flex-start; justify-content: space-between;
}
.tar-slug-badge {
  font-size: 11px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.08em; padding: 4px 10px; border-radius: 20px;
  background: #f1f5f9; color: #64748b;
}
.tar-slug-badge.standard { background: #f0fdf4; color: #16a34a; }
.tar-slug-badge.comfort { background: #eff6ff; color: #2563eb; }
.tar-slug-badge.premium { background: #fdf4ff; color: #9333ea; }
.tar-card-name { font-size: 20px; font-weight: 800; color: #1a1a2e; margin: 8px 0 4px; }
.tar-card-price { font-size: 28px; font-weight: 900; color: #e46630; }
.tar-card-price span { font-size: 14px; font-weight: 500; color: #94a3b8; }
.tar-card-body { padding: 16px 24px; }
.tar-card-limit {
  display: flex; align-items: center; gap: 8px;
  font-size: 14px; font-weight: 600; color: #1a1a2e;
  margin-bottom: 12px;
}
.tar-card-limit strong { font-size: 22px; color: #e46630; }
.tar-features { list-style: none; padding: 0; margin: 0 0 20px; display: flex; flex-direction: column; gap: 8px; }
.tar-features li { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #475569; }
.tar-features li::before { content: "✓"; color: #10b981; font-weight: 700; flex-shrink: 0; }
.tar-card-footer {
  padding: 16px 24px;
  border-top: 1px solid #f1f5f9;
  display: flex; gap: 8px;
}
.btn-edit {
  flex: 1; padding: 9px 16px; border-radius: 8px; border: 1.5px solid #e2e8f0;
  background: none; color: #475569; font-weight: 600; font-size: 13px; cursor: pointer;
  transition: all 0.2s;
}
.btn-edit:hover { border-color: #e46630; color: #e46630; }
.btn-toggle {
  padding: 9px 16px; border-radius: 8px; border: none; font-weight: 600; font-size: 13px; cursor: pointer;
  transition: all 0.2s;
}
.btn-toggle.active { background: #fef2f2; color: #ef4444; }
.btn-toggle.inactive { background: #f0fdf4; color: #16a34a; }

/* Modal */
.tar-modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center; z-index: 9999;
}
.tar-modal {
  background: #fff; border-radius: 24px; padding: 32px;
  width: 540px; max-width: 95vw; max-height: 90vh; overflow-y: auto;
  box-shadow: 0 30px 60px rgba(0,0,0,0.15);
}
.tar-modal h3 { font-size: 20px; font-weight: 800; color: #1a1a2e; margin: 0 0 24px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group.full { grid-column: 1 / -1; }
.form-label { font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em; }
.form-input {
  padding: 10px 14px; border: 1.5px solid #e2e8f0; border-radius: 10px;
  font-size: 14px; font-family: inherit; outline: none; transition: border-color 0.2s;
}
.form-input:focus { border-color: #e46630; }
.form-textarea { min-height: 80px; resize: vertical; }
.form-checkbox { display: flex; align-items: center; gap: 8px; font-size: 14px; color: #475569; }
.form-checkbox input { width: 16px; height: 16px; accent-color: #e46630; }
.form-features {
  display: flex; flex-direction: column; gap: 8px;
}
.form-feature-row { display: flex; gap: 8px; align-items: center; }
.form-feature-row input { flex: 1; }
.btn-del-feat {
  width: 30px; height: 30px; border-radius: 6px; border: none;
  background: #fef2f2; color: #ef4444; cursor: pointer; font-size: 16px;
  display: flex; align-items: center; justify-content: center;
}
.btn-add-feat {
  padding: 7px 14px; border-radius: 8px; border: 1px dashed #e46630;
  background: rgba(228,102,48,0.06); color: #e46630; font-weight: 600;
  font-size: 13px; cursor: pointer; align-self: flex-start;
}
.modal-btns { display: flex; gap: 10px; margin-top: 24px; justify-content: flex-end; }
.btn-cancel-modal {
  padding: 10px 22px; border-radius: 10px; border: 1px solid #e2e8f0;
  background: none; color: #64748b; font-weight: 600; cursor: pointer;
}
.btn-save-modal {
  padding: 10px 24px; border-radius: 10px; border: none;
  background: linear-gradient(135deg, #e46630 0%, #d05320 100%);
  color: #fff; font-weight: 700; cursor: pointer;
  box-shadow: 0 4px 12px rgba(228,102,48,0.3);
}

/* Subscriptions */
.subs-section { margin-top: 40px; }
.subs-title { font-size: 18px; font-weight: 700; color: #1a1a2e; margin-bottom: 16px; }
.subs-table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.04); }
.subs-table th { text-align: left; padding: 12px 16px; background: #f8fafc; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 1px solid #e2e8f0; }
.subs-table td { padding: 14px 16px; font-size: 14px; color: #1a1a2e; border-bottom: 1px solid #f1f5f9; }
.subs-table tr:last-child td { border-bottom: none; }
.sub-status { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; }
.sub-status.pending { background: #fef9c3; color: #a16207; }
.sub-status.active { background: #f0fdf4; color: #16a34a; }
.sub-status.expired { background: #f1f5f9; color: #64748b; }
.btn-activate {
  padding: 6px 14px; border-radius: 7px; border: none;
  background: #f0fdf4; color: #16a34a; font-weight: 700; font-size: 12px; cursor: pointer;
  border: 1px solid #bbf7d0; transition: all 0.2s;
}
.modal-tab-btn.active {
  background: rgba(228, 102, 48, 0.1);
  color: #e46630;
}
.modal-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  border-bottom: 2px solid #e2e8f0;
  padding-bottom: 8px;
  grid-column: 1 / -1;
}
.modal-tab-btn {
  padding: 6px 16px;
  border-radius: 6px;
  border: none;
  background: none;
  color: #64748b;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}
`;

function TariffModal({ tariff, onSave, onClose }) {
  const [form, setForm] = useState(() => {
    const base = tariff || {};
    return {
      slug: base.slug || 'comfort',
      name: base.name || '',
      name_ru: base.name_ru || '',
      name_en: base.name_en || '',
      description: base.description || '',
      description_ru: base.description_ru || '',
      description_en: base.description_en || '',
      price: base.price || 0,
      duration_days: base.duration_days || 30,
      max_places: base.max_places || 1,
      is_free: base.is_free || false,
      is_active: base.is_active !== undefined ? base.is_active : true,
      features: base.features || [''],
      features_ru: base.features_ru || [''],
      features_en: base.features_en || [''],
      sort_order: base.sort_order || 10,
    };
  });

  const [langTab, setLangTab] = useState('uz'); // 'uz', 'ru', 'en'

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  
  const setFeature = (lang, i, v) => {
    const key = lang === 'uz' ? 'features' : lang === 'ru' ? 'features_ru' : 'features_en';
    const arr = [...(form[key] || [])];
    arr[i] = v;
    set(key, arr);
  };

  const addFeature = (lang) => {
    const key = lang === 'uz' ? 'features' : lang === 'ru' ? 'features_ru' : 'features_en';
    set(key, [...(form[key] || []), '']);
  };

  const removeFeature = (lang, i) => {
    const key = lang === 'uz' ? 'features' : lang === 'ru' ? 'features_ru' : 'features_en';
    const arr = (form[key] || []).filter((_, j) => j !== i);
    set(key, arr);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...form,
      is_free: form.price === 0
    });
  };

  return (
    <div className="tar-modal-overlay">
      <div className="tar-modal">
        <h3>{tariff ? '✏️ Редактировать тариф' : '➕ Новый тариф'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Slug</label>
              <select className="form-input" value={form.slug} onChange={e => set('slug', e.target.value)}>
                <option value="standard">standard</option>
                <option value="comfort">comfort</option>
                <option value="premium">premium</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Порядок показа</label>
              <input className="form-input" type="number" value={form.sort_order} onChange={e => set('sort_order', +e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Цена (сум)</label>
              <input className="form-input" type="number" value={form.price} onChange={e => set('price', +e.target.value)} min={0} />
            </div>
            <div className="form-group">
              <label className="form-label">Длительность (дней)</label>
              <input className="form-input" type="number" value={form.duration_days} onChange={e => set('duration_days', +e.target.value)} min={1} />
            </div>
            <div className="form-group">
              <label className="form-label">Максимум мест</label>
              <input className="form-input" type="number" value={form.max_places} onChange={e => set('max_places', +e.target.value)} min={1} />
            </div>
            <div className="form-group" style={{ justifyContent: 'center' }}>
              <label className="form-checkbox">
                <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} />
                Активен
              </label>
            </div>

            {/* Translation Tabs */}
            <div className="modal-tabs">
              <button type="button" className={`modal-tab-btn ${langTab === 'uz' ? 'active' : ''}`} onClick={() => setLangTab('uz')}>Uzbek (UZ)</button>
              <button type="button" className={`modal-tab-btn ${langTab === 'ru' ? 'active' : ''}`} onClick={() => setLangTab('ru')}>Русский (RU)</button>
              <button type="button" className={`modal-tab-btn ${langTab === 'en' ? 'active' : ''}`} onClick={() => setLangTab('en')}>English (EN)</button>
            </div>

            {langTab === 'uz' && (
              <>
                <div className="form-group full">
                  <label className="form-label">Название (UZ)</label>
                  <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} required />
                </div>
                <div className="form-group full">
                  <label className="form-label">Описание (UZ)</label>
                  <textarea className="form-input form-textarea" value={form.description} onChange={e => set('description', e.target.value)} />
                </div>
                <div className="form-group full">
                  <label className="form-label">Возможности (UZ)</label>
                  <div className="form-features">
                    {(form.features || []).map((f, i) => (
                      <div key={i} className="form-feature-row">
                        <input className="form-input" value={f} onChange={e => setFeature('uz', i, e.target.value)} placeholder={`Возможность ${i + 1}`} />
                        <button type="button" className="btn-del-feat" onClick={() => removeFeature('uz', i)}>✕</button>
                      </div>
                    ))}
                    <button type="button" className="btn-add-feat" onClick={() => addFeature('uz')}>+ Добавить пункт</button>
                  </div>
                </div>
              </>
            )}

            {langTab === 'ru' && (
              <>
                <div className="form-group full">
                  <label className="form-label">Название (RU)</label>
                  <input className="form-input" value={form.name_ru} onChange={e => set('name_ru', e.target.value)} />
                </div>
                <div className="form-group full">
                  <label className="form-label">Описание (RU)</label>
                  <textarea className="form-input form-textarea" value={form.description_ru} onChange={e => set('description_ru', e.target.value)} />
                </div>
                <div className="form-group full">
                  <label className="form-label">Возможности (RU)</label>
                  <div className="form-features">
                    {(form.features_ru || []).map((f, i) => (
                      <div key={i} className="form-feature-row">
                        <input className="form-input" value={f} onChange={e => setFeature('ru', i, e.target.value)} placeholder={`Возможность ${i + 1}`} />
                        <button type="button" className="btn-del-feat" onClick={() => removeFeature('ru', i)}>✕</button>
                      </div>
                    ))}
                    <button type="button" className="btn-add-feat" onClick={() => addFeature('ru')}>+ Добавить пункт</button>
                  </div>
                </div>
              </>
            )}

            {langTab === 'en' && (
              <>
                <div className="form-group full">
                  <label className="form-label">Название (EN)</label>
                  <input className="form-input" value={form.name_en} onChange={e => set('name_en', e.target.value)} />
                </div>
                <div className="form-group full">
                  <label className="form-label">Описание (EN)</label>
                  <textarea className="form-input form-textarea" value={form.description_en} onChange={e => set('description_en', e.target.value)} />
                </div>
                <div className="form-group full">
                  <label className="form-label">Возможности (EN)</label>
                  <div className="form-features">
                    {(form.features_en || []).map((f, i) => (
                      <div key={i} className="form-feature-row">
                        <input className="form-input" value={f} onChange={e => setFeature('en', i, e.target.value)} placeholder={`Возможность ${i + 1}`} />
                        <button type="button" className="btn-del-feat" onClick={() => removeFeature('en', i)}>✕</button>
                      </div>
                    ))}
                    <button type="button" className="btn-add-feat" onClick={() => addFeature('en')}>+ Добавить пункт</button>
                  </div>
                </div>
              </>
            )}

          </div>
          <div className="modal-btns">
            <button type="button" className="btn-cancel-modal" onClick={onClose}>Отмена</button>
            <button type="submit" className="btn-save-modal">💾 Сохранить</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TariffsPage() {
  const [tariffs, setTariffs] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const token = localStorage.getItem('joyzone-access');
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchTariffs = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:8000/api/tariffs/');
      setTariffs(res.data?.results || res.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const fetchSubscriptions = async () => {
    try {
      const res = await axios.get('http://localhost:8000/api/tariffs/admin/subscriptions/?status=pending', { headers });
      setSubscriptions(res.data?.results || res.data || []);
    } catch (e) {}
  };

  useEffect(() => {
    fetchTariffs();
    fetchSubscriptions();
  }, []);

  const handleSave = async (form) => {
    try {
      if (editTarget?.id) {
        await axios.put(`http://localhost:8000/api/tariffs/${editTarget.id}/`, form, { headers });
      } else {
        await axios.post('http://localhost:8000/api/tariffs/create/', form, { headers });
      }
      setModalOpen(false);
      setEditTarget(null);
      fetchTariffs();
    } catch (e) {
      console.error(e);
      const detail = e.response?.data?.detail || (e.response?.data ? JSON.stringify(e.response.data) : e.message);
      alert(`Error saving tariff: ${detail}`);
    }
  };

  const handleToggle = async (tariff) => {
    try {
      await axios.patch(`http://localhost:8000/api/tariffs/${tariff.id}/`, { is_active: !tariff.is_active }, { headers });
      fetchTariffs();
    } catch (e) { alert('Error updating tariff'); }
  };

  const handleActivateSub = async (subId) => {
    try {
      await axios.post(`http://localhost:8000/api/tariffs/admin/subscriptions/${subId}/activate/`, {}, { headers });
      fetchSubscriptions();
    } catch (e) { alert('Error activating subscription'); }
  };

  const formatPrice = (price) => {
    if (!price || price == 0) return 'Бесплатно';
    return new Intl.NumberFormat('ru-RU').format(price) + ' сум / мес';
  };

  return (
    <>
      <style>{styles}</style>
      <div className="tar-page">
        <div className="tar-header">
          <div>
            <h1 className="tar-title">Управление тарифами</h1>
            <div className="tar-sub">Настройка планов подписки для партнёров</div>
          </div>
          <button className="btn-new" onClick={() => { setEditTarget(null); setModalOpen(true); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
            Новый тариф
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Загрузка...</div>
        ) : (
          <div className="tar-grid">
            {tariffs.map(t => (
              <div key={t.id} className={`tar-card ${!t.is_active ? 'opacity-50' : ''}`} style={{ opacity: t.is_active ? 1 : 0.5 }}>
                <div className="tar-card-header">
                  <div>
                    <div className={`tar-slug-badge ${t.slug}`}>{t.slug}</div>
                    <div className="tar-card-name">{t.name_ru || t.name}</div>
                    <div className="tar-card-price">
                      {t.is_free ? 'Бесплатно' : <>{new Intl.NumberFormat('ru-RU').format(t.price)}<span> сум/мес</span></>}
                    </div>
                  </div>
                </div>
                <div className="tar-card-body">
                  <div className="tar-card-limit">
                    <strong>{t.max_places}</strong> {t.max_places === 1 ? 'место' : t.max_places < 5 ? 'места' : 'мест'}
                  </div>
                  {t.features?.length > 0 && (
                    <ul className="tar-features">
                      {t.features.map((f, i) => <li key={i}>{f}</li>)}
                    </ul>
                  )}
                </div>
                <div className="tar-card-footer">
                  <button className="btn-edit" onClick={() => { setEditTarget(t); setModalOpen(true); }}>
                    ✏️ Редактировать
                  </button>
                  <button
                    className={`btn-toggle ${t.is_active ? 'active' : 'inactive'}`}
                    onClick={() => handleToggle(t)}
                  >
                    {t.is_active ? 'Отключить' : 'Включить'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pending subscriptions */}
        {subscriptions.length > 0 && (
          <div className="subs-section">
            <div className="subs-title">⏳ Ожидают активации ({subscriptions.length})</div>
            <table className="subs-table">
              <thead>
                <tr>
                  <th>Партнёр</th>
                  <th>Тариф</th>
                  <th>Статус</th>
                  <th>Дата</th>
                  <th>Действие</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map(sub => (
                  <tr key={sub.id}>
                    <td>
                      <strong>{sub.partner_name}</strong>
                      <div style={{ fontSize: 12, color: '#94a3b8' }}>{sub.partner_phone}</div>
                    </td>
                    <td>{sub.tariff_name}</td>
                    <td>
                      <span className={`sub-status ${sub.status}`}>{sub.status}</span>
                    </td>
                    <td style={{ fontSize: 12, color: '#94a3b8' }}>
                      {new Date(sub.created_at).toLocaleDateString('ru-RU')}
                    </td>
                    <td>
                      <button className="btn-activate" onClick={() => handleActivateSub(sub.id)}>
                        ✓ Активировать
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {modalOpen && (
          <TariffModal
            tariff={editTarget}
            onSave={handleSave}
            onClose={() => { setModalOpen(false); setEditTarget(null); }}
          />
        )}
      </div>
    </>
  );
}
