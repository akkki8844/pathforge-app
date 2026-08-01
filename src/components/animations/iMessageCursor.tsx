import { motion, useMotionValue, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const DESKTOP_MQ = "(pointer: fine) and (hover: hover)";

const INTERACTIVE_SELECTOR =
  "a, button, [role='button'], input, textarea, select, [data-magnetic], [contenteditable='true']";

// A crisp blue arrow pointer — slightly larger than the default OS cursor
// so it reads as custom, but still behaves like a regular cursor.
//
// The arrow REPLACES the OS pointer (`cursor: none`), so its position must be
// pixel-exact on every frame. Motion values are written straight from the
// pointer event with no spring/tween in between: any interpolation would make
// the drawn arrow trail the physical pointer, and with the real cursor hidden
// there is nothing to hide that lag.
export function IMessageCursor() {
  const [enabled, setEnabled] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [visible, setVisible] = useState(false);

  const prefersReducedMotion = useReducedMotion();

  // Raw, un-smoothed position. Framer compiles x/y into a translate3d(), which
  // keeps the element on its own compositor layer.
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);

  // Mirrors of the state above so the listener effect never needs them as
  // dependencies (otherwise the whole listener set is torn down and
  // re-registered on the first mouse move).
  const visibleRef = useRef(false);
  const hoveringRef = useRef(false);
  const pressedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia(DESKTOP_MQ);
    const apply = () => setEnabled(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // Only commit to React when the value actually flips — a fast drag across a
    // dense page crosses hundreds of element boundaries per second.
    const setVisibleIfChanged = (next: boolean) => {
      if (visibleRef.current === next) return;
      visibleRef.current = next;
      setVisible(next);
    };
    const setHoveringIfChanged = (next: boolean) => {
      if (hoveringRef.current === next) return;
      hoveringRef.current = next;
      setHovering(next);
    };

    // Pointer Events are universally supported and behave far more consistently
    // than mouse events across platforms. Touch pointers are ignored so a
    // hybrid device (touchscreen laptop) never strands the arrow mid-screen.
    const isMouseLike = (e: PointerEvent) => e.pointerType !== "touch";

    const isInteractive = (node: EventTarget | null) => {
      const el = node as Element | null;
      return !!(el && typeof el.closest === "function" && el.closest(INTERACTIVE_SELECTOR));
    };

    const onMove = (e: PointerEvent) => {
      if (!isMouseLike(e)) return;
      x.set(e.clientX);
      y.set(e.clientY);
      setVisibleIfChanged(true);
    };

    // `pointerover` fires for every element entered, interactive or not, so it
    // alone fully determines the hover state. Not resetting on `pointerout`
    // avoids a spurious true -> false -> true flip when moving directly between
    // two interactive elements.
    const onOver = (e: PointerEvent) => {
      if (!isMouseLike(e)) return;
      setVisibleIfChanged(true);
      if (pressedRef.current) return;
      setHoveringIfChanged(isInteractive(e.target));
    };

    // A null `relatedTarget` means the pointer left the window entirely, which
    // is the reliable cross-browser signal (`mouseleave` on documentElement is
    // not).
    const onOut = (e: PointerEvent) => {
      if (!isMouseLike(e)) return;
      if (e.relatedTarget !== null) return;
      setVisibleIfChanged(false);
      if (!pressedRef.current) setHoveringIfChanged(false);
    };

    // Belt-and-braces for engines that under-report `pointerout` on window exit.
    const onDocumentLeave = () => setVisibleIfChanged(false);

    const onDown = (e: PointerEvent) => {
      if (!isMouseLike(e)) return;
      pressedRef.current = true;
      setHoveringIfChanged(true);
    };

    const onUp = (e: PointerEvent) => {
      if (!isMouseLike(e)) return;
      pressedRef.current = false;
      // Recompute from whatever is actually under the pointer instead of
      // blindly clearing — releasing over a button should stay "hovering".
      const under =
        typeof document.elementFromPoint === "function"
          ? document.elementFromPoint(e.clientX, e.clientY)
          : null;
      setHoveringIfChanged(isInteractive(under));
    };

    const onCancel = () => {
      pressedRef.current = false;
      setHoveringIfChanged(false);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerover", onOver, { passive: true });
    window.addEventListener("pointerout", onOut, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("pointercancel", onCancel, { passive: true });
    document.addEventListener("mouseleave", onDocumentLeave);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerover", onOver);
      window.removeEventListener("pointerout", onOut);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      document.removeEventListener("mouseleave", onDocumentLeave);
    };
  }, [enabled, x, y]);

  // Bail out BEFORE the `cursor: none` style tag is rendered — a touch device
  // (or SSR) must never end up with the OS pointer hidden and no replacement.
  if (!enabled) return null;

  return (
    <>
      <style>{`
        @media (pointer: fine) and (hover: hover) {
          html, html * {
            cursor: none !important;
          }
        }
      `}</style>
      <motion.div
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[9999]"
        style={{
          x,
          y,
          willChange: "transform",
        }}
        animate={{
          // Under prefers-reduced-motion the arrow still tracks the pointer
          // exactly (that is not "motion" in the harmful sense) but the hover
          // scale-up is dropped.
          scale: prefersReducedMotion ? 1 : hovering ? 1.15 : 1,
          opacity: visible ? 1 : 0,
        }}
        transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.12, ease: "easeOut" }}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.25))",
            transform: "translate(-2px, -2px)",
          }}
        >
          <path
            d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a1.5 1.5 0 0 1 1.06-.44h6.43a.5.5 0 0 0 .35-.85L6.35 2.85a.5.5 0 0 0-.85.36Z"
            fill="hsl(212 100% 55%)"
            stroke="white"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </svg>
      </motion.div>
    </>
  );
}

export default IMessageCursor;
