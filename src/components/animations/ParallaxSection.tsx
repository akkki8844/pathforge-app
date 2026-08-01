import { motion, useScroll, useTransform, useSpring, useReducedMotion } from "framer-motion";
import { useRef, ReactNode } from "react";

interface ParallaxSectionProps {
  children: ReactNode;
  className?: string;
  speed?: number;
}

export function ParallaxSection({ children, className = "", speed = 0.25 }: ParallaxSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // Spring-smoothed parallax — eliminates the jittery linear feel.
  // Stiffened from 80/24/0.4: that combination was heavily overdamped, so the
  // layer visibly lagged the scrollbar. Smoothing the jitter is the point;
  // trailing half a second behind the page just reads as the page being slow.
  const range = 80 * speed;
  const rawY = useTransform(scrollYProgress, [0, 1], [range, -range]);
  const y = useSpring(rawY, { stiffness: 180, damping: 30, mass: 0.25 });

  if (prefersReduced) {
    return <div ref={ref} className={className} style={{ position: "relative" }}>{children}</div>;
  }

  return (
    <div ref={ref} className={className} style={{ position: "relative" }}>
      <motion.div style={{ y, willChange: "transform" }}>{children}</motion.div>
    </div>
  );
}
