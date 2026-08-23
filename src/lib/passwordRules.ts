import type { PasswordRule } from "@/components/ui/password-strength";

/**
 * What Pathforge asks of a password, in one place.
 *
 * Sign-up and password reset both show the meter, and a student who sets a
 * password on one screen and is told something different on the other has been
 * given no advice at all.
 *
 * These are RECOMMENDATIONS. What is enforced is six characters — the floor the
 * zod schema on each page checks, and the floor Supabase is configured with.
 * The gap is deliberate: a hard 12-character requirement with four character
 * classes pushes people towards `Password123!`, which satisfies every rule and
 * is in every wordlist. The meter's job is to make a longer password look
 * better than a fussier one, which is what the guessable-pattern check enforces
 * and what the length rule leads with.
 */
export const PATHFORGE_PASSWORD_RULES: readonly PasswordRule[] = [
  { id: "length", label: "12 characters or more", test: (v) => v.length >= 12 },
  {
    id: "case",
    label: "Upper and lower case",
    test: (v) => /[a-z]/.test(v) && /[A-Z]/.test(v),
  },
  { id: "digit", label: "A number", test: (v) => /\d/.test(v) },
  { id: "symbol", label: "A symbol", test: (v) => /[!-/:-@[-`{-~]/.test(v) },
];

/** The enforced floor, stated wherever the meter is not shown. */
export const PASSWORD_MINIMUM = 6;
