import { Header } from "./home/HeaderNav.jsx";
export { Header } from "./home/HeaderNav.jsx";
import { Banner } from "./home/HeroBanner.jsx";
import React, { useEffect, useState, useContext } from "react";
import { gsap } from "gsap";
import { revealText } from "../utils/textReveal.js";
import api, { getApiErrorMessage } from "../api/client.js";
import { LanguageContext } from "../context/LanguageContext.jsx";

import ListingsSection from "./ListingsSection.jsx";
import { propertyCards } from "../data/content.js";
import { getPlacesFromApiResponse, normalizePlace } from "../utils/placeMapper.js";
import "./HomeHero.css";

export default function HomeHero({ userState, setUserState, slides }) {
  const { lang, content } = useContext(LanguageContext);
  const [categories, setCategories] = useState([]);
  const [homePlaces, setHomePlaces] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [placesLoading, setPlacesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState("");
  const [placesError, setPlacesError] = useState("");
  const [usingDevFallback, setUsingDevFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadCategories = async () => {
      try {
        const response = await api.get("/api/categories/", { skipAuth: true });
        if (cancelled) return;
        const data = response.data?.results || response.data || [];
        setCategories(Array.isArray(data) ? data : []);
        setCategoriesError("");
      } catch (error) {
        if (!cancelled) {
          setCategories([]);
          setCategoriesError(getApiErrorMessage(error, "Kategoriyalarni yuklab bo'lmadi."));
        }
      } finally {
        if (!cancelled) setCategoriesLoading(false);
      }
    };

    const fetchApprovedPlaces = async (params) => {
      const response = await api.get("/api/places/", { params, skipAuth: true });
      return getPlacesFromApiResponse(response.data)
        .map(normalizePlace)
        .filter((place) => place.status === "approved");
    };

    const loadPlaces = async () => {
      try {
        let promotedPlaces;
        try {
          promotedPlaces = await fetchApprovedPlaces({ promoted: "true" });
        } catch (promotedError) {
          promotedPlaces = [];
        }

        const places = promotedPlaces.length > 0
          ? promotedPlaces
          : await fetchApprovedPlaces();
        if (cancelled) return;
        setHomePlaces(places);
        setPlacesError("");
        setUsingDevFallback(false);
      } catch (error) {
        if (cancelled) return;
        setPlacesError(getApiErrorMessage(error, "Joyzone joylarini yuklab bo'lmadi."));
        if (import.meta.env.DEV) {
          // Demo places are available only when the backend request fails in development.
          setHomePlaces(propertyCards.map((place) => normalizePlace({ ...place, status: "approved" })));
          setUsingDevFallback(true);
        } else {
          setHomePlaces([]);
          setUsingDevFallback(false);
        }
      } finally {
        if (!cancelled) setPlacesLoading(false);
      }
    };

    loadCategories();
    loadPlaces();
    return () => { cancelled = true; };
  }, []);

  // The hero always shows the three curated interiors (office, coworking, hall).
  const heroSlides = slides;
  const cms = content?.[lang] || {};

  useEffect(() => {
    gsap.fromTo(".joy-header > .container-fluid, .banner .img-slider", { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.72, stagger: 0.06, ease: "power3.out" });
    gsap.fromTo(".banner .info, .infoForReg", { opacity: 0 }, { opacity: 1, duration: 0.72, ease: "power3.out" });

    const heroTexts = gsap.utils.toArray(".banner .info h1, .banner .info p.desc, .infoForReg .info-text h2.title, .infoForReg .desc p");
    heroTexts.forEach(text => revealText(text, { delay: 0.1 }));
    const hero = document.querySelector(".home-viewport");
    const image = document.querySelector(".banner .img-slider");
    const info = document.querySelector(".banner .info");
    const promo = document.querySelector(".infoForReg");

    const listings = document.querySelector(".listings-section");
    if (!listings) {
      return () => {
        // Cleanup
      };
    }
    // Hero <-> listings snap. A fast mouse-wheel spin sends a burst of events
    // (and the browser animates each of them), so one burst must give exactly
    // one snap: events are swallowed while the snap runs and until the burst
    // ends, and the scroll listener stays out of the way of wheel scrolling.
    let snapTween;
    let lastY = window.scrollY;
    let isSnapping = false;
    let lastWheelAt = 0;
    let swallowUntil = 0;
    const WHEEL_GAP = 220; // ms of silence that ends a wheel burst
    const setY = (y) => window.scrollTo({ top: y, behavior: "instant" });
    const snapTo = (target) => {
      if (isSnapping) return;
      const from = window.scrollY;
      const distance = Math.abs(from - target);
      if (distance < 4) return;
      isSnapping = true;
      snapTween?.kill();
      const viewport = window.innerHeight || 1;
      const share = Math.min(1, distance / viewport);
      const scrollState = { y: from };
      snapTween = gsap.to(scrollState, {
        y: target,
        // Shorter trip when we are already part of the way there.
        duration: 0.45 + 0.45 * share,
        // From rest a soft start; mid-way (already moving) no slow start.
        ease: share > 0.75 ? "power2.inOut" : "power2.out",
        onUpdate: () => setY(scrollState.y),
        onComplete: () => {
          setY(target);
          isSnapping = false;
          lastY = target;
          swallowUntil = performance.now() + WHEEL_GAP;
        },
        onInterrupt: () => {
          isSnapping = false;
        }
      });
    };
    const handleWheel = (event) => {
      if (window.innerWidth <= 992) return;
      if (event.target.closest('.dropdown, .options, .filter-dropdown, .districts-list')) {
        return;
      }
      const now = performance.now();
      const inBurst = now - lastWheelAt < WHEEL_GAP;
      lastWheelAt = now;
      const y = window.scrollY;
      const viewport = window.innerHeight;
      const inHero = y < viewport - 2;

      // While snapping, and for the rest of the burst that caused it.
      if (isSnapping || (inBurst && now < swallowUntil + WHEEL_GAP && (inHero || y <= viewport + 2))) {
        event.preventDefault();
        if (!isSnapping) swallowUntil = now;
        return;
      }
      if (Math.abs(event.deltaY) < 2) {
        if (inHero) event.preventDefault();
        return;
      }
      if (event.deltaY > 0 && inHero) {
        event.preventDefault();
        snapTo(viewport);
      } else if (event.deltaY < 0 && y > 0 && y <= viewport + 64) {
        event.preventDefault();
        snapTo(0);
      }
    };
    // Scrollbar drag, middle-click autoscroll, keyboard. Snapping while the
    // user is still moving the page makes it fight the user and jump, so we
    // never snap mid-move: only once the page has stood still, no mouse
    // button is held and autoscroll is off, and only if it stopped half-way.
    let settleTimer;
    let buttonHeld = false;
    let autoScroll = false;
    let middleDownAt = 0;
    let moveDirection = "down";
    const settle = () => {
      clearTimeout(settleTimer);
      settleTimer = setTimeout(() => {
        if (window.innerWidth <= 992 || isSnapping || buttonHeld || autoScroll) return;
        if (performance.now() - lastWheelAt < WHEEL_GAP + 200) return;
        const y = window.scrollY;
        const viewport = window.innerHeight;
        if (y <= 2 || y >= viewport - 2) return;
        // Follow the way the user was going, unless they barely moved.
        if (moveDirection === "down") snapTo(y > viewport * 0.12 ? viewport : 0);
        else snapTo(y < viewport * 0.88 ? 0 : viewport);
      }, 180);
    };
    const handleScroll = () => {
      const y = window.scrollY;
      if (y !== lastY) moveDirection = y > lastY ? "down" : "up";
      lastY = y;
      if (isSnapping) return;
      settle();
    };
    const handlePointerDown = (event) => {
      // The user takes over: stop our animation where it is.
      if (isSnapping) snapTween?.kill();
      if (autoScroll) {
        autoScroll = false; // any click ends middle-click autoscroll
        settle();
      }
      if (event.button === 1) {
        autoScroll = true;
        middleDownAt = performance.now();
      }
      buttonHeld = true;
    };
    const handlePointerUp = (event) => {
      buttonHeld = false;
      // Middle button held and dragged: autoscroll ends on release.
      if (event.button === 1 && performance.now() - middleDownAt > 300) autoScroll = false;
      settle();
    };
    const handleKeyDown = () => {
      if (autoScroll) {
        autoScroll = false;
        settle();
      }
    };
    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("mousedown", handlePointerDown, true);
    window.addEventListener("mouseup", handlePointerUp, true);
    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("blur", handlePointerUp);
    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("mousedown", handlePointerDown, true);
      window.removeEventListener("mouseup", handlePointerUp, true);
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("blur", handlePointerUp);
      clearTimeout(settleTimer);
      snapTween?.kill();
    };
  }, []);

  return (
    <main className="home-shell">
      <Header userState={userState} setUserState={setUserState} activeIndex={0} />
      <div className="home-viewport">
        <Banner
          slides={heroSlides}
          categories={categories}
          categoriesLoading={categoriesLoading}
          categoriesError={categoriesError}
          locationPlaces={homePlaces}
          placesLoading={placesLoading}
          placesError={placesError}
          usingDevLocationFallback={usingDevFallback}
        />
      </div>
      <ListingsSection
        cms={cms}
      />
    </main>
  );
}
