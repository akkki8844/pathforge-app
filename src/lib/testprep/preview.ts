/**
 * Test Prep's launch switch.
 *
 * The section used to sit behind a preview flag (a `?preview=` unlock stored
 * in localStorage) so students would not find a half-announced section. The
 * section is released, so the switch is simply on. Whether an individual
 * test is open is `available` in blueprints.ts, not this function.
 *
 * Kept as a function rather than inlined at its call sites so the section can
 * be gated again in one place if it ever needs to be.
 */
export function testPrepEnabled(): boolean {
  return true;
}
