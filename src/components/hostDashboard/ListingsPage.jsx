import React, { useState } from "react";
import { PropertyCard } from "../ListingsSection.jsx";
import { HostListingDetailModal } from "../HostListingDetailModal.jsx";
import { removeStorageItem, STORAGE_KEYS } from "../../utils/storageKeys.js";

export function ListingsPage({ listings = [], onEdit, onDelete }) {
  const [selectedListing, setSelectedListing] = useState(null);

  return (
    <section className="host-main-surface">
      <div className="host-section-head">
        <div>
          <span>Объявления</span>
          <h2>Мои места</h2>
        </div>
        <a href="/partner" onClick={() => removeStorageItem(STORAGE_KEYS.workflow.editPlaceId)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Добавить место
        </a>
      </div>

      <div className="host-listings-grid">
        {listings.length === 0 ? (
          <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "60px 20px", color: "#64748b", background: "#f8fafc", borderRadius: 20, border: "1.5px dashed #e2e8f0" }}>
            <h3 style={{ margin: "0 0 8px 0", color: "#111820", fontSize: 18 }}>У вас пока нет объявлений</h3>
            <p style={{ margin: "0 0 20px 0", fontSize: 14 }}>Добавьте ваше первое пространство, чтобы начать принимать бронирования.</p>
            <a href="/partner" className="host-alert-btn confirm" style={{ display: "inline-block", textDecoration: "none", width: "auto", background: "var(--orange)", color: "#fff", padding: "10px 24px", borderRadius: 12, fontWeight: 700 }} onClick={() => removeStorageItem(STORAGE_KEYS.workflow.editPlaceId)}>Добавить место</a>
          </div>
        ) : (
          listings.map((item, index) => (
            <article className="host-listing-shell" key={item.id || item.title}>
              <PropertyCard
                item={{
                  ...item,
                  price: item.price || "0 UZS"
                }}
                index={index}
                onClick={() => setSelectedListing(item)}
              />
              <div className="host-listing-meta">
                <span className={item.status === "approved" ? "is-live" : ""}>
                  {item.status === "approved" ? "Опубликовано" : item.status === "rejected" ? "Отклонено" : "Модерация"}
                </span>
                {item.status === "rejected" && item.moderator_note ? (
                  <div className="host-listing-moderation-note">
                    <strong>Причина отклонения</strong>
                    <p>{item.moderator_note}</p>
                  </div>
                ) : null}
                <div className="host-card-actions">
                  <button onClick={() => onEdit(item)} className="host-card-act-btn edit" title="Редактировать">✏️</button>
                  <button onClick={() => onDelete(item)} className="host-card-act-btn delete" title="Удалить">🗑️</button>
                </div>
                <strong>{item.bookings_count || 0} броней</strong>
                <small>Заполненность {item.occupancy || "0%"}</small>
              </div>
            </article>
          ))
        )}
      </div>

      {selectedListing && (
        <HostListingDetailModal
          item={selectedListing}
          onClose={() => setSelectedListing(null)}
          onEdit={onEdit}
        />
      )}
    </section>
  );
}
