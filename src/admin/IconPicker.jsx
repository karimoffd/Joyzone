import React, { useMemo, useState } from "react";
import { ICON_PACK, PackIcon, resolveIconName, searchIcons } from "../components/ui/iconPack.jsx";

// Icon field for parameters and amenities: search + grid of the Joyzone pack.
export function IconPicker({ value, onChange, hint = "" }) {
  const [query, setQuery] = useState("");
  const selected = resolveIconName(value, hint);
  const results = useMemo(() => searchIcons(query), [query]);
  const current = ICON_PACK.find((icon) => icon.name === selected);

  return (
    <div className="icon-picker">
      <div className="icon-picker-top">
        <span className="icon-picker-current" title={current?.label}>
          <PackIcon name={selected} size={24} />
        </span>
        <div className="icon-picker-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск: wifi, парковка, kofe..."
          />
        </div>
      </div>
      <div className="icon-picker-grid" role="listbox" aria-label="Иконки">
        {results.map((icon) => (
          <button
            key={icon.name}
            type="button"
            role="option"
            aria-selected={icon.name === selected}
            className={icon.name === selected ? "is-active" : ""}
            onClick={() => onChange(icon.name)}
            title={icon.label}
          >
            <PackIcon name={icon.name} size={22} />
            <span>{icon.label}</span>
          </button>
        ))}
        {!results.length ? <p className="icon-picker-empty">Ничего не найдено</p> : null}
      </div>
      {!value ? <p className="icon-picker-note">Иконка не выбрана — на сайте будет показана подобранная автоматически.</p> : null}
    </div>
  );
}
