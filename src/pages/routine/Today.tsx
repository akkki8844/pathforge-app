import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CalendarClock, CalendarRange, ListChecks, Sun, Timer } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useRoutineSources, useTimetableImage } from "@/hooks/routine/useRoutineData";
import { TimetableEmptyNotice } from "@/components/routine/TimetableEmptyNotice";
import { TimetableImageView } from "@/components/routine/TimetableImage";
import {
  RoutineAsync,
  RoutineEmptyState,
} from "@/components/routine/RoutineStates";
import { RoutinePanel } from "@/components/routine/RoutineShell";
import { RoutineShell } from "@/components/routine/RoutineShell";
import { DURATION, EASE_OUT_EXPO } from "@/lib/motion";
import {
  buildAgenda,
  happeningNow,
  nextUp,
  overdueTasks,
  summarizeDay,
} from "@/lib/routine/derive";
import { formatLongDate, greeting } from "@/lib/routine/dates";
import type { AgendaItem, RoutineTask } from "@/lib/routine/types";
import { AgendaList } from "@/components/routine/today/AgendaList";
import { NextUpCard } from "@/components/routine/today/NextUpCard";
import { DayProgress } from "@/components/routine/today/DayProgress";
import { OverdueStrip } from "@/components/routine/today/OverdueStrip";
import { QuickActions } from "@/components/routine/today/QuickActions";

/** First name from the fullest source available, degrading gracefully. */
function firstName(
  full: string | null | undefined,
  username: string | null | undefined,
  email: string | null | undefined,
): string {
  const n = (full || "").trim().split(/\s+/)[0];
  if (n) return n;
  if (username && username.trim()) return username.trim();
  const e = (email || "").split("@")[0];
  return e ? e.charAt(0).toUpperCase() + e.slice(1) : "there";
}

/** A clock the page owns, ticking every 30s so countdowns stay live. */
function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

export default function Today() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const now = useNow();
  const {
    sources,
    loading,
    error,
    tasks: taskApi,
    study: studyApi,
    reminders: reminderApi,
    habits: habitApi,
  } = useRoutineSources();
  const { image: timetableImage, imageUrl: timetableUrl, urlLoading: timetableUrlLoading } =
    useTimetableImage();

  // Keys currently being written, so a row can't be double-fired mid-flight.
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(new Set());

  const agenda = useMemo(
    () => buildAgenda(sources, now, { now }),
    [sources, now],
  );
  const summary = useMemo(() => summarizeDay(sources, now, now), [sources, now]);
  const overdue = useMemo(
    () => overdueTasks(sources.tasks ?? [], now),
    [sources.tasks, now],
  );

  const live = useMemo(() => happeningNow(agenda, now), [agenda, now]);
  const liveKeys = useMemo(() => new Set(live.map((i) => i.key)), [live]);
  const next = useMemo(() => nextUp(agenda, now), [agenda, now]);
  const focusItem = live[0] ?? next;
  const focusMode: "now" | "next" = live.length > 0 ? "now" : "next";

  const name = firstName(profile?.full_name, profile?.username, profile?.email || user?.email);

  const hasAnyData =
    (sources.classes?.length ?? 0) +
      (sources.tasks?.length ?? 0) +
      (sources.studyBlocks?.length ?? 0) +
      (sources.reminders?.length ?? 0) +
      (sources.events?.length ?? 0) +
      (sources.habits?.length ?? 0) >
      0 || Boolean(timetableImage);

  const isActionable = useCallback((item: AgendaItem): boolean => {
    switch (item.kind) {
      case "task":
      case "habit":
      case "reminder":
        return true;
      case "study":
        // completeStudyBlock is one-way here, so only offer it while open.
        return !item.done;
      default:
        return false;
    }
  }, []);

  const withPending = useCallback(
    async (key: string, run: () => Promise<unknown>) => {
      setPendingKeys((prev) => new Set(prev).add(key));
      try {
        await run();
      } catch (err) {
        toast.error("Couldn't save that", {
          description: err instanceof Error ? err.message : "Please try again.",
        });
      } finally {
        setPendingKeys((prev) => {
          const nextSet = new Set(prev);
          nextSet.delete(key);
          return nextSet;
        });
      }
    },
    [],
  );

  const toggleAgendaItem = useCallback(
    (item: AgendaItem) => {
      void withPending(item.key, async () => {
        switch (item.kind) {
          case "task": {
            const task = (sources.tasks ?? []).find((t) => t.id === item.sourceId);
            if (task) await taskApi.toggleTask(task);
            break;
          }
          case "habit":
            await habitApi.toggleHabitDay({ habitId: item.sourceId, day: now });
            break;
          case "study": {
            const block = (sources.studyBlocks ?? []).find((b) => b.id === item.sourceId);
            if (block && item.done !== true) await studyApi.completeStudyBlock(block);
            break;
          }
          case "reminder": {
            const reminder = (sources.reminders ?? []).find((r) => r.id === item.sourceId);
            if (reminder && reminder.status === "pending") {
              await reminderApi.completeReminder(reminder.id);
            } else {
              await reminderApi.restoreReminder(item.sourceId);
            }
            break;
          }
          default:
            break;
        }
      });
    },
    [withPending, sources, now, taskApi, habitApi, studyApi, reminderApi],
  );

  const completeOverdue = useCallback(
    (task: RoutineTask) => {
      void withPending(`overdue:${task.id}`, () => taskApi.toggleTask(task));
    },
    [withPending, taskApi],
  );

  const overduePendingIds = useMemo(() => {
    const ids = new Set<string>();
    overdue.forEach((t) => {
      if (pendingKeys.has(`overdue:${t.id}`)) ids.add(t.id);
    });
    return ids;
  }, [overdue, pendingKeys]);

  return (
    <RoutineShell
      title="Today"
      purpose="Your day at a glance, and what to do next."
      icon={Sun}
      path="/routine/today"
      actions={
        <Link
          to="/routine/focus"
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/20"
        >
          <Timer className="h-3.5 w-3.5" />
          Start focus
        </Link>
      }
    >
      {/* Greeting — the shell header states what the page is for; this is the
          personal note that opens the day. */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: DURATION.base, ease: EASE_OUT_EXPO }}
        className="mb-6"
      >
        <p className="font-display text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          {formatLongDate(now)}
        </p>
        <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {greeting(now)}, {name}.
        </h2>
      </motion.div>

      <RoutineAsync loading={loading} error={error} onRetry={() => taskApi.refetch()}>
        {!hasAnyData ? (
          <RoutineEmptyState
            icon={Sun}
            title="Your day, once it's set up"
            description="Today pulls together your classes, study blocks, tasks, reminders and habits into one timeline — with what's next up front. Add a class or a task and it starts filling in."
            actionLabel="Add your timetable"
            onAction={() => navigate("/routine/timetable")}
            secondaryLabel="Add a task"
            onSecondary={() => navigate("/routine/tasks")}
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-3 lg:gap-6">
            {/* Secondary column — first on mobile so Next up leads. */}
            <div className="order-1 space-y-4 lg:order-2 lg:col-span-1">
              <NextUpCard
                item={focusItem}
                mode={focusMode}
                now={now}
                actionable={focusItem ? isActionable(focusItem) : false}
                pending={focusItem ? pendingKeys.has(focusItem.key) : false}
                onToggle={toggleAgendaItem}
              />
              <DayProgress summary={summary} />

              {/*
               * Today's classes normally arrive through the agenda — `buildAgenda`
               * projects `routine_classes` onto the day, so a student with a
               * structured timetable needs nothing extra here. This slot is for
               * the two cases where that produces silence: an image-only
               * timetable, which has never been parsed and so cannot yield class
               * times without inventing them, and no timetable at all.
               */}
              {(sources.classes?.length ?? 0) === 0 && (
                <RoutinePanel
                  title="Timetable"
                  icon={CalendarRange}
                  description={
                    timetableImage ? "Your uploaded timetable image." : undefined
                  }
                >
                  {timetableImage ? (
                    <div className="space-y-3">
                      <TimetableImageView
                        url={timetableUrl}
                        loading={timetableUrlLoading}
                        maxHeightClass="max-h-48"
                      />
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        These classes aren&rsquo;t listed in your day above — nothing has read the
                        times off the image.{" "}
                        <Link
                          to="/routine/timetable"
                          className="font-semibold text-accent underline-offset-4 hover:underline"
                        >
                          Add them
                        </Link>{" "}
                        to see them in your agenda.
                      </p>
                    </div>
                  ) : (
                    <TimetableEmptyNotice tone="bare" />
                  )}
                </RoutinePanel>
              )}

              <QuickActions />
              <OverdueStrip
                tasks={overdue}
                now={now}
                pendingIds={overduePendingIds}
                onComplete={completeOverdue}
              />
            </div>

            {/* Primary column — the day itself. */}
            <div className="order-2 lg:order-1 lg:col-span-2">
              <RoutinePanel
                title="Today at a glance"
                icon={CalendarClock}
                description={
                  agenda.length
                    ? `${agenda.length} item${agenda.length === 1 ? "" : "s"} on your day`
                    : undefined
                }
              >
                {agenda.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-8 text-center">
                    <ListChecks className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Nothing scheduled today
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        No classes, blocks or deadlines land on today.
                      </p>
                    </div>
                    <Link
                      to="/routine/study-planner"
                      className="text-sm font-semibold text-accent hover:underline"
                    >
                      Plan a study block
                    </Link>
                  </div>
                ) : (
                  <AgendaList
                    items={agenda}
                    isActionable={isActionable}
                    pendingKeys={pendingKeys}
                    onToggle={toggleAgendaItem}
                    liveKeys={liveKeys}
                  />
                )}
              </RoutinePanel>
            </div>
          </div>
        )}
      </RoutineAsync>
    </RoutineShell>
  );
}
