/**
 * The boarding pass.
 *
 * This is the object the whole feature turns on. Booking a flight is a form;
 * tearing a pass is a commitment — so the pass is built as a *thing* rather
 * than a summary card: real stub, real barcode, metadata laid out the way a
 * printed pass lays it out.
 *
 * It prints dark, on near-black stock with a dotted world map pressed into it.
 * That is not a theme choice — it is what makes the two big airport codes the
 * brightest thing on the card, and it lets the pass sit directly on the map it
 * describes without a light panel punching a hole in the view.
 *
 * The barcode strip inverts to white. A barcode is the one element on a real
 * pass that must read as printed ink, and dark bars on dark stock do not.
 * Inverting it also gives the tear something to take: the strip below the
 * perforation is visually a separate object before it ever separates.
 */
import { forwardRef } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { Plane } from "lucide-react";
import { cn } from "@/lib/utils";
import { EASE_OUT_EXPO } from "@/lib/motion";
import { formatKm } from "@/lib/focus-flight/geo";
import { clockTime, type FocusFlight } from "@/lib/focus-flight/flight";

/**
 * A deterministic barcode.
 *
 * Derived from the flight number and seat so the same pass always prints the
 * same bars — a barcode that reshuffles on re-render immediately reads as
 * decoration, which defeats the point of putting one there.
 */
function barsFor(seed: string, count = 52): number[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Array.from({ length: count }, () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return 1 + (((t ^ (t >>> 14)) >>> 0) % 4);
  });
}

/**
 * The dotted-map watermark.
 *
 * A coarse dot grid masked to a rough landmass silhouette. It is not a real
 * projection and does not need to be — at 7% opacity behind 44px type it reads
 * as "world", which is the entire job. Drawing it from a formula rather than
 * shipping a traced SVG keeps the pass free of another asset.
 */
function DottedWorld({ className }: { className?: string }) {
  const cols = 64;
  const rows = 30;
  const dots: [number, number][] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = (c / cols) * 2 - 1;
      const y = (r / rows) * 2 - 1;
      const land =
        Math.hypot((x + 0.62) * 1.5, (y + 0.3) * 2.6) < 1 ||
        Math.hypot((x + 0.44) * 2.3, (y - 0.42) * 1.7) < 1 ||
        Math.hypot((x - 0.05) * 2.5, (y - 0.08) * 1.5) < 1 ||
        Math.hypot((x - 0.52) * 1.7, (y + 0.24) * 2.4) < 1 ||
        Math.hypot((x - 0.76) * 4.5, (y - 0.62) * 5) < 1;
      if (land) dots.push([c, r]);
    }
  }
  return (
    <svg
      viewBox={`0 0 ${cols} ${rows}`}
      className={className}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      {dots.map(([c, r], i) => (
        <circle key={i} cx={c + 0.5} cy={r + 0.5} r={0.32} fill="currentColor" />
      ))}
    </svg>
  );
}

export interface BoardingPassProps {
  flight: FocusFlight;
  /** Drives the tear animation on the barcode stub. */
  torn?: boolean;
  /** Compact variant for the flight log grid. */
  compact?: boolean;
  /** Shown on a past pass instead of boarding times. */
  outcome?: "landed" | "diverted";
  className?: string;
  /**
   * Makes the barcode stub draggable — pulling it past the perforation fires
   * this instead of requiring a button press. The tear is the commitment; a
   * cursor/finger pulling a physical stub off is what that commitment should
   * feel like, not a click.
   */
  onTear?: () => void;
}

export const BoardingPass = forwardRef<HTMLDivElement, BoardingPassProps>(
  function BoardingPass({ flight, torn = false, compact = false, outcome, className, onTear }, ref) {
    const dragY = useMotionValue(0);
    const dragOpacity = useTransform(dragY, [0, 90], [1, 0]);
    const dragRotate = useTransform(dragY, [0, 90], [0, -6]);
    const bars = barsFor(`${flight.flightNumber}${flight.seat}${flight.gate}`, compact ? 30 : 52);
    const date = new Date(flight.startedAt);
    const dateLabel = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(
      date.getDate(),
    ).padStart(2, "0")}`;

    return (
      <div
        ref={ref}
        className={cn(
          "relative w-full overflow-hidden rounded-[1.25rem] bg-[#0c0d10] text-white shadow-[0_24px_70px_-24px_rgba(0,0,0,0.9)] ring-1 ring-white/[0.06]",
          className,
        )}
      >
        <DottedWorld className="pointer-events-none absolute inset-x-0 top-0 h-[62%] w-full text-white/[0.07]" />

        <motion.div
          animate={torn ? { y: -6 } : { y: 0 }}
          transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
          className={cn("relative", compact ? "p-4" : "px-6 pt-6 sm:px-7 sm:pt-7")}
        >
          {/* Route ------------------------------------------------------- */}
          <div className="flex items-start justify-between gap-3">
            <p
              className={cn(
                "font-sans font-bold leading-none tracking-tight",
                compact ? "text-2xl" : "text-4xl sm:text-5xl",
              )}
            >
              {flight.origin.code}
            </p>
            <Plane
              className={cn(
                "mt-1 shrink-0 -rotate-[20deg] text-white/35",
                compact ? "h-3.5 w-3.5" : "h-5 w-5",
              )}
              aria-hidden="true"
            />
            <p
              className={cn(
                "font-sans font-bold leading-none tracking-tight",
                compact ? "text-2xl" : "text-4xl sm:text-5xl",
              )}
            >
              {flight.destination.code}
            </p>
          </div>

          <div
            className={cn("flex items-baseline justify-between gap-3", compact ? "mt-1.5" : "mt-2.5")}
          >
            <p className={cn("truncate text-white/45", compact ? "text-[10px]" : "text-sm")}>
              {flight.origin.country}
            </p>
            <p className={cn("shrink-0 text-white/45", compact ? "text-[10px]" : "text-sm")}>
              {flight.plannedMinutes}m
            </p>
            <p className={cn("truncate text-right text-white/45", compact ? "text-[10px]" : "text-sm")}>
              {flight.destination.country}
            </p>
          </div>

          {/* Objective — the reason the flight exists. */}
          {flight.objective && !compact && (
            <p className="mt-5 border-l-2 border-flight-yellow/70 py-1 pl-3 text-sm leading-snug text-white/85">
              {flight.objective}
            </p>
          )}

          {/* Fields ------------------------------------------------------ */}
          <div
            className={cn("grid grid-cols-2 gap-x-4", compact ? "mt-3 gap-y-2.5" : "mt-6 gap-y-4")}
          >
            <Field label="Seat" value={flight.seat} compact={compact} />
            <Field
              label="Distance"
              value={formatKm(flight.distanceKm)}
              align="right"
              compact={compact}
            />
            <Field
              label={outcome ? "Status" : "Boarding"}
              value={
                outcome
                  ? outcome === "landed"
                    ? "Landed"
                    : "Diverted"
                  : clockTime(flight.startedAt)
              }
              tone={outcome === "landed" ? "good" : outcome === "diverted" ? "warn" : undefined}
              compact={compact}
            />
            <Field label="Date" value={dateLabel} align="right" compact={compact} />
          </div>
        </motion.div>

        {/* Perforation ---------------------------------------------------- */}
        <div className={cn("relative", compact ? "mt-3.5" : "mt-6")} aria-hidden="true">
          <div className="mx-5 border-t border-dashed border-white/20" />
          <span className="absolute -left-2.5 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-background" />
          <span className="absolute -right-2.5 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-background" />
        </div>

        {/* Barcode stub — the part that tears away ------------------------ */}
        <motion.div
          drag={onTear && !torn ? "y" : false}
          dragDirectionLock
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.65 }}
          style={onTear && !torn ? { y: dragY, opacity: dragOpacity, rotate: dragRotate } : undefined}
          onDrag={(_, info) => {
            if (info.offset.y < 0) return;
            dragY.set(info.offset.y);
          }}
          onDragEnd={(_, info) => {
            if (info.offset.y > 88) {
              onTear?.();
            } else {
              dragY.set(0);
            }
          }}
          animate={
            onTear && !torn
              ? undefined
              : torn
                ? { y: 70, rotate: -6, opacity: 0 }
                : { y: 0, rotate: 0, opacity: 1 }
          }
          transition={{ duration: 0.62, ease: EASE_OUT_EXPO }}
          className={cn(
            compact ? "px-4 pb-4 pt-3" : "px-6 pb-6 pt-5 sm:px-7",
            onTear && !torn && "cursor-grab touch-none active:cursor-grabbing",
          )}
        >
          {/* Inverted: a barcode has to read as printed ink, and dark bars on
              dark stock do not. */}
          <div
            className={cn(
              "flex items-stretch justify-center gap-[2px] overflow-hidden rounded-md bg-white px-3",
              compact ? "h-9" : "h-14",
            )}
          >
            {bars.map((w, i) => (
              <span key={i} style={{ width: `${w}px` }} className="h-full bg-slate-950" />
            ))}
          </div>
        </motion.div>
      </div>
    );
  },
);

function Field({
  label,
  value,
  align = "left",
  tone,
  compact,
}: {
  label: string;
  value: string;
  align?: "left" | "right";
  tone?: "good" | "warn";
  compact?: boolean;
}) {
  return (
    <div className={cn("min-w-0", align === "right" && "text-right")}>
      <p className={cn("text-white/40", compact ? "text-[9px]" : "text-xs")}>{label}</p>
      <p
        className={cn(
          "mt-0.5 truncate font-medium",
          compact ? "text-xs" : "text-base",
          tone === "good" ? "text-emerald-400" : tone === "warn" ? "text-amber-400" : "text-white",
        )}
      >
        {value}
      </p>
    </div>
  );
}
