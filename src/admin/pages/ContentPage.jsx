import React, { useState, useEffect } from "react";
import axios from "axios";
import { defaultContent } from "../../data/defaultContent.js";

// CSS styles
const styles = `
.rich-content-page {
  font-family: 'Inter', 'Roboto', sans-serif;
  color: #1a1a2e;
  background: linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%);
  min-height: calc(100vh - 40px);
  padding: 40px;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  gap: 30px;
}
.glass-panel {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.4);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.05);
  border-radius: 24px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  flex: 1;
}
.rich-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30px 40px;
  border-bottom: 1px solid rgba(0,0,0,0.05);
}
.rich-title {
  font-size: 28px;
  font-weight: 800;
  background: linear-gradient(135deg, #294a6d 0%, #e46630 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0;
}
.rich-subtitle {
  color: #64748b;
  font-size: 14px;
  margin-top: 4px;
}
.lang-toggle {
  display: flex;
  background: rgba(0,0,0,0.04);
  padding: 4px;
  border-radius: 12px;
}
.lang-btn {
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 13px;
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
  background: transparent;
  color: #64748b;
}
.lang-btn.active {
  background: #fff;
  color: #e46630;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}
.rich-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  flex: 1;
}
.rich-sidebar {
  padding: 30px;
  border-right: 1px solid rgba(0,0,0,0.05);
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.cat-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  text-align: left;
  padding: 14px 20px;
  border-radius: 16px;
  border: none;
  background: transparent;
  color: #475569;
  font-weight: 600;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.cat-btn:hover {
  background: rgba(228, 102, 48, 0.05);
  color: #e46630;
}
.cat-btn.active {
  background: linear-gradient(135deg, rgba(228, 102, 48, 0.1) 0%, rgba(228, 102, 48, 0.05) 100%);
  color: #e46630;
  box-shadow: inset 2px 0 0 #e46630;
}
.rich-content {
  padding: 40px;
  position: relative;
  display: flex;
  flex-direction: column;
}
.field-group {
  margin-bottom: 30px;
}
.field-label {
  display: block;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #64748b;
  margin-bottom: 10px;
}
.rich-input {
  width: 100%;
  background: #fff;
  border: 2px solid transparent;
  box-shadow: 0 4px 15px rgba(0,0,0,0.03);
  border-radius: 16px;
  padding: 16px 20px;
  font-size: 16px;
  color: #1e293b;
  font-family: inherit;
  transition: all 0.3s ease;
}
.rich-input:focus {
  outline: none;
  border-color: rgba(228, 102, 48, 0.4);
  box-shadow: 0 4px 20px rgba(228, 102, 48, 0.15);
  background: rgba(255,255,255,0.9);
}
textarea.rich-input {
  resize: vertical;
  min-height: 120px;
}
.floating-save {
  position: sticky;
  bottom: 0px;
  align-self: flex-end;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  background: linear-gradient(135deg, #e46630 0%, #d05320 100%);
  color: #fff;
  border: none;
  padding: 16px 32px;
  border-radius: 50px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 10px 25px rgba(228, 102, 48, 0.4);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  margin-top: auto;
}
.floating-save:hover {
  transform: translateY(-5px);
  box-shadow: 0 15px 35px rgba(228, 102, 48, 0.5);
}
.floating-save:active {
  transform: translateY(0);
}
.floating-save.saved {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  box-shadow: 0 10px 25px rgba(16, 185, 129, 0.4);
}
.cat-icon {
  width: 20px;
  height: 20px;
  stroke-width: 2;
  stroke: currentColor;
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.sidebar-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.sidebar-group-title {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #94a3b8;
  font-weight: 700;
  margin-bottom: 8px;
  padding-left: 14px;
}
.sidebar-divider {
  height: 1px;
  background: rgba(41, 74, 109, 0.08);
  margin: 16px 0;
}
.link-card {
  display: flex;
  gap: 12px;
  align-items: center;
  background: rgba(255, 255, 255, 0.8);
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid rgba(41, 74, 109, 0.08);
  box-shadow: 0 4px 16px rgba(0,0,0,0.02);
  transition: all 0.2s ease;
}
.link-card.dragging {
  opacity: 0.5;
  box-shadow: 0 10px 30px rgba(0,0,0,0.1);
  transform: scale(1.02);
}
.link-card:hover {
  border-color: rgba(228, 102, 48, 0.3);
  box-shadow: 0 8px 24px rgba(0,0,0,0.04);
}
.drag-handle {
  cursor: grab;
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
}
.drag-handle:active {
  cursor: grabbing;
}
.link-inputs-row {
  flex: 1;
  display: flex;
  flex-direction: row;
  gap: 8px;
}
@media (max-width: 600px) {
  .link-inputs-row {
    flex-direction: column;
  }
}
.link-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: none;
  background: #f1f5f9;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
}
.link-btn:hover:not(:disabled) {
  background: #e2e8f0;
  color: #1a1a2e;
}
.link-btn:disabled {
  opacity: 0.3;
  cursor: default;
}
.link-btn-delete {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}
.link-btn-delete:hover {
  background: #ef4444;
  color: white;
}
.add-link-btn {
  align-self: flex-start;
  padding: 10px 20px;
  background: rgba(228, 102, 48, 0.1);
  color: #e46630;
  border: 1px dashed #e46630;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}
.add-link-btn:hover {
  background: #e46630;
  color: white;
}
`;

const CATEGORIES = [
  {
    id: "nav",
    label: "Навигация (Меню)",
    fields: [
      { key: "nav_links_arr", label: "Ссылки верхнего меню", type: "linkList" },
    ]
  },
  {
    id: "hero",
    label: "Hero (Главная)",
    fields: [
      { key: "hero_title", label: "Заголовок", type: "text" },
      { key: "hero_subtitle", label: "Подзаголовок", type: "textarea" },
      { key: "hero_cta", label: "Кнопка CTA", type: "text" },
      { key: "hero_animated_words", label: "Слова (через запятую)", type: "text" },
    ]
  },
  {
    id: "filters",
    label: "Фильтры и Вкладки",
    fields: [
      { key: "tab_all", label: "Вкладка Все", type: "text" },
      { key: "tab_office", label: "Вкладка Офис", type: "text" },
      { key: "tab_coworking", label: "Вкладка Коворкинг", type: "text" },
      { key: "tab_events", label: "Вкладка Мероприятия", type: "text" },
      { key: "tab_halls", label: "Вкладка Залы", type: "text" },
      { key: "filter_price", label: "Фильтр Цена", type: "text" },
      { key: "filter_people", label: "Фильтр Люди", type: "text" },
      { key: "filter_floor", label: "Фильтр Этаж", type: "text" },
    ]
  },
  {
    id: "cards",
    label: "Карточки мест",
    fields: [
      { key: "card_people", label: "человек", type: "text" },
      { key: "card_room", label: "комната", type: "text" },
      { key: "card_sqm", label: "м2", type: "text" },
      { key: "card_ad", label: "Реклама", type: "text" },
      { key: "card_fav", label: "Выбор гостей", type: "text" },
      { key: "card_per_hour", label: "за час", type: "text" },
      { key: "card_per_day", label: "в день", type: "text" },
      { key: "card_view_all", label: "Смотреть все", type: "text" },
    ]
  },
  {
    id: "popular",
    label: "Популярные места",
    fields: [
      { key: "popular_title", label: "Заголовок", type: "text" },
      { key: "popular_subtitle", label: "Подзаголовок", type: "text" },
    ]
  },
  {
    id: "howit",
    label: "Как это работает",
    fields: [
      { key: "how_title", label: "Заголовок", type: "text" },
      { key: "how_step1", label: "Шаг 1", type: "text" },
      { key: "how_step2", label: "Шаг 2", type: "text" },
      { key: "how_step3", label: "Шаг 3", type: "text" },
    ]
  },
  {
    id: "agents",
    label: "Партнеры (Агенты)",
    fields: [
      { key: "agent_title", label: "Заголовок Партнеров", type: "text" },
      { key: "agent_sub", label: "Подзаголовок", type: "textarea" },
      { key: "agent_premium", label: "Бейдж Премиум", type: "text" },
      { key: "agent_reviews", label: "отзывов", type: "text" },
      { key: "agent_profile", label: "Кнопка Профиль", type: "text" },
    ]
  },
  {
    id: "reviews",
    label: "Отзывы и FAQ",
    fields: [
      { key: "rev_title", label: "Отзывы", type: "text" },
      { key: "faq_kicker", label: "FAQ kicker", type: "text" },
      { key: "faq_title", label: "FAQ заголовок", type: "text" },
    ]
  },
  {
    id: "partner",
    label: "Стать партнёром",
    fields: [
      { key: "partner_title", label: "Заголовок", type: "text" },
      { key: "partner_subtitle", label: "Описание", type: "textarea" },
      { key: "partner_cta", label: "Кнопка", type: "text" },
    ]
  },
  {
    id: "auth",
    label: "Авторизация",
    fields: [
      { key: "auth_login_title", label: "Заголовок Входа", type: "text" },
      { key: "auth_login_sub", label: "Подзаголовок Входа", type: "textarea" },
      { key: "auth_reg_title", label: "Заголовок Регистрации", type: "text" },
      { key: "auth_reg_sub", label: "Подзаголовок Регистрации", type: "textarea" },
      { key: "auth_otp_title", label: "Заголовок OTP", type: "text" },
      { key: "auth_otp_sub", label: "Подзаголовок OTP", type: "textarea" },
      { key: "auth_forgot_title", label: "Заголовок Восст.", type: "text" },
      { key: "auth_forgot_sub", label: "Подзаголовок Восст.", type: "textarea" },
      { key: "auth_forgot_btn", label: "Кнопка Восст.", type: "text" },
      { key: "auth_forgot_login", label: "Ссылка Войти", type: "text" },
      { key: "auth_verify_title", label: "Заголовок Подтв.", type: "text" },
      { key: "auth_verify_sub", label: "Подзаголовок Подтв.", type: "textarea" },
      { key: "auth_verify_btn", label: "Кнопка Подтв.", type: "text" },
      { key: "auth_verify_resend", label: "Кнопка Отправить код", type: "text" },
    ]
  },
  {
    id: "about",
    label: "О нас",
    fields: [
      { key: "about_title", label: "Заголовок", type: "text" },
      { key: "about_text", label: "Текст", type: "textarea" },
    ]
  },
  {
    id: "footer",
    label: "Подвал (Footer)",
    fields: [
      { key: "footer_about", label: "О компании (текст)", type: "textarea" },
      { key: "footer_address", label: "Адрес", type: "text" },
      { key: "footer_phone", label: "Телефон", type: "text" },
      { key: "footer_email", label: "Email", type: "text" },
      { key: "footer_nav1", label: "Колонка Инфо", type: "text" },
      { key: "footer_nav2", label: "Колонка Сервисы", type: "text" },
      { key: "footer_link_about", label: "О нас", type: "text" },
      { key: "footer_link_dirs", label: "Направления", type: "text" },
      { key: "footer_link_contact", label: "Контакты", type: "text" },
      { key: "footer_link_privacy", label: "Политика", type: "text" },
    ]
  },
  {
    id: "sms",
    label: "SMS шаблоны",
    fields: [
      { key: "sms_otp", label: "OTP сообщение", type: "textarea" },
      { key: "sms_booking_confirm", label: "Подтверждение брони", type: "textarea" },
      { key: "sms_booking_cancel", label: "Отмена брони", type: "textarea" },
    ]
  }
];

export default function ContentPage() {
  const [lang, setLang] = useState("ru");
  const [activeCat, setActiveCat] = useState("hero");
  const [data, setData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [draggedItemIdx, setDraggedItemIdx] = useState(null);

  useEffect(() => {
    fetchData();
  }, [lang]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get('http://localhost:8000/api/content/');
      let fetchedData = res.data || {};
      if (fetchedData.data) fetchedData = fetchedData.data;
      if (res.data && res.data[lang]) {
        fetchedData = res.data[lang];
      }
      const defaultData = defaultContent[lang] || {};
      setData({ ...defaultData, ...fetchedData });
    } catch (error) {
      console.error("Failed to fetch content", error);
      setData(defaultContent[lang] || {});
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Build the final dictionary
      const payload = {
        lang: lang,
        data: data
      };
      await axios.put('http://localhost:8000/api/content/', payload);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error("Failed to save content", error);
    }
    setIsSaving(false);
  };

  const handleChange = (key, value) => {
    setData(prev => ({ ...prev, [key]: value }));
  };

  const activeFields = CATEGORIES.find(c => c.id === activeCat)?.fields || [];

  return (
    <>
      <style>{styles}</style>
      <div className="rich-content-page">
        <div className="glass-panel">
          <div className="rich-header">
            <div>
              <h1 className="rich-title">Управление Контентом</h1>
              <div className="rich-subtitle">Редактируйте тексты сайта в реальном времени. Изменения применяются мгновенно.</div>
            </div>
            <div className="lang-toggle">
              {['uz', 'ru', 'en'].map(l => (
                <button 
                  key={l}
                  className={`lang-btn ${lang === l ? 'active' : ''}`}
                  onClick={() => setLang(l)}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          
          <div className="rich-layout">
            <div className="rich-sidebar">
              <div className="sidebar-group">
                <span className="sidebar-group-title">Структура сайта</span>
                <button 
                  className={`cat-btn ${activeCat === 'nav' ? 'active' : ''}`}
                  onClick={() => setActiveCat('nav')}
                >
                  Навигация (Меню)
                </button>
              </div>
              <div className="sidebar-divider" />
              <div className="sidebar-group">
                <span className="sidebar-group-title">Текстовый контент</span>
                {CATEGORIES.filter(cat => cat.id !== 'nav').map(cat => (
                  <button 
                    key={cat.id} 
                    className={`cat-btn ${activeCat === 'nav' ? '' : (activeCat === cat.id ? 'active' : '')}`}
                    onClick={() => setActiveCat(cat.id)}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="rich-content">
              {isLoading ? (
                <div style={{color: '#64748b', fontSize: 16}}>Загрузка контента...</div>
              ) : (
                <div style={{ paddingBottom: 20 }}>
                  <h2 style={{fontSize: 22, fontWeight: 700, color: '#1a1a2e', marginBottom: 30}}>
                    {CATEGORIES.find(c => c.id === activeCat)?.label}
                  </h2>
                  
                  {activeFields.map(field => (
                    <div className="field-group" key={field.key}>
                      <label className="field-label">{field.label}</label>
                      {field.type === 'textarea' ? (
                        <textarea 
                          className="rich-input"
                          value={data[field.key] || ''}
                          onChange={(e) => handleChange(field.key, e.target.value)}
                          rows={3}
                        />
                      ) : field.type === 'linkList' ? (
                        <div className="link-list-editor" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {(Array.isArray(data[field.key]) ? data[field.key] : []).map((link, idx, arr) => (
                            <div 
                              key={idx} 
                              className={`link-card ${draggedItemIdx === idx ? 'dragging' : ''}`}
                              draggable
                              onDragStart={(e) => {
                                setDraggedItemIdx(idx);
                                e.dataTransfer.effectAllowed = 'move';
                              }}
                              onDragOver={(e) => {
                                e.preventDefault(); // necessary to allow dropping
                                e.dataTransfer.dropEffect = 'move';
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                if (draggedItemIdx === null || draggedItemIdx === idx) return;
                                const newArr = [...arr];
                                const [removed] = newArr.splice(draggedItemIdx, 1);
                                newArr.splice(idx, 0, removed);
                                handleChange(field.key, newArr);
                                setDraggedItemIdx(null);
                              }}
                              onDragEnd={() => setDraggedItemIdx(null)}
                            >
                              <div className="drag-handle" title="Зажмите, чтобы переместить">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>
                              </div>
                              <div className="link-inputs-row">
                                <input 
                                  className="rich-input" 
                                  style={{ margin: 0, padding: '8px 12px', fontSize: '14px', flex: '1 1 50%' }} 
                                  placeholder="Текст ссылки"
                                  value={link.label}
                                  onChange={e => {
                                    const newArr = [...arr];
                                    newArr[idx].label = e.target.value;
                                    handleChange(field.key, newArr);
                                  }}
                                />
                                <input 
                                  className="rich-input" 
                                  style={{ margin: 0, padding: '8px 12px', fontSize: '14px', color: '#64748b', background: '#f8fafc', flex: '1 1 50%' }} 
                                  placeholder="URL (напр. #home)"
                                  value={link.href}
                                  onChange={e => {
                                    const newArr = [...arr];
                                    newArr[idx].href = e.target.value;
                                    handleChange(field.key, newArr);
                                  }}
                                />
                              </div>
                              <button type="button" className="link-btn link-btn-delete" style={{ width: '30px', height: '30px', borderRadius: '6px', flexShrink: 0 }} onClick={() => {
                                const newArr = arr.filter((_, i) => i !== idx);
                                handleChange(field.key, newArr);
                              }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                              </button>
                            </div>
                          ))}
                          <button type="button" className="add-link-btn" style={{ marginTop: '4px' }} onClick={() => {
                            const newArr = [...(Array.isArray(data[field.key]) ? data[field.key] : []), { label: "Новая ссылка", href: "#" }];
                            handleChange(field.key, newArr);
                          }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                            Добавить ссылку
                          </button>
                        </div>
                      ) : (
                        <input 
                          type="text" 
                          className="rich-input"
                          value={data[field.key] || ''}
                          onChange={(e) => handleChange(field.key, e.target.value)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              <button 
                className={`floating-save ${saved ? 'saved' : ''}`} 
                onClick={handleSave}
                disabled={isLoading || isSaving}
              >
                {saved ? (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    Сохранено!
                  </>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                    {isSaving ? 'Сохранение...' : 'Сохранить изменения'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
