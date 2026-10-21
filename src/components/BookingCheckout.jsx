import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { Header as JoyNavbar } from "./HomeHero.jsx";
import api, { getAccessToken, getApiErrorMessage } from "../api/client.js";
import { clearBookingDraft, draftToBookingPayload, draftToQuotePayload, loadBookingDraft } from "../utils/bookingDraft.js";
import { normalizePlace } from "../utils/placeMapper.js";
import { normalizeBooking } from "../utils/bookingMapper.js";
import "./BookingCheckout.css";
import { navigate } from "../utils/router.js";

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function resolveSpace(route) {
  const value = (route || "").replace(/^book-space-/, "");
  return normalizePlace({
    id: value || "checkout-place",
    title: "Joyzone",
    location: "",
    price: "0 UZS",
    images: [],
    people: 1,
    area: 0,
  });
}

export default function BookingCheckout({ route, userState, setUserState }) {
  const [space, setSpace] = useState(() => resolveSpace(route));
  const [pendingBooking, setPendingBooking] = useState(null);
  const [serverQuote, setServerQuote] = useState(null);
  
  // Payment states
  const [method, setMethod] = useState("card"); // card, click, payme, uzum
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [phone, setPhone] = useState(() => {
    if (userState?.phone) return userState.phone;
    if (userState?.email && userState.email.startsWith("+998")) return userState.email;
    return "+998 ";
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const createdBookingRef = useRef(null);

  useEffect(() => {
    const draft = loadBookingDraft();
    if (!draft) {
      setError("Bron ma'lumotlari topilmadi yoki eskirgan. Joyni qayta tanlang.");
      return;
    }

    setPendingBooking(draft);
    api.post("/api/bookings/quote/", draftToQuotePayload(draft), { skipAuth: true })
      .then((res) => setServerQuote(res.data))
      .catch((err) => setError(getApiErrorMessage(err, "Narxni hisoblab bo'lmadi. Joyni qayta tanlang.")));
    if (draft.place_snapshot) {
      setSpace(normalizePlace(draft.place_snapshot));
    }
    api.get(`/api/places/${draft.place}/`, { skipAuth: true })
      .then((res) => setSpace(normalizePlace(res.data)))
      .catch(() => {
        setSpace((current) => normalizePlace({
          ...current,
          id: draft.place,
          title: draft.place_title || current.title,
          price: draft.amount ? `${draft.amount} ${draft.currency}` : current.price,
        }));
      });
  }, []);

  useEffect(() => {
    if (userState?.phone) {
      setPhone(userState.phone);
    } else if (userState?.email && userState.email.startsWith("+998")) {
      setPhone(userState.email);
    }
  }, [userState]);

  useEffect(() => {
    // Initial entrance animations
    gsap.fromTo(
      ".bc-card",
      { y: 30, opacity: 0, scale: 0.98 },
      { y: 0, opacity: 1, scale: 1, duration: 0.7, ease: "power3.out" }
    );
  }, [space]);

  const handleConfirm = async () => {
    if (!pendingBooking) {
      setError("Bron ma'lumotlari topilmadi yoki eskirgan. Joyni qayta tanlang.");
      return;
    }
    setLoading(true);
    setError("");
    let paymentConfirmed = false;
    try {
      const bookingPayload = draftToBookingPayload(pendingBooking);
      const token = getAccessToken();
      let booking = createdBookingRef.current;
      if (!booking) {
        const bookingResponse = await api.post("/api/bookings/", bookingPayload, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        booking = bookingResponse.data;
        createdBookingRef.current = booking;
        clearBookingDraft();
      }
      const paymentResponse = await api.post("/api/payments/test-pay/", {
        booking_id: booking.id,
        metadata: {
          method,
          phone: method === "card" ? "" : phone,
          draft_version: pendingBooking.version,
          draft_created_at: pendingBooking.created_at,
        }
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const payment = paymentResponse.data?.payment;
      const paymentStatus = String(payment?.status || "").toLowerCase();
      if (!payment || !["test_paid", "paid"].includes(paymentStatus)) {
        throw new Error("Backend test to'lovni tasdiqlamadi.");
      }
      paymentConfirmed = true;

      if (paymentResponse.data?.booking) {
        booking = paymentResponse.data.booking;
      } else {
        const bookingSyncResponse = await api.get(`/api/bookings/${booking.id}/`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        booking = bookingSyncResponse.data;
      }

      const activeBooking = normalizeBooking(booking);
      if (!["test_paid", "paid"].includes(activeBooking.payment_status)) {
        throw new Error("Bron to'lov holati backend bilan sinxronlanmadi.");
      }
      const placeSnapshot = activeBooking.place_details || pendingBooking.place_snapshot || space;
      const cachedActiveBooking = {
        ...activeBooking,
        paymentId: payment.id,
        paymentStatus: activeBooking.payment_status,
        spaceTitle: activeBooking.place_title,
        place: placeSnapshot,
        placeSnapshot,
        timestamp: Date.now(),
        method,
        duration: activeBooking.duration_type,
        startDate: activeBooking.start_date,
      };

      // App persists this backend-confirmed object to localStorage as a cache.
      setUserState({
        ...userState,
        activeBooking: cachedActiveBooking,
      });

      setLoading(false);
      setSuccess(true);

      // Delay is presentation-only; payment and booking state are already confirmed above.
      setTimeout(() => {
        gsap.to(".bc-card", {
          scale: 0.95,
          opacity: 0,
          y: -20,
          duration: 0.4,
          ease: "power2.inOut",
          onComplete: () => {
            navigate("/profile");
          }
        });
      }, 1500);
    } catch (err) {
      setLoading(false);
      setError(getApiErrorMessage(
        err,
        paymentConfirmed
          ? "Test to'lovi tasdiqlandi, ammo bron ma'lumotlarini yangilab bo'lmadi. Profilni qayta oching."
          : createdBookingRef.current
          ? "Bron yaratildi, ammo test to'lovi bajarilmadi. To'lovni qayta urinib ko'ring."
          : "Bron yaratishda xatolik yuz berdi. Iltimos, qayta urinib ko'ring."
      ));
    }
  };

  const handleNumberChange = (e) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 16) value = value.slice(0, 16);
    const formatted = value.match(/.{1,4}/g)?.join(" ") || value;
    setCardNumber(formatted);
  };

  const handleExpiryChange = (e) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 4) value = value.slice(0, 4);
    if (value.length > 2) {
      setExpiry(value.slice(0, 2) + "/" + value.slice(2));
    } else {
      setExpiry(value);
    }
  };

  const handleCvvChange = (e) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 3) value = value.slice(0, 3);
    setCvv(value);
  };

  const handlePhoneChange = (e) => {
    let val = e.target.value;
    if (!val.startsWith("+998")) val = "+998 ";
    setPhone(val);
  };

  // Totals come from the backend quote; the local draft is only a fallback
  // while the quote is loading.
  const basePriceVal = serverQuote
    ? Number(serverQuote.amount) - Number(serverQuote.tax)
    : Number(pendingBooking?.pricing?.subtotal) || 0;
  const taxVal = serverQuote ? Number(serverQuote.tax) : Number(pendingBooking?.pricing?.tax) || 0;
  const totalPayable = serverQuote
    ? Number(serverQuote.amount)
    : Number(pendingBooking?.amount) || (basePriceVal + taxVal);

  const formattedBase = new Intl.NumberFormat('ru-RU').format(basePriceVal) + " UZS";
  const formattedTax = new Intl.NumberFormat('ru-RU').format(taxVal) + " UZS";
  const formattedTotal = new Intl.NumberFormat('ru-RU').format(totalPayable) + " UZS";

  return (
    <main className="booking-checkout-shell">
      <JoyNavbar userState={userState} setUserState={setUserState} activeIndex={-1} />

      <section className="bc-container">
        {/* Loading state directly in card */}
        {loading && (
          <div className="bc-card pm-loading-state">
            <div className="pm-spinner" />
            <h3>To'lov amalga oshirilmoqda...</h3>
            <p>Iltimos, sahifani yopmang yoki yangilamang.</p>
          </div>
        )}

        {/* Success state directly in card */}
        {success && (
          <div className="bc-card pm-success-state" data-testid="booking-payment-success">
            <div className="pm-success-circle">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <h3>To'lov muvaffaqiyatli bajarildi!</h3>
            <p>Sizning ijarangiz faollashtirildi. Profilga yo'naltirilmoqda...</p>
          </div>
        )}

        {/* Regular split checkout screen */}
        {!loading && !success && (
          <div className="bc-card wide pm-checkout-grid">
            {/* Left Column: Form Fields */}
            <form onSubmit={(e) => { e.preventDefault(); handleConfirm(); }} className="pm-left-col">
              <a href={`/space-${space.id || slugify(space.title)}`} className="bc-back-btn" style={{ marginBottom: 20, display: "inline-flex", alignItems: "center", textDecoration: "none", fontSize: "14px", fontWeight: "600", color: "#64748b", gap: "6px" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                  <path d="M19 12H5M12 5l-7 7 7 7"/>
                </svg>
                Orqaga qaytish
              </a>

              <div className="pm-header">
                <h2>{method === 'card' ? "Karta ma'lumotlari" : "Telefon raqami"}</h2>
                <p>{method === 'card' ? "To'lovni amalga oshirish uchun karta ma'lumotlarini kiriting" : "To'lov so'rovini yuborish uchun telefon raqamingizni kiriting"}</p>
              </div>
              {error ? (
                <div style={{ marginBottom: 16, padding: "10px 12px", borderRadius: 10, background: "#fef2f2", color: "#991b1b", fontSize: 13 }}>
                  {error}
                </div>
              ) : null}

              {/* Card Inputs Wrapper (Always rendered, animated via CSS transition classes) */}
              <div className={`pm-inputs-wrapper ${method !== 'card' ? 'dimmed' : ''}`} style={{ pointerEvents: method === 'card' ? 'auto' : 'none' }}>
                <div className="pm-inputs-grid">
                  <div className="pm-input-group">
                    <label>Karta raqami</label>
                    <input data-testid="checkout-card-number" type="text" disabled={method !== 'card'} required={method === 'card'} placeholder="8600 •••• •••• ••••" value={cardNumber} onChange={handleNumberChange} />
                  </div>
                  <div className="pm-input-group">
                    <label>Karta egasining ismi</label>
                    <input data-testid="checkout-card-holder" type="text" disabled={method !== 'card'} required={method === 'card'} placeholder="KARTADA YOZILGANDEK" value={cardHolder} onChange={(e) => setCardHolder(e.target.value)} />
                  </div>
                  <div className="pm-row">
                    <div className="pm-input-group flex-1">
                      <label>Amal qilish muddati</label>
                      <input data-testid="checkout-expiry" type="text" disabled={method !== 'card'} required={method === 'card'} placeholder="MM/YY" value={expiry} onChange={handleExpiryChange} />
                    </div>
                    <div className="pm-input-group flex-1">
                      <label>CVV / CVC</label>
                      <input data-testid="checkout-cvv" type="password" disabled={method !== 'card'} required={method === 'card'} placeholder="•••" value={cvv} onChange={handleCvvChange} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Phone Input field for apps payments (always rendered, animated via class toggle) */}
              <div className={`pm-app-inputs ${method !== 'card' ? 'open' : ''}`}>
                <div className="pm-input-group">
                  <label>Telefon raqam</label>
                  <input type="tel" required={method !== 'card'} value={phone} onChange={handlePhoneChange} placeholder="+998 90 123 45 67" />
                </div>
              </div>

              <button data-testid="checkout-pay" type="submit" className="pm-pay-btn btn-shine" style={{ marginTop: 24 }}>
                To'lovni amalga oshirish
              </button>
            </form>

            {/* Right Column: Order Info and Taxes */}
            <div className="pm-right-col">
              <h3 className="pm-summary-title">To'lov turi</h3>
              
              {/* Payment Methods selector (moved to the right) */}
              <div className="pm-methods-selector" style={{ marginBottom: 16 }}>
                <button type="button" className={`pm-method-tab ${method === 'card' ? 'active' : ''}`} onClick={() => setMethod('card')}>
                  Karta
                </button>
                <button type="button" className={`pm-method-tab method-click ${method === 'click' ? 'active' : ''}`} onClick={() => setMethod('click')}>
                  Click
                </button>
                <button type="button" className={`pm-method-tab method-payme ${method === 'payme' ? 'active' : ''}`} onClick={() => setMethod('payme')}>
                  Payme
                </button>
                <button type="button" className={`pm-method-tab method-uzum ${method === 'uzum' ? 'active' : ''}`} onClick={() => setMethod('uzum')}>
                  Uzum
                </button>
              </div>

              {/* Simple Provider Info Text */}
              {method !== 'card' && (
                <div className="pm-provider-text" style={{ fontSize: "13px", color: "#64748b", lineHeight: "1.5", marginBottom: 20 }}>
                  To'lov so'rovi <strong>{method.toUpperCase()} Pay</strong> orqali kiritilgan telefon raqamiga yuboriladi.
                </div>
              )}

              <div className="pm-billing-details" style={{ marginTop: "auto" }}>
                <h3 className="pm-summary-title" style={{ fontSize: "14px", borderBottom: "1px solid #e2e8f0", paddingBottom: "10px", marginBottom: "16px" }}>To'lov tafsilotlari</h3>
                <div className="pm-billing-row">
                  <span>Asosiy ijara</span>
                  <strong>{formattedBase}</strong>
                </div>
                <div className="pm-billing-row">
                  <span>QQS (Soliq 12%)</span>
                  <strong>{formattedTax}</strong>
                </div>
                <div className="pm-billing-divider" />
                <div className="pm-billing-total">
                  <span>Jami to'lov</span>
                  <strong>{formattedTotal}</strong>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
