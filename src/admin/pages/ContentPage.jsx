import React, { useCallback, useEffect, useMemo, useState } from "react";
import api, { getApiErrorMessage } from "../../api/client.js";
import { defaultContent } from "../../data/defaultContent.js";
import { CONTENT_FIELDS, CONTENT_SCHEMA } from "../../data/contentSchema.js";
import { Icon } from "../AdminIcons.jsx";
import "./content.css";

const LANGS = ['uz', 'ru', 'en'];
const LANG_LABELS = { uz: "O'zbekcha", ru: "Русский", en: "English" };

const clone = (value) => JSON.parse(JSON.stringify(value));
const same = (a, b) => JSON.stringify(a ?? "") === JSON.stringify(b ?? "");

function isFilled(value) {
  if (Array.isArray(value)) return value.length > 0;
  return String(value ?? "").trim().length > 0;
}

function buildValues(server = {}) {
  return Object.fromEntries(LANGS.map((lang) => [lang, { ...(defaultContent[lang] || {}), ...(server[lang] || {}) }]));
}

function previewText(value) {
  if (Array.isArray(value)) return value.map((item) => (typeof item === "object" ? Object.values(item).join(" ") : item)).join(" ");
  return String(value ?? "");
}

function Highlight({ text, query }) {
  if (!query) return text;
  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (index < 0) return text;
  return (
    <>
      {text.slice(0, index)}
      <mark>{text.slice(index, index + query.length)}</mark>
      {text.slice(index + query.length)}
    </>
  );
}

function LinksEditor({ items, onChange }) {
  const list = Array.isArray(items) ? items : [];
  const update = (index, patch) => onChange(list.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  const move = (index, delta) => {
    const target = index + delta;
    if (target < 0 || target >= list.length) return;
    const next = [...list];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };
  return (
    <div className="cp-links">
      {list.map((item, index) => (
        <div className="cp-link-row" key={index}>
          <span className="cp-row-num">{index + 1}</span>
          <input className="cp-input" value={item.label || ""} placeholder="Название" onChange={(event) => update(index, { label: event.target.value })} />
          <input className="cp-input cp-input-mono" value={item.href || ""} placeholder="/filter или #faq" onChange={(event) => update(index, { href: event.target.value })} />
          <div className="cp-row-actions">
            <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Выше"><Icon name="chevronDown" size={15} /></button>
            <button type="button" onClick={() => move(index, 1)} disabled={index === list.length - 1} aria-label="Ниже"><Icon name="chevronDown" size={15} /></button>
            <button type="button" className="is-danger" onClick={() => onChange(list.filter((_, i) => i !== index))} aria-label="Удалить"><Icon name="trash" size={15} /></button>
          </div>
        </div>
      ))}
      <button type="button" className="cp-add" onClick={() => onChange([...list, { label: "Новая ссылка", href: "/" }])}>
        <Icon name="plus" size={15} /> Добавить ссылку
      </button>
    </div>
  );
}

function ListEditor({ field, items, onChange }) {
  const list = Array.isArray(items) ? items : [];
  const [openIndex, setOpenIndex] = useState(null);
  const update = (index, name, value) => onChange(list.map((item, i) => (i === index ? { ...item, [name]: value } : item)));
  const move = (index, delta) => {
    const target = index + delta;
    if (target < 0 || target >= list.length) return;
    const next = [...list];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
    setOpenIndex(target);
  };
  const add = () => {
    onChange([...list, Object.fromEntries(field.itemFields.map((item) => [item.name, item.options?.[0] || ""]))]);
    setOpenIndex(list.length);
  };
  const titleOf = (item) => item[field.itemFields[0].name] || "Без названия";

  return (
    <div className="cp-list">
      {list.map((item, index) => {
        const open = openIndex === index;
        return (
          <div className={`cp-list-item${open ? " is-open" : ""}`} key={index}>
            <div className="cp-list-head">
              <button type="button" className="cp-list-toggle" onClick={() => setOpenIndex(open ? null : index)}>
                <span className="cp-row-num">{index + 1}</span>
                <span className="cp-list-title">{titleOf(item)}</span>
                <Icon name="chevronDown" size={16} />
              </button>
              <div className="cp-row-actions">
                <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Выше"><Icon name="chevronDown" size={15} /></button>
                <button type="button" onClick={() => move(index, 1)} disabled={index === list.length - 1} aria-label="Ниже"><Icon name="chevronDown" size={15} /></button>
                <button
                  type="button"
                  className="is-danger"
                  aria-label="Удалить"
                  onClick={() => {
                    if (window.confirm(`Удалить «${titleOf(item)}»?`)) onChange(list.filter((_, i) => i !== index));
                  }}
                >
                  <Icon name="trash" size={15} />
                </button>
              </div>
            </div>
            {open ? (
              <div className="cp-list-body">
                {field.itemFields.map((itemField) => (
                  <label key={itemField.name} className="cp-sub-field">
                    <span>{itemField.label}</span>
                    {itemField.type === "select" ? (
                      <select className="cp-input" value={item[itemField.name] || ""} onChange={(event) => update(index, itemField.name, event.target.value)}>
                        {[...new Set([item[itemField.name], ...itemField.options].filter(Boolean))].map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    ) : itemField.multiline ? (
                      <textarea className="cp-input cp-textarea" rows={3} value={item[itemField.name] || ""} onChange={(event) => update(index, itemField.name, event.target.value)} />
                    ) : (
                      <input className="cp-input" value={item[itemField.name] || ""} onChange={(event) => update(index, itemField.name, event.target.value)} />
                    )}
                  </label>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
      <button type="button" className="cp-add" onClick={add}>
        <Icon name="plus" size={15} /> Добавить: {field.itemLabel || "элемент"}
      </button>
    </div>
  );
}

function FieldInput({ field, value, onChange }) {
  if (field.type === "links") return <LinksEditor items={value} onChange={onChange} />;
  if (field.type === "list") return <ListEditor field={field} items={value} onChange={onChange} />;
  if (field.type === "textarea") {
    return <textarea className="cp-input cp-textarea" rows={Math.min(8, Math.max(3, Math.ceil(String(value || "").length / 70)))} value={value || ""} onChange={(event) => onChange(event.target.value)} />;
  }
  const inputType = { email: "email", url: "url", phone: "tel" }[field.type] || "text";
  return (
    <div className="cp-input-wrap">
      <input className="cp-input" type={inputType} value={value || ""} onChange={(event) => onChange(event.target.value)} placeholder={field.type === "url" ? "https://" : ""} />
      {field.type === "words" ? (
        <div className="cp-chips">
          {String(value || "").split(",").map((word) => word.trim()).filter(Boolean).map((word) => <span key={word}>{word}</span>)}
        </div>
      ) : null}
    </div>
  );
}

function FieldCard({ field, lang, values, baseline, setLang, onChange, query }) {
  const value = values[lang]?.[field.key];
  const changed = !same(value, baseline[lang]?.[field.key]);
  const isDefault = same(value, defaultContent[lang]?.[field.key]);
  const isText = !["links", "list"].includes(field.type);
  const isWide = ["links", "list", "textarea", "words"].includes(field.type);

  return (
    <div className={`cp-field${changed ? " is-changed" : ""}${isWide ? " is-wide" : ""}`} id={`cp-field-${field.key}`}>
      <div className="cp-field-head">
        <div className="cp-field-title">
          <strong><Highlight text={field.label} query={query} /></strong>
          {field.hint ? <small>{field.hint}</small> : null}
        </div>
        <div className="cp-field-meta">
          {changed ? <span className="cp-badge is-changed">Изменено</span> : null}
          <div className="cp-lang-dots" title="Заполнено на языках">
            {LANGS.map((code) => (
              <button
                key={code}
                type="button"
                className={`${isFilled(values[code]?.[field.key]) ? "is-filled" : "is-empty"}${code === lang ? " is-current" : ""}`}
                onClick={() => setLang(code)}
                title={`${LANG_LABELS[code]}: ${isFilled(values[code]?.[field.key]) ? "заполнено" : "пусто"}`}
              >
                {code.toUpperCase()}
              </button>
            ))}
          </div>
          {!isDefault && defaultContent[lang]?.[field.key] !== undefined ? (
            <button type="button" className="cp-icon-btn" title="Вернуть стандартный текст" onClick={() => onChange(clone(defaultContent[lang][field.key]))}>
              <Icon name="undo" size={14} />
            </button>
          ) : null}
        </div>
      </div>
      <FieldInput field={field} value={value} onChange={onChange} />
      {isText && field.type !== "words" && value ? <div className="cp-field-foot">{String(value).length} симв.</div> : null}
    </div>
  );
}

export default function ContentPage() {
  const [lang, setLang] = useState("ru");
  const [activePage, setActivePage] = useState(CONTENT_SCHEMA[0].id);
  const [values, setValues] = useState(() => buildValues());
  const [baseline, setBaseline] = useState(() => buildValues());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/api/content/');
      const next = buildValues(res.data?.data || res.data || {});
      setValues(next);
      setBaseline(clone(next));
      setError("");
    } catch (err) {
      setError(getApiErrorMessage(err, "Не удалось загрузить тексты сайта."));
    }
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const dirty = useMemo(() => {
    const result = {};
    LANGS.forEach((code) => {
      result[code] = CONTENT_FIELDS.filter((field) => !same(values[code]?.[field.key], baseline[code]?.[field.key])).map((field) => field.key);
    });
    return result;
  }, [values, baseline]);
  const dirtyTotal = LANGS.reduce((sum, code) => sum + dirty[code].length, 0);

  useEffect(() => {
    if (!dirtyTotal) return undefined;
    const warn = (event) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirtyTotal]);

  const setField = (key, value) => setValues((current) => ({ ...current, [lang]: { ...current[lang], [key]: value } }));

  const handleSave = async () => {
    setIsSaving(true);
    setError("");
    try {
      for (const code of LANGS) {
        if (!dirty[code].length) continue;
        const data = Object.fromEntries(dirty[code].map((key) => [key, values[code][key]]));
        await api.put('/api/content/', { lang: code, data });
      }
      setBaseline(clone(values));
      window.dispatchEvent(new Event('joyzone-content-updated'));
      setNotice(`Сохранено: ${dirtyTotal} ${dirtyTotal === 1 ? "поле" : "полей"}. Сайт уже обновлён.`);
      window.setTimeout(() => setNotice(null), 3500);
    } catch (err) {
      setError(getApiErrorMessage(err, "Не удалось сохранить. Изменения остались в форме — попробуйте ещё раз."));
    }
    setIsSaving(false);
  };

  const discard = () => {
    if (window.confirm("Отменить все несохранённые изменения?")) setValues(clone(baseline));
  };

  const fillStats = useMemo(() => Object.fromEntries(LANGS.map((code) => [
    code,
    Math.round((CONTENT_FIELDS.filter((field) => isFilled(values[code]?.[field.key])).length / CONTENT_FIELDS.length) * 100),
  ])), [values]);

  const trimmedQuery = query.trim();
  const searchResults = useMemo(() => {
    if (!trimmedQuery) return null;
    const needle = trimmedQuery.toLowerCase();
    return CONTENT_FIELDS.filter((field) => [
      field.label, field.hint, field.key, field.section.title,
      ...LANGS.map((code) => previewText(values[code]?.[field.key])),
    ].join(" ").toLowerCase().includes(needle));
  }, [trimmedQuery, values]);

  const page = CONTENT_SCHEMA.find((item) => item.id === activePage) || CONTENT_SCHEMA[0];
  const pageDirtyCount = (pageItem) => {
    const keys = new Set(pageItem.sections.flatMap((section) => section.fields.map((field) => field.key)));
    return LANGS.reduce((sum, code) => sum + dirty[code].filter((key) => keys.has(key)).length, 0);
  };

  const renderField = (field) => (
    <FieldCard
      key={field.key}
      field={field}
      lang={lang}
      values={values}
      baseline={baseline}
      setLang={setLang}
      onChange={(value) => setField(field.key, value)}
      query={trimmedQuery}
    />
  );

  return (
    <div className="cp-page">
      <div className="cp-toolbar">
        <div className="cp-search">
          <Icon name="search" size={17} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти текст на сайте: «FAQ», «телефон», «Kirish»…" />
          {query ? <button type="button" onClick={() => setQuery("")} aria-label="Очистить"><Icon name="x" size={15} /></button> : null}
        </div>
        <div className="cp-langs" role="tablist" aria-label="Язык">
          {LANGS.map((code) => (
            <button key={code} type="button" role="tab" aria-selected={lang === code} className={lang === code ? "is-active" : ""} onClick={() => setLang(code)}>
              <strong>{code.toUpperCase()}</strong>
              <span>{LANG_LABELS[code]}</span>
              <em style={{ "--fill": `${fillStats[code]}%` }}>{fillStats[code]}%</em>
              {dirty[code].length ? <i>{dirty[code].length}</i> : null}
            </button>
          ))}
        </div>
      </div>

      {error ? <div className="cp-alert is-error"><Icon name="info" size={16} />{error}<button type="button" onClick={fetchData}>Обновить</button></div> : null}

      <div className="cp-layout">
        <aside className="cp-pages" aria-label="Страницы сайта">
          <span className="cp-pages-label">Страницы сайта</span>
          {CONTENT_SCHEMA.map((item) => {
            const count = item.sections.reduce((sum, section) => sum + section.fields.length, 0);
            const changed = pageDirtyCount(item);
            return (
              <button
                key={item.id}
                type="button"
                className={`cp-page-btn${!searchResults && item.id === page.id ? " is-active" : ""}`}
                onClick={() => { setActivePage(item.id); setQuery(""); }}
              >
                <span className="cp-page-icon"><Icon name={item.icon} size={17} /></span>
                <span className="cp-page-text">
                  <strong>{item.title}</strong>
                  <small>{count} текстов</small>
                </span>
                {changed ? <span className="cp-page-dirty">{changed}</span> : null}
              </button>
            );
          })}
          <div className="cp-tip">
            <Icon name="info" size={16} />
            <p>Тексты сохраняются для каждого языка отдельно. Кружки <b>UZ RU EN</b> у поля показывают, где перевод уже есть.</p>
          </div>
        </aside>

        <main className="cp-main">
          {isLoading ? (
            <div className="cp-loading">Загружаем тексты сайта…</div>
          ) : searchResults ? (
            <>
              <header className="cp-page-head">
                <div>
                  <h2>Результаты поиска</h2>
                  <p>{searchResults.length ? `Найдено ${searchResults.length} полей по запросу «${trimmedQuery}»` : `По запросу «${trimmedQuery}» ничего не найдено`}</p>
                </div>
              </header>
              {searchResults.map((field) => (
                <section className="cp-section" key={field.key}>
                  <div className="cp-section-where">
                    <Icon name="file" size={14} /> {field.page.title} → {field.section.title}
                  </div>
                  {renderField(field)}
                </section>
              ))}
            </>
          ) : (
            <>
              <header className="cp-page-head">
                <div>
                  <h2>{page.title}</h2>
                  <p>{page.description}</p>
                </div>
                <a className="cp-open-link" href={page.path} target="_blank" rel="noreferrer">
                  <Icon name="external" size={15} /> Открыть на сайте
                </a>
              </header>
              {page.sections.map((section) => (
                <section className="cp-section" key={section.title}>
                  <div className="cp-section-head">
                    <h3>{section.title}</h3>
                    <p><Icon name="eye" size={14} /> {section.where}</p>
                  </div>
                  <div className="cp-fields">
                    {section.fields.map(renderField)}
                  </div>
                </section>
              ))}
            </>
          )}
        </main>
      </div>

      {dirtyTotal || notice ? (
        <div className={`cp-savebar${notice && !dirtyTotal ? " is-success" : ""}`} role="status">
          {dirtyTotal ? (
            <>
              <div className="cp-savebar-text">
                <strong>Есть несохранённые изменения</strong>
                <span>{LANGS.filter((code) => dirty[code].length).map((code) => `${code.toUpperCase()}: ${dirty[code].length}`).join(" · ")}</span>
              </div>
              <button type="button" className="cp-btn-ghost" onClick={discard} disabled={isSaving}>Отменить</button>
              <button type="button" className="cp-btn-primary" onClick={handleSave} disabled={isSaving}>
                <Icon name="check" size={16} /> {isSaving ? "Сохраняем…" : "Сохранить"}
              </button>
            </>
          ) : (
            <div className="cp-savebar-text"><strong><Icon name="check" size={16} /> {notice}</strong></div>
          )}
        </div>
      ) : null}
    </div>
  );
}
