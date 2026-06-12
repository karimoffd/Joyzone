import React, { useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";

import { Header as JoyNavbar } from "./HomeHero.jsx";
import { HeartIcon } from "./ui/Shared.jsx";
import { PropertyCard } from "./ListingsSection.jsx";
import { propertyCards } from "../data/content.js";
import "./ListingsSection.css";
import "./SpaceDetail.css";

const amenityList = [
  "Tez Wi-Fi",
  "Konditsioner",
  "Proyektor",
  "Avtoturargoh",
  "Coffee point",
  "Self check-in",
  "Toza zona",
  "24/7 yordam"
];

const reviewList = [
  {
    name: "Dilshod",
    role: "Startup asoschisi",
    date: "May 2026",
    rating: 5,
    text: "Joy toza, yorug' va jamoa bilan sprint o'tkazish uchun juda qulay bo'ldi. Bron qilish jarayoni ham tez."
  },
  {
    name: "Madina",
    role: "HR manager",
    date: "April 2026",
    rating: 5,
    text: "Trening uchun kerakli jihozlar tayyor edi. Mehmonlarni kutib olish va parkovka masalasi yaxshi hal qilingan."
  },
  {
    name: "Aziz",
    role: "Product lead",
    date: "March 2026",
    rating: 4,
    text: "Lokatsiya qulay, internet barqaror. Keyingi safar ham shu joyni bron qilishimiz mumkin."
  }
];

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function resolveSpace(route) {
  const value = (route || "").replace(/^space-/, "");
  const index = Number(value);

  if (Number.isInteger(index) && index >= 0 && index < propertyCards.length) {
    return propertyCards[index];
  }

  return propertyCards.find((item) => slugify(item.title) === value) || propertyCards[0];
}

function parsePrice(price) {
  return Number(price.replace(/\D/g, "")) || 0;
}

function formatMoney(value) {
  return `${new Intl.NumberFormat("uz-UZ").format(value)} so'm`;
}

function Icon({ type, className = "" }) {
  const paths = {
    arrow: "M19 12H5M12 5l-7 7 7 7",
    map: "M12 21s7-4.7 7-11a7 7 0 0 0-14 0c0 6.3 7 11 7 11ZM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
    users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8",
    area: "M4 4h16v16H4zM9 4v16M4 9h16",
    clock: "M12 8v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
    star: "m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 16.9 6.6 19.8l1-6.1-4.4-4.3 6.1-.9L12 3Z",
    check: "m20 6-11 11-5-5",
    calendar: "M7 3v4M17 3v4M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z",
    shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z",
    phone: "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"
  };

  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[type]} />
    </svg>
  );
}

function DetailStat({ icon, label, value }) {
  return (
    <div className="sd-stat">
      <span>
        <Icon type={icon} />
      </span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function Stars({ value = 5 }) {
  return (
    <span className="sd-stars" aria-label={`${value} reyting`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Icon key={index} type="star" className={index < value ? "is-filled" : "is-muted"} />
      ))}
    </span>
  );
}

export default function SpaceDetail({ route, userState, setUserState }) {
  const space = useMemo(() => resolveSpace(route), [route]);
  const [activeImage, setActiveImage] = useState(0);
  const [liked, setLiked] = useState(false);
  const likeBtnRef = useRef(null);

  const handleLikeToggle = () => {
    setLiked(!liked);
    gsap.fromTo(
      likeBtnRef.current,
      { scale: 0.8 },
      { scale: 1, duration: 0.5, ease: "elastic.out(1.2, 0.4)" }
    );
  };
  const [days, setDays] = useState(1);
  const [guests, setGuests] = useState(Math.min(space.people, 4));
  const basePrice = parsePrice(space.price);
  const serviceFee = Math.max(25000, Math.round(basePrice * 0.08));
  const total = basePrice * days + serviceFee;

  const [reviews, setReviews] = useState(reviewList);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newReviewName, setNewReviewName] = useState("");
  const [newReviewRole, setNewReviewRole] = useState("");
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [newReviewText, setNewReviewText] = useState("");
  const [helpfulCounts, setHelpfulCounts] = useState({});

  const handleHelpful = (name) => {
    setHelpfulCounts(prev => ({
      ...prev,
      [name]: (prev[name] || 0) + 1
    }));
  };

  const handleAddReview = (e) => {
    e.preventDefault();
    if (!newReviewName.trim() || !newReviewText.trim()) return;
    const newReview = {
      name: newReviewName,
      role: newReviewRole || "Mehmon",
      date: "Hozirgina",
      rating: newReviewRating,
      text: newReviewText
    };
    setReviews([newReview, ...reviews]);
    // reset form
    setNewReviewName("");
    setNewReviewRole("");
    setNewReviewRating(5);
    setNewReviewText("");
    setShowReviewForm(false);
  };

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return "5.0";
    const sum = reviews.reduce((acc, item) => acc + item.rating, 0);
    return (sum / reviews.length).toFixed(1);
  }, [reviews]);

  const similarSpaces = useMemo(() => {
    const sameCategory = propertyCards.filter((item) => item.title !== space.title && item.category === space.category);
    const fallback = propertyCards.filter((item) => item.title !== space.title);
    const merged = [...sameCategory, ...fallback.filter((item) => !sameCategory.includes(item))];
    return merged.slice(0, 3);
  }, [space]);

  useEffect(() => {
    setActiveImage(0);
    setGuests(Math.min(space.people, 4));
  }, [space]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero elements cascade
      gsap.fromTo(
        ".sd-hero-copy > *",
        { y: 24, opacity: 0, filter: "blur(6px)" },
        { y: 0, opacity: 1, filter: "blur(0px)", duration: 0.7, stagger: 0.08, ease: "power3.out" }
      );

      // Gallery fade-in slide
      gsap.fromTo(
        ".sd-gallery",
        { x: 30, opacity: 0, filter: "blur(8px)" },
        { x: 0, opacity: 1, filter: "blur(0px)", duration: 0.8, ease: "power3.out", delay: 0.1 }
      );

      // Stats stagger cards
      gsap.fromTo(
        ".sd-stat",
        { y: 25, opacity: 0, scale: 0.96 },
        { y: 0, opacity: 1, scale: 1, duration: 0.6, stagger: 0.07, ease: "back.out(1.15)", delay: 0.2 }
      );

      // Booking card float-up
      gsap.fromTo(
        ".sd-booking-card",
        { y: 40, opacity: 0, scale: 0.97 },
        { y: 0, opacity: 1, scale: 1, duration: 0.85, ease: "power3.out", delay: 0.25 }
      );

      // Amenities fade-in list
      gsap.fromTo(
        ".sd-amenities span",
        { y: 15, opacity: 0, scale: 0.96 },
        { y: 0, opacity: 1, scale: 1, duration: 0.5, stagger: 0.04, ease: "power2.out", delay: 0.3 }
      );

      // Reviews fade-in
      gsap.fromTo(
        ".sd-reviews-panel > *",
        { y: 25, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.75, stagger: 0.1, ease: "power2.out", delay: 0.35 }
      );

      // Similar spaces grid
      gsap.fromTo(
        ".sd-similar .property-card",
        { y: 35, opacity: 0, scale: 0.98 },
        { y: 0, opacity: 1, scale: 1, duration: 0.75, stagger: 0.08, ease: "power3.out", delay: 0.4 }
      );
    });
    return () => ctx.revert();
  }, [space]);

  return (
    <main className="space-detail-shell">
      <JoyNavbar userState={userState} setUserState={setUserState} activeIndex={1} />

      <section className="sd-hero">
        <div className="sd-hero-copy sd-animate">
          <a href="#filter" className="sd-back-link">
            <Icon type="arrow" />
            Barcha joylarga qaytish
          </a>
          <div className="sd-kicker">
            <span>{space.category}</span>
            {space.promoted ? <b>Top joy</b> : null}
          </div>
          <h1>{space.title}</h1>
          <p>
            {space.location} hududidagi tayyor maydon. Jamoaviy ish, uchrashuv, taqdimot va qisqa muddatli ijara uchun qulay.
          </p>
          <div className="sd-location">
            <Icon type="map" />
            {space.location}
          </div>
        </div>

        <div className="sd-gallery sd-animate">
          <div className="sd-main-photo">
            <img src={space.images[activeImage]} alt={space.title} />
            <button
              ref={likeBtnRef}
              type="button"
              className={`sd-like ${liked ? "is-liked" : ""}`}
              onClick={handleLikeToggle}
              aria-label={liked ? "Yoqtirildi" : "Yoqtirish"}
              aria-pressed={liked}
            >
              <HeartIcon filled={liked} />
            </button>
          </div>
          <div className="sd-thumbs" aria-label="Rasmlar">
            {space.images.map((image, index) => (
              <button
                type="button"
                key={image}
                className={index === activeImage ? "is-active" : ""}
                onClick={() => setActiveImage(index)}
                aria-label={`${index + 1}-rasm`}
                aria-pressed={index === activeImage}
              >
                <img src={image} alt="" />
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="sd-content">
        <div className="sd-main">
          <div className="sd-stat-grid sd-animate">
            <DetailStat icon="users" label="Sig'im" value={`${space.people} kishi`} />
            <DetailStat icon="area" label="Maydon" value={`${space.area} m2`} />
            <DetailStat icon="clock" label="Format" value="Soatlik / kunlik" />
            <DetailStat icon="shield" label="Status" value="Tekshirilgan" />
          </div>

          <section className="sd-section sd-animate">
            <div className="sd-section-head">
              <p>Joy haqida</p>
              <h2>Qulay, tayyor va tez bron qilinadi</h2>
            </div>
            <p className="sd-description">
              Bu maydon Joyzone orqali uchrashuv, seminar, ishchi sprint yoki qisqa muddatli ijara uchun tanlanadi. Narx, sig'im,
              rasm va asosiy shartlar bir joyda ko'rinadi, bron so'rovi esa mezbonga darhol yuboriladi.
            </p>
          </section>

          <section className="sd-section sd-animate">
            <div className="sd-section-head">
              <p>Qulayliklar</p>
              <h2>Kerakli servislar tayyor</h2>
            </div>
            <div className="sd-amenities">
              {amenityList.map((item) => (
                <span key={item}>
                  <Icon type="check" />
                  {item}
                </span>
              ))}
            </div>
          </section>

          <section className="sd-section sd-animate">
            <div className="sd-section-head sd-review-head">
              <div>
                <p>Sharhlar ({reviews.length})</p>
                <h2>Mehmonlar fikri</h2>
              </div>
              <button 
                type="button" 
                className={`sd-write-review-btn ${showReviewForm ? 'is-active' : ''}`}
                onClick={() => setShowReviewForm(!showReviewForm)}
              >
                {showReviewForm ? "Yopish" : "Fikr qoldirish"}
              </button>
            </div>

            {showReviewForm && (
              <form onSubmit={handleAddReview} className="sd-review-form sd-animate">
                <h3>O'z fikringizni yozib qoldiring</h3>
                <div className="sd-form-grid">
                  <label className="sd-form-label">
                    <span>Ismingiz *</span>
                    <input 
                      type="text" 
                      required 
                      placeholder="Masalan: Jamshid" 
                      value={newReviewName} 
                      onChange={(e) => setNewReviewName(e.target.value)} 
                    />
                  </label>
                  <label className="sd-form-label">
                    <span>Kasbingiz yoki Statusingiz</span>
                    <input 
                      type="text" 
                      placeholder="Masalan: Dizayner" 
                      value={newReviewRole} 
                      onChange={(e) => setNewReviewRole(e.target.value)} 
                    />
                  </label>
                </div>

                <div className="sd-rating-select-row">
                  <span>Baho bering:</span>
                  <div className="sd-rating-stars-input">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setNewReviewRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        aria-label={`${star} yulduz`}
                        className="sd-star-input-btn"
                      >
                        <svg 
                          viewBox="0 0 24 24" 
                          fill={(hoverRating || newReviewRating) >= star ? "#ffbd22" : "none"} 
                          stroke="#ffbd22" 
                          strokeWidth="2"
                          style={{ width: "26px", height: "26px", transition: "transform 0.15s ease, fill 0.15s ease" }}
                        >
                          <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 16.9 6.6 19.8l1-6.1-4.4-4.3 6.1-.9L12 3Z" />
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>

                <label className="sd-form-label">
                  <span>Fikringiz *</span>
                  <textarea 
                    required 
                    rows="4" 
                    placeholder="Joy sizga qanday yoqdi? Sharoitlar va aloqa sifati haqida yozing..." 
                    value={newReviewText} 
                    onChange={(e) => setNewReviewText(e.target.value)}
                  />
                </label>

                <button type="submit" className="sd-submit-review-btn">
                  Yuborish
                </button>
              </form>
            )}

            <div className="sd-reviews-panel">
              <aside className="sd-review-score">
                <div className="sd-score-big-circle">
                  <span>{averageRating}</span>
                  <small>5.0 dan</small>
                </div>
                <div className="sd-score-meta">
                  <Stars value={Math.round(Number(averageRating))} />
                  <strong>96% mehmon tavsiya qiladi</strong>
                  <p>Tozalik, lokatsiya, aloqa va jihozlar bo'yicha eng yuqori baholangan joylardan biri.</p>
                </div>
                <div className="sd-score-bars" aria-label="Reyting taqsimoti">
                  {[
                    ["Tozalik", "98%"],
                    ["Aloqa", "94%"],
                    ["Lokatsiya", "90%"]
                  ].map(([label, value]) => (
                    <div key={label} className="sd-score-bar-row">
                      <span>{label}</span>
                      <div className="sd-progress-track">
                        <b style={{ "--score": value }} />
                      </div>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
              </aside>

              <div className="sd-reviews-list-container">
                <div className="sd-reviews">
                  {reviews.length === 0 ? (
                    <div className="sd-no-reviews">
                      <p>Hozircha sharhlar yo'q.</p>
                    </div>
                  ) : (
                    reviews.map((review, i) => {
                      const avatarGrad = [
                        "linear-gradient(135deg, #ff6b6b, #ff8e53)",
                        "linear-gradient(135deg, #4e54c8, #8f94fb)",
                        "linear-gradient(135deg, #11998e, #38ef7d)",
                        "linear-gradient(135deg, #fc00ff, #00dbde)",
                        "linear-gradient(135deg, #f12711, #f5af19)"
                      ][i % 5];
                      
                      return (
                        <article key={review.name + i} className="sd-review-card">
                          <div className="sd-review-header-row">
                            <div className="sd-review-user-info">
                              <div className="sd-review-avatar" style={{ background: avatarGrad }}>
                                {review.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <strong>{review.name}</strong>
                                <span>{review.role} • {review.date}</span>
                              </div>
                            </div>
                            <div className="sd-review-rating-badge">
                              <svg viewBox="0 0 24 24" fill="#ffbd22" style={{ width: "14px", height: "14px", marginRight: "4px" }}>
                                <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 16.9 6.6 19.8l1-6.1-4.4-4.3 6.1-.9L12 3Z" />
                              </svg>
                              <span>{review.rating.toFixed(1)}</span>
                            </div>
                          </div>

                          <div className="sd-review-body">
                            <p>{review.text}</p>
                          </div>

                          <div className="sd-review-footer">
                            <span className="sd-verified-tag">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: "12px", height: "12px", marginRight: "4px", color: "#38ef7d" }}>
                                <path d="m20 6-11 11-5-5" />
                              </svg>
                              Tasdiqlangan bron
                            </span>

                            <button 
                              type="button" 
                              className="sd-helpful-btn"
                              onClick={() => handleHelpful(review.name + i)}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: "14px", height: "14px" }}>
                                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                              </svg>
                              <span>Foydali ({helpfulCounts[review.name + i] || 0})</span>
                            </button>
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>

        <aside className="sd-booking sd-animate">
          <div className="sd-booking-card">
            <div className="sd-price-row">
              <div>
                <span>Narx</span>
                <strong>{space.price}</strong>
              </div>
              <span className="sd-rating">
                <Icon type="star" />
                4.9
              </span>
            </div>

            <label>
              <span>Sana</span>
              <input type="date" defaultValue="2026-06-12" />
            </label>

            <div className="sd-booking-controls">
              <label>
                <span>Kun</span>
                <input min="1" max="30" type="number" value={days} onChange={(event) => setDays(Math.max(1, Number(event.target.value) || 1))} />
              </label>
              <label>
                <span>Mehmon</span>
                <input min="1" max={space.people} type="number" value={guests} onChange={(event) => setGuests(Math.max(1, Math.min(space.people, Number(event.target.value) || 1)))} />
              </label>
            </div>

            <div className="sd-total-box">
              <p>
                <span>{space.price} x {days} kun</span>
                <b>{formatMoney(basePrice * days)}</b>
              </p>
              <p>
                <span>Servis to'lovi</span>
                <b>{formatMoney(serviceFee)}</b>
              </p>
              <strong>
                <span>Jami</span>
                <b>{formatMoney(total)}</b>
              </strong>
            </div>

            <button type="button" className="sd-primary-btn">
              <Icon type="calendar" />
              Bron qilish
            </button>
            <a href="tel:+998901234567" className="sd-secondary-btn">
              <Icon type="phone" />
              Qo'ng'iroq qilish
            </a>
          </div>
        </aside>
      </section>

      <section className="sd-similar sd-animate">
        <div className="sd-section-head">
          <p>Yana ko'ring</p>
          <h2>O'xshash joylar</h2>
        </div>
        <div className="property-grid">
          {similarSpaces.map((item, index) => (
            <PropertyCard key={item.title} item={item} index={index} />
          ))}
        </div>
      </section>
    </main>
  );
}
