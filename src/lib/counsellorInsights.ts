/**
 * Rule-based counsellor insight engine.
 * Pure functions — no AI calls, deterministic, instant.
 * Translates a student's journey + outcomes data into a profile score,
 * priority level, strengths, weaknesses, gaps, and suggested next moves.
 */

export interface InsightInput {
  scores?: {
    overall_score: number;
    academics_score: number;
    activities_score: number;
    leadership_score: number;
    competitions_score: number;
    test_prep_score: number;
  } | null;
  outcomes?: {
    courses?: unknown[];
    projects?: unknown[];
    leadership_roles?: unknown[];
    competitions?: unknown[];
  } | null;
  onboarding?: {
    grade?: string | null;
    intended_major?: string | null;
    standardized_test_score?: string | null;
    target_universities?: string[] | null;
  } | null;
}

export type Priority = "high_priority" | "needs_attention" | "on_track";

export interface CounsellorInsight {
  /** 0-100 holistic profile score, weighted across academics + ECs + signals. */
  profileScore: number;
  /** Counsellor-facing priority label (replaces vague "risk"). */
  priority: Priority;
  /** Back-compat alias for older UI. */
  riskLevel: "low" | "medium" | "high";
  strengths: string[];
  weaknesses: string[];
  /** Missing components — concrete things absent from the profile. */
  missing: string[];
  /** Strategic next moves a counsellor can hand to the student. */
  suggestions: string[];
}

const len = (v: unknown): number => (Array.isArray(v) ? v.length : 0);

export function computeInsight(input: InsightInput): CounsellorInsight {
  const s = input.scores;
  const o = input.outcomes;
  const ob = input.onboarding;

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const missing: string[] = [];
  const suggestions: string[] = [];

  // ---------- Score-based reads ----------
  if (s) {
    const dims: Array<{ key: keyof NonNullable<InsightInput["scores"]>; label: string }> = [
      { key: "academics_score", label: "Academics" },
      { key: "activities_score", label: "Activities" },
      { key: "leadership_score", label: "Leadership" },
      { key: "competitions_score", label: "Competitions" },
      { key: "test_prep_score", label: "Test prep" },
    ];

    for (const d of dims) {
      const v = s[d.key];
      if (v >= 70) strengths.push(`${d.label} is strong (${v}/100).`);
      else if (v < 30) weaknesses.push(`${d.label} is underdeveloped (${v}/100).`);
    }
  } else {
    missing.push("No journey data yet — student hasn't started the roadmap.");
    suggestions.push("Ask the student to complete onboarding and start the Journey roadmap.");
  }

  // ---------- Outcomes coverage ----------
  const courses = len(o?.courses);
  const projects = len(o?.projects);
  const roles = len(o?.leadership_roles);
  const comps = len(o?.competitions);

  if (projects === 0) {
    missing.push("No projects logged.");
    suggestions.push("Plan a 4–6 week subject-aligned project to anchor the application narrative.");
  } else if (projects >= 3) {
    strengths.push(`${projects} projects logged.`);
  }

  if (roles === 0) {
    missing.push("No leadership roles.");
    suggestions.push("Identify one club or initiative where the student can take ownership this term.");
  } else if (roles >= 2) {
    strengths.push(`${roles} leadership roles.`);
  }

  if (comps === 0) {
    missing.push("No competitions entered.");
    suggestions.push("Shortlist 1–2 competitions aligned with the intended major.");
  } else if (comps >= 2) {
    strengths.push(`${comps} competitions entered.`);
  }

  if (courses === 0 && (s?.academics_score ?? 0) < 50) {
    missing.push("No advanced courses tracked.");
  }

  // ---------- Onboarding coverage ----------
  const grade = ob?.grade ? Number(ob.grade) : NaN;
  if (Number.isFinite(grade) && grade >= 11 && !ob?.standardized_test_score) {
    weaknesses.push("No standardized test score on file.");
    suggestions.push("Set a target SAT/ACT/equivalent date and a 6-week prep plan.");
  }

  if (!ob?.target_universities || ob.target_universities.length === 0) {
    missing.push("No target universities set.");
    suggestions.push("Build a balanced target list (reach / match / safety) within 2 weeks.");
  }

  // ---------- Profile score (weighted) ----------
  // 60% journey overall + 10% per signal present (projects/roles/comps/targets) capped.
  const journeyPart = (s?.overall_score ?? 0) * 0.6;
  const signals =
    (projects > 0 ? 1 : 0) +
    (roles > 0 ? 1 : 0) +
    (comps > 0 ? 1 : 0) +
    ((ob?.target_universities?.length ?? 0) > 0 ? 1 : 0);
  const signalPart = (signals / 4) * 40;
  const profileScore = Math.round(Math.max(0, Math.min(100, journeyPart + signalPart)));

  // ---------- Priority ----------
  const negatives = weaknesses.length + missing.length;
  let priority: Priority = "on_track";
  if (profileScore < 35 || negatives >= 5) priority = "high_priority";
  else if (profileScore < 65 || negatives >= 3) priority = "needs_attention";

  const riskLevel: CounsellorInsight["riskLevel"] =
    priority === "high_priority" ? "high" : priority === "needs_attention" ? "medium" : "low";

  return {
    profileScore,
    priority,
    riskLevel,
    strengths: Array.from(new Set(strengths)),
    weaknesses: Array.from(new Set(weaknesses)),
    missing: Array.from(new Set(missing)),
    suggestions: Array.from(new Set(suggestions)),
  };
}

export function priorityLabel(p: Priority): string {
  if (p === "high_priority") return "High priority";
  if (p === "needs_attention") return "Needs attention";
  return "On track";
}
