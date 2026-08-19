import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";

const API = "http://localhost:8000/api";
const getHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("joyzone-access")}`
});

function IconPlus() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
}
function IconEdit() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>;
}
function IconTrash() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;
}
function IconChevron({ open }) {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: '0.2s' }}><polyline points="6 9 12 15 18 9"></polyline></svg>;
}

// ─── MODAL WRAPPER ──────────────────────────────────────────────────────────
function Modal({ children, title, onClose }) {
  return (
    <div className="param-modal-overlay" onClick={onClose}>
      <div className="param-modal-content" onClick={e => e.stopPropagation()}>
        <div className="param-modal-header">
          <h3 className="param-modal-title">{title}</h3>
          <button className="param-modal-close" onClick={onClose}>×</button>
        </div>
        <div>
          {children}
        </div>
      </div>
    </div>
  );
}

function FormField({ label, hint, children }) {
  return (
    <div className="param-form-field">
      <label className="param-form-label">
        {label}
        {hint && <span className="param-form-hint">({hint})</span>}
      </label>
      {children}
    </div>
  );
}

// ─── PARAMETER GROUP MODAL ────────────────────────────────────────────────────
function GroupModal({ initial, onSave, onClose }) {
  const isEdit = !!initial?.id;
  const [form, setForm] = useState({
    slug: initial?.slug || "",
    name_uz: initial?.name_uz || "",
    name_ru: initial?.name_ru || "",
    name_en: initial?.name_en || "",
    order: initial?.order ?? 0,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name_ru.trim() || !form.slug.trim()) return setErr("Название и slug обязательны");
    setSaving(true);
    try {
      if (isEdit) {
        await axios.put(`${API}/parameter-groups/${initial.id}/`, form, { headers: getHeaders() });
      } else {
        await axios.post(`${API}/parameter-groups/`, form, { headers: getHeaders() });
      }
      onSave();
      onClose();
    } catch (e) {
      setErr(e.response?.data?.detail || JSON.stringify(e.response?.data) || "Ошибка при сохранении");
    }
    setSaving(false);
  };

  return (
    <Modal title={isEdit ? "Редактировать группу" : "Новая группа параметров"} onClose={onClose}>
      <FormField label="Slug (URL ID)" hint="Только латинские буквы и дефисы">
        <input className="param-input" value={form.slug} onChange={e => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="amenities" />
      </FormField>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <FormField label="Название UZ">
          <input className="param-input" value={form.name_uz} onChange={e => set("name_uz", e.target.value)} placeholder="Qulayliklar" />
        </FormField>
        <FormField label="Название RU">
          <input className="param-input" value={form.name_ru} onChange={e => set("name_ru", e.target.value)} placeholder="Удобства" />
        </FormField>
        <FormField label="Название EN">
          <input className="param-input" value={form.name_en} onChange={e => set("name_en", e.target.value)} placeholder="Amenities" />
        </FormField>
      </div>
      <FormField label="Порядок отображения">
        <input type="number" className="param-input" value={form.order} onChange={e => set("order", +e.target.value)} min={0} />
      </FormField>

      {err && <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 12 }}>{err}</p>}

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 24 }}>
        <button onClick={onClose} className="param-btn-cancel">Отмена</button>
        <button onClick={handleSubmit} disabled={saving} className="param-btn-submit">
          {saving ? "Сохраняем..." : isEdit ? "Сохранить" : "Создать"}
        </button>
      </div>
    </Modal>
  );
}

// ─── PARAMETER MODAL ────────────────────────────────────────────────────────
function ParameterModal({ initial, groupId, groupName, onSave, onClose }) {
  const isEdit = !!initial?.id;
  const [form, setForm] = useState({
    slug: initial?.slug || "",
    name_uz: initial?.name_uz || "",
    name_ru: initial?.name_ru || "",
    name_en: initial?.name_en || "",
    type: initial?.type || "boolean",
    icon: initial?.icon || "",
    group: groupId,
    order: initial?.order ?? 0,
    config: initial?.config || {},
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const setConfig = (k, v) => setForm(p => ({ ...p, config: { ...p.config, [k]: v } }));

  const handleSubmit = async () => {
    if (!form.name_ru.trim() || !form.slug.trim()) return setErr("Название и slug обязательны");
    setSaving(true);
    try {
      if (isEdit) {
        await axios.put(`${API}/parameters/${initial.id}/`, form, { headers: getHeaders() });
      } else {
        await axios.post(`${API}/parameters/`, form, { headers: getHeaders() });
      }
      onSave();
      onClose();
    } catch (e) {
      setErr(e.response?.data?.detail || JSON.stringify(e.response?.data) || "Ошибка при сохранении");
    }
    setSaving(false);
  };

  const handleAddOption = () => {
    const opts = Array.isArray(form.config.options) ? form.config.options : [];
    setConfig("options", [...opts, { slug: "", uz: "", ru: "", en: "" }]);
  };

  const updateOption = (index, key, val) => {
    const opts = [...(form.config.options || [])];
    opts[index][key] = val;
    setConfig("options", opts);
  };

  const removeOption = (index) => {
    const opts = [...(form.config.options || [])];
    opts.splice(index, 1);
    setConfig("options", opts);
  };

  return (
    <Modal title={isEdit ? "Редактировать параметр" : `Новый параметр → ${groupName}`} onClose={onClose}>
      <div style={{ marginBottom: "16px", padding: "16px", background: "#f8fafc", borderRadius: "14px", border: "1.5px solid #e2e8f0" }}>
        <FormField label="Тип поля">
          <select className="param-input" value={form.type} onChange={e => set("type", e.target.value)} style={{ background: "#fff", borderColor: "#cbd5e1" }}>
            <option value="boolean">Галочка (Да/Нет) - Одиночная</option>
            <option value="counter">Счетчик (Число)</option>
            <option value="select">Выпадающий список (С вариантами)</option>
          </select>
        </FormField>
        
        {form.type === "counter" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12, marginTop: 16 }}>
            <FormField label="Диапазоны значений">
              <select className="param-input" style={{ background: "#fff" }} value={form.config.scale || ""} onChange={e => {
                const scale = e.target.value;
                let opts = [];
                if (scale === "small") {
                  opts = [
                    { slug: "1-5", uz: "1 - 5", ru: "1 - 5", en: "1 - 5" },
                    { slug: "5-10", uz: "5 - 10", ru: "5 - 10", en: "5 - 10" },
                    { slug: "10-20", uz: "10 - 20", ru: "10 - 20", en: "10 - 20" },
                    { slug: "20-50", uz: "20 - 50", ru: "20 - 50", en: "20 - 50" },
                    { slug: "50-plus", uz: "50+", ru: "50+", en: "50+" }
                  ];
                } else if (scale === "medium") {
                  opts = [
                    { slug: "up-to-10", uz: "10 gacha", ru: "До 10", en: "Up to 10" },
                    { slug: "10-25", uz: "10 - 25", ru: "10 - 25", en: "10 - 25" },
                    { slug: "25-50", uz: "25 - 50", ru: "25 - 50", en: "25 - 50" },
                    { slug: "50-100", uz: "50 - 100", ru: "50 - 100", en: "50 - 100" },
                    { slug: "100-plus", uz: "100+", ru: "100+", en: "100+" }
                  ];
                } else if (scale === "large") {
                  opts = [
                    { slug: "up-to-50", uz: "50 gacha", ru: "До 50", en: "Up to 50" },
                    { slug: "50-100", uz: "50 - 100", ru: "50 - 100", en: "50 - 100" },
                    { slug: "100-500", uz: "100 - 500", ru: "100 - 500", en: "100 - 500" },
                    { slug: "500-1000", uz: "500 - 1000", ru: "500 - 1000", en: "500 - 1000" },
                    { slug: "1000-plus", uz: "1000+", ru: "1000+", en: "1000+" }
                  ];
                }
                setForm(prev => ({ ...prev, config: { ...prev.config, scale, options: opts } }));
              }}>
                <option value="" disabled>Выберите диапазоны...</option>
                <option value="small">Мелкие (1-5, 5-10, 10-20, 20-50, 50+)</option>
                <option value="medium">Средние (До 10, 10-25, 25-50, 50-100, 100+)</option>
                <option value="large">Крупные (До 50, 50-100, 100-500, 1000+)</option>
              </select>
            </FormField>
          </div>
        )}

        {form.type === "select" && (
          <div style={{ marginTop: 16 }}>
            <label className="param-form-label">Варианты списка (Опции)</label>
            {(Array.isArray(form.config.options) ? form.config.options : []).map((opt, i) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
                <input className="param-input" style={{ flex: 0.8, background: "#fff", padding: "0 10px" }} placeholder="Slug (id)" value={opt.slug} onChange={e => updateOption(i, "slug", e.target.value.replace(/[^a-z0-9-]/g, ""))} />
                <input className="param-input" style={{ flex: 1, background: "#fff", padding: "0 10px" }} placeholder="UZ" value={opt.uz} onChange={e => updateOption(i, "uz", e.target.value)} />
                <input className="param-input" style={{ flex: 1, background: "#fff", padding: "0 10px" }} placeholder="RU" value={opt.ru} onChange={e => updateOption(i, "ru", e.target.value)} />
                <input className="param-input" style={{ flex: 1, background: "#fff", padding: "0 10px" }} placeholder="EN" value={opt.en} onChange={e => updateOption(i, "en", e.target.value)} />
                <button onClick={() => removeOption(i)} style={{ padding: "0 12px", height: "44px", borderRadius: "10px", border: "1.5px solid #fecaca", background: "#fef2f2", color: "#ef4444", cursor: "pointer", fontWeight: 800 }}>✕</button>
              </div>
            ))}
            <button onClick={handleAddOption} style={{ marginTop: 8, padding: "8px 16px", borderRadius: "10px", border: "1.5px dashed #cbd5e1", background: "none", color: "#64748b", fontWeight: 700, cursor: "pointer", width: "100%", transition: "all 0.2s" }} onMouseOver={e => e.target.style.background="#f1f5f9"} onMouseOut={e => e.target.style.background="none"}>
              + Добавить вариант
            </button>
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <FormField label="Slug (URL ID параметра)" hint="Только латинские буквы и дефисы">
          <input className="param-input" value={form.slug} onChange={e => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="wifi" />
        </FormField>
        <FormField label="Порядок отображения">
          <input type="number" className="param-input" value={form.order} onChange={e => set("order", +e.target.value)} min={0} />
        </FormField>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <FormField label="Название UZ">
          <input className="param-input" value={form.name_uz} onChange={e => set("name_uz", e.target.value)} placeholder="Wi-Fi" />
        </FormField>
        <FormField label="Название RU">
          <input className="param-input" value={form.name_ru} onChange={e => set("name_ru", e.target.value)} placeholder="Wi-Fi" />
        </FormField>
        <FormField label="Название EN">
          <input className="param-input" value={form.name_en} onChange={e => set("name_en", e.target.value)} placeholder="Wi-Fi" />
        </FormField>
      </div>

      {err && <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 12 }}>{err}</p>}

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 24 }}>
        <button onClick={onClose} className="param-btn-cancel">Отмена</button>
        <button onClick={handleSubmit} disabled={saving} className="param-btn-submit alt">
          {saving ? "Сохраняем..." : isEdit ? "Сохранить" : "Создать"}
        </button>
      </div>
    </Modal>
  );
}

// ─── PARAMETER GROUP CARD ───────────────────────────────────────────────────
function GroupCard({ group, onEdit, onDelete, onRefresh }) {
  const [expanded, setExpanded] = useState(true);
  const [paramModal, setParamModal] = useState(null);

  const COLORS = ["#294a6d", "#e46630", "#1a6b6b", "#5b3a8c", "#1f78d1"];
  const colorIdx = (group.order) % COLORS.length;

  return (
    <div className="param-group-card">
      <div className="param-group-header" style={{ background: `linear-gradient(135deg, ${COLORS[colorIdx]}08, transparent)` }}>
        <div className="param-group-icon" style={{ background: COLORS[colorIdx] }}>
          {group.name_ru.charAt(0)}
        </div>
        <div className="param-group-info">
          <h3 className="param-group-title">
            {group.name_ru}
            <span className="param-group-slug">/{group.slug}</span>
          </h3>
          <p className="param-group-stats">
            Элементов: <strong>{group.parameters?.length || 0}</strong> · Порядок: <strong>#{group.order}</strong>
          </p>
        </div>
        <div className="param-group-actions">
          <button onClick={() => onEdit(group)} className="param-btn-action">
            <IconEdit /> Изменить
          </button>
          <button onClick={() => onDelete(group)} className="param-btn-danger">
            <IconTrash /> Удалить
          </button>
          <button onClick={() => setExpanded(e => !e)} className="param-btn-action" style={{ padding: "7px 10px", background: "#f8fafc" }}>
            <IconChevron open={expanded} />
          </button>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: "12px 24px 20px" }}>
          <div className="param-item-grid">
            {(group.parameters || []).map(param => (
              <div key={param.id} className="param-item-card">
                <div>
                  <h4 className="param-item-title">
                    {param.icon && <span>{param.icon}</span>}
                    {param.name_ru}
                  </h4>
                  <p className="param-item-meta">/{param.slug} · #{param.order}</p>
                  <span className="param-item-type">{param.type}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <button onClick={() => setParamModal(param)} className="param-btn-small">Изменить</button>
                  <button onClick={async () => {
                    if (!window.confirm(`Удалить параметр «${param.name_ru}»?`)) return;
                    try { await axios.delete(`${API}/parameters/${param.id}/`, { headers: getHeaders() }); onRefresh(); }
                    catch (e) { alert("Ошибка удаления: " + (e.response?.data?.detail || e.message)); }
                  }} className="param-btn-small-danger">Удалить</button>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => setParamModal("create")} className="param-btn-add">
            <IconPlus /> Добавить параметр
          </button>
        </div>
      )}

      {paramModal && (
        <ParameterModal
          initial={paramModal === "create" ? null : paramModal}
          groupId={group.id}
          groupName={group.name_ru}
          onSave={onRefresh}
          onClose={() => setParamModal(null)}
        />
      )}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function ParametersPage() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [groupModal, setGroupModal] = useState(null);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/parameter-groups/`, { headers: getHeaders() });
      setGroups((res.data?.results || res.data || []).filter(g => !g.slug.startsWith("amenit")));
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  const handleDelete = async (group) => {
    if (!window.confirm(`Удалить группу «${group.name_ru}» и ВСЕ её параметры?`)) return;
    try {
      await axios.delete(`${API}/parameter-groups/${group.id}/`, { headers: getHeaders() });
      fetchGroups();
    } catch (e) {
      alert("Ошибка удаления: " + (e.response?.data?.detail || e.message));
    }
  };

  const total = groups.reduce((acc, g) => acc + (g.parameters?.length || 0), 0);

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: "0 0 2px", fontSize: 24, fontWeight: 800, color: "#1a1a2e" }}>Удобства и параметры</h2>
          <p style={{ margin: "0 0 2px", fontSize: 13, color: "#64748b" }}>Создавайте группы удобств, правил и характеристик (счетчиков)</p>
          <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
            {[
              { label: "Групп", val: groups.length },
              { label: "Элементов", val: total },
            ].map(s => (
              <div key={s.label} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "12px 20px" }}>
                <strong style={{ display: "block", fontSize: 22, fontWeight: 800, color: "#1a1a2e" }}>{s.val}</strong>
                <span style={{ fontSize: 13, color: "#64748b" }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
        <button onClick={() => setGroupModal("create")} className="param-btn-submit" style={{ display: "flex", gap: 8 }}>
          <IconPlus /> Новая группа
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>Загрузка...</div>
      ) : groups.length === 0 ? (
        <div style={{ textAlign: "center", padding: 80, color: "#94a3b8" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>⚙️</div>
          <p style={{ fontWeight: 700, fontSize: 16 }}>Нет групп параметров</p>
          <p style={{ fontSize: 14 }}>Создайте первую группу, например «Удобства» или «Правила»</p>
        </div>
      ) : (
        groups.map(group => (
          <GroupCard
            key={group.id}
            group={group}
            onEdit={g => setGroupModal(g)}
            onDelete={handleDelete}
            onRefresh={fetchGroups}
          />
        ))
      )}

      {groupModal && (
        <GroupModal
          initial={groupModal === "create" ? null : groupModal}
          onSave={fetchGroups}
          onClose={() => setGroupModal(null)}
        />
      )}
    </div>
  );
}
