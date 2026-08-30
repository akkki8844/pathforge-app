import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * The lighting behind a chat composer.
 *
 * Purely decorative: it renders as a `pointer-events-none` overlay inside an
 * existing composer rather than replacing it, so the advisor keeps its model
 * picker, effort slider, voice input, file drop and command palette, and
 * support keeps its own send handler. Nothing here is interactive; everything
 * it reacts to is read from the parent element.
 *
 * The reference design lit the box in purple and pink. Pathforge's accent is
 * indigo and the surfaces around it are warm paper, so those hues read as a
 * different product's chrome sitting inside this one. Recoloured to the blue
 * end — indigo through sky — which is the accent's own family.
 *
 * Everything stops under `prefers-reduced-motion`: the cursor gradient, the
 * sweep and the ripples are all motion, and none of them carry information.
 */

interface Ripple {
  id: number;
  x: number;
  y: number;
}

/** rgb triplets, so opacity can vary per layer without restating the colour. */
const INDIGO = "99, 102, 241";
const BLUE = "59, 130, 246";
const SKY = "56, 189, 248";

export function PromptGlow({
  intensity = 0.55,
  radius = "rounded-2xl",
  className,
}: {
  /** 0–1. Scales every glow's alpha; the geometry never changes. */
  intensity?: number;
  /** Must match the composer's own corner radius or the glow shows its edges. */
  radius?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  // Listeners go on the parent composer, not on this overlay: the overlay is
  // pointer-events-none by design, so it never sees a pointer itself.
  useEffect(() => {
    const host = ref.current?.parentElement;
    if (!host || reduced) return;

    let frame = 0;
    const onMove = (event: PointerEvent) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const rect = host.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        setPosition({
          x: ((event.clientX - rect.left) / rect.width) * 100,
          y: ((event.clientY - rect.top) / rect.height) * 100,
        });
      });
    };

    const onDown = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      const ripple = {
        id: Date.now() + Math.random(),
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
      // Capped at four: past that they overlap into a single wash and each one
      // is another animating element on a page that is already animating.
      setRipples((prev) => [...prev.slice(-3), ripple]);
      window.setTimeout(
        () => setRipples((prev) => prev.filter((r) => r.id !== ripple.id)),
        600
      );
    };

    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerdown", onDown);
    return () => {
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerdown", onDown);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [reduced]);

  return (
    <span
      ref={ref}
      aria-hidden="true"
      // `-z-10` with `isolate` on the host: the layers paint above the
      // composer's own background and below its content, so the textarea and
      // buttons are never washed over. Without `isolate` on the host the
      // negative index would escape and sit behind the page.
      className={cn("pointer-events-none absolute inset-0 -z-10", radius, className)}
    >
      {/* Resting rim. Present without hover so the box reads as lit rather than
          as a plain border that lights up only for a mouse — which is nothing
          at all on a touchscreen. */}
      <span
        className={cn("absolute inset-0", radius)}
        style={{
          boxShadow: `0 0 0 1px rgba(${INDIGO}, ${0.16 * intensity}), 0 0 10px rgba(${BLUE}, ${0.14 * intensity})`,
        }}
      />

      {/* Focus and hover rim. */}
      <span
        className={cn(
          "absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-focus-within:opacity-100",
          radius
        )}
        style={{
          boxShadow: `
            0 0 0 1px rgba(${INDIGO}, ${0.34 * intensity}),
            0 0 12px rgba(${BLUE}, ${0.36 * intensity}),
            0 0 26px rgba(${SKY}, ${0.22 * intensity}),
            0 0 44px rgba(${INDIGO}, ${0.16 * intensity})
          `,
        }}
      />

      {!reduced && (
        <>
          {/* Cursor-following pool. */}
          <span
            className={cn(
              "absolute inset-0 opacity-0 blur-sm transition-opacity duration-300 group-hover:opacity-100",
              radius
            )}
            style={{
              background: `radial-gradient(circle 150px at ${position.x}% ${position.y}%, rgba(${SKY}, ${0.14 * intensity}) 0%, rgba(${BLUE}, ${0.09 * intensity}) 35%, rgba(${INDIGO}, ${0.06 * intensity}) 65%, transparent 100%)`,
            }}
          />

          {/* Sweep. Clipped by its own box so the corners stay clean. */}
          <span className={cn("absolute inset-0 overflow-hidden", radius)}>
            <span
              className="absolute inset-y-0 -left-full w-full -translate-x-4 opacity-0 blur-md transition-all duration-[1400ms] ease-out group-hover:left-full group-hover:opacity-100"
              style={{
                background: `linear-gradient(90deg, transparent, rgba(${SKY}, ${0.2 * intensity}), transparent)`,
              }}
            />
          </span>

          {ripples.map((ripple) => (
            <span
              key={ripple.id}
              className="absolute h-12 w-12 blur-sm"
              style={{ left: ripple.x - 24, top: ripple.y - 24 }}
            >
              <span
                className="block h-full w-full animate-ping rounded-full"
                style={{
                  background: `radial-gradient(circle, rgba(${BLUE}, ${0.3 * intensity}) 0%, rgba(${INDIGO}, ${0.14 * intensity}) 60%, transparent 100%)`,
                }}
              />
            </span>
          ))}
        </>
      )}
    </span>
  );
}
