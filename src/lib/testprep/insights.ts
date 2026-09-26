/**
 * Habit and trend figures for the Test Prep dashboards.
 *
 * `stats.ts` answers "how good am I at this"; this file answers "how am I
 * working": streaks, activity per day, today's count against a daily goal,
 * and the score line over time. Everything is derived from the answer and
 * attempt records, like the rest of the section, so nothing here can go stale.
 */

import type { AttemptSummary, TestPrepProfile } from "./types";

/** Questions per day the goal ring defaults to when the student hasn't set one. */
export const DEFAULT_DAILY_GOAL = 20;

/** Local calendar day key, yyyy-mm-dd. */
export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export interface DayActivity {
  key: string;
  date: Date;
  answered: number;
  correct: number;
}

/** Answers per local day, oldest first, ending today. */
export function activityByDay(profile: TestPrepProfile, days: number): DayActivity[] {
  const counts = new Map<string, { answered: number; correct: number }>();
  for (const a of profile.answers) {
    const t = new Date(a.at);
    if (Number.isNaN(t.getTime())) continue;
    const k = dayKey(t);
    const row = counts.get(k) ?? { answered: 0, correct: 0 };
    row.answered += 1;
    if (a.correct) row.correct += 1;
    counts.set(k, row);
  }
  const out: DayActivity[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const k = dayKey(d);
    const row = counts.get(k);
    out.push({ key: k, date: d, answered: row?.answered ?? 0, correct: row?.correct ?? 0 });
  }
  return out;
}

/**
 * Consecutive days with at least one answer, counting back from today.
 *
 * A streak that has not been extended today yet is still alive until the day
 * ends, so an empty today counts back from yesterday instead of reading zero
 * at breakfast.
 */
export function currentStreak(profile: TestPrepProfile): number {
  const days = activityByDay(profile, 400);
  let i = days.length - 1;
  if (days[i]?.answered === 0) i -= 1;
  let n = 0;
  while (i >= 0 && days[i].answered > 0) {
    n += 1;
    i -= 1;
  }
  return n;
}

export function longestStreak(profile: TestPrepProfile): number {
  const days = activityByDay(profile, 400);
  let best = 0;
  let run = 0;
  for (const d of days) {
    run = d.answered > 0 ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

export function answeredToday(profile: TestPrepProfile): number {
  const k = dayKey(new Date());
  return profile.answers.filter((a) => {
    const t = new Date(a.at);
    return !Number.isNaN(t.getTime()) && dayKey(t) === k;
  }).length;
}

export function dailyGoal(profile: TestPrepProfile): number {
  return profile.dailyGoal && profile.dailyGoal > 0 ? profile.dailyGoal : DEFAULT_DAILY_GOAL;
}

export interface ScorePoint {
  id: string;
  at: Date;
  score: number;
  label: string;
}

/** Scored exam sittings, oldest first. */
export function scoreHistory(profile: TestPrepProfile): ScorePoint[] {
  return profile.attempts
    .filter((a): a is AttemptSummary & { score: number } => a.kind === "exam" && typeof a.score === "number")
    .map((a) => ({ id: a.id, at: new Date(a.finishedAt), score: a.score, label: a.label }))
    .filter((p) => !Number.isNaN(p.at.getTime()))
    .sort((a, b) => a.at.getTime() - b.at.getTime());
}

export interface AccuracyPoint {
  key: string;
  date: Date;
  accuracy: number;
  answered: number;
}

/**
 * Rolling accuracy by week, oldest first. Weeks with fewer than five answers
 * are left out rather than plotted at a noisy value.
 */
export function weeklyAccuracy(profile: TestPrepProfile, weeks: number): AccuracyPoint[] {
  const days = activityByDay(profile, weeks * 7);
  const out: AccuracyPoint[] = [];
  for (let w = 0; w < weeks; w++) {
    const slice = days.slice(w * 7, w * 7 + 7);
    const answered = slice.reduce((n, d) => n + d.answered, 0);
    const correct = slice.reduce((n, d) => n + d.correct, 0);
    if (answered >= 5) {
      out.push({ key: slice[0].key, date: slice[0].date, accuracy: correct / answered, answered });
    }
  }
  return out;
}

/** Total minutes spent answering, from the timed records only. */
export function minutesPracticed(profile: TestPrepProfile): number {
  const ms = profile.answers.reduce(
    (n, a) => n + (Number.isFinite(a.elapsedMs) && a.elapsedMs > 0 ? a.elapsedMs : 0),
    0,
  );
  return Math.round(ms / 60000);
}

/** A greeting line for the dashboard, keyed to the hour and the streak. */
export function greeting(streak: number, today: number, goal: number): string {
  const h = new Date().getHours();
  const part = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  if (today >= goal) return `${part}. Today's goal is done.`;
  if (streak > 1) return `${part}. ${streak}-day streak, keep it going.`;
  if (today > 0) return `${part}. ${goal - today} to go for today.`;
  return `${part}. Ready when you are.`;
}
