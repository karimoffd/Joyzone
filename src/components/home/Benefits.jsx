import React, { useEffect, useRef, useState } from "react";
import { cmsList } from "../../utils/cmsLinks.js";
import "./benefits.css";

// "Joyzone qulayliklari": a hub - one big live illustration in the centre,
// the benefits around it on both sides; it rotates on its own.
// The CMS icon key picks the illustration, so admins edit only title and text.

const photo = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=320&q=60`;
const PHOTOS = [
  photo("1527192491265-7e15c55b1ed2"),
  photo("1497366216548-37526070297c"),
  photo("1431540015161-0bf868a2d407"),
];

function Check({ size = 12 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>;
}

function Star() {
  return <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3.2l2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-2.9-5.4 2.9 1.1-6L3.2 9.6l6.1-.8z" /></svg>;
}

/* ---------- illustrations ---------- */

function ListingArt() {
  return (
    <div className="bf-art bf-art-listing">
      <div className="bf-mini-card">
        <img src={PHOTOS[0]} alt="" />
        <div className="bf-mini-body">
          <b>Bunyod Coworking</b>
          <div className="bf-tags">
            <span style={{ "--i": 0 }}>90 000 so'm</span>
            <span style={{ "--i": 1 }}>Chilonzor</span>
            <span style={{ "--i": 2 }}>60 kishi</span>
            <span style={{ "--i": 3 }}>Wi-Fi</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SearchArt() {
  return (
    <div className="bf-art bf-art-search">
      <div className="bf-searchbar">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <span className="bf-typing">Kovorking, 10 kishi</span>
      </div>
      <div className="bf-results">
        {PHOTOS.map((src, index) => (
          <div key={src} className={`bf-result ${index === 1 ? "is-best" : ""}`} style={{ "--i": index }}>
            <img src={src} alt="" />
            <span><i /><i /></span>
            {index === 1 ? <em><Check size={10} /></em> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardArt() {
  const bars = [38, 56, 44, 72, 60, 88, 70];
  return (
    <div className="bf-art bf-art-dash">
      <div className="bf-dash-head">
        <span>Bu hafta</span>
        <b>+12 so'rov</b>
      </div>
      <div className="bf-bars">
        {bars.map((height, index) => <i key={index} style={{ "--h": `${height}%`, "--i": index }} />)}
      </div>
      <div className="bf-dash-days">{["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"].map((day) => <span key={day}>{day}</span>)}</div>
    </div>
  );
}

function TrustArt() {
  return (
    <div className="bf-art bf-art-trust">
      <div className="bf-rating">
        <strong>4.9</strong>
        <div>
          <span className="bf-stars">{[0, 1, 2, 3, 4].map((index) => <i key={index} style={{ "--i": index }}><Star /></i>)}</span>
          <small>128 ta sharh</small>
        </div>
      </div>
      <div className="bf-verified"><span><Check size={11} /></span>Tasdiqlangan hamkor</div>
      <div className="bf-quote">
        <span className="bf-avatar">MA</span>
        <p>“Hammasi suratdagidek, juda qulay!”</p>
      </div>
    </div>
  );
}

function TariffArt() {
  const plans = [
    { name: "Standard", note: "Bepul" },
    { name: "Comfort", note: "5 ta joy" },
    { name: "Premium", note: "10 ta joy", crown: true },
  ];
  return (
    <div className="bf-art bf-art-tariff">
      {plans.map((plan, index) => (
        <div key={plan.name} className="bf-plan" style={{ "--i": index }}>
          <span className="bf-plan-dot" />
          <b>{plan.name}</b>
          <small>{plan.note}</small>
          {plan.crown ? (
            <svg className="bf-crown" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 7.5 7.6 11 12 4.5 16.4 11 21 7.5 19.2 18H4.8Z" /></svg>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function BoostArt() {
  return (
    <div className="bf-art bf-art-boost">
      <div className="bf-rank">
        <div className="bf-rank-row bf-rank-ad">
          <img src={PHOTOS[2]} alt="" />
          <span><i /><i /></span>
          <em>Reklama</em>
        </div>
        <div className="bf-rank-row bf-rank-a"><img src={PHOTOS[0]} alt="" /><span><i /><i /></span></div>
        <div className="bf-rank-row bf-rank-b"><img src={PHOTOS[1]} alt="" /><span><i /><i /></span></div>
      </div>
      <span className="bf-boost-arrow" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5" /><path d="m6 11 6-6 6 6" /></svg>
      </span>
    </div>
  );
}

const ARTS = {
  interface: ListingArt,
  search: SearchArt,
  building: DashboardArt,
  shield: TrustArt,
  crown: TariffArt,
  megaphone: BoostArt,
};

// The brand word gets the accent colour and the curve under its end ("one"),
// wherever it sits in the translated title.
function BrandTitle({ text, brand = "Joyzone" }) {
  const value = String(text || "");
  const index = value.toLowerCase().indexOf(brand.toLowerCase());
  if (index < 0) return value;
  return (
    <>
      {value.slice(0, index)}
      <span className="bf-brand">
        {value.slice(index, index + brand.length)}
        <svg className="bf-curve" width="80" height="10" viewBox="0 0 80 10" fill="none" aria-hidden="true">
          <path d="M2 8C22 1 58 1 78 8" stroke="#E46630" strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
      </span>
      {value.slice(index + brand.length)}
    </>
  );
}

const ICON_PATHS = {
  interface: ["M4 5h16v12H4z", "M8 21h8", "M12 17v4", "M8 9h4M8 12h8"],
  search: ["M11 19a8 8 0 1 1 5.7-2.4L21 21", "M7.5 10.5h7"],
  building: ["M5 21V8l7-4 7 4v13", "M9 21v-5h6v5", "M9 10h.01M12 10h.01M15 10h.01M9 13h.01M12 13h.01M15 13h.01"],
  shield: ["M12 3 20 6v6c0 5-3.4 8.1-8 9-4.6-.9-8-4-8-9V6z", "m9 12 2 2 4-5"],
  crown: ["M4 8l4 4 4-7 4 7 4-4v10H4z"],
  megaphone: ["M4 13h3l10-5v12L7 15H4z", "M7 15l2 6", "M20 10v8"],
};

function BenefitIcon({ type }) {
  const paths = ICON_PATHS[type] || ICON_PATHS.interface;
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths.map((path) => <path key={path} d={path} />)}
    </svg>
  );
}

function HubItem({ benefit, index, active, side, onPick, onDone }) {
  const isActive = index === active;
  return (
    <li className={`bf-item is-${side} ${isActive ? "is-active" : ""}`}>
      <button type="button" onMouseEnter={() => onPick(index)} onFocus={() => onPick(index)} onClick={() => onPick(index)} aria-pressed={isActive}>
        <span className="bf-icon">
          <BenefitIcon type={benefit.icon} />
          {isActive ? (
            <svg className="bf-ring" viewBox="0 0 64 64" aria-hidden="true">
              <circle cx="32" cy="32" r="30" pathLength="100" onAnimationEnd={onDone} />
            </svg>
          ) : null}
        </span>
        <span className="bf-item-copy">
          <b>{benefit.title}</b>
          <span>{benefit.text}</span>
        </span>
      </button>
    </li>
  );
}

export function BenefitsSection({ cms = {} }) {
  const benefits = cmsList(cms, "benefits_arr");
  const sectionRef = useRef(null);
  const [inView, setInView] = useState(false);
  const [active, setActive] = useState(0);
  const [hovering, setHovering] = useState(false);

  // Illustrations loop and the hub auto-advances only while the block is on screen.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return undefined;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.25 });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  if (!benefits.length) return null;

  const safeActive = Math.min(active, benefits.length - 1);
  const Art = ARTS[benefits[safeActive].icon] || ListingArt;
  const half = Math.ceil(benefits.length / 2);
  const next = () => setActive((value) => (value + 1) % benefits.length);
  const running = inView && !hovering && benefits.length > 1;

  const renderItem = (benefit, index, side) => (
    <HubItem key={benefit.title} benefit={benefit} index={index} active={safeActive} side={side} onPick={setActive} onDone={next} />
  );

  return (
    <section ref={sectionRef} className={`bf ${inView ? "is-live" : ""} ${running ? "is-running" : ""}`} id="about">
      <header className="bf-head">
        <h2><BrandTitle text={cms.about_title || "Joyzone qulayliklari"} /></h2>
        <p>{cms.about_text || "Har kim uchun oddiy va qulay platforma"}</p>
      </header>

      <div className="bf-hub" onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)}>
        <ul className="bf-side is-left">
          {benefits.slice(0, half).map((benefit, offset) => renderItem(benefit, offset, "left"))}
        </ul>

        <div className="bf-stage" aria-hidden="true">
          <span className="bf-stage-ring" />
          <span className="bf-stage-num">{String(safeActive + 1).padStart(2, "0")}</span>
          <div key={safeActive} className="bf-stage-art"><Art /></div>
          <span className="bf-stage-title" key={`t-${safeActive}`}>{benefits[safeActive].title}</span>
        </div>

        <ul className="bf-side is-right">
          {benefits.slice(half).map((benefit, offset) => renderItem(benefit, half + offset, "right"))}
        </ul>
      </div>
    </section>
  );
}
