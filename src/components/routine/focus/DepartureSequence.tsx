/**
 * Gate to wheels-up, as a timed sequence.
 *
 * This is the transition the whole boarding ritual pays off into, and the thing
 * that makes it work is that it *takes time you cannot skip*. A modal that
 * dissolves into a timer is a state change; six seconds of doors closing,
 * taxiing and accelerating is a departure. The student is not doing anything
 * during it, which is exactly right — they are being carried.
 *
 * The steps advance on their own timers rather than on scroll or click, and the
 * whole thing self-terminates into cruise. Under `prefers-reduced-motion` the
 * runway rush and the shake are dropped and the sequence runs short, because
 * the point can be made with words and light alone.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Plane } from "lucide-react";
import { cn } from "@/lib/utils";
import { EASE_OUT_EXPO } from "@/lib/motion";
import type { FocusFlight } from "@/lib/focus-flight/flight";

interface Beat {
  label: string;
  detail: string;
  /** Milliseconds this beat holds for. */
  hold: number;
}

export function DepartureSequence({
  flight,
  onComplete,
}: {
  flight: FocusFlight;
  onComplete: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const doneRef = useRef(false);

  const beats = useMemo<Beat[]>(
    () => [
      { label: "Boarding complete", detail: `Gate ${flight.gate} · Seat ${flight.seat}`, hold: reduceMotion ? 700 : 1400 },
      { label: "Doors closed", detail: "Cabin secure — distractions on the other side", hold: reduceMotion ? 700 : 1500 },
      { label: "Taxiing", detail: `Rolling to the runway at ${flight.origin.code}`, hold: reduceMotion ? 700 : 1600 },
      { label: "Cleared for takeoff", detail: `${flight.flightNumber} to ${flight.destination.code}`, hold: reduceMotion ? 700 : 1400 },
      { label: "Wheels up", detail: "You are in the air", hold: reduceMotion ? 600 : 1300 },
    ],
    [flight, reduceMotion],
  );

  useEffect(() => {
    if (doneRef.current) return;
    if (index >= beats.length) {
      doneRef.current = true;
      onComplete();
      return;
    }
    const id = window.setTimeout(() => setIndex((i) => i + 1), beats[index].hold);
    return () => window.clearTimeout(id);
  }, [index, beats, onComplete]);

  const beat = beats[Math.min(index, beats.length - 1)];
  const takingOff = index >= 3;
  const progress = Math.min(1, (index + 1) / beats.length);

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden bg-slate-950"
      role="status"
      aria-live="assertive"
      aria-label={`${beat.label}. ${beat.detail}`}
    >
      {/* Runway. Centre-line dashes that accelerate as thrust comes up. */}
      {!reduceMotion && (
        <div className="pointer-events-none absolute inset-0 flex items-end justify-center overflow-hidden">
          <div className="relative h-1/2 w-40 [perspective:400px]">
            <motion.div
              className="absolute inset-0 flex flex-col items-center gap-10 [transform:rotateX(64deg)]"
              animate={{ y: ["0%", "-40%"] }}
              transition={{
                duration: takingOff ? 0.28 : 1.15,
                repeat: Infinity,
                ease: "linear",
              }}
            >
              {Array.from({ length: 14 }, (_, i) => (
                <span key={i} className="h-14 w-1.5 shrink-0 rounded-full bg-white/25" />
              ))}
            </motion.div>
          </div>
        </div>
      )}

      {/* Horizon glow, warming as the aircraft rotates. */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2"
        animate={{ opacity: takingOff ? 0.85 : 0.35 }}
        transition={{ duration: 1.2, ease: EASE_OUT_EXPO }}
        style={{
          background:
            "radial-gradient(120% 100% at 50% 100%, hsl(var(--accent) / 0.35), transparent 62%)",
        }}
      />

      {/* Aircraft */}
      <motion.div
        className="relative z-10 mb-8"
        animate={
          reduceMotion
            ? { opacity: 1 }
            : takingOff
              ? { y: -70, rotate: -14, scale: 1.08 }
              : { y: 0, rotate: 0, scale: 1 }
        }
        transition={{ duration: 1.5, ease: EASE_OUT_EXPO }}
      >
        <motion.div
          animate={
            reduceMotion || takingOff
              ? { x: 0 }
              : index === 2
                ? { x: [-1.5, 1.5, -1.5] }
                : { x: 0 }
          }
          transition={{ duration: 0.14, repeat: index === 2 ? Infinity : 0 }}
        >
          <span className="relative inline-flex h-20 w-20 items-center justify-center rounded-3xl border border-white/15 bg-white/[0.06] backdrop-blur">
            <Plane className="h-9 w-9 -rotate-45 text-accent" aria-hidden="true" />
            <span className="absolute inset-0 rounded-3xl bg-accent/15 blur-xl" aria-hidden="true" />
          </span>
        </motion.div>
      </motion.div>

      {/* Callouts */}
      <div className="relative z-10 px-6 text-center">
        <motion.p
          key={beat.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.34, ease: EASE_OUT_EXPO }}
          className={cn(
            "font-sans font-bold uppercase tracking-[0.26em] text-white",
            takingOff ? "text-2xl sm:text-4xl" : "text-lg sm:text-2xl",
          )}
        >
          {beat.label}
        </motion.p>
        <motion.p
          key={`${beat.label}-detail`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.34, delay: 0.08 }}
          className="mt-2.5 text-sm text-white/50"
        >
          {beat.detail}
        </motion.p>
      </div>

      {/* Sequence progress */}
      <div className="relative z-10 mt-10 h-px w-56 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full bg-accent"
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
        />
      </div>

      <p className="relative z-10 mt-4 font-sans text-[10px] uppercase tracking-[0.2em] text-white/25">
        {flight.origin.code} → {flight.destination.code}
      </p>
    </div>
  );
}
