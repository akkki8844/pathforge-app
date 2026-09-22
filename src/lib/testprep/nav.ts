/**
 * Test Prep's navigation, declared once.
 *
 * Two lists live here. `TEST_PREP_TESTS` is what the global navbar's "Other"
 * dropdown renders under a Test Prep heading — five tests, of which one is
 * built. `SAT_SECTIONS` is the sidebar inside the SAT experience.
 *
 * Test Prep is deliberately *not* a top-level bar item. It sits inside the
 * existing "Other" mega-menu alongside Routine, Communications, Builders,
 * Preparation and Resources, which is what that menu is for.
 */

import {
  ClipboardList,
  Database,
  LayoutDashboard,
  LineChart,
  BookOpenCheck,
  type LucideIcon,
} from "lucide-react";
import { BLUEPRINTS } from "./blueprints";
import type { TestId } from "./types";

export const TEST_PREP_ROOT = "/test-prep";

/** Where `/test-prep` itself redirects. */
export const TEST_PREP_DEFAULT = "/test-prep/sat";

export interface TestPrepNavItem {
  href: string;
  label: string;
  testId: TestId;
  /** False renders the item as present but not yet openable. */
  available: boolean;
}

export const TEST_PREP_TESTS: TestPrepNavItem[] = BLUEPRINTS.map((b) => ({
  href: `${TEST_PREP_ROOT}/${b.id}`,
  label: b.name,
  testId: b.id,
  available: b.available,
}));

/**
 * The SAT sidebar.
 *
 * Five destinations in four groups, because they are four different kinds of
 * errand: where am I (Overview), doing the work (Practice, Question Bank),
 * sitting a test (Practice Exams), and how is it going (Progress). The group
 * boundaries are the only structure — there are no section headings beyond
 * "SAT Prep" itself, because five items do not need labelling into named
 * categories.
 *
 * Practice Exams was previously grouped with Question Bank, which put the one
 * destination that takes over the whole screen for an hour next to the one you
 * browse for two minutes. It sits on its own now, which also matches the fact
 * that starting a sitting leaves the shell entirely.
 *
 * Icons: the sidebar renders as a collapsed icon rail that expands on hover,
 * so each item needs a glyph that reads on its own before a label appears
 * next to it.
 */
export interface TestSectionItem {
  /** Appended to the test root, e.g. "" for Overview or "practice". */
  segment: string;
  label: string;
  /** Sidebar items are grouped by this; the number itself has no meaning. */
  group: number;
  icon: LucideIcon;
}

export const SAT_SECTIONS: TestSectionItem[] = [
  { segment: "", label: "Overview", group: 1, icon: LayoutDashboard },
  { segment: "practice", label: "Practice", group: 2, icon: BookOpenCheck },
  { segment: "question-bank", label: "Question Bank", group: 2, icon: Database },
  { segment: "exams", label: "Practice Exams", group: 3, icon: ClipboardList },
  { segment: "progress", label: "Progress", group: 4, icon: LineChart },
];

/** The href for a section of a given test. */
export function sectionHref(testId: string, segment: string): string {
  return segment ? `${TEST_PREP_ROOT}/${testId}/${segment}` : `${TEST_PREP_ROOT}/${testId}`;
}

export function isTestPrepPath(pathname: string): boolean {
  return pathname === TEST_PREP_ROOT || pathname.startsWith(`${TEST_PREP_ROOT}/`);
}

/**
 * Which section a path is in.
 *
 * Exact match rather than prefix: the runner routes (`/session/:id`,
 * `/exam/:id`, `/results/:id`) are deliberately outside the sidebar, and
 * prefix-matching would light up a section while the student is mid-exam on a
 * page that has no sidebar at all.
 */
export function activeSection(pathname: string, testId: string): TestSectionItem | undefined {
  return SAT_SECTIONS.find((s) => sectionHref(testId, s.segment) === pathname);
}

/**
 * The URL for a practice run.
 *
 * Sessions are addressed by their configuration rather than by an id, so every
 * "Practice this skill" link anywhere in the section is a plain href that can
 * be opened, bookmarked or shared — the runner builds the set on arrival. An
 * id-based route would have meant creating a session record before navigating,
 * which turns every link into a button.
 */
export function sessionHref(
  testId: string,
  params: {
    kind: string;
    subject?: string;
    domain?: string;
    skill?: string;
    difficulty?: string;
    count?: number;
    minutes?: number;
    /**
     * An explicit, ordered set of question ids. When present the runner uses
     * this list verbatim — e.g. a hand-picked selection from the Question
     * Bank table — instead of filtering the bank by the other params.
     */
    ids?: string[];
    /**
     * Forces a distinct URL for an otherwise identical set.
     *
     * "Another set" links to the configuration that was just finished, so
     * without this the target would equal the current location and the router
     * would do nothing at all — a button that visibly does not work. The runner
     * ignores the value; only its presence matters.
     */
    nonce?: string | number;
  },
): string {
  const q = new URLSearchParams();
  q.set("kind", params.kind);
  if (params.subject) q.set("subject", params.subject);
  if (params.domain) q.set("domain", params.domain);
  if (params.skill) q.set("skill", params.skill);
  if (params.difficulty && params.difficulty !== "mixed") q.set("difficulty", params.difficulty);
  if (params.count) q.set("count", String(params.count));
  if (params.minutes) q.set("minutes", String(params.minutes));
  if (params.ids && params.ids.length > 0) q.set("ids", params.ids.join(","));
  if (params.nonce !== undefined) q.set("r", String(params.nonce));
  return `${TEST_PREP_ROOT}/${testId}/session?${q.toString()}`;
}

/** The URL for an exam sitting. `sections` is "rw", "math" or both. */
export function examHref(testId: string, sections: string[]): string {
  return `${TEST_PREP_ROOT}/${testId}/exam?sections=${sections.join(",")}`;
}

export function resultsHref(testId: string, attemptId: string): string {
  return `${TEST_PREP_ROOT}/${testId}/results/${attemptId}`;
}
