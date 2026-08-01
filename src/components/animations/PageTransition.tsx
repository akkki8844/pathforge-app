import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useLocation } from "react-router-dom";
import { ReactNode } from "react";
import { EASE_OUT_EXPO } from "@/lib/motion";

interface PageTransitionProps {
  children: ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();
  const reduce = useReducedMotion();

  // Respect OS-level reduced-motion: skip the animation entirely
  // (avoids per-navigation blur/filter compositing cost on low-power devices).
  if (reduce) {
    return <>{children}</>;
  }

  return (
    /*
     * `mode="wait"` means the incoming page cannot start until the outgoing
     * one has finished, so the exit duration is paid in full on every single
     * navigation before anything new appears. Keeping it (a crossfade here
     * would show two pages stacked mid-scroll) but making the exit near-zero:
     * the old page is gone in ~50ms and the new one is settled ~200ms after
     * the click, which is about as fast as a transition can be while still
     * reading as a transition rather than a flash.
     */
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.16, ease: EASE_OUT_EXPO } }}
        exit={{ opacity: 0, transition: { duration: 0.05, ease: "linear" } }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
