import { motion, useInView, useReducedMotion } from "framer-motion";
import { ReactNode, useRef } from "react";
import { DURATION, EASE_OUT_EXPO, viewportOnce } from "@/lib/motion";

interface TextRevealProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  /** Animate on mount rather than waiting for the element to scroll in. */
  immediate?: boolean;
}

export function TextReveal({
  children,
  delay = 0,
  className = "",
  immediate = false,
}: TextRevealProps) {
  const ref = useRef(null);
  const prefersReduced = useReducedMotion();
  const inView = useInView(ref, viewportOnce);

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  // Below-the-fold headings used to slide up the moment the page mounted, so
  // by the time you scrolled to them the reveal had already played.
  const shouldPlay = immediate || inView;

  return (
    <div ref={ref} className={`overflow-hidden ${className}`}>
      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        animate={shouldPlay ? { y: 0, opacity: 1 } : { y: "100%", opacity: 0 }}
        // Headings are the largest single move on a page, so this gets the
        // slow token — but 0.36s, not the 0.7s it was, which was long enough
        // that a stack of headings felt like it was being typed out.
        transition={{ duration: DURATION.slow, delay, ease: EASE_OUT_EXPO }}
      >
        {children}
      </motion.div>
    </div>
  );
}
