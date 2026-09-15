/**
 * The tests the section knows about, and the SAT's structure in full.
 *
 * The domains and skills below are the digital SAT's published reporting
 * categories and the skills College Board lists under each — the same public
 * outline that appears on any test-information page. The *questions* are
 * separate (see `questions.ts`) and are written for this product; nothing here
 * reproduces test content.
 *
 * Domain weights are the published share of each section, used to weight the
 * score estimate and to order the Overview by what actually costs points
 * rather than alphabetically.
 */

import type { ExamModuleDef, SubjectDef, TestBlueprint, TestId } from "./types";

const MATH: SubjectDef = {
  id: "math",
  name: "Math",
  scoreRange: [200, 800],
  domains: [
    {
      id: "algebra",
      name: "Algebra",
      subjectId: "math",
      weight: 0.35,
      skills: [
        { id: "linear-eq-1var", name: "Linear equations in one variable", domainId: "algebra", subjectId: "math" },
        { id: "linear-eq-2var", name: "Linear equations in two variables", domainId: "algebra", subjectId: "math" },
        { id: "linear-functions", name: "Linear functions", domainId: "algebra", subjectId: "math" },
        { id: "systems-linear", name: "Systems of two linear equations", domainId: "algebra", subjectId: "math" },
        { id: "linear-inequalities", name: "Linear inequalities", domainId: "algebra", subjectId: "math" },
      ],
    },
    {
      id: "advanced-math",
      name: "Advanced Math",
      subjectId: "math",
      weight: 0.35,
      skills: [
        { id: "quadratics", name: "Quadratic equations", domainId: "advanced-math", subjectId: "math" },
        { id: "nonlinear-functions", name: "Nonlinear functions", domainId: "advanced-math", subjectId: "math" },
        { id: "equivalent-expressions", name: "Equivalent expressions", domainId: "advanced-math", subjectId: "math" },
        { id: "exponential", name: "Exponential growth and decay", domainId: "advanced-math", subjectId: "math" },
      ],
    },
    {
      id: "problem-solving",
      name: "Problem-Solving & Data Analysis",
      subjectId: "math",
      weight: 0.15,
      skills: [
        { id: "ratios-rates", name: "Ratios, rates and proportions", domainId: "problem-solving", subjectId: "math" },
        { id: "percentages", name: "Percentages", domainId: "problem-solving", subjectId: "math" },
        { id: "data-distributions", name: "Distributions and measures of centre", domainId: "problem-solving", subjectId: "math" },
        { id: "probability", name: "Probability and conditional probability", domainId: "problem-solving", subjectId: "math" },
        { id: "inference", name: "Inference from sample statistics", domainId: "problem-solving", subjectId: "math" },
      ],
    },
    {
      id: "geometry-trig",
      name: "Geometry & Trigonometry",
      subjectId: "math",
      weight: 0.15,
      skills: [
        { id: "area-volume", name: "Area and volume", domainId: "geometry-trig", subjectId: "math" },
        { id: "lines-angles-triangles", name: "Lines, angles and triangles", domainId: "geometry-trig", subjectId: "math" },
        { id: "right-triangles-trig", name: "Right triangles and trigonometry", domainId: "geometry-trig", subjectId: "math" },
        { id: "circles", name: "Circles", domainId: "geometry-trig", subjectId: "math" },
      ],
    },
  ],
};

const READING_WRITING: SubjectDef = {
  id: "rw",
  name: "Reading & Writing",
  scoreRange: [200, 800],
  domains: [
    {
      id: "information-ideas",
      name: "Information & Ideas",
      subjectId: "rw",
      weight: 0.26,
      skills: [
        { id: "central-ideas", name: "Central ideas and details", domainId: "information-ideas", subjectId: "rw" },
        { id: "command-evidence", name: "Command of evidence", domainId: "information-ideas", subjectId: "rw" },
        { id: "quantitative-evidence", name: "Quantitative evidence", domainId: "information-ideas", subjectId: "rw" },
        { id: "inferences", name: "Inferences", domainId: "information-ideas", subjectId: "rw" },
      ],
    },
    {
      id: "craft-structure",
      name: "Craft & Structure",
      subjectId: "rw",
      weight: 0.28,
      skills: [
        { id: "words-in-context", name: "Words in context", domainId: "craft-structure", subjectId: "rw" },
        { id: "text-structure", name: "Text structure and purpose", domainId: "craft-structure", subjectId: "rw" },
        { id: "cross-text", name: "Cross-text connections", domainId: "craft-structure", subjectId: "rw" },
      ],
    },
    {
      id: "expression-ideas",
      name: "Expression of Ideas",
      subjectId: "rw",
      weight: 0.2,
      skills: [
        { id: "transitions", name: "Transitions", domainId: "expression-ideas", subjectId: "rw" },
        { id: "rhetorical-synthesis", name: "Rhetorical synthesis", domainId: "expression-ideas", subjectId: "rw" },
      ],
    },
    {
      id: "standard-conventions",
      name: "Standard English Conventions",
      subjectId: "rw",
      weight: 0.26,
      skills: [
        { id: "boundaries", name: "Boundaries and punctuation", domainId: "standard-conventions", subjectId: "rw" },
        { id: "form-structure-sense", name: "Form, structure and sense", domainId: "standard-conventions", subjectId: "rw" },
        { id: "subject-verb", name: "Agreement and verb form", domainId: "standard-conventions", subjectId: "rw" },
      ],
    },
  ],
};

/**
 * The digital SAT's four modules, with their real counts and timings.
 *
 * The exam runner reads these rather than hard-coding numbers, and scales the
 * clock proportionally when the bank cannot fill a module — see `buildExam`.
 */
const SAT_MODULES: ExamModuleDef[] = [
  { id: "rw-1", label: "Reading & Writing · Module 1", subjectId: "rw", questionCount: 27, minutes: 32, calculator: false },
  { id: "rw-2", label: "Reading & Writing · Module 2", subjectId: "rw", questionCount: 27, minutes: 32, calculator: false },
  { id: "math-1", label: "Math · Module 1", subjectId: "math", questionCount: 22, minutes: 35, calculator: true },
  { id: "math-2", label: "Math · Module 2", subjectId: "math", questionCount: 22, minutes: 35, calculator: true },
];

export const SAT: TestBlueprint = {
  id: "sat",
  name: "SAT",
  subtitle: "Digital SAT Preparation",
  scoreRange: [400, 1600],
  scoreStep: 10,
  subjects: [MATH, READING_WRITING],
  modules: SAT_MODULES,
  available: false,
};

/**
 * The other four tests.
 *
 * Declared so navigation, routing and the "not built yet" state all read from
 * one list rather than four hard-coded strings, and so adding content to one of
 * them is a data change. `available: false` is what every surface checks.
 */
const PLACEHOLDER = (id: TestId, name: string, subtitle: string, scoreRange: [number, number]): TestBlueprint => ({
  id,
  name,
  subtitle,
  scoreRange,
  scoreStep: 1,
  subjects: [],
  modules: [],
  available: false,
});

export const BLUEPRINTS: TestBlueprint[] = [
  SAT,
  PLACEHOLDER("psat", "PSAT", "PSAT/NMSQT Preparation", [320, 1520]),
  PLACEHOLDER("act", "ACT", "ACT Preparation", [1, 36]),
  PLACEHOLDER("preact", "PreACT", "PreACT Preparation", [1, 35]),
  PLACEHOLDER("clt", "CLT", "Classic Learning Test Preparation", [0, 120]),
];

export function blueprintFor(testId: string | undefined): TestBlueprint | undefined {
  return BLUEPRINTS.find((b) => b.id === testId);
}

/* ------------------------------------------------------------------ */
/* Flat lookups                                                        */
/* ------------------------------------------------------------------ */

export const SAT_DOMAINS = SAT.subjects.flatMap((s) => s.domains);
export const SAT_SKILLS = SAT_DOMAINS.flatMap((d) => d.skills);

const SKILL_BY_ID = new Map(SAT_SKILLS.map((s) => [s.id, s]));
const DOMAIN_BY_ID = new Map(SAT_DOMAINS.map((d) => [d.id, d]));

export function skillName(skillId: string): string {
  return SKILL_BY_ID.get(skillId)?.name ?? skillId;
}

export function domainName(domainId: string): string {
  return DOMAIN_BY_ID.get(domainId)?.name ?? domainId;
}

export function domainOf(skillId: string): string | undefined {
  return SKILL_BY_ID.get(skillId)?.domainId;
}

export function subjectName(subjectId: string): string {
  return SAT.subjects.find((s) => s.id === subjectId)?.name ?? subjectId;
}
