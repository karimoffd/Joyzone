import { Icon, Header, SelectionCard, CounterRow } from "./partnerOnboarding/parts.jsx";
import { AddressStep } from "./partnerOnboarding/AddressStep.jsx";
import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import api, { getAccessToken, getApiErrorMessage, withUploadTimeout } from "../api/client.js";
import { getStorageItem, removeStorageItem, STORAGE_KEYS } from "../utils/storageKeys.js";
import {
  buildPlacePayload,
  groupOnboardingErrors,
  mapPlaceApiErrors,
  validateOnboarding,
  validateOnboardingStep,
} from "../utils/placeOnboarding.js";
import "./PartnerOnboarding.css";
import "./CardVariants.css";
import { navigate } from "../utils/router.js";

export default function PartnerOnboarding() {
  const [step, setStep] = useState(0);
  const [categories, setCategories] = useState([]);
  const [categoriesError, setCategoriesError] = useState(null);
  const [allParameters, setAllParameters] = useState([]);
  const [paramGroups, setParamGroups] = useState([]);
  const [objectType, setObjectType] = useState(null); // Category ID
  const [accessType, setAccessType] = useState(null); // SubCategory ID
  
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState(41.2995);
  const [lng, setLng] = useState(69.2401);
  const [addressConfirmed, setAddressConfirmed] = useState(false);
  
  const [addressDetails, setAddressDetails] = useState({
    country: "Узбекистан - UZ",
    street: "",
    apartment: "",
    city: "Tashkent",
    province: "Tashkent",
    zip: "100017"
  });
  
  const [spaceTitle, setSpaceTitle] = useState("");
  const [descUz, setDescUz] = useState("");
  const [descRu, setDescRu] = useState("");
  const [descEn, setDescEn] = useState("");
  const [activeDescTab, setActiveDescTab] = useState("ru");
  
  const [capacity, setCapacity] = useState(10);
  const [area, setArea] = useState(50);
  const [customCounters, setCustomCounters] = useState({});
  const [customSelects, setCustomSelects] = useState({});
  const [amenities, setAmenities] = useState([]);
  
  const [prices, setPrices] = useState({ soatlik: "", kunlik: "", haftalik: "", oylik: "" });
  const [enabledPrices, setEnabledPrices] = useState({ soatlik: false, kunlik: false, haftalik: false, oylik: false });
  
  const [photos, setPhotos] = useState([]);
  const [bookingType, setBookingType] = useState("request");
  const [selectedDiscountIds, setSelectedDiscountIds] = useState([]);
  const [apiDiscounts, setApiDiscounts] = useState([]);
  const [profile, setProfile] = useState(null);
  const [activePreviewImage, setActivePreviewImage] = useState(0);
  const [toast, setToast] = useState({ open: false, message: "", type: "success" });
  const [stepErrors, setStepErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [editPlaceId, setEditPlaceId] = useState(() => getStorageItem(STORAGE_KEYS.workflow.editPlaceId));
  const [originalPlaceStatus, setOriginalPlaceStatus] = useState(null);
  const [moderationConfirmOpen, setModerationConfirmOpen] = useState(false);

  const showToast = (message, type = "success") => {
    setToast({ open: true, message, type });
    setTimeout(() => setToast({ open: false, message: "", type: "success" }), 4000);
  };

  const screenRef = useRef(null);

  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      api.get("/api/auth/profile/", {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => setProfile(res.data))
      .catch(err => showToast(getApiErrorMessage(err, "Не удалось загрузить профиль партнёра"), "error"));
    }

    api.get("/api/categories/", { skipAuth: true })
      .then(res => {
         setCategories(res.data?.results || res.data || []);
         setCategoriesError(null);
      })
      .catch(err => {
         setCategoriesError(getApiErrorMessage(err, "Не удалось загрузить категории"));
      });
      
    api.get("/api/parameters/", { skipAuth: true })
      .then(res => setAllParameters(res.data?.results || res.data || []))
      .catch(err => console.log("No params endpoint, ignoring", err));
      
    api.get("/api/parameter-groups/", { skipAuth: true })
      .then(res => setParamGroups(res.data?.results || res.data || []))
      .catch(err => console.log("No param groups endpoint, ignoring", err));

    api.get("/api/discounts/", { skipAuth: true })
      .then(res => setApiDiscounts(res.data?.results || res.data || []))
      .catch(err => console.log("No discounts endpoint yet", err));
  }, []);

  useEffect(() => {
    const editId = editPlaceId;
    if (editId) {
      api.get(`/api/places/${editId}/`, {
        headers: { Authorization: `Bearer ${getAccessToken()}` }
      })
      .then(res => {
        const p = res.data;
        setOriginalPlaceStatus(p.status || null);
        setSpaceTitle(p.title || "");
        setDescRu(p.description_ru || "");
        setDescUz(p.description_uz || "");
        setDescEn(p.description_en || "");
        setAddress(p.location || "");
        setAddressConfirmed(Boolean(p.location));
        setLat(p.latitude || 41.311081);
        setLng(p.longitude || 69.240562);
        setCapacity(p.people || 0);
        setArea(p.area || 0);
        setBookingType(p.booking_type || "request");
        setAmenities(p.amenities || []);
        
        const counters = {};
        const selects = {};
        if (p.characteristics) {
          Object.keys(p.characteristics).forEach(k => {
            const val = p.characteristics[k];
            if (typeof val === 'number') {
              counters[k] = val;
            } else {
              selects[k] = val;
            }
          });
        }
        setCustomCounters(counters);
        setCustomSelects(selects);
        
        const loadedPrices = {
          soatlik: p.prices?.soatlik ?? p.price_hourly ?? "",
          kunlik: p.prices?.kunlik ?? p.price_daily ?? "",
          haftalik: p.prices?.haftalik ?? p.price_weekly ?? "",
          oylik: p.prices?.oylik ?? p.price_monthly ?? "",
        };
        setPrices(loadedPrices);
        setEnabledPrices(Object.fromEntries(
          Object.entries(loadedPrices).map(([key, value]) => [key, value !== "" && value !== null]),
        ));
        
        const savedDiscountIds = p.discount_ids || p.discounts;
        if (Array.isArray(savedDiscountIds)) {
          setSelectedDiscountIds(savedDiscountIds.map(item => (
            typeof item === "object" && item !== null ? item.id : item
          )).filter(Boolean));
        }
        
        if (p.images) {
          setPhotos(p.images.map(img => ({
            id: Math.random().toString(36).substring(7),
            name: "Uploaded Image",
            url: img
          })));
        }
        
        if (p.subcategory_info) {
          const subcategoryCategory = p.subcategory_info.category;
          const categoryId = typeof subcategoryCategory === "object"
            ? subcategoryCategory?.id
            : subcategoryCategory;
          setObjectType(categoryId || null);
          setAccessType(p.subcategory_info.id || null);
        }
        
        setStep(1); // Skip introduction welcome step when editing
      })
      .catch(err => {
        showToast(getApiErrorMessage(err, "Не удалось загрузить место для редактирования"), "error");
        removeStorageItem(STORAGE_KEYS.workflow.editPlaceId);
        const returnHash = getStorageItem(STORAGE_KEYS.workflow.editPlaceReturnHash);
        removeStorageItem(STORAGE_KEYS.workflow.editPlaceReturnHash);
        setEditPlaceId(null);
        if (returnHash) {
          window.setTimeout(() => { navigate(returnHash); }, 1200);
        }
      });
    }
  }, [editPlaceId]);

  const selectedCategory = categories.find(c => c.id === objectType);
  const selectedSubCategory = selectedCategory?.subcategories?.find(s => s.id === accessType);
  
  
  const subCatParams = selectedSubCategory?.parameters || [];
  const counterParams = subCatParams.filter(p => p.type === 'counter');
  
  // Fallback to all parameters if subCatParams is empty (backend might not have linked them)
  const booleanParams = subCatParams.some(p => p.type === 'boolean') 
    ? subCatParams.filter(p => p.type === 'boolean') 
    : allParameters.filter(p => p.type === 'boolean');
    
  const selectParams = subCatParams.filter(p => p.type === 'select');

  const maxStep = 13;

  const getFormData = () => ({
    objectType,
    accessType,
    address,
    lat,
    lng,
    addressConfirmed,
    addressDetails,
    photos,
    spaceTitle,
    descRu,
    descUz,
    descEn,
    capacity,
    area,
    customCounters,
    customSelects,
    amenities,
    prices,
    enabledPrices,
    bookingType,
    selectedDiscountIds,
  });

  const focusDescriptionError = (errors) => {
    if (errors.some(item => item.field === "description_uz")) setActiveDescTab("uz");
    else if (errors.some(item => item.field === "description_en")) setActiveDescTab("en");
    else if (errors.some(item => item.field === "description_ru")) setActiveDescTab("ru");
  };

  const handleNext = () => {
    const errors = validateOnboardingStep(step, getFormData());
    if (errors.length > 0) {
      setStepErrors(prev => ({ ...prev, [step]: errors.map(item => item.message) }));
      focusDescriptionError(errors);
      showToast(errors[0].message, "error");
      return;
    }
    setStepErrors(prev => ({ ...prev, [step]: [] }));
    setStep(step + 1);
  };

  useEffect(() => {
    if (!screenRef.current) return;
    gsap.fromTo(screenRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4 });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  useEffect(() => {
    if (!document.getElementById("lottie-script")) {
      const script = document.createElement("script");
      script.id = "lottie-script";
      script.src = "https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js";
      document.head.appendChild(script);
    }
  }, []);

  const addFiles = (fileList) => {
    const files = Array.from(fileList || []).filter((file) => file.type.startsWith("image/"));
    if (files.length === 0) return;
    const availableSlots = Math.max(0, 10 - photos.length);
    const acceptedFiles = files.slice(0, availableSlots);
    if (acceptedFiles.length < files.length) {
      showToast("Для одного объекта можно загрузить не более 10 фотографий.", "error");
    }
    const newPhotos = acceptedFiles.map((file) => ({
      id: Math.random().toString(36).substring(7),
      name: file.name,
      url: URL.createObjectURL(file),
      file: file
    }));
    setPhotos(prev => [...prev, ...newPhotos]);
  };

  const isPrivilegedEditor = Boolean(
    profile?.role === "admin"
    || profile?.role === "moderator"
    || profile?.is_staff
    || profile?.is_superuser,
  );
  const requiresRemoderationConfirmation = Boolean(
    editPlaceId && originalPlaceStatus === "approved" && !isPrivilegedEditor,
  );

  const handleBooking = async ({ moderationConfirmed = false } = {}) => {
    const formData = getFormData();
    const validationErrors = validateOnboarding(formData);
    if (validationErrors.length > 0) {
      const groupedErrors = groupOnboardingErrors(validationErrors);
      const firstStep = Math.min(...validationErrors.map(item => item.step));
      setStepErrors(groupedErrors);
      setStep(firstStep);
      focusDescriptionError(validationErrors.filter(item => item.step === firstStep));
      showToast(validationErrors[0].message, "error");
      return;
    }

    if (requiresRemoderationConfirmation && !moderationConfirmed) {
      setModerationConfirmOpen(true);
      return;
    }

    setModerationConfirmOpen(false);
    setSubmitting(true);
    try {
      showToast("Загрузка фотографий и отправка объекта...", "info");
      
      // 1. Upload images to backend
      const uploadedImageUrls = [];
      for (const photo of photos) {
        if (photo.file) {
          const formData = new FormData();
          formData.append("image", photo.file);
          const uploadRes = await api.post("/api/places/upload_image/", formData, withUploadTimeout({
            headers: {
              "Content-Type": "multipart/form-data"
            }
          }));
          if (uploadRes.data?.url) {
            uploadedImageUrls.push(uploadRes.data.url);
          }
        } else {
          uploadedImageUrls.push(photo.url);
        }
      }

      const payload = buildPlacePayload(formData, uploadedImageUrls);

      const token = getAccessToken();
      const editId = editPlaceId;
      
      let response;
      if (editId) {
        response = await api.put(`/api/places/${editId}/`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        response = await api.post("/api/places/", payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      const shouldBecomePending = !editId || !isPrivilegedEditor;
      if (shouldBecomePending && response.data?.status !== "pending") {
        throw new Error("Backend не вернул ожидаемый статус pending.");
      }

      if (editId) {
        removeStorageItem(STORAGE_KEYS.workflow.editPlaceId); // Clear edit mode
        setEditPlaceId(null);
        if (requiresRemoderationConfirmation) {
          showToast("Объект отправлен на повторную модерацию.", "success");
        } else if (isPrivilegedEditor) {
          showToast("Изменения объекта сохранены.", "success");
        } else {
          showToast("Объект обновлён и отправлен на модерацию.", "success");
        }
      } else {
        showToast("Объект успешно отправлен на модерацию!", "success");
      }
      
      const returnHash = getStorageItem(STORAGE_KEYS.workflow.editPlaceReturnHash);
      removeStorageItem(STORAGE_KEYS.workflow.editPlaceReturnHash);
      setTimeout(() => {
        navigate(returnHash || "/host-listings");
        window.setTimeout(() => {
          window.dispatchEvent(new CustomEvent("joyzone-place-saved", {
            detail: { id: response.data?.id, status: response.data?.status },
          }));
        }, 500);
      }, 2000);
    } catch(err) {
      const backendErrors = mapPlaceApiErrors(err.response?.data);
      if (backendErrors.length > 0) {
        const groupedErrors = groupOnboardingErrors(backendErrors);
        const firstStep = Math.min(...backendErrors.map(item => item.step));
        setStepErrors(prev => ({ ...prev, ...groupedErrors }));
        setStep(firstStep);
        focusDescriptionError(backendErrors.filter(item => item.step === firstStep));
        showToast(backendErrors[0].message, "error");
      } else {
        showToast("Ошибка при публикации: " + getApiErrorMessage(err, "Не удалось сохранить место"), "error");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const renderLivePreview = (inputs) => {
    const selectedCategory = categories.find(c => c.id === objectType);
    const selectedSubCategory = selectedCategory?.subcategories?.find(s => s.id === accessType);
    const isDescriptionStep = step === 7;

    const formatAddress = (addr) => {
      if (!addr) return "";
      const parts = addr.split(",");
      if (parts.length <= 2) return addr;
      return parts.slice(0, 2).join(",").trim();
    };

    const shortAddress = formatAddress(address);
    
    return (
      <div className="onboarding-preview-container">
        <div className="onboarding-inputs-side">
          {inputs}
        </div>
        <div className="onboarding-preview-side">
          {isDescriptionStep ? (
            <div className="space-detail-preview-box" style={{ width: "100%", textAlign: "left", fontFamily: "'Inter', sans-serif" }}>
              <span className="onboarding-preview-title" style={{ marginBottom: "20px" }}>Экран описания (Space Details)</span>
              <h1 style={{ fontSize: "28px", fontWeight: 850, color: "#12283f", margin: "0 0 12px 0", lineHeight: "1.2", wordBreak: "break-word" }}>
                {spaceTitle || "Название вашего пространства"}
              </h1>
              <p style={{ color: "#65717d", fontSize: "14px", fontWeight: 600, margin: "0 0 24px 0" }}>
                📍 {shortAddress || "Адрес еще не выбран на карте"}
              </p>
              <hr style={{ border: "none", borderTop: "1px solid #eef2f6", margin: "24px 0" }} />
              <h3 style={{ fontSize: "20px", fontWeight: 900, color: "#12283f", margin: "0 0 12px 0" }}>
                {activeDescTab === "uz" ? "Tavsif" : activeDescTab === "en" ? "Description" : "Описание"}
              </h3>
              <p className="sd-description" style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {(activeDescTab === "ru" ? descRu : activeDescTab === "uz" ? descUz : descEn) || 
                 "Здесь будет описание вашего потрясающего пространства. Расскажите резидентам о преимуществах, оборудовании и атмосфере."}
              </p>
            </div>
          ) : (
            <div style={{ width: "100%" }}>
              <span className="onboarding-preview-title">Предпросмотр в поиске (Search Card)</span>
              <article className="variant-card variant-estate" style={{ width: "100%", transform: "none", animation: "none", transition: "none", margin: 0 }}>
                <div className="variant-media" style={{ aspectRatio: 1.35 }}>
                  {photos.length > 0 ? (
                    photos.map((photo, idx) => (
                      <img
                        key={photo.id}
                        src={photo.url}
                        alt="Preview"
                        className={idx === activePreviewImage ? "is-active" : ""}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ))
                  ) : (
                    <img
                      src="/partner-parameters.jpg"
                      alt="Preview"
                      className="is-active"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  )}
                  <span className="property-slide-glow" />
                  <span className="variant-pill">Guest favourite</span>
                  <button
                    type="button"
                    className="variant-save-button"
                    style={{ zIndex: 20, position: "absolute", top: "16px", right: "16px", pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <svg viewBox="0 0 24 24" style={{ width: "18px", height: "18px", fill: "none", stroke: "currentColor", strokeWidth: 2.2, color: "#1e293b" }}><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                  </button>

                  {photos.length > 1 && (
                    <div className="variant-dots" style={{ zIndex: 20 }}>
                      {photos.map((_, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className={idx === activePreviewImage ? "is-active" : ""}
                          onClick={() => setActivePreviewImage(idx)}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <div className="variant-body" style={{ padding: "20px 0", width: "100%", display: "flex", flexDirection: "column", alignItems: "flex-start", textAlign: "left" }}>
                  <div className="variant-title-row" style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "8px", width: "100%", alignItems: "flex-start", textAlign: "left" }}>
                    <h3 style={{
                      fontSize: "18px",
                      fontWeight: 800,
                      color: "#1e293b",
                      margin: 0,
                      textAlign: "left",
                      width: "100%",
                      wordBreak: "break-word",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      lineHeight: "1.3"
                    }}>
                      {spaceTitle || "Название вашего пространства"}
                    </h3>
                  </div>
                  <p style={{ color: "#64748b", fontSize: "14px", margin: 0, textAlign: "left", width: "100%", wordBreak: "break-word" }}>
                    {shortAddress || "Адрес еще не выбран на карте"}
                  </p>
                </div>
              </article>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <main className="partner-onboarding-page">
      <Header profile={profile} />
      <section ref={screenRef} className={`partner-onboarding-screen screen-${step}`}>
        {step > 0 && stepErrors[step]?.length > 0 && (
          <div
            role="alert"
            style={{
              maxWidth: 1200,
              margin: "0 auto 20px",
              padding: "12px 16px",
              border: "1px solid #fca5a5",
              borderRadius: 12,
              background: "#fef2f2",
              color: "#991b1b",
              fontSize: 14,
              lineHeight: 1.5,
            }}
          >
            {stepErrors[step].map((message, index) => <div key={`${message}-${index}`}>{message}</div>)}
          </div>
        )}
        {step === 0 && (
          <div style={{display: 'grid', gridTemplateColumns: '1.3fr 1fr', alignItems: 'center', maxWidth: 1200, margin: '0 auto', padding: '100px 20px', gap: 60}}>
             <div style={{textAlign: 'left', paddingRight: 40}}>
               <h1 style={{fontSize: 54, marginBottom: 24, lineHeight: 1.1, fontWeight: 800, color: '#0f172a'}}>Начните зарабатывать на своих пространствах</h1>
               <p style={{fontSize: 20, color: '#475569', marginBottom: 40, lineHeight: 1.6}}>Разместите свой офис, коворкинг или конференц-зал и находите резидентов без усилий.</p>
               <button data-testid="onboarding-start" className="onboarding-start-btn" onClick={() => setStep(1)} style={{padding: '16px 48px', fontSize: 20, borderRadius: 12}}>Начать</button>
             </div>
             <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
                <style>
                  {`
                    @keyframes floatIllus {
                      0% { transform: translateY(0px); }
                      50% { transform: translateY(-20px); }
                      100% { transform: translateY(0px); }
                    }
                  `}
                </style>
                <img 
                  src="/partner-illustration.jpg" 
                  alt="Coworking Space Illustration" 
                  style={{
                    width: '100%', 
                    maxWidth: '500px', 
                    borderRadius: '24px', 
                    boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                    animation: 'floatIllus 4s ease-in-out infinite'
                  }} 
                />
             </div>
          </div>
        )}

        {step === 1 && (
          <div className="selection-layout">
            <div><p className="partner-eyebrow">Тип объекта</p><h1>Что вы хотите разместить?</h1></div>
            {categoriesError && <p style={{color: 'red', marginTop: 20}}>Ошибка: {categoriesError}</p>}
            {categories.length === 0 && !categoriesError && <p style={{marginTop: 20}}>Загрузка...</p>}
            <div className="object-type-grid">
              {categories.map(c => (
                <SelectionCard key={c.id} item={c} active={objectType === c.id} onClick={() => { setObjectType(c.id); setAccessType(null); }} />
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="selection-layout access-layout">
            <div><p className="partner-eyebrow">Подкатегория</p><h1>Выберите формат объекта</h1></div>
            <div className="access-type-list">
              {selectedCategory?.subcategories?.map(s => (
                <SelectionCard key={s.id} item={s} active={accessType === s.id} onClick={() => setAccessType(s.id)} />
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <AddressStep address={address} setAddress={setAddress} lat={lat} setLat={setLat} lng={lng} setLng={setLng} confirmed={addressConfirmed} setConfirmed={setAddressConfirmed} />
        )}

        {step === 4 && (
          <div style={{display: 'grid', gridTemplateColumns: '1.2fr 1fr', alignItems: 'start', maxWidth: 1200, margin: '0 auto', gap: 60, paddingBottom: 40}}>
            <div style={{textAlign: 'left', position: 'sticky', top: 120}}>
              <div className="details-section-head">
                <p className="partner-eyebrow">Адрес</p>
                <h1>Подтвердите адрес</h1>
              </div>
              <p style={{fontSize: 16, color: '#64748b', marginTop: 16, maxWidth: 400, lineHeight: 1.6}}>
                Проверьте, всё ли указано верно. Точный адрес и дополнительные данные (номер офиса, этаж) помогут резидентам быстрее находить ваше пространство.
              </p>
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 10}}>
                <label style={{display: 'flex', flexDirection: 'column', gap: 8}}>
                  <span style={{fontSize: 14, fontWeight: 600, color: '#475569'}}>Страна/регион</span>
                  <select value={addressDetails.country} onChange={e => setAddressDetails({...addressDetails, country: e.target.value})} style={{padding: '16px', borderRadius: 12, border: '1.5px solid #cbd5e1', fontSize: 16, backgroundColor: '#f8fafc', outline: 'none', transition: 'border-color 0.2s'}} onFocus={e => e.target.style.borderColor = '#0f172a'} onBlur={e => e.target.style.borderColor = '#cbd5e1'}>
                    <option>Узбекистан - UZ</option>
                  </select>
                </label>
                
                <label style={{display: 'flex', flexDirection: 'column', gap: 8}}>
                  <span style={{fontSize: 14, fontWeight: 600, color: '#475569'}}>Улица, дом</span>
                  <input data-testid="onboarding-street" value={addressDetails.street} onChange={e => setAddressDetails({...addressDetails, street: e.target.value})} style={{padding: '16px', borderRadius: 12, border: '1.5px solid #cbd5e1', fontSize: 16, backgroundColor: '#f8fafc', outline: 'none', transition: 'border-color 0.2s'}} onFocus={e => e.target.style.borderColor = '#0f172a'} onBlur={e => e.target.style.borderColor = '#cbd5e1'} />
                </label>

                <label style={{display: 'flex', flexDirection: 'column', gap: 8}}>
                  <span style={{fontSize: 14, fontWeight: 600, color: '#475569'}}>Квартира, этаж, корпус (если применимо)</span>
                  <input value={addressDetails.apartment} onChange={e => setAddressDetails({...addressDetails, apartment: e.target.value})} style={{padding: '16px', borderRadius: 12, border: '1.5px solid #cbd5e1', fontSize: 16, backgroundColor: '#f8fafc', outline: 'none', transition: 'border-color 0.2s'}} onFocus={e => e.target.style.borderColor = '#0f172a'} onBlur={e => e.target.style.borderColor = '#cbd5e1'} />
                </label>

                <label style={{display: 'flex', flexDirection: 'column', gap: 8}}>
                  <span style={{fontSize: 14, fontWeight: 600, color: '#475569'}}>Город/деревня</span>
                  <input value={addressDetails.city} onChange={e => setAddressDetails({...addressDetails, city: e.target.value})} style={{padding: '16px', borderRadius: 12, border: '1.5px solid #cbd5e1', fontSize: 16, backgroundColor: '#f8fafc', outline: 'none', transition: 'border-color 0.2s'}} onFocus={e => e.target.style.borderColor = '#0f172a'} onBlur={e => e.target.style.borderColor = '#cbd5e1'} />
                </label>

                <label style={{display: 'flex', flexDirection: 'column', gap: 8}}>
                  <span style={{fontSize: 14, fontWeight: 600, color: '#475569'}}>Провинция/штат/территория (если есть)</span>
                  <input value={addressDetails.province} onChange={e => setAddressDetails({...addressDetails, province: e.target.value})} style={{padding: '16px', borderRadius: 12, border: '1.5px solid #cbd5e1', fontSize: 16, backgroundColor: '#f8fafc', outline: 'none', transition: 'border-color 0.2s'}} onFocus={e => e.target.style.borderColor = '#0f172a'} onBlur={e => e.target.style.borderColor = '#cbd5e1'} />
                </label>

                <label style={{display: 'flex', flexDirection: 'column', gap: 8}}>
                  <span style={{fontSize: 14, fontWeight: 600, color: '#475569'}}>Индекс (если применимо)</span>
                  <input value={addressDetails.zip} onChange={e => setAddressDetails({...addressDetails, zip: e.target.value})} style={{padding: '16px', borderRadius: 12, border: '1.5px solid #cbd5e1', fontSize: 16, backgroundColor: '#f8fafc', outline: 'none', transition: 'border-color 0.2s'}} onFocus={e => e.target.style.borderColor = '#0f172a'} onBlur={e => e.target.style.borderColor = '#cbd5e1'} />
                </label>
                
                <div style={{color: '#ef4444', fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8, marginTop: 8}}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                  Проверьте, всё ли указано верно.
                </div>
            </div>
          </div>
        )}

        {step === 6 && renderLivePreview(
          <div className="text-detail-layout" style={{paddingBottom: 40}}>
            <div className="details-section-head">
              <h1>Придумайте, как будет называться дом</h1>
              <p style={{fontSize: 16, color: '#64748b'}}>Краткое название — то, что нужно. Не беспокойтесь, вы всегда сможете отредактировать его.</p>
            </div>
            
            <div style={{display: 'flex', flexDirection: 'column', gap: 32, marginTop: 24}}>
              <label style={{display: 'flex', flexDirection: 'column', gap: 10}}>
                <textarea 
                  data-testid="onboarding-title"
                  rows={4}
                  value={spaceTitle} 
                  maxLength={50} 
                  onChange={e => setSpaceTitle(e.target.value)} 
                  style={{padding: '24px', borderRadius: 16, border: '1.5px solid #cbd5e1', fontSize: 28, fontWeight: 600, backgroundColor: '#fff', transition: 'border-color 0.2s', outline: 'none', resize: 'none'}}
                  onFocus={e => e.target.style.borderColor = '#0f172a'}
                  onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                />
                <div style={{textAlign: 'left', color: '#64748b', fontSize: 14, fontWeight: 600}}>{spaceTitle.length}/50</div>
              </label>
            </div>
          </div>
        )}

        {step === 7 && renderLivePreview(
          <div className="text-detail-layout" style={{paddingBottom: 40}}>
            <div className="details-section-head">
              <h1>Составьте описание</h1>
              <p style={{fontSize: 16, color: '#64748b'}}>Расскажите, что делает ваше жилье особенным.</p>
            </div>
            
            <div style={{display: 'flex', flexDirection: 'column', gap: 24, marginTop: 24}}>
              <div style={{display: 'flex', gap: 8, background: '#f1f5f9', padding: 6, borderRadius: 12, width: 'fit-content'}}>
                {[{id: 'ru', label: 'Русский'}, {id: 'uz', label: "O'zbekcha"}, {id: 'en', label: 'English'}].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    data-testid={`onboarding-description-tab-${tab.id}`}
                    onClick={() => setActiveDescTab(tab.id)}
                    style={{
                      padding: '10px 20px',
                      borderRadius: 10,
                      fontSize: 14,
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                      background: activeDescTab === tab.id ? '#fff' : 'transparent',
                      color: activeDescTab === tab.id ? '#0f172a' : '#64748b',
                      boxShadow: activeDescTab === tab.id ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                      transition: 'all 0.2s'
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              
              <label style={{display: 'flex', flexDirection: 'column', gap: 10}}>
                {activeDescTab === 'ru' && (
                  <textarea 
                    data-testid="onboarding-description-ru"
                    rows={8} 
                    maxLength={500}
                    value={descRu} 
                    onChange={e => setDescRu(e.target.value)} 
                    style={{padding: '24px', borderRadius: 16, border: '1.5px solid #cbd5e1', fontSize: 18, backgroundColor: '#fff', resize: 'vertical', outline: 'none', transition: 'border-color 0.2s'}}
                    onFocus={e => e.target.style.borderColor = '#0f172a'}
                    onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                  />
                )}
                {activeDescTab === 'uz' && (
                  <textarea 
                    data-testid="onboarding-description-uz"
                    rows={8} 
                    maxLength={500}
                    value={descUz} 
                    onChange={e => setDescUz(e.target.value)} 
                    style={{padding: '24px', borderRadius: 16, border: '1.5px solid #cbd5e1', fontSize: 18, backgroundColor: '#fff', resize: 'vertical', outline: 'none', transition: 'border-color 0.2s'}}
                    onFocus={e => e.target.style.borderColor = '#0f172a'}
                    onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                  />
                )}
                {activeDescTab === 'en' && (
                  <textarea 
                    data-testid="onboarding-description-en"
                    rows={8} 
                    maxLength={500}
                    value={descEn} 
                    onChange={e => setDescEn(e.target.value)} 
                    style={{padding: '24px', borderRadius: 16, border: '1.5px solid #cbd5e1', fontSize: 18, backgroundColor: '#fff', resize: 'vertical', outline: 'none', transition: 'border-color 0.2s'}}
                    onFocus={e => e.target.style.borderColor = '#0f172a'}
                    onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                  />
                )}
                <div style={{textAlign: 'left', color: '#64748b', fontSize: 14, fontWeight: 600}}>
                  {(activeDescTab === 'ru' ? descRu : activeDescTab === 'uz' ? descUz : descEn).length}/500
                </div>
              </label>
            </div>
          </div>
        )}

        {step === 12 && (() => {
          // Filter discounts applicable to selected category or all
          const visibleDiscounts = apiDiscounts.filter(d => {
            if (!d.is_active) return false;
            if (d.applicable_to === 'all') return true;
            if (d.applicable_to === 'specific' && d.category_ids?.includes(objectType)) return true;
            return false;
          });

          const TYPE_COLORS = {
            new_listing: { color: '#7c3aed', bg: '#f5f3ff' },
            last_minute: { color: '#dc2626', bg: '#fef2f2' },
            weekly: { color: '#0369a1', bg: '#f0f9ff' },
            monthly: { color: '#0f766e', bg: '#f0fdfa' },
            custom: { color: '#92400e', bg: '#fffbeb' },
          };

          const toggleDiscount = (id) => {
            setSelectedDiscountIds(prev =>
              prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
            );
          };

          return (
            <div className="pricing-layout" style={{maxWidth: 700, margin: '0 auto', paddingBottom: 40}}>
               <div className="details-section-head">
                <h1>Добавьте скидки</h1>
                <p style={{fontSize: 16, color: '#64748b'}}>Привлеките внимание гостей, чтобы быстрее получить первые бронирования и отзывы.</p>
              </div>
              <div style={{display: 'flex', flexDirection: 'column', gap: 16, marginTop: 32}}>
                {visibleDiscounts.length === 0 ? (
                  <div style={{textAlign: 'center', padding: '40px 20px', background: '#f8fafc', borderRadius: 16, border: '1.5px dashed #e2e8f0'}}>
                    <div style={{fontSize: 40, marginBottom: 12}}>🏷️</div>
                    <p style={{color: '#64748b', fontSize: 15}}>Скидки для этой категории не настроены. Администратор может добавить их в дашборде.</p>
                  </div>
                ) : (
                  visibleDiscounts.map(discount => {
                    const isActive = selectedDiscountIds.includes(discount.id);
                    const typeStyle = TYPE_COLORS[discount.discount_type] || TYPE_COLORS.custom;
                    return (
                      <div key={discount.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px', 
                        background: isActive ? '#f8fafc' : '#fff', 
                        border: `1.5px solid ${isActive ? '#0f172a' : '#e2e8f0'}`, 
                        borderRadius: 16, cursor: 'pointer', transition: 'all 0.2s'
                      }} onClick={() => toggleDiscount(discount.id)}>
                        <div style={{display: 'flex', alignItems: 'center', gap: 20}}>
                          <div style={{
                            width: 60, height: 60, borderRadius: 12,
                            background: typeStyle.bg, display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center', flexShrink: 0
                          }}>
                            <span style={{fontSize: 20, fontWeight: 800, color: typeStyle.color, lineHeight: 1}}>{discount.percent}</span>
                            <span style={{fontSize: 11, fontWeight: 700, color: typeStyle.color}}>%</span>
                          </div>
                          <div>
                            <div style={{fontWeight: 700, fontSize: 16, color: '#0f172a', marginBottom: 4}}>{discount.name_ru}</div>
                            {discount.description_ru && (
                              <div style={{fontSize: 14, color: '#64748b'}}>{discount.description_ru}</div>
                            )}
                          </div>
                        </div>
                        <div style={{
                          width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                          border: `2px solid ${isActive ? '#0f172a' : '#cbd5e1'}`,
                          backgroundColor: isActive ? '#0f172a' : 'transparent', 
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          {isActive && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <p style={{textAlign: 'center', marginTop: 24, fontSize: 14, color: '#64748b'}}>Одно проживание — одна скидка.</p>
            </div>
          );
        })()}

        {step === 8 && (
          <div style={{display: 'grid', gridTemplateColumns: '1.2fr 1fr', alignItems: 'center', maxWidth: 1200, margin: '0 auto', gap: 60, paddingBottom: 40}}>
            <div style={{textAlign: 'left'}}>
              <div className="details-section-head">
                <p className="partner-eyebrow">Характеристики</p>
                <h1>Самое основное</h1>
              </div>
              <p style={{fontSize: 16, color: '#64748b', marginTop: 16, maxWidth: 400, lineHeight: 1.6, marginBottom: 24}}>
                Сколько человек могут здесь разместиться и какова площадь пространства?
              </p>
              <div className="counters-stack">
                <CounterRow
                  label="Вместимость (гостей)"
                  value={capacity}
                  onChange={setCapacity}
                />

                <div style={{display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16, marginBottom: 16}}>
                  <span style={{fontWeight: 600, fontSize: 15}}>Площадь (кв.м)</span>
                  <input
                    data-testid="onboarding-area"
                    type="number"
                    min="1"
                    step="1"
                    value={area}
                    onChange={e => setArea(e.target.value)}
                    placeholder="Например: 50"
                    style={{padding: '16px 20px', borderRadius: 14, border: '1.5px solid #cbd5e1', fontSize: 16, backgroundColor: '#f8fafc', transition: 'border-color 0.2s', outline: 'none'}}
                    onFocus={e => e.target.style.borderColor = '#0f172a'}
                    onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                  />
                </div>
                
                {/* Counter params from subcategory */}
                {counterParams.map(p => (
                  <CounterRow 
                    key={p.slug} 
                    label={p.name_ru} 
                    value={customCounters[p.slug] || 0} 
                    onChange={val => setCustomCounters({...customCounters, [p.slug]: val})} 
                  />
                ))}

                {/* Select params from subcategory */}
                {selectParams.map(p => (
                   <div key={p.slug} style={{display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12}}>
                    <span style={{fontWeight: 600, fontSize: 15}}>{p.name_ru}</span>
                    <select 
                      className="param-input" 
                      value={customSelects[p.slug] || ""} 
                      onChange={e => setCustomSelects({...customSelects, [p.slug]: e.target.value})}
                      style={{width: '100%', padding: '12px', borderRadius: 12, border: '1.5px solid #cbd5e1'}}
                    >
                      <option value="">Не выбрано</option>
                      {(p.config?.options || []).map(opt => (
                        <option key={opt.slug} value={opt.slug}>{opt.ru}</option>
                      ))}
                    </select>
                  </div>
                ))}

                {/* Fallback message if params exist but only boolean type */}
                {subCatParams.length > 0 && counterParams.length === 0 && selectParams.length === 0 && (
                  <div style={{padding: '20px', background: '#f8fafc', borderRadius: 12, color: '#64748b', fontSize: 15, textAlign: 'center'}}>
                    Для этой категории нет числовых характеристик. Перейдите к следующему шагу.
                  </div>
                )}
              </div>
            </div>
            <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'sticky', top: 120}}>
              <img 
                src="/partner-parameters.jpg" 
                alt="Parameters Illustration" 
                style={{
                  width: '100%', 
                  maxWidth: '450px', 
                  borderRadius: '24px', 
                  boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                  animation: 'floatIllus 4s ease-in-out infinite'
                }} 
              />
            </div>
          </div>
        )}
        {step === 9 && (
          <div style={{display: 'grid', gridTemplateColumns: '1.2fr 1fr', alignItems: 'start', maxWidth: 1200, margin: '0 auto', gap: 60, paddingBottom: 40}}>
            <div style={{textAlign: 'left', position: 'sticky', top: 120}}>
              <div className="details-section-head">
                <p className="partner-eyebrow">Удобства</p>
                <h1>Отметьте удобства (Qulayliklar)</h1>
              </div>
            </div>
            <div style={{maxHeight: '70vh', overflowY: 'auto', paddingRight: 10, width: '100%'}}>
              {paramGroups.filter(g => booleanParams.some(p => p.group === g.id)).map(group => {
                const groupParams = booleanParams.filter(p => p.group === group.id);
                return (
                  <div key={group.id} style={{marginBottom: 32}}>
                    <h3 style={{fontSize: 18, fontWeight: 700, marginBottom: 16, color: '#0f172a'}}>{group.name_ru}</h3>
                    <div className="amenities-grid" style={{gridTemplateColumns: 'repeat(2, 1fr)'}}>
                      {groupParams.map(p => {
                        const isSel = amenities.includes(p.slug);
                        return (
                          <button type="button" key={p.slug} className={`amenity-card ${isSel ? "is-selected" : ""}`} onClick={() => {
                              if (isSel) setAmenities(amenities.filter(a => a !== p.slug));
                              else setAmenities([...amenities, p.slug]);
                          }}>
                            <span aria-hidden="true"><Icon name={p.icon || "check-circle"} /></span>
                            <strong>{p.name_ru}</strong>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              
              {/* Fallback for parameters without a group */}
              {booleanParams.filter(p => !paramGroups.some(g => g.id === p.group)).length > 0 && (
                <div style={{marginBottom: 32}}>
                  <h3 style={{fontSize: 18, fontWeight: 700, marginBottom: 16, color: '#0f172a'}}>Дополнительно</h3>
                  <div className="amenities-grid" style={{gridTemplateColumns: 'repeat(2, 1fr)'}}>
                    {booleanParams.filter(p => !paramGroups.some(g => g.id === p.group)).map(p => {
                      const isSel = amenities.includes(p.slug);
                      return (
                        <button type="button" key={p.slug} className={`amenity-card ${isSel ? "is-selected" : ""}`} onClick={() => {
                            if (isSel) setAmenities(amenities.filter(a => a !== p.slug));
                            else setAmenities([...amenities, p.slug]);
                        }}>
                          <span aria-hidden="true"><Icon name={p.icon || "check-circle"} /></span>
                          <strong>{p.name_ru}</strong>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 11 && (
          <div style={{display: 'grid', gridTemplateColumns: '1.2fr 1fr', alignItems: 'start', maxWidth: 1200, margin: '0 auto', gap: 60, paddingBottom: 40}}>
            <div style={{textAlign: 'left', position: 'sticky', top: 120}}>
              <div className="details-section-head">
                <p className="partner-eyebrow">Цены</p>
                <h1>Укажите стоимость</h1>
                <p style={{fontSize: 16, color: '#64748b', marginTop: 12, lineHeight: 1.5}}>
                  Выберите один или несколько удобных для вас форматов оплаты (почасовая, посуточная, за неделю или месяц) и укажите стоимость. 
                </p>
                <p style={{fontSize: 15, color: '#f46f36', fontWeight: 600, marginTop: 16, display: 'flex', alignItems: 'center', gap: 8}}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                  Достаточно заполнить хотя бы один формат оплаты!
                </p>
              </div>
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: 20, width: '100%'}}>
               {[
                 { id: 'soatlik', label: 'Почасовая (Soatlik)', placeholder: '50 000' },
                 { id: 'kunlik', label: 'За день (Kunlik)', placeholder: '250 000' },
                 { id: 'haftalik', label: 'За неделю (Haftalik)', placeholder: '1 500 000' },
                 { id: 'oylik', label: 'За месяц (Oylik)', placeholder: '5 000 000' }
               ].map(tier => {
                 const isActive = enabledPrices[tier.id];
                 return (
                   <div key={tier.id} style={{
                     display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 24px', 
                     background: isActive ? '#fff' : '#f8fafc', 
                     border: `1px solid ${isActive ? '#f46f36' : '#e2e8f0'}`, 
                     borderRadius: 16, 
                     transition: 'all 0.3s ease',
                     boxShadow: isActive ? '0 12px 24px rgba(244, 111, 54, 0.08)' : 'none'
                   }}>
                     <div
                       data-testid={`onboarding-price-toggle-${tier.id}`}
                       style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer'}}
                       onClick={() => setEnabledPrices({...enabledPrices, [tier.id]: !isActive})}
                     >
                       <span style={{fontSize: 17, fontWeight: 700, color: isActive ? '#0f172a' : '#64748b', transition: 'color 0.2s'}}>
                         {tier.label}
                       </span>
                       <div style={{
                         position: 'relative', width: 44, height: 24, 
                         backgroundColor: isActive ? '#f46f36' : '#cbd5e1', 
                         borderRadius: 24, transition: 'all 0.3s ease', flexShrink: 0
                       }}>
                         <div style={{
                           position: 'absolute', top: 2, left: 2, width: 20, height: 20, 
                           backgroundColor: '#fff', borderRadius: '50%', 
                           transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
                           boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                           transform: isActive ? 'translateX(20px)' : 'translateX(0)'
                         }} />
                       </div>
                     </div>
                     
                     <div style={{
                       maxHeight: isActive ? 100 : 0, opacity: isActive ? 1 : 0, overflow: 'hidden', 
                       transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                     }}>
                       <div style={{position: 'relative'}}>
                         <input 
                           data-testid={`onboarding-price-${tier.id}`}
                           placeholder={`Например: ${tier.placeholder}`} 
                           type="number" 
                           value={prices[tier.id]} 
                           onChange={e => setPrices({...prices, [tier.id]: e.target.value})} 
                           style={{
                             width: '100%', padding: '16px 20px', borderRadius: 12, 
                             border: '1.5px solid #cbd5e1', fontSize: 16, 
                             backgroundColor: '#fff', outline: 'none',
                             transition: 'border-color 0.2s'
                           }}
                           onFocus={e => e.target.style.borderColor = '#0f172a'}
                           onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                         />
                         <span style={{position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontWeight: 500, pointerEvents: 'none'}}>
                           UZS
                         </span>
                       </div>
                     </div>
                   </div>
                 );
               })}
            </div>
          </div>
        )}

        {step === 5 && (
          <div style={{display: 'grid', gridTemplateColumns: '1.2fr 1fr', alignItems: 'start', maxWidth: 1200, margin: '0 auto', gap: 60, paddingBottom: 40}}>
            <div style={{textAlign: 'left', position: 'sticky', top: 120}}>
              <div className="details-section-head">
                <p className="partner-eyebrow">Фотографии</p>
                <h1>Загрузите минимум 4 фото</h1>
              </div>
              <p style={{fontSize: 16, color: '#64748b', marginTop: 16, maxWidth: 400, lineHeight: 1.6}}>
                Качественные фотографии помогают арендаторам лучше представить пространство. Первое загруженное фото автоматически станет обложкой вашего объявления.
              </p>
            </div>
            <div>
              <label className="photo-dropzone" style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '60px 20px', backgroundColor: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: 24,
                cursor: 'pointer', transition: 'all 0.3s', gap: 16
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#f46f36'; e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.boxShadow = '0 12px 24px rgba(244, 111, 54, 0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <input data-testid="onboarding-photos" type="file" accept="image/*" multiple onChange={(e) => addFiles(e.target.files)} style={{display: 'none'}} />
                <div style={{width: 64, height: 64, backgroundColor: '#e2e8f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0f172a', transition: 'all 0.3s'}}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                </div>
                <div style={{textAlign: 'center'}}>
                  <strong style={{display: 'block', fontSize: 18, color: '#0f172a', marginBottom: 8}}>Загрузить фотографии</strong>
                  <span style={{fontSize: 14, color: '#64748b'}}>
                    Нажмите или перетащите файлы ({photos.length}/4)
                  </span>
                </div>
              </label>
              <div className="photo-grid" style={{marginTop: 24}}>
                 {photos.map((p, i) => (
                   <article key={p.id} className="photo-tile">
                     <img src={p.url} alt="Uploaded" />
                     <div className="photo-tile-meta">
                       <span>{i===0?"Обложка":`Фото ${i+1}`}</span>
                       <button type="button" onClick={() => setPhotos(photos.filter(pt => pt.id !== p.id))}>
                         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                       </button>
                     </div>
                   </article>
                 ))}
              </div>
            </div>
          </div>
        )}

        {step === 10 && (
          <div style={{display: 'grid', gridTemplateColumns: '1.2fr 1fr', alignItems: 'start', maxWidth: 1200, margin: '0 auto', gap: 60, paddingBottom: 40}}>
            <div style={{textAlign: 'left', position: 'sticky', top: 120}}>
              <div className="details-section-head">
                <p className="partner-eyebrow">Бронирование</p>
                <h1>Формат бронирования</h1>
              </div>
              <p style={{fontSize: 16, color: '#64748b', marginTop: 16, maxWidth: 400, lineHeight: 1.6}}>
                Выберите, как вы хотите принимать заявки от резидентов. Мгновенное бронирование увеличивает конверсию, а проверка по запросу дает вам полный контроль.
              </p>
            </div>
            <div className="booking-card-list" style={{display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 10}}>
               <button type="button" className={`booking-card ${bookingType === "instant" ? "is-selected" : ""}`} onClick={() => setBookingType("instant")}>
                 <span aria-hidden="true"><Icon name="instant" /></span>
                 <strong>Мгновенное бронирование</strong>
                 <small>Резидент получает подтверждение сразу после оплаты.</small>
               </button>
               <button type="button" className={`booking-card ${bookingType === "request" ? "is-selected" : ""}`} onClick={() => setBookingType("request")}>
                 <span aria-hidden="true"><Icon name="request" /></span>
                 <strong>По запросу</strong>
                 <small>Администратор проверяет заявку вручную.</small>
               </button>
            </div>
           </div>
        )}

      </section>
      
      {step > 0 && (
        <footer className="partner-bottom-nav">
          <div className="partner-progress" aria-hidden="true" style={{ gridTemplateColumns: `repeat(${maxStep}, 1fr)` }}>
            {Array.from({ length: maxStep }).map((_, index) => (
              <span key={index} className={index <= step ? "is-active" : ""} />
            ))}
          </div>
          <div className="partner-bottom-actions">
            <button type="button" className="partner-back" disabled={submitting} onClick={() => setStep(step - 1)}>Назад</button>
            {step < maxStep - 1 ? (
              <button data-testid="onboarding-next" type="button" className="partner-next" disabled={submitting} onClick={handleNext}>Далее</button>
            ) : (
              <button data-testid="onboarding-publish" type="button" className="partner-next is-publish" disabled={submitting} onClick={() => handleBooking()}>
                {submitting ? "Публикация..." : "Опубликовать"}
              </button>
            )}
          </div>
        </footer>
      )}

      {moderationConfirmOpen && (
        <div className="partner-moderation-confirm-overlay" onClick={() => setModerationConfirmOpen(false)}>
          <div
            className="partner-moderation-confirm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="partner-moderation-confirm-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="partner-moderation-confirm-icon" aria-hidden="true">!</div>
            <h2 id="partner-moderation-confirm-title">Отправить изменения на модерацию?</h2>
            <p>
              После сохранения опубликованное место временно станет недоступно на публичных страницах
              и будет отправлено на повторную модерацию. Оно снова появится после одобрения.
            </p>
            <div className="partner-moderation-confirm-actions">
              <button type="button" className="partner-back" onClick={() => setModerationConfirmOpen(false)}>
                Отмена
              </button>
              <button
                type="button"
                className="partner-next is-publish"
                onClick={() => handleBooking({ moderationConfirmed: true })}
              >
                Сохранить и отправить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Toast Notification */}
      {toast.open && (
        <div data-testid={`onboarding-toast-${toast.type}`} style={{
          position: 'fixed', bottom: 40, left: '50%', transform: 'translateX(-50%)',
          backgroundColor: toast.type === 'error' ? '#fef2f2' : '#f0fdf4',
          color: toast.type === 'error' ? '#991b1b' : '#166534',
          border: `1px solid ${toast.type === 'error' ? '#f87171' : '#86efac'}`,
          padding: '16px 24px', borderRadius: 12, boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
          display: 'flex', alignItems: 'center', gap: 12, zIndex: 9999, fontWeight: 500,
          animation: 'slideUpFade 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards'
        }}>
          {toast.type === 'error' ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          )}
          {toast.message}
          <style>{`
            @keyframes slideUpFade {
              from { opacity: 0; transform: translate(-50%, 20px); }
              to { opacity: 1; transform: translate(-50%, 0); }
            }
          `}</style>
        </div>
      )}
    </main>
  );
}
