import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpenCheck,
  Calendar as CalendarIcon,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Grid3x3,
  List,
  Plus,
  Search,
  SkipForward,
  Sparkles,
  Timer,
  Wand2,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { RoutineShell, RoutinePanel, RoutineStat } from "@/components/routine/RoutineShell";
import { RoutineAsync, RoutineEmptyState } from "@/components/routine/RoutineStates";
import {
  DeleteAction,
  EnumSelect,
  Field,
  FieldRow,
  PrioritySelect,
  RoutineDialog,
  fromLocalInput,
  fromTimeInput,
  toLocalInput,
  toTimeInput,
} from "@/components/routine/RoutineForm";
import {
  DEFAULT_PLAN_SETTINGS,
  describePlan,
  suggestPlan,
  type PlanSettings,
} from "@/components/routine/study-planner/suggest";
import {
  DayIndicators,
  ItemChip,
  ItemRow,
  KIND_ORDER,
  KindGlyph,
  type CalendarView,
} from "@/components/routine/calendar/visuals";
import { useRoutineSources } from "@/hooks/routine/useRoutineData";
import { buildAgenda, knownSubjects } from "@/lib/routine/derive";
import { colorForSubject, swatch, KIND_LABEL, PRIORITY_CLASSES } from "@/lib/routine/colors";
import {
  addDays,
  dateKey,
  formatDuration,
  formatLongDate,
  formatMonthYear,
  formatTime,
  isToday,
  monthGrid,
  parseDateKey,
  startOfWeek,
} from "@/lib/routine/dates";
import { listItem, staggerParent, staggerStep } from "@/lib/motion";
import {
  WEEKDAY_LABELS,
  type AgendaItem,
  type AgendaKind,
  type EventCategory,
  type NewRoutineEvent,
  type NewRoutineStudyBlock,
  type RoutineStudyBlock,
  type StudyBlockStatus,
} from "@/lib/routine/types";

/**
 * The Planner: everything scheduled, and everything you decide to schedule.
 *
 * This used to be two pages — a Study Planner for study blocks, and a Calendar
 * for the wider view drawn from every part of Routine. They are now one page,
 * two tabs, over the same `useRoutineSources()` call: "Study week" for
 * deciding *what* to study and *when*, "Calendar" for seeing study blocks
 * alongside classes, tasks, reminders, habits, goal deadlines and one-off
 * events in a single agenda. `buildAgenda()` is what makes that agenda
 * automatic — an objective accepted in Communications writes a
 * `routine_tasks` row, and a goal's target date is read directly, so nothing
 * here has to know those features exist.
 *
 * The distinction that made Study Planner its own page originally still holds
 * *inside* this page: a task is "submit the physics assignment", done or not;
 * a study block is "45 minutes on electromagnetism, Tuesday evening", time
 * committed to a subject. The "Suggest a plan" action stays specific to study
 * blocks for that reason.
 */

const STATUS_LABEL: Record<StudyBlockStatus, string> = {
  planned: "Planned",
  in_progress: "In progress",
  completed: "Completed",
  skipped: "Skipped",
};

const DEFAULT_BLOCK: NewRoutineStudyBlock = {
  subject: "",
  topic: null,
  objective: null,
  planned_minutes: 45,
  completed_minutes: 0,
  priority: "medium",
  scheduled_date: dateKey(new Date()),
  scheduled_start: null,
  status: "planned",
  goal_id: null,
  completed_at: null,
};

interface BlockDraft extends NewRoutineStudyBlock {
  id?: string;
}

const EVENT_CATEGORIES: EventCategory[] = [
  "exam",
  "deadline",
  "school",
  "application",
  "personal",
  "other",
];

const VIEW_OPTIONS: { value: CalendarView; label: string; icon: typeof CalendarIcon }[] = [
  { value: "month", label: "Month", icon: CalendarIcon },
  { value: "week", label: "Week", icon: Grid3x3 },
  { value: "day", label: "Day", icon: Clock },
  { value: "agenda", label: "List", icon: List },
];

const DEFAULT_EVENT: NewRoutineEvent = {
  title: "",
  description: null,
  category: "school",
  starts_at: new Date().toISOString(),
  ends_at: null,
  all_day: false,
  location: null,
};

interface EventDraft extends NewRoutineEvent {
  id?: string;
}

/** How many days the agenda view looks ahead. A term's worth is unreadable. */
const AGENDA_DAYS = 45;

export default function StudyPlanner() {
  const { sources, loading, error, study, goals, events: eventApi } = useRoutineSources();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"study" | "calendar">("study");

  // ── Study week state ────────────────────────────────────────────────────
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [blockDraft, setBlockDraft] = useState<BlockDraft | null>(null);
  const [blockArmed, setBlockArmed] = useState(false);
  const [planner, setPlanner] = useState<PlanSettings | null>(null);

  // ── Calendar state ──────────────────────────────────────────────────────
  const [view, setView] = useState<CalendarView>("month");
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState<Date | null>(null);
  const [hidden, setHidden] = useState<Set<AgendaKind>>(new Set());
  const [search, setSearch] = useState("");
  const [eventDraft, setEventDraft] = useState<EventDraft | null>(null);
  const [eventArmed, setEventArmed] = useState(false);

  const now = useMemo(() => new Date(), []);
  const blocks = study.studyBlocks;

  const subjects = useMemo(
    () => knownSubjects(null, sources.classes ?? [], blocks),
    [sources.classes, blocks],
  );

  const week = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const byDay = useMemo(() => {
    const map = new Map<string, RoutineStudyBlock[]>();
    for (const day of week) map.set(dateKey(day), []);
    for (const b of blocks) {
      const list = map.get(b.scheduled_date);
      if (list) list.push(b);
    }
    for (const list of map.values()) {
      list.sort((a, b) => {
        if (!a.scheduled_start && !b.scheduled_start) return a.subject.localeCompare(b.subject);
        if (!a.scheduled_start) return 1;
        if (!b.scheduled_start) return -1;
        return a.scheduled_start.localeCompare(b.scheduled_start);
      });
    }
    return map;
  }, [blocks, week]);

  const weekStats = useMemo(() => {
    const keys = new Set(week.map(dateKey));
    const mine = blocks.filter((b) => keys.has(b.scheduled_date));
    const planned = mine.reduce((s, b) => s + b.planned_minutes, 0);
    const done = mine.reduce((s, b) => s + b.completed_minutes, 0);
    return {
      sessions: mine.length,
      planned,
      done,
      completed: mine.filter((b) => b.status === "completed").length,
      subjects: new Set(mine.map((b) => b.subject)).size,
      percent: planned ? Math.min(100, Math.round((done / planned) * 100)) : 0,
    };
  }, [blocks, week]);

  /** Recomputed live while the planner dialog's controls move. */
  const proposal = useMemo(() => {
    if (!planner) return null;
    return suggestPlan(
      {
        subjects,
        classes: sources.classes ?? [],
        events: sources.events ?? [],
        tasks: sources.tasks ?? [],
        existingBlocks: blocks,
        now,
      },
      planner,
    );
  }, [planner, subjects, sources.classes, sources.events, sources.tasks, blocks, now]);

  const openNewBlock = (day?: Date) => {
    setBlockArmed(false);
    setBlockDraft({
      ...DEFAULT_BLOCK,
      subject: subjects[0] ?? "",
      scheduled_date: dateKey(day ?? new Date()),
    });
  };

  const openEditBlock = (b: RoutineStudyBlock) => {
    setBlockArmed(false);
    setBlockDraft({
      id: b.id,
      subject: b.subject,
      topic: b.topic,
      objective: b.objective,
      planned_minutes: b.planned_minutes,
      completed_minutes: b.completed_minutes,
      priority: b.priority,
      scheduled_date: b.scheduled_date,
      scheduled_start: b.scheduled_start,
      status: b.status,
      goal_id: b.goal_id,
      completed_at: b.completed_at,
    });
  };

  const saveBlock = async () => {
    if (!blockDraft) return;
    const { id, ...payload } = blockDraft;
    const clean: NewRoutineStudyBlock = {
      ...payload,
      subject: payload.subject.trim(),
      topic: payload.topic?.trim() || null,
      objective: payload.objective?.trim() || null,
    };
    try {
      if (id) await study.updateStudyBlock({ id, patch: clean });
      else await study.createStudyBlock(clean);
      setBlockDraft(null);
    } catch (err) {
      toast.error("Couldn't save that block", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    }
  };

  const removeBlockDraft = async () => {
    if (!blockDraft?.id) return;
    try {
      await study.deleteStudyBlock(blockDraft.id);
      setBlockDraft(null);
    } catch (err) {
      toast.error("Couldn't delete that block", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    }
  };

  const complete = async (b: RoutineStudyBlock) => {
    try {
      await study.completeStudyBlock(b);
    } catch (err) {
      toast.error("Couldn't update that block", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    }
  };

  const skip = async (b: RoutineStudyBlock) => {
    try {
      await study.updateStudyBlock({ id: b.id, patch: { status: "skipped" } });
      toast("Marked as skipped", { description: `${b.subject}. It stays on the record.` });
    } catch (err) {
      toast.error("Couldn't update that block", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    }
  };

  const commitPlan = async () => {
    if (!proposal || proposal.blocks.length === 0) return;
    try {
      await study.createStudyBlocks(proposal.blocks);
      toast.success("Plan added", { description: describePlan(proposal.blocks) });
      setPlanner(null);
      setWeekStart(startOfWeek(new Date()));
    } catch (err) {
      toast.error("Couldn't save the plan", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    }
  };

  const weekLabel = `${weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${addDays(
    weekStart,
    6,
  ).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;

  // ── Calendar derivations ────────────────────────────────────────────────

  const kinds = useMemo(() => KIND_ORDER.filter((k) => !hidden.has(k)), [hidden]);

  const days = useMemo(() => {
    const list =
      view === "month"
        ? monthGrid(cursor.getFullYear(), cursor.getMonth())
        : view === "week"
          ? Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(cursor), i))
          : view === "day"
            ? [cursor]
            : Array.from({ length: AGENDA_DAYS }, (_, i) => addDays(now, i));
    return list.map((day) => ({ day, items: buildAgenda(sources, day, { kinds, now }) }));
  }, [view, cursor, sources, kinds, now]);

  const calQuery = search.trim().toLowerCase();
  const visibleDays = useMemo(() => {
    if (!calQuery) return days;
    return days.map((d) => ({
      ...d,
      items: d.items.filter(
        (i) => i.title.toLowerCase().includes(calQuery) || i.subtitle?.toLowerCase().includes(calQuery),
      ),
    }));
  }, [days, calQuery]);

  const hasAnything =
    (sources.classes?.length ?? 0) +
      (sources.events?.length ?? 0) +
      (sources.tasks?.length ?? 0) +
      (sources.studyBlocks?.length ?? 0) +
      (sources.reminders?.length ?? 0) +
      (sources.habits?.length ?? 0) +
      (sources.goals?.length ?? 0) >
    0;

  const selectedItems = useMemo(
    () => (selected ? buildAgenda(sources, selected, { kinds, now }) : []),
    [selected, sources, kinds, now],
  );

  const step = (direction: -1 | 1) => {
    setCursor((c) => {
      const next = new Date(c);
      if (view === "week") next.setDate(next.getDate() + direction * 7);
      else if (view === "day") next.setDate(next.getDate() + direction);
      else next.setMonth(next.getMonth() + direction);
      return next;
    });
  };

  const toggleKind = (k: AgendaKind) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  const openNewEvent = (day?: Date) => {
    setEventArmed(false);
    const start = day ? new Date(day) : new Date();
    if (day) start.setHours(9, 0, 0, 0);
    setEventDraft({ ...DEFAULT_EVENT, starts_at: start.toISOString() });
  };

  const openEvent = (id: string) => {
    const e = (sources.events ?? []).find((x) => x.id === id);
    if (!e) return;
    setEventArmed(false);
    setEventDraft({
      id: e.id,
      title: e.title,
      description: e.description,
      category: e.category,
      starts_at: e.starts_at,
      ends_at: e.ends_at,
      all_day: e.all_day,
      location: e.location,
    });
  };

  /** A click on an item opens its editor here, or does nothing for read-only kinds. */
  const openItem = (item: AgendaItem) => {
    if (item.kind === "event") openEvent(item.sourceId);
  };

  const saveEvent = async () => {
    if (!eventDraft) return;
    const { id, ...payload } = eventDraft;
    const clean: NewRoutineEvent = {
      ...payload,
      title: payload.title.trim(),
      description: payload.description?.trim() || null,
      location: payload.location?.trim() || null,
    };
    try {
      if (id) await eventApi.updateEvent({ id, patch: clean });
      else await eventApi.createEvent(clean);
      setEventDraft(null);
      toast.success(id ? "Event updated" : "Event added", { description: clean.title });
    } catch (err) {
      toast.error("Couldn't save that event", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    }
  };

  const removeEvent = async () => {
    if (!eventDraft?.id) return;
    try {
      await eventApi.deleteEvent(eventDraft.id);
      setEventDraft(null);
      toast.success("Event deleted");
    } catch (err) {
      toast.error("Couldn't delete that event", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    }
  };

  const periodLabel =
    view === "week"
      ? `Week of ${startOfWeek(cursor).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
      : view === "day"
        ? cursor.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })
        : view === "agenda"
          ? "Next six weeks"
          : formatMonthYear(cursor);

  return (
    <RoutineShell
      title="Study Planner"
      purpose="Decide what to study and when, and see everything else scheduled — tasks, reminders, habits, goal deadlines and one-off events — in one place."
      icon={BookOpenCheck}
      path="/routine/study-planner"
      actions={
        tab === "study" ? (
          <>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => setPlanner({ ...DEFAULT_PLAN_SETTINGS })}
            >
              <Wand2 className="h-4 w-4" />
              Suggest a plan
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => openNewBlock()}>
              <Plus className="h-4 w-4" />
              Add block
            </Button>
          </>
        ) : (
          <Button size="sm" className="gap-1.5" onClick={() => openNewEvent()}>
            <Plus className="h-4 w-4" />
            Add event
          </Button>
        )
      }
    >
      <Tabs value={tab} onValueChange={(v) => setTab(v as "study" | "calendar")}>
        <TabsList>
          <TabsTrigger value="study" className="gap-1.5">
            <BookOpenCheck className="h-4 w-4" />
            Study week
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-1.5">
            <CalendarDays className="h-4 w-4" />
            Calendar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="study">
          <RoutineAsync
            loading={loading}
            error={error}
            onRetry={() => void study.refetch()}
            loadingVariant="grid"
            loadingRows={6}
          >
            {blocks.length === 0 ? (
              <RoutineEmptyState
                icon={BookOpenCheck}
                title="Plan the week, not just the day"
                description="A study block is time committed to a subject, not another checkbox. Let Routine draft a week around your timetable and deadlines, or place a single session yourself."
                actionLabel="Suggest a plan for me"
                onAction={() => setPlanner({ ...DEFAULT_PLAN_SETTINGS })}
                secondaryLabel="Add one block"
                onSecondary={() => openNewBlock()}
              />
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <RoutineStat label="Sessions" value={weekStats.sessions} hint="this week" />
                  <RoutineStat
                    label="Planned"
                    value={formatDuration(weekStats.planned) || "0m"}
                    hint="of study time"
                  />
                  <RoutineStat
                    label="Completed"
                    value={formatDuration(weekStats.done) || "0m"}
                    hint={`${weekStats.percent}% of the plan`}
                  />
                  <RoutineStat label="Subjects" value={weekStats.subjects} hint="covered this week" />
                </div>

                <RoutinePanel bodyClassName="p-3 sm:p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setWeekStart((w) => addDays(w, -7))}
                        aria-label="Previous week"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setWeekStart((w) => addDays(w, 7))}
                        aria-label="Next week"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <span className="ml-1 font-display text-sm font-bold text-foreground">
                        {weekLabel}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-1 h-8 text-xs"
                        onClick={() => setWeekStart(startOfWeek(new Date()))}
                      >
                        This week
                      </Button>
                    </div>
                    <div className="flex min-w-[180px] flex-1 items-center gap-2 sm:max-w-xs">
                      <Progress value={weekStats.percent} className="h-2 flex-1" />
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {weekStats.percent}%
                      </span>
                    </div>
                  </div>
                </RoutinePanel>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {week.map((day) => {
                    const items = byDay.get(dateKey(day)) ?? [];
                    const planned = items.reduce((s, b) => s + b.planned_minutes, 0);
                    return (
                      <div
                        key={dateKey(day)}
                        className={cn(
                          "flex flex-col rounded-2xl border bg-card/60 p-3",
                          isToday(day) ? "border-accent" : "border-border",
                        )}
                      >
                        <div className="mb-2 flex items-baseline justify-between">
                          <div>
                            <p
                              className={cn(
                                "font-display text-[10px] font-bold uppercase tracking-[0.14em]",
                                isToday(day) ? "text-accent" : "text-muted-foreground",
                              )}
                            >
                              {WEEKDAY_LABELS[day.getDay()]} {day.getDate()}
                            </p>
                            {planned > 0 && (
                              <p className="text-[11px] text-muted-foreground">
                                {formatDuration(planned)} planned
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => openNewBlock(day)}
                            aria-label={`Add a block on ${day.toDateString()}`}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>

                        {items.length === 0 ? (
                          <button
                            type="button"
                            onClick={() => openNewBlock(day)}
                            className="flex-1 rounded-lg border border-dashed border-border/60 py-5 text-center text-[11px] text-muted-foreground transition-colors hover:border-accent/50 hover:text-accent"
                          >
                            Nothing planned
                          </button>
                        ) : (
                          <motion.ul
                            variants={staggerParent}
                            custom={staggerStep(items.length)}
                            initial="hidden"
                            animate="visible"
                            className="space-y-2"
                          >
                            <AnimatePresence initial={false}>
                              {items.map((b) => (
                                <motion.li key={b.id} variants={listItem} exit="exit" layout>
                                  <BlockCard
                                    block={b}
                                    onOpen={() => openEditBlock(b)}
                                    onComplete={() => void complete(b)}
                                    onSkip={() => void skip(b)}
                                  />
                                </motion.li>
                              ))}
                            </AnimatePresence>
                          </motion.ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </RoutineAsync>
        </TabsContent>

        <TabsContent value="calendar">
          <RoutineAsync loading={loading} error={error} loadingVariant="grid-tall" loadingRows={3}>
            {!hasAnything ? (
              <RoutineEmptyState
                icon={CalendarDays}
                title="Your calendar fills itself"
                description="Classes, study blocks, task deadlines, reminders, habits and goal deadlines all appear here automatically once they exist. One-off things like an exam or an interview are added here directly."
                actionLabel="Add an event"
                onAction={() => openNewEvent()}
                secondaryLabel="Set up your timetable"
                onSecondary={() => navigate("/routine/timetable")}
              />
            ) : (
              <div className="space-y-4">
                {/* Period controls */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-1">
                    {view !== "agenda" && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => step(-1)}
                          aria-label={view === "week" ? "Previous week" : view === "day" ? "Previous day" : "Previous month"}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => step(1)}
                          aria-label={view === "week" ? "Next week" : view === "day" ? "Next day" : "Next month"}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    <h2 className="ml-1 font-display text-base font-bold text-foreground sm:text-lg">
                      {periodLabel}
                    </h2>
                    {view !== "agenda" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-1 h-8 text-xs"
                        onClick={() => setCursor(new Date())}
                      >
                        Today
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center rounded-full border border-border p-0.5">
                    {VIEW_OPTIONS.map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setView(value)}
                        aria-pressed={view === value}
                        className={cn(
                          "inline-flex min-h-[32px] items-center gap-1.5 rounded-full px-3 text-xs transition-colors",
                          view === value
                            ? "bg-accent/15 font-semibold text-accent"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Search — narrows every view to items whose title or subtitle match. */}
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search this calendar…"
                    className="pl-9"
                  />
                  {search && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                      onClick={() => setSearch("")}
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Category filters. Icon + word, so the legend is not a colour key. */}
                <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0">
                  <div className="flex w-max items-center gap-1.5 sm:w-auto sm:flex-wrap">
                    {KIND_ORDER.map((k) => {
                      const on = !hidden.has(k);
                      return (
                        <button
                          key={k}
                          type="button"
                          onClick={() => toggleKind(k)}
                          aria-pressed={on}
                          className={cn(
                            "inline-flex min-h-[32px] items-center gap-1.5 rounded-full border px-2.5 text-xs transition-colors",
                            on
                              ? "border-accent/50 bg-accent/5 font-medium text-foreground"
                              : "border-dashed border-border text-muted-foreground line-through",
                          )}
                        >
                          <KindGlyph kind={k} />
                          {KIND_LABEL[k]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {view === "month" && (
                  <MonthView
                    days={visibleDays}
                    cursor={cursor}
                    compact={isMobile}
                    onSelectDay={setSelected}
                    onSelectItem={openItem}
                  />
                )}
                {view === "week" && (
                  <WeekView days={visibleDays} onSelectDay={setSelected} onSelectItem={openItem} onAdd={openNewEvent} />
                )}
                {view === "day" && (
                  <DayView day={visibleDays[0]} onSelectItem={openItem} onAdd={() => openNewEvent(cursor)} />
                )}
                {view === "agenda" && <AgendaView days={visibleDays} onSelectItem={openItem} />}
              </div>
            )}
          </RoutineAsync>
        </TabsContent>
      </Tabs>

      {/* The planner. Settings on the left, a live preview on the right, and
          nothing is written until the student presses the button. */}
      {planner && (
        <RoutineDialog
          open
          onOpenChange={(o) => !o && setPlanner(null)}
          title="Suggest a study plan"
          description="Built from your timetable, your deadlines and what you've already studied. Nothing is saved until you add it."
          submitLabel={
            proposal && proposal.blocks.length
              ? `Add ${proposal.blocks.length} sessions`
              : "Add plan"
          }
          onSubmit={() => void commitPlan()}
          saving={study.saving}
          canSubmit={Boolean(proposal && proposal.blocks.length > 0)}
          className="sm:max-w-2xl"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Plan ahead" hint="Days from today.">
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  min={1}
                  max={21}
                  value={planner.horizonDays}
                  onChange={(e) =>
                    setPlanner({
                      ...planner,
                      horizonDays: Math.max(1, Math.min(21, Number(e.target.value) || 1)),
                    })
                  }
                />
              )}
            </Field>
            <Field label="Session length" hint="Minutes per sitting.">
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  min={15}
                  max={180}
                  step={5}
                  value={planner.sessionMinutes}
                  onChange={(e) =>
                    setPlanner({
                      ...planner,
                      sessionMinutes: Math.max(15, Math.min(180, Number(e.target.value) || 45)),
                    })
                  }
                />
              )}
            </Field>
            <Field label="Daily cap" hint="Most study minutes on any one day.">
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  min={30}
                  max={600}
                  step={15}
                  value={planner.dailyCapMinutes}
                  onChange={(e) =>
                    setPlanner({
                      ...planner,
                      dailyCapMinutes: Math.max(30, Math.min(600, Number(e.target.value) || 120)),
                    })
                  }
                />
              )}
            </Field>
            <div className="flex items-end">
              <div className="flex w-full items-center justify-between rounded-xl border border-border px-3 py-2.5">
                <Label htmlFor="skip-weekends" className="text-xs font-semibold">
                  Skip weekends
                </Label>
                <Switch
                  id="skip-weekends"
                  checked={planner.skipWeekends}
                  onCheckedChange={(v) => setPlanner({ ...planner, skipWeekends: v })}
                />
              </div>
            </div>
            <Field label="Earliest start">
              {(id) => (
                <Input
                  id={id}
                  type="time"
                  value={planner.windowStart}
                  onChange={(e) =>
                    setPlanner({ ...planner, windowStart: e.target.value || "16:00" })
                  }
                />
              )}
            </Field>
            <Field label="Latest finish">
              {(id) => (
                <Input
                  id={id}
                  type="time"
                  value={planner.windowEnd}
                  onChange={(e) => setPlanner({ ...planner, windowEnd: e.target.value || "21:00" })}
                />
              )}
            </Field>
          </div>

          {subjects.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Subjects</Label>
              <div className="flex flex-wrap gap-1.5">
                {subjects.map((s) => {
                  const on = planner.subjects.length === 0 || planner.subjects.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        setPlanner({
                          ...planner,
                          subjects: on
                            ? (planner.subjects.length ? planner.subjects : subjects).filter(
                                (x) => x !== s,
                              )
                            : [...planner.subjects, s],
                        })
                      }
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs transition-colors",
                        on
                          ? "border-accent bg-accent/10 font-medium text-accent"
                          : "border-dashed border-border text-muted-foreground line-through",
                      )}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground">
                All of them by default. Turn one off to leave it out of this plan.
              </p>
            </div>
          )}

          {proposal && (
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="flex items-center gap-1.5 font-display text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                <Sparkles className="h-3 w-3" />
                Preview
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {describePlan(proposal.blocks)}
              </p>

              {proposal.scores.length > 0 && (
                <ul className="mt-2.5 space-y-1">
                  {proposal.scores.slice(0, 5).map((s) => (
                    <li key={s.subject} className="flex items-baseline gap-2 text-xs">
                      <span
                        className={cn(
                          "h-2 w-2 shrink-0 translate-y-px rounded-full",
                          swatch(colorForSubject(s.subject)).dot,
                        )}
                      />
                      <span className="font-medium text-foreground">{s.subject}</span>
                      <span className="text-muted-foreground">{s.reason}</span>
                    </li>
                  ))}
                </ul>
              )}

              {proposal.blocks.length > 0 && (
                <div className="mt-3 max-h-40 space-y-1 overflow-y-auto border-t border-border/60 pt-2">
                  {proposal.blocks.map((b, i) => (
                    <p
                      key={`${b.scheduled_date}-${b.scheduled_start}-${i}`}
                      className="flex items-center gap-2 text-[11px] text-muted-foreground"
                    >
                      <span className="w-24 shrink-0 tabular-nums">
                        {parseDateKey(b.scheduled_date).toLocaleDateString(undefined, {
                          weekday: "short",
                          day: "numeric",
                        })}
                      </span>
                      <span className="w-16 shrink-0 tabular-nums">
                        {formatTime(b.scheduled_start)}
                      </span>
                      <span className="truncate font-medium text-foreground">{b.subject}</span>
                      <span className="ml-auto shrink-0">{formatDuration(b.planned_minutes)}</span>
                    </p>
                  ))}
                </div>
              )}

              {proposal.blocks.length === 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Widen the window, raise the daily cap, or plan further ahead. Classes and blocks
                  you already have are treated as busy.
                </p>
              )}
            </div>
          )}
        </RoutineDialog>
      )}

      {blockDraft && (
        <RoutineDialog
          open
          onOpenChange={(o) => !o && setBlockDraft(null)}
          title={blockDraft.id ? "Edit study block" : "New study block"}
          description="Time set aside for a subject. Give it an objective and it stops being vague."
          submitLabel={blockDraft.id ? "Save changes" : "Add block"}
          onSubmit={() => void saveBlock()}
          saving={study.saving}
          canSubmit={Boolean(blockDraft.subject.trim())}
          destructive={
            blockDraft.id ? (
              <DeleteAction
                armed={blockArmed}
                onArm={() => setBlockArmed(true)}
                onConfirm={() => void removeBlockDraft()}
              />
            ) : undefined
          }
        >
          <Field label="Subject" required>
            {(id) => (
              <>
                <Input
                  id={id}
                  autoFocus
                  list="routine-subjects"
                  value={blockDraft.subject}
                  onChange={(e) => setBlockDraft({ ...blockDraft, subject: e.target.value })}
                  placeholder="Chemistry"
                />
                <datalist id="routine-subjects">
                  {subjects.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </>
            )}
          </Field>

          <FieldRow>
            <Field label="Topic">
              {(id) => (
                <Input
                  id={id}
                  value={blockDraft.topic ?? ""}
                  onChange={(e) => setBlockDraft({ ...blockDraft, topic: e.target.value })}
                  placeholder="Electromagnetism"
                />
              )}
            </Field>
            <Field label="Priority">
              {(id) => (
                <PrioritySelect
                  id={id}
                  value={blockDraft.priority}
                  onChange={(p) => setBlockDraft({ ...blockDraft, priority: p })}
                />
              )}
            </Field>
          </FieldRow>

          <Field label="Objective" hint="What you want to be able to do at the end of it.">
            {(id) => (
              <Textarea
                id={id}
                rows={2}
                value={blockDraft.objective ?? ""}
                onChange={(e) => setBlockDraft({ ...blockDraft, objective: e.target.value })}
                placeholder="Work through past-paper questions 4 to 9 without notes"
              />
            )}
          </Field>

          <FieldRow>
            <Field label="Day" required>
              {(id) => (
                <Input
                  id={id}
                  type="date"
                  value={blockDraft.scheduled_date}
                  onChange={(e) =>
                    setBlockDraft({
                      ...blockDraft,
                      scheduled_date: e.target.value || blockDraft.scheduled_date,
                    })
                  }
                />
              )}
            </Field>
            <Field label="Start time" hint="Optional. Leave empty for 'sometime that day'.">
              {(id) => (
                <Input
                  id={id}
                  type="time"
                  value={toTimeInput(blockDraft.scheduled_start)}
                  onChange={(e) =>
                    setBlockDraft({ ...blockDraft, scheduled_start: fromTimeInput(e.target.value) })
                  }
                />
              )}
            </Field>
          </FieldRow>

          <FieldRow>
            <Field label="Length" hint="Minutes.">
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  min={5}
                  max={480}
                  step={5}
                  value={blockDraft.planned_minutes}
                  onChange={(e) =>
                    setBlockDraft({
                      ...blockDraft,
                      planned_minutes: Math.max(5, Math.min(480, Number(e.target.value) || 45)),
                    })
                  }
                />
              )}
            </Field>
            <Field label="Status">
              {(id) => (
                <EnumSelect
                  id={id}
                  value={blockDraft.status}
                  onChange={(v) => setBlockDraft({ ...blockDraft, status: v })}
                  options={["planned", "in_progress", "completed", "skipped"] as StudyBlockStatus[]}
                  labels={STATUS_LABEL}
                />
              )}
            </Field>
          </FieldRow>

          {goals.goals.length > 0 && (
            <Field label="Counts towards" hint="Minutes on this block show on the goal.">
              {(id) => (
                <EnumSelect
                  id={id}
                  value={blockDraft.goal_id ?? "none"}
                  onChange={(v) => setBlockDraft({ ...blockDraft, goal_id: v === "none" ? null : v })}
                  options={["none", ...goals.goals.map((g) => g.id)]}
                  labels={{
                    none: "No goal",
                    ...Object.fromEntries(goals.goals.map((g) => [g.id, g.title])),
                  }}
                />
              )}
            </Field>
          )}
        </RoutineDialog>
      )}

      {/* Day sheet */}
      <Dialog open={selected !== null} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[46rem]">
          <DialogHeader>
            <DialogTitle className="font-display">
              {selected ? formatLongDate(selected) : ""}
            </DialogTitle>
            <DialogDescription>
              {selectedItems.length
                ? `${selectedItems.length} item${selectedItems.length === 1 ? "" : "s"} across your day.`
                : "Nothing is scheduled on this day."}
            </DialogDescription>
          </DialogHeader>

          {selectedItems.length === 0 ? (
            <div className="space-y-3 py-2">
              <p className="text-sm text-muted-foreground">
                Add a one-off event, or plan a study block for this day.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    const day = selected;
                    setSelected(null);
                    openNewEvent(day ?? undefined);
                  }}
                >
                  Add an event
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const day = selected;
                    setSelected(null);
                    setTab("study");
                    openNewBlock(day ?? undefined);
                  }}
                >
                  Plan a study block
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {KIND_ORDER.filter((k) => selectedItems.some((i) => i.kind === k)).map((k) => (
                <section key={k}>
                  <h3 className="mb-1.5 flex items-center gap-1.5 font-display text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    <KindGlyph kind={k} />
                    {KIND_LABEL[k]}
                  </h3>
                  <ul className="space-y-2">
                    {selectedItems
                      .filter((i) => i.kind === k)
                      .map((i) => (
                        <li key={i.key}>
                          <ItemRow
                            item={i}
                            onClick={
                              i.kind === "event"
                                ? () => {
                                    setSelected(null);
                                    openItem(i);
                                  }
                                : undefined
                            }
                          />
                        </li>
                      ))}
                  </ul>
                </section>
              ))}
              <Button
                size="sm"
                variant="outline"
                className="w-full gap-1.5"
                onClick={() => {
                  const day = selected;
                  setSelected(null);
                  openNewEvent(day ?? undefined);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                Add an event on this day
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {eventDraft && (
        <RoutineDialog
          open
          onOpenChange={(o) => !o && setEventDraft(null)}
          title={eventDraft.id ? "Edit event" : "Add an event"}
          description="One-off things only. Anything that repeats weekly belongs in your timetable."
          submitLabel={eventDraft.id ? "Save changes" : "Add event"}
          onSubmit={() => void saveEvent()}
          saving={eventApi.saving}
          canSubmit={Boolean(eventDraft.title.trim())}
          destructive={
            eventDraft.id ? (
              <DeleteAction
                armed={eventArmed}
                onArm={() => setEventArmed(true)}
                onConfirm={() => void removeEvent()}
              />
            ) : undefined
          }
        >
          <Field label="Title" required>
            {(id) => (
              <Input
                id={id}
                autoFocus
                value={eventDraft.title}
                onChange={(e) => setEventDraft({ ...eventDraft, title: e.target.value })}
                placeholder="Chemistry paper 2"
              />
            )}
          </Field>

          <FieldRow>
            <Field label="Category">
              {(id) => (
                <EnumSelect
                  id={id}
                  value={eventDraft.category}
                  onChange={(v) => setEventDraft({ ...eventDraft, category: v })}
                  options={EVENT_CATEGORIES}
                />
              )}
            </Field>
            <Field label="Location">
              {(id) => (
                <Input
                  id={id}
                  value={eventDraft.location ?? ""}
                  onChange={(e) => setEventDraft({ ...eventDraft, location: e.target.value })}
                  placeholder="Main hall"
                />
              )}
            </Field>
          </FieldRow>

          <FieldRow>
            <Field label="Starts" required>
              {(id) => (
                <Input
                  id={id}
                  type={eventDraft.all_day ? "date" : "datetime-local"}
                  value={
                    eventDraft.all_day
                      ? toLocalInput(eventDraft.starts_at).slice(0, 10)
                      : toLocalInput(eventDraft.starts_at)
                  }
                  onChange={(e) =>
                    setEventDraft({
                      ...eventDraft,
                      starts_at:
                        fromLocalInput(
                          eventDraft.all_day ? `${e.target.value}T00:00` : e.target.value,
                        ) ?? eventDraft.starts_at,
                    })
                  }
                />
              )}
            </Field>
            <Field label="Ends" hint="Optional. Leave empty for a single moment.">
              {(id) => (
                <Input
                  id={id}
                  type={eventDraft.all_day ? "date" : "datetime-local"}
                  value={
                    eventDraft.ends_at
                      ? eventDraft.all_day
                        ? toLocalInput(eventDraft.ends_at).slice(0, 10)
                        : toLocalInput(eventDraft.ends_at)
                      : ""
                  }
                  onChange={(e) =>
                    setEventDraft({
                      ...eventDraft,
                      ends_at: e.target.value
                        ? fromLocalInput(
                            eventDraft.all_day ? `${e.target.value}T23:59` : e.target.value,
                          )
                        : null,
                    })
                  }
                />
              )}
            </Field>
          </FieldRow>

          <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
            <div>
              <Label htmlFor="event-all-day" className="text-xs font-semibold">
                All day
              </Label>
              <p className="text-[11px] text-muted-foreground">
                For things without a clock time, like a deadline day.
              </p>
            </div>
            <Switch
              id="event-all-day"
              checked={eventDraft.all_day}
              onCheckedChange={(v) => setEventDraft({ ...eventDraft, all_day: v })}
            />
          </div>

          <Field label="Details">
            {(id) => (
              <Textarea
                id={id}
                rows={2}
                value={eventDraft.description ?? ""}
                onChange={(e) => setEventDraft({ ...eventDraft, description: e.target.value })}
                placeholder="What you need to bring or prepare"
              />
            )}
          </Field>
        </RoutineDialog>
      )}
    </RoutineShell>
  );
}

function BlockCard({
  block,
  onOpen,
  onComplete,
  onSkip,
}: {
  block: RoutineStudyBlock;
  onOpen: () => void;
  onComplete: () => void;
  onSkip: () => void;
}) {
  const s = swatch(colorForSubject(block.subject));
  const done = block.status === "completed";
  const skipped = block.status === "skipped";
  const progress = block.planned_minutes
    ? Math.min(100, Math.round((block.completed_minutes / block.planned_minutes) * 100))
    : 0;

  return (
    <div
      className={cn(
        "group rounded-xl border border-l-2 border-border bg-card/70 p-2.5 transition-colors hover:border-accent/50",
        s.rail,
        (done || skipped) && "opacity-70",
      )}
    >
      <button type="button" onClick={onOpen} className="w-full text-left">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "min-w-0 truncate text-sm font-semibold text-foreground",
              (done || skipped) && "line-through",
            )}
          >
            {block.subject}
          </p>
          {block.priority !== "low" && !done && !skipped && (
            <span
              className={cn(
                "shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase",
                PRIORITY_CLASSES[block.priority],
              )}
            >
              {block.priority}
            </span>
          )}
        </div>
        {block.topic && (
          <p className="truncate text-xs text-muted-foreground">{block.topic}</p>
        )}
        <p className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Clock className="h-3 w-3" />
            {block.scheduled_start ? formatTime(block.scheduled_start) : "Any time"}
          </span>
          <span className="tabular-nums">{formatDuration(block.planned_minutes)}</span>
          {skipped && <span className="font-medium">Skipped</span>}
        </p>
        {block.completed_minutes > 0 && !done && (
          <div className="mt-1.5 flex items-center gap-2">
            <Progress value={progress} className="h-1 flex-1" />
            <span className="text-[10px] tabular-nums text-muted-foreground">
              {formatDuration(block.completed_minutes)}
            </span>
          </div>
        )}
      </button>

      {!done && !skipped && (
        <div className="mt-2 flex items-center gap-1 border-t border-border/60 pt-1.5">
          <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-[11px]" onClick={onComplete}>
            <Check className="h-3 w-3" />
            Done
          </Button>
          <Button asChild variant="ghost" size="sm" className="h-7 gap-1 px-2 text-[11px]">
            <Link to="/routine/focus">
              <Timer className="h-3 w-3" />
              Focus
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto h-7 w-7 text-muted-foreground"
            title="Skip this session"
            onClick={onSkip}
          >
            <SkipForward className="h-3 w-3" />
            <span className="sr-only">Skip {block.subject}</span>
          </Button>
        </div>
      )}
    </div>
  );
}

interface DayBucket {
  day: Date;
  items: AgendaItem[];
}

/**
 * The month grid.
 *
 * Always six rows, so navigating months never jumps the page height. On a phone
 * each cell degrades to a date plus icon indicators rather than shrunken chips
 * nobody can read, and tapping the cell opens the day sheet, which is where the
 * detail actually belongs at that width.
 */
function MonthView({
  days,
  cursor,
  compact,
  onSelectDay,
  onSelectItem,
}: {
  days: DayBucket[];
  cursor: Date;
  compact: boolean;
  onSelectDay: (d: Date) => void;
  onSelectItem: (i: AgendaItem) => void;
}) {
  return (
    <RoutinePanel bodyClassName="p-2 sm:p-3">
      <div className="grid grid-cols-7 gap-1">
        {[1, 2, 3, 4, 5, 6, 0].map((d) => (
          <div
            key={d}
            className="pb-1 text-center font-display text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground"
          >
            {WEEKDAY_LABELS[d]}
          </div>
        ))}

        {days.map(({ day, items }) => {
          const outside = day.getMonth() !== cursor.getMonth();
          const today = isToday(day);
          const shown = compact ? [] : items.slice(0, 3);
          const extra = items.length - shown.length;
          return (
            <button
              key={dateKey(day)}
              type="button"
              onClick={() => onSelectDay(day)}
              className={cn(
                "flex min-h-[64px] flex-col rounded-lg border p-1 text-left transition-colors sm:min-h-[104px]",
                outside ? "border-transparent opacity-40" : "border-border/60 hover:border-accent/50",
                today && "border-accent bg-accent/5",
              )}
            >
              <span
                className={cn(
                  "mb-1 self-end px-0.5 text-[11px] tabular-nums",
                  today ? "font-bold text-accent" : "text-muted-foreground",
                )}
              >
                {day.getDate()}
              </span>

              {compact ? (
                <DayIndicators items={items} />
              ) : (
                <div className="w-full space-y-0.5">
                  {shown.map((item) => (
                    <ItemChip
                      key={item.key}
                      item={item}
                      onClick={() => onSelectItem(item)}
                      showTime={false}
                    />
                  ))}
                  {extra > 0 && (
                    <span className="block px-1 text-[10px] font-semibold text-muted-foreground">
                      +{extra} more
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </RoutinePanel>
  );
}

/** The week as seven day columns. Denser than the month, still not a time grid. */
function WeekView({
  days,
  onSelectDay,
  onSelectItem,
  onAdd,
}: {
  days: DayBucket[];
  onSelectDay: (d: Date) => void;
  onSelectItem: (i: AgendaItem) => void;
  onAdd: (d: Date) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
      {days.map(({ day, items }) => (
        <div
          key={dateKey(day)}
          className={cn(
            "flex flex-col rounded-xl border bg-card/60 p-2",
            isToday(day) ? "border-accent" : "border-border",
          )}
        >
          <button
            type="button"
            onClick={() => onSelectDay(day)}
            className="mb-2 flex items-baseline justify-between px-1 text-left"
          >
            <span
              className={cn(
                "font-display text-[10px] font-bold uppercase tracking-[0.12em]",
                isToday(day) ? "text-accent" : "text-muted-foreground",
              )}
            >
              {WEEKDAY_LABELS[day.getDay()]}
            </span>
            <span
              className={cn(
                "text-sm font-bold tabular-nums",
                isToday(day) ? "text-accent" : "text-foreground",
              )}
            >
              {day.getDate()}
            </span>
          </button>

          {items.length === 0 ? (
            <button
              type="button"
              onClick={() => onAdd(day)}
              className="flex-1 rounded-lg border border-dashed border-border/60 py-4 text-center text-[11px] text-muted-foreground transition-colors hover:border-accent/50 hover:text-accent"
            >
              Nothing yet
            </button>
          ) : (
            <div className="space-y-1">
              {items.map((item) => (
                <ItemChip key={item.key} item={item} onClick={() => onSelectItem(item)} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/** A single day, hour by hour — the zoomed-in view when "what's at 3pm" is the question. */
function DayView({
  day,
  onSelectItem,
  onAdd,
}: {
  day?: DayBucket;
  onSelectItem: (i: AgendaItem) => void;
  onAdd: () => void;
}) {
  const items = day?.items ?? [];
  const allDay = items.filter((i) => i.allDay);
  const timed = items.filter((i) => !i.allDay);
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const forHour = (h: number) => timed.filter((i) => i.start.getHours() === h);

  if (items.length === 0) {
    return (
      <RoutinePanel>
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-sm text-muted-foreground">Nothing scheduled on this day.</p>
          <Button size="sm" variant="outline" onClick={onAdd} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Add an event
          </Button>
        </div>
      </RoutinePanel>
    );
  }

  return (
    <div className="space-y-3">
      {allDay.length > 0 && (
        <RoutinePanel bodyClassName="space-y-1.5 p-2">
          {allDay.map((item) => (
            <ItemRow key={item.key} item={item} onClick={() => onSelectItem(item)} />
          ))}
        </RoutinePanel>
      )}
      <RoutinePanel bodyClassName="divide-y divide-border/60 p-0">
        {hours.map((h) => {
          const hourItems = forHour(h);
          return (
            <div key={h} className="flex gap-3 px-3 py-2">
              <span className="w-14 shrink-0 pt-1 text-xs tabular-nums text-muted-foreground">
                {h.toString().padStart(2, "0")}:00
              </span>
              <div className="min-w-0 flex-1 space-y-1.5">
                {hourItems.map((item) => (
                  <ItemRow key={item.key} item={item} onClick={() => onSelectItem(item)} />
                ))}
              </div>
            </div>
          );
        })}
      </RoutinePanel>
    </div>
  );
}

/** A running list of the days that actually have something on them. */
function AgendaView({
  days,
  onSelectItem,
}: {
  days: DayBucket[];
  onSelectItem: (i: AgendaItem) => void;
}) {
  const filled = days.filter((d) => d.items.length > 0);

  if (filled.length === 0) {
    return (
      <RoutinePanel>
        <p className="py-8 text-center text-sm text-muted-foreground">
          Nothing scheduled in the next six weeks with the current filters.
        </p>
      </RoutinePanel>
    );
  }

  return (
    <motion.div
      variants={staggerParent}
      custom={staggerStep(filled.length)}
      initial="hidden"
      animate="visible"
      className="space-y-4"
    >
      <AnimatePresence initial={false}>
        {filled.map(({ day, items }) => (
          <motion.section key={dateKey(day)} variants={listItem} exit="exit" layout>
            <div className="mb-2 flex items-baseline gap-2">
              <h3
                className={cn(
                  "font-display text-sm font-bold",
                  isToday(day) ? "text-accent" : "text-foreground",
                )}
              >
                {isToday(day) ? "Today" : formatLongDate(day)}
              </h3>
              <span className="text-xs text-muted-foreground">
                {items.length} item{items.length === 1 ? "" : "s"}
              </span>
            </div>
            <ul className="space-y-2">
              {items.map((item) => (
                <li key={item.key}>
                  <ItemRow
                    item={item}
                    onClick={item.kind === "event" ? () => onSelectItem(item) : undefined}
                  />
                </li>
              ))}
            </ul>
          </motion.section>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
