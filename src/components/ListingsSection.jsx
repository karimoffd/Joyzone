import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import axios from "axios";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);
import { CategoryIcon, NoteIcon } from "./ui/Shared.jsx";
import { joyBenefits, partnerAgents, propertyCards } from "../data/content.js";
import logoImage from "../assets/img/Logo.png";
import "./ListingsSection.css";
import "./CardVariants.css";

function getSpaceHref(title) {
  const t = title || "";
  return `#space-${t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

function getAgentHref(name) {
  return `#agent-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

const DURATION_LABELS = {
  soatlik: "/ soat",
  kunlik: "/ kun",
  haftalik: "/ hafta",
  oylik: "/ oy"
};

export function PropertyCard({ item, index, href, selectedDuration }) {
  const [activeImage, setActiveImage] = useState(0);
  const [saved, setSaved] = useState(false);
  const cardHref = href || getSpaceHref(item.title);
  const mediaRef = useRef(null);
  const saveRef = useRef(null);
  const manualSlideAt = useRef(0);

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

  const toggleSave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setSaved((value) => !value);
    gsap.fromTo(saveRef.current, { scale: 0.82 }, { scale: 1, duration: 0.46, ease: "elastic.out(1, 0.46)" });
  };

  return (
    <article className={`variant-card variant-estate ${priceUnavailable ? "is-duration-unavailable" : ""}`} style={{ "--delay": `${index * 0.055}s` }}>
      <a className="property-card-link" href={cardHref} aria-label={`${item.title} sahifasini ochish`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 10 }} />
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
        <button
          ref={saveRef}
          type="button"
          className={`variant-save-button ${saved ? "is-saved" : ""}`}
          onClick={toggleSave}
          aria-label={saved ? "Eslatmaga saqlandi" : "Eslatmaga saqlash"}
          aria-pressed={saved}
          style={{ zIndex: 20 }}
        >
          <NoteIcon filled={saved} />
        </button>
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

function CatalogTrail() {
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
      <strong>Barcha joylarni ko'rish</strong>
      <b aria-hidden="true">→</b>
    </a>
  );
}

function PartnerAgents() {
  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(4);
  const sectionRef = useRef(null);
  const viewportRef = useRef(null);
  const timerRef = useRef(null);
  const maxStart = Math.max(0, partnerAgents.length - visible);
  
  const partnerImages = [
    "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=200&q=80",
    "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=200&q=80",
    "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=200&q=80",
    "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=200&q=80",
    "https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&fit=crop&w=200&q=80",
    "https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=200&q=80",
    "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=200&q=80",
    "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=200&q=80"
  ];

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
  }, []);

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

  return (
    <section ref={sectionRef} className="agents-showcase" id="agents">
      <div className="agents-head">
        <h2>
          <span>Joyzone</span> hamkorlari
        </h2>
        <svg className="agents-title-curve" width="160" height="14" viewBox="0 0 160 14" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 12C45 -3 115 -3 158 12" stroke="#E46630" strokeWidth="3" strokeLinecap="round"/>
        </svg>
        <p>Katta brendlar va ishonchli hamkorlar o'z ofis, kovorking, uy va tadbir maydonlarini Joyzone orqali joylashtiradi.</p>
      </div>
      <div ref={viewportRef} className="agents-viewport">
        <div className="agents-track">
          {partnerAgents.map((agent, index) => {
            return (
              <article
                key={`${agent.name}-${index}`}
                className={`agent-card ${index >= active && index < active + visible ? "is-visible" : ""}`}
                style={{ "--brand-tone": agent.tone }}
              >
                <div className="brand-card-top">
                  <div className="brand-logo-mark" aria-hidden="true">
                    <img src={partnerImages[index % partnerImages.length]} alt={agent.name} loading="lazy" />
                  </div>
                  <span className="brand-badge">Premium hamkor</span>
                </div>
                <div className="agent-copy">
                  <h3>{agent.name}</h3>
                  <p>{agent.service}</p>
                </div>
                <div className="brand-trust">
                  <span>{agent.rating}</span>
                  <p>{agent.reviews} ta sharh</p>
                </div>
                <a className="agent-bottom-btn" href={getAgentHref(agent.name)} aria-label={`${agent.name} profilini ochish`}>
                  <span className="agent-btn-text">Profil</span>
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
        <button type="button" className="agent-arrow" onClick={() => chooseAgent((active + 1) % partnerAgents.length)} aria-label="Keyingi agent">
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

function BenefitsSection() {
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
          <span>Joyzone</span> qulayliklari
        </h2>
        <i aria-hidden="true" />
        <p>Har kim uchun oddiy va qulay platforma</p>
      </div>
      <div className="benefits-grid bento">
        {joyBenefits.map((benefit, index) => (
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

function PartnerStartSection() {
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
          <span className="soul-badge">Bron qilish jarayoni</span>
          <h2>
            Sizning joyingiz, <br />
            <span>bizning platforma</span>
          </h2>
          <p>
            Joyzone bilan bron qilish endi shunchaki tugmani bosish emas, balki butun bir tajriba.
            Biz bilan har bir qadam jonli, issiq va qulay.
          </p>
          
          <div className="soul-stats">
            <div className="soul-stat">
              <strong>2 daqiqa</strong>
              <span>Ro'yxatdan o'tish</span>
            </div>
            <div className="soul-stat">
              <strong>1 so'rov</strong>
              <span>Bron jarayoni</span>
            </div>
          </div>
          
          <a className="soul-cta" href="#filter">
            <span>Hozir boshlash</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </a>
        </div>
        
        <div ref={containerRef} className="soul-steps-container">
          
          <div className="soul-step-card">
            <div className="soul-step-number">01</div>
            <div className="soul-step-content">
              <h3>Akkaunt yarating</h3>
              <p>Telefon yoki email orqali kiring, tasdiqlash kodini kiriting va Joyzone profilini soniyalar ichida ishga tushiring.</p>
            </div>
            <svg className="soul-step-arrow" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </div>
          
          <div className="soul-step-card">
            <div className="soul-step-number">02</div>
            <div className="soul-step-content">
              <h3>Sizga mos joyni tanlang</h3>
              <p>Manzil, narx va qulayliklarni ko'rib, o'z uchrashuvingiz yoki ish kuningiz uchun eng mukammal muhitni belgilang.</p>
            </div>
            <svg className="soul-step-arrow" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </div>
          
          <div className="soul-step-card">
            <div className="soul-step-number">03</div>
            <div className="soul-step-content">
              <h3>Bron so'rovini yuboring</h3>
              <p>Sana va vaqtni tanlab, qisqacha izoh qoldiring. Partnerimiz so'rovni darhol ko'rib, tasdiqlash uchun javob beradi.</p>
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

const faqItems = [
  {
    question: "Obyektimni Joyzone'ga qo'sha olamanmi?",
    answer: "Ha. Partner sifatida ro'yxatdan o'tib, ofis, kovorking, zal yoki boshqa joyingizni kabinet orqali moderatsiyaga yuborasiz."
  },
  {
    question: "Joylar xaritada ko'rinadimi?",
    answer: "Joy manzili va hududi kartochkada ko'rinadi. Keyingi bosqichda xarita orqali yaqin joylarni tez tanlash oqimi ham qo'shiladi."
  },
  {
    question: "Bron qilish qanday ishlaydi?",
    answer: "Mijoz kerakli joyni tanlaydi, sanani yoki vaqtni belgilaydi va so'rov yuboradi. Partner kabinetda so'rovni tasdiqlaydi."
  },
  {
    question: "Partnerlar uchun tariflar bormi?",
    answer: "Ha, joy egasi o'sish bosqichiga qarab oddiy joylashtirish yoki ko'proq ko'rinish beradigan paketlarni tanlashi mumkin."
  }
];

function ReviewsFaqSection() {
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

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIsReviewSliding(true);
      reviewTimeoutRef.current = window.setTimeout(() => {
        setFirstReview((current) => (current + 1) % reviewHighlights.length);
        setIsReviewSliding(false);
      }, 560);
    }, 3400);

    return () => {
      window.clearInterval(timer);
      if (reviewTimeoutRef.current) {
        window.clearTimeout(reviewTimeoutRef.current);
      }
    };
  }, []);

  const visibleReviews = Array.from({ length: 4 }, (_, position) => ({
    position,
    review: reviewHighlights[(firstReview + position) % reviewHighlights.length]
  }));

  return (
    <section ref={sectionRef} className="reviews-faq-section" id="faq">
      <div className="reviews-faq-inner">
        <div className="reviews-panel" aria-label="Joyzone foydalanuvchi sharhlari">
          <div className="reviews-label">Sharhlar</div>
          <div className={`review-stage ${isReviewSliding ? "is-sliding" : ""}`}>
            {visibleReviews.map(({ review, position }) => (
              <article
                key={review.name}
                className={`review-bubble review-position-${position} ${review.tone === "dark" ? "is-dark" : ""}`}
              >
                <strong>{review.name}</strong>
                <p>{review.text}</p>
                <span aria-label="5 yulduzli baho">★★★★★</span>
              </article>
            ))}
          </div>
        </div>

        <div className="faq-panel">
          <p className="section-kicker">FAQ</p>
          <h2>Qisqacha asosiylari</h2>
          <div className="faq-list">
            {faqItems.map((item, index) => {
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
      <a href="#home" style={{ display: "inline-flex", opacity: 0.9, transition: "opacity 0.2s" }} onMouseOver={(e) => e.currentTarget.style.opacity = "1"} onMouseOut={(e) => e.currentTarget.style.opacity = "0.9"}>
        <img src={logoImage} alt="Joyzone" style={{ height: "26px" }} />
      </a>
      <p style={{ margin: 0, fontSize: "14px", color: "#61707e", fontWeight: "700" }}>
        © {new Date().getFullYear()} Joyzone. Powered by IT Comfort.
      </p>
    </footer>
  );
}

export function JoyFooter() {
  const socials = [
    ["instagram", "#instagram"],
    ["facebook", "#facebook"],
    ["telegram", "#telegram"],
    ["whatsapp", "#whatsapp"]
  ];
  const openPage = (hash) => `${window.location.origin}${window.location.pathname}${hash}`;

  return (
    <footer className="joy-footer-section" id="contact">
      <div className="footer-question-strip">
        <div>
          <span>Joyzone yordam markazi</span>
          <h2>Savolingiz bormi?</h2>
          <p>Ofis, kovorking yoki zal tanlashda yordam beramiz.</p>
        </div>
        <a href="#contact">
          Biz bilan bog'laning
          <FooterIcon type="arrow" />
        </a>
      </div>

      <div className="joy-footer-card">
        <div className="joy-footer-top">
          <a href="#home" className="joy-footer-logo" aria-label="Joyzone bosh sahifa">
            <img src={logoImage} alt="Joyzone" />
          </a>
          <a href="tel:+998770444000" className="joy-footer-contact">
            <FooterIcon type="phone" />
            +998 77 044 40 00
          </a>
          <a href="mailto:info@joyzone.uz" className="joy-footer-contact">
            <FooterIcon type="mail" />
            info@joyzone.uz
          </a>
          <a href="#partner" className="joy-footer-cta">Ariza qoldirish</a>
        </div>

        <div className="joy-footer-grid">
          <div>
            <p>Bizning maqsadimiz qulay ish joylarini va saytni ijarachilarga yaqinlashtirish.</p>
          </div>
          <nav aria-label="Ma'lumotlar">
            <strong>Ma'lumotlar</strong>
            <a href="#about-us">Biz haqimizda</a>
            <a href="#filter">Yo'nalishlar</a>
            <a href="#contact">Kontaktlar</a>
            <a href="#policy">Maxfiylik siyosati</a>
          </nav>
          <nav aria-label="Xizmatlar">
            <strong>Xizmatlar</strong>
            <a href="#filter">Ijaraga ofislar</a>
            <a href="#filter">Konferensiyalar zali</a>
            <a href="#partner-guide">Hamkor bo'lish</a>
          </nav>
          <div>
            <strong>Ijtimoiy tarmoqlarimiz</strong>
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
          <span>©2026 JOY HUB. Barcha huquqlar himoyalangan.</span>
          <span>Powered by IT Comfort</span>
        </div>
      </div>

      <a href="#contact" className="joy-floating-contact" aria-label="Joyzone bilan bog'lanish">
        <FooterIcon type="chat" />
        <span>Yordam kerakmi?</span>
      </a>
    </footer>
  );
}

export default function ListingsSection() {
  const [spaces, setSpaces] = useState(propertyCards);

  useEffect(() => {
    axios.get("http://localhost:8000/api/places/")
      .then((res) => {
        if (res.data && res.data.length > 0) {
          setSpaces(res.data);
        }
      })
      .catch((err) => {
        console.warn("REST API orqali joylarni yuklab bo'lmadi, mock ma'lumotlar ishlatilmoqda:", err.message);
      });
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
  }, []);

  return (
    <section className="listings-section" id="home-listings">
      <div className="listings-inner">
        <div className="listings-head">
          <p>Joyzone tanlovi</p>
          <h2>
            <span>Har qanday</span> jamoa uchun joylar
          </h2>
          <p>Kovorking, ofis va uchrashuv xonalarini real ehtiyojga qarab tanlang.</p>
        </div>
        <div className="property-grid">
          {spaces.map((item, index) => (
            <PropertyCard key={item.title || item.name} item={item} index={index} />
          ))}
        </div>
        <div className="more-row">
          <CatalogTrail />
        </div>
        <PartnerAgents />
        <BenefitsSection />
        <PartnerStartSection />
        <ReviewsFaqSection />
        <JoyFooter />
      </div>
    </section>
  );
}
