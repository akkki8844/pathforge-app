/**
 * Where a student's Test Prep state lives.
 *
 * Today that is localStorage, behind a small store with subscribers so that two
 * components reading the same figure never disagree. It is written as a module
 * with a narrow API — `read`, a set of mutations, and `useTestPrep` — rather
 * than as a context, because the shape it wants to become is a table: every
 * mutation below is a single row insert or update, and swapping the body of
 * `persist` for a Supabase call is the whole migration.
 *
 * Nothing here is per-device by intent. It is per-device by circumstance, and
 * the day this moves server-side the keys stop mattering.
 */

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { questionById } from "./questions";
import type {
  AnswerRecord,
  AttemptSummary,
  PracticeConfig,
  SessionState,
  TestId,
  TestPrepProfile,
} from "./types";

const STORAGE_KEY = "pf_testprep_sat_v1";

/** A first sitting is the only honest default: no score, no date, no history. */
const EMPTY: TestPrepProfile = {
  targetScore: 1500,
  testDate: "",
  bookmarks: [],
  answers: [],
  attempts: [],
  sessions: {},
};

let state: TestPrepProfile = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function load(): TestPrepProfile {
  if (loaded) return state;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<TestPrepProfile>;
      state = {
        ...EMPTY,
        ...parsed,
        bookmarks: parsed.bookmarks ?? [],
        answers: parsed.answers ?? [],
        attempts: parsed.attempts ?? [],
        sessions: parsed.sessions ?? {},
      };
    }
  } catch {
    // Corrupt or blocked storage. Start from empty rather than throwing on a
    // page the student has just opened — losing practice history is bad, but a
    // blank Test Prep section is worse than a broken one.
    state = EMPTY;
  }
  return state;
}

function persist(next: TestPrepProfile) {
  state = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* private mode or quota — the session still works, it just won't survive a reload */
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function snapshot(): TestPrepProfile {
  return load();
}

/**
 * Server snapshot for the prerender pass.
 *
 * `src/prerender/entry.tsx` renders routes in Node, where `window` does not
 * exist. Returning the shared empty object (not a fresh one) matters:
 * `useSyncExternalStore` compares snapshots by identity and would otherwise
 * loop forever.
 */
function serverSnapshot(): TestPrepProfile {
  return EMPTY;
}

/* ------------------------------------------------------------------ */
/* Mutations                                                           */
/* ------------------------------------------------------------------ */

/**
 * The SAT keeps its target and date on the profile's top-level fields, where
 * they have always been; every other test keeps its own under `perTest`, so an
 * ACT target of 30 never overwrites an SAT target of 1450.
 */
export function setTargetScore(score: number, testId: TestId = "sat") {
  const current = load();
  if (testId === "sat") return persist({ ...current, targetScore: score });
  persist({
    ...current,
    perTest: { ...current.perTest, [testId]: { ...current.perTest?.[testId], targetScore: score } },
  });
}

export function setTestDate(date: string, testId: TestId = "sat") {
  const current = load();
  if (testId === "sat") return persist({ ...current, testDate: date });
  persist({
    ...current,
    perTest: { ...current.perTest, [testId]: { ...current.perTest?.[testId], testDate: date } },
  });
}

export function setDailyGoal(goal: number) {
  persist({ ...load(), dailyGoal: Math.max(5, Math.min(100, Math.round(goal))) });
}

export function toggleBookmark(questionId: string) {
  const current = load();
  const has = current.bookmarks.includes(questionId);
  persist({
    ...current,
    bookmarks: has
      ? current.bookmarks.filter((id) => id !== questionId)
      : [...current.bookmarks, questionId],
  });
}

/**
 * Record one answered question.
 *
 * Answers accumulate rather than being overwritten: a skill's mastery is meant
 * to reflect how the student is doing *now*, and the only way to see that is to
 * keep the attempts and weight the recent ones (see `stats.ts`). Re-answering a
 * question is a real event, not a correction of an earlier one.
 */
export function recordAnswer(answer: AnswerRecord) {
  recordAnswers([answer]);
}

/**
 * Record a whole sitting's worth of answers in one write.
 *
 * `persist` copies the answers array, serialises the entire profile, writes it
 * to localStorage synchronously and re-renders every subscriber. Calling it
 * once per answer is fine for practice, where answers arrive one at a time
 * seconds apart. It is not fine for an exam: a full sitting submits 98 answers
 * in a loop, which meant 98 array copies of a growing array, 98 serialisations
 * of a profile that may already hold thousands of records, and 98 synchronous
 * disk-backed writes — quadratic work, on the main thread, at the exact moment
 * a student finishes a two-hour exam and the page has to navigate.
 *
 * One call, one write. The singular form delegates here so there is only one
 * path to keep correct.
 */
export function recordAnswers(answers: AnswerRecord[]) {
  if (answers.length === 0) return;
  const current = load();
  persist({ ...current, answers: [...current.answers, ...answers] });
}

export function saveSession(session: SessionState) {
  const current = load();
  persist({ ...current, sessions: { ...current.sessions, [session.id]: session } });
}

export function saveAttempt(attempt: AttemptSummary) {
  const current = load();
  persist({ ...current, attempts: [attempt, ...current.attempts] });
}

/**
 * Wipe one test's history. Offered on Progress, behind a confirmation.
 *
 * Scoped to the test being viewed: resetting ACT progress must not throw away
 * a year of SAT practice kept in the same profile.
 */
export function resetTestPrep(testId: TestId = "sat") {
  const current = load();
  const mine = (questionId: string) => (questionById(questionId)?.testId ?? "sat") === testId;
  const { [testId]: _dropped, ...otherTests } = current.perTest ?? {};
  void _dropped;
  persist({
    ...current,
    ...(testId === "sat" ? { targetScore: EMPTY.targetScore, testDate: "" } : {}),
    perTest: otherTests,
    bookmarks: current.bookmarks.filter((id) => !mine(id)),
    answers: current.answers.filter((a) => !mine(a.questionId)),
    attempts: current.attempts.filter((a) => (a.testId ?? "sat") !== testId),
    sessions: Object.fromEntries(
      Object.entries(current.sessions).filter(([, s]) => (s.testId ?? "sat") !== testId),
    ),
  });
}

/* ------------------------------------------------------------------ */
/* Reads                                                               */
/* ------------------------------------------------------------------ */

export function readProfile(): TestPrepProfile {
  return load();
}

export function useTestPrep(testId?: string): TestPrepProfile {
  const profile = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  return useMemo(() => (testId ? scopeProfile(profile, testId) : profile), [profile, testId]);
}

/** Default targets for tests that have never had one set. */
const DEFAULT_TARGET: Partial<Record<TestId, number>> = { act: 30, preact: 28, psat: 1300, clt: 90 };

/**
 * One test's view of the shared profile.
 *
 * Every test's answers, attempts and bookmarks live in one profile, keyed by
 * the question's own `testId`. Everything the section computes — streaks,
 * accuracy, score history, the "mistakes" list — reads through this, so an
 * ACT page never counts SAT answers and vice versa.
 */
export function scopeProfile(profile: TestPrepProfile, testId: string): TestPrepProfile {
  const mine = (questionId: string) => (questionById(questionId)?.testId ?? "sat") === testId;
  const own = testId === "sat" ? undefined : profile.perTest?.[testId as TestId];
  return {
    ...profile,
    targetScore:
      testId === "sat" ? profile.targetScore : own?.targetScore ?? DEFAULT_TARGET[testId as TestId] ?? 0,
    testDate: testId === "sat" ? profile.testDate : own?.testDate ?? "",
    bookmarks: profile.bookmarks.filter(mine),
    answers: profile.answers.filter((a) => mine(a.questionId)),
    attempts: profile.attempts.filter((a) => (a.testId ?? "sat") === testId),
  };
}

export function readProfileFor(testId: string): TestPrepProfile {
  return scopeProfile(load(), testId);
}

/** Bookmark state for one question, plus the toggle. */
export function useBookmark(questionId: string) {
  const profile = useTestPrep();
  const toggle = useCallback(() => toggleBookmark(questionId), [questionId]);
  return [profile.bookmarks.includes(questionId), toggle] as const;
}

/* ------------------------------------------------------------------ */
/* Session construction                                                */
/* ------------------------------------------------------------------ */

let sessionCounter = 0;

export function newId(prefix: string): string {
  sessionCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${sessionCounter}`;
}

export function createSession(
  config: PracticeConfig,
  questionIds: string[],
  label: string,
): SessionState {
  const session: SessionState = {
    id: newId(config.kind),
    testId: "sat",
    kind: config.kind,
    config,
    questionIds,
    answers: {},
    startedAt: new Date().toISOString(),
    label,
  };
  saveSession(session);
  return session;
}
