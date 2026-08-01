import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef, Children, ReactNode } from "react";
import {
  DURATION,
  EASE_OUT_EXPO,
  STAGGER_STEP,
  staggerStep,
  viewportOnce,
} from "@/lib/motion";

interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
  once?: boolean;
}

const containerVariants = {
  hidden: { opacity: 1 },
  visible: (staggerDelay: number) => ({
    opacity: 1,
    transition: {
      staggerChildren: staggerDelay,
      delayChildren: 0.02,
    },
  }),
};

export const staggerItemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATION.base,
      ease: EASE_OUT_EXPO,
    },
  },
};

export function StaggerContainer({
  children,
  className = "",
  staggerDelay = STAGGER_STEP,
  once = true,
}: StaggerContainerProps) {
  const ref = useRef(null);
  const prefersReduced = useReducedMotion();
  const isInView = useInView(ref, { ...viewportOnce, once });

  // Clamp the per-child gap against the child count so a long grid finishes
  // dealing in the same time a short one does — otherwise the last card in a
  // 12-item grid didn't start until most of a second after the first.
  const step = staggerStep(Children.count(children), staggerDelay);

  if (prefersReduced) {
    return <div ref={ref} className={className}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      variants={containerVariants}
      custom={step}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      className={className}
    >
      {children}
    </motion.div>
  );
}
