import React, { useMemo, useState, useEffect, useRef } from "react";
import api, { getAccessToken, getApiErrorMessage } from "../api/client.js";

import { Header as JoyNavbar } from "./HomeHero.jsx";
import { JoyFooter, SimpleFooter, PropertyCard } from "./ListingsSection.jsx";
import { HostListingDetailModal } from "./HostListingDetailModal.jsx";
import { normalizePlace } from "../utils/placeMapper.js";
import {
  fetchPlaceAvailability,
  getAvailabilityDayStatus,
  getCalendarAvailabilityRange,
  isAvailabilityDayUnavailable
} from "../utils/availability.js";
import { fetchFavoritesFromBackend, getLocalFavorites } from "../utils/favoritesManager.js";
import { normalizeBooking } from "../utils/bookingMapper.js";
import { cacheProfile, normalizeProfile, profileToUserState } from "../utils/profileMapper.js";
import { getStorageItem, readJsonStorage, STORAGE_KEYS, writeJsonStorage } from "../utils/storageKeys.js";
import "./UserProfile.css";
import "./HostDashboard.css";

function slugify(text) {
  return (text || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

const initialProfile = {
  name: "",
  firstName: "",
  lastName: "",
  role: "Joyzone foydalanuvchisi",
  city: "Toshkent",
  birthYear: "",
  languages: "Uzbek, Russian",
  email: "",
  phone: "",
  work: "",
  company: "",
  interests: "",
  about: ""
};

const profileSections = [
  {
    id: "identity",
    label: "Asosiy",
    title: "Ismingiz",
    description: "Ism va qisqa tavsif profilida ko'rinadi.",
    fields: [
      { key: "firstName", label: "Ism", type: "text", placeholder: "Aziz" },
      { key: "lastName", label: "Familiya", type: "text", placeholder: "Karimov" },
      { key: "role", label: "Qisqa tavsif", type: "text", placeholder: "Founder, product jamoasi" }
    ]
  },
  {
    id: "location",
    label: "Shahar",
    title: "Qayerdasiz",
    description: "Shahar hamkorlar uchun kontekstni tezroq tushunishga yordam beradi.",
    fields: [
      { key: "city", label: "Shahar", type: "text", placeholder: "Toshkent" },
      { key: "birthYear", label: "Tug'ilgan yil", type: "text", placeholder: "1996" }
    ]
  },
  {
    id: "work",
    label: "Ish",
    title: "Siz nima bilan shug'ullanasiz",
    description: "Bu ofis, kovorking yoki zal formatini tanlashga yordam beradi.",
    fields: [
      { key: "work", label: "Ish yoki soha", type: "text", placeholder: "Product jamoasi asoschisi" },
      { key: "company", label: "Kompaniya yoki jamoa", type: "text", placeholder: "Joyzone client" }
    ]
  },
  {
    id: "languages",
    label: "Tillar",
    title: "Qaysi tillarda gaplashasiz",
    description: "Tillarni vergul bilan ajrating.",
    fields: [
      { key: "languages", label: "Tillar", type: "text", placeholder: "Uzbek, Russian, English" }
    ]
  },
  {
    id: "about",
    label: "O'zim haqimda",
    title: "O'zingiz haqingizda ayting",
    description: "Qisqa matn profilni aniqroq va jonliroq qiladi.",
    fields: [
      { key: "about", label: "Tavsif", type: "textarea", placeholder: "Qaysi joylarni odatda izlashingiz haqida..." }
    ]
  },
  {
    id: "interests",
    label: "Qiziqishlar",
    title: "Sizga nima qiziqarli",
    description: "Eng ko'p tanlaydigan joy formatlari.",
    fields: [
      { key: "interests", label: "Qiziqishlar", type: "textarea", placeholder: "Kovorkinglar, workshop zallari..." }
    ]
  },
  {
    id: "contacts",
    label: "Kontaktlar",
    title: "Aloqa ma'lumotlari",
    description: "Arizalar va bronlar bo'yicha muloqot uchun ishlatiladi.",
    fields: [
      { key: "email", label: "Email", type: "email", placeholder: "name@mail.com" },
      { key: "phone", label: "Telefon", type: "tel", placeholder: "+998 90 123 45 67" }
    ]
  }
];

const BACKEND_PROFILE_DRAFT_KEYS = new Set(["firstName", "lastName", "email", "phone"]);
const CANCELLABLE_BOOKING_STATUSES = new Set(["pending", "confirmed"]);
const ACTIVE_BOOKING_STATUSES = new Set(["pending", "confirmed"]);

const BOOKING_STATUS_LABELS = {
  pending: "Kutilmoqda",
  confirmed: "Tasdiqlangan",
  cancelled: "Bekor qilingan",
  completed: "Yakunlangan",
  blocked: "Yopilgan",
};

const PAYMENT_STATUS_LABELS = {
  created: "Yaratilgan",
  unpaid: "To'lanmagan",
  test_paid: "Test to'lov qilingan",
  paid: "To'langan",
  failed: "Muvaffaqiyatsiz",
  refunded: "Qaytarilgan",
};

function ProfileIcon({ type }) {
  const paths = {
    edit: ["M12 20h9", "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"],
    user: ["M20 21a8 8 0 0 0-16 0", "M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z"],
    calendar: ["M7 3v4M17 3v4", "M4 8h16v13H4z", "M8 12h.01M12 12h.01M16 12h.01M8 16h.01"],
    payment: ["M3 6h18v12H3z", "M3 10h18", "M7 15h3"],
    heart: ["M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 1 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z"],
    check: ["m5 13 4 4L19 7"],
    empty: ["M4 5h16v14H4z", "M8 9h8M8 13h5"],
    arrow: ["M5 12h14", "m13 6 6 6-6 6"],
    close: ["M18 6 6 18", "M6 6l12 12"],
    listing: ["M4 5h16v14H4z", "M8 9h8M8 13h8M8 17h4"]
  };

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {(paths[type] || paths.user).map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  );
}

function EmptyState({ title, text, action, href }) {
  return (
    <div className="profile-empty-state">
      <span><ProfileIcon type="empty" /></span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action ? <a href={href}>{action}<ProfileIcon type="arrow" /></a> : null}
    </div>
  );
}

function buildProfileBookingView(rawBooking = {}, index = 0) {
  const booking = normalizeBooking(rawBooking, { fallbackId: `profile-booking-${index}` });
  return {
    ...booking,
    title: booking.place_title,
    type: booking.durationLabel || rawBooking.type || "Bron",
    date: rawBooking.date || booking.start_date,
    time: rawBooking.time || booking.time || booking.durationLabel,
    location: rawBooking.location || booking.place_details?.location || "Toshkent",
    status: rawBooking.status || booking.status,
    href: rawBooking.href || `/space-${booking.place_id || booking.place_title}`,
  };
}

function formatBookingDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("uz-UZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatBookingAmount(booking) {
  return `${new Intl.NumberFormat("uz-UZ").format(Number(booking.amount) || 0)} ${booking.currency || "UZS"}`;
}

function bookingStatusLabel(status) {
  const value = String(status || "pending").toLowerCase();
  return `${BOOKING_STATUS_LABELS[value] || value} (${value})`;
}

function paymentStatusLabel(status) {
  const value = String(status || "unpaid").toLowerCase();
  return `${PAYMENT_STATUS_LABELS[value] || value} (${value})`;
}

function normalizeBookingResponse(data) {
  const items = data?.results || data || [];
  return Array.isArray(items)
    ? items.map((booking, index) => normalizeBooking(booking, { fallbackId: `profile-booking-${index}` }))
    : [];
}

function normalizePaymentResponse(data) {
  const items = data?.results || data || [];
  return Array.isArray(items) ? items : [];
}

function paymentSubject(payment) {
  if (payment.booking_id) return `Bron: ${payment.booking_title || `#${payment.booking_id}`}`;
  if (payment.tariff_subscription_id) return `Tarif: ${payment.tariff_name || `#${payment.tariff_id || payment.tariff_subscription_id}`}`;
  return "To'lov";
}

function formatPaymentAmount(payment) {
  return `${new Intl.NumberFormat("uz-UZ").format(Number(payment.amount) || 0)} ${payment.currency || "UZS"}`;
}

function getCompletion(data) {
  const keys = ["firstName", "lastName", "role", "city", "birthYear", "languages", "email", "phone", "work", "company", "interests", "about"];
  const filled = keys.filter((key) => String(data[key] || "").trim()).length;
  return Math.round((filled / keys.length) * 100);
}

function UserProfile({ userState, setUserState }) {
  const [activeTab, setActiveTab] = useState("about");
  const [selectedListing, setSelectedListing] = useState(null);
  const [likedSpaces, setLikedSpaces] = useState(() => import.meta.env.DEV ? getLocalFavorites() : []);
  const [favoritesLoading, setFavoritesLoading] = useState(true);
  const [favoritesError, setFavoritesError] = useState("");
  const [favoritesUsingDevFallback, setFavoritesUsingDevFallback] = useState(false);
  const avatarInputRef = useRef(null);

  useEffect(() => {
    let active = true;
    setFavoritesLoading(true);
    setFavoritesError("");
    setFavoritesUsingDevFallback(false);

    if (!userState?.isAuthed || !getAccessToken()) {
      setLikedSpaces([]);
      setFavoritesLoading(false);
      setFavoritesError("Saqlangan joylarni ko'rish uchun tizimga kiring.");
      return undefined;
    }

    fetchFavoritesFromBackend({
      onDevFallback: () => active && setFavoritesUsingDevFallback(true),
    })
      .then((favorites) => {
        if (active) setLikedSpaces(favorites);
      })
      .catch((error) => {
        if (!active) return;
        setLikedSpaces([]);
        setFavoritesError(getApiErrorMessage(error, "Не удалось загрузить избранное"));
      })
      .finally(() => {
        if (active) setFavoritesLoading(false);
      });
    
    const handleUpdate = (event) => {
      setLikedSpaces(getLocalFavorites());
      if (event.detail?.source === "dev-fallback") setFavoritesUsingDevFallback(true);
      if (["backend", "backend-merge"].includes(event.detail?.source)) {
        setFavoritesError("");
        setFavoritesUsingDevFallback(false);
      }
    };
    window.addEventListener("joyzone-favorites-update", handleUpdate);
    return () => {
      active = false;
      window.removeEventListener("joyzone-favorites-update", handleUpdate);
    };
  }, [userState?.isAuthed]);

  const profileData = useMemo(() => {
    const activeName = userState?.name || getStorageItem(STORAGE_KEYS.profile.name) || "Foydalanuvchi";
    const activeEmail = userState?.email || getStorageItem(STORAGE_KEYS.profile.email, "");
    const activePhone = userState?.phone || getStorageItem(STORAGE_KEYS.profile.phone, "");
    const localOnly = readJsonStorage(STORAGE_KEYS.profile.localQuestionnaire, {});
    return {
      ...initialProfile,
      ...localOnly,
      name: activeName,
      email: activeEmail,
      phone: activePhone
    };
  }, [userState]);
  const completion = 50;
  const [profileError, setProfileError] = useState("");
  const [avatarSaving, setAvatarSaving] = useState(false);

  // Handle avatar upload and change
  const handleAvatarSelect = () => {
    if (!avatarSaving && avatarInputRef.current) {
      avatarInputRef.current.click();
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result;
      const token = getAccessToken();
      if (!token) {
        setProfileError("Profil rasmini saqlash uchun tizimga kiring.");
        return;
      }
      setAvatarSaving(true);
      try {
        const response = await api.patch("/api/auth/profile/", { avatar: base64Data });
        const profile = cacheProfile(response.data);
        setUserState?.(profileToUserState(profile, userState));
        setProfileError("");
      } catch (err) {
        setProfileError(getApiErrorMessage(err, "Не удалось обновить аватар"));
      } finally {
        setAvatarSaving(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarRemove = async () => {
    const token = getAccessToken();
    if (!token) {
      setProfileError("Profil rasmini o'chirish uchun tizimga kiring.");
      return;
    }
    setAvatarSaving(true);
    try {
      const response = await api.patch("/api/auth/profile/", { avatar: null });
      const profile = cacheProfile(response.data);
      setUserState?.(profileToUserState(profile, userState));
      setProfileError("");
    } catch (err) {
      setProfileError(getApiErrorMessage(err, "Не удалось удалить аватар"));
    } finally {
      setAvatarSaving(false);
    }
  };

  // Property states
  const [myObjects, setMyObjects] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [availabilityByPlace, setAvailabilityByPlace] = useState({});
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [bookingsLoaded, setBookingsLoaded] = useState(false);
  const [bookingsError, setBookingsError] = useState("");
  const [bookingActionError, setBookingActionError] = useState("");
  const [bookingsSuccess, setBookingsSuccess] = useState("");
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [paymentsError, setPaymentsError] = useState("");
  const [cancellingBookingId, setCancellingBookingId] = useState(null);
  const [cancelBookingTarget, setCancelBookingTarget] = useState(null);
  const [cancelError, setCancelError] = useState("");

  // Property Manager States
  const [selectedObject, setSelectedObject] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Add Object form states
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("Kovorking");
  const [newPrice, setNewPrice] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newPeople, setNewPeople] = useState(10);
  const [newArea, setNewArea] = useState(80);
  const [newDesc, setNewDesc] = useState("");
  const [newSpaceImages, setNewSpaceImages] = useState([]);

  // Calendar states
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(5); // June
  const [rangeStart, setRangeStart] = useState(null);
  const [rangeEnd, setRangeEnd] = useState(null);
  const [blockingNote, setBlockingNote] = useState("");
  const [customPriceVal, setCustomPriceVal] = useState("");

  const fetchUserData = async () => {
    if (!userState?.isAuthed || !getAccessToken()) {
      setMyObjects([]);
      setAllBookings([]);
      setPayments([]);
      setBookingsLoading(false);
      setBookingsLoaded(false);
      setPaymentsLoading(false);
      setBookingsError("Bronlar tarixini ko'rish uchun tizimga kiring.");
      setPaymentsError("To'lovlar tarixini ko'rish uchun tizimga kiring.");
      return;
    }

    setBookingsLoading(true);
    setPaymentsLoading(true);
    setBookingsLoaded(false);
    const [spacesResult, bookingsResult, paymentsResult] = await Promise.allSettled([
      api.get("/api/places/"),
      api.get("/api/bookings/", { params: { scope: "mine" } }),
      api.get("/api/payments/my/"),
    ]);

    if (spacesResult.status === "fulfilled") {
      const spacesData = spacesResult.value.data?.results || spacesResult.value.data || [];
      const userSpaces = spacesData.filter((space) => (
        space.owner === userState.id
        || space.owner_id === userState.id
        || space.owner_name === userState.name
      ));
      setMyObjects(userSpaces);
      setProfileError("");
    } else {
      setMyObjects([]);
      setProfileError(getApiErrorMessage(spacesResult.reason, "Не удалось загрузить объекты профиля"));
    }

    if (bookingsResult.status === "fulfilled") {
      setAllBookings(normalizeBookingResponse(bookingsResult.value.data));
      setBookingsError("");
      setBookingsLoaded(true);
    } else {
      setAllBookings([]);
      setBookingsError(getApiErrorMessage(bookingsResult.reason, "Не удалось загрузить историю бронирований"));
    }

    if (paymentsResult.status === "fulfilled") {
      setPayments(normalizePaymentResponse(paymentsResult.value.data));
      setPaymentsError("");
    } else {
      setPayments([]);
      setPaymentsError(getApiErrorMessage(paymentsResult.reason, "Не удалось загрузить историю платежей"));
    }
    setBookingsLoading(false);
    setPaymentsLoading(false);
  };

  useEffect(() => {
    fetchUserData();
  }, [userState?.id, userState?.email, userState?.isAuthed]);

  useEffect(() => {
    if (!cancelBookingTarget) return undefined;
    const handleEscape = (event) => {
      if (event.key === "Escape" && !cancellingBookingId) setCancelBookingTarget(null);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [cancelBookingTarget, cancellingBookingId]);

  const openCancelBookingModal = (booking) => {
    if (!booking?.id || !CANCELLABLE_BOOKING_STATUSES.has(booking.status)) return;
    setCancelError("");
    setBookingActionError("");
    setBookingsSuccess("");
    setCancelBookingTarget(booking);
  };

  const closeCancelBookingModal = () => {
    if (cancellingBookingId) return;
    setCancelBookingTarget(null);
    setCancelError("");
  };

  const handleCancelBooking = async () => {
    const booking = cancelBookingTarget;
    if (!booking?.id || !CANCELLABLE_BOOKING_STATUSES.has(booking.status)) return;

    setCancellingBookingId(booking.id);
    setCancelError("");
    setBookingActionError("");
    setBookingsSuccess("");
    let cancellationConfirmed = false;
    try {
      const response = await api.post(`/api/bookings/${booking.id}/cancel/`);
      const cancelledBooking = normalizeBooking(response.data);
      if (cancelledBooking.status !== "cancelled") {
        throw new Error("Backend bronni bekor qilingan deb tasdiqlamadi.");
      }
      cancellationConfirmed = true;
      setAllBookings((current) => current.map((item) => (
        String(item.id) === String(cancelledBooking.id) ? cancelledBooking : item
      )));
      setCancelBookingTarget(null);

      setBookingsLoading(true);
      const refreshedBookingsResponse = await api.get("/api/bookings/", {
        params: { scope: "mine" },
      });
      setAllBookings(normalizeBookingResponse(refreshedBookingsResponse.data));
      setBookingsLoaded(true);
      setBookingsSuccess(`${cancelledBooking.place_title} broni muvaffaqiyatli bekor qilindi.`);
    } catch (err) {
      const message = getApiErrorMessage(
        err,
        cancellationConfirmed
          ? "Bron bekor qilindi, ammo tarixni qayta yuklab bo'lmadi."
          : "Bronni bekor qilib bo'lmadi"
      );
      setBookingActionError(message);
      if (!cancellationConfirmed) setCancelError(message);
    } finally {
      setCancellingBookingId(null);
      setBookingsLoading(false);
    }
  };

  const handleAddSpace = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newSpaceData = {
      name: newName,
      type: newType,
      price: newPrice,
      status: "Active",
      owner_id: userState?.id || "user_1",
      location: newLocation,
      people: Number(newPeople) || 10,
      area: Number(newArea) || 80,
      images: newSpaceImages,
      promoted: false,
      priceOverrides: {}
    };

    try {
      await api.post("/api/places/", newSpaceData, {
        headers: {
          'Authorization': `Bearer ${getAccessToken()}`
        }
      });
      setNewName("");
      setNewPrice("");
      setNewLocation("");
      setNewPeople(10);
      setNewArea(80);
      setNewDesc("");
      setNewSpaceImages([]);
      setShowAddForm(false);
      await fetchUserData();
      setProfileError("");
    } catch (err) {
      const message = getApiErrorMessage(err, "Obyektni qo'shib bo'lmadi");
      setProfileError(message);
      alert("Xatolik yuz berdi: " + message);
    }
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      // For now, directly use base64 since we are migrating backend
      setNewSpaceImages(prev => [...prev, reader.result]);
    };
    reader.readAsDataURL(file);
  };

  const getDaysInMonth = (year, month) => {
    const date = new Date(Date.UTC(year, month, 1));
    const days = [];

    let startDay = date.getUTCDay();
    startDay = startDay === 0 ? 6 : startDay - 1;

    for (let i = 0; i < startDay; i++) {
      days.push({ label: "", dateStr: null, isMuted: true });
    }

    const totalDays = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({ label: d, dateStr, isMuted: false });
    }
    return days;
  };

  const handleDayClick = (dateStr) => {
    if (!dateStr) return;
    if (isActiveDateUnavailable(dateStr)) return;
    if (rangeStart && !rangeEnd) {
      if (dateStr < rangeStart) {
        setRangeStart(dateStr);
      } else {
        setRangeEnd(dateStr);
      }
    } else {
      setRangeStart(dateStr);
      setRangeEnd(null);
    }
  };

  const handleManualBooking = async () => {
    if (!rangeStart) return;
    const start = rangeStart;
    const end = rangeEnd || rangeStart;
    const placeId = activeObject.id || activeObject._id;

    try {
      await api.post("/api/bookings/", {
        place: placeId,
        start_date: start,
        end_date: end,
        duration_type: "daily",
        guests: 1,
        amount: 0,
        currency: "UZS",
        status: "blocked",
        payment_status: "unpaid",
        note: blockingNote || "Mulkdor tomonidan yopilgan"
      }, {
        headers: {
          'Authorization': `Bearer ${getAccessToken()}`
        }
      });

      setBlockingNote("");
      setRangeStart(null);
      setRangeEnd(null);
      await fetchUserData();
      const range = getCalendarAvailabilityRange(currentYear, currentMonth);
      const availability = await fetchPlaceAvailability({ placeId, ...range, skipAuth: false });
      setAvailabilityByPlace((current) => ({ ...current, [placeId]: availability }));
      setProfileError("");
      alert("Kunlar muvaffaqiyatli band qilindi / yopildi!");
    } catch (err) {
      const message = getApiErrorMessage(err, "Kunlarni yopib bo'lmadi");
      setProfileError(message);
      alert("Xatolik yuz berdi: " + message);
    }
  };

  const handleSavePriceOverrides = async () => {
    if (!rangeStart || !customPriceVal) return;
    const newOverrides = { ...(activeObject.priceOverrides || {}) };

    const startStr = rangeStart;
    const endStr = rangeEnd || rangeStart;

    const start = new Date(startStr + "T00:00:00Z");
    const end = new Date(endStr + "T00:00:00Z");

    let d = new Date(start);
    while (d <= end) {
      const dStr = d.toISOString().split("T")[0];
      newOverrides[dStr] = Number(customPriceVal);
      d.setUTCDate(d.getUTCDate() + 1);
    }

    try {
      await api.put(`/api/places/${activeObject.id || activeObject._id}/`, {
        priceOverrides: newOverrides
      }, {
        headers: {
          'Authorization': `Bearer ${getAccessToken()}`
        }
      });

      setCustomPriceVal("");
      setRangeStart(null);
      setRangeEnd(null);
      await fetchUserData();
      setProfileError("");
      alert("Kunlik narx(lar) muvaffaqiyatli o'zgartirildi!");
    } catch (err) {
      const message = getApiErrorMessage(err, "Narxni saqlab bo'lmadi");
      setProfileError(message);
      alert("Xatolik yuz berdi: " + message);
    }
  };

  const activeObject = selectedObject
    ? (myObjects.find(o => o.id === selectedObject.id || o._id === selectedObject.id) || selectedObject)
    : null;
  const activeObjectId = activeObject ? (activeObject.id || activeObject._id) : null;
  const activeAvailability = activeObjectId ? availabilityByPlace[activeObjectId] : null;

  useEffect(() => {
    if (!activeObjectId) return;

    let cancelled = false;
    const range = getCalendarAvailabilityRange(currentYear, currentMonth);
    fetchPlaceAvailability({ placeId: activeObjectId, ...range, skipAuth: false })
      .then((data) => {
        if (!cancelled) {
          setAvailabilityByPlace((current) => ({ ...current, [activeObjectId]: data }));
        }
      })
      .catch((err) => setProfileError(getApiErrorMessage(err, "Не удалось загрузить календарь доступности")));

    return () => {
      cancelled = true;
    };
  }, [activeObjectId, currentYear, currentMonth]);

  const isActiveDateUnavailable = (dateStr) => (
    Boolean(dateStr) && isAvailabilityDayUnavailable(activeAvailability, dateStr)
  );

  const spaceBookings = activeObject && Array.isArray(allBookings)
    ? (activeAvailability?.bookings || allBookings).filter(b => {
        if (!b) return false;
        const spaceId = typeof b.space_id === "object" && b.space_id !== null
          ? b.space_id?.id || b.space_id?._id
          : b.space_id || b.place_id || b.place || b.place_details?.id || b.place_details?._id;
        return spaceId && (spaceId === activeObject.id || spaceId === activeObject._id);
      })
    : [];

  const calendarDays = selectedObject ? getDaysInMonth(currentYear, currentMonth).map((day) => ({
    ...day,
    status: day.dateStr ? getAvailabilityDayStatus(activeAvailability, day.dateStr) : "free",
    isUnavailable: day.dateStr ? isActiveDateUnavailable(day.dateStr) : false,
  })) : [];

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
    setRangeStart(null);
    setRangeEnd(null);
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
    setRangeStart(null);
    setRangeEnd(null);
  };

  const monthNames = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];

  const formatMoney = (val) => {
    return `${new Intl.NumberFormat("uz-UZ").format(val)} so'm`;
  };

  const displayedBookings = allBookings.map(buildProfileBookingView);
  const activeBookingObj = [...displayedBookings]
    .filter((booking) => {
      if (!ACTIVE_BOOKING_STATUSES.has(booking.status)) return false;
      const endTime = new Date(booking.end_time).getTime();
      return !Number.isFinite(endTime) || endTime >= Date.now();
    })
    .sort((left, right) => new Date(left.start_time).getTime() - new Date(right.start_time).getTime())[0] || null;

  const totalVal = activeBookingObj?.amount || 0;
  const formattedTotal = `${new Intl.NumberFormat("uz-UZ").format(totalVal)} ${activeBookingObj?.currency || "UZS"}`;
  const activeBookingCacheKey = activeBookingObj
    ? `${activeBookingObj.id}:${activeBookingObj.status}:${activeBookingObj.payment_status}:${activeBookingObj.updated_at}`
    : "none";

  useEffect(() => {
    if (!bookingsLoaded || !userState?.isAuthed) return;
    const cached = userState?.activeBooking;
    if (
      String(cached?.id || "") === String(activeBookingObj?.id || "")
      && String(cached?.status || "") === String(activeBookingObj?.status || "")
      && String(cached?.payment_status || cached?.paymentStatus || "") === String(activeBookingObj?.payment_status || "")
    ) {
      return;
    }

    setUserState?.({
      ...userState,
      activeBooking: activeBookingObj ? {
        ...activeBookingObj,
        placeSnapshot: activeBookingObj.place_details,
        spaceTitle: activeBookingObj.place_title,
      } : null,
    });
  }, [bookingsLoaded, activeBookingCacheKey]);

  const tabs = [
    { 
      id: "about", 
      label: "Profil", 
      count: `${completion}%`, 
      icon: "user",
      badge: completion < 100 ? "To'ldirilmagan" : null
    },
    { id: "history", label: "Tarix", count: displayedBookings.length, icon: "calendar" },
    { id: "payments", label: "To'lovlar", count: payments.length, icon: "payment" },
    { id: "likes", label: "Saqlangan", count: likedSpaces.length, icon: "heart" }
  ];

  return (
    <main className="user-profile-shell">
      <JoyNavbar userState={userState} setUserState={setUserState} activeIndex={-1} variant="dashboard" />

      {profileError ? (
        <div style={{ maxWidth: 1180, margin: "18px auto 0", padding: "12px 16px", borderRadius: 14, background: "#fef2f2", color: "#991b1b", fontWeight: 700 }}>
          {profileError}
        </div>
      ) : null}

      <section className="profile-unified-panel">
        <section className="profile-content-panel">
          <aside className="profile-sidebar" aria-label="Profil bo'limlari">
            <span>Profilim</span>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={activeTab === tab.id ? "is-active" : ""}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="profile-tab-label">
                  <ProfileIcon type={tab.icon} />
                  <b>{tab.label}</b>
                  {tab.badge && (
                    <span className="profile-tab-badge" style={{
                      background: "rgba(239, 68, 68, 0.15)",
                      color: "#ef4444",
                      fontSize: "8.5px",
                      fontWeight: "800",
                      padding: "2px 6px",
                      borderRadius: "6px",
                      marginLeft: "6px",
                      textTransform: "uppercase",
                      letterSpacing: "0.02em",
                      display: "inline-flex",
                      alignItems: "center",
                      whiteSpace: "nowrap",
                      flexShrink: 0
                    }}>
                      {tab.badge}
                    </span>
                  )}
                </span>
                <small>{tab.count}</small>
              </button>
            ))}
          </aside>

          <div className="profile-tab-content">
            {activeTab === "about" ? (
              <div className="profile-tab-panel" key="about">
                {/* Active booking is derived from the latest backend bookings response. */}
                {activeBookingObj && (
                  <div className="profile-active-alert" style={{
                    background: "rgba(249, 115, 22, 0.08)",
                    border: "1px solid rgba(249, 115, 22, 0.15)",
                    borderRadius: "18px",
                    padding: "16px 20px",
                    color: "#ea580c",
                    marginBottom: "24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "16px"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span className="profile-alert-pulse" style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: "#ea580c",
                        display: "inline-block"
                      }} />
                      <div>
                        <strong style={{ display: "block", fontSize: "14px", fontWeight: "700" }}>
                          {bookingStatusLabel(activeBookingObj.status)}
                        </strong>
                        <span style={{ fontSize: "12px", opacity: 0.85 }}>
                          {activeBookingObj.place_title} uchun faol bron mavjud.
                        </span>
                      </div>
                    </div>
                    <button onClick={() => setActiveTab("history")} style={{
                      background: "#ea580c",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      padding: "6px 12px",
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: "pointer",
                      transition: "all 0.2s"
                    }}>
                      Tafsilotlar
                    </button>
                  </div>
                )}

                <section className="profile-hero-panel profile-edit-hero">
                  <div className="profile-main-card">
                    {/* Avatar with Progress Circle wrapper */}
                    <div className="profile-avatar-wrapper" onClick={handleAvatarSelect} style={{ cursor: "pointer" }} title="Rasm almashtirish uchun bosing">
                      <input 
                        type="file" 
                        ref={avatarInputRef} 
                        accept="image/*" 
                        onChange={handleAvatarChange} 
                        style={{ display: "none" }} 
                      />
                      <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: "rotate(-90deg)", position: "absolute", top: 0, left: 0 }}>
                        <circle cx="40" cy="40" r="36" fill="transparent" stroke="#e2e8f0" strokeWidth="3.5" />
                        <circle cx="40" cy="40" r="36" fill="transparent" stroke="#ea580c" strokeWidth="4" 
                          strokeDasharray={2 * Math.PI * 36}
                          strokeDashoffset={2 * Math.PI * 36 * (1 - completion / 100)}
                          style={{ transition: "stroke-dashoffset 0.5s ease" }}
                        />
                      </svg>
                      
                      <div className="profile-avatar" style={{
                        width: "66px",
                        height: "66px",
                        borderRadius: "50%",
                        background: userState?.avatar ? `url(${userState.avatar}) center/cover no-repeat` : "linear-gradient(135deg, #12283f, #294a6d)",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "18px",
                        fontWeight: "750",
                        position: "absolute",
                        top: "7px",
                        left: "7px",
                        boxShadow: "none",
                        overflow: "hidden"
                      }}>
                        {!userState?.avatar && (
                          userState?.name ? userState.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "AK"
                        )}
                      </div>

                      <div className="profile-avatar-tooltip">
                        {userState?.avatar ? "Almashtirish" : "Rasm yuklash"}
                      </div>
                    </div>

                    <div className="profile-heading">
                      <span>Joyzone profile</span>
                      <h1>{profileData.name}</h1>
                      <p>{profileData.role}</p>

                      {/* Interactive Avatar Action Buttons */}
                      <div style={{ display: "flex", gap: "8px", marginTop: "10px", flexWrap: "wrap" }}>
                        <button 
                          type="button" 
                          onClick={handleAvatarSelect}
                          style={{
                            background: "rgba(234, 88, 12, 0.12)",
                            color: "#ea580c",
                            border: "none",
                            borderRadius: "8px",
                            padding: "6px 12px",
                            fontSize: "12px",
                            fontWeight: "700",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            transition: "all 0.2s"
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                            <circle cx="12" cy="13" r="4"/>
                          </svg>
                          <span>{userState?.avatar ? "Rasm almashtirish" : "Rasm yuklash"}</span>
                        </button>

                        {userState?.avatar && (
                          <button 
                            type="button" 
                            onClick={handleAvatarRemove}
                            style={{
                              background: "rgba(239, 68, 68, 0.1)",
                              color: "#ef4444",
                              border: "none",
                              borderRadius: "8px",
                              padding: "6px 12px",
                              fontSize: "12px",
                              fontWeight: "700",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              transition: "all 0.2s"
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"/>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                            <span>O'chirish</span>
                          </button>
                        )}
                      </div>
                      {completion < 100 && (
                        <div className="profile-warning-badge" style={{
                          background: "#fffbeb",
                          border: "1px solid #fef3c7",
                          color: "#d97706",
                          padding: "6px 12px",
                          borderRadius: "12px",
                          fontSize: "11px",
                          fontWeight: "700",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          marginTop: "8px",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px"
                        }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#d97706", display: "inline-block" }} />
                          Profil to'ldirilmagan ({completion}%)
                        </div>
                      )}
                    </div>
                    <a className="profile-edit-button" href="/profile-edit">
                      <ProfileIcon type="edit" />
                      Anketa tahrirlash
                    </a>
                  </div>
                </section>

                {activeBookingObj && (
                  <section className="profile-active-booking-section" style={{ marginTop: "32px" }}>
                    <div className="profile-section-head">
                      <div>
                        <span>Faol buyurtma</span>
                        <h2>Arizangiz holati</h2>
                      </div>
                    </div>
                    <div className="host-listings-grid" style={{ display: "grid", gap: "24px" }}>
                      <article className="host-listing-shell" style={{ overflow: "visible" }}>
                        <PropertyCard 
                          item={normalizePlace({
                            ...(activeBookingObj.place_details || {}),
                            id: activeBookingObj.place_id,
                            title: activeBookingObj.place_title || "Joyzone",
                            price: formattedTotal,
                            people: activeBookingObj.guests || 1,
                          })}
                          index={0} 
                          onClick={(targetItem) => setSelectedListing(targetItem)}
                        />
                        
                        <div className="host-listing-meta" style={{ padding: "20px" }}>
                          <span style={{ 
                            background: "rgba(249, 115, 22, 0.15)", 
                            color: "#ea580c", 
                            padding: "4px 10px", 
                            borderRadius: "8px", 
                            fontWeight: "700", 
                            textTransform: "uppercase", 
                            fontSize: "11px", 
                            display: "inline-block", 
                            marginBottom: "12px" 
                          }}>
                            {bookingStatusLabel(activeBookingObj.status)}
                          </span>
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "12px" }}>
                            <div style={{ fontSize: "13px", color: "#64748b" }}>
                              Sana: <strong style={{ color: "#1e293b" }}>{activeBookingObj.date}</strong>
                            </div>
                            <div style={{ fontSize: "13px", color: "#64748b" }}>
                              Vaqt: <strong style={{ color: "#1e293b" }}>{activeBookingObj.time}</strong>
                            </div>
                            <div style={{ fontSize: "13px", color: "#64748b" }}>
                              To'lov holati: <strong style={{ color: "#1e293b" }}>{paymentStatusLabel(activeBookingObj.payment_status)}</strong>
                            </div>
                          </div>
                        </div>
                      </article>
                    </div>
                  </section>
                )}
              </div>
            ) : null}

            {activeTab === "history" ? (
              <div className="profile-tab-panel" key="history">
                <div className="profile-section-head">
                  <div>
                    <span>Tarix</span>
                    <h2>Bronlar tarixi</h2>
                  </div>
                  <a href="/filter">Joy bron qilish</a>
                </div>

                {bookingsSuccess ? (
                  <div className="profile-bookings-state is-success" role="status">{bookingsSuccess}</div>
                ) : null}
                {bookingActionError ? (
                  <div className="profile-bookings-state is-error" role="alert">{bookingActionError}</div>
                ) : null}

                {bookingsLoading ? (
                  <div className="profile-bookings-state" role="status">Bronlar yuklanmoqda...</div>
                ) : bookingsError ? (
                  <div className="profile-bookings-state is-error" role="alert">
                    <p>{bookingsError}</p>
                    <button type="button" className="profile-booking-link" onClick={fetchUserData}>Qayta urinish</button>
                  </div>
                ) : displayedBookings.length === 0 ? (
                  <EmptyState
                    title="Hozircha bronlar yo'q"
                    text="Birinchi joyingizni tanlaganingizdan keyin bron shu yerda backend ma'lumotlari bilan ko'rinadi."
                    action="Joy tanlash"
                    href="/filter"
                  />
                ) : (
                  <div className="profile-bookings-grid">
                    {displayedBookings.map((booking) => (
                      <article key={booking.id} className="profile-booking-card">
                        <div>
                          <span>{bookingStatusLabel(booking.status)}</span>
                          <h3>{booking.place_title}</h3>
                          <p>{booking.durationLabel} ({booking.duration_type})</p>
                        </div>
                        <dl>
                          <div>
                            <dt>Boshlanish</dt>
                            <dd>{formatBookingDateTime(booking.start_time)}</dd>
                          </div>
                          <div>
                            <dt>Tugash</dt>
                            <dd>{formatBookingDateTime(booking.end_time)}</dd>
                          </div>
                          <div>
                            <dt>Muddat</dt>
                            <dd>{booking.durationLabel} ({booking.duration_type})</dd>
                          </div>
                          <div>
                            <dt>Summa</dt>
                            <dd>{formatBookingAmount(booking)}</dd>
                          </div>
                          <div>
                            <dt>Bron holati</dt>
                            <dd>{bookingStatusLabel(booking.status)}</dd>
                          </div>
                          <div>
                            <dt>To'lov</dt>
                            <dd>{paymentStatusLabel(booking.payment_status)}</dd>
                          </div>
                          <div>
                            <dt>Izoh</dt>
                            <dd>{booking.note || "Izoh yo'q"}</dd>
                          </div>
                        </dl>
                        <div className="profile-booking-actions">
                          <a className="profile-booking-link" href={booking.href}>
                            Maydonni ochish
                            <ProfileIcon type="arrow" />
                          </a>
                          {CANCELLABLE_BOOKING_STATUSES.has(booking.status) ? (
                            <button
                              type="button"
                              className="profile-booking-cancel"
                              disabled={cancellingBookingId === booking.id}
                              onClick={() => openCancelBookingModal(booking)}
                            >
                              {cancellingBookingId === booking.id ? "Bekor qilinmoqda..." : "Bronni bekor qilish"}
                            </button>
                          ) : null}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            {activeTab === "payments" ? (
              <div className="profile-tab-panel" key="payments">
                <div className="profile-section-head">
                  <div>
                    <span>To'lovlar</span>
                    <h2>To'lovlar tarixi</h2>
                  </div>
                </div>

                {paymentsLoading ? (
                  <div className="profile-bookings-state" role="status">To'lovlar yuklanmoqda...</div>
                ) : paymentsError ? (
                  <div className="profile-bookings-state is-error" role="alert">
                    <p>{paymentsError}</p>
                    <button type="button" className="profile-booking-link" onClick={fetchUserData}>Qayta urinish</button>
                  </div>
                ) : payments.length === 0 ? (
                  <EmptyState
                    title="Hozircha to'lovlar yo'q"
                    text="Bron yoki tarif uchun backend orqali amalga oshirilgan to'lovlar shu yerda ko'rinadi."
                  />
                ) : (
                  <div className="profile-bookings-grid profile-payments-grid">
                    {payments.map((payment) => (
                      <article key={payment.id} className="profile-booking-card profile-payment-card">
                        <div>
                          <span>{paymentStatusLabel(payment.status)}</span>
                          <h3>{paymentSubject(payment)}</h3>
                          <p>{payment.provider === "test" ? "Test payment provider" : payment.provider}</p>
                        </div>
                        <dl>
                          <div>
                            <dt>Summa</dt>
                            <dd>{formatPaymentAmount(payment)}</dd>
                          </div>
                          <div>
                            <dt>Holat</dt>
                            <dd>{paymentStatusLabel(payment.status)}</dd>
                          </div>
                          <div>
                            <dt>Sana</dt>
                            <dd>{formatBookingDateTime(payment.created_at)}</dd>
                          </div>
                          <div>
                            <dt>Tranzaksiya</dt>
                            <dd>{payment.external_id || `#${payment.id}`}</dd>
                          </div>
                        </dl>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            {activeTab === "likes" ? (
              <div className="profile-tab-panel" key="likes">
                <div className="profile-section-head">
                  <div>
                    <span>Saqlangan</span>
                    <h2>Saqlangan joylar</h2>
                  </div>
                </div>

                {favoritesUsingDevFallback ? <span className="profile-dev-fallback">DEV fallback</span> : null}
                {favoritesLoading ? (
                  <div className="profile-bookings-state">Saqlangan joylar yuklanmoqda...</div>
                ) : favoritesError ? (
                  <div className="profile-bookings-state is-error" role="alert">{favoritesError}</div>
                ) : likedSpaces.length === 0 ? (
                  <div className="profile-empty-state">
                    <span><ProfileIcon type="heart" /></span>
                    <h3>Hozircha saqlangan joylar yo'q</h3>
                    <p>Yoqtirgan joylaringizdagi saqlash tugmasini bosing.</p>
                  </div>
                ) : (
                  <div className="profile-liked-grid">
                    {likedSpaces.map((item, index) => (
                      <PropertyCard
                        key={`liked-${item.id || item.title}`}
                        item={item}
                        index={index}
                        onClick={(targetItem) => setSelectedListing(targetItem)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </section>
      </section>

      {selectedListing && (
        <HostListingDetailModal
          item={selectedListing}
          onClose={() => setSelectedListing(null)}
        />
      )}

      {cancelBookingTarget ? (
        <div className="profile-cancel-modal-overlay" onClick={closeCancelBookingModal}>
          <div
            className="profile-cancel-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-cancel-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="profile-cancel-modal-icon" aria-hidden="true">!</div>
            <div>
              <span>Bronni bekor qilish</span>
              <h2 id="profile-cancel-modal-title">Qaroringizni tasdiqlang</h2>
              <p>
                <strong>{cancelBookingTarget.place_title}</strong> uchun bron bekor qilinadi.
                Bu amal backend orqali bajariladi.
              </p>
            </div>
            {cancelError ? <div className="profile-cancel-modal-error" role="alert">{cancelError}</div> : null}
            <div className="profile-cancel-modal-actions">
              <button type="button" onClick={closeCancelBookingModal} disabled={Boolean(cancellingBookingId)}>
                Qaytish
              </button>
              <button
                type="button"
                className="is-danger"
                onClick={handleCancelBooking}
                disabled={Boolean(cancellingBookingId)}
              >
                {cancellingBookingId ? "Bekor qilinmoqda..." : "Ha, bronni bekor qilish"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function ProfileEditFormSection({ section, draft, onDraftChange }) {
  return (
    <article className="profile-edit-section is-editing">
      <div className="profile-edit-section-head">
        <div>
          <span>{section.label}</span>
          <h3>{section.title}</h3>
          <p>{section.description}</p>
        </div>
      </div>
      <div className="profile-edit-form">
        {section.fields.map((field) => (
          <label key={field.key} className={field.type === "textarea" ? "is-wide" : ""}>
            <span>
              {field.label}
              {!BACKEND_PROFILE_DRAFT_KEYS.has(field.key) ? " · faqat shu qurilmada" : ""}
            </span>
            {field.type === "textarea" ? (
              <textarea
                value={draft[field.key] || ""}
                placeholder={field.placeholder}
                rows="4"
                onChange={(event) => onDraftChange(field.key, event.target.value)}
              />
            ) : (
              <input
                value={draft[field.key] || ""}
                type={field.type}
                placeholder={field.placeholder}
                onChange={(event) => onDraftChange(field.key, event.target.value)}
              />
            )}
          </label>
        ))}
      </div>
    </article>
  );
}

function ProfileQuestionnaireEdit({ userState, setUserState }) {
  const [draft, setDraft] = useState(initialProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const completion = useMemo(() => getCompletion(draft), [draft]);

  useEffect(() => {
    let active = true;
    const loadProfile = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await api.get("/api/auth/profile/");
        if (!active) return;
        const profile = normalizeProfile(response.data);
        const localOnly = readJsonStorage(STORAGE_KEYS.profile.localQuestionnaire, {});
        setDraft({
          ...initialProfile,
          ...localOnly,
          name: profile.full_name,
          firstName: profile.first_name,
          lastName: profile.last_name,
          email: profile.email,
          phone: profile.phone_number,
        });
      } catch (requestError) {
        if (active) setError(getApiErrorMessage(requestError, "Profilni yuklab bo'lmadi"));
      } finally {
        if (active) setLoading(false);
      }
    };
    loadProfile();
    return () => { active = false; };
  }, []);

  const updateDraft = (key, value) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const saveProfile = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await api.patch("/api/auth/profile/", {
        first_name: draft.firstName.trim(),
        last_name: draft.lastName.trim(),
        email: draft.email.trim(),
        phone_number: draft.phone.trim(),
      });
      const profile = cacheProfile(response.data);
      setUserState?.(profileToUserState(profile, userState));
      try {
        writeJsonStorage(STORAGE_KEYS.profile.localQuestionnaire, {
          role: draft.role,
          city: draft.city,
          birthYear: draft.birthYear,
          languages: draft.languages,
          work: draft.work,
          company: draft.company,
          interests: draft.interests,
          about: draft.about,
        });
      } catch (storageError) {
        // Supported profile fields are already saved by the backend.
      }
      setSuccess("Profil saqlandi");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Profilni saqlab bo'lmadi"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="user-profile-shell profile-edit-page-shell">
      <JoyNavbar userState={userState} setUserState={setUserState} activeIndex={-1} variant="dashboard" />
      <section className="profile-unified-panel profile-editor-panel">
        <div className="profile-editor-top">
          <a href="/profile" className="profile-cancel-action">
            <ProfileIcon type="arrow" />
            Orqaga
          </a>
          <div>
            <span>Anketa</span>
            <h1>Profilni tahrirlash</h1>
            <p>Faqat kerakli bo'limlarnigina to'ldiring. Saqlagandan keyin profil sahifasiga qaytasiz.</p>
          </div>
          <div className="profile-mini-completion">
            <strong>{completion}%</strong>
            <span>to'ldirilgan</span>
          </div>
        </div>

        <div className="profile-editor-layout">
          <aside className="profile-preview-card">
            <div className="profile-preview-avatar">AK</div>
            <h3>{`${draft.firstName} ${draft.lastName}`.trim() || "Profilingiz"}</h3>
            <p>{draft.city || "Shahar"} · {draft.work || "Soha"}</p>
            <div>
              <span>{draft.languages || "Tillar"}</span>
              <span>{draft.interests || "Qiziqishlar"}</span>
            </div>
          </aside>

          <div className="profile-edit-list">
            {loading ? <p role="status">Profil yuklanmoqda...</p> : null}
            {error ? <p role="alert" style={{ color: "#b91c1c", fontWeight: 700 }}>{error}</p> : null}
            {success ? <p role="status" style={{ color: "#15803d", fontWeight: 700 }}>{success}</p> : null}
            {!loading && profileSections.map((section) => (
              <ProfileEditFormSection
                key={section.id}
                section={section}
                draft={draft}
                onDraftChange={updateDraft}
              />
            ))}
          </div>
        </div>

        <div className="profile-editor-footer">
          <a href="/profile" className="profile-cancel-action">Bekor qilish</a>
          <button type="button" className="profile-save-action" onClick={saveProfile} disabled={loading || saving}>
            {saving ? "Saqlanmoqda..." : success || "Saqlash"}
          </button>
        </div>
      </section>
    </main>
  );
}

export { ProfileQuestionnaireEdit };
export default UserProfile;
