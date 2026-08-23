import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpenCheck,
  CalendarClock,
  CheckSquare,
  Columns3,
  Flag,
  List,
  Plus,
  Repeat,
  Search,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  toLocalInput,
} from "@/components/routine/RoutineForm";
import { useTaskActions } from "@/components/routine/tasks/useTaskActions";
import { useRoutineGoals } from "@/hooks/routine/useRoutineData";
import { useTaskOrigins, type TaskOrigin } from "@/hooks/routine/useTaskOrigins";
import { PRIORITY_CLASSES } from "@/lib/routine/colors";
import {
  addDays,
  daysBetween,
  endOfDay,
  formatClock,
  formatDuration,
  relativeDayLabel,
  startOfDay,
} from "@/lib/routine/dates";
import { listItem, staggerParent, staggerStep } from "@/lib/motion";
import {
  TASK_CATEGORIES,
  type NewRoutineTask,
  type Priority,
  type RoutineTask,
  type TaskRecurrence,
  type TaskStatus,
} from "@/lib/routine/types";

/**
 * Tasks: general productivity, and the one page in Routine that is a task
 * manager on purpose.
 *
 * It is deliberately broader than Study Planner (which decides what to *study*,
 * in sessions) and narrower than Reminders (which is a nudge at a moment, not a
 * piece of work). A row here is a discrete thing to finish: it can carry a
 * deadline, an estimate, a priority, a category and a link to a goal, and it can
 * repeat.
 *
 * Two views over the same rows, because the two real modes of use are different
 * questions. The list answers "what is due and when", grouped by deadline. The
 * board answers "what is in flight", grouped by status. Neither stores anything
 * the other doesn't see: both call the same `useTaskActions`.
 */

const DEFAULT_TASK: NewRoutineTask = {
  title: "",
  description: null,
  due_at: null,
  priority: "medium",
  category: "general",
  status: "todo",
  estimated_minutes: null,
  recurrence: "none",
  goal_id: null,
  completed_at: null,
};

const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
};

const STATUS_ORDER: TaskStatus[] = ["todo", "in_progress", "done"];

const RECURRENCE_OPTIONS: TaskRecurrence[] = ["none", "daily", "weekly", "monthly"];

type Filter = "open" | "today" | "week" | "overdue" | "done" | "all";

const FILTER_LABEL: Record<Filter, string> = {
  open: "Open",
  today: "Today",
  week: "This week",
  overdue: "Overdue",
  done: "Done",
  all: "All",
};

interface Draft extends NewRoutineTask {
  id?: string;
}

export default function Tasks() {
  const {
    tasks,
    loading,
    error,
    refetch,
    saving,
    createTask,
    updateTask,
    toggleDone,
    moveTo,
    convertToStudyBlock,
    deleteTask,
  } = useTaskActions();
  const { goals } = useRoutineGoals();
  const isMobile = useIsMobile();

  const [view, setView] = useState<"list" | "board">("list");
  const [filter, setFilter] = useState<Filter>("open");
  const [query, setQuery] = useState("");
  const [quick, setQuick] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [armed, setArmed] = useState(false);

  const now = useMemo(() => new Date(), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const todayEnd = endOfDay(now);
    const weekEnd = endOfDay(addDays(startOfDay(now), 7));
    return tasks
      .filter((t) => {
        if (q && !`${t.title} ${t.description ?? ""}`.toLowerCase().includes(q)) return false;
        const due = t.due_at ? new Date(t.due_at) : null;
        switch (filter) {
          case "open":
            return t.status !== "done";
          case "done":
            return t.status === "done";
          case "today":
            return t.status !== "done" && due !== null && due <= todayEnd;
          case "week":
            return t.status !== "done" && due !== null && due <= weekEnd;
          case "overdue":
            return t.status !== "done" && due !== null && due < now;
          default:
            return true;
        }
      })
      .sort(sortTasks);
  }, [tasks, filter, query, now]);

  const counts = useMemo(() => {
    const open = tasks.filter((t) => t.status !== "done");
    const overdue = open.filter((t) => t.due_at && new Date(t.due_at) < now);
    const todayEnd = endOfDay(now);
    const dueToday = open.filter(
      (t) => t.due_at && new Date(t.due_at) <= todayEnd && new Date(t.due_at) >= startOfDay(now),
    );
    const doneThisWeek = tasks.filter(
      (t) =>
        t.status === "done" &&
        t.completed_at &&
        daysBetween(new Date(t.completed_at), now) <= 7 &&
        daysBetween(new Date(t.completed_at), now) >= 0,
    );
    return {
      open: open.length,
      overdue: overdue.length,
      dueToday: dueToday.length,
      doneThisWeek: doneThisWeek.length,
    };
  }, [tasks, now]);

  /** Due-date buckets for the list view. Undated work sinks to the bottom. */
  const groups = useMemo(() => {
    const buckets: { label: string; tone: "danger" | "accent" | "muted"; items: RoutineTask[] }[] = [
      { label: "Overdue", tone: "danger", items: [] },
      { label: "Today", tone: "accent", items: [] },
      { label: "Tomorrow", tone: "muted", items: [] },
      { label: "This week", tone: "muted", items: [] },
      { label: "Later", tone: "muted", items: [] },
      { label: "No deadline", tone: "muted", items: [] },
      { label: "Completed", tone: "muted", items: [] },
    ];
    const index = new Map(buckets.map((b, i) => [b.label, i]));
    for (const t of filtered) {
      if (t.status === "done") {
        buckets[index.get("Completed")!].items.push(t);
        continue;
      }
      if (!t.due_at) {
        buckets[index.get("No deadline")!].items.push(t);
        continue;
      }
      const due = new Date(t.due_at);
      const delta = daysBetween(now, due);
      if (due < now) buckets[index.get("Overdue")!].items.push(t);
      else if (delta === 0) buckets[index.get("Today")!].items.push(t);
      else if (delta === 1) buckets[index.get("Tomorrow")!].items.push(t);
      else if (delta <= 7) buckets[index.get("This week")!].items.push(t);
      else buckets[index.get("Later")!].items.push(t);
    }
    return buckets.filter((b) => b.items.length > 0);
  }, [filtered, now]);

  const goalTitle = (id: string | null) =>
    id ? (goals.find((g) => g.id === id)?.title ?? null) : null;

  // A task accepted from a team objective is written here by Communications, so
  // without this it would appear in the list with no explanation of its origin.
  const origins = useTaskOrigins();

  const openNew = (status: TaskStatus = "todo") => {
    setArmed(false);
    setDraft({ ...DEFAULT_TASK, status });
  };

  const openEdit = (t: RoutineTask) => {
    setArmed(false);
    setDraft({
      id: t.id,
      title: t.title,
      description: t.description,
      due_at: t.due_at,
      priority: t.priority,
      category: t.category,
      status: t.status,
      estimated_minutes: t.estimated_minutes,
      recurrence: t.recurrence,
      goal_id: t.goal_id,
      completed_at: t.completed_at,
    });
  };

  const submitQuick = async () => {
    const title = quick.trim();
    if (!title) return;
    setQuick("");
    await createTask({ ...DEFAULT_TASK, title });
  };

  const save = async () => {
    if (!draft) return;
    const { id, ...payload } = draft;
    const clean: NewRoutineTask = {
      ...payload,
      title: payload.title.trim(),
      description: payload.description?.trim() || null,
    };
    if (id) await updateTask({ id, patch: clean });
    else await createTask(clean);
    setDraft(null);
  };

  const removeDraft = async () => {
    if (!draft?.id) return;
    const target = tasks.find((t) => t.id === draft.id);
    if (target) await deleteTask(target);
    setDraft(null);
  };

  const effectiveView = isMobile ? "list" : view;

  return (
    <RoutineShell
      title="Tasks"
      purpose="Everything that needs doing, with deadlines and priorities."
      icon={CheckSquare}
      path="/routine/tasks"
      actions={
        <>
          {!isMobile && (
            <div className="flex items-center rounded-full border border-border p-0.5">
              <Toggle
                active={view === "list"}
                onClick={() => setView("list")}
                icon={List}
                label="List"
              />
              <Toggle
                active={view === "board"}
                onClick={() => setView("board")}
                icon={Columns3}
                label="Board"
              />
            </div>
          )}
          <Button size="sm" className="gap-1.5" onClick={() => openNew()}>
            <Plus className="h-4 w-4" />
            New task
          </Button>
        </>
      }
    >
      <RoutineAsync loading={loading} error={error} onRetry={refetch} loadingRows={5}>
        {tasks.length === 0 ? (
          <RoutineEmptyState
            icon={CheckSquare}
            title="Nothing on your list yet"
            description="Tasks are the discrete things you have to finish: an essay, a form, a reading. Give one a deadline and it shows up on Today and in your calendar automatically."
            actionLabel="Add your first task"
            onAction={() => openNew()}
          />
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <RoutineStat label="Open" value={counts.open} />
              <RoutineStat
                label="Due today"
                value={counts.dueToday}
                hint={counts.dueToday === 0 ? "Nothing due" : undefined}
              />
              <RoutineStat
                label="Overdue"
                value={counts.overdue}
                className={counts.overdue > 0 ? "border-destructive/40 bg-destructive/5" : undefined}
              />
              <RoutineStat label="Done" value={counts.doneThisWeek} hint="in the last 7 days" />
            </div>

            {/* Capture bar. Typing a title and pressing enter is the fast path;
                the dialog is for when the details actually matter. */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <form
                className="relative flex-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  void submitQuick();
                }}
              >
                <Plus className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={quick}
                  onChange={(e) => setQuick(e.target.value)}
                  placeholder="Add a task and press Enter"
                  className="pl-9"
                  aria-label="Add a task"
                />
              </form>
              <div className="relative sm:w-56">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search"
                  className="pl-9"
                  aria-label="Search tasks"
                />
              </div>
            </div>

            <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0">
              <div className="flex w-max items-center gap-1.5 sm:w-auto sm:flex-wrap">
                {(Object.keys(FILTER_LABEL) as Filter[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    aria-pressed={filter === f}
                    className={cn(
                      "inline-flex min-h-[32px] items-center rounded-full border px-3 text-xs transition-colors",
                      filter === f
                        ? "border-accent bg-accent/10 font-semibold text-accent"
                        : "border-border text-muted-foreground hover:border-accent/50 hover:text-foreground",
                    )}
                  >
                    {FILTER_LABEL[f]}
                  </button>
                ))}
              </div>
            </div>

            {filtered.length === 0 ? (
              <RoutinePanel>
                <p className="py-6 text-center text-sm text-muted-foreground">
                  {query.trim()
                    ? `Nothing matches "${query.trim()}".`
                    : `No tasks in ${FILTER_LABEL[filter].toLowerCase()}.`}
                </p>
              </RoutinePanel>
            ) : effectiveView === "list" ? (
              <div className="space-y-4">
                {groups.map((g) => (
                  <RoutinePanel
                    key={g.label}
                    title={g.label}
                    description={`${g.items.length} task${g.items.length === 1 ? "" : "s"}`}
                    className={g.tone === "danger" ? "border-destructive/40" : undefined}
                    bodyClassName="p-3 sm:p-3"
                  >
                    <motion.ul
                      variants={staggerParent}
                      custom={staggerStep(g.items.length)}
                      initial="hidden"
                      animate="visible"
                      className="space-y-2"
                    >
                      <AnimatePresence initial={false}>
                        {g.items.map((t) => (
                          <motion.li key={t.id} variants={listItem} exit="exit" layout>
                            <TaskRow
                              task={t}
                              goal={goalTitle(t.goal_id)}
                              origin={origins.get(t.id)}
                              now={now}
                              onToggle={() => void toggleDone(t)}
                              onOpen={() => openEdit(t)}
                              onStudy={() => void convertToStudyBlock(t)}
                            />
                          </motion.li>
                        ))}
                      </AnimatePresence>
                    </motion.ul>
                  </RoutinePanel>
                ))}
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-3">
                {STATUS_ORDER.map((status) => {
                  const items = filtered.filter((t) => t.status === status);
                  return (
                    <RoutinePanel
                      key={status}
                      title={STATUS_LABEL[status]}
                      description={`${items.length} task${items.length === 1 ? "" : "s"}`}
                      actions={
                        status !== "done" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1 px-2 text-xs"
                            onClick={() => openNew(status)}
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add
                          </Button>
                        ) : undefined
                      }
                      bodyClassName="p-3 sm:p-3"
                    >
                      {items.length === 0 ? (
                        <p className="px-1 py-6 text-center text-sm text-muted-foreground">
                          Nothing here.
                        </p>
                      ) : (
                        <ul className="space-y-2">
                          <AnimatePresence initial={false}>
                            {items.map((t) => (
                              <motion.li key={t.id} variants={listItem} initial="hidden" animate="visible" exit="exit" layout>
                                <BoardCard
                                  task={t}
                                  goal={goalTitle(t.goal_id)}
                                  origin={origins.get(t.id)}
                                  now={now}
                                  onOpen={() => openEdit(t)}
                                  onMove={(s) => void moveTo(t, s)}
                                />
                              </motion.li>
                            ))}
                          </AnimatePresence>
                        </ul>
                      )}
                    </RoutinePanel>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </RoutineAsync>

      {draft && (
        <RoutineDialog
          open
          onOpenChange={(o) => !o && setDraft(null)}
          title={draft.id ? "Edit task" : "New task"}
          submitLabel={draft.id ? "Save changes" : "Add task"}
          onSubmit={() => void save()}
          saving={saving}
          canSubmit={Boolean(draft.title.trim())}
          destructive={
            draft.id ? (
              <DeleteAction
                armed={armed}
                onArm={() => setArmed(true)}
                onConfirm={() => void removeDraft()}
              />
            ) : undefined
          }
        >
          <Field label="Title" required>
            {(id) => (
              <Input
                id={id}
                autoFocus
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="Finish the chemistry write-up"
              />
            )}
          </Field>

          <Field label="Notes">
            {(id) => (
              <Textarea
                id={id}
                rows={2}
                value={draft.description ?? ""}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="Anything you need to remember about it"
              />
            )}
          </Field>

          <FieldRow>
            <Field label="Due" hint="Leave empty for something with no deadline.">
              {(id) => (
                <Input
                  id={id}
                  type="datetime-local"
                  value={toLocalInput(draft.due_at)}
                  onChange={(e) => setDraft({ ...draft, due_at: fromLocalInput(e.target.value) })}
                />
              )}
            </Field>
            <Field label="Priority">
              {(id) => (
                <PrioritySelect
                  id={id}
                  value={draft.priority}
                  onChange={(p) => setDraft({ ...draft, priority: p })}
                />
              )}
            </Field>
          </FieldRow>

          <FieldRow>
            <Field label="Category">
              {(id) => (
                <EnumSelect
                  id={id}
                  value={draft.category}
                  onChange={(v) => setDraft({ ...draft, category: v })}
                  options={TASK_CATEGORIES}
                />
              )}
            </Field>
            <Field label="Repeats">
              {(id) => (
                <EnumSelect
                  id={id}
                  value={draft.recurrence}
                  onChange={(v) => setDraft({ ...draft, recurrence: v })}
                  options={RECURRENCE_OPTIONS}
                  labels={{ none: "Doesn't repeat" }}
                />
              )}
            </Field>
          </FieldRow>

          <FieldRow>
            <Field label="Estimate" hint="Minutes. Used when you turn this into a study block.">
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  min={0}
                  step={5}
                  value={draft.estimated_minutes ?? ""}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      estimated_minutes: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  placeholder="45"
                />
              )}
            </Field>
            <Field label="Status">
              {(id) => (
                <EnumSelect
                  id={id}
                  value={draft.status}
                  onChange={(v) => setDraft({ ...draft, status: v })}
                  options={STATUS_ORDER}
                  labels={STATUS_LABEL}
                />
              )}
            </Field>
          </FieldRow>

          {goals.length > 0 && (
            <Field label="Counts towards" hint="Linked tasks move the goal's progress on their own.">
              {(id) => (
                <EnumSelect
                  id={id}
                  value={draft.goal_id ?? "none"}
                  onChange={(v) => setDraft({ ...draft, goal_id: v === "none" ? null : v })}
                  options={["none", ...goals.map((g) => g.id)]}
                  labels={{
                    none: "No goal",
                    ...Object.fromEntries(goals.map((g) => [g.id, g.title])),
                  }}
                />
              )}
            </Field>
          )}
        </RoutineDialog>
      )}
    </RoutineShell>
  );
}

/** Open before done; then by deadline; then by priority; then alphabetically. */
function sortTasks(a: RoutineTask, b: RoutineTask): number {
  if ((a.status === "done") !== (b.status === "done")) return a.status === "done" ? 1 : -1;
  const ad = a.due_at ? new Date(a.due_at).getTime() : Infinity;
  const bd = b.due_at ? new Date(b.due_at).getTime() : Infinity;
  if (ad !== bd) return ad - bd;
  const rank: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
  if (rank[a.priority] !== rank[b.priority]) return rank[a.priority] - rank[b.priority];
  return a.title.localeCompare(b.title);
}

function Toggle({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex min-h-[32px] items-center gap-1.5 rounded-full px-3 text-xs transition-colors",
        active
          ? "bg-accent/15 font-semibold text-accent"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function DueLabel({ task, now }: { task: RoutineTask; now: Date }) {
  if (!task.due_at) return null;
  const due = new Date(task.due_at);
  const late = task.status !== "done" && due < now;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 tabular-nums",
        late ? "font-semibold text-destructive" : "text-muted-foreground",
      )}
    >
      <CalendarClock className="h-3 w-3" />
      {relativeDayLabel(due, now)} {formatClock(due)}
    </span>
  );
}

function TaskRow({
  task,
  goal,
  origin,
  now,
  onToggle,
  onOpen,
  onStudy,
}: {
  task: RoutineTask;
  goal: string | null;
  origin?: TaskOrigin;
  now: Date;
  onToggle: () => void;
  onOpen: () => void;
  onStudy: () => void;
}) {
  const done = task.status === "done";
  return (
    <div className="group flex items-start gap-3 rounded-xl border border-border bg-card/60 p-3 transition-colors hover:border-accent/50">
      <Checkbox
        checked={done}
        onCheckedChange={onToggle}
        className="mt-0.5 h-5 w-5 shrink-0"
        aria-label={done ? `Reopen ${task.title}` : `Complete ${task.title}`}
      />
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <div className="flex flex-wrap items-center gap-2">
          <p
            className={cn(
              "min-w-0 text-sm font-medium text-foreground",
              done && "text-muted-foreground line-through",
            )}
          >
            {task.title}
          </p>
          {task.priority !== "low" && !done && (
            <span
              className={cn(
                "shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                PRIORITY_CLASSES[task.priority],
              )}
            >
              {task.priority}
            </span>
          )}
          {task.recurrence !== "none" && (
            <span
              title={`Repeats ${task.recurrence}`}
              className="shrink-0 text-muted-foreground"
            >
              <Repeat className="h-3 w-3" />
            </span>
          )}
        </div>
        {task.description && (
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{task.description}</p>
        )}
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
          <DueLabel task={task} now={now} />
          {task.estimated_minutes ? (
            <span className="text-muted-foreground">{formatDuration(task.estimated_minutes)}</span>
          ) : null}
          {task.category !== "general" && (
            <span className="text-muted-foreground">{task.category}</span>
          )}
          {goal && (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Flag className="h-3 w-3" />
              {goal}
            </span>
          )}
        </p>
      </button>
      {origin && <OriginChip origin={origin} />}
      {!done && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
          title="Plan a study block for this"
          onClick={onStudy}
        >
          <BookOpenCheck className="h-3.5 w-3.5" />
          <span className="sr-only">Plan a study block for {task.title}</span>
        </Button>
      )}
    </div>
  );
}

/**
 * "This came from a team objective."
 *
 * A link rather than a label, and rendered as a sibling of the row's open
 * button rather than inside it, because a link inside a button is invalid and
 * because the two destinations are genuinely different: the row opens the task,
 * this opens the commitment the task exists to satisfy.
 */
function OriginChip({ origin }: { origin: TaskOrigin }) {
  return (
    <Link
      to="/communications/objectives"
      onClick={(e) => e.stopPropagation()}
      title={
        origin.teamName
          ? `From an objective in ${origin.teamName}`
          : "From an objective you accepted"
      }
      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-accent/40 bg-accent/10 px-1.5 py-0.5 text-[10px] font-semibold text-accent transition-colors hover:bg-accent/20"
    >
      <Target className="h-3 w-3" />
      <span className="max-w-[9rem] truncate">{origin.teamName ?? "Objective"}</span>
    </Link>
  );
}

/**
 * A board card.
 *
 * Movement is explicit buttons rather than drag-and-drop: dragging is
 * unreliable on touch without a large dependency, and `MobileMotionGate` turns
 * animation off on mobile entirely, so a drag affordance would be the one
 * interaction in Routine that quietly stops working on a phone.
 */
function BoardCard({
  task,
  goal,
  origin,
  now,
  onOpen,
  onMove,
}: {
  task: RoutineTask;
  goal: string | null;
  origin?: TaskOrigin;
  now: Date;
  onOpen: () => void;
  onMove: (status: TaskStatus) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-3 transition-colors hover:border-accent/50">
      <button type="button" onClick={onOpen} className="w-full text-left">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "text-sm font-medium text-foreground",
              task.status === "done" && "text-muted-foreground line-through",
            )}
          >
            {task.title}
          </p>
          {task.priority !== "low" && (
            <span
              className={cn(
                "shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                PRIORITY_CLASSES[task.priority],
              )}
            >
              {task.priority}
            </span>
          )}
        </div>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
          <DueLabel task={task} now={now} />
          {goal && (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Flag className="h-3 w-3" />
              {goal}
            </span>
          )}
        </p>
      </button>
      {origin && (
        <div className="mt-1.5">
          <OriginChip origin={origin} />
        </div>
      )}
      <div className="mt-2.5 flex items-center gap-1 border-t border-border/60 pt-2">
        {STATUS_ORDER.filter((s) => s !== task.status).map((s) => (
          <Button
            key={s}
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[11px]"
            onClick={() => onMove(s)}
          >
            {s === "done" ? "Complete" : `Move to ${STATUS_LABEL[s].toLowerCase()}`}
          </Button>
        ))}
      </div>
    </div>
  );
}
