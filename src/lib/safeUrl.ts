/**
 * Make a URL safe to put in an `href`.
 *
 * Several places in this app render links whose address did not come from us:
 * professor profiles found by the `find-professors` function, results from live
 * web search, and the task/guide links inside an AI-generated journey. Those
 * strings reach the DOM as `<a href={...}>`, and React does not sanitise href —
 * `javascript:fetch('/api',{...})` in one of them runs with the signed-in
 * student's session the moment they click it.
 *
 * The likelihood is low (it needs a model to emit one, or an upstream page to
 * be crafted), but the cost of the check is a function call and the cost of
 * being wrong is session-level. So: http and https only, everything else
 * becomes null and the caller renders plain text instead of a link.
 *
 * Note this is not a safe-*destination* check. It cannot tell you the page on
 * the other side is trustworthy — only that following it will navigate rather
 * than execute.
 */

const SAFE_PROTOCOLS = new Set(["http:", "https:"]);

export function safeExternalUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // A bare "example.com/page" is what half of any scraped dataset looks like,
  // and it is unambiguous enough to fix rather than drop.
  const candidate = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(candidate);
    return SAFE_PROTOCOLS.has(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

/** True when the string is a link we are willing to render. */
export function isSafeExternalUrl(raw: string | null | undefined): boolean {
  return safeExternalUrl(raw) !== null;
}
