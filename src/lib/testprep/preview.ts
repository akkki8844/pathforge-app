/**
 * Test Prep is not released yet.
 *
 * Until it is, the whole section is behind a preview flag: every
 * `/test-prep` route redirects to the dashboard and every entry point (navbar,
 * product tour, calendar) is hidden. The flag is on automatically in local
 * development, and a browser opts in by visiting any test-prep URL with
 * `?preview=<PREVIEW_UNLOCK>` once; `?preview=off` opts back out.
 *
 * This is a soft launch gate, not access control: the question data ships in
 * the bundle either way. It exists so students do not find a half-announced
 * section, not to keep a secret.
 *
 * To release: make `testPrepEnabled` return true.
 */

const STORAGE_KEY = "pf.preview.testprep";
export const PREVIEW_UNLOCK = "pf-sat-9k2q";

let cached: boolean | null = null;

export function testPrepEnabled(): boolean {
  if (import.meta.env.DEV) return true;
  if (typeof window === "undefined") return false;
  try {
    const q = new URLSearchParams(window.location.search).get("preview");
    if (q === PREVIEW_UNLOCK) {
      window.localStorage.setItem(STORAGE_KEY, "1");
      cached = true;
    } else if (q === "off") {
      window.localStorage.removeItem(STORAGE_KEY);
      cached = false;
    }
    if (cached === null) cached = window.localStorage.getItem(STORAGE_KEY) === "1";
    return cached;
  } catch {
    return false;
  }
}
