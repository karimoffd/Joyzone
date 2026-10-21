import { defaultContent } from "../data/defaultContent.js";

export const CONTENT_LANGUAGES = ["uz", "ru", "en"];

export function mergeSiteContent(payload = {}) {
  const source = payload?.data && typeof payload.data === "object" ? payload.data : payload;
  return Object.fromEntries(CONTENT_LANGUAGES.map((language) => {
    const remote = source?.[language];
    return [language, {
      ...defaultContent[language],
      ...(remote && typeof remote === "object" && !Array.isArray(remote) ? remote : {}),
    }];
  }));
}
