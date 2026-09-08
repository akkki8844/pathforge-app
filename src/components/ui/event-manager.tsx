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
  Filter,
  List,
  Lock,
  Plus,
  Search,
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

export type EventManagerView = "month" | "week" | "day" | "list";

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
}

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
  onCreate?: (draft: EventDraft) => void | Promise<void>;
  onUpdate?: (id: string, draft: EventDraft) => void | Promise<void>;
  onDelete?: (id: string) => void | Promise<void>;
  /**
   * A card was dropped on a new slot. `start` is the new start instant, and
   * `hourSet` says whether the drop chose a time of day (week and day grids)
   * or only a date (month grid), so the caller can keep the original clock.
   */
  onMove?: (event: CalendarEvent, start: Date, hourSet: boolean) => void | Promise<void>;
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

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const VIEW_OPTIONS: { value: EventManagerView; label: string; icon: typeof CalendarDays }[] = [
  { value: "month", label: "Month", icon: CalendarDays },
  { value: "week", label: "Week", icon: CalendarRange },
  { value: "day", label: "Day", icon: Clock },
  { value: "list", label: "List", icon: List },
];

/** How far ahead the list view looks. A whole term of rows is unreadable. */
const LIST_DAYS = 60;

function draftFrom(event: CalendarEvent): EventDraft {
  return {
    title: event.title,
    description: event.description ?? "",
    location: event.location ?? "",
    category: event.editCategory ?? event.category ?? "",
    start: new Date(event.start),
    end: event.end ? new Date(event.end) : null,
    allDay: Boolean(event.allDay),
  };
}

export function EventManager({
  events,
  colors,
  categories,
  createCategories,
  tags = [],
  tagFilterLabel = "Tags",
  defaultView = "month",
  view: viewProp,
  onViewChange,
  date: dateProp,
  onDateChange,
  className,
  saving = false,
  emptyState,
  detail,
  onCreate,
  onUpdate,
  onDelete,
  onMove,
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

  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [active, setActive] = useState<CalendarEvent | null>(null);
  const [draft, setDraft] = useState<EventDraft | null>(null);
  const [armed, setArmed] = useState(false);

  const dragged = useRef<CalendarEvent | null>(null);
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
      return true;
    });
  }, [events, query, colorFilter, categoryFilter, tagFilter, categoryLabel]);

  const activeFilters = colorFilter.length + tagFilter.length + categoryFilter.length;
  const narrowed = activeFilters > 0 || query.trim().length > 0;

  const clearFilters = () => {
    setColorFilter([]);
    setTagFilter([]);
    setCategoryFilter([]);
    setQuery("");
  };

  // ── Navigation ─────────────────────────────────────────────────────────

  const step = (direction: -1 | 1) =>
    setCursor((prev) => {
      const next = new Date(prev);
      if (view === "week") next.setDate(next.getDate() + direction * 7);
      else if (view === "day") next.setDate(next.getDate() + direction);
      else if (view === "list") next.setDate(next.getDate() + direction * LIST_DAYS);
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
    return cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }, [view, cursor]);

  // ── The dialog ─────────────────────────────────────────────────────────

  const openCreate = useCallback(
    (day?: Date, hour?: number) => {
      const start = day ? new Date(day) : new Date();
      start.setHours(hour ?? (day ? 9 : start.getHours()), 0, 0, 0);
      setActive(null);
      setCreating(true);
      setArmed(false);
      setDraft({
        title: "",
        description: "",
        location: "",
        category: (createCategories ?? categories)[0]?.value ?? "",
        start,
        end: new Date(start.getTime() + 3_600_000),
        allDay: false,
      });
      setOpen(true);
    },
    [categories, createCategories],
  );

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
          <h2 className="truncate font-display text-lg font-bold tracking-tight text-foreground sm:text-xl">
            {periodLabel}
          </h2>
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
}: CardProps & { variant?: "compact" | "row" | "block" }) {
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
        {!event.allDay && (
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
          "flex w-full flex-col gap-0.5 rounded-lg border border-l-4 px-2 py-1.5 text-left transition-opacity",
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
          const dayEvents = events.filter((e) => sameDay(e.start, day));
          const inMonth = day.getMonth() === cursor.getMonth();
          const isToday = sameDay(day, today);
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
              <div className="space-y-1">
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
      </div>
    </div>
  );
}

/** Week and Day are the same grid with a different number of columns. */
function TimeGrid({
  days,
  events,
  cardProps,
  onDrop,
  onAdd,
}: {
  days: Date[];
  events: CalendarEvent[];
  cardProps: (event: CalendarEvent) => CardProps;
  onDrop: (day: Date, hour?: number) => void;
  onAdd: (day?: Date, hour?: number) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const today = new Date();
  const [over, setOver] = useState<string | null>(null);
  const columns = `3.5rem repeat(${days.length}, minmax(0, 1fr))`;

  // Open on the working day rather than at midnight.
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = 7 * 56;
  }, [days.length]);

  const allDay = events.filter((e) => e.allDay && days.some((d) => sameDay(e.start, d)));

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
        <div className="grid" style={{ gridTemplateColumns: columns }}>
          {HOURS.map((hour) => (
            <div key={hour} className="contents">
              <div className="border-b border-border px-1 py-1 text-right text-[10px] tabular-nums text-muted-foreground">
                {String(hour).padStart(2, "0")}:00
              </div>
              {days.map((d) => {
                const cellKey = `${d.toISOString()}-${hour}`;
                const cellEvents = events.filter(
                  (e) => !e.allDay && sameDay(e.start, d) && e.start.getHours() === hour,
                );
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
                    onDoubleClick={() => onAdd(d, hour)}
                    className={cn(
                      "min-h-[3.5rem] space-y-1 border-b border-l border-border p-1 transition-colors",
                      over === cellKey && "bg-accent/40 ring-1 ring-inset ring-accent",
                    )}
                  >
                    {cellEvents.map((e) => (
                      <EventCard key={e.id} {...cardProps(e)} variant="block" />
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
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
