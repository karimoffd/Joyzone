// Contact/social helpers for CMS-managed values.

export function cmsList(cms, key) {
  return Array.isArray(cms?.[key]) ? cms[key].filter(Boolean) : [];
}

export function phoneHref(phone) {
  const digits = String(phone || "").replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : undefined;
}

export function mailHref(email) {
  const value = String(email || "").trim();
  return value ? `mailto:${value}` : undefined;
}

export function socialLinks(cms) {
  return [
    ["telegram", "Telegram", cms?.social_telegram],
    ["instagram", "Instagram", cms?.social_instagram],
    ["facebook", "Facebook", cms?.social_facebook],
    ["linkedin", "LinkedIn", cms?.social_linkedin],
  ].filter(([, , href]) => href);
}
