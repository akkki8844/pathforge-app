import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Children, ReactNode } from "react";
import { STAGGER_STEP, staggerParent, staggerStep } from "@/lib/motion";

interface AnimatedGridProps {
  children: ReactNode;
  className?: string;
  /** Gap between each child's entrance, in seconds. */
  stagger?: number;
  /**
   * Changing this replays the stagger — pass whatever identifies the current
   * filter state so re-filtering feels like a fresh deal of cards.
   */
  replayKey?: string;
}

/**
 * Wrapper for grids whose contents change with a filter or search.
 *
 * `popLayout` pulls exiting children out of flow so the survivors slide into
 * their new positions instead of snapping. Children must be wrapped in
 * AnimatedGridItem (or carry their own `exit`) for the removal to animate.
 */
export function AnimatedGrid({
  children,
  className = "",
  stagger = STAGGER_STEP,
  replayKey,
}: AnimatedGridProps) {
  const prefersReduced = useReducedMotion();

  // Filtered grids are exactly where the runway runs away — clamp the gap so
  // a 30-result grid deals in the same window as a 4-result one.
  const step = staggerStep(Children.count(children), stagger);

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      key={replayKey}
      variants={staggerParent}
      custom={step}
      initial="hidden"
      animate="visible"
      className={className}
    >
      <AnimatePresence mode="popLayout">{children}</AnimatePresence>
    </motion.div>
  );
}
