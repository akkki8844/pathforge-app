/**
 * What a focus flight *is*, plus the numbers printed on its instruments.
 *
 * Everything derived here is a pure function of `(flight, elapsedMs)`. Nothing
 * accumulates in a ref, nothing advances on a timer. That is what lets the
 * whole in-flight screen be rebuilt from scratch after a page refresh and land
 * on exactly the same altitude, speed and aircraft position it would have shown
 * had the tab never closed.
 */
import type { Airport } from "./airports";
import { distanceKm } from "./geo";

export type FocusIntent = "study" | "work" | "create" | "review";
export type Cabin = "window" | "quiet" | "night" | "business";
export type FlightStatus = "boarding" | "in_flight" | "landed" | "diverted";

export interface FocusFlight {
  id: string;
  origin: Airport;
  destination: Airport;
  distanceKm: number;
  plannedMinutes: number;
  intent: FocusIntent;
  cabin: Cabin;
  objective: string | null;
  /** Where the minutes get logged. Mirrors `routine_focus_sessions.target_*`. */
  targetType: "none" | "task" | "study_block" | "goal" | "habit" | "subject";
  targetId: string | null;
  targetLabel: string | null;
  flightNumber: string;
  seat: string;
  gate: string;
  /** Epoch ms. The only clock the session trusts. */
  startedAt: number;
  status: FlightStatus;
}

// ── Generated pass metadata ───────────────────────────────────────────────

/**
 * Seeded, not random.
 *
 * A boarding pass has to show the same seat every time it is reopened from
 * history, and re-rolling `Math.random()` on each render would reshuffle the
 * gate while the student was looking at it. The seed is the route plus the
 * booking instant, so two flights are near-certain to differ while one flight
 * is always itself.
 */
function seedFrom(input: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface PassMetadata {
  flightNumber: string;
  seat: string;
  gate: string;
}

/**
 * `PF` is Pathforge's own callsign, not a real carrier's.
 *
 * The number is derived from the duration so it carries information rather than
 * being decorative: a 90-minute flight is PF 090. Rows are 3-32 and seats A-F,
 * which is an ordinary narrowbody layout and keeps "14A" reading as a window
 * seat to anyone who has flown.
 */
export function generatePass(
  origin: Airport,
  destination: Airport,
  plannedMinutes: number,
  bookedAt: number,
): PassMetadata {
  const rand = seedFrom(`${origin.code}${destination.code}${plannedMinutes}${bookedAt}`);
  const row = 3 + Math.floor(rand() * 30);
  const letter = "ABCDEF"[Math.floor(rand() * 6)];
  const gateLetter = "ABCDEF"[Math.floor(rand() * 6)];
  const gateNumber = 1 + Math.floor(rand() * 24);
  return {
    flightNumber: `PF ${String(plannedMinutes).padStart(3, "0")}`,
    seat: `${row}${letter}`,
    gate: `${gateLetter}${gateNumber}`,
  };
}

export function routeDistanceKm(origin: Airport, destination: Airport): number {
  return Math.round(distanceKm(origin, destination));
}

// ── Phases ────────────────────────────────────────────────────────────────

export type FlightPhase =
  | "taxi"
  | "takeoff"
  | "climb"
  | "cruise"
  | "descent"
  | "approach"
  | "landed";

export interface PhaseInfo {
  phase: FlightPhase;
  /** Shown as the flight's current state. Short, aviation-flavoured, honest. */
  label: string;
  /** One line of context under the label. */
  detail: string;
}

/**
 * Phase boundaries as fractions of the session.
 *
 * Deliberately compressed at both ends: taxi and takeoff together occupy the
 * first 6% and approach the last 8%, so a 25-minute flight still gets a real
 * departure and a real arrival rather than spending a third of itself taxiing.
 * Cruise — the part where the student is actually working — is the overwhelming
 * majority of every flight, which is the point.
 */
const PHASES: { until: number; phase: FlightPhase; label: string; detail: string }[] = [
  { until: 0.025, phase: "taxi", label: "Taxiing", detail: "Rolling to the runway" },
  { until: 0.06, phase: "takeoff", label: "Takeoff", detail: "Wheels up" },
  { until: 0.14, phase: "climb", label: "Climbing", detail: "Climbing to cruise altitude" },
  { until: 0.86, phase: "cruise", label: "Cruising", detail: "At altitude — this is the work" },
  { until: 0.94, phase: "descent", label: "Descending", detail: "Beginning descent" },
  { until: 1, phase: "approach", label: "Final approach", detail: "Approaching destination" },
];

export function phaseAt(progress: number): PhaseInfo {
  if (progress >= 1) {
    return { phase: "landed", label: "Landed", detail: "Arrived at the gate" };
  }
  const found = PHASES.find((p) => progress < p.until) ?? PHASES[PHASES.length - 1];
  return { phase: found.phase, label: found.label, detail: found.detail };
}

// ── Instruments ───────────────────────────────────────────────────────────

export interface Instruments {
  /** Feet. Climbs, holds, descends — never jumps. */
  altitudeFt: number;
  /** Knots, ground speed. */
  speedKn: number;
  /** Kilometres still to run. */
  remainingKm: number;
}

/** Smoothstep. Gives the climb and descent curves an ease rather than a ramp. */
const smooth = (t: number) => {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
};

/**
 * Altitude and speed for a given progress.
 *
 * These are simulated and labelled as such in the UI. They are still written as
 * a real profile rather than noise, because the thing that makes a fake
 * instrument feel cheap is not that it is fake — it is that it moves in ways an
 * aircraft cannot. So: climb to a cruise altitude chosen from the route's
 * length, hold it flat through cruise, then descend. Nothing here is random,
 * so nothing flickers between renders.
 */
export function instrumentsAt(flight: FocusFlight, progress: number): Instruments {
  const p = Math.max(0, Math.min(1, progress));

  // Longer routes cruise higher, the way real ones do: FL300 for a short hop,
  // FL410 for a long haul.
  const cruiseFt = 30_000 + Math.min(11_000, (flight.distanceKm / 12_000) * 11_000);
  const cruiseKn = 420 + Math.min(120, (flight.distanceKm / 12_000) * 120);

  let altitudeFt: number;
  let speedKn: number;

  if (p < 0.025) {
    altitudeFt = 0;
    speedKn = smooth(p / 0.025) * 160;
  } else if (p < 0.14) {
    const t = smooth((p - 0.025) / (0.14 - 0.025));
    altitudeFt = t * cruiseFt;
    speedKn = 160 + t * (cruiseKn - 160);
  } else if (p < 0.86) {
    altitudeFt = cruiseFt;
    speedKn = cruiseKn;
  } else if (p < 0.985) {
    const t = smooth((p - 0.86) / (0.985 - 0.86));
    altitudeFt = cruiseFt * (1 - t);
    speedKn = cruiseKn - t * (cruiseKn - 140);
  } else {
    altitudeFt = 0;
    speedKn = Math.max(0, 140 * (1 - smooth((p - 0.985) / 0.015)));
  }

  return {
    // Rounded to 100 ft and 5 kn so the readout ticks rather than jitters.
    altitudeFt: Math.round(altitudeFt / 100) * 100,
    speedKn: Math.round(speedKn / 5) * 5,
    remainingKm: Math.max(0, Math.round(flight.distanceKm * (1 - p))),
  };
}

// ── Presentation vocabulary ───────────────────────────────────────────────

export const INTENTS: {
  value: FocusIntent;
  label: string;
  description: string;
}[] = [
  { value: "study", label: "Study", description: "Reading, revision, exam prep, problem sets" },
  { value: "work", label: "Work", description: "Projects, coding, assignments, deep work" },
  { value: "create", label: "Create", description: "Writing, design, brainstorming, building" },
  { value: "review", label: "Review", description: "Going back over it, reflecting, consolidating" },
];

export const CABINS: {
  value: Cabin;
  label: string;
  description: string;
}[] = [
  { value: "window", label: "Window seat", description: "Scenic — clouds and horizon out the window" },
  { value: "quiet", label: "Quiet cabin", description: "Lights low, nothing moving, minimal chrome" },
  { value: "night", label: "Night flight", description: "Deep dark cabin, stars, city lights below" },
  { value: "business", label: "Business", description: "Bright, clean and legible for real work" },
];

export const DURATION_PRESETS = [
  { minutes: 25, label: "Short hop" },
  { minutes: 50, label: "Regional" },
  { minutes: 90, label: "Medium haul" },
  { minutes: 120, label: "Long haul" },
];

export const MIN_MINUTES = 5;
export const MAX_MINUTES = 180;

export function intentLabel(intent: FocusIntent): string {
  return INTENTS.find((i) => i.value === intent)?.label ?? "Focus";
}

export function cabinLabel(cabin: Cabin): string {
  return CABINS.find((c) => c.value === cabin)?.label ?? "Cabin";
}

/** `HH:MM` from an epoch instant, in the viewer's own timezone. */
export function clockTime(epochMs: number): string {
  return new Date(epochMs).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** `MM:SS`, or `H:MM:SS` past an hour. The countdown's own format. */
export function countdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
