/**
 * The PreACT practice bank.
 *
 * The PreACT shares the ACT's sections and reporting categories, so these
 * questions use the ACT bank's helper (`q` in `act.ts`, which also spreads the
 * correct answers across A to D) and are tagged `testId: "preact"`. They are
 * pitched a little below the ACT: shorter passages, fewer steps per problem.
 *
 * Every item was written for Pathforge. None of it is ACT material, and
 * passages are about invented people, places and studies.
 */

import type { Difficulty, Question } from "../types";
import { q, type Draft } from "./act";

type Choices = Draft["choices"];
type Letter = Draft["answer"];

const make =
  (subjectId: Draft["subjectId"]) =>
  (
    id: string,
    domainId: string,
    skillId: string,
    difficulty: Difficulty,
    stimulus: string | undefined,
    prompt: string,
    choices: Choices,
    answer: Letter,
    explanation: string,
    figure?: Question["figure"],
  ) =>
    q({ id, testId: "preact", subjectId, domainId, skillId, difficulty, stimulus, prompt, choices, answer, explanation, figure });

const EN = make("english");
const M = make("math");
const R = make("reading");
const S = make("science");

const CORRECT = "Which choice is correct?";

/* ------------------------------------------------------------------ */
/* English                                                            */
/* ------------------------------------------------------------------ */

const ENGLISH: Question[] = [
  EN("pa-en-01", "conventions-english", "punctuation-english", "easy",
    "The bus to the lake leaves at [u]noon, it[/u] returns at six.",
    CORRECT,
    ["NO CHANGE", "noon; it", "noon it", "noon, it,"], "B",
    "Two complete sentences meet here. A semicolon can join them; a comma alone makes a comma splice, and no punctuation makes a run-on."),
  EN("pa-en-02", "conventions-english", "punctuation-english", "medium",
    "Ms. Okafor, [u]who coaches the debate team[/u] also teaches chemistry.",
    CORRECT,
    ["NO CHANGE", "who coaches the debate team,", "who coaches, the debate team", "who, coaches the debate team"], "B",
    "The clause opens with a comma after \"Ms. Okafor,\" so it needs a closing comma before the verb \"teaches.\""),
  EN("pa-en-03", "conventions-english", "punctuation-english", "medium",
    "All three [u]teams' uniforms[/u] were washed before the final game.",
    CORRECT,
    ["NO CHANGE", "team's uniforms", "teams uniforms'", "teams uniform's"], "A",
    "The uniforms belong to three teams, a plural, so the apostrophe goes after the s: teams'. The original is correct."),
  EN("pa-en-04", "conventions-english", "usage-english", "easy",
    "Each of the volunteers [u]have brought[/u] a pair of gloves.",
    CORRECT,
    ["NO CHANGE", "has brought", "are bringing", "were bringing"], "B",
    "The subject is \"Each,\" which is singular; \"of the volunteers\" does not change that. A singular subject takes \"has.\""),
  EN("pa-en-05", "conventions-english", "usage-english", "medium",
    "The coach gave the awards to Priya and [u]I[/u] after the season ended.",
    CORRECT,
    ["NO CHANGE", "me", "myself", "mine"], "B",
    "The pronoun is an object of \"to,\" so it takes the object form \"me.\" Drop \"Priya and\" to hear it: \"gave the awards to me.\""),
  EN("pa-en-06", "conventions-english", "usage-english", "hard",
    "Of the two trails, the northern one is [u]the steepest[/u].",
    CORRECT,
    ["NO CHANGE", "the steeper", "more steeper", "steepest of all"], "B",
    "Comparing exactly two things calls for the comparative form, \"steeper.\" \"Steepest\" is for three or more."),
  EN("pa-en-07", "conventions-english", "sentence-structure", "easy",
    "[u]Because the storm knocked out the power. The game[/u] was postponed.",
    CORRECT,
    ["NO CHANGE", "Because the storm knocked out the power, the game", "Because the storm knocked out the power; the game", "The storm knocked out the power, because the game"], "B",
    "\"Because the storm knocked out the power\" cannot stand alone. Joined to the main clause with a comma, it becomes a complete sentence."),
  EN("pa-en-08", "conventions-english", "sentence-structure", "medium",
    "On weekends, Dara likes hiking, swimming, and [u]to ride[/u] her bike.",
    CORRECT,
    ["NO CHANGE", "riding", "she rides", "to be riding"], "B",
    "Items in a list take the same form. \"Hiking\" and \"swimming\" end in -ing, so the third item should be \"riding.\""),
  EN("pa-en-09", "knowledge-of-language", "word-choice", "easy",
    "The museum is open [u]every single day of the week, seven days,[/u] from May to September.",
    CORRECT,
    ["NO CHANGE", "daily", "every day of the week, all seven,", "each and every day"], "B",
    "\"Daily\" says the same thing once. The other versions repeat the idea."),
  EN("pa-en-10", "knowledge-of-language", "word-choice", "medium",
    "The scientist's [u]affect[/u] on the field was lasting.",
    CORRECT,
    ["NO CHANGE", "effect", "affection", "effecting"], "B",
    "A noun meaning \"influence\" or \"result\" is needed here, which is \"effect.\" \"Affect\" is usually a verb."),
  EN("pa-en-11", "knowledge-of-language", "style-tone", "medium",
    "The town council's report concludes that the new crosswalks have reduced accidents by 30 percent. The data [u]totally prove, like, that[/u] the program works.",
    "Which choice best maintains the formal tone of the report?",
    ["NO CHANGE", "strongly suggest that", "are super clear that", "for real show that"], "B",
    "The report's language is formal. \"Strongly suggest that\" matches it; the other versions are casual."),
  EN("pa-en-12", "production-of-writing", "topic-development", "medium",
    "The writer is considering adding the following sentence to a paragraph about how community gardens lower families' food costs:\n\nTomatoes were first grown in South America.",
    "Should the writer make this addition?",
    ["No, because it does not relate to the paragraph's focus on food costs.", "Yes, because it gives background about a common garden crop.", "Yes, because it explains why gardens lower costs.", "No, because it contradicts information given later."], "A",
    "The paragraph is about saving money. Where tomatoes first grew has nothing to do with that, so the sentence would distract."),
  EN("pa-en-13", "production-of-writing", "topic-development", "hard",
    "Suppose the writer's goal was to explain how a local library increased its number of visitors. The essay the writer produced describes the history of the library building's architecture.",
    "Would the essay accomplish the writer's goal?",
    ["No, because it focuses on the building's design rather than on changes that brought in visitors.", "Yes, because the architecture attracts visitors.", "Yes, because it describes the library in detail.", "No, because it argues that libraries are no longer needed."], "A",
    "The goal is about visitor numbers. An essay about architecture never explains what changed to bring more people in."),
  EN("pa-en-14", "production-of-writing", "organization", "medium",
    "The first bridge across the river was built of wood. [u]For example,[/u] it burned down within ten years.",
    CORRECT,
    ["NO CHANGE", "Unfortunately,", "Similarly,", "In other words,"], "B",
    "Burning down is not an example of being built of wood; it is a bad outcome. \"Unfortunately\" signals that."),
  EN("pa-en-15", "production-of-writing", "organization", "hard",
    "[1] Jamal wanted a campfire before dark. [2] First, he collected fallen branches. [3] Finally, he lit the fire and warmed his hands. [4] Then he arranged the branches in a small teepee.",
    "For the sake of logic, Sentence 4 should be placed:",
    ["where it is now.", "before Sentence 1.", "after Sentence 1.", "after Sentence 2."], "D",
    "Arranging the branches comes after collecting them (\"First\") and before lighting the fire (\"Finally\"), so it belongs after Sentence 2."),
];

/* ------------------------------------------------------------------ */
/* Mathematics                                                        */
/* ------------------------------------------------------------------ */

const MATH: Question[] = [
  M("pa-m-01", "number-quantity", "act-real-numbers", "easy", undefined,
    "What is the value of |-7| + |3| ?",
    ["-10", "-4", "4", "10"], "D",
    "Absolute value is distance from zero: |-7| = 7 and |3| = 3, so the sum is 10."),
  M("pa-m-02", "number-quantity", "act-real-numbers", "medium", undefined,
    "Which of the following is equivalent to {sqrt}50 ?",
    ["2{sqrt}5", "5{sqrt}2", "10{sqrt}5", "25{sqrt}2"], "B",
    "50 = 25 {times} 2, and {sqrt}25 = 5, so {sqrt}50 = 5{sqrt}2."),
  M("pa-m-03", "number-quantity", "act-vectors-matrices", "medium", undefined,
    "Matrix M has rows [1 2] and [3 4]. What is the sum of all the entries of 2M ?",
    ["10", "12", "20", "24"], "C",
    "Multiplying a matrix by 2 doubles every entry. The entries of M sum to 10, so the entries of 2M sum to 20."),
  M("pa-m-04", "act-algebra", "act-linear-eq", "easy", undefined,
    "If 4x - 5 = 23, what is the value of x ?",
    ["4.5", "7", "9", "18"], "B",
    "Add 5 to both sides: 4x = 28. Divide by 4: x = 7."),
  M("pa-m-05", "act-algebra", "act-linear-eq", "medium", undefined,
    "Which of the following describes all values of x that satisfy 2x + 3 < 11 ?",
    ["x < 4", "x > 4", "x < 7", "x > 7"], "A",
    "Subtract 3: 2x < 8. Divide by 2 (a positive number, so the sign stays): x < 4."),
  M("pa-m-06", "act-algebra", "act-quadratics", "medium", undefined,
    "What are the solutions of x^2 - 7x + 10 = 0 ?",
    ["x = 2 and x = 5", "x = -2 and x = -5", "x = 1 and x = 10", "x = 3 and x = 4"], "A",
    "Find two numbers that multiply to 10 and add to -7: -2 and -5. So (x - 2)(x - 5) = 0, and x = 2 or x = 5."),
  M("pa-m-07", "act-algebra", "act-exponents-radicals", "easy", undefined,
    "What is the value of (2^3)(3^2) ?",
    ["36", "54", "72", "216"], "C",
    "2^3 = 8 and 3^2 = 9, and 8 {times} 9 = 72."),
  M("pa-m-08", "act-algebra", "act-exponents-radicals", "medium", undefined,
    "Which expression is equivalent to (x^{5})/(x^2), for x != 0 ?",
    ["x^3", "x^{7}", "x^{10}", "3x"], "A",
    "When dividing powers of the same base, subtract the exponents: 5 - 2 = 3."),
  M("pa-m-09", "act-functions", "act-function-notation", "easy", undefined,
    "If f(x) = 3x - 2, what is the value of f(5) ?",
    ["7", "13", "15", "17"], "B",
    "f(5) = 3(5) - 2 = 15 - 2 = 13."),
  M("pa-m-10", "act-functions", "act-function-notation", "medium", undefined,
    "If g(x) = x^2 + 1, what is the value of g(-3) ?",
    ["-8", "-5", "8", "10"], "D",
    "g(-3) = (-3)^2 + 1 = 9 + 1 = 10. Squaring a negative number gives a positive result."),
  M("pa-m-11", "act-functions", "act-function-graphs", "hard", undefined,
    "The graph of y = x^2 is shifted 4 units to the right. Which equation describes the new graph?",
    ["y = (x - 4)^2", "y = (x + 4)^2", "y = x^2 + 4", "y = x^2 - 4"], "A",
    "Replacing x with x - 4 moves a graph 4 units right. Adding or subtracting 4 outside the square moves it up or down."),
  M("pa-m-12", "act-geometry", "act-area-perimeter", "easy", undefined,
    "A square has a perimeter of 36 inches. What is its area, in square inches?",
    ["81", "96", "144", "324"], "A",
    "Each side is 36 / 4 = 9 inches, so the area is 9 {times} 9 = 81 square inches."),
  M("pa-m-13", "act-geometry", "act-coordinate-geometry", "medium", undefined,
    "What is the slope of the line through the points (2, 3) and (6, 11) ?",
    ["1/2", "2", "4", "8"], "B",
    "Slope = (11 - 3)/(6 - 2) = 8/4 = 2."),
  M("pa-m-14", "act-geometry", "act-triangles-trig", "medium", undefined,
    "A right triangle has legs of length 6 and 8. What is the length of its hypotenuse?",
    ["7", "8", "10", "14"], "C",
    "6^2 + 8^2 = 36 + 64 = 100, and {sqrt}100 = 10."),
  M("pa-m-15", "act-stats-prob", "act-data-representations", "easy", undefined,
    "What is the median of the numbers 3, 9, 4, 7, 12 ?",
    ["4", "5", "7", "9"], "C",
    "In order the numbers are 3, 4, 7, 9, 12. The middle one is 7."),
  M("pa-m-16", "act-stats-prob", "act-data-representations", "medium", undefined,
    "The mean of 5 numbers is 12. When a sixth number is added, the mean of all 6 numbers is 13. What is the sixth number?",
    ["14", "16", "17", "18"], "D",
    "The first 5 numbers total 5 {times} 12 = 60. All 6 total 6 {times} 13 = 78. The sixth is 78 - 60 = 18."),
  M("pa-m-17", "act-stats-prob", "act-probability", "medium", undefined,
    "A spinner has 8 equal sections numbered 1 through 8. What is the probability of landing on a number greater than 5?",
    ["3/8", "1/2", "5/8", "3/4"], "A",
    "The numbers greater than 5 are 6, 7 and 8: three of the eight equal sections, so 3/8."),
  M("pa-m-18", "act-stats-prob", "act-probability", "hard", undefined,
    "Two fair six-sided dice are rolled. What is the probability that the sum of the numbers rolled is 7?",
    ["1/12", "1/6", "7/36", "1/5"], "B",
    "Of the 36 equally likely outcomes, 6 sum to 7 (1+6, 2+5, 3+4, 4+3, 5+2, 6+1). 6/36 = 1/6."),
  M("pa-m-19", "act-essential-skills", "act-ratios-rates", "easy", undefined,
    "A car uses 3 gallons of gas to travel 90 miles. At that rate, how many gallons does it use to travel 150 miles?",
    ["5", "6", "7.5", "9"], "A",
    "The car goes 90 / 3 = 30 miles per gallon, so 150 miles takes 150 / 30 = 5 gallons."),
  M("pa-m-20", "act-essential-skills", "act-percentages", "medium", undefined,
    "A shirt that costs $40 is marked up by 15%. What is the new price?",
    ["$44", "$46", "$48", "$55"], "B",
    "15% of $40 is $6, so the new price is $40 + $6 = $46."),
];

/* ------------------------------------------------------------------ */
/* Reading                                                            */
/* ------------------------------------------------------------------ */

const PASSAGE_LIGHTHOUSE =
  "**Literary Narrative: original story**\n\n" +
  "For six summers, Imani's grandfather kept the lighthouse on Gull Point, though the light had run on its own for years. Each evening he still climbed the ninety-two steps, wiped the lens with a soft cloth and wrote the weather in a notebook no one had asked him to keep.\n\n" +
  "The summer Imani turned fourteen, she climbed with him. By the fortieth step her legs burned, and she asked why he bothered when a machine did the work. He only handed her the cloth.\n\n" +
  "Years later, after the lighthouse had been sold, Imani found the notebooks in a box in her mother's attic. Six summers of wind and cloud, in the same careful hand. She read them all in one night.";

const PASSAGE_MARSH =
  "**Natural Science: original passage**\n\n" +
  "Salt marshes along coastlines are often described as wasteland, but ecologist Hana Whitlow argues that they are among the most productive places on Earth. The grasses in a healthy marsh store carbon in their roots and in the mud beneath them, sometimes for centuries, far longer than many forests hold it in wood.\n\n" +
  "Whitlow's team measured the carbon in marshes that had been drained for farmland and in nearby marshes left intact. The drained marshes held less than half as much carbon per square meter. Whitlow cautions that the study covered only one region, but she argues that protecting existing marshes may be a cheaper way to store carbon than planting new forests.";

const READING: Question[] = [
  R("pa-rd-01", "key-ideas-details", "act-central-ideas", "easy", PASSAGE_LIGHTHOUSE,
    "Which choice best describes the main idea of the passage?",
    ["A grandfather's quiet routine at a lighthouse comes to mean something to his granddaughter.", "A lighthouse keeper struggles to repair a broken light.", "Imani refuses to visit her grandfather's lighthouse.", "The lighthouse on Gull Point is sold to a museum."], "A",
    "The passage follows the grandfather's evening routine, Imani's question about it and, years later, her reading every notebook in one night."),
  R("pa-rd-02", "key-ideas-details", "act-relationships", "medium", PASSAGE_LIGHTHOUSE,
    "Based on the passage, the grandfather's evening routine was:",
    ["not required, because the light ran on its own.", "his main source of income.", "ordered by the town council.", "something Imani did in his place."], "A",
    "The first paragraph says the light had run on its own for years and that no one had asked him to keep the notebook."),
  R("pa-rd-03", "craft-structure-act", "act-word-meaning", "medium", PASSAGE_LIGHTHOUSE,
    "As it is used in the last paragraph, the phrase \"in the same careful hand\" most nearly refers to:",
    ["handwriting that stayed neat and consistent.", "a hand that had been injured.", "the grandfather's skill with tools.", "the way Imani held the notebooks."], "A",
    "\"Hand\" here means handwriting: six summers of entries, all written with the same care."),
  R("pa-rd-04", "craft-structure-act", "act-point-of-view", "hard", PASSAGE_LIGHTHOUSE,
    "The passage is narrated from the point of view of:",
    ["a third-person narrator who focuses mainly on Imani.", "Imani, speaking as \"I.\"", "the grandfather, looking back.", "Imani's mother."], "A",
    "The narrator never says \"I\"; Imani and her grandfather are both \"she\" and \"he,\" and the story follows what Imani does and finds."),
  R("pa-rd-05", "key-ideas-details", "act-central-ideas", "medium", PASSAGE_MARSH,
    "The main purpose of the passage is to:",
    ["present research suggesting that salt marshes store large amounts of carbon.", "argue that new forests should no longer be planted.", "describe how to drain a marsh for farming.", "explain why marsh grasses grow slowly."], "A",
    "The passage reports Whitlow's argument and her team's measurements of carbon in marshes. It does not argue against forests."),
  R("pa-rd-06", "key-ideas-details", "act-relationships", "medium", PASSAGE_MARSH,
    "According to the passage, compared with intact marshes, drained marshes held:",
    ["no carbon at all.", "less than half as much carbon per square meter.", "about the same amount of carbon.", "twice as much carbon."], "B",
    "The second paragraph says the drained marshes held less than half as much carbon per square meter."),
  R("pa-rd-07", "craft-structure-act", "act-text-structure", "hard", PASSAGE_MARSH,
    "The statement that \"the study covered only one region\" mainly serves to:",
    ["acknowledge a limit on how widely the findings apply.", "reject the study's findings.", "introduce a second study.", "explain how the carbon was measured."], "A",
    "Whitlow still makes her argument, but notes that results from one region may not hold everywhere."),
  R("pa-rd-08", "integration-knowledge", "act-argument-evaluation", "hard", PASSAGE_MARSH,
    "Which finding, if true, would most strengthen Whitlow's argument?",
    ["Similar differences in carbon between drained and intact marshes were found in several other regions.", "Some marsh grasses are used to weave baskets.", "Forests are home to more bird species than marshes are.", "Drained marshes are easier to farm."], "A",
    "Her own caution is that the study covered one region. The same result in other regions answers that caution directly."),
];

/* ------------------------------------------------------------------ */
/* Science                                                            */
/* ------------------------------------------------------------------ */

const PENDULUM_TABLE: Question["figure"] = {
  kind: "table",
  title: "Table 1: Time for 10 swings",
  head: ["Length (cm)", "Time for 10 swings (s)"],
  rows: [
    ["25", "10.0"],
    ["50", "14.2"],
    ["100", "20.1"],
    ["200", "28.4"],
  ],
};

const PENDULUM_STIM =
  "A student timed pendulums of different lengths. Each pendulum used the same metal weight, was released from the same angle, and was timed for 10 full swings. The results are shown in Table 1.";

const LIGHT_PLOT: Question["figure"] = {
  kind: "plot",
  title: "Figure 1: Average plant height after 3 weeks",
  xLabel: "Hours of light per day",
  yLabel: "Height (cm)",
  x: [0, 24, 4],
  y: [0, 20, 5],
  series: [
    { type: "polyline", pts: [[4, 6], [8, 11], [12, 15], [16, 16], [20, 14]] },
    { type: "points", pts: [[4, 6], [8, 11], [12, 15], [16, 16], [20, 14]] },
  ],
  alt: "Plant height rises from 6 cm at 4 hours to 11 cm at 8 hours, 15 cm at 12 hours and a peak of 16 cm at 16 hours, then falls to 14 cm at 20 hours.",
};

const LIGHT_STIM =
  "A class grew bean plants under lamps. Each group of plants received a different number of hours of light per day; soil, water and temperature were the same for every group. Figure 1 shows the average height of each group after 3 weeks.";

const PUDDLE_STIM =
  "Two students explain why a puddle disappears on a sunny day.\n\n" +
  "**Student 1:** The water soaks into the ground beneath the puddle.\n\n" +
  "**Student 2:** The water evaporates into the air, and it evaporates faster when the air is warm and dry.";

const SCIENCE: Question[] = [
  S("pa-sc-01", "interpretation-data", "act-read-tables-graphs", "easy", PENDULUM_STIM,
    "According to Table 1, how long did 10 swings take for the 100 cm pendulum?",
    ["10.0 s", "14.2 s", "20.1 s", "28.4 s"], "C",
    "Read the 100 cm row: 20.1 seconds.", PENDULUM_TABLE),
  S("pa-sc-02", "interpretation-data", "act-data-trends", "medium", PENDULUM_STIM,
    "Based on Table 1, as the length of the pendulum increased, the time for 10 swings:",
    ["increased only.", "decreased only.", "increased, then decreased.", "stayed the same."], "A",
    "Every longer pendulum took longer: 10.0, 14.2, 20.1, then 28.4 seconds.", PENDULUM_TABLE),
  S("pa-sc-03", "evaluation-models", "act-extending-findings", "hard", PENDULUM_STIM,
    "According to Table 1, when the length of the pendulum was multiplied by 4, the time for 10 swings was approximately:",
    ["doubled.", "halved.", "unchanged.", "quadrupled."], "A",
    "From 25 cm to 100 cm (4 times as long) the time went from 10.0 s to 20.1 s; from 50 cm to 200 cm it went from 14.2 s to 28.4 s. Both about double.", PENDULUM_TABLE),
  S("pa-sc-04", "scientific-investigation", "act-methods-tools", "medium", PENDULUM_STIM,
    "The student most likely timed 10 swings rather than 1 swing in order to:",
    ["reduce the effect of small timing errors on each measurement.", "make the pendulum swing faster.", "change the length of the pendulum.", "keep the release angle the same."], "A",
    "A stopwatch error of a fraction of a second matters much less over 10 swings than over one."),
  S("pa-sc-05", "scientific-investigation", "act-experimental-design", "medium", PENDULUM_STIM,
    "Which of the following was held constant in the experiment?",
    ["The release angle", "The length of the pendulum", "The time for 10 swings", "The number of swings per second"], "A",
    "The passage says each pendulum was released from the same angle. Length was changed on purpose, and the time was measured."),
  S("pa-sc-06", "interpretation-data", "act-read-tables-graphs", "easy", LIGHT_STIM,
    "According to Figure 1, plants given 8 hours of light per day grew to an average height of about:",
    ["6 cm", "11 cm", "15 cm", "16 cm"], "B",
    "Read the point at 8 hours: about 11 cm.", LIGHT_PLOT),
  S("pa-sc-07", "interpretation-data", "act-data-trends", "medium", LIGHT_STIM,
    "According to Figure 1, which number of hours of light per day produced the greatest average height?",
    ["8", "12", "16", "20"], "C",
    "The highest point on the graph is 16 cm, at 16 hours. Height falls again at 20 hours.", LIGHT_PLOT),
  S("pa-sc-08", "evaluation-models", "act-extending-findings", "hard", LIGHT_STIM,
    "Based on Figure 1, plants given 10 hours of light per day would most likely have an average height of:",
    ["less than 6 cm.", "between 6 cm and 11 cm.", "between 11 cm and 15 cm.", "more than 16 cm."], "C",
    "10 hours lies between 8 hours (11 cm) and 12 hours (15 cm), and height is rising across that range.", LIGHT_PLOT),
  S("pa-sc-09", "evaluation-models", "act-model-evaluation", "medium", PUDDLE_STIM,
    "A puddle on a sealed plastic sheet, which water cannot pass through, disappeared in 3 hours on a warm, dry day. This result is more consistent with the explanation of:",
    ["Student 2 only.", "Student 1 only.", "both students.", "neither student."], "A",
    "The water could not soak into anything, yet it still disappeared, so it must have gone into the air, as Student 2 says."),
  S("pa-sc-10", "evaluation-models", "act-model-evaluation", "hard", PUDDLE_STIM,
    "Which observation would Student 2 most likely predict?",
    ["A puddle on a cool, humid day lasts longer than an identical puddle on a warm, dry day.", "A puddle on sand disappears faster than one on plastic.", "Puddles never disappear on cloudy days.", "A puddle's water level rises on a sunny day."], "A",
    "Student 2 says evaporation is faster in warm, dry air, so the same puddle should last longer in cool, humid air."),
];

export const PREACT_QUESTIONS: Question[] = [...ENGLISH, ...MATH, ...READING, ...SCIENCE];
