/**
 * Everything the section computes from a student's answer history.
 *
 * All of it is derived — there is no stored "mastery" number anywhere, because
 * a stored one goes stale the moment the rules change and there is no way to
 * recompute it. Answers are the record; mastery, coverage, the score estimate
 * and the next best action are all functions of that record.
 *
 * The honesty rule that shapes this file: where there is not enough data to say
 * something, these functions return `null` and the UI says so, rather than
 * printing a confident number derived from three questions.
 */

// Aliased: `stats.ts` already declares a local `domainName` helper inside
// `skillStats`, and importing the blueprint one under its own name would
// shadow it there — legal, but the kind of legal that costs someone an hour.
import {
  SAT,
  SAT_DOMAINS,
  SAT_SKILLS,
  domainName as domainLabel,
  subjectName as subjectLabel,
} from "./blueprints";
import { QUESTION_COUNT_BY_DOMAIN, QUESTION_COUNT_BY_SKILL, questionById } from "./questions";
import type { AnswerRecord, Difficulty, SubjectId, TestPrepProfile } from "./types";

/** Below this many attempts, a mastery percentage is noise, not a measurement. */
export const MASTERY_MIN_ATTEMPTS = 3;

/** Below this many answers in a section, no score is estimated for it. */
export const SCORE_MIN_ANSWERS = 8;

export interface SkillStats {
  skillId: string;
  name: string;
  domainId: string;
  subjectId: SubjectId;
  attempts: number;
  correct: number;
  /** 0-1, weighted toward recent attempts. Null below MASTERY_MIN_ATTEMPTS. */
  mastery: number | null;
  /** Distinct questions from the bank this student has answered at least once. */
  completed: number;
  available: number;
  /** Mean time per attempt, in ms. Null with no attempts. */
  avgMs: number | null;
}

export interface DomainStats {
  domainId: string;
  name: string;
  subjectId: SubjectId;
  weight: number;
  attempts: number;
  correct: number;
  mastery: number | null;
  completed: number;
  available: number;
  skills: SkillStats[];
}

export interface SubjectStats {
  subjectId: SubjectId;
  name: string;
  attempts: number;
  correct: number;
  completed: number;
  available: number;
  /** Estimated section score, or null when there is too little data. */
  score: number | null;
  domains: DomainStats[];
}

/**
 * Recency weighting.
 *
 * The most recent attempt at a skill counts fully; each older one counts a
 * little less, floored so that early work never becomes worthless. Without
 * this, a student who got a topic wrong five times in September and right four
 * times in December is told they are at 44% — which is true of their history
 * and false about them.
 */
function weightFor(indexFromNewest: number): number {
  return Math.max(0.35, 1 - indexFromNewest * 0.08);
}

function masteryOf(records: AnswerRecord[]): number | null {
  if (records.length < MASTERY_MIN_ATTEMPTS) return null;
  // `records` arrives oldest-first; walk it newest-first for the weighting.
  let num = 0;
  let den = 0;
  for (let i = records.length - 1, k = 0; i >= 0; i -= 1, k += 1) {
    const w = weightFor(k);
    den += w;
    if (records[i].correct) num += w;
  }
  return den === 0 ? null : num / den;
}

/** Answers grouped by the skill of the question they belong to. */
function answersBySkill(profile: TestPrepProfile): Map<string, AnswerRecord[]> {
  const map = new Map<string, AnswerRecord[]>();
  for (const a of profile.answers) {
    const q = questionById(a.questionId);
    if (!q) continue;
    const list = map.get(q.skillId);
    if (list) list.push(a);
    else map.set(q.skillId, [a]);
  }
  return map;
}

export function skillStats(profile: TestPrepProfile): SkillStats[] {
  const grouped = answersBySkill(profile);
  return SAT_SKILLS.map((skill) => {
    const records = grouped.get(skill.id) ?? [];
    const distinct = new Set(records.map((r) => r.questionId));
    // Only the records that carry a measurement, for the reason given on
    // `overallStats`: an exam stores every unanswered question with
    // `elapsedMs: 0`, and averaging those in reports a pace nobody worked at.
    // Nothing reads this field today; it is kept correct so that whoever does
    // read it next is not handed a number that quietly deflates with every
    // question left blank.
    const timedRecords = records.filter((r) => Number.isFinite(r.elapsedMs) && r.elapsedMs > 0);
    const totalMs = timedRecords.reduce((n, r) => n + r.elapsedMs, 0);
    return {
      skillId: skill.id,
      name: skill.name,
      domainId: skill.domainId,
      subjectId: skill.subjectId,
      attempts: records.length,
      correct: records.filter((r) => r.correct).length,
      mastery: masteryOf(records),
      completed: distinct.size,
      available: QUESTION_COUNT_BY_SKILL[skill.id] ?? 0,
      avgMs: timedRecords.length ? Math.round(totalMs / timedRecords.length) : null,
    };
  });
}

export function domainStats(profile: TestPrepProfile): DomainStats[] {
  const skills = skillStats(profile);
  return SAT_DOMAINS.map((domain) => {
    const mine = skills.filter((s) => s.domainId === domain.id);
    const attempts = mine.reduce((n, s) => n + s.attempts, 0);
    const correct = mine.reduce((n, s) => n + s.correct, 0);
    // Domain mastery is computed from the domain's own answer pool rather than
    // by averaging skill masteries, so a skill with two attempts doesn't get
    // the same say as one with forty.
    const pool = profile.answers.filter((a) => questionById(a.questionId)?.domainId === domain.id);
    return {
      domainId: domain.id,
      name: domain.name,
      subjectId: domain.subjectId,
      weight: domain.weight,
      attempts,
      correct,
      mastery: masteryOf(pool),
      completed: mine.reduce((n, s) => n + s.completed, 0),
      available: QUESTION_COUNT_BY_DOMAIN[domain.id] ?? 0,
      skills: mine,
    };
  });
}

/**
 * Section score estimate.
 *
 * A weighted accuracy mapped onto the 200-800 band. It is an estimate from
 * practice questions, not a predicted test result, and every surface that shows
 * it says "estimated". The floor is not 200-at-zero-accuracy by accident: a
 * real section awards points for the easier items nearly everyone answers, and
 * an estimate that says 200 for a student who is answering half the questions
 * correctly is not useful feedback.
 */
export function estimateSectionScore(
  domains: DomainStats[],
  answerCount: number,
): number | null {
  if (answerCount < SCORE_MIN_ANSWERS) return null;
  const scored = domains.filter((d) => d.attempts > 0);
  if (!scored.length) return null;

  const totalWeight = scored.reduce((n, d) => n + d.weight, 0);
  const weighted = scored.reduce(
    (n, d) => n + (d.correct / d.attempts) * d.weight,
    0,
  );
  const accuracy = totalWeight ? weighted / totalWeight : 0;

  // 0% accuracy maps to 250, 100% to 800, roughly matching how raw scores
  // convert on a published scoring table.
  const raw = 250 + accuracy * 550;
  return Math.round(raw / 10) * 10;
}

export function subjectStats(profile: TestPrepProfile): SubjectStats[] {
  const domains = domainStats(profile);
  return SAT.subjects.map((subject) => {
    const mine = domains.filter((d) => d.subjectId === subject.id);
    const attempts = mine.reduce((n, d) => n + d.attempts, 0);
    return {
      subjectId: subject.id,
      name: subject.name,
      attempts,
      correct: mine.reduce((n, d) => n + d.correct, 0),
      completed: mine.reduce((n, d) => n + d.completed, 0),
      available: mine.reduce((n, d) => n + d.available, 0),
      score: estimateSectionScore(mine, attempts),
      domains: mine,
    };
  });
}

export interface OverallStats {
  subjects: SubjectStats[];
  /** Distinct bank questions answered, over the size of the bank. */
  completed: number;
  available: number;
  /** 0-1. Coverage of the bank — the figure the header progress bar shows. */
  coverage: number;
  totalAttempts: number;
  totalCorrect: number;
  /** 0-1 across everything answered. Null with no attempts. */
  accuracy: number | null;
  /** Composite estimate. Null unless both sections have enough data. */
  estimatedScore: number | null;
  /** Mean seconds per question. Null with no attempts. */
  avgSeconds: number | null;
}

export function overallStats(profile: TestPrepProfile): OverallStats {
  const subjects = subjectStats(profile);
  const completed = subjects.reduce((n, s) => n + s.completed, 0);
  const available = subjects.reduce((n, s) => n + s.available, 0);
  const totalAttempts = subjects.reduce((n, s) => n + s.attempts, 0);
  const totalCorrect = subjects.reduce((n, s) => n + s.correct, 0);
  const bothScored = subjects.every((s) => s.score !== null);
  /*
   * Pace, over the answers that were actually timed.
   *
   * An exam records every unanswered question, deliberately — a blank on a
   * timed module is information about pacing. Those records carry
   * `elapsedMs: 0`, because the student never opened the question. Averaging
   * them in would report a pace nobody worked at: leave twenty blank and the
   * mean drops toward zero, and `nextBestAction` then estimates its
   * recommended set at a couple of minutes.
   *
   * So the divisor is the number of measurements, not the number of answers.
   * Same floor the timing breakdown uses, for the same reason.
   */
  const timed = profile.answers.filter((a) => Number.isFinite(a.elapsedMs) && a.elapsedMs > 0);
  const totalMs = timed.reduce((n, a) => n + a.elapsedMs, 0);

  return {
    subjects,
    completed,
    available,
    coverage: available ? completed / available : 0,
    totalAttempts,
    totalCorrect,
    accuracy: totalAttempts ? totalCorrect / totalAttempts : null,
    estimatedScore: bothScored
      ? subjects.reduce((n, s) => n + (s.score ?? 0), 0)
      : null,
    avgSeconds: timed.length ? Math.round(totalMs / timed.length / 1000) : null,
  };
}

/* ------------------------------------------------------------------ */
/* The next best action                                                */
/* ------------------------------------------------------------------ */

export interface NextAction {
  skillId: string;
  skillName: string;
  domainId: string;
  domainName: string;
  subjectId: SubjectId;
  /** 0-1, or null when this is a first-visit recommendation. */
  mastery: number | null;
  /** One line saying why this, in plain terms. */
  reason: string;
  /** How many questions the suggested set would hold. */
  count: number;
  /** Rough minutes, at the student's own pace when known. */
  minutes: number;
}

/**
 * What the student should do next.
 *
 * Three cases, in order:
 *   1. A skill with enough attempts and the lowest mastery — the thing actually
 *      costing points.
 *   2. Nothing measured yet, but some work done: the heaviest domain with no
 *      attempts, so the estimate becomes meaningful sooner.
 *   3. A blank slate: the heaviest domain overall.
 *
 * It never recommends a skill with no questions left in the bank, because the
 * button would open an empty session.
 */
export function nextBestAction(profile: TestPrepProfile): NextAction | null {
  const skills = skillStats(profile);
  const domainName = (id: string) => SAT_DOMAINS.find((d) => d.id === id)?.name ?? id;
  const paceSeconds = overallStats(profile).avgSeconds ?? 75;

  const build = (s: SkillStats, reason: string, count: number): NextAction => ({
    skillId: s.skillId,
    skillName: s.name,
    domainId: s.domainId,
    domainName: domainName(s.domainId),
    subjectId: s.subjectId,
    mastery: s.mastery,
    reason,
    count,
    minutes: Math.max(1, Math.round((count * paceSeconds) / 60)),
  });

  const measured = skills
    .filter((s) => s.mastery !== null && s.available > 0)
    .sort((a, b) => (a.mastery ?? 1) - (b.mastery ?? 1));

  if (measured.length) {
    const worst = measured[0];
    const count = Math.min(worst.available, 10);
    return build(
      worst,
      worst.correct === 0
        ? "You have not answered a question in this skill correctly yet."
        : "You have been missing questions in this area more often than anywhere else.",
      count,
    );
  }

  const untouched = skills
    .filter((s) => s.attempts === 0 && s.available > 0)
    .sort((a, b) => {
      const wa = SAT_DOMAINS.find((d) => d.id === a.domainId)?.weight ?? 0;
      const wb = SAT_DOMAINS.find((d) => d.id === b.domainId)?.weight ?? 0;
      return wb - wa || b.available - a.available;
    });

  if (untouched.length) {
    const pick = untouched[0];
    const count = Math.min(pick.available, 10);
    return build(
      pick,
      profile.answers.length
        ? "You haven't practised this yet, and it carries more of the section than anything else you've left untouched."
        : "A good place to start: this domain carries more of the section than any other.",
      count,
    );
  }

  return null;
}

/* ------------------------------------------------------------------ */
/* Weak areas                                                          */
/* ------------------------------------------------------------------ */

/** The skills a results page should name, worst first. */
export function weakestSkills(profile: TestPrepProfile, limit = 3): SkillStats[] {
  return skillStats(profile)
    .filter((s) => s.mastery !== null && s.attempts > 0)
    .sort((a, b) => (a.mastery ?? 1) - (b.mastery ?? 1))
    .slice(0, limit);
}

/* ------------------------------------------------------------------ */
/* Difficulty breakdown                                                */
/* ------------------------------------------------------------------ */

export function accuracyByDifficulty(
  profile: TestPrepProfile,
): Record<Difficulty, { correct: number; total: number }> {
  const out: Record<Difficulty, { correct: number; total: number }> = {
    easy: { correct: 0, total: 0 },
    medium: { correct: 0, total: 0 },
    hard: { correct: 0, total: 0 },
  };
  for (const a of profile.answers) {
    const q = questionById(a.questionId);
    if (!q) continue;
    out[q.difficulty].total += 1;
    if (a.correct) out[q.difficulty].correct += 1;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Timing breakdown                                                    */
/* ------------------------------------------------------------------ */

/** One row of the timing table: where the time actually goes. */
export interface TimingRow {
  id: string;
  label: string;
  answers: number;
  /** Mean milliseconds per question in this group. */
  avgMs: number;
  /** Share of answers in this group that were right, or null below the floor. */
  accuracy: number | null;
}

/** Below this, an average of two questions is an anecdote, not a pace. */
const TIMING_MIN_ANSWERS = 3;

/**
 * How long the student takes, grouped by subject and by domain.
 *
 * `overallStats` already reported one `avgSeconds` across everything, which
 * answers "am I slow" but not the question a student actually has, which is
 * "slow at what". Every ingredient was already on the record —
 * `AnswerRecord.elapsedMs` per answer, and `questionById` resolving the
 * subject and domain — so this groups what was there rather than measuring
 * anything new.
 *
 * Groups under `TIMING_MIN_ANSWERS` are dropped rather than shown at zero,
 * for the same reason mastery returns null below its floor: a number the
 * student cannot act on is worse than an absence they can read.
 */
function timingBy(
  profile: TestPrepProfile,
  key: (questionId: string) => { id: string; label: string } | null,
): TimingRow[] {
  const acc = new Map<string, { label: string; answers: number; ms: number; correct: number }>();
  for (const a of profile.answers) {
    const group = key(a.questionId);
    if (!group) continue;
    // A zero or negative elapsed time is a runner that never started its clock,
    // not a question answered instantly. Counting it would drag the mean down
    // and make the student look faster than they are.
    if (!Number.isFinite(a.elapsedMs) || a.elapsedMs <= 0) continue;
    const row = acc.get(group.id) ?? { label: group.label, answers: 0, ms: 0, correct: 0 };
    row.answers += 1;
    row.ms += a.elapsedMs;
    if (a.correct) row.correct += 1;
    acc.set(group.id, row);
  }

  return [...acc.entries()]
    .filter(([, r]) => r.answers >= TIMING_MIN_ANSWERS)
    .map(([id, r]) => ({
      id,
      label: r.label,
      answers: r.answers,
      avgMs: Math.round(r.ms / r.answers),
      accuracy: r.answers >= MASTERY_MIN_ATTEMPTS ? r.correct / r.answers : null,
    }))
    .sort((a, b) => b.avgMs - a.avgMs);
}

export function timingBySubject(profile: TestPrepProfile): TimingRow[] {
  return timingBy(profile, (questionId) => {
    const q = questionById(questionId);
    if (!q) return null;
    return { id: q.subjectId, label: subjectLabel(q.subjectId) };
  });
}

export function timingByDomain(profile: TestPrepProfile): TimingRow[] {
  return timingBy(profile, (questionId) => {
    const q = questionById(questionId);
    if (!q) return null;
    return { id: q.domainId, label: domainLabel(q.domainId) };
  });
}

/* ------------------------------------------------------------------ */
/* Misc formatting shared across the section                           */
/* ------------------------------------------------------------------ */

export function pct(value: number | null): string {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

export function formatClock(seconds: number): string {
  const safe = Math.max(0, seconds);
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Days until the test date, or null when none is set. */
export function daysUntil(isoDate: string): number | null {
  if (!isoDate) return null;
  const then = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(then.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((then.getTime() - today.getTime()) / 86_400_000);
}

/**
 * Mastery, as a colour role.
 *
 * Three bands rather than a gradient, because the only decision the number
 * drives is whether to practise this next — and a continuous scale invites
 * reading a difference between 61% and 64% that the sample cannot support.
 *
 * Lives here rather than beside the components that use it so that the
 * component file exports only components, which is what fast refresh needs.
 */
/**
 * Which of the three mastery steps a figure sits in.
 *
 * Returns `accent` / `partial` / `warning` rather than the old
 * `success` / `accent` / `warning`, because under the SAT palette `--success`
 * and the section's blue are the same colour — the top two steps were drawing
 * the same bar. Same three thresholds, three fills that are actually
 * distinguishable. Every bar is still paired with its percentage, so the
 * colour was never the only carrier; it just stopped being informative.
 */
export function masteryTone(
  mastery: number | null,
): "accent" | "partial" | "warning" | "muted" {
  if (mastery === null) return "muted";
  if (mastery >= 0.8) return "accent";
  if (mastery >= 0.55) return "partial";
  return "warning";
}
