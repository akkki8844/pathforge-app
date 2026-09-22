/**
 * Standardized test dates, on every student's calendar automatically.
 *
 * Unlike everything else `buildAgenda()` draws from, these rows live in code,
 * not a table: the SAT/ACT/PSAT calendar is set nationally by College Board
 * and ACT, not by the student, so there is nothing for a student to create,
 * edit or delete here. `testDatesOnDay()` folds this static schedule into the
 * same agenda every other kind flows through, so Today and Calendar show a
 * test date the same way they show a class or a deadline — no second UI.
 *
 * AP exam dates are also here, filtered to the subjects `apSubjectsForMajor()`
 * maps a student's `intended_major` onto. That mapping is a best-effort
 * keyword match, not a College Board API — see the comment on the map itself.
 *
 * ⚠️ This schedule expires. SAT/ACT/PSAT/AP dates are published roughly a
 * year ahead and do not repeat on a fixed formula (they dodge holidays and
 * religious observances), so this file needs a manual refresh every testing
 * year. Sourced 2026-09-09 from collegeboard.org and act.org for the 2026-27
 * SAT/PSAT/AP cycle and the 2026-27 ACT national test-date schedule. Verify
 * against collegeboard.org/act.org before relying on a date near its cutoff.
 */

export type StandardizedTestId = "sat" | "act" | "psat" | "ap";

export interface StandardizedTestDate {
  id: string;
  test: StandardizedTestId;
  /** e.g. "SAT", "ACT", "PSAT/NMSQT", or the AP subject name. */
  label: string;
  /** yyyy-mm-dd, local. */
  date: string;
  /** Present for SAT/ACT, whose registration is student-initiated. */
  regularDeadline?: string;
  lateDeadline?: string;
  /** One line of context shown under the title. */
  note?: string;
}

/**
 * SAT and ACT: every student sees every national date, regardless of major —
 * this is what "standardized tests on everyone's calendar" means. PSAT is
 * school-administered on a single date the school picks, so only the national
 * window is known in advance.
 */
export const STANDARDIZED_TEST_DATES: StandardizedTestDate[] = [
  // ── SAT, 2026-27 ────────────────────────────────────────────────────────
  { id: "sat-2026-08-22", test: "sat", label: "SAT", date: "2026-08-22", regularDeadline: "2026-08-07" },
  { id: "sat-2026-09-12", test: "sat", label: "SAT", date: "2026-09-12", regularDeadline: "2026-08-28" },
  { id: "sat-2026-10-03", test: "sat", label: "SAT", date: "2026-10-03", regularDeadline: "2026-09-18" },
  { id: "sat-2026-11-07", test: "sat", label: "SAT", date: "2026-11-07", regularDeadline: "2026-10-23" },
  { id: "sat-2026-12-05", test: "sat", label: "SAT", date: "2026-12-05", regularDeadline: "2026-11-20" },
  { id: "sat-2027-03-06", test: "sat", label: "SAT", date: "2027-03-06", regularDeadline: "2027-02-19" },
  { id: "sat-2027-05-01", test: "sat", label: "SAT", date: "2027-05-01", regularDeadline: "2027-04-16" },
  { id: "sat-2027-06-05", test: "sat", label: "SAT", date: "2027-06-05", regularDeadline: "2027-05-21" },

  // ── ACT, 2026-27 ────────────────────────────────────────────────────────
  { id: "act-2026-09-19", test: "act", label: "ACT", date: "2026-09-19", regularDeadline: "2026-08-14", lateDeadline: "2026-09-01" },
  { id: "act-2026-10-17", test: "act", label: "ACT", date: "2026-10-17", regularDeadline: "2026-09-11", lateDeadline: "2026-09-29" },
  { id: "act-2026-12-12", test: "act", label: "ACT", date: "2026-12-12", regularDeadline: "2026-11-06", lateDeadline: "2026-11-29" },
  { id: "act-2027-02-27", test: "act", label: "ACT", date: "2027-02-27", regularDeadline: "2027-01-22", lateDeadline: "2027-02-09" },
  { id: "act-2027-04-10", test: "act", label: "ACT", date: "2027-04-10", regularDeadline: "2027-03-05", lateDeadline: "2027-03-23" },
  { id: "act-2027-06-12", test: "act", label: "ACT", date: "2027-06-12", regularDeadline: "2027-05-07", lateDeadline: "2027-05-25" },
  { id: "act-2027-07-10", test: "act", label: "ACT", date: "2027-07-10", regularDeadline: "2027-06-04", lateDeadline: "2027-06-22", note: "No test centers scheduled in New York for this date." },

  // ── PSAT/NMSQT, fall 2026 ───────────────────────────────────────────────
  // Schools choose the exact day inside this window; there is no student
  // registration or deadline, so this shows as a single window marker.
  {
    id: "psat-2026-window",
    test: "psat",
    label: "PSAT/NMSQT window",
    date: "2026-10-17",
    note: "Your school sets the exact date inside the Oct 1–30, 2026 window — confirm with your counselor.",
  },
];

/**
 * AP exams, May 2027 — every subject College Board has scheduled for that
 * administration. `apSubjectsForMajor()` below filters this list per student;
 * nothing here decides who sees what.
 */
export const AP_EXAM_SCHEDULE_2027: { subject: string; date: string; note?: string }[] = [
  { subject: "AP Human Geography", date: "2027-05-03" },
  { subject: "AP Physics C: Mechanics", date: "2027-05-03" },
  { subject: "AP Biology", date: "2027-05-03" },
  { subject: "AP Italian Language and Culture", date: "2027-05-03" },
  { subject: "AP Business with Personal Finance", date: "2027-05-04" },
  { subject: "AP United States Government and Politics", date: "2027-05-04" },
  { subject: "AP European History", date: "2027-05-04" },
  { subject: "AP Microeconomics", date: "2027-05-04" },
  { subject: "AP Cybersecurity", date: "2027-05-05" },
  { subject: "AP English Literature and Composition", date: "2027-05-05" },
  { subject: "AP Physics 1: Algebra-Based", date: "2027-05-05" },
  { subject: "AP Physics C: Electricity and Magnetism", date: "2027-05-05" },
  { subject: "AP French Language and Culture", date: "2027-05-06" },
  { subject: "AP Physics 2: Algebra-Based", date: "2027-05-06" },
  { subject: "AP World History: Modern", date: "2027-05-06" },
  { subject: "AP African American Studies", date: "2027-05-06" },
  { subject: "AP Chemistry", date: "2027-05-06" },
  { subject: "AP German Language and Culture", date: "2027-05-07" },
  { subject: "AP United States History", date: "2027-05-07" },
  { subject: "AP Macroeconomics", date: "2027-05-07" },
  { subject: "AP Networking", date: "2027-05-07", note: "Pilot schools only" },
  { subject: "AP Calculus AB", date: "2027-05-10" },
  { subject: "AP Calculus BC", date: "2027-05-10" },
  { subject: "AP Music Theory", date: "2027-05-10" },
  { subject: "AP Seminar", date: "2027-05-10" },
  { subject: "AP Japanese Language and Culture", date: "2027-05-11" },
  { subject: "AP Precalculus", date: "2027-05-11" },
  { subject: "AP Statistics", date: "2027-05-11" },
  { subject: "AP English Language and Composition", date: "2027-05-12" },
  { subject: "AP Art History", date: "2027-05-12" },
  { subject: "AP Computer Science A", date: "2027-05-12" },
  { subject: "AP Spanish Language and Culture", date: "2027-05-13" },
  { subject: "AP Chinese Language and Culture", date: "2027-05-13" },
  { subject: "AP Environmental Science", date: "2027-05-13" },
  { subject: "AP Comparative Government and Politics", date: "2027-05-14" },
  { subject: "AP Computer Science Principles", date: "2027-05-14" },
  { subject: "AP Spanish Literature and Culture", date: "2027-05-14" },
  { subject: "AP Latin", date: "2027-05-14" },
  { subject: "AP Psychology", date: "2027-05-14" },
];

/**
 * `intended_major` is free text a student typed during onboarding, not a
 * closed enum, so this is keyword matching against common majors rather than
 * an exhaustive lookup. An unmatched major returns an empty list rather than
 * a guess — silence is better than pointing a student at the wrong exam.
 *
 * The keyword lists are deliberately wide: "engineering", "nursing",
 * "architecture", "law", "commerce" and the like are what students actually
 * type, and a map that only knew "mechanical engineering" left most of them
 * with no AP dates at all. Width costs an extra subject on someone's calendar;
 * narrowness costs them the date entirely. Every entry still has to be a
 * defensible pairing — a subject a student in that field would plausibly sit —
 * not a catch-all.
 */
const MAJOR_AP_KEYWORDS: { keywords: string[]; subjects: string[] }[] = [
  { keywords: ["computer science", "software", "cs ", "computing", "artificial intelligence", "machine learning", "game development", "information technology", "information systems"], subjects: ["AP Computer Science A", "AP Computer Science Principles"] },
  { keywords: ["cybersecurity", "information security", "infosec"], subjects: ["AP Cybersecurity"] },
  { keywords: ["biology", "pre-med", "premed", "medicine", "medical", "biomedical", "neuroscience", "nursing", "pharmacy", "dentistry", "veterinary", "public health", "genetics", "microbiology", "marine biology", "zoology", "botany", "physiology", "kinesiology", "sports science", "nutrition", "dietetics"], subjects: ["AP Biology"] },
  { keywords: ["chemistry", "chemical engineering", "biochemistry", "biotechnology", "materials science", "pharmacology", "metallurg"], subjects: ["AP Chemistry"] },
  { keywords: ["physics", "engineering", "mechanical", "aerospace", "aeronautic", "electrical", "electronics", "civil engineering", "robotics", "mechatronic", "astronomy", "astrophysics", "nuclear"], subjects: ["AP Physics C: Mechanics", "AP Physics C: Electricity and Magnetism"] },
  { keywords: ["environmental", "sustainability", "ecology", "climate", "geology", "earth science", "agricultur", "forestry", "conservation"], subjects: ["AP Environmental Science"] },
  { keywords: ["mathematics", "math", "statistics", "data science", "data analytics", "actuarial", "quantitative", "operations research"], subjects: ["AP Calculus BC", "AP Statistics"] },
  { keywords: ["economics", "econ", "finance", "business", "commerce", "accounting", "management", "marketing", "entrepreneur", "supply chain", "hospitality", "real estate", "banking"], subjects: ["AP Microeconomics", "AP Macroeconomics", "AP Business with Personal Finance"] },
  { keywords: ["political science", "politics", "government", "public policy", "public administration", "international relations", "law", "legal studies", "criminology", "criminal justice", "diplomacy"], subjects: ["AP United States Government and Politics", "AP Comparative Government and Politics"] },
  { keywords: ["history"], subjects: ["AP United States History", "AP World History: Modern", "AP European History"] },
  { keywords: ["psychology", "psycholog", "cognitive science", "counseling", "social work", "sociology", "anthropology", "human development", "education", "teaching"], subjects: ["AP Psychology"] },
  { keywords: ["english", "literature", "creative writing", "journalism", "communications", "media studies", "public relations", "publishing", "rhetoric", "philosophy", "linguistics"], subjects: ["AP English Language and Composition", "AP English Literature and Composition"] },
  { keywords: ["art history", "studio art", "design", "fine art", "architecture", "animation", "illustration", "fashion", "film", "photography", "visual art", "theater", "theatre", "drama", "performing art"], subjects: ["AP Art History"] },
  { keywords: ["music", "sound engineering", "audio production"], subjects: ["AP Music Theory"] },
  { keywords: ["spanish"], subjects: ["AP Spanish Language and Culture", "AP Spanish Literature and Culture"] },
  { keywords: ["french"], subjects: ["AP French Language and Culture"] },
  { keywords: ["german"], subjects: ["AP German Language and Culture"] },
  { keywords: ["chinese", "mandarin"], subjects: ["AP Chinese Language and Culture"] },
  { keywords: ["japanese"], subjects: ["AP Japanese Language and Culture"] },
  { keywords: ["italian"], subjects: ["AP Italian Language and Culture"] },
  { keywords: ["latin", "classics"], subjects: ["AP Latin"] },
  { keywords: ["geography", "urban planning", "urban studies", "demograph", "gis"], subjects: ["AP Human Geography"] },
  { keywords: ["african american studies", "black studies", "ethnic studies"], subjects: ["AP African American Studies"] },
];

/** Best-effort AP subjects for a free-text intended major. Never guesses. */
export function apSubjectsForMajor(intendedMajor: string | null | undefined): string[] {
  if (!intendedMajor) return [];
  const m = intendedMajor.toLowerCase();
  const out = new Set<string>();
  for (const { keywords, subjects } of MAJOR_AP_KEYWORDS) {
    if (keywords.some((k) => m.includes(k))) subjects.forEach((s) => out.add(s));
  }
  return [...out];
}
