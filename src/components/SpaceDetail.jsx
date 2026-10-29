import { formatMoney, weekdayLabels, buildHourlySlots, formatWorkingHours, toDateKey, fromDateKey, addDays, addMonths, getDefaultBookingDate, getMonthOffset, buildCalendarDays, buildDateRange, getDayDiff, formatShortDate, normalizeReview, getReviewFallback, isBlockingBooking } from "./spaceDetail/helpers.js";
import { Icon, DetailStat, Stars } from "./spaceDetail/parts.jsx";
import { PackIcon, resolveIconName } from "./ui/iconPack.jsx";
import React, { useCallback, useEffect, useMemo, useRef, useState, useContext } from "react";
import { createPortal } from "react-dom";
import { gsap } from "gsap";
import api, { getAccessToken, getApiErrorMessage } from "../api/client.js";
import { LanguageContext } from "../context/LanguageContext.jsx";

import { Header as JoyNavbar } from "./HomeHero.jsx";
import { HeartIcon } from "./ui/Shared.jsx";
import { JoyFooter, PropertyCard } from "./ListingsSection.jsx";
import { DirectChatDrawer } from "./DirectChatDrawer.jsx";
import { startOrGetChatForSpace } from "../utils/chatManager.js";
import { toggleFavoritePlace, isPlaceFavorited } from "../utils/favoritesManager.js";
import { createBookingDraft, saveBookingDraft } from "../utils/bookingDraft.js";
import {
  fetchPlaceAvailability,
  getAvailabilityDay,
  getAvailabilitySlotStatus,
  getCalendarAvailabilityRange,
  isAvailabilityDateCovered,
  isAvailabilityDayUnavailable,
  isAvailabilityStatusBlocked
} from "../utils/availability.js";
import { parseMoneyValue } from "../utils/placePricing.js";
import { propertyCards } from "../data/content.js";
import { getPlacesFromApiResponse, normalizePlace } from "../utils/placeMapper.js";
import "./ListingsSection.css";
import "./SpaceDetail.css";
import { navigate } from "../utils/router.js";
import { setPageMeta } from "../utils/seo.js";
import { phoneHref } from "../utils/cmsLinks.js";
import { useSiteContent } from "../context/LanguageContext.jsx";

const amenityList = [
  { name: "Tez Wi-Fi", icon: "wifi" },
  { name: "Konditsioner", icon: "wind" },
  { name: "Proyektor", icon: "tv" },
  { name: "Avtoturargoh", icon: "parking" },
  { name: "Coffee point", icon: "coffee" },
  { name: "Self check-in", icon: "key" },
  { name: "Toza zona", icon: "sparkles" },
  { name: "24/7 yordam", icon: "help" },
  { name: "Printer / Skaner", icon: "printer" },
  { name: "Playstation 5", icon: "gamepad" },
  { name: "Kutubxona", icon: "book" },
  { name: "Xavfsiz hudud", icon: "lock" },
  { name: "Oshxona / Bufet", icon: "utensils" },
  { name: "Doska / Whiteboard", icon: "board" }
];


function slugify(text) {
  if (!text) return "";
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const EMPTY_PLACE = {
  id: "",
  title: "Joyzone",
  category: "",
  location: "",
  price: "0 UZS",
  priceValue: 0,
  prices: {},
  currency: "UZS",
  people: 1,
  area: 0,
  images: [],
  amenities: [],
  characteristics: {},
  discounts: [],
  discount_ids: [],
};

function getPlaceRouteValue(route) {
  try {
    return decodeURIComponent(String(route || "").replace(/^space-/, "")).trim();
  } catch (error) {
    return String(route || "").replace(/^space-/, "").trim();
  }
}

function resolveDevSpace(route) {
  if (import.meta.env.DEV) {
    const value = (route || "").replace(/^space-/, "");
    const index = Number(value);

    if (Number.isInteger(index) && index >= 0 && index < propertyCards.length) {
      return propertyCards[index];
    }

    return propertyCards.find((item) => slugify(item.title) === value) || propertyCards[0];
  }
  return EMPTY_PLACE;
}

async function fetchPlaceForRoute(route) {
  const value = getPlaceRouteValue(route);
  if (!value) return null;

  if (/^\d+$/.test(value)) {
    try {
      const response = await api.get(`/api/places/${value}/`, { skipAuth: true });
      return response.data || null;
    } catch (error) {
      if (error?.response?.status !== 404) throw error;
    }
  }

  const words = value.split("-").filter(Boolean);
  const searchTerms = [...new Set([
    words.join(" "),
    words.slice(-2).join(" "),
    words.at(-1),
  ].filter(Boolean))];

  for (const search of searchTerms) {
    const response = await api.get("/api/places/", {
      params: { search },
      skipAuth: true,
    });
    const exactMatch = getPlacesFromApiResponse(response.data).find((item) => (
      slugify(item?.title || item?.name || "") === value
    ));
    if (exactMatch) return exactMatch;
  }

  // Final backend-only compatibility pass for old hashes whose title changed punctuation.
  const response = await api.get("/api/places/", { skipAuth: true });
  const places = getPlacesFromApiResponse(response.data);
  const exactMatch = places.find((item) => slugify(item?.title || item?.name || "") === value);
  if (exactMatch) return exactMatch;

  const legacyIndex = Number(value);
  if (Number.isInteger(legacyIndex) && legacyIndex >= 0 && legacyIndex < places.length) {
    return places[legacyIndex];
  }

  return null;
}

export default function SpaceDetail({ route, userState, setUserState }) {
  const { lang } = useContext(LanguageContext);
  const { cms } = useSiteContent();
  const fallbackSpace = useMemo(
    () => normalizePlace(import.meta.env.DEV ? resolveDevSpace(route) : EMPTY_PLACE),
    [route],
  );
  const [space, setSpace] = useState(() => normalizePlace(EMPTY_PLACE));
  const [placeLoading, setPlaceLoading] = useState(true);
  const placeHourlySlots = useMemo(() => buildHourlySlots(space.opens_at, space.closes_at), [space.opens_at, space.closes_at]);

  useEffect(() => {
    if (placeLoading || !space?.title) return;
    const description = space[`description_${lang}`] || space.description_uz || space.description_ru || space.description;
    setPageMeta({
      title: `${space.title} — ${space.location}`,
      description: description || `${space.title}: ${space.location}. ${space.people} kishi, ${space.area} m². ${space.price}`,
      image: space.images?.[0],
      robots: space.status === "approved" ? "index, follow" : "noindex",
    });
  }, [space, placeLoading, lang]);
  const [placeEmpty, setPlaceEmpty] = useState(false);
  const [placeError, setPlaceError] = useState("");
  const [relatedSpaces, setRelatedSpaces] = useState([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [relatedError, setRelatedError] = useState("");
  const [usingDevPlaceFallback, setUsingDevPlaceFallback] = useState(false);
  const [usingDevRelatedFallback, setUsingDevRelatedFallback] = useState(false);
  const [allParameters, setAllParameters] = useState([]);
  const [allDiscounts, setAllDiscounts] = useState([]);
  const [parametersError, setParametersError] = useState("");
  const [discountError, setDiscountError] = useState("");
  const [detailError, setDetailError] = useState("");
  const placeId = space?.id || space?._id;

  // Parameters are presentation metadata; the place remains usable if they fail.
  useEffect(() => {
    api.get("/api/parameters/", { skipAuth: true })
      .then((res) => {
        setAllParameters(res.data?.results || res.data || []);
        setParametersError("");
      })
      .catch((err) => setParametersError(getApiErrorMessage(err, "Не удалось загрузить параметры места.")));
  }, []);

  // Resolve canonical id routes directly and keep old title hashes through backend search.
  useEffect(() => {
    let cancelled = false;
    setPlaceLoading(true);
    setPlaceEmpty(false);
    setPlaceError("");
    setDetailError("");

    fetchPlaceForRoute(route)
      .then((backendPlace) => {
        if (cancelled) return;
        if (backendPlace) {
          setSpace(normalizePlace(backendPlace));
          setUsingDevPlaceFallback(false);
          return;
        }

        if (import.meta.env.DEV) {
          // Static cards remain available only while developing old demo routes.
          setSpace(fallbackSpace);
          setUsingDevPlaceFallback(true);
          setPlaceError("Backend не вернул это место. Показаны DEV fallback данные.");
        } else {
          setSpace(normalizePlace(EMPTY_PLACE));
          setUsingDevPlaceFallback(false);
          setPlaceEmpty(true);
          setPlaceError("Место не найдено или ещё не опубликовано.");
        }
      })
      .catch((err) => {
        if (cancelled) return;
        const message = getApiErrorMessage(err, "Не удалось загрузить место.");
        if (import.meta.env.DEV) {
          setSpace(fallbackSpace);
          setUsingDevPlaceFallback(true);
          setPlaceError(`${message} Показаны DEV fallback данные.`);
        } else {
          setSpace(normalizePlace(EMPTY_PLACE));
          setUsingDevPlaceFallback(false);
          setPlaceEmpty(true);
          setPlaceError(message);
        }
      })
      .finally(() => {
        if (!cancelled) setPlaceLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [route, fallbackSpace]);

  useEffect(() => {
    if (!placeId) {
      setRelatedSpaces([]);
      setRelatedLoading(false);
      setRelatedError("");
      setUsingDevRelatedFallback(false);
      return;
    }

    const params = {};
    if (space.subcategoryId) params.subcategory = space.subcategoryId;
    else if (space.categoryId) params.category = space.categoryId;

    setRelatedLoading(true);
    setRelatedError("");
    setUsingDevRelatedFallback(false);

    const loadRelated = async () => {
      const response = await api.get("/api/places/", { params, skipAuth: true });
      let candidates = getPlacesFromApiResponse(response.data);

      if (candidates.filter((item) => String(item.id) !== String(placeId)).length === 0 && space.categoryId && params.subcategory) {
        const categoryResponse = await api.get("/api/places/", {
          params: { category: space.categoryId },
          skipAuth: true,
        });
        candidates = getPlacesFromApiResponse(categoryResponse.data);
      }

      return candidates
          .filter((item) => String(item.id) !== String(space.id))
          .map(normalizePlace)
          .slice(0, 3);
    };

    loadRelated()
      .then((related) => {
        setRelatedSpaces(related);
        setRelatedError("");
        setUsingDevRelatedFallback(false);
      })
      .catch((err) => {
        if (import.meta.env.DEV) {
          // Dev fallback keeps related cards visible for old static demo routes.
          setRelatedSpaces(propertyCards.filter((item) => item.title !== space.title).map(normalizePlace).slice(0, 3));
          setUsingDevRelatedFallback(true);
          setRelatedError(`${getApiErrorMessage(err, "Не удалось загрузить похожие места.")} Показан DEV fallback.`);
        } else {
          setRelatedSpaces([]);
          setUsingDevRelatedFallback(false);
          setRelatedError(getApiErrorMessage(err, "Не удалось загрузить похожие места."));
        }
      })
      .finally(() => setRelatedLoading(false));
  }, [placeId, space?.subcategoryId, space?.categoryId, space?.title]);

  useEffect(() => {
    if (!placeId) {
      setAllDiscounts([]);
      setDiscountError("");
      return;
    }

    const linkedIds = new Set(
      [...(space.discount_ids || []), ...(space.discounts || [])]
        .map((item) => (typeof item === "object" && item !== null ? item.id : item))
        .filter((id) => id !== null && id !== undefined)
        .map(String)
    );

    api.get("/api/discounts/", { skipAuth: true })
      .then((res) => {
        const discounts = res.data?.results || res.data || [];
        const applicable = Array.isArray(discounts)
          ? discounts.filter((discount) => (
            discount?.is_active
            && (discount.applicable_to === "all" || linkedIds.has(String(discount.id)))
          ))
          : [];
        setAllDiscounts(applicable);
        setDiscountError("");
      })
      .catch((err) => {
        setAllDiscounts([]);
        setDiscountError(getApiErrorMessage(err, "Не удалось загрузить скидки."));
      });
  }, [placeId, space?.discount_ids, space?.discounts]);

  // Price formatting helper
  const formatPriceValue = (val, mode) => {
    if (!val) return "";
    const cleanNum = parseMoneyValue(val);
    if (cleanNum === null) return val;
    const formatted = new Intl.NumberFormat("uz-UZ").format(cleanNum);
    const label = mode === "soatlik" ? "Soatiga" : mode === "kunlik" ? "Kuniga" : mode === "haftalik" ? "Haftasiga" : "Oyiga";
    return `${label} ${formatted} ${space?.currency || "UZS"}`;
  };

  // Selected amenities mapped to backend parameters
  const selectedAmenities = useMemo(() => {
    if (!space.amenities || !Array.isArray(space.amenities)) return [];
    if (allParameters.length > 0) {
      return allParameters.filter(p => p.type === 'boolean' && space.amenities.includes(p.slug));
    }
    // Fallback to static mapping if parameters are not yet loaded
    return amenityList.filter(item => space.amenities.includes(slugify(item.name)));
  }, [space.amenities, allParameters]);

  const [activeImage, setActiveImage] = useState(0);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [liked, setLiked] = useState(() => isPlaceFavorited(space.id));
  const [favoritePending, setFavoritePending] = useState(false);
  const [favoriteError, setFavoriteError] = useState("");
  const likeBtnRef = useRef(null);
  const [showAmenitiesModal, setShowAmenitiesModal] = useState(false);
  const [activeChatId, setActiveChatId] = useState(null);

  useEffect(() => {
    setLiked(isPlaceFavorited(space.id));
    const handleUpdate = () => {
      setLiked(isPlaceFavorited(space.id));
    };
    window.addEventListener("joyzone-favorites-update", handleUpdate);
    return () => window.removeEventListener("joyzone-favorites-update", handleUpdate);
  }, [space.id]);

  const handleLikeToggle = async () => {
    if (favoritePending) return;
    setFavoritePending(true);
    setFavoriteError("");
    gsap.fromTo(
      likeBtnRef.current,
      { scale: 0.8 },
      { scale: 1, duration: 0.5, ease: "elastic.out(1.2, 0.4)" }
    );
    try {
      const favorites = await toggleFavoritePlace(space);
      setLiked(favorites.some((favorite) => String(favorite.id) === String(space.id)));
    } catch (error) {
      setFavoriteError(getApiErrorMessage(error, "Не удалось обновить избранное"));
      setLiked(isPlaceFavorited(space.id));
    } finally {
      setFavoritePending(false);
    }
  };

  const [days, setDays] = useState(1);
  const [guests, setGuests] = useState(Math.min(space.people || 4, 4));
  const [allBookings, setAllBookings] = useState([]);
  const [availability, setAvailability] = useState(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [bookingError, setBookingError] = useState("");
  const availabilityRequestRef = useRef(0);
  const [calYear, setCalYear] = useState(() => fromDateKey(getDefaultBookingDate()).getUTCFullYear());
  const [calMonth, setCalMonth] = useState(() => fromDateKey(getDefaultBookingDate()).getUTCMonth());
  const [checkInDate, setCheckInDate] = useState(() => getDefaultBookingDate());
  const [checkOutDate, setCheckOutDate] = useState(() => getDefaultBookingDate());
  const [hourPanelDate, setHourPanelDate] = useState(null);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState([]);
  const loadAvailability = useCallback(async () => {
    const requestId = ++availabilityRequestRef.current;
    if (!placeId) {
      setAvailability(null);
      setAllBookings([]);
      setAvailabilityLoading(false);
      return;
    }

    try {
      setAvailabilityLoading(true);
      const calendarRange = getCalendarAvailabilityRange(calYear, calMonth, 1);
      const dateCandidates = [calendarRange.date_from, checkInDate].filter(Boolean).sort();
      const endCandidates = [calendarRange.date_to, checkOutDate || checkInDate].filter(Boolean).sort();
      const range = {
        date_from: dateCandidates[0],
        date_to: endCandidates[endCandidates.length - 1],
      };
      const data = await fetchPlaceAvailability({ placeId, ...range, skipAuth: true });
      if (requestId !== availabilityRequestRef.current) return;
      setAvailability(data);
      setAllBookings(data?.bookings || []);
      setAvailabilityError("");
    } catch (err) {
      if (requestId !== availabilityRequestRef.current) return;
      setAvailabilityError(getApiErrorMessage(err, "Не удалось загрузить календарь занятости."));
      setAvailability(null);
      setAllBookings([]);
    } finally {
      if (requestId === availabilityRequestRef.current) setAvailabilityLoading(false);
    }
  }, [placeId, calYear, calMonth, checkInDate, checkOutDate]);

  useEffect(() => {
    loadAvailability();
  }, [loadAvailability]);

  const spaceBookings = useMemo(() => {
    const source = availability?.bookings || allBookings;
    if (!space || !Array.isArray(source)) return [];
    const targetId = space.id || space._id;
    return source.filter(b => {
      if (!b) return false;
      const spaceId = typeof b.space_id === 'object' && b.space_id !== null
        ? b.space_id?.id || b.space_id?._id
        : b.space_id || b.place_id || b.place || b.place_details?.id || b.place_details?._id;
      return spaceId && spaceId === targetId;
    });
  }, [allBookings, availability, space]);

  const calendarDays = useMemo(() => buildCalendarDays(calYear, calMonth), [calYear, calMonth]);
  const nextCalendar = useMemo(() => getMonthOffset(calYear, calMonth, 1), [calYear, calMonth]);
  const nextCalendarDays = useMemo(() => buildCalendarDays(nextCalendar.year, nextCalendar.month), [nextCalendar]);

  const [bookingDuration, setBookingDuration] = useState("kunlik");

  const availableDurations = useMemo(() => {
    if (!space?.prices) {
      return [{ id: "kunlik", label: "Kunlik", price: space?.price }];
    }
    
    const options = [];
    if (space.prices.soatlik) {
      options.push({
        id: "soatlik",
        label: "Soatlik",
        price: formatPriceValue(space.prices.soatlik, "soatlik")
      });
    }
    if (space.prices.kunlik) {
      options.push({
        id: "kunlik",
        label: "Kunlik",
        price: formatPriceValue(space.prices.kunlik, "kunlik")
      });
    }
    if (space.prices.haftalik) {
      options.push({
        id: "haftalik",
        label: "Haftalik",
        price: formatPriceValue(space.prices.haftalik, "haftalik")
      });
    }
    if (space.prices.oylik) {
      options.push({
        id: "oylik",
        label: "Oylik",
        price: formatPriceValue(space.prices.oylik, "oylik")
      });
    }
    
    return options.length > 0 ? options : [{ id: "kunlik", label: "Kunlik", price: space.price }];
  }, [space]);

  useEffect(() => {
    if (availableDurations.length > 0 && !availableDurations.some(d => d.id === bookingDuration)) {
      const nextDuration = availableDurations[0].id;
      setBookingDuration(nextDuration);
      syncRangeForMode(nextDuration, checkInDate || getDefaultBookingDate(), 1);
    }
  }, [availableDurations, bookingDuration]);

  // Compute active discount applied to booking details
  const activeAppliedDiscount = useMemo(() => {
    if (allDiscounts.length === 0) return null;

    const linkedDiscountIds = new Set(
      [...(space.discount_ids || []), ...(space.discounts || [])]
        .map(item => (typeof item === "object" && item !== null ? item.id : item))
        .map(Number)
        .filter(Boolean)
    );

    const spaceDiscounts = allDiscounts.filter(d => {
      if (!d.is_active) return false;
      if (linkedDiscountIds.has(Number(d.id))) return true;
      return d.applicable_to === "all";
    });
    if (spaceDiscounts.length === 0) return null;
    
    let bestDiscount = null;
    let maxPercent = 0;
    
    spaceDiscounts.forEach(d => {
      let applies = false;
      
      if (d.discount_type === "new_listing") {
        applies = true; // Assume new listing applies
      } else if (d.discount_type === "weekly") {
        applies = bookingDuration === "haftalik" || (bookingDuration === "kunlik" && days >= (d.min_nights || 7));
      } else if (d.discount_type === "monthly") {
        applies = bookingDuration === "oylik" || (bookingDuration === "kunlik" && days >= (d.min_nights || 28));
      } else if (d.discount_type === "last_minute") {
        const today = new Date();
        const start = fromDateKey(checkInDate);
        const diffDays = Math.ceil((start - today) / (1000 * 60 * 60 * 24));
        applies = diffDays >= 0 && diffDays <= (d.days_before || 14);
      } else if (d.discount_type === "custom") {
        applies = days >= (d.min_nights || 1);
      }
      
      if (applies && d.percent > maxPercent) {
        maxPercent = d.percent;
        bestDiscount = d;
      }
    });
    
    return bestDiscount;
  }, [space.discount_ids, space.discounts, allDiscounts, bookingDuration, days, checkInDate]);

  const parsedBasePrice = useMemo(() => {
    const selectedOption = availableDurations.find(d => d.id === bookingDuration);
    const priceStr = selectedOption ? selectedOption.price : space?.price;
    if (!priceStr) return 0;
    return parseMoneyValue(priceStr) || 0;
  }, [availableDurations, bookingDuration, space]);

  const galleryImages = useMemo(() => {
    const images = Array.isArray(space?.images) ? space.images.filter(Boolean) : [];
    return images.length > 0 ? images : [fallbackSpace.images?.[0]].filter(Boolean);
  }, [space, fallbackSpace]);

  const previewThumbs = useMemo(() => (
    galleryImages.length > 4 ? galleryImages.slice(0, 3) : galleryImages.slice(0, 4)
  ), [galleryImages]);

  const selectedRange = useMemo(() => {
    if (bookingDuration === "soatlik") return checkInDate ? [checkInDate] : [];
    return buildDateRange(checkInDate, checkOutDate || checkInDate);
  }, [bookingDuration, checkInDate, checkOutDate]);

  const selectedDateSet = useMemo(() => new Set(selectedRange), [selectedRange]);

  const isDateBooked = (dateStr, { hourly = false } = {}) => {
    if (isAvailabilityDayUnavailable(availability, dateStr, { hourly })) {
      return true;
    }
    if (getAvailabilityDay(availability, dateStr)) {
      return false;
    }

    return spaceBookings.some((booking) => {
      const start = booking?.start_date || booking?.start_time;
      const end = booking?.end_date || booking?.end_time;
      if (!booking || !start || !end || !isBlockingBooking(booking)) return false;
      const bStart = String(start).split("T")[0];
      const bEnd = String(end).split("T")[0];
      return dateStr >= bStart && dateStr <= bEnd;
    });
  };

  const getSlotStatus = (dateStr, slot) => {
    if (!dateStr) return "free";
    if (!isAvailabilityDateCovered(availability, dateStr)) return "unavailable";
    const availabilityStatus = getAvailabilitySlotStatus(availability, dateStr, slot);
    if (isAvailabilityStatusBlocked(availabilityStatus)) return availabilityStatus;
    if (isDateBooked(dateStr, { hourly: true })) return "booked";
    return "free";
  };

  useEffect(() => {
    if (bookingDuration !== "soatlik" || !checkInDate) return;
    setSelectedTimeSlots((current) => {
      const availableSlots = current.filter((slot) => getSlotStatus(checkInDate, slot) === "free");
      if (availableSlots.length !== current.length && !availabilityLoading) {
        setBookingError("Tanlangan vaqt band bo'lib qoldi. Boshqa vaqtni tanlang.");
      }
      return availableSlots;
    });
  }, [availability, bookingDuration, checkInDate]);

  const { totalPrice, hasBlockedDay, dailyRatesBreakdown } = useMemo(() => {
    if (!checkInDate) return { totalPrice: 0, hasBlockedDay: false, dailyRatesBreakdown: [] };

    if (bookingDuration === "soatlik") {
      const safeSlots = selectedTimeSlots.filter((slot) => getSlotStatus(checkInDate, slot) === "free");
      const hasUnavailableSlot = selectedTimeSlots.some((slot) => isAvailabilityStatusBlocked(getSlotStatus(checkInDate, slot)));
      const total = parsedBasePrice * safeSlots.length;
      return {
        totalPrice: total,
        hasBlockedDay: isDateBooked(checkInDate, { hourly: true }) || hasUnavailableSlot,
        dailyRatesBreakdown: safeSlots.length > 1
          ? [{ date: `${formatShortDate(checkInDate)} (${safeSlots.length} soat)`, rate: total }]
          : safeSlots.map((slot) => ({ date: `${formatShortDate(checkInDate)} ${slot}`, rate: parsedBasePrice }))
      };
    }

    if (bookingDuration === "haftalik" || bookingDuration === "oylik") {
      const blocked = selectedRange.some((dateStr) => isDateBooked(dateStr));
      return {
        totalPrice: parsedBasePrice * days,
        hasBlockedDay: blocked,
        dailyRatesBreakdown: [{
          date: `${formatShortDate(checkInDate)} - ${formatShortDate(checkOutDate)}`,
          rate: parsedBasePrice * days
        }]
      };
    }

    let sum = 0;
    let blocked = false;
    selectedRange.forEach((dateStr) => {
      if (isDateBooked(dateStr)) blocked = true;
      const overridePrice = space.priceOverrides?.[dateStr];
      const rate = overridePrice !== undefined ? Number(overridePrice) : parsedBasePrice;
      sum += rate;
    });

    let breakdown = [];
    if (selectedRange.length > 1) {
      breakdown = [{
        date: `${formatShortDate(checkInDate)} - ${formatShortDate(checkOutDate || checkInDate)}`,
        rate: sum
      }];
    } else if (selectedRange.length === 1) {
      breakdown = [{
        date: formatShortDate(checkInDate),
        rate: sum
      }];
    }

    return { totalPrice: sum, hasBlockedDay: blocked, dailyRatesBreakdown: breakdown };
  }, [checkInDate, checkOutDate, days, selectedRange, selectedTimeSlots, bookingDuration, spaceBookings, space, parsedBasePrice, availability]);

  const discountAmount = useMemo(() => {
    if (!activeAppliedDiscount || totalPrice <= 0) return 0;
    return Math.round(totalPrice * (activeAppliedDiscount.percent / 100));
  }, [activeAppliedDiscount, totalPrice]);

  const serviceFee = totalPrice > 0 ? Math.max(25000, Math.round((totalPrice - discountAmount) * 0.08)) : 0;
  const finalTotal = Math.max(0, totalPrice - discountAmount + serviceFee);

  const goToImage = (index) => {
    if (galleryImages.length === 0) return;
    const nextIndex = (index + galleryImages.length) % galleryImages.length;
    setActiveImage(nextIndex);
  };

  const moveMonth = (offset) => {
    const next = getMonthOffset(calYear, calMonth, offset);
    setCalYear(next.year);
    setCalMonth(next.month);
  };

  const syncRangeForMode = (mode, startDate, units = 1) => {
    if (mode === "soatlik") {
      setCheckInDate(startDate);
      setCheckOutDate(startDate);
      setDays(1);
      setHourPanelDate(startDate);
      return;
    }

    setHourPanelDate(null);
    setSelectedTimeSlots([]);

    if (mode === "haftalik") {
      setCheckInDate(startDate);
      setCheckOutDate(addDays(startDate, (units * 7) - 1));
      setDays(units);
      return;
    }

    if (mode === "oylik") {
      setCheckInDate(startDate);
      setCheckOutDate(addDays(addMonths(startDate, units), -1));
      setDays(units);
      return;
    }

    setCheckInDate(startDate);
    setCheckOutDate(startDate);
    setDays(1);
  };

  const handleDurationChange = (durationId) => {
    setBookingError("");
    setBookingDuration(durationId);
    syncRangeForMode(durationId, checkInDate || getDefaultBookingDate(), 1);
  };

  const getDateSelectionRange = (dateStr) => {
    if (bookingDuration === "haftalik") return buildDateRange(dateStr, addDays(dateStr, 6));
    if (bookingDuration === "oylik") return buildDateRange(dateStr, addDays(addMonths(dateStr, 1), -1));
    if (bookingDuration === "kunlik" && checkInDate && !checkOutDate && dateStr >= checkInDate) {
      return buildDateRange(checkInDate, dateStr);
    }
    return [dateStr];
  };

  const getRangeAvailabilityError = (range, { hourly = false } = {}) => {
    if (!availability || availabilityLoading || availabilityError) {
      return "Kalendar ma'lumotlari yuklanmadi. Bron qilishdan oldin qayta urinib ko'ring.";
    }
    if (range.some((dateStr) => !isAvailabilityDateCovered(availability, dateStr))) {
      return "Tanlangan davr uchun bandlik ma'lumotlari hali yuklanmagan. Kalendar oyini almashtirib qayta urinib ko'ring.";
    }
    if (range.some((dateStr) => isDateBooked(dateStr, { hourly }))) {
      return hourly
        ? "Bu kun to'liq band. Boshqa sanani tanlang."
        : "Tanlangan davrda band yoki yopiq kun bor. Boshqa sanalarni tanlang.";
    }
    return "";
  };

  const handleCalendarDateClick = (dateStr) => {
    if (!dateStr) return;
    const selectionError = getRangeAvailabilityError(
      getDateSelectionRange(dateStr),
      { hourly: bookingDuration === "soatlik" }
    );
    if (selectionError) {
      setBookingError(selectionError);
      return;
    }
    setBookingError("");

    if (bookingDuration === "soatlik") {
      const previousDate = checkInDate;
      syncRangeForMode("soatlik", dateStr, 1);
      if (previousDate !== dateStr) setSelectedTimeSlots([]);
      return;
    }

    if (bookingDuration === "haftalik") {
      syncRangeForMode("haftalik", dateStr, 1);
      return;
    }

    if (bookingDuration === "oylik") {
      syncRangeForMode("oylik", dateStr, 1);
      return;
    }

    if (!checkInDate || checkOutDate || dateStr < checkInDate) {
      setCheckInDate(dateStr);
      setCheckOutDate(null);
      setDays(1);
      return;
    }

    setCheckOutDate(dateStr);
    setDays(getDayDiff(checkInDate, dateStr));
  };

  const handleTimeSlotToggle = (slot) => {
    const status = getSlotStatus(checkInDate, slot);
    if (isAvailabilityStatusBlocked(status)) {
      setBookingError(
        status === "unavailable"
          ? "Bu vaqt uchun bandlik ma'lumotlari yuklanmagan. Qayta urinib ko'ring."
          : status === "blocked"
            ? "Bu vaqt joy egasi tomonidan yopilgan. Boshqa vaqtni tanlang."
            : "Bu vaqt allaqachon band. Boshqa vaqtni tanlang."
      );
      return;
    }
    setBookingError("");
    setSelectedTimeSlots((current) => (
      current.includes(slot)
        ? current.filter((item) => item !== slot)
        : [...current, slot].sort()
    ));
  };

  const bookingUnitLabel = bookingDuration === "soatlik"
    ? `${selectedTimeSlots.length || 0} soat`
    : bookingDuration === "haftalik"
      ? `${days} hafta`
      : bookingDuration === "oylik"
        ? `${days} oy`
        : `${selectedRange.length} kun`;

  const bookingRangeLabel = bookingDuration === "soatlik"
    ? `${formatShortDate(checkInDate)} ${selectedTimeSlots.length ? selectedTimeSlots.join(", ") : "vaqt tanlanmagan"}`
    : checkOutDate && checkOutDate !== checkInDate
      ? `${formatShortDate(checkInDate)} - ${formatShortDate(checkOutDate)}`
      : formatShortDate(checkInDate);

  const getCheckoutAvailabilityError = () => {
    if (!checkInDate) return "Bron qilish uchun sanani tanlang.";
    const rangeError = getRangeAvailabilityError(selectedRange, { hourly: bookingDuration === "soatlik" });
    if (rangeError) return rangeError;
    if (bookingDuration === "soatlik") {
      if (selectedTimeSlots.length === 0) return "Soatlik bron uchun kamida bitta vaqt oralig'ini tanlang.";
      const unavailableSlot = selectedTimeSlots.find((slot) => isAvailabilityStatusBlocked(getSlotStatus(checkInDate, slot)));
      if (unavailableSlot) return `${unavailableSlot} vaqti band yoki mavjud emas. Boshqa vaqtni tanlang.`;
    }
    return "";
  };

  const checkoutAvailabilityError = getCheckoutAvailabilityError();

  const monthNames = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];

  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState("");
  const [usingMockReviews, setUsingMockReviews] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewEligibility, setReviewEligibility] = useState({
    loading: false,
    allowed: false,
    reason: "",
  });
  const [helpfulCounts, setHelpfulCounts] = useState({});

  const loadReviews = useCallback(async ({ allowDevFallback = true } = {}) => {
    if (!placeId) {
      setReviews([]);
      setUsingMockReviews(false);
      setReviewsLoading(false);
      setReviewsError("");
      return [];
    }

    setReviewsLoading(true);
    setReviewsError("");
    try {
      const response = await api.get("/api/reviews/", { params: { place: placeId }, skipAuth: true });
      const data = response.data?.results || response.data || [];
      const backendReviews = Array.isArray(data) ? data.map(normalizeReview) : [];
      setReviews(backendReviews);
      setUsingMockReviews(false);
      return backendReviews;
    } catch (error) {
      if (import.meta.env.DEV && allowDevFallback) {
        // Mock reviews are an explicit offline development aid, never production content.
        const fallback = getReviewFallback();
        setReviews(fallback);
        setUsingMockReviews(fallback.length > 0);
        setReviewsError(`${getApiErrorMessage(error, "Не удалось загрузить отзывы.")} Показан DEV fallback.`);
        return fallback;
      }

      setReviews([]);
      setUsingMockReviews(false);
      setReviewsError(getApiErrorMessage(error, "Не удалось загрузить отзывы."));
      throw error;
    } finally {
      setReviewsLoading(false);
    }
  }, [placeId]);

  // Fetch reviews from backend API on mount or space change.
  useEffect(() => {
    loadReviews().catch(() => {});
  }, [loadReviews]);

  useEffect(() => {
    setShowReviewForm(false);
    setReviewError("");

    if (!placeId || !userState?.isAuthed || !getAccessToken()) {
      setReviewEligibility({ loading: false, allowed: false, reason: "" });
      return;
    }

    let cancelled = false;
    setReviewEligibility({ loading: true, allowed: false, reason: "" });
    api.get("/api/reviews/eligibility/", { params: { place: placeId } })
      .then((response) => {
        if (cancelled) return;
        setReviewEligibility({
          loading: false,
          allowed: Boolean(response.data?.allowed),
          reason: response.data?.reason || "",
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setReviewEligibility({
          loading: false,
          allowed: false,
          reason: getApiErrorMessage(err, "Не удалось проверить право на отзыв."),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [placeId, userState?.isAuthed]);

  const handleHelpful = (name) => {
    setHelpfulCounts(prev => ({
      ...prev,
      [name]: (prev[name] || 0) + 1
    }));
  };

  const averageRating = useMemo(() => {
    if (!usingMockReviews) return Number(space?.rating_avg || 0).toFixed(1);
    if (reviews.length === 0) return "0.0";
    return (reviews.reduce((acc, item) => acc + item.rating, 0) / reviews.length).toFixed(1);
  }, [reviews, space?.rating_avg, space?.reviews_count, usingMockReviews]);

  const reviewsCount = usingMockReviews ? reviews.length : Number(space?.reviews_count || 0);
  const overallRatingPercent = Math.max(0, Math.min(100, Math.round((Number(averageRating) / 5) * 100)));

  const handleReviewSubmit = async (event) => {
    event.preventDefault();

    if (!userState?.isAuthed || !getAccessToken()) {
      navigate("/login");
      return;
    }

    if (!reviewEligibility.allowed) {
      setReviewError(reviewEligibility.reason || "Отзыв доступен после подтверждённого или завершённого бронирования.");
      return;
    }

    const comment = reviewComment.trim();
    if (!comment) {
      setReviewError("Sharh matnini yozing.");
      return;
    }

    try {
      setReviewSubmitting(true);
      setReviewError("");
      await api.post("/api/reviews/", {
        place: placeId,
        rating: Number(reviewRating),
        comment
      });
      setReviewComment("");
      setReviewRating(5);
      setShowReviewForm(false);

      const [reviewsResult, placeResult] = await Promise.allSettled([
        loadReviews({ allowDevFallback: false }),
        api.get(`/api/places/${placeId}/`, { skipAuth: true }),
      ]);

      if (placeResult.status === "fulfilled") {
        setSpace(normalizePlace(placeResult.value.data));
      }
      if (reviewsResult.status === "rejected" || placeResult.status === "rejected") {
        setReviewError("Отзыв сохранён, но обновить рейтинг не удалось. Обновите страницу.");
      }
    } catch (err) {
      const message = getApiErrorMessage(err, "Sharh yuborilmadi. Tasdiqlangan bron kerak bo'lishi mumkin.");
      setReviewError(message);
    } finally {
      setReviewSubmitting(false);
    }
  };

  const similarSpaces = useMemo(() => {
    return relatedSpaces;
  }, [relatedSpaces]);

  useEffect(() => {
    setActiveImage(0);
    setShowGalleryModal(false);
    setGuests(Math.min(space.people || 4, 4));
  }, [space]);

  useEffect(() => {
    if (placeLoading || placeEmpty || !placeId) return undefined;

    const ctx = gsap.context(() => {
      const animate = (selector, from, to) => {
        const targets = document.querySelectorAll(selector);
        if (targets.length > 0) gsap.fromTo(targets, from, to);
      };

      // Hero elements cascade
      animate(
        ".sd-hero-copy > *",
        { y: 24, opacity: 0, filter: "blur(6px)" },
        { y: 0, opacity: 1, filter: "blur(0px)", duration: 0.7, stagger: 0.08, ease: "power3.out" }
      );

      // Gallery fade-in slide
      animate(
        ".sd-gallery",
        { x: 30, opacity: 0, filter: "blur(8px)" },
        { x: 0, opacity: 1, filter: "blur(0px)", duration: 0.8, ease: "power3.out", delay: 0.1 }
      );

      // Stats stagger cards
      animate(
        ".sd-stat",
        { y: 25, opacity: 0, scale: 0.96 },
        { y: 0, opacity: 1, scale: 1, duration: 0.6, stagger: 0.07, ease: "back.out(1.15)", delay: 0.2 }
      );

      // Booking card float-up
      animate(
        ".sd-booking-card",
        { y: 40, opacity: 0, scale: 0.97 },
        { y: 0, opacity: 1, scale: 1, duration: 0.85, ease: "power3.out", delay: 0.25 }
      );

      // Amenities fade-in list
      animate(
        ".sd-amenities span",
        { y: 15, opacity: 0, scale: 0.96 },
        { y: 0, opacity: 1, scale: 1, duration: 0.5, stagger: 0.04, ease: "power2.out", delay: 0.3 }
      );

      // Reviews fade-in
      animate(
        ".sd-reviews-panel > *",
        { y: 25, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.75, stagger: 0.1, ease: "power2.out", delay: 0.35 }
      );

      // Similar spaces grid
      animate(
        ".sd-similar .property-card",
        { y: 35, opacity: 0, scale: 0.98 },
        { y: 0, opacity: 1, scale: 1, duration: 0.75, stagger: 0.08, ease: "power3.out", delay: 0.4 }
      );
    });
    return () => ctx.revert();
  }, [space, placeId, placeLoading, placeEmpty, relatedSpaces.length]);

  const todayKey = toDateKey(new Date());
  const availabilityReady = Boolean(availability) && !availabilityLoading && !availabilityError;

  const renderCalendarMonth = (year, month, monthDays, isNext = false) => (
    <div className={`sd-calendar-card ${isNext ? "is-next" : "is-current"}`}>
      <div className="sd-calendar-head">
        <div>
          <span>{isNext ? "Keyingi oy" : "Tanlash"}</span>
          <strong>{monthNames[month]} {year}</strong>
        </div>
        {!isNext && (
          <div className="sd-calendar-arrows">
            <button type="button" onClick={() => moveMonth(-1)} aria-label="Oldingi oy">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button type="button" onClick={() => moveMonth(1)} aria-label="Keyingi oy">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <div className="sd-weekdays">
        {weekdayLabels.map((label) => <span key={`${year}-${month}-${label}`}>{label}</span>)}
      </div>

      <div className="sd-calendar-grid">
        {monthDays.map((day, index) => {
          if (day.isMuted) return <span key={`muted-${year}-${month}-${index}`} className="sd-calendar-day is-empty" />;

          const dateStr = day.dateStr;
          const booked = Boolean(getRangeAvailabilityError(
            getDateSelectionRange(dateStr),
            { hourly: bookingDuration === "soatlik" }
          ));
          const selected = selectedDateSet.has(dateStr);
          const isStart = dateStr === checkInDate;
          const isEnd = dateStr === checkOutDate && checkOutDate !== checkInDate;
          const isToday = dateStr === todayKey;
          const className = [
            "sd-calendar-day",
            booked ? "is-booked" : "",
            selected ? "is-selected" : "",
            selected && !isStart && !isEnd ? "is-in-range" : "",
            isStart ? "is-range-start" : "",
            isEnd ? "is-range-end" : "",
            isToday ? "is-today" : ""
          ].filter(Boolean).join(" ");

          return (
            <button
              key={dateStr}
              type="button"
              className={className}
              data-unavailable={booked ? "true" : undefined}
              onClick={() => handleCalendarDateClick(dateStr)}
              title={!availabilityReady ? "Kalendar hali yuklanmagan" : booked ? "Band qilingan" : dateStr}
            >
              <span>{day.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  if (placeLoading) {
    return (
      <main className="space-detail-shell">
        <JoyNavbar userState={userState} setUserState={setUserState} activeIndex={2} />
        <section className="sd-section" style={{ maxWidth: 1180, margin: "40px auto", padding: "28px" }}>
          <div className="sd-section-head">
            <p>Joyzone</p>
            <h2>Joy ma'lumotlari yuklanmoqda...</h2>
          </div>
        </section>
        <JoyFooter />
      </main>
    );
  }

  if (placeEmpty) {
    return (
      <main className="space-detail-shell">
        <JoyNavbar userState={userState} setUserState={setUserState} activeIndex={2} />
        <section className="sd-section" style={{ maxWidth: 1180, margin: "40px auto", padding: "28px" }}>
          <div className="sd-section-head">
            <p>Joy topilmadi</p>
            <h2>{placeError || "Место не найдено или ещё не опубликовано."}</h2>
          </div>
          <a className="sd-primary-btn" href="/filter">Barcha joylarni ko'rish</a>
        </section>
        <JoyFooter />
      </main>
    );
  }

  return (
    <main className="space-detail-shell">
      <JoyNavbar userState={userState} setUserState={setUserState} activeIndex={2} />

      {[placeError, parametersError, discountError, detailError].filter(Boolean).map((message) => (
        <div key={message} style={{ margin: "18px auto 0", maxWidth: 1180, padding: "10px 12px", borderRadius: 10, background: "#fef2f2", color: "#991b1b", fontSize: 13 }}>
          {message}
        </div>
      ))}

      <section className="sd-hero">
        <div className="sd-hero-copy sd-animate">
          <div className="sd-kicker">
            <span>{space.category}</span>
            {space.promoted ? <b>Top joy</b> : null}
            {usingDevPlaceFallback ? <b style={{ background: "#fee2e2", color: "#991b1b" }}>DEV fallback</b> : null}
          </div>
          <h1>{space.title}</h1>
          <p>
            {lang === 'uz'
              ? "Jamoaviy ish, uchrashuv, taqdimot va qisqa muddatli ijara uchun tayyor maydon."
              : "Готовое пространство для командной работы, встреч, презентаций и краткосрочной аренды."}
          </p>
          <a
            className="sd-location"
            href={space.latitude && space.longitude
              ? `https://www.google.com/maps?q=${space.latitude},${space.longitude}`
              : `https://www.google.com/maps/search/${encodeURIComponent(space.location || "")}`}
            target="_blank"
            rel="noreferrer"
          >
            <Icon type="map" />
            <span>{space.location}</span>
            <em>{lang === 'uz' ? "Xaritada" : "На карте"} ↗</em>
          </a>

          <div className="sd-hero-panel">
            <div className="sd-hero-price">
              <span>
                <small>{availableDurations[0]?.label || "Kunlik"} {lang === 'uz' ? "narx" : "цена"}</small>
                <b>{availableDurations[0]?.price || space.price}</b>
              </span>
              <button
                type="button"
                className="sd-hero-book"
                onClick={() => document.querySelector(".sd-booking")?.scrollIntoView({ behavior: "smooth", block: "start" })}
              >
                <Icon type="calendar" />
                {lang === 'uz' ? "Bron qilish" : "Забронировать"}
              </button>
            </div>
            {space.owner_id ? (
              <a className="sd-hero-host" href={`/agent-${space.owner_id}`}>
                <span className="sd-hero-host-avatar"><PackIcon name="user" /></span>
                <span className="sd-hero-host-name">
                  <small>{lang === 'uz' ? "Joy egasi" : "Владелец"}</small>
                  <b>{space.owner_name}</b>
                </span>
                <em><Icon type="star" />{reviewsCount > 0 ? averageRating : (lang === 'uz' ? "Yangi" : "Новый")}</em>
                <i aria-hidden="true">→</i>
              </a>
            ) : null}
          </div>
        </div>

        <div className="sd-gallery sd-animate">
          <div className="sd-main-photo">
            <img key={`${galleryImages[activeImage]}-${activeImage}`} src={galleryImages[activeImage]} alt={space.title} />
            {galleryImages.length > 1 && (
              <>
                <button type="button" className="sd-gallery-nav sd-gallery-prev" onClick={() => goToImage(activeImage - 1)} aria-label="Oldingi rasm">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
                <button type="button" className="sd-gallery-nav sd-gallery-next" onClick={() => goToImage(activeImage + 1)} aria-label="Keyingi rasm">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </>
            )}
            <button
              ref={likeBtnRef}
              type="button"
              className={`sd-like ${liked ? "is-liked" : ""}`}
              onClick={handleLikeToggle}
              aria-label={liked ? "Yoqtirildi" : "Yoqtirish"}
              aria-pressed={liked}
              aria-busy={favoritePending}
              disabled={favoritePending}
            >
              <HeartIcon filled={liked} />
            </button>
            {favoriteError ? <span className="sd-favorite-error" role="alert">{favoriteError}</span> : null}
            <button type="button" className="sd-share" aria-label="Ulashish" onClick={() => { if(navigator.share) navigator.share({ url: window.location.href }); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3"></circle>
                <circle cx="6" cy="12" r="3"></circle>
                <circle cx="18" cy="19" r="3"></circle>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
              </svg>
            </button>
          </div>
          {galleryImages.length > 1 && (
            <div className="sd-gallery-dots" aria-hidden="true">
              {galleryImages.map((image, index) => (
                <span key={`${image}-dot`} className={index === activeImage ? "is-active" : ""} />
              ))}
            </div>
          )}
          <div className="sd-thumbs" aria-label="Rasmlar">
            {previewThumbs.map((image, index) => (
              <button
                type="button"
                key={image}
                className={index === activeImage ? "is-active" : ""}
                onClick={() => setActiveImage(index)}
                aria-label={`${index + 1}-rasm`}
                aria-pressed={index === activeImage}
              >
                <img src={image} alt="" />
              </button>
            ))}
            {galleryImages.length > 4 && (
              <button
                type="button"
                className="sd-thumb-more"
                onClick={() => setShowGalleryModal(true)}
                aria-label={`Barcha ${galleryImages.length} ta rasmni ochish`}
              >
                <img src={galleryImages[3]} alt="" />
                <span>
                  <b>+{galleryImages.length - 3}</b>
                  Barcha rasmlar
                </span>
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="sd-content">
        <div className="sd-main">
          <div className="sd-stat-grid sd-animate">
            <DetailStat icon="users" label={lang === 'uz' ? "Sig'im" : "Вместимость"} value={`${space.people || 0} ${lang === 'uz' ? 'kishi' : 'чел.'}`} />
            <DetailStat icon="area" label={lang === 'uz' ? "Maydon" : "Площадь"} value={`${space.area || 0} m²`} />
            
            {/* Render counter/select parameters from characteristics */}
            {allParameters
              .filter(p => p.type !== 'boolean' && space.characteristics && space.characteristics[p.slug] !== undefined)
              .map(p => {
                const val = space.characteristics[p.slug];
                let valText = val;
                if (p.type === 'select') {
                  const opt = p.config?.options?.find(o => o.slug === val);
                  if (opt) {
                    valText = lang === 'uz' ? (opt.uz || opt.ru) : (opt.ru || opt.uz);
                  }
                }
                return (
                  <DetailStat 
                    key={p.slug}
                    icon={resolveIconName(p.icon, p.slug, p.name_ru)} 
                    label={lang === 'uz' ? (p.name_uz || p.name_ru) : (p.name_ru || p.name_uz)} 
                    value={valText} 
                  />
                );
              })}

            <DetailStat icon="clock" label={lang === 'uz' ? "Ish vaqti" : "Часы работы"} value={formatWorkingHours(space.opens_at, space.closes_at)} />
            <DetailStat icon="calendar" label={lang === 'uz' ? "Format" : "Формат"} value={space.booking_type === "instant" ? (lang === 'uz' ? "Tezkor" : "Мгновенно") : (lang === 'uz' ? "So'rov" : "По запросу")} />
            <DetailStat icon="shield" label="Status" value={space.status === "approved" ? (lang === 'uz' ? "Faol" : "Активен") : (lang === 'uz' ? "Tekshirilmoqda" : "Модерация")} />
          </div>

          <section className="sd-section sd-animate">
            <div className="sd-section-head">
              <p>{lang === 'uz' ? "Joy haqida" : "О пространстве"}</p>
              <h2>{lang === 'uz' ? "Qulay, tayyor va tez bron qilinadi" : "Удобно, готово и быстро бронируется"}</h2>
            </div>
            <p className="sd-description">
              {lang === 'uz' ? space.description_uz : lang === 'en' ? space.description_en : space.description_ru}
              {!(lang === 'uz' ? space.description_uz : lang === 'en' ? space.description_en : space.description_ru) && (
                lang === 'uz' 
                  ? "Bu maydon Joyzone orqali uchrashuv, seminar, ishchi sprint yoki qisqa muddatli ijara uchun tanlanadi. Narx, sig'im, rasm va asosiy shartlar bir joyda ko'rinadi, bron so'rovi esa mezbonga darhol yuboriladi."
                  : "Это пространство выбирают через Joyzone для встреч, семинаров, рабочих спринтов или краткосрочной аренды. Цена, вместимость, фотографии и основные условия видны сразу, а запрос на бронирование мгновенно отправляется хозяину."
              )}
            </p>
          </section>

          <section className="sd-section sd-animate">
            <div className="sd-section-head">
              <p>{lang === 'uz' ? "Qulayliklar" : "Удобства"}</p>
              <h2>{lang === 'uz' ? "Kerakli servislar tayyor" : "Все необходимые удобства готовы"}</h2>
            </div>
            <div className="sd-amenities">
              {selectedAmenities.length === 0 ? (
                <span style={{ color: "#64748b", background: "none", border: "none", padding: 0 }}>
                  {lang === 'uz' ? "Qulayliklar belgilanmagan" : "Удобства не указаны"}
                </span>
              ) : (
                selectedAmenities.slice(0, 8).map((p) => (
                  <span key={p.slug}>
                    <PackIcon name={resolveIconName(p.icon, p.slug, p.name_ru)} />
                    {lang === 'uz' ? (p.name_uz || p.name_ru) : (p.name_ru || p.name_uz)}
                  </span>
                ))
              )}
            </div>
            {selectedAmenities.length > 8 && (
              <button 
                type="button" 
                className="sd-more-amenities-btn"
                onClick={() => setShowAmenitiesModal(true)}
              >
                {lang === 'uz' ? `Barcha qulayliklar (${selectedAmenities.length})` : `Все удобства (${selectedAmenities.length})`}
              </button>
            )}
          </section>

          <section className="sd-section sd-animate">
            <div className="sd-section-head sd-review-head">
              <div>
                <p>Sharhlar ({reviewsCount})</p>
                <h2>Mehmonlar fikri</h2>
              </div>
              {userState?.isAuthed && reviewEligibility.allowed ? (
                <button
                  type="button"
                  className={`sd-write-review-btn ${showReviewForm ? "is-active" : ""}`}
                  onClick={() => setShowReviewForm((current) => !current)}
                >
                  {showReviewForm ? "Bekor qilish" : "Sharh qoldirish"}
                </button>
              ) : null}
            </div>

            {userState?.isAuthed && reviewEligibility.loading ? (
              <div className="sd-booking-warning">Отзыв huquqi tekshirilmoqda...</div>
            ) : null}

            {userState?.isAuthed && !reviewEligibility.loading && !reviewEligibility.allowed && reviewEligibility.reason ? (
              <div className="sd-booking-warning">{reviewEligibility.reason}</div>
            ) : null}

            {reviewError ? <div className="sd-booking-warning">{reviewError}</div> : null}
            {reviewsError ? <div className="sd-booking-warning">{reviewsError}</div> : null}

            {userState?.isAuthed && reviewEligibility.allowed && showReviewForm ? (
              <form className="sd-review-form" onSubmit={handleReviewSubmit}>
                <h3>Sharh qoldirish</h3>
                <label className="sd-form-label">
                  <span>Fikringiz</span>
                  <textarea
                    rows="4"
                    value={reviewComment}
                    onChange={(event) => setReviewComment(event.target.value)}
                    placeholder="Joy, xizmat va bron tajribangiz haqida yozing"
                  />
                </label>
                <div className="sd-rating-select-row">
                  <span>Reyting</span>
                  <div className="sd-rating-stars-input">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        className="sd-star-input-btn"
                        onClick={() => setReviewRating(value)}
                        aria-label={`${value} reyting`}
                      >
                        <svg viewBox="0 0 24 24" fill={value <= reviewRating ? "#ffbd22" : "none"} stroke="#ffbd22" strokeWidth="2" style={{ width: 24, height: 24 }}>
                          <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 16.9 6.6 19.8l1-6.1-4.4-4.3 6.1-.9L12 3Z" />
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>
                <button type="submit" className="sd-submit-review-btn" disabled={reviewSubmitting}>
                  {reviewSubmitting ? "Yuborilmoqda..." : "Sharhni yuborish"}
                </button>
              </form>
            ) : null}

            <div className="sd-reviews-panel">
              {usingMockReviews ? (
                <div style={{ gridColumn: "1 / -1", marginBottom: 10, padding: "8px 10px", borderRadius: 10, background: "#fff7ed", color: "#9a3412", fontSize: 12 }}>
                  DEV fallback reviews
                </div>
              ) : null}
              {reviews.length > 0 ? (
                <aside className="sd-review-score">
                  <div className="sd-score-big-circle">
                    <span>{averageRating}</span>
                    <small>5.0 dan</small>
                  </div>
                  <div className="sd-score-meta">
                    <Stars value={Math.round(Number(averageRating))} />
                    <strong>{reviewsCount} ta sharh asosida</strong>
                    <p>Umumiy reyting backend orqali saqlangan foydalanuvchi sharhlaridan hisoblangan.</p>
                  </div>
                  <div className="sd-score-bars" aria-label="Umumiy reyting">
                    <div className="sd-score-bar-row">
                      <span>Umumiy</span>
                      <div className="sd-progress-track">
                        <b style={{ "--score": `${overallRatingPercent}%` }} />
                      </div>
                      <strong>{overallRatingPercent}%</strong>
                    </div>
                  </div>
                </aside>
              ) : null}

              <div className="sd-reviews-list-container">
                <div className="sd-reviews">
                  {reviewsLoading ? (
                    <div className="sd-no-reviews">
                      <p>Sharhlar yuklanmoqda...</p>
                    </div>
                  ) : reviews.length === 0 ? (
                    <div className="sd-no-reviews">
                      <p>Hozircha sharhlar yo'q.</p>
                    </div>
                  ) : (
                    reviews.map((review, i) => {
                      const avatarGrad = [
                        "linear-gradient(135deg, #ff6b6b, #ff8e53)",
                        "linear-gradient(135deg, #4e54c8, #8f94fb)",
                        "linear-gradient(135deg, #11998e, #38ef7d)",
                        "linear-gradient(135deg, #fc00ff, #00dbde)",
                        "linear-gradient(135deg, #f12711, #f5af19)"
                      ][i % 5];
                      
                      return (
                        <article key={review.id || review.name + i} className="sd-review-card">
                          <div className="sd-review-header-row">
                            <div className="sd-review-user-info">
                              <div className="sd-review-avatar" style={{ background: avatarGrad }}>
                                {review.avatar
                                  ? <img src={review.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }} />
                                  : review.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <strong>{review.name}</strong>
                                <span>{review.role} • {review.date}</span>
                              </div>
                            </div>
                            <div className="sd-review-rating-badge">
                              <svg viewBox="0 0 24 24" fill="#ffbd22" style={{ width: "14px", height: "14px", marginRight: "4px" }}>
                                <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 16.9 6.6 19.8l1-6.1-4.4-4.3 6.1-.9L12 3Z" />
                              </svg>
                              <span>{Number(review.rating || 0).toFixed(1)}</span>
                            </div>
                          </div>

                          <div className="sd-review-body">
                            <p>{review.text}</p>
                          </div>

                          <div className="sd-review-footer">
                            <span className="sd-verified-tag">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: "12px", height: "12px", marginRight: "4px", color: "#38ef7d" }}>
                                <path d="m20 6-11 11-5-5" />
                              </svg>
                              Tasdiqlangan bron
                            </span>

                            <button 
                              type="button" 
                              className="sd-helpful-btn"
                              onClick={() => handleHelpful(review.name + i)}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: "14px", height: "14px" }}>
                                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                              </svg>
                              <span>Foydali ({helpfulCounts[review.name + i] || 0})</span>
                            </button>
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>

        <aside className="sd-booking sd-animate">
          <div className="sd-booking-card">
            <div className="sd-price-row">
              <div>
                <span>Narx ({availableDurations.find(d => d.id === bookingDuration)?.label?.toLowerCase() || 'kunlik'})</span>
                <strong>{availableDurations.find(d => d.id === bookingDuration)?.price || space.price}</strong>
              </div>
              <span className="sd-rating">
                <Icon type="star" />
                {averageRating}
              </span>
            </div>

            <div className="sd-duration-selector">
              {availableDurations.map(d => (
                <button
                  key={d.id}
                  type="button"
                  className={bookingDuration === d.id ? "is-active" : ""}
                  onClick={() => handleDurationChange(d.id)}
                >
                  <span>{d.label}</span>
                  <small>{d.id === "soatlik" ? "Soat" : d.id === "haftalik" ? "Hafta" : d.id === "oylik" ? "Oy" : "Kun"}</small>
                </button>
              ))}
            </div>

            <div className="sd-calendar-shell">
              <div className="sd-calendar-title">
                <div>
                  <span>Sanani tanlang</span>
                  <strong>{bookingRangeLabel}</strong>
                </div>
                <small>{bookingDuration === "soatlik" ? "Kun + vaqt" : bookingDuration === "oylik" ? "1 oy avtomatik" : bookingDuration === "haftalik" ? "1 hafta avtomatik" : "Boshlanish va tugash"}</small>
              </div>

              <div className="sd-calendar-stage">
                <div className="sd-calendar-pair">
                  {renderCalendarMonth(calYear, calMonth, calendarDays)}
                  {renderCalendarMonth(nextCalendar.year, nextCalendar.month, nextCalendarDays, true)}
                </div>
              </div>

              {bookingDuration === "soatlik" && hourPanelDate && (
                <div className="sd-hour-panel">
                  <div className="sd-hour-panel-head">
                    <div>
                      <span>{formatShortDate(hourPanelDate)}</span>
                      <strong>Vaqt oralig'ini tanlang</strong>
                    </div>
                    <small>Band / Bo'sh</small>
                  </div>
                  <div className="sd-hour-slots">
                    {placeHourlySlots.map((slot) => {
                      const status = getSlotStatus(hourPanelDate, slot);
                      const selected = selectedTimeSlots.includes(slot);
                      const unavailable = isAvailabilityStatusBlocked(status) || !availabilityReady;
                      return (
                        <button
                          key={slot}
                          type="button"
                          className={`sd-hour-slot ${unavailable ? "is-booked" : ""} ${selected ? "is-selected" : ""}`}
                          data-unavailable={unavailable ? "true" : undefined}
                          onClick={() => handleTimeSlotToggle(slot)}
                        >
                          <strong>{slot}</strong>
                          <span>{unavailable ? (status === "unavailable" ? "Yuklanmagan" : status === "blocked" ? "Yopiq" : "Band") : selected ? "Tanlandi" : "Bo'sh"}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="sd-booking-controls">
              <label>
                <span>Muddat</span>
                <input readOnly value={bookingUnitLabel} />
              </label>
              <label>
                <span>Mehmon</span>
                <input min="1" max={space.people || 1} type="number" value={guests} onChange={(event) => setGuests(Math.max(1, Math.min(space.people || 1, Number(event.target.value) || 1)))} />
              </label>
            </div>

            <div className="sd-total-box">
              {availabilityLoading ? (
                <div className="sd-booking-warning" style={{ marginBottom: 10 }}>
                  Kalendar yuklanmoqda...
                </div>
              ) : null}
              {availabilityError ? (
                <div className="sd-booking-warning" style={{ marginBottom: 10 }}>
                  {availabilityError}
                </div>
              ) : null}
              <div className="sd-receipt-period">
                <span className="sd-receipt-icon"><Icon type="calendar" /></span>
                <div>
                  <small>{bookingDuration === 'soatlik' ? 'Soatlik' : bookingDuration === 'haftalik' ? 'Haftalik' : bookingDuration === 'oylik' ? 'Oylik' : 'Kunlik'} ijara</small>
                  <b>{dailyRatesBreakdown[0]?.date || (bookingDuration === "soatlik" ? "Vaqt tanlang" : "Sana tanlang")}</b>
                </div>
                <em>{bookingUnitLabel}</em>
              </div>
              <div className="sd-receipt-lines">
                <p>
                  <span>{lang === 'uz' ? "Ijara summasi" : "Аренда"}</span>
                  <b>{formatMoney(totalPrice)}</b>
                </p>
                {discountAmount > 0 && activeAppliedDiscount && (
                  <p className="is-discount">
                    <span title={lang === 'uz' ? (activeAppliedDiscount.name_uz || activeAppliedDiscount.name_ru) : (activeAppliedDiscount.name_ru || activeAppliedDiscount.name_uz)}>
                      {lang === 'uz' ? "Chegirma" : "Скидка"}
                      <i>-{activeAppliedDiscount.percent}%</i>
                    </span>
                    <b>-{formatMoney(discountAmount)}</b>
                  </p>
                )}
                <p>
                  <span>{lang === 'uz' ? "Servis to'lovi" : "Сервисный сбор"}</span>
                  <b>{formatMoney(serviceFee)}</b>
                </p>
              </div>
              {hasBlockedDay && (
                <div className="sd-booking-warning">
                  {lang === 'uz' ? "Diqqat: Tanlangan davr ichida band qilingan kunlar bor." : "Внимание: В выбранный период есть занятые дни."}
                </div>
              )}
              {bookingError ? (
                <div className="sd-booking-warning">
                  {bookingError}
                </div>
              ) : null}
              <strong>
                <span>{lang === 'uz' ? "Jami" : "Итого"}</span>
                <b>{formatMoney(finalTotal)}</b>
              </strong>
            </div>

            <a
              href={`/book-space-${space.id || slugify(space.title)}`}
              className={`sd-primary-btn ${checkoutAvailabilityError || hasBlockedDay ? "is-disabled" : ""}`}
              onClick={(event) => {
                const latestAvailabilityError = getCheckoutAvailabilityError();
                if (latestAvailabilityError || hasBlockedDay) {
                  event.preventDefault();
                  setBookingError(latestAvailabilityError || "Tanlangan davr band. Boshqa sana yoki vaqtni tanlang.");
                  return;
                }
                setBookingError("");
                try {
                  const checkoutTax = Math.round(finalTotal * 0.12);
                  const draft = createBookingDraft({
                    place: normalizePlace(space),
                    selection: {
                      duration_type: bookingDuration,
                      startDate: checkInDate,
                      endDate: checkOutDate || checkInDate,
                      slots: selectedTimeSlots,
                      guests,
                      subtotal: finalTotal,
                      tax: checkoutTax,
                      amount: finalTotal + checkoutTax,
                      currency: "UZS",
                      discount: discountAmount,
                      discountName: activeAppliedDiscount ? (activeAppliedDiscount.name_uz || activeAppliedDiscount.name_ru) : null,
                    },
                    user: userState,
                  });
                  if (!saveBookingDraft(draft)) {
                    throw new Error("Bron ma'lumotlarini saqlab bo'lmadi.");
                  }
                } catch (error) {
                  event.preventDefault();
                  setBookingError(error?.message || "Bron ma'lumotlarini tayyorlab bo'lmadi.");
                }
              }}
            >
              <Icon type="calendar" />
              Bron qilish
            </a>
            <a href={phoneHref(space.owner_phone || cms.support_phone || cms.footer_phone)} className="sd-secondary-btn">
              <Icon type="phone" />
              Qo'ng'iroq qilish
            </a>
            <button
              type="button"
              className="sd-secondary-btn sd-chat-btn"
              onClick={async () => {
                const targetChat = await startOrGetChatForSpace({
                  spaceId: space.id,
                  spaceTitle: space.title,
                  hostName: space.hostName || "Bekzod Tursunov"
                });
                if (!targetChat) {
                  setDetailError("Не удалось открыть чат. Попробуйте позже.");
                  return;
                }
                setActiveChatId(targetChat.id);
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              Ega bilan bog'lanish
            </button>
          </div>
        </aside>
      </section>

      {activeChatId && (
        <DirectChatDrawer
          chatId={activeChatId}
          spaceTitle={space.title}
          hostName={space.hostName || "Bekzod Tursunov"}
          onClose={() => setActiveChatId(null)}
        />
      )}

      <section className="sd-similar sd-animate">
        <div className="sd-section-head">
          <p>Yana ko'ring</p>
          <h2>O'xshash joylar</h2>
        </div>
        {usingDevRelatedFallback ? (
          <div className="sd-booking-warning">DEV fallback related places</div>
        ) : null}
        {relatedError ? <div className="sd-booking-warning">{relatedError}</div> : null}
        <div className="property-grid">
          {relatedLoading ? (
            <div className="sd-no-reviews"><p>O'xshash joylar yuklanmoqda...</p></div>
          ) : similarSpaces.length === 0 ? (
            <div className="sd-no-reviews"><p>Hozircha o'xshash joylar topilmadi.</p></div>
          ) : (
            similarSpaces.map((item, index) => (
              <PropertyCard key={item.id || item.title} item={item} index={index} />
            ))
          )}
        </div>
      </section>

      <JoyFooter />

      {showGalleryModal && createPortal(
        <div className="sd-gallery-modal-overlay" onClick={() => setShowGalleryModal(false)}>
          <div className="sd-gallery-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sd-gallery-modal-header">
              <div>
                <span>Barcha rasmlar</span>
                <h3>{space.title}</h3>
              </div>
              <button type="button" className="sd-modal-close" onClick={() => setShowGalleryModal(false)} aria-label="Yopish">
                <Icon type="x" />
              </button>
            </div>
            <div className="sd-gallery-modal-body">
              <div className="sd-gallery-modal-stage">
                <img key={`modal-${galleryImages[activeImage]}-${activeImage}`} src={galleryImages[activeImage]} alt={`${space.title} ${activeImage + 1}`} />
                {galleryImages.length > 1 && (
                  <>
                    <button type="button" className="sd-gallery-modal-nav is-prev" onClick={() => goToImage(activeImage - 1)} aria-label="Oldingi rasm">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 18l-6-6 6-6" />
                      </svg>
                    </button>
                    <button type="button" className="sd-gallery-modal-nav is-next" onClick={() => goToImage(activeImage + 1)} aria-label="Keyingi rasm">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
              <div className="sd-gallery-modal-grid">
                {galleryImages.map((image, index) => (
                  <button
                    key={`${image}-modal`}
                    type="button"
                    className={index === activeImage ? "is-active" : ""}
                    onClick={() => setActiveImage(index)}
                    aria-label={`${index + 1}-rasmni ko'rish`}
                  >
                    <img src={image} alt="" />
                    <span>{String(index + 1).padStart(2, "0")}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showAmenitiesModal && createPortal(
        <div className="sd-modal-overlay" onClick={() => setShowAmenitiesModal(false)}>
          <div className="sd-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="sd-modal-header">
              <h3>Barcha qulayliklar</h3>
              <button 
                type="button" 
                className="sd-modal-close" 
                onClick={() => setShowAmenitiesModal(false)}
                aria-label="Yopish"
              >
                <Icon type="x" />
              </button>
            </div>
            <div className="sd-modal-body">
              <div className="sd-modal-amenities-grid">
                {selectedAmenities.length === 0 ? (
                  <p style={{ color: "#64748b", gridColumn: "1/-1", textAlign: "center" }}>
                    {lang === 'uz' ? "Qulayliklar mavjud emas" : "Удобства отсутствуют"}
                  </p>
                ) : (
                  selectedAmenities.map((p) => (
                    <div key={p.slug} className="sd-modal-amenity-card">
                      <PackIcon name={resolveIconName(p.icon, p.slug, p.name_ru)} />
                      <span>{lang === 'uz' ? (p.name_uz || p.name_ru) : (p.name_ru || p.name_uz)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </main>
  );
}
