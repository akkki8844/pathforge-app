import type { PastAdmit } from "@/data/pastAdmits";
import { schoolOutcomes } from "@/data/pastAdmits";

/**
 * How close the signed-in student's profile is to a past admit's, 0–100.
 *
 * Deliberately transparent and cheap: five weighted signals, each of which the
 * student can see on their own profile. A dimension the student hasn't filled
 * in is dropped from the denominator rather than scored as zero — otherwise a
 * half-finished onboarding would make every profile look like a bad match.
 *
 * Returns null when there is nothing to compare against at all, which the UI
 * uses to hide the similarity pill entirely instead of showing a fake number.
 */

interface ViewerProfile {
  intended_major?: string | null;
  country?: string | null;
  target_universities?: string[] | null;
  gpa?: string | null;
  standardized_test_type?: string | null;
  standardized_test_score?: string | null;
}

function norm(s: string) {
  return s.toLowerCase().replace(/[^a-z ]/g, "").trim();
}

/** Loose field match — "Computer Science" should hit "Computer Engineering". */
function majorAffinity(a: string, b: string): number {
  const x = norm(a);
  const y = norm(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.includes(y) || y.includes(x)) return 0.85;
  const xw = new Set(x.split(" ").filter((w) => w.length > 3));
  const yw = new Set(y.split(" ").filter((w) => w.length > 3));
  let shared = 0;
  for (const w of xw) if (yw.has(w)) shared++;
  const denom = Math.max(xw.size, yw.size);
  return denom ? shared / denom : 0;
}

/** Parse a GPA that may be "3.9", "3.9/4.0", or a weighted percentage. */
function parseGpa(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const n = Number(raw.match(/\d+(\.\d+)?/)?.[0]);
  if (!Number.isFinite(n)) return null;
  // Percentage-style GPAs (India, some US weighted scales) → normalise to /4.
  if (n > 10) return Math.min(4, (n / 100) * 4);
  if (n > 5) return Math.min(4, (n / 10) * 4);
  return Math.min(4, n);
}

export function admitSimilarity(
  admit: PastAdmit,
  viewer: ViewerProfile | null | undefined,
): number | null {
  if (!viewer) return null;

  let score = 0;
  let weight = 0;

  if (viewer.intended_major) {
    score += majorAffinity(viewer.intended_major, admit.major) * 30;
    weight += 30;
  }

  if (viewer.country) {
    score += norm(viewer.country) === norm(admit.country) ? 12 : 0;
    weight += 12;
  }

  const targets = viewer.target_universities ?? [];
  if (targets.length > 0) {
    const theirs = schoolOutcomes(admit).map((s) => norm(s.name));
    const hits = targets.filter((t) => {
      const n = norm(t);
      return theirs.some((s) => s === n || s.includes(n) || n.includes(s));
    }).length;
    score += Math.min(1, hits / Math.min(targets.length, 5)) * 28;
    weight += 28;
  }

  const myGpa = parseGpa(viewer.gpa);
  const theirGpa = parseGpa(admit.gpa);
  if (myGpa !== null && theirGpa !== null) {
    // 0.5 GPA points apart → no credit; identical → full credit.
    score += Math.max(0, 1 - Math.abs(myGpa - theirGpa) / 0.5) * 15;
    weight += 15;
  }

  // Only compare like with like — an ACT score can't be diffed against an SAT.
  const testType = viewer.standardized_test_type?.toUpperCase() ?? "";
  const myScore = Number(viewer.standardized_test_score?.match(/\d+/)?.[0]);
  if (Number.isFinite(myScore)) {
    if (testType.includes("SAT") && admit.sat) {
      score += Math.max(0, 1 - Math.abs(myScore - admit.sat) / 300) * 15;
      weight += 15;
    } else if (testType.includes("ACT") && admit.act) {
      score += Math.max(0, 1 - Math.abs(myScore - admit.act) / 8) * 15;
      weight += 15;
    }
  }

  if (weight === 0) return null;
  return Math.round((score / weight) * 100);
}
