/**
 * Normalise a caller-supplied post-sign-in destination to an in-app path.
 *
 * The three sign-in surfaces each had their own copy of this, and each of them
 * only rejected a leading `//`. That misses `/\evil.com`: browsers and URL
 * parsers treat a backslash in the authority position as a slash, so `/\host`
 * resolves to `//host` — the same protocol-relative escape, spelled
 * differently. Today the value is handed to react-router's `navigate()`, which
 * would not leave the origin either way; this exists so that stays true if the
 * consumer is ever changed to `window.location.assign`.
 *
 * Anything that is not unambiguously a single-origin path becomes "/dashboard".
 */
export const DEFAULT_REDIRECT = "/dashboard";

export function safeRedirectPath(value?: string | null): string {
  if (!value) return DEFAULT_REDIRECT;

  // Control characters and whitespace are stripped by browsers before a URL is
  // parsed, so "/\tevil.com" and "/ /evil.com" have to be rejected here rather
  // than passed through and normalised into an authority later.
  for (let i = 0; i < value.length; i++) {
    if (value.charCodeAt(i) <= 0x20) return DEFAULT_REDIRECT;
  }

  const path = value.startsWith("/") ? value : `/${value}`;
  // Backslash is equivalent to a slash in the authority position.
  if (/^\/[/\\]/.test(path)) return DEFAULT_REDIRECT;
  return path;
}
