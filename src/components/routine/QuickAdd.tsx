import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell, BookOpenCheck, CalendarClock, CheckSquare, Flag, Plus, Repeat, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FlowButton } from "@/components/ui/flow-button";
import { cn } from "@/lib/utils";
import { DURATION, EASE_OUT_EXPO } from "@/lib/motion";
import { formatClock, formatDuration, relativeDayLabel } from "@/lib/routine/dates";
import {
  QUICK_ADD_EXAMPLES,
  parseQuickAdd,
  type QuickAddKind,
} from "@/lib/routine/parseQuickAdd";
import {
  useRoutineEvents,
  useRoutineGoals,
  useRoutineHabits,
  useRoutineReminders,
  useRoutineTasks,
  useStudyBlocks,
} from "@/hooks/routine/useRoutineData";

/**
 * One creation surface for the whole section.
 *
 * The brief's requirement is that a student never has to navigate to a page just
 * to create something, and this is how that is met: a single box, reachable from
 * every Routine page, that decides *which* of the six entities you meant from
 * what you typed. The classification is shown as a chip the student can override
 * before committing, so the parse is never silently wrong — it is a suggestion
 * with a visible correction.
 *
 * The parse itself is local and free (see `@/lib/routine/parseQuickAdd`): typing
 * a task must not cost a credit or wait on a network hop.
 */

const KIND_META: Record<
  QuickAddKind,
  { label: string; icon: React.ComponentType<{ className?: string }>; hint: string }
> = {
  task: { label: "Task", icon: CheckSquare, hint: "Something to get done" },
  reminder: { label: "Reminder", icon: Bell, hint: "A nudge at a set time" },
  study: { label: "Study block", icon: BookOpenCheck, hint: "Planned academic time" },
  habit: { label: "Habit", icon: Repeat, hint: "A recurring routine" },
  goal: { label: "Goal", icon: Flag, hint: "A long-term outcome" },
  event: { label: "Event", icon: CalendarClock, hint: "Something on the calendar" },
};

const ORDER: QuickAddKind[] = ["task", "reminder", "study", "event", "habit", "goal"];

export function QuickAddDialog({
  open,
  onOpenChange,
  /** Pre-selects a kind — used when opened from a page that owns one entity. */
  initialKind,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialKind?: QuickAddKind;
}) {
  const [text, setText] = useState("");
  const [override, setOverride] = useState<QuickAddKind | null>(initialKind ?? null);
  const [saving, setSaving] = useState(false);

  const { createTask } = useRoutineTasks();
  const { createReminder } = useRoutineReminders();
  const { createStudyBlock } = useStudyBlocks();
  const { createHabit } = useRoutineHabits();
  const { createGoal } = useRoutineGoals();
  const { createEvent } = useRoutineEvents();

  useEffect(() => {
    if (!open) {
      setText("");
      setOverride(initialKind ?? null);
      setSaving(false);
    }
  }, [open, initialKind]);

  // Re-parsed on every keystroke. Cheap enough to do inline — it's a handful of
  // regexes over one short string, which is exactly why this isn't a model call.
  const draft = useMemo(() => parseQuickAdd(text), [text]);
  const kind = override ?? draft.kind;
  const Meta = KIND_META[kind];

  const canSave = text.trim().length > 1 && !saving;

  async function commit() {
    if (!canSave) return;
    setSaving(true);
    try {
      switch (kind) {
        case "task":
          await createTask({
            title: draft.title,
            description: null,
            due_at: draft.at ? draft.at.toISOString() : null,
            priority: draft.priority,
            category: "general",
            status: "todo",
            estimated_minutes: draft.durationMinutes,
            recurrence: draft.repeat === "none" ? "none" : draft.repeat === "yearly" ? "monthly" : (draft.repeat === "weekdays" ? "daily" : draft.repeat),
            goal_id: null,
            completed_at: null,
          });
          break;
        case "reminder":
          await createReminder({
            title: draft.title,
            notes: null,
            // The parser guarantees a time for reminders, but the fallback keeps
            // this honest if that ever changes.
            remind_at: (draft.at ?? new Date(Date.now() + 3_600_000)).toISOString(),
            repeat_rule: draft.repeat,
            notify: true,
            status: "pending",
            completed_at: null,
            last_notified_at: null,
          });
          break;
        case "study":
          await createStudyBlock({
            subject: draft.subject ?? draft.title,
            topic: draft.subject && draft.subject !== draft.title ? draft.title : null,
            objective: null,
            planned_minutes: draft.durationMinutes ?? 45,
            completed_minutes: 0,
            priority: draft.priority,
            scheduled_date: draft.day ?? new Date().toISOString().slice(0, 10),
            scheduled_start: draft.timeStated && draft.at ? toTimeString(draft.at) : null,
            status: "planned",
            goal_id: null,
            completed_at: null,
          });
          break;
        case "habit":
          await createHabit({
            name: draft.title,
            description: null,
            frequency: draft.repeat === "weekly" ? "weekly" : "daily",
            target_days: [],
            target_per_week: draft.repeat === "weekly" ? 3 : 7,
            target_quantity: draft.durationMinutes,
            unit: draft.durationMinutes ? "minutes" : null,
            preferred_time: draft.timeStated && draft.at ? toTimeString(draft.at) : null,
            color: "emerald",
            is_archived: false,
          });
          break;
        case "goal":
          await createGoal({
            title: draft.title,
            description: null,
            category: "academic",
            target_date: draft.day,
            priority: draft.priority,
            status: "active",
            progress_override: null,
            completed_at: null,
          });
          break;
        case "event":
          await createEvent({
            title: draft.title,
            description: null,
            category: /\bexam|test\b/i.test(text) ? "exam" : "personal",
            starts_at: (draft.at ?? new Date()).toISOString(),
            ends_at: draft.durationMinutes && draft.at
              ? new Date(draft.at.getTime() + draft.durationMinutes * 60_000).toISOString()
              : null,
            all_day: !draft.timeStated,
            location: null,
          });
          break;
      }
      toast.success(`${Meta.label} added`, { description: draft.title });
      onOpenChange(false);
    } catch (err) {
      toast.error(`Couldn't add that ${Meta.label.toLowerCase()}`, {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[46rem]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            Quick add
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void commit();
              }
            }}
            placeholder="Study chemistry for 45 minutes at 7pm"
            aria-label="What would you like to add?"
          />

          {!text.trim() && (
            <div className="space-y-1.5">
              <p className="font-display text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Try
              </p>
              {QUICK_ADD_EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setText(ex)}
                  className="block w-full rounded-lg border border-border/70 px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:border-accent/50 hover:text-foreground"
                >
                  {ex}
                </button>
              ))}
            </div>
          )}

          <AnimatePresence>
            {text.trim().length > 1 && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: DURATION.fast, ease: EASE_OUT_EXPO }}
                className="space-y-3 rounded-xl border border-border bg-muted/30 p-3"
              >
                <div className="flex flex-wrap gap-1.5">
                  {ORDER.map((k) => {
                    const KIcon = KIND_META[k].icon;
                    const active = k === kind;
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setOverride(k)}
                        aria-pressed={active}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                          active
                            ? "border-accent bg-accent/10 font-semibold text-accent"
                            : "border-border text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <KIcon className="h-3 w-3" />
                        {KIND_META[k].label}
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-1 text-xs">
                  <p className="text-foreground">
                    <span className="text-muted-foreground">Title — </span>
                    {draft.title}
                  </p>
                  {draft.subject && kind === "study" && (
                    <p className="text-muted-foreground">Subject — {draft.subject}</p>
                  )}
                  {draft.at && (
                    <p className="text-muted-foreground">
                      When — {relativeDayLabel(draft.at)}
                      {draft.timeStated ? ` at ${formatClock(draft.at)}` : ""}
                    </p>
                  )}
                  {draft.durationMinutes && (
                    <p className="text-muted-foreground">
                      Length — {formatDuration(draft.durationMinutes)}
                    </p>
                  )}
                  {draft.repeat !== "none" && (
                    <p className="text-muted-foreground">Repeats — {draft.repeat}</p>
                  )}
                  {draft.priority !== "medium" && (
                    <p className="text-muted-foreground">Priority — {draft.priority}</p>
                  )}
                </div>

                {draft.matched.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {draft.matched.map((m, i) => (
                      <Badge key={`${m}-${i}`} variant="secondary" className="text-[10px]">
                        {m}
                      </Badge>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-muted-foreground">{Meta.hint}</p>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <FlowButton
                text={saving ? "Adding…" : `Add ${Meta.label.toLowerCase()}`}
                onClick={() => void commit()}
                disabled={!canSave}
                className="px-5 py-2 text-xs disabled:pointer-events-none disabled:opacity-50"
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** "HH:MM" in local time — the shape the `time` columns expect. */
function toTimeString(d: Date): string {
  return `${`${d.getHours()}`.padStart(2, "0")}:${`${d.getMinutes()}`.padStart(2, "0")}`;
}

/**
 * The trigger that lives in the Routine sub-nav, plus the global shortcut.
 *
 * Bound to `q` rather than a modifier combination because the section has no
 * other single-key binding and a student's hands are already on the keyboard;
 * the guard skips it whenever focus is in a field, so it can never eat a
 * keystroke meant for an input.
 */
export function QuickAddButton({ initialKind }: { initialKind?: QuickAddKind }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "q" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement;
      if (
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el instanceof HTMLElement && el.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      setOpen(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Quick add (press Q)"
        className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/20"
      >
        <Plus className="h-3.5 w-3.5" />
        Quick add
      </button>
      <QuickAddDialog open={open} onOpenChange={setOpen} initialKind={initialKind} />
    </>
  );
}
