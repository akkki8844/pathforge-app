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

/**
 * The one question the capture engine asks before filing anything: is this
 * worth an admin's attention?
 */
export function shouldIgnore(...parts: unknown[]): boolean {
  return parts.some((p) => looksLikeExtension(p) || looksExpected(p));
}
