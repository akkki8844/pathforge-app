/**
 * Reading a person's name the way a person reads it.
 *
 * The recommender list used `name.slice(0, 2).toUpperCase()` for its avatar
 * monogram, which takes the first two *characters* of the string. Every
 * recommender a student actually enters carries an honorific, so the whole
 * column read DR, MR, MS, RE: five identical-looking avatars that told you
 * nothing about who the row was.
 */

/**
 * Honorifics to skip when picking initials. Matched case-insensitively with
 * any trailing full stop removed, so "Dr", "Dr.", "DR" all match.
 *
 * Deliberately not a general title list: it holds the forms a student types in
 * front of a teacher's or professor's name, and nothing else. A surname that
 * happens to collide (there are people named Ms) still yields sensible
 * initials, because a name is only skipped when something follows it.
 */
const HONORIFICS = new Set([
  "mr",
  "mrs",
  "ms",
  "miss",
  "mx",
  "dr",
  "prof",
  "professor",
  "sir",
  "dame",
  "rev",
  "fr",
  "sr",
  "coach",
  "capt",
  "captain",
  "lt",
  "sgt",
]);

/** The name with any leading honorific removed. Empty in, empty out. */
export function withoutHonorific(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  // Only strip while something is left to name the person: "Dr" on its own
  // stays "Dr" rather than collapsing to nothing.
  while (parts.length > 1 && HONORIFICS.has(parts[0].replace(/\.$/, "").toLowerCase())) {
    parts.shift();
  }
  return parts.join(" ");
}

/**
 * One or two letters for an avatar monogram: first letter of the first name,
 * first letter of the last, honorific skipped. "Dr Amara Osei" gives AO, not
 * DR. A single-word name gives its first letter only, because "AM" for "Amara"
 * reads as a surname that is not there.
 */
export function personInitials(name: string): string {
  const parts = withoutHonorific(name)
    .split(/\s+/)
    // Skip particles and initials-with-dots so "van der Berg" gives VB and
    // "J. R. Hartley" gives JH rather than JR.
    .filter((w) => /^\p{L}/u.test(w) && !/^\p{L}\.$/u.test(w));
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
