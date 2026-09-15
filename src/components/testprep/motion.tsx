import { type ReactNode, useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
} from "framer-motion";
import { cn } from "@/lib/utils";
import { DURATION, EASE_OUT_EXPO, STAGGER_WINDOW } from "@/lib/motion";

/**
 * The section's motion layer.
 *
 * Every SAT page was writing its own `initial`/`animate`/`transition` triple,
 * which is how a product ends up with four slightly different entrances on one
 * screen. These four components are the entire vocabulary: something arrives
 * (`Reveal`), a list arrives in order (`Stagger`), a region opens (`Collapse`),
 * or a number changes (`AnimatedNumber`). Nothing loops, nothing bounces, and
 * every one of them collapses to a no-op under `prefers-reduced-motion`.
 */

/** Entrance for a single block. `delay` places it in the page's arrival order. */
export function Reveal({
  children,
  delay = 0,
  y = 8,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  delay?: number;
  /** Distance travelled. Dense rows use less so they don't read as a jump. */
  y?: number;
  className?: string;
  as?: "div" | "section" | "header";
}) {
  const reduced = useReducedMotion();
  const Component = Tag === "section" ? motion.section : Tag === "header" ? motion.header : motion.div;
  return (
    <Component
      initial={reduced ? false : { opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION.base, ease: EASE_OUT_EXPO, delay: reduced ? 0 : delay }}
      className={className}
    >
      {children}
    </Component>
  );
}

/**
 * A list that arrives in order.
 *
 * The step is clamped so a long list never turns into a progress bar: twenty
 * rows at a fixed gap would still be dealing themselves out a second later,
 * which reads as slow loading rather than as sequence.
 */
export function Stagger({
  children,
  className,
  delay = 0,
  step = 0.035,
  count,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  step?: number;
  /** Number of children, used to keep the whole runway inside the window. */
  count?: number;
  as?: "div" | "ul";
}) {
  const reduced = useReducedMotion();
  const gap = count && count > 1 ? Math.min(step, STAGGER_WINDOW / (count - 1)) : step;
  const Component = Tag === "ul" ? motion.ul : motion.div;
  return (
    <Component
      className={className}
      initial={reduced ? false : "hidden"}
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: gap, delayChildren: delay },
        },
      }}
    >
      {children}
    </Component>
  );
}

/** A child of {@link Stagger}. */
export function StaggerItem({
  children,
  className,
  y = 8,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  y?: number;
  as?: "div" | "li";
}) {
  const Component = Tag === "li" ? motion.li : motion.div;
  return (
    <Component
      className={className}
      variants={{
        hidden: { opacity: 0, y },
        visible: { opacity: 1, y: 0, transition: { duration: DURATION.base, ease: EASE_OUT_EXPO } },
      }}
    >
      {children}
    </Component>
  );
}

/**
 * A region that opens and closes.
 *
 * Height and opacity are timed separately: the fade is quicker than the
 * measure, so the content is legible before the box has finished growing
 * instead of arriving all at once at the end.
 */
export function Collapse({
  open,
  children,
  className,
}: {
  open: boolean;
  children: ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={reduced ? false : { height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
          transition={{
            height: { duration: DURATION.base, ease: EASE_OUT_EXPO },
            opacity: { duration: DURATION.fast, ease: EASE_OUT_EXPO },
          }}
          className={cn("overflow-hidden", className)}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * A number that moves to its new value rather than cutting to it.
 *
 * Used for scores and counts, where the change is the information. `from`
 * makes it count up on first paint — reserved for the two places a score is
 * the headline, because counting up a value that did not change is a gimmick.
 */
export function AnimatedNumber({
  value,
  from,
  className,
  format = (n) => String(Math.round(n)),
}: {
  value: number;
  /** Start here on mount instead of at `value`. */
  from?: number;
  className?: string;
  format?: (n: number) => string;
}) {
  const reduced = useReducedMotion();
  const mounted = useRef(false);
  const mv = useMotionValue(from !== undefined && !reduced ? from : value);
  const [shown, setShown] = useState(() =>
    from !== undefined && !reduced ? from : value,
  );

  useEffect(() => {
    if (reduced) {
      setShown(value);
      return;
    }
    // Nothing to animate on a re-render that did not change the number.
    if (mounted.current && mv.get() === value) return;
    mounted.current = true;
    const controls = animate(mv, value, {
      duration: DURATION.slow,
      ease: EASE_OUT_EXPO,
      onUpdate: setShown,
    });
    return () => controls.stop();
  }, [value, reduced, mv]);

  return (
    <span className={className}>{format(shown)}</span>
  );
}
