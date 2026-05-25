import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import JoySlider from "./JoySlider.jsx";
import ListingsSection from "./ListingsSection.jsx";
import { Logo, LangButton, MenuIcon, ChevronIcon } from "./ui/Shared.jsx";
import { navItems, spaceTabs } from "../data/content.js";
import "./HomeHero.css";

function LiquidNav({ activeIndex = 0 }) {
  const navRef = useRef(null);
  const dropRef = useRef(null);
  const itemRefs = useRef([]);
  const [hoverIndex, setHoverIndex] = useState(activeIndex);

  const moveDrop = (index) => {
    const nav = navRef.current;
    const drop = dropRef.current;
    const item = itemRefs.current[index];
    if (!nav || !drop || !item) return;

    const navBox = nav.getBoundingClientRect();
    const itemBox = item.getBoundingClientRect();
    gsap.to(drop, {
      x: itemBox.left - navBox.left + itemBox.width / 2 - 9,
      width: 18,
      opacity: 1,
      duration: 0.46,
      ease: "elastic.out(1, 0.72)"
    });
  };

  useEffect(() => {
    moveDrop(hoverIndex);
    const onResize = () => moveDrop(hoverIndex);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [hoverIndex]);

  return (
    <nav ref={navRef} className="liquid-nav hidden items-center gap-1 min-[920px]:flex" onMouseLeave={() => setHoverIndex(activeIndex)}>
      <span ref={dropRef} className="nav-liquid-drop" />
      {navItems.map((item, index) => (
        <a
          key={item.label}
          ref={(node) => {
            itemRefs.current[index] = node;
          }}
          href={item.href}
          className={`nav-link ${index === activeIndex ? "is-active" : ""}`}
          onMouseEnter={() => setHoverIndex(index)}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}

function BurgerDrawer({ open, onClose, userState, setUserState }) {
  const drawerRef = useRef(null);

  useEffect(() => {
    const drawer = drawerRef.current;
    if (!drawer) return undefined;
    gsap.to(drawer, {
      x: open ? 0 : "104%",
      opacity: open ? 1 : 0,
      duration: 0.42,
      ease: "power3.out"
    });
    return undefined;
  }, [open]);

  const primaryItems = userState.isAuthed
    ? [
        { label: "Profilga o'tish", href: "#profile" },
        { label: "Bronlarim", href: "#bookings" },
        userState.isPartner ? { label: "Partner kabineti", href: "#partner" } : { label: "Partner bo'lish", href: "#partner-start" }
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
        <div className="flex items-center justify-between">
          <Logo />
          <button type="button" className="drawer-close" onClick={onClose} aria-label="Menyuni yopish">
            ×
          </button>
        </div>
        <div className="drawer-status">
          <span>{userState.isAuthed ? (userState.isPartner ? "Partner akkaunt" : "Mijoz akkaunti") : "Mehmon rejimi"}</span>
          <strong>{userState.isAuthed ? "Joyzone kabineti" : "Joyzone imkoniyatlari"}</strong>
        </div>
        <div className="mt-8 grid gap-2">
          {primaryItems.concat(navItems).map((item) => (
            <a key={item.label} href={item.href} className="drawer-link" onClick={onClose}>
              {item.label}
            </a>
          ))}
        </div>
        <div className="drawer-actions">
          {userState.isAuthed ? (
            <>
              <button type="button" onClick={() => { window.location.hash = userState.isPartner ? "partner" : "profile"; onClose(); }}>
                {userState.isPartner ? "Partner kabineti" : "Profil"}
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
                Partner bo'lish
              </button>
            </>
          )}
        </div>
      </aside>
    </>
  );
}

function HomeHeader({ userState, setUserState }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <header className="home-container home-header">
      <a href="#home" className="home-logo-wrap" aria-label="Joyzone home">
        <Logo />
      </a>
      <LiquidNav activeIndex={0} />
      <div className="flex items-center gap-2">
        {userState.isAuthed ? (
          <a href={userState.isPartner ? "#partner" : "#profile"} className="header-pill hidden sm:inline-flex">
            {userState.isPartner ? "Partner" : "Profil"}
          </a>
        ) : (
          <a href="#login" className="header-login">
            Kirish
          </a>
        )}
        <button type="button" className="burger-button" onClick={() => setDrawerOpen(true)} aria-label="Menyuni ochish">
          <MenuIcon />
        </button>
      </div>
      <BurgerDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} userState={userState} setUserState={setUserState} />
    </header>
  );
}

function ComboSelect({ label, placeholder, options }) {
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const filteredOptions = options.filter((option) => option.toLowerCase().includes(value.toLowerCase())).slice(0, 4);

  return (
    <label className="combo-field">
      <span>{label}</span>
      <div className="combo-box">
        <input
          value={value}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setValue(event.target.value);
            setOpen(true);
          }}
        />
        <button type="button" onClick={() => setOpen((current) => !current)} aria-label="Variantlarni ochish">
          <ChevronIcon open={open} />
        </button>
        {open ? (
          <div className="combo-list">
            {(filteredOptions.length ? filteredOptions : options.slice(0, 4)).map((option) => (
              <button key={option} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { setValue(option); setOpen(false); }}>
                {option}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </label>
  );
}

function ValueBar({ label, value, suffix, percent }) {
  return (
    <div className="value-bar">
      <div className="flex items-center justify-between">
        <span>{label}</span>
        <strong>{`${value}${suffix}`}</strong>
      </div>
      <div className="bar-track">
        <span style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function SpaceTabs() {
  const visible = spaceTabs.length > 4 ? spaceTabs.slice(0, 3).concat("Hammasi") : spaceTabs;
  const [active, setActive] = useState("Ofislar");

  return (
    <div className="space-tabs">
      {visible.map((tab) => (
        <button key={tab} type="button" className={tab === active ? "is-active" : ""} onClick={() => setActive(tab)}>
          {tab}
        </button>
      ))}
    </div>
  );
}

function HomeFilter() {
  return (
    <section className="hero-filter">
      <p className="hero-eyebrow">Joyzone marketplace</p>
      <h1>
        O'zbekistonda <span>joy toping</span> va tez bron qiling
      </h1>
      <p className="hero-copy">Ofis, kovorking, konferensiya zali yoki yashash joyini bitta qulay filtr orqali tanlang.</p>
      <SpaceTabs />
      <div className="filter-grid">
        <ComboSelect label="Manzil" placeholder="Tuman yoki shahar" options={["Toshkent", "Samarqand", "Chilonzor", "Yunusobod", "Mirzo Ulug'bek"]} />
        <ComboSelect label="Format" placeholder="Joy turini yozing" options={["Private office", "Open space", "Meeting room", "Event hall", "Studio apartment"]} />
      </div>
      <div className="grid gap-3 min-[720px]:grid-cols-2">
        <ValueBar label="Maydon" value="120" suffix=" m2" percent={62} />
        <ValueBar label="Sig'im" value="18" suffix=" kishi" percent={48} />
      </div>
      <div className="filter-actions">
        <button type="button">Joy izlash</button>
        <a href="#partner-start">Joyingizni joylashtiring</a>
      </div>
    </section>
  );
}

function PartnerPromo() {
  return (
    <aside className="partner-promo">
      <div>
        <span>Partnerlar uchun</span>
        <strong>Maydoningiz daromad keltirsin</strong>
      </div>
      <a href="#partner-start">Boshlash</a>
    </aside>
  );
}

export default function HomeHero({ userState, setUserState, slides }) {
  useEffect(() => {
    gsap.fromTo(".home-header, .hero-filter, .hero-visual", { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.72, stagger: 0.08, ease: "power3.out" });

    const listings = document.querySelector(".listings-section");
    if (!listings) return undefined;

    let snapTween;
    let lastY = window.scrollY;
    let isSnapping = false;
    const snapTo = (target) => {
      if (isSnapping || Math.abs(window.scrollY - target) < 8) return;
      isSnapping = true;
      snapTween?.kill();
      const scrollState = { y: window.scrollY };
      gsap.fromTo(listings, { "--wave-shift": target > 0 ? "-34px" : "52px" }, { "--wave-shift": "0px", duration: 0.96, ease: "elastic.out(1, 0.7)" });
      snapTween = gsap.to(scrollState, {
        y: target,
        duration: 1.12,
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
      const goingDown = event.deltaY > 0;
      const goingUp = event.deltaY < 0;

      if (isSnapping) {
        event.preventDefault();
        return;
      }

      if (goingDown && y < viewport - 24) {
        event.preventDefault();
        snapTo(viewport);
      } else if (goingUp && y > 0 && y <= viewport + 64) {
        event.preventDefault();
        snapTo(0);
      }
    };

    const handleScroll = () => {
      if (isSnapping) return;
      const y = window.scrollY;
      const viewport = window.innerHeight;
      const direction = y > lastY ? "down" : "up";
      const downGate = y >= 96 && y < viewport - 24;
      const upGate = direction === "up" && y <= viewport - 96 && y > viewport * 0.34;

      if (direction === "down" && downGate) {
        snapTo(viewport);
      } else if (upGate) {
        snapTo(0);
      }

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
      <div className="home-viewport">
        <HomeHeader userState={userState} setUserState={setUserState} />
        <section className="home-container home-hero">
          <HomeFilter />
          <section className="hero-visual">
            <div className="home-slider-wrap">
              <JoySlider items={slides} interval={4600} />
            </div>
            <PartnerPromo />
          </section>
        </section>
      </div>
      <ListingsSection />
    </main>
  );
}
