import React, { createContext, useContext, useMemo, useState } from "react";
import { defaultContent } from "../data/defaultContent.js";
import { CONTENT_LANGUAGES, mergeSiteContent } from "../utils/content.js";
import { getStoredLanguage, setStoredLanguage } from "../utils/storageKeys.js";

export const LanguageContext = createContext({
  lang: "uz",
  setLang: () => {},
  content: defaultContent,
  contentLoading: false,
  contentError: "",
  isEditMode: false,
});

export function LanguageProvider({ children, content = defaultContent, ...providerState }) {
  const [lang, setLangRaw] = useState(() => getStoredLanguage("uz"));

  const setLang = (language) => {
    if (!CONTENT_LANGUAGES.includes(language)) return;
    setLangRaw(language);
    setStoredLanguage(language);
  };

  const value = useMemo(() => ({
    lang,
    setLang,
    content: mergeSiteContent(content),
    ...providerState,
  }), [lang, content, providerState]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export function useSiteContent() {
  const context = useLanguage();
  return {
    ...context,
    cms: context.content?.[context.lang] || defaultContent[context.lang] || {},
  };
}
