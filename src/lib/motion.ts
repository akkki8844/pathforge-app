import type { Transition, Variants } from "framer-motion";

/**
 * Shared motion vocabulary.
 *
 * Every page was hand-rolling its own durations and easings, which is why the
 * site felt inconsistent — a card on one page settled in 0.22s and the same
 * card elsewhere took 0.7s. Import from here instead of inventing new numbers.
 */

/** Quart-out. Fast start, long settle — the house easing. */
export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;
/** Slight overshoot, for things that should feel springy (badges, chips). */
export const EASE_BACK = [0.34, 1.56, 0.64, 1] as const;

/**
 * Timing scale.
 *
 * Calibrated so the UI answers immediately: micro-interactions land inside a
 * frame budget you don't consciously notice, entrances read as "already there"
 * by the time your eye arrives, and only genuinely large moves get to run long.
 * The previous scale (0.18 / 0.34 / 0.6) was roughly 1.6x these numbers, which
 * is what made the site feel like it was thinking before it responded.
 */
export const DURATION = {
  /** Hover states, colour shifts, taps. */
  fast: 0.13,
  /** The default for anything entering the viewport. */
  base: 0.22,
  /** Hero text, large panels — the longest anything should run. */
  slow: 0.36,
} as const;

export const transition = {
  fast: { duration: DURATION.fast, ease: EASE_OUT_EXPO },
  base: { duration: DURATION.base, ease: EASE_OUT_EXPO },
  slow: { duration: DURATION.slow, ease: EASE_OUT_EXPO },
  // Stiffer than before at the same damping ratio (~0.75), so the shape of the
  // settle is unchanged — it just gets there sooner.
  spring: { type: "spring", stiffness: 560, damping: 36 },
  softSpring: { type: "spring", stiffness: 360, damping: 28 },
} satisfies Record<string, Transition>;

/** Rise into place. The workhorse. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: transition.base },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: transition.base },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: { opacity: 1, scale: 1, transition: transition.base },
};

/**
 * Longest the *whole* stagger runway may take, in seconds.
 *
 * Without a cap, stagger is O(n): a 12-card grid at 0.06s/card meant the last
 * card didn't begin until 0.72s after the first, then still had its own
 * duration to run. Anything past roughly a quarter-second of runway stops
 * reading as "dealt in sequence" and starts reading as "loading".
 */
export const STAGGER_WINDOW = 0.24;

/** Default gap between siblings, before clamping. */
export const STAGGER_STEP = 0.04;

/**
 * Per-child gap that keeps `count` children inside {@link STAGGER_WINDOW}.
 * Short lists get the full step; long lists get a proportionally tighter one
 * so the tail never trails off.
 */
export function staggerStep(count: number, step: number = STAGGER_STEP): number {
  if (count <= 1) return 0;
  return Math.min(step, STAGGER_WINDOW / (count - 1));
}

/** Parent for a staggered group. Pass the gap via `custom`. */
export const staggerParent: Variants = {
  hidden: {},
  visible: (stagger: number = STAGGER_STEP) => ({
    transition: { staggerChildren: stagger, delayChildren: 0.02 },
  }),
};

/**
 * Item in a filterable list. `exit` runs when a filter removes it, which is
 * why this can't just reuse fadeUp.
 */
export const listItem: Variants = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: transition.base },
  exit: { opacity: 0, scale: 0.96, transition: transition.fast },
};

/** Full-screen scrim behind a modal. */
export const overlay: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: transition.fast },
  exit: { opacity: 0, transition: transition.fast },
};

/** The modal panel itself. */
export const modalPanel: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: transition.base },
  exit: { opacity: 0, y: 10, scale: 0.98, transition: transition.fast },
};

/**
 * Hover/press feel for clickable cards.
 *
 * Kept to transform + opacity so the compositor handles it without layout
 * work — animating box-shadow or height here would cost a repaint per frame
 * on every card in a grid.
 */
export const hoverLift = {
  whileHover: { y: -4, transition: transition.fast },
  whileTap: { scale: 0.985, transition: transition.fast },
} as const;

/** Lighter version for dense rows where -4px would look like a jump. */
export const hoverNudge = {
  whileHover: { y: -2, transition: transition.fast },
  whileTap: { scale: 0.99, transition: transition.fast },
} as const;

/**
 * Standard viewport trigger.
 *
 * The bottom margin is POSITIVE, which grows the observer root past the fold
 * so a reveal starts just before its element scrolls into view and is settled
 * by the time you can read it. The old `-12%` shrank the root instead, so
 * nothing moved until the element was already an eighth of a screen inside —
 * you watched content arrive late, which is most of what "laggy" meant here.
 */
export const viewportOnce = { once: true, margin: "0px 0px 10% 0px" } as const;
