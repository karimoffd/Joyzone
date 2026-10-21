const PRICE_CONFIG = [
  { key: "soatlik", field: "price_hourly", aliases: ["soatlik", "hourly", "hour"] },
  { key: "kunlik", field: "price_daily", aliases: ["kunlik", "daily", "day"] },
  { key: "haftalik", field: "price_weekly", aliases: ["haftalik", "weekly", "week"] },
  { key: "oylik", field: "price_monthly", aliases: ["oylik", "monthly", "month"] }
];

function hasPriceValue(value) {
  return value !== null && value !== undefined && value !== "";
}

function normalizeNumberText(value) {
  const text = String(value || "").trim();
  if (!text) return "";

  let cleaned = text.replace(/[^\d.,-]/g, "");
  if (!cleaned) return "";

  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");

  if (hasComma && hasDot) {
    const lastComma = cleaned.lastIndexOf(",");
    const lastDot = cleaned.lastIndexOf(".");
    cleaned = lastComma > lastDot
      ? cleaned.replace(/\./g, "").replace(",", ".")
      : cleaned.replace(/,/g, "");
  } else if (hasComma) {
    const parts = cleaned.split(",");
    cleaned = parts.length > 2 || parts[parts.length - 1].length === 3
      ? cleaned.replace(/,/g, "")
      : cleaned.replace(",", ".");
  } else if (hasDot) {
    const parts = cleaned.split(".");
    cleaned = parts.length > 2 || (parts[parts.length - 1].length === 3 && parts[0].length <= 3)
      ? cleaned.replace(/\./g, "")
      : cleaned;
  }

  return cleaned;
}

export function parseMoneyValue(value) {
  if (!hasPriceValue(value)) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  const normalized = normalizeNumberText(value);
  if (!normalized) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatMoneyValue(value, currency = "UZS") {
  const parsed = parseMoneyValue(value);
  if (parsed === null) return "";
  const rounded = Math.round(parsed);
  return `${new Intl.NumberFormat("uz-UZ").format(rounded)} ${currency || "UZS"}`;
}

export function buildPlacePrices(place = {}) {
  const legacyPrices = place?.prices && typeof place.prices === "object" && !Array.isArray(place.prices)
    ? { ...place.prices }
    : {};

  PRICE_CONFIG.forEach(({ key, field, aliases }) => {
    if (hasPriceValue(place[field])) {
      legacyPrices[key] = place[field];
      return;
    }

    if (hasPriceValue(legacyPrices[key])) return;

    const alias = aliases.find((candidate) => hasPriceValue(legacyPrices[candidate]));
    if (alias) {
      legacyPrices[key] = legacyPrices[alias];
    }
  });

  return legacyPrices;
}

export function getPlacePriceValues(place = {}) {
  const values = [
    place.price_hourly,
    place.price_daily,
    place.price_weekly,
    place.price_monthly,
    ...Object.values(buildPlacePrices(place)),
    place.price,
    place.priceValue
  ];

  return values.map(parseMoneyValue).filter((value) => value !== null);
}

export function getPrimaryPlacePriceValue(place = {}) {
  const directValue = [
    place.price_daily,
    place.price_hourly,
    place.price_weekly,
    place.price_monthly
  ].find(hasPriceValue);

  if (hasPriceValue(directValue)) return parseMoneyValue(directValue);

  const prices = buildPlacePrices(place);
  const legacyValue = [prices.kunlik, prices.soatlik, prices.haftalik, prices.oylik, place.price]
    .find(hasPriceValue);
  return parseMoneyValue(legacyValue);
}

export function getPrimaryPlacePriceText(place = {}, fallback = "0 so'm") {
  const primaryValue = getPrimaryPlacePriceValue(place);
  if (primaryValue !== null) {
    return formatMoneyValue(primaryValue, place.currency || "UZS");
  }

  if (hasPriceValue(place.price)) return place.price;

  return fallback;
}
