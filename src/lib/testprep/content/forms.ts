/**
 * The full-length practice tests.
 *
 * Each test fixes its two Module 1s and its two harder Module 2s. A student
 * who does less well on a Module 1 is routed, as on the real test, to an
 * easier Module 2 -- that one is assembled from the practice bank's easy and
 * medium questions when the sitting starts (see `buildFormExam`), so the fixed
 * content goes where it matters most: the modules every strong student sees.
 */

import type { Question } from "../types";
import { PT1_M1, PT1_M2, PT1_RW1, PT1_RW2 } from "./pt1";
import { PT2_M1, PT2_M2, PT2_RW1, PT2_RW2 } from "./pt2";
import { PT3_M1, PT3_M2, PT3_RW1, PT3_RW2 } from "./pt3";
import { PT4_M1, PT4_M2, PT4_RW1, PT4_RW2 } from "./pt4";

export interface PracticeForm {
  id: string;
  number: number;
  name: string;
  /** One line on what sets this test apart. */
  blurb: string;
  rw1: Question[];
  rw2: Question[];
  math1: Question[];
  math2: Question[];
}

export const PRACTICE_FORMS: PracticeForm[] = [
  {
    id: "pt1",
    number: 1,
    name: "Practice Test 1",
    blurb: "A balanced first sitting across every domain.",
    rw1: PT1_RW1,
    rw2: PT1_RW2,
    math1: PT1_M1,
    math2: PT1_M2,
  },
  {
    id: "pt2",
    number: 2,
    name: "Practice Test 2",
    blurb: "More data: tables, bar graphs and two-line charts.",
    rw1: PT2_RW1,
    rw2: PT2_RW2,
    math1: PT2_M1,
    math2: PT2_M2,
  },
  {
    id: "pt3",
    number: 3,
    name: "Practice Test 3",
    blurb: "Heavier on literature, poetry and geometry.",
    rw1: PT3_RW1,
    rw2: PT3_RW2,
    math1: PT3_M1,
    math2: PT3_M2,
  },
  {
    id: "pt4",
    number: 4,
    name: "Practice Test 4",
    blurb: "The hardest of the four, for students aiming at 1500 and above.",
    rw1: PT4_RW1,
    rw2: PT4_RW2,
    math1: PT4_M1,
    math2: PT4_M2,
  },
];

export const FORM_QUESTIONS: Question[] = PRACTICE_FORMS.flatMap((f) => [
  ...f.rw1,
  ...f.rw2,
  ...f.math1,
  ...f.math2,
]);

export function formById(id: string | null | undefined): PracticeForm | undefined {
  return PRACTICE_FORMS.find((f) => f.id === id);
}
