import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);
import { NoteIcon } from "./ui/Shared.jsx";
import { partnerAgents, propertyCards } from "../data/content.js";
import api, { getApiErrorMessage } from "../api/client.js";
import { toggleFavoritePlace, isPlaceFavorited } from "../utils/favoritesManager.js";
import { getPlacesFromApiResponse, normalizePlace, slugifyPlaceTitle } from "../utils/placeMapper.js";
import logoImage from "../assets/img/Logo.png";
import { cmsList, mailHref, phoneHref, socialLinks } from "../utils/cmsLinks.js";
import "./ListingsSection.css";
import "./CardVariants.css";

function getSpaceHref(place = {}) {
  if (String(place.href || "").startsWith("/space-")) return place.href;
  const routeKey = place.id ?? place._id ?? slugifyPlaceTitle(place.title || place.name || "joyzone");
  return `/space-${routeKey}`;
}

const AGENT_TONES = ["#294a6d", "#e46630", "#1f78d1", "#00a86b", "#7b3ff2", "#c4332c", "#68a7a1", "#f6c445"];
const AGENT_PHOTO_PLACEHOLDER = "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=200&q=80";

// Partners come from /api/partners/ (real partners with approved places).
// The bundled demo agents are shown only in local development.
function usePublicPartners() {
  const [partners, setPartners] = useState(() => (import.meta.env.DEV ? null : []));
  useEffect(() => {
    let cancelled = false;
    api.get("/api/partners/", { params: { limit: 12 }, skipAuth: true })
      .then((res) => { if (!cancelled) setPartners(Array.isArray(res.data) ? res.data : []); })
      .catch(() => { if (!cancelled) setPartners([]); });
    return () => { cancelled = true; };
  }, []);
  return useMemo(() => {
    const list = partners?.length ? partners : (import.meta.env.DEV ? partnerAgents.map((agent, index) => ({ ...agent, id: `demo-${index}` })) : []);
    return list.map((partner, index) => ({
      id: partner.id,
      name: partner.name,
      service: partner.bio ?? partner.service ?? "",
      city: partner.city || "",
      spaces: partner.places_count ?? partner.spaces ?? 0,
      rating: partner.rating_avg ?? partner.rating ?? 0,
      reviews: partner.reviews_count ?? partner.reviews ?? 0,
      image: partner.avatar || partner.cover_image || AGENT_PHOTO_PLACEHOLDER,
      tone: partner.tone || AGENT_TONES[index % AGENT_TONES.length],
      href: `/agent-${partner.id}`,
    }));
  }, [partners]);
}

const DURATION_LABELS = {
  soatlik: "/ soat",
  kunlik: "/ kun",
  haftalik: "/ hafta",
  oylik: "/ oy"
};

function HighlightedTitle({ text, highlight = "Joyzone" }) {
  const value = String(text || "");
  const index = value.toLowerCase().indexOf(highlight.toLowerCase());
  if (highlight && index >= 0) {
    return (
      <>
        {value.slice(0, index)}
        <span>{value.slice(index, index + highlight.length)}</span>
        {value.slice(index + highlight.length)}
      </>
    );
  }
  const [firstWord, ...rest] = value.split(/\s+/);
  return <><span>{firstWord}</span>{rest.length ? ` ${rest.join(" ")}` : ""}</>;
}

export function PropertyCard({ item, index, href, onClick, selectedDuration, viewMode = "grid" }) {
  const [activeImage, setActiveImage] = useState(0);
  const [saved, setSaved] = useState(isPlaceFavorited(item.id));
  const [favoritePending, setFavoritePending] = useState(false);
  const [favoriteError, setFavoriteError] = useState("");
  const cardHref = onClick ? "#" : (href || getSpaceHref(item));
  const mediaRef = useRef(null);
  const saveRef = useRef(null);
  const manualSlideAt = useRef(0);

  useEffect(() => {
    const handleUpdate = () => {
      setSaved(isPlaceFavorited(item.id));
    };
    window.addEventListener("joyzone-favorites-update", handleUpdate);
    return () => window.removeEventListener("joyzone-favorites-update", handleUpdate);
  }, [item.id]);

  // Resolve displayed price and label
  const { displayPrice, priceLabel, priceUnavailable } = (() => {
    if (!selectedDuration) {
      return { displayPrice: item.price, priceLabel: "/ kun", priceUnavailable: false };
    }
    const specificPrice = item.prices?.[selectedDuration];
    if (specificPrice) {
      return { displayPrice: specificPrice, priceLabel: DURATION_LABELS[selectedDuration], priceUnavailable: false };
    }
    // duration selected but this card doesn't have it
    return { displayPrice: item.price, priceLabel: "/ kun", priceUnavailable: true };
  })();

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (Date.now() - manualSlideAt.current < 5200) return;
      setActiveImage((current) => (current + 1) % item.images.length);
    }, 5600 + index * 260);
    return () => window.clearInterval(timer);
  }, [index, item.images.length]);

  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return undefined;
    const glow = media.querySelector(".property-slide-glow");
    gsap.fromTo(glow, { xPercent: -95, opacity: 0.34 }, { xPercent: 105, opacity: 0, duration: 1.35, ease: "sine.out" });
    return undefined;
  }, [activeImage]);

  const toggleSave = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (favoritePending) return;
    setFavoritePending(true);
    setFavoriteError("");
    gsap.fromTo(saveRef.current, { scale: 0.82 }, { scale: 1, duration: 0.46, ease: "elastic.out(1, 0.46)" });
    try {
      const favorites = await toggleFavoritePlace(item);
      setSaved(favorites.some((favorite) => String(favorite.id) === String(item.id)));
    } catch (error) {
      setFavoriteError(getApiErrorMessage(error, "Не удалось обновить избранное"));
      setSaved(isPlaceFavorited(item.id));
    } finally {
      setFavoritePending(false);
    }
  };

  return (
    <article data-testid={`place-card-${item.id}`} className={`variant-card variant-estate ${priceUnavailable ? "is-duration-unavailable" : ""} ${viewMode === "list" ? "is-list-view" : ""}`} style={{ "--delay": `${index * 0.055}s` }}>
      <a 
        className="property-card-link" 
        href={cardHref} 
        aria-label={`${item.title} sahifasini ochish`} 
        onClick={(e) => {
          if (onClick) {
            e.preventDefault();
            e.stopPropagation();
            onClick(item);
          }
        }}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 10 }} 
      />
      <button
        ref={saveRef}
        type="button"
        className={`variant-save-button ${saved ? "is-saved" : ""}`}
        onClick={toggleSave}
        aria-label={saved ? "Eslatmaga saqlandi" : "Eslatmaga saqlash"}
        aria-pressed={saved}
        aria-busy={favoritePending}
        disabled={favoritePending}
        style={{ zIndex: 20 }}
      >
        <NoteIcon filled={saved} />
      </button>
      {favoriteError ? <span className="variant-favorite-error" role="alert">{favoriteError}</span> : null}
      <div className="variant-media" ref={mediaRef} style={{ aspectRatio: 1.35 }}>
        {item.images.map((image, imageIndex) => (
          <img
            key={image}
            src={image}
            alt={item.title}
            loading={imageIndex === 0 ? "eager" : "lazy"}
            className={imageIndex === activeImage ? "is-active" : ""}
          />
        ))}
        <span className="property-slide-glow" />
        <span className="variant-pill">{item.promoted ? "Reklama" : "Guest favourite"}</span>
        <div className="variant-dots" aria-label="Rasmni tanlash" style={{ zIndex: 20 }}>
          {item.images.map((_, imageIndex) => (
            <button
              key={`${imageIndex}-dot`}
              type="button"
              className={imageIndex === activeImage ? "is-active" : ""}
              aria-label={`${imageIndex + 1}-rasm`}
              aria-pressed={imageIndex === activeImage}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                manualSlideAt.current = Date.now();
                setActiveImage(imageIndex);
              }}
            />
          ))}
        </div>
      </div>
      <div className="variant-body">
        <div className="variant-title-row">
          <h3>{item.title}</h3>
          <div className="variant-price-block">
            <strong className={priceUnavailable ? "is-muted" : ""}>{displayPrice}</strong>
            <span className="variant-price-label">{priceUnavailable ? "— bu muddat yo'q" : priceLabel}</span>
          </div>
        </div>
        <p>{item.location}</p>
        <div className="variant-spec-row">
          <span className="variant-spec">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" /></svg>
            {item.people} kishi
          </span>
          <span className="variant-spec">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V5a3 3 0 0 1 6 0v1M5 10h16v2a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5v-2ZM8 21h8" /></svg>
            2 xona
          </span>
          <span className="variant-spec">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v16H4zM8 8h8M8 12h5M8 16h8" /></svg>
            {item.area} m2
          </span>
        </div>
      </div>
    </article>
  );
}

function CatalogTrail({ label }) {
  const liftCards = () => {
    gsap.to(".property-card", {
      y: (index) => (index % 2 === 0 ? -10 : -6),
      scale: (index) => (index % 3 === 0 ? 1.018 : 1.01),
      duration: 0.52,
      stagger: { each: 0.025, from: "center" },
      ease: "power3.out"
    });
  };

  const settleCards = () => {
    gsap.to(".property-card", {
      y: 0,
      scale: 1,
      duration: 0.58,
      stagger: { each: 0.018, from: "center" },
      ease: "power3.out"
    });
  };

  return (
    <a className="catalog-trail" href="#spaces" onMouseEnter={liftCards} onFocus={liftCards} onMouseLeave={settleCards} onBlur={settleCards}>
      <span />
      <strong>{label || "Barcha joylarni ko'rish"}</strong>
      <b aria-hidden="true">→</b>
    </a>
  );
}

function PartnerAgents({ cms = {} }) {
  const agents = usePublicPartners();
  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(4);
  const sectionRef = useRef(null);
  const viewportRef = useRef(null);
  const timerRef = useRef(null);
  const maxStart = Math.max(0, agents.length - visible);

  useEffect(() => {
    const updateVisible = () => {
      const width = window.innerWidth;
      setVisible(width < 620 ? 1 : width < 980 ? 2 : 4);
    };
    updateVisible();
    window.addEventListener("resize", updateVisible);
    return () => window.removeEventListener("resize", updateVisible);
  }, []);

  useEffect(() => {
    timerRef.current = window.setInterval(() => {
      setActive((current) => (current >= maxStart ? 0 : current + 1));
    }, 4200);
    return () => window.clearInterval(timerRef.current);
  }, [maxStart]);

  useEffect(() => {
    setActive((current) => Math.min(current, maxStart));
  }, [maxStart]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return undefined;
    gsap.fromTo(
      section.querySelectorAll(".agent-card"),
      { y: 16, opacity: 0, scale: 0.96 },
      { y: 0, opacity: 1, scale: 1, duration: 0.56, stagger: 0.05, ease: "power3.out" }
    );
    return undefined;
  }, [agents.length]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;
    const track = viewport.querySelector(".agents-track");
    const firstCard = viewport.querySelector(".agent-card");
    if (!track || !firstCard) return undefined;
    const gap = Number.parseFloat(getComputedStyle(track).columnGap || "0");
    const target = active * (firstCard.getBoundingClientRect().width + gap);
    
    gsap.to(viewport, { scrollLeft: target, duration: 0.9, ease: "power4.inOut" });
    
    // Top-tier slider animation
    gsap.fromTo(
      viewport.querySelectorAll(".agent-card"),
      { scale: 0.92, y: 15, filter: "blur(6px)", rotationX: 4 },
      { scale: 1, y: 0, filter: "blur(0px)", rotationX: 0, duration: 0.8, stagger: 0.05, ease: "back.out(1.2)" }
    );
    return undefined;
  }, [active, visible]);

  const chooseAgent = (index) => {
    window.clearInterval(timerRef.current);
    if (index < 0) {
      setActive(maxStart);
      return;
    }
    if (index > maxStart) {
      setActive(0);
      return;
    }
    setActive(index);
  };

  if (!agents.length) return null;

  return (
    <section ref={sectionRef} className="agents-showcase" id="agents">
      <div className="agents-head">
        <h2>
          <HighlightedTitle text={cms.agent_title || "Joyzone hamkorlari"} />
        </h2>
        <svg className="agents-title-curve" width="160" height="14" viewBox="0 0 160 14" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 12C45 -3 115 -3 158 12" stroke="#E46630" strokeWidth="3" strokeLinecap="round"/>
        </svg>
        <p>{cms.agent_sub || "Katta brendlar va ishonchli hamkorlar o'z joylarini Joyzone orqali joylashtiradi."}</p>
      </div>
      <div ref={viewportRef} className="agents-viewport">
        <div className="agents-track">
          {agents.map((agent, index) => {
            return (
              <article
                key={agent.id}
                className={`agent-card ${index >= active && index < active + visible ? "is-visible" : ""}`}
                style={{ "--brand-tone": agent.tone }}
              >
                <div className="brand-card-top">
                  <div className="brand-logo-mark" aria-hidden="true">
                    <img src={agent.image} alt={agent.name} loading="lazy" />
                  </div>
                  <span className="brand-badge">{cms.agent_premium || "Premium hamkor"}</span>
                </div>
                <div className="agent-copy">
                  <h3>{agent.name}</h3>
                  <p>{agent.service}</p>
                </div>
                <div className="brand-trust">
                  <span>{agent.rating}</span>
                  <p>{agent.reviews} {cms.agent_reviews || "ta sharh"}</p>
                </div>
                <a className="agent-bottom-btn" href={agent.href} aria-label={`${agent.name} profilini ochish`}>
                  <span className="agent-btn-text">{cms.agent_profile || "Profil"}</span>
                  <strong className="agent-btn-count">{agent.spaces}</strong>
                </a>
              </article>
            );
          })}
        </div>
      </div>
      <div className="agent-controls" aria-label="Agentlar slayderi">
        <button type="button" className="agent-arrow" onClick={() => chooseAgent(active - 1 < 0 ? maxStart : active - 1)} aria-label="Oldingi agent">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <div className="agent-dots">
          {Array.from({ length: maxStart + 1 }).map((_, index) => (
            <button
              key={`agent-dot-${index}`}
              type="button"
              className={index === active ? "is-active" : ""}
              onClick={() => chooseAgent(index)}
              aria-label={`${index + 1}-agentlar guruhi`}
              aria-pressed={index === active}
            />
          ))}
        </div>
        <button type="button" className="agent-arrow" onClick={() => chooseAgent((active + 1) % agents.length)} aria-label="Keyingi agent">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        </button>
      </div>
    </section>
  );
}

function BenefitIcon({ type }) {
  const paths = {
    interface: ["M4 5h16v12H4z", "M8 21h8", "M12 17v4", "M8 9h4M8 12h8"],
    search: ["M11 19a8 8 0 1 1 5.7-2.4L21 21", "M7.5 10.5h7"],
    building: ["M5 21V8l7-4 7 4v13", "M9 21v-5h6v5", "M9 10h.01M12 10h.01M15 10h.01M9 13h.01M12 13h.01M15 13h.01", "M18 3v4M16 5h4"],
    shield: ["M12 3 20 6v6c0 5-3.4 8.1-8 9-4.6-.9-8-4-8-9V6z", "m9 12 2 2 4-5"],
    crown: ["M4 8l4 4 4-7 4 7 4-4v10H4z"],
    megaphone: ["M4 13h3l10-5v12L7 15H4z", "M7 15l2 6", "M20 10v8"]
  };

  return (
    <svg width="33" height="33" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[type].map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  );
}

export function BenefitsSection({ cms = {} }) {
  const benefitsRef = useRef(null);

  useEffect(() => {
    const section = benefitsRef.current;
    if (!section) return undefined;
    
    gsap.fromTo(
      section.querySelectorAll(".benefit-bento-card"),
      { y: 40, opacity: 0 },
      { 
        y: 0, 
        opacity: 1, 
        duration: 0.8, 
        stagger: 0.1, 
        ease: "power3.out",
        scrollTrigger: {
          trigger: section,
          start: "top 80%",
        }
      }
    );
    return undefined;
  }, []);

  return (
    <section ref={benefitsRef} className="benefits-section" id="about">
      <div className="benefits-head">
        <h2>
          <HighlightedTitle text={cms.about_title || "Joyzone qulayliklari"} />
        </h2>
        <i aria-hidden="true" />
        <p>{cms.about_text || "Har kim uchun oddiy va qulay platforma"}</p>
      </div>
      <div className="benefits-grid bento">
        {cmsList(cms, "benefits_arr").map((benefit, index) => (
          <article key={benefit.title} className={`benefit-bento-card card-index-${index}`}>
            <div className="benefit-bento-icon">
              <BenefitIcon type={benefit.icon} />
            </div>
            <div className="benefit-bento-text">
              <h3>{benefit.title}</h3>
              <p>{benefit.text}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function PartnerStartSection({ cms = {} }) {
  const sectionRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return undefined;

    const ctx = gsap.context(() => {
      const cards = section.querySelectorAll(".soul-step-card");
      
      gsap.fromTo(
        cards,
        { y: 30, opacity: 0 },
        { 
          y: 0, opacity: 1, 
          duration: 0.6, stagger: 0.1, 
          ease: "power3.out",
          scrollTrigger: {
            trigger: section,
            start: "top 75%",
          }
        }
      );
      
      gsap.to(section.querySelector(".soul-bg-glow-orange"), {
        rotate: 360,
        duration: 40,
        repeat: -1,
        ease: "linear"
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="soul-partner-section" id="partner">
      <div className="soul-bg-glow-orange"></div>
      <div className="soul-bg-glow-blue"></div>
      
      <div className="soul-partner-inner">
        <div className="soul-partner-head">
          <span className="soul-badge">{cms.how_title || "Bron qilish jarayoni"}</span>
          <h2>
            {(cms.partner_title || "Sizning joyingiz, bizning platforma").split(",")[0]}, <br />
            <span>{(cms.partner_title || "Sizning joyingiz, bizning platforma").split(",").slice(1).join(",").trim()}</span>
          </h2>
          <p>{cms.partner_subtitle || "Joyzone bilan bron qilish oddiy va qulay."}</p>
          
          <div className="soul-stats">
            <div className="soul-stat">
              <strong>{cms.how_stat1_value || "2 daqiqa"}</strong>
              <span>{cms.how_stat1_label || "Ro'yxatdan o'tish"}</span>
            </div>
            <div className="soul-stat">
              <strong>{cms.how_stat2_value || "1 so'rov"}</strong>
              <span>{cms.how_stat2_label || "Bron jarayoni"}</span>
            </div>
          </div>
          
          <a className="soul-cta" href="/filter">
            <span>{cms.partner_cta || "Hozir boshlash"}</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </a>
        </div>
        
        <div ref={containerRef} className="soul-steps-container">
          
          <div className="soul-step-card">
            <div className="soul-step-number">01</div>
            <div className="soul-step-content">
              <h3>{cms.how_step1_title || "Akkaunt yarating"}</h3>
              <p>{cms.how_step1 || "Akkaunt yarating va Joyzone profilini ishga tushiring."}</p>
            </div>
            <svg className="soul-step-arrow" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </div>
          
          <div className="soul-step-card">
            <div className="soul-step-number">02</div>
            <div className="soul-step-content">
              <h3>{cms.how_step2_title || "Sizga mos joyni tanlang"}</h3>
              <p>{cms.how_step2 || "Manzil, narx va qulayliklar bo'yicha mos joyni tanlang."}</p>
            </div>
            <svg className="soul-step-arrow" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </div>
          
          <div className="soul-step-card">
            <div className="soul-step-number">03</div>
            <div className="soul-step-content">
              <h3>{cms.how_step3_title || "Bron so'rovini yuboring"}</h3>
              <p>{cms.how_step3 || "Sana va vaqtni tanlab, bron so'rovini yuboring."}</p>
            </div>
            <svg className="soul-step-arrow" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </div>
        </div>
      </div>
    </section>
  );
}

const reviewHighlights = [
  {
    name: "Malika",
    text: "Vorkshop uchun zalni 7 daqiqada topdik. Joy, narx va sig'im bir qarashda tushunarli.",
    tone: "light"
  },
  {
    name: "Akmal",
    text: "Kartochkalar aniq: darhol narx, joylashuv va imkoniyatlarni ko'rasan.",
    tone: "dark"
  },
  {
    name: "Dilshod",
    text: "Partner sifatida joy qo'shdik va birinchi so'rovlar o'sha kuniyoq keldi.",
    tone: "light"
  },
  {
    name: "Sevara",
    text: "FAQ va bron oqimi oddiy, mijozlarga ortiqcha tushuntirish kerak bo'lmadi.",
    tone: "dark"
  },
  {
    name: "Jasur",
    text: "Bir nechta joyni solishtirib, uchrashuv uchun eng qulay variantni tez tanladik.",
    tone: "light"
  }
];

export function ReviewsFaqSection({ cms = {} }) {
  const [openIndex, setOpenIndex] = useState(0);
  const [firstReview, setFirstReview] = useState(0);
  const [isReviewSliding, setIsReviewSliding] = useState(false);
  const sectionRef = useRef(null);
  const reviewTimeoutRef = useRef(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        section.classList.add("is-visible");
        observer.disconnect();
      },
      { threshold: 0.28 }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  // Real 4-5 star reviews of approved places; demo quotes only in local dev.
  const [reviews, setReviews] = useState(() => (import.meta.env.DEV ? reviewHighlights : []));
  useEffect(() => {
    let cancelled = false;
    api.get("/api/reviews/", { params: { min_rating: 4, limit: 12 }, skipAuth: true })
      .then((res) => {
        if (cancelled) return;
        const rows = getPlacesFromApiResponse(res.data);
        if (rows.length || !import.meta.env.DEV) {
          setReviews(rows.map((review, index) => ({
            id: review.id,
            name: review.user_name,
            text: review.comment,
            rating: review.rating,
            tone: index % 2 ? "dark" : "light",
          })));
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (reviews.length < 2) return undefined;
    const timer = window.setInterval(() => {
      setIsReviewSliding(true);
      reviewTimeoutRef.current = window.setTimeout(() => {
        setFirstReview((current) => (current + 1) % reviews.length);
        setIsReviewSliding(false);
      }, 560);
    }, 3400);

    return () => {
      window.clearInterval(timer);
      if (reviewTimeoutRef.current) {
        window.clearTimeout(reviewTimeoutRef.current);
      }
    };
  }, [reviews.length]);

  const visibleReviews = Array.from({ length: Math.min(4, reviews.length) }, (_, position) => ({
    position,
    review: reviews[(firstReview + position) % reviews.length]
  }));

  return (
    <section ref={sectionRef} className="reviews-faq-section" id="faq">
      <div className="reviews-faq-inner">
        {visibleReviews.length ? <div className="reviews-panel" aria-label="Joyzone foydalanuvchi sharhlari">
          <div className="reviews-label">{cms.rev_title || "Sharhlar"}</div>
          <div className={`review-stage ${isReviewSliding ? "is-sliding" : ""}`}>
            {visibleReviews.map(({ review, position }) => (
              <article
                key={`${review.id ?? review.name}-${position}`}
                className={`review-bubble review-position-${position} ${review.tone === "dark" ? "is-dark" : ""}`}
              >
                <strong>{review.name}</strong>
                <p>{review.text}</p>
                <span aria-label={`${review.rating || 5} yulduzli baho`}>{"★".repeat(review.rating || 5)}</span>
              </article>
            ))}
          </div>
        </div> : null}

        <div className="faq-panel">
          <p className="section-kicker">{cms.faq_kicker || "FAQ"}</p>
          <h2>{cms.faq_title || "Qisqacha asosiylari"}</h2>
          <div className="faq-list">
            {cmsList(cms, "faq_arr").map((item, index) => {
              const isOpen = openIndex === index;
              return (
                <article key={item.question} className={`faq-item ${isOpen ? "is-open" : ""}`}>
                  <button type="button" onClick={() => setOpenIndex(isOpen ? -1 : index)} aria-expanded={isOpen}>
                    <span>{item.question}</span>
                    <b aria-hidden="true">{isOpen ? "-" : "+"}</b>
                  </button>
                  <div className="faq-answer">
                    <p>{item.answer}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function FooterIcon({ type }) {
  const paths = {
    phone: ["M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.7.6 2.5a2 2 0 0 1-.5 2.1L8 9.6a16 16 0 0 0 6.4 6.4l1.3-1.3a2 2 0 0 1 2.1-.5c.8.3 1.6.5 2.5.6a2 2 0 0 1 1.7 2.1Z"],
    mail: ["M4 6h16v12H4z", "m4 7 8 6 8-6"],
    chat: ["M21 12a8 8 0 0 1-8 8H7l-4 2 1.3-4.4A8 8 0 1 1 21 12Z", "M8 11h8M8 14h5"],
    arrow: ["M5 12h14", "m13 6 6 6-6 6"],
    instagram: ["M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4Z", "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z", "M17.5 6.5h.01"],
    facebook: ["M15 8h-2a2 2 0 0 0-2 2v2H9v3h2v6h3v-6h2.5l.5-3h-3v-1.4c0-.8.2-1.1 1-1.1h2V8Z"],
    telegram: ["M21 4 3 11.5l6.8 2.3L17 8.2l-4.7 7.1 5.2 4.7L21 4Z"],
    whatsapp: ["M20 11.8A8 8 0 0 1 8.2 18.9L4 20l1.1-4.1A8 8 0 1 1 20 11.8Z", "M9 8.8c.2 3 2.2 5.2 5.2 6 .7.2 1.6-.8 1.3-1.4l-1-1c-.3-.2-.7-.1-1 .1l-.4.3c-.9-.4-1.8-1.2-2.3-2.2l.3-.4c.3-.3.4-.7.1-1l-.9-1c-.5-.5-1.4-.1-1.3.6Z"]
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {(paths[type] || paths.chat).map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  );
}

export function SimpleFooter() {
  return (
    <footer style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "24px clamp(24px, 4vw, 48px)",
      background: "#ffffff",
      borderTop: "1px solid rgba(41, 74, 109, 0.08)",
      borderRadius: "28px 28px 0 0",
      marginTop: "auto"
    }}>
      <a href="/" style={{ display: "inline-flex", opacity: 0.9, transition: "opacity 0.2s" }} onMouseOver={(e) => e.currentTarget.style.opacity = "1"} onMouseOut={(e) => e.currentTarget.style.opacity = "0.9"}>
        <img src={logoImage} alt="Joyzone" style={{ height: "26px" }} />
      </a>
      <p style={{ margin: 0, fontSize: "14px", color: "#61707e", fontWeight: "700" }}>
        © {new Date().getFullYear()} Joyzone. Powered by IT Comfort.
      </p>
    </footer>
  );
}

export function FooterQuestionStrip({ cms = {} }) {
  return (
    <div className="footer-question-strip">
      <div>
        <span>{cms.help_kicker || "Joyzone yordam markazi"}</span>
        <h2>{cms.help_title || "Savolingiz bormi?"}</h2>
        <p>{cms.help_text || "Ofis, kovorking yoki zal tanlashda yordam beramiz."}</p>
      </div>
      <a href="#contact">
        {cms.help_cta || "Biz bilan bog'laning"}
        <FooterIcon type="arrow" />
      </a>
    </div>
  );
}

export function JoyFooter({ cms = {} }) {
  const socials = socialLinks(cms).map(([type, , href]) => [type, href]);

  return (
    <footer className="joy-footer-section" id="contact">
      <div className="hide-on-mobile">
        <FooterQuestionStrip cms={cms} />
      </div>
      <div className="joy-footer-card">
        <div className="joy-footer-top">
          <a href="/" className="joy-footer-logo" aria-label="Joyzone bosh sahifa">
            <img src={logoImage} alt="Joyzone" />
          </a>
          <a href={phoneHref(cms.footer_phone)} className="joy-footer-contact">
            <FooterIcon type="phone" />
            {cms.footer_phone || "+998 77 044 40 00"}
          </a>
          <a href={mailHref(cms.footer_email)} className="joy-footer-contact">
            <FooterIcon type="mail" />
            {cms.footer_email || "info@joyzone.uz"}
          </a>
          <a href="/partner" className="joy-footer-cta">{cms.footer_cta || "Ariza qoldirish"}</a>
        </div>

        <div className="joy-footer-grid hide-on-mobile">
          <div>
            <p>{cms.footer_about || "Bizning maqsadimiz qulay ish joylarini ijarachilarga yaqinlashtirish."}</p>
          </div>
          <nav aria-label="Ma'lumotlar">
            <strong>{cms.footer_nav1 || "Ma'lumotlar"}</strong>
            <a href="/about-us">{cms.footer_link_about || "Biz haqimizda"}</a>
            <a href="/filter">{cms.footer_link_dirs || "Yo'nalishlar"}</a>
            <a href="#contact">{cms.footer_link_contact || "Kontaktlar"}</a>
            <a href="#policy">{cms.footer_link_privacy || "Maxfiylik siyosati"}</a>
          </nav>
          <nav aria-label="Xizmatlar">
            <strong>{cms.footer_nav2 || "Xizmatlar"}</strong>
            <a href="/filter">{cms.footer_link_offices || "Ijaraga ofislar"}</a>
            <a href="/filter">{cms.footer_link_halls || "Konferensiyalar zali"}</a>
            <a href="/partner-guide">{cms.footer_link_partner || "Hamkor bo'lish"}</a>
          </nav>
          <div>
            <strong>{cms.footer_socials_title || "Ijtimoiy tarmoqlarimiz"}</strong>
            <div className="joy-footer-socials">
              {socials.map(([type, href]) => (
                <a key={type} href={href} aria-label={type}>
                  <FooterIcon type={type} />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="joy-footer-bottom">
          <span>{cms.footer_copyright || "©2026 JOY HUB. Barcha huquqlar himoyalangan."}</span>
          <span>{cms.footer_powered || "Powered by IT Comfort"}</span>
        </div>
      </div>

      {typeof document !== "undefined" && createPortal(
        <button 
          type="button" 
          className="joy-floating-contact" 
          aria-label="Joyzone bilan bog'lanish"
          onClick={(e) => {
            e.preventDefault();
            // Prevent scrolling to footer
          }}
        >
          <FooterIcon type="chat" />
          <span>{cms.help_float || "Yordam kerakmi?"}</span>
        </button>,
        document.body
      )}
    </footer>
  );
}

export default function ListingsSection({
  cms = {},
}) {
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [placesError, setPlacesError] = useState("");
  const [empty, setEmpty] = useState(false);
  const [usingDevFallback, setUsingDevFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPlacesError("");

    api.get("/api/places/", { skipAuth: true })
      .then((response) => {
        if (cancelled) return;
        const places = getPlacesFromApiResponse(response.data)
          .map(normalizePlace)
          .filter((place) => place.status === "approved");
        setSpaces(places);
        setEmpty(places.length === 0);
        setUsingDevFallback(false);
      })
      .catch((error) => {
        if (cancelled) return;
        setPlacesError(getApiErrorMessage(error, "Joyzone joylarini yuklab bo'lmadi."));
        if (import.meta.env.DEV) {
          // Never mutate the shared demo array; normalized copies are an offline development fallback only.
          const fallbackPlaces = propertyCards.map((place) => normalizePlace({ ...place, status: "approved" }));
          setSpaces(fallbackPlaces);
          setEmpty(fallbackPlaces.length === 0);
          setUsingDevFallback(true);
        } else {
          setSpaces([]);
          setEmpty(true);
          setUsingDevFallback(false);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      let mm = gsap.matchMedia();

      mm.add("(min-width: 768px)", () => {
        // Text wipe animations
        const texts = gsap.utils.toArray(
          ".listings-head h2, .listings-head p, " +
          ".agents-head h2, .agents-head p, " +
          ".benefits-head h2, .benefits-head p, " +
          ".soul-partner-head h2, .soul-partner-head p, " +
          ".benefit-bento-text h3, .benefit-bento-text p, " +
          ".faq-panel h2, .property-body h3, .property-body p, .agent-copy h3, .agent-copy p"
        );
        
        texts.forEach(text => {
          gsap.fromTo(text,
            { clipPath: "inset(0 100% 0 0)", opacity: 0 },
            {
              clipPath: "inset(0 0% 0 0)",
              opacity: 1,
              duration: 1.2,
              ease: "power3.inOut",
              scrollTrigger: {
                trigger: text,
                start: "top 92%",
                toggleActions: "play none none none"
              }
            }
          );
        });

        // Block fade-up animations
        const blocks = gsap.utils.toArray(".property-card, .benefit-bento-card, .faq-item, .soul-step-card");
        
        blocks.forEach(block => {
          gsap.fromTo(block,
            { opacity: 0, y: 50 },
            {
              opacity: 1,
              y: 0,
              duration: 0.8,
              ease: "power3.out",
              scrollTrigger: {
                trigger: block,
                start: "top 90%",
                toggleActions: "play none none none"
              }
            }
          );
        });
      });
    });
    return () => ctx.revert();
  }, [loading, spaces.length]);

  return (
    <section className="listings-section" id="home-listings">
      <div className="listings-inner">
        <div className="listings-head">
          <p>{cms.popular_kicker || "Joyzone tanlovi"}</p>
          <h2><HighlightedTitle text={cms.popular_title || "Ommabop joylar"} highlight="" /></h2>
          <p>{cms.popular_subtitle || "Eng ko'p izlangan va band qilingan joylar"}</p>
          {usingDevFallback ? <small style={{ color: "#dc2626", fontWeight: 800 }}>DEV fallback places</small> : null}
          {placesError && !usingDevFallback ? <small style={{ color: "#dc2626", fontWeight: 800 }}>{placesError}</small> : null}
        </div>
        <div className="property-grid">
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <article className="home-place-skeleton" key={`home-place-skeleton-${index}`} aria-hidden="true">
                <span className="home-place-skeleton-media" />
                <span className="home-place-skeleton-line is-title" />
                <span className="home-place-skeleton-line" />
                <span className="home-place-skeleton-line is-short" />
              </article>
            ))
          ) : spaces.length > 0 ? (
            spaces.map((item, index) => (
              <PropertyCard key={item.id || item.title || item.name} item={item} index={index} href={item.href} />
            ))
          ) : empty ? (
            <div style={{ gridColumn: "1 / -1", color: "#64748b", fontWeight: 700 }}>
              Hozircha joylar topilmadi.
            </div>
          ) : null}
        </div>
        <div className="more-row">
          <CatalogTrail label={cms.card_view_all} />
        </div>
        <PartnerAgents cms={cms} />
        <div className="hide-on-mobile">
          <BenefitsSection cms={cms} />
        </div>
        <PartnerStartSection cms={cms} />
        <div className="hide-on-mobile">
          <ReviewsFaqSection cms={cms} />
        </div>
        <JoyFooter cms={cms} />
      </div>
    </section>
  );
}
