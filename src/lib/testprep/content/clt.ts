/**
 * The Classic Learning Test practice bank.
 *
 * The CLT draws its Verbal Reasoning passages from the classical tradition, so
 * two of the passages here are public-domain texts quoted in full (Lincoln's
 * Gettysburg Address, 1863, and the opening of Jane Austen's Pride and
 * Prejudice, 1813) and one is an original account of a historical experiment.
 * The questions, and everything in Grammar/Writing and Quantitative
 * Reasoning, were written for Pathforge. None of it is Classic Learning
 * Initiatives material.
 *
 * Uses the ACT bank's helper (`q` in `act.ts`), which spreads correct answers
 * across A to D and applies the shared typography.
 */

import type { Difficulty, Question } from "../types";
import { q, type Draft } from "./act";

const make =
  (subjectId: Draft["subjectId"]) =>
  (
    id: string,
    domainId: string,
    skillId: string,
    difficulty: Difficulty,
    stimulus: string | undefined,
    prompt: string,
    choices: Draft["choices"],
    answer: Draft["answer"],
    explanation: string,
  ) =>
    q({ id, testId: "clt", subjectId, domainId, skillId, difficulty, stimulus, prompt, choices, answer, explanation });

const V = make("verbal");
const G = make("grammar");
const Q = make("quant");

/* ------------------------------------------------------------------ */
/* Verbal Reasoning                                                   */
/* ------------------------------------------------------------------ */

const GETTYSBURG =
  "**Historical Document: Abraham Lincoln, the Gettysburg Address (1863)**\n\n" +
  "Four score and seven years ago our fathers brought forth on this continent, a new nation, conceived in Liberty, and dedicated to the proposition that all men are created equal.\n\n" +
  "Now we are engaged in a great civil war, testing whether that nation, or any nation so conceived and so dedicated, can long endure. We are met on a great battle-field of that war. We have come to dedicate a portion of that field, as a final resting place for those who here gave their lives that that nation might live. It is altogether fitting and proper that we should do this.\n\n" +
  "But, in a larger sense, we can not dedicate -- we can not consecrate -- we can not hallow -- this ground. The brave men, living and dead, who struggled here, have consecrated it, far above our poor power to add or detract. The world will little note, nor long remember what we say here, but it can never forget what they did here. It is for us the living, rather, to be dedicated here to the unfinished work which they who fought here have thus far so nobly advanced. It is rather for us to be here dedicated to the great task remaining before us -- that from these honored dead we take increased devotion to that cause for which they gave the last full measure of devotion -- that we here highly resolve that these dead shall not have died in vain -- that this nation, under God, shall have a new birth of freedom -- and that government of the people, by the people, for the people, shall not perish from the earth.";

const AUSTEN =
  "**Literature: Jane Austen, Pride and Prejudice (1813), opening**\n\n" +
  "It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.\n\n" +
  "However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families, that he is considered as the rightful property of some one or other of their daughters.";

const REDI =
  "**Natural Science: original passage**\n\n" +
  "In the seventeenth century, many naturalists held that maggots arose on their own from rotting meat. In 1668 the Italian physician Francesco Redi published an account of experiments that tested the idea. He placed meat in a set of jars, leaving some open and sealing others. Maggots appeared on the meat in the open jars, where flies could land, but not on the meat in the sealed jars.\n\n" +
  "Redi's critics objected that sealing the jars had shut out the fresh air that life requires. So he covered further jars with a fine gauze that let air in but kept flies out. No maggots appeared on the meat beneath the gauze, though flies gathered on the gauze and laid eggs on it. The gauze jars were his reply.";

const DECLARATION_PAIR =
  "**Text 1** (Declaration of Independence, 1776)\nWe hold these truths to be self-evident, that all men are created equal, that they are endowed by their Creator with certain unalienable Rights, that among these are Life, Liberty and the pursuit of Happiness.\n\n" +
  "**Text 2** (Gettysburg Address, 1863)\nFour score and seven years ago our fathers brought forth on this continent, a new nation, conceived in Liberty, and dedicated to the proposition that all men are created equal.";

const VERBAL: Question[] = [
  V("cl-v-01", "clt-comprehension", "clt-main-idea", "medium", GETTYSBURG,
    "The central purpose of the address is to:",
    ["urge the listeners to honor the dead by committing themselves to the cause the dead fought for.", "describe the military events of the battle in detail.", "announce that the war has ended.", "argue that the battlefield should not be used as a cemetery."], "A",
    "The address moves from the nation's founding to the war to the dedication, and ends by resolving that the living take up the \"unfinished work\" of those who died."),
  V("cl-v-02", "clt-analysis", "clt-vocab", "hard", GETTYSBURG,
    "As it is used in the third paragraph, \"consecrate\" most nearly means:",
    ["make sacred.", "build upon.", "purchase.", "measure."], "A",
    "\"Consecrate\" sits between \"dedicate\" and \"hallow,\" both words for setting something apart as holy, and the soldiers are said to have done this by their sacrifice."),
  V("cl-v-03", "clt-analysis", "clt-purpose", "hard", GETTYSBURG,
    "Lincoln's statement that \"we can not dedicate ... this ground\" mainly serves to:",
    ["shift the emphasis from the ceremony to the soldiers' sacrifice and the duty of the living.", "admit that the ceremony was poorly planned.", "suggest that the ground belongs to the opposing army.", "argue that the cemetery should be moved elsewhere."], "A",
    "He says the dead have already consecrated the ground \"far above our poor power,\" and then turns to what the living must do instead."),
  V("cl-v-04", "clt-comprehension", "clt-detail", "medium", GETTYSBURG,
    "In the third paragraph, Lincoln contrasts:",
    ["what the speakers say with what the soldiers did.", "the Union army with the Confederate army.", "the nation's founding with a future war.", "the living soldiers with the dead soldiers."], "A",
    "\"The world will little note, nor long remember what we say here, but it can never forget what they did here.\""),
  V("cl-v-05", "clt-analysis", "clt-purpose", "medium", AUSTEN,
    "The tone of the first sentence is best described as:",
    ["ironic.", "mournful.", "furious.", "neutral and scientific."], "A",
    "It states a neighbourhood's matchmaking hopes as a solemn universal law. The gap between the grand phrasing and the gossip it describes is the irony."),
  V("cl-v-06", "clt-synthesis", "clt-inference", "hard", AUSTEN,
    "The passage suggests that the \"truth\" described in the first sentence is held most firmly by:",
    ["the neighbouring families who hope to marry a daughter to such a man.", "the wealthy single man himself.", "the narrator alone.", "every person everywhere, without exception."], "A",
    "The second sentence says the truth is \"so well fixed in the minds of the surrounding families,\" whatever the man's own views may be."),
  V("cl-v-07", "clt-comprehension", "clt-detail", "easy", AUSTEN,
    "According to the passage, the feelings or views of such a man, when he first enters a neighbourhood, are:",
    ["possibly little known to the families there.", "openly shared with his neighbours.", "firmly opposed to marriage.", "the subject of careful study by the families."], "A",
    "\"However little known the feelings or views of such a man may be\" -- the families decide about him without knowing his mind."),
  V("cl-v-08", "clt-analysis", "clt-vocab", "medium", AUSTEN,
    "As used in the passage, calling the man \"the rightful property\" of the families' daughters suggests that the families regard him as:",
    ["a prize one of their daughters is entitled to win.", "a landowner with legal claims on them.", "a guest who must be welcomed.", "a burden on the neighbourhood."], "A",
    "\"Rightful property\" treats him as something owed to one of the daughters, which is the joke: the man with the fortune is the one being claimed."),
  V("cl-v-09", "clt-comprehension", "clt-main-idea", "medium", REDI,
    "The passage is mainly concerned with:",
    ["how a series of experiments challenged the idea that maggots arise from meat.", "the life cycle of the housefly.", "why meat spoils faster in open air.", "a dispute about the use of gauze in medicine."], "A",
    "Both paragraphs follow Redi's jars: the first test, the objection, and the gauze test that answered it."),
  V("cl-v-10", "clt-synthesis", "clt-inference", "hard", REDI,
    "The gauze-covered jars answered the critics' objection because they:",
    ["let air reach the meat while still keeping flies off it.", "kept both air and flies away from the meat.", "allowed flies to reach the meat directly.", "were sealed more tightly than the other jars."], "A",
    "The critics blamed the lack of air. Gauze let air in, so if maggots still did not appear, air could not be the reason."),
  V("cl-v-11", "clt-analysis", "clt-purpose", "medium", REDI,
    "The final sentence, \"The gauze jars were his reply,\" mainly serves to:",
    ["show how one part of the experiment addressed a specific objection.", "introduce a new, unrelated experiment.", "suggest that Redi abandoned his conclusion.", "describe what gauze is made of."], "A",
    "It ties the gauze test back to the critics' objection about air in the sentence before."),
  V("cl-v-12", "clt-comprehension", "clt-detail", "easy", REDI,
    "According to the passage, where did flies lay eggs in the gauze-covered jars?",
    ["On the gauze itself", "On the meat", "Inside the sealed jars", "Nowhere at all"], "A",
    "The passage says flies \"gathered on the gauze and laid eggs on it.\""),
  V("cl-v-13", "clt-synthesis", "clt-paired", "medium", DECLARATION_PAIR,
    "Both texts present human equality as:",
    ["a founding principle on which the nation rests.", "an idea that had not yet been proposed.", "a goal that could never be achieved.", "a matter of economic policy."], "A",
    "Text 1 calls it a self-evident truth; Text 2, written 87 years later (\"four score and seven\"), names it as the proposition the nation was dedicated to at its founding."),
];

/* ------------------------------------------------------------------ */
/* Grammar/Writing                                                    */
/* ------------------------------------------------------------------ */

const CORRECT = "Which choice is correct?";

const GRAMMAR: Question[] = [
  G("cl-g-01", "clt-conventions", "clt-agreement", "easy",
    "The list of required books [u]are[/u] posted on the classroom door.",
    CORRECT, ["NO CHANGE", "is", "were", "have been"], "B",
    "The subject is \"list,\" which is singular; \"of required books\" does not change that. A singular subject takes \"is.\""),
  G("cl-g-02", "clt-conventions", "clt-agreement", "medium",
    "Every one of the ships in the harbor [u]have[/u] lowered its sails.",
    CORRECT, ["NO CHANGE", "has", "are having", "were"], "B",
    "\"Every one\" is singular, as the pronoun \"its\" later in the sentence confirms, so the verb is \"has.\""),
  G("cl-g-03", "clt-conventions", "clt-agreement", "hard",
    "By the time the rain began, the farmers [u]harvest[/u] most of the wheat.",
    CORRECT, ["NO CHANGE", "had harvested", "have harvested", "will harvest"], "B",
    "The harvesting was finished before another past event (the rain began), which calls for the past perfect, \"had harvested.\""),
  G("cl-g-04", "clt-conventions", "clt-punctuation", "easy",
    "Aristotle taught [u]Alexander, the future king of Macedon when[/u] the prince was a boy.",
    CORRECT, ["NO CHANGE", "Alexander, the future king of Macedon, when", "Alexander the future king of Macedon, when", "Alexander; the future king of Macedon when"], "B",
    "\"The future king of Macedon\" renames Alexander and is set off by a pair of commas: one before it and one after."),
  G("cl-g-05", "clt-conventions", "clt-punctuation", "medium",
    "The library holds three rare [u]manuscripts; a Latin psalter, a book of hours, and a map of Rome.[/u]",
    CORRECT, ["NO CHANGE", "manuscripts: a Latin psalter, a book of hours, and a map of Rome.", "manuscripts, a Latin psalter; a book of hours; and a map of Rome.", "manuscripts a Latin psalter, a book of hours, and a map of Rome."], "B",
    "A colon introduces a list after a complete clause. A semicolon needs a full clause on both sides, and the list is not one."),
  G("cl-g-06", "clt-conventions", "clt-punctuation", "medium",
    "[u]Its[/u] a long walk from the village to the abbey, but the path is well kept.",
    CORRECT, ["NO CHANGE", "It's", "Its'", "It is'"], "B",
    "The sentence means \"It is a long walk,\" and the contraction of \"it is\" is \"it's.\" \"Its\" is the possessive."),
  G("cl-g-07", "clt-conventions", "clt-sentences", "medium",
    "The cathedral took two centuries to [u]build, the workers who began it[/u] never saw it finished.",
    CORRECT, ["NO CHANGE", "build; the workers who began it", "build the workers who began it", "build, and, the workers who began it"], "B",
    "Two independent clauses joined by only a comma make a comma splice. A semicolon joins them correctly."),
  G("cl-g-08", "clt-conventions", "clt-sentences", "hard",
    "[u]Having read the letter twice, the meaning was finally clear to Elena.[/u]",
    CORRECT, ["NO CHANGE", "Having read the letter twice, Elena finally understood its meaning.", "The meaning, having read the letter twice, was finally clear to Elena.", "Having read the letter twice, and the meaning was finally clear to Elena."], "B",
    "The opening phrase describes whoever read the letter, so Elena must come right after it. Otherwise the meaning is doing the reading."),
  G("cl-g-09", "clt-rhetoric", "clt-concision", "easy",
    "The poet [u]returned back[/u] to her childhood home each summer.",
    CORRECT, ["NO CHANGE", "returned", "returned back again", "went and returned"], "B",
    "\"Returned\" already means \"went back,\" so \"back\" repeats it."),
  G("cl-g-10", "clt-rhetoric", "clt-concision", "medium",
    "The council reached a decision [u]that was final and could not be changed or reversed.[/u]",
    CORRECT, ["NO CHANGE", "that was final.", "that was final and also unchangeable.", "that was final, not able to be changed."], "B",
    "A final decision is one that cannot be changed; everything after \"final\" says it again."),
  G("cl-g-11", "clt-rhetoric", "clt-organization", "medium",
    "Socrates wrote nothing himself. [u]Therefore,[/u] we know his ideas mainly through the dialogues of his student Plato.",
    CORRECT, ["NO CHANGE", "However,", "For example,", "Similarly,"], "A",
    "Because Socrates left no writing, we must rely on Plato: the second sentence is a consequence of the first, so \"Therefore\" is right as written."),
  G("cl-g-12", "clt-rhetoric", "clt-organization", "hard",
    "The river once flooded the valley every spring. [u]In addition,[/u] after the dam was built in 1932, the floods stopped.",
    CORRECT, ["NO CHANGE", "However,", "For instance,", "Likewise,"], "B",
    "The second sentence reverses the first (floods every spring, then no floods), which calls for a contrast."),
  G("cl-g-13", "clt-rhetoric", "clt-support", "medium",
    "A student is writing a paragraph arguing that the town's old mill should be preserved as a museum.",
    "Which sentence would best support the student's argument?",
    ["The mill is one of the last working examples of the water-powered machinery that built the town's economy.", "The mill was painted red in 1950.", "Many towns once had mills.", "The mill's last owner moved away in 1980."], "A",
    "An argument for a museum needs a reason the mill is worth preserving. Only its historical significance gives one."),
  G("cl-g-14", "clt-rhetoric", "clt-support", "hard",
    "The observatory's new telescope can detect galaxies too faint for the old one to see. [u]Its mirror was polished for eleven months.[/u] Astronomers expect it to double the number of known galaxies in the region.",
    "The writer is considering deleting the underlined sentence. Should the writer make this deletion?",
    ["Yes, because it is a detail about construction that interrupts the paragraph's focus on what the telescope can discover.", "No, because it explains why astronomers expect more discoveries.", "No, because it introduces the paragraph's main idea.", "Yes, because it contradicts the first sentence."], "A",
    "The sentences before and after are about what the telescope will find. How long the mirror took to polish breaks that line."),
];

/* ------------------------------------------------------------------ */
/* Quantitative Reasoning (no calculator)                             */
/* ------------------------------------------------------------------ */

const QUANT: Question[] = [
  Q("cl-q-01", "clt-algebra", "clt-linear", "easy", undefined,
    "If 3(x + 2) = 21, what is the value of x?",
    ["3", "5", "7", "9"], "B",
    "Divide both sides by 3: x + 2 = 7, so x = 5."),
  Q("cl-q-02", "clt-algebra", "clt-linear", "medium", "2x + y = 11\nx - y = 1",
    "What is the value of y in the solution to the system above?",
    ["1", "2", "3", "4"], "C",
    "Add the equations: 3x = 12, so x = 4. Then 4 - y = 1, so y = 3."),
  Q("cl-q-03", "clt-algebra", "clt-linear", "hard", undefined,
    "A line passes through the points (0, 5) and (4, -3). At what value of x does the line cross the x-axis?",
    ["2.5", "3", "4", "5"], "A",
    "The slope is (-3 - 5)/(4 - 0) = -2, so y = -2x + 5. Setting y = 0 gives x = 2.5."),
  Q("cl-q-04", "clt-algebra", "clt-nonlinear", "medium", undefined,
    "If x^2 = 3x + 10 and x > 0, what is the value of x?",
    ["2", "5", "7", "10"], "B",
    "Rearrange: x^2 - 3x - 10 = 0, which factors as (x - 5)(x + 2) = 0. The positive solution is 5."),
  Q("cl-q-05", "clt-algebra", "clt-nonlinear", "hard", undefined,
    "If 2^{x + 1} = 32, what is the value of x?",
    ["1", "2", "3", "4"], "D",
    "32 = 2^{5}, so x + 1 = 5 and x = 4."),
  Q("cl-q-06", "clt-geometry", "clt-geo", "easy", undefined,
    "Two angles of a triangle measure 35{deg} and 85{deg}. What is the measure of the third angle?",
    ["45{deg}", "55{deg}", "60{deg}", "95{deg}"], "C",
    "The angles of a triangle sum to 180{deg}: 180 - 35 - 85 = 60."),
  Q("cl-q-07", "clt-geometry", "clt-geo", "medium", undefined,
    "What is the distance between the points (1, 2) and (4, 6)?",
    ["5", "6", "7", "25"], "A",
    "The horizontal change is 3 and the vertical change is 4, so the distance is {sqrt}(9 + 16) = {sqrt}25 = 5."),
  Q("cl-q-08", "clt-geometry", "clt-geo", "hard", undefined,
    "A circle is inscribed in a square with side length 10. What is the area of the region inside the square but outside the circle?",
    ["100 - 25{pi}", "100 - 10{pi}", "100 - 5{pi}", "100{pi} - 100"], "A",
    "The square's area is 100. The circle's diameter is 10, so its radius is 5 and its area is 25{pi}. The difference is 100 - 25{pi}."),
  Q("cl-q-09", "clt-geometry", "clt-trig", "medium", undefined,
    "In a right triangle, cos A = 3/5 for an acute angle A. What is sin A?",
    ["3/5", "4/5", "4/3", "5/3"], "B",
    "With adjacent side 3 and hypotenuse 5, the opposite side is 4 (a 3-4-5 triangle), so sin A = 4/5."),
  Q("cl-q-10", "clt-geometry", "clt-trig", "hard", undefined,
    "What is the value of sin^2(40{deg}) + cos^2(40{deg}) ?",
    ["0", "1/2", "1", "2"], "C",
    "For any angle, sin^2 + cos^2 = 1. No calculation of sin 40{deg} is needed."),
  Q("cl-q-11", "clt-data", "clt-stats", "easy", undefined,
    "The mean of the three numbers 4, 8 and x is 7. What is the value of x?",
    ["9", "10", "11", "12"], "A",
    "The three numbers total 3 {times} 7 = 21, and 4 + 8 = 12, so x = 9."),
  Q("cl-q-12", "clt-data", "clt-stats", "medium", "2, 4, 6, 8, 10",
    "Which change to the data set above would increase the mean but leave the median unchanged?",
    ["Replace 10 with 20.", "Replace 6 with 9.", "Replace 10 with 4.", "Remove 10."], "A",
    "Raising the largest value raises the mean and leaves the middle value, 6, where it is. Replacing 6 with 9 moves the median to 8; the other two lower the mean."),
  Q("cl-q-13", "clt-data", "clt-prob", "medium", undefined,
    "How many different three-letter arrangements can be made from the letters A, B, C and D if no letter is used more than once?",
    ["4", "12", "24", "64"], "C",
    "4 choices for the first letter, 3 for the second and 2 for the third: 4 {times} 3 {times} 2 = 24."),
  Q("cl-q-14", "clt-data", "clt-prob", "hard", undefined,
    "A fair coin is flipped 4 times. What is the probability of getting at least one head?",
    ["1/16", "1/2", "3/4", "15/16"], "D",
    "The only way to get no heads is four tails, with probability (1/2)^{4} = 1/16. So at least one head has probability 1 - 1/16 = 15/16."),
  Q("cl-q-15", "clt-logic", "clt-number", "easy", undefined,
    "What is the least common multiple of 6 and 8?",
    ["12", "24", "36", "48"], "B",
    "Multiples of 8 are 8, 16, 24, ...; 24 is the first that is also a multiple of 6."),
  Q("cl-q-16", "clt-logic", "clt-number", "hard", undefined,
    "What is the remainder when 2^{10} is divided by 7?",
    ["0", "1", "2", "3"], "C",
    "Powers of 2 leave remainders 2, 4, 1 on division by 7, repeating every three. 10 = 3 {times} 3 + 1, so 2^{10} leaves the same remainder as 2^{1}: 2. (Check: 1,024 = 7 {times} 146 + 2.)"),
  Q("cl-q-17", "clt-logic", "clt-reasoning", "medium", undefined,
    "All the violinists in an orchestra can read music. Marta plays in the orchestra and cannot read music. Which statement must be true?",
    ["Marta is not a violinist.", "Marta is a violinist.", "No one in the orchestra can read music.", "Some violinists cannot read music."], "A",
    "If Marta were a violinist she could read music. She cannot, so she is not a violinist."),
  Q("cl-q-18", "clt-logic", "clt-reasoning", "hard", undefined,
    "Consider the statement \"If it rains, the game is cancelled.\" Which statement must also be true?",
    ["If the game is not cancelled, it did not rain.", "If the game is cancelled, it rained.", "If it does not rain, the game is not cancelled.", "The game is cancelled only when it rains."], "A",
    "A statement is equivalent to its contrapositive: \"if not cancelled, then no rain.\" The others reverse or negate it, which does not follow; the game could be cancelled for another reason."),
];

export const CLT_QUESTIONS: Question[] = [...VERBAL, ...GRAMMAR, ...QUANT];
