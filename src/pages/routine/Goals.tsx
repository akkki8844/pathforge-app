import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarClock,
  Check,
  CheckSquare,
  ChevronDown,
  Flag,
  Plus,
  Target,
  Timer,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { RoutineShell, RoutinePanel, RoutineStat } from "@/components/routine/RoutineShell";
import { RoutineAsync, RoutineEmptyState } from "@/components/routine/RoutineStates";
import {
  DeleteAction,
  EnumSelect,
  Field,
  FieldRow,
  PrioritySelect,
  RoutineDialog,
} from "@/components/routine/RoutineForm";
import { useRoutineSources } from "@/hooks/routine/useRoutineData";
import { goalProgress } from "@/lib/routine/derive";
import { PRIORITY_CLASSES } from "@/lib/routine/colors";
import { dateKey, formatDuration, formatShortDate, parseDateKey } from "@/lib/routine/dates";
import { listItem, staggerParent, staggerStep, transition } from "@/lib/motion";
import {
  GOAL_CATEGORIES,
  type GoalStatus,
  type NewRoutineGoal,
  type RoutineGoal,
  type RoutineGoalMilestone,
} from "@/lib/routine/types";

/**
 * Goals: the long-term outcomes everything else is in service of.
 *
 * The failure mode this page is designed against is becoming another task list.
 * A goal is not a thing you tick; it is a destination with a date, broken into
 * milestones, that other parts of Routine push forward on their own. So:
 *
 *   * Progress is **derived, never stored**. `goalProgress()` reads milestones,
 *     linked tasks and linked study minutes. Completing a task on the Tasks page
 *     moves the bar here without either page writing to the other, because both
 *     read the same query cache.
 *   * The one exception is the manual override, for goals arithmetic genuinely
 *     cannot see ("reach 90% in Biology"). It is opt-in and clearly labelled as
 *     the student's own number rather than a computed one.
 *   * Milestones live inside the goal, not in Tasks, because they are the
 *     student's breakdown of the destination — not scheduled work.
 */

const STATUSES: GoalStatus[] = ["active", "completed", "paused", "archived"];

const DEFAULT_GOAL: NewRoutineGoal = {
  title: "",
  description: null,
  category: "academic",
  target_date: null,
  priority: "medium",
  status: "active",
  progress_override: null,
  completed_at: null,
};

interface Draft extends NewRoutineGoal {
  id?: string;
}

export default function Goals() {
  const { sources, loading, error, goals: api, study } = useRoutineSources();
  const [filter, setFilter] = useState<GoalStatus | "all">("active");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [armed, setArmed] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [newMilestone, setNewMilestone] = useState("");

  const now = useMemo(() => new Date(), []);

  const withProgress = useMemo(
    () =>
      api.goals.map((g) => ({
        goal: g,
        progress: goalProgress(g, api.milestones, sources.tasks ?? [], study.studyBlocks, now),
      })),
    [api.goals, api.milestones, sources.tasks, study.studyBlocks, now],
  );

  const visible = useMemo(
    () =>
      withProgress
        .filter((x) => filter === "all" || x.goal.status === filter)
        .sort((a, b) => {
          const rank: Record<GoalStatus, number> = {
            active: 0,
            paused: 1,
            completed: 2,
            archived: 3,
          };
          if (rank[a.goal.status] !== rank[b.goal.status]) {
            return rank[a.goal.status] - rank[b.goal.status];
          }
          const ad = a.progress.daysRemaining ?? Infinity;
          const bd = b.progress.daysRemaining ?? Infinity;
          return ad - bd;
        }),
    [withProgress, filter],
  );

  const summary = useMemo(() => {
    const active = withProgress.filter((x) => x.goal.status === "active");
    const avg = active.length
      ? Math.round(active.reduce((s, x) => s + x.progress.percent, 0) / active.length)
      : 0;
    const dueSoon = active.filter(
      (x) => x.progress.daysRemaining !== null && x.progress.daysRemaining <= 30,
    ).length;
    const behind = active.filter((x) => x.progress.overdueMilestones.length > 0).length;
    return {
      active: active.length,
      avg,
      dueSoon,
      behind,
      completed: withProgress.filter((x) => x.goal.status === "completed").length,
    };
  }, [withProgress]);

  const openNew = () => {
    setArmed(false);
    setDraft({ ...DEFAULT_GOAL });
  };

  const openEdit = (g: RoutineGoal) => {
    setArmed(false);
    setDraft({
      id: g.id,
      title: g.title,
      description: g.description,
      category: g.category,
      target_date: g.target_date,
      priority: g.priority,
      status: g.status,
      progress_override: g.progress_override,
      completed_at: g.completed_at,
    });
  };

  const save = async () => {
    if (!draft) return;
    const { id, ...payload } = draft;
    const clean: NewRoutineGoal = {
      ...payload,
      title: payload.title.trim(),
      description: payload.description?.trim() || null,
      completed_at:
        payload.status === "completed" ? (payload.completed_at ?? new Date().toISOString()) : null,
    };
    try {
      if (id) await api.updateGoal({ id, patch: clean });
      else await api.createGoal(clean);
      setDraft(null);
    } catch (err) {
      toast.error("Couldn't save that goal", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    }
  };

  const removeDraft = async () => {
    if (!draft?.id) return;
    try {
      await api.deleteGoal(draft.id);
      setDraft(null);
      toast.success("Goal deleted");
    } catch (err) {
      toast.error("Couldn't delete that goal", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    }
  };

  const addMilestone = async (goalId: string) => {
    const title = newMilestone.trim();
    if (!title) return;
    const existing = api.milestones.filter((m) => m.goal_id === goalId);
    setNewMilestone("");
    try {
      await api.createMilestone({
        goal_id: goalId,
        title,
        due_date: null,
        is_complete: false,
        completed_at: null,
        sort_order: existing.length,
      });
    } catch (err) {
      toast.error("Couldn't add that milestone", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    }
  };

  return (
    <RoutineShell
      title="Goals"
      purpose="Where all of this is going, and how far along you are."
      icon={Flag}
      path="/routine/goals"
      actions={
        <Button size="sm" className="gap-1.5" onClick={openNew}>
          <Plus className="h-4 w-4" />
          New goal
        </Button>
      }
    >
      <RoutineAsync
        loading={loading}
        error={error}
        loadingVariant="grid-tall"
        loadingRows={3}
      >
        {api.goals.length === 0 ? (
          <RoutineEmptyState
            icon={Flag}
            title="Name the thing you're working towards"
            description="A goal is an outcome, not a chore: a grade, an application, a skill. Break it into milestones and link tasks or study blocks to it, and the progress here moves on its own as you work."
            actionLabel="Set your first goal"
            onAction={openNew}
          />
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <RoutineStat label="Active" value={summary.active} />
              <RoutineStat label="Average progress" value={`${summary.avg}%`} hint="across active goals" />
              <RoutineStat
                label="Due within a month"
                value={summary.dueSoon}
                hint={summary.dueSoon === 0 ? "Nothing imminent" : undefined}
              />
              <RoutineStat
                label="Behind"
                value={summary.behind}
                hint="with a missed milestone"
                className={summary.behind > 0 ? "border-destructive/40 bg-destructive/5" : undefined}
              />
            </div>

            <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0">
              <div className="flex w-max items-center gap-1.5 sm:w-auto sm:flex-wrap">
                {(["active", "paused", "completed", "archived", "all"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    aria-pressed={filter === f}
                    className={cn(
                      "inline-flex min-h-[32px] items-center rounded-full border px-3 text-xs capitalize transition-colors",
                      filter === f
                        ? "border-accent bg-accent/10 font-semibold text-accent"
                        : "border-border text-muted-foreground hover:border-accent/50 hover:text-foreground",
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {visible.length === 0 ? (
              <RoutinePanel>
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No {filter} goals.
                </p>
              </RoutinePanel>
            ) : (
              <motion.div
                variants={staggerParent}
                custom={staggerStep(visible.length)}
                initial="hidden"
                animate="visible"
                className="grid gap-4 lg:grid-cols-2"
              >
                <AnimatePresence initial={false}>
                  {visible.map(({ goal, progress }) => (
                    <motion.div key={goal.id} variants={listItem} exit="exit" layout>
                      <GoalCard
                        goal={goal}
                        progress={progress}
                        milestones={api.milestones.filter((m) => m.goal_id === goal.id)}
                        expanded={expanded === goal.id}
                        onExpand={() =>
                          setExpanded((id) => {
                            setNewMilestone("");
                            return id === goal.id ? null : goal.id;
                          })
                        }
                        onEdit={() => openEdit(goal)}
                        onToggleMilestone={(m) => void api.toggleMilestone(m)}
                        onDeleteMilestone={(m) => void api.deleteMilestone(m.id)}
                        newMilestone={newMilestone}
                        onNewMilestoneChange={setNewMilestone}
                        onAddMilestone={() => void addMilestone(goal.id)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        )}
      </RoutineAsync>

      {draft && (
        <RoutineDialog
          open
          onOpenChange={(o) => !o && setDraft(null)}
          title={draft.id ? "Edit goal" : "New goal"}
          description="An outcome with a date. Milestones and linked work fill in the rest."
          submitLabel={draft.id ? "Save changes" : "Set goal"}
          onSubmit={() => void save()}
          saving={api.saving}
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
          <Field label="Goal" required>
            {(id) => (
              <Input
                id={id}
                autoFocus
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="Submit five university applications"
              />
            )}
          </Field>

          <Field label="What it means">
            {(id) => (
              <Textarea
                id={id}
                rows={2}
                value={draft.description ?? ""}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="What finishing this actually looks like"
              />
            )}
          </Field>

          <FieldRow>
            <Field label="Category">
              {(id) => (
                <EnumSelect
                  id={id}
                  value={draft.category}
                  onChange={(v) => setDraft({ ...draft, category: v })}
                  options={GOAL_CATEGORIES}
                />
              )}
            </Field>
            <Field label="Target date">
              {(id) => (
                <Input
                  id={id}
                  type="date"
                  value={draft.target_date ?? ""}
                  onChange={(e) => setDraft({ ...draft, target_date: e.target.value || null })}
                />
              )}
            </Field>
          </FieldRow>

          <FieldRow>
            <Field label="Priority">
              {(id) => (
                <PrioritySelect
                  id={id}
                  value={draft.priority}
                  onChange={(p) => setDraft({ ...draft, priority: p })}
                />
              )}
            </Field>
            <Field label="Status">
              {(id) => (
                <EnumSelect
                  id={id}
                  value={draft.status}
                  onChange={(v) => setDraft({ ...draft, status: v })}
                  options={STATUSES}
                />
              )}
            </Field>
          </FieldRow>

          <div className="space-y-2 rounded-xl border border-border p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label htmlFor="goal-override" className="text-xs font-semibold">
                  Set progress myself
                </Label>
                <p className="text-[11px] leading-snug text-muted-foreground">
                  By default it's worked out from your milestones and linked work.
                </p>
              </div>
              <Switch
                id="goal-override"
                checked={draft.progress_override !== null}
                onCheckedChange={(v) =>
                  setDraft({ ...draft, progress_override: v ? 50 : null })
                }
              />
            </div>
            {draft.progress_override !== null && (
              <div className="flex items-center gap-3 pt-1">
                <Input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={draft.progress_override}
                  onChange={(e) =>
                    setDraft({ ...draft, progress_override: Number(e.target.value) })
                  }
                  aria-label="Progress percentage"
                  className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-muted p-0"
                />
                <span className="w-12 shrink-0 text-right text-sm font-semibold tabular-nums">
                  {draft.progress_override}%
                </span>
              </div>
            )}
          </div>
        </RoutineDialog>
      )}
    </RoutineShell>
  );
}

function GoalCard({
  goal,
  progress,
  milestones,
  expanded,
  onExpand,
  onEdit,
  onToggleMilestone,
  onDeleteMilestone,
  newMilestone,
  onNewMilestoneChange,
  onAddMilestone,
}: {
  goal: RoutineGoal;
  progress: ReturnType<typeof goalProgress>;
  milestones: RoutineGoalMilestone[];
  expanded: boolean;
  onExpand: () => void;
  onEdit: () => void;
  onToggleMilestone: (m: RoutineGoalMilestone) => void;
  onDeleteMilestone: (m: RoutineGoalMilestone) => void;
  newMilestone: string;
  onNewMilestoneChange: (v: string) => void;
  onAddMilestone: () => void;
}) {
  const days = progress.daysRemaining;
  const late = days !== null && days < 0 && goal.status === "active";
  const inactive = goal.status === "paused" || goal.status === "archived";

  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-2xl border bg-card/60 p-4 backdrop-blur-sm transition-colors",
        late ? "border-destructive/40" : "border-border hover:border-accent/40",
        inactive && "opacity-70",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <h3
              className={cn(
                "font-display text-base font-bold text-foreground",
                goal.status === "completed" && "text-muted-foreground line-through",
              )}
            >
              {goal.title}
            </h3>
            {goal.priority !== "low" && goal.status === "active" && (
              <span
                className={cn(
                  "rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase",
                  PRIORITY_CLASSES[goal.priority],
                )}
              >
                {goal.priority}
              </span>
            )}
            {inactive && (
              <span className="rounded-full border border-border px-1.5 py-0.5 text-[9px] uppercase text-muted-foreground">
                {goal.status}
              </span>
            )}
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            <span className="capitalize">{goal.category}</span>
            {goal.target_date && (
              <span
                className={cn(
                  "inline-flex items-center gap-1",
                  late && "font-semibold text-destructive",
                )}
              >
                <CalendarClock className="h-3 w-3" />
                {formatShortDate(parseDateKey(goal.target_date))}
                {days !== null && (
                  <span className="tabular-nums">
                    ({days < 0 ? `${Math.abs(days)}d late` : `${days}d left`})
                  </span>
                )}
              </span>
            )}
          </p>
        </button>

        <span className="shrink-0 text-right">
          <span className="font-display text-2xl font-bold tabular-nums text-foreground">
            {progress.percent}%
          </span>
          {goal.progress_override !== null && goal.status !== "completed" && (
            <span className="block text-[9px] uppercase tracking-wide text-muted-foreground">
              your estimate
            </span>
          )}
        </span>
      </div>

      {goal.description && (
        <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{goal.description}</p>
      )}

      <div className="mt-3">
        <Progress value={progress.percent} className="h-2" />
      </div>

      {/* What is actually pushing the number. Stated, so the bar is never magic. */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {progress.milestonesTotal > 0 && (
          <span className="inline-flex items-center gap-1">
            <Target className="h-3 w-3" />
            {progress.milestonesDone}/{progress.milestonesTotal} milestones
          </span>
        )}
        {progress.linkedTasksTotal > 0 && (
          <span className="inline-flex items-center gap-1">
            <CheckSquare className="h-3 w-3" />
            {progress.linkedTasksDone}/{progress.linkedTasksTotal} tasks
          </span>
        )}
        {progress.linkedStudyMinutes > 0 && (
          <span className="inline-flex items-center gap-1">
            <Timer className="h-3 w-3" />
            {formatDuration(progress.linkedStudyMinutes)} studied
          </span>
        )}
        {progress.milestonesTotal === 0 &&
          progress.linkedTasksTotal === 0 &&
          goal.progress_override === null && (
            <span>Nothing linked yet. Add a milestone, or link a task from Tasks.</span>
          )}
      </div>

      {progress.overdueMilestones.length > 0 && (
        <p className="mt-2 text-xs font-medium text-destructive">
          {progress.overdueMilestones.length} milestone
          {progress.overdueMilestones.length === 1 ? "" : "s"} past their date.
        </p>
      )}

      {progress.nextMilestone && !expanded && (
        <p className="mt-2 truncate text-xs text-muted-foreground">
          Next: <span className="text-foreground">{progress.nextMilestone.title}</span>
        </p>
      )}

      <button
        type="button"
        onClick={onExpand}
        aria-expanded={expanded}
        className="mt-3 inline-flex items-center gap-1 self-start text-xs font-semibold text-accent"
      >
        {expanded ? "Hide milestones" : `Milestones (${milestones.length})`}
        <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={transition.fast}>
          <ChevronDown className="h-3 w-3" />
        </motion.span>
      </button>

      {expanded && (
        <div className="mt-3 space-y-2 border-t border-border/60 pt-3">
          {milestones.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Break the goal into the two or three steps that actually matter.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {milestones.map((m) => (
                <li key={m.id} className="group flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onToggleMilestone(m)}
                    aria-pressed={m.is_complete}
                    aria-label={
                      m.is_complete ? `Reopen ${m.title}` : `Mark ${m.title} complete`
                    }
                    className={cn(
                      "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
                      m.is_complete
                        ? "border-accent bg-accent text-accent-foreground"
                        : "border-border text-transparent hover:border-accent",
                    )}
                  >
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </button>
                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate text-xs",
                      m.is_complete ? "text-muted-foreground line-through" : "text-foreground",
                    )}
                  >
                    {m.title}
                  </span>
                  {m.due_date && (
                    <span
                      className={cn(
                        "shrink-0 text-[10px] tabular-nums",
                        !m.is_complete && parseDateKey(m.due_date) < parseDateKey(dateKey(new Date()))
                          ? "font-semibold text-destructive"
                          : "text-muted-foreground",
                      )}
                    >
                      {formatShortDate(parseDateKey(m.due_date))}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => onDeleteMilestone(m)}
                    aria-label={`Delete ${m.title}`}
                    className="shrink-0 text-muted-foreground opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <form
            className="flex items-center gap-2 pt-1"
            onSubmit={(e) => {
              e.preventDefault();
              onAddMilestone();
            }}
          >
            <Input
              value={newMilestone}
              onChange={(e) => onNewMilestoneChange(e.target.value)}
              placeholder="Add a milestone"
              className="h-8 text-xs"
              aria-label={`Add a milestone to ${goal.title}`}
            />
            <Button type="submit" size="sm" className="h-8 shrink-0" disabled={!newMilestone.trim()}>
              Add
            </Button>
          </form>

          <Button asChild variant="ghost" size="sm" className="h-8 w-full text-xs">
            <Link to="/routine/tasks">Link work to this goal from Tasks</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
