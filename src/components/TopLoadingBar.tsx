import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { useIsFetching, useIsMutating } from "@tanstack/react-query";

/**
 * Thin 2px top progress bar in the dashboard blue.
 * Triggers on route changes and whenever React Query is fetching/mutating.
 */
export function TopLoadingBar() {
  const location = useLocation();
  const navType = useNavigationType();
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  const busy = isFetching + isMutating > 0;

  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timers = useRef<number[]>([]);
  const finishRef = useRef<number | null>(null);

  const clearAll = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    if (finishRef.current) {
      window.clearTimeout(finishRef.current);
      finishRef.current = null;
    }
  };

  const start = () => {
    clearAll();
    setVisible(true);
    setProgress(8);
    const steps = [
      [120, 28],
      [320, 52],
      [620, 70],
      [1100, 82],
      [1900, 90],
    ] as const;
    steps.forEach(([delay, val]) => {
      timers.current.push(window.setTimeout(() => setProgress(val), delay));
    });
  };

  const finish = () => {
    clearAll();
    setProgress(100);
    finishRef.current = window.setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 280);
  };

  // Route changes
  useEffect(() => {
    start();
    const t = window.setTimeout(finish, 420);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, navType]);

  // Query activity
  useEffect(() => {
    if (busy) start();
    else if (visible) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[2px]"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 200ms ease-out" }}
    >
      {/*
       * scaleX, not width.
       *
       * `width` is not a compositable property, so animating it ran Layout and
       * Paint on the main thread for every frame of every one of these — and
       * this bar starts on mount, so that included the landing page's first
       * seconds. It was the only animation on the page Lighthouse flagged as
       * non-composited ("Unsupported CSS Property: width"), while style and
       * layout were the largest remaining block of main-thread time.
       *
       * A full-width element scaled from its left edge is the same picture and
       * runs entirely on the compositor. The glow is scaled horizontally along
       * with the bar, which on a 2px rule with an 8px blur is not a difference
       * anyone can see.
       */}
      <div
        className="h-full w-full origin-left bg-accent shadow-[0_0_8px_hsl(var(--accent)/0.7)]"
        style={{
          transform: `scaleX(${progress / 100})`,
          transition: "transform 280ms cubic-bezier(0.22,1,0.36,1)",
        }}
      />
    </div>
  );
}
