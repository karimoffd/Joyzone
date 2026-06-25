import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { gsap } from "gsap";
import axios from "axios";
import { sendClientAction } from "../socket.js";

import { Header as JoyNavbar } from "./HomeHero.jsx";
import { HeartIcon } from "./ui/Shared.jsx";
import { JoyFooter, PropertyCard } from "./ListingsSection.jsx";
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
  const fallbackSpace = useMemo(() => resolveSpace(route), [route]);
  const [space, setSpace] = useState(fallbackSpace);

  useEffect(() => {
    setSpace(fallbackSpace);
  }, [fallbackSpace]);

  // Fetch from REST API to align route with real database objects
  useEffect(() => {
    axios.get("http://localhost:5000/api/spaces")
      .then((res) => {
        if (res.data && res.data.length > 0) {
          const value = (route || "").replace(/^space-/, "");
          const index = Number(value);
          let dbSpace;
          
          if (Number.isInteger(index) && index >= 0 && index < res.data.length) {
            dbSpace = res.data[index];
          } else {
            dbSpace = res.data.find((item) => {
              if (!item) return false;
              const titleSlug = slugify(item.title || item.name || "");
              return (titleSlug && titleSlug === value) || String(item.id || item._id) === value;
            });
          }
          
          if (dbSpace) {
            setSpace(dbSpace);
          }
        }
      })
      .catch((err) => {
        console.warn("REST API orqali joy tafsilotini yuklab bo'lmadi:", err.message);
      });
  }, [route, fallbackSpace]);

  // Send view event to live traffic monitor via socket.io
  useEffect(() => {
    if (space) {
      sendClientAction("view_space", { spaceName: space.title || space.name });
    }
  }, [space]);

  const [activeImage, setActiveImage] = useState(0);
  const [liked, setLiked] = useState(false);
  const likeBtnRef = useRef(null);
  const [showAmenitiesModal, setShowAmenitiesModal] = useState(false);

  const handleLikeToggle = () => {
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
  const [calYear, setCalYear] = useState(2026);
  const [calMonth, setCalMonth] = useState(5); // June
  const [checkInDate, setCheckInDate] = useState("2026-06-12");

  useEffect(() => {
    axios.get("http://localhost:5000/api/bookings")
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

  const calendarDays = useMemo(() => {
    const date = new Date(Date.UTC(calYear, calMonth, 1));
    const daysArr = [];
    let startDay = date.getUTCDay();
    startDay = startDay === 0 ? 6 : startDay - 1;
    
    for (let i = 0; i < startDay; i++) {
      daysArr.push({ label: "", dateStr: null, isMuted: true });
    }
    
    const totalDays = new Date(Date.UTC(calYear, calMonth + 1, 0)).getUTCDate();
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      daysArr.push({
        label: d,
        dateStr,
        isMuted: false
      });
    }
    return daysArr;
  }, [calYear, calMonth]);

  const [bookingDuration, setBookingDuration] = useState("kunlik");

  const availableDurations = useMemo(() => {
    if (!space?.prices) return [{ id: "kunlik", label: "Kunlik", price: space?.price }];
    
    const options = [];
    if (space.prices.soatlik) options.push({ id: "soatlik", label: "Soatlik", price: space.prices.soatlik });
    if (space.prices.kunlik) options.push({ id: "kunlik", label: "Kunlik", price: space.prices.kunlik });
    if (space.prices.haftalik) options.push({ id: "haftalik", label: "Haftalik", price: space.prices.haftalik });
    if (space.prices.oylik) options.push({ id: "oylik", label: "Oylik", price: space.prices.oylik });
    
    return options.length > 0 ? options : [{ id: "kunlik", label: "Kunlik", price: space.price }];
  }, [space]);

  useEffect(() => {
    if (availableDurations.length > 0 && !availableDurations.some(d => d.id === bookingDuration)) {
      setBookingDuration(availableDurations[0].id);
    }
  }, [availableDurations, bookingDuration]);

  const parsedBasePrice = useMemo(() => {
    const selectedOption = availableDurations.find(d => d.id === bookingDuration);
    const priceStr = selectedOption ? selectedOption.price : space?.price;
    if (!priceStr) return 0;
    return Number(String(priceStr).replace(/\D/g, "")) || 0;
  }, [availableDurations, bookingDuration, space]);

  const { totalPrice, hasBlockedDay, dailyRatesBreakdown } = useMemo(() => {
    if (!checkInDate) return { totalPrice: 0, hasBlockedDay: false, dailyRatesBreakdown: [] };
    
    let sum = 0;
    let blocked = false;
    const breakdown = [];
    
    const start = new Date(checkInDate + "T00:00:00Z");
    for (let i = 0; i < days; i++) {
      const current = new Date(start);
      current.setUTCDate(start.getUTCDate() + i);
      const dStr = current.toISOString().split("T")[0];
      
      const isBooked = spaceBookings.some(b => {
        if (!b || !b.start_date || !b.end_date) return false;
        const bStart = String(b.start_date).split("T")[0];
        const bEnd = String(b.end_date).split("T")[0];
        return dStr >= bStart && dStr <= bEnd && (b.status === "booked" || b.status === "closed" || b.status === "Paid" || b.status === "Pending");
      });
      if (isBooked) blocked = true;
      
      const overridePrice = space.priceOverrides?.[dStr];
      const rate = overridePrice !== undefined ? Number(overridePrice) : parsedBasePrice;
      sum += rate;
      breakdown.push({ date: dStr, rate });
    }
    
    return { totalPrice: sum, hasBlockedDay: blocked, dailyRatesBreakdown: breakdown };
  }, [checkInDate, days, spaceBookings, space, parsedBasePrice]);

  const serviceFee = Math.max(25000, Math.round(totalPrice * 0.08));
  const finalTotal = totalPrice + serviceFee;

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
        end_date: (() => {
          const start = new Date(checkInDate + "T00:00:00Z");
          const end = new Date(start);
          end.setUTCDate(start.getUTCDate() + (days - 1));
          return end.toISOString().split("T")[0];
        })(),
        total_price: finalTotal,
        status: "Pending"
      };

      const res = await axios.post("http://localhost:5000/api/bookings", bookingData);
      
      if (res.status === 201) {
        sendClientAction("booking", {
          spaceName: space.title || space.name,
          price: formatMoney(finalTotal)
        });
        alert(`Muvaffaqiyatli band qilindi! Jami to'lov: ${formatMoney(finalTotal)}. So'rov kutilmoqda (Pending)`);
        
        const bookingsRes = await axios.get("http://localhost:5000/api/bookings");
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
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newReviewName, setNewReviewName] = useState("");
  const [newReviewRole, setNewReviewRole] = useState("");
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [newReviewText, setNewReviewText] = useState("");
  const [helpfulCounts, setHelpfulCounts] = useState({});

  // Fetch reviews from backend API on mount or space change
  useEffect(() => {
    if (space) {
      const spaceId = space.id || space._id || "648312e0f40a1b2c3d4e5f67";
      axios.get(`http://localhost:5000/api/reviews/space/${spaceId}`)
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

  const handleAddReview = async (e) => {
    e.preventDefault();
    if (!newReviewName.trim() || !newReviewText.trim()) return;

    const spaceId = space.id || space._id || "648312e0f40a1b2c3d4e5f67";
    const spaceName = space.title || space.name || "Focus Hub Coworking";

    const newReviewData = {
      space_id: spaceId,
      space_name: spaceName,
      name: newReviewName.trim(),
      role: newReviewRole.trim() || "Mehmon",
      rating: newReviewRating,
      text: newReviewText.trim()
    };

    try {
      const res = await axios.post("http://localhost:5000/api/reviews", newReviewData);
      if (res.status === 201) {
        setReviews(prev => [res.data, ...prev]);
      }
    } catch (err) {
      console.error("Fikr yuborishda xatolik, local simulyatsiya:", err);
      const simulatedReview = {
        space_id: spaceId,
        space_name: spaceName,
        name: newReviewName.trim(),
        role: newReviewRole.trim() || "Mehmon",
        rating: newReviewRating,
        text: newReviewText.trim(),
        date: "Hozirgina"
      };
      setReviews(prev => [simulatedReview, ...prev]);
    }

    // Reset form
    setNewReviewName("");
    setNewReviewRole("");
    setNewReviewRating(5);
    setNewReviewText("");
    setShowReviewForm(false);
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
    setGuests(Math.min(space.people, 4));
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

  return (
    <main className="space-detail-shell">
      <JoyNavbar userState={userState} setUserState={setUserState} activeIndex={1} />

      <section className="sd-hero">
        <div className="sd-hero-copy sd-animate">
          <a href="#filter" className="sd-back-link">
            <Icon type="arrow" />
            Barcha joylarga qaytish
          </a>
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
            <img src={space.images[activeImage]} alt={space.title} />
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
          </div>
          <div className="sd-thumbs" aria-label="Rasmlar">
            {space.images.map((image, index) => (
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
          </div>
        </div>
      </section>

      <section className="sd-content">
        <div className="sd-main">
          <div className="sd-stat-grid sd-animate">
            <DetailStat icon="users" label="Sig'im" value={`${space.people} kishi`} />
            <DetailStat icon="area" label="Maydon" value={`${space.area} m2`} />
            <DetailStat icon="clock" label="Format" value="Soatlik / kunlik" />
            <DetailStat icon="shield" label="Status" value="Tekshirilgan" />
          </div>

          <section className="sd-section sd-animate">
            <div className="sd-section-head">
              <p>Joy haqida</p>
              <h2>Qulay, tayyor va tez bron qilinadi</h2>
            </div>
            <p className="sd-description">
              Bu maydon Joyzone orqali uchrashuv, seminar, ishchi sprint yoki qisqa muddatli ijara uchun tanlanadi. Narx, sig'im,
              rasm va asosiy shartlar bir joyda ko'rinadi, bron so'rovi esa mezbonga darhol yuboriladi.
            </p>
          </section>

          <section className="sd-section sd-animate">
            <div className="sd-section-head">
              <p>Qulayliklar</p>
              <h2>Kerakli servislar tayyor</h2>
            </div>
            <div className="sd-amenities">
              {amenityList.slice(0, 8).map((item) => (
                <span key={item.name}>
                  <Icon type={item.icon} />
                  {item.name}
                </span>
              ))}
            </div>
            {amenityList.length > 8 && (
              <button 
                type="button" 
                className="sd-more-amenities-btn"
                onClick={() => setShowAmenitiesModal(true)}
              >
                Barcha qulayliklar ({amenityList.length})
              </button>
            )}
          </section>

          <section className="sd-section sd-animate">
            <div className="sd-section-head sd-review-head">
              <div>
                <p>Sharhlar ({reviews.length})</p>
                <h2>Mehmonlar fikri</h2>
              </div>
              <button 
                type="button" 
                className={`sd-write-review-btn ${showReviewForm ? 'is-active' : ''}`}
                onClick={() => setShowReviewForm(!showReviewForm)}
              >
                {showReviewForm ? "Yopish" : "Fikr qoldirish"}
              </button>
            </div>

            {showReviewForm && (
              <form onSubmit={handleAddReview} className="sd-review-form sd-animate">
                <h3>O'z fikringizni yozib qoldiring</h3>
                <div className="sd-form-grid">
                  <label className="sd-form-label">
                    <span>Ismingiz *</span>
                    <input 
                      type="text" 
                      required 
                      placeholder="Masalan: Jamshid" 
                      value={newReviewName} 
                      onChange={(e) => setNewReviewName(e.target.value)} 
                    />
                  </label>
                  <label className="sd-form-label">
                    <span>Kasbingiz yoki Statusingiz</span>
                    <input 
                      type="text" 
                      placeholder="Masalan: Dizayner" 
                      value={newReviewRole} 
                      onChange={(e) => setNewReviewRole(e.target.value)} 
                    />
                  </label>
                </div>

                <div className="sd-rating-select-row">
                  <span>Baho bering:</span>
                  <div className="sd-rating-stars-input">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setNewReviewRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        aria-label={`${star} yulduz`}
                        className="sd-star-input-btn"
                      >
                        <svg 
                          viewBox="0 0 24 24" 
                          fill={(hoverRating || newReviewRating) >= star ? "#ffbd22" : "none"} 
                          stroke="#ffbd22" 
                          strokeWidth="2"
                          style={{ width: "26px", height: "26px", transition: "transform 0.15s ease, fill 0.15s ease" }}
                        >
                          <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 16.9 6.6 19.8l1-6.1-4.4-4.3 6.1-.9L12 3Z" />
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>

                <label className="sd-form-label">
                  <span>Fikringiz *</span>
                  <textarea 
                    required 
                    rows="4" 
                    placeholder="Joy sizga qanday yoqdi? Sharoitlar va aloqa sifati haqida yozing..." 
                    value={newReviewText} 
                    onChange={(e) => setNewReviewText(e.target.value)}
                  />
                </label>

                <button type="submit" className="sd-submit-review-btn">
                  Yuborish
                </button>
              </form>
            )}

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

            <div className="sd-duration-selector" style={{ display: "flex", gap: "6px", marginBottom: "16px", flexWrap: "wrap" }}>
              {availableDurations.map(d => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setBookingDuration(d.id)}
                  style={{
                    flex: 1,
                    padding: "8px 0",
                    fontSize: "12px",
                    fontWeight: "800",
                    borderRadius: "8px",
                    border: `1.5px solid ${bookingDuration === d.id ? "#e46630" : "rgba(41, 74, 109, 0.12)"}`,
                    background: bookingDuration === d.id ? "rgba(228, 102, 48, 0.08)" : "#fff",
                    color: bookingDuration === d.id ? "#e46630" : "rgba(18, 40, 63, 0.6)",
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  {d.label}
                </button>
              ))}
            </div>

            <div className="sd-checkout-datepicker" style={{ marginBottom: "14px" }}>
              <span style={{ fontSize: "11px", fontWeight: "850", color: "#12283f", display: "block", marginBottom: "6px", textTransform: "uppercase" }}>Sanani tanlang</span>
              
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", background: "#f8fafc", padding: "6px 10px", borderRadius: "10px", border: "1px solid rgba(41, 74, 109, 0.08)" }}>
                <button type="button" onClick={() => calMonth === 0 ? (setCalMonth(11), setCalYear(y => y-1)) : setCalMonth(m => m-1)} style={{ fontSize: "14px", fontWeight: "950", color: "#e46630", padding: "0 6px", cursor: "pointer", border: "none", background: "transparent" }}>‹</button>
                <span style={{ fontSize: "12px", fontWeight: "800", color: "#12283f" }}>{monthNames[calMonth]} {calYear}</span>
                <button type="button" onClick={() => calMonth === 11 ? (setCalMonth(0), setCalYear(y => y+1)) : setCalMonth(m => m+1)} style={{ fontSize: "14px", fontWeight: "950", color: "#e46630", padding: "0 6px", cursor: "pointer", border: "none", background: "transparent" }}>›</button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", fontSize: "10px", fontWeight: "900", color: "rgba(18,40,63,0.5)", textAlign: "center", marginBottom: "4px" }}>
                {["D", "S", "Ch", "P", "J", "Sh", "Ya"].map(w => <span key={w}>{w}</span>)}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" }}>
                {calendarDays.map((day, i) => {
                  if (day.isMuted) return <div key={`muted-${i}`} />;
                  
                  const dateStr = day.dateStr;
                  const isBooked = spaceBookings.some(b => {
                    if (!b || !b.start_date || !b.end_date) return false;
                    const bStart = String(b.start_date).split("T")[0];
                    const bEnd = String(b.end_date).split("T")[0];
                    return dateStr >= bStart && dateStr <= bEnd && (b.status === "booked" || b.status === "closed" || b.status === "Paid" || b.status === "Pending");
                  });
                  
                  const isSelected = dateStr === checkInDate;
                  
                  let bg = "bg-white border-slate-200 hover:border-joyOrange";
                  let text = "text-joyBlue";
                  let cursor = "cursor-pointer";
                  let title = "";
                  
                  if (isBooked) {
                    bg = "bg-slate-100 border-slate-200 text-slate-300 cursor-not-allowed";
                    text = "text-slate-300 line-through";
                    cursor = "cursor-not-allowed";
                    title = "Band qilingan";
                  } else if (isSelected) {
                    bg = "bg-joyOrange border-joyOrange text-white font-bold";
                    text = "text-white";
                  }
                  
                  return (
                    <button
                      key={dateStr}
                      type="button"
                      disabled={isBooked}
                      onClick={() => setCheckInDate(dateStr)}
                      className={`text-[12px] p-1.5 rounded-lg border text-center transition-all ${bg} ${text} ${cursor}`}
                      style={{ minWidth: "24px", fontSize: "11px", fontWeight: "750", cursor: isBooked ? "not-allowed" : "pointer" }}
                      title={title}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="sd-booking-controls">
              <label>
                <span>{bookingDuration === 'soatlik' ? 'Soat' : bookingDuration === 'haftalik' ? 'Hafta' : bookingDuration === 'oylik' ? 'Oy' : 'Kun'}</span>
                <input min="1" max="30" type="number" value={days} onChange={(event) => setDays(Math.max(1, Number(event.target.value) || 1))} />
              </label>
              <label>
                <span>Mehmon</span>
                <input min="1" max={space.people} type="number" value={guests} onChange={(event) => setGuests(Math.max(1, Math.min(space.people, Number(event.target.value) || 1)))} />
              </label>
            </div>

            <div className="sd-total-box">
              <div style={{ fontSize: "11px", color: "rgba(18,40,63,0.5)", marginBottom: "8px", borderBottom: "1px solid #f1f5f9", paddingBottom: "6px" }}>
                <span style={{ fontWeight: "bold", display: "block", marginBottom: "4px" }}>
                  {bookingDuration === 'soatlik' ? 'Soatlik' : bookingDuration === 'haftalik' ? 'Haftalik' : bookingDuration === 'oylik' ? 'Oylik' : 'Kunlik'} narxlar hisobi:
                </span>
                {dailyRatesBreakdown.map((item, idx) => (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", marginTop: "2px" }}>
                    <span>{item.date}</span>
                    <span>{formatMoney(item.rate)}</span>
                  </div>
                ))}
              </div>
              <p>
                <span>Ijara summasi</span>
                <b>{formatMoney(totalPrice)}</b>
              </p>
              <p>
                <span>Servis to'lovi</span>
                <b>{formatMoney(serviceFee)}</b>
              </p>
              {hasBlockedDay && (
                <div style={{ fontSize: "12px", color: "#ef4444", fontWeight: "bold", margin: "8px 0", background: "#fef2f2", padding: "6px 10px", borderRadius: "8px", border: "1px solid #fee2e2" }}>
                  Diqqat: Tanlangan kunlar ichida band qilingan kunlar bor!
                </div>
              )}
              <strong>
                <span>Jami</span>
                <b>{formatMoney(finalTotal)}</b>
              </strong>
            </div>

            <a href={`#book-space-${slugify(space.title)}`} className="sd-primary-btn" style={{ textDecoration: "none", display: "flex", justifyContent: "center" }} onClick={(e) => {
              // Call handleBooking and prevent default if it handles API directly, but user's href might be intentional.
              // We'll let the user's href work so the checkout page opens.
            }}>
              <Icon type="calendar" />
              Bron qilish
            </a>
            <a href="tel:+998901234567" className="sd-secondary-btn">
              <Icon type="phone" />
              Qo'ng'iroq qilish
            </a>
          </div>
        </aside>
      </section>

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
                {amenityList.map((item) => (
                  <div key={item.name} className="sd-modal-amenity-card">
                    <Icon type={item.icon} />
                    <span>{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </main>
  );
}
