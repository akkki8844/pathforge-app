import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { RoutineShell } from "@/components/routine/RoutineShell";
import { RoutineAsync, RoutineEmptyState } from "@/components/routine/RoutineStates";
import { EventManager, type Event as CalendarEvent } from "@/components/ui/event-manager";
import { useInvitedEvents, useRoutineSources } from "@/hooks/routine/useRoutineData";
import { buildAgenda } from "@/lib/routine/derive";
import { KIND_COLOR, KIND_LABEL, swatch } from "@/lib/routine/colors";
import { addDays, dateKey, minutesToTime, startOfDay, startOfWeek } from "@/lib/routine/dates";
import {
  ROUTINE_COLORS,
  type AgendaItem,
  type AgendaKind,
  type EventCategory,
  type NewRoutineEvent,
  type RoutineColor,
} from "@/lib/routine/types";

/**
 * Every scheduled thing, in one grid.
 *
 * The page owns no calendar logic and no event list of its own: `buildAgenda()`
 * projects classes, study blocks, tasks, reminders, events, habits, goal
 * deadlines and national test dates into one shape, and `EventManager` renders
 * that shape. So the calendar cannot disagree with Today about what is
 * happening on a Tuesday — they are the same projection over the same rows.
 *
 * What can be changed from here is deliberately narrower than what is shown,
 * because the sources are not equally moveable:
 *
 *   * Create, edit and delete write to `routine_events` — the one table whose
 *     rows *are* calendar entries. A task's real editor is Today; a class's is
 *     the timetable. Retyping those forms here would be a second place to get
 *     them wrong, so they open read-only with a link to where they live.
 *   * Drag-to-reschedule writes to whichever table owns the dragged row:
 *     `routine_events.starts_at`, `routine_tasks.due_at`,
 *     `routine_study_blocks.scheduled_date/start`, `routine_reminders.remind_at`.
 *     Recurring sources (classes, habits) and goal deadlines have no single
 *     timestamp a drop could mean one thing for, so they don't drag at all.
 */

/** The kinds whose rows carry exactly one timestamp a drop can rewrite. */
const MOVEABLE: ReadonlySet<AgendaKind> = new Set(["event", "task", "study", "reminder"]);

const EVENT_CATEGORIES: EventCategory[] = [
  "exam",
  "deadline",
  "school",
  "application",
  "personal",
  "other",
];

const title = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

/** What the create/edit dialog offers. Only `routine_events` are made here. */
const CREATE_CATEGORIES = EVENT_CATEGORIES.map(title);

/**
 * What the Categories filter offers: every kind on the grid, plus the
 * categories an event of your own can carry. "Event" itself is not in the list
 * — an event always shows as its category, so the word would match nothing.
 */
const FILTER_CATEGORIES = [
  ...(["class", "study", "task", "reminder", "habit", "goal", "testdate"] as AgendaKind[]).map(
    (k) => KIND_LABEL[k],
  ),
  ...CREATE_CATEGORIES,
];

/**
 * Colour by category for your own events, by kind for everything else.
 *
 * `routine_events` has no colour column and is not getting one: the category is
 * what a student picks, and this is the palette that picking one paints with.
 * That is also why the dialog offers no colour of its own — a picker whose
 * choice is dropped on save is worse than no picker. The calendar used to take
 * its colour from the *kind*, which made every event and every test date the
 * same pink and the whole month one colour.
 */
const CATEGORY_COLOR: Record<EventCategory, RoutineColor> = {
  exam: "rose",
  deadline: "amber",
  school: "blue",
  application: "violet",
  personal: "emerald",
  other: "slate",
};

/** The colour list the component paints chips and the filter menu with. */
const COLOR_OPTIONS = ROUTINE_COLORS.map((value) => ({
  value,
  name: title(value),
  bg: swatch(value).dot,
  text: swatch(value).text,
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
  if (item.priority) out.push(`${title(item.priority)} priority`);
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

  const [view, setView] = useState<"month" | "week" | "day" | "list">("month");
  const [cursor, setCursor] = useState(() => new Date());

  // Re-anchored once per mount: "overdue" must not flip mid-render.
  const now = useMemo(() => new Date(), []);

  /** Exactly the days the current view can show — nothing is built off-screen. */
  const days = useMemo(() => {
    if (view === "month") {
      // The month view draws a fixed 6×7 grid from the Sunday on or before the
      // 1st, so the days built here have to cover the same span — otherwise the
      // first and last rows are blank whatever is really on them.
      const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
      const start = addDays(startOfDay(first), -first.getDay());
      return Array.from({ length: 42 }, (_, i) => addDays(start, i));
    }
    if (view === "week") return Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(cursor), i));
    if (view === "day") return [startOfDay(cursor)];
    return Array.from({ length: LIST_DAYS }, (_, i) => addDays(startOfDay(cursor), i));
  }, [view, cursor]);

  const agenda = useMemo(
    () =>
      days.flatMap((day) =>
        buildAgenda(sources, day, { now, intendedMajor: onboardingData?.intended_major }),
      ),
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
            (sources.reminders ?? []).find((r) => r.id === item.sourceId)?.repeat_rule !== "none") ||
          Boolean(source?.recurrence);
        const category = source ? title(source.category) : KIND_LABEL[item.kind];
        return {
          id: item.key,
          title: item.title,
          description: source?.description ?? item.subtitle ?? undefined,
          startTime: item.start,
          endTime: item.end ?? item.start,
          allDay: item.allDay,
          color: source ? CATEGORY_COLOR[source.category] : KIND_COLOR[item.kind],
          category,
          tags: labelsFor(item),
          // A recurring event's row can still be *edited* (that rewrites the
          // whole series) but not dragged — a drop lands on one occurrence's
          // date, and there is no per-occurrence exception to write it to.
          draggable: MOVEABLE.has(item.kind) && !repeats,
          editable: item.kind === "event",
        };
      }),
    [agenda, sources.events, sources.reminders],
  );

  /**
   * Events someone else invited this student to. A guest never owns the row —
   * no drag, no edit — so these open read-only, where the only thing on offer
   * is Accept or Decline.
   */
  const invitedEvents = useMemo<CalendarEvent[]>(
    () =>
      invites.invited.map(({ guest, event }) => ({
        id: `invited:${guest.id}`,
        title: event.title,
        description: event.description ?? undefined,
        startTime: new Date(event.starts_at),
        endTime: event.ends_at ? new Date(event.ends_at) : new Date(event.starts_at),
        allDay: event.all_day,
        color: "violet",
        category: "Invited",
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

  const fail = (what: string) => (err: unknown) =>
    toast.error(what, {
      description: err instanceof Error ? err.message : "Please try again.",
    });

  /** The default calendar, so a new event files itself the way it used to. */
  const defaultCalendarId =
    (calendarApi.calendars ?? []).find((c) => c.is_default)?.id ??
    (calendarApi.calendars ?? [])[0]?.id ??
    null;

  const toPayload = (event: Partial<CalendarEvent>): NewRoutineEvent => {
    const start = event.startTime ?? new Date();
    const category = (event.category ?? "Other").toLowerCase();
    return {
      title: (event.title ?? "").trim(),
      description: event.description?.trim() || null,
      category: (EVENT_CATEGORIES.includes(category as EventCategory)
        ? category
        : "other") as EventCategory,
      starts_at: start.toISOString(),
      ends_at: event.endTime && event.endTime > start ? event.endTime.toISOString() : null,
      all_day: event.allDay ?? false,
      location: null,
      recurrence: null,
      recurrence_end: null,
      calendar_id: defaultCalendarId,
    };
  };

  const createEvent = async (event: Omit<CalendarEvent, "id">) => {
    const name = event.title.trim();
    if (!name) return;
    try {
      await eventApi.createEvent(toPayload(event));
      toast.success("Event added", { description: name });
    } catch (err) {
      fail("Couldn't add that event")(err);
    }
  };

  /**
   * One update path, two callers: the dialog's Save, and a card dropped on
   * another day. Both arrive as a patch on the event, and which table it lands
   * in is decided by what the row actually is.
   */
  const updateEvent = async (id: string, patch: Partial<CalendarEvent>) => {
    const item = byKey.get(id);
    if (!item) return;
    const start = patch.startTime;

    if (item.kind === "event") {
      const row = (sources.events ?? []).find((e) => e.id === item.sourceId);
      if (!row) return;
      try {
        await eventApi.updateEvent({
          id: row.id,
          patch: {
            ...toPayload({ ...patch, allDay: patch.allDay ?? row.all_day }),
            // Location and repeat live on the row and have no field here, so
            // an edit from this page must not blank them.
            location: row.location,
            recurrence: row.recurrence,
            recurrence_end: row.recurrence_end,
            calendar_id: row.calendar_id,
          },
        });
        toast.success("Event updated", { description: (patch.title ?? row.title).trim() });
      } catch (err) {
        fail("Couldn't save that event")(err);
      }
      return;
    }

    // Everything else is read-only in the dialog, so an update here is a drop.
    if (!start) return;
    const when = start.toISOString();
    const hourSet =
      start.getHours() !== item.start.getHours() || start.getMinutes() !== item.start.getMinutes();
    try {
      switch (item.kind) {
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
        })}`,
      });
    } catch (err) {
      fail("Couldn't reschedule that")(err);
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

  const respondToInvite = async (guestId: string, status: "accepted" | "declined") => {
    try {
      await invites.respond({ id: guestId, status });
      toast.success(status === "accepted" ? "You're going" : "Declined");
    } catch (err) {
      fail("Couldn't send that response")(err);
    }
  };

  /** Where a read-only row is actually edited, or answered. */
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
      purpose="Classes, study blocks, deadlines, reminders, events and test dates on one grid. Drag anything with a single date to move it."
      icon={CalendarDays}
      path="/routine/calendar"
      wide
    >
      <RoutineAsync loading={loading} error={error} loadingVariant="grid-tall" loadingRows={3}>
        <EventManager
          events={allEvents}
          colors={COLOR_OPTIONS}
          categories={CREATE_CATEGORIES}
          filterCategories={FILTER_CATEGORIES}
          colorField={false}
          availableTags={[]}
          filterTags={labels}
          view={view}
          onViewChange={setView}
          date={cursor}
          onDateChange={setCursor}
          detail={detailFor}
          onEventCreate={createEvent}
          onEventUpdate={updateEvent}
          onEventDelete={deleteEvent}
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
