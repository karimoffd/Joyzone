import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import "./HostListingDetailModal.css";

export function HostListingDetailModal({ item, onClose, onEdit }) {
  const overlayRef = useRef(null);
  const cardRef = useRef(null);
  const [activeImgIndex, setActiveImgIndex] = useState(0);

  useEffect(() => {
    if (!item) return;
    const overlay = overlayRef.current;
    const card = cardRef.current;
    if (overlay && card) {
      document.body.style.overflow = "hidden";
      gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power2.out" });
      gsap.fromTo(
        card,
        { scale: 0.9, y: 30, opacity: 0, filter: "blur(10px)" },
        { scale: 1, y: 0, opacity: 1, filter: "blur(0px)", duration: 0.42, ease: "back.out(1.18)", delay: 0.04 }
      );
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [item]);

  const handleClose = () => {
    const overlay = overlayRef.current;
    const card = cardRef.current;
    if (overlay && card) {
      gsap.to(card, { scale: 0.94, y: 15, opacity: 0, filter: "blur(6px)", duration: 0.22, ease: "power2.in" });
      gsap.to(overlay, {
        opacity: 0,
        duration: 0.24,
        ease: "power2.in",
        onComplete: () => {
          document.body.style.overflow = "";
          onClose();
        }
      });
    } else {
      onClose();
    }
  };

  if (!item) return null;

  const rawImages = item.images && item.images.length > 0 ? item.images : (item.image ? [item.image] : []);
  const images = rawImages.length > 0 ? rawImages : [
    "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80"
  ];

  return (
    <div className="host-detail-modal-overlay" ref={overlayRef} onClick={handleClose}>
      <div className="host-detail-modal-card" ref={cardRef} onClick={(e) => e.stopPropagation()}>
        
        {/* Header bar */}
        <div className="host-detail-modal-header">
          <div className="host-detail-title-group">
            <span className="host-detail-category">{item.category || "Joyzone Space"}</span>
            <h2>{item.title}</h2>
            <span className="host-detail-location">📍 {item.location || item.city || "Toshkent"}</span>
          </div>
          <button type="button" className="host-detail-close-btn" onClick={handleClose} aria-label="Yopish">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Media Gallery */}
        <div className="host-detail-gallery">
          <div className="host-detail-main-img-wrap">
            <img src={images[activeImgIndex]} alt={item.title} className="host-detail-main-img" />
            <span className={`host-detail-status-pill ${item.status === "approved" ? "is-live" : item.status === "rejected" ? "is-rejected" : "is-pending"}`}>
              {item.status === "approved" ? "🟢 Опубликовано" : item.status === "rejected" ? "🔴 Отклонено" : "🟡 На модерации"}
            </span>
          </div>

          {images.length > 1 && (
            <div className="host-detail-thumbs">
              {images.map((imgUrl, i) => (
                <button
                  key={i}
                  type="button"
                  className={`host-detail-thumb-btn ${i === activeImgIndex ? "is-active" : ""}`}
                  onClick={() => setActiveImgIndex(i)}
                >
                  <img src={imgUrl} alt={`Thumbnail ${i + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="host-detail-body">
          {/* Key Metrics grid */}
          <div className="host-detail-metrics-grid">
            <div className="host-metric-card">
              <small>Narxi</small>
              <strong>{item.price || "150,000 UZS"}</strong>
            </div>
            <div className="host-metric-card">
              <small>Sig'imi</small>
              <strong>{item.capacity || "10-20 kishi"}</strong>
            </div>
            <div className="host-metric-card">
              <small>Bandlik davri</small>
              <strong>{item.occupancy || "75%"}</strong>
            </div>
            <div className="host-metric-card">
              <small>Jami bandliklar</small>
              <strong>{item.bookings_count || 0} ta</strong>
            </div>
          </div>

          {/* Description */}
          <div className="host-detail-desc-block">
            <h3>Joy haqida ma'lumot</h3>
            <p>{item.description || "Ushbu joy zamonaviy mebellar, yuqori tezlikdagi Wi-Fi va barcha qulayliklar bilan jihozlangan premium makon."}</p>
          </div>

          {/* Amenities tags */}
          <div className="host-detail-amenities-block">
            <h3>Qulayliklar</h3>
            <div className="host-detail-tags">
              {(item.amenities || ["Wi-Fi", "Konditsioner", "Proyektor", "Kofe apparat", "Avtoturargoh"]).map((amenity, idx) => (
                <span key={idx} className="host-detail-tag">✨ {amenity}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="host-detail-modal-footer">
          {onEdit && (
            <button type="button" className="host-detail-act-btn edit" onClick={() => { handleClose(); onEdit(item); }}>
              ✏️ Tahrirlash
            </button>
          )}
          <button type="button" className="host-detail-act-btn close" onClick={handleClose}>
            Yopish
          </button>
        </div>

      </div>
    </div>
  );
}
