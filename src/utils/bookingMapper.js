function normalizeId(value) {
  if (value && typeof value === "object") return value.id ?? value._id ?? null;
  return value ?? null;
}

function datePart(value) {
  if (!value) return "";
  return String(value).split("T")[0];
}

function timePart(value) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", hour12: false });
  }
  const match = String(value).match(/T(\d{2}:\d{2})/);
  return match ? match[1] : String(value).slice(0, 5);
}

function buildLocalIso(date, time) {
  if (!date) return "";
  const dateText = String(date).split("T")[0];
  const timeText = time || "09:00";
  const parsed = new Date(`${dateText}T${timeText}:00`);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
}

function normalizeAmount(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeDuration(raw = {}) {
  const value = raw.duration_type || raw.type || raw.duration || "daily";
  const text = String(value).toLowerCase();
  if (text.includes("soat") || text.includes("hour")) return "hourly";
  if (text.includes("hafta") || text.includes("week")) return "weekly";
  if (text.includes("oy") || text.includes("month")) return "monthly";
  return text || "daily";
}

function getPlaceId(raw = {}) {
  return raw.place_id
    ?? normalizeId(raw.place)
    ?? raw.space_id
    ?? normalizeId(raw.place_details)
    ?? raw.placeId
    ?? raw.spaceId
    ?? null;
}

function getPlaceTitle(raw = {}, fallbackPlace = null) {
  const placeObject = typeof raw.place === "object" && raw.place !== null ? raw.place : null;
  return raw.place_title
    || raw.placeTitle
    || raw.spaceTitle
    || raw.place_details?.title
    || raw.place_details?.name
    || placeObject?.title
    || placeObject?.name
    || fallbackPlace?.title
    || raw.space
    || raw.title
    || "Joyzone Space";
}

function getClientName(raw = {}) {
  const clientObject = typeof raw.client === "object" && raw.client !== null ? raw.client : null;
  return raw.client_name
    || raw.clientName
    || clientObject?.name
    || clientObject?.full_name
    || clientObject?.phone_number
    || raw.client_phone
    || raw.phone
    || "Клиент Joyzone";
}

function getClientPhone(raw = {}) {
  const clientObject = typeof raw.client === "object" && raw.client !== null ? raw.client : null;
  return raw.client_phone || raw.clientPhone || raw.phone || clientObject?.phone_number || clientObject?.phone || "";
}

export function getBookingDatePart(value) {
  return datePart(value);
}

export function getBookingTimePart(value) {
  return timePart(value);
}

export function formatBookingDate(value, locale = "ru-RU") {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long" }).format(date);
}

export function formatBookingTimeRange(booking = {}) {
  const start = booking.start_time || buildLocalIso(booking.date || booking.start_date, booking.startTime);
  const end = booking.end_time || buildLocalIso(booking.endDate || booking.end_date || booking.date || booking.start_date, booking.endTime);
  const startText = timePart(start);
  const endText = timePart(end);
  if (!startText) return "";
  return endText ? `${startText} - ${endText}` : startText;
}

export function getBookingDurationLabel(durationType) {
  if (durationType === "hourly") return "Почасовая бронь";
  if (durationType === "weekly") return "Недельная аренда";
  if (durationType === "monthly") return "Месячная аренда";
  return "Дневной доступ";
}

export function normalizeBooking(rawBooking = {}, options = {}) {
  const raw = rawBooking || {};
  const placeId = getPlaceId(raw);
  const fallbackPlace = options.listingsById?.get?.(String(placeId)) || options.place || null;
  const placeTitle = getPlaceTitle(raw, fallbackPlace);
  const durationType = normalizeDuration(raw);
  const startDate = raw.start_date || datePart(raw.start_time) || raw.date || raw.startDate || "";
  const endDate = raw.end_date || datePart(raw.end_time) || raw.endDate || startDate;
  const startTime = timePart(raw.start_time) || raw.startTime || "09:00";
  const endTime = timePart(raw.end_time) || raw.endTime || "18:00";
  const startIso = raw.start_time || buildLocalIso(startDate, startTime);
  const endIso = raw.end_time || buildLocalIso(endDate, endTime);
  const amount = normalizeAmount(raw.amount ?? raw.total_price ?? raw.total);
  const status = String(raw.status || "pending").toLowerCase();
  const paymentStatus = String(raw.payment_status || raw.paymentStatus || "unpaid").toLowerCase();
  const clientName = getClientName(raw);
  const clientPhone = getClientPhone(raw);

  return {
    ...raw,
    id: raw.id ?? options.fallbackId ?? `${placeId || "booking"}-${startIso || startDate || "draft"}`,

    client: raw.client,
    clientId: normalizeId(raw.client),
    client_name: clientName,
    clientName,
    client_phone: clientPhone,
    clientPhone,
    phone: clientPhone,

    place: raw.place,
    place_id: placeId,
    placeId,
    place_title: placeTitle,
    placeTitle,
    place_details: raw.place_details || (typeof raw.place === "object" && raw.place !== null ? raw.place : fallbackPlace),
    space: placeTitle,
    spaceTitle: placeTitle,

    start_time: startIso,
    end_time: endIso,
    start_date: startDate,
    end_date: endDate,
    date: startDate,
    endDate,
    startTime,
    endTime,
    dateKey: startDate,

    duration_type: durationType,
    type: durationType,
    durationLabel: getBookingDurationLabel(durationType),
    guests: Number(raw.guests || 1),

    amount,
    total_price: amount,
    total: amount,
    currency: raw.currency || "UZS",
    note: raw.note || raw.notes || "",
    notes: raw.note || raw.notes || "",

    status,
    payment_status: paymentStatus,
    paymentStatus,
    created_at: raw.created_at || raw.createdAt || "",
    updated_at: raw.updated_at || raw.updatedAt || "",

    company: clientName || clientPhone || "Клиент Joyzone",
    time: formatBookingTimeRange({ start_time: startIso, end_time: endIso, date: startDate, endDate, startTime, endTime }),
  };
}

export function getBookingsFromApiResponse(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}
