function dateKeyToUtcDate(dateKey) {
  const match = String(dateKey || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

export function addDaysToDateKey(dateKey, days) {
  const date = dateKeyToUtcDate(dateKey);
  if (!date) return "";
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function selectCalendarDate(currentStart, currentEnd, nextDate) {
  if (!nextDate) return { startDate: currentStart || "", endDate: currentEnd || "" };
  if (!currentStart || (currentStart && currentEnd && currentStart !== currentEnd)) {
    return { startDate: nextDate, endDate: nextDate };
  }
  if (nextDate < currentStart) {
    return { startDate: nextDate, endDate: currentStart };
  }
  return { startDate: currentStart, endDate: nextDate };
}

export function isDateInSelectedRange(dateKey, startDate, endDate) {
  if (!dateKey || !startDate) return false;
  const normalizedEnd = endDate || startDate;
  return dateKey >= startDate && dateKey <= normalizedEnd;
}

export function buildBlockedBookingPayload({
  placeId,
  startDate,
  endDate,
  mode = "daily",
  startTime = "09:00",
  endTime = "18:00",
  note = "",
}) {
  if (!placeId) throw new Error("Выберите место.");
  if (!startDate) throw new Error("Выберите день или диапазон дней.");

  const normalizedEndDate = endDate || startDate;
  if (normalizedEndDate < startDate) throw new Error("Дата окончания должна быть после даты начала.");

  let startDateTime;
  let endDateTime;
  let durationType;

  if (mode === "hourly") {
    if (normalizedEndDate !== startDate) throw new Error("Почасовая блокировка доступна только для одного дня.");
    if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime) || endTime <= startTime) {
      throw new Error("Время окончания должно быть позже времени начала.");
    }
    startDateTime = `${startDate}T${startTime}:00`;
    endDateTime = `${startDate}T${endTime}:00`;
    durationType = "hourly";
  } else {
    startDateTime = `${startDate}T00:00:00`;
    endDateTime = `${addDaysToDateKey(normalizedEndDate, 1)}T00:00:00`;
    durationType = "daily";
  }

  return {
    place: Number(placeId),
    start_time: startDateTime,
    end_time: endDateTime,
    duration_type: durationType,
    guests: 1,
    amount: 0,
    currency: "UZS",
    status: "blocked",
    payment_status: "unpaid",
    note: String(note || "Ручная блокировка владельцем").trim(),
  };
}
