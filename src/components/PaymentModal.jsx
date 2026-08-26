import React, { useState, useEffect, useRef } from "react";
import { gsap } from "gsap";
import "./PaymentModal.css";

export default function PaymentModal({ isOpen, onClose, amount, title, onSuccess, productDetails }) {
  const [method, setMethod] = useState("card"); // card, click, payme, uzum
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [phone, setPhone] = useState("+998 ");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const modalRef = useRef(null);
  const overlayRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setCardNumber("");
      setCardHolder("");
      setExpiry("");
      setCvv("");
      setPhone("+998 ");
      setLoading(false);
      setSuccess(false);

      // Entrance animation
      gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: "power2.out" });
      gsap.fromTo(modalRef.current, { scale: 0.95, opacity: 0, y: 30 }, { scale: 1, opacity: 1, y: 0, duration: 0.45, ease: "back.out(1.1)" });
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleClose = () => {
    gsap.to(overlayRef.current, { opacity: 0, duration: 0.25, ease: "power2.in" });
    gsap.to(modalRef.current, { scale: 0.95, opacity: 0, y: 20, duration: 0.25, ease: "power2.in", onComplete: onClose });
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

  const handlePay = (e) => {
    e.preventDefault();
    if (method === "card") {
      if (cardNumber.replace(/\s/g, "").length < 16) return;
      if (expiry.length < 5) return;
      if (cvv.length < 3) return;
    } else {
      if (phone.replace(/\D/g, "").length < 12) return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      setTimeout(() => {
        handleClose();
        if (onSuccess) onSuccess();
      }, 1500);
    }, 1800);
  };

  if (!isOpen) return null;

  // Extract raw price for tax calculation
  const rawPrice = Number(amount?.replace(/[^\d]/g, "")) || 0;
  const tax = Math.round(rawPrice * 0.12);
  const formattedTax = new Intl.NumberFormat('ru-RU').format(tax) + " UZS";

  return (
    <div className="pm-overlay" ref={overlayRef}>
      <div className="pm-backdrop" onClick={handleClose} />
      
      <div className="pm-modal wide" ref={modalRef}>
        <button className="pm-close-btn" onClick={handleClose}>✕</button>

        {!success && !loading && (
          <div className="pm-checkout-grid">
            {/* Left Column - Payment Fields */}
            <form onSubmit={handlePay} className="pm-left-col">
              <div className="pm-header">
                <h2>{title || "To'lov xonasi"}</h2>
                <p>To'lov usulini tanlang va ma'lumotlarni kiriting</p>
              </div>

              {/* Payment Methods Badges */}
              <div className="pm-methods-selector">
                <button type="button" className={`pm-method-tab ${method === 'card' ? 'active' : ''}`} onClick={() => setMethod('card')}>
                  💳 Karta
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

              {/* Card Inputs Wrapper (Always visible, but dimmed/disabled when not 'card' method) */}
              <div className="pm-inputs-wrapper" style={{ opacity: method === 'card' ? 1 : 0.45, pointerEvents: method === 'card' ? 'auto' : 'none', transition: 'all 0.3s ease' }}>
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

              {/* Phone Input field for apps payments */}
              {method !== 'card' && (
                <div className="pm-app-inputs" style={{ marginTop: 20 }}>
                  <div className="pm-provider-mockup">
                    <span className="pm-provider-badge">{method.toUpperCase()} Pay</span>
                    <p>To'lov so'rovini qabul qilish uchun telefon raqamingizni kiriting:</p>
                  </div>
                  <div className="pm-input-group" style={{ marginTop: 16 }}>
                    <label>Telefon raqam</label>
                    <input type="tel" required value={phone} onChange={handlePhoneChange} placeholder="+998 90 123 45 67" />
                  </div>
                </div>
              )}

              <button type="submit" className="pm-pay-btn btn-shine" style={{ marginTop: 24 }}>
                Tasdiqlash va to'lash
              </button>
            </form>

            {/* Right Column - Billing Info */}
            <div className="pm-right-col">
              <h3 className="pm-summary-title">To'lov tafsilotlari</h3>
              
              <div className="pm-info-text-list">
                <div className="pm-info-text-row">
                  <span>Mahsulot nomi:</span>
                  <strong>{productDetails?.name || "Tarif plani"}</strong>
                </div>
                {productDetails?.description && (
                  <div className="pm-info-text-row">
                    <span>Tavsif:</span>
                    <strong>{productDetails.description}</strong>
                  </div>
                )}
                {productDetails?.limit && (
                  <div className="pm-info-text-row">
                    <span>Лимит мест:</span>
                    <strong>{productDetails.limit}</strong>
                  </div>
                )}
              </div>

              <div className="pm-billing-details">
                <div className="pm-billing-row">
                  <span>Asosiy summa</span>
                  <strong>{amount}</strong>
                </div>
                <div className="pm-billing-row">
                  <span>Soliq (НДС 12%)</span>
                  <strong>{formattedTax}</strong>
                </div>
                <div className="pm-billing-divider" />
                <div className="pm-billing-total">
                  <span>Jami</span>
                  <strong>{amount}</strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="pm-loading-state">
            <div className="pm-spinner" />
            <h3>To'lov amalga oshirilmoqda...</h3>
            <p>Iltimos, sahifani yopmang yoki yangilamang.</p>
          </div>
        )}

        {success && (
          <div className="pm-success-state">
            <div className="pm-success-circle">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <h3>To'lov muvaffaqiyatli bajarildi!</h3>
            <p>Tranzaksiya tasdiqlandi. Rahmat!</p>
          </div>
        )}
      </div>
    </div>
  );
}
