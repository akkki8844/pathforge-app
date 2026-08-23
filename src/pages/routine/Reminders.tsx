import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  BellOff,
  BellRing,
  Check,
  CheckCheck,
  CornerDownLeft,
  History,
  Repeat,
  RotateCcw,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { RoutineShell, RoutineStat } from "@/components/routine/RoutineShell";
import { RoutineAsync, RoutineEmptyState } from "@/components/routine/RoutineStates";
import { SectionShell } from "@/components/routine/reminders/SectionShell";
import {
  DeleteAction,
  EnumSelect,
  Field,
  FieldRow,
  RoutineDialog,
  fromLocalInput,
  toLocalInput,
} from "@/components/routine/RoutineForm";
import { useRoutineReminders } from "@/hooks/routine/useRoutineData";
import { nextReminderOccurrence } from "@/lib/routine/derive";
import { parseQuickAdd } from "@/lib/routine/parseQuickAdd";
import { formatClock, relativeDayLabel, relativeTime } from "@/lib/routine/dates";
import { notifyReminderDue } from "@/lib/notifyTask";
import { listItem, staggerParent, staggerStep } from "@/lib/motion";
import type { NewRoutineReminder, ReminderRepeat, RoutineReminder } from "@/lib/routine/types";

/**
 * Reminders: a nudge at a moment, not a piece of work.
 *
 * The line against Tasks is the point of this page. A task has a deadline, an
 * estimate, a status and possibly a goal, because it is *work*. A reminder has a
 * sentence and an instant, because all it has to do is arrive at the right time
 * and then stop existing. So there is no priority here, no board, no estimate,
 * no sub-status: one input, one time, done.
 *
 * Capture is natural language, parsed **locally** by `parseQuickAdd`. That is a
 * deliberate architectural choice, not a shortcut: the parse runs on every
 * keystroke to drive the "understood as" preview, which no round trip could do,
 * and it costs no AI credits for what is fundamentally CRUD. Anything the parser
 * misreads is one tap away from the full editor.
 */

const REPEAT_OPTIONS: ReminderRepeat[] = [
  "none",
  "daily",
  "weekdays",
  "weekly",
  "monthly",
  "yearly",
];

const REPEAT_LABEL: Partial<Record<ReminderRepeat, string>> = {
  none: "Doesn't repeat",
  weekdays: "Every weekday",
};

const DEFAULT_REMINDER: NewRoutineReminder = {
  title: "",
  notes: null,
  remind_at: new Date().toISOString(),
  repeat_rule: "none",
  notify: true,
  status: "pending",
  completed_at: null,
  last_notified_at: null,
};

interface Draft extends NewRoutineReminder {
  id?: string;
}

export default function Reminders() {
  const {
    reminders,
    loading,
    error,
    refetch,
    createReminder,
    updateReminder,
    deleteReminder,
    completeReminder,
    restoreReminder,
    saving,
  } = useRoutineReminders();

  const [capture, setCapture] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [armed, setArmed] = useState(false);
  const [now, setNow] = useState(() => new Date());

  // Countdowns say "in 4m"; a static clock would make them lies within a minute.
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  useReminderNotifier(reminders, now, updateReminder);

  /** Live parse of the capture box. Cheap enough to run per keystroke. */
  const parsed = useMemo(
    () => (capture.trim() ? parseQuickAdd(capture, now) : null),
    [capture, now],
  );

  const pending = useMemo(
    () => reminders.filter((r) => r.status === "pending"),
    [reminders],
  );

  const withNext = useMemo(
    () =>
      pending
        .map((r) => ({ reminder: r, at: nextReminderOccurrence(r, now) }))
        .sort((a, b) => a.at.getTime() - b.at.getTime()),
    [pending, now],
  );

  const upcoming = useMemo(
    () => withNext.filter((x) => x.reminder.repeat_rule === "none"),
    [withNext],
  );
  const recurring = useMemo(
    () => withNext.filter((x) => x.reminder.repeat_rule !== "none"),
    [withNext],
  );
  const finished = useMemo(
    () =>
      reminders
        .filter((r) => r.status !== "pending")
        .sort(
          (a, b) =>
            new Date(b.completed_at ?? b.updated_at).getTime() -
            new Date(a.completed_at ?? a.updated_at).getTime(),
        )
        .slice(0, 30),
    [reminders],
  );

  const overdueCount = upcoming.filter((x) => x.at < now).length;

  const submitCapture = async () => {
    const text = capture.trim();
    if (!text) return;
    const p = parseQuickAdd(text, new Date());
    // Everything captured here is a reminder regardless of what the parser
    // guessed the *kind* was: the user is standing on the Reminders page.
    const at = p.at ?? new Date(Date.now() + 60 * 60_000);
    try {
      await createReminder({
        ...DEFAULT_REMINDER,
        title: p.title || text,
        remind_at: at.toISOString(),
        repeat_rule: p.repeat,
      });
      setCapture("");
      toast.success("Reminder set", {
        description: `${relativeDayLabel(at)} at ${formatClock(at)}`,
      });
    } catch (err) {
      toast.error("Couldn't set that reminder", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    }
  };

  const openEdit = (r: RoutineReminder) => {
    setArmed(false);
    setDraft({
      id: r.id,
      title: r.title,
      notes: r.notes,
      remind_at: r.remind_at,
      repeat_rule: r.repeat_rule,
      notify: r.notify,
      status: r.status,
      completed_at: r.completed_at,
      last_notified_at: r.last_notified_at,
    });
  };

  const save = async () => {
    if (!draft) return;
    const { id, ...payload } = draft;
    const clean: NewRoutineReminder = {
      ...payload,
      title: payload.title.trim(),
      notes: payload.notes?.trim() || null,
    };
    try {
      if (id) await updateReminder({ id, patch: clean });
      else await createReminder(clean);
      setDraft(null);
    } catch (err) {
      toast.error("Couldn't save that reminder", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    }
  };

  const removeDraft = async () => {
    if (!draft?.id) return;
    try {
      await deleteReminder(draft.id);
      setDraft(null);
    } catch (err) {
      toast.error("Couldn't delete that reminder", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    }
  };

  const remove = async (r: RoutineReminder) => {
    try {
      await deleteReminder(r.id);
      toast.success("Reminder deleted", { description: r.title });
    } catch (err) {
      toast.error("Couldn't delete that reminder", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    }
  };

  return (
    <RoutineShell
      title="Reminders"
      purpose="Quick nudges at the moment you need them. Longer work belongs in Tasks."
      icon={Bell}
      path="/routine/reminders"
      actions={
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => {
            setArmed(false);
            setDraft({ ...DEFAULT_REMINDER, remind_at: new Date(Date.now() + 3_600_000).toISOString() });
          }}
        >
          <BellRing className="h-4 w-4" />
          Set one precisely
        </Button>
      }
    >
      {/* Capture. Deliberately the first thing on the page and the widest
          element on it: this page exists to get a thought out of your head. */}
      <form
        className="mb-6"
        onSubmit={(e) => {
          e.preventDefault();
          void submitCapture();
        }}
      >
        <div className="relative">
          <Sparkles className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-accent" />
          <Input
            value={capture}
            onChange={(e) => setCapture(e.target.value)}
            placeholder="Remind me to email my counsellor Friday at 4pm"
            aria-label="Capture a reminder in your own words"
            className="h-12 pl-10 pr-24 text-base"
          />
          <Button
            type="submit"
            size="sm"
            disabled={!capture.trim() || saving}
            className="absolute right-2 top-1/2 h-8 -translate-y-1/2 gap-1.5"
          >
            <CornerDownLeft className="h-3.5 w-3.5" />
            Set
          </Button>
        </div>

        <AnimatePresence>
          {parsed && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 px-1 text-xs text-muted-foreground"
            >
              <span className="font-semibold text-foreground">{parsed.title || capture.trim()}</span>
              <span>
                {parsed.at
                  ? `${relativeDayLabel(parsed.at, now)} at ${formatClock(parsed.at)}`
                  : "in an hour (no time recognised)"}
              </span>
              {parsed.repeat !== "none" && (
                <span className="inline-flex items-center gap-1">
                  <Repeat className="h-3 w-3" />
                  {parsed.repeat}
                </span>
              )}
            </motion.p>
          )}
        </AnimatePresence>
      </form>

      <RoutineAsync loading={loading} error={error} onRetry={() => void refetch()} loadingRows={4}>
        {reminders.length === 0 ? (
          <RoutineEmptyState
            icon={Bell}
            title="Nothing to remember yet"
            description="Type what you need to be nudged about in the box above, in your own words. Routine reads the day and time out of the sentence, and everything set here shows up on Today and in your calendar."
          />
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
              <RoutineStat label="Pending" value={pending.length} />
              <RoutineStat
                label="Overdue"
                value={overdueCount}
                className={overdueCount > 0 ? "border-destructive/40 bg-destructive/5" : undefined}
              />
              <RoutineStat label="Recurring" value={recurring.length} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <SectionShell
                title="Upcoming"
                icon={BellRing}
                description="One-off nudges, soonest first."
                count={upcoming.length}
                className="lg:col-span-2"
              >
                {upcoming.length === 0 ? (
                  <p className="px-1 py-4 text-sm text-muted-foreground">
                    Nothing one-off is waiting. Anything you set above lands here.
                  </p>
                ) : (
                  <ReminderList
                    items={upcoming}
                    now={now}
                    onOpen={openEdit}
                    onComplete={(r) => void completeReminder(r.id)}
                    onDelete={(r) => void remove(r)}
                  />
                )}
              </SectionShell>

              <SectionShell
                title="Recurring"
                icon={Repeat}
                description="Repeats until you delete it."
                count={recurring.length}
              >
                {recurring.length === 0 ? (
                  <p className="px-1 py-4 text-sm text-muted-foreground">
                    Nothing repeating. Say "every weekday" or "every Monday" when you capture one.
                  </p>
                ) : (
                  <ReminderList
                    items={recurring}
                    now={now}
                    onOpen={openEdit}
                    onComplete={(r) => void completeReminder(r.id)}
                    onDelete={(r) => void remove(r)}
                  />
                )}
              </SectionShell>

              <SectionShell
                title="Done"
                icon={History}
                description="The last 30, in case you need one back."
                count={finished.length}
                defaultOpenOnMobile={false}
              >
                {finished.length === 0 ? (
                  <p className="px-1 py-4 text-sm text-muted-foreground">
                    Nothing completed yet.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {finished.map((r) => (
                      <li
                        key={r.id}
                        className="flex items-center gap-3 rounded-xl border border-border bg-card/40 p-2.5"
                      >
                        <CheckCheck className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-muted-foreground line-through">
                            {r.title}
                          </p>
                          {r.completed_at && (
                            <p className="text-[11px] text-muted-foreground/80">
                              {relativeDayLabel(new Date(r.completed_at), now)}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          title={`Restore ${r.title}`}
                          onClick={() => void restoreReminder(r.id)}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span className="sr-only">Restore {r.title}</span>
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionShell>
            </div>
          </div>
        )}
      </RoutineAsync>

      {draft && (
        <RoutineDialog
          open
          onOpenChange={(o) => !o && setDraft(null)}
          title={draft.id ? "Edit reminder" : "New reminder"}
          submitLabel={draft.id ? "Save changes" : "Set reminder"}
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
          <Field label="Remind me to" required>
            {(id) => (
              <Input
                id={id}
                autoFocus
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="Email my counsellor"
              />
            )}
          </Field>

          <FieldRow>
            <Field label="When" required>
              {(id) => (
                <Input
                  id={id}
                  type="datetime-local"
                  value={toLocalInput(draft.remind_at)}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      remind_at: fromLocalInput(e.target.value) ?? draft.remind_at,
                    })
                  }
                />
              )}
            </Field>
            <Field label="Repeat">
              {(id) => (
                <EnumSelect
                  id={id}
                  value={draft.repeat_rule}
                  onChange={(v) => setDraft({ ...draft, repeat_rule: v })}
                  options={REPEAT_OPTIONS}
                  labels={REPEAT_LABEL}
                />
              )}
            </Field>
          </FieldRow>

          <Field label="Notes">
            {(id) => (
              <Textarea
                id={id}
                rows={2}
                value={draft.notes ?? ""}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                placeholder="Anything you'll want in front of you at the time"
              />
            )}
          </Field>

          <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
            <div className="pr-3">
              <Label htmlFor="reminder-notify" className="text-xs font-semibold">
                Notify me
              </Label>
              <p className="text-[11px] leading-snug text-muted-foreground">
                Sends this to your Pathforge notifications when it comes due and you have the app
                open.
              </p>
            </div>
            <Switch
              id="reminder-notify"
              checked={draft.notify}
              onCheckedChange={(v) => setDraft({ ...draft, notify: v })}
            />
          </div>
        </RoutineDialog>
      )}
    </RoutineShell>
  );
}

/**
 * The most recent occurrence at or before `now`, or null if none has happened.
 *
 * `nextReminderOccurrence` answers the forward question (what the list renders);
 * the notifier needs the backward one, because "have I already announced this?"
 * is a comparison against the occurrence that just passed. Bounded for the same
 * reason its forward twin is: malformed data must not spin.
 */
function latestOccurrenceBy(r: RoutineReminder, now: Date): Date | null {
  const anchor = new Date(r.remind_at);
  if (Number.isNaN(anchor.getTime()) || anchor > now) return null;
  if (r.repeat_rule === "none") return anchor;

  const cursor = new Date(anchor);
  let latest = new Date(anchor);
  for (let i = 0; i < 4000; i++) {
    switch (r.repeat_rule) {
      case "daily":
        cursor.setDate(cursor.getDate() + 1);
        break;
      case "weekdays":
        do {
          cursor.setDate(cursor.getDate() + 1);
        } while (cursor.getDay() === 0 || cursor.getDay() === 6);
        break;
      case "weekly":
        cursor.setDate(cursor.getDate() + 7);
        break;
      case "monthly":
        cursor.setMonth(cursor.getMonth() + 1);
        break;
      case "yearly":
        cursor.setFullYear(cursor.getFullYear() + 1);
        break;
      default:
        return latest;
    }
    if (cursor > now) break;
    latest = new Date(cursor);
  }
  return latest;
}

/**
 * Fires due reminders through the app's existing notification system.
 *
 * Deliberately *not* a second notification stack: `notifyReminderDue` writes the
 * same `notifications` row the bell already reads. `last_notified_at` is stamped
 * on the row, so a reminder fires once even across a refresh or a second tab,
 * and a repeating reminder fires again only after its next occurrence passes.
 */
function useReminderNotifier(
  reminders: RoutineReminder[],
  now: Date,
  update: (args: { id: string; patch: Partial<NewRoutineReminder> }) => Promise<void>,
) {
  // In-flight guard: the effect can re-run before the write lands, and firing
  // the same reminder twice is exactly the failure this page must not have.
  const firing = useRef<Set<string>>(new Set());

  useEffect(() => {
    for (const r of reminders) {
      if (r.status !== "pending" || !r.notify) continue;
      if (firing.current.has(r.id)) continue;

      const due = latestOccurrenceBy(r, now);
      if (!due) continue;
      const last = r.last_notified_at ? new Date(r.last_notified_at) : null;
      // Already announced this occurrence. For a repeating reminder the *next*
      // occurrence is a different one and will pass this test on its own.
      if (last && last >= due) continue;

      firing.current.add(r.id);
      void notifyReminderDue({
        title: "Reminder",
        message: r.notes ? `${r.title} — ${r.notes}` : r.title,
      })
        .then(() => update({ id: r.id, patch: { last_notified_at: new Date().toISOString() } }))
        .catch(() => {
          /* a failed nudge should never break the page */
        })
        .finally(() => firing.current.delete(r.id));
    }
  }, [reminders, now, update]);
}

function ReminderList({
  items,
  now,
  onOpen,
  onComplete,
  onDelete,
}: {
  items: { reminder: RoutineReminder; at: Date }[];
  now: Date;
  onOpen: (r: RoutineReminder) => void;
  onComplete: (r: RoutineReminder) => void;
  onDelete: (r: RoutineReminder) => void;
}) {
  return (
    <motion.ul
      variants={staggerParent}
      custom={staggerStep(items.length)}
      initial="hidden"
      animate="visible"
      className="space-y-2"
    >
      <AnimatePresence initial={false}>
        {items.map(({ reminder: r, at }) => {
          const late = at < now;
          return (
            <motion.li key={r.id} variants={listItem} exit="exit" layout>
              <div
                className={cn(
                  "group flex items-center gap-3 rounded-xl border bg-card/60 p-3 transition-colors",
                  late ? "border-destructive/40 bg-destructive/5" : "border-border hover:border-accent/50",
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                    late
                      ? "border-destructive/40 text-destructive"
                      : "border-border text-muted-foreground",
                  )}
                >
                  {r.notify ? <BellRing className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                </span>

                <button type="button" onClick={() => onOpen(r)} className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-medium text-foreground">{r.title}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                    <span className={cn("tabular-nums", late && "font-semibold text-destructive")}>
                      {relativeDayLabel(at, now)} at {formatClock(at)}
                    </span>
                    <span className="tabular-nums">({relativeTime(at, now)})</span>
                    {r.repeat_rule !== "none" && (
                      <span className="inline-flex items-center gap-1">
                        <Repeat className="h-3 w-3" />
                        {REPEAT_LABEL[r.repeat_rule] ?? r.repeat_rule}
                      </span>
                    )}
                  </p>
                  {r.notes && (
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground/80">{r.notes}</p>
                  )}
                </button>

                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title={`Mark ${r.title} done`}
                    onClick={() => onComplete(r)}
                  >
                    <Check className="h-4 w-4" />
                    <span className="sr-only">Mark {r.title} done</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 hover:text-destructive"
                    title={`Delete ${r.title}`}
                    onClick={() => onDelete(r)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="sr-only">Delete {r.title}</span>
                  </Button>
                </div>
              </div>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </motion.ul>
  );
}
