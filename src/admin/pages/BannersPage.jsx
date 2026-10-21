import React, { useCallback, useEffect, useState } from "react";
import api, { getApiErrorMessage, withUploadTimeout } from "../../api/client.js";

const LANGS = [["uz", "UZ"], ["ru", "RU"], ["en", "EN"]];
const EMPTY_BANNER = {
  eyebrow_uz: "", eyebrow_ru: "", eyebrow_en: "",
  title_uz: "", title_ru: "", title_en: "",
  image: "", link: "", order: 0, is_active: true,
};

const inputStyle = {
  width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)",
  fontSize: 14, fontFamily: "inherit", background: "#fff",
};

function BannerModal({ initial, onClose, onSaved }) {
  const [form, setForm] = useState({ ...EMPTY_BANNER, ...initial });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const upload = async (file) => {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await api.post("/api/places/upload_image/", formData, withUploadTimeout({
        headers: { "Content-Type": "multipart/form-data" },
      }));
      set("image", res.data?.url || "");
    } catch (err) {
      setError(getApiErrorMessage(err, "Не удалось загрузить изображение"));
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!form.title_uz.trim() || !form.image.trim()) {
      setError("Заголовок (UZ) и изображение обязательны.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = { ...form, order: Number(form.order) || 0 };
      if (form.id) await api.put(`/api/content/banners/${form.id}/`, payload);
      else await api.post("/api/content/banners/", payload);
      onSaved();
    } catch (err) {
      setError(getApiErrorMessage(err, "Не удалось сохранить баннер"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="param-modal-overlay" onClick={onClose}>
      <div className="param-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
        <div className="param-modal-header">
          <h3 className="param-modal-title">{form.id ? "Редактировать баннер" : "Новый баннер"}</h3>
          <button className="param-modal-close" onClick={onClose}>×</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            {form.image ? (
              <img src={form.image} alt="" style={{ width: "100%", height: 180, objectFit: "cover", borderRadius: 12 }} />
            ) : null}
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <input style={inputStyle} placeholder="Ссылка на изображение" value={form.image} onChange={(e) => set("image", e.target.value)} />
              <label className="adm-btn adm-btn-outline" style={{ whiteSpace: "nowrap", cursor: "pointer" }}>
                {uploading ? "Загрузка..." : "Загрузить"}
                <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => upload(e.target.files?.[0])} />
              </label>
            </div>
          </div>
          {LANGS.map(([code, label]) => (
            <div key={code} style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8 }}>
              <input style={inputStyle} placeholder={`Надзаголовок ${label}`} value={form[`eyebrow_${code}`]} onChange={(e) => set(`eyebrow_${code}`, e.target.value)} />
              <input style={inputStyle} placeholder={`Заголовок ${label}${code === "uz" ? " *" : ""}`} value={form[`title_${code}`]} onChange={(e) => set(`title_${code}`, e.target.value)} />
            </div>
          ))}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 8, alignItems: "center" }}>
            <input style={inputStyle} placeholder="Ссылка при клике (необязательно), напр. /filter" value={form.link} onChange={(e) => set("link", e.target.value)} />
            <input style={inputStyle} type="number" min="0" placeholder="Порядок" value={form.order} onChange={(e) => set("order", e.target.value)} />
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}>
              <input type="checkbox" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)} />
              Показывать
            </label>
          </div>
          {error ? <div style={{ color: "#dc2626", fontSize: 13, fontWeight: 600 }}>{error}</div> : null}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button className="adm-btn adm-btn-outline" onClick={onClose}>Отмена</button>
            <button className="adm-btn adm-btn-primary" data-testid="banner-save" onClick={save} disabled={saving || uploading}>
              {saving ? "Сохранение..." : "Сохранить"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BannersPage() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/content/banners/");
      setBanners(Array.isArray(res.data) ? res.data : res.data?.results || []);
      setError("");
    } catch (err) {
      setError(getApiErrorMessage(err, "Не удалось загрузить баннеры"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const remove = async (banner) => {
    if (!window.confirm(`Удалить баннер «${banner.title_uz}»?`)) return;
    try {
      await api.delete(`/api/content/banners/${banner.id}/`);
      load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Не удалось удалить баннер"));
    }
  };

  const toggle = async (banner) => {
    try {
      await api.patch(`/api/content/banners/${banner.id}/`, { is_active: !banner.is_active });
      load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Не удалось изменить баннер"));
    }
  };

  return (
    <div className="adm-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <p style={{ color: "var(--text-muted)", margin: 0 }}>
          Слайды на главной и на экранах входа/регистрации. Порядок — по возрастанию номера.
        </p>
        <button className="adm-btn adm-btn-primary" data-testid="banner-add" onClick={() => setEditing({ ...EMPTY_BANNER, order: banners.length })}>
          + Добавить баннер
        </button>
      </div>
      {error ? <div style={{ color: "#dc2626", marginBottom: 12, fontWeight: 600 }}>{error}</div> : null}
      {loading ? <div style={{ color: "var(--text-muted)" }}>Загрузка...</div> : null}
      {!loading && banners.length === 0 ? (
        <div className="adm-card" style={{ padding: 24, color: "var(--text-muted)" }}>Баннеров пока нет — на сайте показываются стандартные слайды.</div>
      ) : null}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {banners.map((banner) => (
          <article key={banner.id} className="adm-card" data-testid={`banner-${banner.id}`} style={{ overflow: "hidden", opacity: banner.is_active ? 1 : 0.55 }}>
            <img src={banner.image} alt="" style={{ width: "100%", height: 150, objectFit: "cover", display: "block" }} />
            <div style={{ padding: 14 }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>#{banner.order} · {banner.eyebrow_uz}</div>
              <strong style={{ display: "block", margin: "4px 0 12px", color: "var(--navy)" }}>{banner.title_uz}</strong>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="adm-btn adm-btn-outline" onClick={() => setEditing(banner)}>Изменить</button>
                <button className="adm-btn adm-btn-outline" onClick={() => toggle(banner)}>{banner.is_active ? "Скрыть" : "Показать"}</button>
                <button className="adm-btn adm-btn-outline" style={{ color: "#dc2626" }} onClick={() => remove(banner)}>Удалить</button>
              </div>
            </div>
          </article>
        ))}
      </div>
      {editing ? (
        <BannerModal initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
      ) : null}
    </div>
  );
}
