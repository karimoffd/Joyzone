import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { CategoryIcon, HeartIcon } from "./ui/Shared.jsx";
import { joyBenefits, partnerAgents, propertyCards } from "../data/content.js";
import "./ListingsSection.css";

function getSpaceHref(title) {
  return `#space-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

export function PropertyCard({ item, index, href = "#filter" }) {
  const [activeImage, setActiveImage] = useState(0);
  const [liked, setLiked] = useState(false);
  const mediaRef = useRef(null);
  const likeRef = useRef(null);
  const manualSlideAt = useRef(0);

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

  const toggleLike = () => {
    setLiked((value) => !value);
    gsap.fromTo(likeRef.current, { scale: 0.82 }, { scale: 1, duration: 0.46, ease: "elastic.out(1, 0.46)" });
  };

  return (
    <article className="property-card" style={{ "--delay": `${index * 0.055}s` }}>
      <a className="property-card-link" href={href} aria-label={`${item.title} filtr sahifasini ochish`} />
      <div ref={mediaRef} className="property-media">
        {item.images.map((image, imageIndex) => (
          <img
            key={image}
            src={image}
            alt={item.title}
            loading={imageIndex === 0 ? "eager" : "lazy"}
            className={`property-slide ${imageIndex === activeImage ? "is-active" : ""}`}
          />
        ))}
        <span className="property-slide-glow" />
        {item.promoted ? <span className="property-badge">Reklama</span> : null}
        <button
          ref={likeRef}
          type="button"
          className={`like-button ${liked ? "is-liked" : ""}`}
          onClick={toggleLike}
          aria-label={liked ? "Yoqtirildi" : "Yoqtirish"}
          aria-pressed={liked}
        >
          <HeartIcon filled={liked} />
        </button>
        <div className="property-slide-dots" aria-label="Rasmni tanlash">
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
        <div className="property-hover">
          <span className="spec-chip spec-chip-main">
            <CategoryIcon category={item.category} />
            {item.category}
          </span>
          <span className="spec-chip">{item.people} kishi</span>
          <span className="spec-chip">{item.area} m2</span>
        </div>
      </div>
      <div className="property-body">
        <div className="property-topline">
          <span>{item.category}</span>
        </div>
        <h3>{item.title}</h3>
        <p>{item.location}</p>
        <div className="property-bottom">
          <strong>{item.price}</strong>
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
                <div className="agent-bottom-btn">
                  <span className="agent-btn-text">Joylar</span>
                  <strong className="agent-btn-count">{agent.spaces}</strong>
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
    <section ref={benefitsRef} className="benefits-section" id="benefits">
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
  const cursorRef = useRef(null);
  const progressRef = useRef(null);
  const statusRef = useRef(null);
  const pulseRef = useRef(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || !cursorRef.current || !progressRef.current || !statusRef.current || !pulseRef.current) return undefined;

    const ctx = gsap.context(() => {
      const steps = section.querySelectorAll(".partner-motion-step");
      const cards = section.querySelectorAll(".partner-start-card, .partner-start-stat, .partner-start-action");
      const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.55, defaults: { ease: "power3.inOut" } });

      gsap.fromTo(
        cards,
        { y: 26, opacity: 0, filter: "blur(8px)" },
        { y: 0, opacity: 1, filter: "blur(0px)", duration: 0.72, stagger: 0.06, ease: "power3.out" }
      );

      tl.set(steps, { autoAlpha: 0, y: 18, scale: 0.96 })
        .set(steps[0], { autoAlpha: 1, y: 0, scale: 1 })
        .set(progressRef.current, { scaleX: 0.12 })
        .set(statusRef.current, { textContent: "Akkaunt tanlanmoqda" })
        .set(cursorRef.current, { x: 86, y: 116, scale: 1 })
        .to(cursorRef.current, { x: 292, y: 154, duration: 1.15 })
        .set(pulseRef.current, { scale: 0.4, opacity: 0.78 }, "-=0.02")
        .to(pulseRef.current, { x: 292, y: 154, scale: 1.8, opacity: 0, duration: 0.44, ease: "power2.out" }, "-=0.22")
        .to(progressRef.current, { scaleX: 0.32, duration: 0.55 }, "-=0.3")
        .set(statusRef.current, { textContent: "Maydon ma'lumotlari" })
        .to(steps[0], { autoAlpha: 0, y: -16, scale: 0.97, duration: 0.42 }, "+=0.15")
        .to(steps[1], { autoAlpha: 1, y: 0, scale: 1, duration: 0.5 }, "-=0.16")
        .to(cursorRef.current, { x: 186, y: 236, duration: 1.05 })
        .to(section.querySelector(".motion-input-line"), { width: "82%", duration: 0.7, ease: "power2.out" }, "-=0.35")
        .to(progressRef.current, { scaleX: 0.58, duration: 0.5 }, "-=0.25")
        .set(statusRef.current, { textContent: "Narx va jadval" })
        .to(steps[1], { autoAlpha: 0, y: -16, scale: 0.97, duration: 0.42 }, "+=0.2")
        .to(steps[2], { autoAlpha: 1, y: 0, scale: 1, duration: 0.5 }, "-=0.16")
        .to(cursorRef.current, { x: 360, y: 254, duration: 1.05 })
        .to(section.querySelector(".motion-range-fill"), { width: "74%", duration: 0.7, ease: "power2.out" }, "-=0.35")
        .to(progressRef.current, { scaleX: 0.78, duration: 0.48 }, "-=0.25")
        .set(statusRef.current, { textContent: "Tekshiruvga yuborildi" })
        .to(steps[2], { autoAlpha: 0, y: -16, scale: 0.97, duration: 0.42 }, "+=0.2")
        .to(steps[3], { autoAlpha: 1, y: 0, scale: 1, duration: 0.5 }, "-=0.16")
        .to(cursorRef.current, { x: 302, y: 304, duration: 0.9 })
        .set(pulseRef.current, { scale: 0.4, opacity: 0.78 }, "-=0.02")
        .to(pulseRef.current, { x: 302, y: 304, scale: 2.1, opacity: 0, duration: 0.42, ease: "power2.out" }, "-=0.14")
        .to(progressRef.current, { scaleX: 1, duration: 0.64 }, "-=0.25")
        .to(section.querySelector(".motion-success"), { scale: 1.08, duration: 0.32, yoyo: true, repeat: 1, ease: "back.out(2)" }, "-=0.35")
        .to(cursorRef.current, { scale: 0.92, duration: 0.3 }, "+=0.55")
        .to(steps[3], { autoAlpha: 0, y: 12, scale: 0.98, duration: 0.4 })
        .to(steps[0], { autoAlpha: 1, y: 0, scale: 1, duration: 0.4 }, "-=0.08");
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="partner-start-section" id="partner-start">
      <div className="partner-start-head">
        <p>Instruksiya</p>
        <h2>
          <span>Partner</span> bo'lish jarayoni
        </h2>
      </div>

      <div className="partner-start-panel">
        <div className="partner-motion-card" aria-label="Partner ro'yxatdan o'tish demo animatsiyasi">
          <div className="motion-browser">
            <div className="motion-topbar">
              <span />
              <span />
              <span />
              <strong>joyzone.uz/partner</strong>
            </div>
            <div className="motion-screen">
              <div className="partner-motion-step motion-step-one">
                <small>1-qadam</small>
                <h3>Rolni tanlang</h3>
                <div className="motion-role-grid">
                  <span>Mehmon</span>
                  <span>Mijoz</span>
                  <span className="is-selected">Partner</span>
                </div>
              </div>

              <div className="partner-motion-step motion-step-two">
                <small>2-qadam</small>
                <h3>Joyingizni kiriting</h3>
                <div className="motion-form-lines">
                  <span className="motion-input-line" />
                  <span />
                  <span />
                </div>
                <div className="motion-photo-grid">
                  <b />
                  <b />
                  <b />
                </div>
              </div>

              <div className="partner-motion-step motion-step-three">
                <small>3-qadam</small>
                <h3>Narx va jadval</h3>
                <div className="motion-calendar">
                  {Array.from({ length: 12 }).map((_, index) => (
                    <span key={`calendar-${index}`} className={index > 4 && index < 9 ? "is-active" : ""} />
                  ))}
                </div>
                <div className="motion-range">
                  <span className="motion-range-fill" />
                </div>
              </div>

              <div className="partner-motion-step motion-step-four">
                <small>4-qadam</small>
                <h3>Tekshiruvga yuboring</h3>
                <div className="motion-success">
                  <span>✓</span>
                  <strong>Joy e'lon qilindi</strong>
                </div>
              </div>

              <span ref={pulseRef} className="motion-click-pulse" />
              <span ref={cursorRef} className="motion-cursor" />
            </div>
            <div className="motion-footer">
              <span ref={statusRef}>Akkaunt tanlanmoqda</span>
              <b><i ref={progressRef} /></b>
            </div>
          </div>
        </div>

        <div className="partner-start-copy">
          <div className="partner-start-card">
            <span>01</span>
            <div>
              <h3>Partner akkaunt oching</h3>
              <p>Telefon orqali kiring, rolni partner qilib tanlang va kabinetni faollashtiring.</p>
            </div>
          </div>
          <div className="partner-start-card">
            <span>02</span>
            <div>
              <h3>Maydon kartasini to'ldiring</h3>
              <p>Rasm, manzil, sig'im, qulayliklar va bron qilish qoidalari bitta oqimda yig'iladi.</p>
            </div>
          </div>
          <div className="partner-start-card">
            <span>03</span>
            <div>
              <h3>Narx va vaqtni sozlang</h3>
              <p>Soatlik, kunlik yoki haftalik tariflarni belgilab, band kunlarni yopib qo'ying.</p>
            </div>
          </div>

          <div className="partner-start-stats">
            <div className="partner-start-stat">
              <strong>10 daqiqa</strong>
              <span>birinchi e'longacha</span>
            </div>
            <div className="partner-start-stat">
              <strong>24/7</strong>
              <span>so'rovlarni qabul qilish</span>
            </div>
          </div>

          <a className="partner-start-action" href="#register">
            Partner sifatida boshlash
          </a>
        </div>
      </div>
    </section>
  );
}

export default function ListingsSection() {
  return (
    <section className="listings-section">
      <div className="listings-inner">
        <div className="listings-head">
          <p>Joyzone tanlovi</p>
          <h2>
            <span>Har qanday</span> jamoa uchun joylar
          </h2>
          <p>Kovorking, ofis va uchrashuv xonalarini real ehtiyojga qarab tanlang.</p>
        </div>
        <div className="property-grid">
          {propertyCards.map((item, index) => (
            <PropertyCard key={item.title} item={item} index={index} />
          ))}
        </div>
        <div className="more-row">
          <CatalogTrail />
        </div>
        <PartnerAgents />
        <BenefitsSection />
        <PartnerStartSection />
      </div>
    </section>
  );
}
