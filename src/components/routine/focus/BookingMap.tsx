/**
 * The booking map.
 *
 * A regional view rather than the whole world, and it reframes itself as the
 * duration changes: dial up the minutes and the camera pulls back to take in
 * everywhere newly reachable. That single behaviour is what makes the ruler
 * feel like it is buying distance rather than setting a number — you watch the
 * range grow.
 *
 * The reachable disc is drawn honestly. Its radius is the great-circle distance
 * the chosen duration buys, converted to degrees of latitude, so a destination
 * inside the ring genuinely is inside the budget and one outside genuinely is
 * not. It is a rough projection at high latitudes, which is why the ring is a
 * soft gradient rather than a hard line — it suggests reach without claiming a
 * precision the equirectangular projection cannot deliver.
 *
 * Badges are HTML overlaid on the SVG, not SVG text. They need the same border,
 * radius and font treatment as every other airport badge in the feature, and
 * duplicating that in SVG primitives would guarantee the two drift apart.
 *
 * That overlay only lands correctly if the viewBox we hand the SVG has the
 * *same* aspect ratio as the container actually rendered at — `preserveAspectRatio="xMidYMid slice"`
 * crops whichever axis overflows to make a mismatched viewBox cover the box,
 * and a percentage computed from the un-cropped viewBox then points at the
 * wrong pixel. So the container is measured with a `ResizeObserver` and the
 * camera window is expanded (never cropped) to match its real aspect before
 * `pct()` ever runs — the same "cover" arithmetic the browser is doing
 * internally, done once so both layers agree on where things are.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { AIRPORTS, type Airport } from "@/lib/focus-flight/airports";
import { MAP_HEIGHT, MAP_WIDTH, project, routeSegments, toPath } from "@/lib/focus-flight/geo";
import { AirportBadge } from "./AirportBadge";

/** Degrees of latitude per kilometre. One degree is ~111 km anywhere. */
const DEG_PER_KM = 1 / 111;

export interface Candidate {
  airport: Airport;
  km: number;
  minutes: number;
}

export function BookingMap({
  origin,
  candidates,
  selected,
  reachKm,
  onPick,
  className,
}: {
  origin: Airport;
  candidates: Candidate[];
  selected: Airport | null;
  /** Great-circle distance the current duration buys. Drives the framing. */
  reachKm: number;
  onPick: (a: Airport) => void;
  className?: string;
}) {
  const o = useMemo(() => project(origin), [origin]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [boxAspect, setBoxAspect] = useState(1512 / 496);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setBoxAspect(width / height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /**
   * The camera. Fits the reachable disc with headroom, clamped to the map so
   * it never pans off the edge of the world at extreme durations.
   */
  const view = useMemo(() => {
    const radiusDeg = Math.max(6, reachKm * DEG_PER_KM);
    // Longitude degrees are narrower than latitude ones away from the equator,
    // so the horizontal half-width is widened by the latitude's cosine.
    const cos = Math.max(0.25, Math.cos((origin.lat * Math.PI) / 180));
    let halfH = Math.min(MAP_HEIGHT / 2, (radiusDeg * 1.5 * MAP_HEIGHT) / 180);
    let halfW = Math.min(MAP_WIDTH / 2, (halfH * 2) / cos);

    // Match the container's real aspect by growing the narrower axis — never
    // cropping — so the viewBox we hand the SVG is exactly what the box shows,
    // and `pct()` below can trust it.
    if (halfW / halfH > boxAspect) {
      halfH = halfW / boxAspect;
    } else {
      halfW = halfH * boxAspect;
    }
    halfH = Math.min(MAP_HEIGHT / 2, halfH);
    halfW = Math.min(MAP_WIDTH / 2, halfW);

    let x = o.x - halfW;
    let y = o.y - halfH;
    const w = Math.min(MAP_WIDTH, halfW * 2);
    const h = Math.min(MAP_HEIGHT, halfH * 2);
    x = Math.max(0, Math.min(MAP_WIDTH - w, x));
    y = Math.max(0, Math.min(MAP_HEIGHT - h, y));
    return { x, y, w, h };
  }, [o, origin.lat, reachKm, boxAspect]);

  /** World point to a percentage inside the current camera box. */
  const pct = (p: { x: number; y: number }) => ({
    left: `${((p.x - view.x) / view.w) * 100}%`,
    top: `${((p.y - view.y) / view.h) * 100}%`,
  });

  const dest = selected ? project(selected) : null;
  const reachRadiusPx = (reachKm * DEG_PER_KM * MAP_HEIGHT) / 180;

  // Only badge what is actually on camera — forty offscreen badges are forty
  // wasted nodes and a guaranteed layout jank at every duration change.
  const visible = candidates.filter(({ airport }) => {
    const p = project(airport);
    return p.x >= view.x - 20 && p.x <= view.x + view.w + 20 && p.y >= view.y - 20 && p.y <= view.y + view.h + 20;
  });

  return (
    <div ref={containerRef} className={cn("relative overflow-hidden bg-[#0a1020]", className)}>
      <motion.svg
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        animate={{ opacity: 1 }}
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="reach-disc">
            <stop offset="55%" stopColor="hsl(210 90% 70%)" stopOpacity="0.10" />
            <stop offset="100%" stopColor="hsl(210 90% 70%)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Graticule, every 10 degrees. Fine enough to read as a chart at any
            zoom the ruler can reach. */}
        <g stroke="currentColor" className="text-white/[0.05]" strokeWidth={view.w / 900}>
          {Array.from({ length: 37 }, (_, i) => {
            const x = (i / 36) * MAP_WIDTH;
            return <line key={`v${i}`} x1={x} y1={0} x2={x} y2={MAP_HEIGHT} />;
          })}
          {Array.from({ length: 19 }, (_, i) => {
            const y = (i / 18) * MAP_HEIGHT;
            return <line key={`h${i}`} x1={0} y1={y} x2={MAP_WIDTH} y2={y} />;
          })}
        </g>

        {/* The atlas as a point field: every airport at its true position. */}
        <g>
          {AIRPORTS.map((a) => {
            const p = project(a);
            return <circle key={a.code} cx={p.x} cy={p.y} r={view.w / 1100} className="fill-white/25" />;
          })}
        </g>

        {/* What the current duration buys. */}
        <motion.circle
          cx={o.x}
          cy={o.y}
          animate={{ r: reachRadiusPx }}
          transition={{ type: "spring", stiffness: 120, damping: 22 }}
          fill="url(#reach-disc)"
          stroke="hsl(210 90% 75%)"
          strokeOpacity={0.18}
          strokeWidth={view.w / 900}
        />

        {/* Radar sweep — a ring expanding from the origin on a loop, echoing the
            reference app's "we are scanning for reach" ping rather than a static
            disc alone. Two rings, offset in phase, so one is always mid-fade. */}
        {[0, 1.1].map((delay) => (
          <motion.circle
            key={delay}
            cx={o.x}
            cy={o.y}
            fill="none"
            stroke="white"
            strokeWidth={view.w / 700}
            initial={{ r: view.w / 190, opacity: 0.5 }}
            animate={{ r: reachRadiusPx, opacity: 0 }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut", delay }}
          />
        ))}

        {/* The chosen route. */}
        {selected && dest && (
          <g fill="none" strokeLinecap="round">
            {routeSegments(origin, selected, 64).map((seg, i) => (
              <path
                key={i}
                d={toPath(seg)}
                stroke="white"
                strokeWidth={view.w / 380}
                strokeOpacity={0.95}
              />
            ))}
          </g>
        )}

        {/* Origin. A filled dot with a white collar, the way a "you are here"
            marker reads on every map anyone has used. */}
        <circle cx={o.x} cy={o.y} r={view.w / 190} className="fill-white" />
        <circle cx={o.x} cy={o.y} r={view.w / 300} className="fill-slate-950" />
      </motion.svg>

      {/* Badges --------------------------------------------------------- */}
      <div className="absolute inset-0">
        {visible.map(({ airport }) => {
          const isSelected = selected?.code === airport.code;
          return (
            <button
              key={airport.code}
              type="button"
              onClick={() => onPick(airport)}
              style={pct(project(airport))}
              className={cn(
                "absolute -translate-x-1/2 -translate-y-1/2 transition-transform",
                isSelected ? "z-20 scale-110" : "z-10 hover:scale-105",
              )}
              aria-label={`${airport.country}, ${airport.code}`}
            >
              <AirportBadge
                code={airport.code}
                role="destination"
                tone={isSelected ? "solid" : "muted"}
                size="sm"
              />
            </button>
          );
        })}

        {/* Origin badge sits above the dot so it never covers it. */}
        <span
          style={pct(o)}
          className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-[calc(100%+0.6rem)]"
        >
          <AirportBadge code={origin.code} role="origin" tone="solid" size="sm" />
        </span>
      </div>
    </div>
  );
}
