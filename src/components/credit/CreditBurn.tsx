import { motion, AnimatePresence } from "framer-motion";
import { Flame, Zap } from "lucide-react";

/**
 * Fire burn animation that overlays the credit meter when a credit is consumed.
 * Pure CSS/SVG, no extra assets.
 */
export function CreditBurn({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 flex flex-col items-center"
        >
          {/* Floating credit chip drifting up */}
          <motion.div
            initial={{ y: 30, opacity: 1, scale: 1 }}
            animate={{ y: -10, opacity: 0, scale: 0.6 }}
            transition={{ duration: 1.4, ease: "easeOut" }}
            className="absolute"
          >
            <div className="flex items-center gap-1 rounded-full bg-amber-500/20 backdrop-blur px-2 py-0.5 border border-amber-400/40">
              <Zap className="h-3 w-3 text-amber-400" />
              <span className="text-[10px] font-bold text-amber-200">−1</span>
            </div>
          </motion.div>

          {/* Flame core */}
          <motion.div
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: [0.6, 1.3, 1.1, 0.2], opacity: [0, 1, 1, 0] }}
            transition={{ duration: 1.6, ease: "easeOut", times: [0, 0.2, 0.6, 1] }}
            className="relative"
          >
            <Flame
              className="h-10 w-10 text-orange-500 drop-shadow-[0_0_12px_hsl(20,90%,60%)]"
              strokeWidth={2}
              style={{ filter: "drop-shadow(0 0 8px hsl(35 100% 55%))" }}
            />
            {/* Sparks */}
            {[...Array(6)].map((_, i) => (
              <motion.span
                key={i}
                className="absolute left-1/2 top-1/2 h-1 w-1 rounded-full bg-amber-300"
                initial={{ x: 0, y: 0, opacity: 1 }}
                animate={{
                  x: Math.cos((i / 6) * Math.PI * 2) * 28,
                  y: Math.sin((i / 6) * Math.PI * 2) * 28 - 6,
                  opacity: 0,
                }}
                transition={{ duration: 1.0, delay: 0.1, ease: "easeOut" }}
                style={{ boxShadow: "0 0 6px hsl(35 100% 65%)" }}
              />
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
