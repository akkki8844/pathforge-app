/**
 * Date and time helpers for Routine.
 *
 * Two rules the whole section follows, and the reason these helpers exist
 * instead of ad-hoc `new Date(...)` calls scattered across nine pages:
 *
 *   1. A "date" in Routine (`scheduled_date`, `log_date`) is a *calendar day in
 *      the user's own zone*, never an instant. `new Date("2026-08-17")` parses
 *      as UTC midnight, which is the previous day for anyone west of Greenwich
 *      and shifts every habit streak by one. Use {@link parseDateKey}, which
 *      builds a local midnight, and {@link dateKey}, which formats from local
 *      parts rather than going through `toISOString()`.
 *   2. A "timestamp" (`due_at`, `remind_at`, `starts_at`) is a real instant
 *      stored as timestamptz and rendered in whatever zone the browser reports.
 *      Nothing here converts those by hand.
 */

/** Local calendar day as "YYYY-MM-DD". Never uses toISOString(). */
export function dateKey(d: Date): string {
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Inverse of {@link dateKey}: "YYYY-MM-DD" → local midnight. */
export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
}

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function addMinutes(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 60_000);
}

/** Weeks start on Monday: a school week does, and the timetable grid follows it. */
export function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  const shift = (x.getDay() + 6) % 7;
  return addDays(x, -shift);
}

export function endOfWeek(d: Date): Date {
  return endOfDay(addDays(startOfWeek(d), 6));
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function endOfMonth(d: Date): Date {
  return endOfDay(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isToday(d: Date): boolean {
  return isSameDay(d, new Date());
}

/** Whole days from `a`'s midnight to `b`'s midnight. Negative when b is earlier. */
export function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86_400_000);
}

/**
 * The six-week grid a month view renders, including the leading and trailing
 * days that belong to the neighbouring months. Always 42 cells so the grid
 * height never jumps between months.
 */
export function monthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7; // Monday-first
  const start = addDays(first, -lead);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

// ── Wall-clock times ("HH:MM" / "HH:MM:SS") ──────────────────────────────

/** Minutes past local midnight for a "HH:MM[:SS]" string. */
export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function minutesToTime(mins: number): string {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, Math.round(mins)));
  const h = `${Math.floor(clamped / 60)}`.padStart(2, "0");
  const m = `${clamped % 60}`.padStart(2, "0");
  return `${h}:${m}`;
}

/** Anchors a "HH:MM[:SS]" wall clock onto a specific local day. */
export function atTimeOn(day: Date, time: string | null | undefined): Date {
  const base = startOfDay(day);
  if (!time) return base;
  const [h, m] = time.split(":").map(Number);
  base.setHours(h ?? 0, m ?? 0, 0, 0);
  return base;
}

/** "09:15:00" → "9:15 AM", in the viewer's locale conventions. */
export function formatTime(time: string | null | undefined): string {
  if (!time) return "";
  return formatClock(atTimeOn(new Date(), time));
}

const CLOCK = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const WEEKDAY_DATE = new Intl.DateTimeFormat(undefined, {
  weekday: "long", month: "long", day: "numeric",
});
const SHORT_DATE = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
const MONTH_YEAR = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });

export function formatClock(d: Date): string {
  return CLOCK.format(d);
}

export function formatLongDate(d: Date): string {
  return WEEKDAY_DATE.format(d);
}

export function formatShortDate(d: Date): string {
  return SHORT_DATE.format(d);
}

export function formatMonthYear(d: Date): string {
  return MONTH_YEAR.format(d);
}

/** "in 25m", "in 3h 10m", "2d ago" — for countdowns and overdue markers. */
export function relativeTime(target: Date, from: Date = new Date()): string {
  const diffMin = Math.round((target.getTime() - from.getTime()) / 60_000);
  const past = diffMin < 0;
  const mins = Math.abs(diffMin);
  let body: string;
  if (mins < 1) body = "now";
  else if (mins < 60) body = `${mins}m`;
  else if (mins < 24 * 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    body = m ? `${h}h ${m}m` : `${h}h`;
  } else {
    const d = Math.round(mins / (24 * 60));
    body = `${d}d`;
  }
  if (body === "now") return "now";
  return past ? `${body} ago` : `in ${body}`;
}

/** "Today", "Tomorrow", "Yesterday", else a short date. */
export function relativeDayLabel(d: Date, from: Date = new Date()): string {
  const delta = daysBetween(from, d);
  if (delta === 0) return "Today";
  if (delta === 1) return "Tomorrow";
  if (delta === -1) return "Yesterday";
  return formatShortDate(d);
}

/** "45m" / "1h 30m" / "2h". Empty string for 0 so callers can hide the slot. */
export function formatDuration(minutes: number): string {
  if (!minutes) return "";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** Time-of-day greeting, matching the wording the Dashboard already uses. */
export function greeting(now: Date = new Date()): string {
  const h = now.getHours();
  if (h < 5) return "Still up";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
