import React, { useEffect, useMemo, useState, useRef } from "react";
import { ChevronIcon } from "./ui/Shared.jsx";
import { Header as JoyNavbar } from "./HomeHero.jsx";
import { PropertyCard } from "./ListingsSection.jsx";
import { propertyCards } from "../data/content.js";
import "./FilterPage.css";
import "./ListingsSection.css";

const locationOptions = [...new Set(propertyCards.map((item) => item.location))];
const workspaceOptions = [...new Set(propertyCards.map((item) => item.category))];
const priceOptions = ["Byudjet < 500 000 so'm", "500 000-2 000 000 so'm", "2 000 000-8 000 000 so'm", "8 000 000+ so'm"];
const capacityOptions = ["1-5 kishi", "6-12 kishi", "13-24 kishi", "25+ kishi"];
const categoryOptions = ["Bron", "Kovorking zal", "Muzokara xona", "Ijaraga joylar"];
const extraOptions = ["Tavsiya etilgan", "Katta maydon", "Kichik jamoa uchun"];

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
            <span className="fp-filter-option-state">{selectedOptions.includes(option) ? "Tanlangan" : "Tanlash"}</span>
          </button>
        ))}
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
  const [filters, setFilters] = useState({ search: "", location: [], price: [], capacity: [], workspace: [], category: [], extra: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const timer = window.setTimeout(() => setLoading(false), 520);
    return () => window.clearTimeout(timer);
  }, [filters]);

  const filteredCards = useMemo(() => {
    return propertyCards.filter((item) => {
      const searchTerm = filters.search.trim().toLowerCase();
      if (searchTerm) {
        const matchText = [item.title, item.location, item.category, item.price].join(" ").toLowerCase();
        if (!matchText.includes(searchTerm)) return false;
      }
      if (filters.location.length && !filters.location.includes(item.location)) return false;
      if (filters.workspace.length && !filters.workspace.includes(item.category)) return false;
      if (filters.category.length) {
        const categoryMap = {
          "Bron": () => item.category !== "Tadbir joyi",
          "Kovorking zal": () => item.category === "Kovorking",
          "Muzokara xona": () => ["Konferensiya", "Kovorking"].includes(item.category),
        };
        const matches = filters.category.some((cat) => categoryMap[cat] ? categoryMap[cat]() : true);
        if (!matches) return false;
      }
      if (filters.capacity.length) {
        const count = item.people;
        const matchesCapacity = filters.capacity.some((range) => {
          if (range === "1-5 kishi") return count <= 5;
          if (range === "6-12 kishi") return count >= 6 && count <= 12;
          if (range === "13-24 kishi") return count >= 13 && count <= 24;
          if (range === "25+ kishi") return count >= 25;
          return false;
        });
        if (!matchesCapacity) return false;
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
      if (filters.price.length) {
        const priceValue = Number(item.price.replace(/\D/g, ""));
        const matchesPrice = filters.price.some((range) => {
          if (range === "Byudjet < 500 000 so'm") return priceValue < 500000;
          if (range === "500 000-2 000 000 so'm") return priceValue >= 500000 && priceValue <= 2000000;
          if (range === "2 000 000-8 000 000 so'm") return priceValue >= 2000000 && priceValue <= 8000000;
          if (range === "8 000 000+ so'm") return priceValue >= 8000000;
          return false;
        });
        if (!matchesPrice) return false;
      }
      return true;
    });
  }, [filters]);

  const clearFilters = () => {
    setFilters({ search: "", location: [], price: [], capacity: [], workspace: [], category: [], extra: [] });
  };

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

        <div className="filter-dropdown-grid">
          <FilterDropdown
            label="Kategoriya"
            options={categoryOptions}
            selectedOptions={filters.category}
            onToggle={(value) => setFilters((current) => ({
              ...current,
              category: current.category.includes(value)
                ? current.category.filter((item) => item !== value)
                : [...current.category, value]
            }))}
          />
          <FilterDropdown
            label="Manzil"
            options={locationOptions}
            selectedOptions={filters.location}
            onToggle={(value) => setFilters((current) => ({
              ...current,
              location: current.location.includes(value)
                ? current.location.filter((item) => item !== value)
                : [...current.location, value]
            }))}
          />
          <FilterDropdown
            label="Narx"
            options={priceOptions}
            selectedOptions={filters.price}
            onToggle={(value) => setFilters((current) => ({
              ...current,
              price: current.price.includes(value)
                ? current.price.filter((item) => item !== value)
                : [...current.price, value]
            }))}
          />
          <FilterDropdown
            label="Sig'im"
            options={capacityOptions}
            selectedOptions={filters.capacity}
            onToggle={(value) => setFilters((current) => ({
              ...current,
              capacity: current.capacity.includes(value)
                ? current.capacity.filter((item) => item !== value)
                : [...current.capacity, value]
            }))}
          />
          <FilterDropdown
            label="Joy turi"
            options={workspaceOptions}
            selectedOptions={filters.workspace}
            onToggle={(value) => setFilters((current) => ({
              ...current,
              workspace: current.workspace.includes(value)
                ? current.workspace.filter((item) => item !== value)
                : [...current.workspace, value]
            }))}
          />
          <FilterDropdown
            label="Qo'shimcha"
            options={extraOptions}
            selectedOptions={filters.extra}
            onToggle={(value) => setFilters((current) => ({
              ...current,
              extra: current.extra.includes(value)
                ? current.extra.filter((item) => item !== value)
                : [...current.extra, value]
            }))}
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
              <PropertyCard key={item.title} item={item} index={index} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
