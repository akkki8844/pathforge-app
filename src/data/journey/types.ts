/**
 * Shared shapes for the hand-written, major-specific Journey template library.
 *
 * These are declared here rather than imported from `@/lib/journeyLevels` so
 * the template modules have no dependency on the level engine — the engine
 * imports the templates, never the other way round.
 *
 * `TemplateTask` is deliberately structurally assignable to
 * `LevelTask` in `@/lib/journeyLevels`: same field names, and `level` is a
 * subset (1–5) of `LevelId` (1–15) — hand-written major templates stop at 5;
 * levels 6+ reuse the Level 5 library, see `getLevelTasksForUser`.
 */

export type TemplateLevel = 1 | 2 | 3 | 4 | 5;

export type TaskCategory =
  | "academics"
  | "activities"
  | "leadership"
  | "competitions"
  | "test_prep"
  | "research"
  | "application";

export interface TemplateMicroStep {
  label: string;
  detail?: string;
}

export interface TemplateTask {
  id: string;
  level: TemplateLevel;
  category: TaskCategory;
  title: string;
  /** Why this specific action moves an admissions read for THIS major. */
  why: string;
  /** The artefact a student uploads as proof. Must be concrete. */
  outcome: string;
  timeEstimate: string;
  microSteps: TemplateMicroStep[];
  /** Only set when the URL is a stable, verified official page. */
  link?: string;
  linkLabel?: string;
}

/** Student context threaded into every template so tasks can localise. */
export interface TemplateCtx {
  major: string;
  country: string;
  curriculum: string;
  grade: string;
  level: number;
  targetUniversity?: string;
}

export type TemplateLibrary = Record<TemplateLevel, (c: TemplateCtx) => TemplateTask[]>;

// ── Locale helpers shared by every template module ──────────────────────

export const isIndia = (c: string): boolean => c.toLowerCase().includes("india");
export const isUS = (c: string): boolean => {
  const s = c.toLowerCase();
  return s.includes("united states") || s === "usa" || s === "us";
};
export const isUK = (c: string): boolean => {
  const s = c.toLowerCase();
  return s.includes("united kingdom") || s === "uk" || s.includes("england");
};

/** The entrance test that actually matters where the student lives. */
export const testName = (country: string): string =>
  isIndia(country)
    ? "JEE/NEET (or the SAT for overseas applications)"
    : isUS(country)
      ? "the SAT or ACT"
      : isUK(country)
        ? "your A-Level/IB predicted grades"
        : "the SAT or your national entrance exam";

/** Grade as a number; defaults to 10 when unparseable. */
export const gradeNum = (g: string): number => {
  const m = g.match(/\d+/);
  return m ? parseInt(m[0], 10) : 10;
};
