/**
 * The in-flight screen. A full-viewport takeover, not a page section.
 *
 * It is `position: fixed` over everything — navbar included — because the
 * feature's promise is "once I take off, I am unavailable until I land", and a
 * timer sitting under a nav bar full of other destinations does not make that
 * promise. Leaving is always possible and always visible; it is just never the
 * loudest thing on screen.
 *
 * Everything shown is derived from `progress`, which is derived from the wall
 * clock. Nothing on this screen accumulates state, so it is identical whether
 * it has been mounted for ninety minutes or ninety milliseconds — which is what
 * makes restoring an interrupted flight a non-event.
 */
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowDownToLine,
  Eye,
  EyeOff,
  Gauge,
  Headphones,
  Pause,
  Play,
  Plane,
  Target,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { EASE_OUT_EXPO } from "@/lib/motion";
import { AirportBadge } from "./AirportBadge";
import { LiveRouteMap } from "./LiveRouteMap";
import { CabinAudioControls, type AmbienceBed } from "./CabinAudio";
import { WindowView } from "./WindowView";
import { formatKm } from "@/lib/focus-flight/geo";
import {
  countdown,
  instrumentsAt,
  phaseAt,
  type FocusFlight,
} from "@/lib/focus-flight/flight";

export function FlightDeck({
  flight,
  progress,
  remainingMs,
  isPaused,
  audio,
  onPause,
  onResume,
  onEnd,
}: {
  flight: FocusFlight;
  progress: number;
  remainingMs: number;
  isPaused: boolean;
  audio: {
    bed: AmbienceBed;
    volume: number;
    failed: boolean;
    select: (b: AmbienceBed) => void;
    changeVolume: (v: number) => void;
  };
  onPause: () => void;
  onResume: () => void;
  onEnd: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const [pure, setPure] = useState(false);
  // The live map is the flight deck's real content, not a toggled extra — it
  // stays on by default for every cabin, matching the reference this feature
  // is built from. Window view remains one click away for anyone who prefers
  // it, but it no longer replaces the map on launch.
  const [showWindow, setShowWindow] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);

  const phase = phaseAt(progress);
  const instruments = instrumentsAt(flight, progress);
  const percent = Math.round(progress * 100);

  // Esc leaves Pure Focus — never the flight. Ending a session is a decision
  // that should cost a deliberate click, not a reflex keypress.
  useEffect(() => {
    if (!pure) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setPure(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pure]);

  // The page behind must not scroll while the deck is up.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return (
    <div
      className={cn(
        "fixed inset-0 z-[60] flex flex-col overflow-hidden text-white",
        flight.cabin === "business" ? "bg-slate-900" : "bg-slate-950",
      )}
    >
      {/* Atmosphere ---------------------------------------------------- */}
      {/* The reference this feature is modelled after runs a real, full-bleed
          navigation map behind everything — not a boxed card under a clock.
          Window view and the live map are the two mutually-exclusive
          full-screen backdrops; the live map is the default. */}
      {showWindow ? (
        <WindowView cabin={flight.cabin} progress={progress} />
      ) : (
        !pure && (
          <div className="absolute inset-0">
            <LiveRouteMap origin={flight.origin} destination={flight.destination} progress={progress} />
            {/* A light basemap needs a scrim for the white readouts floating
                over it to stay legible — the reference gets this for free
                from real Apple Maps chrome; ours has to paint it in. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/60 via-black/5 to-black/65"
            />
          </div>
        )
      )}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(90% 60% at 50% 0%, hsl(var(--accent) / 0.14), transparent 60%)",
        }}
      />

      {/* Screen-reader narration of state changes. */}
      <p className="sr-only" role="status" aria-live="polite">
        {isPaused
          ? "Flight paused."
          : `${phase.label}. ${countdown(remainingMs)} remaining. ${percent} percent complete.`}
      </p>

      {/* Top bar -------------------------------------------------------- */}
      <AnimatePresence>
        {!pure && (
          <motion.header
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.28, ease: EASE_OUT_EXPO }}
            className="relative z-20 flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-white/[0.08] bg-slate-950/45 px-4 py-3 backdrop-blur-md sm:px-6"
          >
            <span className="flex items-center gap-2">
              <Plane className="h-4 w-4 text-accent" aria-hidden="true" />
              <span className="font-sans text-sm font-bold tracking-wider">
                {flight.flightNumber}
              </span>
            </span>

            <span className="flex items-center gap-1.5">
              <AirportBadge code={flight.origin.code} tone="muted" size="sm" />
              <span className="text-white/25">→</span>
              <AirportBadge code={flight.destination.code} tone="outline" size="sm" />
            </span>

            {/* Departure-board status. Green while the flight is running to
                schedule, amber the moment it is not — the same two states a
                real board has, and the only two this feature can be in. */}
            <span
              className={cn(
                "flex items-center gap-1.5 font-sans text-[11px] font-bold uppercase tracking-[0.14em]",
                isPaused ? "text-amber-300" : "text-emerald-400",
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  isPaused ? "bg-amber-400" : "bg-emerald-400",
                )}
                aria-hidden="true"
              />
              {isPaused ? "Holding" : "On time"}
            </span>

            <span className="font-sans text-[10px] font-bold uppercase tracking-[0.16em] text-white/35">
              {phase.label}
            </span>

            <div className="ml-auto flex items-center gap-1">
              <DeckToggle
                active={showWindow}
                onClick={() => setShowWindow((v) => !v)}
                label={showWindow ? "Hide window view" : "Show window view"}
                icon={showWindow ? Eye : EyeOff}
              />
              <DeckToggle
                active={pure}
                onClick={() => setPure(true)}
                label="Enter pure focus"
                icon={Target}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={isPaused ? onResume : onPause}
                className="h-8 gap-1.5 px-2.5 text-white/70 hover:bg-white/10 hover:text-white"
              >
                {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{isPaused ? "Resume" : "Pause"}</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setConfirmEnd(true)}
                className="h-8 gap-1.5 px-2.5 text-rose-300/80 hover:bg-rose-500/15 hover:text-rose-200"
              >
                <X className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">End flight</span>
              </Button>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* Body ----------------------------------------------------------- */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        {pure ? (
          // Pure focus: the map recedes entirely and the countdown becomes
          // the whole screen. Unrelated to the flying HUD below — a
          // deliberate, different mode, not a smaller version of it.
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            {flight.objective && (
              <motion.p layout className="mb-8 max-w-2xl text-balance text-lg font-medium text-white/70 sm:text-2xl">
                {flight.objective}
              </motion.p>
            )}
            <motion.p
              layout
              className={cn(
                "font-sans text-[22vw] font-bold tabular-nums leading-none tracking-tighter sm:text-[15rem]",
                isPaused ? "text-white/40" : "text-white",
              )}
            >
              {countdown(remainingMs)}
            </motion.p>
            <div className="mt-5 flex w-full max-w-lg items-start justify-between gap-6">
              <div className="text-left">
                <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-white/35">
                  Time remaining
                </p>
                <p className="mt-1 font-sans text-2xl font-bold tabular-nums text-white sm:text-3xl">
                  {Math.max(0, Math.ceil(remainingMs / 60_000))}
                  <span className="ml-1 text-sm font-normal text-white/40">min</span>
                </p>
              </div>
              <div className="text-right">
                <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-white/35">
                  Distance remaining
                </p>
                <p className="mt-1 font-sans text-2xl font-bold tabular-nums text-white sm:text-3xl">
                  {instruments.remainingKm.toLocaleString()}
                  <span className="ml-1 text-sm font-normal text-white/40">km</span>
                </p>
              </div>
            </div>
            <div className="mt-4 h-1 w-full max-w-lg overflow-hidden rounded-full bg-white/10">
              <motion.div
                className={cn("h-full rounded-full", isPaused ? "bg-amber-400/70" : "bg-accent")}
                animate={{ width: `${percent}%` }}
                transition={{ duration: 0.5, ease: "linear" }}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPure(false)}
              className="mt-10 border-white/15 bg-white/[0.04] text-white/70 hover:bg-white/10 hover:text-white"
            >
              Exit pure focus
            </Button>
          </div>
        ) : (
          <>
            {/* Objective — a small floating pill over the map, not a block
                of text pushing the map down. */}
            <AnimatePresence>
              {flight.objective && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
                  className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center px-6"
                >
                  <p className="pointer-events-auto max-w-md truncate rounded-full border border-white/10 bg-slate-950/55 px-4 py-1.5 text-center text-xs font-medium text-white/80 backdrop-blur-md">
                    {flight.objective}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Flying HUD — anchored to the bottom of the full-bleed map, the
                way the reference overlays Time Remaining / Distance Remaining
                directly on live Maps instead of boxing the map under a clock.
                The map itself is left almost entirely uncovered. */}
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 24 }}
                transition={{ duration: 0.45, ease: EASE_OUT_EXPO }}
                className="pointer-events-none mt-auto flex flex-col gap-3 px-4 pb-4 sm:px-8 sm:pb-6"
              >
                <div className="flex items-end justify-between gap-4">
                  <Readout
                    label="Time Remaining"
                    value={Math.max(0, Math.ceil(remainingMs / 60_000)).toLocaleString()}
                    unit="min"
                    dim={isPaused}
                    align="left"
                  />
                  <Readout
                    label="Distance Remaining"
                    value={instruments.remainingKm.toLocaleString()}
                    unit="km"
                    align="right"
                  />
                </div>

                <div className="pointer-events-auto flex items-center gap-2.5 rounded-full border border-white/10 bg-slate-950/55 py-2 pl-2 pr-3 backdrop-blur-xl">
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        aria-label="Flight data"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                      >
                        <Gauge className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      side="top"
                      align="start"
                      className="w-72 border-white/10 bg-slate-950/95 text-white backdrop-blur-xl"
                    >
                      <p className="flex items-center gap-1.5 font-sans text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">
                        <Gauge className="h-3 w-3" aria-hidden="true" />
                        Flight data
                      </p>
                      <dl className="mt-2.5 grid grid-cols-3 gap-2">
                        <Instrument label="Altitude" value={instruments.altitudeFt.toLocaleString()} unit="ft" />
                        <Instrument label="Ground speed" value={String(instruments.speedKn)} unit="kn" />
                        <Instrument label="Distance left" value={instruments.remainingKm.toLocaleString()} unit="km" />
                      </dl>
                      <p className="mt-2.5 border-t border-white/[0.08] pt-2 text-[10px] leading-snug text-white/30">
                        Simulated instruments. The route and its {formatKm(flight.distanceKm)} are real
                        geography; the aircraft is not.
                      </p>
                    </PopoverContent>
                  </Popover>

                  {/* The scrubber — the same accent-orange progress read the
                      reference's bottom transport bar gives the flight. */}
                  <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      className={cn(
                        "h-full rounded-full",
                        isPaused
                          ? "bg-amber-400/70"
                          : "bg-gradient-to-r from-amber-400 via-orange-400 to-orange-500",
                      )}
                      animate={{ width: `${percent}%` }}
                      transition={{ duration: 0.5, ease: "linear" }}
                    />
                  </div>

                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        aria-label="Cabin audio"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                      >
                        <Headphones className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      side="top"
                      align="end"
                      className="w-72 border-white/10 bg-slate-950/95 text-white backdrop-blur-xl"
                    >
                      <CabinAudioControls
                        bed={audio.bed}
                        volume={audio.volume}
                        failed={audio.failed}
                        onSelect={audio.select}
                        onVolume={audio.changeVolume}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </motion.div>
            </AnimatePresence>
          </>
        )}
      </div>

      {/* Pause overlay --------------------------------------------------- */}
      <AnimatePresence>
        {isPaused && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/80 backdrop-blur-md"
          >
            <div className="mx-6 max-w-sm rounded-2xl border border-white/10 bg-slate-900/90 p-6 text-center">
              <p className="font-sans text-xl font-bold text-white">Flight paused</p>
              <p className="mt-2 text-sm text-white/55">
                You are holding at {instruments.altitudeFt.toLocaleString()} ft with{" "}
                {countdown(remainingMs)} still to run. Nothing is lost while you are stopped.
              </p>
              <div className="mt-5 flex flex-col gap-2">
                <Button onClick={onResume} className="bg-accent text-accent-foreground hover:bg-accent/90">
                  <Play className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  Resume flight
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setConfirmEnd(true)}
                  className="text-rose-300/80 hover:bg-rose-500/15 hover:text-rose-200"
                >
                  End flight here
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* End confirmation ------------------------------------------------ */}
      <AlertDialog open={confirmEnd} onOpenChange={setConfirmEnd}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End this flight?</AlertDialogTitle>
            <AlertDialogDescription>
              You have {countdown(remainingMs)} still to run to {flight.destination.country}. The
              minutes you have already flown are kept and logged, but the session is recorded as
              diverted rather than completed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep flying</AlertDialogCancel>
            <AlertDialogAction
              onClick={onEnd}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <ArrowDownToLine className="mr-1.5 h-4 w-4" aria-hidden="true" />
              End flight
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DeckToggle({
  active,
  onClick,
  label,
  icon: Icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "h-8 w-8",
        active ? "text-accent hover:bg-accent/15 hover:text-accent" : "text-white/55 hover:bg-white/10 hover:text-white",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </Button>
  );
}

function Readout({
  label,
  value,
  unit,
  align,
  dim,
}: {
  label: string;
  value: string;
  unit: string;
  align: "left" | "right";
  dim?: boolean;
}) {
  return (
    <div className={align === "left" ? "text-left" : "text-right"}>
      <p
        className="font-sans text-[11px] font-bold uppercase tracking-[0.16em] text-white/75"
        style={{ textShadow: "0 1px 6px rgba(0,0,0,0.55)" }}
      >
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 font-sans text-4xl font-bold tabular-nums leading-none sm:text-5xl",
          dim ? "text-white/50" : "text-white",
        )}
        style={{ textShadow: "0 2px 12px rgba(0,0,0,0.55)" }}
      >
        {value}
        <span className="ml-1.5 text-base font-medium text-white/70">{unit}</span>
      </p>
    </div>
  );
}

function Instrument({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="min-w-0">
      <dt className="font-sans text-[9px] font-bold uppercase tracking-[0.14em] text-white/35">
        {label}
      </dt>
      <dd className="mt-0.5 font-sans text-lg font-bold tabular-nums text-white">
        {value}
        <span className="ml-1 text-[10px] font-normal text-white/40">{unit}</span>
      </dd>
    </div>
  );
}
