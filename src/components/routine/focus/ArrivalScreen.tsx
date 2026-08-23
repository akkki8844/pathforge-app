/**
 * Arrival: the descent callouts, then the reward.
 *
 * Two things happen here in order. First a short landing sequence, for the same
 * reason there is a departure sequence — "timer complete" is an event, touching
 * down is an arrival, and the difference is entirely in whether the product
 * spends four seconds acknowledging what just happened. Then the summary,
 * which is deliberately built around the *boarding pass* rather than a stats
 * table: the pass is the thing worth keeping.
 *
 * A diverted flight gets the same care and none of the celebration. It reports
 * honestly — minutes flown, marked incomplete — because a product that
 * congratulates you for stopping early teaches you that finishing does not
 * matter.
 */
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Plane, PlaneLanding, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EASE_OUT_EXPO } from "@/lib/motion";
import { BoardingPass } from "./BoardingPass";
import { FlightMap } from "./FlightMap";
import { formatKm } from "@/lib/focus-flight/geo";
import { cabinLabel, intentLabel, type FocusFlight } from "@/lib/focus-flight/flight";

const CALLOUTS = ["Descending", "Approaching destination", "Final approach", "Touchdown"];

export function ArrivalScreen({
  flight,
  minutes,
  completed,
  sessionNumber,
  onFlyAgain,
  onBack,
}: {
  flight: FocusFlight;
  minutes: number;
  completed: boolean;
  /** Which numbered focus session this was. Purely for the record. */
  sessionNumber: number;
  onFlyAgain: () => void;
  onBack: () => void;
}) {
  const reduceMotion = useReducedMotion();
  // A diverted flight never landed, so it skips the landing sequence entirely.
  const [beat, setBeat] = useState(completed ? 0 : CALLOUTS.length);

  useEffect(() => {
    if (beat >= CALLOUTS.length) return;
    const id = window.setTimeout(() => setBeat((b) => b + 1), reduceMotion ? 550 : 1150);
    return () => window.clearTimeout(id);
  }, [beat, reduceMotion]);

  const landing = beat < CALLOUTS.length;

  if (landing) {
    return (
      <div
        className="fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden bg-slate-950"
        role="status"
        aria-live="assertive"
        aria-label={CALLOUTS[beat]}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3"
          style={{
            background:
              "radial-gradient(110% 100% at 50% 100%, hsl(160 84% 45% / 0.28), transparent 65%)",
          }}
        />

        <motion.div
          className="relative z-10 mb-8"
          animate={
            reduceMotion
              ? undefined
              : { y: beat * 18, rotate: beat >= 3 ? 0 : 8 - beat * 3, scale: 1 - beat * 0.02 }
          }
          transition={{ duration: 1, ease: EASE_OUT_EXPO }}
        >
          <span className="relative inline-flex h-20 w-20 items-center justify-center rounded-3xl border border-white/15 bg-white/[0.06] backdrop-blur">
            <PlaneLanding className="h-9 w-9 text-emerald-400" aria-hidden="true" />
            <span className="absolute inset-0 rounded-3xl bg-emerald-400/15 blur-xl" aria-hidden="true" />
          </span>
        </motion.div>

        <motion.p
          key={beat}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: EASE_OUT_EXPO }}
          className="relative z-10 px-6 text-center font-sans text-xl font-bold uppercase tracking-[0.26em] text-white sm:text-3xl"
        >
          {CALLOUTS[beat]}
        </motion.p>

        <p className="relative z-10 mt-3 font-sans text-[10px] uppercase tracking-[0.2em] text-white/30">
          {flight.destination.code} · {flight.destination.country}
        </p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-950">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[28rem]"
        style={{
          background: completed
            ? "radial-gradient(80% 100% at 50% 0%, hsl(160 84% 45% / 0.2), transparent 65%)"
            : "radial-gradient(80% 100% at 50% 0%, hsl(38 92% 55% / 0.14), transparent 65%)",
        }}
      />

      <div className="relative mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE_OUT_EXPO }}
          className="text-center"
        >
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-sans text-[10px] font-bold uppercase tracking-[0.2em]",
              completed
                ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                : "border-amber-400/40 bg-amber-400/10 text-amber-300",
            )}
          >
            {completed ? (
              <>
                <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                Arrived
              </>
            ) : (
              <>
                <Plane className="h-3 w-3" aria-hidden="true" />
                Diverted
              </>
            )}
          </span>

          <h2 className="mt-4 font-sans text-3xl font-bold tracking-tight text-white sm:text-5xl">
            {completed ? "Safely landed" : "Landed early"}
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-balance text-sm text-white/55 sm:text-base">
            {completed ? (
              <>
                {flight.origin.country} to {flight.destination.country} — {minutes} minutes of focus,
                logged against your record.
              </>
            ) : (
              <>
                You put down short of {flight.destination.country}. The {minutes} minute
                {minutes === 1 ? "" : "s"} you flew are kept and counted; the session is recorded
                as incomplete.
              </>
            )}
          </p>
        </motion.div>

        {/* Objective ---------------------------------------------------- */}
        {flight.objective && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.08, ease: EASE_OUT_EXPO }}
            className="mx-auto mt-8 max-w-xl rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center"
          >
            <p className="font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
              You set out to
            </p>
            <p className="mt-2 text-lg font-medium text-white">{flight.objective}</p>
          </motion.div>
        )}

        {/* Stats -------------------------------------------------------- */}
        <motion.dl
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.14, ease: EASE_OUT_EXPO }}
          className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          <Stat label="Focus time" value={`${minutes}`} unit="min" />
          <Stat label="Route" value={`${flight.origin.code}→${flight.destination.code}`} />
          <Stat label="Distance" value={formatKm(flight.distanceKm)} />
          <Stat label="Session" value={`#${sessionNumber}`} />
        </motion.dl>

        {/* The completed route ------------------------------------------ */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.2, ease: EASE_OUT_EXPO }}
          className="mt-4 h-44 overflow-hidden rounded-2xl border border-white/[0.08] bg-slate-950/60 sm:h-56"
        >
          <FlightMap
            origin={flight.origin}
            destination={flight.destination}
            progress={completed ? 1 : Math.min(0.97, minutes / Math.max(1, flight.plannedMinutes))}
          />
        </motion.div>

        {/* The pass, kept ----------------------------------------------- */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.26, ease: EASE_OUT_EXPO }}
          className="mt-6"
        >
          <p className="mb-2.5 font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
            Added to your flight log
          </p>
          <BoardingPass flight={flight} outcome={completed ? "landed" : "diverted"} />
        </motion.div>

        {/* Actions ------------------------------------------------------- */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.34 }}
          className="mt-8 flex flex-col gap-2.5 sm:flex-row sm:justify-center"
        >
          <Button
            size="lg"
            onClick={onFlyAgain}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
            Take off again
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={onBack}
            className="border-white/15 bg-white/[0.04] text-white hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Back to Focus
          </Button>
        </motion.div>

        <p className="mt-6 text-center text-[11px] text-white/25">
          {intentLabel(flight.intent)} · {cabinLabel(flight.cabin)} · Simulated route over real
          geography
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-3 text-center">
      <dt className="font-sans text-[9px] font-bold uppercase tracking-[0.14em] text-white/35">
        {label}
      </dt>
      <dd className="mt-1 font-sans text-xl font-bold tabular-nums text-white">
        {value}
        {unit && <span className="ml-1 text-xs font-normal text-white/40">{unit}</span>}
      </dd>
    </div>
  );
}
