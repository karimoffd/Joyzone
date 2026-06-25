import React, { useEffect, useMemo, useState, useRef } from "react";
import axios from "axios";
import { sendClientAction } from "../socket.js";
import { ChevronIcon } from "./ui/Shared.jsx";
import { Header as JoyNavbar } from "./HomeHero.jsx";
import { JoyFooter, PropertyCard } from "./ListingsSection.jsx";
import { propertyCards } from "../data/content.js";
import "./FilterPage.css";
import "./ListingsSection.css";

const locationOptions = [...new Set(propertyCards.map((item) => item.location))];
const priceOptions = ["Byudjet < 500 000 so'm", "500 000-2 000 000 so'm", "2 000 000-8 000 000 so'm", "8 000 000+ so'm"];
const capacityOptions = ["1-5 kishi", "6-12 kishi", "13-24 kishi", "25+ kishi"];
const extraOptions = ["Tavsiya etilgan", "Katta maydon", "Kichik jamoa uchun"];
const durationOptions = [
  {
    id: "soatlik", label: "Soatlik",
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
  },
  {
    id: "kunlik", label: "Kunlik",
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>
  },
  {
    id: "haftalik", label: "Haftalik",
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
  },
  {
    id: "oylik", label: "Oylik",
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
  }
];

// ===== Kategoriyalar va sub-kategoriyalar =====
const CATEGORIES = [
  { id: "ofis", label: "Ofis" },
  { id: "kovorking", label: "Kovorking" },
  { id: "zal", label: "Zal / Tadbir" },
  { id: "tijorat", label: "Tijorat" },
  { id: "turarjoy", label: "Turar-joy" }
];

const SUB_CATEGORIES = {
  ofis: ["Xususiy kabinet", "Open space", "Virtual ofis"],
  kovorking: ["Belgilangan joy", "Erkin joy (hot desk)"],
  zal: ["Konferensiya zali", "Trening / seminar zali", "Banket / tantana zali"],
  tijorat: ["Do'kon / savdo", "Showroom", "Ombor"],
  turarjoy: ["Kvartira", "Xona", "Uy / Kottej"]
};

// Extra filters per category (shown alongside common ones)
const CATEGORY_EXTRA_OPTIONS = {
  ofis: ["Mebel bor", "Internet bor", "Avtoturargoh"],
  kovorking: ["Wi-Fi", "Printer", "Kofe burchagi"],
  zal: ["Proyektor", "Mikrofon", "Keytering"],
  tijorat: ["1-qavat", "Vitrina bor"],
  turarjoy: ["Mebellanmagan", "Qisman mebellanmagan", "To'liq mebellanmagan"]
};

function CategoryTabs({ selected, onSelect }) {
  return (
    <div className="fp-category-tabs">
      <button
        type="button"
        className={`fp-cat-tab ${selected === "" ? "is-active" : ""}`}
        onClick={() => onSelect("")}
      >
        Barchasi
      </button>
      {CATEGORIES.map((cat) => (
        <button
          key={cat.id}
          type="button"
          className={`fp-cat-tab ${selected === cat.id ? "is-active" : ""}`}
          onClick={() => onSelect(cat.id)}
        >
          {cat.label}
        </button>
      ))}
    </div>
  );
}

function SubCategoryPills({ categoryId, selected, onSelect }) {
  const subs = SUB_CATEGORIES[categoryId] || [];
  if (subs.length === 0) return null;
  return (
    <div className="fp-subcategory-pills">
      <span className="fp-subcategory-label">Tur:</span>
      {subs.map((sub) => (
        <button
          key={sub}
          type="button"
          className={`fp-subcat-pill ${selected === sub ? "is-active" : ""}`}
          onClick={() => onSelect(selected === sub ? "" : sub)}
        >
          {sub}
          {selected === sub && (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "14px", height: "14px", marginLeft: "4px", opacity: 0.8 }}><path d="M18 6 6 18M6 6l12 12"/></svg>
          )}
        </button>
      ))}
    </div>
  );
}

function FilterDropdown({ label, options, selectedOptions, onToggle }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const selectedLabel = selectedOptions.length === 0 ? label : `${selectedOptions.length} ta tanlangan`;

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className={`fp-filter-dropdown ${open ? "is-open" : ""}`} ref={dropdownRef}>
      <button type="button" className="fp-filter-button" onClick={() => setOpen((current) => !current)}>
        <span className="fp-button-label">{selectedLabel}</span>
        <ChevronIcon open={open} />
      </button>

      <div className={`fp-filter-panel ${open ? "is-visible" : ""}`}>
        {options.map((option) => (
          <button
            type="button"
            key={option}
            className={`fp-filter-option ${selectedOptions.includes(option) ? "is-selected" : ""}`}
            onClick={() => onToggle(option)}
          >
            <span className="fp-filter-option-text">{option}</span>
            {selectedOptions.includes(option) && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "16px", height: "16px", color: "#e46630" }}><path d="M18 6 6 18M6 6l12 12"/></svg>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function LocationFilterDropdown({ label, options, selectedOptions, onToggle }) {
  const [open, setOpen] = useState(false);
  const [expandedRegions, setExpandedRegions] = useState({});
  const dropdownRef = useRef(null);

  const locationGroups = useMemo(() => {
    const groups = {};
    options.forEach(loc => {
      if (!loc) return;
      const parts = loc.split(",").map(s => s.trim());
      const region = parts[0];
      const district = parts[1] || "";
      
      if (!groups[region]) groups[region] = [];
      if (district && !groups[region].includes(district)) {
        groups[region].push(district);
      }
    });
    return groups;
  }, [options]);

  const selectedLabel = selectedOptions.length === 0 ? label : `${selectedOptions.length} ta tanlangan`;

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const toggleRegion = (region, e) => {
    e.stopPropagation();
    setExpandedRegions(prev => ({ ...prev, [region]: !prev[region] }));
  };

  return (
    <div className={`fp-filter-dropdown ${open ? "is-open" : ""}`} ref={dropdownRef}>
      <button type="button" className="fp-filter-button" onClick={() => setOpen((current) => !current)}>
        <span className="fp-button-label">{selectedLabel}</span>
        <ChevronIcon open={open} />
      </button>

      <div className={`fp-filter-panel ${open ? "is-visible" : ""}`}>
        {Object.entries(locationGroups).map(([region, districts]) => (
          <div key={region} className="fp-location-group" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div
              className={`fp-filter-option fp-region-btn ${selectedOptions.includes(region) ? "is-selected" : ""}`}
              style={{ background: expandedRegions[region] ? "rgba(41, 74, 109, 0.04)" : "#fff", padding: "0" }}
            >
              <button
                type="button"
                onClick={() => onToggle(region)}
                style={{ flex: "1", textAlign: "left", padding: "12px 14px", background: "none", border: "none", fontWeight: expandedRegions[region] ? "700" : "500", color: "inherit", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}
              >
                <span className="fp-filter-option-text">{region}</span>
                {selectedOptions.includes(region) && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "16px", height: "16px", color: "#e46630" }}><path d="M18 6 6 18M6 6l12 12"/></svg>
                )}
              </button>
              
              {districts.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => toggleRegion(region, e)}
                  style={{ padding: "0 14px", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", borderLeft: "1px solid rgba(41, 74, 109, 0.08)" }}
                >
                  <div style={{ transform: expandedRegions[region] ? "rotate(180deg)" : "rotate(0deg)", transition: "0.2s" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
                </button>
              )}
            </div>
            
            {expandedRegions[region] && districts.length > 0 && (
              <div 
                className="fp-district-list" 
                style={{ 
                  marginLeft: "12px", 
                  padding: "6px 0 6px 14px", 
                  display: "flex", 
                  flexDirection: "column", 
                  gap: "4px",
                  borderLeft: "2px solid rgba(41, 74, 109, 0.06)" 
                }}
              >
                {districts.map(dist => {
                  const fullLoc = `${region}, ${dist}`;
                  const isSelected = selectedOptions.includes(fullLoc);
                  return (
                    <button
                      type="button"
                      key={dist}
                      className={`fp-filter-option ${isSelected ? "is-selected" : ""}`}
                      onClick={() => onToggle(fullLoc)}
                      style={{ 
                        padding: "8px 12px", 
                        minHeight: "auto", 
                        display: "flex", 
                        justifyContent: "space-between", 
                        alignItems: "center",
                        border: "none",
                        background: isSelected ? "rgba(228, 102, 48, 0.06)" : "transparent",
                        color: isSelected ? "#e46630" : "rgba(41, 74, 109, 0.7)",
                        fontWeight: isSelected ? "600" : "500",
                        borderRadius: "8px",
                        transition: "all 0.2s ease"
                      }}
                    >
                      <span className="fp-filter-option-text" style={{ fontSize: "13.5px" }}>{dist}</span>
                      {isSelected && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ width: "14px", height: "14px", color: "#e46630" }}><path d="M18 6 6 18M6 6l12 12"/></svg>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function PriceRangeDropdown({ label, priceRange, onRangeChange }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  const minLimit = 0;
  const maxLimit = 10000000;
  const step = 100000;

  const [localMin, setLocalMin] = useState(priceRange[0] ?? minLimit);
  const [localMax, setLocalMax] = useState(priceRange[1] ?? maxLimit);

  useEffect(() => {
    setLocalMin(priceRange[0] ?? minLimit);
    setLocalMax(priceRange[1] ?? maxLimit);
  }, [priceRange]);

  const handleSliderMin = (e) => {
    const value = Math.min(Number(e.target.value), localMax - step);
    setLocalMin(value);
  };

  const handleSliderMax = (e) => {
    const value = Math.max(Number(e.target.value), localMin + step);
    setLocalMax(value);
  };

  const applyRange = () => {
    let validMin = Number(localMin) || minLimit;
    let validMax = Number(localMax) || maxLimit;
    
    if (validMin > validMax - step) validMin = validMax - step;
    if (validMin < minLimit) validMin = minLimit;
    if (validMax > maxLimit) validMax = maxLimit;

    setLocalMin(validMin);
    setLocalMax(validMax);
    onRangeChange([validMin, validMax]);
    setOpen(false);
  };

  const clearRange = (e) => {
    e.stopPropagation();
    setLocalMin(minLimit);
    setLocalMax(maxLimit);
    onRangeChange([]);
    setOpen(false);
  };

  const formatPrice = (p) => p >= 1000000 ? `${p / 1000000} mln` : `${p / 1000} ming`;
  
  const isDefault = priceRange.length === 0 || (priceRange[0] === minLimit && priceRange[1] === maxLimit);
  const selectedLabel = isDefault 
    ? label 
    : `${formatPrice(priceRange[0])} - ${formatPrice(priceRange[1])}`;

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className={`fp-filter-dropdown ${open ? "is-open" : ""}`} ref={dropdownRef}>
      <button type="button" className="fp-filter-button" onClick={() => setOpen((current) => !current)}>
        <span className="fp-button-label">{selectedLabel}</span>
        {!isDefault && (
          <div onClick={clearRange} style={{ padding: "0 6px", display: "flex", alignItems: "center", color: "#e46630" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "16px", height: "16px" }}><path d="M18 6 6 18M6 6l12 12"/></svg>
          </div>
        )}
        {isDefault && <ChevronIcon open={open} />}
      </button>

      <div className={`fp-filter-panel ${open ? "is-visible" : ""}`} style={{ padding: "20px 16px", minWidth: "260px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", border: "1px solid rgba(41, 74, 109, 0.15)", borderRadius: "8px", padding: "6px 10px", flex: 1, background: "#fff" }}>
            <input 
              type="text" 
              value={localMin !== "" && localMin !== undefined ? new Intl.NumberFormat("ru-RU").format(localMin).replace(",", " ") : ""} 
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, "");
                setLocalMin(raw ? Number(raw) : "");
              }}
              style={{ width: "100%", border: "none", outline: "none", fontSize: "14px", fontWeight: "600", color: "#12283f", background: "transparent" }}
            />
            <span style={{ fontSize: "12.5px", color: "rgba(41, 74, 109, 0.6)", marginLeft: "4px", fontWeight: "600", userSelect: "none" }}>so'm</span>
          </div>
          <span style={{ color: "rgba(41, 74, 109, 0.4)", fontWeight: "600" }}>—</span>
          <div style={{ display: "flex", alignItems: "center", border: "1px solid rgba(41, 74, 109, 0.15)", borderRadius: "8px", padding: "6px 10px", flex: 1, background: "#fff" }}>
            <input 
              type="text" 
              value={localMax !== "" && localMax !== undefined ? new Intl.NumberFormat("ru-RU").format(localMax).replace(",", " ") : ""} 
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, "");
                setLocalMax(raw ? Number(raw) : "");
              }}
              style={{ width: "100%", border: "none", outline: "none", fontSize: "14px", fontWeight: "600", color: "#12283f", background: "transparent" }}
            />
            <span style={{ fontSize: "12.5px", color: "rgba(41, 74, 109, 0.6)", marginLeft: "4px", fontWeight: "600", userSelect: "none" }}>so'm</span>
          </div>
        </div>
        
        <div className="range-slider-container">
          <div className="slider-track" style={{ 
            left: `${(Number(localMin) / maxLimit) * 100}%`,
            right: `${100 - (Number(localMax) / maxLimit) * 100}%`
          }}></div>
          <input type="range" min={minLimit} max={maxLimit} step={step} value={Number(localMin) || minLimit} onChange={handleSliderMin} />
          <input type="range" min={minLimit} max={maxLimit} step={step} value={Number(localMax) || maxLimit} onChange={handleSliderMax} />
        </div>

        <button type="button" onClick={applyRange} className="btn-shine" style={{ width: "100%", marginTop: "32px", background: "#e46630", color: "#fff", padding: "12px", borderRadius: "10px", fontWeight: "600", border: "none", cursor: "pointer", fontSize: "15px" }}>
          Qo'llash
        </button>
      </div>
    </div>
  );
}

function CapacityDropdown({ label, options, selectedOptions, exactCapacity, onToggle, onExactChange }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const hasSelection = selectedOptions.length > 0 || exactCapacity > 0;
  
  let selectedLabel = label;
  if (exactCapacity > 0) {
    selectedLabel = `${exactCapacity}+ kishi`;
  } else if (selectedOptions.length === 1) {
    selectedLabel = selectedOptions[0];
  } else if (selectedOptions.length > 1) {
    selectedLabel = `${selectedOptions[0]} +${selectedOptions.length - 1}`;
  }

  const clearAll = (e) => {
    e.stopPropagation();
    onExactChange(0);
    selectedOptions.forEach(opt => onToggle(opt));
    setOpen(false);
  };

  return (
    <div className={`fp-filter-dropdown ${open ? "is-open" : ""}`} ref={dropdownRef}>
      <button type="button" className="fp-filter-button" onClick={() => setOpen((current) => !current)}>
        <span className="fp-button-label">{selectedLabel}</span>
        {hasSelection && (
          <div onClick={clearAll} style={{ padding: "0 6px", display: "flex", alignItems: "center", color: "#e46630" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "16px", height: "16px" }}><path d="M18 6 6 18M6 6l12 12"/></svg>
          </div>
        )}
        {!hasSelection && <ChevronIcon open={open} />}
      </button>

      <div className={`fp-filter-panel ${open ? "is-visible" : ""}`} style={{ padding: "16px", minWidth: "260px" }}>
        
        <div style={{ marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", fontSize: "14px", fontWeight: "600", color: "#12283f" }}>
            <span>Aniq odam soni</span>
            <span style={{ color: "#e46630" }}>{exactCapacity > 0 ? exactCapacity + "+ kishi" : "Tanlanmagan"}</span>
          </div>
          <div className="range-slider-container" style={{ height: "6px" }}>
            <div className="slider-track" style={{ left: "0", right: `${100 - (exactCapacity / 100) * 100}%` }}></div>
            <input type="range" min="0" max="100" step="1" value={exactCapacity} onChange={(e) => onExactChange(Number(e.target.value))} />
          </div>
        </div>

        <div style={{ borderTop: "1px solid rgba(41,74,109,0.1)", margin: "20px 0 16px 0" }}></div>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {options.map((option) => (
            <button
              type="button"
              key={option}
              className={`fp-filter-option ${selectedOptions.includes(option) ? "is-selected" : ""}`}
              onClick={() => onToggle(option)}
              style={{ padding: "8px 12px", minHeight: "auto", border: "none", background: selectedOptions.includes(option) ? "rgba(228, 102, 48, 0.06)" : "transparent", borderRadius: "8px" }}
            >
              <span className="fp-filter-option-text" style={{ fontSize: "13.5px", fontWeight: selectedOptions.includes(option) ? "600" : "500", color: selectedOptions.includes(option) ? "#e46630" : "rgba(41, 74, 109, 0.7)" }}>{option}</span>
              {selectedOptions.includes(option) && (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ width: "14px", height: "14px", color: "#e46630" }}><path d="M18 6 6 18M6 6l12 12"/></svg>
              )}
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}

function SearchField({ value, onChange }) {
  return (
    <div className="filter-field filter-search">
      <div className="search-input-wrapper">
        <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input value={value} placeholder="Joy nomi, shahar yoki tip..." onChange={(event) => onChange(event.target.value)} />
        {value && (
          <button type="button" className="search-clear" onClick={() => onChange("")} aria-label="Tozalash">
            &times;
          </button>
        )}
      </div>
    </div>
  );
}

function ProductSkeletonGrid() {
  return (
    <div className="property-grid filter-skeleton-grid" aria-label="Joylar yuklanmoqda">
      {Array.from({ length: 8 }, (_, index) => (
        <article className="filter-card-skeleton" key={index}>
          <span className="skeleton-media" />
          <span className="skeleton-line is-short" />
          <span className="skeleton-line" />
          <span className="skeleton-line is-price" />
        </article>
      ))}
    </div>
  );
}

export default function FilterPage({ userState, setUserState }) {
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubCat, setSelectedSubCat] = useState("");
  const [selectedDuration, setSelectedDuration] = useState("");
  const [filters, setFilters] = useState({ search: "", location: [], price: [], capacity: [], exactCapacity: 0, extra: [] });
  const [loading, setLoading] = useState(true);
  const [spaces, setSpaces] = useState(propertyCards);

  // Reset subcategory when category changes
  useEffect(() => {
    setSelectedSubCat("");
  }, [selectedCategory]);

  // Fetch spaces from API on mount
  useEffect(() => {
    axios.get("http://localhost:5000/api/spaces")
      .then((res) => {
        if (res.data && res.data.length > 0) {
          setSpaces(res.data);
        }
      })
      .catch((err) => {
        console.warn("REST API orqali joylarni yuklab bo'lmadi, mock ma'lumotlar ishlatilmoqda:", err.message);
      });
  }, []);

  // Send search action log to WebSocket server when filters change (debounced)
  useEffect(() => {
    const activeFilters = [];
    if (filters.search) activeFilters.push(`nomi: "${filters.search}"`);
    if (filters.location.length) activeFilters.push(`manzil: ${filters.location.join(', ')}`);
    if (selectedCategory) activeFilters.push(`kategoriya: ${selectedCategory}`);
    if (selectedSubCat) activeFilters.push(`tur: ${selectedSubCat}`);
    if (filters.price.length) activeFilters.push(`narx: ${filters.price.join(', ')}`);
    
    const queryDescription = activeFilters.join(' | ') || 'Barcha joylar';

    const delayDebounce = setTimeout(() => {
      sendClientAction("search", { query: queryDescription });
    }, 850);

    return () => clearTimeout(delayDebounce);
  }, [filters.search, filters.location, filters.price, selectedCategory, selectedSubCat]);

  useEffect(() => {
    setLoading(true);
    const timer = window.setTimeout(() => setLoading(false), 520);
    return () => window.clearTimeout(timer);
  }, [filters, selectedCategory, selectedSubCat]);

  const filteredCards = useMemo(() => {
    return spaces.filter((item) => {
      const searchTerm = filters.search.trim().toLowerCase();
      if (searchTerm) {
        const itemTitle = item.title || item.name || "";
        const itemCategory = item.category || item.type || "";
        const matchText = [itemTitle, item.location, itemCategory, item.price].join(" ").toLowerCase();
        if (!matchText.includes(searchTerm)) return false;
      }

      // Category filter
      if (selectedCategory) {
        const itemCat = (item.category || item.type || "").toLowerCase();
        const catMap = {
          ofis: ["ofis", "office"],
          kovorking: ["kovorking", "coworking"],
          zal: ["zal", "konferensiya", "tadbir", "banket"],
          tijorat: ["tijorat", "do'kon", "showroom", "ombor"],
          turarjoy: ["kvartira", "xona", "uy", "kottej", "turar"]
        };
        const catKeys = catMap[selectedCategory] || [];
        if (!catKeys.some((k) => itemCat.includes(k))) return false;
      }

      if (filters.location.length && !filters.location.includes(item.location)) return false;

      if (filters.capacity.length || filters.exactCapacity > 0) {
        const count = item.people;
        const matchesExact = filters.exactCapacity > 0 ? count >= filters.exactCapacity : true;
        
        let matchesCapacity = true;
        if (filters.capacity.length) {
          matchesCapacity = filters.capacity.some((range) => {
            if (range === "1-5 kishi") return count <= 5;
            if (range === "6-12 kishi") return count >= 6 && count <= 12;
            if (range === "13-24 kishi") return count >= 13 && count <= 24;
            if (range === "25+ kishi") return count >= 25;
            return false;
          });
        }
        if (!matchesExact || !matchesCapacity) return false;
      }
      if (filters.extra.length) {
        const matchesExtra = filters.extra.some((option) => {
          if (option === "Tavsiya etilgan") return Boolean(item.promoted);
          if (option === "Katta maydon") return item.area >= 100;
          if (option === "Kichik jamoa uchun") return item.people <= 12;
          return false;
        });
        if (!matchesExtra) return false;
      }
      if (filters.price.length === 2) {
        const priceValue = Number(item.price.replace(/\D/g, ""));
        const minPrice = filters.price[0];
        const maxPrice = filters.price[1];
        if (priceValue < minPrice) return false;
        if (maxPrice < 10000000 && priceValue > maxPrice) return false;
      }
      return true;
    });
  }, [filters, spaces, selectedCategory, selectedSubCat]);

  const clearFilters = () => {
    setFilters({ search: "", location: [], price: [], capacity: [], exactCapacity: 0, extra: [] });
    setSelectedCategory("");
    setSelectedSubCat("");
    setSelectedDuration("");
  };

  const toggleFilter = (key, value) => {
    setFilters((current) => ({
      ...current,
      [key]: current[key].includes(value)
        ? current[key].filter((item) => item !== value)
        : [...current[key], value]
    }));
  };

  // Category-specific extra options (add to the "extra" filter)
  const activeExtraOptions = selectedCategory
    ? [...extraOptions, ...(CATEGORY_EXTRA_OPTIONS[selectedCategory] || [])]
    : extraOptions;

  return (
    <main className="filter-shell">
      <JoyNavbar userState={userState} setUserState={setUserState} activeIndex={1} />

      <section className="filter-bar-section">
        <div className="filter-bar-head">
          <SearchField value={filters.search} onChange={(value) => setFilters((current) => ({ ...current, search: value }))} />
          <button type="button" className="filter-clear-btn" onClick={clearFilters}>
            Tozalash
          </button>
        </div>

        {/* Category tabs row: tabs left, duration pills right */}
        <div className="fp-cats-duration-row">
          <CategoryTabs selected={selectedCategory} onSelect={setSelectedCategory} />
          <div className="fp-duration-row">
            {durationOptions.map((d) => (
              <button
                key={d.id}
                type="button"
                className={`fp-duration-pill ${selectedDuration === d.id ? "is-active" : ""}`}
                onClick={() => setSelectedDuration(selectedDuration === d.id ? "" : d.id)}
                title={d.label}
              >
                <span className="fp-duration-icon">{d.icon}</span>
                <span className="fp-duration-text">{d.label}</span>
                {selectedDuration === d.id && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "14px", height: "14px", marginLeft: "2px", opacity: 0.9 }}><path d="M18 6 6 18M6 6l12 12"/></svg>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Sub-category pills (shown when a category is selected) */}
        {selectedCategory && (
          <SubCategoryPills
            categoryId={selectedCategory}
            selected={selectedSubCat}
            onSelect={setSelectedSubCat}
          />
        )}

        {/* Common filters */}
        <div className="filter-dropdown-grid">
          <LocationFilterDropdown
            label="Manzil"
            options={locationOptions}
            selectedOptions={filters.location}
            onToggle={(value) => toggleFilter("location", value)}
          />
          <PriceRangeDropdown
            label="Narx"
            priceRange={filters.price}
            onRangeChange={(range) => setFilters(prev => ({ ...prev, price: range }))}
          />
          <CapacityDropdown
            label="Sig'im"
            options={capacityOptions}
            selectedOptions={filters.capacity}
            exactCapacity={filters.exactCapacity}
            onToggle={(value) => toggleFilter("capacity", value)}
            onExactChange={(val) => setFilters(prev => ({ ...prev, exactCapacity: val }))}
          />
          <FilterDropdown
            label="Qo'shimcha"
            options={activeExtraOptions}
            selectedOptions={filters.extra}
            onToggle={(value) => toggleFilter("extra", value)}
          />
        </div>
      </section>

      <section className="filter-results">
        <div className="results-top">
          <p>{loading ? "Joylar yuklanmoqda..." : `${filteredCards.length} ta natija topildi`}</p>
          <div className="results-actions">
            <span className="sort-label">Saralash:</span>
            <button type="button" className="sort-pill is-active">Relevans</button>
            <button type="button" className="sort-pill">Narx</button>
            <button type="button" className="sort-pill">Sig'im</button>
          </div>
        </div>
        {loading ? (
          <ProductSkeletonGrid />
        ) : (
          <div className="property-grid">
            {filteredCards.map((item, index) => (
              <PropertyCard key={item.title} item={item} index={index} selectedDuration={selectedDuration} />
            ))}
          </div>
        )}
      </section>

      <JoyFooter />
    </main>
  );
}
