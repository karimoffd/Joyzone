import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";

const API = "http://localhost:8000/api";

const getHeaders = () => {
  const token = localStorage.getItem("joyzone-access");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ─── ICONS ────────────────────────────────────────────────────────────────────
const IconPlus = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const IconEdit = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const IconTrash = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
  </svg>
);
const IconChevron = ({ open }) => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24"
    style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

// ─── MODAL ────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
    }} onClick={onClose}>
      <div style={{
        background: "#fff", borderRadius: 20, padding: "28px 32px", width: 520, maxWidth: "95vw",
        maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 80px rgba(0,0,0,0.18)"
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#1a1a2e" }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#94a3b8", lineHeight: 1 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormField({ label, children, hint }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{label}</label>
      {children}
      {hint && <p style={{ fontSize: 11, color: "#94a3b8", margin: "4px 0 0" }}>{hint}</p>}
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0",
  fontSize: 14, outline: "none", fontFamily: "Inter, sans-serif", boxSizing: "border-box",
  transition: "border-color 0.2s", background: "#f8fafc"
};

// ─── CATEGORY MODAL ───────────────────────────────────────────────────────────
function CategoryModal({ initial, onSave, onClose }) {
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
        await axios.put(`${API}/categories/${initial.id}/`, form, { headers: getHeaders() });
      } else {
        await axios.post(`${API}/categories/`, form, { headers: getHeaders() });
      }
      onSave();
      onClose();
    } catch (e) {
      setErr(e.response?.data?.detail || JSON.stringify(e.response?.data) || "Ошибка при сохранении");
    }
    setSaving(false);
  };

  return (
    <Modal title={isEdit ? "Редактировать категорию" : "Новая категория"} onClose={onClose}>
      <FormField label="Slug (URL ID)" hint="Только латинские буквы и дефисы, например: ofis">
        <input style={inputStyle} value={form.slug} onChange={e => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="ofis" />
      </FormField>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <FormField label="Название UZ">
          <input style={inputStyle} value={form.name_uz} onChange={e => set("name_uz", e.target.value)} placeholder="Ofis" />
        </FormField>
        <FormField label="Название RU">
          <input style={inputStyle} value={form.name_ru} onChange={e => set("name_ru", e.target.value)} placeholder="Офис" />
        </FormField>
        <FormField label="Название EN">
          <input style={inputStyle} value={form.name_en} onChange={e => set("name_en", e.target.value)} placeholder="Office" />
        </FormField>
      </div>
      <FormField label="Порядок отображения">
        <input type="number" style={inputStyle} value={form.order} onChange={e => set("order", +e.target.value)} min={0} />
      </FormField>

      {err && <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 12 }}>{err}</p>}

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
        <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "none", cursor: "pointer", fontWeight: 600, color: "#64748b" }}>Отмена</button>
        <button onClick={handleSubmit} disabled={saving} style={{ padding: "10px 22px", borderRadius: 10, border: "none", background: "#e46630", color: "#fff", fontWeight: 700, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
          {saving ? "Сохраняем..." : isEdit ? "Сохранить" : "Создать"}
        </button>
      </div>
    </Modal>
  );
}
// ─── SUBCATEGORY MODAL ────────────────────────────────────────────────────────
function SubCategoryModal({ initial, categoryId, categoryName, onSave, onClose }) {
  const isEdit = !!initial?.id;
  const [form, setForm] = useState({
    slug: initial?.slug || "",
    name_uz: initial?.name_uz || "",
    name_ru: initial?.name_ru || "",
    name_en: initial?.name_en || "",
    category: categoryId,
    order: initial?.order ?? 0,
    parameters: initial?.parameters?.map(p => p.id) || [],
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  const [parameterGroups, setParameterGroups] = useState([]);

  useEffect(() => {
    axios.get(`${API}/parameter-groups/`).then(res => setParameterGroups(res.data.results || res.data)).catch(console.error);
  }, []);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const toggleParameter = (id) => {
    setForm(p => {
      const arr = p.parameters;
      return { ...p, parameters: arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id] };
    });
  };

  const handleSubmit = async () => {
    if (!form.name_ru.trim() || !form.slug.trim()) return setErr("Название и slug обязательны");
    setSaving(true);
    try {
      const payload = { ...form, parameter_ids: form.parameters };
      if (isEdit) {
        await axios.put(`${API}/subcategories/${initial.id}/`, payload, { headers: getHeaders() });
      } else {
        await axios.post(`${API}/subcategories/`, payload, { headers: getHeaders() });
      }
      onSave();
      onClose();
    } catch (e) {
      setErr(e.response?.data?.detail || JSON.stringify(e.response?.data) || "Ошибка при сохранении");
    }
    setSaving(false);
  };

  return (
    <Modal title={isEdit ? "Редактировать подкатегорию" : `Новая подкатегория → ${categoryName}`} onClose={onClose}>
      <FormField label="Slug (URL ID)" hint="Только латинские буквы и дефисы">
        <input style={inputStyle} value={form.slug} onChange={e => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="kabinet" />
      </FormField>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <FormField label="Название UZ">
          <input style={inputStyle} value={form.name_uz} onChange={e => set("name_uz", e.target.value)} placeholder="Kabinet" />
        </FormField>
        <FormField label="Название RU">
          <input style={inputStyle} value={form.name_ru} onChange={e => set("name_ru", e.target.value)} placeholder="Кабинет" />
        </FormField>
        <FormField label="Название EN">
          <input style={inputStyle} value={form.name_en} onChange={e => set("name_en", e.target.value)} placeholder="Cabinet" />
        </FormField>
      </div>
      <FormField label="Порядок отображения">
        <input type="number" style={inputStyle} value={form.order} onChange={e => set("order", +e.target.value)} min={0} />
      </FormField>

      <div style={{ marginTop: 20 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 800, color: "#1a1a2e" }}>Доступные параметры</h3>
        {parameterGroups.length === 0 ? (
          <p style={{ fontSize: 13, color: "#94a3b8" }}>Нет доступных групп параметров. Сначала создайте их в разделе "Параметры".</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {parameterGroups.map(group => (
              <div key={group.id} style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: 12, border: "1px solid #e2e8f0" }}>
                <h4 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>{group.name_ru}</h4>
                {group.parameters && group.parameters.length > 0 ? (
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {group.parameters.map(p => (
                      <label key={p.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, background: "#fff", padding: "6px 12px", borderRadius: 8, border: "1px solid #cbd5e1", cursor: "pointer", transition: "0.1s" }}>
                        <input type="checkbox" checked={form.parameters.includes(p.id)} onChange={() => toggleParameter(p.id)} />
                        {p.name_ru} {p.type !== 'boolean' && <span style={{ color: "#94a3b8", fontSize: 10 }}>({p.type})</span>}
                      </label>
                    ))}
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>В этой группе пока нет элементов.</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {err && <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 12, marginTop: 12 }}>{err}</p>}

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
        <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "none", cursor: "pointer", fontWeight: 600, color: "#64748b" }}>Отмена</button>
        <button onClick={handleSubmit} disabled={saving} style={{ padding: "10px 22px", borderRadius: 10, border: "none", background: "#294a6d", color: "#fff", fontWeight: 700, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
          {saving ? "Сохраняем..." : isEdit ? "Сохранить" : "Создать"}
        </button>
      </div>
    </Modal>
  );
}

// ─── CATEGORY CARD ────────────────────────────────────────────────────────────
function CategoryCard({ cat, onEdit, onDelete, onRefresh }) {
  const [expanded, setExpanded] = useState(true);
  const [subModal, setSubModal] = useState(null); // null | 'create' | subcat-object

  const COLORS = ["#294a6d", "#e46630", "#1a6b6b", "#5b3a8c", "#1f78d1"];
  const colorIdx = (cat.order - 1) % COLORS.length;

  return (
    <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", marginBottom: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "18px 24px", background: `linear-gradient(135deg, ${COLORS[colorIdx]}08, transparent)` }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: COLORS[colorIdx], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0, fontWeight: 900, color: '#fff' }}>
          {cat.name_ru.charAt(0)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#1a1a2e" }}>{cat.name_ru}</h3>
            <span style={{ fontSize: 11, background: COLORS[colorIdx] + "18", color: COLORS[colorIdx], padding: "2px 8px", borderRadius: 20, fontWeight: 700 }}>
              {cat.name_uz}
            </span>
            <span style={{ fontSize: 11, color: "#94a3b8", background: "#f1f5f9", padding: "2px 8px", borderRadius: 20 }}>
              /{cat.slug}
            </span>
          </div>
          <p style={{ margin: "3px 0 0", fontSize: 13, color: "#64748b" }}>
            {cat.name_en} · Подкатегорий: <strong>{cat.subcategories?.length || 0}</strong> · Порядок: <strong>#{cat.order}</strong>
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => onEdit(cat)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, border: "1.5px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#475569" }}>
            <IconEdit /> Изменить
          </button>
          <button onClick={() => onDelete(cat)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, border: "1.5px solid #fecaca", background: "#fef2f2", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#ef4444" }}>
            <IconTrash /> Удалить
          </button>
          <button onClick={() => setExpanded(e => !e)} style={{ padding: "7px 10px", borderRadius: 8, border: "1.5px solid #e2e8f0", background: "#f8fafc", cursor: "pointer" }}>
            <IconChevron open={expanded} />
          </button>
        </div>
      </div>

      {/* Subcategories */}
      {expanded && (
        <div style={{ padding: "12px 24px 20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10, marginBottom: 12 }}>
            {(cat.subcategories || []).map(sub => (
              <div key={sub.id} style={{ border: "1.5px solid #e2e8f0", borderRadius: 12, padding: "12px 14px", background: "#f8fafc", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "#1a1a2e" }}>{sub.name_ru}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: "#94a3b8" }}>/{sub.slug} · #{sub.order}</p>
                  <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                    <span style={{ fontSize: 10, background: "#fff5f0", color: "#e46630", padding: "2px 6px", borderRadius: 4, fontWeight: 600 }}>
                      {sub.parameters?.length || 0} параметров
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <button onClick={() => setSubModal(sub)} style={{ padding: "4px 10px", borderRadius: 6, border: "1.5px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#475569" }}>
                    Изменить
                  </button>
                  <button onClick={async () => {
                    if (!window.confirm(`Удалить подкатегорию «${sub.name_ru}»?`)) return;
                    try { await axios.delete(`${API}/subcategories/${sub.id}/`, { headers: getHeaders() }); onRefresh(); }
                    catch (e) { alert("Ошибка удаления: " + (e.response?.data?.detail || e.message)); }
                  }} style={{ padding: "4px 10px", borderRadius: 6, border: "1.5px solid #fecaca", background: "#fef2f2", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#ef4444" }}>
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => setSubModal("create")} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, border: "1.5px dashed #e46630", background: "#fff5f0", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#e46630" }}>
            <IconPlus /> Добавить подкатегорию
          </button>
        </div>
      )}

      {subModal && (
        <SubCategoryModal
          initial={subModal === "create" ? null : subModal}
          categoryId={cat.id}
          categoryName={cat.name_ru}
          onSave={onRefresh}
          onClose={() => setSubModal(null)}
        />
      )}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catModal, setCatModal] = useState(null); // null | 'create' | cat-object

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/categories/`);
      setCategories(res.data?.results || res.data || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const handleDelete = async (cat) => {
    if (!window.confirm(`Удалить категорию «${cat.name_ru}» и ВСЕ её подкатегории?`)) return;
    try {
      await axios.delete(`${API}/categories/${cat.id}/`, { headers: getHeaders() });
      fetchCategories();
    } catch (e) {
      alert("Ошибка удаления: " + (e.response?.data?.detail || e.message));
    }
  };

  const total = categories.reduce((acc, c) => acc + (c.subcategories?.length || 0), 0);

  return (
    <div style={{ fontFamily: "Inter, sans-serif", padding: "0" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <p style={{ margin: "0 0 2px", fontSize: 13, color: "#64748b" }}>Управляйте типами пространств и их параметрами</p>
          <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
            {[
              { label: "Категорий", val: categories.length },
              { label: "Подкатегорий", val: total },
            ].map(s => (
              <div key={s.label} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "12px 20px" }}>
                <strong style={{ display: "block", fontSize: 22, fontWeight: 800, color: "#1a1a2e" }}>{s.val}</strong>
                <span style={{ fontSize: 13, color: "#64748b" }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
        <button onClick={() => setCatModal("create")} style={{
          display: "flex", alignItems: "center", gap: 8, padding: "12px 22px",
          borderRadius: 12, border: "none", background: "#e46630", color: "#fff",
          fontWeight: 700, fontSize: 14, cursor: "pointer", boxShadow: "0 4px 14px rgba(228,102,48,0.3)",
          transition: "all 0.2s"
        }}>
          <IconPlus /> Новая категория
        </button>
      </div>

      {/* Category list */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>Загрузка...</div>
      ) : categories.length === 0 ? (
        <div style={{ textAlign: "center", padding: 80, color: "#94a3b8" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏷️</div>
          <p style={{ fontWeight: 700, fontSize: 16 }}>Нет категорий</p>
          <p style={{ fontSize: 14 }}>Нажмите «Новая категория», чтобы начать</p>
        </div>
      ) : (
        categories.map(cat => (
          <CategoryCard
            key={cat.id}
            cat={cat}
            onEdit={c => setCatModal(c)}
            onDelete={handleDelete}
            onRefresh={fetchCategories}
          />
        ))
      )}

      {catModal && (
        <CategoryModal
          initial={catModal === "create" ? null : catModal}
          onSave={fetchCategories}
          onClose={() => setCatModal(null)}
        />
      )}
    </div>
  );
}
