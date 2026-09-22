/**
 * The editorial lines that rotate beside the sign-in forms.
 *
 * WHAT THESE ARE, AND WHAT THEY ARE NOT
 *
 * These are Pathforge's own editorial voice — the same register as the
 * blockquote on the landing page, which is likewise unattributed to any
 * individual. They are a statement of the standard the product holds a file to.
 *
 * They are deliberately NOT testimonials. Nobody is quoted, no name is invented,
 * no rating is implied, and no third-party platform is referenced. That
 * distinction is the whole point: see the long note in `src/data/reviews.ts`
 * for why a hand-written quote attributed to a student who does not exist is
 * prohibited under 16 CFR Part 465 in the US and the CCPA's misleading
 * advertisement guidelines in India. A house editorial line, signed as the
 * house, carries none of that problem — it makes no claim about what a
 * customer said.
 *
 * IF YOU EDIT THESE
 *
 * Keep them claims about the standard, not claims about results. "Ten students
 * got into Stanford" is an outcome claim that needs evidence; "a file is a
 * claim, and every claim needs its evidence" is an editorial position, which is
 * ours to state. Never add a `by` that names a person unless that person really
 * said it and consented to being quoted here.
 */

export interface AuthQuote {
  /** The line itself. Typeset as a blockquote, so no surrounding quote marks. */
  text: string;
  /**
   * Who is speaking. Always the house today — see the note above before
   * putting a person's name here.
   */
  by: string;
}

/**
 * Shown beside the student sign-in form.
 *
 * The audience is a student who is about to spend two years building a file,
 * so each line is about how that file gets built rather than about where it
 * lands. Order matters only in that the first one is the one most visitors
 * will read, since the rotation is slower than most sign-ins.
 */
export const STUDENT_AUTH_QUOTES: AuthQuote[] = [
  {
    text: "The students who get in are not the loudest. They are the ones whose file tells a coherent story — chosen carefully, edited honestly, defended with evidence.",
    by: "Pathforge editorial",
  },
  {
    text: "An activity list is not a list of things you did. It is an argument about what you care about, and it has to survive being read by someone who owes you nothing.",
    by: "Pathforge editorial",
  },
  {
    text: "A first draft is supposed to be bad. The work is in the fourth one, and the only way to get there is to start early enough that a fourth draft is possible.",
    by: "Pathforge editorial",
  },
  {
    text: "Nobody is admitted for potential in the abstract. They are admitted for the specific, checkable things they did with the years they had.",
    by: "Pathforge editorial",
  },
  {
    text: "Deadlines do not sneak up on anybody. They are published years in advance, and the only thing that ever changes is when you decided to look at them.",
    by: "Pathforge editorial",
  },
  {
    text: "Write the essay only you could have written. An essay that any strong applicant could have submitted has already told the reader nothing.",
    by: "Pathforge editorial",
  },
];

/**
 * Shown beside the counsellor sign-in form.
 *
 * Same register, different job: a counsellor signing in at eight in the morning
 * is about to decide who gets their attention today, so these are about
 * triage, evidence and the limits of what a counsellor can honestly promise.
 */
export const COUNSELLOR_AUTH_QUOTES: AuthQuote[] = [
  {
    text: "A cohort is never behind evenly. The work is finding the four students who went quiet before the deadline finds them for you.",
    by: "Pathforge editorial",
  },
  {
    text: "The most useful thing a counsellor does is not the advice. It is being the one person who read the draft closely enough to say where it stops being true.",
    by: "Pathforge editorial",
  },
  {
    text: "Feedback a student cannot act on this week is not feedback. It is a note about how the essay made you feel.",
    by: "Pathforge editorial",
  },
  {
    text: "You cannot promise an outcome. You can promise that nothing in the file was left to chance, and that is the promise worth keeping.",
    by: "Pathforge editorial",
  },
  {
    text: "Every student you carry in your head is a student you will eventually forget on the wrong week. Write it down where the follow-up lives.",
    by: "Pathforge editorial",
  },
  {
    text: "Read the file the way an admissions officer will: quickly, once, and with no obligation to be generous about what it left out.",
    by: "Pathforge editorial",
  },
];
