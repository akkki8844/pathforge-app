import { useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { GemIcon } from "@/components/icons/FlatIcons";
import { EASE_BACK, EASE_OUT_EXPO } from "@/lib/motion";

/**
 * The +5 gems moment, shown the instant a proof is verified.
 *
 * Deliberately lighter than {@link PhaseReward}: finishing a whole phase earns
 * a modal you have to dismiss, but a single verified proof happens often enough
 * that a blocking dialog would become something to click past. Same vocabulary
 * — scrim, spring-in card, the flat icon set — half the weight, and it clears
 * itself.
 */

/** How long the card stays up before it retires itself. */
const DWELL_MS = 2600;

export function GemAward({
  amount,
  onDismiss,
}: {
  /** Gems credited. Zero or less renders nothing — never celebrate a no-op. */
  amount: number;
  onDismiss: () => void;
}) {
  const reduced = useReducedMotion();
  const show = amount > 0;

  useEffect(() => {
    if (!show) return;
    const t = setTimeout(onDismiss, DWELL_MS);
    return () => clearTimeout(t);
  }, [show, onDismiss]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm"
          onClick={onDismiss}
          role="status"
          aria-live="polite"
        >
          <motion.div
            initial={reduced ? { opacity: 0 } : { scale: 0.88, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { scale: 0.96, opacity: 0 }}
            transition={{ duration: reduced ? 0.15 : 0.42, ease: EASE_BACK }}
            className="relative w-full max-w-[19rem] rounded-2xl border border-primary/25 bg-card p-7 text-center shadow-[0_18px_44px_rgba(33,48,88,0.16)]"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              initial={reduced ? false : { scale: 0.7, rotate: -8 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: reduced ? 0 : 0.5, delay: reduced ? 0 : 0.06, ease: EASE_BACK }}
            >
              <GemIcon className="mx-auto h-16 w-16" />
            </motion.div>

            {/* The figure is the message. Instrument Serif, as everywhere a
                number carries the weight in this product. */}
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduced ? 0 : 0.34, delay: reduced ? 0 : 0.14, ease: EASE_OUT_EXPO }}
              className="mt-3 font-serif text-[3.25rem] leading-none tracking-[-0.02em] text-primary"
            >
              +{amount}
            </motion.div>

            <div className="mt-2 font-display text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              {amount === 1 ? "Gem" : "Gems"}
            </div>

            <p className="mt-4 text-[13px] leading-relaxed text-muted-foreground">
              Evidence verified. That is the only way gems are earned here.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
