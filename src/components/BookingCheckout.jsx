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
  const [step, setStep] = useState(1); // 1 = Summary, 2 = Payment
  
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
  }, [space, step]);

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

  const getPayAmount = () => {
    if (!pendingBooking) return space.price;
    const t = pendingBooking.total;
    if (typeof t === 'number') {
      return new Intl.NumberFormat('ru-RU').format(Math.round(t)) + " UZS";
    }
    return t;
  };

  const detectCardType = (number) => {
    const cleanNum = number.replace(/\D/g, "");
    if (cleanNum.startsWith("8600")) return "uzcard";
    if (cleanNum.startsWith("9860")) return "humo";
    if (cleanNum.startsWith("4")) return "visa";
    if (cleanNum.startsWith("5")) return "mastercard";
    return "unknown";
  };

  const getCardLogo = (type) => {
    switch (type) {
      case "uzcard": return <span className="card-brand-logo uzcard-logo">UZCARD</span>;
      case "humo": return <span className="card-brand-logo humo-logo">HUMO</span>;
      case "visa": return <span className="card-brand-logo visa-logo">VISA</span>;
      case "mastercard": return <span className="card-brand-logo mc-logo">Mastercard</span>;
      default: return null;
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

  const handleProceedToPayment = () => {
    gsap.to(".bc-card", {
      opacity: 0,
      y: -10,
      duration: 0.25,
      onComplete: () => {
        setStep(2);
      }
    });
  };

  const basePriceVal = pendingBooking ? pendingBooking.total : (Number(space.price.replace(/[^\d]/g, "")) || 0);
  const taxVal = Math.round(basePriceVal * 0.12);
  const formattedTax = new Intl.NumberFormat('ru-RU').format(taxVal) + " UZS";

  return (
    <main className="booking-checkout-shell">
      <JoyNavbar userState={userState} setUserState={setUserState} activeIndex={-1} />

      <section className="bc-container">
        {/* Step 1: Summary Page */}
        {step === 1 && (
          <div className="bc-card">
            <a href={`#space-${slugify(space.title)}`} className="bc-back-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
              Joy sahifasiga qaytish
            </a>

            <div className="bc-header">
              <h1>Bronni tasdiqlash</h1>
              <p>Siz tizimga kiritilgansiz. Ma'lumotlaringiz xavfsiz himoyalangan.</p>
            </div>

            <div className="bc-space-preview">
              <img src={space.images[0]} alt={space.title} />
              <div>
                <h3>{space.title}</h3>
                <p>{space.location}</p>
              </div>
            </div>

            <div className="bc-summary-details">
              <div className="bc-summary-row">
                <span>Muddati</span>
                <strong>
                  {pendingBooking ? (pendingBooking.duration === 'soatlik' ? 'Soatlik' : pendingBooking.duration === 'haftalik' ? 'Haftalik' : pendingBooking.duration === 'oylik' ? 'Oylik' : 'Kunlik') : 'Kunlik'}
                </strong>
              </div>
              <div className="bc-summary-row">
                <span>Mijoz</span>
                <strong>{userState.name || 'Tasdiqlangan foydalanuvchi'}</strong>
              </div>
              <div className="bc-summary-row">
                <span>Mehmonlar</span>
                <strong>{pendingBooking ? `${pendingBooking.guests} kishi` : '1 kishi'}</strong>
              </div>
              {pendingBooking?.discount > 0 && (
                <div className="bc-summary-row" style={{ color: "#22c55e" }}>
                  <span>Chegirma {pendingBooking.discountName ? `(${pendingBooking.discountName})` : ''}</span>
                  <strong>-{typeof pendingBooking.discount === 'number' ? new Intl.NumberFormat('ru-RU').format(pendingBooking.discount) + " UZS" : pendingBooking.discount}</strong>
                </div>
              )}
              <div className="bc-summary-divider" />
              <div className="bc-summary-total">
                <span>To'lov summasi</span>
                <strong>{getPayAmount()}</strong>
              </div>
            </div>

            <button type="button" className="bc-confirm-btn btn-shine" onClick={handleProceedToPayment}>
              Tasdiqlash
            </button>
          </div>
        )}

        {/* Step 2: Split Screen Payment Page */}
        {step === 2 && !loading && !success && (
          <div className="bc-card wide pm-checkout-grid">
            {/* Left Column: Form Fields */}
            <form onSubmit={(e) => { e.preventDefault(); handleConfirm(); }} className="pm-left-col">
              <div className="pm-header">
                <h2>To'lov usuli</h2>
                <p>To'lov turini tanlang va kartangiz ma'lumotlarini kiriting</p>
              </div>

              {/* Payment Methods selector */}
              <div className="pm-methods-selector">
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

              {method === 'card' ? (
                <div className="pm-card-inputs">
                  {/* Card mockup */}
                  <div className={`pm-card-preview type-${detectCardType(cardNumber)}`}>
                    <div className="pm-card-chip" />
                    <div className="pm-card-logo-area">{getCardLogo(detectCardType(cardNumber))}</div>
                    <div className="pm-card-number">{cardNumber || "•••• •••• •••• ••••"}</div>
                    <div className="pm-card-footer">
                      <div className="pm-card-holder">
                        <span>KARTA EGASI</span>
                        <strong>{(cardHolder || "FULL NAME").toUpperCase()}</strong>
                      </div>
                      <div className="pm-card-expiry">
                        <span>MUDDATI</span>
                        <strong>{expiry || "MM/YY"}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="pm-inputs-grid">
                    <div className="pm-input-group">
                      <label>Karta raqami</label>
                      <input type="text" required placeholder="8600 •••• •••• ••••" value={cardNumber} onChange={handleNumberChange} />
                    </div>
                    <div className="pm-input-group">
                      <label>Karta egasining ismi</label>
                      <input type="text" required placeholder="KARTADA YOZILGANDEK" value={cardHolder} onChange={(e) => setCardHolder(e.target.value)} />
                    </div>
                    <div className="pm-row">
                      <div className="pm-input-group flex-1">
                        <label>Amal qilish muddati</label>
                        <input type="text" required placeholder="MM/YY" value={expiry} onChange={handleExpiryChange} />
                      </div>
                      <div className="pm-input-group flex-1">
                        <label>CVV / CVC</label>
                        <input type="password" required placeholder="•••" value={cvv} onChange={handleCvvChange} />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="pm-app-inputs">
                  <div className="pm-provider-mockup">
                    <span className="pm-provider-badge">{method.toUpperCase()} Pay</span>
                    <p>To'lov so'rovini qabul qilish uchun telefon raqamingizni kiriting:</p>
                  </div>
                  <div className="pm-input-group" style={{ marginTop: 20 }}>
                    <label>Telefon raqam</label>
                    <input type="tel" required value={phone} onChange={handlePhoneChange} placeholder="+998 90 123 45 67" />
                  </div>
                </div>
              )}

              <button type="submit" className="pm-pay-btn btn-shine" style={{ marginTop: 24 }}>
                To'lovni amalga oshirish
              </button>
            </form>

            {/* Right Column: Order Info and Taxes */}
            <div className="pm-right-col">
              <h3 className="pm-summary-title">Buyurtma tafsilotlari</h3>
              
              <div className="pm-product-info" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <img src={space.images[0]} alt={space.title} style={{ width: "60px", height: "60px", borderRadius: "10px", objectFit: "cover" }} />
                <div>
                  <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700 }}>{space.title}</h4>
                  <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>{space.location}</p>
                </div>
              </div>

              <div className="pm-billing-details">
                <div className="pm-billing-row">
                  <span>Asosiy ijara</span>
                  <strong>{getPayAmount()}</strong>
                </div>
                <div className="pm-billing-row">
                  <span>QQS (Soliq 12%)</span>
                  <strong>{formattedTax}</strong>
                </div>
                <div className="pm-billing-divider" />
                <div className="pm-billing-total">
                  <span>Jami to'lov</span>
                  <strong>{getPayAmount()}</strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading and Success states directly in card */}
        {step === 2 && loading && (
          <div className="bc-card pm-loading-state">
            <div className="pm-spinner" />
            <h3>To'lov amalga oshirilmoqda...</h3>
            <p>Iltimos, sahifani yopmang yoki yangilamang.</p>
          </div>
        )}

        {step === 2 && success && (
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
      </section>
    </main>
  );
}
