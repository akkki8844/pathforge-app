/**
 * The gate: your pass is printed, and you have not torn it yet.
 *
 * This screen exists to be a *pause*. Everything is decided, the pass is real,
 * and the only thing left is the commitment — which is why the tear is a big,
 * unambiguous, accent-coloured action and "skip" is a quiet link underneath it.
 * Both work; only one of them is the experience.
 *
 * The tear plays for 750 ms before takeoff is called, which is the animation's
 * own length. Cutting away sooner throws away the only moment the student is
 * being asked to feel something.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EASE_OUT_EXPO } from "@/lib/motion";
import { BoardingPass } from "./BoardingPass";
import type { FocusFlight } from "@/lib/focus-flight/flight";

export function BoardingGate({
  flight,
  onBoard,
  onBack,
}: {
  flight: FocusFlight;
  onBoard: () => void;
  onBack: () => void;
}) {
  const [torn, setTorn] = useState(false);

  const tear = () => {
    if (torn) return;
    setTorn(true);
    window.setTimeout(onBoard, 750);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE_OUT_EXPO }}
        className="text-center"
      >
        <p className="font-sans text-[10px] font-bold uppercase tracking-[0.24em] text-accent">
          Now boarding
        </p>
        <h2 className="mt-3 font-sans text-2xl font-bold tracking-tight text-white sm:text-4xl">
          Gate {flight.gate} · Seat {flight.seat}
        </h2>
        <p className="mx-auto mt-2.5 max-w-md text-balance text-sm text-white/50">
          Pull the stub off the pass and you are in the air for {flight.plannedMinutes} minutes.
          Nothing else needs you until you land.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 22, rotateX: 6 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 0.55, delay: 0.1, ease: EASE_OUT_EXPO }}
        className="mt-8 [perspective:1200px]"
      >
        <BoardingPass flight={flight} torn={torn} onTear={tear} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: torn ? 0 : 1 }}
        transition={{ duration: 0.35, delay: torn ? 0 : 0.28 }}
        className="mt-8 flex flex-col items-center gap-3"
      >
        <p className="text-xs text-white/40">Drag the stub down to tear it</p>
        <Button
          size="lg"
          variant="outline"
          onClick={tear}
          disabled={torn}
          className="h-11 min-w-[15rem] border-white/15 bg-white/[0.04] text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white"
        >
          <Scissors className="mr-2 h-4 w-4" aria-hidden="true" />
          Tear &amp; take off
        </Button>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBoard}
            disabled={torn}
            className="text-xs text-white/45 underline-offset-4 transition-colors hover:text-white/75 hover:underline"
          >
            Skip boarding, go straight in
          </button>
          <span className="h-3 w-px bg-white/15" aria-hidden="true" />
          <button
            type="button"
            onClick={onBack}
            disabled={torn}
            className="inline-flex items-center gap-1 text-xs text-white/45 underline-offset-4 transition-colors hover:text-white/75 hover:underline"
          >
            <ArrowLeft className="h-3 w-3" aria-hidden="true" />
            Change booking
          </button>
        </div>
      </motion.div>
    </div>
  );
}
