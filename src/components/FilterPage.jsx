import React, { useMemo, useState } from "react";
import { ChevronIcon } from "./ui/Shared.jsx";
import { PropertyCard } from "./ListingsSection.jsx";
import { propertyCards } from "../data/content.js";
import "./FilterPage.css";
import "./ListingsSection.css";

const locationOptions = [...new Set(propertyCards.map((item) => item.location))];
const workspaceOptions = [...new Set(propertyCards.map((item) => item.category))];
const priceOptions = ["Byudjet < 500 000 so'm", "500 000–2 000 000 so'm", "2 000 000–8 000 000 so'm", "8 000 000+ so'm"];
const capacityOptions = ["1–5 kishi", "6–12 kishi", "13–24 kishi", "25+ kishi"];

function FilterDropdown({ label, options, selectedOptions, onToggle }) {
  const [open, setOpen] = useState(false);
  const selectedLabel = selectedOptions.length === 0 ? "" : `${selectedOptions.length} ta tanlangan`;

  return (
    <div className="filter-dropdown">
      <button type="button" className="filter-dropdown-button" onClick={() => setOpen((current) => !current)}>
        <span>{label}</span>
        <strong>{selectedLabel}</strong>
        <ChevronIcon open={open} />
      </button>
      {open ? (
        <div className="filter-dropdown-panel">
          {options.map((option) => (
            <label key={option} className="filter-option">
              <input
                type="checkbox"
                checked={selectedOptions.includes(option)}
                onChange={() => onToggle(option)}
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SearchField({ value, onChange }) {
  return (
    <label className="filter-field filter-search">
      <input value={value} placeholder="Joy nomi, shahar yoki tip" onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

export default function FilterPage() {
  const [filters, setFilters] = useState({ search: "", location: [], price: [], capacity: [], workspace: [] });

  const filteredCards = useMemo(() => {
    return propertyCards.filter((item) => {
      const searchTerm = filters.search.trim().toLowerCase();
      if (searchTerm) {
        const matchText = [item.title, item.location, item.category, item.price].join(" ").toLowerCase();
        if (!matchText.includes(searchTerm)) {
          return false;
        }
      }
      if (filters.location.length && !filters.location.includes(item.location)) return false;
      if (filters.workspace.length && !filters.workspace.includes(item.category)) return false;
      if (filters.capacity.length) {
        const count = item.people;
        const matchesCapacity = filters.capacity.some((range) => {
          if (range === "1–5 kishi") return count <= 5;
          if (range === "6–12 kishi") return count >= 6 && count <= 12;
          if (range === "13–24 kishi") return count >= 13 && count <= 24;
          if (range === "25+ kishi") return count >= 25;
          return false;
        });
        if (!matchesCapacity) return false;
      }
      if (filters.price.length) {
        const priceValue = Number(item.price.replace(/\D/g, ""));
        const matchesPrice = filters.price.some((range) => {
          if (range === "Byudjet < 500 000 so'm") return priceValue < 500000;
          if (range === "500 000–2 000 000 so'm") return priceValue >= 500000 && priceValue <= 2000000;
          if (range === "2 000 000–8 000 000 so'm") return priceValue >= 2000000 && priceValue <= 8000000;
          if (range === "8 000 000+ so'm") return priceValue >= 8000000;
          return false;
        });
        if (!matchesPrice) return false;
      }
      return true;
    });
  }, [filters]);

  return (
    <main className="filter-shell">
      

      <section className="filter-tabs">
        {['Hammasi', 'Ijaraga joylar', 'Bron', 'Kovorking zal', 'Muzokara xona'].map((tab) => (
          <button key={tab} type="button" className={tab === 'Hammasi' ? 'filter-tab is-active' : 'filter-tab'}>
            {tab}
          </button>
        ))}
      </section>

      <section className="filter-form">
        <SearchField value={filters.search} onChange={(value) => setFilters((current) => ({ ...current, search: value }))} />
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
      </section>

      <section className="filter-results">
        <div className="results-top">
          <p>{filteredCards.length} ta natija topildi</p>
          <div className="results-actions">
            <span className="sort-label">Saralash:</span>
            <button type="button" className="sort-pill is-active">Relevans</button>
            <button type="button" className="sort-pill">Narx</button>
            <button type="button" className="sort-pill">Sig'im</button>
          </div>
        </div>
        <div className="property-grid">
          {filteredCards.map((item, index) => (
            <PropertyCard key={item.title} item={item} index={index} />
          ))}
        </div>
      </section>
    </main>
  );
}
