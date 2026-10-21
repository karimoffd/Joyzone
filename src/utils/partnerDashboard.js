function normalizedStatus(value, fallback = "pending") {
  return String(value || fallback).trim().toLowerCase();
}

function bookingStartTimestamp(booking) {
  const raw = booking?.start_time || booking?.startTime || booking?.start_date || booking?.dateKey;
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
}

function localDateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function buildPartnerStats(listings = [], bookings = []) {
  const placeStatusCount = (status) => listings.filter(
    (item) => normalizedStatus(item?.status, "") === status,
  ).length;
  const bookingStatusCount = (status) => bookings.filter(
    (item) => normalizedStatus(item?.status) === status,
  ).length;

  const approximateRevenue = bookings
    .filter((item) => ["test_paid", "paid"].includes(
      normalizedStatus(item?.payment_status || item?.paymentStatus, "unpaid"),
    ))
    .reduce((sum, item) => {
      const amount = Number(item?.amount ?? item?.total_price ?? item?.total ?? 0);
      return Number.isFinite(amount) ? sum + amount : sum;
    }, 0);

  return {
    activeListings: placeStatusCount("approved"),
    pendingPlaces: placeStatusCount("pending"),
    rejectedPlaces: placeStatusCount("rejected"),
    pendingBookings: bookingStatusCount("pending"),
    confirmedBookings: bookingStatusCount("confirmed"),
    completedBookings: bookingStatusCount("completed"),
    blockedSlots: bookingStatusCount("blocked"),
    approximateRevenue,
  };
}

export function selectTodayBookings(bookings = [], now = new Date()) {
  const today = localDateKey(now);
  return bookings
    .filter((booking) => normalizedStatus(booking?.status) !== "cancelled")
    .filter((booking) => {
      const timestamp = bookingStartTimestamp(booking);
      return timestamp !== null && localDateKey(timestamp) === today;
    })
    .sort((left, right) => bookingStartTimestamp(left) - bookingStartTimestamp(right));
}

export function selectUpcomingBookings(bookings = [], now = new Date(), limit = 5) {
  const nowTimestamp = now.getTime();
  return bookings
    .filter((booking) => !["cancelled", "completed", "blocked"].includes(normalizedStatus(booking?.status)))
    .filter((booking) => {
      const timestamp = bookingStartTimestamp(booking);
      return timestamp !== null && timestamp > nowTimestamp;
    })
    .sort((left, right) => bookingStartTimestamp(left) - bookingStartTimestamp(right))
    .slice(0, limit);
}
