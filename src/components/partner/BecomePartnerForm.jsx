import React, { useContext, useEffect, useState } from "react";
import api, { getApiErrorMessage } from "../../api/client.js";
import { LanguageContext } from "../../context/LanguageContext.jsx";
import { cacheProfile } from "../../utils/profileMapper.js";
import { getStorageItem, STORAGE_KEYS } from "../../utils/storageKeys.js";
import { navigate } from "../../utils/router.js";
import { ADD_PLACE_PATH, BECOME_PARTNER_PATH, loginThenReturn, useAccountRole } from "../../utils/partnerAccess.js";
import "./becomePartner.css";

// "Become a partner" form: collects who the owner is and what they will list,
// then the backend switches the account to the partner role.

export const PARTNER_TEXT = {
  uz: {
    formTitle: "Hamkorlik arizasi",
    formHint: "2 daqiqa — keyin darhol joy qo'shishingiz mumkin.",
    company: "Kompaniya yoki brend nomi",
    companyPh: "Masalan: Nur Office",
    contact: "Ismingiz",
    contactPh: "Aloqa uchun ism",
    phone: "Telefon",
    city: "Shahar / viloyat",
    cityPh: "Tanlang",
    categories: "Qanday joylar bor?",
    count: "Nechta joy?",
    deal: "Nima qilasiz?",
    deals: { rent: "Ijara", sale: "Sotuv", both: "Ikkalasi" },
    comment: "Izoh (ixtiyoriy)",
    commentPh: "Joy haqida qisqacha yoki savolingiz",
    submit: "Hamkor bo'lish",
    sending: "Yuborilmoqda…",
    terms: "Yuborish orqali hamkorlik shartlariga rozilik bildirasiz.",
    guestTitle: "Avval tizimga kiring",
    guestText: "Ariza sizning profilingizga bog'lanadi — telefon raqam bilan 1 daqiqada kirasiz.",
    guestCta: "Kirish va davom etish",
    doneTitle: "Siz Joyzone hamkorisiz!",
    doneText: "Endi birinchi joyingizni qo'shing — moderatsiyadan so'ng u katalogda ko'rinadi.",
    alreadyTitle: "Siz allaqachon hamkorsiz",
    alreadyText: "Yangi joy qo'shing yoki kabinetda arizalarni boshqaring.",
    addPlace: "Joy qo'shish",
    cabinet: "Kabinetga o'tish",
    loadError: "Joy turlarini yuklab bo'lmadi.",
    sendError: "Arizani yuborib bo'lmadi.",
    required: "Bu maydonni to'ldiring.",
    needCategory: "Kamida bitta joy turini tanlang.",
    needPhone: "Telefon raqamini to'liq kiriting.",
  },
  ru: {
    formTitle: "Заявка партнёра",
    formHint: "2 минуты — и можно сразу добавлять места.",
    company: "Компания или бренд",
    companyPh: "Например: Nur Office",
    contact: "Ваше имя",
    contactPh: "Как к вам обращаться",
    phone: "Телефон",
    city: "Город / область",
    cityPh: "Выберите",
    categories: "Какие у вас площади?",
    count: "Сколько мест?",
    deal: "Что планируете?",
    deals: { rent: "Аренда", sale: "Продажа", both: "Оба" },
    comment: "Комментарий (необязательно)",
    commentPh: "Пара слов о месте или ваш вопрос",
    submit: "Стать партнёром",
    sending: "Отправляем…",
    terms: "Отправляя заявку, вы соглашаетесь с условиями сотрудничества.",
    guestTitle: "Сначала войдите",
    guestText: "Заявка привязывается к вашему профилю — вход по номеру телефона за минуту.",
    guestCta: "Войти и продолжить",
    doneTitle: "Вы партнёр Joyzone!",
    doneText: "Добавьте первое место — после модерации оно появится в каталоге.",
    alreadyTitle: "Вы уже партнёр",
    alreadyText: "Добавьте новое место или управляйте заявками в кабинете.",
    addPlace: "Добавить место",
    cabinet: "В кабинет",
    loadError: "Не удалось загрузить типы площадей.",
    sendError: "Не удалось отправить заявку.",
    required: "Заполните это поле.",
    needCategory: "Выберите хотя бы один тип площади.",
    needPhone: "Введите номер телефона полностью.",
  },
  en: {
    formTitle: "Partner application",
    formHint: "2 minutes — then you can add places right away.",
    company: "Company or brand",
    companyPh: "e.g. Nur Office",
    contact: "Your name",
    contactPh: "Contact person",
    phone: "Phone",
    city: "City / region",
    cityPh: "Choose",
    categories: "What spaces do you have?",
    count: "How many places?",
    deal: "What do you plan?",
    deals: { rent: "Rent", sale: "Sale", both: "Both" },
    comment: "Comment (optional)",
    commentPh: "A few words about the place or your question",
    submit: "Become a partner",
    sending: "Sending…",
    terms: "By sending you agree to the partnership terms.",
    guestTitle: "Log in first",
    guestText: "The application is linked to your profile — log in with your phone in a minute.",
    guestCta: "Log in and continue",
    doneTitle: "You are a Joyzone partner!",
    doneText: "Add your first place — after moderation it appears in the catalog.",
    alreadyTitle: "You are already a partner",
    alreadyText: "Add a new place or manage requests in your cabinet.",
    addPlace: "Add a place",
    cabinet: "Open cabinet",
    loadError: "Could not load space types.",
    sendError: "Could not send the application.",
    required: "Please fill in this field.",
    needCategory: "Choose at least one space type.",
    needPhone: "Enter the full phone number.",
  },
};

export function usePartnerText() {
  const { lang } = useContext(LanguageContext);
  return { t: PARTNER_TEXT[lang] || PARTNER_TEXT.uz, lang };
}

const REGIONS = [
  ["Toshkent", "Ташкент", "Tashkent"],
  ["Toshkent viloyati", "Ташкентская обл.", "Tashkent region"],
  ["Samarqand", "Самарканд", "Samarkand"],
  ["Buxoro", "Бухара", "Bukhara"],
  ["Andijon", "Андижан", "Andijan"],
  ["Namangan", "Наманган", "Namangan"],
  ["Farg'ona", "Фергана", "Fergana"],
  ["Qashqadaryo", "Кашкадарья", "Kashkadarya"],
  ["Surxondaryo", "Сурхандарья", "Surkhandarya"],
  ["Xorazm", "Хорезм", "Khorezm"],
  ["Navoiy", "Навои", "Navoi"],
  ["Jizzax", "Джизак", "Jizzakh"],
  ["Sirdaryo", "Сырдарья", "Syrdarya"],
  ["Qoraqalpog'iston", "Каракалпакстан", "Karakalpakstan"],
];
const LANG_INDEX = { uz: 0, ru: 1, en: 2 };
const PLACES_COUNTS = ["1", "2-5", "6+"];
const DEALS = ["rent", "sale", "both"];

function initialForm() {
  const name = getStorageItem(STORAGE_KEYS.profile.name, "") || "";
  const phone = getStorageItem(STORAGE_KEYS.profile.phone, "") || "";
  return {
    company_name: "",
    // The cached name falls back to the phone number for new accounts.
    contact_name: /\d{5,}/.test(name) || name === "Mehmon" ? "" : name,
    phone_number: phone.startsWith("+") ? phone : "+998 ",
    city: "",
    categories: [],
    places_count: "1",
    deal_type: "rent",
    comment: "",
  };
}

function Check() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function PartnerReady({ t, title, text }) {
  return (
    <div className="bp-card bp-ready" role="status">
      <span className="bp-ready-badge"><Check /></span>
      <h3>{title}</h3>
      <p>{text}</p>
      <div className="bp-ready-actions">
        <button type="button" className="bp-btn is-primary" onClick={() => navigate(ADD_PLACE_PATH)}>{t.addPlace}</button>
        <button type="button" className="bp-btn is-ghost" onClick={() => navigate("/host-today")}>{t.cabinet}</button>
      </div>
    </div>
  );
}

export default function BecomePartnerForm() {
  const { t, lang } = usePartnerText();
  const account = useAccountRole();
  const [form, setForm] = useState(initialForm);
  const [categories, setCategories] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [errors, setErrors] = useState({});
  const [sendError, setSendError] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    api.get("/api/categories/", { skipAuth: true })
      .then((res) => setCategories(res.data?.results || res.data || []))
      .catch(() => setLoadError(t.loadError));
    // Text language changes do not need a refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (done) return <PartnerReady t={t} title={t.doneTitle} text={t.doneText} />;
  if (account.isAuthed && account.canListPlaces) return <PartnerReady t={t} title={t.alreadyTitle} text={t.alreadyText} />;

  if (!account.isAuthed) {
    return (
      <div className="bp-card bp-guest">
        <span className="bp-guest-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><path d="m10 17 5-5-5-5" /><path d="M15 12H3" /></svg>
        </span>
        <h3>{t.guestTitle}</h3>
        <p>{t.guestText}</p>
        <button type="button" className="bp-btn is-primary" onClick={() => loginThenReturn(BECOME_PARTNER_PATH)}>{t.guestCta}</button>
      </div>
    );
  }

  const set = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };
  const toggleCategory = (id) => set("categories", form.categories.includes(id) ? form.categories.filter((item) => item !== id) : [...form.categories, id]);

  const validate = () => {
    const found = {};
    ["company_name", "contact_name", "city"].forEach((key) => {
      if (!String(form[key]).trim()) found[key] = t.required;
    });
    if (form.phone_number.replace(/\D/g, "").length < 9) found.phone_number = t.needPhone;
    if (!form.categories.length) found.categories = t.needCategory;
    return found;
  };

  const submit = async (event) => {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) return;
    setSending(true);
    setSendError("");
    try {
      const response = await api.post("/api/auth/become-partner/", form);
      cacheProfile(response.data);
      setDone(true);
    } catch (error) {
      const data = error?.response?.data;
      if (data && typeof data === "object" && !data.detail) {
        setErrors(Object.fromEntries(Object.entries(data).map(([key, value]) => [key, Array.isArray(value) ? value[0] : String(value)])));
      } else {
        setSendError(getApiErrorMessage(error, t.sendError));
      }
    } finally {
      setSending(false);
    }
  };

  const nameKey = `name_${lang}`;
  const field = (key) => (errors[key] ? <small className="bp-error">{errors[key]}</small> : null);

  return (
    <form className="bp-card bp-form" onSubmit={submit} noValidate>
      <header>
        <h3>{t.formTitle}</h3>
        <p>{t.formHint}</p>
      </header>

      <div className="bp-row">
        <label className="bp-field">
          <span>{t.company}</span>
          <input data-testid="partner-company" value={form.company_name} maxLength={150} required placeholder={t.companyPh} onChange={(e) => set("company_name", e.target.value)} />
          {field("company_name")}
        </label>
        <label className="bp-field">
          <span>{t.contact}</span>
          <input value={form.contact_name} maxLength={150} required placeholder={t.contactPh} onChange={(e) => set("contact_name", e.target.value)} />
          {field("contact_name")}
        </label>
      </div>

      <div className="bp-row">
        <label className="bp-field">
          <span>{t.phone}</span>
          <input type="tel" inputMode="tel" value={form.phone_number} maxLength={20} required onChange={(e) => set("phone_number", e.target.value)} />
          {field("phone_number")}
        </label>
        <label className="bp-field">
          <span>{t.city}</span>
          <select value={form.city} required onChange={(e) => set("city", e.target.value)}>
            <option value="" disabled>{t.cityPh}</option>
            {REGIONS.map((names) => <option key={names[0]} value={names[0]}>{names[LANG_INDEX[lang] ?? 0]}</option>)}
          </select>
          {field("city")}
        </label>
      </div>

      <fieldset className="bp-field">
        <legend>{t.categories}</legend>
        {loadError ? <small className="bp-error">{loadError}</small> : null}
        <div className="bp-chips">
          {categories.map((category) => {
            const active = form.categories.includes(category.id);
            return (
              <button key={category.id} type="button" className={`bp-chip${active ? " is-active" : ""}`} aria-pressed={active} onClick={() => toggleCategory(category.id)}>
                <i aria-hidden="true" />
                {category[nameKey] || category.name_uz}
              </button>
            );
          })}
        </div>
        {field("categories")}
      </fieldset>

      <div className="bp-row is-choices">
        <fieldset className="bp-field">
          <legend>{t.count}</legend>
          <div className="bp-segment">
            {PLACES_COUNTS.map((value) => (
              <button key={value} type="button" className={form.places_count === value ? "is-active" : ""} aria-pressed={form.places_count === value} onClick={() => set("places_count", value)}>{value}</button>
            ))}
          </div>
        </fieldset>
        <fieldset className="bp-field">
          <legend>{t.deal}</legend>
          <div className="bp-segment">
            {DEALS.map((value) => (
              <button key={value} type="button" className={form.deal_type === value ? "is-active" : ""} aria-pressed={form.deal_type === value} onClick={() => set("deal_type", value)}>{t.deals[value]}</button>
            ))}
          </div>
        </fieldset>
      </div>

      <label className="bp-field">
        <span>{t.comment}</span>
        <textarea rows={3} maxLength={1000} value={form.comment} placeholder={t.commentPh} onChange={(e) => set("comment", e.target.value)} />
      </label>

      {sendError ? <div className="bp-alert" role="alert">{sendError}</div> : null}

      <button data-testid="partner-submit" type="submit" className="bp-btn is-primary is-wide" disabled={sending}>
        {sending ? t.sending : t.submit}
      </button>
      <p className="bp-terms">{t.terms}</p>
    </form>
  );
}
