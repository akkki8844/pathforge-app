import type { Recommender } from "@/hooks/useRecommenders";

/**
 * How ready a student's letters are.
 *
 * The model, with no renderer attached. It used to live beside a 64px SVG
 * progress ring that showed its score in the page header and hid its five
 * signals behind a popover, so the page spent the model on decoration. The
 * ring is gone; `LetterStanding` renders the parts a student can act on.
 */

interface Signal {
  label: string;
  earned: number;
  max: number;
  hint?: string;
}

export interface Readiness {
  score: number;
  band: "Not started" | "Building" | "Ready" | "Strong";
  signals: Signal[];
  missingRoles: string[];
}

const STEM_HINTS = ["math", "calc", "physics", "chem", "bio", "cs", "computer", "engineer", "stat", "science"];
const HUM_HINTS = ["english", "history", "lit", "writ", "social", "civic", "philosoph", "language", "spanish", "french"];

function classify(r: Recommender): "stem" | "humanities" | "counselor" | "other" {
  const subj = (r.subject ?? "").toLowerCase();
  const pos = (r.position ?? "").toLowerCase();
  if (/counsel/.test(pos)) return "counselor";
  if (STEM_HINTS.some((k) => subj.includes(k) || pos.includes(k))) return "stem";
  if (HUM_HINTS.some((k) => subj.includes(k) || pos.includes(k))) return "humanities";
  return "other";
}

export function computeReadiness(items: Recommender[]): Readiness {
  const n = items.length;

  // Roster size — up to 3 recommenders is typical
  const rosterEarned = Math.min(n, 3);
  const rosterMax = 3;

  // Subject coverage: STEM + Humanities + Counselor
  const roles = new Set(items.map(classify));
  const coverageRoles = ["stem", "humanities", "counselor"] as const;
  const coverageEarned = coverageRoles.filter((r) => roles.has(r)).length;
  const coverageMax = coverageRoles.length;

  // Progress: status-weighted
  const statusWeight: Record<string, number> = {
    not_requested: 0,
    requested: 0.4,
    accepted: 0.6,
    drafting: 0.8,
    submitted: 1,
  };
  const progressEarned = n === 0 ? 0 : items.reduce((s, r) => s + (statusWeight[r.status] ?? 0), 0);
  const progressMax = Math.max(n, 1);

  // Materials: brag-sheet linkage + packet generated
  const withBrag = items.filter((r) => r.brag_sheet_id).length;
  const withPacket = items.filter((r) => r.last_packet_artifact_id).length;
  const materialsEarned = Math.min(withBrag, n) + Math.min(withPacket, n);
  const materialsMax = Math.max(n, 1) * 2;

  // Deadlines: of those with a due date, share that aren't overdue + unsubmitted
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const withDue = items.filter((r) => r.due_date);
  let deadlineEarned = 0;
  let deadlineMax = 0;
  if (withDue.length > 0) {
    deadlineMax = withDue.length;
    deadlineEarned = withDue.filter((r) => {
      if (r.submitted_at) return true;
      const due = new Date(r.due_date!);
      return due.getTime() >= today.getTime();
    }).length;
  }

  const signals: Signal[] = [
    { label: "Roster size", earned: rosterEarned, max: rosterMax, hint: "Aim for 2-3 recommenders." },
    { label: "Subject coverage", earned: coverageEarned, max: coverageMax, hint: "STEM, humanities, and a counselor." },
    { label: "Request progress", earned: Math.round(progressEarned * 10) / 10, max: progressMax, hint: "Move each one from requested to submitted." },
    { label: "Materials prepared", earned: materialsEarned, max: materialsMax, hint: "Link a brag sheet and generate a packet." },
    ...(deadlineMax > 0
      ? [{ label: "Deadlines on track", earned: deadlineEarned, max: deadlineMax, hint: "No overdue, unsubmitted letters." }]
      : []),
  ];

  // Weighted score
  const weights = [0.2, 0.25, 0.25, 0.2, 0.1];
  let total = 0;
  let weightSum = 0;
  signals.forEach((s, i) => {
    const w = weights[i] ?? 0.1;
    if (s.max > 0) {
      total += (s.earned / s.max) * w;
      weightSum += w;
    }
  });
  const score = weightSum === 0 ? 0 : Math.round((total / weightSum) * 100);

  const band: Readiness["band"] =
    n === 0 ? "Not started" : score >= 80 ? "Strong" : score >= 55 ? "Ready" : "Building";

  const missingRoles: string[] = [];
  if (!roles.has("stem")) missingRoles.push("STEM teacher");
  if (!roles.has("humanities")) missingRoles.push("Humanities teacher");
  if (!roles.has("counselor")) missingRoles.push("Counselor");

  return { score, band, signals, missingRoles };
}
