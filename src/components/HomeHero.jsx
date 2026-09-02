import React, { useEffect, useRef, useState, useContext } from "react";
import { createPortal } from "react-dom";
import { gsap } from "gsap";
import axios from "axios";
import { LanguageContext } from "../App.jsx";
import BottomSheet from "./ui/BottomSheet.jsx";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 900);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 900);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return isMobile;
}
import JoySlider from "./JoySlider.jsx";
import ListingsSection from "./ListingsSection.jsx";
import { propertyCards } from "../data/content.js";
import logoImage from "../assets/img/Logo.png";
import kvIcon from "../assets/img/kv.svg";
import "./HomeHero.css";

const navLinks = [
  { href: "#home", label: "Bosh sahifa" },
  { href: "#about-us", label: "Biz haqimizda" },
  { href: "#filter", label: "Ijaraga joylar" },
  { href: "#faq", label: "FAQ" },
  { href: "#contact", label: "Kontaktlar" }
];

const dashboardNavLinks = [
  { href: "#host-today", label: "Bugun" },
  { href: "#host-calendar", label: "Grafik" },
  { href: "#host-listings", label: "Mening joylarim" },
  { href: "#host-messages", label: "Xabarlar" },
  { href: "#host-tariffs", label: "Tariflar" }
];


// Sub-categories per main category
const subCategories = {
  barchasi: [],
  ofis: ["Xususiy kabinet", "Open space", "Virtual ofis"],
  kovorking: ["Belgilangan joy", "Erkin joy (hot desk)"],
  zal: ["Konferensiya zali", "Trening / seminar zali", "Banket / tantana zali"],
  tijorat: ["Do'kon / savdo", "Showroom", "Ombor"],
  turarjoy: ["Kvartira", "Xona", "Uy / Kottej"]
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

function MobileBottomMenu({ userState, isMenuOpen, setIsMenuOpen, variant }) {
  const isDashboard = variant === "dashboard";
  const statusHref = userState.isAuthed ? (userState.isPartner ? "#partner" : "#profile") : "#login";

  return createPortal(
    <div className="mobile-bottom-menu">
      {isDashboard ? (
        <>
          <a href="#home" className="mobile-menu-item">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
            <span>Asosiy</span>
          </a>
          <a href="#host-today" className="mobile-menu-item">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span>Bugun</span>
          </a>
          <a href="#host-calendar" className="mobile-menu-item">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="14" x2="16" y2="14"/><line x1="8" y1="18" x2="12" y2="18"/></svg>
            <span>Grafik</span>
          </a>
          <a href="#host-messages" className="mobile-menu-item">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <span>Xabarlar</span>
          </a>
          <button className={`mobile-menu-item burger-btn ${isMenuOpen ? "active" : ""}`} onClick={() => setIsMenuOpen(!isMenuOpen)}>
            <MenuIcon open={isMenuOpen} />
            <span>Menyu</span>
          </button>
        </>
      ) : (
        <>
          <a href="#home" className="mobile-menu-item active">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
            <span>Asosiy</span>
          </a>
          <a href="#filter" className="mobile-menu-item">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <span>Izlash</span>
          </a>
          <a href={statusHref} className="mobile-menu-item">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            <span>Profil</span>
          </a>
          <button className={`mobile-menu-item burger-btn ${isMenuOpen ? "active" : ""}`} onClick={() => setIsMenuOpen(!isMenuOpen)}>
            <MenuIcon open={isMenuOpen} />
            <span>Menyu</span>
          </button>
        </>
      )}
    </div>,
    document.body
  );
}


export function Header({ userState, setUserState, activeIndex = 0, variant = "default" }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { lang, setLang, content } = useContext(LanguageContext);
  const navRef = useRef(null);
  const waveRef = useRef(null);
  const headerRef = useRef(null);
  const isDashboard = variant === "dashboard";
  
  const db = content && content[lang] ? content[lang] : {};
  let currentNavLinks = navLinks;
  if (db.nav_links_arr && Array.isArray(db.nav_links_arr)) {
    currentNavLinks = db.nav_links_arr;
  }
  
  const navigationLinks = isDashboard ? dashboardNavLinks : currentNavLinks;

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

    const activeLink = activeIndex >= 0 && activeIndex < links.length ? links[activeIndex] : null;

    if (activeLink) {
      gsap.set(wave, { opacity: 1 });
      moveWave(activeLink);
    } else {
      gsap.set(wave, { opacity: 0, width: 0 });
    }

    const listeners = [];
    links.forEach((link) => {
      const listener = () => {
        gsap.to(wave, { opacity: 1, duration: 0.3 });
        moveWave(link);
      };
      link.addEventListener("mouseenter", listener);
      listeners.push([link, listener]);
    });

    const leaveListener = () => {
      if (activeLink) {
        moveWave(activeLink);
      } else {
        gsap.to(wave, { opacity: 0, width: 0, duration: 0.5, ease: "power3.out" });
      }
    };
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

              <div className="nav-right d-flex align-items-center">
                <a className="login-button btn-shine" href={statusHref}>
                  <span className="nav-btn-avatar">
                    {userState.avatar ? (
                      <img src={userState.avatar} alt="User" />
                    ) : userState.isAuthed && userState.name ? (
                      <span>{userState.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}</span>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    )}
                  </span>
                  <span>{statusLabel}</span>
                </a>
                <button className={`burger-menu ${isMenuOpen ? "open" : ""}`} type="button" onClick={() => setIsMenuOpen(true)} aria-label="Menyuni ochish">
                  <MenuIcon open={isMenuOpen} />
                </button>
              </div>
            </nav>
          </div>
        </div>
      </header>
      <MobileBottomMenu userState={userState} isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} variant={variant} />
      <SideDrawer open={isMenuOpen} onClose={() => setIsMenuOpen(false)} userState={userState} setUserState={setUserState} variant={variant} />
    </>
  );
}

const menuNavLinks = [
  {
    id: "about",
    href: "#about-us",
    label: "Biz haqimizda",
    num: "01",
    desc: "Kompaniya haqida",
    icon: "info",
    subLinks: [
      { href: "#mobile-info", label: "Afzalliklar va FAQ", desc: "Joyzone haqida batafsil" },
      { href: "#partner-guide", label: "Hamkorlar qo'llanmasi", desc: "Joy egasi uchun yo'l xaritasi" }
    ]
  },
  {
    id: "spaces",
    href: "#filter",
    label: "Ijaraga joylar",
    num: "02",
    desc: "Katalog",
    icon: "search",
    subLinks: [
      { href: "#filter", label: "Ofis va kovorkinglar", desc: "Katalogni ochish" },
      { href: "#partner", label: "Joy qo'shish", desc: "Mulkdor bo'lish" }
    ]
  },
  { id: "saved", href: "#profile", label: "Saqlangan", num: "03", desc: "Yoqtirgan joylar", icon: "heart", requiresAuth: true },
  { id: "contact", href: "#contact", label: "Kontaktlar", num: "04", desc: "Bog'lanish", icon: "contact" }
];

const profileMenuLinks = [
  { id: "profile", href: "#profile", label: "Profilim", num: "01", desc: "Shaxsiy ma'lumotlar", icon: "user" },
  { id: "listings", href: "#host-listings", label: "Mening joylarim", num: "02", desc: "Mulklar va ofislar", icon: "partner" },
  { id: "saved", href: "#profile", label: "Saqlangan", num: "03", desc: "Yoqtirgan joylar", icon: "heart" },
  { id: "search", href: "#filter", label: "Joy qidirish", num: "04", desc: "Ofis va kovorkinglar katalogi", icon: "search" }
];

/* SVG icons for profile actions */
const IconUser = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
const IconSettings = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);
const IconSearch = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const IconHeart = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);
const IconInfo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
  </svg>
);
const IconBriefcase = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 13h18"/>
  </svg>
);
const IconHome = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/>
  </svg>
);
const IconLogout = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);
const IconPhone = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.59 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.18 6.18l1.27-.9a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
);
const IconMail = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
  </svg>
);

const profileNavIcons = {
  "Profilim": <IconUser />,
  "Mening joylarim": <IconBriefcase />,
  "Saqlangan": <IconHeart />,
  "Joy qidirish": <IconSearch />
};

const menuIconMap = {
  home: <IconHome />,
  info: <IconInfo />,
  search: <IconSearch />,
  heart: <IconHeart />,
  contact: <IconPhone />,
  user: <IconUser />,
  settings: <IconSettings />,
  partner: <IconBriefcase />
};

const mobileQuickActions = [
  { href: "#filter", label: "Joy topish", desc: "Katalog", icon: <IconSearch /> },
  { href: "#partner", label: "Joy qo'shish", desc: "Hamkorlik", icon: <IconBriefcase /> }
];

function SideDrawer({ open, onClose, userState, setUserState, variant = "default" }) {
  const { lang, setLang } = useContext(LanguageContext);
  const overlayRef = useRef(null);
  const bgRef = useRef(null);
  const tlRef = useRef(null);
  const [activeSubmenuId, setActiveSubmenuId] = useState(null);
  const isDashboard = variant === "dashboard";
  const currentMenuLinks = isDashboard ? profileMenuLinks : menuNavLinks;
  const activeSubmenu = currentMenuLinks.find((link) => link.id === activeSubmenuId);

  const resolveLinkHref = (link) => (link.requiresAuth && !userState.isAuthed ? "#login" : link.href);
  const closeDrawer = () => {
    setActiveSubmenuId(null);
    onClose();
  };
  const handleLogout = () => {
    setUserState({ isAuthed: false, isPartner: false });
    localStorage.removeItem("joyzone-access");
    localStorage.removeItem("joyzone-refresh");
    closeDrawer();
    window.location.hash = "login";
  };

  useEffect(() => {
    const overlay = overlayRef.current;
    const bg = bgRef.current;
    if (!overlay || !bg) return;

    if (open) {
      document.body.classList.add("is-menu-open");
      gsap.set(overlay, { display: "flex", pointerEvents: "auto" });
      document.body.style.overflow = "hidden";

      tlRef.current = gsap.timeline({ defaults: { ease: "power4.out" } });
      tlRef.current.fromTo(overlay, { opacity: 0, backdropFilter: "blur(0px)" }, { opacity: 1, backdropFilter: "blur(12px)", duration: 0.4 })
                   .fromTo(bg, { x: "100%", opacity: 0 }, { x: "0%", opacity: 1, duration: 0.6 }, "-=0.2");
      
      tlRef.current.fromTo(".menu-nav-link", { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, stagger: 0.07 }, "-=0.25");
      tlRef.current.fromTo(".menu-sidebar-col, .menu-widget-partner, .menu-widget-user, .menu-widget-auth", { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, stagger: 0.06 }, "-=0.3");
    } else {
      document.body.classList.remove("is-menu-open");
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

  useEffect(() => () => { 
    document.body.style.overflow = ""; 
    document.body.classList.remove("is-menu-open");
  }, []);

  useEffect(() => {
    if (!open) setActiveSubmenuId(null);
  }, [open]);

  return createPortal(
    <div
      ref={overlayRef}
      className="premium-menu-overlay"
      style={{ display: "none", pointerEvents: "none" }}
      onClick={onClose}
    >
      <div ref={bgRef} className={`premium-menu-container ${isDashboard ? "menu-dashboard" : "menu-public"}`} onClick={(e) => e.stopPropagation()}>
        
        {/* Left Column: Sidebar (Branding, contacts, social) */}
        <div className="menu-sidebar-col">
          <div className="menu-sidebar-logo-area">
            <img src={logoImage} alt="Joyzone" className="premium-menu-logo" />
          </div>
          
          <div className="menu-sidebar-content">
            <div className="menu-sidebar-quote">
              <span className="menu-sidebar-tagline">Premium Spaces</span>
              <h3>O'zbekistondagi eng yaxshi ofislar, kovorkinglar va dam olish maskanlari</h3>
            </div>
            
            <div className="menu-sidebar-footer">
              <div className="menu-sidebar-contacts">
                <a href="tel:+998711234567" className="menu-sidebar-contact-item">
                  <span className="icon"><IconPhone /></span>
                  <div className="text">
                    <small>Ishonch telefoni</small>
                    <strong>+998 71 123 45 67</strong>
                  </div>
                </a>
                <a href="mailto:info@joyzone.uz" className="menu-sidebar-contact-item">
                  <span className="icon"><IconMail /></span>
                  <div className="text">
                    <small>Elektron pochta</small>
                    <strong>info@joyzone.uz</strong>
                  </div>
                </a>
              </div>
              
              <div className="menu-sidebar-socials">
                <a href="https://t.me/joyzone" target="_blank" rel="noreferrer" className="menu-social-btn-link">Telegram</a>
                <a href="https://instagram.com/joyzone" target="_blank" rel="noreferrer" className="menu-social-btn-link">Instagram</a>
                <a href="https://facebook.com/joyzone" target="_blank" rel="noreferrer" className="menu-social-btn-link">Facebook</a>
              </div>

              <div className="menu-sidebar-copyright">
                <span>© {new Date().getFullYear()} Joyzone.</span>
                <span>Powered by IT Comfort.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Navigation & user panel */}
        <div className="menu-main-col">
          <div className="menu-main-header">
            <img src={logoImage} alt="Joyzone" className="premium-menu-logo mobile-only-logo" />
            
            {/* White & Orange Pill Language Switcher (UZ / RU / EN) placed to the left */}
            <div className="drawer-lang-pill me-auto">
              <button 
                type="button" 
                className={`drawer-lang-btn ${lang === 'uz' ? 'is-active' : ''}`}
                onClick={() => setLang('uz')}
              >
                UZ
              </button>
              <button 
                type="button" 
                className={`drawer-lang-btn ${lang === 'ru' ? 'is-active' : ''}`}
                onClick={() => setLang('ru')}
              >
                RU
              </button>
              <button 
                type="button" 
                className={`drawer-lang-btn ${lang === 'en' ? 'is-active' : ''}`}
                onClick={() => setLang('en')}
              >
                EN
              </button>
            </div>

              <button className="menu-close-btn ms-auto" onClick={onClose} aria-label="Yopish">
                <span className="menu-close-label">Yopish</span>
                <span className="menu-close-icon">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="1" y1="1" x2="13" y2="13"/><line x1="13" y1="1" x2="1" y2="13"/>
                  </svg>
                </span>
              </button>
          </div>

          <div className="menu-main-body">
            {activeSubmenu ? (
              <section className="menu-subview" aria-label={`${activeSubmenu.label} menyusi`}>
                <button type="button" className="menu-subview-back" onClick={() => setActiveSubmenuId(null)}>
                  <span className="menu-subview-back-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12,19 5,12 12,5"/>
                    </svg>
                  </span>
                  <span>Orqaga</span>
                </button>

                <div className="menu-subview-head">
                  <span className="menu-subview-head-icon">{menuIconMap[activeSubmenu.icon] || profileNavIcons[activeSubmenu.label]}</span>
                  <div>
                    <small>Ichki menyu</small>
                    <h3>{activeSubmenu.label}</h3>
                    <p>{activeSubmenu.desc}</p>
                  </div>
                </div>

                <div className="menu-subview-list">
                  {activeSubmenu.subLinks.map((sub, index) => (
                    <a key={sub.href} href={sub.href} className="menu-subview-item" onClick={closeDrawer}>
                      <span className="menu-subview-num">{String(index + 1).padStart(2, "0")}</span>
                      <span className="menu-subview-copy">
                        <strong>{sub.label}</strong>
                        <small>{sub.desc}</small>
                      </span>
                      <svg className="menu-nav-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/>
                      </svg>
                    </a>
                  ))}
                </div>
              </section>
            ) : (
              <>
                <div className="menu-mobile-hero">
                  <div className="menu-mobile-profile">
                    <div className="menu-mobile-avatar">
                      {userState.isAuthed && userState.name ? userState.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "JZ"}
                    </div>
                    <div>
                      <span>{userState.isAuthed ? "Akkaunt" : "Mehmon rejimi"}</span>
                      <strong>{userState.isAuthed ? (userState.name || "Foydalanuvchi") : "Joyzone"}</strong>
                    </div>
                  </div>
                  <a href={userState.isAuthed ? "#profile" : "#login"} className="menu-mobile-profile-link" onClick={closeDrawer}>
                    {userState.isAuthed ? "Kabinet" : "Kirish"}
                  </a>
                </div>

                <div className="menu-mobile-quick-actions" aria-label="Tezkor amallar">
                  {mobileQuickActions.map((action) => (
                    <a key={action.href} href={action.href} onClick={closeDrawer}>
                      <span>{action.icon}</span>
                      <div>
                        <strong>{action.label}</strong>
                        <small>{action.desc}</small>
                      </div>
                    </a>
                  ))}
                </div>

                <nav className="menu-nav">
                  <span className="menu-nav-eyebrow">{isDashboard ? "Profil bo'limlari" : "Navigatsiya"}</span>
                  <ul className="menu-nav-list">
                    {currentMenuLinks.map((link) => {
                      const icon = isDashboard ? profileNavIcons[link.label] : menuIconMap[link.icon];
                      return (
                        <li key={link.id || link.href}>
                          {link.subLinks ? (
                            <button type="button" className="menu-nav-link" onClick={() => setActiveSubmenuId(link.id)}>
                              <span className="menu-nav-num">{link.num}</span>
                              <span className="menu-nav-icon">{icon}</span>
                              <span className="menu-nav-copy">
                                <span className="menu-nav-label">{link.label}</span>
                                <span className="menu-nav-desc">{link.desc}</span>
                              </span>
                              <svg className="menu-nav-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/>
                              </svg>
                            </button>
                          ) : (
                            <a href={resolveLinkHref(link)} className="menu-nav-link" onClick={closeDrawer}>
                              <span className="menu-nav-num">{link.num}</span>
                              <span className="menu-nav-icon">{icon}</span>
                              <span className="menu-nav-copy">
                                <span className="menu-nav-label">{link.label}</span>
                                <span className="menu-nav-desc">{link.requiresAuth && !userState.isAuthed ? "Kirish talab qilinadi" : link.desc}</span>
                              </span>
                              <svg className="menu-nav-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/>
                              </svg>
                            </a>
                          )}
                        </li>
                      );
                    })}
                    {userState.isAuthed && (
                      <li>
                        <button type="button" className="menu-nav-link menu-nav-logout" onClick={handleLogout}>
                          <span className="menu-nav-num">{String(currentMenuLinks.length + 1).padStart(2, "0")}</span>
                          <span className="menu-nav-icon"><IconLogout /></span>
                          <span className="menu-nav-copy">
                            <span className="menu-nav-label">Chiqish</span>
                            <span className="menu-nav-desc">Akkauntdan chiqish</span>
                          </span>
                          <svg className="menu-nav-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/>
                          </svg>
                        </button>
                      </li>
                    )}
                  </ul>
                </nav>

                <div className="menu-main-footer">
                  {isDashboard ? (
                    <div className="menu-widget-user">
                      <div className="menu-user-avatar">
                        {userState.name ? userState.name.split(" ").map(n => n[0]).join("").toUpperCase() : "AK"}
                      </div>
                      <div className="menu-user-details">
                        <strong>{userState.name || "Aziz Karimov"}</strong>
                        <span>{userState.email || "aziz@gmail.com"}</span>
                      </div>
                      <a href="#profile" className="menu-user-profile-btn" onClick={closeDrawer}>
                        <IconUser /> Profile ochish
                      </a>
                    </div>
                  ) : (
                    userState.isAuthed ? (
                      <div className="menu-widget-user">
                        <div className="menu-user-avatar">
                          {userState.name ? userState.name.split(" ").map(n => n[0]).join("").toUpperCase() : "AK"}
                        </div>
                        <div className="menu-user-details">
                          <strong>{userState.name || "Aziz Karimov"}</strong>
                          <span>{userState.email || "Mehmon"}</span>
                        </div>
                        <a href="#profile" className="menu-user-profile-btn" onClick={closeDrawer}>
                          <IconUser /> Kabinetga o'tish
                        </a>
                      </div>
                    ) : (
                      <div className="menu-widget-auth">
                        <p>Joyzone imkoniyatlaridan to'liq foydalanish uchun tizimga kiring</p>
                        <div className="menu-auth-buttons-row">
                          <a href="#login" className="menu-btn-auth-primary" onClick={closeDrawer}>Kirish</a>
                          <a href="#register" className="menu-btn-auth-secondary" onClick={closeDrawer}>Ro'yxatdan o'tish</a>
                        </div>
                      </div>
                    )
                  )}

                  {!isDashboard && (
                    <div className="menu-widget-partner">
                      <div className="partner-widget-content">
                        <span className="tag">Hamkorlar uchun</span>
                        <h4>Joyingiz bormi?</h4>
                        <p>Uni Joyzone-da e'lon qiling va daromad olishni boshlang</p>
                      </div>
                      <a href="#partner" className="partner-widget-cta" onClick={closeDrawer}>
                        Boshlash
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "6px" }}>
                          <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/>
                        </svg>
                      </a>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}

function FilterSelect({ name, label, unit, options, openFilter, setOpenFilter }) {
  const isMobile = useIsMobile();
  const [value, setValue] = useState("");
  const [openAbove, setOpenAbove] = useState(false);
  const containerRef = useRef(null);
  const isOpen = openFilter === name;

  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const timer = setTimeout(() => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const dHeight = dropdownRef.current ? dropdownRef.current.offsetHeight + 20 : 280;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      setOpenAbove(spaceBelow < dHeight && spaceAbove > spaceBelow);
    }, 10);

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
    <div ref={containerRef} className={`filter-select ${isOpen && !isMobile ? "open" : ""} ${value ? "has-value" : ""} ${openAbove ? "open-above" : ""}`}>
      <div className="filter-header" onClick={() => setOpenFilter(isOpen ? null : name)}>
        <span className="filter-label">{label}</span>
        <span className="filter-value">{value} {unit}</span>
        <svg width="12" height="8" viewBox="0 0 12 8" aria-hidden="true">
          <path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      </div>
      {isMobile ? (
        <BottomSheet isOpen={isOpen} onClose={() => setOpenFilter(null)} title={label}>
          <div style={{ padding: "0 16px 24px" }}>
            <ul className="options" style={{ background: "transparent", border: "none", boxShadow: "none", padding: 0 }}>
              {options.map((option) => {
                const isSelected = value === option;
                return (
                  <li 
                    key={option} 
                    className={`mobile-option-item ${isSelected ? "selected" : ""}`}
                    onClick={() => { setValue(option); setOpenFilter(null); }}
                  >
                    <span>{option}</span>
                    {isSelected && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ width: "18px", height: "18px", color: "#e46630" }}><path d="M20 6L9 17l-5-5"/></svg>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </BottomSheet>
      ) : (
        <div ref={dropdownRef} className="filter-dropdown">
          <ul className="options">
            {options.map((option, i) => (
              <li key={i} onClick={() => { setValue(option); setOpenFilter(null); }}>
                {option}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function MultiFilterSelect({ name, label, options, openFilter, setOpenFilter }) {
  const isMobile = useIsMobile();
  const [selected, setSelected] = useState([]);
  const [openAbove, setOpenAbove] = useState(false);
  const containerRef = useRef(null);
  const isOpen = openFilter === name;

  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !containerRef.current) return;
    const timer = setTimeout(() => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const dHeight = dropdownRef.current ? dropdownRef.current.offsetHeight + 20 : 300;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      setOpenAbove(spaceBelow < dHeight && spaceAbove > spaceBelow);
    }, 10);
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

  const toggleOption = (opt) => {
    setSelected(prev => prev.includes(opt) ? prev.filter(x => x !== opt) : [...prev, opt]);
  };

  const displayValue = selected.length === 0 ? "" : `${selected.length} выбрано`;

  return (
    <div ref={containerRef} className={`filter-select ${isOpen && !isMobile ? "open" : ""} ${displayValue ? "has-value" : ""} ${openAbove ? "open-above" : ""}`}>
      <div className="filter-header" onClick={() => setOpenFilter(isOpen ? null : name)}>
        <span className="filter-label">{label}</span>
        <span className="filter-value">{displayValue}</span>
        <svg width="12" height="8" viewBox="0 0 12 8" aria-hidden="true">
          <path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      </div>
      {isMobile ? (
        <BottomSheet isOpen={isOpen} onClose={() => setOpenFilter(null)} title={label}>
          <div className="filter-dropdown" style={{ position: "static", opacity: 1, visibility: "visible", boxShadow: "none", transform: "none", minWidth: "100%" }}>
            {options.map((opt, i) => {
              const isSelected = selected.includes(opt);
              return (
                <div key={i} className={`filter-option ${isSelected ? "selected" : ""}`} onClick={() => toggleOption(opt)} style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                  <span>{opt}</span>
                  <div className="checkbox-box">
                    {isSelected && <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ width: "12px", height: "12px" }}><path d="M20 6L9 17l-5-5"/></svg>}
                  </div>
                </div>
              );
            })}
          </div>
        </BottomSheet>
      ) : (
        <div ref={dropdownRef} className="filter-dropdown">
          {options.map((opt, i) => {
            const isSelected = selected.includes(opt);
            return (
              <div key={i} className={`filter-option ${isSelected ? "selected" : ""}`} onClick={() => toggleOption(opt)} style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                <span>{opt}</span>
                <div className="checkbox-box">
                  {isSelected && <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ width: "12px", height: "12px" }}><path d="M20 6L9 17l-5-5"/></svg>}
                </div>
              </div>
            );
          })}
        </div>
      )}
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
            type="text"
            value={minVal !== "" && minVal !== undefined ? new Intl.NumberFormat("ru-RU").format(minVal).replace(",", " ") : ""}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, "");
              const val = raw ? Number(raw) : 0;
              setMinVal(Math.min(val, maxVal - 50000));
            }}
          />
          <span>so'm</span>
        </div>
        <span className="price-sep">—</span>
        <div className="value-box">
          <input
            type="text"
            value={maxVal !== "" && maxVal !== undefined ? new Intl.NumberFormat("ru-RU").format(maxVal).replace(",", " ") : ""}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, "");
              const val = raw ? Number(raw) : 0;
              // If they type a small number, don't force it up instantly, allow typing.
              // Wait, we can just allow it, but cap it at MAX.
              setMaxVal(Math.min(val, MAX));
            }}
            onBlur={() => {
              // Constrain on blur
              if (maxVal < minVal + 50000) {
                setMaxVal(minVal + 50000);
              }
            }}
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
  const [categories, setCategories] = useState([]);
  useEffect(() => {
    axios.get('http://localhost:8000/api/categories/')
      .then(res => setCategories(res.data?.results || res.data || []))
      .catch(console.error);
  }, []);

  const tabs = [{ id: "barchasi", label: "Barchasi" }, ...categories.map(c => ({ id: c.id, label: c.name_ru }))];

  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState("barchasi");
  const activeCategory = categories.find(c => c.id === activeTab);
  const [selectedSubCat, setSelectedSubCat] = useState("");
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
  
  const [heroTitle, setHeroTitle] = useState("O'zbekiston bo'ylab\nqulay");
  const [heroSubtitle, setHeroSubtitle] = useState("Tadbirkorlardan tortib global korxonalargacha butun dunyo bo'ylab yarim million a'zoga ega Tadbirkorlardan tortib global korxonalargacha butun dunyo bo'ylab");
  const wordsRef = useRef(["ofislar", "kovorking", "zallar", "joylar"]);

  const { lang, content } = useContext(LanguageContext);

  useEffect(() => {
    if (content && content[lang]) {
      const data = content[lang];
      if (data.hero_animated_words) {
        const newWords = data.hero_animated_words.split(',').map(w => w.trim()).filter(Boolean);
        if (newWords.length > 0) wordsRef.current = newWords;
      }
      if (data.hero_title) setHeroTitle(data.hero_title);
      if (data.hero_subtitle) setHeroSubtitle(data.hero_subtitle);
    }
  }, [lang, content]);

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
      const currentWords = wordsRef.current;
      const safeIndex = wordIndexRef.current % currentWords.length;
      const currentWord = currentWords[safeIndex];
      
      if (isDeletingRef.current) {
        charIndexRef.current -= 1;
        setTypingText(currentWord.substring(0, charIndexRef.current));
        if (charIndexRef.current === 0) {
          isDeletingRef.current = false;
          wordIndexRef.current = (safeIndex + 1) % currentWords.length;
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


  const locationGroups = React.useMemo(() => {
    const groups = {};
    propertyCards.forEach(item => {
      if (!item.location) return;
      const parts = item.location.split(",").map(s => s.trim());
      const region = parts[0];
      if (region.toLowerCase() === "12/12a") return; // Temporary ignore
      
      const district = parts[1] || "";
      if (!groups[region]) groups[region] = [];
      if (district && !groups[region].includes(district)) {
        groups[region].push(district);
      }
    });
    // Add default popular regions if missing
    ["Toshkent", "Samarqand", "Buxoro", "Andijon", "Namangan", "Farg'ona"].forEach(r => {
      if (!groups[r]) groups[r] = [];
    });
    return groups;
  }, []);

  const [expandedRegion, setExpandedRegion] = useState(null);

  return (
    <section className="banner-section">
      <div className="banner">
        <div className="container-fluid">
          <div className="row equal-cols">
            <div className="col-lg-6">
              <div className="info d-flex flex-column">
                <h1 className="title">
                  <span className="static-text">{heroTitle.split('\n')[0].split(' ')[0]} </span>
                  {heroTitle.split('\n')[0].split(' ').slice(1).join(' ')}
                  {heroTitle.split('\n').length > 1 && (
                    <>
                      <br />
                      {heroTitle.split('\n').slice(1).join('\n')}
                    </>
                  )}
                  <span className="typing"> {typingText}</span>
                  <span className={`cursor ${cursorVisible ? "blink" : ""}`}>|</span>
                </h1>
                <p className="desc">
                  {heroSubtitle}
                </p>

                <div className="filter">
                  <div className="filter-tabs">
                    {tabs.map((tab) => (
                      <button
                        key={tab.id}
                        className={`tab ${activeTab === tab.id ? "active" : ""}`}
                        onClick={() => { setActiveTab(tab.id); setSelectedSubCat(""); }}
                        type="button"
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Sub-categories */}
                  {activeCategory?.subcategories && activeCategory.subcategories.length > 0 && (
                    <div className="filter-subcats">
                      {activeCategory.subcategories.map((sub) => (
                        <button
                          key={sub.id}
                          type="button"
                          className={`subcat-pill ${selectedSubCat === sub.id ? "active" : ""}`}
                          onClick={() => setSelectedSubCat(selectedSubCat === sub.id ? "" : sub.id)}
                        >
                          {sub.name_ru}
                          {selectedSubCat === sub.id && (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "14px", height: "14px", marginLeft: "4px", opacity: 0.8 }}><path d="M18 6 6 18M6 6l12 12"/></svg>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="filter-content">
                    <div className="tab-content active">
                      <div className="filter-options">
                        {activeTab === "barchasi" && (
                          <>
                            <FilterSelect name="capacity" label="Вместимость" unit="чел" options={["Любой", "Больше 1", "Больше 5", "Больше 10"]} openFilter={openFilter} setOpenFilter={setOpenFilter} />
                            <FilterSelect name="area" label="Площадь" unit="м²" options={["Любой", "Больше 10", "Больше 50", "Больше 100"]} openFilter={openFilter} setOpenFilter={setOpenFilter} />
                          </>
                        )}
                        
                        {/* Dynamic Filters from API */}
                        {(() => {
                           const params = selectedSubCat ? (activeCategory?.subcategories?.find(s => s.id === selectedSubCat)?.parameters || []) : [];
                           const characteristics = params.filter(p => p.type !== 'boolean' && p.type !== 'text');
                           const amenities = params.filter(p => p.type === 'boolean');
                           
                           return (
                             <>
                               {characteristics.map((p) => {
                                 let options = ["Любой"];
                                 if (p.type === 'counter' || p.type === 'select') {
                                    options = ["Любой", ...(Array.isArray(p.config?.options) ? p.config.options.map(o => o.ru || o.slug) : [])];
                                 }
                                 return (
                                   <FilterSelect key={p.slug} name={p.slug} label={p.name_ru} unit="" options={options} openFilter={openFilter} setOpenFilter={setOpenFilter} />
                                 );
                               })}
                               
                               {amenities.length > 0 && (
                                 <MultiFilterSelect 
                                   name="amenities_group" 
                                   label="Список удобств" 
                                   options={amenities.map(a => a.name_ru)} 
                                   openFilter={openFilter} 
                                   setOpenFilter={setOpenFilter} 
                                 />
                               )}
                             </>
                           );
                        })()}

                        {!selectedSubCat && activeTab !== "barchasi" && (
                           <div style={{ padding: "0 16px", color: "#64748b", fontSize: "14px", display: "flex", alignItems: "center" }}>Выберите подкатегорию для фильтров</div>
                        )}
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
                      {isMobile ? (
                        <BottomSheet isOpen={isLocationOpen} onClose={() => setIsLocationOpen(false)} title="Manzil">
                          <div className="dropdown" style={{ position: "static", opacity: 1, visibility: "visible", boxShadow: "none", transform: "none", width: "100%", padding: "0 16px 24px", maxHeight: "60vh", overflowY: "auto" }}>
                        <input className="search-input" value={searchQuery} placeholder="Qidirish..." onChange={(event) => setSearchQuery(event.target.value)} />
                        <ul className="options">
                          {Object.entries(locationGroups).map(([region, districts]) => {
                            const isMatch = region.toLowerCase().includes(searchQuery.toLowerCase()) || districts.some(d => d.toLowerCase().includes(searchQuery.toLowerCase()));
                            if (!isMatch) return null;

                            return (
                              <React.Fragment key={region}>
                                <li 
                                  className={`region-item ${expandedRegion === region ? 'expanded' : ''}`}
                                  style={{ display: "flex", padding: 0 }}
                                >
                                  <div 
                                    style={{ flex: 1, padding: "10px 12px", cursor: "pointer", fontWeight: expandedRegion === region ? "700" : "500", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                                    onClick={() => { setSelectedLocation(region); setIsLocationOpen(false); }}
                                  >
                                    <span>{region}</span>
                                    {selectedLocation === region && (
                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "16px", height: "16px", color: "#e46630" }}><path d="M20 6L9 17l-5-5"/></svg>
                                    )}
                                  </div>
                                  {districts.length > 0 && (
                                    <div 
                                      style={{ padding: "0 14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", borderLeft: "1px solid rgba(41, 74, 109, 0.08)" }}
                                      onClick={(e) => { e.stopPropagation(); setExpandedRegion(expandedRegion === region ? null : region); }}
                                    >
                                      <div style={{ transform: expandedRegion === region ? "rotate(180deg)" : "rotate(0deg)", transition: "0.2s", color: "rgba(41, 74, 109, 0.5)" }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                                      </div>
                                    </div>
                                  )}
                                </li>
                                {expandedRegion === region && districts.length > 0 && (
                                  <div 
                                    className="districts-list" 
                                    style={{ 
                                      margin: "2px 0 6px 14px", 
                                      padding: "4px 0 4px 10px", 
                                      borderLeft: "2px solid rgba(41, 74, 109, 0.08)",
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: "2px"
                                    }}
                                  >
                                    {districts.map(dist => {
                                      const fullLoc = `${region}, ${dist}`;
                                      const isSelected = selectedLocation === fullLoc;
                                      return (
                                        <li 
                                          key={dist} 
                                          className={`district-item ${isSelected ? 'selected' : ''}`}
                                          style={{ 
                                            padding: "8px 12px", 
                                            fontSize: "14px", 
                                            fontWeight: isSelected ? "600" : "500",
                                            border: "none",
                                            borderRadius: "8px",
                                            display: "flex", 
                                            justifyContent: "space-between", 
                                            alignItems: "center", 
                                            cursor: "pointer",
                                            transition: "all 0.2s ease"
                                          }}
                                          onClick={() => { setSelectedLocation(fullLoc); setIsLocationOpen(false); }}
                                        >
                                          <span>{dist}</span>
                                          {isSelected && (
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ width: "14px", height: "14px", color: "#e46630" }}><path d="M20 6L9 17l-5-5"/></svg>
                                          )}
                                        </li>
                                      );
                                    })}
                                  </div>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </ul>
                          </div>
                        </BottomSheet>
                      ) : (
                        <div className="dropdown">
                        <input className="search-input" value={searchQuery} placeholder="Qidirish..." onChange={(event) => setSearchQuery(event.target.value)} />
                        <ul className="options">
                          {Object.entries(locationGroups).map(([region, districts]) => {
                            const isMatch = region.toLowerCase().includes(searchQuery.toLowerCase()) || districts.some(d => d.toLowerCase().includes(searchQuery.toLowerCase()));
                            if (!isMatch) return null;

                            return (
                              <React.Fragment key={region}>
                                <li 
                                  className="region-item" 
                                  style={{ display: "flex", padding: 0, background: expandedRegion === region ? "#f8fafc" : "transparent" }}
                                >
                                  <div 
                                    style={{ flex: 1, padding: "10px 12px", cursor: "pointer", fontWeight: expandedRegion === region ? "700" : "500", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                                    onClick={() => { setSelectedLocation(region); setIsLocationOpen(false); }}
                                  >
                                    <span>{region}</span>
                                    {selectedLocation === region && (
                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "16px", height: "16px", color: "#e46630" }}><path d="M20 6L9 17l-5-5"/></svg>
                                    )}
                                  </div>
                                  {districts.length > 0 && (
                                    <div 
                                      style={{ padding: "0 14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", borderLeft: "1px solid rgba(41, 74, 109, 0.08)" }}
                                      onClick={(e) => { e.stopPropagation(); setExpandedRegion(expandedRegion === region ? null : region); }}
                                    >
                                      <div style={{ transform: expandedRegion === region ? "rotate(180deg)" : "rotate(0deg)", transition: "0.2s", color: "rgba(41, 74, 109, 0.5)" }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                                      </div>
                                    </div>
                                  )}
                                </li>
                                {expandedRegion === region && districts.length > 0 && (
                                  <div 
                                    className="districts-list" 
                                    style={{ 
                                      margin: "2px 0 6px 14px", 
                                      padding: "4px 0 4px 10px", 
                                      borderLeft: "2px solid rgba(41, 74, 109, 0.08)",
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: "2px"
                                    }}
                                  >
                                    {districts.map(dist => {
                                      const fullLoc = `${region}, ${dist}`;
                                      const isSelected = selectedLocation === fullLoc;
                                      return (
                                        <li 
                                          key={dist} 
                                          className={`district-item ${isSelected ? 'selected' : ''}`}
                                          style={{ 
                                            padding: "8px 12px", 
                                            fontSize: "14px", 
                                            fontWeight: isSelected ? "600" : "500",
                                            border: "none",
                                            borderRadius: "8px",
                                            display: "flex", 
                                            justifyContent: "space-between", 
                                            alignItems: "center", 
                                            cursor: "pointer",
                                            transition: "all 0.2s ease"
                                          }}
                                          onClick={() => { setSelectedLocation(fullLoc); setIsLocationOpen(false); }}
                                        >
                                          <span>{dist}</span>
                                          {isSelected && (
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ width: "14px", height: "14px", color: "#e46630" }}><path d="M20 6L9 17l-5-5"/></svg>
                                          )}
                                        </li>
                                      );
                                    })}
                                  </div>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </ul>
                        </div>
                      )}
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
      if (window.innerWidth <= 992) return;
      if (event.target.closest('.dropdown, .options, .filter-dropdown, .districts-list')) {
        return;
      }
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
      if (window.innerWidth <= 992) return;
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
