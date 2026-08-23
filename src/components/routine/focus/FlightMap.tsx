/**
 * The route map.
 *
 * There is no tile layer here, and that is the design rather than a shortcut.
 * A satellite or street basemap inside a dark cinematic cabin reads as an
 * embedded widget from another product — wrong palette, wrong density, wrong
 * everything — and it would put a keyed third-party request on a page students
 * open every day.
 *
 * What draws the world instead is the atlas itself: every airport in the
 * dataset plotted at its true position. Airports cluster where cities are and
 * cities cluster where land is, so 160 points at real coordinates read as
 * continents without a single byte of coastline data. The graticule behind them
 * supplies the frame. Everything is projected through the same `project()` the
 * aircraft position uses, so the plane cannot drift off its own line.
 *
 * The whole thing is one SVG driven by a `progress` number. It re-renders on
 * the session's pulse, does no work per frame beyond interpolating one point,
 * and makes zero network requests after mount.
 */
import { useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { AIRPORTS, type Airport } from "@/lib/focus-flight/airports";
import {
  MAP_HEIGHT,
  MAP_WIDTH,
  bearing,
  interpolate,
  project,
  routeSegments,
  toPath,
} from "@/lib/focus-flight/geo";

export function FlightMap({
  origin,
  destination,
  progress,
  /** Codes of airports the student has already flown to, drawn brighter. */
  visitedCodes,
  /** Hides the aircraft and the flown-path highlight. For previews. */
  preview = false,
  className,
}: {
  origin: Airport;
  destination: Airport;
  progress: number;
  visitedCodes?: Set<string>;
  preview?: boolean;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(1, progress));

  const segments = useMemo(() => routeSegments(origin, destination), [origin, destination]);
  const paths = useMemo(() => segments.map(toPath), [segments]);

  const from = useMemo(() => project(origin), [origin]);
  const to = useMemo(() => project(destination), [destination]);

  // The aircraft, and the heading it should be drawn at. Taken from a point
  // slightly ahead on the same curve so the nose follows the arc rather than
  // pointing at the destination in a straight line.
  const plane = useMemo(() => {
    const here = interpolate(origin, destination, clamped);
    const ahead = interpolate(origin, destination, Math.min(1, clamped + 0.01));
    return { point: project(here), heading: bearing(here, ahead) };
  }, [origin, destination, clamped]);

  const gradientId = `route-${origin.code}-${destination.code}`;

  return (
    <svg
      viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
      className={cn("h-full w-full", className)}
      role="img"
      aria-label={`Route map from ${origin.country} to ${destination.country}, ${Math.round(clamped * 100)} percent complete`}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="0.25" />
          <stop offset="50%" stopColor="hsl(190 90% 60%)" stopOpacity="0.9" />
          <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0.25" />
        </linearGradient>
        <filter id={`${gradientId}-glow`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Graticule. Every 30 degrees of longitude, 20 of latitude. */}
      <g stroke="currentColor" className="text-white/[0.06]" strokeWidth="0.6">
        {Array.from({ length: 11 }, (_, i) => {
          const x = (i / 12) * MAP_WIDTH + MAP_WIDTH / 12;
          return <line key={`v${i}`} x1={x} y1={0} x2={x} y2={MAP_HEIGHT} />;
        })}
        {Array.from({ length: 8 }, (_, i) => {
          const y = (i / 9) * MAP_HEIGHT + MAP_HEIGHT / 9;
          return <line key={`h${i}`} x1={0} y1={y} x2={MAP_WIDTH} y2={y} />;
        })}
      </g>

      {/* The equator, marked slightly stronger so the map has an orientation. */}
      <line
        x1={0}
        y1={MAP_HEIGHT / 2}
        x2={MAP_WIDTH}
        y2={MAP_HEIGHT / 2}
        stroke="currentColor"
        className="text-white/10"
        strokeWidth="0.8"
        strokeDasharray="4 6"
      />

      {/* The atlas as a point field. This is what makes it read as a world. */}
      <g>
        {AIRPORTS.map((a) => {
          const p = project(a);
          const isEndpoint = a.code === origin.code || a.code === destination.code;
          if (isEndpoint) return null;
          const visited = visitedCodes?.has(a.code);
          return (
            <circle
              key={a.code}
              cx={p.x}
              cy={p.y}
              r={visited ? 1.9 : 1.1}
              className={visited ? "fill-accent/60" : "fill-white/20"}
            />
          );
        })}
      </g>

      {/* The route: a dim full-length track, then the flown portion over it. */}
      <g fill="none" strokeLinecap="round">
        {paths.map((d, i) => (
          <path key={`track-${i}`} d={d} stroke="currentColor" className="text-white/15" strokeWidth="1.4" />
        ))}
        {!preview &&
          paths.map((d, i) => (
            <path
              key={`flown-${i}`}
              d={d}
              stroke={`url(#${gradientId})`}
              strokeWidth="2.2"
              filter={`url(#${gradientId}-glow)`}
              // One dash as long as the whole path, offset by how much is left.
              // pathLength normalises it to 1 so this works for every segment
              // regardless of its real length.
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - clamped}
            />
          ))}
      </g>

      {/* Endpoints. */}
      <Endpoint point={from} label={origin.code} state="origin" reached />
      <Endpoint point={to} label={destination.code} state="destination" reached={clamped >= 1} />

      {/* The aircraft. */}
      {!preview && (
        <motion.g
          animate={{ x: plane.point.x, y: plane.point.y }}
          transition={{ type: "tween", ease: "linear", duration: 0.5 }}
          initial={false}
        >
          <g transform={`rotate(${plane.heading})`}>
            <circle r="9" className="fill-accent/20" />
            {/* Nose-up triangle, drawn pointing north so `rotate(bearing)`
                aims it correctly without a second offset to reason about. */}
            <path
              d="M0 -6.5 L4.4 5 L0 2.6 L-4.4 5 Z"
              className="fill-white"
              stroke="hsl(var(--accent))"
              strokeWidth="0.8"
              strokeLinejoin="round"
            />
          </g>
        </motion.g>
      )}
    </svg>
  );
}

function Endpoint({
  point,
  label,
  state,
  reached,
}: {
  point: { x: number; y: number };
  label: string;
  state: "origin" | "destination";
  reached: boolean;
}) {
  return (
    <g transform={`translate(${point.x} ${point.y})`}>
      {reached && <circle r="7" className={state === "origin" ? "fill-accent/20" : "fill-emerald-400/25"} />}
      <circle
        r="3"
        className={
          reached
            ? state === "origin"
              ? "fill-accent"
              : "fill-emerald-400"
            : "fill-white/40"
        }
        stroke="hsl(var(--background))"
        strokeWidth="1"
      />
      <text
        x={0}
        y={-11}
        textAnchor="middle"
        className={cn(
          // Route endpoints carry the marker yellow, the same as the badges
          // elsewhere, so a code means the same thing wherever it appears.
          "font-sans text-[11px] font-bold italic tracking-wider",
          reached && state === "destination" ? "fill-emerald-300" : "fill-flight-yellow",
        )}
      >
        {label}
      </text>
    </g>
  );
}
