import { useCallback, useSyncExternalStore } from "react";

/**
 * Zen mode: one switch that takes the app down to the task in front of you.
 *
 * On, it folds the nav bar to the logo, search and an exit button, hides the
 * floating chrome (message dock, support and feedback buttons, banners), and
 * trims the dashboard to today's focus. Pages themselves are untouched, so an
 * essay or a practice set reads exactly as it did, with nothing around it.
 *
 * The state lives on <html data-zen> as well as in React, so CSS can hide
 * anything without every component subscribing, and it is remembered per
 * browser because it is a way of working, not a per-page setting.
 */

const KEY = "pf-zen";
const EVENT = "pf-zen-change";

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

function apply(on: boolean) {
  if (typeof document === "undefined") return;
  if (on) document.documentElement.setAttribute("data-zen", "");
  else document.documentElement.removeAttribute("data-zen");
}

// Match the attribute to the stored value before first paint of any consumer.
if (typeof window !== "undefined") apply(read());

export function setZen(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "1" : "0");
  } catch {
    /* private mode: still applies for this page view */
  }
  apply(on);
  window.dispatchEvent(new Event(EVENT));
}

export function toggleZen() {
  setZen(!document.documentElement.hasAttribute("data-zen"));
}

function subscribe(cb: () => void) {
  // Another tab flipped it: bring this tab's attribute into line first.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    apply(read());
    cb();
  };
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", onStorage);
  };
}

const snapshot = () => typeof document !== "undefined" && document.documentElement.hasAttribute("data-zen");

export function useZenMode(): [boolean, (on?: boolean) => void] {
  const on = useSyncExternalStore(subscribe, snapshot, () => false);
  const set = useCallback((next?: boolean) => setZen(next ?? !snapshot()), []);
  return [on, set];
}

/** Ctrl + . on Windows and Linux, Cmd + . on a Mac. */
export function isZenShortcut(e: KeyboardEvent): boolean {
  return (e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key === ".";
}
