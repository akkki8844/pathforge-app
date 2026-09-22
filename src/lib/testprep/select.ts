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
  DomainDef,
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
export type OutcomeFilter = "all" | "correct" | "incorrect" | "skipped";

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
  /**
   * The last attempt's outcome, keeping a skip distinct from a wrong answer.
   *
   * `lastCorrect` alone cannot tell them apart: a question the student ran out
   * of time on is stored `correct: false`, exactly like one they got wrong, so
   * every surface reading this index marked skips as mistakes. The record has
   * always carried `given` — `""` when nothing was entered — so this costs
   * nothing to derive and no data had to be invented for it.
   *
   * `lastCorrect` is kept as it was; callers that genuinely only care whether
   * the question is mastered should not have to handle three cases.
   */
  lastOutcome: "correct" | "incorrect" | "skipped" | null;
}

export function historyIndex(profile: TestPrepProfile): Map<string, QuestionHistory> {
  const map = new Map<string, QuestionHistory>();
  for (const a of profile.answers) {
    const existing =
      map.get(a.questionId) ?? { attempts: 0, correct: 0, lastCorrect: null, lastOutcome: null };
    existing.attempts += 1;
    if (a.correct) existing.correct += 1;
    existing.lastCorrect = a.correct;
    existing.lastOutcome = a.correct ? "correct" : a.given.trim() === "" ? "skipped" : "incorrect";
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

    // Read from `lastOutcome`, not `lastCorrect`. An exam records every
    // unanswered question with `given: ""` and `correct: false`, so filtering
    // on the boolean put every question the student ran out of time on into
    // the "answered incorrectly" list — which is the list they drill from, and
    // the one place a padded result actively wastes their time.
    if (filters.outcome !== "all") {
      if (!h || h.lastOutcome === null) return false;
      if (h.lastOutcome !== filters.outcome) return false;
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
    // Scaled from the whole value rather than `s % (i + 1)`.
    //
    // This is Fisher-Yates either way, so it always produces a valid
    // permutation — but a linear congruential generator's LOW bits are barely
    // random at all: modulo 2^32, the bottom k bits repeat with period 2^k, so
    // `s % 2` simply alternates. Taking `j` from them made the shuffle badly
    // biased rather than slightly so. Measured over 20,000 seeds on a
    // ten-item list, the first item landed in position 0 about 4,045 times
    // against an expected 2,000, and in position 3 only 903 times — chi-square
    // 3,629 where 9 is expected. Scaling from the high bits brings that to 22.
    const j = Math.floor((s / 4294967296) * (i + 1));
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

  // One seed for the whole call, so the shuffle is stable within a set and
  // different between sets.
  const seed = Date.now() % 100000;

  if (config.kind === "weak") {
    // Weakest measured skills first; skills with no data are neutral rather
    // than "weak", so they sit behind the ones actually costing points.
    //
    // Shuffled BEFORE the sort, not instead of it. `Array.prototype.sort` is
    // stable, so questions on equally weak skills keep their shuffled order
    // and a second request returns a different set — without that, weak
    // practice was fully deterministic and the "Another set" link handed back
    // the same questions it had just given you.
    const rank = new Map(
      skillStats(profile).map((s) => [s.skillId, s.mastery ?? 0.75] as const),
    );
    pool = shuffle(pool, seed).sort(
      (a, b) => (rank.get(a.skillId) ?? 1) - (rank.get(b.skillId) ?? 1),
    );
  } else {
    pool = shuffle(pool, seed);
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
 * Split a module's question count across the subject's domains by weight.
 *
 * Largest remainder: floor every exact share, then hand the leftover seats to
 * the domains with the largest fractional parts. 27 Reading & Writing
 * questions at 0.26 / 0.28 / 0.20 / 0.26 come out 7 / 8 / 5 / 7 rather than
 * 7.02 / 7.56 / 5.4 / 7.02, and the counts always total exactly the module.
 */
function apportion(domains: DomainDef[], total: number): { domainId: string; count: number }[] {
  const totalWeight = domains.reduce((n, d) => n + d.weight, 0) || 1;
  const rows = domains.map((d) => {
    const exact = (d.weight / totalWeight) * total;
    return { domainId: d.id, count: Math.floor(exact), remainder: exact - Math.floor(exact) };
  });

  let left = total - rows.reduce((n, r) => n + r.count, 0);
  for (const row of [...rows].sort((a, b) => b.remainder - a.remainder)) {
    if (left <= 0) break;
    row.count += 1;
    left -= 1;
  }

  return rows.map(({ domainId, count }) => ({ domainId, count }));
}

/** Shuffle, then float anything the student has never answered to the front. */
function unseenFirst(pool: Question[], answered: Set<string>, seed: number): Question[] {
  const shuffled = shuffle(pool, seed);
  return [
    ...shuffled.filter((q) => !answered.has(q.id)),
    ...shuffled.filter((q) => answered.has(q.id)),
  ];
}

/**
 * Fill one module.
 *
 * The module is built domain by domain, to its subject's published weights,
 * rather than by taking the first N of a shuffled subject pool. A plain
 * shuffle gave modules that wandered a long way from the real test: measured
 * over three sittings, a 27-question Reading & Writing module carried between
 * 3 and 10 Standard English Conventions questions where the weighting asks
 * for 7, and Math modules ran up to 7 Geometry questions against an expected
 * 3. That matters beyond realism, because `Results` estimates a section score
 * from the raw count and `Overview` ranks domains by these same weights — an
 * exam over-weighted in geometry reports a score for a test the student did
 * not sit.
 *
 * Within a domain, questions the student has never answered come first, so a
 * second sitting is not largely a replay of the first. If a domain cannot
 * supply its quota, the shortfall is backfilled from the rest of the subject
 * rather than left as a hole.
 */
function fillModule(
  m: ExamModuleDef,
  used: Set<string>,
  answered: Set<string>,
  seed: number,
): Question[] {
  const domains = SAT.subjects.find((s) => s.id === m.subjectId)?.domains ?? [];
  const pool = SAT_QUESTIONS.filter((q) => q.subjectId === m.subjectId && !used.has(q.id));

  const chosen: Question[] = [];
  const taken = new Set<string>();

  apportion(domains, m.questionCount).forEach(({ domainId, count }, i) => {
    const fromDomain = unseenFirst(
      pool.filter((q) => q.domainId === domainId && !taken.has(q.id)),
      answered,
      seed + i * 31,
    );
    for (const q of fromDomain.slice(0, count)) {
      chosen.push(q);
      taken.add(q.id);
    }
  });

  if (chosen.length < m.questionCount) {
    const rest = unseenFirst(
      pool.filter((q) => !taken.has(q.id)),
      answered,
      seed + 997,
    );
    for (const q of rest.slice(0, m.questionCount - chosen.length)) {
      chosen.push(q);
      taken.add(q.id);
    }
  }

  // Shuffled again so the module is not served in domain blocks.
  return shuffle(chosen, seed + 4111);
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
  const answered = new Set(profile.answers.map((a) => a.questionId));

  const modules: ExamModule[] = SAT.modules
    .filter((m) => subjects.includes(m.subjectId))
    .map((m, i) => {
      // Each module gets its own seed. It used to be `seed + m.id.length`,
      // and "rw-1" and "rw-2" are the same length, as are "math-1" and
      // "math-2" — so the two halves of each section were drawn from one
      // shuffle of near-identical pools.
      const take = fillModule(m, used, answered, seed + i * 7919);
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

/**
 * How many questions an exam of these sections could actually serve.
 *
 * This is the preview of what `buildExam` will do, and it has to agree with
 * it, because Practice Exams decides whether to use the words "full-length"
 * by comparing these two numbers.
 *
 * It used to count every question in the chosen subjects and compare that
 * total against the combined target — which is not the same question. A
 * module can only be filled from its own subject, and `buildExam` fills each
 * one separately, so a bank of 151 Math questions and no Reading & Writing
 * would have satisfied `available >= target` and had this page announce a
 * full-length SAT that `buildExam` would then serve with two empty modules.
 * Today's bank happens not to be lopsided enough to trigger it, which is
 * exactly why it was worth fixing before it became true.
 *
 * So capacity is now summed per module, capped at what that module's subject
 * can supply, with each module taking from what the previous ones left —
 * mirroring `buildExam`'s `used` set rather than approximating it.
 */
export function examCapacity(subjects: SubjectId[]): { available: number; target: number } {
  const wanted = SAT.modules.filter((m) => subjects.includes(m.subjectId));
  const target = wanted.reduce((n, m) => n + m.questionCount, 0);

  const remaining = new Map<SubjectId, number>();
  for (const m of wanted) {
    if (remaining.has(m.subjectId)) continue;
    remaining.set(
      m.subjectId,
      SAT_QUESTIONS.filter((q) => q.subjectId === m.subjectId).length,
    );
  }

  let available = 0;
  for (const m of wanted) {
    const left = remaining.get(m.subjectId) ?? 0;
    const take = Math.min(left, m.questionCount);
    available += take;
    remaining.set(m.subjectId, left - take);
  }

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
