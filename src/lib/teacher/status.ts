/**
 * One status vocabulary for the counsellor workspace.
 *
 * WHAT THIS REPLACES
 *
 * Eighty-three hardcoded palette classes across five pages. Applications alone
 * gave its seven statuses seven different hues - blue for researching, indigo
 * for planning, green for submitted, emerald for admitted - a distinction no
 * reader can decode and which carries no meaning beyond "these are different".
 * Students had its own red/amber/green, Essays a fourth set, Analytics a fifth
 * built out of `text-purple-600` and `text-cyan-600`.
 *
 * Two things were wrong with that beyond the noise:
 *
 *  - The theme has `--success`, `--warning` and `--destructive`, each with a
 *    separate dark-mode value chosen for contrast on the dark surface. A
 *    literal `text-green-600` ignores all of it, so half of these badges sat
 *    under 3:1 in dark mode. The rest of the product already uses the tokens -
 *    see the comms components - so the counsellor pages were the outlier.
 *  - Seven hues means seven things to learn. Five tones means a counsellor
 *    reads severity at a glance and never has to remember that emerald
 *    outranks green.
 *
 * ADDING A STATUS
 *
 * Map it to a tone, do not invent a colour. If it genuinely does not fit one
 * of the five, that is a sign the tone scale is wrong, not that the status
 * needs its own hue.
 */

/**
 * Severity, not identity.
 *
 * `neutral` is "nothing has happened yet", `progress` is "under way",
 * `good` is "this went well", `warn` is "this needs attention", and `bad` is
 * "this went badly". Nothing here encodes which page it came from.
 */
export type StatusTone = "neutral" | "progress" | "good" | "warn" | "bad";

/** Badge classes for a tone. Same shape the comms components use. */
export const TONE_BADGE: Record<StatusTone, string> = {
  neutral: "border-border bg-muted text-muted-foreground",
  progress: "border-accent/30 bg-accent/10 text-accent",
  good: "border-success/30 bg-success/10 text-success",
  warn: "border-warning/30 bg-warning/10 text-warning",
  bad: "border-destructive/30 bg-destructive/10 text-destructive",
};

/** Text-only classes, for a figure or a deadline rather than a badge. */
export const TONE_TEXT: Record<StatusTone, string> = {
  neutral: "text-muted-foreground",
  progress: "text-accent",
  good: "text-success",
  warn: "text-warning",
  bad: "text-destructive",
};

/**
 * Where an application has got to.
 *
 * The lifecycle is researching, planning, drafting, submitted, then one of
 * three outcomes. Everything before submission is neutral or in progress: a
 * student who is "planning" has not done anything good or bad yet, and
 * colouring it as though they had is what made the old scale unreadable.
 */
export function applicationTone(status: string | null | undefined): StatusTone {
  switch ((status ?? "").toLowerCase()) {
    case "admitted":
      return "good";
    case "submitted":
      return "good";
    case "rejected":
      return "bad";
    case "waitlisted":
      return "warn";
    case "drafting":
      return "progress";
    case "researching":
    case "planning":
    default:
      return "neutral";
  }
}

/** The decision, once there is one. */
export function decisionTone(decision: string | null | undefined): StatusTone {
  switch ((decision ?? "").toLowerCase()) {
    case "admitted":
      return "good";
    case "rejected":
      return "bad";
    default:
      return "warn";
  }
}

/** Where an essay is in the review loop. */
export function essayTone(status: string | null | undefined): StatusTone {
  switch ((status ?? "").toLowerCase()) {
    case "reviewed":
      return "good";
    case "flagged":
      return "bad";
    case "revision_requested":
      return "warn";
    case "pending":
    default:
      return "neutral";
  }
}

/**
 * A student's standing, as the platform computes it.
 *
 * `top` is not "good news" in the sense a decision is, but it is the end of
 * the same scale, and a counsellor scanning a roster is reading severity.
 */
export function standingTone(status: string | null | undefined): StatusTone {
  switch ((status ?? "").toLowerCase()) {
    case "behind":
      return "bad";
    case "steady":
      return "warn";
    case "top":
      return "good";
    default:
      return "neutral";
  }
}

/**
 * How close a deadline is.
 *
 * Past due is bad, inside a week needs attention, anything further out is just
 * a date. The thresholds are days, and a null deadline has no tone because
 * there is nothing to be late for.
 */
export function deadlineTone(daysLeft: number | null): StatusTone {
  if (daysLeft === null) return "neutral";
  if (daysLeft < 0) return "bad";
  if (daysLeft <= 7) return "warn";
  return "neutral";
}
