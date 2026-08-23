/**
 * Derivations shared by every Routine page.
 *
 * This is where the "one source of truth, many views" promise is actually kept.
 * A class exists once, in `routine_classes`; Today and Calendar both show it
 * because they both call {@link buildAgenda} over the same rows. A habit streak
 * is not a stored counter that could drift — it is computed from the log table
 * by {@link habitStats} on every render. A goal's percentage is not a column
 * that a task-completion handler has to remember to bump; {@link goalProgress}
 * reads the milestones and linked work.
 *
 * Everything here is a pure function of rows in and values out: no Supabase, no
 * React, no clock reads except through an injectable `now`. That is what makes
 * the cross-page invariants testable and keeps nine pages from each inventing a
 * slightly different definition of "overdue".
 */
import {
  addDays,
  atTimeOn,
  dateKey,
  daysBetween,
  endOfDay,
  isSameDay,
  parseDateKey,
  startOfDay,
  timeToMinutes,
} from "./dates";
import { KIND_COLOR, colorForSubject } from "./colors";
import type {
  AgendaItem,
  RoutineClass,
  RoutineEvent,
  RoutineFocusSession,
  RoutineGoal,
  RoutineGoalMilestone,
  RoutineHabit,
  RoutineHabitLog,
  RoutineReminder,
  RoutineStudyBlock,
  RoutineTask,
  Weekday,
} from "./types";

/** Everything the agenda builder can draw from. All fields optional. */
export interface RoutineSources {
  classes?: RoutineClass[];
  studyBlocks?: RoutineStudyBlock[];
  tasks?: RoutineTask[];
  reminders?: RoutineReminder[];
  events?: RoutineEvent[];
  habits?: RoutineHabit[];
  habitLogs?: RoutineHabitLog[];
  goals?: RoutineGoal[];
  goalMilestones?: RoutineGoalMilestone[];
}

export interface AgendaOptions {
  /** Which sources to include. Calendar takes all; Today drops nothing but orders differently. */
  kinds?: AgendaItem["kind"][];
  /** Treated as "now" for overdue/countdown decisions. Injectable for tests. */
  now?: Date;
}

// ── Timetable occurrences ────────────────────────────────────────────────

/** The classes that meet on a given day, earliest first. */
export function classesOnDay(classes: RoutineClass[], day: Date): RoutineClass[] {
  const dow = day.getDay() as Weekday;
  return classes
    .filter((c) => c.is_active && c.days_of_week?.includes(dow))
    .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
}

// ── Habits ───────────────────────────────────────────────────────────────

/**
 * Whether a habit is *due* on a day.
 *
 * "daily" is every day. "custom" is the listed weekdays. "weekly" has no fixed
 * days — the student owes N completions across the week — so it is treated as
 * due every day until the weekly target is met, which is what makes it show up
 * on Today at all without pinning it to an arbitrary weekday.
 */
export function habitDueOn(habit: RoutineHabit, day: Date, logs: RoutineHabitLog[] = []): boolean {
  if (habit.is_archived) return false;
  if (habit.frequency === "daily") return true;
  if (habit.frequency === "custom") return habit.target_days?.includes(day.getDay() as Weekday) ?? false;
  // weekly
  const weekStart = addDays(startOfDay(day), -((day.getDay() + 6) % 7));
  const done = logs.filter((l) => {
    if (l.habit_id !== habit.id) return false;
    const d = parseDateKey(l.log_date);
    return d >= weekStart && d < addDays(weekStart, 7);
  }).length;
  return done < habit.target_per_week;
}

export function habitDoneOn(habitId: string, day: Date, logs: RoutineHabitLog[]): boolean {
  const key = dateKey(day);
  return logs.some((l) => l.habit_id === habitId && l.log_date === key);
}

export interface HabitStats {
  /** Consecutive due-and-done days ending today (or yesterday, if today isn't logged yet). */
  currentStreak: number;
  bestStreak: number
  /** Completions in the last 7 days, including today. */
  last7: number;
  /** Completions in the last 30 days. */
  last30: number;
  /** Share of *due* days in the last 30 that were completed, 0–100. */
  consistency: number;
  totalCompletions: number;
  doneToday: boolean;
  dueToday: boolean;
}

/**
 * Streaks are counted over days the habit was actually due, so a Mon/Wed/Fri
 * habit is not "broken" by a Tuesday. Today is allowed to be unlogged without
 * ending the streak — the day isn't over yet — but it doesn't extend it either.
 */
export function habitStats(
  habit: RoutineHabit,
  logs: RoutineHabitLog[],
  now: Date = new Date(),
): HabitStats {
  const mine = logs.filter((l) => l.habit_id === habit.id);
  const doneKeys = new Set(mine.map((l) => l.log_date));
  const today = startOfDay(now);

  const doneToday = doneKeys.has(dateKey(today));
  const dueToday = habitDueOn(habit, today, logs);

  let currentStreak = 0;
  // Start at today when it's logged, otherwise yesterday: an unlogged today is
  // "not yet", not "missed".
  let cursor = doneToday ? today : addDays(today, -1);
  // 400 is a hard stop, not a semantic limit — it keeps a corrupt log set from
  // walking backwards forever.
  for (let i = 0; i < 400; i++) {
    if (!habitDueOn(habit, cursor, logs)) {
      cursor = addDays(cursor, -1);
      continue;
    }
    if (!doneKeys.has(dateKey(cursor))) break;
    currentStreak++;
    cursor = addDays(cursor, -1);
  }

  // Best streak walks the log history forward, allowing gaps on non-due days.
  const sorted = [...mine].sort((a, b) => a.log_date.localeCompare(b.log_date));
  let bestStreak = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const log of sorted) {
    const d = parseDateKey(log.log_date);
    if (prev) {
      let gapOnlyNonDue = true;
      for (let c = addDays(prev, 1); c < d; c = addDays(c, 1)) {
        if (habitDueOn(habit, c, logs)) { gapOnlyNonDue = false; break; }
      }
      run = gapOnlyNonDue ? run + 1 : 1;
    } else {
      run = 1;
    }
    bestStreak = Math.max(bestStreak, run);
    prev = d;
  }
  bestStreak = Math.max(bestStreak, currentStreak);

  const within = (days: number) =>
    mine.filter((l) => {
      const delta = daysBetween(parseDateKey(l.log_date), today);
      return delta >= 0 && delta < days;
    }).length;

  let due30 = 0;
  for (let i = 0; i < 30; i++) {
    if (habitDueOn(habit, addDays(today, -i), logs)) due30++;
  }
  const last30 = within(30);

  return {
    currentStreak,
    bestStreak,
    last7: within(7),
    last30,
    consistency: due30 ? Math.round((Math.min(last30, due30) / due30) * 100) : 0,
    totalCompletions: mine.length,
    doneToday,
    dueToday,
  };
}

// ── Reminders ────────────────────────────────────────────────────────────

/**
 * The next time a reminder fires on or after `from`.
 *
 * A non-repeating reminder has exactly one occurrence, which may be in the
 * past — that is precisely the "overdue reminder" state the Reminders page
 * surfaces, so it is returned as-is rather than skipped. Repeating rules are
 * rolled forward from the anchor instant, which preserves the original
 * time-of-day.
 */
export function nextReminderOccurrence(
  reminder: RoutineReminder,
  from: Date = new Date(),
): Date {
  const anchor = new Date(reminder.remind_at);
  if (reminder.repeat_rule === "none" || reminder.status !== "pending") return anchor;
  if (anchor >= from) return anchor;

  const cursor = new Date(anchor);
  // Bounded roll-forward: enough to cross a decade of daily repeats without
  // ever becoming an unbounded loop on malformed data.
  for (let i = 0; i < 4000; i++) {
    switch (reminder.repeat_rule) {
      case "daily":
        cursor.setDate(cursor.getDate() + 1);
        break;
      case "weekdays":
        do { cursor.setDate(cursor.getDate() + 1); }
        while (cursor.getDay() === 0 || cursor.getDay() === 6);
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
        return cursor;
    }
    if (cursor >= from) return cursor;
  }
  return cursor;
}

export function remindersOnDay(
  reminders: RoutineReminder[],
  day: Date,
  now: Date = new Date(),
): { reminder: RoutineReminder; at: Date }[] {
  const out: { reminder: RoutineReminder; at: Date }[] = [];
  for (const r of reminders) {
    if (r.repeat_rule === "none" || r.status !== "pending") {
      const at = new Date(r.remind_at);
      if (isSameDay(at, day)) out.push({ reminder: r, at });
      continue;
    }
    // A repeating reminder: ask for the first occurrence from this day's start
    // and keep it only if it lands inside the day.
    const at = nextReminderOccurrence(r, startOfDay(day));
    if (isSameDay(at, day)) out.push({ reminder: r, at });
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime());
}

// ── The unified agenda ───────────────────────────────────────────────────

/**
 * Flattens every source into one chronological list for a single day.
 *
 * Ordering is: timed items by clock, then all-day items, with done items sinking
 * below outstanding ones at the same time. This is the projection Today's
 * timeline and Calendar's day panel both render — neither builds its own.
 */
export function buildAgenda(
  sources: RoutineSources,
  day: Date,
  options: AgendaOptions = {},
): AgendaItem[] {
  const now = options.now ?? new Date();
  const allow = options.kinds;
  const wants = (k: AgendaItem["kind"]) => !allow || allow.includes(k);
  const items: AgendaItem[] = [];
  const dayStart = startOfDay(day);
  const dayEnd = endOfDay(day);

  if (wants("class")) {
    for (const c of classesOnDay(sources.classes ?? [], day)) {
      const start = atTimeOn(day, c.start_time);
      const end = atTimeOn(day, c.end_time);
      items.push({
        key: `class:${c.id}:${dateKey(day)}`,
        kind: "class",
        sourceId: c.id,
        title: c.subject,
        subtitle: [c.location, c.teacher].filter(Boolean).join(" · ") || undefined,
        start,
        end,
        allDay: false,
        // A class is not something you tick off; it is over once it's over.
        done: end < now,
        overdue: false,
        color: (c.color as AgendaItem["color"]) ?? KIND_COLOR.class,
      });
    }
  }

  if (wants("study")) {
    for (const b of sources.studyBlocks ?? []) {
      if (b.scheduled_date !== dateKey(day)) continue;
      const start = atTimeOn(day, b.scheduled_start);
      items.push({
        key: `study:${b.id}`,
        kind: "study",
        sourceId: b.id,
        title: b.topic ? `${b.subject}: ${b.topic}` : b.subject,
        subtitle: b.objective ?? undefined,
        start,
        end: b.scheduled_start
          ? new Date(start.getTime() + b.planned_minutes * 60_000)
          : undefined,
        allDay: !b.scheduled_start,
        done: b.status === "completed",
        // A planned block whose day has passed unfinished is a missed session.
        overdue: b.status !== "completed" && b.status !== "skipped" && dayEnd < now,
        priority: b.priority,
        color: colorForSubject(b.subject),
      });
    }
  }

  if (wants("task")) {
    for (const t of sources.tasks ?? []) {
      if (!t.due_at) continue;
      const due = new Date(t.due_at);
      if (due < dayStart || due > dayEnd) continue;
      items.push({
        key: `task:${t.id}`,
        kind: "task",
        sourceId: t.id,
        title: t.title,
        subtitle: t.description ?? undefined,
        start: due,
        allDay: false,
        done: t.status === "done",
        overdue: t.status !== "done" && due < now,
        priority: t.priority,
        color: KIND_COLOR.task,
      });
    }
  }

  if (wants("reminder")) {
    for (const { reminder, at } of remindersOnDay(sources.reminders ?? [], day, now)) {
      items.push({
        key: `reminder:${reminder.id}:${dateKey(day)}`,
        kind: "reminder",
        sourceId: reminder.id,
        title: reminder.title,
        subtitle: reminder.notes ?? undefined,
        start: at,
        allDay: false,
        done: reminder.status !== "pending",
        overdue: reminder.status === "pending" && at < now,
        color: KIND_COLOR.reminder,
      });
    }
  }

  if (wants("event")) {
    for (const e of sources.events ?? []) {
      const start = new Date(e.starts_at);
      const end = e.ends_at ? new Date(e.ends_at) : undefined;
      // A multi-day event should appear on every day it spans, not only day one.
      const spansDay = start <= dayEnd && (end ?? start) >= dayStart;
      if (!spansDay) continue;
      items.push({
        key: `event:${e.id}:${dateKey(day)}`,
        kind: "event",
        sourceId: e.id,
        title: e.title,
        subtitle: [e.location, e.category === "other" ? null : e.category]
          .filter(Boolean)
          .join(" · ") || undefined,
        start: e.all_day ? dayStart : start,
        end,
        allDay: e.all_day,
        done: (end ?? start) < now,
        overdue: false,
        color: KIND_COLOR.event,
      });
    }
  }

  if (wants("habit")) {
    const logs = sources.habitLogs ?? [];
    for (const h of sources.habits ?? []) {
      if (!habitDueOn(h, day, logs)) continue;
      const timed = Boolean(h.preferred_time);
      items.push({
        key: `habit:${h.id}:${dateKey(day)}`,
        kind: "habit",
        sourceId: h.id,
        title: h.name,
        subtitle: h.target_quantity
          ? `${h.target_quantity}${h.unit ? ` ${h.unit}` : ""}`
          : undefined,
        start: atTimeOn(day, h.preferred_time),
        allDay: !timed,
        done: habitDoneOn(h.id, day, logs),
        overdue: false,
        color: (h.color as AgendaItem["color"]) ?? KIND_COLOR.habit,
      });
    }
  }

  if (wants("goal")) {
    const goalTitle = new Map((sources.goals ?? []).map((g) => [g.id, g.title]));
    for (const g of sources.goals ?? []) {
      if (!g.target_date || g.status === "archived") continue;
      if (parseDateKey(g.target_date).getTime() !== dayStart.getTime()) continue;
      items.push({
        key: `goal:${g.id}`,
        kind: "goal",
        sourceId: g.id,
        title: g.title,
        subtitle: "Goal deadline",
        start: dayStart,
        allDay: true,
        done: g.status === "completed",
        overdue: g.status !== "completed" && dayEnd < now,
        priority: g.priority,
        color: KIND_COLOR.goal,
      });
    }
    for (const m of sources.goalMilestones ?? []) {
      if (m.is_complete || !m.due_date) continue;
      if (parseDateKey(m.due_date).getTime() !== dayStart.getTime()) continue;
      items.push({
        key: `goal-milestone:${m.id}`,
        kind: "goal",
        sourceId: m.goal_id,
        title: m.title,
        subtitle: goalTitle.get(m.goal_id),
        start: dayStart,
        allDay: true,
        done: false,
        overdue: dayEnd < now,
        color: KIND_COLOR.goal,
      });
    }
  }

  return items.sort((a, b) => {
    if (a.allDay !== b.allDay) return a.allDay ? 1 : -1;
    const t = a.start.getTime() - b.start.getTime();
    if (t !== 0) return t;
    if (a.done !== b.done) return a.done ? 1 : -1;
    return a.title.localeCompare(b.title);
  });
}

/** The next thing that hasn't happened yet. What Today's "Next up" card renders. */
export function nextUp(agenda: AgendaItem[], now: Date = new Date()): AgendaItem | null {
  return (
    agenda.find((i) => !i.done && !i.allDay && i.start > now) ??
    agenda.find((i) => !i.done && !i.allDay && (i.end ?? i.start) > now) ??
    null
  );
}

/** Items currently underway — a class you're sitting in, a block you're mid-way through. */
export function happeningNow(agenda: AgendaItem[], now: Date = new Date()): AgendaItem[] {
  return agenda.filter((i) => !i.allDay && i.end && i.start <= now && i.end > now);
}

// ── Progress summaries ───────────────────────────────────────────────────

export interface DaySummary {
  tasksTotal: number;
  tasksDone: number;
  studyPlannedMinutes: number;
  studyCompletedMinutes: number;
  habitsDue: number;
  habitsDone: number;
  classCount: number;
  remindersPending: number;
  /** 0–100 across tasks, study minutes and habits, weighted equally by count. */
  overall: number;
}

export function summarizeDay(
  sources: RoutineSources,
  day: Date,
  now: Date = new Date(),
): DaySummary {
  const key = dateKey(day);
  const blocks = (sources.studyBlocks ?? []).filter((b) => b.scheduled_date === key);
  const dayStart = startOfDay(day);
  const dayEnd = endOfDay(day);
  const tasks = (sources.tasks ?? []).filter((t) => {
    if (!t.due_at) return false;
    const d = new Date(t.due_at);
    return d >= dayStart && d <= dayEnd;
  });
  const logs = sources.habitLogs ?? [];
  const dueHabits = (sources.habits ?? []).filter((h) => habitDueOn(h, day, logs));

  const tasksDone = tasks.filter((t) => t.status === "done").length;
  const studyPlanned = blocks.reduce((s, b) => s + b.planned_minutes, 0);
  const studyDone = blocks.reduce((s, b) => s + b.completed_minutes, 0);
  const habitsDone = dueHabits.filter((h) => habitDoneOn(h.id, day, logs)).length;

  const parts: number[] = [];
  if (tasks.length) parts.push(tasksDone / tasks.length);
  if (studyPlanned) parts.push(Math.min(1, studyDone / studyPlanned));
  if (dueHabits.length) parts.push(habitsDone / dueHabits.length);

  return {
    tasksTotal: tasks.length,
    tasksDone,
    studyPlannedMinutes: studyPlanned,
    studyCompletedMinutes: studyDone,
    habitsDue: dueHabits.length,
    habitsDone,
    classCount: classesOnDay(sources.classes ?? [], day).length,
    remindersPending: remindersOnDay(sources.reminders ?? [], day, now).filter(
      (r) => r.reminder.status === "pending",
    ).length,
    overall: parts.length
      ? Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 100)
      : 0,
  };
}

/** Tasks past their deadline and still open. Shared by Today and Tasks. */
export function overdueTasks(tasks: RoutineTask[], now: Date = new Date()): RoutineTask[] {
  return tasks
    .filter((t) => t.status !== "done" && t.due_at && new Date(t.due_at) < now)
    .sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime());
}

// ── Goals ────────────────────────────────────────────────────────────────

export interface GoalProgress {
  percent: number;
  milestonesTotal: number;
  milestonesDone: number;
  linkedTasksTotal: number;
  linkedTasksDone: number;
  linkedStudyMinutes: number;
  nextMilestone: RoutineGoalMilestone | null;
  overdueMilestones: RoutineGoalMilestone[];
  /** Null when the goal has no target date. Negative once the date has passed. */
  daysRemaining: number | null;
}

/**
 * A goal's completion, derived rather than stored.
 *
 * Precedence: an explicit `progress_override` wins (some goals genuinely can't
 * be computed — "reach 90% in Biology" is a number only the student knows).
 * Otherwise milestones drive it, because that is the student's own breakdown of
 * the goal. Linked tasks are the fallback for a goal with no milestones yet, so
 * a freshly created goal with three linked tasks still shows movement. A goal
 * marked `completed` reads 100 regardless — the status is the student's
 * assertion and outranks the arithmetic.
 */
export function goalProgress(
  goal: RoutineGoal,
  milestones: RoutineGoalMilestone[],
  tasks: RoutineTask[] = [],
  studyBlocks: RoutineStudyBlock[] = [],
  now: Date = new Date(),
): GoalProgress {
  const mine = milestones
    .filter((m) => m.goal_id === goal.id)
    .sort((a, b) => a.sort_order - b.sort_order);
  const linkedTasks = tasks.filter((t) => t.goal_id === goal.id);
  const linkedBlocks = studyBlocks.filter((b) => b.goal_id === goal.id);

  const milestonesDone = mine.filter((m) => m.is_complete).length;
  const linkedTasksDone = linkedTasks.filter((t) => t.status === "done").length;

  let percent: number;
  if (goal.status === "completed") percent = 100;
  else if (goal.progress_override !== null) percent = goal.progress_override;
  else if (mine.length) percent = Math.round((milestonesDone / mine.length) * 100);
  else if (linkedTasks.length) percent = Math.round((linkedTasksDone / linkedTasks.length) * 100);
  else percent = 0;

  const today = startOfDay(now);
  return {
    percent: Math.max(0, Math.min(100, percent)),
    milestonesTotal: mine.length,
    milestonesDone,
    linkedTasksTotal: linkedTasks.length,
    linkedTasksDone,
    linkedStudyMinutes: linkedBlocks.reduce((s, b) => s + b.completed_minutes, 0),
    nextMilestone:
      mine.find((m) => !m.is_complete && (!m.due_date || parseDateKey(m.due_date) >= today)) ??
      mine.find((m) => !m.is_complete) ??
      null,
    overdueMilestones: mine.filter(
      (m) => !m.is_complete && m.due_date && parseDateKey(m.due_date) < today,
    ),
    daysRemaining: goal.target_date ? daysBetween(today, parseDateKey(goal.target_date)) : null,
  };
}

// ── Focus analytics ──────────────────────────────────────────────────────

export interface FocusStats {
  totalMinutes: number;
  sessionCount: number;
  averageMinutes: number;
  todayMinutes: number;
  weekMinutes: number;
  /** Distinct days with at least one focus session in the last 14. */
  activeDaysLast14: number;
  currentStreak: number;
  /** Minutes per day for the last 7 days, oldest first — for the sparkline. */
  last7Days: { date: Date; minutes: number }[];
}

/**
 * Break modes are excluded from every figure here: a student who sat through
 * four long breaks has not focused for an hour, and counting them would make the
 * "total focus time" headline dishonest.
 */
export function focusStats(
  sessions: RoutineFocusSession[],
  now: Date = new Date(),
): FocusStats {
  const work = sessions.filter(
    (s) => s.mode !== "short_break" && s.mode !== "long_break" && s.actual_minutes > 0,
  );
  const today = startOfDay(now);
  const minutesOn = (day: Date) =>
    work
      .filter((s) => isSameDay(new Date(s.started_at), day))
      .reduce((sum, s) => sum + s.actual_minutes, 0);

  const weekStart = addDays(today, -((now.getDay() + 6) % 7));
  const total = work.reduce((s, x) => s + x.actual_minutes, 0);

  const dayKeys = new Set(work.map((s) => dateKey(new Date(s.started_at))));
  let activeDaysLast14 = 0;
  for (let i = 0; i < 14; i++) {
    if (dayKeys.has(dateKey(addDays(today, -i)))) activeDaysLast14++;
  }
  let currentStreak = 0;
  // Same "today doesn't count against you yet" rule as habit streaks.
  for (let i = dayKeys.has(dateKey(today)) ? 0 : 1; i < 400; i++) {
    if (!dayKeys.has(dateKey(addDays(today, -i)))) break;
    currentStreak++;
  }

  return {
    totalMinutes: total,
    sessionCount: work.length,
    averageMinutes: work.length ? Math.round(total / work.length) : 0,
    todayMinutes: minutesOn(today),
    weekMinutes: work
      .filter((s) => new Date(s.started_at) >= weekStart)
      .reduce((sum, s) => sum + s.actual_minutes, 0),
    activeDaysLast14,
    currentStreak,
    last7Days: Array.from({ length: 7 }, (_, i) => {
      const d = addDays(today, -(6 - i));
      return { date: d, minutes: minutesOn(d) };
    }),
  };
}

/**
 * Subjects the student has on record, best-effort, most-used first.
 *
 * Study Planner and Focus both need a subject picker, and the honest source is
 * whatever the student has already told Pathforge — their onboarding subjects
 * first (so a brand-new account still gets a populated list without retyping
 * anything), then anything they've since typed into a class or a study block.
 */
export function knownSubjects(
  onboardingSubjects: { name: string }[] | null | undefined,
  classes: RoutineClass[] = [],
  studyBlocks: RoutineStudyBlock[] = [],
): string[] {
  const counts = new Map<string, number>();
  const bump = (name: string, weight = 1) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    counts.set(trimmed, (counts.get(trimmed) ?? 0) + weight);
  };
  // Onboarding subjects get a head start so they lead the list on a fresh account.
  (onboardingSubjects ?? []).forEach((s) => bump(s.name, 5));
  classes.forEach((c) => bump(c.subject, 2));
  studyBlocks.forEach((b) => bump(b.subject, 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([n]) => n);
}
