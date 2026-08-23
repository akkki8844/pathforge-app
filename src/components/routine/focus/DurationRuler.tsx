/**
 * The duration ruler.
 *
 * A measuring scale rather than a slider. The difference matters: a slider's
 * track is abstract — it says "somewhere between the ends" — while a ruler
 * prints the actual minute marks under a fixed pointer, so the student reads a
 * number off a scale instead of estimating a position. It is how a cockpit
 * dials a heading, and it is the one control in booking that benefits from
 * feeling mechanical.
 *
 * The scale scrolls under a stationary pointer, not the other way round. That
 * keeps the value the student is choosing in the same place on screen the whole
 * time, and it is what makes the fine ticks legible: they slide past a fixed
 * reference rather than the reference hunting across them.
 *
 * Implemented as a real `role="slider"` so arrow keys, Home/End and every
 * assistive technology work without a parallel code path.
 */
import { useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

/** Pixels between two one-minute ticks. Sets how far a drag travels. */
const PX_PER_MIN = 7;

export function DurationRuler({
  value,
  min,
  max,
  onChange,
  className,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (minutes: number) => void;
  className?: string;
}) {
  const dragging = useRef<{ startX: number; startValue: number } | null>(null);

  const clamp = useCallback(
    (n: number) => Math.max(min, Math.min(max, Math.round(n))),
    [min, max],
  );

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = { startX: e.clientX, startValue: value };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragging.current;
    if (!d) return;
    // Drag left to advance: the scale moves the way paper would under a finger.
    onChange(clamp(d.startValue - (e.clientX - d.startX) / PX_PER_MIN));
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 1;
    const map: Record<string, number> = {
      ArrowLeft: -step,
      ArrowDown: -step,
      ArrowRight: step,
      ArrowUp: step,
      PageDown: -10,
      PageUp: 10,
    };
    if (e.key in map) {
      e.preventDefault();
      onChange(clamp(value + map[e.key]));
    } else if (e.key === "Home") {
      e.preventDefault();
      onChange(min);
    } else if (e.key === "End") {
      e.preventDefault();
      onChange(max);
    }
  };

  // Enough ticks either side of the current value to fill the viewport at any
  // width, clipped to the real range so the scale visibly ends where it ends.
  const span = 36;
  const from = Math.max(min, value - span);
  const to = Math.min(max, value + span);
  const ticks: number[] = [];
  for (let m = from; m <= to; m++) ticks.push(m);

  return (
    <div className={cn("relative select-none", className)}>
      <div
        role="slider"
        tabIndex={0}
        aria-label="Flight duration in minutes"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={`${value} minutes`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        className="relative h-20 cursor-ew-resize touch-none overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {/* The scale, translated so `value` sits dead centre. */}
        <div
          className="absolute inset-y-0 left-1/2 flex items-start"
          style={{ transform: `translateX(${-value * PX_PER_MIN}px)` }}
          aria-hidden="true"
        >
          {ticks.map((m) => {
            const major = m % 10 === 0;
            const medium = !major && m % 5 === 0;
            return (
              <div
                key={m}
                className="absolute top-4 flex flex-col items-center"
                style={{ left: m * PX_PER_MIN }}
              >
                <span
                  className={cn(
                    "w-px",
                    major ? "h-5 bg-white/70" : medium ? "h-3.5 bg-white/40" : "h-2 bg-white/20",
                  )}
                />
                {major && (
                  <span className="mt-1.5 -translate-x-1/2 whitespace-nowrap pl-px font-sans text-[10px] text-white/45">
                    {m}m
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Fixed pointer. */}
        <div
          className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2"
          aria-hidden="true"
        >
          <span className="absolute left-1/2 top-1 h-0 w-0 -translate-x-1/2 border-x-[5px] border-t-[7px] border-x-transparent border-t-flight-yellow" />
          <span className="absolute inset-y-3 left-1/2 w-[2px] -translate-x-1/2 bg-flight-yellow" />
        </div>

        {/* Edge fades, so the scale reads as continuing past the frame. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-slate-950 to-transparent"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-slate-950 to-transparent"
        />
      </div>
    </div>
  );
}
