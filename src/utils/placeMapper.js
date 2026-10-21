import { buildPlacePrices, getPrimaryPlacePriceText, getPrimaryPlacePriceValue } from "./placePricing.js";

const DEFAULT_PLACE_IMAGE = "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=800&q=80";

export function slugifyPlaceTitle(text = "") {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getLocalizedName(value = {}) {
  if (!value || typeof value !== "object") return "";
  return value.name_ru || value.name_uz || value.name_en || value.name || value.title || value.slug || "";
}

function getNestedCategory(subcategoryInfo = {}) {
  const category = subcategoryInfo?.category;
  return typeof category === "object" && category !== null ? category : {};
}

function normalizeNumeric(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeStatus(value) {
  const status = String(value || "").trim();
  if (status === "Опубликовано") return "approved";
  if (status === "Черновик") return "pending";
  if (status === "Отклонено") return "rejected";
  return status || "pending";
}

function normalizeId(value) {
  if (value && typeof value === "object") return value.id ?? value._id ?? null;
  return value ?? null;
}

function normalizeOwnerName(place = {}) {
  const owner = place.owner;
  if (owner && typeof owner === "object") {
    return owner.name || owner.full_name || owner.username || owner.phone_number || owner.phone || owner.email || "";
  }
  return place.owner_name || place.ownerName || place.owner_username || place.owner_phone || place.owner_email || "";
}

function normalizeDiscountIds(place = {}) {
  const explicit = Array.isArray(place.discount_ids) ? place.discount_ids : [];
  const fromDiscounts = Array.isArray(place.discounts)
    ? place.discounts.map((item) => normalizeId(item)).filter((id) => id !== null && id !== undefined)
    : [];
  return [...new Set([...explicit, ...fromDiscounts].map(String))];
}

export function normalizePlace(place = {}, options = {}) {
  const config = typeof options === "number" ? { index: options } : options;
  const index = config.index ?? 0;
  const title = place.title || place.name || config.defaultTitle || "Joyzone";
  const id = place.id ?? place._id ?? config.fallbackId ?? `place-${index}`;
  const nestedCategory = getNestedCategory(place.subcategory_info);
  const categoryId = place.category_id
    ?? place.categoryId
    ?? normalizeId(place.category)
    ?? normalizeId(place.subcategory_info?.category)
    ?? null;
  const categoryName = place.category_name
    || place.categoryName
    || place.subcategory_info?.category_name
    || getLocalizedName(nestedCategory)
    || (typeof place.category === "string" && Number.isNaN(Number(place.category)) ? place.category : "")
    || "Joyzone";
  const subcategoryId = place.subcategory_id
    ?? place.subcategoryId
    ?? place.subcategory_info?.id
    ?? (typeof place.subcategory === "number" ? place.subcategory : null);
  const subcategoryName = place.subcategory_name
    || place.subcategoryName
    || getLocalizedName(place.subcategory_info)
    || (typeof place.subcategory === "string" && Number.isNaN(Number(place.subcategory)) ? place.subcategory : "")
    || "";
  const ownerId = place.owner_id ?? place.ownerId ?? normalizeId(place.owner);
  const prices = buildPlacePrices(place);
  const images = Array.isArray(place.images) && place.images.length > 0
    ? place.images
    : [DEFAULT_PLACE_IMAGE];
  const discountIds = normalizeDiscountIds(place);
  const normalized = {
    ...place,
    id,
    _id: place._id ?? id,
    title,
    name: place.name || title,
    slug: place.slug || slugifyPlaceTitle(title),
    href: place.href || `#space-${id ?? slugifyPlaceTitle(title)}`,

    category: categoryName,
    category_name: categoryName,
    categoryId,
    category_id: categoryId,
    subcategory: place.subcategory ?? subcategoryId,
    subcategoryId,
    subcategory_id: subcategoryId,
    subcategory_name: subcategoryName,

    location: place.location || place.address || "Toshkent",
    latitude: place.latitude ?? place.lat ?? null,
    longitude: place.longitude ?? place.lng ?? null,

    price: getPrimaryPlacePriceText({ ...place, prices }, place.price || "0 UZS"),
    priceValue: getPrimaryPlacePriceValue({ ...place, prices }),
    prices,
    price_hourly: place.price_hourly ?? prices.soatlik ?? null,
    price_daily: place.price_daily ?? prices.kunlik ?? null,
    price_weekly: place.price_weekly ?? prices.haftalik ?? null,
    price_monthly: place.price_monthly ?? prices.oylik ?? null,
    currency: place.currency || "UZS",

    people: normalizeNumeric(place.people, 0),
    area: normalizeNumeric(place.area, 0),
    images,
    amenities: Array.isArray(place.amenities) ? place.amenities : [],
    characteristics: place.characteristics && typeof place.characteristics === "object" ? place.characteristics : {},
    discounts: Array.isArray(place.discounts) ? place.discounts : [],
    discount_ids: discountIds,

    rating_avg: normalizeNumeric(place.rating_avg ?? place.rating, 0),
    reviews_count: normalizeNumeric(place.reviews_count ?? place.reviewsCount, 0),
    bookings_count: normalizeNumeric(place.bookings_count ?? place.bookings, 0),

    status: normalizeStatus(place.status),
    moderator_note: place.moderator_note || place.moderatorNote || "",
    promoted: Boolean(place.promoted),

    owner: place.owner,
    owner_id: ownerId,
    ownerId,
    owner_name: normalizeOwnerName(place) || "Не указан",
    owner_phone: place.owner_phone || place.ownerPhone || place.owner?.phone_number || place.owner?.phone || "",
    owner_email: place.owner_email || place.ownerEmail || place.owner?.email || "",
  };

  return normalized;
}

export function getPlacesFromApiResponse(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}
