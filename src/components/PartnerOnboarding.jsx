import { Icon, Header, SelectionCard, CounterRow, resolveIconName } from "./partnerOnboarding/parts.jsx";
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
import "./partnerOnboarding/wizard.css";
import { navigate, useQueryParam } from "../utils/router.js";

// Wizard order. Step 4 (a manual address form whose fields were never saved)
// was removed; the remaining numbers stay as they are referenced by validation.
const WIZARD_STEPS = [0, 1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12];
const MIN_PHOTOS = 4;

const STEP_META = {
  1: { label: "Тип", title: "Что вы хотите разместить?", hint: "Выберите тип пространства — от него зависят форматы и удобства." },
  2: { label: "Формат", title: "Выберите формат", hint: "Как именно клиенты будут пользоваться местом?" },
  3: { label: "Адрес", title: "Где находится место?", hint: "Найдите адрес или поставьте точку на карте — клиенты увидят её на странице места.", tip: "Маркер можно перетащить мышкой." },
  5: { label: "Фото", title: "Добавьте фотографии", hint: `Минимум ${MIN_PHOTOS} фото. Первое станет обложкой в поиске.`, tip: "Светлые горизонтальные фото рабочих мест и зон отдыха собирают больше броней." },
  6: { label: "Название", title: "Как называется место?", hint: "Коротко и понятно: тип места и район или название бренда." },
  7: { label: "Описание", title: "Опишите место", hint: "Заполните описание на трёх языках — сайт показывает его на языке клиента." },
  8: { label: "Характеристики", title: "Основные характеристики", hint: "Сколько человек помещается и какая площадь." },
  9: { label: "Удобства", title: "Что есть на месте?", hint: "Отметьте удобства — по ним клиенты фильтруют поиск." },
  10: { label: "Бронь и часы", title: "Бронирование и часы работы", hint: "Решите, как принимать заявки, и укажите, когда место открыто." },
  11: { label: "Цены", title: "Сколько стоит аренда?", hint: "Включите удобные форматы и укажите цену. Достаточно одного." },
  12: { label: "Скидки", title: "Добавьте скидки", hint: "Необязательно, но скидки помогают получить первые брони быстрее." },
};

// Sections the owner can jump to while editing an existing place.
const EDIT_SECTIONS = WIZARD_STEPS.filter(item => item > 0).map(item => ({ step: item, label: STEP_META[item].label }));

const BOOKING_MODES = [
  { id: "request", title: "По запросу", text: "Вы подтверждаете каждую заявку сами в кабинете." },
  { id: "instant", title: "Мгновенно", text: "Бронь подтверждается сразу, без вашего участия." },
];

const PRICE_TIERS = [
  { id: "soatlik", label: "За час", hint: "Почасовая аренда", placeholder: "50 000" },
  { id: "kunlik", label: "За день", hint: "С открытия до закрытия", placeholder: "250 000" },
  { id: "haftalik", label: "За неделю", hint: "7 дней подряд", placeholder: "1 500 000" },
  { id: "oylik", label: "За месяц", hint: "Долгосрочная аренда", placeholder: "5 000 000" },
];

const TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => (
  `${String(Math.floor(index / 2)).padStart(2, "0")}:${index % 2 ? "30" : "00"}`
));

function digitsOnly(value) {
  return String(value ?? "").replace(/\D/g, "").slice(0, 11);
}

function groupDigits(value) {
  const digits = digitsOnly(value);
  return digits ? Number(digits).toLocaleString("ru-RU") : "";
}

function formatCount(count) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  const word = mod10 === 1 && mod100 !== 11 ? "формат" : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? "формата" : "форматов";
  return `${count} ${word}`;
}

function paramIconName(param) {
  return resolveIconName(param);
}

// Remount on ?edit change so "add new" never inherits an unfinished edit.
export default function PartnerOnboardingPage() {
  const editId = useQueryParam("edit");
  useEffect(() => {
    // Edit mode used to live in localStorage; drop any leftover value.
    removeStorageItem(STORAGE_KEYS.workflow.editPlaceId);
  }, []);
  return <PartnerOnboarding key={editId || "new"} initialEditId={editId} />;
}

function PartnerOnboarding({ initialEditId = null }) {
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
  const [opensAt, setOpensAt] = useState("09:00");
  const [closesAt, setClosesAt] = useState("18:00");
  const [selectedDiscountIds, setSelectedDiscountIds] = useState([]);
  const [apiDiscounts, setApiDiscounts] = useState([]);
  const [profile, setProfile] = useState(null);
  const [toast, setToast] = useState({ open: false, message: "", type: "success" });
  const [stepErrors, setStepErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [editPlaceId, setEditPlaceId] = useState(initialEditId);
  const [originalPlaceStatus, setOriginalPlaceStatus] = useState(null);
  const [moderationConfirmOpen, setModerationConfirmOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(Boolean(initialEditId));
  const isEditing = Boolean(editPlaceId);

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
        setOpensAt(String(p.opens_at || "09:00").slice(0, 5));
        setClosesAt(String(p.closes_at || "18:00").slice(0, 5));
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
        setEditLoading(false);
      })
      .catch(err => {
        showToast(getApiErrorMessage(err, "Не удалось загрузить место для редактирования"), "error");
        const returnHash = getStorageItem(STORAGE_KEYS.workflow.editPlaceReturnHash);
        removeStorageItem(STORAGE_KEYS.workflow.editPlaceReturnHash);
        setEditPlaceId(null);
        setEditLoading(false);
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

  const getFormData = () => ({
    objectType,
    accessType,
    address,
    lat,
    lng,
    addressConfirmed,
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
    opensAt,
    closesAt,
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
    const index = WIZARD_STEPS.indexOf(step);
    setStep(WIZARD_STEPS[Math.min(WIZARD_STEPS.length - 1, index + 1)]);
  };

  useEffect(() => {
    if (!screenRef.current) return;
    gsap.fromTo(screenRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4 });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

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

  const cancelEditing = () => {
    const returnHash = getStorageItem(STORAGE_KEYS.workflow.editPlaceReturnHash);
    removeStorageItem(STORAGE_KEYS.workflow.editPlaceReturnHash);
    navigate(returnHash || "/host-listings");
  };

  const jumpToStep = (target) => {
    setStepErrors(prev => ({ ...prev, [step]: [] }));
    setStep(target);
  };

  const goBack = () => {
    const index = WIZARD_STEPS.indexOf(step);
    setStep(WIZARD_STEPS[Math.max(0, index - 1)]);
  };

  useEffect(() => {
    document.querySelector(".pe-nav-steps .is-active")?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [step]);

  const saveLabel = isEditing
    ? (submitting ? "Сохраняем..." : <>Сохранить<span className="pow-hide-mobile"> изменения</span></>)
    : (submitting ? "Публикация..." : "Опубликовать");

  const stepNumber = WIZARD_STEPS.indexOf(step);
  const stepMeta = STEP_META[step] || {};
  const filledLangs = { ru: descRu.trim(), uz: descUz.trim(), en: descEn.trim() };
  const visibleDiscounts = apiDiscounts.filter(d => (
    d.is_active && (d.applicable_to === "all" || d.category_ids?.includes(objectType) || selectedDiscountIds.includes(d.id))
  ));
  const toggleDiscount = (id) => {
    setSelectedDiscountIds(prev => (prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]));
  };
  const toggleAmenity = (slug) => {
    setAmenities(prev => (prev.includes(slug) ? prev.filter(a => a !== slug) : [...prev, slug]));
  };
  const makeCover = (id) => {
    setPhotos(prev => {
      const target = prev.find(p => p.id === id);
      return target ? [target, ...prev.filter(p => p.id !== id)] : prev;
    });
  };

  const renderCopy = () => (
    <div className="pow-copy">
      <span className="pow-eyebrow">Шаг {stepNumber} из {WIZARD_STEPS.length - 1} · {stepMeta.label}</span>
      <h1>{stepMeta.title}</h1>
      {stepMeta.hint ? <p>{stepMeta.hint}</p> : null}
      {stepErrors[step]?.length > 0 ? (
        <div className="pow-errors" role="alert">
          {stepErrors[step].map((message, index) => <div key={`${message}-${index}`}>{message}</div>)}
        </div>
      ) : stepMeta.tip ? (
        <div className="pow-tip"><Icon name="spark" />{stepMeta.tip}</div>
      ) : null}
    </div>
  );

  const renderStepBody = () => {
    if (step === 1) {
      return (
        <div className="pow-choice-grid">
          {categories.length === 0 && !categoriesError ? <p className="pow-muted">Загрузка...</p> : null}
          {categoriesError ? <p className="pow-field-error">Ошибка: {categoriesError}</p> : null}
          {categories.map(c => (
            <SelectionCard
              key={c.id}
              item={c}
              hint={formatCount(c.subcategories?.length || 0)}
              active={objectType === c.id}
              onClick={() => { setObjectType(c.id); setAccessType(null); }}
            />
          ))}
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="pow-choice-grid">
          {!selectedCategory ? <p className="pow-muted">Сначала выберите тип объекта.</p> : null}
          {selectedCategory?.subcategories?.map(s => (
            <SelectionCard
              key={s.id}
              item={s}
              hint={selectedCategory.name_ru}
              active={accessType === s.id}
              onClick={() => setAccessType(s.id)}
            />
          ))}
        </div>
      );
    }

    if (step === 3) {
      return (
        <AddressStep address={address} setAddress={setAddress} lat={lat} setLat={setLat} lng={lng} setLng={setLng} confirmed={addressConfirmed} setConfirmed={setAddressConfirmed} />
      );
    }

    if (step === 5) {
      const missing = Math.max(0, MIN_PHOTOS - photos.length);
      return (
        <div className="pow-photos">
          <label
            className="pow-dropzone"
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
          >
            <input data-testid="onboarding-photos" type="file" accept="image/*" multiple onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
            <span className="pow-dropzone-icon"><Icon name="upload" /></span>
            <span>
              <strong>Добавить фотографии</strong>
              <small>Нажмите или перетащите файлы · JPG, PNG · до 10 фото</small>
            </span>
          </label>
          <div className="pow-photo-status">
            <div className="pow-meter"><i style={{ width: `${Math.min(100, (photos.length / MIN_PHOTOS) * 100)}%` }} /></div>
            <span className={missing ? "" : "is-done"}>
              {missing ? `Загружено ${photos.length} из ${MIN_PHOTOS} — добавьте ещё ${missing}` : `Загружено ${photos.length} фото — достаточно`}
            </span>
          </div>
          <div className="pow-photo-grid">
            {photos.map((p, i) => (
              <figure key={p.id} className={i === 0 ? "is-cover" : ""}>
                <img src={p.url} alt="" />
                {i === 0 ? <figcaption>Обложка</figcaption> : (
                  <button type="button" className="pow-photo-cover" onClick={() => makeCover(p.id)}>Сделать обложкой</button>
                )}
                <button type="button" className="pow-photo-remove" aria-label="Удалить фото" onClick={() => setPhotos(photos.filter(pt => pt.id !== p.id))}>×</button>
              </figure>
            ))}
            {Array.from({ length: Math.max(0, MIN_PHOTOS - photos.length) }).map((_, i) => (
              <div key={`slot-${i}`} className="pow-photo-slot"><Icon name="image" /></div>
            ))}
          </div>
        </div>
      );
    }

    if (step === 6) {
      return (
        <div className="pow-stack">
          <label className="pow-field">
            <span>Название <small>{spaceTitle.length}/50</small></span>
            <input
              data-testid="onboarding-title"
              className="pow-input is-large"
              value={spaceTitle}
              maxLength={50}
              placeholder="Например: Коворкинг на Юнусабаде"
              onChange={e => setSpaceTitle(e.target.value)}
            />
          </label>
          <div className="pow-preview">
            <span className="pow-preview-label">Так место увидят в поиске</span>
            <article>
              <div className="pow-preview-img">
                {photos[0] ? <img src={photos[0].url} alt="" /> : <Icon name="image" />}
              </div>
              <div>
                <strong>{spaceTitle || "Название вашего места"}</strong>
                <small><Icon name="pin" />{address ? address.split(",").slice(0, 2).join(",") : "Адрес не выбран"}</small>
                <em>{selectedSubCategory?.name_ru || selectedCategory?.name_ru || "Категория"}</em>
              </div>
            </article>
          </div>
        </div>
      );
    }

    if (step === 7) {
      const descValue = activeDescTab === "ru" ? descRu : activeDescTab === "uz" ? descUz : descEn;
      const setDesc = activeDescTab === "ru" ? setDescRu : activeDescTab === "uz" ? setDescUz : setDescEn;
      return (
        <div className="pow-stack">
          <div className="pow-tabs" role="tablist">
            {[{ id: "ru", label: "Русский" }, { id: "uz", label: "O'zbekcha" }, { id: "en", label: "English" }].map(tab => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeDescTab === tab.id}
                data-testid={`onboarding-description-tab-${tab.id}`}
                className={activeDescTab === tab.id ? "is-active" : ""}
                onClick={() => setActiveDescTab(tab.id)}
              >
                <i className={filledLangs[tab.id] ? "is-filled" : ""} aria-hidden="true">{filledLangs[tab.id] ? "✓" : ""}</i>
                {tab.label}
              </button>
            ))}
          </div>
          <label className="pow-field">
            <span>Описание · {activeDescTab.toUpperCase()} <small>{descValue.length}/500</small></span>
            <textarea
              key={activeDescTab}
              data-testid={`onboarding-description-${activeDescTab}`}
              className="pow-input pow-textarea"
              rows={9}
              maxLength={500}
              value={descValue}
              placeholder="Расскажите про атмосферу, оборудование, кому подойдёт место и что рядом."
              onChange={e => setDesc(e.target.value)}
            />
          </label>
        </div>
      );
    }

    if (step === 8) {
      return (
        <div className="pow-counter-grid">
          <div className="pow-counter-card">
            <span className="pow-counter-icon"><Icon name="users" /></span>
            <CounterRow label="Вместимость, человек" value={Number(capacity) || 0} onChange={setCapacity} />
          </div>
          <div className="pow-counter-card">
            <span className="pow-counter-icon"><Icon name="area" /></span>
            <label className="pow-area">
              <span>Площадь</span>
              <span className="pow-suffix-input">
                <input data-testid="onboarding-area" type="number" min="1" step="1" value={area} onChange={e => setArea(e.target.value)} placeholder="50" />
                <small>м²</small>
              </span>
            </label>
          </div>
          {counterParams.map(p => (
            <div key={p.slug} className="pow-counter-card">
              <span className="pow-counter-icon"><Icon name={paramIconName(p)} /></span>
              <CounterRow label={p.name_ru} value={Number(customCounters[p.slug]) || 0} onChange={val => setCustomCounters({ ...customCounters, [p.slug]: val })} />
            </div>
          ))}
          {selectParams.map(p => (
            <label key={p.slug} className="pow-counter-card pow-select-card">
              <span>{p.name_ru}</span>
              <select className="pow-input" value={customSelects[p.slug] || ""} onChange={e => setCustomSelects({ ...customSelects, [p.slug]: e.target.value })}>
                <option value="">Не выбрано</option>
                {(p.config?.options || []).map(opt => <option key={opt.slug} value={opt.slug}>{opt.ru}</option>)}
              </select>
            </label>
          ))}
        </div>
      );
    }

    if (step === 9) {
      return (
        <div className="pow-stack">
          <div className="pow-amenity-grid">
            {booleanParams.map(p => {
              const isSel = amenities.includes(p.slug);
              return (
                <button type="button" key={p.slug} className={`pow-amenity ${isSel ? "is-selected" : ""}`} aria-pressed={isSel} onClick={() => toggleAmenity(p.slug)}>
                  <span className="pow-amenity-icon"><Icon name={paramIconName(p)} /></span>
                  <strong>{p.name_ru}</strong>
                  <i aria-hidden="true">{isSel ? "✓" : ""}</i>
                </button>
              );
            })}
          </div>
          {booleanParams.length === 0 ? <p className="pow-muted">Для этого формата удобства не настроены — можно идти дальше.</p> : (
            <p className="pow-muted">Выбрано: {amenities.filter(a => booleanParams.some(p => p.slug === a)).length} из {booleanParams.length}</p>
          )}
        </div>
      );
    }

    if (step === 10) {
      return (
        <div className="pow-stack">
          <div className="pow-mode-grid">
            {BOOKING_MODES.map(mode => (
              <button key={mode.id} type="button" className={`pow-mode ${bookingType === mode.id ? "is-selected" : ""}`} onClick={() => setBookingType(mode.id)}>
                <span className="pow-mode-icon"><Icon name={mode.id} /></span>
                <strong>{mode.title}</strong>
                <small>{mode.text}</small>
              </button>
            ))}
          </div>
          <div className="pow-hours">
            <span className="pow-hours-title"><Icon name="clock" />Часы работы</span>
            <label>
              Открытие
              <select data-testid="onboarding-opens-at" className="pow-input" value={opensAt} onChange={e => setOpensAt(e.target.value)}>
                {TIME_OPTIONS.map(time => <option key={time} value={time}>{time}</option>)}
              </select>
            </label>
            <label>
              Закрытие
              <select data-testid="onboarding-closes-at" className="pow-input" value={closesAt} onChange={e => setClosesAt(e.target.value)}>
                {[...TIME_OPTIONS.slice(1), "23:59"].map(time => <option key={time} value={time}>{time}</option>)}
              </select>
            </label>
          </div>
          {closesAt <= opensAt ? <p className="pow-field-error">Время закрытия должно быть позже открытия.</p> : (
            <p className="pow-muted">Почасовые брони доступны только в это время, дневные — с открытия до закрытия.</p>
          )}
        </div>
      );
    }

    if (step === 11) {
      return (
        <div className="pow-price-list">
          {PRICE_TIERS.map(tier => {
            const isActive = enabledPrices[tier.id];
            return (
              <div key={tier.id} className={`pow-price ${isActive ? "is-on" : ""}`}>
                <button
                  type="button"
                  data-testid={`onboarding-price-toggle-${tier.id}`}
                  className="pow-switch"
                  role="switch"
                  aria-checked={Boolean(isActive)}
                  onClick={() => setEnabledPrices({ ...enabledPrices, [tier.id]: !isActive })}
                >
                  <i aria-hidden="true" />
                  <span>
                    <strong>{tier.label}</strong>
                    <small>{tier.hint}</small>
                  </span>
                </button>
                <span className="pow-suffix-input">
                  <input
                    data-testid={`onboarding-price-${tier.id}`}
                    inputMode="numeric"
                    disabled={!isActive}
                    placeholder={isActive ? tier.placeholder : "выключено"}
                    value={isActive ? groupDigits(prices[tier.id]) : ""}
                    onChange={e => setPrices({ ...prices, [tier.id]: digitsOnly(e.target.value) })}
                    aria-label={`Цена ${tier.label}`}
                  />
                  <small>сум</small>
                </span>
              </div>
            );
          })}
        </div>
      );
    }

    if (step === 12) {
      return (
        <div className="pow-stack">
          {visibleDiscounts.length === 0 ? (
            <div className="pow-empty"><Icon name="tag" /><p>Для этой категории скидок пока нет — их добавляет администратор. Можно сохранять.</p></div>
          ) : (
            <div className="pow-discount-list">
              {visibleDiscounts.map(discount => {
                const isActive = selectedDiscountIds.includes(discount.id);
                return (
                  <button key={discount.id} type="button" className={`pow-discount ${isActive ? "is-selected" : ""}`} aria-pressed={isActive} onClick={() => toggleDiscount(discount.id)}>
                    <b>−{discount.percent}%</b>
                    <span>
                      <strong>{discount.name_ru}</strong>
                      {discount.description_ru ? <small>{discount.description_ru}</small> : null}
                    </span>
                    <i aria-hidden="true">{isActive ? "✓" : ""}</i>
                  </button>
                );
              })}
            </div>
          )}
          <p className="pow-muted">Можно выбрать несколько — клиент получит одну, самую выгодную скидку.</p>
        </div>
      );
    }

    return null;
  };

  const isLastStep = step === WIZARD_STEPS[WIZARD_STEPS.length - 1];

  return (
    <main className={`partner-onboarding-page pow${isEditing ? " is-editing" : ""}`}>
      <Header profile={profile} />
      {isEditing && !editLoading ? (
        <nav className="pe-nav" aria-label="Разделы объявления">
          <div className="pe-nav-title">
            <span>Редактирование</span>
            <strong>{spaceTitle || "Объявление"}</strong>
          </div>
          <div className="pe-nav-steps">
            {EDIT_SECTIONS.map(item => (
              <button
                key={item.step}
                type="button"
                className={step === item.step ? "is-active" : ""}
                aria-current={step === item.step ? "step" : undefined}
                onClick={() => jumpToStep(item.step)}
              >
                {item.label}
                {stepErrors[item.step]?.length ? <i aria-label="есть ошибки" /> : null}
              </button>
            ))}
          </div>
        </nav>
      ) : null}

      <section ref={screenRef} className={`pow-card screen-${step}`}>
        {editLoading && step === 0 ? (
          <div className="pe-loading" role="status">
            <span className="pe-spinner" aria-hidden="true" />
            Загружаем объявление...
          </div>
        ) : step === 0 ? (
          <div className="pow-welcome">
            <div className="pow-copy">
              <span className="pow-eyebrow">Joyzone для владельцев</span>
              <h1>Начните зарабатывать на своём пространстве</h1>
              <p>Разместите офис, коворкинг или зал — заявки от клиентов будут приходить в ваш кабинет.</p>
              <ul className="pow-welcome-steps">
                <li><b>1</b><span><strong>Расскажите о месте</strong><small>Тип, адрес, фото и описание</small></span></li>
                <li><b>2</b><span><strong>Задайте условия</strong><small>Цены, часы работы, скидки</small></span></li>
                <li><b>3</b><span><strong>Пройдите модерацию</strong><small>Обычно занимает до 24 часов</small></span></li>
              </ul>
              <button data-testid="onboarding-start" type="button" className="pow-start" onClick={() => setStep(1)}>Начать — это ~5 минут</button>
            </div>
            <div className="pow-welcome-art">
              <img src="/partner-illustration.jpg" alt="" />
            </div>
          </div>
        ) : (
          <div className={`pow-step pow-step-${step}`}>
            {renderCopy()}
            <div className="pow-body">{renderStepBody()}</div>
          </div>
        )}
      </section>

      {step > 0 && (
        <footer className="pow-footer">
          <div className="pow-progress" aria-hidden="true">
            <i style={{ width: `${(stepNumber / (WIZARD_STEPS.length - 1)) * 100}%` }} />
          </div>
          <div className="pow-footer-row">
            <div className="pow-footer-left">
              <button
                type="button"
                className="pow-btn is-ghost"
                disabled={submitting || (isEditing && stepNumber <= 1)}
                onClick={goBack}
              >
                <Icon name="chevronLeft" />Назад
              </button>
              {isEditing ? <button type="button" className="pow-btn is-link" disabled={submitting} onClick={cancelEditing}>Отменить</button> : null}
            </div>
            <span className="pow-footer-step">{stepNumber} / {WIZARD_STEPS.length - 1}</span>
            <div className="pow-footer-right">
              {!isLastStep ? (
                <button data-testid="onboarding-next" type="button" className={`pow-btn ${isEditing ? "is-outline" : "is-primary"}`} disabled={submitting} onClick={handleNext}>
                  Далее<Icon name="chevronRight" />
                </button>
              ) : null}
              {isEditing || isLastStep ? (
                <button data-testid="onboarding-publish" type="button" className="pow-btn is-primary" disabled={submitting} onClick={() => handleBooking()}>
                  {saveLabel}
                </button>
              ) : null}
            </div>
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
