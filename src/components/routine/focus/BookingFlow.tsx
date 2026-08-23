/**
 * Booking, as one screen.
 *
 * This was a five-step wizard. It is now a single view, and that is the most
 * consequential change in the feature: the old flow asked six questions before
 * showing a map, which meant the student spent the most motivating part of the
 * product filling in a form. Here the map is the page, and the only required
 * decision is how long to fly.
 *
 * The mechanism is one control with two faces. The ruler sets a duration; the
 * carousel lists every destination reachable in roughly that time, nearest
 * first. Move either and the other follows, because they are two readings of a
 * single number. Duration is the thing a student actually knows ("I have forty
 * minutes"); the destination is the reward for committing to it, and deriving
 * it from real great-circle distance is what stops it being arbitrary.
 *
 * Everything else — what you are working on, which cabin — is optional and
 * lives under a disclosure, so the fast path is: drag, tap, fly.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronDown, Search, Target, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EASE_OUT_EXPO } from "@/lib/motion";
import { AirportBadge } from "./AirportBadge";
import { AirportPicker } from "./AirportPicker";
import { BookingMap, type Candidate } from "./BookingMap";
import { AIRPORTS, type Airport } from "@/lib/focus-flight/airports";
import { formatKm } from "@/lib/focus-flight/geo";
import {
  CABINS,
  MAX_MINUTES,
  MIN_MINUTES,
  routeDistanceKm,
  type Cabin,
  type FocusIntent,
} from "@/lib/focus-flight/flight";
import type { BookingDraft } from "@/hooks/routine/useFocusFlight";

/** Something in Routine the flight can be logged against. */
export interface FlightTarget {
  type: BookingDraft["targetType"];
  id: string | null;
  label: string;
  group: string;
}

/**
 * Distance to minutes.
 *
 * Anchored so that a neighbouring country is a short session and the far side
 * of the world is the longest one the feature allows. It is not an airliner's
 * real block time — a 25-minute flight to Paris would be a lie, and a truthful
 * 14-hour Sydney would be useless to a student. What it preserves is *order*:
 * further always costs more, so the map is an honest picture of the choice.
 */
const REFERENCE_KM = 17_000;
export function minutesForKm(km: number): number {
  const t = Math.min(1, km / REFERENCE_KM);
  return Math.round(MIN_MINUTES + 15 + t * (MAX_MINUTES - MIN_MINUTES - 15));
}

/** Inverse, for turning a ruler position back into a reachable radius. */
function kmForMinutes(minutes: number): number {
  const t = (minutes - MIN_MINUTES - 15) / (MAX_MINUTES - MIN_MINUTES - 15);
  return Math.max(0, t) * REFERENCE_KM;
}

const PX_PER_MIN = 6;

export function BookingFlow({
  homeAirport,
  onChangeHome,
  recentCodes,
  targets,
  initial,
  onCancel,
  onConfirm,
}: {
  homeAirport: Airport;
  onChangeHome: () => void;
  recentCodes: string[];
  targets: FlightTarget[];
  initial?: BookingDraft | null;
  onCancel: () => void;
  onConfirm: (draft: BookingDraft) => void;
}) {
  const [minutes, setMinutes] = useState(initial?.minutes ?? 45);
  const [picked, setPicked] = useState<Airport | null>(initial?.destination ?? null);
  const [objective, setObjective] = useState(initial?.objective ?? "");
  const [cabin, setCabin] = useState<Cabin>(initial?.cabin ?? "quiet");
  const [targetKey, setTargetKey] = useState("none");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const target = useMemo(
    () => targets.find((t) => `${t.type}:${t.id ?? t.label}` === targetKey),
    [targets, targetKey],
  );

  /** Every country in the atlas, priced in minutes. Computed once per home. */
  const candidates = useMemo<Candidate[]>(
    () =>
      AIRPORTS.filter((a) => a.code !== homeAirport.code)
        .map((a) => {
          const km = routeDistanceKm(homeAirport, a);
          return { airport: a, km, minutes: minutesForKm(km) };
        })
        .sort((a, b) => a.minutes - b.minutes),
    [homeAirport],
  );

  /** The destination the ruler currently points at. */
  const nearest = useCallback(
    (m: number) =>
      candidates.reduce((best, c) =>
        Math.abs(c.minutes - m) < Math.abs(best.minutes - m) ? c : best,
      ),
    [candidates],
  );

  const selected = picked ?? (candidates.length ? nearest(minutes).airport : null);
  const selectedCandidate = selected
    ? candidates.find((c) => c.airport.code === selected.code) ?? null
    : null;

  const distance = selected ? routeDistanceKm(homeAirport, selected) : 0;

  const setDuration = (m: number) => {
    const clamped = Math.max(MIN_MINUTES, Math.min(MAX_MINUTES, Math.round(m)));
    setMinutes(clamped);
    // The ruler owns the selection while it is being dragged; an explicit card
    // tap re-pins it.
    setPicked(null);
  };

  const pickDestination = (a: Airport) => {
    setPicked(a);
    const c = candidates.find((x) => x.airport.code === a.code);
    if (c) setMinutes(c.minutes);
  };

  const finish = () => {
    if (!selected) return;
    const intent: FocusIntent = (target?.type === "task" || target?.type === "goal" ? "work" : "study");
    onConfirm({
      origin: homeAirport,
      destination: selected,
      minutes,
      intent,
      cabin,
      objective,
      targetType: target?.type ?? "none",
      targetId: target?.id ?? null,
      targetLabel: target && target.type !== "none" ? target.label : null,
    });
  };

  return (
    <div className="relative -mx-4 overflow-hidden rounded-none sm:mx-0 sm:rounded-3xl">
      {/* Map ------------------------------------------------------------ */}
      <div className="relative h-[62vh] min-h-[26rem] w-full">
        <BookingMap
          origin={homeAirport}
          candidates={candidates}
          selected={selected}
          reachKm={kmForMinutes(minutes)}
          onPick={pickDestination}
          className="absolute inset-0"
        />

        {/* Top controls. Glass circles, the way a map app floats chrome over
            a live view without boxing it in. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3 sm:p-4">
          <GlassButton onClick={onCancel} label="Back to Focus">
            <ChevronLeft className="h-4 w-4" />
          </GlassButton>
          <div className="flex gap-2">
            <GlassButton onClick={onChangeHome} label="Change home airport">
              <AirportBadge code={homeAirport.code} role="origin" size="xs" className="border-0 bg-transparent px-0" />
            </GlassButton>
            <GlassButton onClick={() => setSearchOpen(true)} label="Search destinations">
              <Search className="h-4 w-4" />
            </GlassButton>
          </div>
        </div>

        {/* Bottom sheet: ruler, carousel, action. Sits over the map so the
            route stays visible while the duration is being chosen. */}
        {/* z-30: strictly above the badge layer's z-10/z-20, so the sheet
            paints over badges wherever its gradient is opaque instead of both
            competing at the same stacking level — badges only show through
            where the gradient itself is actually translucent. */}
        <div className="absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-slate-950 via-slate-950/85 to-transparent pb-3 pt-10 sm:pb-4">
          <DurationRail minutes={minutes} onChange={setDuration} />

          <DestinationRail
            candidates={candidates}
            selectedCode={selected?.code ?? null}
            onPick={pickDestination}
          />

          <div className="mt-3 px-3 sm:px-4">
            <Button
              type="button"
              onClick={finish}
              disabled={!selected}
              className="h-12 w-full rounded-full bg-white text-base font-semibold text-slate-950 hover:bg-white/90 disabled:bg-white/25"
            >
              {selected ? "Book my flight" : "No flight selected"}
            </Button>
          </div>
        </div>
      </div>

      {/* Below the map: the optional half of booking. ------------------- */}
      <div className="bg-slate-950 px-4 pb-5 pt-4 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
          <span className="flex items-center gap-2 text-white/60">
            <AirportBadge code={homeAirport.code} role="origin" tone="muted" size="sm" />
            <span className="text-white/25">→</span>
            {selected ? (
              <AirportBadge code={selected.code} role="destination" size="sm" />
            ) : (
              <span className="text-white/30">—</span>
            )}
          </span>
          <span className="font-sans text-white/45">
            {minutes} min · {selected ? formatKm(distance) : "—"}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setDetailsOpen((v) => !v)}
          aria-expanded={detailsOpen}
          className="mt-3 flex w-full items-center gap-1.5 text-left text-xs font-medium text-white/45 transition-colors hover:text-white/75"
        >
          <ChevronDown
            className={cn("h-3.5 w-3.5 transition-transform", detailsOpen && "rotate-180")}
            aria-hidden="true"
          />
          {objective.trim() ? "What you are landing with" : "Add an objective or cabin (optional)"}
        </button>

        {detailsOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.25, ease: EASE_OUT_EXPO }}
            className="overflow-hidden"
          >
            <div className="pt-3">
              <Textarea
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                maxLength={180}
                rows={2}
                placeholder="Finish the Biology chapter 4 notes"
                aria-label="Focus objective"
                className="resize-none border-white/12 bg-white/[0.04] text-white placeholder:text-white/25 focus-visible:ring-accent"
              />

              {targets.length > 1 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {targets.slice(0, 10).map((t) => {
                    const key = `${t.type}:${t.id ?? t.label}`;
                    const active = targetKey === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setTargetKey(active ? "none" : key);
                          if (!active && !objective.trim() && t.type !== "none") setObjective(t.label);
                        }}
                        aria-pressed={active}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                          active
                            ? "border-flight-yellow bg-flight-yellow/15 font-semibold text-flight-yellow"
                            : "border-white/12 text-white/55 hover:border-white/25 hover:text-white",
                        )}
                      >
                        {active && <Target className="h-3 w-3" aria-hidden="true" />}
                        <span className="max-w-[12rem] truncate">{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-1.5">
                {CABINS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCabin(c.value)}
                    aria-pressed={cabin === c.value}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                      cabin === c.value
                        ? "border-white/70 bg-white/10 font-semibold text-white"
                        : "border-white/12 text-white/45 hover:border-white/25 hover:text-white",
                    )}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Search over the map ------------------------------------------- */}
      {searchOpen && (
        <div className="absolute inset-0 z-30 flex flex-col bg-slate-950/95 p-4 backdrop-blur-md">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-sans text-sm font-bold uppercase tracking-[0.16em] text-white/50">
              Search destinations
            </p>
            <GlassButton onClick={() => setSearchOpen(false)} label="Close search">
              <X className="h-4 w-4" />
            </GlassButton>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <AirportPicker
              value={selected ?? undefined}
              onSelect={(a) => {
                pickDestination(a);
                setSearchOpen(false);
              }}
              excludeCode={homeAirport.code}
              recentCodes={recentCodes}
              placeholder="Search by country or code"
              autoFocus
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Pieces ────────────────────────────────────────────────────────────────

function GlassButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="pointer-events-auto inline-flex h-9 min-w-9 items-center justify-center rounded-full border border-white/10 bg-slate-950/55 px-2.5 text-white/80 backdrop-blur-md transition-colors hover:bg-slate-950/80 hover:text-white"
    >
      {children}
    </button>
  );
}

/**
 * The duration ruler.
 *
 * A measuring scale, not a slider. A slider's track is abstract — it says
 * "somewhere between the ends" — while a ruler prints the actual minute marks
 * under a fixed pointer, so the student reads a number off a scale instead of
 * estimating a position. The scale moves and the pointer stays put, which keeps
 * the value being chosen in one place on screen.
 *
 * A real `role="slider"`, so arrows, Home/End and assistive technology work
 * without a parallel code path.
 */
function DurationRail({
  minutes,
  onChange,
}: {
  minutes: number;
  onChange: (m: number) => void;
}) {
  const drag = useRef<{ x: number; from: number } | null>(null);

  const ticks: number[] = [];
  const span = 42;
  for (let m = Math.max(MIN_MINUTES, minutes - span); m <= Math.min(MAX_MINUTES, minutes + span); m++) {
    ticks.push(m);
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 1;
    const map: Record<string, number> = {
      ArrowLeft: -step,
      ArrowDown: -step,
      ArrowRight: step,
      ArrowUp: step,
      PageDown: -15,
      PageUp: 15,
    };
    if (e.key in map) {
      e.preventDefault();
      onChange(minutes + map[e.key]);
    } else if (e.key === "Home") {
      e.preventDefault();
      onChange(MIN_MINUTES);
    } else if (e.key === "End") {
      e.preventDefault();
      onChange(MAX_MINUTES);
    }
  };

  return (
    <div className="relative select-none px-3 sm:px-4">
      <div
        role="slider"
        tabIndex={0}
        aria-label="Flight duration in minutes"
        aria-valuemin={MIN_MINUTES}
        aria-valuemax={MAX_MINUTES}
        aria-valuenow={minutes}
        aria-valuetext={`${minutes} minutes`}
        onKeyDown={onKeyDown}
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, from: minutes };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          onChange(d.from - (e.clientX - d.x) / PX_PER_MIN);
        }}
        onPointerUp={(e) => {
          drag.current = null;
          e.currentTarget.releasePointerCapture(e.pointerId);
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
        className="relative h-14 cursor-ew-resize touch-none overflow-hidden outline-none focus-visible:rounded-lg focus-visible:ring-2 focus-visible:ring-white/60"
      >
        {/* Pointer, fixed dead centre. */}
        <span
          className="absolute left-1/2 top-0 z-10 h-0 w-0 -translate-x-1/2 border-x-[5px] border-t-[7px] border-x-transparent border-t-white"
          aria-hidden="true"
        />

        <div
          className="absolute inset-y-0 left-1/2 top-2"
          style={{ transform: `translateX(${-minutes * PX_PER_MIN}px)` }}
          aria-hidden="true"
        >
          {ticks.map((m) => {
            const major = m % 10 === 0;
            const medium = !major && m % 5 === 0;
            return (
              <div key={m} className="absolute flex flex-col items-center" style={{ left: m * PX_PER_MIN }}>
                <span
                  className={cn(
                    "w-px",
                    major ? "h-4 bg-white/80" : medium ? "h-3 bg-white/45" : "h-1.5 bg-white/25",
                  )}
                />
                {major && (
                  <span className="mt-1 -translate-x-1/2 whitespace-nowrap pl-px font-sans text-[10px] text-white/50">
                    {m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * The destination carousel.
 *
 * Sorted by duration, so scrolling it is the same gesture as dragging the
 * ruler. The selected card inverts to white — the one high-contrast object on
 * a dark map, which is what lets you find your choice without hunting.
 */
function DestinationRail({
  candidates,
  selectedCode,
  onPick,
}: {
  candidates: Candidate[];
  selectedCode: string | null;
  onPick: (a: Airport) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);

  // Keep the selection on screen when the ruler moves it, without yanking the
  // page: `nearest` centres the card with the least possible scrolling.
  useEffect(() => {
    if (!selectedCode || !scroller.current) return;
    const el = scroller.current.querySelector<HTMLElement>(`[data-code="${selectedCode}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [selectedCode]);

  return (
    <div
      ref={scroller}
      className="mt-1 flex gap-2 overflow-x-auto px-3 pb-1 sm:px-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {candidates.map(({ airport, minutes: m }) => {
        const active = airport.code === selectedCode;
        return (
          <button
            key={airport.code}
            data-code={airport.code}
            type="button"
            onClick={() => onPick(airport)}
            aria-pressed={active}
            className={cn(
              "w-[8.5rem] shrink-0 rounded-2xl p-3 text-left transition-colors",
              active ? "bg-white text-slate-950" : "bg-slate-950/85 text-white ring-1 ring-white/10",
            )}
          >
            <AirportBadge
              code={airport.code}
              role="destination"
              tone={active ? "solid" : "outline"}
              size="sm"
            />
            <p
              className={cn(
                "mt-2 truncate text-sm font-semibold",
                active ? "text-slate-950" : "text-white",
              )}
            >
              {airport.country}
            </p>
            <p className={cn("text-xs", active ? "text-slate-500" : "text-white/40")}>{m}m</p>
          </button>
        );
      })}
    </div>
  );
}
