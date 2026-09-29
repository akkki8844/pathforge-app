import { useCallback, useSyncExternalStore } from "react";

/**
 * Zen mode: one switch that takes the app away and leaves a place to work.
 *
 * On, the whole interface, nav bar included, is covered by the study in
 * components/zen: an interactive 3D room that is the dashboard, simplified,
 * with each block (today, the college list, progress, documents, news, the
 * weekly check-in) and a few extras (focus timer, plan, sound, a breathing
 * break) placed in it as objects (see ZenHost and ZenStudio). The
 * trimmed-down chrome below it (folded nav, hidden dock and banners) stays as
 * a fallback for the moments the room is not up yet.
 *
 * The state lives on <html data-zen> as well as in React, so CSS can hide
 * anything without every component subscribing, and it is remembered per
 * browser because it is a way of working, not a per-page setting.
 */

const KEY = "pf-zen";
const TIME_KEY = "pf-zen-time";

export type ZenTime = "day" | "night";

/**
 * Whether the study is sunlit or lamp-lit. The student's own choice if they
 * made one in the room; otherwise it follows the app's theme, so a dark app
 * opens onto the room at night and a light one onto the room by day.
 */
export function zenTime(): ZenTime {
  try {
    const v = localStorage.getItem(TIME_KEY);
    if (v === "day" || v === "night") return v;
  } catch {
    /* private mode: fall through to the theme */
  }
  if (typeof document !== "undefined" && document.documentElement.classList.contains("dark")) return "night";
  return "day";
}

export function setZenTime(t: ZenTime) {
  try {
    localStorage.setItem(TIME_KEY, t);
  } catch {
    /* private mode: this visit only */
  }
}

/** The colour behind the room while it builds: the day room's paper, or the night's ink. */
export const ZEN_GROUND: Record<ZenTime, string> = { day: "#f3f1ec", night: "#070a14" };
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
