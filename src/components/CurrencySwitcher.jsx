import React from "react";
import { useCurrency } from "../context/CurrencyContext";
import "./CurrencySwitcher.css";

const CURRENCIES = [
  { code: "UZS", label: "UZS", flag: "🇺🇿" },
  { code: "USD", label: "USD", flag: "🇺🇸" },
  { code: "RUB", label: "RUB", flag: "🇷🇺" },
];

export default function CurrencySwitcher({ className = "" }) {
  const { currency, setCurrency, loading } = useCurrency();

  return (
    <div className={`currency-switcher ${className}`} role="group" aria-label="Выбор валюты">
      {CURRENCIES.map((c) => (
        <button
          key={c.code}
          id={`currency-btn-${c.code.toLowerCase()}`}
          className={`currency-btn ${currency === c.code ? "currency-btn--active" : ""}`}
          onClick={() => setCurrency(c.code)}
          disabled={loading}
          aria-pressed={currency === c.code}
          title={c.code}
        >
          <span className="currency-flag">{c.flag}</span>
          <span className="currency-label">{c.label}</span>
        </button>
      ))}
    </div>
  );
}
