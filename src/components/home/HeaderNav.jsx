import { mailHref, phoneHref, socialLinks } from "../../utils/cmsLinks.js";
import React, { useEffect, useRef, useState, useContext } from "react";
import { createPortal } from "react-dom";
import { gsap } from "gsap";
import { logoutSession } from "../../api/client.js";
import { LanguageContext } from "../../context/LanguageContext.jsx";
import { getStorageItem, STORAGE_KEYS } from "../../utils/storageKeys.js";
import logoImage from "../../assets/img/Logo.png";
import { navigate } from "../../utils/router.js";

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 900);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 900);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return isMobile;
}

export const navLinks = [
  { href: "/", label: "Bosh sahifa" },
  { href: "/about-us", label: "Biz haqimizda" },
  { href: "/filter", label: "Ijaraga joylar" },
  { href: "#faq", label: "FAQ" },
  { href: "#contact", label: "Kontaktlar" }
];

export const dashboardNavLinks = [
  { href: "/host-today", label: "Bugun" },
  { href: "/host-calendar", label: "Grafik" },
  { href: "/host-listings", label: "Mening joylarim" },
  { href: "/host-messages", label: "Xabarlar" },
  { href: "/host-tariffs", label: "Tariflar" }
];

export function MenuIcon({ open = false }) {
  return (
    <span className={`burger-lines ${open ? "is-open" : ""}`} aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

export function MobileBottomMenu({ userState, isMenuOpen, setIsMenuOpen, variant }) {
  const isDashboard = variant === "dashboard";
  const statusHref = userState.isAuthed ? (userState.isPartner ? "/partner" : "/profile") : "/login";

  return createPortal(
    <div className="mobile-bottom-menu">
      {isDashboard ? (
        <>
          <a href="/" className="mobile-menu-item">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
            <span>Asosiy</span>
          </a>
          <a href="/host-today" className="mobile-menu-item">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span>Bugun</span>
          </a>
          <a href="/host-calendar" className="mobile-menu-item">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="14" x2="16" y2="14"/><line x1="8" y1="18" x2="12" y2="18"/></svg>
            <span>Grafik</span>
          </a>
          <a href="/host-messages" className="mobile-menu-item">
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
          <a href="/" className="mobile-menu-item active">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
            <span>Asosiy</span>
          </a>
          <a href="/filter" className="mobile-menu-item">
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

  const statusLabel = isDashboard
    ? "Home"
    : userState.isAuthed
      ? (userState.isPartner ? "Partner" : (db.nav_profile || "Profil"))
      : (db.nav_login || "Kirish");
  const statusHref = isDashboard ? "/" : userState.isAuthed ? (userState.isPartner ? "/partner" : "/profile") : "/login";

  return (
    <>
      <header ref={headerRef} className={`joy-header ${isDashboard ? "joy-header-dashboard" : ""}`}>
        <div className="container-fluid">
          <div className="nav-hover-zone">
            <nav className="navbar d-flex justify-content-between align-items-center">
              <a href="/" className="logo">
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

export const menuNavLinks = [
  {
    id: "about",
    href: "/about-us",
    label: "Biz haqimizda",
    num: "01",
    desc: "Kompaniya haqida",
    icon: "info",
    subLinks: [
      { id: "info", href: "/mobile-info", label: "Afzalliklar va FAQ", desc: "Joyzone haqida batafsil" },
      { id: "guide", href: "/partner-guide", label: "Hamkorlar qo'llanmasi", desc: "Joy egasi uchun yo'l xaritasi" }
    ]
  },
  {
    id: "spaces",
    href: "/filter",
    label: "Ijaraga joylar",
    num: "02",
    desc: "Katalog",
    icon: "search",
    subLinks: [
      { id: "catalog", href: "/filter", label: "Ofis va kovorkinglar", desc: "Katalogni ochish" },
      { id: "add", href: "/partner", label: "Joy qo'shish", desc: "Mulkdor bo'lish" }
    ]
  },
  { id: "saved", href: "/profile", label: "Saqlangan", num: "03", desc: "Yoqtirgan joylar", icon: "heart", requiresAuth: true },
  { id: "contact", href: "#contact", label: "Kontaktlar", num: "04", desc: "Bog'lanish", icon: "contact" }
];

export const profileMenuLinks = [
  { id: "profile", href: "/profile", label: "Profilim", num: "01", desc: "Shaxsiy ma'lumotlar", icon: "user" },
  { id: "listings", href: "/host-listings", label: "Mening joylarim", num: "02", desc: "Mulklar va ofislar", icon: "partner" },
  { id: "saved", href: "/profile", label: "Saqlangan", num: "03", desc: "Yoqtirgan joylar", icon: "heart" },
  { id: "search", href: "/filter", label: "Joy qidirish", num: "04", desc: "Ofis va kovorkinglar katalogi", icon: "search" },
  { id: "settings", href: "/settings", label: "Sozlamalar", num: "05", desc: "Akkaunt va kompaniya profili", icon: "settings" }
];

/* SVG icons for profile actions */
export const IconUser = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);

export const IconSettings = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

export const IconSearch = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

export const IconHeart = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);

export const IconInfo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
  </svg>
);

export const IconBriefcase = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 13h18"/>
  </svg>
);

export const IconHome = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/>
  </svg>
);

export const IconLogout = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

export const IconPhone = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.59 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.18 6.18l1.27-.9a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
);

export const IconMail = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
  </svg>
);

export const profileNavIcons = {
  "Profilim": <IconUser />,
  "Mening joylarim": <IconBriefcase />,
  "Saqlangan": <IconHeart />,
  "Joy qidirish": <IconSearch />,
  "Sozlamalar": <IconSettings />
};

export const menuIconMap = {
  home: <IconHome />,
  info: <IconInfo />,
  search: <IconSearch />,
  heart: <IconHeart />,
  contact: <IconPhone />,
  user: <IconUser />,
  settings: <IconSettings />,
  partner: <IconBriefcase />
};

export const mobileQuickActions = [
  { id: "find", href: "/filter", label: "Joy topish", desc: "Katalog", icon: <IconSearch /> },
  { id: "add", href: "/partner", label: "Joy qo'shish", desc: "Hamkorlik", icon: <IconBriefcase /> }
];

// Menu labels come from the CMS (menu_<id>_label / _desc), constants are fallbacks.
function localizeMenuLink(link, cms, prefix = "menu") {
  const key = `${prefix}_${link.id}`;
  return {
    ...link,
    label: cms[`${key}_label`] || link.label,
    desc: cms[`${key}_desc`] || link.desc,
    subLinks: link.subLinks?.map((sub) => ({
      ...sub,
      label: cms[`${key}_${sub.id}_label`] || sub.label,
      desc: cms[`${key}_${sub.id}_desc`] || sub.desc,
    })),
  };
}

export function SideDrawer({ open, onClose, userState, setUserState, variant = "default" }) {
  const { lang, setLang, content } = useContext(LanguageContext);
  const cms = content?.[lang] || {};
  const overlayRef = useRef(null);
  const bgRef = useRef(null);
  const tlRef = useRef(null);
  const [activeSubmenuId, setActiveSubmenuId] = useState(null);
  const isDashboard = variant === "dashboard";
  const currentMenuLinks = isDashboard ? profileMenuLinks : menuNavLinks.map((link) => localizeMenuLink(link, cms));
  const quickActions = mobileQuickActions.map((action) => localizeMenuLink(action, cms, "menu_quick"));
  const activeSubmenu = currentMenuLinks.find((link) => link.id === activeSubmenuId);

  const resolveLinkHref = (link) => (link.requiresAuth && !userState.isAuthed ? "/login" : link.href);
  const closeDrawer = () => {
    setActiveSubmenuId(null);
    onClose();
  };
  const handleLogout = async () => {
    closeDrawer();
    navigate("login");
    try {
      await logoutSession();
    } catch (error) {
      console.warn("Backend session revocation failed during logout.", error);
    }
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
              <span className="menu-sidebar-tagline">{cms.menu_tagline || "Premium Spaces"}</span>
              <h3>{cms.menu_headline || "O'zbekistondagi eng yaxshi ofislar, kovorkinglar va dam olish maskanlari"}</h3>
            </div>
            
            <div className="menu-sidebar-footer">
              <div className="menu-sidebar-contacts">
                <a href={phoneHref(cms.support_phone || cms.footer_phone)} className="menu-sidebar-contact-item">
                  <span className="icon"><IconPhone /></span>
                  <div className="text">
                    <small>{cms.menu_phone_label || "Ishonch telefoni"}</small>
                    <strong>{cms.support_phone || cms.footer_phone}</strong>
                  </div>
                </a>
                <a href={mailHref(cms.footer_email)} className="menu-sidebar-contact-item">
                  <span className="icon"><IconMail /></span>
                  <div className="text">
                    <small>{cms.menu_email_label || "Elektron pochta"}</small>
                    <strong>{cms.footer_email}</strong>
                  </div>
                </a>
              </div>
              
              <div className="menu-sidebar-socials">
                {socialLinks(cms).map(([type, label, href]) => (
                  <a key={type} href={href} target="_blank" rel="noreferrer" className="menu-social-btn-link">{label}</a>
                ))}
              </div>

              <div className="menu-sidebar-copyright">
                <span>© {new Date().getFullYear()} Joyzone.</span>
                <span>{cms.footer_powered || "Powered by IT Comfort"}</span>
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
                  <span>{cms.menu_back || "Orqaga"}</span>
                </button>

                <div className="menu-subview-head">
                  <span className="menu-subview-head-icon">{menuIconMap[activeSubmenu.icon] || profileNavIcons[activeSubmenu.label]}</span>
                  <div>
                    <small>{cms.menu_submenu || "Ichki menyu"}</small>
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
                      {userState.avatar ? (
                        <img src={userState.avatar} alt="User" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        userState.isAuthed && userState.name ? userState.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "JZ"
                      )}
                    </div>
                    <div>
                      <span>{userState.isAuthed ? (cms.menu_account || "Akkaunt") : (cms.menu_guest_mode || "Mehmon rejimi")}</span>
                      <strong>{userState.isAuthed ? (userState.name || "Foydalanuvchi") : "Joyzone"}</strong>
                    </div>
                  </div>
                  <a href={userState.isAuthed ? "/profile" : "/login"} className="menu-mobile-profile-link" onClick={closeDrawer}>
                    {userState.isAuthed ? (cms.nav_profile || "Kabinet") : (cms.nav_login || "Kirish")}
                  </a>
                </div>

                <div className="menu-mobile-quick-actions" aria-label="Tezkor amallar">
                  {quickActions.map((action) => (
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
                  <span className="menu-nav-eyebrow">{isDashboard ? "Profil bo'limlari" : (cms.menu_nav_eyebrow || "Navigatsiya")}</span>
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
                                <span className="menu-nav-desc">{link.requiresAuth && !userState.isAuthed ? (cms.menu_requires_auth || "Kirish talab qilinadi") : link.desc}</span>
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
                            <span className="menu-nav-label">{cms.menu_logout || "Chiqish"}</span>
                            <span className="menu-nav-desc">{cms.menu_logout_desc || "Akkauntdan chiqish"}</span>
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
                        {userState.avatar ? (
                          <img src={userState.avatar} alt="User" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "14px" }} />
                        ) : (
                          userState.name ? userState.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "JZ"
                        )}
                      </div>
                      <div className="menu-user-details">
                        <strong>{userState.name || getStorageItem(STORAGE_KEYS.profile.name) || "Foydalanuvchi"}</strong>
                        <span>{userState.phone || userState.email || getStorageItem(STORAGE_KEYS.profile.phone) || getStorageItem(STORAGE_KEYS.profile.email) || ""}</span>
                      </div>
                      <a href="/profile" className="menu-user-profile-btn" onClick={closeDrawer}>
                        <IconUser /> Profile ochish
                      </a>
                    </div>
                  ) : (
                    userState.isAuthed ? (
                      <div className="menu-widget-user">
                        <div className="menu-user-avatar">
                          {userState.avatar ? (
                            <img src={userState.avatar} alt="User" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "14px" }} />
                          ) : (
                            userState.name ? userState.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "JZ"
                          )}
                        </div>
                        <div className="menu-user-details">
                          <strong>{userState.name || getStorageItem(STORAGE_KEYS.profile.name) || "Foydalanuvchi"}</strong>
                          <span>{userState.phone || userState.email || getStorageItem(STORAGE_KEYS.profile.phone) || getStorageItem(STORAGE_KEYS.profile.email) || ""}</span>
                        </div>
                        <a href="/profile" className="menu-user-profile-btn" onClick={closeDrawer}>
                          <IconUser /> {cms.menu_cabinet_link || "Kabinetga o'tish"}
                        </a>
                      </div>
                    ) : (
                      <div className="menu-widget-auth">
                        <p>{cms.menu_guest_text || "Joyzone imkoniyatlaridan to'liq foydalanish uchun tizimga kiring"}</p>
                        <div className="menu-auth-buttons-row">
                          <a href="/login" className="menu-btn-auth-primary" onClick={closeDrawer}>{cms.nav_login || "Kirish"}</a>
                          <a href="/register" className="menu-btn-auth-secondary" onClick={closeDrawer}>{cms.menu_register || "Ro'yxatdan o'tish"}</a>
                        </div>
                      </div>
                    )
                  )}

                  {!isDashboard && (
                    <div className="menu-widget-partner">
                      <div className="partner-widget-content">
                        <span className="tag">{cms.menu_partner_tag || "Hamkorlar uchun"}</span>
                        <h4>{cms.menu_partner_title || "Joyingiz bormi?"}</h4>
                        <p>{cms.menu_partner_text || "Uni Joyzone-da e'lon qiling va daromad olishni boshlang"}</p>
                      </div>
                      <a href="/partner" className="partner-widget-cta" onClick={closeDrawer}>
                        {cms.menu_partner_cta || "Boshlash"}
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
