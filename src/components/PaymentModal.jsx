import React, { useState, useEffect, useRef } from "react";
import { gsap } from "gsap";
import "./PaymentModal.css";

export default function PaymentModal({ isOpen, onClose, amount, title, onSuccess }) {
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
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
      setLoading(false);
      setSuccess(false);

      // Entrance animation
      gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: "power2.out" });
      gsap.fromTo(modalRef.current, { scale: 0.9, opacity: 0, y: 30 }, { scale: 1, opacity: 1, y: 0, duration: 0.45, ease: "back.out(1.1)" });
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleClose = () => {
    gsap.to(overlayRef.current, { opacity: 0, duration: 0.25, ease: "power2.in" });
    gsap.to(modalRef.current, { scale: 0.9, opacity: 0, y: 20, duration: 0.25, ease: "power2.in", onComplete: onClose });
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
      case "uzcard":
        return <span className="card-brand-logo uzcard-logo">UZCARD</span>;
      case "humo":
        return <span className="card-brand-logo humo-logo">HUMO</span>;
      case "visa":
        return <span className="card-brand-logo visa-logo">VISA</span>;
      case "mastercard":
        return <span className="card-brand-logo mc-logo">Mastercard</span>;
      default:
        return null;
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

  const handlePay = (e) => {
    e.preventDefault();
    if (cardNumber.replace(/\s/g, "").length < 16) return;
    if (expiry.length < 5) return;
    if (cvv.length < 3) return;

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

  const cardType = detectCardType(cardNumber);

  return (
    <div className="pm-overlay" ref={overlayRef}>
      <div className="pm-backdrop" onClick={handleClose} />
      
      <div className="pm-modal" ref={modalRef}>
        <button className="pm-close-btn" onClick={handleClose}>✕</button>

        {!success && !loading && (
          <form onSubmit={handlePay} className="pm-form">
            <div className="pm-header">
              <h2>{title || "To'lov xonasi"}</h2>
              <p>Xavfsiz va tezkor to'lov tizimi</p>
            </div>

            {/* Virtual Card Preview */}
            <div className={`pm-card-preview type-${cardType}`}>
              <div className="pm-card-chip" />
              <div className="pm-card-logo-area">{getCardLogo(cardType)}</div>
              <div className="pm-card-number">
                {cardNumber || "•••• •••• •••• ••••"}
              </div>
              <div className="pm-card-footer">
                <div className="pm-card-holder">
                  <span>KARTA EGLASI</span>
                  <strong>{(cardHolder || "FULL NAME").toUpperCase()}</strong>
                </div>
                <div className="pm-card-expiry">
                  <span>MUDDATI</span>
                  <strong>{expiry || "MM/YY"}</strong>
                </div>
              </div>
            </div>

            {/* Inputs */}
            <div className="pm-inputs-grid">
              <div className="pm-input-group">
                <label>Karta raqami</label>
                <input 
                  type="text" 
                  required 
                  placeholder="8600 •••• •••• ••••" 
                  value={cardNumber} 
                  onChange={handleNumberChange}
                />
              </div>

              <div className="pm-input-group">
                <label>Karta egasining ismi</label>
                <input 
                  type="text" 
                  required 
                  placeholder="KARTADA YOZILGANDEK" 
                  value={cardHolder} 
                  onChange={(e) => setCardHolder(e.target.value)}
                />
              </div>

              <div className="pm-row">
                <div className="pm-input-group flex-1">
                  <label>Amal qilish muddati</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="MM/YY" 
                    value={expiry} 
                    onChange={handleExpiryChange}
                  />
                </div>
                <div className="pm-input-group flex-1">
                  <label>CVV / CVC</label>
                  <input 
                    type="password" 
                    required 
                    placeholder="•••" 
                    value={cvv} 
                    onChange={handleCvvChange}
                  />
                </div>
              </div>
            </div>

            {/* Order Total & Pay button */}
            <div className="pm-pay-action">
              <div className="pm-total-row">
                <span>To'lov summasi:</span>
                <strong>{amount}</strong>
              </div>
              <button type="submit" className="pm-pay-btn btn-shine">
                To'lash
              </button>
            </div>
          </form>
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
