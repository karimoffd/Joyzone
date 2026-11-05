import { FilterSelect, MultiFilterSelect, PriceFilter } from "./HeroFilters.jsx";
import HeroLocationList from "./HeroLocationList.jsx";
import { useIsMobile } from "./HeaderNav.jsx";
import React, { useEffect, useRef, useState, useContext } from "react";
import { LanguageContext } from "../../context/LanguageContext.jsx";
import BottomSheet from "../ui/BottomSheet.jsx";
import JoySlider from "../JoySlider.jsx";
import kvIcon from "../../assets/img/kv.svg";
import { navigate } from "../../utils/router.js";

// When the filter card changes size (sub-categories / their filters appear),
// glide instead of snapping.
// Desktop: the card is pinned to the bottom of the hero and grows upward. Its
// layout changes at once; we then animate from the old picture (FLIP): the
// navy background (drawn by ::before) slides its top edge, rows that only
// moved glide to their new place, new rows fade in. Nothing jumps.
// Phones: the card grows downward, a plain height animation is enough.
const FILTER_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const FILTER_MS = 460;

function useSmoothHeight(ref) {
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === "undefined") return undefined;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return undefined;
    const isDesktop = () => window.innerWidth >= 1181;

    // Layout positions, relative to the card's parent (transforms ignored).
    const measure = () => {
      const parentTop = element.parentElement.getBoundingClientRect().top;
      const box = element.getBoundingClientRect();
      const tops = new Map();
      [...element.children].forEach((child) => {
        tops.set(child, child.offsetTop);
      });
      return { top: box.top - parentTop, height: box.height, tops };
    };

    let last = measure();
    let running = [];
    let heightAnimation = null;

    const stop = () => {
      running.forEach((animation) => animation.cancel());
      running = [];
    };

    const observer = new ResizeObserver(() => {
      const next = measure();
      if (Math.abs(next.height - last.height) < 2) {
        last = next;
        return;
      }

      if (!isDesktop()) {
        if (heightAnimation) { last = next; return; }
        element.style.overflow = "hidden";
        heightAnimation = element.animate(
          [{ height: `${last.height}px` }, { height: `${next.height}px` }],
          { duration: FILTER_MS, easing: FILTER_EASE }
        );
        const done = () => { heightAnimation = null; element.style.overflow = ""; last = measure(); };
        heightAnimation.onfinish = done;
        heightAnimation.oncancel = done;
        last = next;
        return;
      }

      stop();
      const shift = last.top - next.top; // > 0: the card grew upward
      const options = { duration: FILTER_MS, easing: FILTER_EASE };
      running.push(element.animate(
        [{ top: `${shift}px` }, { top: "0px" }],
        { ...options, pseudoElement: "::before" }
      ));
      [...element.children].forEach((child) => {
        if (last.tops.has(child)) {
          // Same row, new place: start where it was on screen.
          const delta = (last.top + last.tops.get(child)) - (next.top + next.tops.get(child));
          if (Math.abs(delta) > 1) {
            running.push(child.animate([{ transform: `translateY(${delta}px)` }, { transform: "translateY(0)" }], options));
          }
        } else {
          running.push(child.animate(
            [{ opacity: 0, transform: "translateY(-6px)" }, { opacity: 1, transform: "translateY(0)" }],
            { ...options, delay: 80, fill: "backwards" }
          ));
        }
      });
      last = next;
    });

    observer.observe(element);
    return () => {
      observer.disconnect();
      stop();
      heightAnimation?.cancel();
    };
  }, [ref]);
}

// Labels of the hero filters. "More than N" means strictly more than N people.
const HERO_FILTER_TEXT = {
  uz: { any: "Istalgan", more: (n) => `${n} dan ortiq`, capacity: "Sig'im", people: "kishi", area: "Maydon", amenities: "Qulayliklar", picked: "ta tanlandi" },
  ru: { any: "Любой", more: (n) => `Больше ${n}`, capacity: "Вместимость", people: "чел", area: "Площадь", amenities: "Удобства", picked: "выбрано" },
  en: { any: "Any", more: (n) => `More than ${n}`, capacity: "Capacity", people: "people", area: "Area", amenities: "Amenities", picked: "selected" },
};
const HERO_PEOPLE_STEPS = [1, 5, 10];
const HERO_AREA_STEPS = [10, 50, 100];

export function Banner({
  slides,
  categories = [],
  categoriesLoading = false,
  categoriesError = "",
  locationPlaces = [],
  placesLoading = false,
  placesError = "",
  usingDevLocationFallback = false,
}) {
  const { lang, content } = useContext(LanguageContext);
  const categoryNameField = `name_${lang}`;
  const ft = HERO_FILTER_TEXT[lang] || HERO_FILTER_TEXT.uz;
  const localParamName = (param) => param?.[categoryNameField] || param?.name_uz || param?.name_ru || param?.slug || "";
  const localOption = (option) => option?.[lang] || option?.uz || option?.ru || option?.slug || "";
  const tabs = [
    { id: "barchasi", label: content?.[lang]?.tab_all || "Barchasi" },
    ...categories.map((category) => ({
      id: category.id,
      label: category[categoryNameField] || category.name_uz || category.name_ru || category.name_en || category.slug,
    })),
  ];

  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState("barchasi");
  const activeCategory = categories.find(c => c.id === activeTab);
  const [selectedSubCat, setSelectedSubCat] = useState("");
  const [typingText, setTypingText] = useState("ofislar");
  const [cursorVisible, setCursorVisible] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [locationOpenAbove, setLocationOpenAbove] = useState(false);
  const [openFilter, setOpenFilter] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [heroCapacity, setHeroCapacity] = useState("");
  const [heroPrice, setHeroPrice] = useState(null);
  const typingRef = useRef(null);
  const cursorRef = useRef(null);
  const wordIndexRef = useRef(0);
  const charIndexRef = useRef(7);
  const isDeletingRef = useRef(false);
  const locationSelectRef = useRef(null);
  const filterRef = useRef(null);
  useSmoothHeight(filterRef);

  // When the opened filter grows close to the subtitle, the title and the
  // subtitle glide up (CSS var --hero-lift) to keep a calm gap between them.
  useEffect(() => {
    const filter = filterRef.current;
    const info = filter?.closest(".info");
    const title = info?.querySelector(".title");
    const desc = info?.querySelector(".desc");
    if (!filter || !info || !title || !desc || typeof ResizeObserver === "undefined") return undefined;
    const MIN_GAP = 40;
    let lift = 0;
    const setLift = (value) => {
      if (value !== lift) {
        lift = value;
        info.style.setProperty("--hero-lift", `${lift}px`);
      }
    };
    // Natural height of the filter with / without the compact (one-row)
    // category layout. Toggling the class and reading back happens in one
    // task, so nothing flickers.
    const heightWith = (tight) => {
      const had = info.classList.contains("is-tight");
      info.classList.toggle("is-tight", tight);
      const height = filter.offsetHeight;
      info.classList.toggle("is-tight", had);
      return height;
    };
    const update = () => {
      if (window.innerWidth < 1181) {
        info.classList.remove("is-tight");
        setLift(0);
        return;
      }
      const infoRect = info.getBoundingClientRect();
      const innerBottom = infoRect.bottom - parseFloat(getComputedStyle(info).paddingBottom);
      // Same formula as the title's top margin in HomeHero.css.
      const baseMargin = Math.min(110, Math.max(8, (window.innerHeight - 700) * 0.5));
      const liveMargin = parseFloat(getComputedStyle(title).marginTop) || 0;
      // Subtitle bottom without the current lift.
      const descBottom = desc.getBoundingClientRect().bottom - liveMargin + baseMargin;
      const room = Math.max(0, baseMargin - 4);
      const needFor = (height) => MIN_GAP - (innerBottom - height - descBottom);

      const looseNeed = needFor(heightWith(false));
      // A few pixels short of the 40px gap is fine: keep the wrapped rows.
      if (looseNeed <= room + 10) {
        info.classList.remove("is-tight");
        setLift(Math.round(Math.min(room, Math.max(0, looseNeed))));
        return;
      }
      // Long title (e.g. in Russian) + big filter: categories go to one
      // scrollable row, and the text rises as far as it can.
      info.classList.add("is-tight");
      setLift(Math.round(Math.min(room, Math.max(0, needFor(heightWith(true))))));
    };
    const observer = new ResizeObserver(update);
    observer.observe(filter);
    observer.observe(info);
    update();
    return () => observer.disconnect();
  }, []);

  // On laptop screens the category rows scroll sideways: let the mouse wheel
  // move them (instead of snapping the page) while they can still scroll.
  useEffect(() => {
    const root = filterRef.current;
    if (!root) return undefined;
    const onWheel = (event) => {
      const row = event.target.closest?.(".filter-tabs, .filter-subcats");
      if (!row || row.scrollWidth <= row.clientWidth + 1 || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      const max = row.scrollWidth - row.clientWidth;
      const atEdge = (event.deltaY < 0 && row.scrollLeft <= 0) || (event.deltaY > 0 && row.scrollLeft >= max - 1);
      if (atEdge) return;
      event.preventDefault();
      event.stopPropagation();
      row.scrollLeft += event.deltaY;
    };
    root.addEventListener("wheel", onWheel, { passive: false });
    return () => root.removeEventListener("wheel", onWheel);
  }, []);
  
  const [heroTitle, setHeroTitle] = useState("O'zbekiston bo'ylab\nqulay");
  const [heroSubtitle, setHeroSubtitle] = useState("Ofis, do'kon va omborlarni ijaraga oling yoki sotib oling.");
  const wordsRef = useRef(["ofislar", "kovorking", "zallar", "do'konlar", "omborlar"]);
  // Long titles (Russian is ~40 letters, Uzbek ~34) get a smaller size so they stay on
  // two lines and leave room for the filter.
  const heroTitleLong = heroTitle.replace(/\s+/g, " ").length + Math.max(0, ...wordsRef.current.map((word) => word.length)) > 36;

  useEffect(() => {
    if (content && content[lang]) {
      const data = content[lang];
      if (data.hero_animated_words) {
        const newWords = data.hero_animated_words.split(',').map(w => w.trim()).filter(Boolean);
        if (newWords.length > 0) wordsRef.current = newWords;
      }
      if (data.hero_title) setHeroTitle(data.hero_title);
      if (data.hero_subtitle) setHeroSubtitle(data.hero_subtitle);
    }
  }, [lang, content]);

  // Handle location dropdown position
  useEffect(() => {
    if (!isLocationOpen || !locationSelectRef.current) return;

    const timer = setTimeout(() => {
      const rect = locationSelectRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const dropdownHeight = 380; // approximate height of the location dropdown
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      setLocationOpenAbove(spaceBelow < dropdownHeight && spaceAbove > dropdownHeight);
    }, 0);

    return () => clearTimeout(timer);
  }, [isLocationOpen]);

  // Handle click outside for location dropdown
  useEffect(() => {
    if (!isLocationOpen) return;

    const handleClickOutside = (event) => {
      if (locationSelectRef.current && !locationSelectRef.current.contains(event.target)) {
        setIsLocationOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isLocationOpen]);

  useEffect(() => {
    const cursorInterval = window.setInterval(() => setCursorVisible((current) => !current), 530);
    charIndexRef.current = 0;
    setTypingText("");
    const isPausedRef = { current: false };

    const type = () => {
      if (isPausedRef.current) return;
      const currentWords = wordsRef.current;
      const safeIndex = wordIndexRef.current % currentWords.length;
      const currentWord = currentWords[safeIndex];
      
      if (isDeletingRef.current) {
        charIndexRef.current -= 1;
        setTypingText(currentWord.substring(0, charIndexRef.current));
        if (charIndexRef.current === 0) {
          isDeletingRef.current = false;
          wordIndexRef.current = (safeIndex + 1) % currentWords.length;
          isPausedRef.current = true;
          typingRef.current = window.setTimeout(() => { isPausedRef.current = false; type(); }, 500);
        } else {
          typingRef.current = window.setTimeout(type, 55);
        }
      } else {
        charIndexRef.current += 1;
        setTypingText(currentWord.substring(0, charIndexRef.current));
        if (charIndexRef.current === currentWord.length) {
          isPausedRef.current = true;
          typingRef.current = window.setTimeout(() => {
            isPausedRef.current = false;
            isDeletingRef.current = true;
            type();
          }, 2000);
        } else {
          typingRef.current = window.setTimeout(type, 100);
        }
      }
    };
    typingRef.current = window.setTimeout(type, 600);
    cursorRef.current = cursorInterval;
    return () => {
      window.clearInterval(cursorInterval);
      window.clearTimeout(typingRef.current);
    };
  }, []);


  const locationGroups = React.useMemo(() => {
    const groups = {};
    locationPlaces.forEach(item => {
      if (!item.location) return;
      const parts = item.location.split(",").map(s => s.trim());
      const region = parts[0];
      if (region.toLowerCase() === "12/12a") return; // Temporary ignore
      
      const district = parts[1] || "";
      if (!groups[region]) groups[region] = [];
      if (district && !groups[region].includes(district)) {
        groups[region].push(district);
      }
    });
    // Add default popular regions if missing
    ["Toshkent", "Samarqand", "Buxoro", "Andijon", "Namangan", "Farg'ona"].forEach(r => {
      if (!groups[r]) groups[r] = [];
    });
    return groups;
  }, [locationPlaces]);

  const [expandedRegion, setExpandedRegion] = useState(null);
  // Opening the picker shows the region of the current choice expanded.
  useEffect(() => {
    if (isLocationOpen && selectedLocation.includes(",")) setExpandedRegion(selectedLocation.split(",")[0].trim());
  }, [isLocationOpen, selectedLocation]);
  const chooseLocation = (value) => {
    setSelectedLocation(value);
    setSearchQuery("");
    setIsLocationOpen(false);
  };
  const locationListProps = {
    lang,
    groups: locationGroups,
    query: searchQuery,
    onQuery: setSearchQuery,
    selected: selectedLocation,
    onSelect: chooseLocation,
    expanded: expandedRegion,
    onExpand: setExpandedRegion,
  };

  const openCatalog = () => {
    const params = new URLSearchParams();
    if (activeTab !== "barchasi") params.set("category", String(activeTab));
    if (selectedSubCat) params.set("subcategory", String(selectedSubCat));
    if (selectedLocation) params.set("location", selectedLocation);
    const peopleStep = HERO_PEOPLE_STEPS.find((step) => ft.more(step) === heroCapacity);
    if (peopleStep) params.set("min_people", String(peopleStep + 1));
    if (heroPrice) {
      params.set("min_price", String(heroPrice[0]));
      params.set("max_price", String(heroPrice[1]));
    }
    const query = params.toString();
    navigate(query ? `/filter?${query}` : "/filter");
  };

  return (
    <section className="banner-section">
      <div className="banner">
        <div className="container-fluid">
          <div className="row equal-cols">
            <div className="col-lg-6">
              <div className="info d-flex flex-column">
                <h1 className={`title ${heroTitleLong ? "is-long" : ""}`}>
                  <span className="static-text">{heroTitle.split('\n')[0].split(' ')[0]} </span>
                  {heroTitle.split('\n')[0].split(' ').slice(1).join(' ')}
                  {heroTitle.split('\n').length > 1 && (
                    <>
                      <br />
                      {heroTitle.split('\n').slice(1).join('\n')}
                    </>
                  )}
                  <span className="typing"> {typingText}</span>
                  <span className={`cursor ${cursorVisible ? "blink" : ""}`}>|</span>
                </h1>
                <p className="desc">
                  {heroSubtitle}
                </p>

                <div className="filter" ref={filterRef}>
                  <div className="filter-tabs">
                    {tabs.map((tab) => (
                      <button
                        key={tab.id}
                        className={`tab ${activeTab === tab.id ? "active" : ""}`}
                        onClick={() => { setActiveTab(tab.id); setSelectedSubCat(""); }}
                        type="button"
                      >
                        {tab.label}
                      </button>
                    ))}
                    {categoriesLoading ? (
                      <>
                        <span className="home-category-skeleton" aria-hidden="true" />
                        <span className="home-category-skeleton" aria-hidden="true" />
                      </>
                    ) : null}
                  </div>
                  {categoriesError ? <small className="home-data-error">{categoriesError}</small> : null}

                  {/* Sub-categories */}
                  {activeCategory?.subcategories && activeCategory.subcategories.length > 0 && (
                    <div className="filter-subcats" key={activeTab}>
                      {activeCategory.subcategories.map((sub, subIndex) => (
                        <button
                          key={sub.id}
                          type="button"
                          style={{ "--i": subIndex }}
                          className={`subcat-pill ${selectedSubCat === sub.id ? "active" : ""}`}
                          onClick={() => setSelectedSubCat(selectedSubCat === sub.id ? "" : sub.id)}
                        >
                          {sub[categoryNameField] || sub.name_uz || sub.name_ru || sub.name_en || sub.slug}
                          {selectedSubCat === sub.id && (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "14px", height: "14px", marginLeft: "4px", opacity: 0.8 }}><path d="M18 6 6 18M6 6l12 12"/></svg>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="filter-content">
                    <div className="tab-content active">
                      <div className="filter-options">
                        {activeTab === "barchasi" && (
                          <>
                            <FilterSelect key={`capacity-${lang}`} name="capacity" label={ft.capacity} unit={ft.people} options={[ft.any, ...HERO_PEOPLE_STEPS.map(ft.more)]} openFilter={openFilter} setOpenFilter={setOpenFilter} onChange={setHeroCapacity} />
                            <FilterSelect key={`area-${lang}`} name="area" label={ft.area} unit="m²" options={[ft.any, ...HERO_AREA_STEPS.map(ft.more)]} openFilter={openFilter} setOpenFilter={setOpenFilter} />
                          </>
                        )}
                        
                        {/* Dynamic Filters from API */}
                        {(() => {
                           const params = selectedSubCat ? (activeCategory?.subcategories?.find(s => s.id === selectedSubCat)?.parameters || []) : [];
                           const characteristics = params.filter(p => p.type !== 'boolean' && p.type !== 'text');
                           const amenities = params.filter(p => p.type === 'boolean');
                           
                           return (
                             <>
                               {characteristics.map((p) => {
                                 let options = [ft.any];
                                 if (p.type === 'counter' || p.type === 'select') {
                                    options = [ft.any, ...(Array.isArray(p.config?.options) ? p.config.options.map(localOption) : [])];
                                 }
                                 return (
                                   <FilterSelect key={p.slug} name={p.slug} label={localParamName(p)} unit="" options={options} openFilter={openFilter} setOpenFilter={setOpenFilter} />
                                 );
                               })}
                               
                               {amenities.length > 0 && (
                                 <MultiFilterSelect 
                                   name="amenities_group" 
                                   label={ft.amenities}
                                   pickedLabel={ft.picked}
                                   options={amenities.map(localParamName)} 
                                   openFilter={openFilter} 
                                   setOpenFilter={setOpenFilter} 
                                 />
                               )}
                             </>
                           );
                        })()}

                        {!selectedSubCat && activeTab !== "barchasi" && (
                           <div className="filter-hint">{lang === "ru" ? "Выберите подкатегорию для фильтров" : lang === "en" ? "Choose a subcategory to see filters" : "Filtrlar uchun turini tanlang"}</div>
                        )}
                        <PriceFilter onChange={setHeroPrice} />
                      </div>
                    </div>
                  </div>

                  <div className="custom-select-wrapper">
                    <div ref={locationSelectRef} className={`custom-select ${isLocationOpen ? "open" : ""} ${locationOpenAbove ? "open-above" : ""} ${selectedLocation ? "has-value" : ""}`}>
                      <div className="selected" onClick={() => setIsLocationOpen((current) => !current)}>
                        <img height="38" src={kvIcon} alt="" />
                        <span>{selectedLocation || content?.[lang]?.hero_location_placeholder || "Manzilni tanlang"}</span>
                        {usingDevLocationFallback ? <small style={{ color: "#dc2626", fontWeight: 800 }}>DEV</small> : null}
                        {selectedLocation ? (
                          <button
                            type="button"
                            className="custom-select-clear"
                            aria-label="Tozalash"
                            onClick={(event) => { event.stopPropagation(); setSelectedLocation(""); }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
                          </button>
                        ) : null}
                      </div>
                      {isMobile ? (
                        <BottomSheet isOpen={isLocationOpen} onClose={() => setIsLocationOpen(false)} title={content?.[lang]?.hero_location_title || "Manzil"}>
                          <HeroLocationList sheet {...locationListProps} />
                        </BottomSheet>
                      ) : (
                        <div className="dropdown" onClick={(event) => event.stopPropagation()}>
                          <HeroLocationList {...locationListProps} />
                        </div>
                      )}
                    </div>
                    <button className="search-btn btn-shine" type="button" onClick={openCatalog}>{content?.[lang]?.hero_cta || "Hozir boshlash"}</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-6">
              <div className="img-slider">
                {placesLoading ? (
                  <div className="home-hero-media-skeleton" aria-label="Joylar yuklanmoqda" />
                ) : slides.length > 0 ? (
                  <JoySlider items={slides} interval={4600} navigation />
                ) : (
                  <div className="home-hero-media-empty" role="status">
                    {placesError || content?.[lang]?.hero_empty_places || "Hozircha ko'rsatish uchun joylar yo'q."}
                  </div>
                )}
              </div>
              <div className="infoForReg">
                <div className="info-text">
                  <h2 className="title">{content?.[lang]?.home_partner_title || "Joyzone — bu faqat ijara emas."}</h2>
                  <div className="desc">
                    <p>{content?.[lang]?.home_partner_text || "Bu joyda siz o'zingizning joyingizni joylashtirishingiz mumkin."}</p>
                  </div>
                </div>
                <a href="/partner-guide" className="btn info-btn btn-shine">{content?.[lang]?.home_partner_cta || "Batafsil"}</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
