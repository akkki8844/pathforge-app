import { useCallback, useEffect, useState } from "react";

export interface DraggablePos {
  /** Distance from the top of the viewport, in px. */
  y: number;
}

/** Gap kept between the widget and the top/bottom of the viewport. */
const EDGE_GUTTER = 16;

/**
 * Persist a dock-rail widget's vertical position in localStorage.
 *
 * Deliberately vertical-only and edge-locked: the widget this drives is a
 * persistent rail on the left of the screen, and letting it move horizontally
 * meant users could fling it past the viewport and lose it entirely. Y is
 * clamped on every read, on resize, and on drag end, so there is no path to an
 * offscreen value — including a stale one already sitting in localStorage.
 */
export function useDraggablePosition(storageKey: string, defaults: DraggablePos) {
  const clampY = useCallback((y: number) => {
    if (typeof window === "undefined") return y;
    // `height` is the widget's own height; we only know a rough bound here, so
    // reserve enough that the grab handle always stays reachable.
    const maxY = Math.max(EDGE_GUTTER, window.innerHeight - 140);
    return Math.max(EDGE_GUTTER, Math.min(y, maxY));
  }, []);

  const [pos, setPos] = useState<DraggablePos>(() => {
    if (typeof window === "undefined") return defaults;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed?.y === "number" && Number.isFinite(parsed.y)) {
          return { y: clampY(parsed.y) };
        }
      }
    } catch {}
    return { y: clampY(defaults.y) };
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(pos));
    } catch {}
  }, [storageKey, pos]);

  useEffect(() => {
    const onResize = () =>
      setPos((p) => {
        const y = clampY(p.y);
        return y === p.y ? p : { y };
      });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [clampY]);

  /**
   * Commits a drag as a new `top`. The caller is responsible for resetting the
   * drag transform to 0 in the same tick — otherwise framer's leftover offset
   * stacks on top of the new `top` and the widget jumps by double the distance.
   */
  const commitDrag = useCallback(
    (deltaY: number) => setPos((p) => ({ y: clampY(p.y + deltaY) })),
    [clampY],
  );

  return { pos, setPos, commitDrag };
}
