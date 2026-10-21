import React, { useEffect, useState, useRef } from 'react';
import api, { API_BASE_URL, getApiErrorMessage } from "../../api/client.js";
import { cacheProfile, normalizeProfile } from "../../utils/profileMapper.js";
import { getStorageItem, readJsonStorage, STORAGE_KEYS, writeJsonStorage } from "../../utils/storageKeys.js";

const ICONS = {
  user: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  lock: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  bell: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  zap: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  camera: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
};

const TABS = [
  { id: 'profile', label: 'Личные данные', icon: 'user' },
  { id: 'security', label: 'Безопасность', icon: 'lock' },
  { id: 'notifications', label: 'Уведомления', icon: 'bell' },
  { id: 'integrations', label: 'Интеграции', icon: 'zap' },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [profileError, setProfileError] = useState('');
  
  // Profile state
  const cachedName = getStorageItem(STORAGE_KEYS.profile.name, 'Администратор').trim().split(/\s+/);
  const [firstName, setFirstName] = useState(cachedName[0] || '');
  const [lastName, setLastName] = useState(cachedName.slice(1).join(' '));
  const [phone, setPhone] = useState(getStorageItem(STORAGE_KEYS.profile.phone, '+998 90 123 45 67'));
  const [email, setEmail] = useState(getStorageItem(STORAGE_KEYS.profile.email, ''));
  const [role, setRole] = useState('Администратор');
  const [avatar, setAvatar] = useState(getStorageItem(STORAGE_KEYS.profile.avatar));
  
  // These preferences do not exist in UserSerializer yet, so they remain local-only.
  const localSettings = readJsonStorage(STORAGE_KEYS.profile.localAccountSettings, {});
  const [notifs, setNotifs] = useState({
    email: localSettings.adminNotifications?.email ?? true,
    sms: localSettings.adminNotifications?.sms ?? false,
    push: localSettings.adminNotifications?.push ?? true,
  });
  const fileInputRef = useRef(null);

  useEffect(() => {
    let active = true;
    api.get('/api/auth/profile/')
      .then((response) => {
        if (!active) return;
        const profile = normalizeProfile(response.data);
        setFirstName(profile.first_name);
        setLastName(profile.last_name);
        setPhone(profile.phone_number);
        setEmail(profile.email);
        setAvatar(profile.avatar);
        setRole(profile.role || 'admin');
        cacheProfile(profile);
      })
      .catch((error) => {
        if (active) setProfileError(getApiErrorMessage(error, 'Не удалось загрузить профиль'));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => { active = false; };
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setProfileError('');
    setIsSaved(false);

    if (activeTab !== 'profile') {
      // Password and integration controls have no backend contract. Never send them to UserSerializer.
      if (activeTab === 'notifications') {
        const currentLocalSettings = readJsonStorage(STORAGE_KEYS.profile.localAccountSettings, {});
        writeJsonStorage(STORAGE_KEYS.profile.localAccountSettings, {
          ...currentLocalSettings,
          adminNotifications: notifs,
        });
      }
      setIsSaving(false);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
      return;
    }

    try {
      const response = await api.patch('/api/auth/profile/', {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        phone_number: phone.trim(),
        avatar,
      });
      const profile = cacheProfile(response.data);
      setFirstName(profile.first_name);
      setLastName(profile.last_name);
      setPhone(profile.phone_number);
      setEmail(profile.email);
      setAvatar(profile.avatar);
      setRole(profile.role || role);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (error) {
      setProfileError(getApiErrorMessage(error, 'Не удалось сохранить профиль'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatar(null);
  };

  const getInitials = (n) => {
    const parts = n.trim().split(/\s+/).filter(Boolean);
    if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
    return (n || 'AD').slice(0, 2).toUpperCase();
  };

  const fullName = `${firstName} ${lastName}`.trim();

  return (
    <div className="adm-anim adm-anim-1" style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 24, alignItems: 'start' }}>
      
      {/* Sidebar Navigation */}
      <div className="adm-card" style={{ padding: '20px 12px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-muted)', marginBottom: 12, paddingLeft: 12 }}>
          Настройки
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {TABS.map(t => (
            <button 
              key={t.id} 
              onClick={() => setActiveTab(t.id)} 
              style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', padding: '12px 14px', borderRadius: 10, border: 'none', background: activeTab === t.id ? 'var(--navy)' : 'transparent', color: activeTab === t.id ? '#fff' : 'var(--text)', fontSize: 14, fontWeight: activeTab === t.id ? 600 : 500, cursor: 'pointer', transition: 'all 0.15s' }}
            >
              <span style={{ color: activeTab === t.id ? '#fff' : 'var(--text-muted)', display: 'flex' }}>
                {ICONS[t.icon]}
              </span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="adm-card" style={{ minHeight: 500 }}>
        
        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div>
            <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px 0' }}>Личные данные</h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Управляйте информацией о себе и фотографией профиля.</p>
              {isLoading && <p role="status" style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>Загрузка профиля...</p>}
              {profileError && <p role="alert" style={{ fontSize: 13, color: '#b91c1c', marginTop: 8 }}>{profileError}</p>}
              {isSaved && activeTab === 'profile' && <p role="status" style={{ fontSize: 13, color: '#166534', marginTop: 8 }}>Профиль сохранён в backend.</p>}
            </div>
            
            <div style={{ padding: '32px' }}>
              {/* Avatar Section */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 32 }}>
                <div style={{ position: 'relative' }}>
                  <div style={{ width: 100, height: 100, borderRadius: '50%', background: avatar ? `url(${avatar}) center/cover` : 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 32, fontWeight: 700, overflow: 'hidden', border: '4px solid #fff', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                    {!avatar && getInitials(fullName)}
                  </div>
                  <button 
                    onClick={() => fileInputRef.current.click()}
                    style={{ position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderRadius: '50%', background: 'var(--orange)', color: '#fff', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
                    title="Изменить фото"
                  >
                    {ICONS.camera}
                  </button>
                  <input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/*" style={{ display: 'none' }} />
                </div>
                <div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button className="adm-btn adm-btn-outline" onClick={() => fileInputRef.current.click()} style={{ padding: '8px 16px', fontSize: 13 }}>Загрузить новое</button>
                    {avatar && <button className="adm-btn adm-btn-ghost" onClick={handleRemoveAvatar} style={{ padding: '8px 16px', fontSize: 13, color: '#dc2626' }}>Удалить</button>}
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, marginBottom: 0 }}>Рекомендуется квадратное изображение не менее 200x200px (JPG, PNG).</p>
                </div>
              </div>

              {/* Form Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text)' }}>Имя</label>
                  <input value={firstName} onChange={e => setFirstName(e.target.value)} disabled={isLoading || isSaving} style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border)', fontSize: 14, fontFamily: 'Inter,sans-serif', outline: 'none' }} onFocus={e => { e.target.style.borderColor = 'var(--navy)'; e.target.style.boxShadow = '0 0 0 3px rgba(41,74,109,0.1)'; }} onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text)' }}>Фамилия</label>
                  <input value={lastName} onChange={e => setLastName(e.target.value)} disabled={isLoading || isSaving} style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border)', fontSize: 14, fontFamily: 'Inter,sans-serif', outline: 'none' }} onFocus={e => { e.target.style.borderColor = 'var(--navy)'; e.target.style.boxShadow = '0 0 0 3px rgba(41,74,109,0.1)'; }} onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text)' }}>Роль в системе</label>
                  <input value={role} readOnly style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border)', fontSize: 14, fontFamily: 'Inter,sans-serif', outline: 'none', background: 'var(--cream)', color: 'var(--text-muted)', fontWeight: 600 }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text)' }}>Email адрес</label>
                  <input value={email} onChange={e => setEmail(e.target.value)} disabled={isLoading || isSaving} style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border)', fontSize: 14, fontFamily: 'Inter,sans-serif', outline: 'none' }} onFocus={e => { e.target.style.borderColor = 'var(--navy)'; e.target.style.boxShadow = '0 0 0 3px rgba(41,74,109,0.1)'; }} onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text)' }}>Номер телефона</label>
                  <input value={phone} onChange={e => setPhone(e.target.value)} disabled={isLoading || isSaving} style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border)', fontSize: 14, fontFamily: 'Inter,sans-serif', outline: 'none' }} onFocus={e => { e.target.style.borderColor = 'var(--navy)'; e.target.style.boxShadow = '0 0 0 3px rgba(41,74,109,0.1)'; }} onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div>
            <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px 0' }}>Безопасность</h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Настройки пароля и защиты аккаунта.</p>
            </div>
            <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 500 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text)' }}>Текущий пароль</label>
                <input type="password" placeholder="••••••••" style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border)', fontSize: 14, fontFamily: 'Inter,sans-serif', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text)' }}>Новый пароль</label>
                <input type="password" placeholder="••••••••" style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border)', fontSize: 14, fontFamily: 'Inter,sans-serif', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text)' }}>Подтвердите новый пароль</label>
                <input type="password" placeholder="••••••••" style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border)', fontSize: 14, fontFamily: 'Inter,sans-serif', outline: 'none' }} />
              </div>
              <button className="adm-btn adm-btn-outline" style={{ alignSelf: 'flex-start', marginTop: 8 }}>Обновить пароль</button>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div>
            <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px 0' }}>Уведомления</h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Выберите, как и о чём вы хотите получать уведомления.</p>
            </div>
            <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: 24 }}>
              {[
                { key: 'email', title: 'Email уведомления', desc: 'Получать отчёты и новости платформы на почту' },
                { key: 'sms', title: 'SMS уведомления', desc: 'Получать SMS при новых бронированиях (платно)' },
                { key: 'push', title: 'Push в браузере', desc: 'Получать мгновенные уведомления прямо в браузере' }
              ].map(item => (
                <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', border: '1px solid var(--border)', borderRadius: 12 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{item.title}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{item.desc}</div>
                  </div>
                  <div 
                    onClick={() => setNotifs(p => ({...p, [item.key]: !p[item.key]}))}
                    style={{ width: 44, height: 24, borderRadius: 12, background: notifs[item.key] ? 'var(--orange)' : 'var(--cream-2)', position: 'relative', cursor: 'pointer', transition: 'background 0.3s' }}
                  >
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: notifs[item.key] ? 22 : 2, transition: 'left 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Integrations Tab */}
        {activeTab === 'integrations' && (
          <div>
            <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px 0' }}>Интеграции и API</h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Настройка внешних сервисов и доступов.</p>
            </div>
            <div style={{ padding: '32px', display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>
              <div style={{ padding: '20px', border: '1px solid var(--border)', borderRadius: 12, background: 'var(--cream-2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 8, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>💬</div>
                  <div><div style={{ fontSize: 16, fontWeight: 700 }}>Eskiz SMS Gateway</div><div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Отправка OTP кодов и уведомлений клиентам</div></div>
                </div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text)' }}>API Ключ (Bearer Token)</label>
                <input type="password" placeholder="ey..." defaultValue="ey..." style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border)', fontSize: 14, fontFamily: 'Inter,sans-serif', outline: 'none' }} />
              </div>

              <div style={{ padding: '20px', border: '1px solid var(--border)', borderRadius: 12, background: 'var(--cream-2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 8, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>✈️</div>
                  <div><div style={{ fontSize: 16, fontWeight: 700 }}>Telegram Bot API</div><div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Уведомления админам в Telegram</div></div>
                </div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text)' }}>Bot Token</label>
                <input type="password" placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11" style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border)', fontSize: 14, fontFamily: 'Inter,sans-serif', outline: 'none' }} />
              </div>

              <div style={{ padding: '20px', border: '1px solid var(--border)', borderRadius: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 8, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>⚙️</div>
                  <div><div style={{ fontSize: 16, fontWeight: 700 }}>Главный Backend (Django)</div><div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Базовый URL для всех API запросов дашборда</div></div>
                </div>
                <input value={`${API_BASE_URL}/api`} readOnly style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border)', fontSize: 14, fontFamily: 'Inter,sans-serif', outline: 'none', background: 'var(--cream)' }} />
              </div>
            </div>
          </div>
        )}

        {/* Global Save footer */}
        <div style={{ padding: '20px 32px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }}>
          <button 
            className="adm-btn adm-btn-primary" 
            onClick={handleSave} 
            disabled={isSaving || isLoading}
            style={{ padding: '10px 28px', background: isSaved ? '#16a34a' : 'var(--orange)', transition: 'background 0.3s' }}
          >
            {isSaving ? 'Сохранение...' : isSaved ? '✓ Сохранено' : 'Сохранить изменения'}
          </button>
        </div>

      </div>
    </div>
  );
}
