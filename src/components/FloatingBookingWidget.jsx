import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { PropertyCard } from "./ListingsSection.jsx";
import { propertyCards } from "../data/content.js";
import "./FloatingBookingWidget.css";

export default function FloatingBookingWidget({ activeBooking }) {
  const widgetRef = useRef(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (activeBooking && widgetRef.current) {
      gsap.fromTo(
        widgetRef.current,
        { y: 100, opacity: 0, scale: 0.9 },
        { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: "back.out(1.2)" }
      );
    }
  }, [activeBooking]);

  if (!activeBooking) return null;

  // Clean, cross-browser manual date format to prevent formatting letters like "M"
  const formattedDate = (() => {
    try {
      const d = new Date(activeBooking.timestamp || Date.now());
      const pad = (n) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch (e) {
      return "Hozir";
    }
  })();

  // Resolve defaults for missing fields (fallback for older local storage items)
  const totalVal = activeBooking.total || 250000; // default fallback price
  const formattedTotal = new Intl.NumberFormat('ru-RU').format(totalVal) + " UZS";
  const guestsCount = activeBooking.guests || 1;
  const startDateVal = activeBooking.startDate || new Date().toISOString().split("T")[0];
  const durationVal = activeBooking.duration || "1 kun";
  const methodVal = activeBooking.method || "card";

  const spaceItem = propertyCards.find(item => item.title === activeBooking.spaceTitle) || propertyCards[0];

  return (
    <div className={`floating-booking-widget ${showDetails ? 'expanded' : ''}`} ref={widgetRef}>
      <div className="fbw-glow"></div>
      
      {!showDetails ? (
        <div className="fbw-content" onClick={() => setShowDetails(true)} style={{ cursor: "pointer" }}>
          <div className="fbw-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div className="fbw-text">
            <strong>Aktiv bron: {activeBooking.spaceTitle}</strong>
            <span>Tafsilotlarni ko'rish...</span>
          </div>
          <button className="fbw-link-btn" type="button" aria-label="Batafsil">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="18 15 12 9 6 15" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="fbw-expanded-panel">
          <div className="fbw-expanded-header">
            <h3>So'rov tafsilotlari</h3>
            <button className="fbw-close-sub-btn" onClick={() => setShowDetails(false)}>✕</button>
          </div>

          {/* Render space details card */}
          <div className="fbw-card-container" style={{ marginBottom: "20px", borderRadius: "16px", overflow: "hidden" }}>
            <PropertyCard item={{
              ...spaceItem,
              price: formattedTotal
            }} index={0} />
          </div>

          <div className="fbw-details-list">
            <div className="fbw-details-item">
              <span>Yuborilgan vaqt:</span>
              <strong>{formattedDate}</strong>
            </div>
            <div className="fbw-details-item">
              <span>Sana:</span>
              <strong>{startDateVal}</strong>
            </div>
            <div className="fbw-details-item">
              <span>Ijara turi:</span>
              <strong>{durationVal === "soatlik" ? "Soatbay" : durationVal}</strong>
            </div>
            <div className="fbw-details-item">
              <span>Mehmonlar:</span>
              <strong>{guestsCount} kishi</strong>
            </div>
            <div className="fbw-details-item">
              <span>To'lov usuli:</span>
              <strong style={{ textTransform: "capitalize" }}>{methodVal === "card" ? "Karta" : methodVal}</strong>
            </div>
            <div className="fbw-details-item">
              <span>Holati:</span>
              <strong className="status-badge-pending">Kutishda (Pending)</strong>
            </div>
          </div>

          <div className="fbw-footer">
            <p>Sizning so'rovingiz qabul qilindi. Operator tasdiqlashini kuting.</p>
            <a href="#profile" className="fbw-profile-action-btn" onClick={() => setShowDetails(false)}>
              Mening profilimga o'tish
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
