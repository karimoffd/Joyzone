// Per-page <title>, description, Open Graph and canonical tags for the SPA.

const SITE_NAME = "Joyzone";
const DEFAULT_DESCRIPTION = "Joyzone: Toshkentda ofis, kovorking, majlis va tadbir zallarini soatlik, kunlik va oylik ijaraga oling. Narxlar, rasmlar va onlayn bron.";

const ROUTE_META = {
  home: { title: "Joyzone — ofis, kovorking va zallarni ijaraga olish" },
  filter: { title: "Ijaraga joylar katalogi", description: "Ofis, kovorking va zallar katalogi: narx, sig'im va qulayliklar bo'yicha filtrlang." },
  partner: { title: "Joy qo'shish — hamkor bo'lish", description: "Ofis, kovorking yoki zalingizni Joyzone'ga joylashtiring va mijozlardan bron qabul qiling." },
  "about-us": { title: "Biz haqimizda" },
  "mobile-info": { title: "Afzalliklar va savollar" },
  "partner-guide": { title: "Hamkorlar qo'llanmasi" },
  login: { title: "Kirish", robots: "noindex" },
  register: { title: "Ro'yxatdan o'tish", robots: "noindex" },
  forgot: { title: "Kirishni tiklash", robots: "noindex" },
  verify: { title: "Kodni tasdiqlash", robots: "noindex" },
};
const PRIVATE_ROUTE = /^(profile|profile-edit|settings|host-|book-|admin|card-variants|footer-variant)/;

function upsertMeta(attribute, key, content) {
  let element = document.head.querySelector(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

function upsertCanonical(href) {
  let element = document.head.querySelector('link[rel="canonical"]');
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", "canonical");
    document.head.appendChild(element);
  }
  element.setAttribute("href", href);
}

function truncate(text, length = 160) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  return value.length > length ? `${value.slice(0, length - 1)}…` : value;
}

export function setPageMeta({ title, description, image, robots = "index, follow", path } = {}) {
  const fullTitle = !title || title.startsWith(SITE_NAME) ? (title || SITE_NAME) : `${title} | ${SITE_NAME}`;
  const text = truncate(description || DEFAULT_DESCRIPTION);
  const url = `${window.location.origin}${path || window.location.pathname}`;

  document.title = fullTitle;
  upsertMeta("name", "description", text);
  upsertMeta("name", "robots", robots);
  upsertMeta("property", "og:title", fullTitle);
  upsertMeta("property", "og:description", text);
  upsertMeta("property", "og:url", url);
  if (image) upsertMeta("property", "og:image", image);
  upsertCanonical(url);
}

export function setRouteMeta(route) {
  if (PRIVATE_ROUTE.test(route)) {
    setPageMeta({ title: SITE_NAME, robots: "noindex, nofollow" });
    return;
  }
  // Listing pages set richer meta themselves once the place has loaded.
  if (route.startsWith("space-") || route.startsWith("agent-")) return;
  setPageMeta(ROUTE_META[route] || ROUTE_META.home);
}
