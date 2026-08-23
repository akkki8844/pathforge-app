import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import pathforgeLogo from "@/assets/pathforge-logo.webp";

// One line, changed every few seconds while the logo keeps spinning — long
// enough to read, short enough that a fast load only ever shows one.
const LOADING_PHRASES = [
  "Forging your path…",
  "Mapping your next move…",
  "Calibrating your advisor…",
  "Counting completed quests…",
  "Lining up your timetable…",
  "Checking today's credits…",
  "Sharpening your essay drafts…",
  "Loading your college list…",
  "Reviewing your activities…",
  "Warming up the recommendations…",
];

/**
 * The site-wide loading state: the logo spins once, pauses ~0.2s, spins
 * again — repeatDelay does that for free, since a rotate-to-360 animation
 * resets to 0 between reps rather than spinning continuously.
 */
export function LogoSpinner({ className, full = true }: { className?: string; full?: boolean }) {
  const [phraseIndex, setPhraseIndex] = useState(() => Math.floor(Math.random() * LOADING_PHRASES.length));

  useEffect(() => {
    const id = window.setInterval(() => {
      setPhraseIndex((i) => (i + 1) % LOADING_PHRASES.length);
    }, 2600);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4",
        full && "min-h-[100svh] bg-background",
        className,
      )}
    >
      <motion.img
        src={pathforgeLogo}
        alt="Pathforge"
        className="h-12 w-12 object-contain"
        animate={{ rotate: 360 }}
        transition={{ duration: 0.7, ease: "easeInOut", repeat: Infinity, repeatDelay: 0.2 }}
      />
      <AnimatePresence mode="wait">
        <motion.p
          key={phraseIndex}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
          className="text-sm text-muted-foreground"
        >
          {LOADING_PHRASES[phraseIndex]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
