import { useEffect, useState } from "react";

/**
 * True when the primary input is a mouse or trackpad.
 *
 * Hover-driven effects (magnetic pull, cursor-follow glow, tilt) have nothing
 * to track on a touchscreen, where they either never fire or stick on after a
 * tap. Gate them on this instead of on screen width — a touch laptop is wide
 * and still has no cursor.
 */
export function useFinePointer(): boolean {
  const [finePointer, setFinePointer] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return true;
    return window.matchMedia("(pointer: fine)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(pointer: fine)");
    const onChange = (e: MediaQueryListEvent) => setFinePointer(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return finePointer;
}
