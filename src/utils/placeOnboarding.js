const PRICE_DEFINITIONS = [
  { key: "soatlik", field: "price_hourly" },
  { key: "kunlik", field: "price_daily" },
  { key: "haftalik", field: "price_weekly" },
  { key: "oylik", field: "price_monthly" },
];

const FIELD_STEPS = {
  category: 1,
  subcategory: 2,
  location: 3,
  latitude: 3,
  longitude: 3,
  address: 3,
  street: 4,
  images: 5,
  title: 6,
  description_ru: 7,
  description_uz: 7,
  description_en: 7,
  area: 8,
  people: 8,
  characteristics: 8,
  amenities: 9,
  booking_type: 10,
  opens_at: 10,
  closes_at: 10,
  price: 11,
  prices: 11,
  price_hourly: 11,
  price_daily: 11,
  price_weekly: 11,
  price_monthly: 11,
  currency: 11,
  discounts: 12,
  discount_ids: 12,
};

const FIELD_LABELS = {
  category: "Категория",
  subcategory: "Подкатегория",
  location: "Адрес",
  latitude: "Широта",
  longitude: "Долгота",
  street: "Улица и дом",
  images: "Фотографии",
  title: "Название",
  description_ru: "Описание на русском",
  description_uz: "Описание на узбекском",
  description_en: "Описание на английском",
  area: "Площадь",
  people: "Вместимость",
  characteristics: "Характеристики",
  amenities: "Удобства",
  booking_type: "Формат бронирования",
  opens_at: "Время открытия",
  closes_at: "Время закрытия",
  price: "Цена",
  prices: "Цены",
  price_hourly: "Почасовая цена",
  price_daily: "Посуточная цена",
  price_weekly: "Недельная цена",
  price_monthly: "Месячная цена",
  discounts: "Скидки",
  non_field_errors: "Данные объекта",
  detail: "Публикация",
};

function error(field, message, step = FIELD_STEPS[field] || 12) {
  return { field, message, step };
}

export function parsePositiveNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const normalized = typeof value === "string"
    ? value.replace(/\s+/g, "").replace(",", ".")
    : value;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function normalizeOnboardingPrices(prices = {}, enabledPrices = {}) {
  return PRICE_DEFINITIONS.reduce((result, { key }) => {
    if (!enabledPrices[key]) return result;
    const value = parsePositiveNumber(prices[key]);
    if (value !== null) result[key] = value;
    return result;
  }, {});
}

export function validateOnboardingStep(step, data) {
  const errors = [];
  const value = (input) => String(input ?? "").trim();

  if (step === 1 && !data.objectType) {
    errors.push(error("category", "Выберите тип объекта."));
  }

  if (step === 2 && !data.accessType) {
    errors.push(error("subcategory", "Выберите подкатегорию объекта."));
  }

  if (step === 3) {
    if (!value(data.address)) errors.push(error("location", "Укажите адрес объекта."));
    if (!data.addressConfirmed) errors.push(error("location", "Подтвердите адрес точкой на карте."));
    if (!Number.isFinite(Number(data.lat))) errors.push(error("latitude", "Не удалось определить широту."));
    if (!Number.isFinite(Number(data.lng))) errors.push(error("longitude", "Не удалось определить долготу."));
  }

  if (step === 4 && !value(data.addressDetails?.street)) {
    errors.push(error("street", "Укажите улицу и номер дома."));
  }

  if (step === 5) {
    const count = Array.isArray(data.photos) ? data.photos.length : 0;
    if (count < 4) errors.push(error("images", "Загрузите минимум 4 фотографии."));
    if (count > 10) errors.push(error("images", "Можно загрузить не более 10 фотографий."));
  }

  if (step === 6 && !value(data.spaceTitle)) {
    errors.push(error("title", "Укажите название объекта."));
  }

  if (step === 7) {
    if (!value(data.descRu)) errors.push(error("description_ru", "Заполните описание на русском языке."));
    if (!value(data.descUz)) errors.push(error("description_uz", "Заполните описание на узбекском языке."));
    if (!value(data.descEn)) errors.push(error("description_en", "Заполните описание на английском языке."));
  }

  if (step === 8) {
    if (!Number.isInteger(Number(data.area)) || Number(data.area) <= 0) {
      errors.push(error("area", "Площадь должна быть целым числом больше нуля."));
    }
    if (!Number.isInteger(Number(data.capacity)) || Number(data.capacity) <= 0) {
      errors.push(error("people", "Вместимость должна быть целым числом больше нуля."));
    }
  }

  if (step === 9 && !Array.isArray(data.amenities)) {
    errors.push(error("amenities", "Удобства должны быть списком."));
  }

  if (step === 10 && !["instant", "request"].includes(data.bookingType)) {
    errors.push(error("booking_type", "Выберите формат бронирования."));
  }

  if (step === 11) {
    const enabled = PRICE_DEFINITIONS.filter(({ key }) => data.enabledPrices?.[key]);
    if (enabled.length === 0) {
      errors.push(error("prices", "Включите хотя бы один формат оплаты."));
    }
    enabled.forEach(({ key, field }) => {
      const amount = parsePositiveNumber(data.prices?.[key]);
      if (amount === null) {
        errors.push(error(field, "Укажите цену больше нуля."));
      } else if (amount > 9999999999.99) {
        errors.push(error(field, "Цена превышает допустимое значение."));
      }
    });
  }

  if (step === 12 && !Array.isArray(data.selectedDiscountIds)) {
    errors.push(error("discounts", "Не удалось прочитать выбранные скидки."));
  }

  return errors;
}

export function validateOnboarding(data) {
  return Array.from({ length: 12 }, (_, index) => index + 1)
    .flatMap((step) => validateOnboardingStep(step, data));
}

export function buildPlacePayload(data, uploadedImageUrls) {
  const normalizedPrices = normalizeOnboardingPrices(data.prices, data.enabledPrices);
  const primaryPrice = normalizedPrices.kunlik
    ?? normalizedPrices.soatlik
    ?? normalizedPrices.haftalik
    ?? normalizedPrices.oylik;
  const characteristics = { ...data.customCounters, ...data.customSelects };

  Object.keys(characteristics).forEach((key) => {
    const current = characteristics[key];
    if (current === "" || current === null || current === undefined) {
      delete characteristics[key];
    } else if (Object.prototype.hasOwnProperty.call(data.customCounters || {}, key)) {
      characteristics[key] = Number(current);
    }
  });

  const numericPrices = Object.fromEntries(
    PRICE_DEFINITIONS.map(({ key, field }) => [field, normalizedPrices[key] ?? null]),
  );

  return {
    title: String(data.spaceTitle).trim(),
    description_uz: String(data.descUz).trim(),
    description_ru: String(data.descRu).trim(),
    description_en: String(data.descEn).trim(),
    subcategory: Number(data.accessType),
    location: String(data.address).trim(),
    latitude: Number(data.lat).toFixed(7),
    longitude: Number(data.lng).toFixed(7),
    people: Number(data.capacity),
    area: Number(data.area),
    price: `${primaryPrice} UZS`,
    prices: normalizedPrices,
    ...numericPrices,
    currency: "UZS",
    discounts: [...new Set((data.selectedDiscountIds || []).map(Number).filter(Number.isInteger))],
    booking_type: data.bookingType,
    opens_at: data.opensAt || "09:00",
    closes_at: data.closesAt || "18:00",
    amenities: [...new Set((data.amenities || []).filter((item) => typeof item === "string"))],
    characteristics,
    images: (uploadedImageUrls || []).filter((url) => typeof url === "string" && url.trim()),
  };
}

function flattenApiErrors(value, field = "__root__", result = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => flattenApiErrors(item, field, result));
  } else if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, item]) => {
      const nestedField = field === "__root__" ? key : `${field}.${key}`;
      flattenApiErrors(item, nestedField, result);
    });
  } else if (value !== null && value !== undefined) {
    const rootField = field === "__root__" ? "non_field_errors" : field.split(".")[0];
    const label = FIELD_LABELS[rootField] || rootField;
    result.push(error(rootField, `${label}: ${String(value)}`, FIELD_STEPS[rootField] || 12));
  }
  return result;
}

export function mapPlaceApiErrors(responseData) {
  return flattenApiErrors(responseData);
}

export function groupOnboardingErrors(errors) {
  return errors.reduce((groups, item) => {
    groups[item.step] = [...(groups[item.step] || []), item.message];
    return groups;
  }, {});
}
