import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Icon } from "../AdminIcons.jsx";

// Live site next to the CMS editor. The frame gets the unsaved texts over
// postMessage (App.jsx listens for "joyzone-cms-preview") and the text of the
// field being edited is outlined on the page.

const DEVICES = {
  desktop: { width: 1280, label: "Компьютер" },
  mobile: { width: 390, label: "Телефон" },
};
const HIT_CLASS = "joyzone-cms-hit";
const HIT_STYLE = `
.${HIT_CLASS} {
  outline: 3px solid #e46630 !important;
  outline-offset: 4px !important;
  border-radius: 6px;
  background-color: rgba(228, 102, 48, 0.12) !important;
  transition: outline-color 0.2s ease;
}
/* The panel is a small window onto the site: no scrollbar eating its right edge. */
html { scrollbar-width: none; }
html::-webkit-scrollbar { display: none; width: 0; height: 0; }`;

function injectPreviewStyle(doc) {
  if (!doc?.head || doc.getElementById("joyzone-cms-style")) return;
  const style = doc.createElement("style");
  style.id = "joyzone-cms-style";
  style.textContent = HIT_STYLE;
  doc.head.appendChild(style);
}

const normalize = (text) => String(text || "").replace(/\s+/g, " ").trim().toLowerCase();

// The text to look for on the page: the value itself, or the first item of a list.
// A short number such as "6" is looked up together with its caption ("6 шагов").
export function previewNeedle(field, value, pageValues = {}) {
  if (field?.key?.endsWith("_value") && String(value || "").trim().length < 3) {
    const caption = pageValues[field.key.replace(/_value$/, "_label")];
    if (caption) return `${value} ${caption}`;
  }
  if (Array.isArray(value)) {
    const first = value[0];
    if (!first) return "";
    if (typeof first !== "object") return String(first);
    return first.title || first.question || first.label || first.value || "";
  }
  if (field?.type === "words") return String(value || "").split(",")[0] || "";
  if (["url", "email", "phone"].includes(field?.type)) return field.type === "url" ? "" : String(value || "");
  return String(value || "");
}

function isVisible(element) {
  if (!element.getClientRects().length) return false;
  const style = element.ownerDocument.defaultView.getComputedStyle(element);
  // Opacity is not checked: blocks fade in, and a half-faded text is still the right one.
  return style.visibility !== "hidden" && style.display !== "none";
}

export function findOnPage(doc, needle) {
  const full = normalize(needle);
  if (full.length < 2 || !doc?.body) return null;
  const words = full.split(" ");
  const candidates = [full.slice(0, 70)];
  if (words.length > 3) candidates.push(words.slice(0, 3).join(" "));

  for (const candidate of candidates) {
    // Inputs show texts as placeholders.
    const field = [...doc.querySelectorAll("[placeholder]")].find((item) => (
      normalize(item.getAttribute("placeholder")).includes(candidate) && isVisible(item)
    ));
    if (field) return field;

    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
    const firstWord = candidate.split(" ")[0];
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!normalize(node.nodeValue).includes(firstWord)) continue;
      // Climb a few levels: a title may be split by <br> or a coloured <span>.
      let element = node.parentElement;
      for (let depth = 0; element && depth < 4; depth += 1, element = element.parentElement) {
        if (normalize(element.textContent).includes(candidate)) {
          if (isVisible(element)) return element;
          break;
        }
      }
    }
  }
  return null;
}

// Links are found by their address rather than by text.
export function findLink(doc, field, value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const links = [...doc.querySelectorAll("a[href]")].filter(isVisible);
  if (field.type === "url") return links.find((link) => link.getAttribute("href") === raw) || null;
  if (field.type === "email") return links.find((link) => link.getAttribute("href").toLowerCase() === `mailto:${raw.toLowerCase()}`) || null;
  if (field.type === "phone") {
    const digits = raw.replace(/\D/g, "");
    return links.find((link) => link.getAttribute("href").startsWith("tel:") && link.getAttribute("href").replace(/\D/g, "") === digits) || null;
  }
  return null;
}

// Texts behind a tab, the ☰ menu or a submenu: the page state each one needs.
const HOW_PARTNER = /^how_(partner_|tab_partner$|video_partner$)/;
const HOW_GUEST = /^how_(step|guest_|tab_guest$|video_guest$)/;
const SUBMENUS = [
  { pattern: /^menu_about_(info|guide)_|^menu_(back|submenu)$/, item: 1, labelKey: "menu_about_label" },
  { pattern: /^menu_spaces_(catalog|add)_/, item: 2, labelKey: "menu_spaces_label" },
];

export function revealSteps(field, pageValues) {
  const key = field.key;
  const steps = [];
  const wantsMenu = key.startsWith("menu_");
  steps.push({
    done: (doc) => Boolean(doc.querySelector(".burger-menu.open")) === wantsMenu,
    run: (doc) => doc.querySelector(wantsMenu ? ".burger-menu" : ".menu-close-btn")?.click(),
  });
  if (wantsMenu) {
    const submenu = SUBMENUS.find((item) => item.pattern.test(key));
    const openLabel = (doc) => normalize(doc.querySelector(".menu-subview-head")?.textContent);
    steps.push({
      done: (doc) => (submenu
        ? openLabel(doc).includes(normalize(pageValues[submenu.labelKey]))
        : !doc.querySelector(".menu-subview")),
      run: (doc) => {
        const back = doc.querySelector(".menu-subview-back");
        if (back) back.click();
        else if (submenu) doc.querySelector(`.menu-nav-list > li:nth-child(${submenu.item}) .menu-nav-link`)?.click();
      },
    });
  }
  const tab = HOW_PARTNER.test(key) ? 2 : HOW_GUEST.test(key) ? 1 : 0;
  if (tab) {
    const button = (doc) => doc.querySelector(`.hiw-tabs button:nth-child(${tab})`);
    steps.push({
      done: (doc) => !button(doc) || button(doc).getAttribute("aria-selected") === "true",
      run: (doc) => button(doc)?.click(),
    });
  }
  return steps;
}

export default function ContentPreview({ path, values, lang, activeField, activeValue, onClose }) {
  const wantedDevice = activeField?.section?.device;
  const frameRef = useRef(null);
  const boxRef = useRef(null);
  const [device, setDevice] = useState("desktop");
  // Phone-only blocks switch the preview to the phone layout.
  useEffect(() => {
    if (wantedDevice) setDevice(wantedDevice);
  }, [wantedDevice]);
  const [box, setBox] = useState({ width: 0, height: 0 });
  const [status, setStatus] = useState("idle");
  const [frameKey, setFrameKey] = useState(0);

  useLayoutEffect(() => {
    const element = boxRef.current;
    if (!element) return undefined;
    const observer = new ResizeObserver(([entry]) => setBox({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const send = useCallback(() => {
    injectPreviewStyle(frameRef.current?.contentDocument);
    frameRef.current?.contentWindow?.postMessage(
      {
        type: "joyzone-cms-preview",
        content: values,
        lang,
        guest: activeField?.audience === "guest",
        authStep: activeField?.section?.authStep || null,
      },
      window.location.origin,
    );
  }, [values, lang, activeField]);

  const retryRef = useRef(null);
  const highlight = useCallback((attempt = 0) => {
    window.clearTimeout(retryRef.current);
    const doc = frameRef.current?.contentDocument;
    if (!doc?.body) return;
    doc.querySelectorAll(`.${HIT_CLASS}`).forEach((item) => item.classList.remove(HIT_CLASS));
    // The admin clicked through to another page inside the frame: leave the
    // site alone instead of reopening menus and tabs on top of it.
    const shownPath = doc.defaultView.location.pathname;
    if (shownPath !== (path.split("#")[0] || "/")) {
      setStatus("away");
      return;
    }
    if (!activeField) {
      setStatus("idle");
      return;
    }
    injectPreviewStyle(doc);
    // Open the tab, menu or submenu the text lives in, one click at a time.
    const pageValues = values[lang] || {};
    const pending = revealSteps(activeField, pageValues).find((step) => !step.done(doc));
    if (pending && attempt < 8) {
      pending.run(doc);
      retryRef.current = window.setTimeout(() => highlightRef.current(attempt + 1), 650);
      setStatus("searching");
      return;
    }
    const target = findLink(doc, activeField, activeValue)
      || findOnPage(doc, previewNeedle(activeField, activeValue, pageValues));
    if (!target) {
      // Blocks fade in after load: look again a few times before giving up.
      if (attempt < 8) {
        setStatus("searching");
        retryRef.current = window.setTimeout(() => highlightRef.current(attempt + 1), 600);
      } else {
        setStatus("hidden");
      }
      return;
    }
    target.classList.add(HIT_CLASS);
    // Scroll the site frame only; scrollIntoView would also scroll the admin page.
    const view = doc.defaultView;
    const rect = target.getBoundingClientRect();
    view.scrollTo({ top: Math.max(0, view.scrollY + rect.top - view.innerHeight / 2 + rect.height / 2), behavior: "smooth" });
    setStatus("found");
  }, [activeField, activeValue, values, lang, path]);
  // Choosing another field brings the frame back from wherever the admin clicked to.
  const activeKey = activeField?.key;
  useEffect(() => {
    const view = frameRef.current?.contentWindow;
    if (!activeKey || !view) return;
    try {
      // A frame that is still loading (about:blank) is already on its way to the path.
      if (view.location.href !== "about:blank" && view.location.pathname !== (path.split("#")[0] || "/")) {
        setFrameKey((key) => key + 1);
      }
    } catch {
      setFrameKey((key) => key + 1);
    }
  }, [activeKey, path]);

  // Timers started earlier must run the current field's search, not an old one.
  const highlightRef = useRef(highlight);
  useEffect(() => {
    highlightRef.current = highlight;
  }, [highlight]);

  // The site asks for the texts once it has loaded.
  useEffect(() => {
    const onMessage = (event) => {
      if (event.origin === window.location.origin && event.data?.type === "joyzone-cms-preview-ready"
        && event.source === frameRef.current?.contentWindow) {
        send();
        window.setTimeout(() => highlightRef.current(), 900);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [send, highlight]);

  useEffect(() => {
    send();
    const timer = window.setTimeout(() => highlight(), 350);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(retryRef.current);
    };
  }, [send, highlight]);

  const frameWidth = DEVICES[device].width;
  const scale = box.width ? Math.min(1, box.width / frameWidth) : 1;

  return (
    <aside className="cp-preview" aria-label="Предпросмотр сайта">
      <div className="cp-preview-bar">
        <div className="cp-preview-title">
          <span className="cp-preview-live" />
          <strong>Сайт сейчас</strong>
          <small>{path}</small>
        </div>
        <div className="cp-preview-devices" role="group" aria-label="Устройство">
          {Object.entries(DEVICES).map(([id, item]) => (
            <button key={id} type="button" className={device === id ? "is-active" : ""} onClick={() => setDevice(id)} title={item.label}>
              {item.label}
            </button>
          ))}
        </div>
        <button type="button" className="cp-icon-btn" title="Обновить страницу" onClick={() => setFrameKey((key) => key + 1)}>
          <Icon name="undo" size={15} />
        </button>
        <button type="button" className="cp-icon-btn" title="Скрыть предпросмотр" onClick={onClose}>
          <Icon name="x" size={15} />
        </button>
      </div>

      <div className={`cp-preview-status is-${status}`}>
        <Icon name={status === "found" ? "eye" : "info"} size={14} />
        {status === "away" ? (
          <span>
            Вы перешли на другую страницу внутри окна — подсветка на паузе.
            {" "}<button type="button" className="cp-preview-back" onClick={() => setFrameKey((key) => key + 1)}>Вернуться на {path}</button>
          </span>
        ) : status === "found" ? (
          <span><b>{activeField?.label}</b> — обведено оранжевой рамкой на странице.</span>
        ) : status === "searching" ? (
          <span>Ищем <b>{activeField?.label}</b> на странице…</span>
        ) : status === "hidden" ? (
          <span>
            <b>{activeField?.label}</b> сейчас нет на экране — он появляется только в определённый момент.
            {" "}Где: {activeField?.hint || activeField?.section?.where || "после действия на сайте"}
          </span>
        ) : (
          <span>Нажмите на любое поле слева — покажем, где этот текст на сайте. Изменения видны здесь сразу, ещё до сохранения.</span>
        )}
      </div>

      <div className="cp-preview-box" ref={boxRef}>
        <iframe
          key={`${path}-${frameKey}`}
          ref={frameRef}
          src={path}
          title="Предпросмотр сайта"
          onLoad={() => { send(); window.setTimeout(() => highlightRef.current(), 900); }}
          style={{
            width: frameWidth,
            height: box.height / scale,
            transform: `scale(${scale})`,
            left: Math.max(0, (box.width - frameWidth * scale) / 2),
          }}
        />
      </div>
    </aside>
  );
}
