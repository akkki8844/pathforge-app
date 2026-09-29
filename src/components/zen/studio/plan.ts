import { useSyncExternalStore } from "react";

/*
 * Today's list on the chalkboard. Five lines, kept in this browser. When the
 * date changes, finished lines are wiped and unfinished ones carry over, the
 * way a real board gets half-erased every morning.
 */

export type PlanItem = { text: string; done: boolean };

type Stored = { day: string; items: PlanItem[] };

const KEY = "pf-zen-plan";
export const PLAN_LINES = 5;
const today = () => new Date().toLocaleDateString("en-CA");
const blank = (): PlanItem[] => Array.from({ length: PLAN_LINES }, () => ({ text: "", done: false }));

function normalize(items: PlanItem[]): PlanItem[] {
  const out = items
    .filter((i) => i && typeof i.text === "string")
    .slice(0, PLAN_LINES)
    .map((i) => ({ text: i.text.slice(0, 80), done: !!i.done }));
  while (out.length < PLAN_LINES) out.push({ text: "", done: false });
  return out;
}

function read(): Stored {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { day: today(), items: blank() };
    const s = JSON.parse(raw) as Stored;
    let items = normalize(Array.isArray(s.items) ? s.items : []);
    if (s.day !== today()) items = normalize(items.filter((i) => i.text.trim() && !i.done));
    return { day: today(), items };
  } catch {
    return { day: today(), items: blank() };
  }
}

let current = read();
const listeners = new Set<() => void>();

function write(items: PlanItem[]) {
  current = { day: today(), items: normalize(items) };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    /* private mode */
  }
  listeners.forEach((l) => l());
}

export const plan = {
  get: () => current.items,
  setText(i: number, text: string) {
    const items = current.items.slice();
    items[i] = { ...items[i], text };
    write(items);
  },
  toggle(i: number) {
    const items = current.items.slice();
    if (!items[i].text.trim()) return;
    items[i] = { ...items[i], done: !items[i].done };
    write(items);
  },
};

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    current = read();
    cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

const snap = () => current.items;

export function usePlan(): PlanItem[] {
  return useSyncExternalStore(subscribe, snap, snap);
}
