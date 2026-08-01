import { useEffect, useRef } from "react";

/**
 * Wires the browser Back button to a step-based onboarding flow.
 *
 * Strategy:
 *  - On mount, push a sentinel history entry so the next "back" press is
 *    intercepted by us instead of leaving the page.
 *  - On every step change, push a fresh sentinel so back is always armed
 *    even if the user clicks Next/Back inside the form many times.
 *  - On popstate: always show the exit-confirmation prompt. The user has
 *    explicitly asked for full control — back must always offer to exit
 *    onboarding rather than merely stepping backward (steps already have
 *    their own visible Back/Next buttons inside the form).
 *
 * The component is never unmounted, so form state is preserved if the
 * user cancels the exit prompt.
 */
export function useStepBackNavigation(opts: {
  step: number;
  onBack: () => void;
  onExitRequest: () => void;
  enabled?: boolean;
}) {
  const { step, onExitRequest, enabled = true } = opts;
  const exitRef = useRef(onExitRequest);
  exitRef.current = onExitRequest;

  // Re-arm the sentinel on every step change so back is always intercepted.
  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;
    try {
      window.history.pushState({ __onboarding: true, step }, "");
    } catch {
      /* noop */
    }
  }, [step, enabled]);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;

    const handler = (_e: PopStateEvent) => {
      // Always show the exit confirmation. Re-push the sentinel so the
      // user stays on the page until they confirm.
      try {
        window.history.pushState({ __onboarding: true, step: -1 }, "");
      } catch {
        /* noop */
      }
      exitRef.current();
    };

    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, [enabled]);
}
