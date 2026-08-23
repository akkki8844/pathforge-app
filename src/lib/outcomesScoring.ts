import type { OutcomesProfile, EvidenceState } from "@/hooks/useOutcomesData";
import type { ScoringWeights } from "@/hooks/useScoringWeights";
import { tagOf } from "@/lib/outcomesRecord";

/**
 * Outcomes scoring.
 *
 * ─── What changed and why ────────────────────────────────────────────────
 *
 * The previous model lived inline in Outcomes.tsx and had four structural
 * problems, all of which produced numbers a student could not act on:
 *
 *  1. It scored every signal against a flat 0–100 and then tried to express
 *     tier difficulty twice — once with a per-tier score multiplier (up to
 *     1.4x) and again with per-tier band thresholds (as low as 58). A state
 *     flagship applicant therefore got both a 40% score inflation *and* a
 *     24-point easier band. Tier leniency was double-counted.
 *
 *  2. Category scores were plain averages over their member signals, and two
 *     of the academics members were unreachable: `certifications` matched on
 *     course text the subject dropdown can never produce (always 0), and
 *     `research_output` is genuinely rare. The academics category therefore
 *     could not exceed 75/100 no matter what the student did, so 7.5 of its
 *     30 weight points were unwinnable by construction.
 *
 *  3. `timeline` — a pure function of grade level — was scored as an
 *     *achievement* inside academics. Being in 9th grade added points to a
 *     "College Readiness Score". Runway is a constraint on the plan, never
 *     evidence of readiness, so it is reported separately here and is not
 *     part of the index.
 *
 *  4. Admin weights were used as absolute percentages with no normalization,
 *     so an admin who set five weights of 30 made every score saturate at
 *     100, and five weights of 5 made 25 the mathematical ceiling.
 *
 * The model below fixes all four. The core idea is the one the dashboard
 * already uses in `collegeCalibration.ts`: score against the *bar* for the
 * tier you are aiming at, so 100 means "the evidence profile this tier
 * expects" rather than "100% of an abstract nothing".
 *
 * ─── Honesty rules this file obeys ───────────────────────────────────────
 *
 * • No percentiles. The app holds no admitted-student cohort, so it cannot
 *   compute one. Nothing here is labelled a percentile, a median, or a rank
 *   among peers.
 * • The tier bars below are Pathforge's published standard for each tier —
 *   editorial thresholds informed by public score bands and course-load
 *   norms. The UI says so in those words. They are not a measured cohort.
 * • Absent data is scored as absent, not invented. The single exception is
 *   standardized testing, which is genuinely optional at most institutions;
 *   an untested student has their testing weight redistributed rather than
 *   being scored zero, exactly as `collegeCalibration.ts` does.
 */

// ─── Evidence doctrine ───────────────────────────────────────────────────

/**
 * How much credit each evidence state earns, as a multiple of full credit.
 *
 * One doctrine applied everywhere rather than a different pair of magic
 * numbers per signal (the old model used 8/5/2/10/12/14/15 across ten
 * signals with no stated rationale).
 *
 * `evidence_submitted` at 0.4 is deliberate: submitted-but-unverified proof
 * is worth materially more than a typed claim and materially less than a
 * checked one. `in_progress` earns a token amount so that starting work
 * registers; `not_started` earns nothing, because a row in a form is not an
 * accomplishment.
 */
export const EVIDENCE_CREDIT: Record<EvidenceState, number> = {
  verified: 1,
  evidence_submitted: 0.4,
  in_progress: 0.1,
  not_started: 0,
};

/** Total credit a list contributes, at `full` points per fully-verified item. */
function creditOf(items: { evidenceState: EvidenceState }[], full: number): number {
  return items.reduce((sum, i) => sum + full * EVIDENCE_CREDIT[i.evidenceState], 0);
}

// ─── Tiers ───────────────────────────────────────────────────────────────

export type TierKey = "ivy" | "top-20" | "top-50" | "state";

export const TIER_LABEL: Record<TierKey, string> = {
  ivy: "Ivy / Top 10",
  "top-20": "Top 20",
  "top-50": "Top 50",
  state: "State flagships",
};

export type CategoryKey = keyof ScoringWeights;

export const CATEGORY_LABEL: Record<CategoryKey, string> = {
  academics: "Academics",
  test_prep: "Testing",
  leadership: "Leadership",
  activities: "Activities",
  competitions: "Competitions",
};

/**
 * The evidence profile each tier expects, per category, on this file's 0–100
 * category scales.
 *
 * `top-20`, `top-50` and `state` are set to exactly the `global`, `national`
 * and `regional` rows of `collegeCalibration.ts`, so the Outcomes reading and
 * the dashboard reading cannot disagree about what a tier demands. `ivy` is a
 * step above `global` because this page — unlike the dashboard — lets a
 * student separate "Top 10" from "Top 20", and collapsing them would make the
 * choice cosmetic.
 */
const TIER_BARS: Record<TierKey, Record<CategoryKey, number>> = {
  ivy: { academics: 98, activities: 92, leadership: 85, competitions: 82, test_prep: 96 },
  "top-20": { academics: 95, activities: 85, leadership: 78, competitions: 72, test_prep: 92 },
  "top-50": { academics: 82, activities: 66, leadership: 55, competitions: 48, test_prep: 78 },
  state: { academics: 62, activities: 42, leadership: 30, competitions: 20, test_prep: 55 },
};

export function tierOf(raw: string): TierKey {
  return (["ivy", "top-20", "top-50", "state"] as TierKey[]).includes(raw as TierKey)
    ? (raw as TierKey)
    : "top-20";
}

/**
 * Clearing a bar by a mile does not repair a hole elsewhere. Same cap and
 * same reasoning as `collegeCalibration.OVERSHOOT_CAP`.
 */
const OVERSHOOT_CAP = 1.15;

// ─── Signals ─────────────────────────────────────────────────────────────

export type SignalId =
  | "academic_rigor"
  | "test_score"
  | "leadership"
  | "initiative"
  | "competition"
  | "real_world_impact"
  | "service_impact"
  | "internships"
  | "research_output"
  | "creative_portfolio";

export interface Signal {
  id: SignalId;
  name: string;
  category: CategoryKey;
  /** 0–100 on this signal's documented absolute scale. */
  score: number;
  /** True when the student has supplied any data at all for this signal. */
  reported: boolean;
  /** One sentence of plain reasoning for the score. */
  reason: string;
  /** What clearing this signal actually takes. */
  requirement: string;
}

type Competition = OutcomesProfile["competitions"][number];

const IMPACT_EVIDENCE =
  /\b(raised|served|reached|users|students|funded|published|featured|grant|awarded|patent|launched|deployed|attendees|downloads|citations|revenue)\b|\d{2,}/i;

/**
 * Months of committed duration parsed from free text. "Ongoing" with no
 * number is read as 6 months — long enough to be real, short enough that it
 * cannot be used to claim a sustained role for free.
 */
export function parseDuration(duration: string): number {
  const lower = (duration || "").toLowerCase();
  const years = lower.match(/(\d+)\s*year/);
  const months = lower.match(/(\d+)\s*month/);
  let total = 0;
  if (years) total += parseInt(years[1], 10) * 12;
  if (months) total += parseInt(months[1], 10);
  if (total === 0 && lower.includes("ongoing")) total = 6;
  return total;
}

/**
 * Rigorous-course equivalents.
 *
 * An AP or IB course counts 1.0; an honors course counts 0.4, because it
 * carries roughly the workload signal of an AP without the external exam that
 * makes an AP verifiable. 10 equivalents is a full maximal load for a US high
 * school schedule and maps to 100.
 *
 * Before: `min(85, ap*14) + min(25, honors*5)`, which reached 85 at six AP
 * courses and then stalled — a student going from 6 to 9 AP courses saw no
 * movement at all unless they also added honors, and honors alone could carry
 * a student with zero AP courses to 25.
 */
const RCE_FULL_LOAD = 10;

function rigorScore(profile: OutcomesProfile): number {
  const apIb = profile.courses.filter((c) => c.level === "ap" || c.level === "ib").length;
  const honors = profile.courses.filter((c) => c.level === "honors").length;
  const rce = apIb + honors * 0.4;
  return Math.min(100, (rce / RCE_FULL_LOAD) * 100);
}

/**
 * Test scoring.
 *
 * Piecewise-linear through published anchors rather than the old
 * `(score - 1300) / 300` ramp, which had three defects: an SAT of 1290 scored
 * exactly 0 — indistinguishable from never having tested — the curve was
 * linear where the real distribution is anything but, and it returned raw
 * floats, so the UI rendered "76.66666666666667/100".
 *
 * Anchors: 1600 is the ceiling; ~1530 is around the midpoint of the published
 * middle-50% band at the most selective US universities; 1350 is roughly the
 * middle of the band at strong national universities; 1000 is near the
 * national mean. Every reported score is strictly better than the one below
 * it, so the scale is monotonic across its whole range.
 */
const SAT_ANCHORS: [number, number][] = [
  [400, 0],
  [1000, 10],
  [1200, 28],
  [1350, 50],
  [1450, 70],
  [1530, 86],
  [1600, 100],
];

const ACT_ANCHORS: [number, number][] = [
  [1, 0],
  [20, 10],
  [26, 28],
  [30, 50],
  [33, 70],
  [35, 86],
  [36, 100],
];

function interpolate(anchors: [number, number][], x: number): number {
  if (x <= anchors[0][0]) return anchors[0][1];
  const last = anchors[anchors.length - 1];
  if (x >= last[0]) return last[1];
  for (let i = 1; i < anchors.length; i++) {
    const [x1, y1] = anchors[i];
    const [x0, y0] = anchors[i - 1];
    if (x <= x1) return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
  }
  return last[1];
}

export interface TestReading {
  reported: boolean;
  score: number;
  /** The raw figure as entered, for display. */
  raw: number;
  label: string;
}

export function readTest(profile: OutcomesProfile): TestReading {
  const raw = parseInt(profile.testScore, 10);
  const has = profile.testType !== "none" && profile.testScore.trim() !== "" && !isNaN(raw);
  if (!has) return { reported: false, score: 0, raw: 0, label: "Not reported" };

  if (profile.testType === "act") {
    return { reported: true, score: interpolate(ACT_ANCHORS, raw), raw, label: `ACT ${raw}` };
  }
  if (profile.testType === "psat") {
    // The PSAT/NMSQT tops out at 1520 on the same scale family as the SAT, so
    // it reads directly against the SAT anchors. It is scored a touch below a
    // real SAT of the same figure — a practice test is a forecast, not a
    // submitted score — by capping its contribution at 92.
    return {
      reported: true,
      score: Math.min(92, interpolate(SAT_ANCHORS, raw)),
      raw,
      label: `PSAT ${raw}`,
    };
  }
  return { reported: true, score: interpolate(SAT_ANCHORS, raw), raw, label: `SAT ${raw}` };
}

export function computeSignals(profile: OutcomesProfile): Signal[] {
  const signals: Signal[] = [];

  // ── Academic rigor ─────────────────────────────────────────────────────
  const apIb = profile.courses.filter((c) => c.level === "ap" || c.level === "ib").length;
  const honors = profile.courses.filter((c) => c.level === "honors").length;
  signals.push({
    id: "academic_rigor",
    name: "Coursework rigor",
    category: "academics",
    score: rigorScore(profile),
    reported: profile.courses.length > 0,
    reason:
      profile.courses.length === 0
        ? "No coursework recorded yet."
        : apIb === 0
          ? `${profile.courses.length} courses on file, none at AP or IB level.`
          : `${apIb} AP/IB${honors ? ` and ${honors} honors` : ""} on file.`,
    requirement: "A full rigorous load — roughly ten AP/IB-equivalent courses, weighted toward your intended field.",
  });

  // ── Testing ────────────────────────────────────────────────────────────
  const test = readTest(profile);
  signals.push({
    id: "test_score",
    name: "Standardized testing",
    category: "test_prep",
    score: test.score,
    reported: test.reported,
    reason: test.reported
      ? `${test.label} on file.`
      : "No score reported. Testing is left out of the reading rather than counted as a zero.",
    requirement: "A score inside the published middle-50% band of the schools you are aiming at.",
  });

  // ── Leadership ─────────────────────────────────────────────────────────
  // Partitioned, not overlapping. The old model ran two filters where every
  // "sustained" role also satisfied the "moderate" test, so each sustained
  // role was paid twice (35 + 18) and two of them alone pinned the signal at
  // 100.
  const loggedRoles = profile.leadershipRoles.filter((r) => r.title.trim().length > 0);
  // Being in a club is not leading one. Membership shares this list because it
  // shares the shape — a title, an organisation, a stretch of time — but it is
  // tagged, and a tagged activity can never satisfy the sustained or moderate
  // tests however long it ran or however many people were in the room.
  const activities = loggedRoles.filter((r) => tagOf(r) === "activity");
  const roles = loggedRoles.filter((r) => tagOf(r) !== "activity");
  const sustained = roles.filter((r) => parseDuration(r.duration) >= 9 && r.teamSize >= 8);
  const moderate = roles.filter(
    (r) => !sustained.includes(r) && parseDuration(r.duration) >= 6 && r.teamSize >= 5
  );
  const slight = roles.filter((r) => !sustained.includes(r) && !moderate.includes(r));
  // Breadth of membership is worth a little and is capped hard, so a list of
  // twelve clubs cannot be made to read as leadership.
  const activityCredit = Math.min(16, creditOf(activities, 6));
  const leadershipScore = Math.min(
    100,
    creditOf(sustained, 40) + creditOf(moderate, 20) + creditOf(slight, 8) + activityCredit
  );
  const verifiedSustained = sustained.filter((r) => r.evidenceState === "verified").length;
  signals.push({
    id: "leadership",
    name: "Leadership",
    category: "leadership",
    score: leadershipScore,
    reported: loggedRoles.length > 0,
    reason:
      loggedRoles.length === 0
        ? "No leadership roles recorded."
        : roles.length === 0
          ? `${activities.length} activit${activities.length === 1 ? "y" : "ies"} on file, but no role where you led one.`
          : verifiedSustained > 0
            ? `${verifiedSustained} verified sustained role${verifiedSustained === 1 ? "" : "s"} of ${roles.length} on file.`
            : `${roles.length} role${roles.length === 1 ? "" : "s"} on file, none yet verified as sustained.`,
    requirement: "Two verified roles, each nine months or longer with eight or more people, and a documented result.",
  });

  // ── Initiative ─────────────────────────────────────────────────────────
  const projects = profile.projects.filter((p) => p.title.trim().length > 0);
  const substantial = projects.filter((p) => p.outcome.trim().length > 40 && !!p.link);
  const documented = projects.filter((p) => !substantial.includes(p) && (p.outcome.trim().length > 0 || !!p.link));
  const listed = projects.filter((p) => !substantial.includes(p) && !documented.includes(p));
  const initiativeScore = Math.min(
    100,
    creditOf(substantial, 34) + creditOf(documented, 16) + Math.min(9, creditOf(listed, 3))
  );
  signals.push({
    id: "initiative",
    name: "Independent projects",
    category: "activities",
    score: initiativeScore,
    reported: projects.length > 0,
    reason:
      projects.length === 0
        ? "No independent projects recorded."
        : `${projects.length} project${projects.length === 1 ? "" : "s"} on file, ${substantial.filter((p) => p.evidenceState === "verified").length} verified with a result and a public link.`,
    requirement: "Two verified projects, each with a stated result and a public artefact anyone can open.",
  });

  // ── Competitions ───────────────────────────────────────────────────────
  // Strictly monotonic in level. The old model paid a state entry 10 points
  // and an international entry without a medal nothing at all, so entering a
  // harder competition could lower the score.
  const WIN = /(top|gold|silver|bronze|1st|2nd|3rd|first|second|third|finalist|medal|winner|honou?rable)/i;
  /*
   * Three kinds share this list: entered competitions, awards given rather than
   * entered for, and certifications examined by an outside body. They share a
   * column because they are the same shape — an external body, a level of
   * recognition, a result — and an entry saved before the record could tell
   * them apart carries no tag, so it is read as a competition exactly as it
   * always was.
   */
  const loggedComps = profile.competitions.filter((c) => c.name.trim().length > 0);
  const comps = loggedComps.filter((c) => {
    const tag = tagOf(c);
    return tag === undefined || tag === "competition";
  });
  const awards = loggedComps.filter((c) => tagOf(c) === "award");
  const certs = loggedComps.filter((c) => tagOf(c) === "certification");
  const compValue = (level: Competition["level"], result: string): number => {
    const won = WIN.test(result || "");
    switch (level) {
      case "international":
        return won ? 50 : 22;
      case "national":
        return won ? 30 : 16;
      case "state":
        return won ? 14 : 9;
      case "regional":
        return won ? 8 : 5;
      default:
        return 2;
    }
  };
  /*
   * An award is worth less than a placement at the same level. Both are an
   * outside body naming you, but a placement was won against a field that was
   * published, which is the harder claim to make and the easier one to check.
   */
  const AWARD_VALUE: Record<Competition["level"], number> = {
    international: 30,
    national: 20,
    state: 10,
    regional: 6,
    school: 3,
  };
  /*
   * A certification is a floor, not a distinction: it says you passed something
   * anyone may sit. It is worth a fixed small amount regardless of the level
   * field — which means nothing for a credential — and the total is capped, so
   * a stack of them cannot stand in for a result.
   */
  const CERT_VALUE = 6;
  const CERT_CAP = 18;
  const competitionScore = Math.min(
    100,
    comps.reduce(
      (sum, c) => sum + compValue(c.level, c.result) * EVIDENCE_CREDIT[c.evidenceState],
      0
    ) +
      awards.reduce((sum, a) => sum + AWARD_VALUE[a.level] * EVIDENCE_CREDIT[a.evidenceState], 0) +
      Math.min(
        CERT_CAP,
        certs.reduce((sum, c) => sum + CERT_VALUE * EVIDENCE_CREDIT[c.evidenceState], 0)
      )
  );
  const topPlacements = comps.filter(
    (c) => c.evidenceState === "verified" && WIN.test(c.result || "") && (c.level === "national" || c.level === "international")
  ).length;
  const majorAwards = awards.filter(
    (a) => a.evidenceState === "verified" && (a.level === "national" || a.level === "international")
  ).length;
  signals.push({
    id: "competition",
    name: "Competitions and awards",
    category: "competitions",
    score: competitionScore,
    reported: loggedComps.length > 0,
    reason:
      loggedComps.length === 0
        ? "No competitions, awards or certifications recorded."
        : topPlacements + majorAwards > 0
          ? `${topPlacements + majorAwards} verified national or international ${topPlacements + majorAwards === 1 ? "result" : "results"} on file.`
          : `${loggedComps.length} entr${loggedComps.length === 1 ? "y" : "ies"} on file, none yet verified at national level.`,
    requirement: "One verified international placement, or two verified national ones.",
  });

  // ── Real-world impact ──────────────────────────────────────────────────
  const impactProjects = projects.filter(
    (p) => IMPACT_EVIDENCE.test(p.outcome || "") && p.outcome.trim().length > 40
  );
  const impactRoles = roles.filter((r) => r.teamSize >= 15 && parseDuration(r.duration) >= 12);
  const impactScore = Math.min(100, creditOf(impactProjects, 28) + creditOf(impactRoles, 28));
  signals.push({
    id: "real_world_impact",
    name: "Measured impact",
    category: "activities",
    score: impactScore,
    reported: impactProjects.length + impactRoles.length > 0,
    reason:
      impactProjects.length + impactRoles.length === 0
        ? "Nothing on file yet carries a number — how many people, how much raised, how far it reached."
        : `${impactProjects.length + impactRoles.length} entr${impactProjects.length + impactRoles.length === 1 ? "y" : "ies"} state a measurable result.`,
    requirement: "Three verified entries whose outcome names a figure — people served, funds raised, reach achieved.",
  });

  // ── Service ────────────────────────────────────────────────────────────
  const service = profile.serviceRoles.filter((s) => s.role.trim().length > 0);
  const deepService = service.filter((s) => s.hours >= 40 && IMPACT_EVIDENCE.test(s.impact || ""));
  const otherService = service.filter((s) => !deepService.includes(s));
  const serviceScore = Math.min(100, creditOf(deepService, 30) + creditOf(otherService, 12));
  signals.push({
    id: "service_impact",
    name: "Service",
    category: "activities",
    score: serviceScore,
    reported: service.length > 0,
    reason:
      service.length === 0
        ? "No community or civic work recorded."
        : `${service.length} entr${service.length === 1 ? "y" : "ies"}, ${deepService.length} at forty hours or more with a stated outcome.`,
    requirement: "Sustained verified service — forty hours or more, with a documented community result.",
  });

  // ── Internships ────────────────────────────────────────────────────────
  const internships = profile.internships.filter((i) => i.title.trim().length > 0);
  const internshipScore = Math.min(100, creditOf(internships, 34));
  signals.push({
    id: "internships",
    name: "Work experience",
    category: "activities",
    score: internshipScore,
    reported: internships.length > 0,
    reason:
      internships.length === 0
        ? "No internships, lab placements, shadowing or paid work recorded."
        : `${internships.length} placement${internships.length === 1 ? "" : "s"} on file.`,
    requirement: "Verified placements with named responsibilities and a stated outcome.",
  });

  // ── Research ───────────────────────────────────────────────────────────
  const research = profile.researchOutputs.filter((r) => r.title.trim().length > 0);
  const citable = research.filter((r) => !!r.link || r.venue.trim().length > 0);
  const uncitable = research.filter((r) => !citable.includes(r));
  const researchScore = Math.min(100, creditOf(citable, 40) + creditOf(uncitable, 16));
  signals.push({
    id: "research_output",
    name: "Research",
    category: "academics",
    score: researchScore,
    reported: research.length > 0,
    reason:
      research.length === 0
        ? "No papers, posters, preprints or mentored research recorded."
        : `${research.length} output${research.length === 1 ? "" : "s"}, ${citable.length} with a venue or a link.`,
    requirement: "A verified artefact a reader can find — paper, poster, preprint, or a mentor who will confirm it.",
  });

  // ── Portfolio ──────────────────────────────────────────────────────────
  const creative = profile.creativeWorks.filter((c) => c.title.trim().length > 0);
  const reaching = creative.filter((c) => !!c.link || IMPACT_EVIDENCE.test(c.reach || ""));
  const otherCreative = creative.filter((c) => !reaching.includes(c));
  const creativeScore = Math.min(100, creditOf(reaching, 30) + creditOf(otherCreative, 12));
  signals.push({
    id: "creative_portfolio",
    name: "Public portfolio",
    category: "activities",
    score: creativeScore,
    reported: creative.length > 0,
    reason:
      creative.length === 0
        ? "No writing, design, music, media or public work recorded."
        : `${creative.length} piece${creative.length === 1 ? "" : "s"}, ${reaching.length} with an audience or a link.`,
    requirement: "Verified public work with an audience, a publication, a selection, or a client.",
  });

  return signals;
}

// ─── Category roll-up ────────────────────────────────────────────────────

const CATEGORY_MEMBERS: Record<CategoryKey, SignalId[]> = {
  academics: ["academic_rigor", "research_output"],
  test_prep: ["test_score"],
  leadership: ["leadership"],
  activities: ["initiative", "real_world_impact", "service_impact", "internships", "creative_portfolio"],
  competitions: ["competition"],
};

/**
 * Depth carries 60% of a category, breadth the remaining 40%.
 *
 * A plain average — what the old model used — punishes exactly the profile
 * admissions rewards. A student with one outstanding project and nothing else
 * in `activities` scored 100/5 = 20 under an average, ranking below a student
 * with five shallow entries. Blending the strongest single signal with the
 * mean keeps breadth worth chasing while letting a genuine spike register.
 */
const DEPTH_SHARE = 0.6;

export function categoryScore(signals: Signal[], key: CategoryKey): number {
  const members = signals.filter((s) => CATEGORY_MEMBERS[key].includes(s.id));
  if (members.length === 0) return 0;
  const best = Math.max(...members.map((s) => s.score));
  const mean = members.reduce((sum, s) => sum + s.score, 0) / members.length;
  return DEPTH_SHARE * best + (1 - DEPTH_SHARE) * mean;
}

export interface CategoryStanding {
  key: CategoryKey;
  label: string;
  /** 0–100 on this category's scale. */
  score: number;
  /** What this tier expects, same scale. */
  bar: number;
  /** score / bar as a percentage. 100 means "at the bar". */
  attainment: number;
  /** Share of the index this category carries at the current weights, 0–1. */
  weight: number;
  /** Index points this category currently contributes. */
  contribution: number;
  /** Index points still on the table here. Drives the priority ordering. */
  onOffer: number;
  /** False only for testing, and only when no score was reported. */
  counted: boolean;
}

export type ReadinessBand = "at" | "near" | "below" | "far";

export const BAND_LABEL: Record<ReadinessBand, string> = {
  at: "At the bar",
  near: "Within reach",
  below: "Below the bar",
  far: "Far below the bar",
};

/*
 * Two inks and one warning hue, in that order of severity. The previous ramp
 * spent a different saturated colour on each of the four bands, which read as
 * a traffic light bolted to a page that is otherwise set like a document — and
 * it collided with the blue this page already uses for eyebrows, ledger figures
 * and every bar fill.
 */
export const BAND_TONE: Record<ReadinessBand, string> = {
  at: "text-foreground",
  near: "text-primary",
  below: "text-muted-foreground",
  far: "text-amber-700 dark:text-amber-400",
};

/**
 * Band thresholds on the index, where 100 is the tier's own bar.
 *
 * These are the dashboard's `standingFor` cut points (88 and 68) with the top
 * band set at the bar itself rather than at 105 — the dashboard adds a five
 * point cushion because it is calling a specific school a Safety, which is a
 * stronger claim than "your evidence meets this tier's standard".
 *
 * They are constants, not per-tier. That is the whole point of scoring
 * against a bar: difficulty lives in the bar, so the bands do not have to
 * move as well. Under the old model a state-flagship applicant got a 1.4x
 * score multiplier *and* a Band A threshold of 58 instead of 82.
 */
export function bandOf(index: number): ReadinessBand {
  if (index >= 100) return "at";
  if (index >= 88) return "near";
  if (index >= 68) return "below";
  return "far";
}

export interface Reading {
  /** 100 = the evidence profile this tier expects. Caps at 115. */
  index: number;
  band: ReadinessBand;
  tier: TierKey;
  categories: CategoryStanding[];
  /** The category where closing the gap buys the most index. */
  priority: CategoryStanding | null;
  /** True when the student reported no standardized score. */
  testingUnreported: boolean;
}

/**
 * Normalized weights.
 *
 * Admin weights are *relative*, not percentages. Dividing by their sum means
 * an admin can type any five numbers and the index still runs 0–100. The old
 * model treated them as absolute percentages: five weights of 30 made every
 * student saturate at 100, and five weights of 5 capped everyone at 25.
 */
export function normalizeWeights(w: ScoringWeights): Record<CategoryKey, number> {
  const keys = Object.keys(w) as CategoryKey[];
  const total = keys.reduce((sum, k) => sum + Math.max(0, w[k]), 0);
  if (total <= 0) {
    // An all-zero weight set would otherwise divide by zero. Fall back to
    // equal weighting rather than returning NaN to the UI.
    return keys.reduce((acc, k) => ({ ...acc, [k]: 1 / keys.length }), {} as Record<CategoryKey, number>);
  }
  return keys.reduce(
    (acc, k) => ({ ...acc, [k]: Math.max(0, w[k]) / total }),
    {} as Record<CategoryKey, number>
  );
}

export function computeReading(
  signals: Signal[],
  weights: ScoringWeights,
  tierRaw: string
): Reading {
  const tier = tierOf(tierRaw);
  const bars = TIER_BARS[tier];
  const w = normalizeWeights(weights);

  const testSignal = signals.find((s) => s.id === "test_score");
  const testingUnreported = !testSignal?.reported;

  const keys = Object.keys(CATEGORY_MEMBERS) as CategoryKey[];
  // Testing is the one category that can be genuinely absent rather than
  // empty: most institutions are test-optional, and a 9th grader has not sat
  // the exam yet. Dropping it and renormalizing matches how the admissions
  // calculator and the dashboard already treat missing components. Every
  // other category counts, because "no competitions" is a real zero, not an
  // unreported one.
  const counted = keys.filter((k) => !(k === "test_prep" && testingUnreported));
  const liveWeight = counted.reduce((sum, k) => sum + w[k], 0);

  const categories: CategoryStanding[] = keys.map((key) => {
    const score = categoryScore(signals, key);
    const bar = bars[key];
    const isCounted = counted.includes(key);
    const normWeight = liveWeight > 0 && isCounted ? w[key] / liveWeight : 0;
    const ratio = Math.min(OVERSHOOT_CAP, score / bar);
    return {
      key,
      label: CATEGORY_LABEL[key],
      score: Math.round(score),
      bar,
      attainment: Math.round((score / bar) * 100),
      weight: normWeight,
      contribution: Math.round(ratio * normWeight * 100),
      onOffer: Math.round(Math.max(0, 1 - score / bar) * normWeight * 100),
      counted: isCounted,
    };
  });

  const index = Math.round(
    categories.filter((c) => c.counted).reduce((sum, c) => {
      const ratio = Math.min(OVERSHOOT_CAP, c.score / c.bar);
      return sum + ratio * c.weight;
    }, 0) * 100
  );

  const withHeadroom = categories.filter((c) => c.counted && c.onOffer > 0);
  const priority = withHeadroom.length
    ? withHeadroom.reduce((a, b) => (b.onOffer > a.onOffer ? b : a))
    : null;

  return { index, band: bandOf(index), tier, categories, priority, testingUnreported };
}

// ─── Signal standings, ranked ────────────────────────────────────────────

export interface SignalStanding extends Signal {
  /** The bar this signal's own category carries at the chosen tier. */
  bar: number;
  /** score / bar, as a percentage. */
  attainment: number;
}

/**
 * Every signal against its tier bar, weakest first.
 *
 * The ordering is the information: the top of this list is the shortest path
 * to a better reading. The previous "Signal Breakdown" listed signals in
 * source order and coloured them by a four-state status enum, which told the
 * student ten things were wrong but not which one to touch.
 */
export function rankSignals(signals: Signal[], tierRaw: string): SignalStanding[] {
  const bars = TIER_BARS[tierOf(tierRaw)];
  return signals
    .map((s) => {
      const bar = bars[s.category];
      return { ...s, bar, attainment: Math.round((s.score / bar) * 100) };
    })
    .sort((a, b) => a.attainment - b.attainment);
}

// ─── The proof ledger ────────────────────────────────────────────────────

export interface ProofLine {
  label: string;
  total: number;
  verified: number;
  submitted: number;
  unproven: number;
}

/**
 * Every record in the file, counted by how well it is evidenced.
 *
 * This is the most honest ranking on the page because it involves no model at
 * all — it is a count of what the student has actually proved versus what
 * they have merely typed.
 */
export function proofLedger(profile: OutcomesProfile): ProofLine[] {
  const line = (label: string, items: { evidenceState: EvidenceState }[]): ProofLine => ({
    label,
    total: items.length,
    verified: items.filter((i) => i.evidenceState === "verified").length,
    submitted: items.filter((i) => i.evidenceState === "evidence_submitted").length,
    unproven: items.filter(
      (i) => i.evidenceState === "not_started" || i.evidenceState === "in_progress"
    ).length,
  });

  return [
    line("Projects", profile.projects.filter((p) => p.title.trim())),
    // Named for everything the list now holds. Both of these carry more than
    // one kind of entry since the record learned to tell them apart.
    line("Leadership and activities", profile.leadershipRoles.filter((r) => r.title.trim())),
    line("Competitions and awards", profile.competitions.filter((c) => c.name.trim())),
    line("Service", profile.serviceRoles.filter((s) => s.role.trim())),
    line("Work", profile.internships.filter((i) => i.title.trim())),
    line("Research", profile.researchOutputs.filter((r) => r.title.trim())),
    line("Portfolio", profile.creativeWorks.filter((c) => c.title.trim())),
  ].filter((l) => l.total > 0);
}

// ─── Calibration: how much the reading rests on ──────────────────────────

export type CalibrationLevel = "strong" | "partial" | "weak" | "none";

export interface Calibration {
  /** Entries carrying verified proof, as a percentage of all entries. */
  coverage: number;
  total: number;
  verified: number;
  submitted: number;
  level: CalibrationLevel;
}

export const CALIBRATION_LABEL: Record<CalibrationLevel, string> = {
  strong: "Well evidenced",
  partial: "Partly evidenced",
  weak: "Thinly evidenced",
  none: "Nothing on file",
};

/**
 * How well-supported the reading is — which is a different question from how
 * high it is.
 *
 * This introduces no model and no new number. It is the proof ledger already
 * computed above, restated as one figure so the page can put "how confident
 * should I be in this" next to the index instead of three panels below it. Two
 * students can share an index of 74 where one has proved most of their file and
 * the other has typed all of it; the index alone cannot tell them apart, and
 * acting on an unproved 74 is a materially worse decision.
 *
 * The thresholds are presentational, not scoring: `EVIDENCE_CREDIT` above is
 * what actually discounts unproved entries inside the index, and nothing here
 * feeds back into it.
 */
export function calibrationOf(lines: ProofLine[]): Calibration {
  const total = lines.reduce((s, l) => s + l.total, 0);
  const verified = lines.reduce((s, l) => s + l.verified, 0);
  const submitted = lines.reduce((s, l) => s + l.submitted, 0);
  const coverage = total === 0 ? 0 : Math.round((verified / total) * 100);
  const level: CalibrationLevel =
    total === 0 ? "none" : coverage >= 60 ? "strong" : coverage >= 25 ? "partial" : "weak";
  return { coverage, total, verified, submitted, level };
}

// ─── Shape of the file: depth against breadth ────────────────────────────

export interface ShapeReading {
  /** Categories of record holding at least one verified entry. */
  breadth: number;
  /** How many record categories exist in total. */
  breadthOf: number;
  /** The strongest signal on the file. */
  deepest: { name: string; score: number } | null;
  /** Mean of the non-empty signals — how even the file is. */
  spread: number;
  verdict: "spike" | "even" | "thin" | "empty";
}

/**
 * Depth against breadth.
 *
 * Selective admissions rewards a profile with one thing it is unambiguously
 * about far more than one that ticks every box shallowly. This reports which
 * shape the file currently has. It classifies; it does not score, and it does
 * not feed the index.
 */
export function readShape(signals: Signal[], profile: OutcomesProfile): ShapeReading {
  const ledger = proofLedger(profile);
  const breadth = ledger.filter((l) => l.verified > 0).length;
  const active = signals.filter((s) => s.score > 0);
  const deepest = active.length
    ? active.reduce((a, b) => (b.score > a.score ? b : a))
    : null;
  const spread = active.length
    ? Math.round(active.reduce((sum, s) => sum + s.score, 0) / active.length)
    : 0;

  // "Spike" needs a signal that is genuinely ahead of the rest of the file,
  // not merely the tallest of a short set — hence both an absolute floor and
  // a margin over the mean.
  const verdict: ShapeReading["verdict"] =
    !deepest || deepest.score < 20
      ? "empty"
      : deepest.score >= 60 && deepest.score - spread >= 25
        ? "spike"
        : spread >= 40
          ? "even"
          : "thin";

  return {
    breadth,
    breadthOf: 7,
    deepest: deepest ? { name: deepest.name, score: Math.round(deepest.score) } : null,
    spread,
    verdict,
  };
}

// ─── Runway ──────────────────────────────────────────────────────────────

export interface Runway {
  grade: number;
  monthsLeft: number;
  /** The application autumn this student is working toward. */
  deadlineYear: number;
}

/**
 * Months until applications are due.
 *
 * Reported, never scored. Under the old model this was a *signal* inside the
 * academics category worth `monthsRemaining * 3` capped at 100 — so a 9th
 * grader with an empty file scored 100 on it and a 12th grader with the same
 * empty file scored 18. Being young is not evidence of readiness; it is the
 * amount of time left to produce some.
 *
 * US applications close in the autumn of grade 12 (1 November for early
 * rounds). This counts whole months from today to that date.
 */
export function readRunway(gradeLevel: string): Runway {
  const grade = Math.min(12, Math.max(9, parseInt(gradeLevel, 10) || 11));
  const now = new Date();
  // The academic year rolls in August, so before August a student is still in
  // the grade they entered the previous autumn.
  const academicYearStart = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  const deadlineYear = academicYearStart + (12 - grade);
  const deadline = new Date(deadlineYear, 10, 1); // 1 November
  const monthsLeft = Math.max(
    0,
    Math.round((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30.44))
  );
  return { grade, monthsLeft, deadlineYear };
}

// ─── Coursework composition ──────────────────────────────────────────────

export interface CourseworkReading {
  ap: number;
  ib: number;
  honors: number;
  regular: number;
  total: number;
  /** Rigorous-course equivalents, one decimal. */
  rce: number;
  /** Equivalents a full load carries. */
  rceFull: number;
}

// ─── Gap work ────────────────────────────────────────────────────────────

export interface GapTask {
  id: string;
  signal: SignalId;
  signalName: string;
  objective: string;
  scope: string;
  horizon: string;
  proof: string[];
  /**
   * Index points this task can actually recover — the share of its category's
   * remaining headroom that this signal is responsible for.
   *
   * The old model hard-coded these ("+25 pts", "+30 pts") with no connection
   * to the score at all, so a student could complete a "+30" task and watch
   * the number move by two. These are derived from the live weights and the
   * live bar, so the figure on the card is the figure the index will move by.
   */
  worth: number;
}

const TASK_COPY: Record<
  SignalId,
  { objective: string; scope: string; horizon: string; proof: string[] }
> = {
  academic_rigor: {
    objective: "Add two AP or IB courses in your intended field next term",
    scope:
      "Enrolment needs counsellor sign-off and prerequisites, so start the conversation before selection closes. A full year counts; a dropped course does not.",
    horizon: "Before course selection closes",
    proof: ["Enrolment confirmation", "Course syllabus", "End-of-term grade report"],
  },
  test_score: {
    objective: "Sit the SAT or ACT and report the score",
    scope:
      "Eight weeks of preparation is the realistic floor for a meaningful jump. Book the sitting first — the date is what makes the plan real.",
    horizon: "Next available sitting",
    proof: ["Official score report", "Score-send confirmation to your list"],
  },
  leadership: {
    objective: "Lead one team of five or more for at least eight weeks, to a stated result",
    scope:
      "You need to be the person who started it, the person the team reports to, and the person who can name what it produced. A title with no output does not read as leadership.",
    horizon: "8–12 weeks",
    proof: [
      "Roster of five or more with their roles",
      "Meeting notes across eight weeks",
      "The result, stated as a number",
      "Confirmation from someone outside the team",
    ],
  },
  initiative: {
    objective: "Ship one independent project with a public artefact",
    scope:
      "Self-directed, finished, and open to a stranger. A repository nobody can read and a document nobody can open both count as nothing.",
    horizon: "3–4 months",
    proof: ["Public link", "A result stated as a number", "Mentor or peer confirmation"],
  },
  competition: {
    objective: "Enter one recognised state or national competition in your field",
    scope:
      "Recognised means an external body runs it and publishes results — Olympiads, USACO, DECA, Regeneron, debate nationals. Entering is the minimum; the result is the signal.",
    horizon: "Next competition cycle",
    proof: ["Registration confirmation", "Official result or placement certificate"],
  },
  real_world_impact: {
    objective: "Attach a number to your strongest project",
    scope:
      "Go back to work you have already done and measure it: how many people used it, how much was raised, how far it travelled. Unmeasured work reads as unfinished work.",
    horizon: "2–4 weeks",
    proof: ["Analytics, attendance, or ledger", "A written outcome naming the figure"],
  },
  service_impact: {
    objective: "Commit forty hours to one organisation and record the outcome",
    scope:
      "One organisation, sustained. Forty hours across six causes reads as a requirement being met; forty hours at one reads as a commitment.",
    horizon: "One term",
    proof: ["Signed hours log", "Statement from the organisation", "The outcome, stated as a number"],
  },
  internships: {
    objective: "Secure one placement — lab, studio, clinic, firm, or paid work",
    scope:
      "Approach people whose work you can already discuss. A specific ask referencing their actual output outperforms fifty generic emails.",
    horizon: "One term to arrange",
    proof: ["Offer or confirmation letter", "Named responsibilities", "Supervisor reference"],
  },
  research_output: {
    objective: "Produce one findable research artefact",
    scope:
      "A poster at a regional symposium, a preprint, or a mentored write-up your supervisor will put their name to. It has to be something a reader can retrieve.",
    horizon: "4–6 months",
    proof: ["Link or DOI", "Venue or supervisor confirmation", "Your stated role"],
  },
  creative_portfolio: {
    objective: "Publish your work somewhere with an audience",
    scope:
      "Writing, design, music, film, software — the medium is open, the audience is not. Selection, publication, or measurable reach is what separates a portfolio from a folder.",
    horizon: "2–3 months",
    proof: ["Public link", "Audience, circulation or selection evidence"],
  },
};

/**
 * One task per signal that sits below its tier bar, ordered by what each is
 * actually worth.
 *
 * The old generator covered five of the ten signals, so half the standings
 * could be red with no corresponding work anywhere on the page.
 */
export function generateGapTasks(signals: Signal[], reading: Reading): GapTask[] {
  const byKey = new Map(reading.categories.map((c) => [c.key, c]));

  return signals
    .map((s) => {
      const cat = byKey.get(s.category);
      if (!cat || !cat.counted) return null;
      const bar = cat.bar;
      const headroom = Math.max(0, 1 - s.score / bar);
      if (headroom <= 0.02) return null;

      // Split the category's remaining headroom across its members in
      // proportion to how far behind each one is, so two weak signals in one
      // category cannot each claim the category's whole upside.
      const members = signals.filter((m) => CATEGORY_MEMBERS[s.category].includes(m.id));
      const totalHeadroom = members.reduce(
        (sum, m) => sum + Math.max(0, 1 - m.score / bar),
        0
      );
      const share = totalHeadroom > 0 ? headroom / totalHeadroom : 0;
      const worth = Math.round(cat.onOffer * share);

      const copy = TASK_COPY[s.id];
      return {
        id: `gap_${s.id}`,
        signal: s.id,
        signalName: s.name,
        objective: copy.objective,
        scope: copy.scope,
        horizon: copy.horizon,
        proof: copy.proof,
        worth,
      } satisfies GapTask;
    })
    .filter((t): t is GapTask => t !== null)
    .sort((a, b) => b.worth - a.worth);
}

export function readCoursework(profile: OutcomesProfile): CourseworkReading {
  const by = (level: string) => profile.courses.filter((c) => c.level === level).length;
  const ap = by("ap");
  const ib = by("ib");
  const honors = by("honors");
  const regular = by("regular");
  return {
    ap,
    ib,
    honors,
    regular,
    total: profile.courses.length,
    rce: Math.round((ap + ib + honors * 0.4) * 10) / 10,
    rceFull: RCE_FULL_LOAD,
  };
}
