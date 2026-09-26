/**
 * The shorthand the practice tests are written in.
 *
 * A question in `questions.ts` spells out ten fields, five of which follow
 * from the skill. At four hundred questions that is a lot of noise between a
 * reader and the content, so the tests use `q()`: the skill implies the domain
 * and subject, the correct choice is always written first and placed at the
 * letter given, and typography is applied in one place.
 *
 * Source files stay ASCII (see the repo's authoring notes), so the few
 * symbols the SAT needs are written as tokens and converted here:
 *
 *   --        em dash              {pi}    pi
 *   {deg}     degree sign          {sqrt}  radical sign
 *   <= >= !=  inequality signs     {theta} theta
 *   ^2 ^3     squared / cubed      {l}     script l, for line names
 *   {times}   multiplication sign  {cdot}  middle dot
 *
 * In Math, a hyphen that starts a number or term ("-3", "( -x", " - ") becomes
 * a true minus sign. Words like "x-intercept" are untouched because the hyphen
 * follows a letter. Longer exponents use the `^{...}` markup, which the
 * question renderer draws as a superscript.
 */

import { SAT_SKILLS } from "../blueprints";
import type { Difficulty, Figure, Question, QuestionChoice } from "../types";

const SKILL = new Map(SAT_SKILLS.map((s) => [s.id, s]));

const MINUS = String.fromCharCode(0x2212);

const TOKENS: [RegExp, string][] = [
  [/--/g, String.fromCharCode(0x2014)],
  [/\{pi\}/g, String.fromCharCode(0x03c0)],
  [/\{deg\}/g, String.fromCharCode(0x00b0)],
  [/\{sqrt\}/g, String.fromCharCode(0x221a)],
  [/\{theta\}/g, String.fromCharCode(0x03b8)],
  [/\{l\}/g, String.fromCharCode(0x2113)],
  [/\{times\}/g, String.fromCharCode(0x00d7)],
  [/\{cdot\}/g, String.fromCharCode(0x00b7)],
  [/<=/g, String.fromCharCode(0x2264)],
  [/>=/g, String.fromCharCode(0x2265)],
  [/!=/g, String.fromCharCode(0x2260)],
  [/\^2(?![0-9{])/g, String.fromCharCode(0x00b2)],
  [/\^3(?![0-9{])/g, String.fromCharCode(0x00b3)],
];

/** Apply the typography above. `math` also turns leading hyphens into minus signs. */
export function fx(text: string, math: boolean): string {
  let out = text;
  for (const [re, ch] of TOKENS) out = out.replace(re, ch);
  if (math) {
    out = out
      .replace(/ - /g, ` ${MINUS} `)
      .replace(/(^|[\s([=,:/{])-(?=[\d(a-zA-Z.\u221a\u03c0])/g, `$1${MINUS}`);
  }
  return out;
}

function fxFigure(fig: Figure, math: boolean): Figure {
  const f = (s: string | undefined) => (s === undefined ? s : fx(s, math));
  switch (fig.kind) {
    case "table":
      return { ...fig, title: f(fig.title), head: fig.head.map((h) => fx(h, math)), rows: fig.rows.map((r) => r.map((c) => fx(c, math))) };
    case "plot":
    case "bar":
      return { ...fig, title: f(fig.title), xLabel: f(fig.xLabel), yLabel: f(fig.yLabel) } as Figure;
    case "diagram":
      return {
        ...fig,
        note: f(fig.note),
        items: fig.items.map((it) => (it.t === "text" ? { ...it, s: fx(it.s, math) } : it)),
      };
  }
}

const LETTERS = ["A", "B", "C", "D"] as const;

export interface QSpec {
  id: string;
  skill: string;
  d: Difficulty;
  /** Passage or setup. */
  s?: string;
  /** The question itself. */
  p: string;
  /**
   * Multiple choice: the correct choice FIRST, then three distractors in the
   * order they should appear around it. Omit for a student-produced response.
   */
  c?: [string, string, string, string];
  /** Letter the correct choice is placed at (multiple choice), or the answer (produced response). */
  a: string;
  /** Other accepted spellings of a produced response. */
  alt?: string[];
  e: string;
  fig?: Figure;
  calc?: boolean;
}

/** Build one bank question from a spec. `form` marks it as belonging to a practice test. */
export function q(spec: QSpec, form?: string): Question {
  const skill = SKILL.get(spec.skill);
  if (!skill) throw new Error(`Unknown skill "${spec.skill}" on ${spec.id}`);
  const math = skill.subjectId === "math";
  const t = (s: string) => fx(s, math);

  let choices: QuestionChoice[] | undefined;
  let answer = spec.a;
  if (spec.c) {
    const at = LETTERS.indexOf(spec.a as (typeof LETTERS)[number]);
    if (at < 0) throw new Error(`Bad answer letter "${spec.a}" on ${spec.id}`);
    const [right, ...wrong] = spec.c;
    const order = [...wrong];
    order.splice(at, 0, right);
    choices = order.map((text, i) => ({ id: LETTERS[i], text: t(text) }));
    answer = LETTERS[at];
  }

  return {
    id: spec.id,
    testId: "sat",
    subjectId: skill.subjectId,
    domainId: skill.domainId,
    skillId: skill.id,
    difficulty: spec.d,
    stimulus: spec.s === undefined ? undefined : t(spec.s),
    prompt: t(spec.p),
    choices,
    answer,
    acceptedAnswers: spec.alt,
    explanation: t(spec.e),
    source: "pathforge",
    calculator: spec.calc,
    figure: spec.fig ? fxFigure(spec.fig, math) : undefined,
    form,
  };
}

/* ------------------------------------------------------------------ */
/* Stems                                                               */
/* ------------------------------------------------------------------ */

/** The Reading and Writing question stems, exactly as the test words them. */
export const STEM = {
  wic: "Which choice completes the text with the most logical and precise word or phrase?",
  sec: "Which choice completes the text so that it conforms to the conventions of Standard English?",
  transition: "Which choice completes the text with the most logical transition?",
  purpose: "Which choice best states the main purpose of the text?",
  structure: "Which choice best describes the overall structure of the text?",
  underlined: "Which choice best describes the function of the underlined sentence in the text as a whole?",
  mainIdea: "Which choice best states the main idea of the text?",
  complete: "Which choice most logically completes the text?",
  notes: "While researching a topic, a student has taken the following notes:",
  notesAsk: "Which choice most effectively uses relevant information from the notes to accomplish this goal?",
  tableExample: "Which choice most effectively uses data from the table to complete the example?",
  graphComplete: "Which choice most effectively uses data from the graph to complete the statement?",
} as const;

/** A rhetorical-synthesis stimulus: the notes as a bulleted list. */
export function notes(...lines: string[]): string {
  return `${STEM.notes}\n\n${lines.map((l) => `\u2022 ${l}`).join("\n")}`;
}

/** "The student wants to ..." followed by the standard question. */
export function goal(text: string): string {
  return `The student wants to ${text} ${STEM.notesAsk}`;
}

/** Two short texts, as cross-text questions present them. */
export function texts(one: string, two: string): string {
  return `**Text 1**\n${one}\n\n**Text 2**\n${two}`;
}
