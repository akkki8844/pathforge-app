import { useEffect, useSyncExternalStore } from "react";

/*
 * The focus timer on the laptop.
 *
 * It is a plain Pomodoro-style countdown, stored as an end timestamp rather
 * than a ticking number, so it survives a reload, keeps time in a background
 * tab and cannot drift. Leaving Zen does not stop it; coming back shows it
 * where it is.
 */

export type TimerState = "idle" | "running" | "paused" | "done";

type Stored = {
  minutes: number;
  endsAt: number | null;
  pausedRemaining: number | null;
  day: string;
  sessionsToday: number;
  finishedAt: number | null;
};

export type TimerSnapshot = {
  minutes: number;
  state: TimerState;
  remaining: number;
  progress: number;
  sessionsToday: number;
};

const KEY = "pf-zen-focus";
const EVENT = "pf-zen-focus-change";
export const PRESETS = [25, 50, 90] as const;

const today = () => new Date().toLocaleDateString("en-CA");

function read(): Stored {
  const fresh: Stored = {
    minutes: 25,
    endsAt: null,
    pausedRemaining: null,
    day: today(),
    sessionsToday: 0,
    finishedAt: null,
  };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh;
    const s = { ...fresh, ...(JSON.parse(raw) as Partial<Stored>) };
    if (s.day !== today()) {
      s.day = today();
      s.sessionsToday = 0;
    }
    return s;
  } catch {
    return fresh;
  }
}

let current = read();
let rev = 0;
const listeners = new Set<() => void>();

function notify() {
  rev++;
  listeners.forEach((l) => l());
}

function write(next: Stored) {
  current = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode: the timer still runs for this visit */
  }
  notify();
  window.dispatchEvent(new Event(EVENT));
}

/** Resolve a finished session exactly once, whoever notices it first. */
function settle(now: number): boolean {
  if (current.endsAt !== null && now >= current.endsAt) {
    write({
      ...current,
      endsAt: null,
      pausedRemaining: null,
      sessionsToday: current.sessionsToday + 1,
      finishedAt: now,
    });
    return true;
  }
  return false;
}

export function snapshot(now = Date.now()): TimerSnapshot {
  const total = current.minutes * 60_000;
  let state: TimerState = "idle";
  let remaining = total;
  if (current.endsAt !== null) {
    state = "running";
    remaining = Math.max(0, current.endsAt - now);
  } else if (current.pausedRemaining !== null) {
    state = "paused";
    remaining = current.pausedRemaining;
  } else if (current.finishedAt !== null) {
    state = "done";
    remaining = 0;
  }
  return {
    minutes: current.minutes,
    state,
    remaining,
    progress: total > 0 ? 1 - remaining / total : 0,
    sessionsToday: current.sessionsToday,
  };
}

export function mmss(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export const focus = {
  start() {
    const s = snapshot();
    const remaining = s.state === "paused" ? s.remaining : current.minutes * 60_000;
    write({ ...current, endsAt: Date.now() + remaining, pausedRemaining: null, finishedAt: null });
  },
  pause() {
    if (current.endsAt === null) return;
    write({ ...current, pausedRemaining: Math.max(0, current.endsAt - Date.now()), endsAt: null });
  },
  reset() {
    write({ ...current, endsAt: null, pausedRemaining: null, finishedAt: null });
  },
  setMinutes(minutes: number) {
    write({ ...current, minutes, endsAt: null, pausedRemaining: null, finishedAt: null });
  },
  /** Called by the tick loop; true on the tick a session completes. */
  tick(now = Date.now()) {
    return settle(now);
  },
};

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    current = read();
    rev++;
    cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

const version = () => rev;

/**
 * Re-renders on every stored change, and every quarter second while a
 * session runs so the countdown is live. `onDone` fires when a session ends.
 */
export function useFocusTimer(onDone?: () => void): TimerSnapshot {
  useSyncExternalStore(subscribe, version, version);
  const s = snapshot();
  useEffect(() => {
    if (s.state !== "running") return;
    const id = window.setInterval(() => {
      if (focus.tick()) onDone?.();
      else notify();
    }, 250);
    return () => window.clearInterval(id);
  }, [s.state, onDone]);
  return s;
}
