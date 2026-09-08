import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { useRoutineSources } from "@/hooks/routine/useRoutineData";
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
  type NewRoutineEvent,
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
  ["class", "study", "task", "reminder", "event", "habit", "goal"] as AgendaKind[]
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
  const { sources, loading, error, events: eventApi, tasks, study, reminders } =
    useRoutineSources();

  const [view, setView] = useState<EventManagerView>("month");
  const [cursor, setCursor] = useState(() => new Date());

  // Re-anchored once per mount: "overdue" must not flip mid-render.
  const now = useMemo(() => new Date(), []);

  /** Exactly the days the current view can show — nothing is built off-screen. */
  const days = useMemo(() => {
    if (view === "month") return monthGrid(cursor.getFullYear(), cursor.getMonth());
    if (view === "week") return Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(cursor), i));
    if (view === "day") return [startOfDay(cursor)];
    return Array.from({ length: LIST_DAYS }, (_, i) => addDays(startOfDay(cursor), i));
  }, [view, cursor]);

  const agenda = useMemo(
    () => days.flatMap((day) => buildAgenda(sources, day, { now })),
    [days, sources, now],
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
          item.kind === "reminder" &&
          (sources.reminders ?? []).find((r) => r.id === item.sourceId)?.repeat_rule !== "none";
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
          draggable: MOVEABLE.has(item.kind) && !repeats,
          editable: item.kind === "event",
        };
      }),
    [agenda, sources.events, sources.reminders],
  );

  /** Only the labels actually present, so no filter can match nothing. */
  const labels = useMemo(() => {
    const seen = new Set<string>();
    for (const e of events) for (const t of e.tags ?? []) seen.add(t);
    return [...seen].sort();
  }, [events]);

  const hasAnything =
    (sources.classes?.length ?? 0) +
      (sources.events?.length ?? 0) +
      (sources.tasks?.length ?? 0) +
      (sources.studyBlocks?.length ?? 0) +
      (sources.reminders?.length ?? 0) +
      (sources.habits?.length ?? 0) +
      (sources.goals?.length ?? 0) >
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
  });

  const fail = (what: string) => (err: unknown) =>
    toast.error(what, {
      description: err instanceof Error ? err.message : "Please try again.",
    });

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

  /** Where a read-only item is actually edited. */
  const detailFor = (event: CalendarEvent) => {
    const item = byKey.get(event.id);
    if (!item) return null;
    const destination: Partial<Record<AgendaKind, { label: string; href: string }>> = {
      class: { label: "Open your timetable", href: "/routine/timetable" },
      study: { label: "Open Study Planner", href: "/routine/study-planner" },
      task: { label: "Open Today", href: "/routine/today" },
      reminder: { label: "Open Reminders", href: "/routine/reminders" },
      habit: { label: "Open Today", href: "/routine/today" },
      goal: { label: "Open Goals", href: "/routine/goals" },
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
    >
      <RoutineAsync loading={loading} error={error} loadingVariant="grid-tall" loadingRows={3}>
        <EventManager
          events={events}
          colors={COLOR_OPTIONS}
          categories={KIND_OPTIONS}
          createCategories={EVENT_CATEGORY_OPTIONS}
          tags={labels}
          tagFilterLabel="Labels"
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
