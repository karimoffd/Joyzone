import { useEffect, useState } from "react";

// Path-based routing (History API). Every screen has a real URL such as
// /filter or /space-12, so search engines can index listings. Old #hash links
// keep working: they are rewritten to the matching path on load and on click.

export const STATIC_ROUTES = new Set([
  "home", "filter", "partner", "profile", "profile-edit", "settings", "card-variants",
  "about-us", "mobile-info", "partner-guide", "footer-variant", "host-today",
  "host-calendar", "host-listings", "host-messages", "host-tariffs", "register",
  "login", "forgot", "verify", "admin",
]);
const DYNAMIC_ROUTE_PREFIXES = ["space-", "agent-", "book-"];
const ROUTE_CHANGE_EVENT = "joyzone-route-change";

export function isRouteKey(key) {
  const value = String(key || "");
  return STATIC_ROUTES.has(value) || DYNAMIC_ROUTE_PREFIXES.some((prefix) => value.startsWith(prefix) && value.length > prefix.length);
}

function decodeSegment(value) {
  try {
    return decodeURIComponent(value);
  } catch (error) {
    return value;
  }
}

export function routeFromPath(pathname = window.location.pathname) {
  const key = decodeSegment(String(pathname || "/").replace(/^\/+|\/+$/g, ""));
  if (!key) return "home";
  return isRouteKey(key) ? key : "home";
}

export function currentRoute() {
  return routeFromPath(window.location.pathname);
}

/** "#space-1", "space-1", "/space-1", "home" -> "/space-1" or "/". */
export function routePath(target) {
  const raw = String(target || "").trim();
  if (!raw || raw === "#" || raw === "/") return "/";
  if (raw.startsWith("/")) return raw;
  const [key, fragment] = raw.replace(/^#/, "").split("#");
  const base = key === "home" ? "/" : `/${key}`;
  return fragment ? `${base}#${fragment}` : base;
}

export function navigate(target, { replace = false } = {}) {
  const path = routePath(target);
  const current = `${window.location.pathname}${window.location.hash}`;
  if (path !== current) {
    window.history[replace ? "replaceState" : "pushState"]({}, "", path);
  }
  window.dispatchEvent(new Event(ROUTE_CHANGE_EVENT));
}

export function useRoute() {
  const [route, setRoute] = useState(currentRoute);

  useEffect(() => {
    const sync = () => setRoute(currentRoute());
    window.addEventListener("popstate", sync);
    window.addEventListener(ROUTE_CHANGE_EVENT, sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener(ROUTE_CHANGE_EVENT, sync);
    };
  }, []);

  return route;
}

/** Rewrites an old /#space-1 style URL to /space-1 without a reload. */
export function upgradeLegacyHashUrl() {
  const key = window.location.hash.replace(/^#/, "");
  if (window.location.pathname === "/" && isRouteKey(key)) {
    window.history.replaceState({}, "", routePath(key));
  }
}

function isPlainLeftClick(event) {
  return event.button === 0 && !event.defaultPrevented
    && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

/** Turns clicks on internal links into client-side navigation. */
export function installLinkInterceptor() {
  const onClick = (event) => {
    if (!isPlainLeftClick(event)) return;
    const anchor = event.target?.closest?.("a[href]");
    if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;

    const href = anchor.getAttribute("href");
    if (href.startsWith("#")) {
      const key = href.slice(1);
      if (isRouteKey(key)) {
        event.preventDefault();
        navigate(key);
      } else if (key && !document.getElementById(key) && currentRoute() !== "home") {
        // Section links like #spaces live on the home page.
        event.preventDefault();
        navigate(`/#${key}`);
      }
      return;
    }

    const url = new URL(anchor.href, window.location.href);
    if (url.origin !== window.location.origin) return;
    const key = decodeSegment(url.pathname.replace(/^\/+|\/+$/g, ""));
    if (key && !isRouteKey(key)) return;
    if (!key && url.hash && url.pathname === window.location.pathname) return;
    event.preventDefault();
    navigate(`${url.pathname}${url.hash}`);
  };

  document.addEventListener("click", onClick);
  return () => document.removeEventListener("click", onClick);
}
