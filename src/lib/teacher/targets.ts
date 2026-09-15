import type { RosterStudent } from "@/hooks/useTeacherRoster";

/**
 * The cohort's target universities, counted.
 *
 * Lives here rather than next to the card that draws it so the roster and the
 * aggregate read one implementation of "what is this student aiming at" — two
 * would eventually disagree, and the disagreement would be invisible.
 */

export interface TargetTally {
  name: string;
  count: number;
  students: Array<{ id: string; name: string }>;
}

function displayName(s: { full_name: string | null; email: string | null }): string {
  return s.full_name || s.email || "Student";
}

/**
 * Counts every university named across the roster's target lists, most-named
 * first. Case-insensitive on the key, but the first spelling seen is the one
 * shown — these are free-text entries and "MIT" should not become "mit".
 */
export function tallyTargets(students: RosterStudent[]): TargetTally[] {
  const byKey = new Map<string, TargetTally>();
  for (const s of students) {
    for (const raw of s.target_universities ?? []) {
      const name = (raw ?? "").trim();
      if (!name) continue;
      const key = name.toLowerCase();
      const entry = byKey.get(key);
      if (entry) {
        entry.count += 1;
        entry.students.push({ id: s.user_id, name: displayName(s) });
      } else {
        byKey.set(key, {
          name,
          count: 1,
          students: [{ id: s.user_id, name: displayName(s) }],
        });
      }
    }
  }
  return [...byKey.values()].sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name),
  );
}
