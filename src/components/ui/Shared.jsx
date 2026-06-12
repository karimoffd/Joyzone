import React, { useEffect, useRef, useState } from "react";

export function Logo() {
  return (
    <div className="flex items-center text-[22px] font-extrabold leading-none text-joyBlue logo-mark xl:text-[28px]">
      JOY
      <span className="relative mx-[1px] inline-flex h-[20px] w-[17px] items-center justify-center">
        <span className="logo-pin absolute" />
        <span className="relative h-[5px] w-[5px] rounded-full bg-joyBlue" />
      </span>
      ZONE
    </div>
  );
}

export function GoogleIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      <path fill="#4285F4" d="M21.6 12.23c0-.74-.07-1.45-.2-2.13H12v4.03h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.43Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.63-2.34l-3.24-2.51c-.9.6-2.05.96-3.39.96-2.6 0-4.8-1.76-5.59-4.12H3.07v2.59A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.41 13.99A6.02 6.02 0 0 1 6.1 12c0-.69.11-1.36.31-1.99V7.42H3.07A10 10 0 0 0 2 12c0 1.61.39 3.13 1.07 4.58l3.34-2.59Z" />
      <path fill="#EA4335" d="M12 5.89c1.47 0 2.79.5 3.83 1.5l2.87-2.87C16.97 2.9 14.7 2 12 2a10 10 0 0 0-8.93 5.42l3.34 2.59C7.2 7.65 9.4 5.89 12 5.89Z" />
    </svg>
  );
}

export function GlobeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  );
}

export function ChevronIcon({ open = false }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={`transition duration-300 ${open ? "rotate-180" : ""}`} aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m20 6-11 11-5-5" />
    </svg>
  );
}

export function HeartIcon({ filled = false }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.8 4.6c-1.7-1.6-4.4-1.5-6 .2L12 7.7 9.2 4.8c-1.6-1.7-4.3-1.8-6-.2-1.8 1.7-1.9 4.6-.2 6.4l9 9 9-9c1.7-1.8 1.6-4.7-.2-6.4Z" />
    </svg>
  );
}

export function NoteIcon({ filled = false }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6.5 4.5h11a1.5 1.5 0 0 1 1.5 1.5v14l-7-3.6L5 20V6a1.5 1.5 0 0 1 1.5-1.5Z" />
      <path d="M8.7 8.3h6.6M8.7 11.4h4.4" fill="none" />
    </svg>
  );
}

export function LangButton() {
  const getInitialLanguage = () => {
    try {
      return localStorage.getItem("joyzone-language") || "UZ";
    } catch (error) {
      return "UZ";
    }
  };

  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState(getInitialLanguage);
  const rootRef = useRef(null);
  const languages = [
    { code: "UZ", name: "O'zbekcha" },
    { code: "RU", name: "Русский" },
    { code: "EN", name: "English" }
  ];

  useEffect(() => {
    const onPointerDown = (event) => {
      if (!rootRef.current || rootRef.current.contains(event.target)) return;
      setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language.toLowerCase();
  }, [language]);

  const chooseLanguage = (code) => {
    setLanguage(code);
    try {
      localStorage.setItem("joyzone-language", code);
    } catch (error) {
      // The control still works if storage is unavailable.
    }
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="language-switcher relative z-30">
      <button
        type="button"
        className="language-trigger flex h-8 items-center gap-2 rounded-full border border-joyBlue/10 bg-white/45 px-3 text-[11px] font-extrabold text-joyDeep shadow-sm transition hover:bg-white focus:outline-none focus:ring-4 focus:ring-joyOrange/15 xl:h-11 xl:px-4 xl:text-[14px]"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="text-joyOrange">
          <GlobeIcon />
        </span>
        <span className="min-w-[20px]">{language}</span>
        <span className="text-joyBlue/65">
          <ChevronIcon open={open} />
        </span>
      </button>
      {open ? (
        <div className="language-menu absolute right-0 top-[calc(100%+10px)] z-[120] w-[174px] rounded-[18px] border border-white/70 p-1.5 shadow-[0_22px_58px_rgba(18,40,63,0.22)] backdrop-blur-xl" role="listbox">
          {languages.map((item) => (
            <button
              key={item.code}
              type="button"
              role="option"
              aria-selected={item.code === language}
              className={`flex w-full items-center justify-between rounded-[13px] px-3 py-2.5 text-left text-[13px] font-extrabold transition ${item.code === language ? "bg-joyCream text-joyOrange" : "text-joyDeep hover:bg-joyCream/70"}`}
              onClick={() => chooseLanguage(item.code)}
            >
              <span>{item.name}</span>
              {item.code === language ? <span><CheckIcon /></span> : <span className="text-[11px] text-joyBlue/45">{item.code}</span>}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function MenuIcon({ open = false }) {
  return (
    <span className={`burger-lines ${open ? "is-open" : ""}`} aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

export function CategoryIcon({ category }) {
  const isCoworking = category === "Kovorking";
  const isOffice = category === "Ofis";
  const path = isCoworking
    ? "M4 8h16M7 8v10M17 8v10M9 12h6M12 5v3"
    : isOffice
    ? "M5 20V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v14M9 20v-4h6v4M9 8h.01M12 8h.01M15 8h.01M9 12h.01M12 12h.01M15 12h.01"
    : "M4 19V8l8-4 8 4v11M8 19v-6h8v6M9 10h6";

  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

export function useUserState() {
  const readState = () => {
    try {
      return {
        isAuthed: localStorage.getItem("joyzone-auth") === "true",
        isPartner: localStorage.getItem("joyzone-role") === "partner"
      };
    } catch (error) {
      return { isAuthed: false, isPartner: false };
    }
  };

  const [state, setState] = useState(readState);

  const updateState = (nextState) => {
    setState(nextState);
    try {
      localStorage.setItem("joyzone-auth", nextState.isAuthed ? "true" : "false");
      localStorage.setItem("joyzone-role", nextState.isPartner ? "partner" : "client");
    } catch (error) {
      // UI still updates if storage is not available.
    }
  };

  return [state, updateState];
}

export function useAuthRoute() {
  const readRoute = () => (window.location.hash || "#home").replace("#", "") || "home";
  const [route, setRoute] = useState(readRoute);

  useEffect(() => {
    const onHashChange = () => setRoute(readRoute());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return route;
}
