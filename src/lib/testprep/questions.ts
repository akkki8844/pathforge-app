/**
 * The SAT practice bank.
 *
 * Every item here was written for Pathforge. None of it is College Board
 * material, and nothing in the interface may describe it as such — the
 * `source` field on each question is what the UI reads, and it is `pathforge`
 * throughout. Items are written to the published digital-SAT specification
 * (the domains and skills in `blueprints.ts`) so practice maps onto the real
 * reporting categories, which is a different thing from reproducing the test.
 *
 * Official or licensed content, if it is ever connected, loads into this same
 * array shape with `source: "official"` and is labelled accordingly. That is
 * the whole reason the field exists rather than being assumed.
 *
 * Reading & Writing passages are original compositions. They are deliberately
 * short — the digital SAT's are too — and are about invented studies and
 * invented people, so nothing here can be mistaken for a real citation.
 */

import type { Question } from "./types";

const P = "pathforge" as const;

export const SAT_QUESTIONS: Question[] = [
  /* ---------------------------------------------------------------- */
  /* Math · Algebra                                                    */
  /* ---------------------------------------------------------------- */
  {
    id: "m-alg-01",
    testId: "sat",
    subjectId: "math",
    domainId: "algebra",
    skillId: "linear-eq-1var",
    difficulty: "easy",
    source: P,
    prompt: "If 3(x − 4) = 2x + 5, what is the value of x?",
    choices: [
      { id: "A", text: "7" },
      { id: "B", text: "11" },
      { id: "C", text: "17" },
      { id: "D", text: "21" },
    ],
    answer: "C",
    explanation:
      "Distribute: 3x − 12 = 2x + 5. Subtract 2x from both sides: x − 12 = 5. Add 12: x = 17.",
  },
  {
    id: "m-alg-02",
    testId: "sat",
    subjectId: "math",
    domainId: "algebra",
    skillId: "linear-eq-1var",
    difficulty: "medium",
    source: P,
    prompt: "If (2x + 1)/5 − (x − 3)/2 = 1, what is the value of x?",
    choices: [
      { id: "A", text: "−7" },
      { id: "B", text: "3" },
      { id: "C", text: "7" },
      { id: "D", text: "17" },
    ],
    answer: "C",
    explanation:
      "Multiply every term by 10: 2(2x + 1) − 5(x − 3) = 10, so 4x + 2 − 5x + 15 = 10. Combine: −x + 17 = 10, so x = 7.",
  },
  {
    id: "m-alg-03",
    testId: "sat",
    subjectId: "math",
    domainId: "algebra",
    skillId: "linear-functions",
    difficulty: "easy",
    source: P,
    prompt: "The function f is defined by f(x) = −2x + 9. What is the value of f(4)?",
    choices: [
      { id: "A", text: "−1" },
      { id: "B", text: "1" },
      { id: "C", text: "5" },
      { id: "D", text: "17" },
    ],
    answer: "B",
    explanation: "Substitute 4 for x: f(4) = −2(4) + 9 = −8 + 9 = 1.",
  },
  {
    id: "m-alg-04",
    testId: "sat",
    subjectId: "math",
    domainId: "algebra",
    skillId: "linear-functions",
    difficulty: "medium",
    source: P,
    prompt:
      "A line in the xy-plane passes through (−2, 5) and (4, −7). What is the y-coordinate of its y-intercept?",
    choices: [
      { id: "A", text: "−3" },
      { id: "B", text: "1" },
      { id: "C", text: "3" },
      { id: "D", text: "9" },
    ],
    answer: "B",
    explanation:
      "Slope = (−7 − 5)/(4 − (−2)) = −12/6 = −2. Using y = −2x + b with (−2, 5): 5 = 4 + b, so b = 1.",
  },
  {
    id: "m-alg-05",
    testId: "sat",
    subjectId: "math",
    domainId: "algebra",
    skillId: "linear-eq-2var",
    difficulty: "medium",
    source: P,
    prompt:
      "A caterer charges a fixed fee of $240 plus $18 per guest. If the total charge was $1,500, how many guests were there?",
    choices: [
      { id: "A", text: "60" },
      { id: "B", text: "65" },
      { id: "C", text: "70" },
      { id: "D", text: "84" },
    ],
    answer: "C",
    explanation:
      "240 + 18g = 1500, so 18g = 1260 and g = 70. The fixed fee is subtracted before dividing, not after.",
  },
  {
    id: "m-alg-06",
    testId: "sat",
    subjectId: "math",
    domainId: "algebra",
    skillId: "linear-eq-2var",
    difficulty: "easy",
    source: P,
    prompt: "What is the x-coordinate of the x-intercept of the line 4x − 5y = 20?",
    choices: [
      { id: "A", text: "−4" },
      { id: "B", text: "4" },
      { id: "C", text: "5" },
      { id: "D", text: "20" },
    ],
    answer: "C",
    explanation: "At the x-intercept y = 0, so 4x = 20 and x = 5.",
  },
  {
    id: "m-alg-07",
    testId: "sat",
    subjectId: "math",
    domainId: "algebra",
    skillId: "systems-linear",
    difficulty: "medium",
    source: P,
    prompt: "If 3x + 2y = 19 and x − 2y = −3, what is the value of x?",
    choices: [
      { id: "A", text: "2" },
      { id: "B", text: "3" },
      { id: "C", text: "4" },
      { id: "D", text: "5" },
    ],
    answer: "C",
    explanation:
      "Adding the equations eliminates y: 4x = 16, so x = 4. (Then y = 3.5, but the question asks only for x.)",
  },
  {
    id: "m-alg-08",
    testId: "sat",
    subjectId: "math",
    domainId: "algebra",
    skillId: "systems-linear",
    difficulty: "hard",
    source: P,
    prompt:
      "For what value of c does the system 2x + cy = 8 and 6x + 9y = 24 have infinitely many solutions?",
    choices: [
      { id: "A", text: "1/3" },
      { id: "B", text: "3" },
      { id: "C", text: "9" },
      { id: "D", text: "12" },
    ],
    answer: "B",
    explanation:
      "Infinitely many solutions means the equations are multiples of each other. The second equation is 3 times the first when 3(2x + cy) = 6x + 3cy equals 6x + 9y, so 3c = 9 and c = 3.",
  },
  {
    id: "m-alg-09",
    testId: "sat",
    subjectId: "math",
    domainId: "algebra",
    skillId: "linear-inequalities",
    difficulty: "medium",
    source: P,
    prompt: "Which of the following describes all solutions to 5 − 3x ≥ 14?",
    choices: [
      { id: "A", text: "x ≥ −3" },
      { id: "B", text: "x ≤ 3" },
      { id: "C", text: "x ≥ 3" },
      { id: "D", text: "x ≤ −3" },
    ],
    answer: "D",
    explanation:
      "Subtract 5: −3x ≥ 9. Dividing by a negative reverses the inequality: x ≤ −3.",
  },
  {
    id: "m-alg-10",
    testId: "sat",
    subjectId: "math",
    domainId: "algebra",
    skillId: "linear-inequalities",
    difficulty: "hard",
    source: P,
    prompt:
      "A vending machine holds at most 240 items, stocked with s snacks and d drinks. The operator requires at least twice as many snacks as drinks. What is the greatest possible number of drinks?",
    answer: "80",
    explanation:
      "s ≥ 2d and s + d ≤ 240. Substituting the smallest allowed s gives 2d + d ≤ 240, so 3d ≤ 240 and d ≤ 80.",
  },

  /* ---------------------------------------------------------------- */
  /* Math · Advanced Math                                              */
  /* ---------------------------------------------------------------- */
  {
    id: "m-adv-01",
    testId: "sat",
    subjectId: "math",
    domainId: "advanced-math",
    skillId: "quadratics",
    difficulty: "medium",
    source: P,
    prompt: "What is the greater solution to x² − 6x − 16 = 0?",
    choices: [
      { id: "A", text: "−2" },
      { id: "B", text: "2" },
      { id: "C", text: "6" },
      { id: "D", text: "8" },
    ],
    answer: "D",
    explanation:
      "Factor: (x − 8)(x + 2) = 0, so x = 8 or x = −2. The greater solution is 8.",
  },
  {
    id: "m-adv-02",
    testId: "sat",
    subjectId: "math",
    domainId: "advanced-math",
    skillId: "quadratics",
    difficulty: "hard",
    source: P,
    prompt:
      "The equation x² + kx + 36 = 0 has exactly one real solution, and k is positive. What is the value of k?",
    answer: "12",
    explanation:
      "One real solution means the discriminant is zero: k² − 4(1)(36) = 0, so k² = 144 and k = 12 for positive k.",
  },
  {
    id: "m-adv-03",
    testId: "sat",
    subjectId: "math",
    domainId: "advanced-math",
    skillId: "quadratics",
    difficulty: "medium",
    source: P,
    prompt: "What is the vertex of the parabola y = 2x² − 12x + 7?",
    choices: [
      { id: "A", text: "(3, −11)" },
      { id: "B", text: "(−3, 61)" },
      { id: "C", text: "(6, 7)" },
      { id: "D", text: "(3, 11)" },
    ],
    answer: "A",
    explanation:
      "The axis of symmetry is x = −b/(2a) = 12/4 = 3. Then y = 2(9) − 12(3) + 7 = 18 − 36 + 7 = −11.",
  },
  {
    id: "m-adv-04",
    testId: "sat",
    subjectId: "math",
    domainId: "advanced-math",
    skillId: "equivalent-expressions",
    difficulty: "medium",
    source: P,
    prompt: "Which expression is equivalent to (3x² − 5x + 2) − (x² − 5x − 7)?",
    choices: [
      { id: "A", text: "2x² − 10x + 9" },
      { id: "B", text: "2x² + 9" },
      { id: "C", text: "2x² − 5" },
      { id: "D", text: "4x² + 9" },
    ],
    answer: "B",
    explanation:
      "Subtracting distributes across every term: 3x² − x² = 2x², −5x − (−5x) = 0, and 2 − (−7) = 9.",
  },
  {
    id: "m-adv-05",
    testId: "sat",
    subjectId: "math",
    domainId: "advanced-math",
    skillId: "equivalent-expressions",
    difficulty: "hard",
    source: P,
    prompt: "For x ≠ 3 and x ≠ −4, which expression is equivalent to (x² − 9)/(x² + x − 12)?",
    choices: [
      { id: "A", text: "9/12" },
      { id: "B", text: "(x − 3)/(x + 4)" },
      { id: "C", text: "(x + 3)/(x − 4)" },
      { id: "D", text: "(x + 3)/(x + 4)" },
    ],
    answer: "D",
    explanation:
      "Factor both: (x − 3)(x + 3) over (x + 4)(x − 3). The (x − 3) cancels, leaving (x + 3)/(x + 4).",
  },
  {
    id: "m-adv-06",
    testId: "sat",
    subjectId: "math",
    domainId: "advanced-math",
    skillId: "exponential",
    difficulty: "medium",
    source: P,
    prompt:
      "A sample's mass halves every 6 years. If it is 800 grams today, what will its mass be in 18 years?",
    choices: [
      { id: "A", text: "50 grams" },
      { id: "B", text: "100 grams" },
      { id: "C", text: "200 grams" },
      { id: "D", text: "400 grams" },
    ],
    answer: "B",
    explanation:
      "18 years is three halvings: 800 → 400 → 200 → 100. Halving is repeated multiplication by 1/2, not repeated subtraction.",
  },
  {
    id: "m-adv-07",
    testId: "sat",
    subjectId: "math",
    domainId: "advanced-math",
    skillId: "exponential",
    difficulty: "medium",
    source: P,
    prompt:
      "A town's population is modelled by P(t) = 1,200(1.04)ᵗ, where t is years since 2020. What does 1.04 represent?",
    choices: [
      { id: "A", text: "The population grows by 104 people each year." },
      { id: "B", text: "The population was 1.04 times its 2019 size." },
      { id: "C", text: "The population grows by 4 people each year." },
      { id: "D", text: "The population grows by 4% each year." },
    ],
    answer: "D",
    explanation:
      "In an exponential model the base is the growth factor. A factor of 1.04 is an increase of 0.04, or 4%, per year — a percentage, not a fixed number of people.",
  },
  {
    id: "m-adv-08",
    testId: "sat",
    subjectId: "math",
    domainId: "advanced-math",
    skillId: "nonlinear-functions",
    difficulty: "hard",
    source: P,
    prompt: "If f(x) = (x − 2)(x + 5), for which values of x is f(x) < 0?",
    choices: [
      { id: "A", text: "x < −5 or x > 2" },
      { id: "B", text: "x < 2" },
      { id: "C", text: "−2 < x < 5" },
      { id: "D", text: "−5 < x < 2" },
    ],
    answer: "D",
    explanation:
      "The parabola opens upward with roots at −5 and 2, so it is below the x-axis strictly between them.",
  },
  {
    id: "m-adv-09",
    testId: "sat",
    subjectId: "math",
    domainId: "advanced-math",
    skillId: "nonlinear-functions",
    difficulty: "medium",
    source: P,
    prompt: "If g(x) = x³ − 4x, what is the value of g(−2)?",
    choices: [
      { id: "A", text: "−16" },
      { id: "B", text: "0" },
      { id: "C", text: "4" },
      { id: "D", text: "16" },
    ],
    answer: "B",
    explanation: "g(−2) = (−2)³ − 4(−2) = −8 + 8 = 0.",
  },

  /* ---------------------------------------------------------------- */
  /* Math · Problem-Solving & Data Analysis                            */
  /* ---------------------------------------------------------------- */
  {
    id: "m-psd-01",
    testId: "sat",
    subjectId: "math",
    domainId: "problem-solving",
    skillId: "ratios-rates",
    difficulty: "easy",
    source: P,
    prompt:
      "Three identical printers together produce 1,200 pages in 4 minutes. At this rate, how many pages does one printer produce per minute?",
    choices: [
      { id: "A", text: "75" },
      { id: "B", text: "100" },
      { id: "C", text: "300" },
      { id: "D", text: "400" },
    ],
    answer: "B",
    explanation:
      "All three produce 1,200/4 = 300 pages per minute, so one produces 300/3 = 100.",
  },
  {
    id: "m-psd-02",
    testId: "sat",
    subjectId: "math",
    domainId: "problem-solving",
    skillId: "ratios-rates",
    difficulty: "medium",
    source: P,
    prompt:
      "A map uses a scale of 1 cm to 12 km. Two towns are 4.5 cm apart on the map. How many kilometres apart are they?",
    choices: [
      { id: "A", text: "16.5" },
      { id: "B", text: "48" },
      { id: "C", text: "54" },
      { id: "D", text: "60" },
    ],
    answer: "C",
    explanation:
      "The scale gives 12 km per centimetre, so 4.5 cm × 12 km/cm = 54 km.",
  },
  {
    id: "m-psd-03",
    testId: "sat",
    subjectId: "math",
    domainId: "problem-solving",
    skillId: "percentages",
    difficulty: "medium",
    source: P,
    prompt:
      "A jacket's price is reduced by 20%, and the reduced price is then reduced by a further 15%. What is the overall percent decrease from the original price?",
    choices: [
      { id: "A", text: "30%" },
      { id: "B", text: "32%" },
      { id: "C", text: "35%" },
      { id: "D", text: "68%" },
    ],
    answer: "B",
    explanation:
      "Successive discounts multiply: 0.80 × 0.85 = 0.68, so 68% of the original remains and the decrease is 32%. Percentages of different bases cannot simply be added.",
  },
  {
    id: "m-psd-04",
    testId: "sat",
    subjectId: "math",
    domainId: "problem-solving",
    skillId: "percentages",
    difficulty: "medium",
    source: P,
    prompt:
      "After a 25% increase, a quantity is 450. What was the quantity before the increase?",
    answer: "360",
    explanation:
      "1.25x = 450, so x = 360. Taking 25% off 450 gives 337.5, which is the common error — the increase was applied to the smaller original, not to 450.",
  },
  {
    id: "m-psd-05",
    testId: "sat",
    subjectId: "math",
    domainId: "problem-solving",
    skillId: "data-distributions",
    difficulty: "medium",
    source: P,
    prompt: "What is the median of the data set 4, 7, 7, 9, 13, 20?",
    choices: [
      { id: "A", text: "7" },
      { id: "B", text: "8" },
      { id: "C", text: "9" },
      { id: "D", text: "10" },
    ],
    answer: "B",
    explanation:
      "With six values the median is the mean of the third and fourth: (7 + 9)/2 = 8.",
  },
  {
    id: "m-psd-06",
    testId: "sat",
    subjectId: "math",
    domainId: "problem-solving",
    skillId: "data-distributions",
    difficulty: "hard",
    source: P,
    prompt:
      "A data set of 30 house prices has a mean of $310,000 and a median of $295,000. One further house, priced at $2.4 million, is added. Which statement is true?",
    choices: [
      { id: "A", text: "Neither changes." },
      { id: "B", text: "The median increases more than the mean does." },
      { id: "C", text: "Both increase by the same amount." },
      { id: "D", text: "The mean increases more than the median does." },
    ],
    answer: "D",
    explanation:
      "The mean uses every value, so an extreme outlier pulls it sharply. The median only shifts to the next ordered value, so it barely moves.",
  },
  {
    id: "m-psd-07",
    testId: "sat",
    subjectId: "math",
    domainId: "problem-solving",
    skillId: "probability",
    difficulty: "medium",
    source: P,
    prompt:
      "In a group of 40 students, 24 study Spanish, 18 study art, and 10 study both. If one student is chosen at random, what is the probability that the student studies neither subject?",
    choices: [
      { id: "A", text: "0.10" },
      { id: "B", text: "0.20" },
      { id: "C", text: "0.25" },
      { id: "D", text: "0.45" },
    ],
    answer: "B",
    explanation:
      "Students taking at least one subject: 24 + 18 − 10 = 32. So 8 take neither, and 8/40 = 0.20.",
  },
  {
    id: "m-psd-08",
    testId: "sat",
    subjectId: "math",
    domainId: "problem-solving",
    skillId: "inference",
    difficulty: "medium",
    source: P,
    prompt:
      "In a random sample of 200 residents from a town of 5,000, 46 own a bicycle. Which is the best estimate of the number of bicycle owners in the town?",
    choices: [
      { id: "A", text: "460" },
      { id: "B", text: "920" },
      { id: "C", text: "1,150" },
      { id: "D", text: "2,300" },
    ],
    answer: "C",
    explanation:
      "46/200 = 0.23, and 0.23 × 5,000 = 1,150.",
  },
  {
    id: "m-psd-09",
    testId: "sat",
    subjectId: "math",
    domainId: "problem-solving",
    skillId: "inference",
    difficulty: "hard",
    source: P,
    prompt:
      "A researcher surveyed people leaving a city gym and concluded that most residents exercise daily. Which change would most improve the reliability of that conclusion?",
    choices: [
      { id: "A", text: "Surveying more people at the same gym." },
      { id: "B", text: "Asking each person more questions." },
      { id: "C", text: "Surveying at several gyms rather than one." },
      { id: "D", text: "Surveying a random sample of all residents of the city." },
    ],
    answer: "D",
    explanation:
      "The sample is drawn from people already at a gym, so it cannot represent residents generally. Increasing the size of a biased sample does not remove the bias; only sampling randomly from the whole population does.",
  },

  /* ---------------------------------------------------------------- */
  /* Math · Geometry & Trigonometry                                    */
  /* ---------------------------------------------------------------- */
  {
    id: "m-geo-01",
    testId: "sat",
    subjectId: "math",
    domainId: "geometry-trig",
    skillId: "area-volume",
    difficulty: "easy",
    source: P,
    prompt: "What is the volume of a cylinder with radius 3 and height 10?",
    choices: [
      { id: "A", text: "30π" },
      { id: "B", text: "60π" },
      { id: "C", text: "90π" },
      { id: "D", text: "180π" },
    ],
    answer: "C",
    explanation: "V = πr²h = π(9)(10) = 90π.",
  },
  {
    id: "m-geo-02",
    testId: "sat",
    subjectId: "math",
    domainId: "geometry-trig",
    skillId: "area-volume",
    difficulty: "medium",
    source: P,
    prompt: "A cube has volume 216. What is its total surface area?",
    choices: [
      { id: "A", text: "36" },
      { id: "B", text: "96" },
      { id: "C", text: "216" },
      { id: "D", text: "1,296" },
    ],
    answer: "C",
    explanation:
      "The edge is ∛216 = 6, so each face is 36 and the six faces total 216. Volume and surface area coincide numerically for a cube of edge 6; that is a coincidence, not a rule.",
  },
  {
    id: "m-geo-03",
    testId: "sat",
    subjectId: "math",
    domainId: "geometry-trig",
    skillId: "lines-angles-triangles",
    difficulty: "medium",
    source: P,
    prompt:
      "The measures of a triangle's three angles are in the ratio 2 : 3 : 5. What is the measure, in degrees, of the largest angle?",
    choices: [
      { id: "A", text: "45" },
      { id: "B", text: "60" },
      { id: "C", text: "75" },
      { id: "D", text: "90" },
    ],
    answer: "D",
    explanation:
      "The parts total 10, and the angles total 180, so each part is 18°. The largest is 5 × 18 = 90°.",
  },
  {
    id: "m-geo-04",
    testId: "sat",
    subjectId: "math",
    domainId: "geometry-trig",
    skillId: "right-triangles-trig",
    difficulty: "medium",
    source: P,
    prompt:
      "In right triangle ABC, the right angle is at C and sin A = 3/5. What is cos B?",
    choices: [
      { id: "A", text: "3/5" },
      { id: "B", text: "4/5" },
      { id: "C", text: "5/3" },
      { id: "D", text: "3/4" },
    ],
    answer: "A",
    explanation:
      "A and B are complementary, and the sine of an angle equals the cosine of its complement. So cos B = sin A = 3/5.",
  },
  {
    id: "m-geo-05",
    testId: "sat",
    subjectId: "math",
    domainId: "geometry-trig",
    skillId: "right-triangles-trig",
    difficulty: "hard",
    source: P,
    prompt:
      "A right triangle has legs of length 9 and 12. What is the tangent of the angle opposite the leg of length 9?",
    answer: "0.75",
    acceptedAnswers: ["0.75", "3/4", ".75"],
    explanation:
      "Tangent is opposite over adjacent: 9/12 = 3/4 = 0.75. The hypotenuse of 15 is not needed.",
  },
  {
    id: "m-geo-06",
    testId: "sat",
    subjectId: "math",
    domainId: "geometry-trig",
    skillId: "circles",
    difficulty: "medium",
    source: P,
    prompt: "What is the radius of the circle x² + y² − 6x + 8y = 0?",
    choices: [
      { id: "A", text: "4" },
      { id: "B", text: "5" },
      { id: "C", text: "10" },
      { id: "D", text: "25" },
    ],
    answer: "B",
    explanation:
      "Complete the square: (x − 3)² + (y + 4)² = 9 + 16 = 25. The radius is √25 = 5.",
  },
  {
    id: "m-geo-07",
    testId: "sat",
    subjectId: "math",
    domainId: "geometry-trig",
    skillId: "circles",
    difficulty: "hard",
    source: P,
    prompt:
      "In a circle of radius 12, what is the length of an arc cut off by a central angle of 60°?",
    choices: [
      { id: "A", text: "2π" },
      { id: "B", text: "4π" },
      { id: "C", text: "12π" },
      { id: "D", text: "24π" },
    ],
    answer: "B",
    explanation:
      "60° is one sixth of the circle, and the circumference is 24π, so the arc is 24π/6 = 4π.",
  },

  /* ---------------------------------------------------------------- */
  /* Reading & Writing · Information & Ideas                           */
  /* ---------------------------------------------------------------- */
  {
    id: "r-inf-01",
    testId: "sat",
    subjectId: "rw",
    domainId: "information-ideas",
    skillId: "central-ideas",
    difficulty: "medium",
    source: P,
    stimulus:
      "When the ceramicist Nadia Oyelaran began firing her large vessels, she assumed the cracks that appeared during cooling were failures to be eliminated. She spent two years adjusting clay bodies and kiln schedules to prevent them. Eventually she reversed the question: rather than asking how to stop the cracks, she asked what determined where they formed. The answer — the thickness of the walls — gave her a way to place them deliberately, and the fissures became the defining feature of her work.",
    prompt: "Which choice best states the main idea of the text?",
    choices: [
      { id: "A", text: "Oyelaran's early vessels were technically flawed and were later discarded." },
      { id: "B", text: "Oyelaran turned a problem into a technique by studying what caused it rather than trying to remove it." },
      { id: "C", text: "Cracking in ceramics is caused primarily by uneven cooling in the kiln." },
      { id: "D", text: "Oyelaran's work is admired mainly for the size of her vessels." },
    ],
    answer: "B",
    explanation:
      "The passage turns on the moment she changes the question from how to prevent cracks to what governs them, which is what lets her control them. C states a fact the passage attributes to wall thickness, not cooling, and it is a detail rather than the main idea.",
  },
  {
    id: "r-inf-02",
    testId: "sat",
    subjectId: "rw",
    domainId: "information-ideas",
    skillId: "command-evidence",
    difficulty: "medium",
    source: P,
    stimulus:
      "A team studying urban swifts proposed that the birds choose nest sites by the acoustics of a cavity rather than by its visible size. To test this, they built pairs of identical boxes and lined half of them with sound-absorbing foam, leaving every visible dimension unchanged.",
    prompt:
      "Which finding, if true, would most strongly support the team's proposal?",
    choices: [
      { id: "A", text: "Swifts occupied boxes in the study at roughly the same rate as boxes elsewhere in the city." },
      { id: "B", text: "Foam-lined boxes were warmer than unlined boxes by about two degrees." },
      { id: "C", text: "Swifts preferred boxes mounted higher on the building, regardless of lining." },
      { id: "D", text: "Swifts occupied the unlined boxes far more often than the foam-lined ones." },
    ],
    answer: "D",
    explanation:
      "The boxes differ only in how they sound, so a strong preference between them isolates acoustics as the deciding factor. C introduces a different variable, and B suggests a competing explanation rather than supporting the proposal.",
  },
  {
    id: "r-inf-03",
    testId: "sat",
    subjectId: "rw",
    domainId: "information-ideas",
    skillId: "quantitative-evidence",
    difficulty: "medium",
    source: P,
    stimulus:
      "A survey of four neighbourhood libraries recorded weekday visits per hundred residents: Alder 6.2, Birch 9.8, Cedar 4.1, Dune 9.5. Two of the branches — Birch and Dune — had opened extended evening hours the previous year; Alder and Cedar had not.",
    prompt:
      "Which choice most effectively uses data from the survey to support the claim that extended evening hours are associated with higher use?",
    choices: [
      { id: "A", text: "Cedar recorded the fewest visits, at 4.1 per hundred residents." },
      { id: "B", text: "Birch recorded 9.8 visits per hundred residents, the highest of the four." },
      { id: "C", text: "The two branches with extended hours recorded 9.8 and 9.5 visits per hundred residents, while the two without recorded 6.2 and 4.1." },
      { id: "D", text: "Visits ranged from 4.1 to 9.8 visits per hundred residents across the four branches." },
    ],
    answer: "C",
    explanation:
      "Only C compares the two groups the claim is about. A and B cite a single branch, which cannot establish an association, and D describes the spread without connecting it to hours.",
  },
  {
    id: "r-inf-04",
    testId: "sat",
    subjectId: "rw",
    domainId: "information-ideas",
    skillId: "inferences",
    difficulty: "hard",
    source: P,
    stimulus:
      "Sediment cores from the lake show a layer of volcanic ash at a depth corresponding to roughly 4,200 years ago. Pollen from drought-tolerant grasses appears in every layer above the ash and in none below it. Researchers note that the ash layer itself is thin enough to have settled within a single season.",
    prompt:
      "Which choice most logically completes the text?",
    choices: [
      { id: "A", text: "the grasses were introduced to the region by human cultivation." },
      { id: "B", text: "the lake dried out completely soon after the eruption." },
      { id: "C", text: "the eruption was the largest recorded in the region's history." },
      { id: "D", text: "the shift toward drier conditions began no earlier than the eruption." },
    ],
    answer: "D",
    explanation:
      "The pollen appears only above the ash, and the ash settled quickly, so the drier-adapted vegetation cannot predate the eruption. The text gives no basis for claims about cultivation, eruption size or the lake drying.",
  },
  {
    id: "r-inf-05",
    testId: "sat",
    subjectId: "rw",
    domainId: "information-ideas",
    skillId: "central-ideas",
    difficulty: "easy",
    source: P,
    stimulus:
      "Translators of the poet Amaia Errazti face an unusual difficulty: her poems rely on a verb form that marks whether the speaker witnessed an event personally. English has no equivalent, so translators must either add words the original does not contain or lose a distinction the poems are built around.",
    prompt: "Which choice best states the main idea of the text?",
    choices: [
      { id: "A", text: "Errazti's poems are considered untranslatable by most scholars." },
      { id: "B", text: "A grammatical feature central to Errazti's poems has no English counterpart, forcing translators into a trade-off." },
      { id: "C", text: "English is a less expressive language than the one Errazti writes in." },
      { id: "D", text: "Translators of poetry generally prefer to add words rather than remove them." },
    ],
    answer: "B",
    explanation:
      "The passage names a specific feature and the choice it forces. A overstates ('untranslatable'), C draws a general comparison the text does not make, and D asserts a preference the text does not report.",
  },

  /* ---------------------------------------------------------------- */
  /* Reading & Writing · Craft & Structure                             */
  /* ---------------------------------------------------------------- */
  {
    id: "r-cra-01",
    testId: "sat",
    subjectId: "rw",
    domainId: "craft-structure",
    skillId: "words-in-context",
    difficulty: "easy",
    source: P,
    stimulus:
      "The committee's report was careful to ______ its recommendations: each was presented as provisional, contingent on data that would not arrive for another year.",
    prompt: "Which choice completes the text with the most logical and precise word?",
    choices: [
      { id: "A", text: "duplicate" },
      { id: "B", text: "publicize" },
      { id: "C", text: "abandon" },
      { id: "D", text: "qualify" },
    ],
    answer: "D",
    explanation:
      "The colon explains the blank: the recommendations were limited and made conditional. 'Qualify' means exactly that. The report did not drop them, so 'abandon' contradicts the sentence.",
  },
  {
    id: "r-cra-02",
    testId: "sat",
    subjectId: "rw",
    domainId: "craft-structure",
    skillId: "words-in-context",
    difficulty: "medium",
    source: P,
    stimulus:
      "Far from being ______, the archive's gaps are informative: what a government chose not to record tells historians which activities it considered unremarkable, and which it preferred to leave undocumented.",
    prompt: "Which choice completes the text with the most logical and precise word?",
    choices: [
      { id: "A", text: "deliberate" },
      { id: "B", text: "recent" },
      { id: "C", text: "extensive" },
      { id: "D", text: "inert" },
    ],
    answer: "D",
    explanation:
      "'Far from being ___' sets up a contrast with 'informative', so the blank needs a word meaning the opposite — lacking significance or activity. 'Inert' fits. 'Deliberate' is not the opposite of informative, and the rest of the sentence in fact argues some gaps were deliberate.",
  },
  {
    id: "r-cra-03",
    testId: "sat",
    subjectId: "rw",
    domainId: "craft-structure",
    skillId: "text-structure",
    difficulty: "medium",
    source: P,
    stimulus:
      "For decades, engineers assumed that adding lanes to a congested motorway would reduce travel times. The reasoning was straightforward and, in the short term, usually correct. But traffic studies from the 1990s onward found that the additional capacity attracted trips that had previously not been made at all, and within a few years congestion returned to its former level.",
    prompt: "Which choice best describes the overall structure of the text?",
    choices: [
      { id: "A", text: "It presents a widely held assumption and then describes evidence that complicates it." },
      { id: "B", text: "It describes an engineering method and then explains how to apply it." },
      { id: "C", text: "It compares two competing designs and endorses one." },
      { id: "D", text: "It recounts a historical event and lists its consequences in order." },
    ],
    answer: "A",
    explanation:
      "The first two sentences state the assumption and grant it partial truth; 'But' introduces findings that undercut it. No second design is proposed, so C is wrong.",
  },
  {
    id: "r-cra-04",
    testId: "sat",
    subjectId: "rw",
    domainId: "craft-structure",
    skillId: "cross-text",
    difficulty: "hard",
    source: P,
    stimulus:
      "Text 1: Curator Lian Petros argues that returning objects to their communities of origin should be the default, and that museums bear the burden of justifying why any particular object should stay.\n\nText 2: Historian Bram Osei agrees that many objects were taken under conditions no one would now defend. He argues, however, that a blanket default risks treating every case as identical, and that the relevant question is what a specific community asks for, which is sometimes access and documentation rather than physical return.",
    prompt: "Based on the texts, how would Osei most likely respond to Petros's argument?",
    choices: [
      { id: "A", text: "By disputing that the objects were acquired improperly." },
      { id: "B", text: "By accepting its premise about acquisition while questioning whether a single default rule fits every case." },
      { id: "C", text: "By arguing that museums should retain objects for reasons of preservation." },
      { id: "D", text: "By claiming that communities rarely make requests about objects held abroad." },
    ],
    answer: "B",
    explanation:
      "Osei explicitly concedes the acquisition point ('no one would now defend') and objects only to the uniformity of the rule. A contradicts his stated agreement, and C and D attribute arguments he never makes.",
  },

  /* ---------------------------------------------------------------- */
  /* Reading & Writing · Expression of Ideas                           */
  /* ---------------------------------------------------------------- */
  {
    id: "r-exp-01",
    testId: "sat",
    subjectId: "rw",
    domainId: "expression-ideas",
    skillId: "transitions",
    difficulty: "medium",
    source: P,
    stimulus:
      "The new alloy is significantly lighter than steel and resists corrosion without coating. ______ it costs roughly nine times as much to produce, which has confined it to aerospace components where weight savings justify the price.",
    prompt: "Which choice completes the text with the most logical transition?",
    choices: [
      { id: "A", text: "Moreover," },
      { id: "B", text: "Therefore," },
      { id: "C", text: "However," },
      { id: "D", text: "For example," },
    ],
    answer: "C",
    explanation:
      "The first sentence lists advantages; the second gives a drawback that limits use. That is a contrast. 'Moreover' would add a further advantage, and 'Therefore' would make the cost a consequence of the benefits.",
  },
  {
    id: "r-exp-02",
    testId: "sat",
    subjectId: "rw",
    domainId: "expression-ideas",
    skillId: "transitions",
    difficulty: "medium",
    source: P,
    stimulus:
      "Sea otters eat large numbers of sea urchins, and urchins graze on kelp. Where otter populations have recovered, urchin numbers fall and kelp forests regrow. ______ protecting a single predator can restore an entire coastal habitat.",
    prompt: "Which choice completes the text with the most logical transition?",
    choices: [
      { id: "A", text: "Nevertheless," },
      { id: "B", text: "In other words," },
      { id: "C", text: "Thus," },
      { id: "D", text: "By contrast," },
    ],
    answer: "C",
    explanation:
      "The final sentence draws a conclusion from the chain described before it. 'In other words' would signal a restatement, but the sentence generalises rather than rephrases.",
  },
  {
    id: "r-exp-03",
    testId: "sat",
    subjectId: "rw",
    domainId: "expression-ideas",
    skillId: "rhetorical-synthesis",
    difficulty: "medium",
    source: P,
    stimulus:
      "While researching, a student took these notes:\n• Bioluminescent fungi glow through a reaction involving the compound luciferin.\n• The glow is brightest at night, peaking a few hours after dark.\n• Insects attracted to glowing fungi carry spores away on their bodies.\n• Fungi grown in constant darkness still glow on a roughly 24-hour cycle.",
    prompt:
      "The student wants to emphasise that the fungi's glow follows an internal rhythm. Which choice most effectively uses relevant information from the notes to accomplish this goal?",
    choices: [
      { id: "A", text: "Bioluminescent fungi glow through a reaction involving luciferin, a compound they produce themselves." },
      { id: "B", text: "Because insects carry spores away from glowing fungi, the glow helps the fungi reproduce." },
      { id: "C", text: "Even in constant darkness, bioluminescent fungi continue to glow on a roughly 24-hour cycle, indicating the rhythm is internal rather than a response to nightfall." },
      { id: "D", text: "The glow of bioluminescent fungi is brightest a few hours after dark." },
    ],
    answer: "C",
    explanation:
      "Only the constant-darkness note shows the rhythm persists without an external cue, which is what 'internal rhythm' requires. D is consistent with the glow simply responding to darkness.",
  },

  /* ---------------------------------------------------------------- */
  /* Reading & Writing · Standard English Conventions                  */
  /* ---------------------------------------------------------------- */
  {
    id: "r-sec-01",
    testId: "sat",
    subjectId: "rw",
    domainId: "standard-conventions",
    skillId: "boundaries",
    difficulty: "easy",
    source: P,
    stimulus:
      "The observatory sits above the treeline ______ the thin, dry air there keeps the images sharp.",
    prompt:
      "Which choice completes the text so that it conforms to the conventions of Standard English?",
    choices: [
      { id: "A", text: ";" },
      { id: "B", text: "," },
      { id: "C", text: "(no punctuation)" },
      { id: "D", text: "and" },
    ],
    answer: "A",
    explanation:
      "Both halves are independent clauses. A comma alone (B) is a splice, no punctuation (C) is a run-on, and a coordinating conjunction without a comma (D) is still a run-on. A semicolon joins them correctly.",
  },
  {
    id: "r-sec-02",
    testId: "sat",
    subjectId: "rw",
    domainId: "standard-conventions",
    skillId: "boundaries",
    difficulty: "medium",
    source: P,
    stimulus:
      "Working from photographs taken during the 1931 survey ______ the restorers were able to rebuild the vault almost exactly as it had stood.",
    prompt:
      "Which choice completes the text so that it conforms to the conventions of Standard English?",
    choices: [
      { id: "A", text: "survey; the restorers" },
      { id: "B", text: "survey: the restorers" },
      { id: "C", text: "survey the restorers" },
      { id: "D", text: "survey, the restorers" },
    ],
    answer: "D",
    explanation:
      "The opening is a participial phrase, not an independent clause, so it takes a comma. A semicolon or colon would require a complete clause before it.",
  },
  {
    id: "r-sec-03",
    testId: "sat",
    subjectId: "rw",
    domainId: "standard-conventions",
    skillId: "subject-verb",
    difficulty: "medium",
    source: P,
    stimulus:
      "The collection of letters, along with several unpublished drafts, ______ held in the university's archive.",
    prompt:
      "Which choice completes the text so that it conforms to the conventions of Standard English?",
    choices: [
      { id: "A", text: "are" },
      { id: "B", text: "were" },
      { id: "C", text: "is" },
      { id: "D", text: "have been" },
    ],
    answer: "C",
    explanation:
      "The subject is 'collection', which is singular. The phrase set off by commas does not change the number of the subject.",
  },
  {
    id: "r-sec-04",
    testId: "sat",
    subjectId: "rw",
    domainId: "standard-conventions",
    skillId: "form-structure-sense",
    difficulty: "medium",
    source: P,
    stimulus:
      "By the time the second team reached the summit, the first ______ there for nearly six hours.",
    prompt:
      "Which choice completes the text so that it conforms to the conventions of Standard English?",
    choices: [
      { id: "A", text: "has been" },
      { id: "B", text: "is" },
      { id: "C", text: "had been" },
      { id: "D", text: "will have been" },
    ],
    answer: "C",
    explanation:
      "One past action completed before another past action takes the past perfect. 'Has been' would place it in the present.",
  },
  {
    id: "r-sec-05",
    testId: "sat",
    subjectId: "rw",
    domainId: "standard-conventions",
    skillId: "form-structure-sense",
    difficulty: "hard",
    source: P,
    stimulus:
      "Trained as a botanist and later self-taught in photography, ______",
    prompt:
      "Which choice completes the text so that it conforms to the conventions of Standard English?",
    choices: [
      { id: "A", text: "Atkins's cyanotypes recorded hundreds of algae species." },
      { id: "B", text: "the cyanotypes Atkins made recorded hundreds of algae species." },
      { id: "C", text: "Atkins recorded hundreds of algae species in her cyanotypes." },
      { id: "D", text: "hundreds of algae species were recorded in Atkins's cyanotypes." },
    ],
    answer: "C",
    explanation:
      "The opening modifier describes a person, so the subject of the main clause must be that person. In A the subject is 'cyanotypes', which were not trained as a botanist.",
  },

  /* ---------------------------------------------------------------- */
  /* Math · Algebra (continued)                                        */
  /* ---------------------------------------------------------------- */
  {
    id: "m-alg-11",
    testId: "sat",
    subjectId: "math",
    domainId: "algebra",
    skillId: "linear-eq-1var",
    difficulty: "easy",
    source: P,
    prompt: "If 5x + 3 = 28, what is the value of x?",
    choices: [
      { id: "A", text: "3" },
      { id: "B", text: "5" },
      { id: "C", text: "8" },
      { id: "D", text: "11" },
    ],
    answer: "B",
    explanation:
      "Subtract 3 from both sides: 5x = 25. Divide by 5: x = 5.",
  },
  {
    id: "m-alg-12",
    testId: "sat",
    subjectId: "math",
    domainId: "algebra",
    skillId: "linear-eq-1var",
    difficulty: "medium",
    source: P,
    prompt: "If 2(x + 3) − 4 = 3(x − 1), what is the value of x?",
    choices: [
      { id: "A", text: "-5" },
      { id: "B", text: "-1" },
      { id: "C", text: "1" },
      { id: "D", text: "5" },
    ],
    answer: "D",
    explanation:
      "Expand both sides: 2x + 2 = 3x − 3. Subtract 2x from both sides: 2 = x − 3, so x = 5.",
  },
  {
    id: "m-alg-13",
    testId: "sat",
    subjectId: "math",
    domainId: "algebra",
    skillId: "linear-eq-1var",
    difficulty: "hard",
    source: P,
    prompt: "If (2x − 1)/3 − (x − 2)/4 = 1, what is the value of x?",
    choices: [
      { id: "A", text: "-2" },
      { id: "B", text: "1" },
      { id: "C", text: "2" },
      { id: "D", text: "5" },
    ],
    answer: "C",
    explanation:
      "Multiply every term by 12, the LCD of 3 and 4: 4(2x − 1) − 3(x − 2) = 12. Expand: 8x − 4 − 3x + 6 = 12, so 5x + 2 = 12 and x = 2.",
  },
  {
    id: "m-alg-14",
    testId: "sat",
    subjectId: "math",
    domainId: "algebra",
    skillId: "linear-eq-2var",
    difficulty: "easy",
    source: P,
    prompt:
      "The equation 4x + 2y = 12 is graphed in the xy-plane. What is the y-intercept of the graph?",
    choices: [
      { id: "A", text: "(0, 3)" },
      { id: "B", text: "(0, 6)" },
      { id: "C", text: "(0, 12)" },
      { id: "D", text: "(3, 0)" },
    ],
    answer: "B",
    explanation:
      "Set x = 0: 2y = 12, so y = 6. The y-intercept is (0, 6).",
  },
  {
    id: "m-alg-15",
    testId: "sat",
    subjectId: "math",
    domainId: "algebra",
    skillId: "linear-eq-2var",
    difficulty: "medium",
    source: P,
    prompt:
      "A line passes through the points (2, 5) and (4, 11). Which equation represents this line?",
    choices: [
      { id: "A", text: "y = 3x + 5" },
      { id: "B", text: "y = 3x + 1" },
      { id: "C", text: "y = 2x + 1" },
      { id: "D", text: "y = 3x − 1" },
    ],
    answer: "D",
    explanation:
      "Slope = (11 − 5)/(4 − 2) = 3. Using the point (2, 5): 5 = 3(2) + b, so b = −1. The equation is y = 3x − 1.",
  },
  {
    id: "m-alg-16",
    testId: "sat",
    subjectId: "math",
    domainId: "algebra",
    skillId: "linear-eq-2var",
    difficulty: "hard",
    source: P,
    prompt: "For what value of k is the line 6x + ky = 18 parallel to the line y = −2x + 7?",
    choices: [
      { id: "A", text: "-3" },
      { id: "B", text: "-2" },
      { id: "C", text: "2" },
      { id: "D", text: "3" },
    ],
    answer: "D",
    explanation:
      "Rewrite 6x + ky = 18 as y = −(6/k)x + 18/k, which has slope −6/k. For the lines to be parallel, −6/k = −2, so k = 3.",
  },
  {
    id: "m-alg-17",
    testId: "sat",
    subjectId: "math",
    domainId: "algebra",
    skillId: "linear-functions",
    difficulty: "easy",
    source: P,
    prompt: "The function g is defined by g(x) = 5x − 3. What is the value of g(−2)?",
    choices: [
      { id: "A", text: "-13" },
      { id: "B", text: "-7" },
      { id: "C", text: "7" },
      { id: "D", text: "13" },
    ],
    answer: "A",
    explanation:
      "Substitute −2 for x: g(−2) = 5(−2) − 3 = −10 − 3 = −13.",
  },
  {
    id: "m-alg-18",
    testId: "sat",
    subjectId: "math",
    domainId: "algebra",
    skillId: "linear-functions",
    difficulty: "medium",
    source: P,
    prompt: "Linear function h satisfies h(0) = 4 and h(3) = 13. What is the value of h(7)?",
    choices: [
      { id: "A", text: "21" },
      { id: "B", text: "22" },
      { id: "C", text: "25" },
      { id: "D", text: "28" },
    ],
    answer: "C",
    explanation:
      "The slope is (13 − 4)/(3 − 0) = 3, so h(x) = 3x + 4. Then h(7) = 3(7) + 4 = 25.",
  },
  {
    id: "m-alg-19",
    testId: "sat",
    subjectId: "math",
    domainId: "algebra",
    skillId: "linear-functions",
    difficulty: "hard",
    source: P,
    prompt:
      "The graph of linear function f has a slope of −4 and passes through the point (1, −2). For what value of x does f(x) = 10?",
    choices: [
      { id: "A", text: "-3" },
      { id: "B", text: "-2" },
      { id: "C", text: "2" },
      { id: "D", text: "3" },
    ],
    answer: "B",
    explanation:
      "f(x) = −4(x − 1) − 2 = −4x + 2. Setting −4x + 2 = 10 gives −4x = 8, so x = −2.",
  },
  {
    id: "m-alg-20",
    testId: "sat",
    subjectId: "math",
    domainId: "algebra",
    skillId: "systems-linear",
    difficulty: "easy",
    source: P,
    prompt: "In the system y = 2x + 1 and y = x + 4, what is the value of x?",
    choices: [
      { id: "A", text: "1" },
      { id: "B", text: "2" },
      { id: "C", text: "3" },
      { id: "D", text: "5" },
    ],
    answer: "C",
    explanation:
      "Set the expressions equal: 2x + 1 = x + 4, so x = 3.",
  },
  {
    id: "m-alg-21",
    testId: "sat",
    subjectId: "math",
    domainId: "algebra",
    skillId: "systems-linear",
    difficulty: "medium",
    source: P,
    prompt: "If 3x + 2y = 16 and x − y = 2, what is the value of x + y?",
    choices: [
      { id: "A", text: "2" },
      { id: "B", text: "4" },
      { id: "C", text: "6" },
      { id: "D", text: "8" },
    ],
    answer: "C",
    explanation:
      "From x − y = 2, x = y + 2. Substitute: 3(y + 2) + 2y = 16, so 5y + 6 = 16 and y = 2, giving x = 4. Then x + y = 6.",
  },
  {
    id: "m-alg-22",
    testId: "sat",
    subjectId: "math",
    domainId: "algebra",
    skillId: "systems-linear",
    difficulty: "hard",
    source: P,
    prompt:
      "For what value of c does the system 4x − 6y = 10 and 6x − 9y = c have infinitely many solutions?",
    choices: [
      { id: "A", text: "10" },
      { id: "B", text: "12" },
      { id: "C", text: "15" },
      { id: "D", text: "20" },
    ],
    answer: "C",
    explanation:
      "Multiplying 4x − 6y = 10 by 3/2 gives 6x − 9y = 15. The system has infinitely many solutions only when c makes the second equation a multiple of the first, so c = 15.",
  },
  {
    id: "m-alg-23",
    testId: "sat",
    subjectId: "math",
    domainId: "algebra",
    skillId: "linear-inequalities",
    difficulty: "easy",
    source: P,
    prompt: "Which of the following is the solution to 3x − 5 > 7?",
    choices: [
      { id: "A", text: "x > −4" },
      { id: "B", text: "x < 4" },
      { id: "C", text: "x > 2" },
      { id: "D", text: "x > 4" },
    ],
    answer: "D",
    explanation:
      "Add 5 to both sides: 3x > 12. Divide by 3: x > 4.",
  },
  {
    id: "m-alg-24",
    testId: "sat",
    subjectId: "math",
    domainId: "algebra",
    skillId: "linear-inequalities",
    difficulty: "medium",
    source: P,
    prompt: "Which of the following is the solution to −2x + 7 ≤ 15?",
    choices: [
      { id: "A", text: "x ≤ −4" },
      { id: "B", text: "x ≥ 4" },
      { id: "C", text: "x ≤ 4" },
      { id: "D", text: "x ≥ −4" },
    ],
    answer: "D",
    explanation:
      "Subtract 7 from both sides: −2x ≤ 8. Dividing by −2 reverses the inequality: x ≥ −4.",
  },
  {
    id: "m-alg-25",
    testId: "sat",
    subjectId: "math",
    domainId: "algebra",
    skillId: "linear-inequalities",
    difficulty: "hard",
    source: P,
    prompt: "The solution set of 3(x − 2) + 4 < 2x + 9 consists of all x less than what value?",
    choices: [
      { id: "A", text: "7" },
      { id: "B", text: "9" },
      { id: "C", text: "11" },
      { id: "D", text: "15" },
    ],
    answer: "C",
    explanation:
      "Expand: 3x − 6 + 4 < 2x + 9, so 3x − 2 < 2x + 9. Subtracting 2x from both sides gives x < 11.",
  },

  /* ---------------------------------------------------------------- */
  /* Math · Advanced Math (continued)                                  */
  /* ---------------------------------------------------------------- */
  {
    id: "m-adv-10",
    testId: "sat",
    subjectId: "math",
    domainId: "advanced-math",
    skillId: "quadratics",
    difficulty: "medium",
    source: P,
    prompt: "If x² − 5x + 6 = 0, what is the larger solution for x?",
    choices: [
      { id: "A", text: "2" },
      { id: "B", text: "3" },
      { id: "C", text: "5" },
      { id: "D", text: "6" },
    ],
    answer: "B",
    explanation:
      "Factor: (x − 2)(x − 3) = 0, so x = 2 or x = 3. The larger solution is 3.",
  },
  {
    id: "m-adv-11",
    testId: "sat",
    subjectId: "math",
    domainId: "advanced-math",
    skillId: "quadratics",
    difficulty: "medium",
    source: P,
    prompt: "If x² + 8x + 12 = 0, what is the sum of the solutions?",
    choices: [
      { id: "A", text: "-12" },
      { id: "B", text: "-8" },
      { id: "C", text: "8" },
      { id: "D", text: "12" },
    ],
    answer: "B",
    explanation:
      "For ax² + bx + c = 0, the sum of the solutions equals −b/a = −8/1 = −8.",
  },
  {
    id: "m-adv-12",
    testId: "sat",
    subjectId: "math",
    domainId: "advanced-math",
    skillId: "quadratics",
    difficulty: "hard",
    source: P,
    prompt: "For what positive value of k does 2x² + kx + 8 = 0 have exactly one real solution?",
    choices: [
      { id: "A", text: "4" },
      { id: "B", text: "8" },
      { id: "C", text: "16" },
      { id: "D", text: "32" },
    ],
    answer: "B",
    explanation:
      "Exactly one real solution requires a discriminant of 0: k² − 4(2)(8) = 0, so k² = 64 and k = 8 (taking the positive root).",
  },
  {
    id: "m-adv-13",
    testId: "sat",
    subjectId: "math",
    domainId: "advanced-math",
    skillId: "equivalent-expressions",
    difficulty: "easy",
    source: P,
    prompt: "Which expression is equivalent to 3(2x − 5) + 4x?",
    choices: [
      { id: "A", text: "10x − 15" },
      { id: "B", text: "10x − 5" },
      { id: "C", text: "6x − 15" },
      { id: "D", text: "10x + 15" },
    ],
    answer: "A",
    explanation:
      "Distribute: 6x − 15 + 4x = 10x − 15.",
  },
  {
    id: "m-adv-14",
    testId: "sat",
    subjectId: "math",
    domainId: "advanced-math",
    skillId: "equivalent-expressions",
    difficulty: "medium",
    source: P,
    prompt: "Which expression is equivalent to (x + 3)(x − 5)?",
    choices: [
      { id: "A", text: "x² − 8x − 15" },
      { id: "B", text: "x² + 2x − 15" },
      { id: "C", text: "x² − 2x + 15" },
      { id: "D", text: "x² − 2x − 15" },
    ],
    answer: "D",
    explanation:
      "FOIL the expression: x² − 5x + 3x − 15 = x² − 2x − 15.",
  },
  {
    id: "m-adv-15",
    testId: "sat",
    subjectId: "math",
    domainId: "advanced-math",
    skillId: "equivalent-expressions",
    difficulty: "hard",
    source: P,
    prompt: "Which expression is equivalent to (4x² − 9)/(2x − 3), for x ≠ 3/2?",
    choices: [
      { id: "A", text: "2x − 3" },
      { id: "B", text: "2x + 3" },
      { id: "C", text: "4x − 3" },
      { id: "D", text: "2x + 9" },
    ],
    answer: "B",
    explanation:
      "4x² − 9 factors as (2x − 3)(2x + 3). Dividing by (2x − 3) leaves 2x + 3.",
  },
  {
    id: "m-adv-16",
    testId: "sat",
    subjectId: "math",
    domainId: "advanced-math",
    skillId: "exponential",
    difficulty: "easy",
    source: P,
    prompt:
      "A population of bacteria doubles every hour, starting at 200. Which function models the population, P, after t hours?",
    choices: [
      { id: "A", text: "P(t) = 200t²" },
      { id: "B", text: "P(t) = 2(200)^t" },
      { id: "C", text: "P(t) = 200 + 2t" },
      { id: "D", text: "P(t) = 200(2)^t" },
    ],
    answer: "D",
    explanation:
      "Doubling every hour from a starting value of 200 is modeled by P(t) = 200(2)^t.",
  },
  {
    id: "m-adv-17",
    testId: "sat",
    subjectId: "math",
    domainId: "advanced-math",
    skillId: "exponential",
    difficulty: "medium",
    source: P,
    prompt:
      "An investment of $1,500 grows by 4% each year. Which expression gives its value after 6 years?",
    choices: [
      { id: "A", text: "1500(1.04)^6" },
      { id: "B", text: "1500(0.04)^6" },
      { id: "C", text: "1500(1.4)^6" },
      { id: "D", text: "1500(4)^6" },
    ],
    answer: "A",
    explanation:
      "Annual growth of 4% means multiplying by 1.04 each year, so the value after 6 years is 1500(1.04)^6.",
  },
  {
    id: "m-adv-18",
    testId: "sat",
    subjectId: "math",
    domainId: "advanced-math",
    skillId: "exponential",
    difficulty: "hard",
    source: P,
    prompt:
      "The function f(t) = 800(0.85)^t models the value, in dollars, of a piece of equipment t years after purchase. By what percent does the value decrease each year, and what is the value after 2 years, to the nearest dollar?",
    choices: [
      { id: "A", text: "15%; $578" },
      { id: "B", text: "85%; $578" },
      { id: "C", text: "15%; $680" },
      { id: "D", text: "85%; $680" },
    ],
    answer: "A",
    explanation:
      "The base 0.85 means the value retains 85% of its value each year, a 15% decrease. After 2 years: 800(0.85)² = 800(0.7225) = $578.",
  },
  {
    id: "m-adv-19",
    testId: "sat",
    subjectId: "math",
    domainId: "advanced-math",
    skillId: "nonlinear-functions",
    difficulty: "medium",
    source: P,
    prompt: "The graph of y = (x − 2)² + 3 has its vertex at which point?",
    choices: [
      { id: "A", text: "(2, 3)" },
      { id: "B", text: "(-2, 3)" },
      { id: "C", text: "(2, -3)" },
      { id: "D", text: "(-2, -3)" },
    ],
    answer: "A",
    explanation:
      "In vertex form y = (x − h)² + k, the vertex is (h, k) = (2, 3).",
  },
  {
    id: "m-adv-20",
    testId: "sat",
    subjectId: "math",
    domainId: "advanced-math",
    skillId: "nonlinear-functions",
    difficulty: "medium",
    source: P,
    prompt: "If f(x) = x² − 4x, for what value(s) of x is f(x) = 0?",
    choices: [
      { id: "A", text: "only 0" },
      { id: "B", text: "only 4" },
      { id: "C", text: "0 and 4" },
      { id: "D", text: "-4 and 4" },
    ],
    answer: "C",
    explanation:
      "Factor: x(x − 4) = 0, so x = 0 or x = 4.",
  },
  {
    id: "m-adv-21",
    testId: "sat",
    subjectId: "math",
    domainId: "advanced-math",
    skillId: "nonlinear-functions",
    difficulty: "hard",
    source: P,
    prompt: "The function g(x) = −3(x + 1)(x − 5) reaches its maximum value at x = ?",
    choices: [
      { id: "A", text: "-3" },
      { id: "B", text: "-1" },
      { id: "C", text: "2" },
      { id: "D", text: "5" },
    ],
    answer: "C",
    explanation:
      "The parabola's roots are x = −1 and x = 5. Its axis of symmetry, and, since the leading coefficient is negative, its maximum, lies at the midpoint, x = 2.",
  },

  /* ---------------------------------------------------------------- */
  /* Math · Problem-Solving & Data Analysis (continued)                */
  /* ---------------------------------------------------------------- */
  {
    id: "m-psd-10",
    testId: "sat",
    subjectId: "math",
    domainId: "problem-solving",
    skillId: "ratios-rates",
    difficulty: "easy",
    source: P,
    prompt:
      "A recipe uses 3 cups of flour for every 2 cups of sugar. How many cups of flour are needed for 8 cups of sugar?",
    choices: [
      { id: "A", text: "10" },
      { id: "B", text: "12" },
      { id: "C", text: "14" },
      { id: "D", text: "16" },
    ],
    answer: "B",
    explanation:
      "Set up the proportion 3/2 = x/8. Cross-multiply: 2x = 24, so x = 12.",
  },
  {
    id: "m-psd-11",
    testId: "sat",
    subjectId: "math",
    domainId: "problem-solving",
    skillId: "ratios-rates",
    difficulty: "medium",
    source: P,
    prompt:
      "A car travels 210 miles in 3.5 hours. At the same rate, how many miles will it travel in 5 hours?",
    choices: [
      { id: "A", text: "250" },
      { id: "B", text: "280" },
      { id: "C", text: "300" },
      { id: "D", text: "315" },
    ],
    answer: "C",
    explanation:
      "The rate is 210/3.5 = 60 miles per hour. In 5 hours it travels 60 × 5 = 300 miles.",
  },
  {
    id: "m-psd-12",
    testId: "sat",
    subjectId: "math",
    domainId: "problem-solving",
    skillId: "ratios-rates",
    difficulty: "hard",
    source: P,
    prompt:
      "Pump A alone fills a tank in 6 hours; Pump B alone fills the same tank in 3 hours. Working together at their constant rates, how many hours will it take to fill the tank?",
    choices: [
      { id: "A", text: "1.5" },
      { id: "B", text: "2" },
      { id: "C", text: "2.5" },
      { id: "D", text: "4.5" },
    ],
    answer: "B",
    explanation:
      "Combined rate = 1/6 + 1/3 = 1/2 tank per hour, so the tank fills in 1 ÷ (1/2) = 2 hours.",
  },
  {
    id: "m-psd-13",
    testId: "sat",
    subjectId: "math",
    domainId: "problem-solving",
    skillId: "percentages",
    difficulty: "easy",
    source: P,
    prompt: "40 is what percent of 160?",
    choices: [
      { id: "A", text: "20%" },
      { id: "B", text: "25%" },
      { id: "C", text: "30%" },
      { id: "D", text: "40%" },
    ],
    answer: "B",
    explanation:
      "40/160 = 0.25 = 25%.",
  },
  {
    id: "m-psd-14",
    testId: "sat",
    subjectId: "math",
    domainId: "problem-solving",
    skillId: "percentages",
    difficulty: "medium",
    source: P,
    prompt:
      "A jacket originally priced $80 is discounted 25%, and then a 10% sales tax is applied to the discounted price. What is the final price?",
    choices: [
      { id: "A", text: "$60" },
      { id: "B", text: "$62" },
      { id: "C", text: "$64" },
      { id: "D", text: "$66" },
    ],
    answer: "D",
    explanation:
      "Discounted price: 80 × 0.75 = $60. Adding 10% tax: 60 × 1.10 = $66.",
  },
  {
    id: "m-psd-15",
    testId: "sat",
    subjectId: "math",
    domainId: "problem-solving",
    skillId: "percentages",
    difficulty: "hard",
    source: P,
    prompt: "A quantity increased from 250 to 310. By what percent did it increase?",
    choices: [
      { id: "A", text: "20%" },
      { id: "B", text: "22%" },
      { id: "C", text: "24%" },
      { id: "D", text: "26%" },
    ],
    answer: "C",
    explanation:
      "Percent increase = (310 − 250)/250 = 60/250 = 0.24 = 24%.",
  },
  {
    id: "m-psd-16",
    testId: "sat",
    subjectId: "math",
    domainId: "problem-solving",
    skillId: "data-distributions",
    difficulty: "easy",
    source: P,
    prompt: "What is the median of the data set 4, 7, 7, 9, 13?",
    choices: [
      { id: "A", text: "4" },
      { id: "B", text: "7" },
      { id: "C", text: "8" },
      { id: "D", text: "9" },
    ],
    answer: "B",
    explanation:
      "With the values already in order, the median is the middle value, 7.",
  },
  {
    id: "m-psd-17",
    testId: "sat",
    subjectId: "math",
    domainId: "problem-solving",
    skillId: "data-distributions",
    difficulty: "medium",
    source: P,
    prompt:
      "A set of 5 numbers has a mean of 20. If one value, 40, is removed, what is the mean of the remaining four numbers?",
    choices: [
      { id: "A", text: "12" },
      { id: "B", text: "15" },
      { id: "C", text: "16" },
      { id: "D", text: "18" },
    ],
    answer: "B",
    explanation:
      "The original sum is 20 × 5 = 100. Removing 40 leaves 60. The new mean is 60/4 = 15.",
  },
  {
    id: "m-psd-18",
    testId: "sat",
    subjectId: "math",
    domainId: "problem-solving",
    skillId: "data-distributions",
    difficulty: "hard",
    source: P,
    prompt:
      "A set of 10 test scores has a mean of 82. After a new student's score is added, the mean of all 11 scores becomes 83. What was the new student's score?",
    choices: [
      { id: "A", text: "84" },
      { id: "B", text: "88" },
      { id: "C", text: "91" },
      { id: "D", text: "93" },
    ],
    answer: "D",
    explanation:
      "The original sum is 82 × 10 = 820. The new sum is 83 × 11 = 913. The new score is 913 − 820 = 93.",
  },
  {
    id: "m-psd-19",
    testId: "sat",
    subjectId: "math",
    domainId: "problem-solving",
    skillId: "probability",
    difficulty: "easy",
    source: P,
    prompt:
      "A bag contains 5 red marbles and 7 blue marbles. What is the probability of randomly drawing a red marble?",
    choices: [
      { id: "A", text: "5/12" },
      { id: "B", text: "7/12" },
      { id: "C", text: "5/7" },
      { id: "D", text: "1/2" },
    ],
    answer: "A",
    explanation:
      "There are 12 marbles in total, 5 of them red, so the probability is 5/12.",
  },
  {
    id: "m-psd-20",
    testId: "sat",
    subjectId: "math",
    domainId: "problem-solving",
    skillId: "probability",
    difficulty: "medium",
    source: P,
    prompt:
      "A standard six-sided die is rolled twice. What is the probability that both rolls show a number greater than 4?",
    choices: [
      { id: "A", text: "1/36" },
      { id: "B", text: "1/9" },
      { id: "C", text: "1/6" },
      { id: "D", text: "2/9" },
    ],
    answer: "B",
    explanation:
      "P(roll > 4) = 2/6 = 1/3 on each roll. Since the rolls are independent, the probability of both is (1/3)(1/3) = 1/9.",
  },
  {
    id: "m-psd-21",
    testId: "sat",
    subjectId: "math",
    domainId: "problem-solving",
    skillId: "probability",
    difficulty: "medium",
    source: P,
    prompt:
      "In a class of 30 students, 18 play soccer and 10 play both soccer and basketball. If 22 students play at least one of the two sports, how many play only basketball?",
    choices: [
      { id: "A", text: "4" },
      { id: "B", text: "6" },
      { id: "C", text: "8" },
      { id: "D", text: "12" },
    ],
    answer: "A",
    explanation:
      "Only soccer = 18 − 10 = 8. Since 22 play at least one sport, only basketball = 22 − 8 − 10 = 4.",
  },
  {
    id: "m-psd-22",
    testId: "sat",
    subjectId: "math",
    domainId: "problem-solving",
    skillId: "probability",
    difficulty: "hard",
    source: P,
    prompt:
      "A jar has 4 green, 3 yellow, and 5 orange candies. Two candies are drawn at random without replacement. What is the probability that both are green?",
    choices: [
      { id: "A", text: "1/12" },
      { id: "B", text: "1/11" },
      { id: "C", text: "1/9" },
      { id: "D", text: "2/11" },
    ],
    answer: "B",
    explanation:
      "P(first green) = 4/12. P(second green given first green) = 3/11. Multiplying: (4/12)(3/11) = 12/132 = 1/11.",
  },
  {
    id: "m-psd-23",
    testId: "sat",
    subjectId: "math",
    domainId: "problem-solving",
    skillId: "inference",
    difficulty: "easy",
    source: P,
    prompt:
      "A random sample of 200 voters from a city found that 120 support a proposal. Based on this sample, about what percentage of all voters in the city would be expected to support the proposal?",
    choices: [
      { id: "A", text: "40%" },
      { id: "B", text: "50%" },
      { id: "C", text: "60%" },
      { id: "D", text: "70%" },
    ],
    answer: "C",
    explanation:
      "120/200 = 0.60 = 60%.",
  },
  {
    id: "m-psd-24",
    testId: "sat",
    subjectId: "math",
    domainId: "problem-solving",
    skillId: "inference",
    difficulty: "medium",
    source: P,
    prompt:
      "A researcher surveys a random sample of 400 students at a university and finds a margin of error of ±3% for the proportion who own a car. Which of the following would most likely reduce the margin of error?",
    choices: [
      { id: "A", text: "Decreasing the sample size" },
      { id: "B", text: "Rounding percentages to the nearest whole number" },
      { id: "C", text: "Surveying only freshmen" },
      { id: "D", text: "Increasing the sample size" },
    ],
    answer: "D",
    explanation:
      "The margin of error decreases as sample size increases, all else equal, because a larger sample gives a more precise estimate of the population proportion.",
  },
  {
    id: "m-psd-25",
    testId: "sat",
    subjectId: "math",
    domainId: "problem-solving",
    skillId: "inference",
    difficulty: "hard",
    source: P,
    prompt:
      "A random sample of 150 packages from a factory's daily output found a mean weight of 4.2 kg with a margin of error of 0.15 kg at a 95% confidence level. Which statement is an appropriate conclusion?",
    choices: [
      { id: "A", text: "Exactly 95% of all packages weigh between 4.05 and 4.35 kg." },
      { id: "B", text: "The margin of error guarantees the population mean is 4.2 kg." },
      { id: "C", text: "95% of the sampled packages weighed exactly 4.2 kg." },
      { id: "D", text: "We can be 95% confident the true mean weight of all packages produced that day is between 4.05 kg and 4.35 kg." },
    ],
    answer: "D",
    explanation:
      "A confidence interval describes a range of plausible values for the population mean, not a claim about individual packages. Here that interval is 4.2 ± 0.15, or 4.05 to 4.35 kg, at 95% confidence.",
  },

  /* ---------------------------------------------------------------- */
  /* Math · Geometry & Trigonometry (continued)                        */
  /* ---------------------------------------------------------------- */
  {
    id: "m-geo-08",
    testId: "sat",
    subjectId: "math",
    domainId: "geometry-trig",
    skillId: "area-volume",
    difficulty: "easy",
    source: P,
    prompt: "A rectangle has length 12 and width 5. What is its area?",
    choices: [
      { id: "A", text: "17" },
      { id: "B", text: "34" },
      { id: "C", text: "60" },
      { id: "D", text: "85" },
    ],
    answer: "C",
    explanation:
      "Area = length × width = 12 × 5 = 60.",
  },
  {
    id: "m-geo-09",
    testId: "sat",
    subjectId: "math",
    domainId: "geometry-trig",
    skillId: "area-volume",
    difficulty: "medium",
    source: P,
    prompt:
      "A cylinder has a volume of 150π and a radius of 5. What is its height?",
    choices: [
      { id: "A", text: "3" },
      { id: "B", text: "6" },
      { id: "C", text: "10" },
      { id: "D", text: "30" },
    ],
    answer: "B",
    explanation:
      "Volume = πr²h, so 150π = π(5²)h = 25πh. Dividing both sides by 25π gives h = 6.",
  },
  {
    id: "m-geo-10",
    testId: "sat",
    subjectId: "math",
    domainId: "geometry-trig",
    skillId: "area-volume",
    difficulty: "hard",
    source: P,
    prompt:
      "A rectangular prism has a volume of 240 cubic units, a length of 8, and a width of 5. What is its height?",
    choices: [
      { id: "A", text: "4" },
      { id: "B", text: "5" },
      { id: "C", text: "6" },
      { id: "D", text: "8" },
    ],
    answer: "C",
    explanation:
      "Height = volume/(length × width) = 240/40 = 6.",
  },
  {
    id: "m-geo-11",
    testId: "sat",
    subjectId: "math",
    domainId: "geometry-trig",
    skillId: "lines-angles-triangles",
    difficulty: "easy",
    source: P,
    prompt: "Two angles are supplementary. One measures 65°. What is the measure of the other?",
    choices: [
      { id: "A", text: "25°" },
      { id: "B", text: "65°" },
      { id: "C", text: "115°" },
      { id: "D", text: "125°" },
    ],
    answer: "C",
    explanation:
      "Supplementary angles sum to 180°, so the other angle is 180° − 65° = 115°.",
  },
  {
    id: "m-geo-12",
    testId: "sat",
    subjectId: "math",
    domainId: "geometry-trig",
    skillId: "lines-angles-triangles",
    difficulty: "medium",
    source: P,
    prompt: "In triangle ABC, angle A = 40° and angle B = 75°. What is the measure of angle C?",
    choices: [
      { id: "A", text: "55°" },
      { id: "B", text: "60°" },
      { id: "C", text: "65°" },
      { id: "D", text: "75°" },
    ],
    answer: "C",
    explanation:
      "The angles of a triangle sum to 180°, so angle C = 180° − 40° − 75° = 65°.",
  },
  {
    id: "m-geo-13",
    testId: "sat",
    subjectId: "math",
    domainId: "geometry-trig",
    skillId: "lines-angles-triangles",
    difficulty: "medium",
    source: P,
    prompt:
      "Two parallel lines are cut by a transversal. One of the angles formed measures 112°. What is the measure of its corresponding angle?",
    choices: [
      { id: "A", text: "68°" },
      { id: "B", text: "78°" },
      { id: "C", text: "102°" },
      { id: "D", text: "112°" },
    ],
    answer: "D",
    explanation:
      "Corresponding angles formed by a transversal cutting parallel lines are congruent, so the corresponding angle also measures 112°.",
  },
  {
    id: "m-geo-14",
    testId: "sat",
    subjectId: "math",
    domainId: "geometry-trig",
    skillId: "lines-angles-triangles",
    difficulty: "hard",
    source: P,
    prompt:
      "In triangle DEF, the measure of angle D is twice the measure of angle E, and angle F measures 30° more than angle E. What is the measure of angle D?",
    choices: [
      { id: "A", text: "37.5°" },
      { id: "B", text: "60°" },
      { id: "C", text: "75°" },
      { id: "D", text: "90°" },
    ],
    answer: "C",
    explanation:
      "Let angle E = x. Then D = 2x and F = x + 30. Since the angles sum to 180°: x + 2x + (x + 30) = 180, so 4x = 150 and x = 37.5. Angle D = 2(37.5) = 75°.",
  },
  {
    id: "m-geo-15",
    testId: "sat",
    subjectId: "math",
    domainId: "geometry-trig",
    skillId: "right-triangles-trig",
    difficulty: "easy",
    source: P,
    prompt: "A right triangle has legs of length 6 and 8. What is the length of the hypotenuse?",
    choices: [
      { id: "A", text: "9" },
      { id: "B", text: "10" },
      { id: "C", text: "12" },
      { id: "D", text: "14" },
    ],
    answer: "B",
    explanation:
      "By the Pythagorean theorem, the hypotenuse is √(6² + 8²) = √100 = 10.",
  },
  {
    id: "m-geo-16",
    testId: "sat",
    subjectId: "math",
    domainId: "geometry-trig",
    skillId: "right-triangles-trig",
    difficulty: "medium",
    source: P,
    prompt:
      "In a right triangle, one acute angle measures 30° and the hypotenuse has length 14. What is the length of the side opposite the 30° angle?",
    choices: [
      { id: "A", text: "7" },
      { id: "B", text: "7√3" },
      { id: "C", text: "12.1" },
      { id: "D", text: "14√3/2" },
    ],
    answer: "A",
    explanation:
      "The side opposite a 30° angle equals the hypotenuse times sin(30°): 14 × 0.5 = 7.",
  },
  {
    id: "m-geo-17",
    testId: "sat",
    subjectId: "math",
    domainId: "geometry-trig",
    skillId: "right-triangles-trig",
    difficulty: "hard",
    source: P,
    prompt: "In right triangle ABC, angle C = 90°, and tan(A) = 3/4. What is sin(A)?",
    choices: [
      { id: "A", text: "3/5" },
      { id: "B", text: "4/5" },
      { id: "C", text: "3/4" },
      { id: "D", text: "4/3" },
    ],
    answer: "A",
    explanation:
      "If tan A = 3/4, the legs opposite and adjacent to A can be taken as 3 and 4, giving a hypotenuse of √(3² + 4²) = 5. So sin A = opposite/hypotenuse = 3/5.",
  },
  {
    id: "m-geo-18",
    testId: "sat",
    subjectId: "math",
    domainId: "geometry-trig",
    skillId: "circles",
    difficulty: "easy",
    source: P,
    prompt: "A circle has radius 7. What is its circumference in terms of π?",
    choices: [
      { id: "A", text: "7π" },
      { id: "B", text: "14π" },
      { id: "C", text: "49π" },
      { id: "D", text: "28π" },
    ],
    answer: "B",
    explanation:
      "Circumference = 2πr = 2π(7) = 14π.",
  },
  {
    id: "m-geo-19",
    testId: "sat",
    subjectId: "math",
    domainId: "geometry-trig",
    skillId: "circles",
    difficulty: "medium",
    source: P,
    prompt:
      "A circle has the equation (x − 3)² + (y + 2)² = 25. What is the radius of the circle?",
    choices: [
      { id: "A", text: "5" },
      { id: "B", text: "10" },
      { id: "C", text: "25" },
      { id: "D", text: "3" },
    ],
    answer: "A",
    explanation:
      "The equation is in the form (x − h)² + (y − k)² = r², so r² = 25 and r = 5.",
  },
  {
    id: "m-geo-20",
    testId: "sat",
    subjectId: "math",
    domainId: "geometry-trig",
    skillId: "circles",
    difficulty: "hard",
    source: P,
    prompt:
      "A circle has center (2, −1) and passes through the point (7, 11). Which equation represents the circle?",
    choices: [
      { id: "A", text: "(x − 2)² + (y − 1)² = 169" },
      { id: "B", text: "(x − 2)² + (y + 1)² = 13" },
      { id: "C", text: "(x + 2)² + (y − 1)² = 169" },
      { id: "D", text: "(x − 2)² + (y + 1)² = 169" },
    ],
    answer: "D",
    explanation:
      "r² = (7 − 2)² + (11 − (−1))² = 25 + 144 = 169. The equation is (x − 2)² + (y + 1)² = 169.",
  },

  /* ---------------------------------------------------------------- */
  /* Reading & Writing · Information & Ideas (continued)               */
  /* ---------------------------------------------------------------- */
  {
    id: "r-inf-06",
    testId: "sat",
    subjectId: "rw",
    domainId: "information-ideas",
    skillId: "central-ideas",
    difficulty: "medium",
    source: P,
    stimulus:
      "For years the valley's air-quality monitors stood only beside major roads, where readings were highest. A volunteer team has since mounted low-cost sensors on rooftops across residential streets and found that pollution levels vary far more within a single neighbourhood than the roadside network had suggested. The older data, the team argues, was not so much wrong as unrepresentative: it measured the worst locations well and everywhere else not at all.",
    prompt: "Which choice best states the main idea of the text?",
    choices: [
      { id: "A", text: "The valley's air is cleaner than the roadside monitors indicated." },
      {
        id: "B",
        text: "A denser network of sensors showed that pollution varies widely within neighbourhoods, which the roadside monitors could not reveal.",
      },
      { id: "C", text: "The roadside monitors gave inaccurate readings at the places they measured." },
      { id: "D", text: "Low-cost sensors are more accurate than professional monitoring equipment." },
    ],
    answer: "B",
    explanation:
      "The text contrasts what the old network could measure with what the denser one revealed. C contradicts the last sentence, which says the roadside readings were good where they were taken; A and D claim comparisons the text never makes.",
  },
  {
    id: "r-inf-07",
    testId: "sat",
    subjectId: "rw",
    domainId: "information-ideas",
    skillId: "central-ideas",
    difficulty: "easy",
    source: P,
    stimulus:
      "Marine biologist Elena Voss spent three summers tagging sea turtles along a remote coastline. Her tags revealed that the turtles traveled much farther between nesting sites than researchers had previously believed, sometimes over 200 miles in a single season.",
    prompt: "Which choice best states the main finding described in the text?",
    choices: [
      { id: "A", text: "Sea turtles nest only once every three years." },
      { id: "B", text: "Turtles avoid remote coastlines during nesting season." },
      { id: "C", text: "Voss tagged turtles for the first time in the history of marine biology." },
      { id: "D", text: "Turtles tagged by Voss traveled farther between nesting sites than expected." },
    ],
    answer: "D",
    explanation:
      "The passage's key finding is the surprising travel distance the tags revealed. The other choices are not supported by, or contradict, the text.",
  },
  {
    id: "r-inf-08",
    testId: "sat",
    subjectId: "rw",
    domainId: "information-ideas",
    skillId: "central-ideas",
    difficulty: "hard",
    source: P,
    stimulus:
      "It is tempting to think of a forest fire as purely destructive. Yet many ecosystems depend on periodic burns: certain pine cones release their seeds only after intense heat cracks them open, and fire clears undergrowth that would otherwise crowd out young trees. Decades of aggressive fire suppression in some regions allowed dead wood to accumulate, so that when fires eventually did occur, they burned hotter and did more lasting damage than the smaller, more frequent fires the ecosystem had evolved with.",
    prompt: "Which choice best describes the overall relationship between ideas in the text?",
    choices: [
      { id: "A", text: "It argues that fire suppression should be replaced entirely with controlled burns." },
      { id: "B", text: "It presents a common assumption about fire, then complicates it by explaining fire's ecological role and the consequences of suppressing it." },
      { id: "C", text: "It compares two competing scientific theories about forest ecology without favoring either." },
      { id: "D", text: "It describes a chronological history of forest fire policy." },
    ],
    answer: "B",
    explanation:
      "The text opens with the assumption that fire is “purely destructive,” then complicates that view by explaining fire's ecological benefits and the harm caused by suppressing it. Only choice B captures this structure.",
  },
  {
    id: "r-inf-09",
    testId: "sat",
    subjectId: "rw",
    domainId: "information-ideas",
    skillId: "command-evidence",
    difficulty: "easy",
    source: P,
    stimulus:
      "Claim: reading printed books before bed improves sleep quality compared with reading on a backlit screen.",
    prompt: "Which finding, if true, would most directly support this claim?",
    choices: [
      { id: "A", text: "Participants who read printed books before bed fell asleep faster and reported more restful sleep than those who read on tablets." },
      { id: "B", text: "Most adults report owning both printed books and tablets." },
      { id: "C", text: "Sales of printed books have declined over the past decade." },
      { id: "D", text: "Backlit screens are more common in bedrooms than in living rooms." },
    ],
    answer: "A",
    explanation:
      "The claim concerns sleep quality differing by reading medium. Only choice A provides a direct comparison of sleep outcomes between the two conditions.",
  },
  {
    id: "r-inf-10",
    testId: "sat",
    subjectId: "rw",
    domainId: "information-ideas",
    skillId: "command-evidence",
    difficulty: "medium",
    source: P,
    stimulus:
      "A city council member argues that installing more streetlights on a certain avenue would reduce nighttime bicycle accidents there.",
    prompt: "Which piece of evidence would most strongly support the council member's argument?",
    choices: [
      { id: "A", text: "A survey found most residents want more streetlights installed." },
      { id: "B", text: "A nearby avenue that added similar streetlights saw nighttime bicycle accidents drop by 40 percent the following year." },
      { id: "C", text: "The avenue currently has fewer streetlights than other avenues in the city." },
      { id: "D", text: "The city's budget includes funds for infrastructure improvements." },
    ],
    answer: "B",
    explanation:
      "The argument is a causal claim about streetlights reducing accidents. Only choice B provides evidence of that causal relationship actually occurring elsewhere.",
  },
  {
    id: "r-inf-11",
    testId: "sat",
    subjectId: "rw",
    domainId: "information-ideas",
    skillId: "command-evidence",
    difficulty: "medium",
    source: P,
    stimulus:
      "A nutritionist claims that eating breakfast improves concentration in elementary school students.",
    prompt: "Which choice, if true, would most weaken the nutritionist's claim?",
    choices: [
      { id: "A", text: "Breakfast foods vary widely in nutritional content." },
      { id: "B", text: "Most elementary schools offer a breakfast program." },
      { id: "C", text: "Students who skip breakfast often report feeling hungry by midmorning." },
      { id: "D", text: "A study found no significant difference in concentration test scores between students who ate breakfast and those who did not." },
    ],
    answer: "D",
    explanation:
      "A claim of improved concentration from eating breakfast is directly undermined by evidence showing no measurable difference in concentration outcomes.",
  },
  {
    id: "r-inf-12",
    testId: "sat",
    subjectId: "rw",
    domainId: "information-ideas",
    skillId: "command-evidence",
    difficulty: "hard",
    source: P,
    stimulus:
      "Economist: a minimum wage increase in Country X led to higher average incomes among low-wage workers without a measurable rise in unemployment, based on employment data collected the year after the policy took effect.",
    prompt:
      "Which additional piece of information would be most useful in evaluating whether the wage increase, rather than some other factor, caused the outcomes described?",
    choices: [
      { id: "A", text: "The exact percentage by which the minimum wage increased." },
      { id: "B", text: "Public opinion polls about the minimum wage increase." },
      { id: "C", text: "The number of years Country X has had a minimum wage law." },
      { id: "D", text: "Employment and income trends in a similar country that did not raise its minimum wage during the same period." },
    ],
    answer: "D",
    explanation:
      "To attribute the outcome to the policy rather than to other economic trends, a comparison with a similar country lacking the policy change is most useful for isolating the wage increase's effect.",
  },
  {
    id: "r-inf-13",
    testId: "sat",
    subjectId: "rw",
    domainId: "information-ideas",
    skillId: "quantitative-evidence",
    difficulty: "easy",
    source: P,
    stimulus:
      "A survey of 500 commuters found that 300 primarily drive to work, 150 primarily take public transit, and the remainder bike or walk.",
    prompt: "Based on the survey, what percentage of commuters primarily drive to work?",
    choices: [
      { id: "A", text: "30%" },
      { id: "B", text: "50%" },
      { id: "C", text: "60%" },
      { id: "D", text: "70%" },
    ],
    answer: "C",
    explanation:
      "300 out of 500 commuters drive, and 300/500 = 0.60, or 60%.",
  },
  {
    id: "r-inf-14",
    testId: "sat",
    subjectId: "rw",
    domainId: "information-ideas",
    skillId: "quantitative-evidence",
    difficulty: "medium",
    source: P,
    stimulus:
      "A researcher recorded the number of hours 8 students spent studying and their exam scores: hours studied — 1, 2, 3, 4, 5, 6, 7, 8; corresponding scores — 62, 66, 71, 75, 78, 84, 88, 91.",
    prompt:
      "Which choice best describes the relationship between hours studied and exam scores shown in the data?",
    choices: [
      { id: "A", text: "Scores decreased and then increased as hours studied increased." },
      { id: "B", text: "A negative association: as hours studied increased, scores tended to decrease." },
      { id: "C", text: "No clear association between the two variables." },
      { id: "D", text: "A positive association: as hours studied increased, scores tended to increase." },
    ],
    answer: "D",
    explanation:
      "The listed scores rise steadily as the number of hours studied rises, indicating a positive association between the two variables.",
  },
  {
    id: "r-inf-15",
    testId: "sat",
    subjectId: "rw",
    domainId: "information-ideas",
    skillId: "quantitative-evidence",
    difficulty: "medium",
    source: P,
    stimulus:
      "A company's quarterly revenue, in millions of dollars, was: Q1: 4.2, Q2: 4.8, Q3: 4.5, Q4: 5.6.",
    prompt:
      "Based on the data, between which two consecutive quarters did revenue increase the most?",
    choices: [
      { id: "A", text: "Q1 to Q2" },
      { id: "B", text: "Q2 to Q3" },
      { id: "C", text: "Q3 to Q4" },
      { id: "D", text: "Revenue was flat throughout the year." },
    ],
    answer: "C",
    explanation:
      "Q1 to Q2 increased by 0.6 million, Q2 to Q3 decreased, and Q3 to Q4 increased by 1.1 million, the largest increase.",
  },
  {
    id: "r-inf-16",
    testId: "sat",
    subjectId: "rw",
    domainId: "information-ideas",
    skillId: "quantitative-evidence",
    difficulty: "hard",
    source: P,
    stimulus:
      "In a study of 200 seedlings, half were given fertilizer A and half fertilizer B. After eight weeks, seedlings given fertilizer A had a mean height of 24 cm with heights ranging from 18 to 30 cm, while seedlings given fertilizer B had a mean height of 22 cm with heights ranging from 10 to 34 cm.",
    prompt: "Which choice is most strongly supported by the data?",
    choices: [
      { id: "A", text: "Fertilizer A produced a higher mean height but less variability in height than fertilizer B." },
      { id: "B", text: "Fertilizer B produced taller seedlings on average than fertilizer A." },
      { id: "C", text: "Every seedling given fertilizer A was taller than every seedling given fertilizer B." },
      { id: "D", text: "Fertilizer A and fertilizer B produced identical results." },
    ],
    answer: "A",
    explanation:
      "Fertilizer A's mean, 24 cm, is higher than fertilizer B's, 22 cm, and its range, 18 to 30, a spread of 12, is narrower than B's range of 10 to 34, a spread of 24, showing a higher mean and less variability, exactly what choice A states.",
  },
  {
    id: "r-inf-17",
    testId: "sat",
    subjectId: "rw",
    domainId: "information-ideas",
    skillId: "inferences",
    difficulty: "easy",
    source: P,
    stimulus:
      "Every member of the chess club who entered the regional tournament last year has since been invited to the state tournament. Maria entered the regional tournament last year.",
    prompt: "Which choice most logically completes the text?",
    choices: [
      { id: "A", text: "Maria will not enter next year's regional tournament." },
      { id: "B", text: "Maria did not enjoy the regional tournament." },
      { id: "C", text: "Maria is the president of the chess club." },
      { id: "D", text: "Maria has since been invited to the state tournament." },
    ],
    answer: "D",
    explanation:
      "The passage states that every regional entrant was invited to state, and Maria was a regional entrant, so it logically follows that she was invited.",
  },
  {
    id: "r-inf-18",
    testId: "sat",
    subjectId: "rw",
    domainId: "information-ideas",
    skillId: "inferences",
    difficulty: "medium",
    source: P,
    stimulus:
      "A gardener noticed that the tomato plants in the shaded part of the garden consistently produced fewer tomatoes than the plants in full sun, even though both groups received identical soil, water, and fertilizer.",
    prompt: "Which choice is the most logical inference based on the text?",
    choices: [
      { id: "A", text: "The gardener used different fertilizer for each group." },
      { id: "B", text: "The shaded plants received less water than the sunny plants." },
      { id: "C", text: "Tomato plants cannot survive in shaded areas." },
      { id: "D", text: "Shade likely played a role in reducing the shaded plants' tomato production." },
    ],
    answer: "D",
    explanation:
      "Since every other variable was held constant and only sunlight exposure differed, shade is the most logical explanation for the difference in yield.",
  },
  {
    id: "r-inf-19",
    testId: "sat",
    subjectId: "rw",
    domainId: "information-ideas",
    skillId: "inferences",
    difficulty: "medium",
    source: P,
    stimulus:
      "A city's public library reported that checkouts of physical books declined by 15 percent over five years, while checkouts of e-books and audiobooks combined increased by 60 percent over the same period, and total checkouts, physical plus digital, rose overall.",
    prompt: "Which choice can most reasonably be inferred from the text?",
    choices: [
      { id: "A", text: "The library increased its budget for physical books." },
      { id: "B", text: "Fewer people used the library overall." },
      { id: "C", text: "Physical books are no longer available at the library." },
      { id: "D", text: "The rise in digital checkouts more than offset the decline in physical checkouts." },
    ],
    answer: "D",
    explanation:
      "Since total checkouts rose despite the drop in physical checkouts, the growth in digital checkouts must have more than made up for that decline.",
  },
  {
    id: "r-inf-20",
    testId: "sat",
    subjectId: "rw",
    domainId: "information-ideas",
    skillId: "inferences",
    difficulty: "hard",
    source: P,
    stimulus:
      "A geologist studying a canyon found sediment layers containing marine fossils near the canyon's rim, hundreds of feet above the nearest current shoreline. The layers showed no signs of having been transported there by later erosion or human activity.",
    prompt: "Which choice most reasonably explains the geologist's finding?",
    choices: [
      { id: "A", text: "The canyon was created entirely by wind erosion." },
      { id: "B", text: "Marine fossils can form in freshwater rivers." },
      { id: "C", text: "The fossils were placed there recently by researchers." },
      { id: "D", text: "The area now forming the canyon's rim was once submerged under a sea or ocean." },
    ],
    answer: "D",
    explanation:
      "Marine fossils embedded in undisturbed rock layers far above current sea level are best explained by the area having once been underwater, with the land later uplifted or the sea level having since dropped.",
  },

  /* ---------------------------------------------------------------- */
  /* Reading & Writing · Craft & Structure (continued)                 */
  /* ---------------------------------------------------------------- */
  {
    id: "r-cra-05",
    testId: "sat",
    subjectId: "rw",
    domainId: "craft-structure",
    skillId: "words-in-context",
    difficulty: "easy",
    source: P,
    stimulus:
      "After months of careful negotiation, the two companies finally reached an agreement that satisfied both sides' central demands.",
    prompt: "As used in the text, “central” most nearly means",
    choices: [
      { id: "A", text: "geographic" },
      { id: "B", text: "unresolved" },
      { id: "C", text: "shared" },
      { id: "D", text: "most important" },
    ],
    answer: "D",
    explanation:
      "“Central demands” refers to the most important demands, not a geographic or literal center.",
  },
  {
    id: "r-cra-06",
    testId: "sat",
    subjectId: "rw",
    domainId: "craft-structure",
    skillId: "words-in-context",
    difficulty: "medium",
    source: P,
    stimulus:
      "The critic praised the novel's spare prose, noting that the author conveyed complex emotion with remarkably few words.",
    prompt: "As used in the text, “spare” most nearly means",
    choices: [
      { id: "A", text: "extra" },
      { id: "B", text: "emotional" },
      { id: "C", text: "harsh" },
      { id: "D", text: "economical" },
    ],
    answer: "D",
    explanation:
      "“Spare prose” paired with “remarkably few words” indicates writing that is economical or sparing in its use of language, not writing that is extra or unused.",
  },
  {
    id: "r-cra-07",
    testId: "sat",
    subjectId: "rw",
    domainId: "craft-structure",
    skillId: "words-in-context",
    difficulty: "hard",
    source: P,
    stimulus:
      "Rather than confront her rival directly, the senator opted for a more oblique approach, raising doubts about his record through carefully placed questions rather than open accusation.",
    prompt: "As used in the text, “oblique” most nearly means",
    choices: [
      { id: "A", text: "direct" },
      { id: "B", text: "honest" },
      { id: "C", text: "aggressive" },
      { id: "D", text: "indirect" },
    ],
    answer: "D",
    explanation:
      "The passage contrasts this approach with confronting the rival “directly” and with “open accusation,” so “oblique” must mean indirect.",
  },
  {
    id: "r-cra-08",
    testId: "sat",
    subjectId: "rw",
    domainId: "craft-structure",
    skillId: "text-structure",
    difficulty: "easy",
    source: P,
    stimulus:
      "The essay begins by describing a single failed harvest in one farming village, then broadens to discuss drought patterns across the entire region, and ends by proposing a policy response at the national level.",
    prompt: "Which choice best describes the overall structure of the text?",
    choices: [
      { id: "A", text: "It refutes a commonly held belief." },
      { id: "B", text: "It compares two competing solutions to the same problem." },
      { id: "C", text: "It presents a chronological history of one village." },
      { id: "D", text: "It moves from a specific example to a broader issue to a proposed solution." },
    ],
    answer: "D",
    explanation:
      "The text explicitly narrows from one village, to a regional pattern, to a national policy proposal, a specific-to-general-to-solution structure.",
  },
  {
    id: "r-cra-09",
    testId: "sat",
    subjectId: "rw",
    domainId: "craft-structure",
    skillId: "text-structure",
    difficulty: "medium",
    source: P,
    stimulus:
      "The article opens with a vivid description of a violinist's final performance before retiring, then shifts to an analysis of how the violinist's technique influenced a generation of younger musicians.",
    prompt:
      "Which choice best describes the function of the opening description in the text as a whole?",
    choices: [
      { id: "A", text: "It provides a vivid entry point before the text turns to the violinist's broader influence." },
      { id: "B", text: "It refutes a claim made later in the text." },
      { id: "C", text: "It presents statistical evidence for the violinist's fame." },
      { id: "D", text: "It introduces a debate between two music critics." },
    ],
    answer: "A",
    explanation:
      "The opening scene serves as a narrative hook that leads into the text's actual focus, the violinist's lasting influence, matching choice A.",
  },
  {
    id: "r-cra-10",
    testId: "sat",
    subjectId: "rw",
    domainId: "craft-structure",
    skillId: "text-structure",
    difficulty: "medium",
    source: P,
    stimulus:
      "The report first lists the benefits reported by early adopters of a new irrigation system, then devotes equal space to the system's maintenance costs and failure rates reported by the same group.",
    prompt: "Which choice best describes the overall structure of the text?",
    choices: [
      { id: "A", text: "It focuses exclusively on the system's costs." },
      { id: "B", text: "It argues that the irrigation system has no drawbacks." },
      { id: "C", text: "It traces the historical development of irrigation technology." },
      { id: "D", text: "It presents both benefits and drawbacks of the irrigation system in balanced fashion." },
    ],
    answer: "D",
    explanation:
      "The passage gives roughly equal treatment to benefits and drawbacks, indicating a balanced structure rather than an argument favoring one side.",
  },
  {
    id: "r-cra-11",
    testId: "sat",
    subjectId: "rw",
    domainId: "craft-structure",
    skillId: "text-structure",
    difficulty: "hard",
    source: P,
    stimulus:
      "The historian's chapter opens by presenting the traditional narrative of the treaty's signing as a moment of clear diplomatic triumph. It then introduces newly translated correspondence suggesting that key terms were disputed for years afterward, and closes by suggesting that the traditional narrative oversimplifies a much messier outcome.",
    prompt: "Which choice best describes the overall structure of the text?",
    choices: [
      { id: "A", text: "It presents an accepted narrative, complicates it with new evidence, and concludes by questioning that narrative." },
      { id: "B", text: "It presents two narratives without evaluating either." },
      { id: "C", text: "It disproves the existence of the treaty entirely." },
      { id: "D", text: "It summarizes the treaty's terms in chronological order." },
    ],
    answer: "A",
    explanation:
      "The passage states a conventional view, complicates it with newly introduced evidence, and ends with a reassessment of that view, matching choice A.",
  },
  {
    id: "r-cra-12",
    testId: "sat",
    subjectId: "rw",
    domainId: "craft-structure",
    skillId: "cross-text",
    difficulty: "easy",
    source: P,
    stimulus:
      "Text 1: researcher Mendez argues that remote work increases employee productivity by eliminating commute time and office distractions.\n\nText 2: researcher Okafor argues that remote work decreases collaboration and can slow projects that require frequent real-time input from multiple team members.",
    prompt: "Based on the texts, how would Okafor most likely respond to Mendez's argument?",
    choices: [
      { id: "A", text: "By agreeing that eliminating commute time is the most important factor in productivity." },
      { id: "B", text: "By pointing out that reduced collaboration can offset the productivity gains Mendez describes." },
      { id: "C", text: "By arguing that office distractions do not exist." },
      { id: "D", text: "By stating that remote work should be banned entirely." },
    ],
    answer: "B",
    explanation:
      "Okafor's concern about reduced collaboration directly complicates Mendez's claim of increased productivity, which is what choice B states.",
  },
  {
    id: "r-cra-13",
    testId: "sat",
    subjectId: "rw",
    domainId: "craft-structure",
    skillId: "cross-text",
    difficulty: "medium",
    source: P,
    stimulus:
      "Text 1: economist Reyes contends that raising interest rates is the most effective way to control inflation, even at the cost of slower economic growth.\n\nText 2: economist Tran contends that raising interest rates disproportionately harms small businesses reliant on borrowing, and that inflation should instead be addressed through targeted subsidies.",
    prompt: "Which choice best describes a key difference between Reyes's and Tran's positions?",
    choices: [
      { id: "A", text: "Reyes prioritizes controlling inflation directly, while Tran prioritizes protecting borrowers from the side effects of that approach." },
      { id: "B", text: "Reyes and Tran agree that subsidies are the best solution." },
      { id: "C", text: "Tran believes inflation is not a real economic concern." },
      { id: "D", text: "Reyes and Tran both reject raising interest rates." },
    ],
    answer: "A",
    explanation:
      "Reyes favors direct inflation control via interest rates despite trade-offs, while Tran favors an alternative that avoids harming borrowers, the core disagreement choice A identifies.",
  },
  {
    id: "r-cra-14",
    testId: "sat",
    subjectId: "rw",
    domainId: "craft-structure",
    skillId: "cross-text",
    difficulty: "medium",
    source: P,
    stimulus:
      "Text 1: a team of botanists concludes that a rare orchid species relies exclusively on a single moth species for pollination, based on years of field observation showing no other visitors to its flowers.\n\nText 2: a second team, using motion-triggered cameras at multiple sites, documents three additional insect species visiting the same orchid's flowers, though far less frequently than the moth.",
    prompt: "How does the second team's finding relate to the first team's conclusion?",
    choices: [
      { id: "A", text: "It confirms the first team's conclusion exactly." },
      { id: "B", text: "It is unrelated to the first team's research." },
      { id: "C", text: "It proves the orchid does not need any pollinator." },
      { id: "D", text: "It complicates the claim of exclusive reliance on one pollinator by identifying other occasional visitors." },
    ],
    answer: "D",
    explanation:
      "The second team's cameras documented other visiting species, which complicates, without fully disproving, the first team's claim of exclusive reliance on a single pollinator.",
  },
  {
    id: "r-cra-15",
    testId: "sat",
    subjectId: "rw",
    domainId: "craft-structure",
    skillId: "cross-text",
    difficulty: "hard",
    source: P,
    stimulus:
      "Text 1: sociologist Park argues that social media use among teenagers correlates with increased reports of anxiety, and concludes that reducing screen time should be a public health priority.\n\nText 2: sociologist Ibsen, analyzing the same national survey data, finds that the correlation Park identifies disappears once family income and school stress levels are statistically controlled for, suggesting the true causes lie elsewhere.",
    prompt: "Which choice best describes how Ibsen's findings relate to Park's argument?",
    choices: [
      { id: "A", text: "They support Park's conclusion by confirming the correlation." },
      { id: "B", text: "They challenge Park's conclusion by suggesting the correlation may be explained by other factors rather than social media use itself." },
      { id: "C", text: "They are based on entirely different data than Park used." },
      { id: "D", text: "They show that anxiety among teenagers has not increased." },
    ],
    answer: "B",
    explanation:
      "Ibsen uses the same data but shows the correlation vanishes once other factors are controlled for, which undercuts Park's causal claim rather than confirming it, matching choice B.",
  },

  /* ---------------------------------------------------------------- */
  /* Reading & Writing · Expression of Ideas (continued)               */
  /* ---------------------------------------------------------------- */
  {
    id: "r-exp-04",
    testId: "sat",
    subjectId: "rw",
    domainId: "expression-ideas",
    skillId: "transitions",
    difficulty: "easy",
    source: P,
    stimulus:
      "The bakery's ovens broke down the morning of the festival. ______ the staff borrowed equipment from a neighboring restaurant and finished all the orders on time.",
    prompt: "Which choice completes the text with the most logical transition?",
    choices: [
      { id: "A", text: "For example," },
      { id: "B", text: "As a result," },
      { id: "C", text: "Similarly," },
      { id: "D", text: "Nevertheless," },
    ],
    answer: "D",
    explanation:
      "The staff overcame the setback described in the first sentence, so a contrast transition like “Nevertheless” is needed, not a cause-effect or example transition.",
  },
  {
    id: "r-exp-05",
    testId: "sat",
    subjectId: "rw",
    domainId: "expression-ideas",
    skillId: "transitions",
    difficulty: "medium",
    source: P,
    stimulus:
      "The committee reviewed dozens of proposals for the new park design. ______ they narrowed the field to three finalists before opening a public vote.",
    prompt: "Which choice completes the text with the most logical transition?",
    choices: [
      { id: "A", text: "In contrast," },
      { id: "B", text: "For instance," },
      { id: "C", text: "Otherwise," },
      { id: "D", text: "Ultimately," },
    ],
    answer: "D",
    explanation:
      "The sentence describes the final step in a process that began with reviewing proposals, so “Ultimately” correctly signals the concluding step.",
  },
  {
    id: "r-exp-06",
    testId: "sat",
    subjectId: "rw",
    domainId: "expression-ideas",
    skillId: "transitions",
    difficulty: "hard",
    source: P,
    stimulus:
      "Some economists predicted that automation would eliminate more jobs than it created. ______ employment in several automated industries has grown over the past decade, as new roles emerged to design, maintain, and oversee the new systems.",
    prompt: "Which choice completes the text with the most logical transition?",
    choices: [
      { id: "A", text: "Consequently," },
      { id: "B", text: "Specifically," },
      { id: "C", text: "Similarly," },
      { id: "D", text: "In fact," },
    ],
    answer: "D",
    explanation:
      "The second sentence reports an outcome that runs counter to the prediction in the first sentence, and “In fact” signals this correction, unlike the other options, which imply agreement or mere elaboration.",
  },
  {
    id: "r-exp-07",
    testId: "sat",
    subjectId: "rw",
    domainId: "expression-ideas",
    skillId: "rhetorical-synthesis",
    difficulty: "easy",
    source: P,
    stimulus:
      "A student is comparing two poets. Notes:\n• Poet A wrote primarily about rural landscapes.\n• Poet B wrote primarily about urban life.\n• Both poets frequently used first-person narration.\n• Poet A published five collections; Poet B published three.",
    prompt:
      "The student wants to present one similarity between the two poets. Which choice most effectively uses relevant information from the notes to accomplish this goal?",
    choices: [
      { id: "A", text: "Poet A wrote about rural landscapes, while Poet B focused on urban life." },
      { id: "B", text: "Despite their different subject matter, both Poet A and Poet B frequently wrote in the first person." },
      { id: "C", text: "Poet A published five collections, more than Poet B's three." },
      { id: "D", text: "Poet A and Poet B wrote during different periods." },
    ],
    answer: "B",
    explanation:
      "The goal is to state a similarity. Only choice B identifies a shared trait, first-person narration, between the two poets.",
  },
  {
    id: "r-exp-08",
    testId: "sat",
    subjectId: "rw",
    domainId: "expression-ideas",
    skillId: "rhetorical-synthesis",
    difficulty: "medium",
    source: P,
    stimulus:
      "A writer is introducing a report. Notes:\n• Study followed 1,200 adults over 10 years.\n• Researchers tracked sleep duration and cardiovascular health.\n• Adults sleeping fewer than 6 hours nightly had notably higher rates of heart disease.\n• The study was funded by a university research grant.",
    prompt:
      "The writer wants to introduce the report to an audience unfamiliar with the topic by stating its main finding. Which choice most effectively uses relevant information from the notes to accomplish this goal?",
    choices: [
      { id: "A", text: "A university funded a ten-year study of 1,200 adults." },
      { id: "B", text: "A new study found that adults who sleep fewer than six hours a night have notably higher rates of heart disease." },
      { id: "C", text: "Researchers are interested in sleep duration and cardiovascular health." },
      { id: "D", text: "The study lasted ten years and tracked many participants." },
    ],
    answer: "B",
    explanation:
      "The goal is to state the main finding for an unfamiliar audience. Choice B is the only option that states the actual result rather than a background detail.",
  },
  {
    id: "r-exp-09",
    testId: "sat",
    subjectId: "rw",
    domainId: "expression-ideas",
    skillId: "rhetorical-synthesis",
    difficulty: "medium",
    source: P,
    stimulus:
      "A student is comparing two farming methods. Notes:\n• Traditional farming in the region relies on manual labor and crop rotation.\n• A newly introduced method uses automated sensors to monitor soil moisture.\n• The new method reduced water usage by 30 percent in trial fields.\n• Both methods are still used in the region today.",
    prompt:
      "The student wants to emphasize a contrast between two approaches to farming. Which choice most effectively uses relevant information from the notes to accomplish this goal?",
    choices: [
      { id: "A", text: "Both farming methods are still used in the region today." },
      { id: "B", text: "Farmers rotate crops to maintain soil health." },
      { id: "C", text: "The region has a long history of farming." },
      { id: "D", text: "While traditional farming relies on manual labor and crop rotation, the newly introduced sensor-based method cut water usage by 30 percent in trials." },
    ],
    answer: "D",
    explanation:
      "The goal is contrast. Choice D directly juxtaposes the traditional method's characteristics with the new method's water-saving results, unlike the other choices, which state only one fact or unrelated background.",
  },
  {
    id: "r-exp-10",
    testId: "sat",
    subjectId: "rw",
    domainId: "expression-ideas",
    skillId: "rhetorical-synthesis",
    difficulty: "hard",
    source: P,
    stimulus:
      "A researcher is explaining a surprising result. Notes:\n• Prior studies found that higher classroom temperatures reduce student test performance.\n• A new study tested classrooms kept at 78°F, warmer than prior studies' ranges.\n• Students in the new study scored the same as students in cooler classrooms once air quality was controlled for.\n• Researchers suggest air quality, not temperature alone, may explain earlier findings.",
    prompt:
      "The researcher wants to explain why a particular result was surprising, for an audience of fellow scientists. Which choice most effectively uses relevant information from the notes to accomplish this goal?",
    choices: [
      { id: "A", text: "Prior studies examined classroom temperature and its effects on test performance." },
      { id: "B", text: "Although prior research linked higher classroom temperatures to lower test scores, the new study found no such effect once air quality was controlled for, suggesting air quality, not temperature, may explain the earlier results." },
      { id: "C", text: "The new study tested classrooms kept at 78°F." },
      { id: "D", text: "Researchers are interested in how classrooms affect learning." },
    ],
    answer: "B",
    explanation:
      "Explaining why a result is surprising requires contrasting the expected finding with the actual result and its proposed explanation. Only choice B does all three.",
  },

  /* ---------------------------------------------------------------- */
  /* Reading & Writing · Standard English Conventions (continued)      */
  /* ---------------------------------------------------------------- */
  {
    id: "r-sec-06",
    testId: "sat",
    subjectId: "rw",
    domainId: "standard-conventions",
    skillId: "boundaries",
    difficulty: "easy",
    source: P,
    stimulus: "The museum's new exhibit features ______.",
    prompt:
      "Which choice completes the text so that it conforms to the conventions of Standard English?",
    choices: [
      { id: "A", text: "fossils, artifacts and, interactive displays" },
      { id: "B", text: "fossils artifacts, and interactive displays" },
      { id: "C", text: "fossils, artifacts, and interactive displays" },
      { id: "D", text: "fossils; artifacts; and interactive displays" },
    ],
    answer: "C",
    explanation:
      "Items in a series of three or more require commas separating each item, including before “and”: “fossils, artifacts, and interactive displays.”",
  },
  {
    id: "r-sec-07",
    testId: "sat",
    subjectId: "rw",
    domainId: "standard-conventions",
    skillId: "boundaries",
    difficulty: "medium",
    source: P,
    stimulus:
      "The novel, ______ many critics consider the author's finest work, took over a decade to write.",
    prompt:
      "Which choice completes the text so that it conforms to the conventions of Standard English?",
    choices: [
      { id: "A", text: "who" },
      { id: "B", text: "that" },
      { id: "C", text: "which" },
      { id: "D", text: "whom" },
    ],
    answer: "C",
    explanation:
      "The clause “many critics consider the author's finest work” is nonessential information about “the novel” and is correctly set off with commas and introduced by “which,” not “that,” which is used for essential clauses.",
  },
  {
    id: "r-sec-08",
    testId: "sat",
    subjectId: "rw",
    domainId: "standard-conventions",
    skillId: "boundaries",
    difficulty: "hard",
    source: P,
    stimulus:
      "Three finalists remain in the competition______ each of whom has advanced through two earlier rounds of judging.",
    prompt:
      "Which choice completes the text so that it conforms to the conventions of Standard English?",
    choices: [
      { id: "A", text: "," },
      { id: "B", text: ";" },
      { id: "C", text: ":" },
      { id: "D", text: "(no punctuation)" },
    ],
    answer: "A",
    explanation:
      "“Each of whom has advanced through two earlier rounds of judging” is a nonessential clause providing extra information about the finalists and must be set off with a comma, not joined with a semicolon or colon, which introduce independent clauses or lists.",
  },
  {
    id: "r-sec-09",
    testId: "sat",
    subjectId: "rw",
    domainId: "standard-conventions",
    skillId: "subject-verb",
    difficulty: "easy",
    source: P,
    stimulus: "The list of ingredients ______ printed on the back of the box.",
    prompt:
      "Which choice completes the text so that it conforms to the conventions of Standard English?",
    choices: [
      { id: "A", text: "is" },
      { id: "B", text: "are" },
      { id: "C", text: "were" },
      { id: "D", text: "have been" },
    ],
    answer: "A",
    explanation:
      "The subject is the singular “list,” not the plural “ingredients,” which is part of a prepositional phrase, so it takes the singular verb “is.”",
  },
  {
    id: "r-sec-10",
    testId: "sat",
    subjectId: "rw",
    domainId: "standard-conventions",
    skillId: "subject-verb",
    difficulty: "medium",
    source: P,
    stimulus: "Neither the coach nor the players ______ satisfied with the referee's final call.",
    prompt:
      "Which choice completes the text so that it conforms to the conventions of Standard English?",
    choices: [
      { id: "A", text: "was" },
      { id: "B", text: "is" },
      { id: "C", text: "were" },
      { id: "D", text: "has been" },
    ],
    answer: "C",
    explanation:
      "In a “neither...nor” construction, the verb agrees with the nearer subject, here the plural “players,” so the plural verb “were” is correct.",
  },
  {
    id: "r-sec-11",
    testId: "sat",
    subjectId: "rw",
    domainId: "standard-conventions",
    skillId: "subject-verb",
    difficulty: "medium",
    source: P,
    stimulus:
      "Each of the paintings in the gallery's new collection ______ restored by a different specialist.",
    prompt:
      "Which choice completes the text so that it conforms to the conventions of Standard English?",
    choices: [
      { id: "A", text: "were" },
      { id: "B", text: "are" },
      { id: "C", text: "was" },
      { id: "D", text: "have been" },
    ],
    answer: "C",
    explanation:
      "“Each” is singular regardless of the plural noun that follows it in the prepositional phrase, so the singular verb “was” is correct.",
  },
  {
    id: "r-sec-12",
    testId: "sat",
    subjectId: "rw",
    domainId: "standard-conventions",
    skillId: "subject-verb",
    difficulty: "hard",
    source: P,
    stimulus:
      "The committee, along with several outside advisors, ______ expected to release its recommendations by the end of the month.",
    prompt:
      "Which choice completes the text so that it conforms to the conventions of Standard English?",
    choices: [
      { id: "A", text: "is" },
      { id: "B", text: "are" },
      { id: "C", text: "were" },
      { id: "D", text: "have been" },
    ],
    answer: "A",
    explanation:
      "The subject is the singular “committee”; “along with several outside advisors” is a parenthetical phrase that does not change the number of the subject, so the singular verb “is” is correct.",
  },
  {
    id: "r-sec-13",
    testId: "sat",
    subjectId: "rw",
    domainId: "standard-conventions",
    skillId: "form-structure-sense",
    difficulty: "easy",
    source: P,
    stimulus: "Determined to finish the marathon, ______.",
    prompt:
      "Which choice completes the text so that it conforms to the conventions of Standard English?",
    choices: [
      { id: "A", text: "the final mile felt endless to Priya" },
      { id: "B", text: "Priya pushed through the final mile" },
      { id: "C", text: "it was the final mile that felt endless" },
      { id: "D", text: "the final mile was pushed through by Priya" },
    ],
    answer: "B",
    explanation:
      "The introductory phrase “Determined to finish the marathon” must modify the subject of the main clause. Only choice B places Priya, the person who is determined, as that subject, avoiding a dangling modifier.",
  },
  {
    id: "r-sec-14",
    testId: "sat",
    subjectId: "rw",
    domainId: "standard-conventions",
    skillId: "form-structure-sense",
    difficulty: "medium",
    source: P,
    stimulus:
      "The engineer's proposal, though promising, ______ significant additional testing before it could be approved for use.",
    prompt:
      "Which choice completes the text so that it conforms to the conventions of Standard English?",
    choices: [
      { id: "A", text: ", require" },
      { id: "B", text: "requiring" },
      { id: "C", text: "required" },
      { id: "D", text: "require" },
    ],
    answer: "C",
    explanation:
      "The sentence needs a single main verb for its subject, “proposal.” “Required” completes the sentence as a grammatically complete independent clause, while the other options fail to form one.",
  },
  {
    id: "r-sec-15",
    testId: "sat",
    subjectId: "rw",
    domainId: "standard-conventions",
    skillId: "form-structure-sense",
    difficulty: "hard",
    source: P,
    stimulus:
      "Having spent months restoring the old lighthouse______ the town finally reopened it to visitors this summer.",
    prompt:
      "Which choice completes the text so that it conforms to the conventions of Standard English?",
    choices: [
      { id: "A", text: "," },
      { id: "B", text: ";" },
      { id: "C", text: ", and" },
      { id: "D", text: "(no punctuation)" },
    ],
    answer: "A",
    explanation:
      "“Having spent months restoring the old lighthouse” is an introductory participial phrase that must be set off from the independent clause with a comma; a semicolon or “and” would incorrectly treat the phrase as an independent clause.",
  },
  {
    id: "r-cra-16",
    testId: "sat",
    subjectId: "rw",
    domainId: "craft-structure",
    skillId: "text-structure",
    difficulty: "medium",
    source: P,
    stimulus:
      "A conservator noticed that one corner of the portrait had begun to crack in a pattern the rest of the canvas did not share. An X-ray taken to explain the cracking showed a second, earlier figure beneath the visible one, painted in a much thicker layer. The finding has reopened the question of who commissioned the work, since the painter is not known to have reused a canvas except when a sitter withdrew.",
    prompt: "Which choice best describes the overall structure of the text?",
    choices: [
      {
        id: "A",
        text: "It argues that the portrait has been attributed to the wrong painter.",
      },
      { id: "B", text: "It compares two techniques for examining paintings and recommends one." },
      { id: "C", text: "It traces the painting's ownership from its commission to the present." },
      { id: "D", text: "It reports an unexplained detail, describes what investigating it revealed, and notes the question that revelation reopens." },
    ],
    answer: "D",
    explanation:
      "The text moves from an observation, the odd cracking, to the X-ray that explained it, to an open question the result raises. It recommends no technique, follows no ownership history, and stops short of claiming a misattribution.",
  },
  {
    id: "r-cra-17",
    testId: "sat",
    subjectId: "rw",
    domainId: "craft-structure",
    skillId: "cross-text",
    difficulty: "hard",
    source: P,
    stimulus:
      "Text 1: Ecologist Ruth Bamiro argues that street trees cool a city chiefly by shading pavement, and that planting should therefore be concentrated where pavement is widest.\n\nText 2: Ecologist Tomas Halvard does not dispute that shade lowers surface temperature during the day. He notes, however, that measurements taken after dark show the largest differences in air temperature between planted and unplanted streets, when no shade is being cast, which he attributes to water released by the leaves.",
    prompt: "Based on the texts, how would Halvard most likely respond to Bamiro's planting proposal?",
    choices: [
      { id: "A", text: "By denying that shade has any measurable cooling effect." },
      {
        id: "B",
        text: "By accepting that shade cools pavement while arguing that it is not the whole effect, so pavement width is the wrong thing to plant by.",
      },
      { id: "C", text: "By agreeing that planting should follow pavement width, for a different reason." },
      { id: "D", text: "By arguing that street trees make city streets warmer overall." },
    ],
    answer: "B",
    explanation:
      "Halvard grants the daytime shading effect outright and objects only to its being the whole story, since the largest differences appear when no shade is cast. A contradicts his first sentence, and C and D attribute positions he never takes.",
  },
  {
    id: "r-cra-18",
    testId: "sat",
    subjectId: "rw",
    domainId: "craft-structure",
    skillId: "words-in-context",
    difficulty: "medium",
    source: P,
    stimulus:
      "The new levees did not stop the flooding outright, but they checked the river's spread long enough for the low-lying farms to be cleared.",
    prompt: "As used in the text, \u201cchecked\u201d most nearly means",
    choices: [
      { id: "A", text: "reversed" },
      { id: "B", text: "inspected" },
      { id: "C", text: "marked" },
      { id: "D", text: "restrained" },
    ],
    answer: "D",
    explanation:
      "The levees slowed the spread without stopping it, so the word means held back. \u201cInspected\u201d and \u201cmarked\u201d are other senses of the same word that this sentence does not support, and \u201creversed\u201d contradicts \u201cdid not stop the flooding outright\u201d.",
  },
  {
    id: "r-exp-11",
    testId: "sat",
    subjectId: "rw",
    domainId: "expression-ideas",
    skillId: "transitions",
    difficulty: "medium",
    source: P,
    stimulus:
      "Sodium-ion cells are built from cheap and abundant materials, and they tolerate cold far better than the lithium cells now in most vehicles. ______ they store less energy for their weight, which is why their first commercial uses have been stationary storage rather than cars.",
    prompt: "Which choice completes the text with the most logical transition?",
    choices: [
      { id: "A", text: "Likewise," },
      { id: "B", text: "In turn," },
      { id: "C", text: "On the other hand," },
      { id: "D", text: "For instance," },
    ],
    answer: "C",
    explanation:
      "The first sentence lists advantages and the second gives the drawback that limits where the cells are used, so the transition has to signal contrast. \u201cLikewise\u201d would add a further advantage, and \u201cin turn\u201d would make the drawback a consequence of the advantages.",
  },
  {
    id: "r-exp-12",
    testId: "sat",
    subjectId: "rw",
    domainId: "expression-ideas",
    skillId: "rhetorical-synthesis",
    difficulty: "hard",
    source: P,
    stimulus:
      "While researching, a student took these notes:\n\u2022 A seed vault on an Arctic island stores duplicates of seed collections held elsewhere.\n\u2022 It holds more than a million samples from over eighty depositing institutions.\n\u2022 Depositors keep ownership of what they deposit and are the only ones who may withdraw it.\n\u2022 The first withdrawal was made by a gene bank that had to leave its own country.",
    prompt:
      "The student wants to explain the vault's purpose to an audience unfamiliar with it. Which choice most effectively uses relevant information from the notes to accomplish this goal?",
    choices: [
      { id: "A", text: "The vault holds more than a million samples from over eighty institutions." },
      {
        id: "B",
        text: "The vault is a backup: institutions deposit duplicates of their own seed collections, keep ownership of them, and withdraw them if their own collection becomes unreachable, as one gene bank did after leaving its country.",
      },
      { id: "C", text: "The seed vault is located on an Arctic island." },
      { id: "D", text: "Only depositors may withdraw the seeds they have placed in the vault." },
    ],
    answer: "B",
    explanation:
      "Explaining the purpose means saying what the vault is for, not only what it holds. Only B joins the duplicate deposits, the ownership rule and the withdrawal into an account of why the vault exists; A, C and D each state a single fact without it.",
  },
  {
    id: "r-sec-16",
    testId: "sat",
    subjectId: "rw",
    domainId: "standard-conventions",
    skillId: "boundaries",
    difficulty: "medium",
    source: P,
    stimulus:
      "The crew brought only what the crossing required______ rope, a spare sail, and four weeks of water.",
    prompt:
      "Which choice completes the text so that it conforms to the conventions of Standard English?",
    choices: [
      { id: "A", text: ":" },
      { id: "B", text: ";" },
      { id: "C", text: "," },
      { id: "D", text: "(no punctuation)" },
    ],
    answer: "A",
    explanation:
      "A complete clause followed by a list that spells it out takes a colon. A semicolon would require a second independent clause after it, and a comma or no punctuation would leave the list running on from the clause.",
  },
  {
    id: "r-inf-21",
    testId: "sat",
    subjectId: "rw",
    domainId: "information-ideas",
    skillId: "central-ideas",
    difficulty: "medium",
    source: P,
    stimulus:
      "For sixty years the standard account held that the city's medieval walls went up in a single campaign. A survey of mortar samples has now identified three distinct recipes, each matching a period decades apart, and the sections built with them meet at joins that earlier surveys read as later repairs. On this evidence the walls are the work of three generations rather than one.",
    prompt: "Which choice best states the main idea of the text?",
    choices: [
      { id: "A", text: "The walls were repaired several times after being built in one campaign." },
      {
        id: "B",
        text: "Mortar analysis indicates the walls were raised in three phases rather than all at once.",
      },
      { id: "C", text: "Medieval builders in the city used unusually poor mortar." },
      { id: "D", text: "The survey was the first scientific study the walls had received." },
    ],
    answer: "B",
    explanation:
      "The finding and the conclusion drawn from it are the same point: three mortar recipes decades apart mean three building phases. A is the account the evidence overturns, and C and D are claims the text never makes.",
  },
  {
    id: "r-inf-22",
    testId: "sat",
    subjectId: "rw",
    domainId: "information-ideas",
    skillId: "command-evidence",
    difficulty: "hard",
    source: P,
    stimulus:
      "A research team proposes that a species of desert ant finds its way home by keeping a running count of its own steps rather than by using landmarks, which are scarce on the salt flats it crosses.",
    prompt: "Which finding, if true, would most strongly support the team's proposal?",
    choices: [
      {
        id: "A",
        text: "Ants whose legs were lengthened before the return journey overshot the nest by a distance matching their longer stride.",
      },
      { id: "B", text: "Ants followed nearly the same route on consecutive days." },
      { id: "C", text: "Ants moved faster in the early morning than at midday." },
      { id: "D", text: "Nest entrances were usually within a few metres of a shrub." },
    ],
    answer: "A",
    explanation:
      "If the ants counted steps, changing the length of a step would change where the count runs out — which is exactly the error described. B is consistent with landmarks as well, C says nothing about navigation, and D points toward landmarks rather than away from them.",
  },
  {
    id: "r-inf-23",
    testId: "sat",
    subjectId: "rw",
    domainId: "information-ideas",
    skillId: "quantitative-evidence",
    difficulty: "medium",
    source: P,
    stimulus:
      "A school recorded the share of pupils cycling to school over four years: Year 1, 8%; Year 2, 9%; Year 3, 14%; Year 4, 22%. A protected cycle lane to the school opened halfway through Year 3.",
    prompt:
      "Which choice most effectively uses data from the record to support the claim that the lane increased cycling?",
    choices: [
      { id: "A", text: "In Year 4, 22% of pupils cycled to school." },
      {
        id: "B",
        text: "Cycling rose by one percentage point across the two years before the lane opened and by thirteen across the two years spanning and following its opening.",
      },
      { id: "C", text: "In none of the four years did more than a quarter of pupils cycle." },
      { id: "D", text: "The share of pupils cycling was at its lowest in Year 1." },
    ],
    answer: "B",
    explanation:
      "The claim is about the lane, so the evidence has to compare the period before it with the period after. B is the only choice that does. A, C and D each state a true figure that would look the same whether or not the lane had been built.",
  },
  {
    id: "r-inf-24",
    testId: "sat",
    subjectId: "rw",
    domainId: "information-ideas",
    skillId: "inferences",
    difficulty: "hard",
    source: P,
    stimulus:
      "An ice core from the glacier holds a band of volcanic glass at the depth corresponding to 1815. Tree rings in the valley below are unusually narrow for the three summers that followed. Rings from a sheltered grove two valleys away show no narrowing at all in those years.",
    prompt: "Which choice most logically completes the text?",
    choices: [
      { id: "A", text: "the eruption must have occurred later than the ice core suggests." },
      { id: "B", text: "the sheltered grove is older than the trees in the valley below." },
      { id: "C", text: "volcanic glass prevents trees from growing." },
      { id: "D", text: "the conditions recorded by the narrow rings did not reach every site in the region." },
    ],
    answer: "D",
    explanation:
      "Two sites, one eruption, and only one set of narrow rings: whatever the trees below were responding to, it did not reach the sheltered grove. Nothing in the text bears on the date of the eruption, the age of the grove, or any direct effect of the glass on growth.",
  },
  {
    id: "r-cra-19",
    testId: "sat",
    subjectId: "rw",
    domainId: "craft-structure",
    skillId: "words-in-context",
    difficulty: "easy",
    source: P,
    stimulus:
      "The composer's late works are admired for their economy: whole movements are built from a single unadorned figure, repeated and turned rather than added to.",
    prompt: "As used in the text, \u201ceconomy\u201d most nearly means",
    choices: [
      { id: "A", text: "restraint in means" },
      { id: "B", text: "affordability" },
      { id: "C", text: "prosperity" },
      { id: "D", text: "haste" },
    ],
    answer: "A",
    explanation:
      "The colon explains the word: a movement made from one small figure uses very little material. B and C are the financial senses of the word, which the sentence has nothing to do with, and D confuses using little with working quickly.",
  },
  {
    id: "r-cra-20",
    testId: "sat",
    subjectId: "rw",
    domainId: "craft-structure",
    skillId: "text-structure",
    difficulty: "medium",
    source: P,
    stimulus:
      "The chapter opens with an inventory of what the expedition carried, sets it beside the inventory of an earlier expedition that ended in disaster, and then argues that the difference between the two lists explains very little about why one party returned and the other did not.",
    prompt: "Which choice best describes the overall structure of the text?",
    choices: [
      {
        id: "A",
        text: "It lays out two sets of details and then argues against the conclusion usually drawn from them.",
      },
      { id: "B", text: "It narrates one expedition in the order its events occurred." },
      { id: "C", text: "It gives instructions for equipping a modern expedition." },
      { id: "D", text: "It argues that the earlier expedition failed because it was badly equipped." },
    ],
    answer: "A",
    explanation:
      "The chapter supplies the comparison and then refuses the inference from it. D is the conclusion the chapter rejects, and B and C describe things it does not do.",
  },
  {
    id: "r-cra-21",
    testId: "sat",
    subjectId: "rw",
    domainId: "craft-structure",
    skillId: "cross-text",
    difficulty: "medium",
    source: P,
    stimulus:
      "Text 1: Linguist Ada Ferreira argues that a written standard slows language change, because a fixed spelling gives every generation the same form to learn.\n\nText 2: Linguist Owen Marsh observes that in the six centuries since English spelling settled, pronunciation has moved so far from it that spelling and speech now disagree in most common words. What the written standard preserved, he argues, is the older form on the page, not the older sound in the mouth.",
    prompt: "Based on the texts, how would Marsh most likely respond to Ferreira's argument?",
    choices: [
      { id: "A", text: "By denying that English spelling was ever standardised." },
      {
        id: "B",
        text: "By accepting that a written standard preserves older forms while denying that it slowed the change of the spoken language.",
      },
      { id: "C", text: "By agreeing that a fixed spelling has held pronunciation steady." },
      { id: "D", text: "By arguing that spelling should now be reformed to match speech." },
    ],
    answer: "B",
    explanation:
      "Marsh grants the preservation and locates it on the page rather than in speech, which is precisely a concession plus a limit. C is the claim he is arguing against, and A and D are positions he never takes.",
  },
  {
    id: "r-cra-22",
    testId: "sat",
    subjectId: "rw",
    domainId: "craft-structure",
    skillId: "words-in-context",
    difficulty: "hard",
    source: P,
    stimulus:
      "The report's tone is measured throughout, but its conclusions are anything but tentative: it names the failures, and it names who is answerable for them.",
    prompt: "As used in the text, \u201cmeasured\u201d most nearly means",
    choices: [
      { id: "A", text: "rhythmic" },
      { id: "B", text: "quantified" },
      { id: "C", text: "restrained" },
      { id: "D", text: "hesitant" },
    ],
    answer: "C",
    explanation:
      "The contrast is between how the report sounds and how firm it is, so the word describes a controlled manner. D would make the sentence contradict itself, since it goes on to say the conclusions are not tentative, and A and B are senses the sentence does not support.",
  },
  {
    id: "r-exp-13",
    testId: "sat",
    subjectId: "rw",
    domainId: "expression-ideas",
    skillId: "transitions",
    difficulty: "easy",
    source: P,
    stimulus:
      "The museum has no lift, and its upper floors are reached by a single narrow stair. ______ the largest works in the collection are shown on the ground floor.",
    prompt: "Which choice completes the text with the most logical transition?",
    choices: [
      { id: "A", text: "In contrast," },
      { id: "B", text: "However," },
      { id: "C", text: "Nevertheless," },
      { id: "D", text: "Accordingly," },
    ],
    answer: "D",
    explanation:
      "The second sentence states what follows from the first: a large work cannot go up a narrow stair, so it stays downstairs. The other three all signal a contrast that is not there.",
  },
  {
    id: "r-exp-14",
    testId: "sat",
    subjectId: "rw",
    domainId: "expression-ideas",
    skillId: "rhetorical-synthesis",
    difficulty: "medium",
    source: P,
    stimulus:
      "While researching, a student took these notes:\n\u2022 A network of river gauges measures water level every fifteen minutes.\n\u2022 The readings are published publicly within an hour of being taken.\n\u2022 Flood warnings for towns downstream are issued from the readings.\n\u2022 Several gauges have been in place for more than eighty years.",
    prompt:
      "The student wants to explain to an audience unfamiliar with the network why its readings matter. Which choice most effectively uses relevant information from the notes to accomplish this goal?",
    choices: [
      { id: "A", text: "Some of the river gauges have been in place for more than eighty years." },
      {
        id: "B",
        text: "The gauges read the river every fifteen minutes and publish within the hour, which is what allows flood warnings to reach towns downstream in time.",
      },
      { id: "C", text: "The network measures the level of the river at regular intervals." },
      { id: "D", text: "Readings from the gauges are available to the public." },
    ],
    answer: "B",
    explanation:
      "Why the readings matter is the warning they make possible, and that depends on how quickly they arrive. Only B connects the two. A, C and D each state a fact about the network without saying what it is for.",
  },
  {
    id: "r-sec-17",
    testId: "sat",
    subjectId: "rw",
    domainId: "standard-conventions",
    skillId: "form-structure-sense",
    difficulty: "medium",
    source: P,
    stimulus:
      "Because the harbour freezes for four months of the year, the ferry ______ by an ice road each winter.",
    prompt:
      "Which choice completes the text so that it conforms to the conventions of Standard English?",
    choices: [
      { id: "A", text: "is replaced" },
      { id: "B", text: "being replaced" },
      { id: "C", text: "having been replaced" },
      { id: "D", text: "to be replaced" },
    ],
    answer: "A",
    explanation:
      "The sentence opens with a subordinate clause, so the main clause needs a finite verb for its subject. Only \u201cis replaced\u201d supplies one; the other three are non-finite forms that leave the sentence without a main verb.",
  },
  {
    id: "r-sec-18",
    testId: "sat",
    subjectId: "rw",
    domainId: "standard-conventions",
    skillId: "subject-verb",
    difficulty: "hard",
    source: P,
    stimulus:
      "Among the documents recovered from the wreck ______ a ledger listing every passenger aboard.",
    prompt:
      "Which choice completes the text so that it conforms to the conventions of Standard English?",
    choices: [
      { id: "A", text: "was" },
      { id: "B", text: "were" },
      { id: "C", text: "have been" },
      { id: "D", text: "are" },
    ],
    answer: "A",
    explanation:
      "The sentence is inverted: the subject is \u201ca ledger\u201d, which is singular, and \u201camong the documents\u201d is a prepositional phrase. A plural verb agrees with the wrong noun.",
  },
  {
    id: "r-inf-25",
    testId: "sat",
    subjectId: "rw",
    domainId: "information-ideas",
    skillId: "central-ideas",
    difficulty: "easy",
    source: P,
    stimulus:
      "Librarians at a regional archive spent four years cataloguing a collection of amateur photographs taken between 1910 and 1960. The pictures were not taken to record anything in particular, and that, the archivists argue, is what makes them useful: shop fronts, road surfaces and clothing appear in them incidentally, unposed and undated by any official purpose.",
    prompt: "Which choice best states the main idea of the text?",
    choices: [
      { id: "A", text: "The photographs are valuable as historical evidence because of what they record by accident." },
      { id: "B", text: "Amateur photographers of the period were more skilled than is usually assumed." },
      { id: "C", text: "The archive took four years to catalogue the collection." },
      { id: "D", text: "Official photographs of the period are unreliable." },
    ],
    answer: "A",
    explanation:
      "The archivists' point is that the pictures were not made as records, which is why what sits in the background of them can be trusted. B and D are comparisons the text does not make, and C is a detail rather than the idea.",
  },
  {
    id: "r-inf-26",
    testId: "sat",
    subjectId: "rw",
    domainId: "information-ideas",
    skillId: "inferences",
    difficulty: "medium",
    source: P,
    stimulus:
      "A bakery replaced the flour in one of its breads with flour from a different mill, changing nothing else about the recipe or the schedule. Over the following month the loaves rose less and took longer to prove. When the original flour was restored, both measurements returned to what they had been.",
    prompt: "Which choice most logically completes the text?",
    choices: [
      { id: "A", text: "the change in the loaves is most reasonably attributed to the flour itself." },
      { id: "B", text: "the bakery's ovens were running at the wrong temperature." },
      { id: "C", text: "the second mill's flour is of lower quality in every respect." },
      { id: "D", text: "the recipe had been written incorrectly from the start." },
    ],
    answer: "A",
    explanation:
      "One thing changed, the results changed with it, and they changed back when it was reversed. B and D would have to survive that reversal, and C claims more than a difference in rising time can show.",
  },
  {
    id: "r-cra-23",
    testId: "sat",
    subjectId: "rw",
    domainId: "craft-structure",
    skillId: "words-in-context",
    difficulty: "medium",
    source: P,
    stimulus:
      "Rather than settling the dispute, the committee's ruling only compounded it: each side read the wording as a victory and returned to the argument with fresh confidence.",
    prompt: "As used in the text, \u201ccompounded\u201d most nearly means",
    choices: [
      { id: "A", text: "worsened" },
      { id: "B", text: "combined" },
      { id: "C", text: "calculated" },
      { id: "D", text: "settled" },
    ],
    answer: "A",
    explanation:
      "\u201cRather than settling\u201d sets the word against resolution, and the colon shows the argument getting worse. B and C are other senses of the word, and D is its opposite here.",
  },
  {
    id: "r-cra-24",
    testId: "sat",
    subjectId: "rw",
    domainId: "craft-structure",
    skillId: "text-structure",
    difficulty: "medium",
    source: P,
    stimulus:
      "Swifts were arriving at their northern breeding grounds a week earlier than they had thirty years before. Two explanations were available: the birds were leaving earlier, or they were travelling faster. Tracking tags fitted to fifty birds showed departure dates almost unchanged and flight speeds sharply higher over the middle leg of the route.",
    prompt: "Which choice best describes the overall structure of the text?",
    choices: [
      { id: "A", text: "It reports a change, sets out two possible causes, and gives evidence that distinguishes between them." },
      { id: "B", text: "It reports a change and argues that its cause cannot be determined." },
      { id: "C", text: "It compares two species and explains why one migrates earlier." },
      { id: "D", text: "It describes a tracking method and recommends it for other species." },
    ],
    answer: "A",
    explanation:
      "Observation, two candidate causes, then data that picks one. B contradicts the last sentence, and C and D describe a text that would need a second species or a recommendation, neither of which is here.",
  },
  {
    id: "r-cra-25",
    testId: "sat",
    subjectId: "rw",
    domainId: "craft-structure",
    skillId: "text-structure",
    difficulty: "hard",
    source: P,
    stimulus:
      "The essay begins by defining a folk song as one whose author is unknown. It then turns to a song written in 1936 by a named writer, sung for decades with changed words by people who had never heard of him, and asks what the definition should say about it. It ends by proposing that the test is not anonymity but whether a song has been altered in the singing.",
    prompt: "Which choice best describes the overall structure of the text?",
    choices: [
      { id: "A", text: "It states a definition, raises a case the definition handles badly, and revises the definition." },
      { id: "B", text: "It traces the history of one song from its composition to the present." },
      { id: "C", text: "It argues that folk songs have no authors." },
      { id: "D", text: "It lists the features common to songs of the 1930s." },
    ],
    answer: "A",
    explanation:
      "The 1936 song is brought in because it fails the opening definition, and the last sentence replaces that definition with another. C is the position the essay abandons, and B and D describe texts with different purposes.",
  },
  {
    id: "r-cra-26",
    testId: "sat",
    subjectId: "rw",
    domainId: "craft-structure",
    skillId: "cross-text",
    difficulty: "medium",
    source: P,
    stimulus:
      "Text 1: Excavating a hillside settlement, archaeologist Ines Halloran identifies a small stone building as a granary, citing the raised floor and the charred grain found on it.\n\nText 2: Archaeologist Petr Vasek accepts the identification of the grain but notes that the building stands apart from the houses, faces the valley rather than the yard, and holds a bench along one wall. Storage, he argues, does not account for the siting, and a building may serve more than one purpose at once.",
    prompt: "Based on the texts, how would Vasek most likely respond to Halloran's identification?",
    choices: [
      { id: "A", text: "By disputing that the charred material is grain." },
      {
        id: "B",
        text: "By accepting that grain was kept there while arguing that storage alone does not explain the building.",
      },
      { id: "C", text: "By arguing that the building was a house." },
      { id: "D", text: "By claiming that the raised floor has been misdated." },
    ],
    answer: "B",
    explanation:
      "Vasek's first clause grants the grain and his last sentence leaves room for a second use, so he adds to the identification rather than replacing it. A contradicts what he explicitly accepts, and C and D are claims he never makes.",
  },
  {
    id: "r-cra-27",
    testId: "sat",
    subjectId: "rw",
    domainId: "craft-structure",
    skillId: "cross-text",
    difficulty: "hard",
    source: P,
    stimulus:
      "Text 1: Biologist Ruth Nakamura reports that sparrows raised in isolation still produce a song with the species' basic structure, which she takes as evidence that the song is inherited rather than learned.\n\nText 2: Biologist Sam Oduya does not question the isolation results. He notes, however, that the isolated birds' songs lack the local variations heard in every wild population, and that a young bird moved between valleys grows up singing the songs of the valley it was moved to.",
    prompt: "Which choice best describes a key difference between the two accounts?",
    choices: [
      {
        id: "A",
        text: "Nakamura treats the inherited structure as the whole of the song, while Oduya treats it as a frame that learning fills in.",
      },
      { id: "B", text: "Oduya denies that any part of the song is inherited." },
      { id: "C", text: "Nakamura studied wild birds and Oduya studied captive ones." },
      { id: "D", text: "The two disagree about whether isolated birds sing at all." },
    ],
    answer: "A",
    explanation:
      "Oduya accepts the isolation result and adds the local variation it cannot explain, which is a disagreement about how much the inheritance accounts for. B overstates him, and C and D describe differences the texts do not report.",
  },
  {
    id: "r-exp-15",
    testId: "sat",
    subjectId: "rw",
    domainId: "expression-ideas",
    skillId: "transitions",
    difficulty: "medium",
    source: P,
    stimulus:
      "Steel loses strength well below its melting point, so a fire does not have to melt a beam to bring it down. ______ building codes specify how long a structure must resist collapse rather than how hot its materials may become.",
    prompt: "Which choice completes the text with the most logical transition?",
    choices: [
      { id: "A", text: "Admittedly," },
      { id: "B", text: "All the same," },
      { id: "C", text: "By comparison," },
      { id: "D", text: "For this reason," },
    ],
    answer: "D",
    explanation:
      "The second sentence states what follows from the first: if the failure is not melting, the rule cannot be written in terms of melting. The other three would signal a contrast or a concession, and no contrast is being drawn.",
  },
  {
    id: "r-exp-16",
    testId: "sat",
    subjectId: "rw",
    domainId: "expression-ideas",
    skillId: "transitions",
    difficulty: "hard",
    source: P,
    stimulus:
      "The survey found that four in five respondents supported the new parking rules. The sample, however, was drawn from people who had written to the council about parking. ______ the figure describes the people most exercised by the question rather than the town.",
    prompt: "Which choice completes the text with the most logical transition?",
    choices: [
      { id: "A", text: "For example," },
      { id: "B", text: "Even so," },
      { id: "C", text: "Likewise," },
      { id: "D", text: "In short," },
    ],
    answer: "D",
    explanation:
      "The final sentence sums up what the sampling problem means for the figure. \u201cEven so\u201d would set it against the previous sentence when it follows from it, and the other two signal addition or illustration.",
  },
  {
    id: "r-exp-17",
    testId: "sat",
    subjectId: "rw",
    domainId: "expression-ideas",
    skillId: "rhetorical-synthesis",
    difficulty: "medium",
    source: P,
    stimulus:
      "While researching, a student took these notes:\n\u2022 A city replaced the sodium street lamps on twelve streets with narrow-spectrum amber ones.\n\u2022 The amber lamps were chosen because insects are drawn to them far less strongly.\n\u2022 Moth counts under the new lamps fell to about a third of the counts under the old ones.\n\u2022 Residents reported no difference in how well lit the streets felt.",
    prompt:
      "The student wants to emphasise that the change achieved its goal without a cost to residents. Which choice most effectively uses relevant information from the notes to accomplish this goal?",
    choices: [
      { id: "A", text: "The city replaced sodium lamps with narrow-spectrum amber ones on twelve streets." },
      {
        id: "B",
        text: "Moth counts under the amber lamps fell to roughly a third of those under the old lamps, while residents reported no difference in how well lit the streets felt.",
      },
      { id: "C", text: "Insects are drawn far less strongly to narrow-spectrum amber light." },
      { id: "D", text: "Residents reported no difference in how well lit the streets felt." },
    ],
    answer: "B",
    explanation:
      "The goal has two halves, the result and the absence of a cost, and only B states both. C gives the reason for the choice rather than its outcome, and A and D each cover one half at most.",
  },
  {
    id: "r-sec-19",
    testId: "sat",
    subjectId: "rw",
    domainId: "standard-conventions",
    skillId: "boundaries",
    difficulty: "medium",
    source: P,
    stimulus:
      "The rehearsal ran three hours over______ however, nobody left before the end.",
    prompt:
      "Which choice completes the text so that it conforms to the conventions of Standard English?",
    choices: [
      { id: "A", text: ";" },
      { id: "B", text: "," },
      { id: "C", text: "(no punctuation)" },
      { id: "D", text: "and" },
    ],
    answer: "A",
    explanation:
      "\u201cHowever\u201d is a conjunctive adverb, not a conjunction, so it cannot join two independent clauses with a comma in front of it. A semicolon before it does the joining. D would need the comma to fall before \u201cand\u201d rather than after \u201chowever\u201d.",
  },
  {
    id: "r-sec-20",
    testId: "sat",
    subjectId: "rw",
    domainId: "standard-conventions",
    skillId: "boundaries",
    difficulty: "hard",
    source: P,
    stimulus:
      "The island's only industry, a cannery that employed most of the village______ closed in 1974.",
    prompt:
      "Which choice completes the text so that it conforms to the conventions of Standard English?",
    choices: [
      { id: "A", text: "," },
      { id: "B", text: ";" },
      { id: "C", text: ":" },
      { id: "D", text: "(no punctuation)" },
    ],
    answer: "A",
    explanation:
      "The phrase naming the industry interrupts the sentence between its subject and its verb, and a phrase set off with a comma at the front needs one at the back as well. A semicolon or colon would require a complete clause before it, and leaving it unpunctuated strands the opening comma.",
  },
  {
    id: "r-sec-21",
    testId: "sat",
    subjectId: "rw",
    domainId: "standard-conventions",
    skillId: "form-structure-sense",
    difficulty: "medium",
    source: P,
    stimulus:
      "The surveyors, who had mapped the ridge in 1954, ______ that the summit was forty feet lower than the published figure.",
    prompt:
      "Which choice completes the text so that it conforms to the conventions of Standard English?",
    choices: [
      { id: "A", text: "concluding" },
      { id: "B", text: "to conclude" },
      { id: "C", text: "concluded" },
      { id: "D", text: ", concluding" },
    ],
    answer: "C",
    explanation:
      "The relative clause set off by commas is not the main verb, so the sentence still needs one for \u201cthe surveyors\u201d. Only the finite \u201cconcluded\u201d supplies it.",
  },
  {
    id: "r-sec-22",
    testId: "sat",
    subjectId: "rw",
    domainId: "standard-conventions",
    skillId: "form-structure-sense",
    difficulty: "hard",
    source: P,
    stimulus:
      "Although the two recordings were made a decade apart, the later one is by far ______ of the pair.",
    prompt:
      "Which choice completes the text so that it conforms to the conventions of Standard English?",
    choices: [
      { id: "A", text: "the clearer" },
      { id: "B", text: "clearer" },
      { id: "C", text: "the clearest" },
      { id: "D", text: "most clear" },
    ],
    answer: "A",
    explanation:
      "Two things are being compared, so the comparative is correct, and \u201cof the pair\u201d calls for the definite article with it. C and D are superlatives, which need three or more, and B drops the article the phrase requires.",
  },
  {
    id: "r-sec-23",
    testId: "sat",
    subjectId: "rw",
    domainId: "standard-conventions",
    skillId: "subject-verb",
    difficulty: "medium",
    source: P,
    stimulus:
      "Each of the twelve panels in the window ______ a different scene from the town's history.",
    prompt:
      "Which choice completes the text so that it conforms to the conventions of Standard English?",
    choices: [
      { id: "A", text: "show" },
      { id: "B", text: "shows" },
      { id: "C", text: "have shown" },
      { id: "D", text: "were showing" },
    ],
    answer: "B",
    explanation:
      "\u201cEach\u201d is the subject and is singular; \u201cof the twelve panels\u201d is a prepositional phrase and does not change that. A and C agree with the plural noun inside the phrase, and D puts a standing description into the past.",
  },
  {
    id: "m-alg-26",
    testId: "sat",
    subjectId: "math",
    domainId: "algebra",
    skillId: "linear-eq-1var",
    difficulty: "medium",
    source: P,
    prompt: "If 4(x + 2) \u2212 3 = 2(x + 7), what is the value of x?",
    choices: [
      { id: "A", text: "3" },
      { id: "B", text: "4.5" },
      { id: "C", text: "5.5" },
      { id: "D", text: "9" },
    ],
    answer: "B",
    explanation:
      "Expand both sides: 4x + 8 \u2212 3 = 2x + 14, so 4x + 5 = 2x + 14. Subtract 2x and 5: 2x = 9, so x = 4.5.",
  },
  {
    id: "m-alg-27",
    testId: "sat",
    subjectId: "math",
    domainId: "algebra",
    skillId: "linear-eq-1var",
    difficulty: "hard",
    source: P,
    prompt: "If x/3 + x/4 = 7, what is the value of x?",
    choices: [
      { id: "A", text: "6" },
      { id: "B", text: "7" },
      { id: "C", text: "12" },
      { id: "D", text: "14" },
    ],
    answer: "C",
    explanation:
      "Multiply every term by 12, the LCD: 4x + 3x = 84. Combine: 7x = 84, so x = 12.",
  },
  {
    id: "m-alg-28",
    testId: "sat",
    subjectId: "math",
    domainId: "algebra",
    skillId: "linear-eq-2var",
    difficulty: "medium",
    source: P,
    prompt: "The line 2x \u2212 5y = 30 is graphed in the xy-plane. What is its y-intercept?",
    choices: [
      { id: "A", text: "(0, \u22126)" },
      { id: "B", text: "(0, 6)" },
      { id: "C", text: "(15, 0)" },
      { id: "D", text: "(0, \u221230)" },
    ],
    answer: "A",
    explanation:
      "Set x = 0: \u22125y = 30, so y = \u22126. C is the x-intercept, which is what the equation gives when y is set to 0 instead.",
  },
  {
    id: "m-alg-29",
    testId: "sat",
    subjectId: "math",
    domainId: "algebra",
    skillId: "linear-functions",
    difficulty: "medium",
    source: P,
    prompt: "The linear function f satisfies f(2) = 7 and f(6) = 19. What is the value of f(10)?",
    choices: [
      { id: "A", text: "25" },
      { id: "B", text: "28" },
      { id: "C", text: "31" },
      { id: "D", text: "34" },
    ],
    answer: "C",
    explanation:
      "The slope is (19 \u2212 7)/(6 \u2212 2) = 3. From f(6) = 19, four more steps of 3 give f(10) = 19 + 12 = 31.",
  },
  {
    id: "m-alg-30",
    testId: "sat",
    subjectId: "math",
    domainId: "algebra",
    skillId: "linear-functions",
    difficulty: "hard",
    source: P,
    prompt:
      "A tank drains at a constant rate. Three minutes after draining began it held 42 litres, and eight minutes after it began it held 27 litres. How many minutes after draining began will the tank be empty?",
    choices: [
      { id: "A", text: "14" },
      { id: "B", text: "17" },
      { id: "C", text: "19" },
      { id: "D", text: "21" },
    ],
    answer: "B",
    explanation:
      "The rate is (27 \u2212 42)/(8 \u2212 3) = \u22123 litres per minute. Working back from 42 litres at 3 minutes, the tank held 51 litres at the start, and 51 \u00f7 3 = 17 minutes to empty.",
  },
  {
    id: "m-alg-31",
    testId: "sat",
    subjectId: "math",
    domainId: "algebra",
    skillId: "systems-linear",
    difficulty: "medium",
    source: P,
    prompt: "If 5x + 3y = 29 and x = y + 1, what is the value of y?",
    choices: [
      { id: "A", text: "2" },
      { id: "B", text: "3" },
      { id: "C", text: "4" },
      { id: "D", text: "5" },
    ],
    answer: "B",
    explanation:
      "Substitute x = y + 1: 5(y + 1) + 3y = 29, so 8y + 5 = 29 and y = 3. (Then x = 4, but the question asks for y.)",
  },
  {
    id: "m-alg-32",
    testId: "sat",
    subjectId: "math",
    domainId: "algebra",
    skillId: "linear-inequalities",
    difficulty: "medium",
    source: P,
    prompt:
      "A van may carry at most 1,200 kilograms. It is already loaded with 450 kilograms. If each crate weighs 35 kilograms, what is the greatest number of crates that can be added?",
    choices: [
      { id: "A", text: "20" },
      { id: "B", text: "21" },
      { id: "C", text: "22" },
      { id: "D", text: "25" },
    ],
    answer: "B",
    explanation:
      "450 + 35c \u2264 1200 gives 35c \u2264 750, so c \u2264 21.4. Crates come whole, and 22 crates would put the van over the limit, so the greatest number is 21.",
  },
  {
    id: "m-adv-22",
    testId: "sat",
    subjectId: "math",
    domainId: "advanced-math",
    skillId: "quadratics",
    difficulty: "medium",
    source: P,
    prompt: "What is the smaller solution to x\u00b2 \u2212 10x + 21 = 0?",
    choices: [
      { id: "A", text: "3" },
      { id: "B", text: "7" },
      { id: "C", text: "10" },
      { id: "D", text: "21" },
    ],
    answer: "A",
    explanation:
      "Factor: (x \u2212 3)(x \u2212 7) = 0, so x = 3 or x = 7. The smaller solution is 3.",
  },
  {
    id: "m-adv-23",
    testId: "sat",
    subjectId: "math",
    domainId: "advanced-math",
    skillId: "quadratics",
    difficulty: "hard",
    source: P,
    prompt:
      "The graph of y = x\u00b2 + bx + 9 touches the x-axis at exactly one point, and b is positive. What is the value of b?",
    answer: "6",
    explanation:
      "Touching at exactly one point means the discriminant is zero: b\u00b2 \u2212 4(1)(9) = 0, so b\u00b2 = 36 and b = 6 for positive b.",
  },
  {
    id: "m-adv-24",
    testId: "sat",
    subjectId: "math",
    domainId: "advanced-math",
    skillId: "quadratics",
    difficulty: "hard",
    source: P,
    prompt: "What is the product of the solutions to 2x\u00b2 \u2212 7x \u2212 15 = 0?",
    choices: [
      { id: "A", text: "\u22127.5" },
      { id: "B", text: "\u22123.5" },
      { id: "C", text: "3.5" },
      { id: "D", text: "7.5" },
    ],
    answer: "A",
    explanation:
      "For ax\u00b2 + bx + c = 0 the product of the solutions is c/a = \u221215/2 = \u22127.5. (C is the sum, \u2212b/a = 3.5.)",
  },
  {
    id: "m-adv-25",
    testId: "sat",
    subjectId: "math",
    domainId: "advanced-math",
    skillId: "nonlinear-functions",
    difficulty: "medium",
    source: P,
    prompt: "The function g is defined by g(x) = x\u00b2 \u2212 4x + 1. What is the value of g(\u22121)?",
    choices: [
      { id: "A", text: "\u22122" },
      { id: "B", text: "4" },
      { id: "C", text: "6" },
      { id: "D", text: "8" },
    ],
    answer: "C",
    explanation:
      "g(\u22121) = (\u22121)\u00b2 \u2212 4(\u22121) + 1 = 1 + 4 + 1 = 6. The middle term becomes positive because a negative is being subtracted.",
  },
  {
    id: "m-adv-26",
    testId: "sat",
    subjectId: "math",
    domainId: "advanced-math",
    skillId: "nonlinear-functions",
    difficulty: "hard",
    source: P,
    prompt:
      "The graph of y = f(x) crosses the x-axis at x = \u22123, x = 0 and x = 2, and nowhere else. Which of the following could define f?",
    choices: [
      { id: "A", text: "f(x) = x(x + 3)(x \u2212 2)" },
      { id: "B", text: "f(x) = x(x \u2212 3)(x + 2)" },
      { id: "C", text: "f(x) = (x + 3)(x \u2212 2)" },
      { id: "D", text: "f(x) = x(x + 3)(x + 2)" },
    ],
    answer: "A",
    explanation:
      "Each zero corresponds to a factor that is zero there: x for 0, (x + 3) for \u22123 and (x \u2212 2) for 2. B and D have their signs reversed, and C has no zero at x = 0.",
  },
  {
    id: "m-adv-27",
    testId: "sat",
    subjectId: "math",
    domainId: "advanced-math",
    skillId: "nonlinear-functions",
    difficulty: "medium",
    source: P,
    prompt: "What is the maximum value of the function h(x) = \u22122(x + 1)\u00b2 + 8?",
    choices: [
      { id: "A", text: "\u22122" },
      { id: "B", text: "1" },
      { id: "C", text: "8" },
      { id: "D", text: "10" },
    ],
    answer: "C",
    explanation:
      "The squared term is never negative, so \u22122(x + 1)\u00b2 is never positive and is largest, at 0, when x = \u22121. The maximum value of h is therefore 8.",
  },
  {
    id: "m-adv-28",
    testId: "sat",
    subjectId: "math",
    domainId: "advanced-math",
    skillId: "equivalent-expressions",
    difficulty: "medium",
    source: P,
    prompt: "Which expression is equivalent to (2x + 5)(x \u2212 3)?",
    choices: [
      { id: "A", text: "2x\u00b2 \u2212 x \u2212 15" },
      { id: "B", text: "2x\u00b2 + x \u2212 15" },
      { id: "C", text: "2x\u00b2 \u2212 11x \u2212 15" },
      { id: "D", text: "2x\u00b2 \u2212 6x \u2212 15" },
    ],
    answer: "A",
    explanation:
      "Multiply out: 2x\u00b2 \u2212 6x + 5x \u2212 15. The middle terms combine to \u2212x, giving 2x\u00b2 \u2212 x \u2212 15.",
  },
  {
    id: "m-adv-29",
    testId: "sat",
    subjectId: "math",
    domainId: "advanced-math",
    skillId: "equivalent-expressions",
    difficulty: "hard",
    source: P,
    prompt: "For x \u2260 \u22124/3, which expression is equivalent to (9x\u00b2 \u2212 16)/(3x + 4)?",
    choices: [
      { id: "A", text: "3x \u2212 4" },
      { id: "B", text: "3x + 4" },
      { id: "C", text: "9x \u2212 4" },
      { id: "D", text: "3x \u2212 16" },
    ],
    answer: "A",
    explanation:
      "9x\u00b2 \u2212 16 is a difference of squares: (3x \u2212 4)(3x + 4). Dividing by (3x + 4) leaves 3x \u2212 4.",
  },
  {
    id: "m-adv-30",
    testId: "sat",
    subjectId: "math",
    domainId: "advanced-math",
    skillId: "equivalent-expressions",
    difficulty: "medium",
    source: P,
    prompt: "Which expression is equivalent to (x\u00b2y\u00b3)(x\u2074y\u207b\u00b9), where x and y are positive?",
    choices: [
      { id: "A", text: "x\u2076y\u00b2" },
      { id: "B", text: "x\u2078y\u00b3" },
      { id: "C", text: "x\u2076y\u207b\u00b3" },
      { id: "D", text: "x\u2078y\u00b2" },
    ],
    answer: "A",
    explanation:
      "Multiplying powers of the same base adds the exponents: x\u00b2\u207a\u2074 = x\u2076 and y\u00b3\u207a\u207d\u207b\u00b9\u207e = y\u00b2. B and D multiply the exponents instead of adding them.",
  },
  {
    id: "m-adv-31",
    testId: "sat",
    subjectId: "math",
    domainId: "advanced-math",
    skillId: "exponential",
    difficulty: "medium",
    source: P,
    prompt:
      "A culture of 50 cells triples every 4 hours. How many cells are there after 12 hours?",
    choices: [
      { id: "A", text: "150" },
      { id: "B", text: "450" },
      { id: "C", text: "1,350" },
      { id: "D", text: "4,050" },
    ],
    answer: "C",
    explanation:
      "12 hours is three triplings: 50 \u2192 150 \u2192 450 \u2192 1,350. A and B stop after one and two triplings.",
  },
  {
    id: "m-adv-32",
    testId: "sat",
    subjectId: "math",
    domainId: "advanced-math",
    skillId: "exponential",
    difficulty: "hard",
    source: P,
    prompt:
      "The mass, in grams, of a sample after t days is modelled by f(t) = 120(0.5)^(t/30). How many days does the sample take to fall to half its mass?",
    choices: [
      { id: "A", text: "0.5" },
      { id: "B", text: "30" },
      { id: "C", text: "60" },
      { id: "D", text: "120" },
    ],
    answer: "B",
    explanation:
      "The mass is multiplied by 0.5 once for every 30 days, since that is what makes the exponent 1. So it halves every 30 days.",
  },
  {
    id: "r-inf-27",
    testId: "sat",
    subjectId: "rw",
    domainId: "information-ideas",
    skillId: "command-evidence",
    difficulty: "medium",
    source: P,
    stimulus:
      "A geologist proposes that the scattered boulders on the plateau were carried there by a glacier rather than by a flood.",
    prompt: "Which finding, if true, would most strongly support the geologist's proposal?",
    choices: [
      {
        id: "A",
        text: "The boulders match an outcrop sixty kilometres up-valley and sit on fine sediment that moving water would have stripped away.",
      },
      { id: "B", text: "Boulders of similar size are found on plateaus in many parts of the world." },
      { id: "C", text: "The plateau stands well above the valley's present river." },
      { id: "D", text: "Several of the boulders weigh more than ten tonnes." },
    ],
    answer: "A",
    explanation:
      "A tells us where the rock came from and rules out the flood by what is underneath it. B says nothing about this plateau, C is consistent with either explanation, and D is a fact about the boulders that neither carrier excludes.",
  },
  {
    id: "r-inf-28",
    testId: "sat",
    subjectId: "rw",
    domainId: "information-ideas",
    skillId: "quantitative-evidence",
    difficulty: "hard",
    source: P,
    stimulus:
      "Average night-time noise, in decibels, at four monitoring points before and after a lorry curfew: Point 1, 62 then 54; Point 2, 58 then 57; Point 3, 61 then 52; Point 4, 59 then 58. Points 1 and 3 stand on the curfewed route; Points 2 and 4 do not.",
    prompt:
      "Which choice most effectively uses data from the monitoring to support the claim that the curfew reduced night-time noise?",
    choices: [
      { id: "A", text: "Noise fell at all four monitoring points after the curfew." },
      {
        id: "B",
        text: "The two points on the curfewed route fell by 8 and 9 decibels, while the two points away from it fell by 1 each.",
      },
      { id: "C", text: "Point 1 recorded the highest reading before the curfew, at 62 decibels." },
      { id: "D", text: "After the curfew, no point recorded more than 58 decibels." },
    ],
    answer: "B",
    explanation:
      "The claim is that the curfew did it, so the evidence has to separate the curfewed route from everywhere else. A is true but would look the same if something else had quietened the whole town, and C and D report single figures that carry no comparison.",
  },
  {
    id: "r-cra-28",
    testId: "sat",
    subjectId: "rw",
    domainId: "craft-structure",
    skillId: "words-in-context",
    difficulty: "medium",
    source: P,
    stimulus:
      "Her account of the trial is scrupulous: where the record is silent, she says so, and she never fills the gap with what the participants would probably have said.",
    prompt: "As used in the text, \u201cscrupulous\u201d most nearly means",
    choices: [
      { id: "A", text: "reluctant" },
      { id: "B", text: "doubtful" },
      { id: "C", text: "apologetic" },
      { id: "D", text: "exacting" },
    ],
    answer: "D",
    explanation:
      "The colon gives the evidence: she marks every gap and invents nothing. That is care taken over detail, not doubt, apology or reluctance.",
  },
  {
    id: "r-cra-29",
    testId: "sat",
    subjectId: "rw",
    domainId: "craft-structure",
    skillId: "words-in-context",
    difficulty: "hard",
    source: P,
    stimulus:
      "The new wing does not so much extend the old building as answer it, borrowing its proportions while refusing its ornament.",
    prompt: "As used in the text, \u201canswer\u201d most nearly means",
    choices: [
      { id: "A", text: "respond to" },
      { id: "B", text: "solve" },
      { id: "C", text: "match exactly" },
      { id: "D", text: "replace" },
    ],
    answer: "A",
    explanation:
      "The wing takes up one feature of the old building and rejects another, which is a reply rather than a copy. C is ruled out by \u201crefusing its ornament\u201d, and B and D are senses the sentence does not carry.",
  },
  {
    id: "r-cra-30",
    testId: "sat",
    subjectId: "rw",
    domainId: "craft-structure",
    skillId: "text-structure",
    difficulty: "medium",
    source: P,
    stimulus:
      "The article opens with the assertion, now widely repeated, that the city's oldest bridge has been declared unsafe. It quotes at length the engineer's report the assertion rests on. It then points out that the report concerns a different bridge, four miles upstream, whose name differs by one word.",
    prompt: "Which choice best describes the overall structure of the text?",
    choices: [
      { id: "A", text: "It states a widely repeated claim, presents the source it rests on, and shows that the source is about something else." },
      { id: "B", text: "It argues that the city's oldest bridge should be closed." },
      { id: "C", text: "It compares the construction of two bridges." },
      { id: "D", text: "It recounts the history of an engineering survey." },
    ],
    answer: "A",
    explanation:
      "Claim, source, then the mismatch between them. B is the opposite of where the article ends up, and C and D describe work the text does not do.",
  },
  {
    id: "r-cra-31",
    testId: "sat",
    subjectId: "rw",
    domainId: "craft-structure",
    skillId: "cross-text",
    difficulty: "medium",
    source: P,
    stimulus:
      "Text 1: Curator Mara Lindqvist argues that digitising a manuscript collection protects the originals, since a reader who can consult a scan has no reason to handle the parchment.\n\nText 2: Conservator Yusuf Adeyemi reports that requests to consult the originals at his own library tripled in the four years after digitisation. Scans, he suggests, told far more people that the manuscripts existed, and some of those readers want the object itself.",
    prompt: "Based on the texts, how would Adeyemi most likely respond to Lindqvist's argument?",
    choices: [
      { id: "A", text: "By denying that handling damages parchment." },
      {
        id: "B",
        text: "By accepting the aim while noting that digitising a collection can increase the demand to handle it.",
      },
      { id: "C", text: "By arguing that scans are of too low a quality to be useful." },
      { id: "D", text: "By recommending that the collection be closed to readers." },
    ],
    answer: "B",
    explanation:
      "Adeyemi does not dispute that handling is the risk or that protection is the point; he reports a consequence that runs the other way. A, C and D are positions the text never gives him.",
  },
  {
    id: "r-cra-32",
    testId: "sat",
    subjectId: "rw",
    domainId: "craft-structure",
    skillId: "cross-text",
    difficulty: "hard",
    source: P,
    stimulus:
      "Text 1: Psychologist Dana Reuter finds that students who take notes by hand recall more of a lecture than students who type, and concludes that writing by hand aids memory.\n\nText 2: Psychologist Ola Bjerke repeated the comparison with one change: the typing group was told to write summaries rather than take down what was said. The difference in recall disappeared.",
    prompt: "Which choice best describes how Bjerke's finding bears on Reuter's conclusion?",
    choices: [
      { id: "A", text: "It confirms that handwriting is what produces the advantage." },
      {
        id: "B",
        text: "It locates the advantage in summarising rather than in the act of writing by hand.",
      },
      { id: "C", text: "It shows that neither group recalled anything of the lecture." },
      { id: "D", text: "It shows that typing is faster than writing by hand." },
    ],
    answer: "B",
    explanation:
      "Changing what the typists did, not how they wrote, removed the gap, so the gap was about summarising. A is the conclusion the second study undercuts, and C and D describe results neither text reports.",
  },
  {
    id: "r-exp-18",
    testId: "sat",
    subjectId: "rw",
    domainId: "expression-ideas",
    skillId: "transitions",
    difficulty: "medium",
    source: P,
    stimulus:
      "The cave's painted chamber is lit for two hours a day and closed to visitors the rest of the time. ______ its pigments have faded far less than those at comparable sites open all year.",
    prompt: "Which choice completes the text with the most logical transition?",
    choices: [
      { id: "A", text: "In contrast," },
      { id: "B", text: "Even so," },
      { id: "C", text: "Meanwhile," },
      { id: "D", text: "As a result," },
    ],
    answer: "D",
    explanation:
      "Less light and fewer visitors, so less fading: the second sentence is the consequence of the first. The other three signal a contrast or a change of subject that the sentences do not support.",
  },
  {
    id: "r-exp-19",
    testId: "sat",
    subjectId: "rw",
    domainId: "expression-ideas",
    skillId: "transitions",
    difficulty: "hard",
    source: P,
    stimulus:
      "High winds cancel the island ferry on about forty days a year, most of them in winter. ______ the island's shops rarely run short, because the deliveries are timed around the forecasts rather than the calendar.",
    prompt: "Which choice completes the text with the most logical transition?",
    choices: [
      { id: "A", text: "Similarly," },
      { id: "B", text: "Therefore," },
      { id: "C", text: "In particular," },
      { id: "D", text: "Even so," },
    ],
    answer: "D",
    explanation:
      "The second sentence reports the opposite of what the first would lead you to expect, which is a concession. \u201cTherefore\u201d would make empty shelves the outcome, and the other two signal illustration or likeness.",
  },
  {
    id: "r-exp-20",
    testId: "sat",
    subjectId: "rw",
    domainId: "expression-ideas",
    skillId: "rhetorical-synthesis",
    difficulty: "hard",
    source: P,
    stimulus:
      "While researching, a student took these notes:\n\u2022 A tidal mill on the estuary ground grain from 1740 until 1926.\n\u2022 It was driven by water held behind a gate at high tide and released as the tide fell.\n\u2022 The restored mill now drives a generator instead of millstones.\n\u2022 It supplies about a fifth of the electricity used by the village hall.",
    prompt:
      "The student wants to emphasise that the mill works on the same principle as before but to a different end. Which choice most effectively uses relevant information from the notes to accomplish this goal?",
    choices: [
      { id: "A", text: "The tidal mill ground grain on the estuary from 1740 until 1926." },
      {
        id: "B",
        text: "The mill is still driven by water released as the tide falls, but it now turns a generator rather than millstones, supplying about a fifth of the village hall's electricity.",
      },
      { id: "C", text: "The restored mill supplies about a fifth of the village hall's electricity." },
      { id: "D", text: "Water was held behind a gate at high tide and released as the tide fell." },
    ],
    answer: "B",
    explanation:
      "The goal has two halves, the unchanged principle and the changed purpose, and only B gives both. A and D describe the old mill alone, and C the new use alone.",
  },
  {
    id: "r-sec-24",
    testId: "sat",
    subjectId: "rw",
    domainId: "standard-conventions",
    skillId: "boundaries",
    difficulty: "medium",
    source: P,
    stimulus:
      "Delegates travelled from Lima, Peru______ Quito, Ecuador; and Bogot\u00e1, Colombia.",
    prompt:
      "Which choice completes the text so that it conforms to the conventions of Standard English?",
    choices: [
      { id: "A", text: ";" },
      { id: "B", text: "," },
      { id: "C", text: ":" },
      { id: "D", text: "(no punctuation)" },
    ],
    answer: "A",
    explanation:
      "The items in this series already contain commas, so the items themselves are separated by semicolons — as the rest of the sentence does. A comma here would leave four items that cannot be told apart.",
  },
  {
    id: "r-sec-25",
    testId: "sat",
    subjectId: "rw",
    domainId: "standard-conventions",
    skillId: "boundaries",
    difficulty: "hard",
    source: P,
    stimulus: "The only ferry ______ runs through the winter leaves at dawn.",
    prompt:
      "Which choice completes the text so that it conforms to the conventions of Standard English?",
    choices: [
      { id: "A", text: "that" },
      { id: "B", text: ", which" },
      { id: "C", text: "which" },
      { id: "D", text: ", that" },
    ],
    answer: "A",
    explanation:
      "The clause identifies which ferry is meant, so it is essential and takes \u201cthat\u201d with no comma. B would make the identifying information an aside, C leaves a nonessential pronoun without its comma, and D pairs a comma with a pronoun that cannot take one.",
  },
  {
    id: "r-sec-26",
    testId: "sat",
    subjectId: "rw",
    domainId: "standard-conventions",
    skillId: "form-structure-sense",
    difficulty: "medium",
    source: P,
    stimulus: "Rebuilt after the fire of 1892, ______ now houses the town archive.",
    prompt:
      "Which choice completes the text so that it conforms to the conventions of Standard English?",
    choices: [
      { id: "A", text: "the old courthouse" },
      { id: "B", text: "the town's records were moved into the old courthouse, which" },
      { id: "C", text: "it is the old courthouse that" },
      { id: "D", text: "housing the records, the old courthouse" },
    ],
    answer: "A",
    explanation:
      "The opening phrase describes whatever the main clause's subject is, and the thing rebuilt after the fire is the courthouse. B puts the records in that position, and C and D leave the sentence without a straightforward subject and verb.",
  },
  {
    id: "r-sec-27",
    testId: "sat",
    subjectId: "rw",
    domainId: "standard-conventions",
    skillId: "form-structure-sense",
    difficulty: "hard",
    source: P,
    stimulus: "Reading the transcripts proved more useful than ______ the interviews.",
    prompt:
      "Which choice completes the text so that it conforms to the conventions of Standard English?",
    choices: [
      { id: "A", text: "listening to" },
      { id: "B", text: "to listen to" },
      { id: "C", text: "listened to" },
      { id: "D", text: "having listened to" },
    ],
    answer: "A",
    explanation:
      "The comparison is between two activities, and the first is given as \u201creading\u201d, so the second must take the same form. The other three break the parallel.",
  },
  {
    id: "r-sec-28",
    testId: "sat",
    subjectId: "rw",
    domainId: "standard-conventions",
    skillId: "subject-verb",
    difficulty: "medium",
    source: P,
    stimulus: "There ______ a dozen reasons to postpone the launch, and the weather is only one.",
    prompt:
      "Which choice completes the text so that it conforms to the conventions of Standard English?",
    choices: [
      { id: "A", text: "are" },
      { id: "B", text: "is" },
      { id: "C", text: "was" },
      { id: "D", text: "has been" },
    ],
    answer: "A",
    explanation:
      "\u201cThere\u201d is not the subject; \u201ca dozen reasons\u201d is, and it is plural. The second clause is in the present, so a past form would not fit either.",
  },
];

/** Every question in the bank, keyed by id. */
export const QUESTION_BY_ID = new Map(SAT_QUESTIONS.map((q) => [q.id, q]));

export function questionById(id: string): Question | undefined {
  return QUESTION_BY_ID.get(id);
}

/**
 * How many questions the bank actually holds for a skill.
 *
 * The Overview's "18 / 25 completed" figures are computed against this rather
 * than against a target invented for the design, so a student is never told
 * they have 7 questions left that do not exist.
 */
export const QUESTION_COUNT_BY_SKILL = SAT_QUESTIONS.reduce<Record<string, number>>(
  (acc, q) => {
    acc[q.skillId] = (acc[q.skillId] ?? 0) + 1;
    return acc;
  },
  {},
);

export const QUESTION_COUNT_BY_DOMAIN = SAT_QUESTIONS.reduce<Record<string, number>>(
  (acc, q) => {
    acc[q.domainId] = (acc[q.domainId] ?? 0) + 1;
    return acc;
  },
  {},
);
