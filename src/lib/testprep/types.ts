/**
 * The vocabulary the whole Test Prep section is written against.
 *
 * Nothing here says "SAT". The section is built to hold five tests — SAT, PSAT,
 * ACT, PreACT, CLT — which share a shape (a test has subjects, a subject has
 * domains, a domain has skills, a skill has questions) and differ only in
 * content and scoring. Only the SAT blueprint exists today; adding the PSAT
 * later is a new `TestBlueprint` object and a new question file, not a second
 * copy of the interface.
 */

export type TestId = "sat" | "psat" | "act" | "preact" | "clt";

export type SubjectId = "math" | "rw";

export type Difficulty = "easy" | "medium" | "hard";

/** The smallest unit a student practises and the level mastery is tracked at. */
export interface SkillDef {
  id: string;
  name: string;
  domainId: string;
  subjectId: SubjectId;
}

/** A College Board reporting category — the level the Overview lists. */
export interface DomainDef {
  id: string;
  name: string;
  subjectId: SubjectId;
  /**
   * Share of the section this domain carries on the real test, as a fraction.
   * Used to weight the score estimate and to order the Overview by what
   * actually costs points.
   */
  weight: number;
  skills: SkillDef[];
}

export interface SubjectDef {
  id: SubjectId;
  name: string;
  /** Section score floor and ceiling, e.g. 200-800 for an SAT section. */
  scoreRange: [number, number];
  domains: DomainDef[];
}

/** One timed block of a real sitting. The digital SAT runs four. */
export interface ExamModuleDef {
  id: string;
  label: string;
  subjectId: SubjectId;
  /** Questions on the real module. */
  questionCount: number;
  /** Minutes on the real module. */
  minutes: number;
  /** Whether an on-screen calculator is permitted for this module. */
  calculator: boolean;
}

export interface TestBlueprint {
  id: TestId;
  /** Short name, as it appears in navigation. */
  name: string;
  /** One line under the name. Descriptive, not promotional. */
  subtitle: string;
  /** Total score floor and ceiling. */
  scoreRange: [number, number];
  /** Composite scores are reported in steps of this size. */
  scoreStep: number;
  subjects: SubjectDef[];
  modules: ExamModuleDef[];
  /** False until the content for that test has been written. */
  available: boolean;
}

/**
 * Where a question came from.
 *
 * Every question shipped today is `pathforge` — written for this product. The
 * field exists so that licensed or officially provided items can be loaded into
 * the same bank later and be labelled honestly rather than silently absorbed.
 * Nothing in the UI may describe a `pathforge` item as an official one.
 */
export type QuestionSource = "pathforge" | "official" | "licensed";

export interface QuestionChoice {
  id: "A" | "B" | "C" | "D";
  text: string;
}

/* ------------------------------------------------------------------ */
/* Figures                                                             */
/* ------------------------------------------------------------------ */

/**
 * A table, graph or diagram that belongs to a question.
 *
 * Stored as data rather than as images so it renders crisply at any size,
 * follows the light and dark themes, and can be read by a screen reader from
 * the same values the chart is drawn from.
 */
export type Figure = TableFigure | PlotFigure | BarFigure | DiagramFigure;

export interface TableFigure {
  kind: "table";
  title?: string;
  head: string[];
  rows: string[][];
  /** Header column cells in the first column, e.g. row labels. */
  rowHeaders?: boolean;
}

export type PlotSeries =
  | { type: "points"; pts: [number, number][]; label?: string }
  | { type: "polyline"; pts: [number, number][]; label?: string; dashed?: boolean }
  | { type: "fn"; f: (x: number) => number; domain?: [number, number]; label?: string; dashed?: boolean };

export interface PlotFigure {
  kind: "plot";
  title?: string;
  xLabel?: string;
  yLabel?: string;
  /** [min, max, gridStep]. */
  x: [number, number, number];
  y: [number, number, number];
  series: PlotSeries[];
  /** Print tick numbers every n grid lines. Default 1. */
  labelEvery?: number;
  /** Draw the axes through the origin (a coordinate plane) rather than at the edges (a chart). */
  axesAtOrigin?: boolean;
  /** Short text description for screen readers. */
  alt?: string;
}

export interface BarFigure {
  kind: "bar";
  title?: string;
  xLabel?: string;
  yLabel?: string;
  categories: string[];
  series: { name: string; values: number[] }[];
  y: [number, number, number];
  alt?: string;
}

export type DiagramItem =
  | { t: "poly"; pts: [number, number][]; closed?: boolean; dashed?: boolean }
  | { t: "line"; a: [number, number]; b: [number, number]; dashed?: boolean; arrow?: boolean }
  | { t: "circle"; c: [number, number]; r: number; dashed?: boolean }
  | { t: "arc"; c: [number, number]; r: number; from: number; to: number }
  | { t: "dot"; at: [number, number] }
  | { t: "text"; at: [number, number]; s: string; anchor?: "start" | "middle" | "end"; italic?: boolean }
  /** A right-angle mark at `at`, with legs pointing toward `a` and `b`. */
  | { t: "right"; at: [number, number]; a: [number, number]; b: [number, number] };

export interface DiagramFigure {
  kind: "diagram";
  /** viewBox width and height, in diagram units. y grows downward. */
  w: number;
  h: number;
  items: DiagramItem[];
  /** Printed under the figure, e.g. "Note: Figure not drawn to scale." */
  note?: string;
  alt?: string;
}

export interface Question {
  id: string;
  testId: TestId;
  subjectId: SubjectId;
  domainId: string;
  skillId: string;
  difficulty: Difficulty;
  /** Passage, chart caption or setup shown above the prompt. Optional. */
  stimulus?: string;
  prompt: string;
  /** Omitted for student-produced-response items, which take typed input. */
  choices?: QuestionChoice[];
  /** Choice id for multiple choice; the accepted string(s) for entry items. */
  answer: string;
  /** Additional accepted spellings of a produced response, e.g. "0.5" and "1/2". */
  acceptedAnswers?: string[];
  explanation: string;
  source: QuestionSource;
  /** Whether an on-screen calculator is expected to help. */
  calculator?: boolean;
  /** A table, graph or diagram shown with the question. */
  figure?: Figure;
  /**
   * The practice test this question belongs to, if any.
   *
   * Practice-test questions are held back from the Question Bank and from
   * practice sets, the way College Board keeps its full-length tests apart
   * from its question bank, so a student's first sight of a test's questions
   * is when they sit it.
   */
  form?: string;
}

/** One answered question, wherever it was answered. */
export interface AnswerRecord {
  questionId: string;
  /** What the student entered or selected. */
  given: string;
  correct: boolean;
  /** Milliseconds spent on the question. */
  elapsedMs: number;
  /** ISO timestamp. */
  at: string;
  flagged?: boolean;
}

export type SessionKind =
  | "quick"
  | "topic"
  | "weak"
  | "timed"
  | "custom"
  | "exam";

export interface PracticeConfig {
  kind: SessionKind;
  subjectId?: SubjectId;
  domainId?: string;
  skillId?: string;
  difficulty?: Difficulty | "mixed";
  count: number;
  /** Minutes. Absent means untimed. */
  timeLimit?: number;
  /**
   * An explicit, ordered set of question ids — e.g. a hand-picked selection
   * from the Question Bank table. When present, the runner uses this list
   * verbatim instead of assembling one from the other filters.
   */
  ids?: string[];
}

export interface SessionState {
  id: string;
  testId: TestId;
  kind: SessionKind;
  config: PracticeConfig;
  questionIds: string[];
  answers: Record<string, AnswerRecord>;
  /** ISO timestamps. */
  startedAt: string;
  finishedAt?: string;
  label: string;
}

/** A finished exam or practice run, kept for the results and history views. */
export interface AttemptSummary {
  id: string;
  testId: TestId;
  kind: SessionKind;
  label: string;
  finishedAt: string;
  totalQuestions: number;
  correct: number;
  /** Total time in ms. */
  elapsedMs: number;
  /** Estimated composite, present for exam attempts only. */
  score?: number;
  sectionScores?: Partial<Record<SubjectId, number>>;
  /** Per-skill tally, so Results can name the areas to work on. */
  bySkill: Record<string, { correct: number; total: number }>;
  /**
   * Every question in the sitting with what was given, in order, so Results
   * can offer a question-by-question review. Absent on attempts recorded
   * before this was kept.
   */
  items?: { questionId: string; given: string; correct: boolean; elapsedMs: number }[];
  /** The practice test sat, when the attempt was one of the fixed forms. */
  formId?: string;
  /** Which second module each section routed to, for adaptive sittings. */
  routes?: Partial<Record<SubjectId, ModuleRoute>>;
}

/** The digital SAT's second module is harder or easier depending on the first. */
export type ModuleRoute = "harder" | "easier";

/** Everything the section persists for one student. */
export interface TestPrepProfile {
  targetScore: number;
  /** ISO date (yyyy-mm-dd), or empty if the student hasn't set one. */
  testDate: string;
  /** Questions per day the student is aiming for. Absent means the default. */
  dailyGoal?: number;
  bookmarks: string[];
  answers: AnswerRecord[];
  attempts: AttemptSummary[];
  sessions: Record<string, SessionState>;
}
