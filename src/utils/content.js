import { defaultContent } from "../data/defaultContent.js";

export const CONTENT_LANGUAGES = ["uz", "ru", "en"];

export function mergeSiteContent(payload = {}) {
  const source = payload?.data && typeof payload.data === "object" ? payload.data : payload;
  return Object.fromEntries(CONTENT_LANGUAGES.map((language) => {
    const remote = source?.[language];
    // An untranslated CMS row comes back as "" (or null); it must not wipe the
    // bundled default, otherwise list blocks such as benefits_arr render empty.
    const filled = remote && typeof remote === "object" && !Array.isArray(remote)
      ? Object.fromEntries(Object.entries(remote).filter(([, value]) => value !== "" && value != null))
      : {};
    return [language, {
      ...defaultContent[language],
      ...filled,
    }];
  }));
}
