import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Filter,
  Globe2,
  Grid3x3,
  List,
  Lock,
  Plus,
  Search,
  Upload,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as MiniCalendar } from "@/components/ui/calendar";

/**
 * The calendar surface: month, week, day and list over one list of events,
 * with search, facet filters, drag-to-reschedule and a create/edit dialog.
 *
 * It owns *no data*. Everything it shows is passed in, and every change it can
 * make leaves through `onCreate` / `onUpdate` / `onDelete` / `onMove`, so the
 * caller decides what a "reschedule" actually writes to. That is what lets a
 * calendar drawn from six different tables behave like one calendar without
 * this file knowing any of those tables exist.
 *
 * Two flags on an event decide how much of it can be touched:
 *   * `draggable` — the row behind it has one moveable timestamp.
 *   * `editable`  — the row behind it can be edited through *this* dialog.
 * Anything recurring or derived (a weekly class, a habit) sets neither and
 * renders read-only with whatever `detail` the caller supplies. Colour is a
 * presentation of the source, never something the dialog edits: the caller
 * resolves it from data rather than storing a swatch per event.
 */

export type EventManagerView = "year" | "month" | "week" | "day" | "list";

export interface CalendarEvent {
  /** Unique per *occurrence*. A weekly class yields one id per day it meets. */
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  start: Date;
  end?: Date | null;
  allDay?: boolean;
  /** A key into `colors`. Resolved to classes by the caller, never here. */
  color: string;
  /** A key into `categories`. The filter axis. */
  category?: string;
  /**
   * Seeds the dialog's Type select when it differs from the filter axis — a
   * calendar can be *filtered* by where an item came from while an editable
   * row still has its own category column.
   */
  editCategory?: string;
  /** Free-form facets shown as chips and offered as a filter. */
  tags?: string[];
  /** Short word for what kind of thing this is, shown beside the title. */
  kindLabel?: string;
  done?: boolean;
  overdue?: boolean;
  /** Can be dragged onto another day or hour. */
  draggable?: boolean;
  /** Can be edited and deleted through this component's dialog. */
  editable?: boolean;
  /** "none" | "daily" | "weekdays" | "weekly" | "monthly" | "yearly". */
  recurrence?: string | null;
  /** Null means it repeats indefinitely when `recurrence` is set. */
  recurrenceEnd?: Date | null;
  /** A key into `calendars`, if the caller supplies that prop. */
  calendarId?: string | null;
}

export interface EventManagerColor {
  value: string;
  label: string;
  /** `bg-*` only, for the dot. */
  dot: string;
  /** Full tinted chip: background, text and border. */
  chip: string;
}

export interface EventManagerOption {
  value: string;
  label: string;
}

/** What the dialog collects. The caller maps it onto whatever row it owns. */
export interface EventDraft {
  title: string;
  description: string;
  location: string;
  category: string;
  start: Date;
  end: Date | null;
  allDay: boolean;
  /** "none" | "daily" | "weekdays" | "weekly" | "monthly" | "yearly". */
  recurrence: string;
  /** Only meaningful when `recurrence` isn't "none". Null repeats forever. */
  recurrenceEnd: Date | null;
  /** A key into the `calendars` prop. Null when the caller offers none. */
  calendarId: string | null;
}

const RECURRENCE_OPTIONS: { value: string; label: string }[] = [
  { value: "none", label: "Does not repeat" },
  { value: "daily", label: "Daily" },
  { value: "weekdays", label: "Every weekday (Mon–Fri)" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

export interface EventManagerProps {
  events: CalendarEvent[];
  colors: EventManagerColor[];
  /** Every category that can appear on an event — drives the filter. */
  categories: EventManagerOption[];
  /** The subset a *new* event may be filed under. Defaults to `categories`. */
  createCategories?: EventManagerOption[];
  tags?: string[];
  /** Label for the tag facet. "Tags" reads wrong when they are derived. */
  tagFilterLabel?: string;
  /**
   * A caller's own organizing calendars ("Work", "Personal") — a second,
   * independent filter axis from `categories`, and the Calendar field the
   * create/edit dialog offers when this is supplied. Omit entirely for a
   * caller with no such concept; the facet and the dialog field both disappear
   * rather than showing an empty list.
   */
  calendars?: EventManagerOption[];

  defaultView?: EventManagerView;
  /**
   * View and focused date can be lifted out, which is how a caller that has to
   * *fetch* the visible range knows which days to build. Leave them out and the
   * component keeps its own.
   */
  view?: EventManagerView;
  onViewChange?: (view: EventManagerView) => void;
  date?: Date;
  onDateChange?: (date: Date) => void;
  className?: string;
  saving?: boolean;
  /** Rendered instead of a view body when there is genuinely nothing to show. */
  emptyState?: ReactNode;
  /** Extra read-only detail under a non-editable event in the dialog. */
  detail?: (event: CalendarEvent) => ReactNode;
  /**
   * Rendered inside the edit form, under everything else, for an existing
   * (not brand-new) editable event — the caller's own guest-list UI, since
   * guests attach to a saved event's id and this component owns no such
   * concept itself. Never shown while creating: there's no id yet to invite
   * anyone to.
   */
  guestsSection?: (event: CalendarEvent) => ReactNode;
  onCreate?: (draft: EventDraft) => void | Promise<void>;
  onUpdate?: (id: string, draft: EventDraft) => void | Promise<void>;
  onDelete?: (id: string) => void | Promise<void>;
  /**
   * A card was dropped on a new slot. `start` is the new start instant, and
   * `hourSet` says whether the drop chose a time of day (week and day grids)
   * or only a date (month grid), so the caller can keep the original clock.
   */
  onMove?: (event: CalendarEvent, start: Date, hourSet: boolean) => void | Promise<void>;
  /**
   * The bottom edge of a Week/Day block was dragged to a new duration.
   * Distinct from `onMove`: a move changes when something starts, a resize
   * changes how long it runs — different columns on most of the tables this
   * calendar draws from, and only offered on events that carry their own end
   * time (`event.end` set).
   */
  onResize?: (event: CalendarEvent, end: Date) => void | Promise<void>;
}

// ── Local date helpers, so this file stays self-contained ────────────────

const DAY_MS = 86_400_000;

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

/** Weeks start on Monday — the convention the rest of Routine already uses. */
function startOfWeek(d: Date): Date {
  const out = startOfDay(d);
  return addDays(out, -((out.getDay() + 6) % 7));
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function monthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const start = addDays(startOfDay(first), -((first.getDay() + 6) % 7));
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

function clock(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

// ── .ics export ────────────────────────────────────────────────────────
// Enough of RFC 5545 to round-trip into any real calendar app — one VEVENT
// per row, UTC timestamps, the handful of fields that carry meaning here.
// No RRULE line even for a recurring row: this exports the *occurrences
// currently on screen*, each a plain one-off VEVENT, not an attempt to
// re-encode this file's own five-pattern recurrence model as a real RRULE.

function icsEscape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/[,;]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");
}

function icsDate(d: Date, allDay: boolean): string {
  if (allDay) {
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
      d.getDate(),
    ).padStart(2, "0")}`;
  }
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function eventToICS(event: CalendarEvent, uid: string): string {
  const allDay = Boolean(event.allDay);
  const lines = [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${icsDate(new Date(), false)}`,
    allDay ? `DTSTART;VALUE=DATE:${icsDate(event.start, true)}` : `DTSTART:${icsDate(event.start, false)}`,
  ];
  if (event.end) {
    lines.push(
      allDay ? `DTEND;VALUE=DATE:${icsDate(event.end, true)}` : `DTEND:${icsDate(event.end, false)}`,
    );
  }
  lines.push(`SUMMARY:${icsEscape(event.title)}`);
  if (event.description) lines.push(`DESCRIPTION:${icsEscape(event.description)}`);
  if (event.location) lines.push(`LOCATION:${icsEscape(event.location)}`);
  lines.push("END:VEVENT");
  return lines.join("\r\n");
}

function downloadICS(events: CalendarEvent[], filename: string) {
  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Pathforge//Routine Calendar//EN",
    "CALSCALE:GREGORIAN",
    ...events.map((e, i) => eventToICS(e, `${e.id}-${i}@pathforge.tech`)),
    "END:VCALENDAR",
  ].join("\r\n");
  const blob = new Blob([body], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Parses a subset of RFC 5545 back out — the same fields `eventToICS` writes,
 * from any real calendar app's export, not just this one's own. No RRULE
 * support on the way in either: a recurring source event still imports as
 * however many individual VEVENTs it already expanded to, which is what
 * every calendar app's own export already does for a occurrence range.
 */
function parseICS(text: string): EventDraft[] {
  // RFC 5545 "unfolds" a line that starts with a space or tab into the
  // previous line — without this, a long DESCRIPTION wrapped across lines by
  // whatever wrote the file would parse as a second, bogus property.
  const unfolded = text.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
  const lines = unfolded.split(/\r\n|\n/);

  const drafts: EventDraft[] = [];
  let current: Record<string, string> | null = null;

  const parseValue = (key: string, raw: string): { date: Date; allDay: boolean } | string => {
    if (key === "DTSTART" || key === "DTEND") {
      const allDay = /^\d{8}$/.test(raw);
      if (allDay) {
        const y = Number(raw.slice(0, 4));
        const m = Number(raw.slice(4, 6)) - 1;
        const d = Number(raw.slice(6, 8));
        return { date: new Date(y, m, d), allDay: true };
      }
      const m = raw.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/);
      if (m) {
        const [, y, mo, d, h, mi, s] = m;
        const utc = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s));
        return { date: new Date(utc), allDay: false };
      }
      return { date: new Date(raw), allDay: false };
    }
    return raw.replace(/\\n/g, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");
  };

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      current = {};
      continue;
    }
    if (line === "END:VEVENT") {
      if (current?.SUMMARY && current?.DTSTART) {
        const startInfo = parseValue("DTSTART", current.DTSTART) as { date: Date; allDay: boolean };
        const endInfo = current.DTEND
          ? (parseValue("DTEND", current.DTEND) as { date: Date; allDay: boolean })
          : null;
        drafts.push({
          title: parseValue("SUMMARY", current.SUMMARY) as string,
          description: current.DESCRIPTION ? (parseValue("DESCRIPTION", current.DESCRIPTION) as string) : "",
          location: current.LOCATION ? (parseValue("LOCATION", current.LOCATION) as string) : "",
          category: "",
          start: startInfo.date,
          end: endInfo?.date ?? null,
          allDay: startInfo.allDay,
          recurrence: "none",
          recurrenceEnd: null,
          calendarId: null,
        });
      }
      current = null;
      continue;
    }
    if (!current) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    // Drop ;PARAM=... suffixes on the key (e.g. "DTSTART;VALUE=DATE") — the
    // value's own shape (8 vs 15 digits) already tells parseValue which it is.
    const key = line.slice(0, idx).split(";")[0];
    current[key] = line.slice(idx + 1);
  }

  return drafts;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
/** Row height in px, matching the hour cells' `h-14` (3.5rem). */
const HOUR_PX = 56;

const VIEW_OPTIONS: { value: EventManagerView; label: string; icon: typeof CalendarDays }[] = [
  { value: "year", label: "Year", icon: Grid3x3 },
  { value: "month", label: "Month", icon: CalendarDays },
  { value: "week", label: "Week", icon: CalendarRange },
  { value: "day", label: "Day", icon: Clock },
  { value: "list", label: "List", icon: List },
];

/** One key per view, matching Google Calendar's own bindings where one exists. */
const VIEW_SHORTCUTS: Record<string, EventManagerView> = {
  r: "year",
  m: "month",
  w: "week",
  d: "day",
  a: "list",
};

/** How far ahead the list view looks. A whole term of rows is unreadable. */
const LIST_DAYS = 60;

/**
 * A curated handful, not every IANA zone — this is "what time is it for the
 * other person," not a full zone picker. Values are real IANA identifiers so
 * `Intl.DateTimeFormat` resolves them without a lookup table of offsets that
 * would drift out of date across DST changes.
 */
const SECONDARY_TIMEZONES: { value: string; label: string }[] = [
  { value: "America/New_York", label: "US Eastern" },
  { value: "America/Chicago", label: "US Central" },
  { value: "America/Denver", label: "US Mountain" },
  { value: "America/Los_Angeles", label: "US Pacific" },
  { value: "UTC", label: "UTC" },
  { value: "Europe/London", label: "London" },
  { value: "Europe/Paris", label: "Paris" },
  { value: "Asia/Kolkata", label: "India" },
  { value: "Asia/Shanghai", label: "China" },
  { value: "Asia/Tokyo", label: "Japan" },
  { value: "Australia/Sydney", label: "Sydney" },
];

function draftFrom(event: CalendarEvent): EventDraft {
  return {
    title: event.title,
    description: event.description ?? "",
    location: event.location ?? "",
    category: event.editCategory ?? event.category ?? "",
    start: new Date(event.start),
    end: event.end ? new Date(event.end) : null,
    allDay: Boolean(event.allDay),
    recurrence: event.recurrence ?? "none",
    recurrenceEnd: event.recurrenceEnd ?? null,
    calendarId: event.calendarId ?? null,
  };
}

export function EventManager({
  events,
  colors,
  categories,
  createCategories,
  tags = [],
  tagFilterLabel = "Tags",
  calendars,
  defaultView = "month",
  view: viewProp,
  onViewChange,
  date: dateProp,
  onDateChange,
  className,
  saving = false,
  emptyState,
  detail,
  guestsSection,
  onCreate,
  onUpdate,
  onDelete,
  onMove,
  onResize,
}: EventManagerProps) {
  const [viewState, setViewState] = useState<EventManagerView>(viewProp ?? defaultView);
  const [cursorState, setCursorState] = useState<Date>(() => dateProp ?? new Date());
  const view = viewProp ?? viewState;
  const cursor = dateProp ?? cursorState;

  const setView = useCallback(
    (next: EventManagerView) => {
      setViewState(next);
      onViewChange?.(next);
    },
    [onViewChange],
  );

  const setCursor = (next: Date | ((prev: Date) => Date)) => {
    const value = typeof next === "function" ? next(cursor) : next;
    setCursorState(value);
    onDateChange?.(value);
  };

  const [query, setQuery] = useState("");
  const [colorFilter, setColorFilter] = useState<string[]>([]);
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [calendarFilter, setCalendarFilter] = useState<string[]>([]);
  const [navOpen, setNavOpen] = useState(false);
  const [secondaryTz, setSecondaryTz] = useState("");

  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [active, setActive] = useState<CalendarEvent | null>(null);
  const [draft, setDraft] = useState<EventDraft | null>(null);
  const [armed, setArmed] = useState(false);

  const dragged = useRef<CalendarEvent | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const importICS = async (file: File) => {
    const text = await file.text();
    const drafts = parseICS(text);
    // Sequential on purpose: each onCreate is a real network write, and
    // firing them all at once would be a burst of concurrent inserts for
    // what is, from the user's side, one "import this file" action.
    for (const draft of drafts) {
      await onCreate?.(draft);
    }
  };
  const [dragId, setDragId] = useState<string | null>(null);

  const colorOf = useCallback(
    (value: string): EventManagerColor =>
      colors.find((c) => c.value === value) ??
      colors[0] ?? { value, label: value, dot: "bg-slate-500", chip: "" },
    [colors],
  );
  const categoryLabel = useCallback(
    (value?: string) => categories.find((c) => c.value === value)?.label ?? value,
    [categories],
  );

  // ── Filtering ──────────────────────────────────────────────────────────

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter((e) => {
      if (q) {
        const hay = [e.title, e.description, e.location, categoryLabel(e.category), e.kindLabel]
          .concat(e.tags ?? [])
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (colorFilter.length && !colorFilter.includes(e.color)) return false;
      if (categoryFilter.length && !(e.category && categoryFilter.includes(e.category))) {
        return false;
      }
      if (tagFilter.length && !(e.tags ?? []).some((t) => tagFilter.includes(t))) return false;
      // Only an item that actually declares a calendar can be filtered by
      // one — a task or a class has no calendar concept at all, so it stays
      // visible regardless of which calendars are toggled on.
      if (calendarFilter.length && e.calendarId && !calendarFilter.includes(e.calendarId)) {
        return false;
      }
      return true;
    });
  }, [events, query, colorFilter, categoryFilter, tagFilter, calendarFilter, categoryLabel]);

  const activeFilters =
    colorFilter.length + tagFilter.length + categoryFilter.length + calendarFilter.length;
  const narrowed = activeFilters > 0 || query.trim().length > 0;

  const clearFilters = () => {
    setColorFilter([]);
    setTagFilter([]);
    setCategoryFilter([]);
    setCalendarFilter([]);
    setQuery("");
  };

  // ── Navigation ─────────────────────────────────────────────────────────

  const step = (direction: -1 | 1) =>
    setCursor((prev) => {
      const next = new Date(prev);
      if (view === "week") next.setDate(next.getDate() + direction * 7);
      else if (view === "day") next.setDate(next.getDate() + direction);
      else if (view === "list") next.setDate(next.getDate() + direction * LIST_DAYS);
      else if (view === "year") next.setFullYear(next.getFullYear() + direction);
      else next.setMonth(next.getMonth() + direction);
      return next;
    });

  const periodLabel = useMemo(() => {
    if (view === "week") {
      const s = startOfWeek(cursor);
      const e = addDays(s, 6);
      const sameMonth = s.getMonth() === e.getMonth();
      return `${s.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })} – ${e.toLocaleDateString(
        undefined,
        sameMonth
          ? { day: "numeric", year: "numeric" }
          : { month: "short", day: "numeric", year: "numeric" },
      )}`;
    }
    if (view === "day") {
      return cursor.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      });
    }
    if (view === "list") {
      const e = addDays(startOfDay(cursor), LIST_DAYS - 1);
      return `${cursor.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })} – ${e.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
    }
    if (view === "year") return String(cursor.getFullYear());
    return cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }, [view, cursor]);

  // ── The dialog ─────────────────────────────────────────────────────────

  const openCreate = useCallback(
    (day?: Date, hour?: number, endHour?: number) => {
      const start = day ? new Date(day) : new Date();
      start.setHours(hour ?? (day ? 9 : start.getHours()), 0, 0, 0);
      const end =
        endHour !== undefined
          ? new Date(start.getFullYear(), start.getMonth(), start.getDate(), endHour)
          : new Date(start.getTime() + 3_600_000);
      setActive(null);
      setCreating(true);
      setArmed(false);
      setDraft({
        title: "",
        description: "",
        location: "",
        category: (createCategories ?? categories)[0]?.value ?? "",
        start,
        end,
        allDay: false,
        recurrence: "none",
        recurrenceEnd: null,
        calendarId: calendars?.[0]?.value ?? null,
      });
      setOpen(true);
    },
    [categories, createCategories, calendars],
  );

  // ── Keyboard shortcuts ─────────────────────────────────────────────────
  // Google Calendar's own bindings, so far as this component has a counterpart
  // for them: t = today, arrows = previous/next period, r/m/w/d/a switch view,
  // c/n opens a new event. Disabled while the dialog is open (its own inputs
  // need every keystroke) or while focus is in any text field, and ignored
  // with a modifier held so browser/OS shortcuts (Ctrl+F, Cmd+R, …) pass through.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (open || navOpen) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;

      const key = e.key.toLowerCase();
      if (key === "t") {
        e.preventDefault();
        setCursor(new Date());
      } else if (key === "arrowleft") {
        e.preventDefault();
        step(-1);
      } else if (key === "arrowright") {
        e.preventDefault();
        step(1);
      } else if (key in VIEW_SHORTCUTS) {
        e.preventDefault();
        setView(VIEW_SHORTCUTS[key]);
      } else if ((key === "c" || key === "n") && onCreate) {
        e.preventDefault();
        openCreate();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, navOpen, view, onCreate, openCreate]);

  const openEvent = useCallback((event: CalendarEvent) => {
    setActive(event);
    setCreating(false);
    setArmed(false);
    setDraft(draftFrom(event));
    setOpen(true);
  }, []);

  const closeDialog = () => {
    setOpen(false);
    setDraft(null);
    setActive(null);
    setCreating(false);
    setArmed(false);
  };

  const submit = async () => {
    if (!draft || !draft.title.trim()) return;
    if (creating) await onCreate?.(draft);
    else if (active) await onUpdate?.(active.id, draft);
    closeDialog();
  };

  /** Two taps, because a delete here has no undo. */
  const destroy = async () => {
    if (!active) return;
    if (!armed) {
      setArmed(true);
      return;
    }
    await onDelete?.(active.id);
    closeDialog();
  };

  // ── Drag to reschedule ─────────────────────────────────────────────────

  const startDrag = useCallback((event: CalendarEvent) => {
    dragged.current = event;
    setDragId(event.id);
  }, []);

  const endDrag = useCallback(() => {
    dragged.current = null;
    setDragId(null);
  }, []);

  const drop = (day: Date, hour?: number) => {
    const event = dragged.current;
    endDrag();
    if (!event || !onMove) return;
    const next = startOfDay(day);
    if (hour === undefined) {
      next.setHours(event.start.getHours(), event.start.getMinutes(), 0, 0);
    } else {
      next.setHours(hour, 0, 0, 0);
    }
    if (next.getTime() === event.start.getTime()) return;
    void onMove(event, next, hour !== undefined);
  };

  const cardProps = useCallback(
    (event: CalendarEvent): CardProps => ({
      event,
      color: colorOf(event.color),
      dimmed: dragId === event.id,
      onOpen: openEvent,
      onDragStart: startDrag,
      onDragEnd: endDrag,
    }),
    [colorOf, dragId, openEvent, startDrag, endDrag],
  );

  const body = (() => {
    if (!events.length && emptyState) return <>{emptyState}</>;
    if (view === "year") {
      return (
        <YearView
          cursor={cursor}
          events={visible}
          onPickMonth={(d) => {
            setCursor(d);
            setView("month");
          }}
          onPickDay={(d) => {
            setCursor(d);
            setView("day");
          }}
        />
      );
    }
    if (view === "month") {
      return (
        <MonthView
          cursor={cursor}
          events={visible}
          cardProps={cardProps}
          onDrop={drop}
          onAdd={openCreate}
          canAdd={Boolean(onCreate)}
          onPickDay={(d) => {
            setCursor(d);
            setView("day");
          }}
        />
      );
    }
    if (view === "week" || view === "day") {
      return (
        <TimeGrid
          days={
            view === "week"
              ? Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(cursor), i))
              : [startOfDay(cursor)]
          }
          events={visible}
          cardProps={cardProps}
          onDrop={drop}
          onAdd={openCreate}
          onResize={onResize}
          secondaryTz={secondaryTz || undefined}
        />
      );
    }
    return <ListView from={startOfDay(cursor)} events={visible} cardProps={cardProps} />;
  })();

  return (
    <div className={cn("flex w-full flex-col gap-3", className)}>
      {/* Period, navigation, view switch, create */}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex shrink-0 items-center gap-1 rounded-xl border border-border bg-card p-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => step(-1)}
              aria-label="Previous"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs font-semibold"
              onClick={() => setCursor(new Date())}
            >
              Today
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => step(1)}
              aria-label="Next"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Popover open={navOpen} onOpenChange={setNavOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="truncate rounded-md font-display text-lg font-bold tracking-tight text-foreground transition-colors hover:text-primary sm:text-xl"
                title="Jump to a date"
              >
                {periodLabel}
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0">
              <MiniCalendar
                mode="single"
                selected={cursor}
                onSelect={(d) => {
                  if (!d) return;
                  setCursor(d);
                  setNavOpen(false);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="sm:hidden">
            <Select value={view} onValueChange={(v) => setView(v as EventManagerView)}>
              <SelectTrigger className="h-9 w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VIEW_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="hidden items-center gap-1 rounded-xl border border-border bg-card p-1 sm:flex">
            {VIEW_OPTIONS.map((o) => (
              <Button
                key={o.value}
                variant={view === o.value ? "secondary" : "ghost"}
                size="sm"
                className="h-8 gap-1.5 px-2.5 text-xs font-semibold"
                onClick={() => setView(o.value)}
              >
                <o.icon className="h-3.5 w-3.5" />
                {o.label}
              </Button>
            ))}
          </div>
          {(view === "week" || view === "day") && (
            <Select
              value={secondaryTz || "none"}
              onValueChange={(v) => setSecondaryTz(v === "none" ? "" : v)}
            >
              <SelectTrigger className="h-9 w-[150px] gap-1.5 text-xs">
                <Globe2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <SelectValue placeholder="Also show…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Just my time</SelectItem>
                {SECONDARY_TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {onCreate && (
            <Button size="sm" className="h-9 gap-1.5" onClick={() => openCreate()}>
              <Plus className="h-4 w-4" />
              New event
            </Button>
          )}
        </div>
      </div>

      {/* Search and facets */}
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search everything on this calendar…"
            className="h-9 pl-9"
          />
          {query && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
              onClick={() => setQuery("")}
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1 lg:mx-0 lg:overflow-visible lg:pb-0">
          <FacetMenu
            label="Type"
            options={categories}
            selected={categoryFilter}
            onChange={setCategoryFilter}
          />
          <FacetMenu
            label="Colour"
            options={colors.map((c) => ({ value: c.value, label: c.label }))}
            selected={colorFilter}
            onChange={setColorFilter}
            dotFor={(v) => colorOf(v).dot}
          />
          {tags.length > 0 && (
            <FacetMenu
              label={tagFilterLabel}
              options={tags.map((t) => ({ value: t, label: t }))}
              selected={tagFilter}
              onChange={setTagFilter}
            />
          )}
          {calendars && calendars.length > 0 && (
            <FacetMenu
              label="Calendars"
              options={calendars}
              selected={calendarFilter}
              onChange={setCalendarFilter}
            />
          )}
          {narrowed && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 shrink-0 gap-1.5 text-xs"
              onClick={clearFilters}
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </Button>
          )}
          {visible.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 shrink-0 gap-1.5 text-xs"
              onClick={() => downloadICS(visible, `calendar-${cursor.toISOString().slice(0, 10)}.ics`)}
              title="Download what's currently shown as a .ics file"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
          )}
          {onCreate && (
            <>
              <input
                ref={importInputRef}
                type="file"
                accept=".ics,text/calendar"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) void importICS(file);
                }}
              />
              <Button
                variant="outline"
                size="sm"
                className="h-9 shrink-0 gap-1.5 text-xs"
                onClick={() => importInputRef.current?.click()}
                title="Import events from a .ics file"
              >
                <Upload className="h-3.5 w-3.5" />
                Import
              </Button>
            </>
          )}
        </div>
      </div>

      {activeFilters > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {categoryFilter.map((v) => (
            <FilterChip
              key={`type-${v}`}
              label={categoryLabel(v) ?? v}
              onRemove={() => setCategoryFilter((p) => p.filter((x) => x !== v))}
            />
          ))}
          {colorFilter.map((v) => (
            <FilterChip
              key={`colour-${v}`}
              label={colorOf(v).label}
              dot={colorOf(v).dot}
              onRemove={() => setColorFilter((p) => p.filter((x) => x !== v))}
            />
          ))}
          {tagFilter.map((v) => (
            <FilterChip
              key={`tag-${v}`}
              label={v}
              onRemove={() => setTagFilter((p) => p.filter((x) => x !== v))}
            />
          ))}
          {calendarFilter.map((v) => (
            <FilterChip
              key={`calendar-${v}`}
              label={calendars?.find((c) => c.value === v)?.label ?? v}
              onRemove={() => setCalendarFilter((p) => p.filter((x) => x !== v))}
            />
          ))}
        </div>
      )}

      {body}

      {events.length > 0 && visible.length === 0 && (
        <p className="rounded-xl border border-dashed border-border bg-card/40 px-4 py-6 text-center text-sm text-muted-foreground">
          Nothing on this calendar matches those filters.
        </p>
      )}

      <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : closeDialog())}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {creating ? "New event" : active?.editable ? "Edit event" : (active?.title ?? "Details")}
            </DialogTitle>
            <DialogDescription>
              {creating
                ? "One-off things only. Anything that repeats weekly belongs in your timetable."
                : active?.editable
                  ? "Saves straight to the row this came from."
                  : `${active?.kindLabel ?? "This"} is edited where it lives, not here. You can still drag it to another day.`}
            </DialogDescription>
          </DialogHeader>

          {draft && (creating || active?.editable) ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="em-title">Title</Label>
                <Input
                  id="em-title"
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  placeholder="What is it?"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="em-description">Notes</Label>
                <Textarea
                  id="em-description"
                  rows={3}
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  placeholder="Optional"
                />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2">
                <Label htmlFor="em-allday" className="cursor-pointer text-sm font-medium">
                  All day
                </Label>
                <Switch
                  id="em-allday"
                  checked={draft.allDay}
                  onCheckedChange={(v) => setDraft({ ...draft, allDay: v })}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="em-start">Starts</Label>
                  <Input
                    id="em-start"
                    type={draft.allDay ? "date" : "datetime-local"}
                    value={
                      draft.allDay ? toLocalInput(draft.start).slice(0, 10) : toLocalInput(draft.start)
                    }
                    onChange={(e) => {
                      const next = fromLocalInput(
                        draft.allDay ? `${e.target.value}T00:00` : e.target.value,
                      );
                      if (next) setDraft({ ...draft, start: next });
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="em-end">Ends</Label>
                  <Input
                    id="em-end"
                    type={draft.allDay ? "date" : "datetime-local"}
                    value={
                      draft.end
                        ? draft.allDay
                          ? toLocalInput(draft.end).slice(0, 10)
                          : toLocalInput(draft.end)
                        : ""
                    }
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        end: fromLocalInput(
                          draft.allDay && e.target.value
                            ? `${e.target.value}T23:59`
                            : e.target.value,
                        ),
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="em-category">Type</Label>
                  <Select
                    value={draft.category}
                    onValueChange={(v) => setDraft({ ...draft, category: v })}
                  >
                    <SelectTrigger id="em-category">
                      <SelectValue placeholder="Pick one" />
                    </SelectTrigger>
                    <SelectContent>
                      {(createCategories ?? categories).map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="em-location">Where</Label>
                  <Input
                    id="em-location"
                    value={draft.location}
                    onChange={(e) => setDraft({ ...draft, location: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
              </div>

              {calendars && calendars.length > 0 && (
                <div className="space-y-1.5">
                  <Label htmlFor="em-calendar">Calendar</Label>
                  <Select
                    value={draft.calendarId ?? ""}
                    onValueChange={(v) => setDraft({ ...draft, calendarId: v })}
                  >
                    <SelectTrigger id="em-calendar">
                      <SelectValue placeholder="Pick one" />
                    </SelectTrigger>
                    <SelectContent>
                      {calendars.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="em-recurrence">Repeat</Label>
                  <Select
                    value={draft.recurrence}
                    onValueChange={(v) =>
                      setDraft({
                        ...draft,
                        recurrence: v,
                        recurrenceEnd: v === "none" ? null : draft.recurrenceEnd,
                      })
                    }
                  >
                    <SelectTrigger id="em-recurrence">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RECURRENCE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {draft.recurrence !== "none" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="em-recurrence-end">Until</Label>
                    <Input
                      id="em-recurrence-end"
                      type="date"
                      value={draft.recurrenceEnd ? toLocalInput(draft.recurrenceEnd).slice(0, 10) : ""}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          recurrenceEnd: e.target.value ? fromLocalInput(`${e.target.value}T23:59`) : null,
                        })
                      }
                      placeholder="Repeats forever"
                    />
                  </div>
                )}
              </div>
              {draft.recurrence !== "none" && (
                <p className="text-xs text-muted-foreground">
                  Changes here apply to every occurrence — there's no way to edit just one
                  date of a repeating event.
                </p>
              )}
              {!creating && active && guestsSection?.(active)}
            </div>
          ) : (
            active && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline" className={cn("gap-1.5", colorOf(active.color).chip)}>
                    <span className={cn("h-1.5 w-1.5 rounded-full", colorOf(active.color).dot)} />
                    {active.kindLabel ?? categoryLabel(active.category) ?? "Item"}
                  </Badge>
                  {(active.tags ?? []).map((t) => (
                    <Badge key={t} variant="secondary" className="text-[11px]">
                      {t}
                    </Badge>
                  ))}
                </div>
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {active.allDay
                    ? active.start.toLocaleDateString(undefined, {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      })
                    : `${active.start.toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })} · ${clock(active.start)}${active.end ? ` – ${clock(active.end)}` : ""}`}
                </p>
                {active.location && (
                  <p className="text-sm text-muted-foreground">{active.location}</p>
                )}
                {active.description && (
                  <p className="text-sm leading-relaxed text-foreground/90">{active.description}</p>
                )}
                {detail?.(active)}
              </div>
            )
          )}

          <DialogFooter className="gap-2 sm:justify-between">
            <div>
              {!creating && active?.editable && onDelete && (
                <Button variant={armed ? "destructive" : "outline"} size="sm" onClick={destroy}>
                  {armed ? "Tap again to delete" : "Delete"}
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={closeDialog}>
                Close
              </Button>
              {(creating || active?.editable) && (
                <Button size="sm" onClick={submit} disabled={saving || !draft?.title.trim()}>
                  {creating ? "Add event" : "Save"}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Pieces ───────────────────────────────────────────────────────────────

function FacetMenu({
  label,
  options,
  selected,
  onChange,
  dotFor,
}: {
  label: string;
  options: EventManagerOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  dotFor?: (value: string) => string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 shrink-0 gap-1.5 text-xs">
          <Filter className="h-3.5 w-3.5" />
          {label}
          {selected.length > 0 && (
            <Badge variant="secondary" className="ml-0.5 h-4 px-1.5 text-[10px]">
              {selected.length}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs">Filter by {label.toLowerCase()}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((o) => (
          <DropdownMenuCheckboxItem
            key={o.value}
            checked={selected.includes(o.value)}
            onCheckedChange={(checked) =>
              onChange(checked ? [...selected, o.value] : selected.filter((v) => v !== o.value))
            }
          >
            <span className="flex items-center gap-2">
              {dotFor && <span className={cn("h-2.5 w-2.5 rounded-full", dotFor(o.value))} />}
              {o.label}
            </span>
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FilterChip({
  label,
  dot,
  onRemove,
}: {
  label: string;
  dot?: string;
  onRemove: () => void;
}) {
  return (
    <Badge variant="secondary" className="gap-1.5 pr-1 text-[11px] font-medium">
      {dot && <span className={cn("h-2 w-2 rounded-full", dot)} />}
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="rounded-full p-0.5 text-muted-foreground transition-colors hover:text-foreground"
        aria-label={`Remove the ${label} filter`}
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
}

interface CardProps {
  event: CalendarEvent;
  color: EventManagerColor;
  dimmed: boolean;
  onOpen: (event: CalendarEvent) => void;
  onDragStart: (event: CalendarEvent) => void;
  onDragEnd: () => void;
}

/**
 * One event at one of three densities. Colour is paired with a rail, a badge
 * and the title's own weight rather than carrying the meaning alone, so a card
 * stays readable to someone who can't separate the hues.
 */
function EventCard({
  event,
  color,
  dimmed,
  onOpen,
  onDragStart,
  onDragEnd,
  variant = "compact",
  showTime = true,
}: CardProps & { variant?: "compact" | "row" | "block"; showTime?: boolean }) {
  const draggable = Boolean(event.draggable);
  const handlers = {
    draggable,
    onDragStart: (e: React.DragEvent) => {
      if (!draggable) {
        e.preventDefault();
        return;
      }
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", event.id);
      onDragStart(event);
    },
    onDragEnd,
    onClick: () => onOpen(event),
    title: event.title,
  };

  if (variant === "compact") {
    return (
      <button
        type="button"
        {...handlers}
        className={cn(
          "flex w-full items-center gap-1 rounded-md border border-l-2 px-1.5 py-0.5 text-left text-[11px] font-medium leading-tight transition-opacity",
          color.chip,
          draggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
          event.done && "opacity-55 line-through",
          event.overdue && !event.done && "ring-1 ring-rose-400/60",
          dimmed && "opacity-40",
        )}
      >
        {!event.allDay && showTime && (
          <span className="shrink-0 tabular-nums opacity-70">
            {event.start.toLocaleTimeString(undefined, { hour: "numeric" })}
          </span>
        )}
        <span className="truncate">{event.title}</span>
      </button>
    );
  }

  if (variant === "block") {
    return (
      <button
        type="button"
        {...handlers}
        className={cn(
          "flex h-full w-full flex-col gap-0.5 rounded-lg border border-l-4 px-2 py-1.5 text-left transition-opacity",
          color.chip,
          draggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
          event.done && "opacity-55",
          dimmed && "opacity-40",
        )}
      >
        <span className="truncate text-xs font-semibold leading-tight">{event.title}</span>
        {!event.allDay && (
          <span className="text-[10px] tabular-nums opacity-75">
            {clock(event.start)}
            {event.end ? ` – ${clock(event.end)}` : ""}
          </span>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      {...handlers}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border border-border bg-card px-3 py-2.5 text-left transition-colors hover:bg-accent/40",
        draggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
        dimmed && "opacity-40",
      )}
    >
      <span className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", color.dot)} />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "truncate text-sm font-semibold text-foreground",
              event.done && "text-muted-foreground line-through",
            )}
          >
            {event.title}
          </span>
          {event.kindLabel && (
            <Badge variant="outline" className="h-4 px-1.5 text-[10px] font-medium">
              {event.kindLabel}
            </Badge>
          )}
          {event.overdue && !event.done && (
            <Badge
              variant="outline"
              className="h-4 border-rose-400 px-1.5 text-[10px] text-rose-600 dark:text-rose-300"
            >
              Overdue
            </Badge>
          )}
          {!event.draggable && !event.editable && (
            <Lock className="h-3 w-3 text-muted-foreground" aria-label="Read-only here" />
          )}
        </span>
        {event.description && (
          <span className="mt-0.5 line-clamp-1 block text-xs text-muted-foreground">
            {event.description}
          </span>
        )}
      </span>
      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
        {event.allDay ? "All day" : clock(event.start)}
      </span>
    </button>
  );
}

/**
 * Twelve mini months. A day gets a dot when something lands on it, not the
 * event itself — a year is too coarse a grid to render actual cards on, so
 * this is a map of *where to look*, not a second copy of the month grid.
 */
function YearView({
  cursor,
  events,
  onPickMonth,
  onPickDay,
}: {
  cursor: Date;
  events: CalendarEvent[];
  onPickMonth: (day: Date) => void;
  onPickDay: (day: Date) => void;
}) {
  const year = cursor.getFullYear();
  const today = new Date();

  const eventDays = useMemo(() => {
    const set = new Set<string>();
    for (const e of events) set.add(startOfDay(e.start).toDateString());
    return set;
  }, [events]);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 12 }, (_, m) => {
        const first = new Date(year, m, 1);
        const grid = monthGrid(year, m);
        return (
          <div key={m} className="rounded-2xl border border-border bg-card p-3">
            <button
              type="button"
              onClick={() => onPickMonth(first)}
              className="mb-2 font-display text-sm font-bold text-foreground transition-colors hover:text-primary"
            >
              {first.toLocaleDateString(undefined, { month: "long" })}
            </button>
            <div className="grid grid-cols-7 gap-y-1">
              {WEEKDAYS.map((d) => (
                <span
                  key={d}
                  className="text-center text-[9px] font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {d.charAt(0)}
                </span>
              ))}
              {grid.map((day) => {
                const inMonth = day.getMonth() === m;
                const isToday = sameDay(day, today);
                const hasEvents = inMonth && eventDays.has(day.toDateString());
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => onPickDay(day)}
                    disabled={!inMonth}
                    aria-label={inMonth ? day.toDateString() : undefined}
                    className={cn(
                      "relative mx-auto flex h-6 w-6 items-center justify-center rounded-full text-[10px] tabular-nums transition-colors",
                      !inMonth && "invisible",
                      isToday
                        ? "bg-primary font-bold text-primary-foreground"
                        : "text-foreground hover:bg-accent",
                    )}
                  >
                    {day.getDate()}
                    {hasEvents && !isToday && (
                      <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-accent" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MonthView({
  cursor,
  events,
  cardProps,
  onDrop,
  onAdd,
  onPickDay,
  canAdd,
}: {
  cursor: Date;
  events: CalendarEvent[];
  cardProps: (event: CalendarEvent) => CardProps;
  onDrop: (day: Date, hour?: number) => void;
  onAdd: (day?: Date, hour?: number) => void;
  onPickDay: (day: Date) => void;
  canAdd: boolean;
}) {
  const days = useMemo(() => monthGrid(cursor.getFullYear(), cursor.getMonth()), [cursor]);
  const weeks = useMemo(() => chunk(days, 7), [days]);
  const { bars, lanesPerWeek } = useMemo(() => layoutMonthBars(weeks, events), [weeks, events]);
  const today = new Date();
  const [over, setOver] = useState<number | null>(null);

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-border bg-card">
      <div className="grid grid-cols-7 border-b border-border bg-muted/40">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="px-2 py-2 text-center font-display text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground"
          >
            <span className="hidden sm:inline">{d}</span>
            <span className="sm:hidden">{d.charAt(0)}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          // Multi-day events render as the spanning bars below, not as a
          // per-day chip — a trip or a school break is one continuous thing,
          // not the same chip repeated in every cell it touches.
          const dayEvents = events.filter((e) => !isMultiDay(e) && sameDay(e.start, day));
          const inMonth = day.getMonth() === cursor.getMonth();
          const isToday = sameDay(day, today);
          const weekIndex = Math.floor(i / 7);
          const laneCount = lanesPerWeek[weekIndex] ?? 0;
          return (
            <div
              key={day.toISOString()}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(i);
              }}
              onDragLeave={() => setOver((p) => (p === i ? null : p))}
              onDrop={() => {
                setOver(null);
                onDrop(day);
              }}
              onDoubleClick={() => canAdd && onAdd(day)}
              className={cn(
                "group/cell min-h-[6rem] border-b border-r border-border p-1.5 transition-colors sm:min-h-[7.5rem] lg:min-h-[8.5rem]",
                (i + 1) % 7 === 0 && "border-r-0",
                i >= 35 && "border-b-0",
                !inMonth && "bg-muted/30",
                over === i && "bg-accent/40 ring-1 ring-inset ring-accent",
              )}
            >
              <div className="mb-1 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onPickDay(day)}
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums transition-colors",
                    isToday
                      ? "bg-primary text-primary-foreground"
                      : inMonth
                        ? "text-foreground hover:bg-accent"
                        : "text-muted-foreground hover:bg-accent",
                  )}
                >
                  {day.getDate()}
                </button>
                {canAdd && (
                  <button
                    type="button"
                    onClick={() => onAdd(day)}
                    className="rounded-md p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus:opacity-100 group-hover/cell:opacity-100"
                    aria-label={`Add an event on ${day.toDateString()}`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div
                className="space-y-1"
                style={laneCount > 0 ? { marginTop: laneCount * MONTH_BAR_H } : undefined}
              >
                {dayEvents.slice(0, 4).map((e) => (
                  <EventCard key={e.id} {...cardProps(e)} variant="compact" />
                ))}
                {dayEvents.length > 4 && (
                  <button
                    type="button"
                    onClick={() => onPickDay(day)}
                    className="px-1 text-[10px] font-medium text-muted-foreground hover:text-foreground"
                  >
                    +{dayEvents.length - 4} more
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/*
         * Multi-day bars, placed into the very same 7-column grid as the day
         * cells above rather than absolutely positioned over them — an
         * explicit `gridRowStart`/`gridColumnStart`/`gridColumnEnd` lands a
         * bar in exactly the week row and day-column span it covers and lets
         * it overlap those cells on purpose, which is what turns "the same
         * event repeated in five cells" into one continuous rectangle drawn
         * once across five columns. `marginTop` clears the day-number row and
         * stacks by lane; the day cells' own chip lists are pushed down by
         * `laneCount` above so nothing underneath collides with a bar.
         */}
        {bars.map(({ event, weekIndex, colStart, colEnd, lane }) => (
          <div
            key={`bar-${event.id}-${weekIndex}`}
            style={{
              gridColumnStart: colStart,
              gridColumnEnd: colEnd,
              gridRowStart: weekIndex + 1,
              marginTop: MONTH_BAR_HEADER_H + lane * MONTH_BAR_H,
              height: MONTH_BAR_H,
            }}
            className="relative z-[1] mx-0.5 self-start overflow-hidden"
          >
            <EventCard {...cardProps(event)} variant="compact" showTime={false} />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Bar height, and the day-number row's rendered height from a cell's top
 * border edge: `p-1.5` padding (6px) + the h-6 day button (24px) + its mb-1
 * bottom margin (4px). Month view's spanning bars are placed by margin
 * against these two numbers rather than measured off the DOM.
 */
const MONTH_BAR_H = 20;
const MONTH_BAR_HEADER_H = 34;

function dedupeByContent(events: CalendarEvent[]): CalendarEvent[] {
  const seen = new Map<string, CalendarEvent>();
  for (const e of events) {
    const key = `${e.title}|${e.start.getTime()}|${e.end?.getTime() ?? ""}`;
    if (!seen.has(key)) seen.set(key, e);
  }
  return [...seen.values()];
}

function isMultiDay(event: CalendarEvent): boolean {
  return Boolean(event.end) && startOfDay(event.end!).getTime() > startOfDay(event.start).getTime();
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

interface MonthBar {
  event: CalendarEvent;
  weekIndex: number;
  /** 1-indexed CSS grid line, inclusive. */
  colStart: number;
  /** 1-indexed CSS grid line, exclusive. */
  colEnd: number;
  lane: number;
}

/**
 * Clips every multi-day event to each week row it crosses and packs the
 * pieces into as few stacked lanes as that week's busiest day needs — the
 * same clustering idea `layoutDayColumn` uses for Week/Day, just walking
 * whole days instead of minutes.
 */
function layoutMonthBars(
  weeks: Date[][],
  events: CalendarEvent[],
): { bars: MonthBar[]; lanesPerWeek: number[] } {
  // A caller that builds one CalendarEvent per *day* an underlying event
  // spans (Routine's own Calendar page does exactly this, so the id stays
  // unique per occurrence) hands this function several distinct-looking
  // events that are really the same trip — same title, same start, same end,
  // different id. Laying each of those out as its own bar would stack the
  // same trip into several redundant lanes, so multi-day events are
  // deduplicated by their content before packing, not by id.
  const multiDay = dedupeByContent(events.filter(isMultiDay));
  const bars: MonthBar[] = [];
  const lanesPerWeek: number[] = [];

  weeks.forEach((week, weekIndex) => {
    const weekStart = week[0].getTime();
    const weekEnd = week[6].getTime();

    const spans = multiDay
      .map((event) => {
        const start = startOfDay(event.start).getTime();
        const end = startOfDay(event.end!).getTime();
        return { event, start, end };
      })
      .filter((s) => s.end >= weekStart && s.start <= weekEnd)
      .map((s) => {
        const clippedStart = Math.max(s.start, weekStart);
        const clippedEnd = Math.min(s.end, weekEnd);
        return {
          event: s.event,
          colStart: Math.round((clippedStart - weekStart) / DAY_MS) + 1,
          colEnd: Math.round((clippedEnd - weekStart) / DAY_MS) + 2,
        };
      })
      .sort((a, b) => a.colStart - b.colStart || b.colEnd - a.colEnd);

    const laneEnds: number[] = [];
    for (const span of spans) {
      let lane = laneEnds.findIndex((end) => end <= span.colStart);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(span.colEnd);
      } else {
        laneEnds[lane] = span.colEnd;
      }
      bars.push({ event: span.event, weekIndex, colStart: span.colStart, colEnd: span.colEnd, lane });
    }
    lanesPerWeek.push(laneEnds.length);
  });

  return { bars, lanesPerWeek };
}

/** Week and Day are the same grid with a different number of columns. */
function TimeGrid({
  days,
  events,
  cardProps,
  onDrop,
  onAdd,
  onResize,
  secondaryTz,
}: {
  days: Date[];
  events: CalendarEvent[];
  cardProps: (event: CalendarEvent) => CardProps;
  onDrop: (day: Date, hour?: number) => void;
  onAdd: (day?: Date, hour?: number, endHour?: number) => void;
  /** IANA zone, e.g. "Europe/London" — shown as a second time under each hour. */
  secondaryTz?: string;
  onResize?: (event: CalendarEvent, end: Date) => void | Promise<void>;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const today = new Date();
  const [over, setOver] = useState<string | null>(null);
  const columns = `${secondaryTz ? "4.5rem" : "3.5rem"} repeat(${days.length}, minmax(0, 1fr))`;

  const secondaryFormatter = useMemo(
    () =>
      secondaryTz
        ? new Intl.DateTimeFormat(undefined, {
            timeZone: secondaryTz,
            hour: "numeric",
            minute: "2-digit",
          })
        : null,
    [secondaryTz],
  );

  // Open on the working day rather than at midnight.
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = 7 * HOUR_PX;
  }, [days.length]);

  // The live "now" line, Google Calendar's own signature. Ticks every minute
  // rather than once per mount so a day left open drifts back into sync
  // instead of freezing at whatever time the grid first rendered.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  const nowColumn = days.findIndex((d) => sameDay(d, now));
  const nowTopPx = ((now.getHours() * 60 + now.getMinutes()) / 60) * HOUR_PX;

  const allDay = events.filter((e) => e.allDay && days.some((d) => sameDay(e.start, d)));

  // ── Click-drag to create ──────────────────────────────────────────────
  // A plain click (mouse down, up, no drag) is a one-hour selection — anchor
  // and hover land on the same cell — which is what makes a single click on
  // an empty slot open the create dialog the same way a click in Google
  // Calendar's own week/day view does, with no separate double-click path.
  const [drag, setDrag] = useState<{ day: Date; anchorHour: number; hoverHour: number } | null>(
    null,
  );

  useEffect(() => {
    if (!drag) return;
    const finish = () => {
      const start = Math.min(drag.anchorHour, drag.hoverHour);
      const end = Math.max(drag.anchorHour, drag.hoverHour) + 1;
      setDrag(null);
      onAdd(drag.day, start, end);
    };
    window.addEventListener("mouseup", finish, { once: true });
    return () => window.removeEventListener("mouseup", finish);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag]);

  // ── Drag the bottom edge to resize ────────────────────────────────────
  const [resize, setResize] = useState<{
    event: CalendarEvent;
    startY: number;
    baseMinutes: number;
    deltaPx: number;
  } | null>(null);

  useEffect(() => {
    if (!resize) return;
    const onMouseMove = (e: MouseEvent) => {
      setResize((p) => (p ? { ...p, deltaPx: e.clientY - p.startY } : p));
    };
    const onMouseUp = () => {
      setResize((p) => {
        if (p) {
          const deltaMinutes = Math.round((p.deltaPx / HOUR_PX) * 60 / 15) * 15;
          const durationMinutes = Math.max(15, p.baseMinutes + deltaMinutes);
          const end = new Date(p.event.start.getTime() + durationMinutes * 60_000);
          void onResize?.(p.event, end);
        }
        return null;
      });
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp, { once: true });
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(resize)]);

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-border bg-card">
      <div
        className="grid border-b border-border bg-muted/40"
        style={{ gridTemplateColumns: columns }}
      >
        <div className="px-2 py-2 text-center font-display text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          Time
        </div>
        {days.map((d) => (
          <div key={d.toISOString()} className="border-l border-border px-2 py-1.5 text-center">
            <p className="font-display text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              {d.toLocaleDateString(undefined, { weekday: "short" })}
            </p>
            <p
              className={cn(
                "mx-auto mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold tabular-nums",
                sameDay(d, today) ? "bg-primary text-primary-foreground" : "text-foreground",
              )}
            >
              {d.getDate()}
            </p>
          </div>
        ))}
      </div>

      {allDay.length > 0 && (
        <div
          className="grid border-b border-border bg-background/40"
          style={{ gridTemplateColumns: columns }}
        >
          <div className="px-2 py-2 text-right text-[10px] font-medium text-muted-foreground">
            All day
          </div>
          {days.map((d) => (
            <div key={d.toISOString()} className="space-y-1 border-l border-border p-1">
              {allDay
                .filter((e) => sameDay(e.start, d))
                .map((e) => (
                  <EventCard key={e.id} {...cardProps(e)} variant="compact" />
                ))}
            </div>
          ))}
        </div>
      )}

      <div ref={scroller} className="max-h-[60vh] overflow-y-auto">
        <div className="relative grid" style={{ gridTemplateColumns: columns }}>
          {nowColumn !== -1 && (
            <div
              className="pointer-events-none absolute inset-x-0 z-10 grid"
              style={{ top: nowTopPx, gridTemplateColumns: columns }}
            >
              <div />
              {days.map((d, i) => (
                <div key={d.toISOString()} className="relative">
                  {i === nowColumn && (
                    <div className="absolute inset-x-0 top-0 flex -translate-y-1/2 items-center">
                      <span className="-ml-1 h-2 w-2 shrink-0 rounded-full bg-rose-500" />
                      <span className="h-px flex-1 bg-rose-500" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {HOURS.map((hour) => (
            <div key={hour} className="contents">
              <div className="border-b border-border px-1 py-1 text-right text-[10px] tabular-nums text-muted-foreground">
                <div>{String(hour).padStart(2, "0")}:00</div>
                {secondaryFormatter && (
                  <div className="text-muted-foreground/60">
                    {secondaryFormatter.format(
                      new Date(
                        days[0].getFullYear(),
                        days[0].getMonth(),
                        days[0].getDate(),
                        hour,
                      ),
                    )}
                  </div>
                )}
              </div>
              {days.map((d) => {
                const cellKey = `${d.toISOString()}-${hour}`;
                return (
                  <div
                    key={cellKey}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setOver(cellKey);
                    }}
                    onDragLeave={() => setOver((p) => (p === cellKey ? null : p))}
                    onDrop={() => {
                      setOver(null);
                      onDrop(d, hour);
                    }}
                    onMouseDown={() => setDrag({ day: d, anchorHour: hour, hoverHour: hour })}
                    onMouseEnter={() =>
                      setDrag((p) => (p && sameDay(p.day, d) ? { ...p, hoverHour: hour } : p))
                    }
                    className={cn(
                      "h-14 select-none border-b border-l border-border transition-colors",
                      over === cellKey && "bg-accent/40 ring-1 ring-inset ring-accent",
                    )}
                  />
                );
              })}
            </div>
          ))}

          {/*
           * Timed events, drawn to scale over the hour grid instead of
           * bucketed into whichever cell their start hour falls in: a block's
           * top and height come straight from its start and duration, and
           * events that overlap the same stretch of a day split into side-by-
           * side columns — the shape Google Calendar's own week/day view uses,
           * rather than a stack of same-size chips inside one hour's cell.
           */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 grid"
            style={{ gridTemplateColumns: columns, height: HOURS.length * HOUR_PX }}
          >
            <div />
            {days.map((d) => (
              <div key={d.toISOString()} className="relative">
                {layoutDayColumn(events.filter((e) => !e.allDay && sameDay(e.start, d))).map(
                  ({ event, top, height, col, cols }) => {
                    const resizable = Boolean(
                      onResize && event.editable && event.end && !event.recurrence,
                    );
                    const isResizing = resize?.event.id === event.id;
                    const liveHeight = isResizing
                      ? Math.max(HOUR_PX / 4, height + resize!.deltaPx)
                      : height;
                    return (
                      <div
                        key={event.id}
                        className="group/block pointer-events-auto absolute px-0.5"
                        style={{
                          top,
                          height: liveHeight,
                          left: `${(col / cols) * 100}%`,
                          width: `${(1 / cols) * 100}%`,
                          zIndex: isResizing ? 20 : undefined,
                        }}
                      >
                        <div className="h-full overflow-hidden">
                          <EventCard {...cardProps(event)} variant="block" />
                        </div>
                        {resizable && (
                          <div
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              const baseMinutes = event.end
                                ? Math.max(
                                    15,
                                    (event.end.getTime() - event.start.getTime()) / 60_000,
                                  )
                                : 60;
                              setResize({ event, startY: e.clientY, baseMinutes, deltaPx: 0 });
                            }}
                            className="absolute inset-x-0 -bottom-1 h-2 cursor-ns-resize opacity-0 group-hover/block:opacity-100"
                            title="Drag to change duration"
                          />
                        )}
                      </div>
                    );
                  },
                )}
              </div>
            ))}
          </div>

          {drag && (
            <div
              className="pointer-events-none absolute inset-x-0 top-0 grid"
              style={{ gridTemplateColumns: columns, height: HOURS.length * HOUR_PX }}
            >
              <div />
              {days.map((d) => (
                <div key={d.toISOString()} className="relative">
                  {sameDay(d, drag.day) && (
                    <div
                      className="absolute inset-x-0 rounded-md border border-primary/50 bg-primary/15"
                      style={{
                        top: Math.min(drag.anchorHour, drag.hoverHour) * HOUR_PX,
                        height: (Math.abs(drag.hoverHour - drag.anchorHour) + 1) * HOUR_PX,
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Lays one day's timed events out to scale: top/height from start and
 * duration, and overlapping events split into as few side-by-side columns as
 * the busiest moment in the cluster needs. Events are grouped into clusters
 * first — a 9am event and a 2pm event never share columns just because a
 * third event happens to bridge both — then each cluster gets its own greedy
 * column assignment, which is what a calendar's overlap layout is for: making
 * concurrent events readable, not perfectly repacking every gap.
 */
function layoutDayColumn(
  dayEvents: CalendarEvent[],
): { event: CalendarEvent; top: number; height: number; col: number; cols: number }[] {
  const MIN_MINUTES = 20;

  const items = dayEvents
    .map((event) => {
      const startMin = event.start.getHours() * 60 + event.start.getMinutes();
      const rawEndMin = event.end
        ? sameDay(event.end, event.start)
          ? event.end.getHours() * 60 + event.end.getMinutes()
          : 24 * 60
        : startMin + 60;
      return { event, startMin, endMin: Math.max(startMin + MIN_MINUTES, rawEndMin) };
    })
    .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

  const results: { event: CalendarEvent; top: number; height: number; col: number; cols: number }[] =
    [];

  let cluster: typeof items = [];
  let clusterEnd = -1;

  const flushCluster = () => {
    if (!cluster.length) return;
    const columnEnds: number[] = [];
    const placed = cluster.map((it) => {
      let col = columnEnds.findIndex((end) => end <= it.startMin);
      if (col === -1) {
        col = columnEnds.length;
        columnEnds.push(it.endMin);
      } else {
        columnEnds[col] = it.endMin;
      }
      return { ...it, col };
    });
    const cols = columnEnds.length;
    for (const it of placed) {
      results.push({
        event: it.event,
        top: (it.startMin / 60) * HOUR_PX,
        height: ((it.endMin - it.startMin) / 60) * HOUR_PX,
        col: it.col,
        cols,
      });
    }
    cluster = [];
    clusterEnd = -1;
  };

  for (const it of items) {
    if (cluster.length && it.startMin >= clusterEnd) flushCluster();
    cluster.push(it);
    clusterEnd = Math.max(clusterEnd, it.endMin);
  }
  flushCluster();

  return results;
}

function ListView({
  from,
  events,
  cardProps,
}: {
  from: Date;
  events: CalendarEvent[];
  cardProps: (event: CalendarEvent) => CardProps;
}) {
  const until = from.getTime() + LIST_DAYS * DAY_MS;
  const groups = useMemo(() => {
    const map = new Map<number, CalendarEvent[]>();
    for (const e of events) {
      const t = startOfDay(e.start).getTime();
      if (t < from.getTime() || t >= until) continue;
      const list = map.get(t);
      if (list) list.push(e);
      else map.set(t, [e]);
    }
    return [...map.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([t, list]) => ({
        day: new Date(t),
        items: [...list].sort((a, b) => a.start.getTime() - b.start.getTime()),
      }));
  }, [events, from, until]);

  if (!groups.length) {
    return (
      <p className="rounded-2xl border border-dashed border-border bg-card/40 px-4 py-10 text-center text-sm text-muted-foreground">
        Nothing scheduled in this stretch.
      </p>
    );
  }

  const today = new Date();

  return (
    <div className="w-full space-y-5 rounded-2xl border border-border bg-card p-3 sm:p-4">
      {groups.map(({ day, items }) => (
        <section key={day.toISOString()} className="space-y-2">
          <header className="flex items-baseline gap-2">
            <h3 className="font-display text-xs font-bold uppercase tracking-[0.12em] text-foreground">
              {sameDay(day, today)
                ? "Today"
                : day.toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
            </h3>
            <span className="text-[11px] text-muted-foreground">
              {items.length} {items.length === 1 ? "item" : "items"}
            </span>
          </header>
          <div className="space-y-1.5">
            {items.map((e) => (
              <EventCard key={e.id} {...cardProps(e)} variant="row" />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
