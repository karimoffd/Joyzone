import React, { useEffect } from "react";
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

  useEffect(() => {
    // Initial entrance animations
    gsap.fromTo(
      ".bc-card",
      { y: 30, opacity: 0, scale: 0.98 },
      { y: 0, opacity: 1, scale: 1, duration: 0.7, ease: "power3.out" }
    );
    gsap.fromTo(
      ".bc-card > *",
      { y: 15, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, stagger: 0.1, delay: 0.2, ease: "power2.out" }
    );
  }, [space]);

  const handleConfirm = () => {
    // Animate button and card to indicate success
    gsap.to(".bc-card", {
      scale: 0.95,
      opacity: 0,
      y: -20,
      duration: 0.4,
      ease: "power2.inOut",
      onComplete: () => {
        // Set active booking in global state
        setUserState({
          ...userState,
          activeBooking: {
            spaceTitle: space.title,
            timestamp: Date.now()
          }
        });
        // Redirect to profile
        window.location.hash = "#profile";
      }
    });
  };

  return (
    <main className="booking-checkout-shell">
      <JoyNavbar userState={userState} setUserState={setUserState} activeIndex={-1} />

      <section className="bc-container">
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
              <span>Kunlik narx</span>
              <strong>{space.price}</strong>
            </div>
            <div className="bc-summary-row">
              <span>Mijoz</span>
              <strong>Tasdiqlangan foydalanuvchi</strong>
            </div>
            <div className="bc-summary-divider" />
            <div className="bc-summary-total">
              <span>To'lov (joyida qabul qilinadi)</span>
              <strong>{space.price}</strong>
            </div>
          </div>

          <button type="button" className="bc-confirm-btn btn-shine" onClick={handleConfirm}>
            Tasdiqlash
          </button>
        </div>
      </section>
    </main>
  );
}
