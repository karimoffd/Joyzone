import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import "./FloatingBookingWidget.css";

export default function FloatingBookingWidget({ activeBooking }) {
  const widgetRef = useRef(null);

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

  return (
    <div className="floating-booking-widget" ref={widgetRef}>
      <div className="fbw-glow"></div>
      <div className="fbw-content">
        <div className="fbw-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <div className="fbw-text">
          <strong>Aktiv bron: {activeBooking.spaceTitle}</strong>
          <span>So'rov ko'rib chiqilmoqda...</span>
        </div>
        <a href="#profile" className="fbw-link" aria-label="Profilga o'tish">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </a>
      </div>
    </div>
  );
}
