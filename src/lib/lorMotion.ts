import { useReducedMotion } from "framer-motion";

/**
 * Entry animation for the recommender list.
 *
 * Motivated, not decorative: it establishes reading order. Rows arrive in the
 * order you should read them, so on a pipeline list "earliest stage first" is
 * felt rather than only labelled.
 *
 * The stagger is capped at ten steps because an uncapped per-row delay makes
 * the last row of a long roster arrive over a second late, which stops reading
 * as sequence and starts reading as lag. Under `prefers-reduced-motion` it
 * returns no animation at all rather than a faster one.
 *
 * Lives here rather than beside the surface components because a module that
 * exports both a hook and components breaks React Fast Refresh, and losing
 * hot reload to save a file is a bad trade.
 */
export function useStagger() {
  const reduced = useReducedMotion();
  return (index: number) =>
    reduced
      ? { initial: false as const, animate: { opacity: 1, y: 0 } }
      : {
          initial: { opacity: 0, y: 10 },
          animate: { opacity: 1, y: 0 },
          transition: {
            duration: 0.42,
            delay: Math.min(index, 10) * 0.035,
            ease: [0.16, 1, 0.3, 1] as const,
          },
        };
}
