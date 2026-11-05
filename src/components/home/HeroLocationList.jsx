import React from "react";
import "./heroLocation.css";

const TEXT = {
  uz: { all: "Butun O'zbekiston", allHint: "Barcha hududlar", districts: "tuman", search: "Viloyat yoki tumanni qidiring", whole: "Butun viloyat", empty: "Hech narsa topilmadi" },
  ru: { all: "Весь Узбекистан", allHint: "Все регионы", districts: "р-н", search: "Найдите область или район", whole: "Вся область", empty: "Ничего не найдено" },
  en: { all: "All of Uzbekistan", allHint: "All regions", districts: "districts", search: "Search a region or district", whole: "Whole region", empty: "Nothing found" },
};

function Icon({ d, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {[].concat(d).map((path) => <path key={path} d={path} />)}
    </svg>
  );
}

const PIN = ["M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z", "M12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"];
const GLOBE = ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", "M3 12h18", "M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z"];
const CHECK = "m5 12.5 4.5 4.5L19 7.5";
const CHEVRON = "m6 9 6 6 6-6";
const SEARCH = ["M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z", "m20 20-3.5-3.5"];

/**
 * Region / district picker of the home search. One list for the desktop
 * dropdown and the phone bottom sheet.
 */
export default function HeroLocationList({
  lang = "uz",
  groups,
  query,
  onQuery,
  selected,
  onSelect,
  expanded,
  onExpand,
  sheet = false,
}) {
  const t = TEXT[lang] || TEXT.uz;
  const needle = query.trim().toLowerCase();
  const [selectedRegion, selectedDistrict] = String(selected || "").split(",").map((part) => part.trim());

  const rows = Object.entries(groups)
    .map(([region, districts]) => {
      const regionHit = region.toLowerCase().includes(needle);
      const shownDistricts = !needle || regionHit
        ? districts
        : districts.filter((district) => district.toLowerCase().includes(needle));
      return { region, districts, shownDistricts, visible: !needle || regionHit || shownDistricts.length > 0 };
    })
    .filter((row) => row.visible);

  return (
    <div className={`hl ${sheet ? "is-sheet" : ""}`}>
      <label className="hl-search">
        <Icon d={SEARCH} />
        <input value={query} placeholder={t.search} onChange={(event) => onQuery(event.target.value)} />
      </label>

      <ul className="hl-list">
        {!needle ? (
          <li>
            <button type="button" className={`hl-row is-all ${!selected ? "is-selected" : ""}`} onClick={() => onSelect("")}>
              <span className="hl-row-icon"><Icon d={GLOBE} /></span>
              <span className="hl-row-text"><b>{t.all}</b><small>{t.allHint}</small></span>
              {!selected ? <span className="hl-check"><Icon d={CHECK} size={13} /></span> : null}
            </button>
          </li>
        ) : null}

        {rows.map(({ region, districts, shownDistricts }) => {
          const isOpen = Boolean(needle && shownDistricts.length) || expanded === region;
          const regionSelected = selectedRegion === region;
          const regionOnly = regionSelected && !selectedDistrict;
          return (
            <li key={region} className={`hl-group ${isOpen ? "is-open" : ""} ${regionSelected ? "has-selection" : ""}`}>
              <div className={`hl-row ${regionOnly ? "is-selected" : ""}`}>
                <button type="button" className="hl-row-main" onClick={() => onSelect(region)}>
                  <span className="hl-row-icon"><Icon d={PIN} /></span>
                  <span className="hl-row-text">
                    <b>{region}</b>
                    {regionSelected && selectedDistrict ? (
                      <small className="is-picked">{selectedDistrict}</small>
                    ) : districts.length ? (
                      <small>{districts.length} {t.districts}</small>
                    ) : null}
                  </span>
                  {regionOnly ? <span className="hl-check"><Icon d={CHECK} size={13} /></span> : null}
                </button>
                {districts.length ? (
                  <button
                    type="button"
                    className="hl-expand"
                    onClick={() => onExpand(expanded === region ? null : region)}
                    aria-label={region}
                    aria-expanded={isOpen}
                  >
                    <Icon d={CHEVRON} size={15} />
                  </button>
                ) : null}
              </div>

              {isOpen && shownDistricts.length ? (
                <div className="hl-districts">
                  <button type="button" className={`hl-chip ${regionOnly ? "is-selected" : ""}`} onClick={() => onSelect(region)}>
                    {t.whole}
                  </button>
                  {shownDistricts.map((district) => {
                    const isSelected = regionSelected && selectedDistrict === district;
                    return (
                      <button
                        key={district}
                        type="button"
                        className={`hl-chip ${isSelected ? "is-selected" : ""}`}
                        onClick={() => onSelect(`${region}, ${district}`)}
                      >
                        {isSelected ? <Icon d={CHECK} size={12} /> : null}
                        {district}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </li>
          );
        })}

        {!rows.length ? <li className="hl-empty">{t.empty}</li> : null}
      </ul>
    </div>
  );
}
