import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { gsap } from "gsap";
import { revealText } from "../utils/textReveal.js";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);
import { NoteIcon } from "./ui/Shared.jsx";
import { partnerAgents, propertyCards } from "../data/content.js";
import api, { getApiErrorMessage } from "../api/client.js";
import { toggleFavoritePlace, isPlaceFavorited } from "../utils/favoritesManager.js";
import { getPlacesFromApiResponse, normalizePlace, slugifyPlaceTitle } from "../utils/placeMapper.js";
import logoImage from "../assets/img/Logo.png";
import { mailHref, phoneHref, socialLinks } from "../utils/cmsLinks.js";
import "./ListingsSection.css";
import "./footer.css";
import SupportIcon from "./ui/SupportIcon.jsx";
import "./CardVariants.css";
import { useSiteContent } from "../context/LanguageContext.jsx";
import { HowItWorksSection } from "./home/HowItWorks.jsx";
import { ReviewsFaqSection } from "./home/ReviewsFaq.jsx";
import { BenefitsSection } from "./home/Benefits.jsx";
import "./home/ownerStrip.css";
import { ADD_PLACE_PATH, BECOME_PARTNER_PATH, PARTNER_CTA_TEXT, partnerEntryHref, useAccountRole } from "../utils/partnerAccess.js";

export { BenefitsSection, ReviewsFaqSection };

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
    api.get("/api/partners/", { params: { home: 1 }, skipAuth: true })
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
      spaces: partner.places_count ?? partner.spaces ?? 0,
      rating: partner.rating_avg ?? partner.rating ?? 0,
      reviews: partner.reviews_count ?? partner.reviews ?? 0,
      avatar: partner.avatar || "",
      cover: partner.cover_image || partner.avatar || AGENT_PHOTO_PLACEHOLDER,
      tone: partner.tone || AGENT_TONES[index % AGENT_TONES.length],
      href: `/agent-${partner.id}`,
      tariff: partner.tariff || null,
      isAd: Boolean(partner.is_ad),
    }));
  }, [partners]);
}

const DURATION_LABELS = {
  soatlik: "soatlik",
  kunlik: "kunlik",
  haftalik: "haftalik",
  oylik: "oylik"
};

// Same priority as getPrimaryPlacePriceValue: the card's default price is the
// daily one, then hourly, weekly, monthly — the label must name that period.
const PRIMARY_PRICE_ORDER = [
  ["kunlik", "price_daily"],
  ["soatlik", "price_hourly"],
  ["haftalik", "price_weekly"],
  ["oylik", "price_monthly"],
];

function primaryPriceLabel(item) {
  const found = PRIMARY_PRICE_ORDER.find(([key, field]) => Number(item[field] ?? item.prices?.[key]) > 0);
  return DURATION_LABELS[found ? found[0] : "kunlik"];
}

// Real room / seat count from the place characteristics; nothing when unknown.
function placeUnitsLabel(item) {
  const traits = item.characteristics || {};
  const rooms = Number(traits.rooms || traits.meeting_rooms);
  if (rooms > 0) return `${rooms} xona`;
  const seats = Number(traits.workplaces || traits.desks);
  if (seats > 0) return `${seats} o'rin`;
  return "";
}

// Falls back to a neutral user icon when the logo URL is missing or broken.
function AgentLogo({ src, name }) {
  const [failed, setFailed] = useState(!src);
  if (failed) {
    return (
      <span className="brand-logo-fallback">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="8.2" r="4.2" />
          <path d="M3.8 20.4c.9-4 4.2-6.4 8.2-6.4s7.3 2.4 8.2 6.4a1 1 0 0 1-1 1.2H4.8a1 1 0 0 1-1-1.2Z" />
        </svg>
      </span>
    );
  }
  return <img src={src} alt={name} loading="lazy" onError={() => setFailed(true)} />;
}

// The verified tick stays glued to the last word so it never wraps alone.
function agentNameHead(name) {
  const words = String(name || "").trim().split(/\s+/);
  return words.length > 1 ? `${words.slice(0, -1).join(" ")} ` : "";
}

function agentNameTail(name) {
  return String(name || "").trim().split(/\s+/).pop();
}

// Badge reflects the agent's active paid tariff; free-plan agents get none.
function agentBadge(tariff, cms) {
  if (!tariff) return "";
  if (tariff.slug === "premium") return cms.agent_badge_premium || "Premium agent";
  if (tariff.slug === "comfort") return cms.agent_badge_comfort || "Comfort agent";
  return `${tariff.name} agent`;
}

// Small orange underline for section headings (positioned by .title-curve).
function TitleCurve() {
  return (
    <svg className="title-curve" width="80" height="10" viewBox="0 0 80 10" fill="none" aria-hidden="true">
      <path d="M2 8C22 1 58 1 78 8" stroke="#E46630" strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

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
    if (item.isForSale) {
      return { displayPrice: item.price, priceLabel: "sotuv narxi", priceUnavailable: false };
    }
    if (!selectedDuration) {
      return { displayPrice: item.price, priceLabel: primaryPriceLabel(item), priceUnavailable: false };
    }
    const specificPrice = item.prices?.[selectedDuration];
    if (specificPrice) {
      return { displayPrice: specificPrice, priceLabel: DURATION_LABELS[selectedDuration], priceUnavailable: false };
    }
    // duration selected but this card doesn't have it
    return { displayPrice: item.price, priceLabel: primaryPriceLabel(item), priceUnavailable: true };
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
        {(item.is_ad ?? item.promoted) ? <span className="variant-pill is-ad">Reklama</span> : null}
        {item.isForSale ? (
          <span className={`variant-pill is-sale ${(item.is_ad ?? item.promoted) ? "is-stacked" : ""}`}>Sotuvda</span>
        ) : null}
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
          {placeUnitsLabel(item) ? (
            <span className="variant-spec">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V5a3 3 0 0 1 6 0v1M5 10h16v2a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5v-2ZM8 21h8" /></svg>
              {placeUnitsLabel(item)}
            </span>
          ) : null}
          <span className="variant-spec">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v16H4zM8 8h8M8 12h5M8 16h8" /></svg>
            {item.area} m2
          </span>
        </div>
      </div>
    </article>
  );
}

function CatalogTrail({ label, total = 0 }) {
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
    <a className="catalog-trail" href="/filter" onMouseEnter={liftCards} onFocus={liftCards} onMouseLeave={settleCards} onBlur={settleCards}>
      <span />
      <strong>{label || "Barcha joylarni ko'rish"}</strong>
      <b aria-hidden="true" data-count={total > 0 ? `${total}+ ta joy` : "→"}>→</b>
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
  const [paused, setPaused] = useState(false);
  const previousActiveRef = useRef(0);
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

  // Autoplay; stops while the pointer (or keyboard focus) is on the slider.
  // Restarting on every slide change gives a full pause after a manual pick.
  useEffect(() => {
    if (paused || maxStart === 0) return undefined;
    timerRef.current = window.setInterval(() => {
      setActive((current) => (current >= maxStart ? 0 : current + 1));
    }, 4200);
    return () => window.clearInterval(timerRef.current);
  }, [maxStart, paused, active]);

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
    
    const previous = previousActiveRef.current;
    previousActiveRef.current = active;
    gsap.to(viewport, { scrollLeft: target, duration: 0.85, ease: "power3.inOut", overwrite: true });
    if (previous === active) return undefined;

    // Cards that come into view rise in one after another, from the side the
    // slider moves towards (no blur: crisp text and photos all the time).
    const forward = active > previous;
    const cards = [...viewport.querySelectorAll(".agent-card")]
      .slice(active, active + visible)
      .filter((_, offset) => {
        const index = active + offset;
        return index < previous || index >= previous + visible;
      });
    const entering = forward ? cards : cards.reverse();
    if (!entering.length || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    gsap.fromTo(
      entering,
      { opacity: 0.35, x: forward ? 46 : -46, y: 10, scale: 0.97 },
      { opacity: 1, x: 0, y: 0, scale: 1, duration: 0.85, delay: 0.12, stagger: 0.08, ease: "expo.out", overwrite: true, clearProps: "transform,opacity" }
    );
    // The photo inside settles from a slight zoom for a bit of depth.
    gsap.fromTo(
      entering.map((card) => card.querySelector(".agent-cover img")).filter(Boolean),
      { scale: 1.08 },
      { scale: 1, duration: 1.1, delay: 0.12, stagger: 0.08, ease: "power3.out", clearProps: "transform" }
    );
    return undefined;
  }, [active, visible]);

  const chooseAgent = (index) => {
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
    <section
      ref={sectionRef}
      className="agents-showcase"
      id="agents"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}
    >
      <div className="agents-head">
        <h2>
          <HighlightedTitle text={cms.agent_title || "Top agentlar"} highlight="Top" />
          <TitleCurve />
        </h2>
        <p>{cms.agent_sub || "Joyzone'dagi eng faol va ishonchli joy egalari."}</p>
      </div>
      <div ref={viewportRef} className="agents-viewport">
        <div className="agents-track">
          {agents.map((agent, index) => {
            return (
              <article
                key={agent.id}
                className={`agent-card ${index >= active && index < active + visible ? "is-visible" : ""} ${agent.tariff ? `has-tariff is-${agent.tariff.slug}` : ""}`}
                style={{ "--brand-tone": agent.tone }}
              >
                <a className="agent-cover" href={agent.href} tabIndex={-1} aria-hidden="true">
                  <img src={agent.cover} alt="" loading="lazy" />
                  {agent.isAd ? <span className="agent-ad-pill">Reklama</span> : null}
                </a>
                <div className="agent-body">
                  <div className="brand-logo-wrap">
                    <div className="brand-logo-mark" aria-hidden="true">
                      <AgentLogo src={agent.avatar} name={agent.name} />
                    </div>
                    {agent.tariff ? (
                      <span className="brand-logo-crown" title={agentBadge(agent.tariff, cms)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 7.5 7.6 11 12 4.5 16.4 11 21 7.5 19.2 18H4.8Z" /><rect x="4.8" y="19.2" width="14.4" height="2.3" rx="1" /></svg>
                      </span>
                    ) : null}
                  </div>
                  <h3 className="agent-name">
                    {agentNameHead(agent.name)}
                    <span className="agent-name-tail">
                      {agentNameTail(agent.name)}
                      <svg className="agent-verified" width="18" height="18" viewBox="0 0 24 24" role="img" aria-label="Tekshirilgan"><path fill="currentColor" d="M12 2 14.6 4.1 18 3.8 18.9 7.1 21.8 9 20.6 12.2 21.8 15.4 18.9 17.3 18 20.6 14.6 20.3 12 22.4 9.4 20.3 6 20.6 5.1 17.3 2.2 15.4 3.4 12.2 2.2 9 5.1 7.1 6 3.8 9.4 4.1Z"/><path d="m8.2 12.3 2.5 2.5 5.1-5.2" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </span>
                  </h3>
                  <p className="agent-bio">{agent.service || "Joyzone'dagi ishonchli joy egasi."}</p>
                  <dl className="agent-stats">
                    <div>
                      <dt>Reyting</dt>
                      <dd className="is-rating">{agent.reviews > 0 ? Number(agent.rating).toFixed(1) : "Yangi"}</dd>
                    </div>
                    <div>
                      <dt>Sharhlar</dt>
                      <dd>{agent.reviews}</dd>
                    </div>
                    <div>
                      <dt>E'lonlar</dt>
                      <dd>{agent.spaces}</dd>
                    </div>
                  </dl>
                  <a className="agent-bottom-btn" href={agent.href} aria-label={`${agent.name} profilini ochish`}>
                    <span>{cms.agent_profile || "Profil"}</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>
                  </a>
                </div>
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


// One family of 24px line icons (same stroke, same optical size), so the
// phone, mail and social glyphs line up.
function FooterIcon({ type }) {
  const paths = {
    phone: ["M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.7.6 2.5a2 2 0 0 1-.5 2.1L8 9.6a16 16 0 0 0 6.4 6.4l1.3-1.3a2 2 0 0 1 2.1-.5c.8.3 1.6.5 2.5.6a2 2 0 0 1 1.7 2.1Z"],
    mail: ["M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z", "m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"],
    chat: ["M12 3.2c5 0 9 3.6 9 8s-4 8-9 8c-1.1 0-2.1-.2-3.1-.5L4.4 20.8l1.3-3.9C4 15.4 3 13.4 3 11.2c0-4.4 4-8 9-8Z", "M7.4 11.2a.6.6 0 1 0 1.2 0 .6.6 0 1 0-1.2 0", "M11.4 11.2a.6.6 0 1 0 1.2 0 .6.6 0 1 0-1.2 0", "M15.4 11.2a.6.6 0 1 0 1.2 0 .6.6 0 1 0-1.2 0"],
    arrow: ["M5 12h14", "m13 6 6 6-6 6"],
    arrowUpRight: ["M7 17 17 7", "M8 7h9v9"],
    instagram: ["M7 2.5h10A4.5 4.5 0 0 1 21.5 7v10a4.5 4.5 0 0 1-4.5 4.5H7A4.5 4.5 0 0 1 2.5 17V7A4.5 4.5 0 0 1 7 2.5Z", "M16 11.4a4 4 0 1 1-7.9 1.2 4 4 0 0 1 7.9-1.2Z", "M17.5 6.5h.01"],
    facebook: ["M18 2.5h-3a5 5 0 0 0-5 5v3H7v4h3v7h4v-7h3l1-4h-4v-3a1 1 0 0 1 1-1h3Z"],
    telegram: ["M21.2 3.6 2.8 10.8c-1 .4-1 1.8 0 2.1l4.5 1.4 1.7 5.3c.3.9 1.4 1.1 2 .5l2.5-2.4 4.7 3.5c.8.6 1.9.1 2.1-.8l2.9-13.9c.2-1-.8-1.8-1.9-1.4Z", "m7.3 14.3 9.6-6.6-6 7.6"],
    linkedin: ["M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6Z", "M2 9h4v12H2Z", "M4 2.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z"],
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

const SOCIAL_NAMES = { telegram: "Telegram", instagram: "Instagram", facebook: "Facebook", linkedin: "LinkedIn" };
const isExternalHref = (href) => /^(https?:)?\/\//i.test(String(href || ""));

// Footer link columns come from the CMS ("links" fields). The "become a
// partner" link turns into "add a place" for partners and staff.
function footerLinks(list, { canListPlaces, addLabel }) {
  return (Array.isArray(list) ? list : [])
    .filter((item) => item && item.label && item.href)
    .map((item) => {
      const isPartnerLink = /^\/partner-guide#become$/.test(item.href) || item.href === "/partner";
      if (isPartnerLink && canListPlaces) return { label: addLabel, href: ADD_PLACE_PATH };
      if (isPartnerLink) return { ...item, href: BECOME_PARTNER_PATH };
      return item;
    });
}

function FooterLink({ item }) {
  const external = isExternalHref(item.href);
  return (
    <a href={item.href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
      <span>{item.label}</span>
      {external ? <FooterIcon type="arrowUpRight" /> : null}
    </a>
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

// Above the footer on every page: an invitation for space owners. The free
// Standard plan (one listing) is a real offer, so it leads.
export function FooterQuestionStrip({ cms: cmsProp }) {
  const cms = useFooterCms(cmsProp);
  const { role } = useAccountRole();
  const points = [
    cms.owner_point1 || "Standard tarifda 1 ta e'lon bepul",
    cms.owner_point2 || "Rasm, narx va ish vaqti — 10 daqiqada tayyor",
    cms.owner_point3 || "Bron so'rovlari va chat bitta kabinetda",
  ];
  return (
    <div className="owner-strip">
      <div className="owner-strip-copy">
        <h2>{cms.owner_title || "Bo'sh joyingiz bormi?"}</h2>
        <p>{cms.owner_text || "Ofis, kovorking yoki zalingizni Joyzone'da joylashtiring va mijozlardan bron so'rovlarini qabul qiling."}</p>
      </div>
      <ul className="owner-strip-points">
        {points.map((point) => (
          <li key={point}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
            {point}
          </li>
        ))}
      </ul>
      <div className="owner-strip-actions">
        <a className="owner-strip-btn" href={partnerEntryHref(role)}>
          <span>{cms.owner_cta || "Joy qo'shish"}</span>
          <span className="owner-strip-btn-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>
          </span>
        </a>
        <a className="owner-strip-link" href="/partner-guide#tariffs">{cms.owner_cta2 || "Tariflarni ko'rish"}</a>
      </div>
    </div>
  );
}

// Pages that render the footer without passing texts still get the CMS values
// (phone / email links were empty on the catalog and place pages).
function useFooterCms(cmsProp) {
  const { cms: siteCms } = useSiteContent();
  return cmsProp && Object.keys(cmsProp).length ? cmsProp : siteCms;
}

export function JoyFooter({ cms: cmsProp }) {
  const cms = useFooterCms(cmsProp);
  const { lang } = useSiteContent();
  const { role, canListPlaces } = useAccountRole();
  const socials = socialLinks(cms).map(([type, , href]) => [type, href]);
  const linkOptions = { canListPlaces, addLabel: (PARTNER_CTA_TEXT[lang] || PARTNER_CTA_TEXT.uz).add };
  const columns = [
    { title: cms.footer_nav1 || "Ma'lumotlar", links: footerLinks(cms.footer_col1_links, linkOptions) },
    { title: cms.footer_nav2 || "Xizmatlar", links: footerLinks(cms.footer_col2_links, linkOptions) },
  ].filter((column) => column.links.length);
  const phone = cms.footer_phone || "+998 77 044 40 00";
  const email = cms.footer_email || "info@joyzone.uz";

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
          <a href={phoneHref(phone)} className="joy-footer-contact is-phone">
            <span className="joy-footer-contact-icon"><FooterIcon type="phone" /></span>
            <span className="joy-footer-contact-text">{phone}</span>
          </a>
          <a href={mailHref(email)} className="joy-footer-contact is-mail">
            <span className="joy-footer-contact-icon"><FooterIcon type="mail" /></span>
            <span className="joy-footer-contact-text">{email}</span>
          </a>
          <a href={partnerEntryHref(role)} className="joy-footer-cta">
            <span>{cms.footer_cta || "Ariza qoldirish"}</span>
            <FooterIcon type="arrow" />
          </a>
        </div>

        <div className="joy-footer-grid">
          <div className="joy-footer-about">
            <p>{cms.footer_about || "Bizning maqsadimiz qulay ish joylarini ijarachilarga yaqinlashtirish."}</p>
          </div>
          {columns.map((column) => (
            <nav key={column.title} className="joy-footer-nav" aria-label={column.title}>
              <strong>{column.title}</strong>
              {column.links.map((item) => <FooterLink key={`${item.label}-${item.href}`} item={item} />)}
            </nav>
          ))}
          {socials.length ? (
            <div className="joy-footer-social-col">
              <strong>{cms.footer_socials_title || "Ijtimoiy tarmoqlarimiz"}</strong>
              <div className="joy-footer-socials">
                {socials.map(([type, href]) => (
                  <a key={type} href={href} className={`is-${type}`} target="_blank" rel="noopener noreferrer" aria-label={SOCIAL_NAMES[type] || type} title={SOCIAL_NAMES[type] || type}>
                    <FooterIcon type={type} />
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="joy-footer-bottom">
          <span>{cms.footer_copyright || "©2026 JOY HUB. Barcha huquqlar himoyalangan."}</span>
          <span>{cms.footer_powered || "Powered by IT Comfort"}</span>
        </div>
      </div>

      {typeof document !== "undefined" && createPortal(
        <button 
          type="button" 
          className="joy-floating-contact support-icon-host" 
          aria-label="Joyzone bilan bog'lanish"
          onClick={(e) => {
            e.preventDefault();
            // Prevent scrolling to footer
          }}
        >
          <SupportIcon size={28} />
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
  const [totalPlaces, setTotalPlaces] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPlacesError("");

    // Backend picks 8 places: up to 2 paid ads plus the most booked / best rated.
    api.get("/api/places/popular/", { skipAuth: true })
      .then((response) => {
        if (cancelled) return;
        const places = getPlacesFromApiResponse(response.data)
          .map(normalizePlace)
          .filter((place) => place.status === "approved");
        setTotalPlaces(Number(response.data?.total) || places.length);
        setSpaces(places);
        setEmpty(places.length === 0);
        setUsingDevFallback(false);
      })
      .catch((error) => {
        if (cancelled) return;
        setPlacesError(getApiErrorMessage(error, "Joyzone joylarini yuklab bo'lmadi."));
        if (import.meta.env.DEV) {
          // Never mutate the shared demo array; normalized copies are an offline development fallback only.
          const fallbackPlaces = propertyCards.slice(0, 8).map((place) => normalizePlace({ ...place, status: "approved" }));
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
          ".rfq h2, .rfq-head p, " +
          ".property-body h3, .property-body p, .agent-name, .agent-bio"
        );
        
        texts.forEach(text => {
          revealText(text, {
            scrollTrigger: {
              trigger: text,
              start: "top 92%",
              toggleActions: "play none none none"
            }
          });
        });

        // Block fade-up animations
        const blocks = gsap.utils.toArray(".property-card, .rfq-item");
        
        blocks.forEach(block => {
          gsap.fromTo(block,
            { opacity: 0, y: 50 },
            {
              opacity: 1,
              y: 0,
              duration: 0.8,
              ease: "power3.out",
              // Hand transform back to CSS so the cards' hover lift works.
              clearProps: "transform",
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
          <h2>
            <HighlightedTitle text={cms.popular_title || "Ommabop joylar"} highlight="" />
            <TitleCurve />
          </h2>
          <p className="listings-sub">{cms.popular_subtitle || "Eng ko'p izlangan va band qilingan joylar"}</p>
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
          <CatalogTrail label={cms.card_view_all} total={totalPlaces} />
        </div>
        <PartnerAgents cms={cms} />
        <div className="hide-on-mobile">
          <BenefitsSection cms={cms} />
        </div>
        <HowItWorksSection cms={cms} />
        <div className="hide-on-mobile">
          <ReviewsFaqSection cms={cms} />
        </div>
        <JoyFooter cms={cms} />
      </div>
    </section>
  );
}
