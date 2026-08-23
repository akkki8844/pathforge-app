/**
 * The airport code badge.
 *
 * The marker aviation apps stamp across a map: a rounded rectangle in
 * high-visibility yellow, a small plane glyph, and the IATA code. It is the one
 * element that has to survive being shrunk to 11px and scattered forty-at-a-time
 * over a dark map, which is why it is a bordered chip rather than a pin — pins
 * collide and become unreadable at that density, chips tile.
 *
 * The glyph carries the role, not just decoration: a climbing plane marks where
 * a flight leaves from, a descending one marks where it arrives. On a map
 * showing one route that difference tells you the direction of travel without a
 * legend, an arrowhead, or animation.
 *
 * Three tones, and they mean different things. `solid` is the place you have
 * committed to, `outline` a place in play, `muted` a place merely on the map.
 */
import { PlaneLanding, PlaneTakeoff, Plane } from "lucide-react";
import { cn } from "@/lib/utils";

export type BadgeTone = "outline" | "solid" | "muted";
export type BadgeRole = "origin" | "destination" | "neutral";

const SIZES = {
  xs: "gap-1 rounded-[4px] border px-1 py-px text-[9px]",
  sm: "gap-1 rounded-[5px] border px-1.5 py-px text-[10px]",
  md: "gap-1.5 rounded-md border-[1.5px] px-2 py-0.5 text-xs",
  lg: "gap-2 rounded-lg border-[1.5px] px-2.5 py-1 text-sm",
} as const;

const GLYPH = {
  xs: "h-2 w-2",
  sm: "h-2.5 w-2.5",
  md: "h-3 w-3",
  lg: "h-3.5 w-3.5",
} as const;

export function AirportBadge({
  code,
  tone = "outline",
  role = "neutral",
  size = "md",
  className,
}: {
  code: string;
  tone?: BadgeTone;
  role?: BadgeRole;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const Icon = role === "origin" ? PlaneTakeoff : role === "destination" ? PlaneLanding : Plane;
  return (
    <span
      className={cn(
        "inline-flex items-center font-sans font-bold tracking-wide",
        SIZES[size],
        tone === "solid" && "border-flight-yellow bg-flight-yellow text-slate-950",
        tone === "outline" && "border-flight-yellow bg-slate-950/85 text-flight-yellow",
        tone === "muted" && "border-flight-yellow/45 bg-slate-950/70 text-flight-yellow/75",
        className,
      )}
    >
      <Icon
        className={cn("shrink-0", GLYPH[size], role === "neutral" && "-rotate-[20deg]")}
        aria-hidden="true"
      />
      {code}
    </span>
  );
}
