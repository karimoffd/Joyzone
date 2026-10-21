import { mergeSiteContent } from "../src/utils/content.js";

const merged = mergeSiteContent({
  ru: { hero_title: "CMS hero" },
  uz: { nav_links_arr: [{ label: "CMS", href: "#home" }] },
});

if (merged.ru.hero_title !== "CMS hero") {
  throw new Error("CMS value did not override the default value.");
}
if (!merged.ru.hero_subtitle) {
  throw new Error("Missing RU key did not fall back to defaultContent.");
}
if (merged.uz.nav_links_arr[0]?.label !== "CMS") {
  throw new Error("JSON-compatible CMS array was not preserved.");
}
if (!merged.en.hero_title || !merged.en.about_page_title) {
  throw new Error("Missing EN payload did not receive language defaults.");
}

console.log("[ok] CMS merge and language fallback checks passed");
