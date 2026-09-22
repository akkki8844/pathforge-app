import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { Tour, type TourStep } from "@/components/ui/product-tour";
import { PATHFORGE_TOUR } from "@/lib/tour/pathforgeTour";

/**
 * The Pathforge product tour: `components/ui/product-tour.tsx`, unmodified,
 * driven across every page of the app.
 *
 * WHAT THIS FILE ADDS, AND WHY IT IS A WRAPPER RATHER THAN AN EDIT
 *
 * `Tour` tours the page it is on. It measures `document.querySelector(target)`
 * and draws a spotlight; it has no idea a router exists. Pathforge's tour
 * crosses about twenty routes, so something has to navigate, wait for the
 * route's lazy chunk to mount, and only then let the tour measure — a rect
 * taken while a Suspense fallback is still up points at a spinner.
 *
 * All of that happens out here, through the component's public props. `Tour`
 * itself is byte-identical to the version that was handed over: same spring,
 * same spotlight, same card, same keyboard handling.
 *
 * THE FOUR THINGS THAT MAKE IT FLUID
 *
 * 1. NAVIGATE, THEN WAIT FOR THE TARGET. On every step change the host
 *    navigates if the route differs, then polls on rAF until the step's
 *    element is actually in the DOM. Until it is, the step is handed to `Tour`
 *    with its `target` stripped — so the card shows the right words
 *    immediately, centred over a dimmed page, and the spotlight springs onto
 *    the element the moment it mounts. Nothing ever points at a stale rect
 *    from the page the student just left.
 *
 * 2. THE STEPS ARRAY IS MEMOISED, AND THIS IS LOAD-BEARING. `Tour`'s measure
 *    effect lists `step` (i.e. `steps[index]`) in its dependencies and calls
 *    `setRect` with a fresh object. Rebuilding the steps array inline on every
 *    render would therefore give `step` a new identity on every render, re-run
 *    the effect, set state, and render again — an infinite loop. The memo is
 *    keyed on `[index, ready]`, the only two things that can change what a step
 *    resolves to, so each step has exactly two stable identities.
 *
 * 3. THE SPOTLIGHT IS RE-PINNED WHEN THE TARGET MOVES. See the watcher
 *    below — a page that fetches after it mounts would otherwise leave the
 *    spotlight behind on the rect it had at first paint.
 *
 * 4. `dark` IS PASSED EXPLICITLY. Left to itself the component reads
 *    `rootRef.current?.closest(".dark")` during render — but the ref is null on
 *    the first render, so the first card of a dark-mode tour would paint light
 *    and never correct itself. Pathforge themes through next-themes, so the
 *    resolved theme is handed in directly.
 *
 * Progress is the "4 / 24" counter rather than the dot row: two dozen dots do
 * not fit beside Back and Next in a 320px card. Same component, its own
 * `showProgress={false}` branch.
 */

/** How long to wait for a step's target before giving up and centring. */
const TARGET_TIMEOUT_MS = 4000;

export function PathforgeTour({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { resolvedTheme } = useTheme();

  const [index, setIndex] = useState(0);
  /** True once the current step's target is in the DOM (or gave up waiting). */
  const [ready, setReady] = useState(false);

  const step = PATHFORGE_TOUR[index];

  /**
   * Where the student was when the tour started. Skipping on step three should
   * put them back where they were, not abandon them on whichever page the tour
   * had reached.
   */
  const originRef = useRef(location.pathname);
  useEffect(() => {
    if (open) {
      originRef.current = location.pathname;
      setIndex(0);
    }
    // Only when the tour opens; location is read, not tracked.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ── Drive the router ──────────────────────────────────────────────────
  // `replace` so a twenty-stop tour does not leave twenty entries in the
  // student's back history.
  useEffect(() => {
    if (!open || !step) return;
    if (location.pathname !== step.route) navigate(step.route, { replace: true });
    // location.pathname is deliberately not a dependency: reacting to it would
    // re-fire this every time a route settles.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index, step, navigate]);

  // ── Wait for the target to exist ──────────────────────────────────────
  useEffect(() => {
    if (!open || !step) return;
    if (!step.target) {
      setReady(true);
      return;
    }
    const selector = step.target;
    setReady(false);
    let frame = 0;
    let cancelled = false;
    const deadline = performance.now() + TARGET_TIMEOUT_MS;
    const poll = () => {
      if (cancelled) return;
      // Giving up also sets ready: the component's own missing-target fallback
      // is a centred card, which beats hanging on a page that never renders it.
      if (document.querySelector(selector) || performance.now() > deadline) {
        setReady(true);
        return;
      }
      frame = requestAnimationFrame(poll);
    };
    frame = requestAnimationFrame(poll);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [open, index, step]);

  // ── Keep the spotlight pinned to a target that moves ──────────────────
  /*
   * `Tour` measures its target once per step and then only re-measures on
   * scroll and resize. That is fine on a static page and wrong on this app:
   * Journey, Chats and the Calendar all mount a placeholder, fetch, and
   * re-render — so the element the spotlight was measured against shifts, or is
   * replaced by a different node, a second or two after the step opened. The
   * spotlight is then left over empty space, or drops out entirely because a
   * stray scroll re-measured while the element was briefly unmounted.
   *
   * Rather than reach into the component, this watches the target's own rect
   * and dispatches the `resize` event the component already listens for. Fired
   * only when the rect actually changes, so a settled page costs one
   * querySelector every 200ms and no renders at all.
   */
  useEffect(() => {
    if (!open || !ready || !step?.target) return;
    const selector = step.target;
    let last = "";
    const tick = () => {
      const el = document.querySelector(selector);
      const r = el?.getBoundingClientRect();
      const key = r
        ? `${Math.round(r.x)},${Math.round(r.y)},${Math.round(r.width)},${Math.round(r.height)}`
        : "gone";
      if (key === last) return;
      last = key;
      window.dispatchEvent(new Event("resize"));
    };
    tick();
    const id = window.setInterval(tick, 200);
    return () => window.clearInterval(id);
  }, [open, index, step, ready]);

  // ── The steps handed to `Tour` ────────────────────────────────────────
  // See note 2 in the file header: this memo is what keeps the component out
  // of an infinite render loop.
  const steps = useMemo<TourStep[]>(
    () =>
      PATHFORGE_TOUR.map(({ route: _route, ...rest }, i) =>
        i === index && !ready ? { ...rest, target: undefined } : rest,
      ),
    [index, ready],
  );

  const leave = useCallback(() => {
    if (location.pathname !== originRef.current) {
      navigate(originRef.current, { replace: true });
    }
  }, [location.pathname, navigate]);

  if (!step) return null;

  return (
    <Tour
      steps={steps}
      open={open}
      onOpenChange={onOpenChange}
      index={index}
      onIndexChange={setIndex}
      onSkip={leave}
      onFinish={leave}
      showProgress={false}
      dark={resolvedTheme === "dark"}
    />
  );
}

export default PathforgeTour;
