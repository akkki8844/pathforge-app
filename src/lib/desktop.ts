/**
 * The renderer's side of the Electron bridge.
 *
 * Everything here degrades to a no-op in a normal browser, because this is the
 * same bundle the web app ships — `window.pathforgeDesktop` only exists when
 * `electron/preload.cjs` put it there.
 */

export interface DesktopAuthPayload {
  accessToken: string;
  refreshToken: string;
  state: string | null;
}

export interface DesktopUpdateStatus {
  status: "available" | "not-available" | "downloading" | "downloaded" | "error";
  version?: string;
  percent?: number;
  message?: string;
}

interface DesktopBridge {
  isDesktop: true;
  platform: string;
  version: string;
  openSignIn: (state: string) => Promise<void>;
  openDownloads: () => Promise<void>;
  onAuthCallback: (handler: (payload: DesktopAuthPayload) => void) => () => void;
  onUpdateStatus: (handler: (payload: DesktopUpdateStatus) => void) => () => void;
  installUpdate: () => Promise<void>;
}

declare global {
  interface Window {
    pathforgeDesktop?: DesktopBridge;
  }
}

export function desktop(): DesktopBridge | null {
  return typeof window !== "undefined" && window.pathforgeDesktop?.isDesktop
    ? window.pathforgeDesktop
    : null;
}

export const isDesktop = () => desktop() !== null;

const STATE_KEY = "pathforge-desktop-auth-state";

/**
 * A fresh single-use value tying one Continue click to one deep link back.
 *
 * Any process on the machine can invoke `pathforge://auth?...`, so the app
 * must not accept a session just because a link arrived. It accepts one only
 * while it is itself waiting for a sign-in, and only if the link echoes the
 * value this app generated for that attempt.
 */
export function beginDesktopSignIn(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const state = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  sessionStorage.setItem(STATE_KEY, state);
  return state;
}

/** True only if this deep link answers the sign-in attempt we are waiting on. */
export function consumeDesktopSignInState(state: string | null): boolean {
  const expected = sessionStorage.getItem(STATE_KEY);
  sessionStorage.removeItem(STATE_KEY);
  return Boolean(expected) && expected === state;
}
