import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Check, Pencil, Plus, Settings2, Trash2, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { RoutineShell } from "@/components/routine/RoutineShell";
import { RoutineAsync, RoutineEmptyState } from "@/components/routine/RoutineStates";
import {
  EventManager,
  type CalendarEvent,
  type EventDraft,
  type EventManagerColor,
  type EventManagerOption,
  type EventManagerView,
} from "@/components/ui/event-manager";
import { useEventGuests, useInvitedEvents, useRoutineSources } from "@/hooks/routine/useRoutineData";
import { buildAgenda } from "@/lib/routine/derive";
import { KIND_LABEL, swatch } from "@/lib/routine/colors";
import {
  addDays,
  dateKey,
  minutesToTime,
  monthGrid,
  startOfDay,
  startOfWeek,
} from "@/lib/routine/dates";
import {
  ROUTINE_COLORS,
  type AgendaItem,
  type AgendaKind,
  type EventCategory,
  type EventRecurrence,
  type NewRoutineEvent,
  type RoutineColor,
} from "@/lib/routine/types";

/**
 * Every scheduled thing, in one grid.
 *
 * The page owns no calendar logic and no event list of its own: `buildAgenda()`
 * projects classes, study blocks, tasks, reminders, events, habits and goal
 * deadlines into one shape, and `EventManager` renders that shape. So the
 * calendar cannot disagree with Today about what is happening on a Tuesday —
 * they are the same projection over the same rows.
 *
 * What can be changed from here is deliberately narrower than what is shown,
 * because the sources are not equally moveable:
 *
 *   * Create, edit and delete write to `routine_events` — the one table whose
 *     rows *are* calendar entries. A task's real editor is Today; a class's is
 *     the timetable. Retyping those forms here would be a second place to get
 *     them wrong.
 *   * Drag-to-reschedule writes to whichever table owns the dragged row:
 *     `routine_events.starts_at`, `routine_tasks.due_at`,
 *     `routine_study_blocks.scheduled_date/start`, `routine_reminders.remind_at`.
 *     Recurring sources (classes, habits) and goal deadlines have no single
 *     timestamp a drop could mean one thing for, so they don't drag at all.
 */

/** The kinds whose rows carry exactly one timestamp a drop can rewrite. */
const MOVEABLE: ReadonlySet<AgendaKind> = new Set(["event", "task", "study", "reminder"]);

const KIND_OPTIONS: EventManagerOption[] = (
  ["class", "study", "task", "reminder", "event", "habit", "goal", "testdate"] as AgendaKind[]
).map((kind) => ({ value: kind, label: KIND_LABEL[kind] }));

const EVENT_CATEGORIES: EventCategory[] = [
  "exam",
  "deadline",
  "school",
  "application",
  "personal",
  "other",
];

const EVENT_CATEGORY_OPTIONS: EventManagerOption[] = EVENT_CATEGORIES.map((value) => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1),
}));

const COLOR_OPTIONS: EventManagerColor[] = ROUTINE_COLORS.map((value) => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1),
  dot: swatch(value).dot,
  chip: swatch(value).chip,
}));

/** How far the list view reaches, so its days get built. */
const LIST_DAYS = 60;

/**
 * Labels are derived, never stored: Routine has no tags table, and inventing
 * one here would mean a filter that quietly matched nothing. These come off
 * columns that already exist — a task's priority, an item being overdue.
 */
function labelsFor(item: AgendaItem): string[] {
  const out: string[] = [];
  if (item.priority) out.push(`${item.priority[0].toUpperCase()}${item.priority.slice(1)} priority`);
  if (item.overdue) out.push("Overdue");
  else if (item.done) out.push("Done");
  return out;
}

export default function RoutineCalendar() {
  const navigate = useNavigate();
  const { onboardingData } = useAuth();
  const { sources, loading, error, events: eventApi, tasks, study, reminders, calendars: calendarApi } =
    useRoutineSources();
  const invites = useInvitedEvents();

  const [view, setView] = useState<EventManagerView>("month");
  const [cursor, setCursor] = useState(() => new Date());
  const [calendarsOpen, setCalendarsOpen] = useState(false);
  const [newCalendarName, setNewCalendarName] = useState("");
  const [newCalendarColor, setNewCalendarColor] = useState<RoutineColor>(ROUTINE_COLORS[0]);
  const [editingCalendarId, setEditingCalendarId] = useState<string | null>(null);
  const [editingCalendarName, setEditingCalendarName] = useState("");

  // Re-anchored once per mount: "overdue" must not flip mid-render.
  const now = useMemo(() => new Date(), []);

  /** Exactly the days the current view can show — nothing is built off-screen. */
  const days = useMemo(() => {
    if (view === "year") {
      // Every day of the year, not just the ~60 the list view would give it —
      // Year view's dots come from real per-day agenda occurrences (which is
      // what lets a recurring or multi-day event show up correctly), so it
      // needs the same full-year range buildAgenda is asked to cover.
      const start = new Date(cursor.getFullYear(), 0, 1);
      const nextYear = new Date(cursor.getFullYear() + 1, 0, 1);
      const dayCount = Math.round((nextYear.getTime() - start.getTime()) / 86_400_000);
      return Array.from({ length: dayCount }, (_, i) => addDays(start, i));
    }
    if (view === "month") return monthGrid(cursor.getFullYear(), cursor.getMonth());
    if (view === "week") return Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(cursor), i));
    if (view === "day") return [startOfDay(cursor)];
    return Array.from({ length: LIST_DAYS }, (_, i) => addDays(startOfDay(cursor), i));
  }, [view, cursor]);

  const agenda = useMemo(
    () => days.flatMap((day) => buildAgenda(sources, day, { now, intendedMajor: onboardingData?.intended_major })),
    [days, sources, now, onboardingData?.intended_major],
  );

  /** Occurrence key back to the agenda item, so a drop knows what it moved. */
  const byKey = useMemo(() => new Map(agenda.map((i) => [i.key, i])), [agenda]);

  const events = useMemo<CalendarEvent[]>(
    () =>
      agenda.map((item) => {
        const source =
          item.kind === "event"
            ? (sources.events ?? []).find((e) => e.id === item.sourceId)
            : undefined;
        const repeats =
          (item.kind === "reminder" &&
            (sources.reminders ?? []).find((r) => r.id === item.sourceId)?.repeat_rule !==
              "none") ||
          Boolean(source?.recurrence);
        return {
          id: item.key,
          title: item.title,
          description: source?.description ?? item.subtitle ?? null,
          location: source?.location ?? null,
          start: item.start,
          end: item.end ?? null,
          allDay: item.allDay,
          color: item.color,
          category: item.kind,
          editCategory: source?.category,
          kindLabel: KIND_LABEL[item.kind],
          tags: labelsFor(item),
          done: item.done,
          overdue: item.overdue,
          // A recurring event's row can still be *edited* (that rewrites the
          // whole series) but not dragged — a drop lands on one occurrence's
          // date, and there is no per-occurrence exception to write it to.
          draggable: MOVEABLE.has(item.kind) && !repeats,
          editable: item.kind === "event",
          recurrence: source?.recurrence ?? null,
          recurrenceEnd: source?.recurrence_end ? new Date(source.recurrence_end) : null,
          calendarId: source?.calendar_id ?? null,
        };
      }),
    [agenda, sources.events, sources.reminders],
  );

  /**
   * Events someone else invited this student to. A guest never owns the row
   * — no drag, no resize, no edit — the dialog only offers Accept/Decline,
   * rendered by `detailFor` below since these are read-only here the same
   * way a class or a habit is.
   */
  const invitedEvents = useMemo<CalendarEvent[]>(
    () =>
      invites.invited.map(({ guest, event }) => ({
        id: `invited:${guest.id}`,
        title: event.title,
        description: event.description,
        location: event.location,
        start: new Date(event.starts_at),
        end: event.ends_at ? new Date(event.ends_at) : null,
        allDay: event.all_day,
        color: "violet",
        category: "event",
        kindLabel: "Invited",
        tags: [guest.status === "pending" ? "Awaiting your response" : "Going"],
        draggable: false,
        editable: false,
      })),
    [invites.invited],
  );

  const allEvents = useMemo(() => [...events, ...invitedEvents], [events, invitedEvents]);

  /** Only the labels actually present, so no filter can match nothing. */
  const labels = useMemo(() => {
    const seen = new Set<string>();
    for (const e of allEvents) for (const t of e.tags ?? []) seen.add(t);
    return [...seen].sort();
  }, [allEvents]);

  // Default calendar sorts first — it's what a new event lands on when its
  // dialog doesn't ask, so openCreate()'s `calendars?.[0]` fallback picks it.
  const calendarOptions = useMemo<EventManagerOption[]>(
    () =>
      [...(calendarApi.calendars ?? [])]
        .sort((a, b) => Number(b.is_default) - Number(a.is_default))
        .map((c) => ({ value: c.id, label: c.name })),
    [calendarApi.calendars],
  );

  const hasAnything =
    (sources.classes?.length ?? 0) +
      (sources.events?.length ?? 0) +
      (sources.tasks?.length ?? 0) +
      (sources.studyBlocks?.length ?? 0) +
      (sources.reminders?.length ?? 0) +
      (sources.habits?.length ?? 0) +
      (sources.goals?.length ?? 0) +
      invitedEvents.length >
    0;

  // ── Writes ─────────────────────────────────────────────────────────────

  const toPayload = (draft: EventDraft): NewRoutineEvent => ({
    title: draft.title.trim(),
    description: draft.description.trim() || null,
    category: (draft.category || "other") as EventCategory,
    starts_at: draft.start.toISOString(),
    ends_at: draft.end ? draft.end.toISOString() : null,
    all_day: draft.allDay,
    location: draft.location.trim() || null,
    recurrence: draft.recurrence === "none" ? null : (draft.recurrence as EventRecurrence),
    recurrence_end: draft.recurrence !== "none" && draft.recurrenceEnd
      ? draft.recurrenceEnd.toISOString()
      : null,
    calendar_id: draft.calendarId,
  });

  const fail = (what: string) => (err: unknown) =>
    toast.error(what, {
      description: err instanceof Error ? err.message : "Please try again.",
    });

  const addCalendar = async () => {
    const name = newCalendarName.trim();
    if (!name) return;
    try {
      await calendarApi.createCalendar({ name, color: newCalendarColor, is_default: false });
      setNewCalendarName("");
      toast.success("Calendar added", { description: name });
    } catch (err) {
      fail("Couldn't add that calendar")(err);
    }
  };

  const renameCalendar = async (id: string) => {
    const name = editingCalendarName.trim();
    setEditingCalendarId(null);
    if (!name) return;
    try {
      await calendarApi.updateCalendar({ id, patch: { name } });
    } catch (err) {
      fail("Couldn't rename that calendar")(err);
    }
  };

  const removeCalendar = async (id: string) => {
    try {
      await calendarApi.deleteCalendar(id);
      toast.success("Calendar deleted", {
        description: "Its events are still on your calendar, just no longer filed under it.",
      });
    } catch (err) {
      fail("Couldn't delete that calendar")(err);
    }
  };

  const createEvent = async (draft: EventDraft) => {
    try {
      await eventApi.createEvent(toPayload(draft));
      toast.success("Event added", { description: draft.title.trim() });
    } catch (err) {
      fail("Couldn't add that event")(err);
    }
  };

  const updateEvent = async (id: string, draft: EventDraft) => {
    const item = byKey.get(id);
    if (!item || item.kind !== "event") return;
    try {
      await eventApi.updateEvent({ id: item.sourceId, patch: toPayload(draft) });
      toast.success("Event updated", { description: draft.title.trim() });
    } catch (err) {
      fail("Couldn't save that event")(err);
    }
  };

  const deleteEvent = async (id: string) => {
    const item = byKey.get(id);
    if (!item || item.kind !== "event") return;
    try {
      await eventApi.deleteEvent(item.sourceId);
      toast.success("Event deleted");
    } catch (err) {
      fail("Couldn't delete that event")(err);
    }
  };

  /**
   * A dropped card writes to the table that owns it. `hourSet` distinguishes a
   * month-grid drop (new date, same clock) from a week/day drop (new hour), so
   * a block that had no time of day doesn't silently acquire one.
   */
  const moveEvent = async (event: CalendarEvent, start: Date, hourSet: boolean) => {
    const item = byKey.get(event.id);
    if (!item) return;
    const when = start.toISOString();
    try {
      switch (item.kind) {
        case "event": {
          const row = (sources.events ?? []).find((e) => e.id === item.sourceId);
          if (!row) return;
          const duration =
            row.ends_at && row.starts_at
              ? new Date(row.ends_at).getTime() - new Date(row.starts_at).getTime()
              : null;
          await eventApi.updateEvent({
            id: row.id,
            patch: {
              starts_at: when,
              ends_at:
                duration === null ? null : new Date(start.getTime() + duration).toISOString(),
            },
          });
          break;
        }
        case "task":
          await tasks.updateTask({ id: item.sourceId, patch: { due_at: when } });
          break;
        case "study": {
          const row = (sources.studyBlocks ?? []).find((b) => b.id === item.sourceId);
          if (!row) return;
          await study.updateStudyBlock({
            id: row.id,
            patch: {
              scheduled_date: dateKey(start),
              scheduled_start: hourSet
                ? `${minutesToTime(start.getHours() * 60 + start.getMinutes())}:00`
                : row.scheduled_start,
            },
          });
          break;
        }
        case "reminder":
          await reminders.updateReminder({ id: item.sourceId, patch: { remind_at: when } });
          break;
        default:
          return;
      }
      toast.success("Rescheduled", {
        description: `${item.title} → ${start.toLocaleDateString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
        })}${item.allDay && !hourSet ? "" : `, ${start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`}`,
      });
    } catch (err) {
      fail("Couldn't reschedule that")(err);
    }
  };

  /** The bottom edge of a Week/Day block was dragged to a new duration. */
  const resizeEvent = async (event: CalendarEvent, end: Date) => {
    const item = byKey.get(event.id);
    if (!item || item.kind !== "event") return;
    try {
      await eventApi.updateEvent({ id: item.sourceId, patch: { ends_at: end.toISOString() } });
      toast.success("Duration updated", { description: item.title });
    } catch (err) {
      fail("Couldn't change that duration")(err);
    }
  };

  /** Where a read-only item is actually edited. */
  const respondToInvite = async (guestId: string, status: "accepted" | "declined") => {
    try {
      await invites.respond({ id: guestId, status });
      toast.success(status === "accepted" ? "You're going" : "Declined");
    } catch (err) {
      fail("Couldn't send that response")(err);
    }
  };

  const detailFor = (event: CalendarEvent) => {
    if (event.id.startsWith("invited:")) {
      const guestId = event.id.slice("invited:".length);
      const invite = invites.invited.find(({ guest }) => guest.id === guestId);
      if (!invite) return null;
      if (invite.guest.status !== "pending") {
        return (
          <p className="text-sm text-muted-foreground">
            {invite.guest.status === "accepted" ? "You're attending." : "You declined."}
          </p>
        );
      }
      return (
        <div className="flex gap-2">
          <Button size="sm" className="gap-1.5" onClick={() => void respondToInvite(guestId, "accepted")}>
            <Check className="h-3.5 w-3.5" />
            Accept
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => void respondToInvite(guestId, "declined")}
          >
            <X className="h-3.5 w-3.5" />
            Decline
          </Button>
        </div>
      );
    }
    const item = byKey.get(event.id);
    if (!item) return null;
    const destination: Partial<Record<AgendaKind, { label: string; href: string }>> = {
      class: { label: "Open your timetable", href: "/routine/timetable" },
      study: { label: "Open Study Planner", href: "/routine/study-planner" },
      task: { label: "Open Today", href: "/routine/today" },
      reminder: { label: "Open Reminders", href: "/routine/reminders" },
      habit: { label: "Open Today", href: "/routine/today" },
      goal: { label: "Open Goals", href: "/routine/goals" },
      testdate: { label: "Open Test Prep", href: "/test-prep/sat" },
    };
    const target = destination[item.kind];
    if (!target) return null;
    return (
      <Button variant="outline" size="sm" onClick={() => navigate(target.href)}>
        {target.label}
      </Button>
    );
  };

  return (
    <RoutineShell
      title="Calendar"
      purpose="Classes, study blocks, deadlines, reminders and events on one grid. Drag anything with a single date to move it."
      icon={CalendarDays}
      path="/routine/calendar"
      wide
      actions={
        <Popover open={calendarsOpen} onOpenChange={setCalendarsOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Settings2 className="h-3.5 w-3.5" />
              My calendars
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72">
            <div className="space-y-1">
              {(calendarApi.calendars ?? []).map((c) => (
                <div key={c.id} className="group/cal flex items-center gap-2 rounded-md px-1 py-1">
                  <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", swatch(c.color).dot)} />
                  {editingCalendarId === c.id ? (
                    <Input
                      autoFocus
                      value={editingCalendarName}
                      onChange={(e) => setEditingCalendarName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void renameCalendar(c.id);
                        if (e.key === "Escape") setEditingCalendarId(null);
                      }}
                      onBlur={() => void renameCalendar(c.id)}
                      className="h-7 flex-1 text-sm"
                    />
                  ) : (
                    <span className="flex-1 truncate text-sm">
                      {c.name}
                      {c.is_default && (
                        <span className="ml-1.5 text-[10px] text-muted-foreground">Default</span>
                      )}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCalendarId(c.id);
                      setEditingCalendarName(c.name);
                    }}
                    className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover/cal:opacity-100"
                    aria-label={`Rename ${c.name}`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  {!c.is_default && (
                    <button
                      type="button"
                      onClick={() => void removeCalendar(c.id)}
                      className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover/cal:opacity-100"
                      aria-label={`Delete ${c.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-2 border-t border-border pt-3">
              <Label htmlFor="new-calendar-name" className="text-xs">
                New calendar
              </Label>
              <div className="flex items-center gap-1.5">
                <Input
                  id="new-calendar-name"
                  value={newCalendarName}
                  onChange={(e) => setNewCalendarName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void addCalendar()}
                  placeholder="e.g. Work"
                  className="h-8 flex-1 text-sm"
                />
                <Select
                  value={newCalendarColor}
                  onValueChange={(v) => setNewCalendarColor(v as RoutineColor)}
                >
                  <SelectTrigger className="h-8 w-9 p-0">
                    <SelectValue>
                      <span
                        className={cn(
                          "mx-auto block h-2.5 w-2.5 rounded-full",
                          swatch(newCalendarColor).dot,
                        )}
                      />
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {ROUTINE_COLORS.map((color) => (
                      <SelectItem key={color} value={color}>
                        <span className="flex items-center gap-2">
                          <span className={cn("h-2.5 w-2.5 rounded-full", swatch(color).dot)} />
                          {color}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => void addCalendar()}
                  disabled={!newCalendarName.trim() || calendarApi.saving}
                  aria-label="Add calendar"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      }
    >
      <RoutineAsync loading={loading} error={error} loadingVariant="grid-tall" loadingRows={3}>
        <EventManager
          events={allEvents}
          colors={COLOR_OPTIONS}
          categories={KIND_OPTIONS}
          createCategories={EVENT_CATEGORY_OPTIONS}
          tags={labels}
          tagFilterLabel="Labels"
          calendars={calendarOptions}
          view={view}
          onViewChange={setView}
          date={cursor}
          onDateChange={setCursor}
          saving={eventApi.saving}
          detail={detailFor}
          onCreate={createEvent}
          onUpdate={updateEvent}
          onDelete={deleteEvent}
          onMove={moveEvent}
          onResize={resizeEvent}
          guestsSection={(event) => {
            const item = byKey.get(event.id);
            if (!item || item.kind !== "event") return null;
            return <GuestPanel eventId={item.sourceId} />;
          }}
          emptyState={
            hasAnything ? undefined : (
              <RoutineEmptyState
                icon={CalendarDays}
                title="Your calendar fills itself"
                description="Add a class to your timetable or a deadline to Today and it shows up here — this grid is a view over everything you've already told Routine, not a second place to type it in."
                actionLabel="Set up your timetable"
                onAction={() => navigate("/routine/timetable")}
                secondaryLabel="Go to Today"
                onSecondary={() => navigate("/routine/today")}
              />
            )
          }
        />
      </RoutineAsync>
    </RoutineShell>
  );
}

/**
 * The guest list on one saved event — invite by email, see who's answered,
 * remove anyone. Its own component (not inline in RoutineCalendar) because it
 * needs `useEventGuests(eventId)`, and hooks can't be called conditionally
 * inside a render-prop callback; a proper child component is what lets this
 * one only mount, and only fetch, while an existing event is actually open.
 */
function GuestPanel({ eventId }: { eventId: string }) {
  const { guests, invite, removeGuest, saving } = useEventGuests(eventId);
  const [email, setEmail] = useState("");

  const statusLabel: Record<string, string> = {
    pending: "Invited",
    accepted: "Going",
    declined: "Declined",
  };

  const addGuest = async () => {
    const value = email.trim();
    if (!value) return;
    try {
      await invite(value);
      setEmail("");
      toast.success("Invite submitted", {
        description: "If this person is eligible, they'll see the event on their calendar.",
      });
    } catch (err) {
      toast.error("Couldn't invite that guest", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    }
  };

  return (
    <div className="space-y-2 border-t border-border pt-4">
      <Label className="text-sm font-medium">Guests</Label>
      <p className="text-xs text-muted-foreground">
        Invite another Pathforge user by email. They'll see this one event on their own
        calendar and can accept or decline it.
      </p>
      {guests.length > 0 && (
        <div className="space-y-1.5">
          {guests.map((g) => (
            <div key={g.id} className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5">
              <span className="min-w-0 flex-1 truncate text-sm">{g.invitee_email}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{statusLabel[g.status]}</span>
              <button
                type="button"
                onClick={() => void removeGuest(g.id)}
                className="shrink-0 rounded p-1 text-muted-foreground hover:text-destructive"
                aria-label={`Remove ${g.invitee_email}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <Input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void addGuest()}
          type="email"
          placeholder="Their Pathforge email"
          className="h-8 flex-1 text-sm"
        />
        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8 shrink-0"
          onClick={() => void addGuest()}
          disabled={!email.trim() || saving}
          aria-label="Invite guest"
        >
          <UserPlus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
