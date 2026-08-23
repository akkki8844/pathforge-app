import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/* -------------------------------------------------------------------------- *
 * Unsaved-changes guard for a plain <BrowserRouter>
 * -------------------------------------------------------------------------- *
 * The app mounts `<BrowserRouter>` in src/App.tsx, not `createBrowserRouter`,
 * so there is no data router and react-router's `useBlocker` throws. Migrating
 * the whole app to a data router to get one dialog is not a trade worth making,
 * so this hook covers the three ways a user can actually leave a page, using
 * only DOM primitives:
 *
 *   1. Tab close / reload / typing a new URL  -> `beforeunload`. This is the
 *      only mechanism that can catch a real document unload, and the browser
 *      renders its own prompt (we cannot style it — no API exists).
 *   2. Clicking an in-app link                -> a capture-phase `click`
 *      listener on `document`. Every navigation element in this app is a
 *      react-router `<Link>`, which renders a real `<a href>`, so one listener
 *      catches all of them without touching Navbar/Footer/sidebar at all.
 *      Capture-phase on `document` runs before React's root-container listener,
 *      so `stopPropagation()` reliably cancels `<Link>`'s own onClick.
 *   3. Browser Back                           -> a `popstate` listener paired
 *      with a sentinel history entry. See `pushSentinel` for the mechanics.
 *
 * Everything here is inert unless `when` is true, so a page that is not dirty
 * behaves exactly as it did before this hook existed.
 * -------------------------------------------------------------------------- */

/** What the user tried to do when we stopped them. */
export type BlockedNavigation =
  /** A same-origin in-app link click; `to` is the router path we suppressed. */
  | { kind: "link"; to: string }
  /** The browser Back button. */
  | { kind: "back" };

export interface UnsavedChangesGuardOptions {
  /** Arm the guard. Pass the page's existing dirty flag — do not invent a second one. */
  when: boolean;
  /**
   * Commit the pending changes. Resolve `true` when everything committed and it
   * is safe to leave, `false` to abort the navigation and keep the user here.
   */
  onSave: () => Promise<boolean>;
  /** Throw the pending changes away. Called just before leaving. */
  onDiscard: () => void;
}

export interface UnsavedChangesGuard {
  /** Non-null while a navigation is being held. Drive the dialog off this. */
  blocked: BlockedNavigation | null;
  /** Cancel the navigation and stay put. */
  stay: () => void;
  /** Drop the edits and continue to where the user was headed. */
  discardAndLeave: () => void;
  /** Save first; only leave if the save actually committed. */
  saveAndLeave: () => Promise<void>;
}

export function useUnsavedChangesGuard({
  when,
  onSave,
  onDiscard,
}: UnsavedChangesGuardOptions): UnsavedChangesGuard {
  const navigate = useNavigate();
  const location = useLocation();
  const [blocked, setBlocked] = useState<BlockedNavigation | null>(null);

  // The router-visible URL as of the last committed render. `popstate` fires
  // *after* window.location has already moved, and react-router's own update is
  // a transition that has not rendered yet, so this ref is the only reliable
  // record of where the user actually was when they pressed Back.
  const lastHrefRef = useRef("");
  lastHrefRef.current = location.pathname + location.search + location.hash;

  // Latest values, read from listeners that are registered once.
  const whenRef = useRef(when);
  whenRef.current = when;
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;
  const onDiscardRef = useRef(onDiscard);
  onDiscardRef.current = onDiscard;

  /** A sentinel entry of ours is currently the top of the history stack. */
  const armedRef = useRef(false);
  /** Previous value of `when`, so we act on the edge rather than every render. */
  const wasArmedRef = useRef(false);
  /** The next `popstate` was caused by us; swallow it instead of re-trapping. */
  const selfPopRef = useRef(false);
  /** The user confirmed leaving, so the disarm path must not touch history. */
  const leavingRef = useRef(false);

  /* -------------------------------------------------- 1. document unload -- */
  // Registered only while dirty. A permanently-registered handler would make
  // every reload of this page prompt, which is its own bug.
  useEffect(() => {
    if (!when) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Chrome still requires returnValue to be set. The string is ignored —
      // browsers have shown their own fixed wording for a decade.
      e.returnValue = "";
      return "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [when]);

  /* ------------------------------------------------------ 2. link clicks -- */
  useEffect(() => {
    if (!when) return;

    const onClickCapture = (e: MouseEvent) => {
      // Anything the user meant as "open elsewhere" is left alone: modified
      // clicks, middle/right clicks, and clicks something else already handled.
      if (e.defaultPrevented) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const anchor = (e.target as HTMLElement | null)?.closest?.("a[href]") as
        | HTMLAnchorElement
        | null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href") ?? "";
      // In-page anchors never navigate.
      if (href.startsWith("#")) return;

      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }

      // Other origins and other protocols (mailto:, tel:) unload the document,
      // which `beforeunload` already prompts for — don't double-prompt.
      if (url.origin !== window.location.origin) return;
      // Same path (e.g. a `?section=` deep link into this very page) is not
      // leaving, and the draft store survives it.
      if (url.pathname === window.location.pathname) return;

      e.preventDefault();
      e.stopPropagation();
      setBlocked({ kind: "link", to: url.pathname + url.search + url.hash });
    };

    document.addEventListener("click", onClickCapture, true);
    return () => document.removeEventListener("click", onClickCapture, true);
  }, [when]);

  /* --------------------------------------------------- 3. the Back button -- */

  /**
   * Push a duplicate of the current entry so Back has something harmless to
   * land on.
   *
   * The state object is a *clone of react-router's own* `history.state`
   * (`{ usr, key, idx }`). That detail is the whole ballgame: react-router
   * tracks its position in `state.idx`, and if we pushed a foreign or empty
   * state, the next `popstate` would read `idx === undefined`, react-router's
   * internal index would become null, and every later push would compute
   * `NaN` — the corrupted-history failure this technique is notorious for.
   * Cloning keeps `idx` identical to the entry underneath, so when the sentinel
   * is consumed react-router sees delta 0 and the unsaved draft in React state
   * is untouched, because nothing unmounted.
   */
  const pushSentinel = useCallback(() => {
    window.history.pushState(window.history.state, "", window.location.href);
    armedRef.current = true;
  }, []);

  /** Set while a pop we caused is in flight; see `restoreLocation`. */
  const restoreHrefRef = useRef<string | null>(null);

  /** Retire the sentinel. Same path underneath, so this is visually a no-op. */
  const popSentinel = useCallback(() => {
    if (!armedRef.current) return;
    armedRef.current = false;
    selfPopRef.current = true;
    restoreHrefRef.current = lastHrefRef.current;
    window.history.go(-1);
  }, []);

  /**
   * Put the URL back where the user left it after the sentinel is consumed.
   *
   * The entry underneath the sentinel is frozen at the moment we armed, but
   * this page rewrites its own query string in place — settings writes
   * `?section=…` with `replace`, which lands on the sentinel, never on the
   * entry below it. So consuming the sentinel can drop the URL to an older
   * query string and snap the page to a different tab. react-router's own
   * popstate listener runs first (registered in BrowserRouter's layout effect)
   * and defers its update through `startTransition`, so this corrective
   * `replace` batches with it and the stale query string never renders.
   */
  const restoreLocation = useCallback(
    (href: string) => {
      const current = window.location.pathname + window.location.search + window.location.hash;
      if (href && href !== current) navigate(href, { replace: true });
    },
    [navigate],
  );

  // Registered for the lifetime of the page and gated on refs, so arming and
  // disarming never races with listener add/remove.
  useEffect(() => {
    const onPopState = () => {
      if (selfPopRef.current) {
        selfPopRef.current = false;
        const restore = restoreHrefRef.current;
        restoreHrefRef.current = null;
        if (restore) restoreLocation(restore);
        return;
      }
      if (!whenRef.current || !armedRef.current) return;

      // The Back press consumed our sentinel, so the browser is now sitting on
      // this page's own entry — same path, so the page did not unmount and the
      // draft is intact. Re-push immediately to restore the stack exactly as it
      // was, then ask. The net effect of a Back press while dirty is therefore
      // zero entries added or removed, no matter how many times it is pressed.
      const href = lastHrefRef.current;
      pushSentinel();
      setBlocked({ kind: "back" });
      restoreLocation(href);
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [pushSentinel, restoreLocation]);

  // Arm on the clean -> dirty edge, disarm on dirty -> clean.
  useEffect(() => {
    if (when && !wasArmedRef.current) {
      wasArmedRef.current = true;
      pushSentinel();
      return;
    }
    if (!when && wasArmedRef.current) {
      wasArmedRef.current = false;
      // An effect *body* only runs while mounted, so reaching this branch means
      // the page went clean (saved or discarded) with the user still on it.
      // Retire the duplicate entry, otherwise their next Back press would be
      // silently swallowed by it. When `leavingRef` is set we are mid-departure
      // and the navigation below already accounts for the sentinel.
      if (!leavingRef.current) popSentinel();
      leavingRef.current = false;
    }
  }, [when, pushSentinel, popSentinel]);

  /* ---------------------------------------------------------- resolution -- */

  /** Carry out the navigation we suppressed. Assumes the page is no longer dirty. */
  const performNavigation = useCallback(
    (target: BlockedNavigation) => {
      if (target.kind === "link") {
        // `replace` consumes the sentinel: the stack goes from
        // [… , thisPage, sentinel] to [… , thisPage, destination], which is
        // exactly the stack an unguarded click would have produced. Back from
        // the destination returns here, as it should.
        armedRef.current = false;
        navigate(target.to, { replace: true });
        return;
      }
      // Back. We are standing on the re-pushed sentinel, so the entry the user
      // actually asked for is two behind: -1 retires the sentinel, -2 is the
      // destination. `go(-2)` fires a single popstate, which we swallow.
      armedRef.current = false;
      selfPopRef.current = true;
      window.history.go(-2);
    },
    [navigate],
  );

  const stay = useCallback(() => setBlocked(null), []);

  const discardAndLeave = useCallback(() => {
    const target = blocked;
    if (!target) return;
    leavingRef.current = true;
    setBlocked(null);
    onDiscardRef.current();
    performNavigation(target);
  }, [blocked, performNavigation]);

  const saveAndLeave = useCallback(async () => {
    const target = blocked;
    if (!target) return;
    // Set before awaiting: the save clears the dirty flag, and the disarm
    // effect must already know we are leaving deliberately when it runs.
    leavingRef.current = true;
    const ok = await onSaveRef.current();
    if (!ok) {
      leavingRef.current = false;
      // Close and stay. The page's own save UI reports which parts failed and
      // why, and duplicating that inside the dialog would only hide it.
      setBlocked(null);
      return;
    }
    setBlocked(null);
    performNavigation(target);
  }, [blocked, performNavigation]);

  return { blocked, stay, discardAndLeave, saveAndLeave };
}
