/**
 * What we remember across an OAuth round trip.
 *
 * Signing in with Google or GitHub leaves the origin and comes back on a fresh
 * page load, so anything the app knew at the moment the button was pressed has
 * to survive in storage or not survive at all. Two things need to:
 *
 *  - where to land afterwards, and
 *  - *which door they came in through*.
 *
 * The second one is why this file exists rather than a bare string key. The
 * counsellor portal and the student portal render the same OAuth buttons, and
 * on the way back there is nothing in the session that says which one was
 * used — a Google identity is a Google identity. Without the marker, someone
 * whose email was never provisioned as a counsellor clicks "Continue with
 * Google" on the counsellor page, the provider creates them an account, the
 * new-user trigger gives them a profile, and they are silently a student on a
 * page that only ever offered to sign them *in*. Which is the bug this is
 * here to close.
 *
 * Storage notes: `localStorage` rather than `sessionStorage`, because some
 * providers return through a new tab, and every access is wrapped — Safari in
 * private mode throws on write rather than returning null, and a sign-in
 * button that throws is worse than one that forgets where you were going.
 */
import { safeRedirectPath, DEFAULT_REDIRECT } from "@/lib/safeRedirect";

const REDIRECT_KEY = "pathforge_pending_oauth_redirect";
const PORTAL_KEY = "pathforge_pending_oauth_portal";

/**
 * Which sign-in surface started the round trip.
 *
 * "counsellor" is the constrained one: that portal has no sign-up of any kind,
 * so an identity arriving through it that is not already provisioned must be
 * turned away rather than enrolled.
 */
export type OAuthPortal = "student" | "counsellor";

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* private mode, or storage disabled — the flow still works, it just forgets */
  }
}

function drop(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* as above */
  }
}

/** Called immediately before handing the browser to the provider. */
export function rememberPendingOAuth(redirectTo: string | undefined, portal: OAuthPortal): void {
  write(REDIRECT_KEY, safeRedirectPath(redirectTo));
  write(PORTAL_KEY, portal);
}

/** Called if the provider handoff fails and the browser never leaves. */
export function forgetPendingOAuth(): void {
  drop(REDIRECT_KEY);
  drop(PORTAL_KEY);
}

/**
 * Read the portal WITHOUT consuming it.
 *
 * The guard that enforces the counsellor rule and the bridge that performs the
 * redirect are two different components, and whichever runs first must not
 * blind the other. So the portal is only cleared once one of them has actually
 * finished handling the return — see `consumePendingOAuth`.
 */
export function peekPendingOAuthPortal(): OAuthPortal | null {
  const value = read(PORTAL_KEY);
  return value === "counsellor" || value === "student" ? value : null;
}

/** True when an OAuth round trip is still waiting to be handled. */
export function hasPendingOAuth(): boolean {
  return read(REDIRECT_KEY) !== null || read(PORTAL_KEY) !== null;
}

/**
 * Take the whole pending state and clear it.
 *
 * Returns `null` for the redirect when there was nothing pending, so callers
 * can tell "this page load is the end of an OAuth round trip" from "this page
 * load is somebody opening the app normally" — the difference matters, because
 * the counsellor guard must only fire on the former.
 */
export function consumePendingOAuth(): { redirect: string | null; portal: OAuthPortal } {
  const raw = read(REDIRECT_KEY);
  const portal = peekPendingOAuthPortal() ?? "student";
  forgetPendingOAuth();
  return {
    redirect: raw === null ? null : safeRedirectPath(raw) || DEFAULT_REDIRECT,
    portal,
  };
}
