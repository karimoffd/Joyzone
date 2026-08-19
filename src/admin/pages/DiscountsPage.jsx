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
function IconPercent() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="5" x2="5" y2="19"></line><circle cx="6.5" cy="6.5" r="2.5"></circle><circle cx="17.5" cy="17.5" r="2.5"></circle></svg>;
}

// ─── MODAL WRAPPER ──────────────────────────────────────────────────────────
function Modal({ children, title, onClose }) {
  return (
    <div className="param-modal-overlay" onClick={onClose}>
      <div className="param-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
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

// ─── DISCOUNT MODAL ───────────────────────────────────────────────────────────
function DiscountModal({ initial, categories, onSave, onClose }) {
  const isEdit = !!initial?.id;

  const [form, setForm] = useState({
    name_uz: initial?.name_uz || "",
    name_ru: initial?.name_ru || "",
    name_en: initial?.name_en || "",
    description_ru: initial?.description_ru || "",
    percent: initial?.percent || "",
    discount_type: initial?.discount_type || "new_listing",
    applicable_to: initial?.applicable_to || "all",
    category_ids: initial?.category_ids || [],
    is_active: initial?.is_active ?? true,
    min_nights: initial?.min_nights || "",
    max_bookings: initial?.max_bookings || "",
    days_before: initial?.days_before || "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const DISCOUNT_TYPES = [
    { id: "new_listing", label: "Акция «Новое объявление»", desc: "Скидка на первые N бронирований" },
    { id: "last_minute", label: "Скидка последней минуты", desc: "Бронирования менее чем за N дней до прибытия" },
    { id: "weekly", label: "Недельная скидка", desc: "Для поездок длительностью от 7 ночей" },
    { id: "monthly", label: "Месячная скидка", desc: "Для поездок длительностью от 28 ночей" },
    { id: "custom", label: "Пользовательская скидка", desc: "Произвольные условия" },
  ];

  const handleSubmit = async () => {
    if (!form.name_ru.trim()) return setErr("Название (RU) обязательно");
    if (!form.percent || isNaN(+form.percent) || +form.percent <= 0 || +form.percent > 100) return setErr("Укажите процент скидки (1-100)");
    setSaving(true);
    const payload = {
      ...form,
      percent: +form.percent,
      min_nights: form.min_nights ? +form.min_nights : null,
      max_bookings: form.max_bookings ? +form.max_bookings : null,
      days_before: form.days_before ? +form.days_before : null,
    };
    try {
      if (isEdit) {
        await axios.put(`${API}/discounts/${initial.id}/`, payload, { headers: getHeaders() });
      } else {
        await axios.post(`${API}/discounts/`, payload, { headers: getHeaders() });
      }
      onSave();
      onClose();
    } catch (e) {
      setErr(e.response?.data?.detail || JSON.stringify(e.response?.data) || "Ошибка при сохранении");
    }
    setSaving(false);
  };

  const toggleCategory = (id) => {
    const ids = form.category_ids;
    if (ids.includes(id)) {
      set("category_ids", ids.filter(i => i !== id));
    } else {
      set("category_ids", [...ids, id]);
    }
  };

  return (
    <Modal title={isEdit ? "Редактировать скидку" : "Новая скидка"} onClose={onClose}>
      {/* Type */}
      <FormField label="Тип скидки">
        <select className="param-input" value={form.discount_type} onChange={e => set("discount_type", e.target.value)}>
          {DISCOUNT_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      </FormField>

      {/* Percentage */}
      <FormField label="Процент скидки (%)">
        <input
          className="param-input"
          type="number"
          min="1" max="100"
          value={form.percent}
          onChange={e => set("percent", e.target.value)}
          placeholder="Например: 20"
        />
      </FormField>

      {/* Names */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <FormField label="Название RU">
          <input className="param-input" value={form.name_ru} onChange={e => set("name_ru", e.target.value)} placeholder="Акция «Новое объявление»" />
        </FormField>
        <FormField label="Название UZ">
          <input className="param-input" value={form.name_uz} onChange={e => set("name_uz", e.target.value)} placeholder="Yangi e'lon aksiyasi" />
        </FormField>
        <FormField label="Название EN">
          <input className="param-input" value={form.name_en} onChange={e => set("name_en", e.target.value)} placeholder="New Listing Promotion" />
        </FormField>
      </div>
      <FormField label="Описание">
        <input className="param-input" value={form.description_ru} onChange={e => set("description_ru", e.target.value)} placeholder="Кратко опишите условия скидки" />
      </FormField>

      {/* Conditions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {form.discount_type === "new_listing" && (
          <FormField label="Макс. бронирований" hint="Ограничение по количеству">
            <input className="param-input" type="number" min="1" value={form.max_bookings} onChange={e => set("max_bookings", e.target.value)} placeholder="3" />
            <span style={{ fontSize: 12, color: "#64748b", marginTop: 4, display: "block" }}>
              Скидка будет автоматически отключена для этого пространства после N бронирований (например, действует только для первых 3 гостей).
            </span>
          </FormField>
        )}
        {form.discount_type === "last_minute" && (
          <FormField label="Дней до заезда ≤" hint="Временное окно">
            <input className="param-input" type="number" min="1" value={form.days_before} onChange={e => set("days_before", e.target.value)} placeholder="14" />
            <span style={{ fontSize: 12, color: "#64748b", marginTop: 4, display: "block" }}>
              Скидка применяется, если до начала бронирования осталось указанное количество дней или меньше.
            </span>
          </FormField>
        )}
        {(form.discount_type === "weekly" || form.discount_type === "monthly" || form.discount_type === "custom") && (
          <FormField label="Минимум ночей/дней" hint="Длительность">
            <input className="param-input" type="number" min="1" value={form.min_nights} onChange={e => set("min_nights", e.target.value)} placeholder="7" />
            <span style={{ fontSize: 12, color: "#64748b", marginTop: 4, display: "block" }}>
              Минимальное количество дней/ночей в бронировании для активации этой скидки.
            </span>
          </FormField>
        )}
      </div>

      {/* Applicability */}
      <FormField label="Применяется к">
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { id: "all", label: "Всем категориям" },
            { id: "specific", label: "Выбранным категориям" },
          ].map(opt => (
            <button
              key={opt.id}
              type="button"
              onClick={() => set("applicable_to", opt.id)}
              className={`disc-app-btn ${form.applicable_to === opt.id ? "active" : ""}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </FormField>

      {form.applicable_to === "specific" && (
        <FormField label="Категории">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
            {categories.map(cat => {
              const isSel = form.category_ids.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  className={`disc-tag-btn ${isSel ? "active" : ""}`}
                >
                  {cat.name_ru || cat.name_uz || cat.slug}
                </button>
              );
            })}
          </div>
        </FormField>
      )}

      {/* Active toggle */}
      <FormField label="Статус">
        <div
          style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
          onClick={() => set("is_active", !form.is_active)}
        >
          <div className={`disc-switch ${form.is_active ? "active" : ""}`}>
            <div className="disc-switch-handle" />
          </div>
          <span style={{ fontWeight: 600, color: form.is_active ? "#16a34a" : "#64748b" }}>
            {form.is_active ? "Активна" : "Отключена"}
          </span>
        </div>
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

// ─── DISCOUNT CARD ────────────────────────────────────────────────────────────
const TYPE_LABELS = {
  new_listing: { label: "Новое объявление", color: "#7c3aed", bg: "#f5f3ff" },
  last_minute: { label: "Последняя минута", color: "#dc2626", bg: "#fef2f2" },
  weekly: { label: "Недельная", color: "#0369a1", bg: "#f0f9ff" },
  monthly: { label: "Месячная", color: "#0f766e", bg: "#f0fdfa" },
  custom: { label: "Пользовательская", color: "#92400e", bg: "#fffbeb" },
};

function DiscountCard({ discount, categories, onEdit, onDelete, onToggle }) {
  const typeInfo = TYPE_LABELS[discount.discount_type] || TYPE_LABELS.custom;
  const appliedCats = discount.applicable_to === "specific"
    ? categories.filter(c => discount.category_ids?.includes(c.id))
    : [];

  return (
    <div className={`disc-card ${discount.is_active ? "" : "inactive"}`}>
      {/* Percent badge */}
      <div className="disc-card-badge" style={{ background: typeInfo.bg }}>
        <span className="disc-card-badge-num" style={{ color: typeInfo.color }}>{discount.percent}</span>
        <span className="disc-card-badge-symbol" style={{ color: typeInfo.color }}>%</span>
      </div>

      {/* Info */}
      <div className="disc-card-info">
        <div className="disc-card-title-row">
          <h3 className="disc-card-title">{discount.name_ru}</h3>
          <span className="disc-card-type-label" style={{ background: typeInfo.bg, color: typeInfo.color }}>
            {typeInfo.label}
          </span>
          {!discount.is_active && (
            <span className="disc-card-type-label" style={{ background: "#f1f5f9", color: "#94a3b8" }}>
              Отключена
            </span>
          )}
        </div>
        {discount.description_ru && (
          <p className="disc-card-desc">{discount.description_ru}</p>
        )}
        <div className="disc-card-meta-row">
          {discount.applicable_to === "all" && (
            <span className="disc-card-meta-tag all">
              🌐 Все категории
            </span>
          )}
          {appliedCats.map(cat => (
            <span key={cat.id} className="disc-card-meta-tag spec">
              {cat.name_ru || cat.slug}
            </span>
          ))}
          {discount.max_bookings && (
            <span className="disc-card-meta-tag cond">
              Макс. {discount.max_bookings} бронирований
            </span>
          )}
          {discount.days_before && (
            <span className="disc-card-meta-tag cond">
              За {discount.days_before} дней
            </span>
          )}
          {discount.min_nights && (
            <span className="disc-card-meta-tag cond">
              От {discount.min_nights} ночей
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="disc-card-actions">
        {/* Toggle */}
        <div
          className={`disc-switch ${discount.is_active ? "active" : ""}`}
          onClick={() => onToggle(discount)}
          title={discount.is_active ? "Отключить" : "Включить"}
        >
          <div className="disc-switch-handle" />
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => onEdit(discount)} className="param-btn-small">
            <IconEdit />
          </button>
          <button onClick={() => onDelete(discount)} className="param-btn-small-danger">
            <IconTrash />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function DiscountsPage() {
  const [discounts, setDiscounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | "create" | discount object
  const [filterType, setFilterType] = useState("all");
  const [filterCat, setFilterCat] = useState("all");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [discRes, catRes] = await Promise.all([
        axios.get(`${API}/discounts/`, { headers: getHeaders() }),
        axios.get(`${API}/categories/`, { headers: getHeaders() }),
      ]);
      setDiscounts(discRes.data?.results || discRes.data || []);
      setCategories(catRes.data?.results || catRes.data || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleDelete = async (discount) => {
    if (!window.confirm(`Удалить скидку «${discount.name_ru}»?`)) return;
    try {
      await axios.delete(`${API}/discounts/${discount.id}/`, { headers: getHeaders() });
      fetchAll();
    } catch (e) {
      alert("Ошибка: " + (e.response?.data?.detail || e.message));
    }
  };

  const handleToggle = async (discount) => {
    try {
      await axios.patch(`${API}/discounts/${discount.id}/`, { is_active: !discount.is_active }, { headers: getHeaders() });
      fetchAll();
    } catch (e) {
      alert("Ошибка: " + (e.response?.data?.detail || e.message));
    }
  };

  const filtered = discounts.filter(d => {
    if (filterType !== "all" && d.discount_type !== filterType) return false;
    if (filterCat !== "all") {
      if (d.applicable_to === "all") return true;
      if (!d.category_ids?.includes(+filterCat)) return false;
    }
    return true;
  });

  const activeCount = discounts.filter(d => d.is_active).length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", color: "#16a34a" }}>
              <IconPercent />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#0f172a" }}>Управление скидками</h2>
              <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
                Активных: <strong style={{ color: "#16a34a" }}>{activeCount}</strong> из <strong>{discounts.length}</strong>
              </p>
            </div>
          </div>
        </div>
        <button
          className="disc-btn-primary"
          onClick={() => setModal("create")}
        >
          <IconPlus /> Создать скидку
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
        <div className="disc-filter-tabs">
          {[
            { id: "all", label: "Все типы" },
            { id: "new_listing", label: "Новое объявление" },
            { id: "last_minute", label: "Последняя минута" },
            { id: "weekly", label: "Недельная" },
            { id: "monthly", label: "Месячная" },
            { id: "custom", label: "Пользовательская" },
          ].map(t => (
            <button key={t.id} type="button"
              className={`disc-filter-tab ${filterType === t.id ? "active" : ""}`}
              onClick={() => setFilterType(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <select
          className="disc-filter-select"
          value={filterCat}
          onChange={e => setFilterCat(e.target.value)}
        >
          <option value="all">Все категории</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name_ru || cat.slug}</option>
          ))}
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#64748b" }}>Загрузка...</div>
      ) : filtered.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "60px 20px",
          background: "#f8fafc", borderRadius: 16, border: "1.5px dashed #e2e8f0"
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏷️</div>
          <h3 style={{ color: "#0f172a", marginBottom: 8 }}>Скидок пока нет</h3>
          <p style={{ color: "#64748b", marginBottom: 24 }}>Создайте первую скидку, которая будет предлагаться партнёрам при регистрации</p>
          <button className="disc-btn-primary" onClick={() => setModal("create")}>
            <IconPlus /> Создать скидку
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {filtered.map(d => (
            <DiscountCard
              key={d.id}
              discount={d}
              categories={categories}
              onEdit={() => setModal(d)}
              onDelete={() => handleDelete(d)}
              onToggle={() => handleToggle(d)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <DiscountModal
          initial={modal === "create" ? null : modal}
          categories={categories}
          onSave={fetchAll}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
