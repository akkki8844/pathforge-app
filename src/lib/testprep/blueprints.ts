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

import type { ExamModuleDef, SubjectDef, TestBlueprint } from "./types";

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
        { id: "data-distributions", name: "Distributions and measures of center", domainId: "problem-solving", subjectId: "math" },
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
  /**
   * The SAT is the one test that is actually built.
   *
   * This was flipped to `false` in 05b2e151 as a side effect of generalising
   * `TestNotAvailable` — that component used to hard-code a "go to SAT Prep"
   * escape hatch, and turning SAT off was how the escape hatch stopped being
   * special-cased. The copy was fixed in the same commit, so the flag had no
   * reason to stay off, and leaving it off pointed every SAT route at a dead
   * end reading "The SAT is not built out yet" on top of a 151-question bank,
   * a four-module exam blueprint and five working pages.
   */
  available: true,
  adaptive: true,
  scoring: "sum",
};

/**
 * The PSAT/NMSQT.
 *
 * College Board builds it on the digital SAT's frame: the same two sections,
 * the same domains and skills, the same four adaptive modules with the same
 * counts and timings, sat in Bluebook. What differs is the scale (160-760 a
 * section, 320-1520 in total) and the ceiling of difficulty, which stops short
 * of the SAT's hardest items. So the subjects reuse the SAT's domain and skill
 * definitions and only the score range changes; the questions are the PSAT's
 * own (see `content/psat.ts`).
 */
const PSAT_MODULES: ExamModuleDef[] = [
  { id: "psat-rw-1", label: "Reading & Writing · Module 1", subjectId: "rw", questionCount: 27, minutes: 32, calculator: false },
  { id: "psat-rw-2", label: "Reading & Writing · Module 2", subjectId: "rw", questionCount: 27, minutes: 32, calculator: false },
  { id: "psat-math-1", label: "Math · Module 1", subjectId: "math", questionCount: 22, minutes: 35, calculator: true },
  { id: "psat-math-2", label: "Math · Module 2", subjectId: "math", questionCount: 22, minutes: 35, calculator: true },
];

export const PSAT: TestBlueprint = {
  id: "psat",
  name: "PSAT",
  subtitle: "PSAT/NMSQT Preparation",
  scoreRange: [320, 1520],
  scoreStep: 10,
  subjects: [
    { ...MATH, scoreRange: [160, 760] },
    { ...READING_WRITING, scoreRange: [160, 760] },
  ],
  modules: PSAT_MODULES,
  available: true,
  adaptive: true,
  scoring: "sum",
};

/**
 * The ACT's four sections.
 *
 * Reporting categories and their names are ACT, Inc.'s own published test
 * descriptions for English, Mathematics, Reading and Science — the same kind
 * of public outline the SAT block above draws from. Domain weights are this
 * product's estimate of each category's share of its section (ACT does not
 * publish exact weights the way College Board does), used the same way the
 * SAT's are: to order Practice by what costs the most points and to weight
 * the section score estimate.
 */
const ACT_ENGLISH: SubjectDef = {
  id: "english",
  name: "English",
  scoreRange: [1, 36],
  domains: [
    {
      id: "production-of-writing",
      name: "Production of Writing",
      subjectId: "english",
      weight: 0.32,
      skills: [
        { id: "topic-development", name: "Topic development", domainId: "production-of-writing", subjectId: "english" },
        { id: "organization", name: "Organization, unity and cohesion", domainId: "production-of-writing", subjectId: "english" },
      ],
    },
    {
      id: "knowledge-of-language",
      name: "Knowledge of Language",
      subjectId: "english",
      weight: 0.15,
      skills: [
        { id: "word-choice", name: "Precision and concision of word choice", domainId: "knowledge-of-language", subjectId: "english" },
        { id: "style-tone", name: "Style and tone", domainId: "knowledge-of-language", subjectId: "english" },
      ],
    },
    {
      id: "conventions-english",
      name: "Conventions of Standard English",
      subjectId: "english",
      weight: 0.53,
      skills: [
        { id: "sentence-structure", name: "Sentence structure and formation", domainId: "conventions-english", subjectId: "english" },
        { id: "usage-english", name: "Usage conventions", domainId: "conventions-english", subjectId: "english" },
        { id: "punctuation-english", name: "Punctuation conventions", domainId: "conventions-english", subjectId: "english" },
      ],
    },
  ],
};

const ACT_MATH: SubjectDef = {
  id: "math",
  name: "Mathematics",
  scoreRange: [1, 36],
  domains: [
    {
      id: "number-quantity",
      name: "Number & Quantity",
      subjectId: "math",
      weight: 0.13,
      skills: [
        { id: "act-real-numbers", name: "Real and complex number systems", domainId: "number-quantity", subjectId: "math" },
        { id: "act-vectors-matrices", name: "Vectors and matrices", domainId: "number-quantity", subjectId: "math" },
      ],
    },
    {
      id: "act-algebra",
      name: "Algebra",
      subjectId: "math",
      weight: 0.18,
      skills: [
        { id: "act-linear-eq", name: "Linear equations and inequalities", domainId: "act-algebra", subjectId: "math" },
        { id: "act-quadratics", name: "Quadratic equations", domainId: "act-algebra", subjectId: "math" },
        { id: "act-exponents-radicals", name: "Exponents and radicals", domainId: "act-algebra", subjectId: "math" },
      ],
    },
    {
      id: "act-functions",
      name: "Functions",
      subjectId: "math",
      weight: 0.18,
      skills: [
        { id: "act-function-notation", name: "Function notation and evaluation", domainId: "act-functions", subjectId: "math" },
        { id: "act-function-graphs", name: "Graphs and transformations of functions", domainId: "act-functions", subjectId: "math" },
      ],
    },
    {
      id: "act-geometry",
      name: "Geometry",
      subjectId: "math",
      weight: 0.23,
      skills: [
        { id: "act-area-perimeter", name: "Area, perimeter and volume", domainId: "act-geometry", subjectId: "math" },
        { id: "act-coordinate-geometry", name: "Coordinate geometry", domainId: "act-geometry", subjectId: "math" },
        { id: "act-triangles-trig", name: "Triangles and trigonometry", domainId: "act-geometry", subjectId: "math" },
      ],
    },
    {
      id: "act-stats-prob",
      name: "Statistics & Probability",
      subjectId: "math",
      weight: 0.15,
      skills: [
        { id: "act-data-representations", name: "Describing data and center", domainId: "act-stats-prob", subjectId: "math" },
        { id: "act-probability", name: "Probability and counting", domainId: "act-stats-prob", subjectId: "math" },
      ],
    },
    {
      id: "act-essential-skills",
      name: "Integrating Essential Skills",
      subjectId: "math",
      weight: 0.13,
      skills: [
        { id: "act-ratios-rates", name: "Ratios, rates and proportional reasoning", domainId: "act-essential-skills", subjectId: "math" },
        { id: "act-percentages", name: "Percentages and unit conversion", domainId: "act-essential-skills", subjectId: "math" },
      ],
    },
  ],
};

const ACT_READING: SubjectDef = {
  id: "reading",
  name: "Reading",
  scoreRange: [1, 36],
  domains: [
    {
      id: "key-ideas-details",
      name: "Key Ideas & Details",
      subjectId: "reading",
      weight: 0.55,
      skills: [
        { id: "act-central-ideas", name: "Central ideas, themes and summarizing", domainId: "key-ideas-details", subjectId: "reading" },
        { id: "act-relationships", name: "Relationships between people, events and ideas", domainId: "key-ideas-details", subjectId: "reading" },
      ],
    },
    {
      id: "craft-structure-act",
      name: "Craft & Structure",
      subjectId: "reading",
      weight: 0.25,
      skills: [
        { id: "act-word-meaning", name: "Word and phrase meaning in context", domainId: "craft-structure-act", subjectId: "reading" },
        { id: "act-text-structure", name: "Text structure and author's purpose", domainId: "craft-structure-act", subjectId: "reading" },
        { id: "act-point-of-view", name: "Point of view and rhetorical effect", domainId: "craft-structure-act", subjectId: "reading" },
      ],
    },
    {
      id: "integration-knowledge",
      name: "Integration of Knowledge & Ideas",
      subjectId: "reading",
      weight: 0.2,
      skills: [
        { id: "act-argument-evaluation", name: "Evaluating arguments and claims", domainId: "integration-knowledge", subjectId: "reading" },
        { id: "act-cross-passage", name: "Comparing and synthesizing across passages", domainId: "integration-knowledge", subjectId: "reading" },
      ],
    },
  ],
};

const ACT_SCIENCE: SubjectDef = {
  id: "science",
  name: "Science",
  scoreRange: [1, 36],
  domains: [
    {
      id: "interpretation-data",
      name: "Interpretation of Data",
      subjectId: "science",
      weight: 0.45,
      skills: [
        { id: "act-read-tables-graphs", name: "Reading tables, graphs and figures", domainId: "interpretation-data", subjectId: "science" },
        { id: "act-data-trends", name: "Trends, patterns and relationships in data", domainId: "interpretation-data", subjectId: "science" },
      ],
    },
    {
      id: "scientific-investigation",
      name: "Scientific Investigation",
      subjectId: "science",
      weight: 0.3,
      skills: [
        { id: "act-experimental-design", name: "Experimental design and controls", domainId: "scientific-investigation", subjectId: "science" },
        { id: "act-methods-tools", name: "Methods, tools and procedures", domainId: "scientific-investigation", subjectId: "science" },
      ],
    },
    {
      id: "evaluation-models",
      name: "Evaluation of Models, Inferences & Experimental Results",
      subjectId: "science",
      weight: 0.25,
      skills: [
        { id: "act-model-evaluation", name: "Evaluating models against data", domainId: "evaluation-models", subjectId: "science" },
        { id: "act-extending-findings", name: "Extending and predicting from findings", domainId: "evaluation-models", subjectId: "science" },
      ],
    },
  ],
};

/**
 * The ACT's four timed sections, each sat once — there is no adaptive second
 * module the way the digital SAT has. Counts and timings are the real ones
 * from ACT's published test structure.
 */
const ACT_MODULES: ExamModuleDef[] = [
  { id: "act-english", label: "English", subjectId: "english", questionCount: 75, minutes: 45, calculator: false },
  { id: "act-math", label: "Mathematics", subjectId: "math", questionCount: 60, minutes: 60, calculator: true },
  { id: "act-reading", label: "Reading", subjectId: "reading", questionCount: 40, minutes: 35, calculator: false },
  { id: "act-science", label: "Science", subjectId: "science", questionCount: 40, minutes: 35, calculator: false },
];

export const ACT: TestBlueprint = {
  id: "act",
  name: "ACT",
  subtitle: "ACT Preparation",
  scoreRange: [1, 36],
  scoreStep: 1,
  subjects: [ACT_ENGLISH, ACT_MATH, ACT_READING, ACT_SCIENCE],
  modules: ACT_MODULES,
  available: true,
  adaptive: false,
  scoring: "average",
};

/**
 * The PreACT.
 *
 * ACT, Inc.'s practice test for earlier grades: the ACT's four sections and
 * reporting categories, shorter and on a 1-35 scale so a score reads as a
 * predictor of the ACT rather than a copy of it. Subjects reuse the ACT's
 * domain and skill definitions, the way the PSAT reuses the SAT's; the
 * questions are the PreACT's own (see `content/preact.ts`).
 *
 * Counts and timings are ACT's published PreACT structure; if ACT revises
 * them, this list is the only place to change.
 */
const PREACT_MODULES: ExamModuleDef[] = [
  { id: "preact-english", label: "English", subjectId: "english", questionCount: 45, minutes: 30, calculator: false },
  { id: "preact-math", label: "Mathematics", subjectId: "math", questionCount: 36, minutes: 40, calculator: true },
  { id: "preact-reading", label: "Reading", subjectId: "reading", questionCount: 25, minutes: 30, calculator: false },
  { id: "preact-science", label: "Science", subjectId: "science", questionCount: 30, minutes: 30, calculator: false },
];

export const PREACT: TestBlueprint = {
  id: "preact",
  name: "PreACT",
  subtitle: "PreACT Preparation",
  scoreRange: [1, 35],
  scoreStep: 1,
  subjects: [ACT_ENGLISH, ACT_MATH, ACT_READING, ACT_SCIENCE].map((s) => ({ ...s, scoreRange: [1, 35] as [number, number] })),
  modules: PREACT_MODULES,
  available: true,
  adaptive: false,
  scoring: "average",
};

/**
 * The Classic Learning Test.
 *
 * Three sections of 40 questions, each scored 0-40 and summed to 0-120:
 * Verbal Reasoning (passages drawn from the classical tradition -- literature,
 * philosophy, historical documents and natural science), Grammar/Writing, and
 * Quantitative Reasoning, sat without a calculator. The domains below are this
 * product's grouping of the question types Classic Learning Initiatives
 * describes for each section; the weights are estimates, used as the ACT's
 * are, to order Practice and weight the section estimate.
 */
const CLT_VERBAL: SubjectDef = {
  id: "verbal",
  name: "Verbal Reasoning",
  scoreRange: [0, 40],
  domains: [
    {
      id: "clt-comprehension",
      name: "Comprehension",
      subjectId: "verbal",
      weight: 0.4,
      skills: [
        { id: "clt-main-idea", name: "Main idea and summary", domainId: "clt-comprehension", subjectId: "verbal" },
        { id: "clt-detail", name: "Explicit detail and evidence", domainId: "clt-comprehension", subjectId: "verbal" },
      ],
    },
    {
      id: "clt-analysis",
      name: "Analysis & Author's Craft",
      subjectId: "verbal",
      weight: 0.35,
      skills: [
        { id: "clt-vocab", name: "Vocabulary in context", domainId: "clt-analysis", subjectId: "verbal" },
        { id: "clt-purpose", name: "Purpose, structure and tone", domainId: "clt-analysis", subjectId: "verbal" },
      ],
    },
    {
      id: "clt-synthesis",
      name: "Inference & Synthesis",
      subjectId: "verbal",
      weight: 0.25,
      skills: [
        { id: "clt-inference", name: "Inference", domainId: "clt-synthesis", subjectId: "verbal" },
        { id: "clt-paired", name: "Comparing texts", domainId: "clt-synthesis", subjectId: "verbal" },
      ],
    },
  ],
};

const CLT_GRAMMAR: SubjectDef = {
  id: "grammar",
  name: "Grammar/Writing",
  scoreRange: [0, 40],
  domains: [
    {
      id: "clt-conventions",
      name: "Grammar & Usage",
      subjectId: "grammar",
      weight: 0.55,
      skills: [
        { id: "clt-agreement", name: "Agreement and verb form", domainId: "clt-conventions", subjectId: "grammar" },
        { id: "clt-punctuation", name: "Punctuation", domainId: "clt-conventions", subjectId: "grammar" },
        { id: "clt-sentences", name: "Sentence structure", domainId: "clt-conventions", subjectId: "grammar" },
      ],
    },
    {
      id: "clt-rhetoric",
      name: "Rhetoric & Style",
      subjectId: "grammar",
      weight: 0.45,
      skills: [
        { id: "clt-concision", name: "Concision and word choice", domainId: "clt-rhetoric", subjectId: "grammar" },
        { id: "clt-organization", name: "Organization and transitions", domainId: "clt-rhetoric", subjectId: "grammar" },
        { id: "clt-support", name: "Relevance and support", domainId: "clt-rhetoric", subjectId: "grammar" },
      ],
    },
  ],
};

const CLT_QUANT: SubjectDef = {
  id: "quant",
  name: "Quantitative Reasoning",
  scoreRange: [0, 40],
  domains: [
    {
      id: "clt-algebra",
      name: "Algebra",
      subjectId: "quant",
      weight: 0.35,
      skills: [
        { id: "clt-linear", name: "Linear equations and systems", domainId: "clt-algebra", subjectId: "quant" },
        { id: "clt-nonlinear", name: "Quadratic and exponential equations", domainId: "clt-algebra", subjectId: "quant" },
      ],
    },
    {
      id: "clt-geometry",
      name: "Geometry & Trigonometry",
      subjectId: "quant",
      weight: 0.25,
      skills: [
        { id: "clt-geo", name: "Plane and coordinate geometry", domainId: "clt-geometry", subjectId: "quant" },
        { id: "clt-trig", name: "Trigonometry", domainId: "clt-geometry", subjectId: "quant" },
      ],
    },
    {
      id: "clt-data",
      name: "Data & Probability",
      subjectId: "quant",
      weight: 0.2,
      skills: [
        { id: "clt-stats", name: "Statistics", domainId: "clt-data", subjectId: "quant" },
        { id: "clt-prob", name: "Probability and counting", domainId: "clt-data", subjectId: "quant" },
      ],
    },
    {
      id: "clt-logic",
      name: "Logic & Number Sense",
      subjectId: "quant",
      weight: 0.2,
      skills: [
        { id: "clt-number", name: "Number sense and arithmetic", domainId: "clt-logic", subjectId: "quant" },
        { id: "clt-reasoning", name: "Logical reasoning", domainId: "clt-logic", subjectId: "quant" },
      ],
    },
  ],
};

const CLT_MODULES: ExamModuleDef[] = [
  { id: "clt-verbal", label: "Verbal Reasoning", subjectId: "verbal", questionCount: 40, minutes: 40, calculator: false },
  { id: "clt-grammar", label: "Grammar/Writing", subjectId: "grammar", questionCount: 40, minutes: 35, calculator: false },
  { id: "clt-quant", label: "Quantitative Reasoning", subjectId: "quant", questionCount: 40, minutes: 45, calculator: false },
];

export const CLT: TestBlueprint = {
  id: "clt",
  name: "CLT",
  subtitle: "Classic Learning Test Preparation",
  scoreRange: [0, 120],
  scoreStep: 1,
  subjects: [CLT_VERBAL, CLT_GRAMMAR, CLT_QUANT],
  modules: CLT_MODULES,
  available: true,
  adaptive: false,
  scoring: "sum",
};

export const ACT_DOMAINS = ACT.subjects.flatMap((s) => s.domains);
export const ACT_SKILLS = ACT_DOMAINS.flatMap((d) => d.skills);

export const BLUEPRINTS: TestBlueprint[] = [
  SAT,
  PSAT,
  ACT,
  PREACT,
  CLT,
];

/** Who administers a test — used only in disclaimers, never as a lockup or logo. */
export function conductorFor(testId: string | undefined): string {
  switch (testId) {
    case "act":
    case "preact":
      return "ACT, Inc.";
    case "clt":
      return "Classic Learning Initiatives";
    default:
      return "College Board";
  }
}

/** The published outline a test's questions are written to, named in disclaimers. */
export function specNameFor(testId: string | undefined): string {
  const blueprint = blueprintFor(testId);
  const name = blueprint?.name ?? "test";
  switch (testId) {
    case "sat":
      return "published digital SAT specification";
    case "psat":
      return "published PSAT/NMSQT specification";
    case "act":
    case "preact":
      return `published ${name} specification`;
    case "clt":
      return "published Classic Learning Test specification";
    default:
      return `published ${name} specification`;
  }
}

export function blueprintFor(testId: string | undefined): TestBlueprint | undefined {
  return BLUEPRINTS.find((b) => b.id === testId);
}

/* ------------------------------------------------------------------ */
/* Flat lookups                                                        */
/* ------------------------------------------------------------------ */

export const SAT_DOMAINS = SAT.subjects.flatMap((s) => s.domains);
export const SAT_SKILLS = SAT_DOMAINS.flatMap((d) => d.skills);

/**
 * Every domain and skill across every built test, so a question's labels
 * resolve correctly regardless of which test it belongs to. Domain and skill
 * ids are unique across tests (the ACT's are all `act-`-prefixed or otherwise
 * distinct from the SAT's), so one flat map serves all of them.
 */
const ALL_DOMAINS = BLUEPRINTS.flatMap((b) => b.subjects.flatMap((s) => s.domains));
const ALL_SKILLS = ALL_DOMAINS.flatMap((d) => d.skills);
const ALL_SUBJECTS = BLUEPRINTS.flatMap((b) => b.subjects);

const SKILL_BY_ID = new Map(ALL_SKILLS.map((s) => [s.id, s]));
const DOMAIN_BY_ID = new Map(ALL_DOMAINS.map((d) => [d.id, d]));

export function skillName(skillId: string): string {
  return SKILL_BY_ID.get(skillId)?.name ?? skillId;
}

export function domainName(domainId: string): string {
  return DOMAIN_BY_ID.get(domainId)?.name ?? domainId;
}

export function domainOf(skillId: string): string | undefined {
  return SKILL_BY_ID.get(skillId)?.domainId;
}

/**
 * A section's display name. Pass the test when you have it: "math" is "Math"
 * on the SAT and "Mathematics" on the ACT, and without the test the first
 * match wins.
 */
export function subjectName(subjectId: string, testId?: string): string {
  const own = blueprintFor(testId)?.subjects.find((s) => s.id === subjectId);
  return own?.name ?? ALL_SUBJECTS.find((s) => s.id === subjectId)?.name ?? subjectId;
}
