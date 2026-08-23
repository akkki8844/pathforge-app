import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Archive,
  ArchiveRestore,
  Check,
  Clock,
  Flame,
  Plus,
  Repeat,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { RoutineShell, RoutinePanel, RoutineStat } from "@/components/routine/RoutineShell";
import { RoutineAsync, RoutineEmptyState } from "@/components/routine/RoutineStates";
import {
  ColorPicker,
  DeleteAction,
  EnumSelect,
  Field,
  FieldRow,
  RoutineDialog,
  WeekdayPicker,
  fromTimeInput,
  toTimeInput,
} from "@/components/routine/RoutineForm";
import {
  frequencyLabel,
  preferredTimeLabel,
  targetLabel,
} from "@/components/routine/habits/util";
import { useRoutineHabits } from "@/hooks/routine/useRoutineData";
import { habitDoneOn, habitDueOn, habitStats } from "@/lib/routine/derive";
import { addDays, dateKey, startOfDay } from "@/lib/routine/dates";
import { swatch } from "@/lib/routine/colors";
import { listItem, staggerParent, staggerStep, transition } from "@/lib/motion";
import { WEEKDAY_LABELS, type HabitFrequency, type NewRoutineHabit, type RoutineColor, type RoutineHabit, type RoutineHabitLog } from "@/lib/routine/types";

/**
 * Habits: consistency, told honestly.
 *
 * The whole design brief for this page is restraint. There is no confetti, no
 * badge, no mascot and no level-up: a student who reads for twenty minutes has
 * read for twenty minutes, and dressing that up as a prize is both patronising
 * and, over a term, corrosive to the thing it's meant to reinforce. What the
 * page shows instead is the actual record: the last two weeks as a strip, the
 * current streak, and consistency measured against the days the habit was
 * genuinely *due*, so a Mon/Wed/Fri habit is never scored against a Tuesday.
 *
 * Nothing here is a stored counter. Every figure comes from `habitStats()` over
 * the log rows, which is why a check-off on Today moves the streak on this page
 * without either page writing to the other.
 */

const STRIP_DAYS = 14;

const FREQUENCIES: HabitFrequency[] = ["daily", "weekly", "custom"];

const FREQUENCY_LABEL: Partial<Record<HabitFrequency, string>> = {
  daily: "Every day",
  weekly: "A number of times a week",
  custom: "Specific days",
};

const DEFAULT_HABIT: NewRoutineHabit = {
  name: "",
  description: null,
  frequency: "daily",
  target_days: [1, 2, 3, 4, 5],
  target_per_week: 3,
  target_quantity: null,
  unit: null,
  preferred_time: null,
  color: "emerald",
  is_archived: false,
};

interface Draft extends NewRoutineHabit {
  id?: string;
}

export default function Habits() {
  const {
    habits,
    habitLogs,
    loading,
    error,
    createHabit,
    updateHabit,
    deleteHabit,
    toggleHabitDay,
    saving,
  } = useRoutineHabits();

  const [draft, setDraft] = useState<Draft | null>(null);
  const [armed, setArmed] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const today = useMemo(() => startOfDay(new Date()), []);
  const strip = useMemo(
    () => Array.from({ length: STRIP_DAYS }, (_, i) => addDays(today, -(STRIP_DAYS - 1 - i))),
    [today],
  );

  const live = useMemo(() => habits.filter((h) => !h.is_archived), [habits]);
  const archived = useMemo(() => habits.filter((h) => h.is_archived), [habits]);

  const summary = useMemo(() => {
    const due = live.filter((h) => habitDueOn(h, today, habitLogs));
    const done = due.filter((h) => habitDoneOn(h.id, today, habitLogs));
    let bestStreak = 0;
    let consistencySum = 0;
    for (const h of live) {
      const s = habitStats(h, habitLogs, today);
      bestStreak = Math.max(bestStreak, s.currentStreak);
      consistencySum += s.consistency;
    }
    return {
      active: live.length,
      dueToday: due.length,
      doneToday: done.length,
      bestStreak,
      consistency: live.length ? Math.round(consistencySum / live.length) : 0,
    };
  }, [live, habitLogs, today]);

  const openNew = () => {
    setArmed(false);
    setDraft({ ...DEFAULT_HABIT });
  };

  const openEdit = (h: RoutineHabit) => {
    setArmed(false);
    setDraft({
      id: h.id,
      name: h.name,
      description: h.description,
      frequency: h.frequency,
      target_days: h.target_days ?? [],
      target_per_week: h.target_per_week,
      target_quantity: h.target_quantity,
      unit: h.unit,
      preferred_time: h.preferred_time,
      color: h.color,
      is_archived: h.is_archived,
    });
  };

  const save = async () => {
    if (!draft) return;
    const { id, ...payload } = draft;
    const clean: NewRoutineHabit = {
      ...payload,
      name: payload.name.trim(),
      description: payload.description?.trim() || null,
      unit: payload.unit?.trim() || null,
    };
    try {
      if (id) await updateHabit({ id, patch: clean });
      else await createHabit(clean);
      setDraft(null);
    } catch (err) {
      toast.error("Couldn't save that habit", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    }
  };

  const removeDraft = async () => {
    if (!draft?.id) return;
    try {
      await deleteHabit(draft.id);
      setDraft(null);
      toast.success("Habit deleted", { description: draft.name });
    } catch (err) {
      toast.error("Couldn't delete that habit", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    }
  };

  const setArchived = async (h: RoutineHabit, archived: boolean) => {
    try {
      await updateHabit({ id: h.id, patch: { is_archived: archived } });
      toast.success(archived ? "Habit archived" : "Habit restored", {
        description: archived ? "Its history is kept." : h.name,
      });
    } catch (err) {
      toast.error("Couldn't update that habit", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    }
  };

  const toggle = async (h: RoutineHabit, day: Date) => {
    try {
      await toggleHabitDay({ habitId: h.id, day, quantity: h.target_quantity });
    } catch (err) {
      toast.error("Couldn't record that", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    }
  };

  return (
    <RoutineShell
      title="Habits"
      purpose="The routines you're keeping, and how consistently."
      icon={Repeat}
      path="/routine/habits"
      actions={
        <>
          {archived.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowArchived((v) => !v)}
              className="gap-1.5"
            >
              <Archive className="h-4 w-4" />
              {showArchived ? "Hide archived" : `Archived (${archived.length})`}
            </Button>
          )}
          <Button size="sm" className="gap-1.5" onClick={openNew}>
            <Plus className="h-4 w-4" />
            New habit
          </Button>
        </>
      }
    >
      <RoutineAsync loading={loading} error={error} loadingVariant="grid-tall" loadingRows={4}>
        {habits.length === 0 ? (
          <RoutineEmptyState
            icon={Repeat}
            title="Pick one thing to do consistently"
            description="A habit is something small you repeat: twenty minutes of reading, a language app, a run. Routine tracks the record honestly, counting only the days it was actually due."
            actionLabel="Add your first habit"
            onAction={openNew}
          />
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <RoutineStat label="Active" value={summary.active} />
              <RoutineStat
                label="Today"
                value={`${summary.doneToday}/${summary.dueToday}`}
                hint={summary.dueToday === 0 ? "Nothing due today" : "done so far"}
              />
              <RoutineStat
                label="Longest streak"
                value={summary.bestStreak}
                hint={summary.bestStreak === 1 ? "day running" : "days running"}
                icon={Flame}
              />
              <RoutineStat label="Consistency" value={`${summary.consistency}%`} hint="last 30 days" />
            </div>

            {live.length === 0 ? (
              <RoutinePanel>
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Every habit is archived. Restore one below, or start a new one.
                </p>
              </RoutinePanel>
            ) : (
              <motion.div
                variants={staggerParent}
                custom={staggerStep(live.length)}
                initial="hidden"
                animate="visible"
                className="grid gap-4 lg:grid-cols-2"
              >
                <AnimatePresence initial={false}>
                  {live.map((h) => (
                    <motion.div key={h.id} variants={listItem} exit="exit" layout>
                      <HabitCard
                        habit={h}
                        logs={habitLogs}
                        strip={strip}
                        today={today}
                        onToggle={(day) => void toggle(h, day)}
                        onEdit={() => openEdit(h)}
                        onArchive={() => void setArchived(h, true)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}

            {showArchived && archived.length > 0 && (
              <RoutinePanel title="Archived" description="History kept, no longer tracked.">
                <ul className="space-y-2">
                  {archived.map((h) => (
                    <li
                      key={h.id}
                      className="flex items-center gap-3 rounded-xl border border-border bg-card/40 p-3"
                    >
                      <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", swatch(h.color).dot)} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-muted-foreground">{h.name}</p>
                        <p className="text-xs text-muted-foreground/80">
                          {habitStats(h, habitLogs, today).totalCompletions} completions on record
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => void setArchived(h, false)}
                      >
                        <ArchiveRestore className="h-3.5 w-3.5" />
                        Restore
                      </Button>
                    </li>
                  ))}
                </ul>
              </RoutinePanel>
            )}
          </div>
        )}
      </RoutineAsync>

      {draft && (
        <RoutineDialog
          open
          onOpenChange={(o) => !o && setDraft(null)}
          title={draft.id ? "Edit habit" : "New habit"}
          description="Small and specific beats ambitious and vague."
          submitLabel={draft.id ? "Save changes" : "Add habit"}
          onSubmit={() => void save()}
          saving={saving}
          canSubmit={Boolean(draft.name.trim())}
          destructive={
            draft.id ? (
              <DeleteAction
                armed={armed}
                onArm={() => setArmed(true)}
                onConfirm={() => void removeDraft()}
                label="Delete and lose history"
              />
            ) : undefined
          }
        >
          <Field label="Habit" required>
            {(id) => (
              <Input
                id={id}
                autoFocus
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Read for 20 minutes"
              />
            )}
          </Field>

          <Field label="Why it matters">
            {(id) => (
              <Textarea
                id={id}
                rows={2}
                value={draft.description ?? ""}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="What this is in service of"
              />
            )}
          </Field>

          <Field label="How often">
            {(id) => (
              <EnumSelect
                id={id}
                value={draft.frequency}
                onChange={(v) => setDraft({ ...draft, frequency: v })}
                options={FREQUENCIES}
                labels={FREQUENCY_LABEL}
              />
            )}
          </Field>

          {draft.frequency === "custom" && (
            <WeekdayPicker
              value={draft.target_days}
              onChange={(days) => setDraft({ ...draft, target_days: days })}
              label="On these days"
            />
          )}

          {draft.frequency === "weekly" && (
            <Field label="Times per week" hint="Counted across Monday to Sunday.">
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  min={1}
                  max={7}
                  value={draft.target_per_week}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      target_per_week: Math.max(1, Math.min(7, Number(e.target.value) || 1)),
                    })
                  }
                />
              )}
            </Field>
          )}

          <FieldRow>
            <Field label="Amount" hint="Optional. A number you're aiming for each time.">
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  min={0}
                  value={draft.target_quantity ?? ""}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      target_quantity: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  placeholder="20"
                />
              )}
            </Field>
            <Field label="Unit">
              {(id) => (
                <Input
                  id={id}
                  value={draft.unit ?? ""}
                  onChange={(e) => setDraft({ ...draft, unit: e.target.value })}
                  placeholder="minutes"
                />
              )}
            </Field>
          </FieldRow>

          <Field label="Preferred time" hint="Optional. Places it on your Today timeline.">
            {(id) => (
              <Input
                id={id}
                type="time"
                value={toTimeInput(draft.preferred_time)}
                onChange={(e) =>
                  setDraft({ ...draft, preferred_time: fromTimeInput(e.target.value) })
                }
              />
            )}
          </Field>

          <ColorPicker
            value={draft.color as RoutineColor}
            onChange={(color) => setDraft({ ...draft, color })}
          />
        </RoutineDialog>
      )}
    </RoutineShell>
  );
}

function HabitCard({
  habit,
  logs,
  strip,
  today,
  onToggle,
  onEdit,
  onArchive,
}: {
  habit: RoutineHabit;
  logs: RoutineHabitLog[];
  strip: Date[];
  today: Date;
  onToggle: (day: Date) => void;
  onEdit: () => void;
  onArchive: () => void;
}) {
  const stats = habitStats(habit, logs, today);
  const s = swatch(habit.color);
  const amount = targetLabel(habit);
  const at = preferredTimeLabel(habit);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card/60 p-4 backdrop-blur-sm transition-colors hover:border-accent/40">
      <div className="flex items-start gap-3">
        <CheckCircleButton
          done={stats.doneToday}
          due={stats.dueToday}
          color={habit.color}
          label={habit.name}
          onClick={() => onToggle(today)}
        />

        <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left">
          <p className="truncate font-display text-base font-bold text-foreground">{habit.name}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            <span className={s.text}>{frequencyLabel(habit)}</span>
            {amount && (
              <span className="inline-flex items-center gap-1">
                <Target className="h-3 w-3" />
                {amount}
              </span>
            )}
            {at && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {at}
              </span>
            )}
          </p>
        </button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground"
          title={`Archive ${habit.name}`}
          onClick={onArchive}
        >
          <Archive className="h-3.5 w-3.5" />
          <span className="sr-only">Archive {habit.name}</span>
        </Button>
      </div>

      {habit.description && (
        <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{habit.description}</p>
      )}

      {/* The record. Two weeks is long enough to show a pattern and short
          enough to stay tappable at phone width. */}
      <div className="mt-4 flex items-end justify-between gap-1">
        {strip.map((day) => {
          const done = habitDoneOn(habit.id, day, logs);
          const due = habitDueOn(habit, day, logs);
          const isToday = dateKey(day) === dateKey(today);
          return (
            <button
              key={dateKey(day)}
              type="button"
              onClick={() => onToggle(day)}
              title={`${day.toDateString()}${done ? " — done" : due ? " — due" : " — not due"}`}
              className="group flex flex-1 flex-col items-center gap-1"
            >
              <span
                className={cn(
                  "block w-full rounded-[3px] border transition-colors",
                  done
                    ? cn(s.dot, "border-transparent")
                    : due
                      ? "border-border bg-muted/40 group-hover:bg-muted"
                      : "border-dashed border-border/60 bg-transparent",
                  isToday && "ring-1 ring-foreground/40 ring-offset-1 ring-offset-background",
                )}
                style={{ height: done ? 28 : due ? 20 : 12 }}
              />
              <span className="text-[9px] tabular-nums text-muted-foreground">
                {WEEKDAY_LABELS[day.getDay()].charAt(0)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border/60 pt-3">
        <Figure
          label="Streak"
          value={stats.currentStreak}
          hint={stats.currentStreak === 1 ? "day" : "days"}
        />
        <Figure label="Best" value={stats.bestStreak} hint={stats.bestStreak === 1 ? "day" : "days"} />
        <Figure label="Consistency" value={`${stats.consistency}%`} hint="30 days" />
      </div>
    </div>
  );
}

function Figure({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div>
      <p className="font-display text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 font-display text-lg font-bold tabular-nums text-foreground">{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

/**
 * The check-off.
 *
 * A single circle that fills. The whole interaction is a 130ms scale settle and
 * a colour change: enough to confirm the tap landed, and nothing more. It is a
 * real `<button>` with `aria-pressed`, and it never depends on the animation
 * completing, because `MobileMotionGate` turns motion off entirely on phones.
 */
function CheckCircleButton({
  done,
  due,
  color,
  label,
  onClick,
}: {
  done: boolean;
  due: boolean;
  color: string;
  label: string;
  onClick: () => void;
}) {
  const s = swatch(color);
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={done}
      aria-label={done ? `Undo ${label} for today` : `Mark ${label} done for today`}
      whileTap={{ scale: 0.9 }}
      transition={transition.fast}
      className={cn(
        "mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
        done
          ? cn(s.dot, "border-transparent text-white")
          : due
            ? "border-border text-transparent hover:border-accent"
            : "border-dashed border-border/70 text-transparent hover:border-accent/60",
      )}
    >
      <Check className="h-4 w-4" strokeWidth={3} />
    </motion.button>
  );
}
