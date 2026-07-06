import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import "./BookingModal.css";

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export default function BookingModal({ isOpen, onClose, spaceTitle, totalPrice, days, guests }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("+998 ");
  
  const formatPhone = (val) => {
    if (!val) return "+";
    let raw = val.replace(/[^\d+]/g, "");
    if (!raw.startsWith("+")) raw = "+" + raw.replace(/\+/g, "");
    const digitsOnly = raw.replace(/\D/g, "");

    if (digitsOnly.length === 0) return "+";

    if (digitsOnly.startsWith("998")) {
      const rest = digitsOnly.slice(3);
      let formatted = "+998";
      if (rest.length > 0) formatted += " " + rest.substring(0, 2);
      if (rest.length > 2) formatted += " " + rest.substring(2, 5);
      if (rest.length > 5) formatted += " " + rest.substring(5, 7);
      if (rest.length > 7) formatted += " " + rest.substring(7, 9);
      return formatted;
    }
    
    if (digitsOnly.startsWith("7")) {
      const rest = digitsOnly.slice(1);
      let formatted = "+7";
      if (rest.length > 0) formatted += " " + rest.substring(0, 3);
      if (rest.length > 3) formatted += " " + rest.substring(3, 6);
      if (rest.length > 6) formatted += " " + rest.substring(6, 8);
      if (rest.length > 8) formatted += " " + rest.substring(8, 10);
      return formatted;
    }

    let formatted = "+" + digitsOnly.substring(0, Math.min(3, digitsOnly.length));
    if (digitsOnly.length > 3) {
      let groups = digitsOnly.substring(3).match(/.{1,3}/g);
      if (groups) formatted += " " + groups.join(" ");
    }
    return formatted;
  };

  const handlePhoneChange = (e) => {
    setPhone(formatPhone(e.target.value));
  };

  const overlayRef = useRef(null);
  const modalRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setStep(1);
      
      // Animate entrance
      gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "power2.out" });
      gsap.fromTo(modalRef.current, { y: 100, opacity: 0, scale: 0.95 }, { y: 0, opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.1)" });
    } else {
      document.body.style.overflow = "";
    }
    
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleClose = () => {
    gsap.to(overlayRef.current, { opacity: 0, duration: 0.3, ease: "power2.in" });
    gsap.to(modalRef.current, { y: 50, opacity: 0, scale: 0.95, duration: 0.3, ease: "power2.in", onComplete: onClose });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || phone.length < 9) return;
    
    // Transition to loading
    gsap.to(contentRef.current, { opacity: 0, y: -20, duration: 0.3, ease: "power2.in", onComplete: () => {
      setStep(2);
      gsap.fromTo(contentRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" });
      
      // Simulate API call
      setTimeout(() => {
        gsap.to(contentRef.current, { opacity: 0, scale: 0.9, duration: 0.3, ease: "power2.in", onComplete: () => {
          setStep(3);
          gsap.fromTo(contentRef.current, { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.5)" });
          
          // Animate checkmark
          gsap.fromTo(".bm-check-icon path", { strokeDasharray: 50, strokeDashoffset: 50 }, { strokeDashoffset: 0, duration: 0.6, delay: 0.2, ease: "power2.out" });
        }});
      }, 2000);
    }});
  };

  if (!isOpen) return null;

  return (
    <div className="bm-overlay" ref={overlayRef}>
      <div className="bm-backdrop" onClick={handleClose} />
      
      <div className="bm-modal" ref={modalRef}>
        <button className="bm-close-btn" onClick={handleClose} aria-label="Yopish">
          <CloseIcon />
        </button>
        
        <div className="bm-content" ref={contentRef}>
          {step === 1 && (
            <form onSubmit={handleSubmit} className="bm-step-form">
              <div className="bm-header">
                <h2>Bron so'rovi</h2>
                <p>Ma'lumotlaringizni kiriting, va biz siz bilan bog'lanamiz.</p>
              </div>
              
              <div className="bm-summary-card">
                <h3>{spaceTitle}</h3>
                <div className="bm-summary-details">
                  <span>{days} kun</span>
                  <span className="bm-dot">•</span>
                  <span>{guests} kishi</span>
                </div>
                <div className="bm-summary-price">
                  <span>Jami to'lov:</span>
                  <strong>{totalPrice}</strong>
                </div>
              </div>
              
              <div className="bm-form-group">
                <label>Ismingiz</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Jamshid" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                />
              </div>
              
              <div className="bm-form-group">
                <label>Telefon raqam</label>
                <input 
                  type="tel" 
                  required 
                  placeholder="+998 90 123 45 67" 
                  value={phone} 
                  onChange={handlePhoneChange} 
                />
              </div>
              
              <div className="bm-form-group">
                <label>Qo'shimcha izoh (ixtiyoriy)</label>
                <textarea rows="2" placeholder="Maxsus talablar yoki soatni kiriting..." />
              </div>
              
              <button type="submit" className="bm-submit-btn btn-shine">
                So'rovni yuborish
              </button>
            </form>
          )}

          {step === 2 && (
            <div className="bm-step-loading">
              <div className="bm-spinner"></div>
              <h3>So'rov yuborilmoqda...</h3>
              <p>Iltimos, biroz kuting.</p>
            </div>
          )}

          {step === 3 && (
            <div className="bm-step-success">
              <div className="bm-success-circle">
                <div className="bm-check-icon">
                  <CheckIcon />
                </div>
              </div>
              <h3>Tabriklaymiz!</h3>
              <p>Bron so'rovingiz muvaffaqiyatli qabul qilindi. Operatorlarimiz tez orada aloqaga chiqishadi.</p>
              <button type="button" className="bm-done-btn" onClick={handleClose}>
                Tushunarli
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
