import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { EASE_OUT_EXPO } from "@/lib/motion";
import type { DayActivity } from "@/lib/testprep/insights";

/**
 * Charts for the Test Prep section, drawn as plain SVG.
 *
 * Every chart here uses the section's own three colours: the Bluebook blue for
 * the measured value, the yellow for a target or a highlight, and the muted
 * ink for tracks and axes. No chart library, so they theme with the section's
 * tokens and weigh nothing.
 */

const BLUE = "hsl(var(--bb-blue))";
const YELLOW = "hsl(var(--bb-rule))";
const TRACK = "hsl(var(--muted))";

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, from: number, to: number) {
  const a = polar(cx, cy, r, from);
  const b = polar(cx, cy, r, to);
  const large = to - from <= 180 ? 0 : 1;
  return `M ${a.x} ${a.y} A ${r} ${r} 0 ${large} 1 ${b.x} ${b.y}`;
}

/**
 * The score dial: a 240-degree arc from the floor to the ceiling of the test,
 * filled to the current estimate, with the target marked in yellow.
 */
export function ScoreGauge({
  value,
  target,
  min = 400,
  max = 1600,
  size = 220,
  caption,
}: {
  value: number | null;
  target: number;
  min?: number;
  max?: number;
  size?: number;
  caption?: ReactNode;
}) {
  const reduced = useReducedMotion();
  const S = 200;
  const cx = S / 2;
  const cy = S / 2 + 8;
  const r = 82;
  const start = -120;
  const end = 120;
  const frac = (v: number) => Math.min(1, Math.max(0, (v - min) / (max - min)));
  const valueDeg = value === null ? start : start + frac(value) * (end - start);
  const targetDeg = start + frac(target) * (end - start);
  const track = arcPath(cx, cy, r, start, end);
  const full = track;
  const tIn = polar(cx, cy, r - 13, targetDeg);
  const tOut = polar(cx, cy, r + 13, targetDeg);
  const len = (Math.PI * r * (end - start)) / 180;
  const shown = ((valueDeg - start) / (end - start)) * len;

  return (
    <div className="relative" style={{ width: size, height: size * 0.86 }}>
      <svg viewBox={`0 0 ${S} ${S * 0.86}`} className="h-full w-full overflow-visible" aria-hidden>
        <path d={track} fill="none" stroke={TRACK} strokeWidth={14} strokeLinecap="round" />
        {/* Tick marks every 200 points. */}
        {Array.from({ length: 7 }, (_, i) => {
          const d = start + (i / 6) * (end - start);
          const p1 = polar(cx, cy, r - 20, d);
          const p2 = polar(cx, cy, r - 25, d);
          return <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="hsl(var(--muted-foreground) / 0.35)" strokeWidth={1.5} strokeLinecap="round" />;
        })}
        {value !== null && (
          <motion.path
            d={full}
            fill="none"
            stroke={BLUE}
            strokeWidth={14}
            strokeLinecap="round"
            strokeDasharray={`${len} ${len}`}
            initial={{ strokeDashoffset: reduced ? len - shown : len }}
            animate={{ strokeDashoffset: len - shown }}
            transition={{ duration: reduced ? 0 : 1.1, ease: EASE_OUT_EXPO }}
          />
        )}
        <line x1={tIn.x} y1={tIn.y} x2={tOut.x} y2={tOut.y} stroke={YELLOW} strokeWidth={5} strokeLinecap="round" />
        <line x1={tIn.x} y1={tIn.y} x2={tOut.x} y2={tOut.y} stroke="hsl(var(--foreground) / 0.25)" strokeWidth={0.8} strokeLinecap="round" />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pt-4 text-center">
        {caption}
      </div>
    </div>
  );
}

/** A progress ring. `value` is 0-1; null draws the empty track only. */
export function Ring({
  value,
  size = 56,
  stroke = 6,
  color = BLUE,
  children,
  className,
}: {
  value: number | null;
  size?: number;
  stroke?: number;
  color?: string;
  children?: ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = value === null ? 0 : Math.min(1, Math.max(0, value));
  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={TRACK} strokeWidth={stroke} />
        {value !== null && (
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            initial={{ strokeDashoffset: reduced ? c * (1 - v) : c }}
            animate={{ strokeDashoffset: c * (1 - v) }}
            transition={{ duration: reduced ? 0 : 0.9, ease: EASE_OUT_EXPO }}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

export interface TrendPoint {
  id: string;
  label: string;
  value: number;
}

/**
 * A line over time with the area under it, an optional target line, and a
 * hover read-out. Values are plotted between `min` and `max`.
 */
export function TrendChart({
  points,
  min,
  max,
  target,
  format = (v) => String(Math.round(v)),
  height = 180,
  onPointClick,
}: {
  points: TrendPoint[];
  min: number;
  max: number;
  target?: number;
  format?: (v: number) => string;
  height?: number;
  onPointClick?: (p: TrendPoint) => void;
}) {
  const gid = useId().replace(/:/g, "");
  const reduced = useReducedMotion();
  const [hover, setHover] = useState<number | null>(null);
  // Drawn at the container's real width so type and dots stay the same size
  // whether the chart sits in a narrow card or across the whole page.
  const box = useRef<HTMLDivElement | null>(null);
  const [W, setW] = useState(600);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setW(Math.max(240, Math.round(el.clientWidth)));
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = height;
  const padL = 40;
  const padX = 18;
  const padTop = 22;
  const padBottom = 26;
  const x = (i: number) =>
    points.length <= 1 ? (padL + W - padX) / 2 : padL + (i / (points.length - 1)) * (W - padL - padX);
  const y = (v: number) => padTop + (1 - (v - min) / (max - min || 1)) * (H - padTop - padBottom);
  const line = points.map((p, i) => `${i ? "L" : "M"} ${x(i)} ${y(p.value)}`).join(" ");
  const area = points.length
    ? `${line} L ${x(points.length - 1)} ${H - padBottom} L ${x(0)} ${H - padBottom} Z`
    : "";
  const grid = [0, 0.25, 0.5, 0.75, 1].map((f) => min + f * (max - min));

  return (
    <div ref={box} className="relative w-full">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block overflow-visible" role="img" aria-label="Trend chart">
        <defs>
          <linearGradient id={`fill-${gid}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--bb-blue))" stopOpacity={0.22} />
            <stop offset="100%" stopColor="hsl(var(--bb-blue))" stopOpacity={0} />
          </linearGradient>
        </defs>
        {grid.map((g) => (
          <g key={g}>
            <line x1={padL} x2={W - padX} y1={y(g)} y2={y(g)} stroke="hsl(var(--border))" strokeDasharray="3 5" strokeWidth={1} />
            <text x={padL - 8} y={y(g) + 3} textAnchor="end" fontSize={10} fill="hsl(var(--muted-foreground))">
              {format(g)}
            </text>
          </g>
        ))}
        {target !== undefined && (
          <g>
            <line x1={padL} x2={W - padX} y1={y(target)} y2={y(target)} stroke={YELLOW} strokeWidth={2.5} />
            <text x={padL + 4} y={y(target) - 6} fontSize={10} fontWeight={700} fill="hsl(var(--foreground))">
              Target {format(target)}
            </text>
          </g>
        )}
        {points.length > 0 && (
          <>
            <motion.path
              d={area}
              fill={`url(#fill-${gid})`}
              initial={{ opacity: reduced ? 1 : 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            />
            <motion.path
              d={line}
              fill="none"
              stroke={BLUE}
              strokeWidth={3}
              strokeLinejoin="round"
              strokeLinecap="round"
              initial={{ pathLength: reduced ? 1 : 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: reduced ? 0 : 1, ease: EASE_OUT_EXPO }}
            />
          </>
        )}
        {points.map((p, i) => (
          <g key={p.id}>
            <circle
              cx={x(i)}
              cy={y(p.value)}
              r={hover === i ? 7 : 5}
              fill="hsl(var(--card))"
              stroke={BLUE}
              strokeWidth={3}
            />
            <rect
              x={x(i) - 20}
              y={0}
              width={40}
              height={H}
              fill="transparent"
              className={onPointClick ? "cursor-pointer" : undefined}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onPointClick?.(p)}
            />
            {i % Math.max(1, Math.ceil(points.length / 6)) === 0 || i === points.length - 1 ? (
              <text x={x(i)} y={H - 8} textAnchor="middle" fontSize={10} fill="hsl(var(--muted-foreground))">
                {p.label}
              </text>
            ) : null}
          </g>
        ))}
      </svg>
      {hover !== null && points[hover] && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-md bg-foreground px-2 py-1 text-[11px] font-semibold tabular-nums text-background shadow-md"
          style={{
            left: `${(x(hover) / W) * 100}%`,
            top: `${(y(points[hover].value) / H) * 100}%`,
            marginTop: -10,
          }}
        >
          {format(points[hover].value)}
        </div>
      )}
    </div>
  );
}

/**
 * A contribution-style calendar: one square per day, a column per week,
 * shaded by how many questions were answered.
 */
export function ActivityHeatmap({ days, goal }: { days: DayActivity[]; goal: number }) {
  // Pad the front so the first column starts on a Sunday.
  const cells = useMemo(() => {
    const first = days[0]?.date.getDay() ?? 0;
    const pad: (DayActivity | null)[] = Array.from({ length: first }, () => null);
    return [...pad, ...days];
  }, [days]);
  const weeks: (DayActivity | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const level = (n: number) => {
    if (n <= 0) return 0;
    if (n < goal * 0.34) return 1;
    if (n < goal * 0.67) return 2;
    if (n < goal) return 3;
    return 4;
  };
  const fill = ["hsl(var(--muted))", "hsl(var(--bb-blue) / 0.25)", "hsl(var(--bb-blue) / 0.5)", "hsl(var(--bb-blue) / 0.78)", "hsl(var(--bb-blue))"];
  const months: { col: number; label: string }[] = [];
  weeks.forEach((w, i) => {
    const d = w.find((c) => c)?.date;
    if (d && d.getDate() <= 7) months.push({ col: i, label: d.toLocaleDateString(undefined, { month: "short" }) });
  });

  return (
    <div className="w-full overflow-x-auto">
      <div className="inline-flex flex-col gap-1.5">
        <div className="relative ml-7 h-3.5 text-[10px] text-muted-foreground">
          {months.map((m) => (
            <span key={m.col} className="absolute" style={{ left: m.col * 19 }}>
              {m.label}
            </span>
          ))}
        </div>
        <div className="flex gap-1">
          <div className="mr-1 flex w-6 flex-col justify-between py-[1px] text-[10px] text-muted-foreground">
            <span>Sun</span>
            <span>Wed</span>
            <span>Sat</span>
          </div>
          {weeks.map((w, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {Array.from({ length: 7 }, (_, di) => {
                const c = w[di];
                if (!c) return <span key={di} className="h-[15px] w-[15px]" />;
                return (
                  <span
                    key={di}
                    title={`${c.date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}: ${c.answered} answered`}
                    className="h-[15px] w-[15px] rounded-[4px] ring-1 ring-inset ring-black/[0.04] transition-transform hover:scale-125"
                    style={{ background: fill[level(c.answered)] }}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <div className="ml-7 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          Less
          {fill.map((f, i) => (
            <span key={i} className="h-2.5 w-2.5 rounded-[3px]" style={{ background: f }} />
          ))}
          More
        </div>
      </div>
    </div>
  );
}

/** Answers per day for the last couple of weeks, with the goal as a line. */
export function DayBars({ days, goal }: { days: DayActivity[]; goal: number }) {
  const reduced = useReducedMotion();
  const H = 84;
  const peak = Math.max(goal * 1.15, ...days.map((d) => d.answered), 1);
  const goalY = (goal / peak) * H;
  return (
    <div>
      <div className="relative" style={{ height: H }}>
        <div
          aria-hidden
          className="absolute inset-x-0 border-t-2 border-dashed border-[hsl(var(--bb-rule))]"
          style={{ bottom: goalY }}
        />
        <span
          aria-hidden
          className="absolute right-0 -translate-y-full rounded bg-[hsl(var(--bb-rule))] px-1 text-[9px] font-bold leading-[14px] text-black"
          style={{ bottom: goalY + 2 }}
        >
          goal
        </span>
        <div className="absolute inset-0 flex items-end gap-1.5">
          {days.map((d, i) => {
            const h = Math.max(d.answered ? 5 : 2, (d.answered / peak) * H);
            const isToday = i === days.length - 1;
            return (
              <motion.div
                key={d.key}
                title={`${d.date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}: ${d.answered} answered`}
                className={cn(
                  "min-w-0 flex-1 rounded-t-[4px]",
                  d.answered >= goal ? "bg-[hsl(var(--bb-blue))]" : d.answered ? "bg-[hsl(var(--bb-blue)/0.4)]" : "bg-muted",
                  isToday && "outline outline-2 outline-offset-1 outline-[hsl(var(--bb-rule))]",
                )}
                initial={{ height: reduced ? h : 0 }}
                animate={{ height: h }}
                transition={{ duration: reduced ? 0 : 0.6, delay: reduced ? 0 : i * 0.02, ease: EASE_OUT_EXPO }}
              />
            );
          })}
        </div>
      </div>
      <div className="mt-1.5 flex gap-1.5">
        {days.map((d, i) => (
          <span
            key={d.key}
            className={cn(
              "min-w-0 flex-1 text-center text-[9.5px] tabular-nums",
              i === days.length - 1 ? "font-bold text-foreground" : "text-muted-foreground",
            )}
          >
            {d.date.toLocaleDateString(undefined, { weekday: "narrow" })}
          </span>
        ))}
      </div>
    </div>
  );
}

/** A labelled horizontal bar for a 0-1 share, with its number. */
export function ShareBar({
  label,
  value,
  sub,
  color = BLUE,
}: {
  label: ReactNode;
  value: number | null;
  sub?: ReactNode;
  color?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate text-[13px] font-medium text-foreground">{label}</span>
        <span className="shrink-0 text-[13px] font-semibold tabular-nums text-foreground">
          {value === null ? "—" : `${Math.round(value * 100)}%`}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: reduced ? `${(value ?? 0) * 100}%` : 0 }}
          animate={{ width: `${(value ?? 0) * 100}%` }}
          transition={{ duration: reduced ? 0 : 0.8, ease: EASE_OUT_EXPO }}
        />
      </div>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
