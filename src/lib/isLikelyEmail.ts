/**
 * Is this string shaped like an email address?
 *
 * Deliberately not zod. The newsletter field sits in the landing page's footer,
 * which is part of the eager entry bundle, so `z.string().email()` put 56 kB of
 * schema library on the critical path of every first paint to decide whether
 * one input contained an `@`.
 *
 * This is not a validator in the strict sense and does not try to be — RFC 5322
 * is not expressible as a readable regex, and no client-side check can tell you
 * whether an address receives mail. The only honest answer to that question is
 * the confirmation email, which this form already sends. What a client check is
 * for is catching a typo before a round trip, and that is what this does.
 *
 * Pages that genuinely need schema validation (sign-up, contact, checkout) keep
 * using zod — they are lazily loaded, so it costs them nothing at boot.
 */

const SHAPE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

export function isLikelyEmail(value: string): boolean {
  const trimmed = value.trim();
  // 254 is the maximum length of an address that can be delivered (RFC 5321);
  // anything longer is either a mistake or an attempt at one.
  if (!trimmed || trimmed.length > 254) return false;
  return SHAPE.test(trimmed);
}
