/**
 * Telling our bugs apart from everyone else's.
 *
 * A Pathforge tab runs a lot of code Pathforge did not write. Wallet
 * extensions, password managers, grammar checkers and AI sidebars all inject
 * scripts into the page, and when they throw, the browser reports it against
 * our origin. `main.tsx` already swallowed that noise so a MetaMask failure
 * could not blank the React tree; this module is the same list, moved out so
 * the bug capture engine can reuse the one source of truth.
 *
 * Getting this wrong in either direction is costly. Report extension errors and
 * Admin -> Bugs fills with hundreds of "Cannot redefine property: ethereum"
 * rows that nobody can fix, and the real bugs are buried. Filter too broadly
 * and a genuine Pathforge failure is silently dropped. So every entry here is
 * either an extension URL scheme, a named injector, or an error string a
 * browser emits about its own plumbing -- never a generic word like "failed"
 * that our own code could plausibly produce.
 */

export const EXTENSION_NOISE_HINTS = [
  "chrome-extension://",
  "moz-extension://",
  "safari-extension://",
  "safari-web-extension://",
  "webkit-masked-url",
  "MetaMask",
  "ethereum",
  "Phantom",
  "solana",
  "Coinbase",
  "TronLink",
  "Brave",
  "Grammarly",
  "LanguageTool",
  "Honey",
  "LastPass",
  "1Password",
  "Bitwarden",
  "Dashlane",
  "AdBlock",
  "uBlock",
  "chatgpt",
  "Cannot redefine property: ethereum",
  "Cannot set property ethereum",
  "evmAsk",
  "inpage.js",
  "injected.js",
  // Extensions that wrap window.fetch rather than only injecting a script:
  // session recorders, request inspectors, API clients. When the wrapped fetch
  // throws, the stack names the extension's own bundle, which is the only way
  // to tell its failure apart from ours. Seen in production as
  // "webpack://jam-extension/injected-scripts/host-network-events-...".
  "-extension/",
  "injected-scripts",
  "contentScript",
  "content_script",
  "content-script",
  "Extension context invalidated",
  "message channel closed",
  "Receiving end does not exist",
  "RESET_BLANK_CHECK",
  "ResizeObserver loop",
  "ResizeObserver loop completed",
  "ResizeObserver loop limit exceeded",
  "Non-Error promise rejection captured",
  "The message port closed",
  "A listener indicated an asynchronous response",
];

/**
 * Errors that are ours, technically, but are not bugs.
 *
 * Route-level code splitting means a user with a tab open across a deploy will
 * fail to fetch a chunk that no longer exists. `lazyWithRetry` already handles
 * that by reloading. Reporting it would file a bug against every deploy.
 * Likewise an aborted request is usually a user navigating away mid-flight.
 */
const EXPECTED_HINTS = [
  "Failed to fetch dynamically imported module",
  "Importing a module script failed",
  "error loading dynamically imported module",
  "Load failed",
  "AbortError",
  "The operation was aborted",
  "signal is aborted without reason",
  "NetworkError when attempting to fetch resource",
  "cancelled",
];

/**
 * Graphics-stack failures. Environment, not code.
 *
 * WebGL2 is unavailable more often than it sounds — software-rendering
 * fallbacks, blocklisted drivers, privacy-hardened browsers, remote desktops
 * and older integrated GPUs all land here — and a browser will also drop the
 * oldest live context once a page holds too many. None of it is something a
 * Pathforge engineer can fix, and every surface that uses WebGL already
 * degrades to a non-WebGL fallback, so the user has already been handled by
 * the time one of these is logged.
 *
 * These were the single largest source of red banners in production: a
 * student on a machine without WebGL2 got one for the map constructor
 * throwing, then a second for the teardown of the map that never built.
 *
 * Matched case-insensitively, because the same condition is reported as both
 * "unable to create webgl context" and "Unable to create WebGL context"
 * depending on which layer noticed first.
 */
const GRAPHICS_HINTS = [
  "webgl",
  "webgl2",
  "context_lost_webgl",
  "webglcontextlost",
  "unable to create webgl context",
  "too many active webgl contexts",
  "gpu process",
  "swiftshader",
];

/**
 * A lapsed or absent session. The auth layer's job, not an engineer's.
 *
 * Supabase refreshes tokens in the background, and the window where a token
 * has expired but the new one has not arrived is a normal part of that: the
 * call fails once, the client re-authenticates, the next call succeeds. A
 * signed-out tab that still holds a stale refresh token produces the same
 * thing. Seen in production as "Invalid Refresh Token: Refresh Token Not
 * Found" (raised as a red banner, because a failed request to our own origin
 * counts as user-visible) and as `42501 permission denied for function
 * get_credits`, which is what an expired JWT looks like once PostgREST has
 * downgraded the caller to `anon`.
 *
 * Deliberately narrow: only the token-lifecycle strings. A genuine
 * authorization failure — an RLS policy refusing a row the user should not
 * touch — says something else and is still reported.
 */
const AUTH_SESSION_HINTS = [
  "invalid refresh token",
  "refresh_token_not_found",
  "refresh token not found",
  "auth session missing",
  "session_not_found",
  "jwt expired",
  "pgrst301",
];

const includesAnyCI = (text: unknown, hints: string[]): boolean => {
  if (!text) return false;
  const s = String(text).toLowerCase();
  return hints.some((h) => s.includes(h));
};

const includesAny = (text: unknown, hints: string[]): boolean => {
  if (!text) return false;
  const s = String(text);
  return hints.some((h) => s.includes(h));
};

/** True when the text came from a browser extension rather than from Pathforge. */
export const looksLikeExtension = (text: unknown): boolean =>
  includesAny(text, EXTENSION_NOISE_HINTS);

/** True when this is a known, handled, non-actionable failure. */
export const looksExpected = (text: unknown): boolean => includesAny(text, EXPECTED_HINTS);

/** True when the graphics stack, not Pathforge, is what failed. */
export const looksGraphics = (text: unknown): boolean => includesAnyCI(text, GRAPHICS_HINTS);

/** True when the session lapsed and the auth layer will handle it. */
export const looksAuthSession = (text: unknown): boolean =>
  includesAnyCI(text, AUTH_SESSION_HINTS);

/**
 * The one question the capture engine asks before filing anything: is this
 * worth an admin's attention?
 */
export function shouldIgnore(...parts: unknown[]): boolean {
  return parts.some(
    (p) => looksLikeExtension(p) || looksExpected(p) || looksGraphics(p) || looksAuthSession(p),
  );
}
