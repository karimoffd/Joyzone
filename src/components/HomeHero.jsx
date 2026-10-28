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

  const backendSlides = homePlaces
    .filter((place) => Array.isArray(place.images) && place.images.length > 0)
    .slice(0, 5)
    .map((place) => ({
      eyebrow: place.category_name || place.subcategory_name || "Joyzone",
      title: place.title,
      image: place.images[0],
    }));
  const heroSlides = backendSlides.length > 0
    ? backendSlides
    : (usingDevFallback ? slides : []);
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
    let snapTween;
    let lastY = window.scrollY;
    let isSnapping = false;
    const snapTo = (target) => {
      if (isSnapping || Math.abs(window.scrollY - target) < 8) return;
      isSnapping = true;
      snapTween?.kill();
      const scrollState = { y: window.scrollY };
      snapTween = gsap.to(scrollState, {
        y: target,
        duration: 1,
        ease: "power2.inOut",
        onUpdate: () => window.scrollTo(0, scrollState.y),
        onComplete: () => {
          isSnapping = false;
          lastY = window.scrollY;
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
      const y = window.scrollY;
      const viewport = window.innerHeight;
      if (isSnapping) {
        event.preventDefault();
        return;
      }
      if (event.deltaY > 0 && y < viewport - 24) {
        event.preventDefault();
        snapTo(viewport);
      } else if (event.deltaY < 0 && y > 0 && y <= viewport + 64) {
        event.preventDefault();
        snapTo(0);
      }
    };
    const handleScroll = () => {
      if (window.innerWidth <= 992) return;
      if (isSnapping) return;
      const y = window.scrollY;
      const viewport = window.innerHeight;
      const direction = y > lastY ? "down" : "up";
      if (direction === "down" && y >= 96 && y < viewport - 24) snapTo(viewport);
      if (direction === "up" && y <= viewport - 96 && y > viewport * 0.34) snapTo(0);
      lastY = y;
    };
    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("scroll", handleScroll);
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
