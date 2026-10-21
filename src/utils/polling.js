import { useEffect, useRef } from "react";

// Polls only while the tab is visible and refreshes as soon as it becomes
// visible again, so background tabs do not keep hitting the API.
export function useVisiblePolling(callback, intervalMs, { enabled = true } = {}) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!enabled) return undefined;
    let timer = null;
    const isVisible = () => document.visibilityState !== "hidden";
    const run = () => callbackRef.current?.();
    const start = () => {
      if (timer === null) timer = window.setInterval(() => { if (isVisible()) run(); }, intervalMs);
    };
    const stop = () => {
      if (timer !== null) window.clearInterval(timer);
      timer = null;
    };
    const onVisibilityChange = () => {
      if (isVisible()) {
        run();
        start();
      } else {
        stop();
      }
    };

    if (isVisible()) start();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [intervalMs, enabled]);
}
