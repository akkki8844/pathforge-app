/**
 * Class strings shared across the section.
 *
 * These live outside the component files on purpose: a module that exports both
 * components and plain values breaks fast refresh, and the section already had
 * one lint warning from exactly that. They are also literal strings rather than
 * anything interpolated, which is what Tailwind's scanner requires.
 */

/** The section's card. One radius, one border weight, everywhere. */
export const SURFACE = "rounded-xl border border-border/70 bg-card";

/** Focus treatment for bare buttons and rows that are not `Button`. */
export const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** Interactive row: the hover wash used by every list in the section. */
export const ROW_HOVER = "transition-colors hover:bg-muted/40";

/** Small uppercase label. Used above figures and section blocks. */
export const EYEBROW =
  "text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground";

/** The same label in the Bluebook blue. Used once, on Your next move. */
export const EYEBROW_ACCENT =
  "text-[10px] font-semibold uppercase tracking-[0.14em] text-[hsl(var(--bb-blue))]";

/* ------------------------------------------------------------------ */
/* Bluebook — the digital-testing look, scoped to Exam and Session      */
/* ------------------------------------------------------------------ */

/** The navy toolbar every timed/practice runner opens with. */
export const BB_TOOLBAR = "border-b border-[hsl(var(--bb-navy))] bg-[hsl(var(--bb-navy))]";

/** Toolbar text/icon colour, for anything sitting directly on `BB_TOOLBAR`. */
export const BB_TOOLBAR_FG = "text-[hsl(var(--bb-navy-foreground))]";

/** Muted toolbar text — labels that share the bar but aren't the clock. */
export const BB_TOOLBAR_MUTED = "text-[hsl(var(--bb-navy-foreground)/0.68)]";

/** The clock pill. */
export const BB_TIMER = "rounded-full bg-[hsl(var(--bb-navy-foreground)/0.12)] px-3 py-1";

/** A toolbar icon-button (calculator, exit, mark for review). */
export const BB_TOOLBAR_BUTTON =
  "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-[hsl(var(--bb-navy-foreground)/0.82)] transition-colors hover:bg-[hsl(var(--bb-navy-foreground)/0.12)] hover:text-[hsl(var(--bb-navy-foreground))]";

/** Same button, pressed/active state. */
export const BB_TOOLBAR_BUTTON_ACTIVE = "bg-[hsl(var(--bb-navy-foreground)/0.16)] text-[hsl(var(--bb-navy-foreground))]";

/** The exam's light top bar — module title, timer and tools above the banner. */
export const BB_TOPBAR = "border-b border-border bg-card";

/** A light-topbar icon-button (Hide, Highlight, More). */
export const BB_TOPBAR_BUTTON =
  "inline-flex flex-col items-center gap-0.5 rounded-md px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

/** Same button, pressed/active state. */
export const BB_TOPBAR_BUTTON_ACTIVE = "bg-[hsl(var(--bb-blue-soft))] text-[hsl(var(--bb-blue))]";

/** The navy banner under the top bar, stating the sitting's kind. */
export const BB_BANNER =
  "bg-[hsl(var(--bb-navy))] py-1.5 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-[hsl(var(--bb-navy-foreground))]";

/** One cell of the question-navigator grid: unvisited/unanswered. */
export const BB_NAV_CIRCLE =
  "relative flex h-8 w-8 items-center justify-center rounded-full border text-[11px] font-semibold tabular-nums transition-colors border-border/70 text-muted-foreground hover:border-[hsl(var(--bb-blue)/0.5)]";

/** The current question's cell. */
export const BB_NAV_CIRCLE_CURRENT =
  "border-[hsl(var(--bb-blue))] bg-[hsl(var(--bb-blue))] text-[hsl(var(--bb-blue-foreground))]";

/** A cell for a question that already has an answer recorded. */
export const BB_NAV_CIRCLE_ANSWERED =
  "border-[hsl(var(--bb-blue)/0.4)] bg-[hsl(var(--bb-blue-soft))] text-foreground";

/** The small flag badge on a marked-for-review cell. */
export const BB_NAV_FLAG =
  "absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[hsl(var(--bb-flag))] text-[hsl(var(--bb-flag-foreground))]";

/** A score-report card's solid navy header strip (Practice Exams' past attempts). */
export const BB_SCORE_CARD_HEADER = "bg-[hsl(var(--bb-navy))] px-5 py-3 text-[hsl(var(--bb-navy-foreground))]";

/** The card's second bar — attempt label and date, under the navy header. */
export const BB_SCORE_CARD_SUBBAR =
  "bg-[hsl(var(--bb-blue))] px-5 py-2 text-[hsl(var(--bb-blue-foreground))]";

/** The primary pill CTA at the foot of a score card — full score breakdown. */
export const BB_SCORE_CARD_CTA =
  "inline-flex w-full items-center justify-center rounded-full bg-warning px-4 py-2.5 text-sm font-bold text-warning-foreground transition-colors hover:bg-warning/90";

/** The secondary pill on a score card — an in-app action, outlined. */
export const BB_SCORE_CARD_SECONDARY =
  "inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted";
