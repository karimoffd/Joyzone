import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { gsap } from "gsap";
import JoySlider from "./JoySlider.jsx";
import ListingsSection from "./ListingsSection.jsx";
import logoImage from "../assets/img/Logo.png";
import kvIcon from "../assets/img/kv.svg";
import "./HomeHero.css";

const navLinks = [
  { href: "#about", label: "Biz haqimizda" },
  { href: "#filter", label: "Ijaraga joylar" },
  { href: "#guide", label: "Yoriqnoma" },
  { href: "#services", label: "Kontaktlar" },
  { href: "#contacts", label: "Kontaktlar" }
];

const dashboardNavLinks = [
  { href: "#host-today", label: "Сегодня" },
  { href: "#host-calendar", label: "График" },
  { href: "#host-listings", label: "Мои места" },
  { href: "#host-messages", label: "Диалоги" }
];

const tabs = [
  { id: "barchasi", label: "Barchasi" },
  { id: "ofislar", label: "Ofislar" },
  { id: "coworking", label: "Kovorking" },
  { id: "konf", label: "Konferentsiya zallari" },
  { id: "muzokara", label: "Muzokara xonalari" },
  { id: "tadbirlar", label: "Tadbirlar uchun xonalar" },
  { id: "ijara", label: "Ijaraga joylar" }
];

const filters = {
  barchasi: [
    { name: "Maydon", label: "Maydon (m2)", unit: "m2", options: ["50-100", "100-200", "200-500", "500+"] },
    { name: "Sigim", label: "Sig'imi", unit: "kishi", options: ["2-8", "8-20", "20-50", "50+"] },
    { name: "Muddati", label: "Muddati", unit: "", options: ["1 soat", "Kunlik", "Haftalik", "Oylik"] },
    { name: "Kommunal", label: "Kommunal xizmatlar", unit: "", options: ["Elektr", "Suv", "Internet", "Issiqlik"] },
    { name: "Avto", label: "Avtoturargoh", unit: "", options: ["Bor", "Yo'q"] },
    { name: "Mebel", label: "Mebel/jihoz", unit: "", options: ["Stol", "Stul", "Proyektor", "Wi-Fi"] }
  ],
  ofislar: [
    { name: "OfisMaydon", label: "Maydon (m2)", unit: "m2", options: ["80-150", "150-300", "300+"] },
    { name: "OfisXona", label: "Xonalar", unit: "", options: ["2 xona", "4 xona", "Open space"] },
    { name: "OfisMebel", label: "Mebel/jihoz", unit: "", options: ["Tayyor", "Bo'sh", "Premium"] }
  ],
  coworking: [
    { name: "CoworkingJoy", label: "Joylar soni", unit: "", options: ["1 joy", "4 joy", "10 joy"] },
    { name: "CoworkingMuddat", label: "Muddati", unit: "", options: ["Soatlik", "Kunlik", "Oylik"] },
    { name: "CoworkingXizmat", label: "Xizmatlar", unit: "", options: ["Wi-Fi", "Printer", "Coffee point"] }
  ],
  konf: [
    { name: "KonfSigim", label: "Sig'imi", unit: "kishi", options: ["10", "30", "80"] },
    { name: "KonfMuddat", label: "Muddati", unit: "", options: ["2 soat", "4 soat", "Kunlik"] },
    { name: "KonfJihoz", label: "Jihozlar", unit: "", options: ["Proyektor", "Mikrofon", "Ekran"] }
  ],
  muzokara: [
    { name: "MuzokaraSigim", label: "Sig'imi", unit: "kishi", options: ["4", "8", "16"] },
    { name: "MuzokaraMuddat", label: "Muddati", unit: "", options: ["1 soat", "2 soat", "4 soat"] },
    { name: "MuzokaraJihoz", label: "Jihozlar", unit: "", options: ["TV", "Doska", "Wi-Fi"] }
  ],
  tadbirlar: [
    { name: "TadbirlarSigim", label: "Sig'imi", unit: "kishi", options: ["50", "100", "200+"] },
    { name: "TadbirlarMuddat", label: "Muddati", unit: "", options: ["4 soat", "Kunlik", "Dam olish kuni"] },
    { name: "TadbirlarXizmat", label: "Xizmatlar", unit: "", options: ["Sahna", "Zvuk", "Yoritish"] }
  ],
  ijara: [
    { name: "IjaraMaydon", label: "Maydon", unit: "m2", options: ["50-100", "100-200", "500+"] },
    { name: "IjaraMuddat", label: "Muddati", unit: "oy", options: ["1-3", "3-6", "12+"] },
    { name: "IjaraKommunal", label: "Kommunal xizmatlar", unit: "", options: ["Kiritilgan", "Alohida"] }
  ]
};

function MenuIcon({ open = false }) {
  return (
    <span className={`burger-lines ${open ? "is-open" : ""}`} aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

export function Header({ userState, setUserState, activeIndex = 0, variant = "default" }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navRef = useRef(null);
  const waveRef = useRef(null);
  const headerRef = useRef(null);
  const isDashboard = variant === "dashboard";
  const navigationLinks = isDashboard ? dashboardNavLinks : navLinks;

  useEffect(() => {
    const nav = navRef.current;
    const wave = waveRef.current;
    if (!nav || !wave) return;
    const links = nav.querySelectorAll(".nav-link");
    const moveWave = (el) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const parentRect = nav.getBoundingClientRect();
      gsap.to(wave, {
        x: rect.left - parentRect.left,
        width: rect.width + 12,
        duration: 1.1,
        ease: "power3.out"
      });
    };
    const activeLink = activeIndex >= 0 ? links[Math.min(activeIndex, links.length - 1)] : null;
    moveWave(activeLink);
    const listeners = [];
    links.forEach((link) => {
      const listener = () => moveWave(link);
      link.addEventListener("mouseenter", listener);
      listeners.push([link, listener]);
    });
    const leaveListener = () => moveWave(activeLink);
    nav.addEventListener("mouseleave", leaveListener);
    return () => {
      listeners.forEach(([link, listener]) => link.removeEventListener("mouseenter", listener));
      nav.removeEventListener("mouseleave", leaveListener);
    };
  }, [activeIndex, navigationLinks]);

  useEffect(() => {
    gsap.fromTo(headerRef.current, { y: -60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" });
  }, []);

  const statusLabel = isDashboard ? "Home" : userState.isAuthed ? (userState.isPartner ? "Partner" : "Profil") : "Kirish";
  const statusHref = isDashboard ? "#home" : userState.isAuthed ? (userState.isPartner ? "#partner" : "#profile") : "#login";

  return (
    <>
      <header ref={headerRef} className={`joy-header ${isDashboard ? "joy-header-dashboard" : ""}`}>
        <div className="container-fluid">
          <div className="nav-hover-zone">
            <nav className="navbar d-flex justify-content-between align-items-center">
              <a href="#home" className="logo">
                <img src={logoImage} alt="Joyzone" />
              </a>

              <div className="nav-center" ref={navRef}>
                <span className="nav-wave" ref={waveRef} />
                {navigationLinks.map((link, index) => (
                  <a key={`${link.label}-${index}`} href={link.href} className={`nav-link ${index === activeIndex ? "active" : ""}`}>
                    {link.label}
                  </a>
                ))}
              </div>

              <div className="nav-right">
                <a className="login-button btn-shine" href={statusHref}>
                  {statusLabel}
                </a>
                <button className={`burger-menu ${isMenuOpen ? "open" : ""}`} type="button" onClick={() => setIsMenuOpen(true)} aria-label="Menyuni ochish">
                  <MenuIcon open={isMenuOpen} />
                </button>
              </div>
            </nav>
          </div>
        </div>
      </header>
      <SideDrawer open={isMenuOpen} onClose={() => setIsMenuOpen(false)} userState={userState} setUserState={setUserState} variant={variant} />
    </>
  );
}

const menuNavLinks = [
  { href: "#about",    label: "Biz haqimizda", num: "01", desc: "Kompaniya haqida batafsil ma'lumot" },
  { href: "#filter",   label: "Ijaraga joylar", num: "02", desc: "Barcha turdagi ofis va kovorkinglar" },
  { href: "#guide",    label: "Yo'riqnoma",    num: "03", desc: "Platformadan foydalanish qoidalari" },
  { href: "#contacts", label: "Kontaktlar",    num: "04", desc: "Biz bilan tezkor bog'lanish" },
];

const dashboardMenuLinks = [
  { href: "#host-today", label: "Сегодня", num: "01", desc: "Брони, задачи и быстрые действия на день" },
  { href: "#host-calendar", label: "График", num: "02", desc: "Цены, скидки и доступность пространств" },
  { href: "#host-listings", label: "Мои места", num: "03", desc: "Объявления, статусы и публикация" },
  { href: "#host-messages", label: "Диалоги", num: "04", desc: "Чаты с резидентами и командами" }
];

const profileMenuLinks = [
  { href: "#profile", label: "Profil", num: "01", desc: "Anketa, bronlar va saqlangan joylar" },
  { href: "#settings", label: "Sozlamalar", num: "02", desc: "Akkaunt, xavfsizlik va bildirishnomalar" },
  { href: "#filter", label: "Joy topish", num: "03", desc: "Ofis, kovorking va zallar katalogi" },
  { href: "#home", label: "Bosh sahifa", num: "04", desc: "Joyzone asosiy sahifasiga qaytish" }
];

function SideDrawer({ open, onClose, userState, setUserState, variant = "default" }) {
  const overlayRef = useRef(null);
  const bgRef = useRef(null);
  const tlRef = useRef(null);
  const isDashboard = variant === "dashboard";
  const drawerLinks = isDashboard ? profileMenuLinks : menuNavLinks;

  useEffect(() => {
    const overlay = overlayRef.current;
    const bg = bgRef.current;
    if (!overlay || !bg) return;

    if (open) {
      gsap.set(overlay, { display: "flex", pointerEvents: "auto" });
      document.body.style.overflow = "hidden";

      tlRef.current = gsap.timeline({ defaults: { ease: "power4.out" } });
      // Glassmorphic fade in
      tlRef.current.fromTo(overlay, { opacity: 0, backdropFilter: "blur(0px)" }, { opacity: 1, backdropFilter: "blur(12px)", duration: 0.4 })
                   .fromTo(bg, { x: "100%", opacity: 0 }, { x: "0%", opacity: 1, duration: 0.6 }, "-=0.2");
      
      // Staggered reveal for menu items
      tlRef.current.fromTo(".premium-nav-item", { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.1 }, "-=0.3");
      tlRef.current.fromTo(".premium-block", { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.1 }, "-=0.4");
    } else {
      document.body.style.overflow = "";
      gsap.to(bg, {
        x: "100%",
        opacity: 0,
        duration: 0.4,
        ease: "power3.in",
      });
      gsap.to(overlay, {
        opacity: 0,
        backdropFilter: "blur(0px)",
        duration: 0.4,
        ease: "power3.in",
        delay: 0.1,
        onComplete: () => gsap.set(overlay, { display: "none", pointerEvents: "none" }),
      });
    }
  }, [open]);

  useEffect(() => () => { document.body.style.overflow = ""; }, []);

  return createPortal(
    <div
      ref={overlayRef}
      className="premium-menu-overlay"
      style={{ display: "none", pointerEvents: "none" }}
      onClick={onClose}
    >
      <div ref={bgRef} className="premium-menu-container" onClick={(e) => e.stopPropagation()}>
        
        {/* Header with Close */}
        <div className="premium-menu-header">
          <img src={logoImage} alt="Joyzone" className="premium-menu-logo" />
          <div className="premium-menu-close-btn" onClick={onClose} title="Yopish">
            <span className="close-text">Yopish</span>
            <div className="close-icon">✕</div>
          </div>
        </div>

        <div className="premium-menu-content">
          {/* Left: Main Navigation */}
          <div className="premium-menu-nav">
	            <p className="premium-section-title">{isDashboard ? "Profil menyusi" : "Asosiy menyu"}</p>
            <nav className="premium-nav-list">
              {drawerLinks.map((link) => (
                <a key={link.href} href={link.href} className="premium-nav-item" onClick={onClose}>
                  <span className="nav-num">{link.num}</span>
                  <div className="nav-text-wrapper">
                    <span className="nav-label">{link.label}</span>
                    <span className="nav-desc">{link.desc}</span>
                  </div>
                </a>
              ))}
            </nav>
          </div>

          {/* Right: Info Blocks */}
	          <div className={`premium-menu-info ${isDashboard ? "is-profile-menu" : "is-home-menu"}`}>
	            <div className="profile-menu-only premium-block profile-account-block">
	              <div className="profile-menu-avatar">AK</div>
	              <div>
	                <p className="premium-section-title">Shaxsiy kabinet</p>
	                <h3>Aziz Karimov</h3>
	                <p>Profil anketasi, sozlamalar, bron tarixi va saqlangan joylar bitta joyda.</p>
	              </div>
	              <div className="profile-menu-actions">
	                <a href="#profile" className="premium-btn primary" onClick={onClose}>
	                  Profilni ochish
	                </a>
	                <a href="#settings" className="premium-btn outline" onClick={onClose}>
	                  Sozlamalar
	                </a>
	              </div>
	            </div>

	            <div className="profile-menu-only profile-dashboard-grid">
	              <a href="#profile" className="premium-block profile-quick-card" onClick={onClose}>
	                <span>01</span>
	                <h3>Anketa</h3>
	                <p>Shaxsiy ma'lumotlar va Joyzone profilini to'ldirish.</p>
	              </a>
	              <a href="#settings" className="premium-block profile-quick-card" onClick={onClose}>
	                <span>02</span>
	                <h3>Akkaunt sozlamalari</h3>
	                <p>Xavfsizlik, aloqa, til, to'lov va bildirishnomalar.</p>
	              </a>
	              <a href="#filter" className="premium-block profile-quick-card" onClick={onClose}>
	                <span>03</span>
	                <h3>Joy qidirish</h3>
	                <p>Yangi ofis, kovorking yoki zalni tez topish.</p>
	              </a>
	              <button className="premium-block profile-quick-card profile-logout-card" onClick={() => { setUserState({ isAuthed: false, isPartner: false }); onClose(); }}>
	                <span>04</span>
	                <h3>Chiqish</h3>
	                <p>Akkauntdan chiqish va bosh sahifaga qaytish.</p>
	              </button>
	            </div>
	            
	            {/* Partner Block */}
            <div className="premium-block partner-block">
              <div className="partner-content">
                <div className="partner-badge">Hamkorlik</div>
	                <h3>{isDashboard ? "Kabinetni boshqaring" : "Joyingizni ijaraga bering"}</h3>
	                <p>{isDashboard ? "Barcha bronlar, narxlar, e'lonlar va dialoglar bitta boshqaruv maydonida." : "Joyzone tizimiga qo'shiling va o'z ofis, kovorking yoki zallaringizni ijaraga berib, barqaror daromad toping."}</p>
	                <a href={isDashboard ? "#profile" : "#partner-start"} className="premium-btn primary" onClick={onClose}>
	                  {isDashboard ? "Profilga o'tish" : "Hamkor bo'lish"}
                  <span className="btn-arrow">→</span>
                </a>
              </div>
              <div className="partner-bg-shape"></div>
            </div>

            <div className="premium-info-grid">
              {/* Contacts Block */}
              <div className="premium-block contacts-block">
                <p className="premium-section-title">Kontaktlar</p>
                <div className="contact-items">
                  <a href="tel:+998711234567" className="contact-link">
                    <div className="contact-icon-wrapper">📞</div>
                    <div className="contact-text">
                      <span className="contact-hint">Telefon</span>
                      <span className="contact-val">+998 71 123 45 67</span>
                    </div>
                  </a>
                  <a href="mailto:info@joyzone.uz" className="contact-link">
                    <div className="contact-icon-wrapper">✉️</div>
                    <div className="contact-text">
                      <span className="contact-hint">E-mail</span>
                      <span className="contact-val">info@joyzone.uz</span>
                    </div>
                  </a>
                  <div className="contact-link location">
                    <div className="contact-icon-wrapper">📍</div>
                    <div className="contact-text">
                      <span className="contact-hint">Manzil</span>
                      <span className="contact-val">Toshkent sh., Chilonzor 12</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Social & User Block */}
              <div className="premium-block user-block">
                <p className="premium-section-title">Profil va faollik</p>
                
                {userState.isAuthed ? (
                  <div className="profile-stats">
                    <div className="stat-item">
                      <span className="stat-icon">❤️</span>
                      <div className="stat-text">
                        <span className="stat-label">Saqlanganlar</span>
                        <span className="stat-val">12 ta joy</span>
                      </div>
                    </div>
                    <div className="stat-item">
                      <span className="stat-icon">📅</span>
                      <div className="stat-text">
                        <span className="stat-label">Mening bandlarim</span>
                        <span className="stat-val">2 ta faol</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="guest-promo">
                    <p>Platformaning barcha imkoniyatlaridan foydalanish uchun ro'yxatdan o'ting.</p>
                  </div>
                )}

                <div className="social-links" style={{ marginTop: '16px' }}>
                  <a href="#tg" className="social-btn tg">Telegram</a>
                  <a href="#ig" className="social-btn ig">Instagram</a>
                  <a href="#fb" className="social-btn fb">Facebook</a>
                </div>
                
	                  <div className="user-actions">
	                  {userState.isAuthed ? (
	                    <>
	                      <a href={userState.isPartner ? "#partner" : "#profile"} className="premium-btn outline" onClick={onClose}>
	                        Shaxsiy kabinet
	                      </a>
	                      <a href="#settings" className="premium-btn outline" onClick={onClose}>
	                        Sozlamalar
	                      </a>
	                      <button className="premium-btn ghost" onClick={() => { setUserState({ isAuthed: false, isPartner: false }); onClose(); }}>
	                        Chiqish
	                      </button>
	                    </>
                  ) : (
                    <>
                      <a href="#login" className="premium-btn primary" onClick={onClose}>
                        Tizimga kirish
                      </a>
                      <a href="#register" className="premium-btn outline" onClick={onClose}>
                        Ro'yxatdan o'tish
                      </a>
                    </>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function FilterSelect({ name, label, unit, options, openFilter, setOpenFilter }) {
  const [value, setValue] = useState("");
  const [openAbove, setOpenAbove] = useState(false);
  const containerRef = useRef(null);
  const isOpen = openFilter === name;

  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const timer = setTimeout(() => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const dropdownHeight = 170; // approximate height of dropdown
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      // Open above if not enough space below (with buffer)
      setOpenAbove(spaceBelow < dropdownHeight && spaceAbove > dropdownHeight);
    }, 0);

    return () => clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpenFilter(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, setOpenFilter]);

  return (
    <div ref={containerRef} className={`filter-select ${isOpen ? "open" : ""} ${value ? "has-value" : ""} ${openAbove ? "open-above" : ""}`}>
      <div className="filter-header" onClick={() => setOpenFilter(isOpen ? null : name)}>
        <span className="filter-label">{label}</span>
        <span className="filter-value">{value} {unit}</span>
        <svg width="12" height="8" viewBox="0 0 12 8" aria-hidden="true">
          <path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      </div>
      <div className="filter-dropdown">
        <ul className="options">
          {options.map((option) => (
            <li key={option} onClick={() => { setValue(option); setOpenFilter(null); }}>
              {option}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function PriceFilter() {
  const MIN = 0;
  const MAX = 3000000;
  const [minVal, setMinVal] = useState(0);
  const [maxVal, setMaxVal] = useState(1500000);
  const fillRef = useRef(null);

  useEffect(() => {
    if (!fillRef.current) return;
    const leftPct = (minVal / MAX) * 100;
    const rightPct = 100 - (maxVal / MAX) * 100;
    fillRef.current.style.left = `${leftPct}%`;
    fillRef.current.style.right = `${rightPct}%`;
  }, [minVal, maxVal]);

  const fmt = (v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v);

  return (
    <div className="price-filter">
      <div className="price-values">
        <div className="value-box">
          <input
            type="number"
            value={minVal}
            min={MIN}
            max={maxVal - 50000}
            onChange={(e) => setMinVal(Math.min(Number(e.target.value), maxVal - 50000))}
          />
          <span>so'm</span>
        </div>
        <span className="price-sep">—</span>
        <div className="value-box">
          <input
            type="number"
            value={maxVal}
            min={minVal + 50000}
            max={MAX}
            onChange={(e) => setMaxVal(Math.max(Number(e.target.value), minVal + 50000))}
          />
          <span>so'm</span>
        </div>
      </div>
      <div className="price-range-track">
        <span className="price-range-fill" ref={fillRef} />
        <input
          type="range"
          min={MIN}
          max={MAX}
          step={50000}
          value={minVal}
          onChange={(e) => setMinVal(Math.min(Number(e.target.value), maxVal - 50000))}
        />
        <input
          type="range"
          min={MIN}
          max={MAX}
          step={50000}
          value={maxVal}
          onChange={(e) => setMaxVal(Math.max(Number(e.target.value), minVal + 50000))}
        />
      </div>
    </div>
  );
}


function Banner({ slides }) {
  const [activeTab, setActiveTab] = useState("barchasi");
  const [typingText, setTypingText] = useState("ofislar");
  const [cursorVisible, setCursorVisible] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [locationOpenAbove, setLocationOpenAbove] = useState(false);
  const [openFilter, setOpenFilter] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const typingRef = useRef(null);
  const cursorRef = useRef(null);
  const wordIndexRef = useRef(0);
  const charIndexRef = useRef(7);
  const isDeletingRef = useRef(false);
  const locationSelectRef = useRef(null);
  const words = ["ofislar", "kovorking", "zallar", "joylar"];

  // Handle location dropdown position
  useEffect(() => {
    if (!isLocationOpen || !locationSelectRef.current) return;

    const timer = setTimeout(() => {
      const rect = locationSelectRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const dropdownHeight = 250; // approximate height of location dropdown
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      setLocationOpenAbove(spaceBelow < dropdownHeight && spaceAbove > dropdownHeight);
    }, 0);

    return () => clearTimeout(timer);
  }, [isLocationOpen]);

  // Handle click outside for location dropdown
  useEffect(() => {
    if (!isLocationOpen) return;

    const handleClickOutside = (event) => {
      if (locationSelectRef.current && !locationSelectRef.current.contains(event.target)) {
        setIsLocationOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isLocationOpen]);

  useEffect(() => {
    const cursorInterval = window.setInterval(() => setCursorVisible((current) => !current), 530);
    charIndexRef.current = 0;
    setTypingText("");
    const isPausedRef = { current: false };

    const type = () => {
      if (isPausedRef.current) return;
      const currentWord = words[wordIndexRef.current];
      if (isDeletingRef.current) {
        charIndexRef.current -= 1;
        setTypingText(currentWord.substring(0, charIndexRef.current));
        if (charIndexRef.current === 0) {
          isDeletingRef.current = false;
          wordIndexRef.current = (wordIndexRef.current + 1) % words.length;
          isPausedRef.current = true;
          typingRef.current = window.setTimeout(() => { isPausedRef.current = false; type(); }, 500);
        } else {
          typingRef.current = window.setTimeout(type, 55);
        }
      } else {
        charIndexRef.current += 1;
        setTypingText(currentWord.substring(0, charIndexRef.current));
        if (charIndexRef.current === currentWord.length) {
          isPausedRef.current = true;
          typingRef.current = window.setTimeout(() => {
            isPausedRef.current = false;
            isDeletingRef.current = true;
            type();
          }, 2000);
        } else {
          typingRef.current = window.setTimeout(type, 100);
        }
      }
    };
    typingRef.current = window.setTimeout(type, 600);
    cursorRef.current = cursorInterval;
    return () => {
      window.clearInterval(cursorInterval);
      window.clearTimeout(typingRef.current);
    };
  }, []);


  const locationOptions = ["Toshkent", "Samarqand", "Buxoro", "Andijon", "Namangan", "Farg'ona"].filter((location) =>
    location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <section className="banner-section">
      <div className="banner">
        <div className="container-fluid">
          <div className="row equal-cols">
            <div className="col-lg-6">
              <div className="info d-flex flex-column">
                <h1 className="title">
                  <span className="static-text">O'zbekiston </span>
                  bo'ylab
                  <br />
                  qulay
                  <span className="typing"> {typingText}</span>
                  <span className={`cursor ${cursorVisible ? "blink" : ""}`}>|</span>
                </h1>
                <p className="desc">
                  Tadbirkorlardan tortib global korxonalargacha butun dunyo bo'ylab yarim million a'zoga ega Tadbirkorlardan tortib global korxonalargacha butun dunyo bo'ylab
                </p>

                <div className="filter">
                  <div className="filter-tabs">
                    {tabs.map((tab) => (
                      <button key={tab.id} className={`tab ${activeTab === tab.id ? "active" : ""}`} onClick={() => setActiveTab(tab.id)} type="button">
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  <div className="custom-hr" />
                  <div className="filter-content">
                    <div className="tab-content active">
                      <div className="filter-options">
                        {(filters[activeTab] || filters.barchasi).map((filter) => (
                          <FilterSelect key={filter.name} {...filter} openFilter={openFilter} setOpenFilter={setOpenFilter} />
                        ))}
                        <PriceFilter />
                      </div>
                    </div>
                  </div>

                  <div className="custom-select-wrapper">
                    <div ref={locationSelectRef} className={`custom-select ${isLocationOpen ? "open" : ""} ${locationOpenAbove ? "open-above" : ""}`}>
                      <div className="selected" onClick={() => setIsLocationOpen((current) => !current)}>
                        <img height="38" src={kvIcon} alt="" />
                        <span>{selectedLocation || "Manzilni tanlang"}</span>
                      </div>
                      <div className="dropdown">
                        <input className="search-input" value={searchQuery} placeholder="Qidirish..." onChange={(event) => setSearchQuery(event.target.value)} />
                        <ul className="options">
                          {locationOptions.map((location) => (
                            <li key={location} onClick={() => { setSelectedLocation(location); setIsLocationOpen(false); }}>
                              {location}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <button className="search-btn btn-shine" type="button">Izlash</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-6">
              <div className="img-slider">
                <JoySlider items={slides} interval={4600} />
              </div>
              <div className="infoForReg">
                <div className="info-text">
                  <h2 className="title">Joyzone — bu faqat ijara emas.</h2>
                  <div className="desc">
                    <p>Bu joyda siz o'zingizning ofisingiz, kovorkingingiz yoki joyingizni joylashtirishingiz mumkin.</p>
                  </div>
                </div>
                <a href="#partner-guide" className="btn info-btn btn-shine">Batafsil</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function HomeHero({ userState, setUserState, slides }) {
  useEffect(() => {
    gsap.fromTo(".joy-header > .container-fluid, .banner .img-slider", { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.72, stagger: 0.06, ease: "power3.out" });
    gsap.fromTo(".banner .info, .infoForReg", { opacity: 0 }, { opacity: 1, duration: 0.72, ease: "power3.out" });

    const heroTexts = gsap.utils.toArray(".banner .info h1, .banner .info p.desc, .infoForReg .info-text h2.title, .infoForReg .desc p");
    heroTexts.forEach(text => {
      gsap.fromTo(text,
        { clipPath: "inset(0 100% 0 0)", opacity: 0 },
        {
          clipPath: "inset(0 0% 0 0)",
          opacity: 1,
          duration: 1.2,
          ease: "power3.inOut",
          delay: 0.1
        }
      );
    });
    const hero = document.querySelector(".home-viewport");
    const image = document.querySelector(".banner .img-slider");
    const info = document.querySelector(".banner .info");
    const promo = document.querySelector(".infoForReg");

    const listings = document.querySelector(".listings-section");
    if (!listings) {
      return () => {
        // Cleanup
      };
    }
    let snapTween;
    let lastY = window.scrollY;
    let isSnapping = false;
    const snapTo = (target) => {
      if (isSnapping || Math.abs(window.scrollY - target) < 8) return;
      isSnapping = true;
      snapTween?.kill();
      const scrollState = { y: window.scrollY };
      snapTween = gsap.to(scrollState, {
        y: target,
        duration: 1,
        ease: "power2.inOut",
        onUpdate: () => window.scrollTo(0, scrollState.y),
        onComplete: () => {
          isSnapping = false;
          lastY = window.scrollY;
        },
        onInterrupt: () => {
          isSnapping = false;
        }
      });
    };
    const handleWheel = (event) => {
      const y = window.scrollY;
      const viewport = window.innerHeight;
      if (isSnapping) {
        event.preventDefault();
        return;
      }
      if (event.deltaY > 0 && y < viewport - 24) {
        event.preventDefault();
        snapTo(viewport);
      } else if (event.deltaY < 0 && y > 0 && y <= viewport + 64) {
        event.preventDefault();
        snapTo(0);
      }
    };
    const handleScroll = () => {
      if (isSnapping) return;
      const y = window.scrollY;
      const viewport = window.innerHeight;
      const direction = y > lastY ? "down" : "up";
      if (direction === "down" && y >= 96 && y < viewport - 24) snapTo(viewport);
      if (direction === "up" && y <= viewport - 96 && y > viewport * 0.34) snapTo(0);
      lastY = y;
    };
    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("scroll", handleScroll);
      snapTween?.kill();
    };
  }, []);

  return (
    <main className="home-shell">
      <Header userState={userState} setUserState={setUserState} activeIndex={0} />
      <div className="home-viewport">
        <Banner slides={slides} />
      </div>
      <ListingsSection />
    </main>
  );
}
