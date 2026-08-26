import React, { useEffect, useState } from "react";
import { gsap } from "gsap";
import { Header as JoyNavbar } from "./HomeHero.jsx";
import { propertyCards } from "../data/content.js";
import "./BookingCheckout.css";

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function resolveSpace(route) {
  const value = (route || "").replace(/^book-space-/, "");
  const index = Number(value);
  if (Number.isInteger(index) && index >= 0 && index < propertyCards.length) {
    return propertyCards[index];
  }
  return propertyCards.find((item) => slugify(item.title) === value) || propertyCards[0];
}

export default function BookingCheckout({ route, userState, setUserState }) {
  const space = resolveSpace(route);
  const [pendingBooking, setPendingBooking] = useState(null);
  
  // Payment states
  const [method, setMethod] = useState("card"); // card, click, payme, uzum
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [phone, setPhone] = useState("+998 ");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("joyzone-pending-booking");
      if (saved) {
        setPendingBooking(JSON.parse(saved));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    // Initial entrance animations
    gsap.fromTo(
      ".bc-card",
      { y: 30, opacity: 0, scale: 0.98 },
      { y: 0, opacity: 1, scale: 1, duration: 0.7, ease: "power3.out" }
    );
  }, [space]);

  const handleConfirm = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      
      setTimeout(() => {
        // Animate exit
        gsap.to(".bc-card", {
          scale: 0.95,
          opacity: 0,
          y: -20,
          duration: 0.4,
          ease: "power2.inOut",
          onComplete: () => {
            setUserState({
              ...userState,
              activeBooking: {
                spaceTitle: space.title,
                timestamp: Date.now()
              }
            });
            localStorage.removeItem("joyzone-pending-booking");
            window.location.hash = "#profile";
          }
        });
      }, 1500);
    }, 1800);
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

  const basePriceVal = pendingBooking ? (Number(pendingBooking.total) || 0) : (Number(space.price.replace(/[^\d]/g, "")) || 0);
  const taxVal = Math.round(basePriceVal * 0.12);
  const totalPayable = basePriceVal + taxVal;

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
          <div className="bc-card pm-success-state">
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
              <a href={`#space-${slugify(space.title)}`} className="bc-back-btn" style={{ marginBottom: 20, display: "inline-flex", alignItems: "center", textDecoration: "none", fontSize: "14px", fontWeight: "600", color: "#64748b", gap: "6px" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                  <path d="M19 12H5M12 5l-7 7 7 7"/>
                </svg>
                Orqaga qaytish
              </a>

              <div className="pm-header">
                <h2>{method === 'card' ? "Karta ma'lumotlari" : "Telefon raqami"}</h2>
                <p>{method === 'card' ? "To'lovni amalga oshirish uchun karta ma'lumotlarini kiriting" : "To'lov so'rovini yuborish uchun telefon raqamingizni kiriting"}</p>
              </div>

              {/* Card Inputs Wrapper (Always rendered, animated via CSS transition classes) */}
              <div className={`pm-inputs-wrapper ${method !== 'card' ? 'dimmed' : ''}`} style={{ pointerEvents: method === 'card' ? 'auto' : 'none' }}>
                <div className="pm-inputs-grid">
                  <div className="pm-input-group">
                    <label>Karta raqami</label>
                    <input type="text" disabled={method !== 'card'} required={method === 'card'} placeholder="8600 •••• •••• ••••" value={cardNumber} onChange={handleNumberChange} />
                  </div>
                  <div className="pm-input-group">
                    <label>Karta egasining ismi</label>
                    <input type="text" disabled={method !== 'card'} required={method === 'card'} placeholder="KARTADA YOZILGANDEK" value={cardHolder} onChange={(e) => setCardHolder(e.target.value)} />
                  </div>
                  <div className="pm-row">
                    <div className="pm-input-group flex-1">
                      <label>Amal qilish muddati</label>
                      <input type="text" disabled={method !== 'card'} required={method === 'card'} placeholder="MM/YY" value={expiry} onChange={handleExpiryChange} />
                    </div>
                    <div className="pm-input-group flex-1">
                      <label>CVV / CVC</label>
                      <input type="password" disabled={method !== 'card'} required={method === 'card'} placeholder="•••" value={cvv} onChange={handleCvvChange} />
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

              <button type="submit" className="pm-pay-btn btn-shine" style={{ marginTop: 24 }}>
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
