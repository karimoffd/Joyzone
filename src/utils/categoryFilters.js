// The catalog filter of a category, built from its subcategories' parameters
// and the admin's settings in category.filter_config. A parameter that has no
// settings yet uses the defaults below, so a new characteristic or amenity
// shows up in the filter as soon as it is added to a subcategory.

export const BASE_FILTERS = [
  { key: "location", label: "Manzil", hint: "Город и район" },
  { key: "price", label: "Narx", hint: "Цена от и до" },
  { key: "area", label: "Maydon", hint: "Площадь, м²" },
  { key: "capacity", label: "Sig'im", hint: "Сколько человек" },
  { key: "durations", label: "Ijara muddati", hint: "Soatlik · Kunlik · Haftalik · Oylik", rentOnly: true },
  { key: "extra", label: "Qo'shimcha", hint: "Рекомендуемые, большая площадь…" },
];

// Buttons the admin may rename; the default caption is what the site shows otherwise.
export const LABEL_DEFAULTS = {
  location: "Manzil",
  price: "Narx",
  area: "Maydon",
  capacity: "Sig'im",
  features: "Qulayliklar",
  extra: "Qo'shimcha",
};

export const DEFAULT_AREA_RANGES = [
  { min: null, max: 50 },
  { min: 50, max: 100 },
  { min: 100, max: 300 },
  { min: 300, max: 1000 },
  { min: 1000, max: null },
];

// Counters the filter offers as "N+" steps.
export const KNOWN_COUNTER_STEPS = {
  ceiling_height: [3, 4, 6, 8],
  power_kw: [15, 50, 100, 250],
  rooms: [1, 2, 3, 5],
};
const GENERIC_COUNTER_STEPS = [1, 2, 3, 5, 10];
// "Sig'im" already covers people and desks; floor or restroom counts are rarely searched.
const COUNTERS_HIDDEN_BY_DEFAULT = new Set(["capacity", "workplaces", "floor", "restrooms", "meeting_rooms"]);
const CAPACITY_SLUGS = ["capacity", "workplaces"];
const KIND_ORDER = { select: 0, counter: 1, toggle: 2, feature: 3 };

export function paramName(param, lang = "uz") {
  return param?.[`name_${lang}`] || param?.name_uz || param?.name_ru || param?.slug || "";
}

// Counter names carry their unit in brackets ("Shift balandligi (m)"); the filter button shows it after the number.
export function counterLabel(param) {
  return paramName(param).replace(/\s*\([^)]*\)\s*$/, "");
}

export function counterUnit(param) {
  return param?.config?.unit || paramName(param).match(/\(([^)]*)\)\s*$/)?.[1] || "";
}

export function areaRangeLabel({ min, max }) {
  if (min == null || min === 0) return `${max} m² gacha`;
  if (max == null) return `${min} m² dan katta`;
  return `${min} – ${max} m²`;
}

// Parameters of every subcategory in a category (or of one subcategory), once each.
export function categoryParameters(category, subcategoryId) {
  const subs = (category?.subcategories || []).filter((sub) => !subcategoryId || String(sub.id) === String(subcategoryId));
  const bySlug = new Map();
  subs.forEach((sub) => (sub.parameters || []).forEach((param) => {
    if (!bySlug.has(param.slug)) bySlug.set(param.slug, param);
  }));
  return [...bySlug.values()];
}

export function allowsRent(category) {
  return !category || category.deal_types !== "sale";
}

export function defaultBase(category, params = categoryParameters(category)) {
  const slugs = new Set(params.map((param) => param.slug));
  return {
    location: true,
    price: true,
    area: !category || category.deal_types !== "rent",
    capacity: !category || CAPACITY_SLUGS.some((slug) => slugs.has(slug)),
    durations: true,
    extra: true,
  };
}

// The filter settings of one parameter, with the defaults filled in.
export function paramSettings(param, saved = {}) {
  const isCounter = param.type === "counter";
  const isSelect = param.type === "select";
  const usable = isSelect ? Boolean(param.config?.options?.length) : true;
  return {
    show: saved.show ?? (usable && !(isCounter && COUNTERS_HIDDEN_BY_DEFAULT.has(param.slug))),
    separate: Boolean(saved.separate),
    order: saved.order,
    steps: isCounter
      ? (saved.steps?.length ? saved.steps : KNOWN_COUNTER_STEPS[param.slug] || GENERIC_COUNTER_STEPS.filter((step) => step >= (param.config?.min ?? 0)))
      : [],
  };
}

export function paramKind(param, settings) {
  if (param.type === "select") return "select";
  if (param.type === "counter") return "counter";
  return settings.separate ? "toggle" : "feature";
}

// Every parameter of the category with its settings, in filter order.
export function orderedParameters(category, subcategoryId) {
  const saved = category?.filter_config?.params || {};
  return categoryParameters(category, subcategoryId)
    .map((param, index) => {
      const settings = paramSettings(param, saved[param.slug]);
      return { param, settings, kind: paramKind(param, settings), index };
    })
    .sort((a, b) => {
      const orderA = a.settings.order ?? 1000 + KIND_ORDER[a.kind] * 100 + a.index;
      const orderB = b.settings.order ?? 1000 + KIND_ORDER[b.kind] * 100 + b.index;
      return orderA - orderB;
    });
}

// What the catalog shows for a category (or for "all categories" when none is picked).
export function resolveCategoryFilters(category, subcategoryId) {
  const config = category?.filter_config || {};
  const base = { ...defaultBase(category), ...(config.base || {}) };
  if (!allowsRent(category)) base.durations = false;
  const ranges = config.area_ranges?.length ? config.area_ranges : DEFAULT_AREA_RANGES;
  const params = category ? orderedParameters(category, subcategoryId).filter((item) => item.settings.show) : [];
  return {
    base,
    labels: config.labels || {},
    areaRanges: ranges.map((range) => ({ ...range, label: areaRangeLabel(range) })),
    params: params.filter((item) => item.kind !== "feature"),
    features: params.filter((item) => item.kind === "feature").map((item) => item.param),
  };
}
