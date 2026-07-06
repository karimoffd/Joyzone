import React, { createContext, useContext, useEffect, useState } from "react";

const CACHE_KEY = "joyzone-currency-rates";
const CBU_API   = "https://cbu.uz/ru/arkhiv-kursov-valyut/json/";
const SUPPORTED  = ["USD", "RUB"]; // UZS is base — no rate needed

const CurrencyContext = createContext(null);

/**
 * Reads cached rates from localStorage.
 * Returns null if cache is missing or stale (not today's date).
 */
function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { date, rates } = JSON.parse(raw);
    const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
    return date === today ? rates : null;
  } catch {
    return null;
  }
}

function writeCache(rates) {
  try {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem(CACHE_KEY, JSON.stringify({ date: today, rates }));
  } catch {}
}

/**
 * Fetches today's rates from CBU and returns { USD: 12013.52, RUB: 159.95 }
 */
async function fetchRates() {
  const res  = await fetch(CBU_API);
  const data = await res.json();
  const result = {};
  for (const item of data) {
    if (SUPPORTED.includes(item.Ccy)) {
      // Nominal can be >1 (e.g. 10 for IDR), so divide rate by nominal
      result[item.Ccy] = parseFloat(item.Rate) / parseFloat(item.Nominal);
    }
  }
  return result;
}

export function CurrencyProvider({ children }) {
  // rates: { USD: number, RUB: number }  (price of 1 foreign unit in UZS)
  const [rates, setRates]       = useState({});
  const [currency, setCurrencyRaw] = useState(
    () => localStorage.getItem("joyzone-currency") || "UZS"
  );
  const [loading, setLoading]   = useState(true);

  const setCurrency = (c) => {
    setCurrencyRaw(c);
    try { localStorage.setItem("joyzone-currency", c); } catch {}
  };

  useEffect(() => {
    const cached = readCache();
    if (cached) {
      setRates(cached);
      setLoading(false);
      return;
    }
    // Fetch once — only when cache is empty or stale
    fetchRates()
      .then((r) => {
        setRates(r);
        writeCache(r);
      })
      .catch(() => {
        // If fetch fails — silently stay with UZS
      })
      .finally(() => setLoading(false));
  }, []);

  /**
   * Convert a price from UZS to the active currency.
   * @param {number} amountUZS
   * @returns {number}
   */
  const convert = (amountUZS) => {
    if (!amountUZS || currency === "UZS") return amountUZS;
    const rate = rates[currency];
    if (!rate) return amountUZS;
    return amountUZS / rate;
  };

  /**
   * Format a UZS price into the active currency with symbol.
   * @param {number} amountUZS
   * @returns {string}
   */
  const format = (amountUZS) => {
    const value = convert(amountUZS);
    if (value == null) return "";

    const SYMBOLS = { UZS: "so'm", USD: "$", RUB: "₽" };
    const DECIMALS = { UZS: 0, USD: 2, RUB: 0 };
    const sym = SYMBOLS[currency] || "";
    const dec = DECIMALS[currency] ?? 0;

    const formatted = new Intl.NumberFormat("ru-RU", {
      minimumFractionDigits: dec,
      maximumFractionDigits: dec,
    }).format(value);

    return currency === "USD"
      ? `${sym}${formatted}`
      : `${formatted} ${sym}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, rates, convert, format, loading }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used inside <CurrencyProvider>");
  return ctx;
}
