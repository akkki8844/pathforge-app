import { useCallback, useMemo, useRef } from "react";
import { CheckSquare, Loader2, PlusIcon } from "lucide-react";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useRoutineEvents, useRoutineTasks } from "@/hooks/routine/useRoutineData";
import type { EventCategory, RoutineEvent, RoutineTask } from "@/lib/routine/types";
import {
  EventCalendar,
  type EventCalendarApi,
  type EventCalendarRenderEventProps,
} from "@/components/reui/event-calendar/event-calendar";
import { EventCalendarContent } from "@/components/reui/event-calendar/event-calendar-content";
import {
  EventCalendarNav,
  EventCalendarToolbar,
} from "@/components/reui/event-calendar/event-calendar-nav";
import type {
  CalendarEvent,
  EventCalendarProposedUpdate,
} from "@/components/reui/event-calendar/event-calendar-types";

/**
 * Calendar.
 *
 * The ReUI event calendar, rendering the student's REAL data: `routine_events`
 * as timed or all-day blocks and `routine_tasks` with a deadline as all-day
 * markers. Dragging or resizing an event writes straight back through
 * `updateEvent`, so a reschedule here is a reschedule everywhere — Today, the
 * agenda and the deadline reminder email all read the same rows.
 *
 * Tasks are deliberately NOT draggable. A task's `due_at` is a deadline, and
 * letting someone nudge a deadline by accident while dragging past it is a
 * different (and worse) product than a calendar. `editable: false` on those
 * events is what enforces it; the calendar shows a not-allowed cursor and
 * `onDragBlocked` explains why once per gesture.
 */

/** One hue per category. Distinct identities, not severities, so these are
 *  fixed hues rather than the semantic state tokens. */
const CATEGORY_COLOR: Record<EventCategory, string> = {
  exam: "hsl(0 72% 51%)",
  deadline: "hsl(25 90% 48%)",
  school: "hsl(221 76% 55%)",
  application: "hsl(262 70% 58%)",
  personal: "hsl(160 70% 38%)",
  other: "hsl(215 16% 47%)",
};

const CATEGORY_LABEL: Record<EventCategory, string> = {
  exam: "Exam",
  deadline: "Deadline",
  school: "School",
  application: "Application",
  personal: "Personal",
  other: "Other",
};

const TASK_COLOR = "hsl(215 16% 47%)";

interface Payload {
  kind: "event" | "task";
  category?: EventCategory;
  row: RoutineEvent | RoutineTask;
}

/** An event with no end is a point in time; give it the default hour so it has
 *  something to draw. The calendar treats end as exclusive. */
function eventEnd(row: RoutineEvent): Date {
  if (row.ends_at) return new Date(row.ends_at);
  const start = new Date(row.starts_at);
  return new Date(start.getTime() + (row.all_day ? 24 : 1) * 60 * 60 * 1000);
}

export default function WeeklyPlanner() {
  const { toast } = useToast();
  const apiRef = useRef<EventCalendarApi<Payload> | null>(null);
  const { events, loading: eventsLoading, updateEvent, createEvent } = useRoutineEvents();
  const { tasks, loading: tasksLoading } = useRoutineTasks();

  const calendarEvents = useMemo<CalendarEvent<Payload>[]>(() => {
    const fromEvents = (events ?? []).map<CalendarEvent<Payload>>((row) => ({
      id: `event:${row.id}`,
      title: row.title,
      start: new Date(row.starts_at),
      end: eventEnd(row),
      allDay: row.all_day,
      color: CATEGORY_COLOR[row.category] ?? CATEGORY_COLOR.other,
      data: { kind: "event", category: row.category, row },
    }));

    const fromTasks = (tasks ?? [])
      .filter((task) => task.due_at && task.status !== "done")
      .map<CalendarEvent<Payload>>((task) => {
        const due = new Date(task.due_at as string);
        return {
          id: `task:${task.id}`,
          title: task.title,
          start: due,
          end: new Date(due.getTime() + 60 * 60 * 1000),
          allDay: false,
          color: TASK_COLOR,
          // A deadline is not a movable block — see the file header.
          editable: false,
          data: { kind: "task", row: task },
        };
      });

    return [...fromEvents, ...fromTasks];
  }, [events, tasks]);

  /*
   * The write path. Returning false rejects the gesture and the calendar snaps
   * the event back, which is the correct response to a task (a deadline) or to
   * a failed save — never leave the grid showing a position the database does
   * not hold.
   */
  const handleUpdate = useCallback(
    (update: EventCalendarProposedUpdate<Payload>) => {
      const payload = update.event.data;
      if (!payload || payload.kind !== "event") return false;
      const row = payload.row as RoutineEvent;
      void updateEvent({
        id: row.id,
        patch: {
          starts_at: update.start.toISOString(),
          ends_at: update.end.toISOString(),
          all_day: update.allDay,
        },
      }).catch(() => {
        toast({
          title: "Could not move that",
          description: "The change was not saved. Please try again.",
          variant: "destructive",
        });
      });
      return true;
    },
    [updateEvent, toast],
  );

  const handleDragBlocked = useCallback(
    (
      occurrence: { event: CalendarEvent<Payload> },
      info: { gesture: "move" | "resize" },
    ) => {
      if (occurrence.event.data?.kind !== "task") return;
      toast({
        title: "Deadlines don't move",
        description: `“${occurrence.event.title}” is a task deadline. Change it from the task itself.`,
      });
      void info;
    },
    [toast],
  );

  /** Drag across empty space to block out time; it saves immediately. */
  const handleSelectSlot = useCallback(
    (slot: { start: Date; end: Date; allDay?: boolean }) => {
      void createEvent({
        title: "New event",
        category: "personal" as EventCategory,
        starts_at: slot.start.toISOString(),
        ends_at: slot.end.toISOString(),
        all_day: !!slot.allDay,
      } as never).catch(() => {
        toast({
          title: "Could not create that event",
          description: "The change was not saved. Please try again.",
          variant: "destructive",
        });
      });
    },
    [createEvent, toast],
  );

  const addEventToday = () => {
    const start = new Date();
    start.setMinutes(0, 0, 0);
    start.setHours(start.getHours() + 1);
    handleSelectSlot({ start, end: new Date(start.getTime() + 60 * 60 * 1000) });
    apiRef.current?.goTo(start);
  };

  const loading = eventsLoading || tasksLoading;

  return (
    <div className="min-h-svh bg-background">
      <Seo
        title="Calendar"
        description="Everything you have scheduled — events, deadlines and study blocks — on one calendar you can drag."
        path="/calendar"
      />

      <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6">
        <header className="mb-5">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            Calendar
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Events, deadlines and everything scheduled. Drag to reschedule; task
            deadlines stay put.
          </p>
        </header>

        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          {loading ? (
            <div className="flex h-[640px] items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <EventCalendar<Payload>
              events={calendarEvents}
              defaultView="week"
              weekStartsOn={1}
              apiRef={apiRef}
              scrollToHour={8}
              nowIndicator
              onEventUpdate={handleUpdate}
              onDragBlocked={handleDragBlocked}
              onSelectSlot={handleSelectSlot}
              renderEvent={renderChip}
              renderEventTooltip={renderTooltip}
              eventTooltip={{ side: "top" }}
              interactions={{ drag: true, resize: true, selectSlot: true }}
              className="h-[680px] w-full"
            >
              <div className="flex flex-wrap items-center gap-2 border-b border-border px-2 py-2 pe-2">
                <EventCalendarNav className="min-w-0 flex-1" />
                <EventCalendarToolbar>
                  <Button size="sm" onClick={addEventToday}>
                    <PlusIcon className="size-4" aria-hidden="true" />
                    New event
                  </Button>
                </EventCalendarToolbar>
              </div>
              <EventCalendarContent />
            </EventCalendar>
          )}

          {/* Legend. Runtime hsl() swatches ride inline styles rather than
              synthesized utility classes, which Tailwind cannot generate. */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border px-4 py-3 text-xs text-muted-foreground">
            {(Object.keys(CATEGORY_LABEL) as EventCategory[]).map((key) => (
              <span key={key} className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="size-2 rounded-full"
                  style={{ backgroundColor: CATEGORY_COLOR[key] }}
                />
                {CATEGORY_LABEL[key]}
              </span>
            ))}
            <span className="flex items-center gap-1.5">
              <CheckSquare className="size-3" aria-hidden="true" />
              Task deadline
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Compact single-row chip: a task gets its checkbox glyph, an event its title. */
function renderChip({ occurrence }: EventCalendarRenderEventProps<Payload>) {
  const payload = occurrence.event.data;
  if (!payload) return undefined;
  return (
    <span className="flex w-full min-w-0 items-center gap-1.5">
      {payload.kind === "task" && (
        <CheckSquare className="size-3.5 shrink-0" aria-hidden="true" />
      )}
      <span className="truncate font-medium">{occurrence.event.title}</span>
    </span>
  );
}

function renderTooltip({
  occurrence,
}: {
  occurrence: { event: CalendarEvent<Payload> };
}) {
  const payload = occurrence.event.data;
  if (!payload) return undefined;
  return (
    <div className="space-y-0.5">
      <p className="font-medium">{occurrence.event.title}</p>
      <p className="text-muted-foreground text-xs">
        {payload.kind === "task"
          ? "Task deadline"
          : CATEGORY_LABEL[payload.category ?? "other"]}
      </p>
    </div>
  );
}
