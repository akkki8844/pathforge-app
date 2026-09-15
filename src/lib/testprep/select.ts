/**
 * Choosing which questions a student sees, and marking what they answer.
 *
 * Kept apart from both the bank and the UI so that the rules — how a weak-area
 * set is assembled, how an exam module is filled, what counts as a correct
 * produced response — are stated once and are testable without rendering
 * anything.
 */

import { SAT } from "./blueprints";
import { SAT_QUESTIONS, questionById } from "./questions";
import { skillStats } from "./stats";
import type {
  Difficulty,
  ExamModuleDef,
  PracticeConfig,
  Question,
  SubjectId,
  TestPrepProfile,
} from "./types";

/* ------------------------------------------------------------------ */
/* Marking                                                             */
/* ------------------------------------------------------------------ */

function normalise(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "").replace(/^\+/, "");
}

/**
 * Whether a given answer is correct.
 *
 * Multiple choice is an exact match on the choice id. Produced responses accept
 * every spelling listed on the question plus a numeric comparison, so that a
 * student who types 0.750 for an answer stored as 0.75 is not marked wrong for
 * a trailing zero.
 */
export function isCorrect(question: Question, given: string): boolean {
  if (question.choices) return given === question.answer;

  const accepted = [question.answer, ...(question.acceptedAnswers ?? [])];
  const g = normalise(given);
  if (accepted.some((a) => normalise(a) === g)) return true;

  const asNumber = parseNumeric(given);
  if (asNumber === null) return false;
  return accepted.some((a) => {
    const n = parseNumeric(a);
    return n !== null && Math.abs(n - asNumber) < 1e-6;
  });
}

/** Reads "3/4", ".75", "0.75" and "-2" alike. Returns null for anything else. */
function parseNumeric(value: string): number | null {
  const v = value.trim();
  const fraction = v.match(/^(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)$/);
  if (fraction) {
    const d = Number(fraction[2]);
    if (d === 0) return null;
    return Number(fraction[1]) / d;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/* ------------------------------------------------------------------ */
/* Filtering — the Question Bank                                       */
/* ------------------------------------------------------------------ */

export type CompletionFilter = "all" | "unseen" | "seen";
export type OutcomeFilter = "all" | "correct" | "incorrect";

export interface BankFilters {
  search: string;
  subjectId: SubjectId | "all";
  /** Empty means every domain in the selected subject(s). */
  domainIds: string[];
  skillId: string | "all";
  difficulty: Difficulty | "all";
  completion: CompletionFilter;
  outcome: OutcomeFilter;
  bookmarkedOnly: boolean;
}

export const EMPTY_FILTERS: BankFilters = {
  search: "",
  subjectId: "all",
  domainIds: [],
  skillId: "all",
  difficulty: "all",
  completion: "all",
  outcome: "all",
  bookmarkedOnly: false,
};

/** The student's own history for a question: seen, and last outcome. */
export interface QuestionHistory {
  attempts: number;
  correct: number;
  lastCorrect: boolean | null;
}

export function historyIndex(profile: TestPrepProfile): Map<string, QuestionHistory> {
  const map = new Map<string, QuestionHistory>();
  for (const a of profile.answers) {
    const existing = map.get(a.questionId) ?? { attempts: 0, correct: 0, lastCorrect: null };
    existing.attempts += 1;
    if (a.correct) existing.correct += 1;
    existing.lastCorrect = a.correct;
    map.set(a.questionId, existing);
  }
  return map;
}

export function filterQuestions(
  profile: TestPrepProfile,
  filters: BankFilters,
): Question[] {
  const history = historyIndex(profile);
  const needle = filters.search.trim().toLowerCase();

  return SAT_QUESTIONS.filter((q) => {
    if (filters.subjectId !== "all" && q.subjectId !== filters.subjectId) return false;
    if (filters.domainIds.length > 0 && !filters.domainIds.includes(q.domainId)) return false;
    if (filters.skillId !== "all" && q.skillId !== filters.skillId) return false;
    if (filters.difficulty !== "all" && q.difficulty !== filters.difficulty) return false;
    if (filters.bookmarkedOnly && !profile.bookmarks.includes(q.id)) return false;

    const h = history.get(q.id);
    if (filters.completion === "unseen" && h) return false;
    if (filters.completion === "seen" && !h) return false;

    if (filters.outcome !== "all") {
      if (!h || h.lastCorrect === null) return false;
      if (filters.outcome === "correct" && !h.lastCorrect) return false;
      if (filters.outcome === "incorrect" && h.lastCorrect) return false;
    }

    if (needle) {
      const haystack = `${q.prompt} ${q.stimulus ?? ""} ${q.explanation} ${
        q.choices?.map((c) => c.text).join(" ") ?? ""
      }`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }

    return true;
  });
}

/* ------------------------------------------------------------------ */
/* Building a practice set                                             */
/* ------------------------------------------------------------------ */

/**
 * Deterministic shuffle.
 *
 * Seeded rather than `Math.random`, so that a practice set built during a
 * render is the same set after React re-renders it — and so that a student who
 * reloads mid-session gets their questions back in the order they had them.
 */
function shuffle<T>(items: T[], seed: number): T[] {
  const out = [...items];
  let s = seed || 1;
  for (let i = out.length - 1; i > 0; i -= 1) {
    s = (s * 1664525 + 1013904223) % 4294967296;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * The question ids for a configured practice set.
 *
 * Two rules that matter more than the filtering:
 *
 * - Unseen questions come first. A student who asks for ten questions on
 *   quadratics and gets four they answered yesterday has been given four
 *   questions.
 * - The set is never padded to `count` with repeats. If the bank holds six
 *   matching questions, the session is six questions long and the UI says so.
 */
export function pickQuestions(profile: TestPrepProfile, config: PracticeConfig): string[] {
  const history = historyIndex(profile);
  let pool = SAT_QUESTIONS.filter((q) => {
    if (config.subjectId && q.subjectId !== config.subjectId) return false;
    if (config.domainId && q.domainId !== config.domainId) return false;
    if (config.skillId && q.skillId !== config.skillId) return false;
    if (config.difficulty && config.difficulty !== "mixed" && q.difficulty !== config.difficulty)
      return false;
    return true;
  });

  if (config.kind === "weak") {
    // Weakest measured skills first; skills with no data are neutral rather
    // than "weak", so they sit behind the ones actually costing points.
    const rank = new Map(
      skillStats(profile).map((s) => [s.skillId, s.mastery ?? 0.75] as const),
    );
    pool = [...pool].sort(
      (a, b) => (rank.get(a.skillId) ?? 1) - (rank.get(b.skillId) ?? 1),
    );
  } else {
    pool = shuffle(pool, Date.now() % 100000);
  }

  const unseen = pool.filter((q) => !history.has(q.id));
  const seen = pool.filter((q) => history.has(q.id));
  return [...unseen, ...seen].slice(0, config.count).map((q) => q.id);
}

/* ------------------------------------------------------------------ */
/* Building an exam                                                    */
/* ------------------------------------------------------------------ */

export interface ExamModule extends ExamModuleDef {
  questionIds: string[];
  /** Minutes for this run — scaled down when the bank cannot fill the module. */
  actualMinutes: number;
}

export interface BuiltExam {
  id: string;
  label: string;
  modules: ExamModule[];
  /** True when every module carries its full published question count. */
  fullLength: boolean;
  totalQuestions: number;
  totalMinutes: number;
}

/**
 * Assemble a sitting.
 *
 * The digital SAT's four modules, their real counts and their real timings come
 * from the blueprint. Where the bank cannot fill a module, the module runs
 * short and its clock is scaled to match at the same seconds-per-question — a
 * 27-question module run with 12 questions gets 14 minutes, not 32. The
 * alternative, repeating questions to reach 27, would make the score estimate
 * meaningless and the practice worse.
 *
 * `fullLength` is what the UI reads to decide whether it may call this a
 * full-length simulation. It stays false until the bank can fill every module.
 */
export function buildExam(
  profile: TestPrepProfile,
  subjects: SubjectId[] = ["rw", "math"],
  label = "Full-length practice",
): BuiltExam {
  const used = new Set<string>();
  const seed = Date.now() % 100000;

  const modules: ExamModule[] = SAT.modules
    .filter((m) => subjects.includes(m.subjectId))
    .map((m) => {
      const pool = shuffle(
        SAT_QUESTIONS.filter((q) => q.subjectId === m.subjectId && !used.has(q.id)),
        seed + m.id.length,
      );
      const take = pool.slice(0, m.questionCount);
      take.forEach((q) => used.add(q.id));
      const ratio = m.questionCount ? take.length / m.questionCount : 0;
      return {
        ...m,
        questionIds: take.map((q) => q.id),
        actualMinutes: Math.max(1, Math.round(m.minutes * ratio)),
      };
    });

  const fullLength = modules.every((m) => m.questionIds.length === m.questionCount);

  return {
    id: `exam-${Date.now().toString(36)}`,
    label,
    modules,
    fullLength,
    totalQuestions: modules.reduce((n, m) => n + m.questionIds.length, 0),
    totalMinutes: modules.reduce((n, m) => n + m.actualMinutes, 0),
  };
}

/** How many questions an exam of these sections could actually serve. */
export function examCapacity(subjects: SubjectId[]): { available: number; target: number } {
  const target = SAT.modules
    .filter((m) => subjects.includes(m.subjectId))
    .reduce((n, m) => n + m.questionCount, 0);
  const available = SAT_QUESTIONS.filter((q) => subjects.includes(q.subjectId)).length;
  return { available, target };
}

/** Resolve ids to questions, dropping anything the bank no longer holds. */
export function resolve(ids: string[]): Question[] {
  return ids.map(questionById).filter((q): q is Question => Boolean(q));
}

/* ------------------------------------------------------------------ */
/* Ordering — the Question Bank                                        */
/* ------------------------------------------------------------------ */

export type BankSort = "bank" | "easiest" | "hardest" | "unseen" | "missed";

/** The label each ordering carries in the UI. Kept next to the logic. */
export const BANK_SORTS: { value: BankSort; label: string }[] = [
  { value: "bank", label: "Bank order" },
  { value: "easiest", label: "Easiest first" },
  { value: "hardest", label: "Hardest first" },
  { value: "unseen", label: "Unattempted first" },
  { value: "missed", label: "Most missed first" },
];

const DIFFICULTY_RANK: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 };

/**
 * Order a filtered result set.
 *
 * Every ordering falls back to bank order for ties, so the list is stable
 * between renders — a library whose rows shuffle when you answer one of them
 * is a library you cannot keep your place in.
 */
export function sortQuestions(
  questions: Question[],
  sort: BankSort,
  history: Map<string, QuestionHistory>,
): Question[] {
  if (sort === "bank") return questions;

  const rank = new Map(questions.map((q, i) => [q.id, i]));
  const tie = (a: Question, b: Question) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0);

  const sorted = [...questions];
  switch (sort) {
    case "easiest":
      sorted.sort(
        (a, b) => DIFFICULTY_RANK[a.difficulty] - DIFFICULTY_RANK[b.difficulty] || tie(a, b),
      );
      break;
    case "hardest":
      sorted.sort(
        (a, b) => DIFFICULTY_RANK[b.difficulty] - DIFFICULTY_RANK[a.difficulty] || tie(a, b),
      );
      break;
    case "unseen":
      sorted.sort(
        (a, b) =>
          (history.has(a.id) ? 1 : 0) - (history.has(b.id) ? 1 : 0) || tie(a, b),
      );
      break;
    case "missed": {
      // Questions never attempted have nothing to be missed, so they sort last
      // rather than tying with a question answered correctly every time.
      const wrong = (q: Question) => {
        const h = history.get(q.id);
        return h ? h.attempts - h.correct : -1;
      };
      sorted.sort((a, b) => wrong(b) - wrong(a) || tie(a, b));
      break;
    }
  }
  return sorted;
}
