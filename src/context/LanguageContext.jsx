import React, { createContext, useContext, useState } from "react";

const LANGS = ["uz", "ru", "en"];
const LANG_KEY = "joyzone-language";

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangRaw] = useState(
    () => localStorage.getItem(LANG_KEY) || "uz"
  );

  const setLang = (l) => {
    if (!LANGS.includes(l)) return;
    setLangRaw(l);
    try { localStorage.setItem(LANG_KEY, l); } catch {}
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside <LanguageProvider>");
  return ctx;
}
