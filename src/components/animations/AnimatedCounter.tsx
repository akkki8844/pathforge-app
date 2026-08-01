import { motion, useMotionValue, useTransform, animate, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";
import { viewportOnce } from "@/lib/motion";

interface AnimatedCounterProps {
  target: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  className?: string;
  /** Decimal places to hold while counting. Defaults to whole numbers. */
  decimals?: number;
  /** Group thousands with separators (12,480). */
  separator?: boolean;
}

export function AnimatedCounter({
  target,
  suffix = "",
  prefix = "",
  // 2s of ticking is long past the point where the number stops being
  // information and becomes something you wait out.
  duration = 1.1,
  className = "",
  decimals = 0,
  separator = false,
}: AnimatedCounterProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, viewportOnce);
  const prefersReduced = useReducedMotion();
  const count = useMotionValue(0);

  const formatted = useTransform(count, (val) => {
    const fixed = val.toFixed(decimals);
    if (!separator) return fixed;
    const [whole, frac] = fixed.split(".");
    const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return frac ? `${grouped}.${frac}` : grouped;
  });

  useEffect(() => {
    if (!isInView) return;
    // Reduced motion still needs the correct number on screen — snap to it
    // rather than leaving the counter parked at zero.
    if (prefersReduced) {
      count.set(target);
      return;
    }
    const controls = animate(count, target, { duration, ease: "easeOut" });
    return () => controls.stop();
  }, [isInView, target, count, duration, prefersReduced]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      <motion.span>{formatted}</motion.span>
      {suffix}
    </span>
  );
}
