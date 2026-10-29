import React, { useEffect, useMemo, useRef, useState } from "react";
import { VideoModal } from "./VideoModal.jsx";
import "./howItWorks.css";

// "Qanday ishlaydi": two audiences (guests / partners), three steps each.
// Every step has a small animated screen demo that plays like a video and is
// synced with the step list; a real video link from the CMS adds a
// "watch the video" button on top of it.

const STAGE_WIDTH = 560;
const photo = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=360&q=60`;
const PHOTOS = [
  photo("1497366216548-37526070297c"),
  photo("1527192491265-7e15c55b1ed2"),
  photo("1431540015161-0bf868a2d407"),
  photo("1540575467063-178a50c2df87"),
];

function at(seconds) {
  return { "--t": `${seconds}s` };
}

function Check() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>;
}

function Cursor() {
  return (
    <span className="hs-cursor" aria-hidden="true">
      <svg width="22" height="22" viewBox="0 0 24 24"><path d="M5 3l14 8-6.2 1.6L9.6 19z" fill="#12283f" stroke="#ffffff" strokeWidth="1.6" strokeLinejoin="round" /></svg>
    </span>
  );
}

/* ---------- Guest scenes ---------- */

function GuestLogin() {
  return (
    <div className="hs hs-guest-login">
      <div className="hs-card hs-login-card">
        <b className="hs-brand">Joy<span>zone</span></b>
        <h4>Kirish</h4>
        <div className="hs-field"><span className="hs-prefix">+998</span><span className="hs-type" style={{ ...at(0.3), "--len": "1.2s" }}>90 123 45 67</span></div>
        <div className="hs-otp">
          {["4", "7", "1", "9"].map((digit, index) => <span key={digit} className="hs-pop" style={at(1.8 + index * 0.25)}>{digit}</span>)}
        </div>
        <span className="hs-btn hs-press" style={at(3)}>Tasdiqlash</span>
      </div>
      <div className="hs-toast hs-pop hs-login-toast" style={at(3.5)}><Check />Profil tayyor</div>
      <Cursor />
    </div>
  );
}

function GuestSearch() {
  const cards = [
    { title: "Kamalak mini-ofis", price: "350 000", img: PHOTOS[0] },
    { title: "Bunyod Coworking", price: "90 000", img: PHOTOS[1] },
    { title: "Oqtepa meeting", price: "750 000", img: PHOTOS[2] },
  ];
  return (
    <div className="hs hs-guest-search">
      <div className="hs-search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <span className="hs-type" style={{ ...at(0.4), "--len": "1s" }}>Kovorking, Toshkent</span>
      </div>
      <div className="hs-chips">
        <span>Hammasi</span><span>Ofis</span><span className="hs-chip-on" style={at(1.5)}>Kovorking</span><span>Zal</span>
      </div>
      {cards.map((card, index) => (
        <div key={card.title} className={`hs-place hs-rise hs-place-${index} ${index === 1 ? "hs-select" : ""}`} style={index === 1 ? { ...at(0.5 + index * 0.15), "--t2": "3.3s" } : at(0.5 + index * 0.15)}>
          <img src={card.img} alt="" />
          <b>{card.title}</b>
          <span>{card.price} so'm <i>kunlik</i></span>
          {index === 1 ? <em className="hs-pop" style={at(3.5)}><Check />Tanlandi</em> : null}
        </div>
      ))}
      <Cursor />
    </div>
  );
}

function GuestBooking() {
  const days = Array.from({ length: 28 }, (_, index) => index + 1);
  return (
    <div className="hs hs-guest-booking">
      <div className="hs-card hs-summary">
        <img src={PHOTOS[1]} alt="" />
        <b>Bunyod Coworking</b>
        <span>Toshkent, Chilonzor</span>
        <strong>90 000 so'm <i>kunlik</i></strong>
        <span className="hs-status">
          <i className="hs-status-wait">Kutilmoqda</i>
          <i className="hs-status-ok hs-swap" style={at(4.6)}><Check />Tasdiqlandi</i>
        </span>
      </div>
      <div className="hs-card hs-calendar">
        <div className="hs-cal-head"><b>Sana tanlang</b><span>‹ ›</span></div>
        <div className="hs-cal-week">{["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"].map((day) => <span key={day}>{day}</span>)}</div>
        <div className="hs-cal-grid">
          {days.map((day) => <span key={day} className={day === 14 ? "hs-day-on" : ""} style={day === 14 ? at(1.25) : undefined}>{day}</span>)}
        </div>
        <div className="hs-times">
          <span>09:00–11:00</span><span className="hs-chip-on" style={at(2.15)}>10:00–12:00</span><span>14:00–16:00</span>
        </div>
        <span className="hs-btn hs-press hs-cal-btn" style={at(3)}>So'rov yuborish</span>
      </div>
      <div className="hs-toast hs-pop hs-booking-toast" style={at(3.5)}><Check />So'rov yuborildi</div>
      <Cursor />
    </div>
  );
}

/* ---------- Partner scenes ---------- */

function PartnerRole() {
  return (
    <div className="hs hs-partner-role">
      <div className="hs-card hs-role-card">
        <h4>Kim sifatida davom etasiz?</h4>
        <div className="hs-roles">
          <span className="hs-role">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" /></svg>
            Mijoz
          </span>
          <span className="hs-role hs-role-on" style={at(1.3)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 21V8l8-5 8 5v13" /><path d="M9 21v-6h6v6" /></svg>
            Hamkor
          </span>
        </div>
        <label>Kompaniya nomi</label>
        <div className="hs-field"><span className="hs-type" style={{ ...at(1.9), "--len": "1.2s" }}>Kamalak Business</span></div>
        <span className="hs-btn hs-press" style={at(3.6)}>Kabinetga o'tish</span>
      </div>
      <div className="hs-toast hs-pop hs-role-toast" style={at(4.1)}><Check />Hamkor kabineti ochildi</div>
      <Cursor />
    </div>
  );
}

function PartnerPlace() {
  return (
    <div className="hs hs-partner-place">
      <div className="hs-card hs-wizard">
        <div className="hs-wizard-head"><b>Yangi joy</b><span>Rasmlar · 4 / 11</span></div>
        <div className="hs-wizard-bar"><i style={at(0.2)} /></div>
        <div className="hs-photos">
          {PHOTOS.map((src, index) => (
            <span key={src} className="hs-photo">
              <img className="hs-photo-in" src={src} alt="" style={at(0.5 + index * 0.4)} />
            </span>
          ))}
        </div>
        <span className="hs-photo-count hs-pop" style={at(2.1)}><Check />4 ta rasm yuklandi</span>
        <div className="hs-price-row">
          <label>Kunlik narx</label>
          <div className="hs-field"><span className="hs-type" style={{ ...at(2.6), "--len": "0.8s" }}>350 000 so'm</span></div>
        </div>
        <span className="hs-mod hs-pop" style={at(4.2)}>Moderatsiyada</span>
        <span className="hs-btn hs-press hs-wizard-btn" style={at(3.8)}>Moderatsiyaga yuborish</span>
      </div>
      <Cursor />
    </div>
  );
}

function PartnerRequests() {
  return (
    <div className="hs hs-partner-requests">
      <div className="hs-card hs-today">
        <b>Bugun · 14-noyabr</b>
        <div className="hs-today-stats">
          <span><strong>3</strong>bron</span>
          <span><strong>72%</strong>bandlik</span>
        </div>
        <ul>
          <li><i>09:00</i>Band</li>
          <li className="hs-slot-on" style={at(2.5)}><i>10:00</i>Aziz R.</li>
          <li><i>14:00</i>Bo'sh</li>
        </ul>
      </div>
      <div className="hs-card hs-request hs-slide" style={at(0.5)}>
        <div className="hs-request-top">
          <span className="hs-avatar">AR</span>
          <div><b>Aziz R.</b><span>Bunyod Coworking</span></div>
          <span className="hs-status">
            <i className="hs-status-wait">Yangi</i>
            <i className="hs-status-ok hs-swap" style={at(2.4)}><Check />Tasdiqlandi</i>
          </span>
        </div>
        <p>14-noyabr · 10:00–12:00</p>
        <div className="hs-request-actions">
          <span className="hs-btn hs-btn-ghost">Rad etish</span>
          <span className="hs-btn hs-press" style={at(2.2)}>Tasdiqlash</span>
        </div>
      </div>
      <div className="hs-bubble hs-pop hs-bubble-in" style={at(3.2)}>Rahmat! Ertaga ko'rishguncha.</div>
      <div className="hs-bubble hs-pop hs-bubble-out" style={at(3.9)}>Kutamiz! Bunyodkor 24.</div>
      <Cursor />
    </div>
  );
}

const SCENES = {
  guest: [GuestLogin, GuestSearch, GuestBooking],
  partner: [PartnerRole, PartnerPlace, PartnerRequests],
};

const SCREEN_URLS = {
  guest: ["joyzone.uz/login", "joyzone.uz/filter", "joyzone.uz/space-20"],
  partner: ["joyzone.uz/login", "joyzone.uz/partner", "joyzone.uz/host-today"],
};

function buildAudiences(cms) {
  return {
    guest: {
      tab: cms.how_tab_guest || "Mijozlar uchun",
      title: cms.how_guest_title || "Joyni 3 qadamda band qiling",
      text: cms.how_guest_text || "Ro'yxatdan o'tishdan bron so'rovigacha — hammasi bir necha daqiqada.",
      cta: { label: cms.how_guest_cta || "Joy topish", href: "/filter" },
      video: cms.how_video_guest || "",
      steps: [
        { title: cms.how_step1_title || "Akkaunt yarating", text: cms.how_step1 || "Telefon raqamingiz bilan kiring va SMS-koddan so'ng profilingiz tayyor." },
        { title: cms.how_step2_title || "Sizga mos joyni tanlang", text: cms.how_step2 || "Format, narx va qulayliklar bo'yicha saralang va mos joyni tanlang." },
        { title: cms.how_step3_title || "Bron so'rovini yuboring", text: cms.how_step3 || "Sana va vaqtni belgilang — joy egasi so'rovni tasdiqlaydi." },
      ],
    },
    partner: {
      tab: cms.how_tab_partner || "Hamkorlar uchun",
      title: cms.how_partner_title || "Joyingizni 3 qadamda ijaraga bering",
      text: cms.how_partner_text || "Joy qo'shing, moderatsiyadan o'ting va so'rovlarni bitta kabinetda qabul qiling.",
      cta: { label: cms.how_partner_cta || "Joy qo'shish", href: "/partner" },
      guide: { label: cms.how_partner_guide || "Hamkorlar qo'llanmasi", href: "/partner-guide" },
      video: cms.how_video_partner || "",
      steps: [
        { title: cms.how_partner_step1_title || "Hamkor bo'ling", text: cms.how_partner_step1 || "Telefon raqamingiz bilan kiring, hamkor rolini tanlang va kompaniya nomini yozing." },
        { title: cms.how_partner_step2_title || "Joyingizni qo'shing", text: cms.how_partner_step2 || "Format, manzil, kamida 4 ta rasm, narx va ish vaqtini kiriting — e'lon moderatsiyaga yuboriladi." },
        { title: cms.how_partner_step3_title || "So'rovlarni boshqaring", text: cms.how_partner_step3 || "Bron so'rovlarini tasdiqlang, grafikni yuriting va mijozlar bilan chatda gaplashing." },
      ],
    },
  };
}

// Number + the next word ("3 qadamda", "3 шага", "3 steps") gets the accent colour.
function AccentTitle({ text }) {
  const match = String(text).match(/\d+\s*\S+/);
  if (!match) return text;
  const start = match.index;
  return (
    <>
      {text.slice(0, start)}
      <span>{match[0]}</span>
      {text.slice(start + match[0].length)}
    </>
  );
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
  useEffect(() => {
    const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!query) return undefined;
    const onChange = () => setReduced(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

export function HowItWorksSection({ cms = {} }) {
  const [audience, setAudience] = useState("guest");
  const [step, setStep] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [inView, setInView] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const reducedMotion = usePrefersReducedMotion();
  const sectionRef = useRef(null);
  const bodyRef = useRef(null);

  const audiences = useMemo(() => buildAudiences(cms), [cms]);
  const current = audiences[audience];
  const Scene = SCENES[audience][step];
  const playing = inView && !userPaused && !reducedMotion && !videoOpen;

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return undefined;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.35 });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  // The demo is drawn on a fixed 560px stage and scaled to the screen width.
  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return undefined;
    const observer = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / STAGE_WIDTH));
    observer.observe(body);
    return () => observer.disconnect();
  }, []);

  const chooseAudience = (key) => {
    if (key === audience) return;
    setAudience(key);
    setStep(0);
  };

  const chooseStep = (index) => {
    setStep(index);
    setUserPaused(false);
  };

  const nextStep = () => setStep((value) => (value + 1) % current.steps.length);

  return (
    <section
      ref={sectionRef}
      className={`hiw ${playing ? "" : "is-paused"} ${reducedMotion ? "is-static" : ""}`}
      id="partner"
    >
      <div className="hiw-glow" aria-hidden="true" />
      <div className="hiw-inner">
        <header className="hiw-head">
          <div>
            <span className="hiw-kicker">{cms.how_kicker || "Qanday ishlaydi"}</span>
            <h2 key={`title-${audience}`}><AccentTitle text={current.title} /></h2>
            <p key={`text-${audience}`}>{current.text}</p>
          </div>
          <div className="hiw-tabs" role="tablist" aria-label="Kim uchun">
            {Object.entries(audiences).map(([key, item]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={audience === key}
                className={audience === key ? "is-active" : ""}
                onClick={() => chooseAudience(key)}
              >
                {item.tab}
              </button>
            ))}
          </div>
        </header>

        <div className="hiw-body">
          <div className="hiw-player">
            <div className="hiw-screen">
              <div className="hiw-screen-bar" aria-hidden="true">
                <span /><span /><span />
                <em key={`${audience}-${step}`}>{SCREEN_URLS[audience][step]}</em>
              </div>
              <div
                ref={bodyRef}
                className="hiw-screen-body"
                onClick={() => setUserPaused((value) => !value)}
                role="img"
                aria-label={`${current.steps[step].title}: ${current.steps[step].text}`}
              >
                <div className="hiw-stage" style={{ "--s": scale }}>
                  <Scene key={`${audience}-${step}`} />
                </div>
                {!playing && !reducedMotion ? (
                  <span className="hiw-paused-badge" aria-hidden="true">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z" /></svg>
                  </span>
                ) : null}
              </div>
            </div>
            <div className="hiw-controls">
              {!reducedMotion ? (
                <button type="button" className="hiw-play" onClick={() => setUserPaused((value) => !value)} aria-label={userPaused ? "Davom ettirish" : "To'xtatish"}>
                  {userPaused ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z" /></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6.5" y="5" width="4" height="14" rx="1.2" /><rect x="13.5" y="5" width="4" height="14" rx="1.2" /></svg>
                  )}
                </button>
              ) : null}
              <span className="hiw-now">
                <b>{String(step + 1).padStart(2, "0")} / {String(current.steps.length).padStart(2, "0")}</b>
                {current.steps[step].title}
              </span>
              {current.video ? (
                <button type="button" className="hiw-video-btn" onClick={() => setVideoOpen(true)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z" /></svg>
                  {cms.how_video_label || "Videoni ko'rish"}
                </button>
              ) : (
                <span className="hiw-demo-label">{cms.how_demo_label || "Interaktiv ko'rsatma"}</span>
              )}
            </div>
          </div>

          <div className="hiw-side">
            <ol className="hiw-steps">
              {current.steps.map((item, index) => (
                <li key={`${audience}-${index}`} className={index === step ? "is-active" : index < step ? "is-done" : ""}>
                  <button type="button" onClick={() => chooseStep(index)} aria-current={index === step ? "step" : undefined}>
                    <span className="hiw-step-num">{index < step ? <Check /> : String(index + 1).padStart(2, "0")}</span>
                    <span className="hiw-step-copy">
                      <b>{item.title}</b>
                      <span>{item.text}</span>
                    </span>
                  </button>
                  {index === step ? (
                    <span className="hiw-step-bar" aria-hidden="true">
                      <i key={`${audience}-${step}`} onAnimationEnd={nextStep} />
                    </span>
                  ) : null}
                </li>
              ))}
            </ol>
            <div className="hiw-actions">
              <a className="hiw-cta" href={current.cta.href}>
                {current.cta.label}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>
              </a>
              {current.guide ? <a className="hiw-link" href={current.guide.href}>{current.guide.label}</a> : null}
            </div>
          </div>
        </div>
      </div>
      {videoOpen ? <VideoModal url={current.video} title={current.title} onClose={() => setVideoOpen(false)} /> : null}
    </section>
  );
}
