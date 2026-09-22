import { useRef, useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DottedMap from "dotted-map";
import { useTheme } from "next-themes";

/**
 * A dotted world map with animated arcs between points.
 *
 * ADAPTED FROM THE UPSTREAM COMPONENT, in three ways that matter:
 *
 *  1. `next/image` is gone. This is a Vite + React app, not Next.js — there is
 *     no Next runtime to provide that component, and installing `next` to get
 *     one image wrapper would pull a whole framework into the bundle for no
 *     benefit. A plain `<img>` does the same job here: the source is an inline
 *     data URI, so there is nothing for an image optimiser to optimise.
 *  2. `motion/react` is imported as `framer-motion`. The project already ships
 *     framer-motion 12, which is the same library under its previous name;
 *     adding `motion` as well would put two copies of it in the bundle.
 *  3. The map is drawn on a transparent background using the site's own tokens
 *     rather than hard white/black, so it sits on the cream landing surface
 *     instead of punching a white rectangle through it.
 */

interface MapProps {
  dots?: Array<{
    start: { lat: number; lng: number; label?: string };
    end: { lat: number; lng: number; label?: string };
  }>;
  lineColor?: string;
  showLabels?: boolean;
  animationDuration?: number;
  loop?: boolean;
}

export function WorldMap({
  dots = [],
  lineColor = "#4465d8",
  showLabels = true,
  animationDuration = 2,
  loop = true,
}: MapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredLocation, setHoveredLocation] = useState<string | null>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  /*
   * Browser only, and not for the usual `window` reason.
   *
   * `dotted-map` builds the land mass as thousands of <circle> elements and we
   * hand the result to an <img> as a data URI, so the markup is tens of
   * kilobytes of base64-ish text with no words in it. Rendering that during
   * prerender pushed the landing page's text-to-HTML ratio to 0.3%, the build's
   * content-readiness check refused to write the page, and the whole site fell
   * back to shipping an empty SPA shell - losing static HTML on the single page
   * that needs it most.
   *
   * Deferring to the client keeps the prerendered HTML full of real text. It
   * also avoids a hydration mismatch, since `resolvedTheme` is undefined until
   * next-themes has read the user's preference.
   */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const map = useMemo(() => (mounted ? new DottedMap({ height: 100, grid: "diagonal" }) : null), [mounted]);

  const svgMap = useMemo(
    () =>
      map?.getSVG({
        radius: 0.22,
        // The land dots. Transparent plate, so whatever surface the section
        // uses shows through instead of a white or black box.
        color: isDark ? "#FFFFFF33" : "#0B152B33",
        shape: "circle",
        backgroundColor: "transparent",
      }),
    [map, isDark],
  );

  const projectPoint = (lat: number, lng: number) => ({
    x: (lng + 180) * (800 / 360),
    y: (90 - lat) * (400 / 180),
  });

  const createCurvedPath = (
    start: { x: number; y: number },
    end: { x: number; y: number },
  ) => {
    const midX = (start.x + end.x) / 2;
    const midY = Math.min(start.y, end.y) - 50;
    return `M ${start.x} ${start.y} Q ${midX} ${midY} ${end.x} ${end.y}`;
  };

  const staggerDelay = 0.3;
  const totalAnimationTime = dots.length * staggerDelay + animationDuration;
  const pauseTime = 2;
  const fullCycleDuration = totalAnimationTime + pauseTime;

  const frameClass =
    "relative w-full overflow-hidden rounded-lg font-sans aspect-[2/1] md:aspect-[2.5/1] lg:aspect-[2/1]";

  /*
   * Nothing at all until mounted, holding the same box so the page does not
   * shift when it arrives. Rendering the arcs on the server also emitted a
   * React warning - framer-motion passes `offsetDistance` straight through to
   * the <circle> during SSR, which is not a DOM attribute React knows.
   */
  if (!mounted || !svgMap) return <div className={frameClass} aria-hidden="true" />;

  return (
    <div className={frameClass}>
      {(
      <img
        src={`data:image/svg+xml;utf8,${encodeURIComponent(svgMap)}`}
        className="pointer-events-none h-full w-full select-none object-cover [mask-image:linear-gradient(to_bottom,transparent,black_10%,black_90%,transparent)]"
        alt="World map showing the countries Pathforge students are in"
        height={495}
        width={1056}
        draggable={false}
      />
      )}
      <svg
        ref={svgRef}
        viewBox="0 0 800 400"
        className="pointer-events-auto absolute inset-0 h-full w-full select-none"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="pf-map-path" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="white" stopOpacity="0" />
            <stop offset="5%" stopColor={lineColor} stopOpacity="1" />
            <stop offset="95%" stopColor={lineColor} stopOpacity="1" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <filter id="pf-map-glow">
            <feMorphology operator="dilate" radius="0.5" />
            <feGaussianBlur stdDeviation="1" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {dots.map((dot, i) => {
          const startPoint = projectPoint(dot.start.lat, dot.start.lng);
          const endPoint = projectPoint(dot.end.lat, dot.end.lng);
          const startTime = (i * staggerDelay) / fullCycleDuration;
          const endTime = (i * staggerDelay + animationDuration) / fullCycleDuration;
          const resetTime = totalAnimationTime / fullCycleDuration;

          return (
            <g key={`path-group-${i}`}>
              <motion.path
                d={createCurvedPath(startPoint, endPoint)}
                fill="none"
                stroke="url(#pf-map-path)"
                strokeWidth="1"
                initial={{ pathLength: 0 }}
                animate={loop ? { pathLength: [0, 0, 1, 1, 0] } : { pathLength: 1 }}
                transition={
                  loop
                    ? {
                        duration: fullCycleDuration,
                        times: [0, startTime, endTime, resetTime, 1],
                        ease: "easeInOut",
                        repeat: Infinity,
                        repeatDelay: 0,
                      }
                    : {
                        duration: animationDuration,
                        delay: i * staggerDelay,
                        ease: "easeInOut",
                      }
                }
              />
              {loop && (
                <motion.circle
                  r="4"
                  fill={lineColor}
                  initial={{ offsetDistance: "0%", opacity: 0 }}
                  animate={{
                    offsetDistance: [null, "0%", "100%", "100%", "100%"],
                    opacity: [0, 0, 1, 0, 0],
                  }}
                  transition={{
                    duration: fullCycleDuration,
                    times: [0, startTime, endTime, resetTime, 1],
                    ease: "easeInOut",
                    repeat: Infinity,
                    repeatDelay: 0,
                  }}
                  style={{
                    offsetPath: `path('${createCurvedPath(startPoint, endPoint)}')`,
                  }}
                />
              )}
            </g>
          );
        })}

        {/* One node per location, not one per arc.

            Every arc starts at the hub, so mapping over `dots` drew the hub's
            marker and label six times on the same pixel - six DOM nodes, six
            hover targets and six copies of the word "India" stacked on each
            other. Deduplicating by coordinate draws each place once. */}
        {Array.from(
          dots
            .flatMap((dot) => [dot.start, dot.end])
            .reduce((acc, point) => {
              const key = `${point.lat},${point.lng}`;
              if (!acc.has(key)) acc.set(key, point);
              return acc;
            }, new Map<string, { lat: number; lng: number; label?: string }>())
            .values(),
        ).map((point, i, all) => {
          const p = projectPoint(point.lat, point.lng);

          /*
           * Flip the label under the marker when it would land on one already
           * placed. India and the UAE are 25 degrees apart, which at this
           * projection put their labels on top of each other - "United Arab
           * Emirates" covered "India" completely. Checked against the points
           * drawn before this one, so the decision is stable frame to frame.
           */
          const LABEL_W = 92;
          const LABEL_H = 26;
          const collides = all.slice(0, i).some((other) => {
            const q = projectPoint(other.lat, other.lng);
            return Math.abs(q.x - p.x) < LABEL_W && Math.abs(q.y - p.y) < LABEL_H;
          });
          const labelY = collides ? p.y + 8 : p.y - 34;

          return (
            <g key={`point-${i}`}>
              <motion.g
                onHoverStart={() => point.label && setHoveredLocation(point.label)}
                onHoverEnd={() => setHoveredLocation(null)}
                className="cursor-pointer"
                whileHover={{ scale: 1.2 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <circle cx={p.x} cy={p.y} r="3" fill={lineColor} filter="url(#pf-map-glow)" />
                <circle cx={p.x} cy={p.y} r="3" fill={lineColor} opacity="0.5">
                  <animate attributeName="r" from="3" to="12" dur="2s" begin={`${i * 0.25}s`} repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.6" to="0" dur="2s" begin={`${i * 0.25}s`} repeatCount="indefinite" />
                </circle>
              </motion.g>

              {showLabels && point.label && (
                <motion.g
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 * i + 0.3, duration: 0.5 }}
                  className="pointer-events-none"
                >
                  {/* 180 wide, not 120: "United Arab Emirates" was being
                      clipped by the foreignObject box. */}
                  <foreignObject x={p.x - 90} y={labelY} width="180" height="28" className="block">
                    <div className="flex h-full items-center justify-center">
                      <span className="whitespace-nowrap rounded-md border border-border bg-background/95 px-2 py-0.5 text-[11px] font-medium text-foreground shadow-sm">
                        {point.label}
                      </span>
                    </div>
                  </foreignObject>
                </motion.g>
              )}
            </g>
          );
        })}

      </svg>

      <AnimatePresence>
        {hoveredLocation && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-4 left-4 rounded-lg border border-border bg-background/90 px-3 py-2 text-sm font-medium text-foreground backdrop-blur-sm sm:hidden"
          >
            {hoveredLocation}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default WorldMap;
