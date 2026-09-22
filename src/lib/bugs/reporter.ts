/**
 * The bug capture engine.
 *
 * Everything that goes wrong in a Pathforge tab ends up here and then in
 * `bug_reports`: a render that throws, a promise nobody caught, an edge
 * function that 500s, a REST call that fails, a `console.error` from our own
 * code, and anything a user chooses to report by hand.
 *
 * Three ideas do the work.
 *
 * **Breadcrumbs.** A stack trace tells you where a failure surfaced, not what
 * the person was doing. A ring buffer of the last 25 events -- route changes,
 * button clicks by their visible label, failed requests -- is what turns
 * "TypeError: cannot read properties of undefined" into something reproducible.
 *
 * **Fingerprints.** The same bug fires over and over, and ids, timestamps and
 * row counts inside a message make every firing look unique. Normalising those
 * out before hashing is what lets the admin list show twelve distinct broken
 * things instead of nine thousand rows.
 *
 * **Restraint.** Capture is only useful if the result is readable, so this
 * module drops browser-extension noise and known-handled failures (see
 * `./noise`), throttles repeats of a fingerprint, and caps how much one page
 * session can ever send. A capture engine that floods its own table has made
 * the problem worse.
 *
 * Nothing here is allowed to throw. A failure in the bug reporter that broke
 * the page would be the single worst bug this system could have.
 */

import { supabase } from "@/integrations/supabase/client";
import { shouldIgnore } from "./noise";
import type { Breadcrumb, BugReportPayload, BugSeverity, BugSource } from "./types";

declare const __APP_BUILD__: string;

const MAX_BREADCRUMBS = 25;
/** Minimum gap between two sends of the same fingerprint, in ms. */
const REPEAT_THROTTLE_MS = 15_000;
/** Hard ceiling on sends per page session, however many things break. */
const MAX_SENDS_PER_SESSION = 40;

const breadcrumbs: Breadcrumb[] = [];
const lastSentAt = new Map<string, number>();
let sendCount = 0;
let installed = false;
const pageLoadedAt = Date.now();

/** True while a report is in flight, so reporting cannot recurse into itself. */
let reporting = false;

/**
 * Whether a captured failure is written to `bug_reports` at all.
 *
 * `bug_reports` is the production admin's list of what is broken for real
 * users. A dev server does not belong in it: half the "Failed to fetch" rows in
 * that table turned out to be somebody's `vite` being stopped mid-request, and
 * a row that says `http://localhost:5199` costs an admin the same attention as
 * a row that says pathforge.co.in while meaning nothing.
 *
 * Capture itself stays on locally -- the red banner still appears and the
 * console still has everything -- because that is the feedback a developer
 * wants. Only the write to the shared table is skipped.
 */
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "0.0.0.0"]);
const filingEnabled = (): boolean =>
  typeof window === "undefined" ? false : !LOCAL_HOSTS.has(window.location.hostname);

export function addBreadcrumb(kind: Breadcrumb["kind"], label: string, detail?: string) {
  breadcrumbs.push({
    t: Date.now() - pageLoadedAt,
    kind,
    label: label.slice(0, 160),
    detail: detail ? detail.slice(0, 300) : undefined,
  });
  if (breadcrumbs.length > MAX_BREADCRUMBS) breadcrumbs.splice(0, breadcrumbs.length - MAX_BREADCRUMBS);
}

/** A copy of the current trail, oldest first. */
export const getBreadcrumbs = (): Breadcrumb[] => breadcrumbs.slice();

/**
 * Errors seen this page session, newest first — what the Report a bug dialog
 * offers to attach so a user does not have to describe a stack trace.
 */
const recentErrors: { at: number; source: BugSource; message: string }[] = [];
export const getRecentErrors = () => recentErrors.slice(0, 5);

/** What a subscriber is told about a failure the moment it is captured. */
export interface CapturedBug {
  id: string | null;
  source: BugSource;
  severity: BugSeverity;
  title: string;
  message: string;
}

/**
 * Sources that mean something visibly broke for the person at the keyboard.
 *
 * `console_error` is deliberately absent: our own code logs plenty that a user
 * never notices, and a red banner for each would train people to ignore red
 * banners. It earns its way in through {@link userWasInvolved} instead.
 */
const LOUD_SOURCES: BugSource[] = [
  "react_error",
  "window_error",
  "unhandled_rejection",
  "edge_function",
  "network",
];

/** How recently a click still counts as "the user did this". */
const CLICK_WINDOW_MS = 6000;

/**
 * Did the person actually just do something that failed?
 *
 * This is what separates "the Generate button does nothing" from a background
 * log line. A `console_error` within a few seconds of a click is almost always
 * a handler that swallowed its failure — exactly the case worth surfacing —
 * while the same log with no click behind it is housekeeping.
 */
function userWasInvolved(): boolean {
  const lastClick = [...breadcrumbs].reverse().find((b) => b.kind === "click");
  if (!lastClick) return false;
  return Date.now() - pageLoadedAt - lastClick.t < CLICK_WINDOW_MS;
}

const listeners = new Set<(bug: CapturedBug) => void>();

/**
 * Be told when a failure is captured, so the UI can offer to report it.
 *
 * Only failures the user plausibly noticed are announced — see
 * {@link LOUD_SOURCES} and {@link userWasInvolved}. Everything else is still
 * filed; it just does not interrupt anyone.
 */
export function onBugCaptured(listener: (bug: CapturedBug) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function announce(bug: CapturedBug) {
  const loud = LOUD_SOURCES.includes(bug.source) || (bug.source === "console_error" && userWasInvolved());
  if (!loud) return;
  listeners.forEach((l) => {
    try {
      l(bug);
    } catch {
      // A subscriber throwing must not break capture, and must not be captured
      // itself — that is how a banner about an error becomes an error loop.
    }
  });
}

/**
 * Strip the parts of a message that differ between two firings of the same bug:
 * uuids, hex blobs, numbers, quoted values, urls. Without this, `user 9f2c...
 * not found` and `user 41ab... not found` are two bugs.
 */
function normalise(message: string): string {
  return message
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "<uuid>")
    .replace(/\b[0-9a-f]{16,}\b/gi, "<hash>")
    .replace(/https?:\/\/[^\s"')]+/gi, "<url>")
    .replace(/\b\d+\b/g, "<n>")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

/** djb2. Not cryptographic — it only has to be stable and cheap. */
function hash(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = ((h << 5) + h + input.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

function fingerprintFor(source: BugSource, message: string, route: string | null): string {
  return `${source}:${hash(`${source}|${normalise(message)}|${route ?? ""}`)}`;
}

const currentRoute = (): string | null =>
  typeof window === "undefined" ? null : window.location.pathname + window.location.search;

const viewport = (): string | null =>
  typeof window === "undefined" ? null : `${window.innerWidth}x${window.innerHeight}`;

/**
 * Send one report. Never throws, never returns a rejected promise, and never
 * surfaces anything to the user: a failure to file a bug must not become a bug.
 */
export async function reportBug(payload: BugReportPayload): Promise<string | null> {
  if (typeof window === "undefined") return null;
  if (reporting) return null;

  try {
    const route = payload.route ?? currentRoute();
    const fingerprint =
      payload.fingerprint ??
      (payload.source === "user_report"
        ? // A human report is never merged into another: two people describing
          // the same symptom in their own words are two things to read.
          `user:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 10)}`
        : fingerprintFor(payload.source, payload.error_message || payload.title, route));

    const now = Date.now();
    const last = lastSentAt.get(fingerprint);
    if (last !== undefined && now - last < REPEAT_THROTTLE_MS) return null;
    if (sendCount >= MAX_SENDS_PER_SESSION) return null;
    lastSentAt.set(fingerprint, now);
    sendCount += 1;

    if (payload.source !== "user_report") {
      recentErrors.unshift({
        at: now,
        source: payload.source,
        message: payload.error_message || payload.title,
      });
      recentErrors.splice(5);
    }

    if (!filingEnabled()) {
      if (payload.source !== "user_report") {
        announce({
          id: null,
          source: payload.source,
          severity: payload.severity ?? "medium",
          title: payload.title,
          message: payload.error_message || payload.title,
        });
      }
      return null;
    }

    reporting = true;
    const { data, error } = await supabase.rpc("report_bug" as never, {
      _payload: {
        ...payload,
        fingerprint,
        route,
        user_agent: navigator.userAgent,
        viewport: viewport(),
        app_version: typeof __APP_BUILD__ === "string" ? __APP_BUILD__ : "unknown",
        breadcrumbs: payload.breadcrumbs ?? getBreadcrumbs(),
        context: {
          language: navigator.language,
          online: navigator.onLine,
          referrer: document.referrer || undefined,
          ...(payload.context ?? {}),
        },
      },
    } as never);

    if (error) {
      // Deliberately console.warn, not console.error: console.error is captured
      // by this same engine, so an error here would report itself forever.
      console.warn("[bugs] could not file report:", error.message);
      return null;
    }

    const id = (data as unknown as string) ?? null;
    if (payload.source !== "user_report") {
      announce({
        id,
        source: payload.source,
        severity: payload.severity ?? "medium",
        title: payload.title,
        message: payload.error_message || payload.title,
      });
    }
    return id;
  } catch (e) {
    console.warn("[bugs] reporter threw:", e);
    return null;
  } finally {
    reporting = false;
  }
}

/** A short, human-readable title from an arbitrary thrown value. */
function titleFrom(prefix: string, message: string): string {
  const cleaned = message.replace(/\s+/g, " ").trim();
  return `${prefix}: ${cleaned.slice(0, 160) || "unknown error"}`;
}

function messageOf(value: unknown): { message: string; stack?: string } {
  if (value instanceof Error) return { message: value.message || String(value), stack: value.stack };
  if (typeof value === "string") return { message: value };
  try {
    return { message: JSON.stringify(value)?.slice(0, 500) ?? String(value) };
  } catch {
    return { message: String(value) };
  }
}

// ---------------------------------------------------------------------------
// Installers
// ---------------------------------------------------------------------------

function installErrorListeners() {
  window.addEventListener("error", (event) => {
    // Resource load failures (a broken <img>, a 404'd script) arrive as an
    // error event with no `error` object and a target that is an element.
    const target = event.target as HTMLElement | null;
    if (target && target !== (window as unknown as HTMLElement) && "tagName" in target) {
      const src = (target as HTMLImageElement | HTMLScriptElement).src;
      if (src && !shouldIgnore(src)) {
        void reportBug({
          source: "network",
          severity: "low",
          title: `Failed to load ${target.tagName.toLowerCase()}`,
          error_message: src,
          context: { tag: target.tagName },
        });
      }
      return;
    }

    const { message, stack } = messageOf(event.error ?? event.message);
    if (shouldIgnore(message, stack, event.filename)) return;
    void reportBug({
      source: "window_error",
      severity: "high",
      title: titleFrom("Uncaught error", message),
      error_message: message,
      error_stack: stack,
      context: { filename: event.filename, line: event.lineno, column: event.colno },
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const { message, stack } = messageOf(event.reason);
    if (shouldIgnore(message, stack)) return;
    void reportBug({
      source: "unhandled_rejection",
      severity: "high",
      title: titleFrom("Unhandled rejection", message),
      error_message: message,
      error_stack: stack,
    });
  });
}

/**
 * Capture `console.error` from our own code.
 *
 * This is how a "button that does nothing" gets reported. Most handlers that
 * swallow a failure still log it, and until now that log died in one person's
 * devtools. The original console.error is always called first, so devtools
 * behaviour is unchanged.
 */
function installConsoleCapture() {
  const original = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    original(...args);
    try {
      if (reporting) return;
      const text = args
        .map((a) => (a instanceof Error ? `${a.message}\n${a.stack ?? ""}` : messageOf(a).message))
        .join(" ")
        .slice(0, 1500);
      if (!text.trim()) return;
      // React's own "Warning:" logs are development guidance, not failures.
      if (text.startsWith("Warning:") || text.includes("[bugs]")) return;
      if (shouldIgnore(text)) return;
      const errArg = args.find((a): a is Error => a instanceof Error);
      addBreadcrumb("console", text.slice(0, 120));
      void reportBug({
        source: "console_error",
        severity: "medium",
        title: titleFrom("Console error", text),
        error_message: text,
        error_stack: errArg?.stack,
      });
    } catch {
      /* never let logging break logging */
    }
  };
}

/** How many times a replayable request is retried after a network failure. */
const NETWORK_RETRIES = 2;
/** Backoff before each retry, in ms. One entry per retry. */
const RETRY_BACKOFF_MS = [400, 1200];

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Can this request be sent again safely?
 *
 * A `TypeError: Failed to fetch` means no response came back, not that nothing
 * happened: the request may have reached the server and been applied. So only
 * methods that HTTP defines as idempotent are replayed. A POST -- an insert, an
 * edge function call, a PostgREST rpc -- is never retried here, because sending
 * it twice could double-post a message or spend a credit twice.
 */
function isReplayable(input: RequestInfo | URL, init?: RequestInit): boolean {
  const method = (
    init?.method ?? (typeof Request !== "undefined" && input instanceof Request ? input.method : "GET")
  ).toUpperCase();
  return method === "GET" || method === "HEAD";
}

/**
 * Is a network failure this app's fault, or the network's?
 *
 * `Failed to fetch` was the most common row in the bug table and almost none of
 * it was actionable. A dropped wifi frame, a tab the browser froze in the
 * background, a laptop lid closing mid-request -- all of them surface as the
 * same bare TypeError against our own origin, and each one raised a red
 * "Request to Pathforge API failed" bar at a user whose next click worked fine.
 *
 * Two conditions say plainly that the request never had a chance, and neither
 * is something an engineer can fix:
 *
 *  - The browser reports itself offline.
 *  - The tab is hidden. Browsers throttle and freeze background tabs and cancel
 *    what is in flight; the request is reissued when the tab comes back.
 *
 * Anything else is still reported, because a request to our own backend failing
 * while the user is sitting there looking at the page is a real symptom.
 */
function networkFailureIsReportable(): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return false;
  if (typeof document !== "undefined" && document.visibilityState === "hidden") return false;
  return true;
}

/**
 * What the browser says when a request dies, and what a person should read.
 *
 * `TypeError: Failed to fetch` is the browser telling a developer that no
 * response arrived. Around a hundred call sites in this app put an error's
 * message straight into a toast, so that sentence -- which names no product,
 * no action and no remedy -- is what the user was shown. Rewriting each of
 * those call sites would be a hundred chances to change behaviour by accident;
 * rewriting the message once, here, where every request already passes, is the
 * same fix in one place.
 *
 * The error object itself is kept: same instance, same prototype, same stack,
 * so anything matching on the type (supabase-js decides whether to retry an
 * auth call by the error's `name`) is unaffected. Only `message` changes, and
 * only after the bug report has already recorded the original string, so the
 * admin list keeps the technical text.
 */
const NETWORK_MESSAGE_PATTERN = /failed to fetch|networkerror|network request failed|load failed/i;

function humaniseNetworkError(error: unknown, isOurs: boolean): void {
  if (!isOurs || !(error instanceof Error)) return;
  if (!NETWORK_MESSAGE_PATTERN.test(error.message)) return;
  try {
    error.message =
      typeof navigator !== "undefined" && navigator.onLine === false
        ? "You appear to be offline. Reconnect and try again."
        : "Could not reach Pathforge. Check your connection and try again.";
  } catch {
    // Some environments freeze error objects. The original message is still
    // better than throwing from inside error handling.
  }
}

/**
 * Watch every request the app makes to our own backend, and retry the ones
 * that are safe to retry.
 *
 * `supabase.functions.invoke` goes through `fetch`, so patching fetch once
 * catches every edge function failure -- including the ones whose callers
 * swallow the error -- without wrapping each of the 40-odd call sites. REST and
 * storage failures come along for free.
 *
 * WHY THE RETRY LIVES HERE AND NOT IN REACT QUERY
 *
 * React Query's `retry` only covers what a query hook asked for. Realtime
 * token refreshes, storage uploads, `functions.invoke` from an event handler
 * and every direct `supabase.from(...)` inside a `useEffect` bypass it
 * entirely. More importantly, the report was filed on the FIRST failure, before
 * React Query ever got to its retry -- so a request that recovered a second
 * later had already raised a red banner and filed a bug. Retrying at the one
 * place every request passes through fixes both: the app recovers, and nothing
 * is reported unless the recovery also failed.
 */
function installFetchCapture() {
  const apiOrigin = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "";
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const isOurs = Boolean(apiOrigin) && url.startsWith(apiOrigin);
    const fnMatch = isOurs ? url.match(/\/functions\/v1\/([^/?]+)/) : null;
    const functionName = fnMatch?.[1] ?? null;

    const replayable = isReplayable(input, init);
    let attempt = 0;

    // Loops only on a retry; every other path returns or throws.
    while (true) {
      try {
        const response = await originalFetch(input as RequestInfo, init);

        if (isOurs && !response.ok) {
          // 401/403 on an edge function is usually an expired session, which
          // the auth layer handles by re-authenticating. 404 on a REST filter
          // is a normal empty result. Neither is a bug.
          const expected =
            response.status === 401 || response.status === 403 || response.status === 404;
          if (!expected) {
            // Read the body from a clone so the caller still gets an unconsumed
            // response -- reading the original would break every call site.
            let body = "";
            try {
              body = (await response.clone().text()).slice(0, 1000);
            } catch {
              /* body already consumed or not text */
            }
            addBreadcrumb("request", `${response.status} ${functionName ?? url}`);
            void reportBug({
              source: functionName ? "edge_function" : "network",
              severity: response.status >= 500 ? "high" : "medium",
              title: functionName
                ? `Edge function ${functionName} returned ${response.status}`
                : `Request failed with ${response.status}`,
              error_message: body || `${response.status} ${response.statusText}`,
              function_name: functionName,
              http_status: response.status,
              context: { url: url.replace(apiOrigin, ""), method: init?.method ?? "GET" },
            });
          }
        }

        return response;
      } catch (networkError) {
        // A replayable request to our own backend gets a second and third go
        // before any of this counts as a failure. Retrying while the browser
        // is offline or the tab is frozen only burns the attempts on a
        // connection that cannot work, so those wait for the next real call.
        if (
          isOurs &&
          replayable &&
          attempt < NETWORK_RETRIES &&
          networkFailureIsReportable()
        ) {
          await wait(RETRY_BACKOFF_MS[attempt] ?? 1200);
          attempt += 1;
          continue;
        }

        const { message, stack } = messageOf(networkError);
        if (isOurs && networkFailureIsReportable() && !shouldIgnore(message, stack)) {
          addBreadcrumb("request", `network failure ${functionName ?? url}`);
          void reportBug({
            source: functionName ? "edge_function" : "network",
            severity: "high",
            title: functionName
              ? `Edge function ${functionName} could not be reached`
              : "Request to Pathforge API failed",
            error_message: message,
            error_stack: stack,
            function_name: functionName,
            context: {
              url: url.replace(apiOrigin, ""),
              method: init?.method ?? "GET",
              attempts: attempt + 1,
            },
          });
        }

        humaniseNetworkError(networkError, isOurs);
        throw networkError;
      }
    }
  };
}

/**
 * Breadcrumbs for clicks, recorded by what the user saw, not by DOM path.
 * "Clicked Generate essay" is a reproduction step; "clicked div > button:nth-
 * child(3)" is not.
 */
function installInteractionCapture() {
  document.addEventListener(
    "click",
    (event) => {
      try {
        const el = (event.target as HTMLElement | null)?.closest(
          "button, a, [role='button'], [role='menuitem'], [role='tab']",
        );
        if (!el) return;
        const label =
          el.getAttribute("aria-label") ||
          (el.textContent ?? "").replace(/\s+/g, " ").trim() ||
          el.getAttribute("title") ||
          el.tagName.toLowerCase();
        addBreadcrumb("click", label || el.tagName.toLowerCase());
      } catch {
        /* a breadcrumb is never worth an exception */
      }
    },
    true,
  );
}

/**
 * Route breadcrumbs.
 *
 * React Router navigates with `history.pushState`, which fires no event, so the
 * two history methods are wrapped. `popstate` covers back/forward.
 */
function installRouteCapture() {
  const record = () => addBreadcrumb("route", currentRoute() ?? "/");
  record();

  const wrap = <K extends "pushState" | "replaceState">(key: K) => {
    const original = history[key].bind(history);
    history[key] = ((...args: Parameters<History[K]>) => {
      const result = (original as (...a: unknown[]) => unknown)(...args);
      record();
      return result;
    }) as History[K];
  };
  wrap("pushState");
  wrap("replaceState");
  window.addEventListener("popstate", record);
}

/**
 * Turn capture on. Safe to call more than once; only the first call installs.
 * Called from `main.tsx` before React mounts, so an error during the very first
 * render is still caught.
 */
export function installBugCapture() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  try {
    installErrorListeners();
    installConsoleCapture();
    installFetchCapture();
    installInteractionCapture();
    installRouteCapture();
  } catch (e) {
    console.warn("[bugs] capture install failed:", e);
  }
}

/** Severity picker for the manual report form. */
export const USER_SEVERITIES: { value: BugSeverity; label: string; hint: string }[] = [
  { value: "low", label: "Minor", hint: "Cosmetic, or easy to work around" },
  { value: "medium", label: "Annoying", hint: "Gets in the way but I can continue" },
  { value: "high", label: "Blocking", hint: "I cannot finish what I came to do" },
  { value: "critical", label: "Broken", hint: "The page or my data is unusable" },
];
