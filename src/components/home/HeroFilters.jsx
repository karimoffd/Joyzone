import { useIsMobile } from "./HeaderNav.jsx";
import React, { useEffect, useRef, useState } from "react";
import BottomSheet from "../ui/BottomSheet.jsx";

export function FilterSelect({ name, label, unit, options, openFilter, setOpenFilter }) {
  const isMobile = useIsMobile();
  const [value, setValue] = useState("");
  const [openAbove, setOpenAbove] = useState(false);
  const containerRef = useRef(null);
  const isOpen = openFilter === name;

  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const timer = setTimeout(() => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const dHeight = dropdownRef.current ? dropdownRef.current.offsetHeight + 20 : 280;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      setOpenAbove(spaceBelow < dHeight && spaceAbove > spaceBelow);
    }, 10);

    return () => clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpenFilter(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, setOpenFilter]);

  return (
    <div ref={containerRef} className={`filter-select ${isOpen && !isMobile ? "open" : ""} ${value ? "has-value" : ""} ${openAbove ? "open-above" : ""}`}>
      <div className="filter-header" onClick={() => setOpenFilter(isOpen ? null : name)}>
        <span className="filter-label">{label}</span>
        <span className="filter-value">{value} {unit}</span>
        <svg width="12" height="8" viewBox="0 0 12 8" aria-hidden="true">
          <path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      </div>
      {isMobile ? (
        <BottomSheet isOpen={isOpen} onClose={() => setOpenFilter(null)} title={label}>
          <div style={{ padding: "0 16px 24px" }}>
            <ul className="options" style={{ background: "transparent", border: "none", boxShadow: "none", padding: 0 }}>
              {options.map((option) => {
                const isSelected = value === option;
                return (
                  <li 
                    key={option} 
                    className={`mobile-option-item ${isSelected ? "selected" : ""}`}
                    onClick={() => { setValue(option); setOpenFilter(null); }}
                  >
                    <span>{option}</span>
                    {isSelected && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ width: "18px", height: "18px", color: "#e46630" }}><path d="M20 6L9 17l-5-5"/></svg>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </BottomSheet>
      ) : (
        <div ref={dropdownRef} className="filter-dropdown">
          <ul className="options">
            {options.map((option, i) => (
              <li key={i} onClick={() => { setValue(option); setOpenFilter(null); }}>
                {option}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function MultiFilterSelect({ name, label, options, openFilter, setOpenFilter }) {
  const isMobile = useIsMobile();
  const [selected, setSelected] = useState([]);
  const [openAbove, setOpenAbove] = useState(false);
  const containerRef = useRef(null);
  const isOpen = openFilter === name;

  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !containerRef.current) return;
    const timer = setTimeout(() => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const dHeight = dropdownRef.current ? dropdownRef.current.offsetHeight + 20 : 300;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      setOpenAbove(spaceBelow < dHeight && spaceAbove > spaceBelow);
    }, 10);
    return () => clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpenFilter(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, setOpenFilter]);

  const toggleOption = (opt) => {
    setSelected(prev => prev.includes(opt) ? prev.filter(x => x !== opt) : [...prev, opt]);
  };

  const displayValue = selected.length === 0 ? "" : `${selected.length} выбрано`;

  return (
    <div ref={containerRef} className={`filter-select ${isOpen && !isMobile ? "open" : ""} ${displayValue ? "has-value" : ""} ${openAbove ? "open-above" : ""}`}>
      <div className="filter-header" onClick={() => setOpenFilter(isOpen ? null : name)}>
        <span className="filter-label">{label}</span>
        <span className="filter-value">{displayValue}</span>
        <svg width="12" height="8" viewBox="0 0 12 8" aria-hidden="true">
          <path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      </div>
      {isMobile ? (
        <BottomSheet isOpen={isOpen} onClose={() => setOpenFilter(null)} title={label}>
          <div className="filter-dropdown" style={{ position: "static", opacity: 1, visibility: "visible", boxShadow: "none", transform: "none", minWidth: "100%" }}>
            {options.map((opt, i) => {
              const isSelected = selected.includes(opt);
              return (
                <div key={i} className={`filter-option ${isSelected ? "selected" : ""}`} onClick={() => toggleOption(opt)} style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                  <span>{opt}</span>
                  <div className="checkbox-box">
                    {isSelected && <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ width: "12px", height: "12px" }}><path d="M20 6L9 17l-5-5"/></svg>}
                  </div>
                </div>
              );
            })}
          </div>
        </BottomSheet>
      ) : (
        <div ref={dropdownRef} className="filter-dropdown">
          {options.map((opt, i) => {
            const isSelected = selected.includes(opt);
            return (
              <div key={i} className={`filter-option ${isSelected ? "selected" : ""}`} onClick={() => toggleOption(opt)} style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                <span>{opt}</span>
                <div className="checkbox-box">
                  {isSelected && <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ width: "12px", height: "12px" }}><path d="M20 6L9 17l-5-5"/></svg>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function PriceFilter() {
  const MIN = 0;
  const MAX = 3000000;
  const [minVal, setMinVal] = useState(0);
  const [maxVal, setMaxVal] = useState(1500000);
  const fillRef = useRef(null);

  useEffect(() => {
    if (!fillRef.current) return;
    const leftPct = (minVal / MAX) * 100;
    const rightPct = 100 - (maxVal / MAX) * 100;
    fillRef.current.style.left = `${leftPct}%`;
    fillRef.current.style.right = `${rightPct}%`;
  }, [minVal, maxVal]);

  const fmt = (v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v);

  return (
    <div className="price-filter">
      <div className="price-values">
        <div className="value-box">
          <input
            type="text"
            value={minVal !== "" && minVal !== undefined ? new Intl.NumberFormat("ru-RU").format(minVal).replace(",", " ") : ""}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, "");
              const val = raw ? Number(raw) : 0;
              setMinVal(Math.min(val, maxVal - 50000));
            }}
          />
          <span>so'm</span>
        </div>
        <span className="price-sep">—</span>
        <div className="value-box">
          <input
            type="text"
            value={maxVal !== "" && maxVal !== undefined ? new Intl.NumberFormat("ru-RU").format(maxVal).replace(",", " ") : ""}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, "");
              const val = raw ? Number(raw) : 0;
              // If they type a small number, don't force it up instantly, allow typing.
              // Wait, we can just allow it, but cap it at MAX.
              setMaxVal(Math.min(val, MAX));
            }}
            onBlur={() => {
              // Constrain on blur
              if (maxVal < minVal + 50000) {
                setMaxVal(minVal + 50000);
              }
            }}
          />
          <span>so'm</span>
        </div>
      </div>
      <div className="price-range-track">
        <span className="price-range-fill" ref={fillRef} />
        <input
          type="range"
          min={MIN}
          max={MAX}
          step={50000}
          value={minVal}
          onChange={(e) => setMinVal(Math.min(Number(e.target.value), maxVal - 50000))}
        />
        <input
          type="range"
          min={MIN}
          max={MAX}
          step={50000}
          value={maxVal}
          onChange={(e) => setMaxVal(Math.max(Number(e.target.value), minVal + 50000))}
        />
      </div>
    </div>
  );
}
