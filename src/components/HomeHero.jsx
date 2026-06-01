import React, { useEffect, useRef, useState } from "react";
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

export function Header({ userState, setUserState, activeIndex = 0 }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navRef = useRef(null);
  const waveRef = useRef(null);
  const headerRef = useRef(null);

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
    moveWave(links[activeIndex]);
    links.forEach((link) => link.addEventListener("mouseenter", () => moveWave(link)));
    nav.addEventListener("mouseleave", () => moveWave(links[activeIndex]));
  }, []);

  useEffect(() => {
    gsap.fromTo(headerRef.current, { y: -60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" });
  }, []);

  const statusLabel = userState.isAuthed ? (userState.isPartner ? "Partner" : "Profil") : "Kirish";

  return (
    <>
      <header ref={headerRef} className="joy-header">
        <div className="container-fluid">
          <div className="nav-hover-zone">
            <nav className="navbar d-flex justify-content-between align-items-center">
              <a href="#home" className="logo">
                <img src={logoImage} alt="Joyzone" />
              </a>

              <div className="nav-center" ref={navRef}>
                <span className="nav-wave" ref={waveRef} />
                {navLinks.map((link, index) => (
                  <a key={`${link.label}-${index}`} href={link.href} className={`nav-link ${index === activeIndex ? "active" : ""}`}>
                    {link.label}
                  </a>
                ))}
              </div>

              <div className="nav-right">
                <a className="login-button btn-shine" href={userState.isAuthed ? (userState.isPartner ? "#partner" : "#profile") : "#login"}>
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
      <SideDrawer open={isMenuOpen} onClose={() => setIsMenuOpen(false)} userState={userState} setUserState={setUserState} />
    </>
  );
}

function SideDrawer({ open, onClose, userState, setUserState }) {
  const drawerRef = useRef(null);

  useEffect(() => {
    if (!drawerRef.current) return;
    gsap.to(drawerRef.current, {
      x: open ? 0 : "104%",
      opacity: open ? 1 : 0,
      duration: 0.42,
      ease: "power3.out"
    });
  }, [open]);

  const title = userState.isAuthed ? (userState.isPartner ? "Partner kabineti" : "Shaxsiy profil") : "Joyzone hisobingiz";
  const status = userState.isAuthed ? (userState.isPartner ? "Partner akkaunt" : "Mijoz akkaunti") : "Mehmon rejimi";
  const primary = userState.isAuthed
    ? [
        { label: userState.isPartner ? "Partner kabineti" : "Profilga o'tish", href: userState.isPartner ? "#partner" : "#profile" },
        { label: "Bronlarim", href: "#bookings" },
        userState.isPartner ? { label: "Joylarim", href: "#spaces" } : { label: "Partner bo'lish", href: "#partner-start" }
      ]
    : [
        { label: "Kirish", href: "#login" },
        { label: "Ro'yxatdan o'tish", href: "#register" },
        { label: "Partner bo'lish", href: "#partner-start" }
      ];

  return (
    <>
      <button type="button" className={`drawer-shade ${open ? "is-visible" : ""}`} onClick={onClose} aria-label="Menyuni yopish" />
      <aside ref={drawerRef} className="side-drawer" aria-hidden={open ? "false" : "true"}>
        <div className="drawer-top">
          <img className="drawer-logo" src={logoImage} alt="Joyzone" />
          <button type="button" className="drawer-close" onClick={onClose} aria-label="Menyuni yopish">
            x
          </button>
        </div>
        <div className="drawer-status">
          <span>{status}</span>
          <strong>{title}</strong>
          <p>{userState.isAuthed ? "Profil, bronlar va joylaringiz menyudan boshqariladi." : "Kirish, ro'yxatdan o'tish va partnerlik imkoniyatlari shu yerda."}</p>
        </div>
        <div className="drawer-links">
          {primary.map((item, index) => (
            <a key={item.label} href={item.href} className={`drawer-link ${index === 0 ? "is-primary" : ""}`} onClick={onClose}>
              {item.label}
              <span>{"->"}</span>
            </a>
          ))}
        </div>
        <div className="drawer-nav">
          {navLinks.slice(0, 4).map((item) => (
            <a key={item.label} href={item.href} onClick={onClose}>
              {item.label}
            </a>
          ))}
        </div>
        <div className="drawer-actions">
          {userState.isAuthed ? (
            <>
              <button type="button" onClick={() => { window.location.hash = userState.isPartner ? "partner" : "profile"; onClose(); }}>
                {userState.isPartner ? "Kabinet" : "Profil"}
              </button>
              <button type="button" onClick={() => setUserState({ isAuthed: false, isPartner: false })}>
                Chiqish
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => { window.location.hash = "login"; onClose(); }}>
                Kirish
              </button>
              <button type="button" onClick={() => { window.location.hash = "partner-start"; onClose(); }}>
                Partner
              </button>
            </>
          )}
        </div>
      </aside>
    </>
  );
}

function FilterSelect({ name, label, unit, options, openFilter, setOpenFilter }) {
  const [value, setValue] = useState("");
  const isOpen = openFilter === name;

  return (
    <div className={`filter-select ${isOpen ? "open" : ""} ${value ? "has-value" : ""}`}>
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
  const [openFilter, setOpenFilter] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const typingRef = useRef(null);
  const cursorRef = useRef(null);
  const wordIndexRef = useRef(0);
  const charIndexRef = useRef(7);
  const isDeletingRef = useRef(false);
  const words = ["ofislar", "kovorking", "zallar", "joylar"];

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
                    <div className={`custom-select ${isLocationOpen ? "open" : ""}`}>
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
                <a href="#partner-start" className="btn info-btn">Ro'yxatdan o'tish</a>
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
    gsap.fromTo(".joy-header, .banner .info, .banner .img-slider, .infoForReg", { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.72, stagger: 0.06, ease: "power3.out" });

    const hero = document.querySelector(".home-viewport");
    const image = document.querySelector(".banner .img-slider");
    const info = document.querySelector(".banner .info");
    const promo = document.querySelector(".infoForReg");
    const handlePointer = (event) => {
      if (!hero || window.matchMedia("(max-width: 1180px)").matches) return;
      const rect = hero.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      gsap.to(image, { x: x * 16, y: y * 12, scale: 1.012, duration: 0.7, ease: "power3.out" });
      gsap.to(info, { x: x * -8, y: y * -6, duration: 0.7, ease: "power3.out" });
      gsap.to(promo, { x: x * 10, y: y * 5, duration: 0.7, ease: "power3.out" });
    };
    const resetPointer = () => {
      gsap.to([image, info, promo], { x: 0, y: 0, scale: 1, duration: 0.8, ease: "power3.out" });
    };
    hero?.addEventListener("pointermove", handlePointer);
    hero?.addEventListener("pointerleave", resetPointer);

    const listings = document.querySelector(".listings-section");
    if (!listings) {
      return () => {
        hero?.removeEventListener("pointermove", handlePointer);
        hero?.removeEventListener("pointerleave", resetPointer);
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
      hero?.removeEventListener("pointermove", handlePointer);
      hero?.removeEventListener("pointerleave", resetPointer);
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("scroll", handleScroll);
      snapTween?.kill();
    };
  }, []);

  return (
    <main className="home-shell">
      <div className="home-viewport">
        <Header userState={userState} setUserState={setUserState} activeIndex={0} />
        <Banner slides={slides} />
      </div>
      <ListingsSection />
    </main>
  );
}
