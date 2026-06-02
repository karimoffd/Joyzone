import React, { useEffect, useMemo, useRef, useState } from "react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

import { Header as JoyNavbar } from "./HomeHero.jsx";
import { HeartIcon } from "./ui/Shared.jsx";
import { propertyCards } from "../data/content.js";
import "./SpaceDetail.css";

const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const routeToSlug = (hash) => hash.replace(/^space-/, "");

const findSpaceByRoute = (route) => {
  const targetSlug = routeToSlug(route);
  return propertyCards.find((item) => slugify(item.title) === targetSlug);
};

const featureTags = [
  "Kansaner",
  "Yuqori tezlikdagi Wi-Fi",
  "Tekis ekranli televizor",
  "Yuqori tezlikdagi Wi-Fi",
  "Kansaner",
  "Tekis ekranli televizor",
  "Yuqori tezlikdagi Wi-Fi",
  "Kansaner"
];

const addOns = [
  { label: "Kofe-brek", price: 70000, checked: true },
  { label: "Avtoparkovka", price: 24000, checked: false },
  { label: "Proyektor va ekran", price: 2100000, checked: false },
  { label: "Mikrofon va ovoz tizimi", price: 24000, checked: false },
  { label: "Foto/video suratga olish", price: 280000, checked: true }
];

const comments = [
  "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim laborum.",
  "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim laborum.",
  "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim laborum."
];

function formatNumber(value) {
  return new Intl.NumberFormat("uz-UZ").format(value);
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toInputDate(date) {
  return date.toISOString().slice(0, 10);
}

function formatInputLabel(value) {
  const date = new Date(`${value}T00:00:00`);
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
}

function parseInputLabel(value) {
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return toInputDate(date);
}

function formatRangeLabel(checkIn, checkOut) {
  const options = { month: "short", day: "numeric", year: "numeric" };
  const start = new Intl.DateTimeFormat("en-US", options).format(new Date(`${checkIn}T00:00:00`));
  const end = new Intl.DateTimeFormat("en-US", options).format(new Date(`${checkOut}T00:00:00`));
  return `${start} - ${end}`;
}

function addMonths(date, offset) {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1);
}

function sameDate(firstDate, secondDate) {
  return toInputDate(firstDate) === toInputDate(secondDate);
}

function isBetween(date, start, end) {
  return date > start && date < end;
}

function monthTitle(date) {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);
}

function buildMonthDays(monthDate) {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });
}

function Icon({ type }) {
  const icons = {
    search: "M21 21l-4.4-4.4M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4Z",
    map: "M12 21s7-5.1 7-11a7 7 0 0 0-14 0c0 5.9 7 11 7 11ZM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
    monitor: "M4 5h16v11H4zM8 21h8M12 16v5",
    wifi: "M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 20h.01",
    chair: "M7 10V6a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v4M5 10h14v5H5zM7 15v5M17 15v5"
  };

  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={icons[type]} />
    </svg>
  );
}

function MonthGrid({ monthDate, checkIn, checkOut, onDateSelect }) {
  const today = startOfDay(new Date());
  const startDate = new Date(`${checkIn}T00:00:00`);
  const endDate = new Date(`${checkOut}T00:00:00`);
  const days = buildMonthDays(monthDate);

  return (
    <div className="detail-calendar-month">
      <h3>{monthTitle(monthDate)}</h3>
      <div className="detail-calendar-week">
        {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
          <span key={`${day}-${index}`}>{day}</span>
        ))}
      </div>
      <div className="detail-calendar-days">
        {days.map((date) => {
          const inputDate = toInputDate(date);
          const isOutside = date.getMonth() !== monthDate.getMonth();
          const isPast = startOfDay(date) < today;
          const isStart = sameDate(date, startDate);
          const isEnd = sameDate(date, endDate);
          const isInRange = isBetween(date, startDate, endDate);

          return (
            <button
              type="button"
              key={inputDate}
              className={[
                isOutside ? "is-outside" : "",
                isStart || isEnd ? "is-selected" : "",
                isInRange ? "is-in-range" : ""
              ].filter(Boolean).join(" ")}
              disabled={isPast}
              onClick={() => onDateSelect(inputDate)}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BookingCalendarPanel({ checkIn, checkOut, activeField, visibleMonth, onActiveFieldChange, onMonthChange, onDateSelect, onClear, onClose }) {
  const nights = Math.max(
    1,
    Math.round((new Date(`${checkOut}T00:00:00`) - new Date(`${checkIn}T00:00:00`)) / 86400000)
  );

  return (
    <div className="detail-calendar-popover">
      <div className="detail-calendar-summary">
        <div>
          <strong>{nights} nights</strong>
          <span>{formatRangeLabel(checkIn, checkOut)}</span>
        </div>
        <div className="detail-calendar-summary-fields">
          <button type="button" className={activeField === "checkIn" ? "is-active" : ""} onClick={() => onActiveFieldChange("checkIn")}>
            <span>CHECK-IN</span>
            <b>{formatInputLabel(checkIn)}</b>
            <i>x</i>
          </button>
          <button type="button" className={activeField === "checkOut" ? "is-active" : ""} onClick={() => onActiveFieldChange("checkOut")}>
            <span>CHECKOUT</span>
            <b>{formatInputLabel(checkOut)}</b>
            <i>x</i>
          </button>
        </div>
      </div>

      <div className="detail-calendar-body">
        <button type="button" className="detail-calendar-prev" aria-label="Previous month" onClick={() => onMonthChange(-1)}>&lt;</button>
        <button type="button" className="detail-calendar-next" aria-label="Next month" onClick={() => onMonthChange(1)}>&gt;</button>
        <MonthGrid monthDate={visibleMonth} checkIn={checkIn} checkOut={checkOut} onDateSelect={(value) => onDateSelect(value)} />
        <MonthGrid monthDate={addMonths(visibleMonth, 1)} checkIn={checkIn} checkOut={checkOut} onDateSelect={(value) => onDateSelect(value)} />
      </div>

      <div className="detail-calendar-actions">
        <button type="button" className="detail-calendar-keyboard" aria-label="Calendar keyboard icon">[]</button>
        <div>
          <button type="button" className="detail-calendar-clear" onClick={onClear}>Clear dates</button>
          <button type="button" className="detail-calendar-close" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function BookingCard({ checkIn, checkOut, guests, pricePerNight, onCheckInChange, onCheckOutChange, onGuestsChange }) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [activeField, setActiveField] = useState("checkIn");
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(new Date(`${checkIn}T00:00:00`).getFullYear(), new Date(`${checkIn}T00:00:00`).getMonth(), 1));
  const [typedDates, setTypedDates] = useState({
    checkIn: formatInputLabel(checkIn),
    checkOut: formatInputLabel(checkOut)
  });
  const nights = Math.max(
    1,
    Math.round((new Date(`${checkOut}T00:00:00`) - new Date(`${checkIn}T00:00:00`)) / 86400000)
  );
  const total = pricePerNight * nights;

  const openCalendar = (field) => {
    setActiveField(field);
    setVisibleMonth(new Date(new Date(`${field === "checkIn" ? checkIn : checkOut}T00:00:00`).getFullYear(), new Date(`${field === "checkIn" ? checkIn : checkOut}T00:00:00`).getMonth(), 1));
    setCalendarOpen(true);
  };

  useEffect(() => {
    setTypedDates({
      checkIn: formatInputLabel(checkIn),
      checkOut: formatInputLabel(checkOut)
    });
  }, [checkIn, checkOut]);

  const commitTypedDate = (field) => {
    const parsedDate = parseInputLabel(typedDates[field]);
    if (!parsedDate) {
      setTypedDates((dates) => ({ ...dates, [field]: formatInputLabel(field === "checkIn" ? checkIn : checkOut) }));
      return;
    }

    if (field === "checkIn") {
      onCheckInChange(parsedDate);
      setActiveField("checkOut");
      return;
    }

    if (new Date(`${parsedDate}T00:00:00`) <= new Date(`${checkIn}T00:00:00`)) {
      setTypedDates((dates) => ({ ...dates, checkOut: formatInputLabel(checkOut) }));
      return;
    }

    onCheckOutChange(parsedDate);
  };

  const handleCalendarDateSelect = (value, forceField) => {
    const field = forceField || activeField;
    if (field === "checkIn") {
      onCheckInChange(value);
      setActiveField("checkOut");
      return;
    }

    if (new Date(`${value}T00:00:00`) <= new Date(`${checkIn}T00:00:00`)) {
      onCheckInChange(value);
      setActiveField("checkOut");
      return;
    }

    onCheckOutChange(value);
  };

  const clearDates = () => {
    const nextCheckIn = startOfDay(new Date());
    nextCheckIn.setDate(nextCheckIn.getDate() + 1);
    const nextCheckOut = new Date(nextCheckIn);
    nextCheckOut.setDate(nextCheckOut.getDate() + 2);
    onCheckInChange(toInputDate(nextCheckIn));
    onCheckOutChange(toInputDate(nextCheckOut));
    setVisibleMonth(new Date(nextCheckIn.getFullYear(), nextCheckIn.getMonth(), 1));
  };

  return (
    <section className="detail-reserve-card" aria-label="Bron qilish">
      <p className="detail-reserve-price">
        <strong>{formatNumber(total)} so'm</strong> <span>{nights} kechaga</span>
      </p>

      <div className="detail-reserve-picker">
        <div className={calendarOpen && activeField === "checkIn" ? "is-active" : ""} role="button" tabIndex={0} onClick={() => openCalendar("checkIn")} onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") openCalendar("checkIn");
        }}>
          <span>CHECK-IN</span>
          <input
            value={typedDates.checkIn}
            inputMode="numeric"
            aria-label="Check-in date"
            onClick={(event) => {
              event.stopPropagation();
              openCalendar("checkIn");
            }}
            onChange={(event) => setTypedDates((dates) => ({ ...dates, checkIn: event.target.value }))}
            onBlur={() => commitTypedDate("checkIn")}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
          />
        </div>
        <div className={calendarOpen && activeField === "checkOut" ? "is-active" : ""} role="button" tabIndex={0} onClick={() => openCalendar("checkOut")} onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") openCalendar("checkOut");
        }}>
          <span>CHECKOUT</span>
          <input
            value={typedDates.checkOut}
            inputMode="numeric"
            aria-label="Checkout date"
            onClick={(event) => {
              event.stopPropagation();
              openCalendar("checkOut");
            }}
            onChange={(event) => setTypedDates((dates) => ({ ...dates, checkOut: event.target.value }))}
            onBlur={() => commitTypedDate("checkOut")}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
          />
        </div>
        <label className="detail-guests-field">
          <span>GUESTS</span>
          <select value={guests} onChange={(event) => onGuestsChange(Number(event.target.value))}>
            {[1, 2, 3, 4, 5, 6].map((count) => (
              <option key={count} value={count}>
                {count} guest{count > 1 ? "s" : ""}
              </option>
            ))}
          </select>
        </label>
      </div>

      {calendarOpen ? (
        <BookingCalendarPanel
          checkIn={checkIn}
          checkOut={checkOut}
          activeField={activeField}
          visibleMonth={visibleMonth}
          onActiveFieldChange={setActiveField}
          onMonthChange={(offset) => setVisibleMonth((month) => addMonths(month, offset))}
          onDateSelect={handleCalendarDateSelect}
          onClear={clearDates}
          onClose={() => setCalendarOpen(false)}
        />
      ) : null}

      <a href="#login" className="detail-reserve-button">Reserve</a>
      <p className="detail-reserve-note">You won't be charged yet</p>
    </section>
  );
}

function SpaceDetail({ route, userState, setUserState }) {
  const [activeImage, setActiveImage] = useState(0);
  const initialCheckIn = useMemo(() => {
    const date = startOfDay(new Date());
    date.setDate(date.getDate() + 1);
    return toInputDate(date);
  }, []);
  const initialCheckOut = useMemo(() => {
    const date = startOfDay(new Date());
    date.setDate(date.getDate() + 3);
    return toInputDate(date);
  }, []);
  const [checkIn, setCheckIn] = useState(initialCheckIn);
  const [checkOut, setCheckOut] = useState(initialCheckOut);
  const [guests, setGuests] = useState(1);
  const item = useMemo(() => findSpaceByRoute(route) || propertyCards[0], [route]);
  const galleryImages = useMemo(() => {
    const images = [...item.images];
    while (images.length < 5) images.push(item.images[images.length % item.images.length]);
    return images.slice(0, 5);
  }, [item]);

  const [nav1, setNav1] = useState(null);
  const [nav2, setNav2] = useState(null);
  const mainSliderRef = useRef(null);
  const thumbSliderRef = useRef(null);

  useEffect(() => {
    setNav1(mainSliderRef.current);
    setNav2(thumbSliderRef.current);
  }, []);

  const mainSettings = {
    asNavFor: nav2,
    ref: (slider) => (mainSliderRef.current = slider),
    dots: false,
    arrows: true,
    slidesToShow: 1,
    slidesToScroll: 1,
    fade: true,
    adaptiveHeight: true,
    afterChange: setActiveImage
  };

  const thumbSettings = {
    asNavFor: nav1,
    ref: (slider) => (thumbSliderRef.current = slider),
    slidesToShow: 4,
    slidesToScroll: 1,
    focusOnSelect: true,
    arrows: false,
    centerMode: false
  };

  const selectedTotal = addOns.reduce((sum, addOn) => sum + (addOn.checked ? addOn.price : 0), 1400000);
  const pricePerNight = 54000;

  const handleCheckInChange = (value) => {
    setCheckIn(value);
    if (new Date(`${value}T00:00:00`) >= new Date(`${checkOut}T00:00:00`)) {
      const nextCheckOut = new Date(`${value}T00:00:00`);
      nextCheckOut.setDate(nextCheckOut.getDate() + 1);
      setCheckOut(toInputDate(nextCheckOut));
    }
  };

  return (
    <main className="space-detail-shell">
      <JoyNavbar userState={userState} setUserState={setUserState} activeIndex={1} />

      <section className="detail-top">
        <div className="detail-gallery">
          <div className="detail-main-image">
            <Slider {...mainSettings}>
              {galleryImages.map((image, index) => (
                <div key={`main-${index}`}>
                  <img src={image} alt={`${item.title} ${index + 1}`} />
                </div>
              ))}
            </Slider>
          </div>
          <div className="detail-thumbs">
            <Slider {...thumbSettings}>
              {galleryImages.map((image, index) => (
                <div key={`thumb-${index}`}>
                  <button
                    type="button"
                    className={activeImage === index ? "is-active" : ""}
                    aria-label={`${index + 1}-rasm`}
                    onClick={() => {
                      if (mainSliderRef.current) mainSliderRef.current.slickGoTo(index);
                      setActiveImage(index);
                    }}
                  >
                    <img src={image} alt={`${item.title} thumb ${index + 1}`} />
                  </button>
                </div>
              ))}
            </Slider>
          </div>
        </div>

        <aside className="detail-hero-info">
          <h1>tryJoyZone--firstContent</h1>
          <p className="detail-address">
            <Icon type="map" />
            Uzbekistan, Tashkent, Shayhontahur, Beltepa 18-102
          </p>
          <div className="detail-meta-row">
            <span><Icon type="search" /> 34</span>
            <strong>4 <i>*****</i></strong>
            <button type="button" aria-label="Yoqtirish"><HeartIcon /></button>
            <button type="button" aria-label="Ulashish">Go</button>
          </div>
          <div className="detail-owner">
            <span />
            <strong>Diyor Karimov</strong>
          </div>
        </aside>
      </section>

      <div className="detail-feature-strip">
        {featureTags.map((tag, index) => (
          <span key={`${tag}-${index}`}>
            <Icon type={tag.includes("Wi-Fi") ? "wifi" : tag.includes("televizor") ? "monitor" : "chair"} />
            {tag}
          </span>
        ))}
      </div>

      <section className="detail-content-panel">
        <div className="detail-content-grid">
          <div className="detail-main-col">
            <section className="detail-info-copy">
              <h2>Umumiy ma'lumot</h2>
              <p>Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s.</p>
              <h2>Xona qulayliklari</h2>
              <p>Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s.</p>
            </section>

            <section className="detail-services">
              <h2>Qo'shimcha xizmatlar:</h2>
              <div className="detail-service-layout">
                <div className="detail-checks">
                  {addOns.map((addOn) => (
                    <label key={addOn.label}>
                      <input type="checkbox" defaultChecked={addOn.checked} />
                      <span>{addOn.label}</span>
                      <b>+ {formatNumber(addOn.price)} sum</b>
                    </label>
                  ))}
                </div>
                <div className="detail-price-box">
                  <p>Qo'shimcha xizmatlar (2): <b>+ 350 000 sum</b></p>
                  <p>5 so'goti: <b>+ 1 050 000 sum</b></p>
                  <div>
                    <span>Jami:</span>
                    <strong>{formatNumber(selectedTotal)} so'm</strong>
                  </div>
                </div>
              </div>
            </section>

            <section className="detail-comments">
              <h3>Comments <span>(12)</span></h3>
              {comments.map((comment, index) => (
                <article key={`${comment}-${index}`} className={index === 1 ? "is-reply" : ""}>
                  <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80" alt="Admin" />
                  <div>
                    <strong>Admin</strong>
                    <time>2022-12-04 09:06:57</time>
                    <p>{comment}</p>
                    <button type="button">Javob berish</button>
                  </div>
                </article>
              ))}
            </section>

            <section className="detail-review-form">
              <h3>Izoh qoldirish</h3>
              <div className="detail-form-stars">***</div>
              <textarea placeholder="Xabar" />
              <div>
                <input placeholder="Ism" />
                <input placeholder="Telefon raqam" />
              </div>
              <button type="button">Jo'natish</button>
            </section>
          </div>

          <aside className="detail-side-col">
            <BookingCard
              checkIn={checkIn}
              checkOut={checkOut}
              guests={guests}
              pricePerNight={pricePerNight}
              onCheckInChange={handleCheckInChange}
              onCheckOutChange={setCheckOut}
              onGuestsChange={setGuests}
            />
          </aside>
        </div>
      </section>
    </main>
  );
}

export default SpaceDetail;
