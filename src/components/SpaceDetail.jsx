import React, { useEffect, useMemo, useRef, useState, useContext } from "react";
import { createPortal } from "react-dom";
import { gsap } from "gsap";
import axios from "axios";
import { sendClientAction } from "../socket.js";
import { LanguageContext } from "../App.jsx";

import { Header as JoyNavbar } from "./HomeHero.jsx";
import { HeartIcon } from "./ui/Shared.jsx";
import { JoyFooter, PropertyCard } from "./ListingsSection.jsx";
import { DirectChatDrawer } from "./DirectChatDrawer.jsx";
import { startOrGetChatForSpace } from "../utils/chatManager.js";
import { toggleFavoritePlace, isPlaceFavorited } from "../utils/favoritesManager.js";
import { propertyCards } from "../data/content.js";
import "./ListingsSection.css";
import "./SpaceDetail.css";

const amenityList = [
  { name: "Tez Wi-Fi", icon: "wifi" },
  { name: "Konditsioner", icon: "wind" },
  { name: "Proyektor", icon: "tv" },
  { name: "Avtoturargoh", icon: "parking" },
  { name: "Coffee point", icon: "coffee" },
  { name: "Self check-in", icon: "key" },
  { name: "Toza zona", icon: "sparkles" },
  { name: "24/7 yordam", icon: "help" },
  { name: "Printer / Skaner", icon: "printer" },
  { name: "Playstation 5", icon: "gamepad" },
  { name: "Kutubxona", icon: "book" },
  { name: "Xavfsiz hudud", icon: "lock" },
  { name: "Oshxona / Bufet", icon: "utensils" },
  { name: "Doska / Whiteboard", icon: "board" }
];

const reviewList = [
  {
    name: "Dilshod",
    role: "Startup asoschisi",
    date: "May 2026",
    rating: 5,
    text: "Joy toza, yorug' va jamoa bilan sprint o'tkazish uchun juda qulay bo'ldi. Bron qilish jarayoni ham tez."
  },
  {
    name: "Madina",
    role: "HR manager",
    date: "April 2026",
    rating: 5,
    text: "Trening uchun kerakli jihozlar tayyor edi. Mehmonlarni kutib olish va parkovka masalasi yaxshi hal qilingan."
  },
  {
    name: "Aziz",
    role: "Product lead",
    date: "March 2026",
    rating: 4,
    text: "Lokatsiya qulay, internet barqaror. Keyingi safar ham shu joyni bron qilishimiz mumkin."
  }
];

function slugify(text) {
  if (!text) return "";
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function resolveSpace(route) {
  const value = (route || "").replace(/^space-/, "");
  const index = Number(value);

  if (Number.isInteger(index) && index >= 0 && index < propertyCards.length) {
    return propertyCards[index];
  }

  return propertyCards.find((item) => slugify(item.title) === value) || propertyCards[0];
}

function parsePrice(price) {
  return Number(price.replace(/\D/g, "")) || 0;
}

function formatMoney(value) {
  return `${new Intl.NumberFormat("uz-UZ").format(value)} so'm`;
}

const weekdayLabels = ["D", "S", "Ch", "P", "J", "Sh", "Ya"];
const hourlySlots = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

function toDateKey(date) {
  return date.toISOString().split("T")[0];
}

function fromDateKey(dateKey) {
  return new Date(`${dateKey}T00:00:00Z`);
}

function addDays(dateKey, amount) {
  const date = fromDateKey(dateKey);
  date.setUTCDate(date.getUTCDate() + amount);
  return toDateKey(date);
}

function addMonths(dateKey, amount) {
  const date = fromDateKey(dateKey);
  date.setUTCMonth(date.getUTCMonth() + amount);
  return toDateKey(date);
}

function getDefaultBookingDate() {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 3);
  return toDateKey(date);
}

function getMonthOffset(year, month, offset) {
  const date = new Date(Date.UTC(year, month + offset, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() };
}

function buildCalendarDays(year, month) {
  const date = new Date(Date.UTC(year, month, 1));
  const daysArr = [];
  let startDay = date.getUTCDay();
  startDay = startDay === 0 ? 6 : startDay - 1;

  for (let i = 0; i < startDay; i++) {
    daysArr.push({ label: "", dateStr: null, isMuted: true });
  }

  const totalDays = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  for (let d = 1; d <= totalDays; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    daysArr.push({ label: d, dateStr, isMuted: false });
  }

  return daysArr;
}

function buildDateRange(startDate, endDate) {
  if (!startDate) return [];
  const start = fromDateKey(startDate);
  const end = fromDateKey(endDate || startDate);
  const first = start <= end ? start : end;
  const last = start <= end ? end : start;
  const dates = [];
  const current = new Date(first);

  while (current <= last) {
    dates.push(toDateKey(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}

function getDayDiff(startDate, endDate) {
  if (!startDate || !endDate) return 1;
  const diff = fromDateKey(endDate).getTime() - fromDateKey(startDate).getTime();
  return Math.max(1, Math.round(diff / 86400000) + 1);
}

function formatShortDate(dateKey) {
  if (!dateKey) return "";
  const date = fromDateKey(dateKey);
  return `${String(date.getUTCDate()).padStart(2, "0")}.${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function isBlockingBooking(booking) {
  return booking && ["booked", "closed", "Paid", "Pending"].includes(booking.status);
}

function Icon({ type, className = "" }) {
  const paths = {
    arrow: "M19 12H5M12 5l-7 7 7 7",
    map: "M12 21s7-4.7 7-11a7 7 0 0 0-14 0c0 6.3 7 11 7 11ZM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
    users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8",
    area: "M4 4h16v16H4zM9 4v16M4 9h16",
    clock: "M12 8v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
    star: "m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 16.9 6.6 19.8l1-6.1-4.4-4.3 6.1-.9L12 3Z",
    check: "m20 6-11 11-5-5",
    calendar: "M7 3v4M17 3v4M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z",
    shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z",
    phone: "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z",
    wifi: "M5 13a10 10 0 0 1 14 0M8.5 16.5a5 5 0 0 1 7 0M2 9.5a15 15 0 0 1 20 0M12 20h.01",
    wind: "M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2",
    tv: "M2 5h20v12H2zm10 12v4M8 21h8",
    parking: "M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm4 14V7h4a3 3 0 0 1 0 6H9",
    coffee: "M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4ZM6 1v3M10 1v3M14 1v3",
    key: "m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4",
    sparkles: "m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z",
    help: "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10Z",
    printer: "M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 9V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v5M6 14h12v6H6z",
    gamepad: "M18 11h.01M15 14h.01M10 10v4M8 12h4M2 12a10 10 0 0 1 20 0v2a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4Z",
    book: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20M4 19.5V5A2.5 2.5 0 0 1 6.5 2.5H20v14.5H6.5a2.5 2.5 0 0 0-2.5 2.5z",
    lock: "M3 11a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Zm4-2V7a5 5 0 0 1 10 0v2",
    utensils: "M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v4M12 18V2M12 18h3.5a2.5 2.5 0 0 0 2.5-2.5V2",
    board: "M4 3h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm8 14v4m-4 0h8",
    x: "M18 6 6 18M6 6l12 12"
  };

  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[type]} />
    </svg>
  );
}

function DetailStat({ icon, label, value }) {
  return (
    <div className="sd-stat">
      <span>
        <Icon type={icon} />
      </span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function Stars({ value = 5 }) {
  return (
    <span className="sd-stars" aria-label={`${value} reyting`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Icon key={index} type="star" className={index < value ? "is-filled" : "is-muted"} />
      ))}
    </span>
  );
}

export default function SpaceDetail({ route, userState, setUserState }) {
  const { lang } = useContext(LanguageContext);
  const fallbackSpace = useMemo(() => resolveSpace(route), [route]);
  const [space, setSpace] = useState(fallbackSpace);
  const [allParameters, setAllParameters] = useState([]);
  const [allDiscounts, setAllDiscounts] = useState([]);

  // Fetch parameters and discounts
  useEffect(() => {
    axios.get("http://localhost:8000/api/parameters/")
      .then(res => setAllParameters(res.data?.results || res.data || []))
      .catch(err => console.log("Failed to load parameters:", err));

    axios.get("http://localhost:8000/api/discounts/")
      .then(res => setAllDiscounts(res.data?.results || res.data || []))
      .catch(err => console.log("Failed to load discounts:", err));
  }, []);

  // Fetch from REST API to align route with real database objects
  useEffect(() => {
    axios.get("http://localhost:8000/api/places/")
      .then((res) => {
        let results = res.data?.results || res.data || [];
        if (results.length > 0) {
          const value = (route || "").replace(/^space-/, "");
          const index = Number(value);
          let dbSpace;
          
          if (Number.isInteger(index) && index >= 0 && index < results.length) {
            dbSpace = results[index];
          } else {
            dbSpace = results.find((item) => {
              if (!item) return false;
              const titleSlug = slugify(item.title || item.name || "");
              return (titleSlug && titleSlug === value) || String(item.id || item._id) === value;
            });
          }
          
          if (dbSpace) {
            setSpace({
              ...dbSpace,
              category: dbSpace.subcategory_info?.category?.name_ru || dbSpace.category,
              subcategoryId: dbSpace.subcategory_info?.id,
              price: dbSpace.price || "0 so'm"
            });
          }
        }
      })
      .catch((err) => {
        console.warn("REST API orqali joy tafsilotini yuklab bo'lmadi:", err.message);
      });
  }, [route, fallbackSpace]);

  // Price formatting helper
  const formatPriceValue = (val, mode) => {
    if (!val) return "";
    const cleanNum = Number(String(val).replace(/\D/g, ""));
    if (isNaN(cleanNum)) return val;
    const formatted = new Intl.NumberFormat("uz-UZ").format(cleanNum);
    const label = mode === "soatlik" ? "Soatiga" : mode === "kunlik" ? "Kuniga" : mode === "haftalik" ? "Haftasiga" : "Oyiga";
    return `${label} ${formatted} UZS`;
  };

  // Selected amenities mapped to backend parameters
  const selectedAmenities = useMemo(() => {
    if (!space.amenities || !Array.isArray(space.amenities)) return [];
    if (allParameters.length > 0) {
      return allParameters.filter(p => p.type === 'boolean' && space.amenities.includes(p.slug));
    }
    // Fallback to static mapping if parameters are not yet loaded
    return amenityList.filter(item => space.amenities.includes(slugify(item.name)));
  }, [space.amenities, allParameters]);

  // Send view event to live traffic monitor via socket.io
  useEffect(() => {
    if (space) {
      sendClientAction("view_space", { spaceName: space.title || space.name });
    }
  }, [space]);

  const [activeImage, setActiveImage] = useState(0);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [liked, setLiked] = useState(() => isPlaceFavorited(space.id));
  const likeBtnRef = useRef(null);
  const [showAmenitiesModal, setShowAmenitiesModal] = useState(false);
  const [activeChatId, setActiveChatId] = useState(null);

  useEffect(() => {
    setLiked(isPlaceFavorited(space.id));
    const handleUpdate = () => {
      setLiked(isPlaceFavorited(space.id));
    };
    window.addEventListener("joyzone-favorites-update", handleUpdate);
    return () => window.removeEventListener("joyzone-favorites-update", handleUpdate);
  }, [space.id]);

  const handleLikeToggle = () => {
    toggleFavoritePlace(space);
    setLiked(!liked);
    gsap.fromTo(
      likeBtnRef.current,
      { scale: 0.8 },
      { scale: 1, duration: 0.5, ease: "elastic.out(1.2, 0.4)" }
    );
  };

  const [days, setDays] = useState(1);
  const [guests, setGuests] = useState(Math.min(space.people || 4, 4));
  const [allBookings, setAllBookings] = useState([]);
  const [calYear, setCalYear] = useState(() => fromDateKey(getDefaultBookingDate()).getUTCFullYear());
  const [calMonth, setCalMonth] = useState(() => fromDateKey(getDefaultBookingDate()).getUTCMonth());
  const [checkInDate, setCheckInDate] = useState(() => getDefaultBookingDate());
  const [checkOutDate, setCheckOutDate] = useState(() => getDefaultBookingDate());
  const [hourPanelDate, setHourPanelDate] = useState(null);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState([]);

  useEffect(() => {
    axios.get("http://localhost:8000/api/bookings/")
      .then(res => {
        if (res.data) setAllBookings(res.data);
      })
      .catch(err => console.warn("Failed to fetch bookings inside space detail:", err));
  }, [space]);

  const spaceBookings = useMemo(() => {
    if (!space || !Array.isArray(allBookings)) return [];
    const targetId = space.id || space._id;
    return allBookings.filter(b => {
      if (!b) return false;
      const spaceId = typeof b.space_id === 'object' && b.space_id !== null ? b.space_id?.id || b.space_id?._id : b.space_id;
      return spaceId && spaceId === targetId;
    });
  }, [allBookings, space]);

  const calendarDays = useMemo(() => buildCalendarDays(calYear, calMonth), [calYear, calMonth]);
  const nextCalendar = useMemo(() => getMonthOffset(calYear, calMonth, 1), [calYear, calMonth]);
  const nextCalendarDays = useMemo(() => buildCalendarDays(nextCalendar.year, nextCalendar.month), [nextCalendar]);

  const [bookingDuration, setBookingDuration] = useState("kunlik");

  const availableDurations = useMemo(() => {
    if (!space?.prices) {
      return [{ id: "kunlik", label: "Kunlik", price: space?.price }];
    }
    
    const options = [];
    if (space.prices.soatlik) {
      options.push({
        id: "soatlik",
        label: "Soatlik",
        price: formatPriceValue(space.prices.soatlik, "soatlik")
      });
    }
    if (space.prices.kunlik) {
      options.push({
        id: "kunlik",
        label: "Kunlik",
        price: formatPriceValue(space.prices.kunlik, "kunlik")
      });
    }
    if (space.prices.haftalik) {
      options.push({
        id: "haftalik",
        label: "Haftalik",
        price: formatPriceValue(space.prices.haftalik, "haftalik")
      });
    }
    if (space.prices.oylik) {
      options.push({
        id: "oylik",
        label: "Oylik",
        price: formatPriceValue(space.prices.oylik, "oylik")
      });
    }
    
    return options.length > 0 ? options : [{ id: "kunlik", label: "Kunlik", price: space.price }];
  }, [space]);

  useEffect(() => {
    if (availableDurations.length > 0 && !availableDurations.some(d => d.id === bookingDuration)) {
      const nextDuration = availableDurations[0].id;
      setBookingDuration(nextDuration);
      syncRangeForMode(nextDuration, checkInDate || getDefaultBookingDate(), 1);
    }
  }, [availableDurations, bookingDuration]);

  // Compute active discount applied to booking details
  const activeAppliedDiscount = useMemo(() => {
    if (!space.discounts || !Array.isArray(space.discounts) || allDiscounts.length === 0) return null;
    
    // Filter discounts linked to this place
    const spaceDiscounts = allDiscounts.filter(d => space.discounts.includes(d.id) && d.is_active);
    if (spaceDiscounts.length === 0) return null;
    
    let bestDiscount = null;
    let maxPercent = 0;
    
    spaceDiscounts.forEach(d => {
      let applies = false;
      
      if (d.discount_type === "new_listing") {
        applies = true; // Assume new listing applies
      } else if (d.discount_type === "weekly") {
        applies = bookingDuration === "haftalik" || (bookingDuration === "kunlik" && days >= (d.min_nights || 7));
      } else if (d.discount_type === "monthly") {
        applies = bookingDuration === "oylik" || (bookingDuration === "kunlik" && days >= (d.min_nights || 28));
      } else if (d.discount_type === "last_minute") {
        const today = new Date();
        const start = fromDateKey(checkInDate);
        const diffDays = Math.ceil((start - today) / (1000 * 60 * 60 * 24));
        applies = diffDays >= 0 && diffDays <= (d.days_before || 14);
      } else if (d.discount_type === "custom") {
        applies = days >= (d.min_nights || 1);
      }
      
      if (applies && d.percent > maxPercent) {
        maxPercent = d.percent;
        bestDiscount = d;
      }
    });
    
    return bestDiscount;
  }, [space.discounts, allDiscounts, bookingDuration, days, checkInDate]);

  const parsedBasePrice = useMemo(() => {
    const selectedOption = availableDurations.find(d => d.id === bookingDuration);
    const priceStr = selectedOption ? selectedOption.price : space?.price;
    if (!priceStr) return 0;
    return Number(String(priceStr).replace(/\D/g, "")) || 0;
  }, [availableDurations, bookingDuration, space]);


  const galleryImages = useMemo(() => {
    const images = Array.isArray(space?.images) ? space.images.filter(Boolean) : [];
    return images.length > 0 ? images : [fallbackSpace.images?.[0]].filter(Boolean);
  }, [space, fallbackSpace]);

  const previewThumbs = useMemo(() => (
    galleryImages.length > 4 ? galleryImages.slice(0, 3) : galleryImages.slice(0, 4)
  ), [galleryImages]);

  const selectedRange = useMemo(() => {
    if (bookingDuration === "soatlik") return checkInDate ? [checkInDate] : [];
    return buildDateRange(checkInDate, checkOutDate || checkInDate);
  }, [bookingDuration, checkInDate, checkOutDate]);

  const selectedDateSet = useMemo(() => new Set(selectedRange), [selectedRange]);

  const isDateBooked = (dateStr) => spaceBookings.some((booking) => {
    if (!booking || !booking.start_date || !booking.end_date || !isBlockingBooking(booking)) return false;
    const bStart = String(booking.start_date).split("T")[0];
    const bEnd = String(booking.end_date).split("T")[0];
    return dateStr >= bStart && dateStr <= bEnd;
  });

  const getSlotStatus = (dateStr, slot) => {
    if (!dateStr) return "free";
    if (isDateBooked(dateStr)) return "booked";
    const day = Number(dateStr.slice(-2));
    const hour = Number(slot.split(":")[0]);
    return (day + hour) % 5 === 0 || (day % 2 === 0 && hour === 14) ? "booked" : "free";
  };

  const { totalPrice, hasBlockedDay, dailyRatesBreakdown } = useMemo(() => {
    if (!checkInDate) return { totalPrice: 0, hasBlockedDay: false, dailyRatesBreakdown: [] };

    if (bookingDuration === "soatlik") {
      const safeSlots = selectedTimeSlots.filter((slot) => getSlotStatus(checkInDate, slot) === "free");
      const total = parsedBasePrice * safeSlots.length;
      return {
        totalPrice: total,
        hasBlockedDay: isDateBooked(checkInDate),
        dailyRatesBreakdown: safeSlots.length > 1
          ? [{ date: `${formatShortDate(checkInDate)} (${safeSlots.length} soat)`, rate: total }]
          : safeSlots.map((slot) => ({ date: `${formatShortDate(checkInDate)} ${slot}`, rate: parsedBasePrice }))
      };
    }

    if (bookingDuration === "haftalik" || bookingDuration === "oylik") {
      const blocked = selectedRange.some((dateStr) => isDateBooked(dateStr));
      return {
        totalPrice: parsedBasePrice * days,
        hasBlockedDay: blocked,
        dailyRatesBreakdown: [{
          date: `${formatShortDate(checkInDate)} - ${formatShortDate(checkOutDate)}`,
          rate: parsedBasePrice * days
        }]
      };
    }

    let sum = 0;
    let blocked = false;
    selectedRange.forEach((dateStr) => {
      if (isDateBooked(dateStr)) blocked = true;
      const overridePrice = space.priceOverrides?.[dateStr];
      const rate = overridePrice !== undefined ? Number(overridePrice) : parsedBasePrice;
      sum += rate;
    });

    let breakdown = [];
    if (selectedRange.length > 1) {
      breakdown = [{
        date: `${formatShortDate(checkInDate)} - ${formatShortDate(checkOutDate || checkInDate)}`,
        rate: sum
      }];
    } else if (selectedRange.length === 1) {
      breakdown = [{
        date: formatShortDate(checkInDate),
        rate: sum
      }];
    }

    return { totalPrice: sum, hasBlockedDay: blocked, dailyRatesBreakdown: breakdown };
  }, [checkInDate, checkOutDate, days, selectedRange, selectedTimeSlots, bookingDuration, spaceBookings, space, parsedBasePrice]);

  const discountAmount = useMemo(() => {
    if (!activeAppliedDiscount || totalPrice <= 0) return 0;
    return Math.round(totalPrice * (activeAppliedDiscount.percent / 100));
  }, [activeAppliedDiscount, totalPrice]);

  const serviceFee = totalPrice > 0 ? Math.max(25000, Math.round((totalPrice - discountAmount) * 0.08)) : 0;
  const finalTotal = Math.max(0, totalPrice - discountAmount + serviceFee);

  const goToImage = (index) => {
    if (galleryImages.length === 0) return;
    const nextIndex = (index + galleryImages.length) % galleryImages.length;
    setActiveImage(nextIndex);
  };

  const moveMonth = (offset) => {
    const next = getMonthOffset(calYear, calMonth, offset);
    setCalYear(next.year);
    setCalMonth(next.month);
  };

  const syncRangeForMode = (mode, startDate, units = 1) => {
    if (mode === "soatlik") {
      setCheckInDate(startDate);
      setCheckOutDate(startDate);
      setDays(1);
      setHourPanelDate(startDate);
      return;
    }

    setHourPanelDate(null);
    setSelectedTimeSlots([]);

    if (mode === "haftalik") {
      setCheckInDate(startDate);
      setCheckOutDate(addDays(startDate, (units * 7) - 1));
      setDays(units);
      return;
    }

    if (mode === "oylik") {
      setCheckInDate(startDate);
      setCheckOutDate(addDays(addMonths(startDate, units), -1));
      setDays(units);
      return;
    }

    setCheckInDate(startDate);
    setCheckOutDate(startDate);
    setDays(1);
  };

  const handleDurationChange = (durationId) => {
    setBookingDuration(durationId);
    syncRangeForMode(durationId, checkInDate || getDefaultBookingDate(), 1);
  };

  const handleCalendarDateClick = (dateStr) => {
    if (!dateStr || isDateBooked(dateStr)) return;

    if (bookingDuration === "soatlik") {
      const previousDate = checkInDate;
      syncRangeForMode("soatlik", dateStr, 1);
      if (previousDate !== dateStr) setSelectedTimeSlots([]);
      return;
    }

    if (bookingDuration === "haftalik") {
      syncRangeForMode("haftalik", dateStr, 1);
      return;
    }

    if (bookingDuration === "oylik") {
      syncRangeForMode("oylik", dateStr, 1);
      return;
    }

    if (!checkInDate || checkOutDate || dateStr < checkInDate) {
      setCheckInDate(dateStr);
      setCheckOutDate(null);
      setDays(1);
      return;
    }

    setCheckOutDate(dateStr);
    setDays(getDayDiff(checkInDate, dateStr));
  };

  const handleTimeSlotToggle = (slot) => {
    if (getSlotStatus(checkInDate, slot) === "booked") return;
    setSelectedTimeSlots((current) => (
      current.includes(slot)
        ? current.filter((item) => item !== slot)
        : [...current, slot].sort()
    ));
  };

  const bookingUnitLabel = bookingDuration === "soatlik"
    ? `${selectedTimeSlots.length || 0} soat`
    : bookingDuration === "haftalik"
      ? `${days} hafta`
      : bookingDuration === "oylik"
        ? `${days} oy`
        : `${selectedRange.length} kun`;

  const bookingRangeLabel = bookingDuration === "soatlik"
    ? `${formatShortDate(checkInDate)} ${selectedTimeSlots.length ? selectedTimeSlots.join(", ") : "vaqt tanlanmagan"}`
    : checkOutDate && checkOutDate !== checkInDate
      ? `${formatShortDate(checkInDate)} - ${formatShortDate(checkOutDate)}`
      : formatShortDate(checkInDate);

  const handleBooking = async () => {
    if (hasBlockedDay) {
      alert("Kechirasiz, tanlangan sanalarda band qilingan kunlar bor. Boshqa sanalarni tanlang.");
      return;
    }

    try {
      const bookingData = {
        user_id: userState.isAuthed ? userState.email : "anonymous_client",
        space_id: space.id || space._id,
        start_date: checkInDate,
        end_date: checkOutDate || checkInDate,
        total_price: finalTotal,
        status: "Pending"
      };

      const res = await axios.post("http://localhost:8000/api/bookings/", bookingData, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('joyzone_access_token')}` }
      });
      
      if (res.status === 201) {
        sendClientAction("booking", {
          spaceName: space.title || space.name,
          price: formatMoney(finalTotal)
        });
        alert(`Muvaffaqiyatli band qilindi! Jami to'lov: ${formatMoney(finalTotal)}. So'rov kutilmoqda (Pending)`);
        
        const bookingsRes = await axios.get("http://localhost:8000/api/bookings/");
        if (bookingsRes.data) setAllBookings(bookingsRes.data);
      }
    } catch (err) {
      console.error("Booking failed, running simulation:", err);
      sendClientAction("booking", {
        spaceName: space.title || space.name,
        price: formatMoney(finalTotal)
      });
      alert(`Bron so'rovi yuborildi (Simulyatsiya)! Jami to'lov: ${formatMoney(finalTotal)}.`);
    }
  };

  const monthNames = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];

  const [reviews, setReviews] = useState(reviewList);
  const [helpfulCounts, setHelpfulCounts] = useState({});

  // Fetch reviews from backend API on mount or space change
  useEffect(() => {
    if (space) {
      const spaceId = space.id || space._id || "648312e0f40a1b2c3d4e5f67";
      axios.get(`http://localhost:8000/api/reviews/space/${spaceId}/`)
        .then(res => {
          if (res.data && res.data.length > 0) {
            setReviews(res.data);
          } else {
            setReviews(reviewList);
          }
        })
        .catch(err => {
          console.warn("Fikrlar yuklashda xatolik, mock ma'lumotlardan foydalaniladi:", err);
          setReviews(reviewList);
        });
    }
  }, [space]);

  const handleHelpful = (name) => {
    setHelpfulCounts(prev => ({
      ...prev,
      [name]: (prev[name] || 0) + 1
    }));
  };

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return "5.0";
    const sum = reviews.reduce((acc, item) => acc + item.rating, 0);
    return (sum / reviews.length).toFixed(1);
  }, [reviews]);

  const similarSpaces = useMemo(() => {
    const sameCategory = propertyCards.filter((item) => item.title !== space.title && item.category === space.category);
    const fallback = propertyCards.filter((item) => item.title !== space.title);
    const merged = [...sameCategory, ...fallback.filter((item) => !sameCategory.includes(item))];
    return merged.slice(0, 3);
  }, [space]);

  useEffect(() => {
    setActiveImage(0);
    setShowGalleryModal(false);
    setGuests(Math.min(space.people || 4, 4));
  }, [space]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero elements cascade
      gsap.fromTo(
        ".sd-hero-copy > *",
        { y: 24, opacity: 0, filter: "blur(6px)" },
        { y: 0, opacity: 1, filter: "blur(0px)", duration: 0.7, stagger: 0.08, ease: "power3.out" }
      );

      // Gallery fade-in slide
      gsap.fromTo(
        ".sd-gallery",
        { x: 30, opacity: 0, filter: "blur(8px)" },
        { x: 0, opacity: 1, filter: "blur(0px)", duration: 0.8, ease: "power3.out", delay: 0.1 }
      );

      // Stats stagger cards
      gsap.fromTo(
        ".sd-stat",
        { y: 25, opacity: 0, scale: 0.96 },
        { y: 0, opacity: 1, scale: 1, duration: 0.6, stagger: 0.07, ease: "back.out(1.15)", delay: 0.2 }
      );

      // Booking card float-up
      gsap.fromTo(
        ".sd-booking-card",
        { y: 40, opacity: 0, scale: 0.97 },
        { y: 0, opacity: 1, scale: 1, duration: 0.85, ease: "power3.out", delay: 0.25 }
      );

      // Amenities fade-in list
      gsap.fromTo(
        ".sd-amenities span",
        { y: 15, opacity: 0, scale: 0.96 },
        { y: 0, opacity: 1, scale: 1, duration: 0.5, stagger: 0.04, ease: "power2.out", delay: 0.3 }
      );

      // Reviews fade-in
      gsap.fromTo(
        ".sd-reviews-panel > *",
        { y: 25, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.75, stagger: 0.1, ease: "power2.out", delay: 0.35 }
      );

      // Similar spaces grid
      gsap.fromTo(
        ".sd-similar .property-card",
        { y: 35, opacity: 0, scale: 0.98 },
        { y: 0, opacity: 1, scale: 1, duration: 0.75, stagger: 0.08, ease: "power3.out", delay: 0.4 }
      );
    });
    return () => ctx.revert();
  }, [space]);

  const todayKey = toDateKey(new Date());

  const renderCalendarMonth = (year, month, monthDays, isNext = false) => (
    <div className={`sd-calendar-card ${isNext ? "is-next" : "is-current"}`}>
      <div className="sd-calendar-head">
        <div>
          <span>{isNext ? "Keyingi oy" : "Tanlash"}</span>
          <strong>{monthNames[month]} {year}</strong>
        </div>
        {!isNext && (
          <div className="sd-calendar-arrows">
            <button type="button" onClick={() => moveMonth(-1)} aria-label="Oldingi oy">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button type="button" onClick={() => moveMonth(1)} aria-label="Keyingi oy">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <div className="sd-weekdays">
        {weekdayLabels.map((label) => <span key={`${year}-${month}-${label}`}>{label}</span>)}
      </div>

      <div className="sd-calendar-grid">
        {monthDays.map((day, index) => {
          if (day.isMuted) return <span key={`muted-${year}-${month}-${index}`} className="sd-calendar-day is-empty" />;

          const dateStr = day.dateStr;
          const booked = isDateBooked(dateStr);
          const selected = selectedDateSet.has(dateStr);
          const isStart = dateStr === checkInDate;
          const isEnd = dateStr === checkOutDate && checkOutDate !== checkInDate;
          const isToday = dateStr === todayKey;
          const className = [
            "sd-calendar-day",
            booked ? "is-booked" : "",
            selected ? "is-selected" : "",
            selected && !isStart && !isEnd ? "is-in-range" : "",
            isStart ? "is-range-start" : "",
            isEnd ? "is-range-end" : "",
            isToday ? "is-today" : ""
          ].filter(Boolean).join(" ");

          return (
            <button
              key={dateStr}
              type="button"
              className={className}
              disabled={booked}
              onClick={() => handleCalendarDateClick(dateStr)}
              title={booked ? "Band qilingan" : dateStr}
            >
              <span>{day.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <main className="space-detail-shell">
      <JoyNavbar userState={userState} setUserState={setUserState} activeIndex={1} />

      <section className="sd-hero">
        <div className="sd-hero-copy sd-animate">
          <div className="sd-kicker">
            <span>{space.category}</span>
            {space.promoted ? <b>Top joy</b> : null}
          </div>
          <h1>{space.title}</h1>
          <p>
            {space.location} hududidagi tayyor maydon. Jamoaviy ish, uchrashuv, taqdimot va qisqa muddatli ijara uchun qulay.
          </p>
          <div className="sd-location">
            <Icon type="map" />
            {space.location}
          </div>
        </div>

        <div className="sd-gallery sd-animate">
          <div className="sd-main-photo">
            <img key={`${galleryImages[activeImage]}-${activeImage}`} src={galleryImages[activeImage]} alt={space.title} />
            {galleryImages.length > 1 && (
              <>
                <button type="button" className="sd-gallery-nav sd-gallery-prev" onClick={() => goToImage(activeImage - 1)} aria-label="Oldingi rasm">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
                <button type="button" className="sd-gallery-nav sd-gallery-next" onClick={() => goToImage(activeImage + 1)} aria-label="Keyingi rasm">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </>
            )}
            <button
              ref={likeBtnRef}
              type="button"
              className={`sd-like ${liked ? "is-liked" : ""}`}
              onClick={handleLikeToggle}
              aria-label={liked ? "Yoqtirildi" : "Yoqtirish"}
              aria-pressed={liked}
            >
              <HeartIcon filled={liked} />
            </button>
            <button type="button" className="sd-share" aria-label="Ulashish" onClick={() => { if(navigator.share) navigator.share({ url: window.location.href }); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3"></circle>
                <circle cx="6" cy="12" r="3"></circle>
                <circle cx="18" cy="19" r="3"></circle>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
              </svg>
            </button>
          </div>
          {galleryImages.length > 1 && (
            <div className="sd-gallery-dots" aria-hidden="true">
              {galleryImages.map((image, index) => (
                <span key={`${image}-dot`} className={index === activeImage ? "is-active" : ""} />
              ))}
            </div>
          )}
          <div className="sd-thumbs" aria-label="Rasmlar">
            {previewThumbs.map((image, index) => (
              <button
                type="button"
                key={image}
                className={index === activeImage ? "is-active" : ""}
                onClick={() => setActiveImage(index)}
                aria-label={`${index + 1}-rasm`}
                aria-pressed={index === activeImage}
              >
                <img src={image} alt="" />
              </button>
            ))}
            {galleryImages.length > 4 && (
              <button
                type="button"
                className="sd-thumb-more"
                onClick={() => setShowGalleryModal(true)}
                aria-label={`Barcha ${galleryImages.length} ta rasmni ochish`}
              >
                <img src={galleryImages[3]} alt="" />
                <span>
                  <b>+{galleryImages.length - 3}</b>
                  Barcha rasmlar
                </span>
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="sd-content">
        <div className="sd-main">
          <div className="sd-stat-grid sd-animate">
            <DetailStat icon="users" label={lang === 'uz' ? "Sig'im" : "Вместимость"} value={`${space.people || 0} ${lang === 'uz' ? 'kishi' : 'чел.'}`} />
            <DetailStat icon="area" label={lang === 'uz' ? "Maydon" : "Площадь"} value={`${space.area || 0} m²`} />
            
            {/* Render counter/select parameters from characteristics */}
            {allParameters
              .filter(p => p.type !== 'boolean' && space.characteristics && space.characteristics[p.slug] !== undefined)
              .map(p => {
                const val = space.characteristics[p.slug];
                let valText = val;
                if (p.type === 'select') {
                  const opt = p.config?.options?.find(o => o.slug === val);
                  if (opt) {
                    valText = lang === 'uz' ? (opt.uz || opt.ru) : (opt.ru || opt.uz);
                  }
                }
                return (
                  <DetailStat 
                    key={p.slug}
                    icon={p.icon || "layers"} 
                    label={lang === 'uz' ? (p.name_uz || p.name_ru) : (p.name_ru || p.name_uz)} 
                    value={valText} 
                  />
                );
              })}

            <DetailStat icon="clock" label={lang === 'uz' ? "Format" : "Формат"} value={space.booking_type === "instant" ? (lang === 'uz' ? "Tezkor" : "Мгновенно") : (lang === 'uz' ? "So'rov" : "По запросу")} />
            <DetailStat icon="shield" label="Status" value={space.status === "approved" ? (lang === 'uz' ? "Faol" : "Активен") : (lang === 'uz' ? "Tekshirilmoqda" : "Модерация")} />
          </div>

          <section className="sd-section sd-animate">
            <div className="sd-section-head">
              <p>{lang === 'uz' ? "Joy haqida" : "О пространстве"}</p>
              <h2>{lang === 'uz' ? "Qulay, tayyor va tez bron qilinadi" : "Удобно, готово и быстро бронируется"}</h2>
            </div>
            <p className="sd-description">
              {lang === 'uz' ? space.description_uz : lang === 'en' ? space.description_en : space.description_ru}
              {!(lang === 'uz' ? space.description_uz : lang === 'en' ? space.description_en : space.description_ru) && (
                lang === 'uz' 
                  ? "Bu maydon Joyzone orqali uchrashuv, seminar, ishchi sprint yoki qisqa muddatli ijara uchun tanlanadi. Narx, sig'im, rasm va asosiy shartlar bir joyda ko'rinadi, bron so'rovi esa mezbonga darhol yuboriladi."
                  : "Это пространство выбирают через Joyzone для встреч, семинаров, рабочих спринтов или краткосрочной аренды. Цена, вместимость, фотографии и основные условия видны сразу, а запрос на бронирование мгновенно отправляется хозяину."
              )}
            </p>
          </section>

          <section className="sd-section sd-animate">
            <div className="sd-section-head">
              <p>{lang === 'uz' ? "Qulayliklar" : "Удобства"}</p>
              <h2>{lang === 'uz' ? "Kerakli servislar tayyor" : "Все необходимые удобства готовы"}</h2>
            </div>
            <div className="sd-amenities">
              {selectedAmenities.length === 0 ? (
                <span style={{ color: "#64748b", background: "none", border: "none", padding: 0 }}>
                  {lang === 'uz' ? "Qulayliklar belgilanmagan" : "Удобства не указаны"}
                </span>
              ) : (
                selectedAmenities.slice(0, 8).map((p) => (
                  <span key={p.slug}>
                    <Icon type={p.icon || "check-circle"} />
                    {lang === 'uz' ? (p.name_uz || p.name_ru) : (p.name_ru || p.name_uz)}
                  </span>
                ))
              )}
            </div>
            {selectedAmenities.length > 8 && (
              <button 
                type="button" 
                className="sd-more-amenities-btn"
                onClick={() => setShowAmenitiesModal(true)}
              >
                {lang === 'uz' ? `Barcha qulayliklar (${selectedAmenities.length})` : `Все удобства (${selectedAmenities.length})`}
              </button>
            )}
          </section>

          <section className="sd-section sd-animate">
            <div className="sd-section-head sd-review-head">
              <div>
                <p>Sharhlar ({reviews.length})</p>
                <h2>Mehmonlar fikri</h2>
              </div>
            </div>

            <div className="sd-reviews-panel">
              <aside className="sd-review-score">
                <div className="sd-score-big-circle">
                  <span>{averageRating}</span>
                  <small>5.0 dan</small>
                </div>
                <div className="sd-score-meta">
                  <Stars value={Math.round(Number(averageRating))} />
                  <strong>96% mehmon tavsiya qiladi</strong>
                  <p>Tozalik, lokatsiya, aloqa va jihozlar bo'yicha eng yuqori baholangan joylardan biri.</p>
                </div>
                <div className="sd-score-bars" aria-label="Reyting taqsimoti">
                  {[
                    ["Tozalik", "98%"],
                    ["Aloqa", "94%"],
                    ["Lokatsiya", "90%"]
                  ].map(([label, value]) => (
                    <div key={label} className="sd-score-bar-row">
                      <span>{label}</span>
                      <div className="sd-progress-track">
                        <b style={{ "--score": value }} />
                      </div>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
              </aside>

              <div className="sd-reviews-list-container">
                <div className="sd-reviews">
                  {reviews.length === 0 ? (
                    <div className="sd-no-reviews">
                      <p>Hozircha sharhlar yo'q.</p>
                    </div>
                  ) : (
                    reviews.map((review, i) => {
                      const avatarGrad = [
                        "linear-gradient(135deg, #ff6b6b, #ff8e53)",
                        "linear-gradient(135deg, #4e54c8, #8f94fb)",
                        "linear-gradient(135deg, #11998e, #38ef7d)",
                        "linear-gradient(135deg, #fc00ff, #00dbde)",
                        "linear-gradient(135deg, #f12711, #f5af19)"
                      ][i % 5];
                      
                      return (
                        <article key={review.name + i} className="sd-review-card">
                          <div className="sd-review-header-row">
                            <div className="sd-review-user-info">
                              <div className="sd-review-avatar" style={{ background: avatarGrad }}>
                                {review.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <strong>{review.name}</strong>
                                <span>{review.role} • {review.date}</span>
                              </div>
                            </div>
                            <div className="sd-review-rating-badge">
                              <svg viewBox="0 0 24 24" fill="#ffbd22" style={{ width: "14px", height: "14px", marginRight: "4px" }}>
                                <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 16.9 6.6 19.8l1-6.1-4.4-4.3 6.1-.9L12 3Z" />
                              </svg>
                              <span>{review.rating.toFixed(1)}</span>
                            </div>
                          </div>

                          <div className="sd-review-body">
                            <p>{review.text}</p>
                          </div>

                          <div className="sd-review-footer">
                            <span className="sd-verified-tag">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: "12px", height: "12px", marginRight: "4px", color: "#38ef7d" }}>
                                <path d="m20 6-11 11-5-5" />
                              </svg>
                              Tasdiqlangan bron
                            </span>

                            <button 
                              type="button" 
                              className="sd-helpful-btn"
                              onClick={() => handleHelpful(review.name + i)}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: "14px", height: "14px" }}>
                                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                              </svg>
                              <span>Foydali ({helpfulCounts[review.name + i] || 0})</span>
                            </button>
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>

        <aside className="sd-booking sd-animate">
          <div className="sd-booking-card">
            <div className="sd-price-row">
              <div>
                <span>Narx ({availableDurations.find(d => d.id === bookingDuration)?.label?.toLowerCase() || 'kunlik'})</span>
                <strong>{availableDurations.find(d => d.id === bookingDuration)?.price || space.price}</strong>
              </div>
              <span className="sd-rating">
                <Icon type="star" />
                4.9
              </span>
            </div>

            <div className="sd-duration-selector">
              {availableDurations.map(d => (
                <button
                  key={d.id}
                  type="button"
                  className={bookingDuration === d.id ? "is-active" : ""}
                  onClick={() => handleDurationChange(d.id)}
                >
                  <span>{d.label}</span>
                  <small>{d.id === "soatlik" ? "Soat" : d.id === "haftalik" ? "Hafta" : d.id === "oylik" ? "Oy" : "Kun"}</small>
                </button>
              ))}
            </div>

            <div className="sd-calendar-shell">
              <div className="sd-calendar-title">
                <div>
                  <span>Sanani tanlang</span>
                  <strong>{bookingRangeLabel}</strong>
                </div>
                <small>{bookingDuration === "soatlik" ? "Kun + vaqt" : bookingDuration === "oylik" ? "1 oy avtomatik" : bookingDuration === "haftalik" ? "1 hafta avtomatik" : "Boshlanish va tugash"}</small>
              </div>

              <div className="sd-calendar-stage">
                <div className="sd-calendar-pair">
                  {renderCalendarMonth(calYear, calMonth, calendarDays)}
                  {renderCalendarMonth(nextCalendar.year, nextCalendar.month, nextCalendarDays, true)}
                </div>
              </div>

              {bookingDuration === "soatlik" && hourPanelDate && (
                <div className="sd-hour-panel">
                  <div className="sd-hour-panel-head">
                    <div>
                      <span>{formatShortDate(hourPanelDate)}</span>
                      <strong>Vaqt oralig'ini tanlang</strong>
                    </div>
                    <small>Band / Bo'sh</small>
                  </div>
                  <div className="sd-hour-slots">
                    {hourlySlots.map((slot) => {
                      const status = getSlotStatus(hourPanelDate, slot);
                      const selected = selectedTimeSlots.includes(slot);
                      return (
                        <button
                          key={slot}
                          type="button"
                          className={`sd-hour-slot ${status === "booked" ? "is-booked" : ""} ${selected ? "is-selected" : ""}`}
                          disabled={status === "booked"}
                          onClick={() => handleTimeSlotToggle(slot)}
                        >
                          <strong>{slot}</strong>
                          <span>{status === "booked" ? "Band" : selected ? "Tanlandi" : "Bo'sh"}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="sd-booking-controls">
              <label>
                <span>Muddat</span>
                <input readOnly value={bookingUnitLabel} />
              </label>
              <label>
                <span>Mehmon</span>
                <input min="1" max={space.people || 1} type="number" value={guests} onChange={(event) => setGuests(Math.max(1, Math.min(space.people || 1, Number(event.target.value) || 1)))} />
              </label>
            </div>

            <div className="sd-total-box">
              <div className="sd-rate-breakdown">
                <span>
                  {bookingDuration === 'soatlik' ? 'Soatlik' : bookingDuration === 'haftalik' ? 'Haftalik' : bookingDuration === 'oylik' ? 'Oylik' : 'Kunlik'} narxlar hisobi
                </span>
                {dailyRatesBreakdown.length > 0 ? dailyRatesBreakdown.map((item, idx) => (
                  <div key={`${item.date}-${idx}`}>
                    <small>{item.date}</small>
                    <b>{formatMoney(item.rate)}</b>
                  </div>
                )) : (
                  <div>
                    <small>{bookingDuration === "soatlik" ? "Vaqt tanlang" : "Sana tanlang"}</small>
                    <b>{formatMoney(0)}</b>
                  </div>
                )}
              </div>
              <p>
                <span>{lang === 'uz' ? "Ijara summasi" : "Аренда"}</span>
                <b>{formatMoney(totalPrice)}</b>
              </p>
              {discountAmount > 0 && activeAppliedDiscount && (
                <p style={{ color: "#22c55e" }}>
                  <span>
                    Chegirma ({lang === 'uz' ? (activeAppliedDiscount.name_uz || activeAppliedDiscount.name_ru) : (activeAppliedDiscount.name_ru || activeAppliedDiscount.name_uz)}) -{activeAppliedDiscount.percent}%
                  </span>
                  <b>-{formatMoney(discountAmount)}</b>
                </p>
              )}
              <p>
                <span>{lang === 'uz' ? "Servis to'lovi" : "Сервисный сбор"}</span>
                <b>{formatMoney(serviceFee)}</b>
              </p>
              {hasBlockedDay && (
                <div className="sd-booking-warning">
                  {lang === 'uz' ? "Diqqat: Tanlangan davr ichida band qilingan kunlar bor." : "Внимание: В выбранный период есть занятые дни."}
                </div>
              )}
              <strong>
                <span>{lang === 'uz' ? "Jami" : "Итого"}</span>
                <b>{formatMoney(finalTotal)}</b>
              </strong>
            </div>

            <a
              href={`#book-space-${slugify(space.title)}`}
              className={`sd-primary-btn ${hasBlockedDay || (bookingDuration === "soatlik" && selectedTimeSlots.length === 0) ? "is-disabled" : ""}`}
              onClick={() => {
                try {
                  localStorage.setItem("joyzone-pending-booking", JSON.stringify({
                    spaceTitle: space.title || space.name,
                    duration: bookingDuration,
                    startDate: checkInDate,
                    endDate: checkOutDate || checkInDate,
                    slots: selectedTimeSlots,
                    guests,
                    total: finalTotal,
                    discount: discountAmount,
                    discountName: activeAppliedDiscount ? (activeAppliedDiscount.name_uz || activeAppliedDiscount.name_ru) : null
                  }));
                } catch (error) {
                  // Checkout still opens if storage is unavailable.
                }
              }}
            >
              <Icon type="calendar" />
              Bron qilish
            </a>
            <a href="tel:+998901234567" className="sd-secondary-btn">
              <Icon type="phone" />
              Qo'ng'iroq qilish
            </a>
            <button
              type="button"
              className="sd-secondary-btn sd-chat-btn"
              onClick={() => {
                const targetChat = startOrGetChatForSpace({
                  spaceTitle: space.title,
                  hostName: space.hostName || "Bekzod Tursunov"
                });
                setActiveChatId(targetChat.id);
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              Ega bilan bog'lanish
            </button>
          </div>
        </aside>
      </section>

      {activeChatId && (
        <DirectChatDrawer
          chatId={activeChatId}
          spaceTitle={space.title}
          hostName={space.hostName || "Bekzod Tursunov"}
          onClose={() => setActiveChatId(null)}
        />
      )}

      <section className="sd-similar sd-animate">
        <div className="sd-section-head">
          <p>Yana ko'ring</p>
          <h2>O'xshash joylar</h2>
        </div>
        <div className="property-grid">
          {similarSpaces.map((item, index) => (
            <PropertyCard key={item.title} item={item} index={index} />
          ))}
        </div>
      </section>

      <JoyFooter />

      {showGalleryModal && createPortal(
        <div className="sd-gallery-modal-overlay" onClick={() => setShowGalleryModal(false)}>
          <div className="sd-gallery-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sd-gallery-modal-header">
              <div>
                <span>Barcha rasmlar</span>
                <h3>{space.title}</h3>
              </div>
              <button type="button" className="sd-modal-close" onClick={() => setShowGalleryModal(false)} aria-label="Yopish">
                <Icon type="x" />
              </button>
            </div>
            <div className="sd-gallery-modal-body">
              <div className="sd-gallery-modal-stage">
                <img key={`modal-${galleryImages[activeImage]}-${activeImage}`} src={galleryImages[activeImage]} alt={`${space.title} ${activeImage + 1}`} />
                {galleryImages.length > 1 && (
                  <>
                    <button type="button" className="sd-gallery-modal-nav is-prev" onClick={() => goToImage(activeImage - 1)} aria-label="Oldingi rasm">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 18l-6-6 6-6" />
                      </svg>
                    </button>
                    <button type="button" className="sd-gallery-modal-nav is-next" onClick={() => goToImage(activeImage + 1)} aria-label="Keyingi rasm">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
              <div className="sd-gallery-modal-grid">
                {galleryImages.map((image, index) => (
                  <button
                    key={`${image}-modal`}
                    type="button"
                    className={index === activeImage ? "is-active" : ""}
                    onClick={() => setActiveImage(index)}
                    aria-label={`${index + 1}-rasmni ko'rish`}
                  >
                    <img src={image} alt="" />
                    <span>{String(index + 1).padStart(2, "0")}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showAmenitiesModal && createPortal(
        <div className="sd-modal-overlay" onClick={() => setShowAmenitiesModal(false)}>
          <div className="sd-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="sd-modal-header">
              <h3>Barcha qulayliklar</h3>
              <button 
                type="button" 
                className="sd-modal-close" 
                onClick={() => setShowAmenitiesModal(false)}
                aria-label="Yopish"
              >
                <Icon type="x" />
              </button>
            </div>
            <div className="sd-modal-body">
              <div className="sd-modal-amenities-grid">
                {selectedAmenities.length === 0 ? (
                  <p style={{ color: "#64748b", gridColumn: "1/-1", textAlign: "center" }}>
                    {lang === 'uz' ? "Qulayliklar mavjud emas" : "Удобства отсутствуют"}
                  </p>
                ) : (
                  selectedAmenities.map((p) => (
                    <div key={p.slug} className="sd-modal-amenity-card">
                      <Icon type={p.icon || "check-circle"} />
                      <span>{lang === 'uz' ? (p.name_uz || p.name_ru) : (p.name_ru || p.name_uz)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </main>
  );
}
