import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef, ReactNode } from "react";
import { DURATION, EASE_OUT_EXPO, viewportOnce } from "@/lib/motion";

type Direction = "up" | "down" | "left" | "right" | "none";

interface ScrollRevealProps {
  children: ReactNode;
  direction?: Direction;
  delay?: number;
  duration?: number;
  className?: string;
  once?: boolean;
  distance?: number;
}

function getInitialProps(direction: Direction, distance: number) {
  const base: Record<string, number> = { opacity: 0 };
  if (direction === "up") base.y = distance;
  if (direction === "down") base.y = -distance;
  if (direction === "left") base.x = distance;
  if (direction === "right") base.x = -distance;
  return base;
}

export function ScrollReveal({
  children,
  direction = "up",
  delay = 0,
  // An entrance, not a set piece — DURATION.base. At 0.6s the element was
  // still arriving well after you'd scrolled to it and started reading.
  duration = DURATION.base,
  className = "",
  once = true,
  distance = 16,
}: ScrollRevealProps) {
  const ref = useRef(null);
  const prefersReduced = useReducedMotion();
  // `viewportOnce` uses a positive bottom margin, so this fires just before
  // the element crosses the fold and is settled by the time you look at it.
  const isInView = useInView(ref, { ...viewportOnce, once });

  if (prefersReduced) {
    return <div ref={ref} className={className}>{children}</div>;
  }

  const initial = getInitialProps(direction, distance);

  return (
    <motion.div
      ref={ref}
      initial={initial}
      animate={isInView ? { opacity: 1, x: 0, y: 0 } : initial}
      transition={{ duration, delay, ease: EASE_OUT_EXPO }}
      // No permanent will-change here: it pinned a compositor layer per reveal
      // for the life of the page. Framer promotes the element while it's
      // actually animating, which is the only time it helps.
      className={className}
    >
      {children}
    </motion.div>
  );
}
