import { colleges } from "./colleges";
import type { ReadinessPillars } from "@/hooks/useDashboardData";

/**
 * Calibrates a student's profile against the schools they actually chose.
 *
 * A bare 0–100 readiness score is close to meaningless: 62 is an excellent
 * profile for a regional university and a weak one for MIT, but the raw index
 * reports the same number to both students. Everything here answers the only
 * question that matters — "how do I compare to the people who get into *my*
 * list?" — by scoring the profile against tier-specific admitted-student bars
 * rather than against an abstract 100.
 */

export type Tier = "global" | "national" | "regional";

export type PillarKey = keyof ReadinessPillars;

export const PILLAR_KEYS: PillarKey[] = [
  "academics",
  "activities",
  "leadership",
  "competitions",
  "testPrep",
];

export const PILLAR_LABELS: Record<PillarKey, string> = {
  academics: "Academics",
  activities: "Activities",
  leadership: "Leadership",
  competitions: "Competitions",
  testPrep: "Testing",
};

/**
 * Which pillars the student has actually supplied data for.
 *
 * Absent data must never be scored as a zero. A test-optional applicant has not
 * "failed testing"; they have not reported it, which is a different claim. The
 * admissions calculator already renormalizes around missing components — this
 * keeps the readiness index consistent with it instead of quietly punishing
 * anyone whose curriculum or country doesn't produce a given signal.
 */
export type PillarCoverage = Record<PillarKey, boolean>;

/**
 * Pillar profile of a *typical admitted student* at each tier. These are the
 * denominators: scoring 78 on activities means one thing against a regional
 * bar of 42 and quite another against a global bar of 85.
 */
const BARS: Record<Tier, ReadinessPillars> = {
  global: { academics: 95, activities: 85, leadership: 78, competitions: 72, testPrep: 92 },
  national: { academics: 82, activities: 66, leadership: 55, competitions: 48, testPrep: 78 },
  regional: { academics: 62, activities: 42, leadership: 30, competitions: 20, testPrep: 55 },
};

/**
 * What actually separates applicants at each tier, which is not the same thing
 * at each tier. Nearly everyone admitted to a global school has the grades, so
 * academics stop discriminating and the distinguishing evidence is depth and
 * external validation. At a regional school the reverse holds.
 */
const WEIGHTS: Record<Tier, ReadinessPillars> = {
  global: { academics: 0.24, activities: 0.24, leadership: 0.18, competitions: 0.18, testPrep: 0.16 },
  national: { academics: 0.3, activities: 0.2, leadership: 0.15, competitions: 0.13, testPrep: 0.22 },
  regional: { academics: 0.42, activities: 0.16, leadership: 0.1, competitions: 0.06, testPrep: 0.26 },
};

const TIER_RANK: Record<Tier, number> = { global: 0, national: 1, regional: 2 };

export const TIER_LABELS: Record<Tier, string> = {
  global: "Most selective",
  national: "Highly selective",
  regional: "Selective",
};

/** Overshooting one bar shouldn't paper over a hole somewhere else. */
const OVERSHOOT_CAP = 1.15;

export interface PillarGap {
  key: PillarKey;
  label: string;
  /** The student's raw pillar score, 0–100. */
  value: number;
  /** What an admitted student at this tier typically shows. */
  bar: number;
  /** value / bar as a percentage — 100 means "at the bar". */
  attainment: number;
  /** Weight of this pillar at this tier, 0–1. */
  weight: number;
  /** Points of index gained by closing this gap entirely. Drives prioritisation. */
  upside: number;
  reported: boolean;
}

export interface Calibration {
  /** 100 = matches the typical admitted student at this tier. Can exceed 100. */
  index: number;
  tier: Tier;
  gaps: PillarGap[];
  /** Pillars with no data yet, excluded from the index rather than scored zero. */
  unreported: PillarKey[];
  /** The pillar where effort buys the most index at this tier. */
  priority: PillarGap | null;
}

/**
 * Score a profile against one tier's admitted-student bars.
 *
 * Only reported pillars are counted, with the surviving weights renormalized,
 * so the index describes the profile the student has actually built rather
 * than penalising them for signals their school system doesn't produce.
 */
export function calibrate(
  pillars: ReadinessPillars,
  tier: Tier,
  coverage: PillarCoverage
): Calibration {
  const bars = BARS[tier];
  const weights = WEIGHTS[tier];

  const reportedKeys = PILLAR_KEYS.filter((k) => coverage[k]);
  const liveWeight = reportedKeys.reduce((sum, k) => sum + weights[k], 0);

  const gaps: PillarGap[] = PILLAR_KEYS.map((key) => {
    const value = pillars[key] ?? 0;
    const bar = bars[key];
    const reported = coverage[key];
    const attainment = Math.round((value / bar) * 100);
    // Upside is expressed in index points so the priority is comparable across
    // pillars: a small gap on a heavily weighted pillar can outrank a large gap
    // on one that barely counts at this tier.
    const headroom = Math.max(0, 1 - value / bar);
    const normWeight = liveWeight > 0 ? weights[key] / liveWeight : 0;
    return {
      key,
      label: PILLAR_LABELS[key],
      value: Math.round(value),
      bar,
      attainment,
      weight: weights[key],
      upside: Math.round(headroom * normWeight * 100),
      reported,
    };
  });

  const index =
    liveWeight > 0
      ? Math.round(
          reportedKeys.reduce((sum, k) => {
            const ratio = Math.min(OVERSHOOT_CAP, (pillars[k] ?? 0) / bars[k]);
            return sum + ratio * weights[k];
          }, 0) /
            liveWeight *
            100
        )
      : 0;

  const candidates = gaps.filter((g) => g.reported && g.upside > 0);
  const priority = candidates.length
    ? candidates.reduce((a, b) => (b.upside > a.upside ? b : a))
    : null;

  return {
    index,
    tier,
    gaps,
    unreported: PILLAR_KEYS.filter((k) => !coverage[k]),
    priority,
  };
}

export type Standing = "Safety" | "Match" | "Reach" | "Far reach";

/**
 * Where the student stands at a school, derived from the same calibration that
 * produces the index. Deriving it here rather than regex-matching a tier string
 * out of an AI response means the label and the number can never disagree.
 */
export function standingFor(index: number): Standing {
  if (index >= 105) return "Safety";
  if (index >= 88) return "Match";
  if (index >= 68) return "Reach";
  return "Far reach";
}

const byName = new Map<string, (typeof colleges)[number]>();
for (const c of colleges) byName.set(c.name.toLowerCase(), c);

/** Tier for a school name, defaulting to the middle band when unknown. */
export function tierFor(name: string): Tier {
  return (byName.get(name.trim().toLowerCase())?.level as Tier) ?? "national";
}

export interface CalibratedCollege {
  name: string;
  tier: Tier;
  index: number;
  standing: Standing;
}

export interface ListCalibration {
  /** Index against the most selective school on the list — what sets the work. */
  headline: Calibration;
  /** Name of the school the headline is measured against. */
  headlineSchool: string | null;
  colleges: CalibratedCollege[];
  /** Schools currently at Match or better. */
  withinReach: number;
  /** True when the list has no Match-or-better school — a balance problem. */
  unbalanced: boolean;
}

/**
 * Calibrate a whole target list.
 *
 * The headline is measured against the *most selective* school on the list,
 * because that school determines the work the student still has to do. The
 * per-school breakdown then shows where that same profile already lands, so
 * the reading is demanding without being discouraging.
 */
export function calibrateList(
  pillars: ReadinessPillars,
  coverage: PillarCoverage,
  targetNames: string[]
): ListCalibration {
  const entries: CalibratedCollege[] = targetNames.map((name) => {
    const tier = tierFor(name);
    const { index } = calibrate(pillars, tier, coverage);
    return { name, tier, index, standing: standingFor(index) };
  });

  // Sort most selective first, then by how well the student stands.
  entries.sort((a, b) => TIER_RANK[a.tier] - TIER_RANK[b.tier] || a.index - b.index);

  const hardest = entries[0] ?? null;
  const headlineTier: Tier = hardest?.tier ?? "national";

  return {
    headline: calibrate(pillars, headlineTier, coverage),
    headlineSchool: hardest?.name ?? null,
    colleges: entries,
    withinReach: entries.filter((e) => e.standing === "Match" || e.standing === "Safety").length,
    unbalanced: entries.length > 0 && !entries.some((e) => e.standing === "Match" || e.standing === "Safety"),
  };
}
