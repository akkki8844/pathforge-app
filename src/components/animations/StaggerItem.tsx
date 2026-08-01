import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ReactNode } from "react";
import { fadeUp } from "@/lib/motion";

interface StaggerItemProps {
  children: ReactNode;
  className?: string;
  variants?: Variants;
}

/**
 * A child of StaggerContainer. Exists so callers write <StaggerItem> instead
 * of importing variant objects and remembering to spread them onto a
 * motion.div by hand.
 */
export function StaggerItem({ children, className = "", variants = fadeUp }: StaggerItemProps) {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div variants={variants} className={className}>
      {children}
    </motion.div>
  );
}
