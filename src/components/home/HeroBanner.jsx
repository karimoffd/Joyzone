import { FilterSelect, MultiFilterSelect, PriceFilter } from "./HeroFilters.jsx";
import { useIsMobile } from "./HeaderNav.jsx";
import React, { useEffect, useRef, useState, useContext } from "react";
import { LanguageContext } from "../../context/LanguageContext.jsx";
import BottomSheet from "../ui/BottomSheet.jsx";
import JoySlider from "../JoySlider.jsx";
import kvIcon from "../../assets/img/kv.svg";

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
  const typingRef = useRef(null);
  const cursorRef = useRef(null);
  const wordIndexRef = useRef(0);
  const charIndexRef = useRef(7);
  const isDeletingRef = useRef(false);
  const locationSelectRef = useRef(null);
  
  const [heroTitle, setHeroTitle] = useState("O'zbekiston bo'ylab\nqulay");
  const [heroSubtitle, setHeroSubtitle] = useState("Tadbirkorlardan tortib global korxonalargacha butun dunyo bo'ylab yarim million a'zoga ega Tadbirkorlardan tortib global korxonalargacha butun dunyo bo'ylab");
  const wordsRef = useRef(["ofislar", "kovorking", "zallar", "joylar"]);

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
      
      const dropdownHeight = 250; // approximate height of location dropdown
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

  return (
    <section className="banner-section">
      <div className="banner">
        <div className="container-fluid">
          <div className="row equal-cols">
            <div className="col-lg-6">
              <div className="info d-flex flex-column">
                <h1 className="title">
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

                <div className="filter">
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
                    <div className="filter-subcats">
                      {activeCategory.subcategories.map((sub) => (
                        <button
                          key={sub.id}
                          type="button"
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
                            <FilterSelect name="capacity" label="Вместимость" unit="чел" options={["Любой", "Больше 1", "Больше 5", "Больше 10"]} openFilter={openFilter} setOpenFilter={setOpenFilter} />
                            <FilterSelect name="area" label="Площадь" unit="м²" options={["Любой", "Больше 10", "Больше 50", "Больше 100"]} openFilter={openFilter} setOpenFilter={setOpenFilter} />
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
                                 let options = ["Любой"];
                                 if (p.type === 'counter' || p.type === 'select') {
                                    options = ["Любой", ...(Array.isArray(p.config?.options) ? p.config.options.map(o => o.ru || o.slug) : [])];
                                 }
                                 return (
                                   <FilterSelect key={p.slug} name={p.slug} label={p.name_ru} unit="" options={options} openFilter={openFilter} setOpenFilter={setOpenFilter} />
                                 );
                               })}
                               
                               {amenities.length > 0 && (
                                 <MultiFilterSelect 
                                   name="amenities_group" 
                                   label="Список удобств" 
                                   options={amenities.map(a => a.name_ru)} 
                                   openFilter={openFilter} 
                                   setOpenFilter={setOpenFilter} 
                                 />
                               )}
                             </>
                           );
                        })()}

                        {!selectedSubCat && activeTab !== "barchasi" && (
                           <div style={{ padding: "0 16px", color: "#64748b", fontSize: "14px", display: "flex", alignItems: "center" }}>Выберите подкатегорию для фильтров</div>
                        )}
                        <PriceFilter />
                      </div>
                    </div>
                  </div>

                  <div className="custom-select-wrapper">
                    <div ref={locationSelectRef} className={`custom-select ${isLocationOpen ? "open" : ""} ${locationOpenAbove ? "open-above" : ""}`}>
                      <div className="selected" onClick={() => setIsLocationOpen((current) => !current)}>
                        <img height="38" src={kvIcon} alt="" />
                        <span>{selectedLocation || content?.[lang]?.hero_location_placeholder || "Manzilni tanlang"}</span>
                        {usingDevLocationFallback ? <small style={{ color: "#dc2626", fontWeight: 800 }}>DEV</small> : null}
                      </div>
                      {isMobile ? (
                        <BottomSheet isOpen={isLocationOpen} onClose={() => setIsLocationOpen(false)} title={content?.[lang]?.hero_location_title || "Manzil"}>
                          <div className="dropdown" style={{ position: "static", opacity: 1, visibility: "visible", boxShadow: "none", transform: "none", width: "100%", padding: "0 16px 24px", maxHeight: "60vh", overflowY: "auto" }}>
                        <input className="search-input" value={searchQuery} placeholder={content?.[lang]?.hero_search_placeholder || "Qidirish..."} onChange={(event) => setSearchQuery(event.target.value)} />
                        <ul className="options">
                          {Object.entries(locationGroups).map(([region, districts]) => {
                            const isMatch = region.toLowerCase().includes(searchQuery.toLowerCase()) || districts.some(d => d.toLowerCase().includes(searchQuery.toLowerCase()));
                            if (!isMatch) return null;

                            return (
                              <React.Fragment key={region}>
                                <li 
                                  className={`region-item ${expandedRegion === region ? 'expanded' : ''}`}
                                  style={{ display: "flex", padding: 0 }}
                                >
                                  <div 
                                    style={{ flex: 1, padding: "10px 12px", cursor: "pointer", fontWeight: expandedRegion === region ? "700" : "500", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                                    onClick={() => { setSelectedLocation(region); setIsLocationOpen(false); }}
                                  >
                                    <span>{region}</span>
                                    {selectedLocation === region && (
                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "16px", height: "16px", color: "#e46630" }}><path d="M20 6L9 17l-5-5"/></svg>
                                    )}
                                  </div>
                                  {districts.length > 0 && (
                                    <div 
                                      style={{ padding: "0 14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", borderLeft: "1px solid rgba(41, 74, 109, 0.08)" }}
                                      onClick={(e) => { e.stopPropagation(); setExpandedRegion(expandedRegion === region ? null : region); }}
                                    >
                                      <div style={{ transform: expandedRegion === region ? "rotate(180deg)" : "rotate(0deg)", transition: "0.2s", color: "rgba(41, 74, 109, 0.5)" }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                                      </div>
                                    </div>
                                  )}
                                </li>
                                {expandedRegion === region && districts.length > 0 && (
                                  <div 
                                    className="districts-list" 
                                    style={{ 
                                      margin: "2px 0 6px 14px", 
                                      padding: "4px 0 4px 10px", 
                                      borderLeft: "2px solid rgba(41, 74, 109, 0.08)",
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: "2px"
                                    }}
                                  >
                                    {districts.map(dist => {
                                      const fullLoc = `${region}, ${dist}`;
                                      const isSelected = selectedLocation === fullLoc;
                                      return (
                                        <li 
                                          key={dist} 
                                          className={`district-item ${isSelected ? 'selected' : ''}`}
                                          style={{ 
                                            padding: "8px 12px", 
                                            fontSize: "14px", 
                                            fontWeight: isSelected ? "600" : "500",
                                            border: "none",
                                            borderRadius: "8px",
                                            display: "flex", 
                                            justifyContent: "space-between", 
                                            alignItems: "center", 
                                            cursor: "pointer",
                                            transition: "all 0.2s ease"
                                          }}
                                          onClick={() => { setSelectedLocation(fullLoc); setIsLocationOpen(false); }}
                                        >
                                          <span>{dist}</span>
                                          {isSelected && (
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ width: "14px", height: "14px", color: "#e46630" }}><path d="M20 6L9 17l-5-5"/></svg>
                                          )}
                                        </li>
                                      );
                                    })}
                                  </div>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </ul>
                          </div>
                        </BottomSheet>
                      ) : (
                        <div className="dropdown">
                        <input className="search-input" value={searchQuery} placeholder={content?.[lang]?.hero_search_placeholder || "Qidirish..."} onChange={(event) => setSearchQuery(event.target.value)} />
                        <ul className="options">
                          {Object.entries(locationGroups).map(([region, districts]) => {
                            const isMatch = region.toLowerCase().includes(searchQuery.toLowerCase()) || districts.some(d => d.toLowerCase().includes(searchQuery.toLowerCase()));
                            if (!isMatch) return null;

                            return (
                              <React.Fragment key={region}>
                                <li 
                                  className="region-item" 
                                  style={{ display: "flex", padding: 0, background: expandedRegion === region ? "#f8fafc" : "transparent" }}
                                >
                                  <div 
                                    style={{ flex: 1, padding: "10px 12px", cursor: "pointer", fontWeight: expandedRegion === region ? "700" : "500", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                                    onClick={() => { setSelectedLocation(region); setIsLocationOpen(false); }}
                                  >
                                    <span>{region}</span>
                                    {selectedLocation === region && (
                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "16px", height: "16px", color: "#e46630" }}><path d="M20 6L9 17l-5-5"/></svg>
                                    )}
                                  </div>
                                  {districts.length > 0 && (
                                    <div 
                                      style={{ padding: "0 14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", borderLeft: "1px solid rgba(41, 74, 109, 0.08)" }}
                                      onClick={(e) => { e.stopPropagation(); setExpandedRegion(expandedRegion === region ? null : region); }}
                                    >
                                      <div style={{ transform: expandedRegion === region ? "rotate(180deg)" : "rotate(0deg)", transition: "0.2s", color: "rgba(41, 74, 109, 0.5)" }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                                      </div>
                                    </div>
                                  )}
                                </li>
                                {expandedRegion === region && districts.length > 0 && (
                                  <div 
                                    className="districts-list" 
                                    style={{ 
                                      margin: "2px 0 6px 14px", 
                                      padding: "4px 0 4px 10px", 
                                      borderLeft: "2px solid rgba(41, 74, 109, 0.08)",
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: "2px"
                                    }}
                                  >
                                    {districts.map(dist => {
                                      const fullLoc = `${region}, ${dist}`;
                                      const isSelected = selectedLocation === fullLoc;
                                      return (
                                        <li 
                                          key={dist} 
                                          className={`district-item ${isSelected ? 'selected' : ''}`}
                                          style={{ 
                                            padding: "8px 12px", 
                                            fontSize: "14px", 
                                            fontWeight: isSelected ? "600" : "500",
                                            border: "none",
                                            borderRadius: "8px",
                                            display: "flex", 
                                            justifyContent: "space-between", 
                                            alignItems: "center", 
                                            cursor: "pointer",
                                            transition: "all 0.2s ease"
                                          }}
                                          onClick={() => { setSelectedLocation(fullLoc); setIsLocationOpen(false); }}
                                        >
                                          <span>{dist}</span>
                                          {isSelected && (
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ width: "14px", height: "14px", color: "#e46630" }}><path d="M20 6L9 17l-5-5"/></svg>
                                          )}
                                        </li>
                                      );
                                    })}
                                  </div>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </ul>
                        </div>
                      )}
                    </div>
                    <button className="search-btn btn-shine" type="button">{content?.[lang]?.hero_cta || "Hozir boshlash"}</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-6">
              <div className="img-slider">
                {placesLoading ? (
                  <div className="home-hero-media-skeleton" aria-label="Joylar yuklanmoqda" />
                ) : slides.length > 0 ? (
                  <JoySlider items={slides} interval={4600} />
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
