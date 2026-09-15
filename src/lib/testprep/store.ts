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

import { useCallback, useSyncExternalStore } from "react";
import type {
  AnswerRecord,
  AttemptSummary,
  PracticeConfig,
  SessionState,
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

export function setTargetScore(score: number) {
  persist({ ...load(), targetScore: score });
}

export function setTestDate(date: string) {
  persist({ ...load(), testDate: date });
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
  const current = load();
  persist({ ...current, answers: [...current.answers, answer] });
}

export function saveSession(session: SessionState) {
  const current = load();
  persist({ ...current, sessions: { ...current.sessions, [session.id]: session } });
}

export function saveAttempt(attempt: AttemptSummary) {
  const current = load();
  persist({ ...current, attempts: [attempt, ...current.attempts] });
}

/** Wipe everything. Offered on Progress, behind a confirmation. */
export function resetTestPrep() {
  persist({ ...EMPTY });
}

/* ------------------------------------------------------------------ */
/* Reads                                                               */
/* ------------------------------------------------------------------ */

export function readProfile(): TestPrepProfile {
  return load();
}

export function useTestPrep(): TestPrepProfile {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
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
