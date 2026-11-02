import React, { useCallback, useEffect, useMemo, useState } from "react";
import api, { getApiErrorMessage } from "../../api/client.js";
import {
  BASE_FILTERS,
  DEFAULT_AREA_RANGES,
  LABEL_DEFAULTS,
  allowsRent,
  areaRangeLabel,
  counterLabel,
  counterUnit,
  defaultBase,
  orderedParameters,
  resolveCategoryFilters,
} from "../../utils/categoryFilters.js";
import { Icon } from "../AdminIcons.jsx";
import "./catalogFilter.css";

// Categories → «Фильтр» opens this page on that category.
export const FILTER_CATEGORY_KEY = "joyzone-admin-filter-category";

const TYPES = {
  select: { label: "Список", hint: "Посетитель выбирает один вариант: «Тип здания → Бизнес-центр»", group: "condition" },
  counter: { label: "Число", hint: "Кнопка «от N»: «Высота потолков → 4+ m»", group: "characteristics" },
  boolean: { label: "Да / нет", hint: "Галочка: «Wi-Fi», «Парковка»", group: "amenities" },
};
const DURATIONS = ["Soatlik", "Kunlik", "Haftalik", "Oylik"];
const EXTRA_OPTIONS = "Tavsiya etilgan · Katta maydon · Kichik jamoa uchun";

function slugify(text, fallback = "filter") {
  const slug = String(text || "").toLowerCase().replace(/[ʻʼ'`]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug || fallback;
}

function readStoredCategory() {
  try {
    const value = window.sessionStorage.getItem(FILTER_CATEGORY_KEY);
    window.sessionStorage.removeItem(FILTER_CATEGORY_KEY);
    return value || "";
  } catch {
    return "";
  }
}

function Switch({ checked, onChange, disabled, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={`cfp-switch${checked ? " is-on" : ""}`}
      onClick={() => onChange(!checked)}
    />
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="cfp-field">
      <span>{label}</span>
      {children}
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}

function parseSteps(text) {
  return [...new Set(String(text).split(/[\s,;]+/).map(Number).filter((value) => Number.isFinite(value) && value >= 0))]
    .sort((a, b) => a - b)
    .slice(0, 8);
}

function StepsInput({ steps, unit, onChange }) {
  const [text, setText] = useState(steps.join(", "));
  return (
    <Field label="Варианты «от»" hint={steps.length ? steps.map((step) => `${step}+${unit ? ` ${unit}` : ""}`).join(" · ") : "Числа через запятую"}>
      <input
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={() => {
          const parsed = parseSteps(text);
          setText(parsed.join(", "));
          onChange(parsed);
        }}
        placeholder="1, 2, 3, 5"
      />
    </Field>
  );
}

function NamesInput({ value, onChange }) {
  return (
    <div className="cfp-names">
      {["uz", "ru", "en"].map((lang) => (
        <Field key={lang} label={lang.toUpperCase()}>
          <input value={value[`name_${lang}`] || ""} onChange={(event) => onChange({ [`name_${lang}`]: event.target.value })} />
        </Field>
      ))}
    </div>
  );
}

function OptionsEditor({ options, onChange }) {
  const update = (index, patch) => onChange(options.map((option, i) => (i === index ? { ...option, ...patch } : option)));
  return (
    <div className="cfp-options">
      <div className="cfp-options-head"><span>UZ</span><span>RU</span><span>EN</span><span /></div>
      {options.map((option, index) => (
        <div className="cfp-option" key={index}>
          {["uz", "ru", "en"].map((lang) => (
            <input key={lang} value={option[lang] || ""} placeholder={lang === "uz" ? "Variant" : ""} onChange={(event) => update(index, { [lang]: event.target.value })} />
          ))}
          <button type="button" className="cfp-icon-btn" aria-label="Удалить вариант" onClick={() => onChange(options.filter((_, i) => i !== index))}>✕</button>
        </div>
      ))}
      <button type="button" className="cfp-add" onClick={() => onChange([...options, { slug: "", uz: "", ru: "", en: "" }])}>+ Вариант</button>
    </div>
  );
}

// Options need a stable slug: places store it, the site filters by it.
function withOptionSlugs(options) {
  const used = new Set();
  return options
    .filter((option) => option.uz || option.ru || option.en)
    .map((option, index) => {
      let slug = option.slug || slugify(option.uz || option.en, `variant-${index + 1}`);
      while (used.has(slug)) slug = `${slug}-${index + 1}`;
      used.add(slug);
      return { ...option, slug };
    });
}

function SubcategoryPicker({ subcategories, isChecked, onToggle }) {
  return (
    <div className="cfp-subs">
      {subcategories.map((sub) => (
        <label key={sub.id} className={`cfp-sub${isChecked(sub) ? " is-on" : ""}`}>
          <input type="checkbox" checked={isChecked(sub)} onChange={() => onToggle(sub)} />
          {sub.name_ru}
        </label>
      ))}
    </div>
  );
}

function AreaRangesEditor({ ranges, custom, onChange, onReset }) {
  const update = (index, key, raw) => {
    const value = raw === "" ? null : Math.max(0, Number(raw));
    onChange(ranges.map((range, i) => (i === index ? { ...range, [key]: value } : range)));
  };
  return (
    <div className="cfp-block">
      <div className="cfp-block-head">
        <h4>Варианты площади</h4>
        {custom ? <button type="button" className="cfp-link" onClick={onReset}>Вернуть стандартные</button> : null}
      </div>
      {ranges.map((range, index) => (
        <div className="cfp-range" key={index}>
          <input type="number" min="0" placeholder="от" value={range.min ?? ""} onChange={(event) => update(index, "min", event.target.value)} />
          <span>–</span>
          <input type="number" min="0" placeholder="до" value={range.max ?? ""} onChange={(event) => update(index, "max", event.target.value)} />
          <em>{range.min == null && range.max == null ? "—" : areaRangeLabel(range)}</em>
          <button type="button" className="cfp-icon-btn" aria-label="Удалить" disabled={ranges.length < 2} onClick={() => onChange(ranges.filter((_, i) => i !== index))}>✕</button>
        </div>
      ))}
      {ranges.length < 8 ? (
        <button type="button" className="cfp-add" onClick={() => onChange([...ranges, { min: ranges.at(-1)?.max ?? 0, max: null }])}>+ Вариант</button>
      ) : null}
    </div>
  );
}

export default function CatalogFilterPage() {
  const [categories, setCategories] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [catId, setCatId] = useState(readStoredCategory);
  const [subId, setSubId] = useState("");
  const [selected, setSelected] = useState(null); // { base } | { slug } | { features: true } | { create: true }
  const [configDrafts, setConfigDrafts] = useState({}); // category id → filter_config
  const [paramDrafts, setParamDrafts] = useState({}); // parameter id → changed fields
  const [memberDrafts, setMemberDrafts] = useState({}); // subcategory id → parameter ids
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [categoriesRes, groupsRes] = await Promise.all([api.get("/api/categories/"), api.get("/api/parameter-groups/")]);
      setCategories(categoriesRes.data?.results || categoriesRes.data || []);
      setGroups(groupsRes.data?.results || groupsRes.data || []);
      setError("");
    } catch (err) {
      setError(getApiErrorMessage(err, "Не удалось загрузить категории"));
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const paramsById = useMemo(() => {
    const map = new Map();
    categories.forEach((category) => (category.subcategories || []).forEach((sub) => (sub.parameters || []).forEach((param) => map.set(param.id, param))));
    groups.forEach((group) => (group.parameters || []).forEach((param) => map.set(param.id, param)));
    return map;
  }, [categories, groups]);

  const rawCategory = categories.find((category) => String(category.id) === String(catId)) || categories[0] || null;

  // The category as it will be after saving: drafted settings, names and subcategory links.
  const category = useMemo(() => {
    if (!rawCategory) return null;
    const draftParam = (id) => {
      const param = paramsById.get(id);
      return param ? { ...param, ...(paramDrafts[id] || {}) } : null;
    };
    return {
      ...rawCategory,
      filter_config: configDrafts[rawCategory.id] ?? rawCategory.filter_config ?? {},
      subcategories: (rawCategory.subcategories || []).map((sub) => ({
        ...sub,
        parameters: (memberDrafts[sub.id] ?? (sub.parameters || []).map((param) => param.id)).map(draftParam).filter(Boolean),
      })),
    };
  }, [rawCategory, configDrafts, paramDrafts, memberDrafts, paramsById]);

  const dirty = Object.keys(configDrafts).length + Object.keys(paramDrafts).length + Object.keys(memberDrafts).length > 0;

  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (event) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  if (loading) return <div className="cfp-empty">Загрузка…</div>;
  if (!category) return <div className="cfp-empty">{error || "Сначала создайте категорию в разделе «Категории»."}</div>;

  const config = category.filter_config;
  const subcategories = category.subcategories;
  const layout = resolveCategoryFilters(category, subId);
  const base = { ...defaultBase(category), ...(config.base || {}) };
  const rentAllowed = allowsRent(category);
  const labels = config.labels || {};
  const areaRanges = config.area_ranges?.length ? config.area_ranges : DEFAULT_AREA_RANGES;
  const rows = orderedParameters(category);
  const hiddenRows = orderedParameters(category, subId).filter((row) => !row.settings.show);
  const hiddenBase = BASE_FILTERS.filter((item) => item.key !== "durations" && !layout.base[item.key]);

  const setConfig = (update) => setConfigDrafts((drafts) => ({
    ...drafts,
    [category.id]: update(drafts[category.id] ?? rawCategory.filter_config ?? {}),
  }));
  const setBase = (key, value) => setConfig((current) => ({ ...current, base: { ...(current.base || {}), [key]: value } }));
  const setLabel = (key, value) => setConfig((current) => ({ ...current, labels: { ...(current.labels || {}), [key]: value } }));
  const setParamSetting = (slug, patch) => setConfig((current) => ({
    ...current,
    params: { ...(current.params || {}), [slug]: { ...(current.params?.[slug] || {}), ...patch } },
  }));
  const editParam = (id, patch) => setParamDrafts((drafts) => ({ ...drafts, [id]: { ...(drafts[id] || {}), ...patch } }));
  const membersOf = (sub) => memberDrafts[sub.id] ?? (rawCategory.subcategories.find((item) => item.id === sub.id)?.parameters || []).map((param) => param.id);
  const toggleMember = (sub, paramId) => {
    const current = membersOf(sub);
    setMemberDrafts((drafts) => ({
      ...drafts,
      [sub.id]: current.includes(paramId) ? current.filter((id) => id !== paramId) : [...current, paramId],
    }));
  };

  // Swap with the neighbour in the same place on the site (the button row or the «Qulayliklar» list).
  const move = (slug, delta) => {
    const row = rows.find((item) => item.param.slug === slug);
    const inList = row.kind === "feature";
    const peers = rows.filter((item) => item.settings.show && (item.kind === "feature") === inList);
    const target = peers[peers.findIndex((item) => item.param.slug === slug) + delta];
    if (!target) return;
    const slugs = rows.map((item) => item.param.slug);
    const from = slugs.indexOf(slug);
    const to = slugs.indexOf(target.param.slug);
    [slugs[from], slugs[to]] = [slugs[to], slugs[from]];
    setConfig((current) => {
      const params = { ...(current.params || {}) };
      slugs.forEach((item, order) => { params[item] = { ...(params[item] || {}), order }; });
      return { ...current, params };
    });
  };

  const selectCategory = (id) => {
    setCatId(String(id));
    setSubId("");
    setSelected(null);
  };

  const discard = () => {
    setConfigDrafts({});
    setParamDrafts({});
    setMemberDrafts({});
    setNotice("");
  };

  const save = async () => {
    for (const [id, draft] of Object.entries(configDrafts)) {
      const bad = (draft.area_ranges || []).find((range) => (range.min == null && range.max == null)
        || (range.min != null && range.max != null && range.min >= range.max));
      if (bad) {
        setError(`Площадь «${bad.min ?? ""} – ${bad.max ?? ""}»: «от» должно быть меньше «до».`);
        selectCategory(id);
        setSelected({ base: "area" });
        return;
      }
    }
    setSaving(true);
    setError("");
    try {
      for (const [id, draft] of Object.entries(paramDrafts)) {
        const payload = { ...draft };
        if (payload.config?.options) payload.config = { ...payload.config, options: withOptionSlugs(payload.config.options) };
        await api.patch(`/api/parameters/${id}/`, payload);
      }
      for (const [id, parameterIds] of Object.entries(memberDrafts)) {
        await api.patch(`/api/subcategories/${id}/`, { parameter_ids: parameterIds });
      }
      for (const [id, draft] of Object.entries(configDrafts)) {
        await api.patch(`/api/categories/${id}/`, { filter_config: draft });
      }
      discard();
      await load();
      setNotice("Сохранено — фильтр на сайте уже обновился.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Не удалось сохранить"));
    }
    setSaving(false);
  };

  // Buttons of the site's filter bar, in the site's order.
  const chips = [];
  if (layout.base.location) chips.push({ id: "location", label: labels.location || LABEL_DEFAULTS.location, select: { base: "location" } });
  if (layout.base.price) chips.push({ id: "price", label: labels.price || (category.deal_types === "sale" ? "Sotuv narxi" : "Narx"), select: { base: "price" } });
  if (layout.base.area) chips.push({ id: "area", label: labels.area || LABEL_DEFAULTS.area, options: layout.areaRanges.map((range) => range.label), select: { base: "area" } });
  layout.params.forEach(({ param, settings, kind }) => {
    const unit = counterUnit(param);
    chips.push({
      id: param.slug,
      label: kind === "counter" ? counterLabel(param) : param.name_uz,
      options: kind === "select" ? param.config.options.map((option) => option.uz)
        : kind === "counter" ? settings.steps.map((step) => `${step}+${unit ? ` ${unit}` : ""}`) : null,
      toggle: kind === "toggle",
      select: { slug: param.slug },
    });
  });
  if (layout.base.capacity) chips.push({ id: "capacity", label: labels.capacity || LABEL_DEFAULTS.capacity, select: { base: "capacity" } });
  if (layout.features.length) chips.push({ id: "features", label: labels.features || LABEL_DEFAULTS.features, options: layout.features.map((param) => param.name_uz), select: { features: true } });
  if (layout.base.extra) chips.push({ id: "extra", label: labels.extra || LABEL_DEFAULTS.extra, select: { base: "extra" } });
  const isSelected = (select) => selected && JSON.stringify(selected) === JSON.stringify(select);

  const renderBaseEditor = (key) => {
    const meta = BASE_FILTERS.find((item) => item.key === key);
    const disabled = key === "durations" && !rentAllowed;
    return (
      <>
        <div className="cfp-editor-head">
          <div>
            <p className="cfp-eyebrow">Основной фильтр</p>
            <h3>{key === "durations" ? "Ijara muddati" : labels[key] || LABEL_DEFAULTS[key]}</h3>
            <small>{meta.hint}</small>
          </div>
          <Switch checked={!disabled && base[key]} disabled={disabled} label="Показывать" onChange={(value) => setBase(key, value)} />
        </div>
        {disabled ? <p className="cfp-note">Категория только для продажи — сроков аренды нет.</p> : null}
        {LABEL_DEFAULTS[key] ? (
          <Field label="Название кнопки на сайте" hint="Пусто — стандартное название">
            <input value={labels[key] || ""} placeholder={key === "price" && category.deal_types === "sale" ? "Sotuv narxi" : LABEL_DEFAULTS[key]} maxLength={40} onChange={(event) => setLabel(key, event.target.value)} />
          </Field>
        ) : null}
        {key === "area" ? (
          <AreaRangesEditor
            ranges={areaRanges}
            custom={Boolean(config.area_ranges?.length)}
            onChange={(ranges) => setConfig((current) => ({ ...current, area_ranges: ranges }))}
            onReset={() => setConfig(({ area_ranges: _unused, ...rest }) => rest)}
          />
        ) : null}
        {key === "durations" ? <p className="cfp-note">Кнопки {DURATIONS.join(" · ")} показывают цены за час, день, неделю или месяц.</p> : null}
        {key === "extra" ? <p className="cfp-note">Варианты: {EXTRA_OPTIONS}.</p> : null}
        {key === "capacity" ? <p className="cfp-note">Посетитель выбирает, на сколько человек нужно место.</p> : null}
      </>
    );
  };

  const renderParamEditor = (slug) => {
    const row = rows.find((item) => item.param.slug === slug);
    if (!row) return <p className="cfp-note">Этого параметра больше нет в подкатегориях категории.</p>;
    const { param, settings, kind } = row;
    const options = param.config?.options || [];
    const used = subcategories.filter((sub) => membersOf(sub).includes(param.id));
    const inList = kind === "feature";
    return (
      <>
        <div className="cfp-editor-head">
          <div>
            <p className="cfp-eyebrow">{TYPES[param.type]?.label || param.type}</p>
            <h3>{param.name_ru || param.name_uz}</h3>
            <small>{settings.show ? (inList ? "в списке «Qulayliklar»" : "кнопка в фильтре") : "скрыт в фильтре"}</small>
          </div>
          <Switch
            checked={settings.show}
            disabled={param.type === "select" && !options.length}
            label="Показывать в фильтре"
            onChange={(show) => setParamSetting(slug, { show })}
          />
        </div>

        {settings.show ? (
          <div className="cfp-move">
            <button type="button" className="cfp-btn" onClick={() => move(slug, -1)}>{inList ? "↑ Выше" : "← Левее"}</button>
            <button type="button" className="cfp-btn" onClick={() => move(slug, 1)}>{inList ? "↓ Ниже" : "Правее →"}</button>
          </div>
        ) : null}

        <div className="cfp-block">
          <h4>Название</h4>
          <NamesInput value={param} onChange={(patch) => editParam(param.id, patch)} />
          <p className="cfp-note">Меняется везде: в фильтре, на странице места и в форме партнёра.</p>
        </div>

        {param.type === "boolean" && settings.show ? (
          <div className="cfp-block">
            <h4>Где показывать</h4>
            <div className="cfp-segment">
              <button type="button" className={!settings.separate ? "is-active" : ""} onClick={() => setParamSetting(slug, { separate: false })}>В списке «Qulayliklar»</button>
              <button type="button" className={settings.separate ? "is-active" : ""} onClick={() => setParamSetting(slug, { separate: true })}>Отдельной кнопкой</button>
            </div>
          </div>
        ) : null}

        {param.type === "counter" ? (
          <div className="cfp-block">
            <h4>Числа</h4>
            <Field label="Единица" hint="m, kVt, xona…">
              <input value={param.config?.unit || ""} maxLength={12} onChange={(event) => editParam(param.id, { config: { ...(param.config || {}), unit: event.target.value } })} />
            </Field>
            <StepsInput key={settings.steps.join(",")} steps={settings.steps} unit={counterUnit(param)} onChange={(steps) => setParamSetting(slug, { steps })} />
          </div>
        ) : null}

        {param.type === "select" ? (
          <div className="cfp-block">
            <h4>Варианты списка</h4>
            <OptionsEditor options={options} onChange={(next) => editParam(param.id, { config: { ...(param.config || {}), options: next } })} />
          </div>
        ) : null}

        <div className="cfp-block">
          <h4>В каких подкатегориях</h4>
          <SubcategoryPicker subcategories={subcategories} isChecked={(sub) => membersOf(sub).includes(param.id)} onToggle={(sub) => toggleMember(sub, param.id)} />
          {!used.length ? <p className="cfp-warning">Ни в одной подкатегории — после сохранения пропадёт из фильтра и из формы партнёра.</p> : null}
        </div>
      </>
    );
  };

  const renderFeaturesEditor = () => {
    const featureRows = rows.filter((row) => row.kind === "feature");
    return (
      <>
        <div className="cfp-editor-head">
          <div>
            <p className="cfp-eyebrow">Список галочек</p>
            <h3>{labels.features || LABEL_DEFAULTS.features}</h3>
            <small>Удобства «да / нет», собранные в одну кнопку</small>
          </div>
        </div>
        <Field label="Название кнопки на сайте" hint="Пусто — стандартное название">
          <input value={labels.features || ""} placeholder={LABEL_DEFAULTS.features} maxLength={40} onChange={(event) => setLabel("features", event.target.value)} />
        </Field>
        <div className="cfp-block">
          <h4>Что внутри</h4>
          <ul className="cfp-feature-list">
            {featureRows.map(({ param, settings }) => (
              <li key={param.slug} className={settings.show ? "" : "is-off"}>
                <button type="button" className="cfp-feature-name" onClick={() => setSelected({ slug: param.slug })}>{param.name_ru}</button>
                {settings.show ? (
                  <>
                    <button type="button" className="cfp-icon-btn" aria-label="Выше" onClick={() => move(param.slug, -1)}>↑</button>
                    <button type="button" className="cfp-icon-btn" aria-label="Ниже" onClick={() => move(param.slug, 1)}>↓</button>
                  </>
                ) : null}
                <Switch checked={settings.show} label={param.name_ru} onChange={(show) => setParamSetting(param.slug, { show })} />
              </li>
            ))}
          </ul>
        </div>
      </>
    );
  };

  return (
    <div className="cfp">
      <p className="cfp-intro">
        Здесь фильтр каталога выглядит как на сайте. Нажмите на любую кнопку — справа откроются её настройки.
        Удобства и характеристики, которые вы добавляете в подкатегории, появляются здесь сами.
      </p>

      <div className="cfp-tabs" role="tablist" aria-label="Категория">
        {categories.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={item.id === category.id}
            className={item.id === category.id ? "is-active" : ""}
            onClick={() => selectCategory(item.id)}
          >
            {item.name_ru}
            {configDrafts[item.id] ? <i className="cfp-dot" title="Есть несохранённые изменения" /> : null}
          </button>
        ))}
      </div>

      {error ? <div className="cfp-error">{error}</div> : null}
      {notice && !dirty ? <div className="cfp-notice">{notice}</div> : null}

      <div className="cfp-layout">
        <section className="cfp-stage">
          <div className="cfp-stage-head">
            <select value={subId} onChange={(event) => { setSubId(event.target.value); }} aria-label="Подкатегория">
              <option value="">Вся категория «{category.name_ru}»</option>
              {subcategories.map((sub) => <option key={sub.id} value={sub.id}>{sub.name_ru}</option>)}
            </select>
            <a className="cfp-site-link" href={`/filter?category=${category.slug}`} target="_blank" rel="noreferrer">
              <Icon name="external" size={15} /> Открыть на сайте
            </a>
          </div>

          <div className="cfp-site">
            {layout.base.durations ? (
              <button type="button" className={`cfp-durations${isSelected({ base: "durations" }) ? " is-selected" : ""}`} onClick={() => setSelected({ base: "durations" })}>
                {DURATIONS.map((label) => <span key={label}>{label}</span>)}
              </button>
            ) : null}
            <div className="cfp-chips">
              {chips.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  className={`cfp-chip${chip.toggle ? " is-toggle" : ""}${isSelected(chip.select) ? " is-selected" : ""}`}
                  onClick={() => setSelected(chip.select)}
                >
                  <span className="cfp-chip-label">{chip.label}</span>
                  {chip.toggle ? <i className="cfp-chip-box" /> : <i className="cfp-chip-caret" />}
                  {chip.options?.length ? <small>{chip.options.join(" · ")}</small> : null}
                </button>
              ))}
              <button type="button" className={`cfp-chip is-new${selected?.create ? " is-selected" : ""}`} onClick={() => setSelected({ create: true })}>
                <span className="cfp-chip-label">+ Новый фильтр</span>
              </button>
            </div>
          </div>

          {hiddenBase.length || hiddenRows.length ? (
            <div className="cfp-hidden">
              <h4>Скрыто в фильтре <small>нажмите, чтобы настроить или включить</small></h4>
              <div className="cfp-hidden-list">
                {hiddenBase.map((item) => (
                  <button key={item.key} type="button" className={isSelected({ base: item.key }) ? "is-selected" : ""} onClick={() => setSelected({ base: item.key })}>
                    {labels[item.key] || item.label}
                  </button>
                ))}
                {hiddenRows.map(({ param }) => (
                  <button key={param.slug} type="button" className={isSelected({ slug: param.slug }) ? "is-selected" : ""} onClick={() => setSelected({ slug: param.slug })}>
                    {param.name_ru}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <aside className="cfp-editor">
          {!selected ? (
            <div className="cfp-editor-empty">
              <Icon name="filter" size={28} />
              <p>Выберите кнопку фильтра слева, чтобы изменить её.</p>
            </div>
          ) : selected.create ? (
            <CreateFilter
              key={category.id}
              category={category}
              groups={groups}
              onCreated={async (param, subIds) => {
                setMemberDrafts((drafts) => {
                  const next = { ...drafts };
                  subIds.forEach((id) => { if (next[id]) next[id] = [...next[id], param.id]; });
                  return next;
                });
                await load();
                setNotice(`Фильтр «${param.name_ru}» создан и уже на сайте.`);
                setSelected({ slug: param.slug });
              }}
            />
          ) : selected.features ? renderFeaturesEditor()
            : selected.base ? renderBaseEditor(selected.base)
              : renderParamEditor(selected.slug)}
        </aside>
      </div>

      {dirty ? (
        <div className="cfp-savebar">
          <span>Есть несохранённые изменения</span>
          <button type="button" className="cfp-btn" onClick={discard} disabled={saving}>Отменить</button>
          <button type="button" className="cfp-btn is-primary" onClick={save} disabled={saving}>{saving ? "Сохраняем…" : "Сохранить"}</button>
        </div>
      ) : null}
    </div>
  );
}

function CreateFilter({ category, groups, onCreated }) {
  const subcategories = category.subcategories || [];
  const [form, setForm] = useState({ type: "boolean", name_uz: "", name_ru: "", name_en: "", unit: "", options: [{ slug: "", uz: "", ru: "", en: "" }] });
  const [groupId, setGroupId] = useState("");
  const [subIds, setSubIds] = useState(() => subcategories.map((sub) => sub.id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (patch) => setForm((current) => ({ ...current, ...patch }));
  const defaultGroup = groups.find((group) => group.slug === TYPES[form.type].group) || groups[0];
  const group = groups.find((item) => String(item.id) === String(groupId)) || defaultGroup;

  const create = async () => {
    if (!form.name_uz.trim() || !form.name_ru.trim()) return setError("Заполните название на UZ и RU.");
    const options = withOptionSlugs(form.options);
    if (form.type === "select" && !options.length) return setError("Добавьте хотя бы один вариант списка.");
    if (!group) return setError("Нет групп параметров — создайте группу в «Характеристиках».");
    if (!subIds.length) return setError("Отметьте хотя бы одну подкатегорию.");
    setSaving(true);
    setError("");
    try {
      const config = form.type === "select" ? { options } : form.type === "counter" ? { min: 0, default: 1, ...(form.unit.trim() ? { unit: form.unit.trim() } : {}) } : {};
      const suffix = Date.now().toString(36).slice(-4);
      const { data: param } = await api.post("/api/parameters/", {
        slug: `${slugify(form.name_en || form.name_uz)}-${suffix}`,
        name_uz: form.name_uz.trim(),
        name_ru: form.name_ru.trim(),
        name_en: (form.name_en || form.name_uz).trim(),
        type: form.type,
        icon: "",
        group: group.id,
        order: (group.parameters || []).length,
        config,
      });
      for (const sub of subcategories.filter((item) => subIds.includes(item.id))) {
        const { data: fresh } = await api.get(`/api/subcategories/${sub.id}/`);
        const ids = (fresh.parameters || []).map((item) => item.id);
        await api.patch(`/api/subcategories/${sub.id}/`, { parameter_ids: [...ids, param.id] });
      }
      await onCreated(param, subIds);
    } catch (err) {
      setError(getApiErrorMessage(err, "Не удалось создать фильтр"));
    }
    setSaving(false);
  };

  return (
    <>
      <div className="cfp-editor-head">
        <div>
          <p className="cfp-eyebrow">Новый фильтр</p>
          <h3>{form.name_ru || "Без названия"}</h3>
          <small>Появится в фильтре и в форме партнёра выбранных подкатегорий</small>
        </div>
      </div>
      <div className="cfp-block">
        <h4>Тип</h4>
        <div className="cfp-types">
          {Object.entries(TYPES).map(([type, meta]) => (
            <button key={type} type="button" className={form.type === type ? "is-active" : ""} onClick={() => { set({ type }); setGroupId(""); }}>
              <strong>{meta.label}</strong>
              <small>{meta.hint}</small>
            </button>
          ))}
        </div>
      </div>
      <div className="cfp-block">
        <h4>Название</h4>
        <NamesInput value={form} onChange={set} />
      </div>
      {form.type === "counter" ? (
        <Field label="Единица" hint="m, kVt, xona…">
          <input value={form.unit} maxLength={12} onChange={(event) => set({ unit: event.target.value })} />
        </Field>
      ) : null}
      {form.type === "select" ? (
        <div className="cfp-block">
          <h4>Варианты списка</h4>
          <OptionsEditor options={form.options} onChange={(options) => set({ options })} />
        </div>
      ) : null}
      <Field label="Раздел в форме партнёра">
        <select value={group?.id || ""} onChange={(event) => setGroupId(event.target.value)}>
          {groups.map((item) => <option key={item.id} value={item.id}>{item.name_ru}</option>)}
        </select>
      </Field>
      <div className="cfp-block">
        <h4>Подкатегории</h4>
        <SubcategoryPicker
          subcategories={subcategories}
          isChecked={(sub) => subIds.includes(sub.id)}
          onToggle={(sub) => setSubIds((current) => (current.includes(sub.id) ? current.filter((id) => id !== sub.id) : [...current, sub.id]))}
        />
      </div>
      {error ? <p className="cfp-warning">{error}</p> : null}
      <button type="button" className="cfp-btn is-primary is-wide" onClick={create} disabled={saving}>
        {saving ? "Создаём…" : "Создать и добавить в фильтр"}
      </button>
    </>
  );
}
