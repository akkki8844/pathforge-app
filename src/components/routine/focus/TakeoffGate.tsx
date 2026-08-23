/**
 * The last moment before the session starts.
 *
 * Everything else in this feature is dark. This screen is not, and the reversal
 * is the whole point: the cabin lights come up, the world outside the window
 * goes white, and for four seconds nothing is asked of the student except to
 * press one button. It is the visual equivalent of the pause on the runway.
 *
 * There is exactly one control. No settings, no back-out, no secondary action
 * competing for the eye — because this is the instant the commitment is made,
 * and a screen offering three choices is a screen that invites reconsidering.
 */
import { motion, useReducedMotion } from "framer-motion";
import { PlaneTakeoff } from "lucide-react";
import { EASE_OUT_EXPO } from "@/lib/motion";

export function TakeoffGate({ onGo }: { onGo: () => void }) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center overflow-hidden bg-[#f4f4f0]">
      {/* Sun flare through the window. Two soft warm blooms, off-centre so the
          field is not symmetrical — symmetry here reads as a loading screen. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 78% 18%, rgba(255,224,160,0.55), transparent 70%), " +
            "radial-gradient(70% 60% at 22% 88%, rgba(200,220,255,0.4), transparent 70%)",
        }}
      />

      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
        className="relative z-10 flex flex-col items-center px-6 text-center"
      >
        <motion.span
          animate={reduceMotion ? undefined : { x: [0, 5, 0], y: [0, -3, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <PlaneTakeoff className="h-8 w-8 text-slate-800" aria-hidden="true" />
        </motion.span>

        <p className="mt-8 text-balance text-lg leading-relaxed text-slate-700 sm:text-xl">
          Cabin doors closed,
          <br />
          ready for takeoff.
        </p>

        <motion.button
          type="button"
          onClick={onGo}
          autoFocus
          initial={reduceMotion ? false : { opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.5, ease: EASE_OUT_EXPO }}
          whileTap={{ scale: 0.96 }}
          className="mt-10 rounded-full bg-slate-900 px-9 py-3 font-sans text-sm font-bold uppercase tracking-[0.2em] text-white outline-none transition-colors hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f4f4f0]"
        >
          Go
        </motion.button>
      </motion.div>
    </div>
  );
}
