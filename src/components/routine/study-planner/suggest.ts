/**
 * The planner's scheduling suggestion.
 *
 * This is the one piece of genuine intelligence in Routine, and it runs entirely
 * locally — no model call, no credits, no round trip. That is deliberate: the
 * inputs are the student's own timetable, deadlines and study history, all of
 * which are already in memory, and the output has to be regenerable instantly
 * while they drag the sliders. A language model would be slower, non-repeatable
 * and would cost credits for arithmetic.
 *
 * What it actually does, in order:
 *
 *   1. Scores each subject by urgency — an exam in nine days outranks one in six
 *      weeks, a task deadline counts for less than an exam, and a subject the
 *      student has already put hours into this week is damped so the plan
 *      spreads rather than piling onto whatever is nearest.
 *   2. Finds the real free time on each day: the evening window, minus the
 *      timetable's classes, minus study blocks that already exist, minus
 *      anything already committed on the calendar.
 *   3. Lays sessions into those gaps, never repeating a subject back-to-back and
 *      never exceeding the daily cap.
 *
 * Everything it returns is a plain `NewRoutineStudyBlock` the caller can show as
 * a preview and then commit — it writes nothing itself.
 */
import {
  addDays,
  dateKey,
  daysBetween,
  minutesToTime,
  parseDateKey,
  startOfDay,
  timeToMinutes,
} from "@/lib/routine/dates";
import { classesOnDay } from "@/lib/routine/derive";
import type {
  NewRoutineStudyBlock,
  Priority,
  RoutineClass,
  RoutineEvent,
  RoutineStudyBlock,
  RoutineTask,
} from "@/lib/routine/types";

export interface PlanSettings {
  /** How many days ahead to plan, starting today. */
  horizonDays: number;
  /** Length of a single session. */
  sessionMinutes: number;
  /** Most study minutes to schedule on any one day. */
  dailyCapMinutes: number;
  /** Earliest the planner will place a session, as "HH:MM". */
  windowStart: string;
  /** Latest a session may *end*, as "HH:MM". */
  windowEnd: string;
  /** Subjects to include. Empty means "everything we know about". */
  subjects: string[];
  /** Skip Saturday and Sunday. */
  skipWeekends: boolean;
}

export const DEFAULT_PLAN_SETTINGS: PlanSettings = {
  horizonDays: 7,
  sessionMinutes: 45,
  dailyCapMinutes: 120,
  windowStart: "16:00",
  windowEnd: "21:00",
  subjects: [],
  skipWeekends: false,
};

export interface PlanInputs {
  subjects: string[];
  classes: RoutineClass[];
  events: RoutineEvent[];
  tasks: RoutineTask[];
  existingBlocks: RoutineStudyBlock[];
  now: Date;
}

export interface SubjectScore {
  subject: string;
  weight: number;
  /** The reason, in words, for the UI to show. Never a bare number. */
  reason: string;
}

/** A gap on one day, in minutes past local midnight. */
interface Gap {
  start: number;
  end: number;
}

/**
 * How urgent each subject is, and why.
 *
 * The weight is a small multiplier rather than a raw priority so no single
 * signal can dominate: an exam pushes a subject up, recent hours pull it back
 * down, and a subject with nothing attached still gets scheduled.
 */
export function scoreSubjects(inputs: PlanInputs, settings: PlanSettings): SubjectScore[] {
  const pool = settings.subjects.length ? settings.subjects : inputs.subjects;
  const today = startOfDay(inputs.now);

  return pool
    .map((subject) => {
      const needle = subject.toLowerCase();
      let weight = 1;
      const reasons: string[] = [];

      // Exams and deadlines on the calendar. Nearer is heavier, and the effect
      // fades out entirely past three weeks.
      for (const e of inputs.events) {
        if (!`${e.title} ${e.description ?? ""}`.toLowerCase().includes(needle)) continue;
        const away = daysBetween(today, new Date(e.starts_at));
        if (away < 0 || away > 21) continue;
        const heat = (22 - away) / 22;
        weight += (e.category === "exam" ? 1.6 : 0.9) * heat;
        reasons.push(
          e.category === "exam"
            ? `exam in ${away} day${away === 1 ? "" : "s"}`
            : `${e.category} in ${away} day${away === 1 ? "" : "s"}`,
        );
      }

      // Open tasks that mention the subject.
      const openTasks = inputs.tasks.filter(
        (t) =>
          t.status !== "done" &&
          `${t.title} ${t.description ?? ""}`.toLowerCase().includes(needle),
      );
      if (openTasks.length) {
        weight += Math.min(0.75, openTasks.length * 0.25);
        reasons.push(`${openTasks.length} open task${openTasks.length === 1 ? "" : "s"}`);
      }

      // Balance: hours already done on this subject in the last week damp it, so
      // the plan spreads across the syllabus instead of deepening a rut.
      const recent = inputs.existingBlocks
        .filter((b) => {
          if (b.subject.toLowerCase() !== needle) return false;
          // parseDateKey, never `new Date(key)`: the latter parses as UTC and
          // shifts the day for anyone west of Greenwich.
          const delta = daysBetween(parseDateKey(b.scheduled_date), today);
          return delta >= 0 && delta <= 7;
        })
        .reduce((sum, b) => sum + b.completed_minutes, 0);
      if (recent >= 120) {
        weight *= 0.7;
        reasons.push(`${Math.round(recent / 60)}h already this week`);
      }

      return {
        subject,
        weight: Math.max(0.2, weight),
        reason: reasons.length ? reasons.join(", ") : "keeping it in rotation",
      };
    })
    .sort((a, b) => b.weight - a.weight || a.subject.localeCompare(b.subject));
}

/** Free minutes on a day, after classes, existing blocks and timed events. */
function gapsOn(day: Date, inputs: PlanInputs, settings: PlanSettings): Gap[] {
  const open = timeToMinutes(settings.windowStart);
  const close = timeToMinutes(settings.windowEnd);
  if (close <= open) return [];

  const busy: Gap[] = [];

  for (const c of classesOnDay(inputs.classes, day)) {
    busy.push({ start: timeToMinutes(c.start_time), end: timeToMinutes(c.end_time) });
  }

  const key = dateKey(day);
  for (const b of inputs.existingBlocks) {
    if (b.scheduled_date !== key || !b.scheduled_start) continue;
    const s = timeToMinutes(b.scheduled_start);
    busy.push({ start: s, end: s + b.planned_minutes });
  }

  for (const e of inputs.events) {
    if (e.all_day) continue;
    const s = new Date(e.starts_at);
    if (dateKey(s) !== key) continue;
    const end = e.ends_at ? new Date(e.ends_at) : new Date(s.getTime() + 60 * 60_000);
    busy.push({
      start: s.getHours() * 60 + s.getMinutes(),
      end: end.getHours() * 60 + end.getMinutes(),
    });
  }

  // Subtract the busy intervals from the window, left to right.
  busy.sort((a, b) => a.start - b.start);
  const gaps: Gap[] = [];
  let cursor = open;
  for (const b of busy) {
    if (b.end <= cursor) continue;
    if (b.start > cursor) gaps.push({ start: cursor, end: Math.min(b.start, close) });
    cursor = Math.max(cursor, b.end);
    if (cursor >= close) break;
  }
  if (cursor < close) gaps.push({ start: cursor, end: close });

  return gaps.filter((g) => g.end - g.start >= 15);
}

/**
 * Build the plan.
 *
 * Returns blocks in chronological order. `status` is always "planned" and
 * `completed_minutes` always 0 — this function proposes, it never asserts that
 * anything happened.
 */
export function suggestPlan(
  inputs: PlanInputs,
  settings: PlanSettings,
): { blocks: NewRoutineStudyBlock[]; scores: SubjectScore[] } {
  const scores = scoreSubjects(inputs, settings);
  if (scores.length === 0) return { blocks: [], scores };

  const blocks: NewRoutineStudyBlock[] = [];
  // Running debt per subject: how many minutes it is "owed", proportional to
  // weight. Scheduling a session pays it down, which is what makes a heavier
  // subject come round more often without ever monopolising the week.
  const debt = new Map<string, number>(scores.map((s) => [s.subject, s.weight]));

  const today = startOfDay(inputs.now);
  const nowMinutes = inputs.now.getHours() * 60 + inputs.now.getMinutes();

  for (let d = 0; d < settings.horizonDays; d++) {
    const day = addDays(today, d);
    if (settings.skipWeekends && (day.getDay() === 0 || day.getDay() === 6)) continue;

    let placed = 0;
    let lastSubject: string | null = null;

    for (const gap of gapsOn(day, inputs, settings)) {
      // On today, don't schedule anything that has already started.
      let cursor = d === 0 ? Math.max(gap.start, nowMinutes + 10) : gap.start;

      while (
        cursor + settings.sessionMinutes <= gap.end &&
        placed + settings.sessionMinutes <= settings.dailyCapMinutes
      ) {
        // Pick the most-owed subject that isn't the one we just scheduled.
        const candidates = scores
          .filter((s) => s.subject !== lastSubject || scores.length === 1)
          .sort((a, b) => (debt.get(b.subject) ?? 0) - (debt.get(a.subject) ?? 0));
        const pick = candidates[0];
        if (!pick) break;

        const startTime = `${minutesToTime(cursor)}:00`;
        blocks.push({
          subject: pick.subject,
          topic: null,
          objective: null,
          planned_minutes: settings.sessionMinutes,
          completed_minutes: 0,
          priority: priorityFor(pick.weight),
          scheduled_date: dateKey(day),
          scheduled_start: startTime,
          status: "planned",
          goal_id: null,
          completed_at: null,
        });

        debt.set(pick.subject, (debt.get(pick.subject) ?? 0) - 1);
        // Everyone else creeps up, so nothing starves.
        for (const s of scores) {
          if (s.subject === pick.subject) continue;
          debt.set(s.subject, (debt.get(s.subject) ?? 0) + s.weight * 0.35);
        }

        lastSubject = pick.subject;
        placed += settings.sessionMinutes;
        // A short breather between sessions, so the plan is one a human could
        // actually follow rather than a solid block of back-to-back study.
        cursor += settings.sessionMinutes + 10;
      }

      if (placed + settings.sessionMinutes > settings.dailyCapMinutes) break;
    }
  }

  return { blocks, scores };
}

function priorityFor(weight: number): Priority {
  if (weight >= 1.8) return "high";
  if (weight >= 1.15) return "medium";
  return "low";
}

/** A one-line summary of a proposed plan, for the confirm step. */
export function describePlan(blocks: NewRoutineStudyBlock[]): string {
  if (blocks.length === 0) return "No free time found in the window you set.";
  const minutes = blocks.reduce((s, b) => s + b.planned_minutes, 0);
  const days = new Set(blocks.map((b) => b.scheduled_date)).size;
  const subjects = new Set(blocks.map((b) => b.subject)).size;
  const hours = Math.round((minutes / 60) * 10) / 10;
  return `${blocks.length} sessions, ${hours}h across ${days} day${days === 1 ? "" : "s"} and ${subjects} subject${subjects === 1 ? "" : "s"}.`;
}
