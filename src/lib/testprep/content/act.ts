/**
 * The ACT practice bank.
 *
 * Every item here was written for Pathforge to ACT, Inc.'s published test
 * outline (the reporting categories in `blueprints.ts`). None of it is ACT
 * material, and `source` is `pathforge` throughout. Passages are original and
 * about invented people, places and studies.
 *
 * English items follow the ACT's shape: a short passage with an underlined
 * portion, and "NO CHANGE" as choice A where the question asks whether the
 * underlined text should be revised.
 */

import type { Difficulty, Question, QuestionChoice, SubjectId } from "../types";
import { fx } from "./author";

const P = "pathforge" as const;

export type Draft = {
  id: string;
  /** Defaults to the ACT; the PreACT and CLT banks share these helpers. */
  testId?: "act" | "preact" | "clt";
  subjectId: SubjectId;
  domainId: string;
  skillId: string;
  difficulty: Difficulty;
  stimulus?: string;
  prompt: string;
  choices: [string, string, string, string];
  answer: "A" | "B" | "C" | "D";
  explanation: string;
  figure?: Question["figure"];
};

const IDS: QuestionChoice["id"][] = ["A", "B", "C", "D"];

/** A small, stable string hash (FNV-1a), so placement never changes between loads. */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Where the correct choice sits.
 *
 * Drafts are written with the right answer wherever it fell while writing,
 * and left alone that bunched up badly: no ACT answer was ever D, and every
 * Reading answer was A, which a student would notice within a set. So the
 * correct choice is moved to a position chosen by a hash of the question's id
 * -- stable across loads, spread across A to D -- with the distractors kept in
 * their written order around it.
 *
 * Two kinds of question keep their written order. Numeric choices (and ranges
 * like "between 21 and 39") are listed in ascending order, the way the real
 * test prints them, so moving one would give the answer away. Sentence-
 * placement items ("where it is now", "after Sentence 1", ...) run in
 * paragraph order for the same reason. And an English
 * item that offers "NO CHANGE" keeps it as choice A: when the original is
 * right the answer stays A, otherwise it lands on B, C or D.
 */
function place(d: Draft): { choices: string[]; answer: Draft["answer"] } {
  const at = IDS.indexOf(d.answer);
  const ordered =
    d.choices.every((c) => /^[\s$(\u2212-]*\d/.test(c)) ||
    d.choices.some((c) => /^(fewer|more|less|greater|between)\b.*\d/i.test(c)) ||
    /^where it is now/i.test(d.choices[0]);
  if (ordered) return { choices: [...d.choices], answer: d.answer };
  const noChange = d.choices[0] === "NO CHANGE";
  if (noChange && at === 0) return { choices: [...d.choices], answer: d.answer };
  const h = hash(d.id);
  const target = noChange ? 1 + (h % 3) : h % 4;
  const rest = d.choices.filter((_, i) => i !== at);
  rest.splice(target, 0, d.choices[at]);
  return { choices: rest, answer: IDS[target] as Draft["answer"] };
}

export function q(d: Draft): Question {
  const placed = place(d);
  // The shared typography pass: "--" to an em dash, x^2 to a superscript, and
  // in Mathematics a leading hyphen to a true minus sign.
  const math = d.subjectId === "math" || d.subjectId === "quant";
  const t = (s: string) => fx(s, math);
  return {
    id: d.id,
    testId: d.testId ?? "act",
    subjectId: d.subjectId,
    domainId: d.domainId,
    skillId: d.skillId,
    difficulty: d.difficulty,
    stimulus: d.stimulus === undefined ? undefined : t(d.stimulus),
    prompt: t(d.prompt),
    choices: placed.choices.map((text, i) => ({ id: IDS[i], text: t(text) })),
    answer: placed.answer,
    explanation: t(d.explanation),
    source: P,
    // The CLT allows no calculator on its Quantitative Reasoning section.
    calculator: d.subjectId === "math",
    figure: d.figure,
  };
}

/* ------------------------------------------------------------------ */
/* English                                                            */
/* ------------------------------------------------------------------ */

const EN = (
  id: string,
  domainId: string,
  skillId: string,
  difficulty: Difficulty,
  stimulus: string,
  prompt: string,
  choices: Draft["choices"],
  answer: Draft["answer"],
  explanation: string,
) => q({ id, subjectId: "english", domainId, skillId, difficulty, stimulus, prompt, choices, answer, explanation });

const ENGLISH: Question[] = [
  // Conventions: punctuation
  EN("act-en-01", "conventions-english", "punctuation-english", "easy",
    "The harbor town of Wellmoor has one bakery, [u]and it opens[/u] at four in the morning.",
    "Which choice is correct?",
    ["NO CHANGE", "and, it opens", "and it, opens", "and it opens,"],
    "A",
    "A comma before a coordinating conjunction joining two independent clauses is correct as written. The other choices insert commas that split a clause from its own verb or object."),
  EN("act-en-02", "conventions-english", "punctuation-english", "medium",
    "Marisol packed three things for the trip: [u]a compass a notebook, and a spare battery.[/u]",
    "Which choice is correct?",
    ["NO CHANGE", "a compass, a notebook, and a spare battery.", "a compass, a notebook and, a spare battery.", "a compass; a notebook; and a spare battery."],
    "B",
    "Items in a simple series are separated by commas, so the correct version places a comma after each item before the conjunction. Semicolons are only needed when the items themselves contain commas."),
  EN("act-en-03", "conventions-english", "punctuation-english", "medium",
    "The museum's newest exhibit [u]which opened last Friday[/u] features maps drawn by hand in the 1700s.",
    "Which choice is correct?",
    ["NO CHANGE", ", which opened last Friday,", ", which opened last Friday", "which opened, last Friday,"],
    "B",
    "The clause adds nonessential information about an exhibit already identified as the newest one, so it is set off by a pair of commas."),
  EN("act-en-04", "conventions-english", "punctuation-english", "hard",
    "The committee reached a decision after [u]months of debate; the bridge[/u] would be repaired rather than replaced.",
    "Which choice is NOT an acceptable alternative to the underlined portion?",
    ["months of debate: the bridge", "months of debate. The bridge", "months of debate, the bridge", "months of debate -- the bridge"],
    "C",
    "Both sides of the semicolon are independent clauses. A colon, a period or a dash can join or separate them; a comma alone creates a comma splice."),

  // Conventions: sentence structure
  EN("act-en-05", "conventions-english", "sentence-structure", "easy",
    "The trail climbs steeply for two miles. [u]Then levels off near the ridge.[/u]",
    "Which choice is correct?",
    ["NO CHANGE", "Then it levels off near the ridge.", "Then leveling off near the ridge.", "Then, having leveled off near the ridge."],
    "B",
    "The original is a fragment with no subject. Adding the subject \"it\" makes a complete sentence."),
  EN("act-en-06", "conventions-english", "sentence-structure", "medium",
    "[u]Walking into the greenhouse, the heat surprised the visitors.[/u]",
    "Which choice is correct?",
    ["NO CHANGE", "Walking into the greenhouse, the visitors were surprised by the heat.", "The heat, walking into the greenhouse, surprised the visitors.", "Walking into the greenhouse, surprise from the heat hit the visitors."],
    "B",
    "The opening phrase must describe whoever is walking, so \"the visitors\" has to come directly after it. Every other version has the heat, or the surprise, doing the walking."),
  EN("act-en-07", "conventions-english", "sentence-structure", "hard",
    "The recipe calls for fresh basil, [u]it can be replaced[/u] with dried basil in winter.",
    "Which choice is correct?",
    ["NO CHANGE", "but it can be replaced", "it, can be replaced", "which it can be replaced"],
    "B",
    "Two independent clauses joined by only a comma form a comma splice. Adding the conjunction \"but\" fixes it and expresses the contrast."),

  // Conventions: usage
  EN("act-en-08", "conventions-english", "usage-english", "easy",
    "Each of the volunteers [u]have[/u] a badge with a different color.",
    "Which choice is correct?",
    ["NO CHANGE", "has", "are having", "were having"],
    "B",
    "The subject is \"Each\", which is singular, so the verb must be \"has\". \"Of the volunteers\" is a prepositional phrase and does not change the subject."),
  EN("act-en-09", "conventions-english", "usage-english", "medium",
    "The coach gave the trophy to Dario and [u]I[/u] after the final match.",
    "Which choice is correct?",
    ["NO CHANGE", "me", "myself", "mine"],
    "B",
    "\"Me\" is the object of the preposition \"to\". Removing \"Dario and\" shows it: \"gave the trophy to me\"."),
  EN("act-en-10", "conventions-english", "usage-english", "medium",
    "Of the two proposals, the second is clearly the [u]most practical[/u].",
    "Which choice is correct?",
    ["NO CHANGE", "more practical", "practicalest", "much practical"],
    "B",
    "When exactly two things are compared, use the comparative form \"more\", not the superlative \"most\"."),
  EN("act-en-11", "conventions-english", "usage-english", "hard",
    "The flock of starlings [u]changes their direction[/u] in an instant.",
    "Which choice is correct?",
    ["NO CHANGE", "changes its direction", "change its direction", "change their directions"],
    "B",
    "\"Flock\" is a singular collective noun acting as one unit, so it takes a singular verb (\"changes\") and a singular pronoun (\"its\")."),

  // Production: topic development
  EN("act-en-12", "production-of-writing", "topic-development", "medium",
    "Dr. Anneke Voss spent a decade tracking the migration of monarch butterflies across three countries. Her data showed that the insects' routes had shifted westward by nearly forty miles.",
    "The writer is considering adding the sentence \"Monarch butterflies are orange and black.\" after the first sentence. Should the writer make this addition?",
    ["Yes, because it helps the reader picture the butterflies.", "Yes, because it explains why the routes shifted.", "No, because it is a general detail that interrupts the discussion of Voss's findings.", "No, because it contradicts information given later."],
    "C",
    "The paragraph is about Voss's migration research. A general fact about coloring does not support that focus and breaks the link between her work and her findings."),
  EN("act-en-13", "production-of-writing", "topic-development", "hard",
    "The town council voted to convert the old rail line into a walking path. Since the path opened, weekend visits to downtown shops have nearly doubled.",
    "Suppose the writer's goal was to show that the path benefited local businesses. Does the passage accomplish this goal?",
    ["Yes, because it reports a rise in weekend visits to downtown shops after the path opened.", "Yes, because it explains how the council voted.", "No, because it focuses on the history of the rail line.", "No, because it does not mention the cost of building the path."],
    "A",
    "The second sentence directly ties the path's opening to more shop visits, which is evidence of a business benefit."),
  EN("act-en-14", "production-of-writing", "topic-development", "easy",
    "Lena had never baked bread before. [u]She followed her grandmother's handwritten recipe exactly, measuring each cup twice.[/u]",
    "If the writer deleted the underlined sentence, the paragraph would primarily lose:",
    ["a description of how carefully Lena approached her first attempt.", "an explanation of where the grandmother learned to bake.", "a comparison between two recipes.", "a statement of the essay's main argument."],
    "A",
    "The sentence shows Lena's careful method on her first try. It says nothing about the grandmother's history or any argument."),

  // Production: organization
  EN("act-en-15", "production-of-writing", "organization", "easy",
    "The storm knocked out power across the county. [u]Nevertheless,[/u] schools closed for two days.",
    "Which choice is correct?",
    ["NO CHANGE", "As a result,", "In contrast,", "For instance,"],
    "B",
    "School closures follow from the power outage, a cause-and-effect relationship. \"As a result\" signals that; \"Nevertheless\" signals contrast."),
  EN("act-en-16", "production-of-writing", "organization", "medium",
    "[1] Then she sanded each board by hand. [2] First, Priya measured the old shelves. [3] Finally, she stained the wood a deep walnut brown.",
    "For the sake of logic, sentence 2 should be placed:",
    ["where it is now.", "before sentence 1.", "after sentence 3.", "It should be deleted."],
    "B",
    "\"First\" introduces the opening step. Placing sentence 2 before sentence 1 puts the steps in order: first, then, finally."),
  EN("act-en-17", "production-of-writing", "organization", "hard",
    "The festival began as a small gathering of local musicians in a parking lot. Today it draws performers from twelve states.",
    "Which choice would best conclude a paragraph about how the festival has grown?",
    ["Parking lots are often used for community events.", "What began with a handful of neighbors now fills three city blocks every summer.", "Music has been important in many cultures.", "Some performers prefer indoor venues."],
    "B",
    "Only the sentence about a handful of neighbors growing to three city blocks sums up the growth from small beginnings to a large event. The others drift off topic."),

  // Knowledge of language: word choice
  EN("act-en-18", "knowledge-of-language", "word-choice", "easy",
    "The results of the survey were [u]surprising and unexpected[/u].",
    "Which choice is most concise?",
    ["NO CHANGE", "surprising", "surprising, being unexpected", "unexpectedly surprising"],
    "B",
    "\"Surprising\" and \"unexpected\" mean the same thing here, so using both is redundant."),
  EN("act-en-19", "knowledge-of-language", "word-choice", "medium",
    "The engineer [u]affected[/u] a change in the design that cut costs in half.",
    "Which choice is correct?",
    ["NO CHANGE", "effected", "infected", "afflicted"],
    "B",
    "As a verb, \"effect\" means to bring about. The engineer brought about a change, so \"effected\" is correct."),
  EN("act-en-20", "knowledge-of-language", "word-choice", "hard",
    "At the annual meeting, the treasurer [u]went over in detail and at length[/u] every line of the budget.",
    "Which choice is most concise without losing meaning?",
    ["NO CHANGE", "reviewed in detail", "went over, in detail and at length and fully,", "detailedly went over at length"],
    "B",
    "\"Reviewed in detail\" keeps the meaning and removes the wordy, overlapping phrasing."),

  // Knowledge of language: style and tone
  EN("act-en-21", "knowledge-of-language", "style-tone", "medium",
    "The report concludes that the reservoir's water levels have declined steadily since 2010, and it [u]is totally freaking out about[/u] the region's supply.",
    "Which choice best maintains the formal tone of the passage?",
    ["NO CHANGE", "raises concerns about", "is super worried about", "kind of panics about"],
    "B",
    "The passage uses a formal, report-like register. \"Raises concerns about\" matches it; the others are casual."),
  EN("act-en-22", "knowledge-of-language", "style-tone", "easy",
    "The old lighthouse keeper [u]dwelt[/u] alone on the rocky island for thirty years, tending the lamp each night.",
    "Which choice best fits the quiet, reflective tone of the essay?",
    ["NO CHANGE", "hung out", "crashed", "chilled"],
    "A",
    "\"Dwelt\" suits the calm, reflective tone. The alternatives are slang that clashes with it."),
];

/* ------------------------------------------------------------------ */
/* Mathematics                                                        */
/* ------------------------------------------------------------------ */

const M = (
  id: string,
  domainId: string,
  skillId: string,
  difficulty: Difficulty,
  prompt: string,
  choices: Draft["choices"],
  answer: Draft["answer"],
  explanation: string,
  figure?: Question["figure"],
) => q({ id, subjectId: "math", domainId, skillId, difficulty, prompt, choices, answer, explanation, figure });

const MATH: Question[] = [
  // Number & Quantity
  M("act-m-01", "number-quantity", "act-real-numbers", "easy",
    "What is the value of |3 - 11| + |-4| ?",
    ["-12", "4", "12", "18"], "C",
    "|3 - 11| = |-8| = 8 and |-4| = 4, so the sum is 12."),
  M("act-m-02", "number-quantity", "act-real-numbers", "medium",
    "For the imaginary unit i, where i^2 = -1, what is (2 + 3i)(2 - 3i) ?",
    ["-5", "4 - 9i", "13", "4 + 9i"], "C",
    "(2 + 3i)(2 - 3i) = 4 - 9i^2 = 4 - 9(-1) = 13."),
  M("act-m-03", "number-quantity", "act-real-numbers", "hard",
    "Which of the following is equivalent to sqrt(72) ?",
    ["6 sqrt(2)", "8 sqrt(3)", "4 sqrt(3)", "36 sqrt(2)"], "A",
    "72 = 36 x 2, so sqrt(72) = sqrt(36) x sqrt(2) = 6 sqrt(2)."),
  M("act-m-04", "number-quantity", "act-vectors-matrices", "medium",
    "Matrix A = [[2, 1], [0, 3]]. What is 3A ?",
    ["[[6, 3], [0, 9]]", "[[5, 4], [3, 6]]", "[[6, 1], [0, 3]]", "[[2, 3], [0, 9]]"], "A",
    "Multiplying a matrix by a scalar multiplies every entry: 3 x 2 = 6, 3 x 1 = 3, 3 x 0 = 0, 3 x 3 = 9."),
  M("act-m-05", "number-quantity", "act-vectors-matrices", "hard",
    "Vector u = <3, -2> and vector v = <-1, 5>. What is u + 2v ?",
    ["<1, 8>", "<2, 3>", "<5, -9>", "<1, 3>"], "A",
    "2v = <-2, 10>. Adding u gives <3 - 2, -2 + 10> = <1, 8>."),

  // Algebra
  M("act-m-06", "act-algebra", "act-linear-eq", "easy",
    "If 5x - 7 = 3x + 9, what is x ?",
    ["1", "4", "8", "16"], "C",
    "Subtract 3x from both sides: 2x - 7 = 9. Add 7: 2x = 16. So x = 8."),
  M("act-m-07", "act-algebra", "act-linear-eq", "medium",
    "Which values of x satisfy -2x + 5 > 11 ?",
    ["x > -3", "x < -3", "x > 3", "x < 8"], "B",
    "-2x > 6. Dividing by a negative number reverses the inequality: x < -3."),
  M("act-m-08", "act-algebra", "act-linear-eq", "medium",
    "A phone plan costs $20 per month plus $0.05 per text. Last month the bill was $31.50. How many texts were sent?",
    ["115", "230", "300", "630"], "B",
    "20 + 0.05t = 31.50, so 0.05t = 11.50 and t = 230."),
  M("act-m-09", "act-algebra", "act-quadratics", "easy",
    "What are the solutions of x^2 - 5x + 6 = 0 ?",
    ["x = -2 and x = -3", "x = 2 and x = 3", "x = 1 and x = 6", "x = -1 and x = 6"], "B",
    "x^2 - 5x + 6 = (x - 2)(x - 3), so x = 2 or x = 3."),
  M("act-m-10", "act-algebra", "act-quadratics", "hard",
    "For what value of k does x^2 + kx + 16 = 0 have exactly one real solution, if k > 0 ?",
    ["4", "8", "16", "32"], "B",
    "One real solution means the discriminant is zero: k^2 - 4(1)(16) = 0, so k^2 = 64 and k = 8."),
  M("act-m-11", "act-algebra", "act-exponents-radicals", "easy",
    "Which expression is equivalent to (x^3)(x^{4}) ?",
    ["x^{7}", "x^{12}", "2x^{7}", "7x"], "A",
    "When multiplying powers with the same base, add the exponents: 3 + 4 = 7."),
  M("act-m-12", "act-algebra", "act-exponents-radicals", "medium",
    "What is the value of 27^{2/3} ?",
    ["6", "9", "18", "81"], "B",
    "27^{1/3} = 3, and 3^2 = 9."),

  // Functions
  M("act-m-13", "act-functions", "act-function-notation", "easy",
    "If f(x) = 2x^2 - 3, what is f(-2) ?",
    ["-11", "5", "11", "13"], "B",
    "f(-2) = 2(4) - 3 = 8 - 3 = 5."),
  M("act-m-14", "act-functions", "act-function-notation", "medium",
    "If f(x) = x + 4 and g(x) = 3x, what is f(g(2)) ?",
    ["10", "12", "18", "6"], "A",
    "g(2) = 6, then f(6) = 6 + 4 = 10."),
  M("act-m-15", "act-functions", "act-function-notation", "hard",
    "If h(x) = (x - 1)/(x + 2), for which value of x is h(x) undefined?",
    ["-2", "-1", "1", "2"], "A",
    "The expression is undefined when the denominator is zero: x + 2 = 0 at x = -2."),
  M("act-m-16", "act-functions", "act-function-graphs", "medium",
    "The graph of y = x^2 is shifted 3 units right and 2 units up. Which equation describes the new graph?",
    ["y = (x + 3)^2 + 2", "y = (x - 3)^2 + 2", "y = (x - 3)^2 - 2", "y = x^2 + 5"], "B",
    "Shifting right by 3 replaces x with (x - 3); shifting up by 2 adds 2."),
  M("act-m-17", "act-functions", "act-function-graphs", "hard",
    "The graph below shows f(x) = x^2 - 4. Where does it cross the x-axis?",
    ["x = 4 only", "x = -2 and x = 2", "x = 0 only", "x = -4 and x = 4"], "B",
    "f(x) = 0 when x^2 = 4, so x = -2 or x = 2, which is where the parabola meets the x-axis.",
    {
      kind: "plot",
      x: [-4, 4, 1],
      y: [-5, 5, 1],
      axesAtOrigin: true,
      series: [{ type: "fn", f: (x: number) => x * x - 4, domain: [-3, 3] }],
      alt: "Upward parabola with vertex at (0, -4), crossing the x-axis at -2 and 2.",
    }),

  // Geometry
  M("act-m-18", "act-geometry", "act-area-perimeter", "easy",
    "A rectangle has a length of 12 cm and a width of 5 cm. What is its perimeter?",
    ["17 cm", "34 cm", "60 cm", "120 cm"], "B",
    "Perimeter = 2(12) + 2(5) = 24 + 10 = 34 cm."),
  M("act-m-19", "act-geometry", "act-area-perimeter", "medium",
    "A circle has a circumference of 10 pi inches. What is its area, in square inches?",
    ["10 pi", "25 pi", "50 pi", "100 pi"], "B",
    "C = 2 pi r = 10 pi, so r = 5. Area = pi r^2 = 25 pi."),
  M("act-m-20", "act-geometry", "act-area-perimeter", "hard",
    "A rectangular box is 4 ft long, 3 ft wide and 2 ft tall. What is the length of the longest straight rod that fits inside it, corner to opposite corner?",
    ["sqrt(29) ft", "9 ft", "5 ft", "sqrt(24) ft"], "A",
    "The space diagonal is sqrt(4^2 + 3^2 + 2^2) = sqrt(16 + 9 + 4) = sqrt(29)."),
  M("act-m-21", "act-geometry", "act-coordinate-geometry", "easy",
    "What is the slope of the line through (1, 2) and (5, 10) ?",
    ["1/2", "2", "4", "8"], "B",
    "Slope = (10 - 2)/(5 - 1) = 8/4 = 2."),
  M("act-m-22", "act-geometry", "act-coordinate-geometry", "medium",
    "What is the midpoint of the segment with endpoints (-3, 4) and (7, -2) ?",
    ["(2, 1)", "(5, 3)", "(4, 2)", "(2, 3)"], "A",
    "Midpoint = ((-3 + 7)/2, (4 + (-2))/2) = (2, 1)."),
  M("act-m-23", "act-geometry", "act-coordinate-geometry", "hard",
    "What is the distance between (1, -1) and (7, 7) ?",
    ["8", "10", "14", "sqrt(50)"], "B",
    "Distance = sqrt((7 - 1)^2 + (7 - (-1))^2) = sqrt(36 + 64) = sqrt(100) = 10."),
  M("act-m-24", "act-geometry", "act-triangles-trig", "easy",
    "Two angles of a triangle measure 48 degrees and 67 degrees. What is the third angle?",
    ["55 degrees", "65 degrees", "75 degrees", "115 degrees"], "B",
    "The angles of a triangle sum to 180: 180 - 48 - 67 = 65."),
  M("act-m-25", "act-geometry", "act-triangles-trig", "medium",
    "In right triangle ABC, angle C is the right angle, AC = 8 and BC = 6. What is sin A ?",
    ["3/5", "4/5", "3/4", "4/3"], "A",
    "The hypotenuse AB = sqrt(8^2 + 6^2) = 10. sin A = opposite/hypotenuse = BC/AB = 6/10 = 3/5."),
  M("act-m-26", "act-geometry", "act-triangles-trig", "hard",
    "A 20-foot ladder leans against a wall, making a 60 degree angle with the ground. How high up the wall does it reach?",
    ["10 ft", "10 sqrt(2) ft", "10 sqrt(3) ft", "20 sqrt(3) ft"], "C",
    "Height = 20 sin 60 = 20 (sqrt(3)/2) = 10 sqrt(3)."),

  // Statistics & Probability
  M("act-m-27", "act-stats-prob", "act-data-representations", "easy",
    "What is the mean of 6, 9, 10, 13 and 17 ?",
    ["10", "11", "12", "13"], "B",
    "The sum is 55 and there are 5 values, so the mean is 11."),
  M("act-m-28", "act-stats-prob", "act-data-representations", "medium",
    "The table shows the number of books read by students in a club. What is the median number of books?",
    ["2", "3", "4", "5"], "B",
    "There are 2 + 4 + 5 + 3 + 1 = 15 students. The 8th value in order is the median: the first 2 read 1, the next 4 read 2 (through the 6th), and the next 5 read 3 (7th through 11th). So the median is 3.",
    { kind: "table", head: ["Books read", "Students"], rows: [["1", "2"], ["2", "4"], ["3", "5"], ["4", "3"], ["5", "1"]] }),
  M("act-m-29", "act-stats-prob", "act-probability", "easy",
    "A bag holds 4 red, 5 blue and 3 green marbles. One marble is drawn at random. What is the probability it is blue?",
    ["1/4", "5/12", "5/7", "1/3"], "B",
    "There are 12 marbles and 5 are blue, so the probability is 5/12."),
  M("act-m-30", "act-stats-prob", "act-probability", "medium",
    "A fair coin is flipped 3 times. What is the probability of getting exactly 2 heads?",
    ["1/8", "1/4", "3/8", "1/2"], "C",
    "There are 8 equally likely outcomes, and 3 of them (HHT, HTH, THH) have exactly 2 heads."),
  M("act-m-31", "act-stats-prob", "act-probability", "hard",
    "How many different 3-person committees can be chosen from a group of 7 people?",
    ["21", "35", "210", "343"], "B",
    "Order does not matter: 7C3 = 7!/(3! 4!) = 35."),

  // Integrating Essential Skills
  M("act-m-32", "act-essential-skills", "act-ratios-rates", "easy",
    "A car travels 180 miles in 3 hours at a constant speed. How far does it travel in 5 hours?",
    ["240 miles", "300 miles", "360 miles", "900 miles"], "B",
    "The speed is 60 miles per hour, so in 5 hours it travels 300 miles."),
  M("act-m-33", "act-essential-skills", "act-ratios-rates", "medium",
    "The ratio of cats to dogs at a shelter is 3:5. There are 40 animals in total, all cats or dogs. How many are cats?",
    ["12", "15", "24", "25"], "B",
    "3 + 5 = 8 parts, so each part is 40/8 = 5 animals. Cats are 3 parts: 15."),
  M("act-m-34", "act-essential-skills", "act-percentages", "easy",
    "A jacket priced at $80 is on sale for 25% off. What is the sale price?",
    ["$20", "$55", "$60", "$65"], "C",
    "25% of 80 is 20, so the sale price is 80 - 20 = $60."),
  M("act-m-35", "act-essential-skills", "act-percentages", "medium",
    "A town's population grew from 12,000 to 15,000. By what percent did it increase?",
    ["20%", "25%", "30%", "80%"], "B",
    "The increase is 3,000, and 3,000/12,000 = 0.25, or 25%."),
  M("act-m-36", "act-essential-skills", "act-percentages", "hard",
    "A recipe uses 250 grams of flour. Using 1 ounce = 28 grams, about how many ounces is that, to the nearest tenth?",
    ["7.0", "8.9", "9.2", "11.2"], "B",
    "250/28 = 8.93, which rounds to 8.9."),
];

/* ------------------------------------------------------------------ */
/* Reading                                                            */
/* ------------------------------------------------------------------ */

const PASSAGE_ORCHARD =
  "**Literary Narrative: adapted from an original story**\n\n" +
  "Every autumn my aunt Teodora climbed the ladder into the oldest apple tree as though it owed her something. She never picked the fruit within easy reach; she said those apples belonged to whoever came after her. I was twelve the year she let me hold the ladder, and I remember being annoyed that she ignored the heavy red apples right beside my head.\n\n" +
  "\"Patience,\" she said, handing me a small, lopsided apple from the highest branch. \"The ones the sun works hardest on taste the best.\" I bit into it expecting nothing. It was the sweetest thing I had ever eaten.\n\n" +
  "Years later, when the orchard passed to me, I found myself leaving the low branches untouched too, though I could never quite explain why to the neighbors who watched from the fence.";

const PASSAGE_BEES =
  "**Natural Science: original passage**\n\n" +
  "For decades, researchers assumed that honeybees chose flowers mainly by color. A team led by entomologist Rafael Oduya tested that idea by offering bees identical blue feeders, some scented with lavender oil and some unscented. Bees visited the scented feeders nearly three times as often, even when the unscented feeders held more sugar water.\n\n" +
  "Oduya cautions against overstating the result. Color still matters at a distance, he argues, because scent does not travel far in open fields. His team proposes that bees use color to find a patch of flowers and scent to decide which individual flower to visit. Critics note that the experiment used only one scent and one species of bee, so the findings may not generalize.";

const PASSAGE_CITIES_A =
  "**Passage A** Urban planner Mira Castellanos argues that cities should convert parking lots into small parks. Green space, she writes, lowers summer temperatures by several degrees and gives residents a reason to walk rather than drive.";

const PASSAGE_CITIES_B =
  "**Passage B** Economist Tobias Renn agrees that parks have value but warns that removing parking too quickly can hurt small businesses whose customers still arrive by car. He recommends replacing parking only where public transit already serves the area well.";

const R = (
  id: string,
  domainId: string,
  skillId: string,
  difficulty: Difficulty,
  stimulus: string,
  prompt: string,
  choices: Draft["choices"],
  answer: Draft["answer"],
  explanation: string,
) => q({ id, subjectId: "reading", domainId, skillId, difficulty, stimulus, prompt, choices, answer, explanation });

const READING: Question[] = [
  R("act-rd-01", "key-ideas-details", "act-central-ideas", "easy", PASSAGE_ORCHARD,
    "Which choice best describes the main idea of the passage?",
    ["The narrator learns to value an aunt's patient approach and later adopts it.", "The narrator's aunt was an expert apple farmer who won prizes.", "The neighbors disapprove of how the orchard is managed.", "Apples picked from low branches are unsafe to eat."],
    "A",
    "The passage moves from the narrator's annoyance to tasting the best apple to, years later, following the aunt's practice; the correct choice captures that arc."),
  R("act-rd-02", "key-ideas-details", "act-central-ideas", "medium", PASSAGE_BEES,
    "The main purpose of the passage is to:",
    ["describe an experiment on how bees choose flowers and the limits of its findings.", "argue that color plays no role in bee behavior.", "explain how lavender oil is produced.", "criticize Oduya's research methods as careless."],
    "A",
    "The passage reports the feeder experiment, Oduya's interpretation and critics' caveats. It does not dismiss color or attack the methods as careless."),
  R("act-rd-03", "key-ideas-details", "act-relationships", "medium", PASSAGE_ORCHARD,
    "According to the passage, the aunt picked apples from the highest branches because she believed:",
    ["those apples were the sweetest, and the easy ones should be left for others.", "the low apples were rotten.", "the neighbors would pick the low apples.", "the ladder could not reach the low branches."],
    "A",
    "She says the easy-to-reach apples belong to whoever comes after her and that the sun-worked apples taste best."),
  R("act-rd-04", "key-ideas-details", "act-relationships", "hard", PASSAGE_BEES,
    "According to Oduya's proposal, how do color and scent relate in a bee's search for food?",
    ["Color guides bees to a patch of flowers; scent guides the choice of a single flower.", "Scent guides bees to a patch; color guides the choice of a flower.", "Bees use color only on cloudy days.", "Scent and color have identical roles."],
    "A",
    "The passage states the team's proposal directly: color to find a patch, scent to choose an individual flower."),
  R("act-rd-05", "craft-structure-act", "act-word-meaning", "medium", PASSAGE_ORCHARD,
    "As used in the first paragraph, the phrase \"as though it owed her something\" most nearly suggests the aunt climbed the tree:",
    ["with determination and a sense of entitlement to its best fruit.", "because she had lent the tree money.", "reluctantly and with fear.", "only when the neighbors were watching."],
    "A",
    "The figurative phrase conveys purposeful confidence, as if the tree's best apples were hers to claim."),
  R("act-rd-06", "craft-structure-act", "act-text-structure", "hard", PASSAGE_BEES,
    "The second paragraph mainly functions to:",
    ["qualify the experiment's result and note its limitations.", "introduce a new experiment with a different species.", "restate the first paragraph without adding information.", "describe how the feeders were built."],
    "A",
    "It tempers the result (color still matters at a distance) and reports critics' points about one scent and one species."),
  R("act-rd-07", "craft-structure-act", "act-point-of-view", "medium", PASSAGE_ORCHARD,
    "The passage is told from the point of view of:",
    ["an adult narrator recalling a childhood experience.", "the aunt, describing her own habits.", "a neighbor watching from the fence.", "an outside narrator who knows every character's thoughts."],
    "A",
    "The narrator speaks as \"I\", recalls being twelve and later inherits the orchard, so it is an adult looking back."),
  R("act-rd-08", "integration-knowledge", "act-argument-evaluation", "hard", PASSAGE_BEES,
    "Which finding, if true, would most weaken the critics' objection described in the passage?",
    ["A repeat of the experiment with several scents and three bee species produced the same pattern.", "Bees in the original study preferred blue to yellow.", "Lavender oil is expensive to buy.", "Some flowers have no scent at all."],
    "A",
    "The critics objected that one scent and one species might not generalize. Similar results across several scents and species would answer that directly."),
  R("act-rd-09", "integration-knowledge", "act-cross-passage", "medium", PASSAGE_CITIES_A + "\n\n" + PASSAGE_CITIES_B,
    "On which point do the authors of Passage A and Passage B agree?",
    ["Parks provide benefits to cities.", "All parking lots should be removed immediately.", "Small businesses do not depend on drivers.", "Public transit should be eliminated."],
    "A",
    "Castellanos lists benefits of parks, and Renn says parks \"have value\". They differ on how quickly parking should go."),
  R("act-rd-10", "integration-knowledge", "act-cross-passage", "hard", PASSAGE_CITIES_A + "\n\n" + PASSAGE_CITIES_B,
    "How would the author of Passage B most likely respond to Castellanos's proposal?",
    ["By supporting it only in areas already well served by public transit.", "By rejecting parks as having no value.", "By arguing that parks raise summer temperatures.", "By agreeing that every parking lot should become a park."],
    "A",
    "Renn recommends replacing parking only where transit already serves the area, a conditional version of Castellanos's plan."),
];

/* ------------------------------------------------------------------ */
/* Science                                                            */
/* ------------------------------------------------------------------ */

const SEED_TABLE: Question["figure"] = {
  kind: "table",
  title: "Table 1: Germination after 10 days",
  head: ["Temperature (C)", "Seeds planted", "Seeds germinated"],
  rows: [
    ["10", "50", "8"],
    ["15", "50", "21"],
    ["20", "50", "39"],
    ["25", "50", "44"],
    ["30", "50", "30"],
  ],
};

const SEED_STIM =
  "A student studied how soil temperature affects the germination of radish seeds. In each trial, 50 seeds were planted in identical trays of soil, watered with 20 mL of water daily and kept in the dark. Only the soil temperature differed between trays. The number of seeds that germinated after 10 days is shown in Table 1.";

const COOLING_PLOT: Question["figure"] = {
  kind: "plot",
  title: "Figure 1: Water temperature over time",
  xLabel: "Time (min)",
  yLabel: "Temperature (C)",
  x: [0, 40, 5],
  y: [20, 90, 10],
  labelEvery: 2,
  series: [
    { type: "polyline", label: "Cup 1: uncovered", pts: [[0, 90], [10, 68], [20, 54], [30, 45], [40, 39]] },
    { type: "polyline", label: "Cup 2: lid", dashed: true, pts: [[0, 90], [10, 78], [20, 69], [30, 62], [40, 57]] },
  ],
  alt: "Two cooling curves starting at 90 C. The uncovered cup falls to 39 C at 40 minutes; the covered cup falls more slowly to 57 C.",
};

const COOLING_STIM =
  "Two identical cups were filled with 200 mL of water at 90 C and left on a lab bench at 21 C. Cup 1 was uncovered; Cup 2 had a plastic lid. The temperature of each was recorded every 10 minutes (Figure 1).";

const MODELS_STIM =
  "Two students explain why a metal spoon feels colder than a wooden spoon in the same room.\n\n" +
  "**Student 1:** The metal spoon is actually at a lower temperature than the wooden spoon, because metal absorbs cold from the air.\n\n" +
  "**Student 2:** Both spoons are at room temperature. Metal conducts heat away from the hand much faster than wood does, so it feels colder.";

const S = (
  id: string,
  domainId: string,
  skillId: string,
  difficulty: Difficulty,
  stimulus: string,
  prompt: string,
  choices: Draft["choices"],
  answer: Draft["answer"],
  explanation: string,
  figure?: Question["figure"],
) => q({ id, subjectId: "science", domainId, skillId, difficulty, stimulus, prompt, choices, answer, explanation, figure });

const SCIENCE: Question[] = [
  S("act-sc-01", "interpretation-data", "act-read-tables-graphs", "easy", SEED_STIM,
    "According to Table 1, how many seeds germinated at 20 C?",
    ["21", "30", "39", "44"], "C",
    "Read the 20 C row: 39 seeds germinated.", SEED_TABLE),
  S("act-sc-02", "interpretation-data", "act-data-trends", "medium", SEED_STIM,
    "Based on Table 1, as temperature increased from 10 C to 30 C, the number of seeds that germinated:",
    ["increased only.", "decreased only.", "increased, then decreased.", "stayed the same."],
    "C",
    "Germination rose from 8 to 44 between 10 C and 25 C, then fell to 30 at 30 C.", SEED_TABLE),
  S("act-sc-03", "interpretation-data", "act-data-trends", "hard", SEED_STIM,
    "If a trial were run at 22 C, the number of seeds germinated would most likely be:",
    ["fewer than 21.", "between 21 and 39.", "between 39 and 44.", "more than 44."],
    "C",
    "22 C lies between 20 C (39 seeds) and 25 C (44 seeds), and the trend is rising in that range.", SEED_TABLE),
  S("act-sc-04", "interpretation-data", "act-read-tables-graphs", "easy", COOLING_STIM,
    "According to Figure 1, what was the temperature of Cup 1 at 20 minutes?",
    ["45 C", "54 C", "62 C", "69 C"], "B",
    "The solid line (Cup 1) reads 54 C at 20 minutes.", COOLING_PLOT),
  S("act-sc-05", "interpretation-data", "act-data-trends", "medium", COOLING_STIM,
    "Which statement is supported by Figure 1?",
    ["The covered cup lost heat more slowly than the uncovered cup.", "The covered cup lost heat faster.", "Both cups cooled at the same rate.", "Cup 1 was warmer than Cup 2 at 40 minutes."],
    "A",
    "At every time after 0 minutes, Cup 2 is warmer, so it lost heat more slowly.", COOLING_PLOT),
  S("act-sc-06", "scientific-investigation", "act-experimental-design", "medium", SEED_STIM,
    "Which variable did the student intentionally change between trials?",
    ["The number of seeds planted", "The volume of water", "The soil temperature", "The amount of light"],
    "C",
    "The passage says only the soil temperature differed between trays; it is the independent variable.", SEED_TABLE),
  S("act-sc-07", "scientific-investigation", "act-experimental-design", "hard", COOLING_STIM,
    "Why were both cups filled with the same volume of water at the same starting temperature?",
    ["So any difference in cooling could be attributed to the lid.", "So the room temperature would stay at 21 C.", "So the water would boil.", "So the lid would fit tightly."],
    "A",
    "Holding volume and starting temperature constant isolates the lid as the only difference between the cups.", COOLING_PLOT),
  S("act-sc-08", "scientific-investigation", "act-methods-tools", "easy", COOLING_STIM,
    "Which tool was most directly needed to collect the data in Figure 1?",
    ["A thermometer", "A balance", "A microscope", "A voltmeter"],
    "A",
    "The data are temperatures over time, which are measured with a thermometer.", COOLING_PLOT),
  S("act-sc-09", "scientific-investigation", "act-methods-tools", "medium", SEED_STIM,
    "The student wants to test whether light affects germination at 25 C. Which new setup is best?",
    ["Two trays at 25 C, one in the dark and one in light, all else the same.", "One tray at 25 C in light and one at 10 C in the dark.", "One tray at 25 C in light only.", "Two trays in light at different temperatures."],
    "A",
    "To test light, only light should differ; temperature and everything else must be held the same.", SEED_TABLE),
  S("act-sc-10", "evaluation-models", "act-model-evaluation", "medium", MODELS_STIM,
    "A thermometer shows both spoons at 21 C. This result supports:",
    ["Student 1 only.", "Student 2 only.", "both students.", "neither student."],
    "B",
    "Student 2 said both spoons are at room temperature; Student 1 said the metal spoon is colder."),
  S("act-sc-11", "evaluation-models", "act-model-evaluation", "hard", MODELS_STIM,
    "With which statement would both students agree?",
    ["The metal spoon feels colder to the touch than the wooden spoon.", "The metal spoon is at a lower temperature.", "Wood conducts heat faster than metal.", "Both spoons are at room temperature."],
    "A",
    "Both begin from the observation that metal feels colder; they disagree about why."),
  S("act-sc-12", "evaluation-models", "act-extending-findings", "hard", COOLING_STIM,
    "If the experiment continued for many hours, the temperature of Cup 1 would most likely approach:",
    ["0 C", "21 C", "39 C", "90 C"],
    "B",
    "Water cools toward the temperature of its surroundings; the bench is at 21 C.", COOLING_PLOT),
];

export const ACT_QUESTIONS: Question[] = [...ENGLISH, ...MATH, ...READING, ...SCIENCE];
