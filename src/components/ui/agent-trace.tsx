import * as React from "react";
import { Bot, CircleAlert, Cpu, FileText, Pause, Play, Wrench, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * AgentTrace — a run on a time axis that you can scrub.
 *
 * Three deliberate departures from the component as published, each forced by
 * this codebase rather than by taste:
 *
 * 1. React 18, not 19. A function component does not receive `ref` through
 *    props here, so the root ref is exposed with `forwardRef` instead of being
 *    destructured out of the props object.
 * 2. `formatTime`, `formatDuration` and `ticks` are new optional props. The
 *    published component hard-codes a millisecond axis that tops out at one
 *    minute and writes positions and lengths with the same formatter. The usage
 *    page plots a seven-day window, where "604800000ms" is not a tick label and
 *    a position ("Wed") is not a length ("2d"). All three default to the
 *    original behaviour, so an actual agent trace still renders as before.
 * 3. Container-query variants (`@md/trace:` and friends) need
 *    `@tailwindcss/container-queries`, registered in tailwind.config.ts for
 *    this component. That plugin implements only min-width variants, so the
 *    published `@max-sm/trace:hidden` classes — which emit no CSS at all and
 *    fail silently — are written here as `hidden @sm/trace:block` instead.
 */

/** What produced the span. Drives the icon and whether the bar uses the accent color. */
export type SpanKind = "agent" | "model" | "tool" | "io";

/** How the span finished. `cached` means it returned without doing the work. */
export type SpanStatus = "ok" | "error" | "cached";

export interface TraceSpan {
  /** Stable id. Used for React keys and for `parentId` links. */
  id: string;
  /** Tool, model or sub-agent name, e.g. `search_docs`. Rendered in the name gutter. */
  label: string;
  /** Start offset in milliseconds from the beginning of the run. */
  start: number;
  /** End offset in milliseconds. For a span still in flight, pass the current time. */
  end: number;
  /** Defaults to `"tool"`. `agent` and `model` spans are drawn in the theme's primary color. */
  kind?: SpanKind;
  /** Defaults to `"ok"`. `error` draws the bar in the destructive color. */
  status?: SpanStatus;
  /** Id of the span this one runs inside. Children are indented under their parent. */
  parentId?: string;
  /** One-line result shown on the right once the span finishes, e.g. `"12 matches"`. */
  detail?: string;
  /** Tokens billed to this span. Counts up as the span replays; shown instead of `detail`. */
  tokens?: number;
  /** Attempt number. Anything above 1 renders a `×n` retry chip next to the label. */
  attempt?: number;
}

export interface AgentTraceProps extends React.ComponentProps<"div"> {
  /** The run. Order is derived from `start` and `parentId`, so the array can be in any order. */
  spans: TraceSpan[];
  /** Total run length in milliseconds. Defaults to the largest `end` in `spans`. */
  duration?: number;
  /** Run identifier shown in the header, e.g. `run_7c41f2`. */
  runId?: string;
  /** Model or agent name shown next to the run id. */
  model?: string;
  /**
   * Replaces the "`model` · N spans" line in the header outright. "Spans" is the
   * right word for an agent run and the wrong one for anything else, and a
   * caller plotting something other than an agent run usually has a better
   * count to show than the row total.
   */
  subtitle?: React.ReactNode;
  /** Playhead position in milliseconds. Changing it seeks. Reduced motion pins it to the end of the run. */
  defaultTime?: number;
  /** Start replaying on mount. Ignored under `prefers-reduced-motion`. */
  autoPlay?: boolean;
  /** Restart after the run finishes. Off by default: a finished run is the best-looking resting state. */
  loop?: boolean;
  /** Playback rate. 1 replays the run in real time. */
  speed?: number;
  /** Pause at the end of the run before looping, in milliseconds. */
  holdMs?: number;
  /** Show the time ruler and its gridlines. */
  showRuler?: boolean;
  /** Show the play button, the scrub rail and the clock. */
  showTransport?: boolean;
  /** Show token counts for spans that carry them. */
  showTokens?: boolean;
  /** Width of the name gutter in pixels, used once the card itself is at least 448px wide. */
  labelWidth?: number;
  /** Height of one span row in pixels. */
  rowHeight?: number;
  /**
   * How an offset is written. Defaults to a millisecond/second clock. Override
   * when the axis is not sub-minute — a calendar window, say — so the ruler, the
   * durations and the transport clock all speak the same units.
   */
  formatTime?: (ms: number) => string;
  /**
   * How a *length* is written, as opposed to a position. Defaults to
   * `formatTime`, which is right whenever the axis is elapsed time and an
   * offset and a duration mean the same thing. They come apart the moment the
   * axis is a calendar: offset 172800000 is "Wed", but a span of that length is
   * "2d". Pass both and the ruler reads as dates while the rows read as lengths.
   */
  formatDuration?: (ms: number) => string;
  /** Explicit gridline offsets. Defaults to a "nice" millisecond scale. */
  ticks?: number[];
  /** Called when a row is activated. The playhead also seeks to that span's start. */
  onSpanSelect?: (span: TraceSpan) => void;
}

interface LaidSpan extends TraceSpan {
  depth: number;
  dur: number;
}

interface RowHandle {
  el: HTMLElement;
  meta: HTMLElement | null;
  dur: HTMLElement | null;
  status: HTMLElement | null;
  span: LaidSpan;
  lastP: number;
  lastState: string;
  lastMeta: string;
  lastDur: string;
}

const KIND_ICON = { agent: Bot, model: Cpu, tool: Wrench, io: FileText } as const;
const NICE_TICKS = [50, 100, 250, 500, 1000, 2000, 2500, 5000, 10_000, 30_000, 60_000];

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/** Deterministic thousands separator — `toLocaleString` differs between server and client. */
const groupDigits = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

const defaultFormatMs = (ms: number) =>
  ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(ms < 10_000 ? 2 : 1)}s`;

const STATUS_WORD = { queued: "queued", running: "running", done: "succeeded", error: "failed" } as const;

/**
 * The row's status in words, for the screen-reader-only line. Shared so the
 * first render and the playhead loop can never disagree.
 */
const statusWord = (span: LaidSpan, state: keyof typeof STATUS_WORD) =>
  state === "done" && span.status === "cached" ? "served from cache" : STATUS_WORD[state];

/** Layout runs in the browser only, where useLayoutEffect avoids a frame of the finished run. */
const useIsomorphicLayoutEffect = typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;

/** Flatten spans into rows: children under their parent, siblings by start time; cycles and orphans tolerated. */
function layout(spans: TraceSpan[]): LaidSpan[] {
  const children = new Map<string, TraceSpan[]>();
  const ids = new Set(spans.map((s) => s.id));
  for (const s of spans) {
    const key = s.parentId && s.parentId !== s.id && ids.has(s.parentId) ? s.parentId : "";
    const list = children.get(key);
    if (list) list.push(s);
    else children.set(key, [s]);
  }
  const out: LaidSpan[] = [];
  const seen = new Set<string>();
  const walk = (parent: string, depth: number) => {
    for (const kid of (children.get(parent) ?? []).slice().sort((a, b) => a.start - b.start)) {
      if (seen.has(kid.id)) continue;
      seen.add(kid.id);
      out.push({ ...kid, depth, dur: Math.max(0, kid.end - kid.start) });
      walk(kid.id, depth + 1);
    }
  };
  walk("", 0);
  for (const s of spans) if (!seen.has(s.id)) out.push({ ...s, depth: 0, dur: Math.max(0, s.end - s.start) });
  return out;
}

/**
 * What the result column says. Tokens win when a span has them and `showTokens`
 * is on, because they are the number that makes a run legible as an agent run;
 * `detail` is both the fallback for spans without tokens and what the whole
 * column shows when `showTokens` is off. Either way a result only appears once
 * the playhead has finished the span — you do not know the answer before it
 * returns.
 */
const metaText = (span: LaidSpan, progress: number, showTokens: boolean) =>
  span.tokens != null && showTokens
    ? `${groupDigits(Math.round(span.tokens * progress))} tk`
    : progress >= 1
      ? (span.detail ?? "")
      : "";

interface TraceSpanRowProps {
  span: LaidSpan;
  /** Position in the flattened run, used as the key into the loop's row table. */
  index: number;
  /** Total run length, so the bar can be positioned as a percentage of the timeline. */
  total: number;
  showTokens: boolean;
  selected: boolean;
  formatDuration: (ms: number) => string;
  onSelect: (span: LaidSpan) => void;
  /** Hands the playhead loop the elements it writes to each frame. */
  register: (index: number, handle: RowHandle | null) => void;
}

/**
 * One span. Renders its finished state so the markup is complete without
 * JavaScript; the loop then rewrites `--p`, `data-state` and the two numbers to
 * whatever the playhead says.
 */
export const TraceSpanRow = React.memo(function TraceSpanRow({
  span,
  index,
  total,
  showTokens,
  selected,
  formatDuration,
  onSelect,
  register,
}: TraceSpanRowProps) {
  const Icon = KIND_ICON[span.kind ?? "tool"];
  const accent = span.kind === "agent" || span.kind === "model";
  const settled = span.status === "error" ? "error" : "done";
  const left = `${(span.start / total) * 100}%`;
  const width = `${(span.dur / total) * 100}%`;

  return (
    <div
      ref={(node) => {
        register(
          index,
          node
            ? {
                el: node,
                meta: node.querySelector<HTMLElement>("[data-part='meta']"),
                dur: node.querySelector<HTMLElement>("[data-part='dur']"),
                status: node.querySelector<HTMLElement>("[data-part='status']"),
                span,
                lastP: 1,
                lastState: settled,
                lastMeta: metaText(span, 1, showTokens),
                lastDur: formatDuration(span.dur),
              }
            : null,
        );
      }}
      data-slot="trace-span"
      data-state={settled}
      data-selected={selected ? "true" : undefined}
      style={{ "--p": 1 } as React.CSSProperties}
      className={cn(
        "group/row relative flex h-[var(--row)] items-center px-[var(--pad)] transition-colors duration-150",
        "data-[selected=true]:bg-muted/40 data-[state=running]:bg-muted/60",
      )}
    >
      {/* Guide rail: one hairline per ancestor, so a child reads as inside its parent. */}
      {span.depth > 0 && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-[var(--pad)]">
          {Array.from({ length: span.depth }, (_, d) => (
            <span key={d} className="absolute inset-y-0 w-px bg-border" style={{ left: `${d * 12 + 11}px` }} />
          ))}
        </div>
      )}

      {/* The live status in words. The loop rewrites it, so a screen reader never
          hears a row claim it succeeded while the playhead still has it queued. */}
      <span data-part="status" className="sr-only">
        {statusWord(span, settled)}
      </span>

      {/* Name gutter. Clicking a name seeks the playhead to that span. */}
      <button
        type="button"
        data-slot="trace-span-label"
        onClick={() => onSelect(span)}
        aria-label={`${span.label}, ${span.kind ?? "tool"}, ${formatDuration(span.dur)}${
          span.attempt != null && span.attempt > 1 ? `, attempt ${span.attempt}` : ""
        }`}
        className="flex w-[var(--gutter)] shrink-0 cursor-pointer items-center gap-1.5 rounded-md py-1 pr-2 text-left outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50"
        style={{ paddingLeft: `${span.depth * 12 + 4}px` }}
      >
        <Icon
          aria-hidden="true"
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground transition-colors duration-200 group-data-[state=queued]/row:text-muted-foreground/75",
            accent && "group-data-[state=done]/row:text-primary group-data-[state=running]/row:text-primary",
          )}
        />
        {/* Queued rows step down in hue rather than opacity: 40% foreground would be ~2.8:1. */}
        <span className="truncate font-mono text-xs text-foreground transition-colors duration-200 group-data-[state=queued]/row:text-muted-foreground">
          {span.label}
        </span>
        {span.attempt != null && span.attempt > 1 && (
          <span className="shrink-0 rounded-md border border-border px-1 font-mono text-[10px] leading-4 tabular-nums text-muted-foreground">
            ×{span.attempt}
          </span>
        )}
      </button>

      {/* Timeline column: the span's full extent as a ghost, filled up to the playhead. */}
      <div className="relative h-full flex-1">
        <div
          className="absolute top-1/2 h-2 min-w-[3px] -translate-y-1/2 overflow-hidden rounded-full"
          style={{ left, width }}
        >
          <span aria-hidden="true" className="absolute inset-0 bg-foreground/10" />
          <span
            aria-hidden="true"
            className={cn(
              "absolute inset-0 origin-left",
              span.status === "error"
                ? "bg-destructive"
                : accent
                  ? "bg-primary"
                  : span.status === "cached"
                    ? "bg-foreground/25"
                    : "bg-foreground/50",
            )}
            style={{ transform: "scaleX(var(--p,1))" }}
          />
        </div>
      </div>

      {/* Result column: what it returned, and how long it took. */}
      <div className="flex w-[var(--meta)] shrink-0 items-center justify-end gap-1.5 pl-2 transition-opacity duration-200 group-data-[state=queued]/row:opacity-0">
        {span.status === "error" && <CircleAlert aria-hidden="true" className="size-3.5 shrink-0 text-destructive" />}
        {span.status === "cached" && <Zap aria-hidden="true" className="size-3 shrink-0 text-muted-foreground" />}
        <span
          data-part="meta"
          className="hidden truncate font-mono text-[11px] tabular-nums text-muted-foreground @md/trace:inline"
        >
          {metaText(span, 1, showTokens)}
        </span>
        <span
          data-part="dur"
          className={cn(
            "shrink-0 font-mono text-[11px] tabular-nums",
            span.status === "error" ? "text-destructive" : "text-foreground/70",
          )}
        >
          {formatDuration(span.dur)}
        </span>
      </div>
    </div>
  );
});

/**
 * Drag the timeline (or the rail below it) and the run replays: bars fill,
 * statuses flip from queued to running to done, counts tick up, and scrubbing
 * backwards un-runs it. Nested children indent, parallel calls overlap, retries
 * carry a `×n` chip. Every visual is derived from one playhead time, so the
 * component keeps no per-span state and writes one CSS variable per row per
 * frame.
 */
export const AgentTrace = React.forwardRef<HTMLDivElement, AgentTraceProps>(function AgentTrace(
  {
    spans,
    duration,
    runId = "run",
    model,
    subtitle,
    defaultTime = 0,
    autoPlay = true,
    loop = false,
    speed = 1,
    holdMs = 900,
    showRuler = true,
    showTransport = true,
    showTokens = true,
    labelWidth = 200,
    rowHeight = 34,
    formatTime = defaultFormatMs,
    formatDuration = formatTime,
    ticks: tickOverride,
    onSpanSelect,
    className,
    style,
    ...rest
  },
  forwardedRef,
) {
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const railRef = React.useRef<HTMLDivElement>(null);
  const clockRef = React.useRef<HTMLSpanElement>(null);
  const statusRef = React.useRef<HTMLSpanElement>(null);
  const rowsRef = React.useRef<(RowHandle | null)[]>([]);
  const timeRef = React.useRef(defaultTime);
  const playingRef = React.useRef(false);
  const seekRef = React.useRef<(ms: number) => void>(() => {});
  const runRef = React.useRef<() => void>(() => {});
  const haltRef = React.useRef<() => void>(() => {});
  const [playing, setPlaying] = React.useState(false);
  const [selected, setSelected] = React.useState<string | null>(null);

  const rows = React.useMemo(() => layout(spans), [spans]);
  const total = React.useMemo(
    () => Math.max(1, duration ?? rows.reduce((max, s) => Math.max(max, s.end), 0)),
    [rows, duration],
  );
  const ticks = React.useMemo(() => {
    if (tickOverride) return tickOverride.filter((t) => t > 0 && t < total);
    const step = NICE_TICKS.find((t) => total / t <= 8) ?? total / 4;
    const out: number[] = [];
    for (let t = step; t < total; t += step) out.push(t);
    return out;
  }, [total, tickOverride]);

  // The loop reads props through this ref, so knobs apply live without restarting
  // it. Written in an effect rather than during render: effects still run before
  // the browser paints the next frame.
  const opts = React.useRef({ loop, speed, holdMs, showTokens, total, formatTime, formatDuration });
  useIsomorphicLayoutEffect(() => {
    opts.current = { loop, speed, holdMs, showTokens, total, formatTime, formatDuration };
  });

  const registerRow = React.useCallback((index: number, handle: RowHandle | null) => {
    rowsRef.current[index] = handle;
  }, []);

  useIsomorphicLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;
    let last = 0;
    let holdUntil = 0;
    let onScreen = true;
    let ariaAt = -1;

    let lastT = "";
    let lastRun = "";
    const paint = () => {
      const t = timeRef.current;
      const o = opts.current;
      const ratio = (t / o.total).toFixed(5);
      if (ratio !== lastT) {
        root.style.setProperty("--t", ratio);
        lastT = ratio;
      }

      for (const row of rowsRef.current) {
        if (!row) continue;
        const { span } = row;
        const p = span.dur > 0 ? clamp((t - span.start) / span.dur, 0, 1) : t >= span.start ? 1 : 0;
        if (p !== row.lastP) {
          row.el.style.setProperty("--p", p.toFixed(4));
          row.lastP = p;
        }
        const state = t < span.start ? "queued" : p < 1 ? "running" : span.status === "error" ? "error" : "done";
        if (state !== row.lastState) {
          row.el.dataset.state = state;
          if (row.status) row.status.textContent = statusWord(span, state);
          row.lastState = state;
        }
        const dur = state === "queued" ? "" : o.formatDuration(span.dur * p);
        if (row.dur && dur !== row.lastDur) {
          row.dur.textContent = dur;
          row.lastDur = dur;
        }
        const meta = state === "queued" ? "" : metaText(span, p, o.showTokens);
        if (row.meta && meta !== row.lastMeta) {
          row.meta.textContent = meta;
          row.lastMeta = meta;
        }
      }

      if (clockRef.current) clockRef.current.textContent = `${o.formatTime(t)} / ${o.formatTime(o.total)}`;
      // The chip describes the run at the playhead, not the transport: two-thirds
      // of the way through, the run was still going, whether or not the replay
      // happens to be paused.
      const runState = t >= o.total ? "complete" : "running";
      if (runState !== lastRun) {
        root.dataset.run = runState;
        if (statusRef.current) statusRef.current.textContent = runState === "complete" ? "Complete" : "In progress";
        lastRun = runState;
      }

      // Only announce a value the user asked for: ten announcements a second
      // while the run plays would be a wall of speech on a focusable slider.
      const rail = playingRef.current ? null : railRef.current;
      const decis = Math.round(t / 100);
      if (rail && decis !== ariaAt) {
        ariaAt = decis;
        rail.setAttribute("aria-valuenow", String(Math.round(t)));
        rail.setAttribute("aria-valuetext", `${o.formatTime(t)} of ${o.formatTime(o.total)}`);
      }
    };

    const frame = (now: number) => {
      raf = 0;
      const o = opts.current;
      const dt = Math.min(now - (last || now), 100); // clamp the jump after a hidden tab or a long frame
      last = now;
      if (holdUntil > 0) {
        if (now >= holdUntil) {
          holdUntil = 0;
          timeRef.current = 0;
        }
      } else {
        timeRef.current += dt * o.speed;
        if (timeRef.current >= o.total) {
          timeRef.current = o.total;
          if (o.loop) holdUntil = now + o.holdMs;
          else {
            playingRef.current = false;
            setPlaying(false);
          }
        }
      }
      paint();
      if (playingRef.current) raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (raf || !playingRef.current || !onScreen || document.hidden) return;
      last = 0;
      raf = requestAnimationFrame(frame);
    };
    const halt = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    runRef.current = start;
    haltRef.current = halt;
    seekRef.current = (ms: number) => {
      timeRef.current = clamp(ms, 0, opts.current.total);
      holdUntil = 0;
      last = 0;
      paint();
    };

    if (media.matches) {
      // Reduced motion: show the finished run and never animate it. Pressing play still works.
      timeRef.current = opts.current.total;
    } else if (autoPlay) {
      playingRef.current = true;
      setPlaying(true);
    }
    paint();

    const onVisibility = () => (document.hidden ? halt() : start());
    const onMedia = () => {
      if (!media.matches) return;
      playingRef.current = false;
      setPlaying(false);
      halt();
      seekRef.current(opts.current.total);
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry?.isIntersecting ?? true;
        if (onScreen) start();
        else halt();
      },
      { threshold: 0 },
    );

    io.observe(root);
    document.addEventListener("visibilitychange", onVisibility);
    media.addEventListener("change", onMedia);
    start();

    return () => {
      halt();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      media.removeEventListener("change", onMedia);
      runRef.current = () => {};
      haltRef.current = () => {};
      seekRef.current = () => {};
    };
    // Mount-only: everything the loop needs is read through `opts`, and the effects below re-seek.
  }, [autoPlay]);

  // A new run, or a knob that changes what the rows say, repaints at the current playhead.
  useIsomorphicLayoutEffect(() => {
    rowsRef.current.length = rows.length;
    seekRef.current(timeRef.current);
  }, [rows, total, showTokens, rowHeight, labelWidth, formatTime, formatDuration]);

  // Moving the `defaultTime` knob seeks. The mount pass is skipped on purpose: the
  // effect above has already placed the playhead, and under reduced motion it
  // belongs at the end of the run, not here.
  const appliedDefault = React.useRef(defaultTime);
  useIsomorphicLayoutEffect(() => {
    if (appliedDefault.current === defaultTime) return;
    appliedDefault.current = defaultTime;
    seekRef.current(defaultTime);
  }, [defaultTime]);

  const togglePlay = () => {
    const next = !playingRef.current;
    if (next && timeRef.current >= total) timeRef.current = 0;
    playingRef.current = next;
    setPlaying(next);
    seekRef.current(timeRef.current);
    if (next) runRef.current();
    else haltRef.current();
  };

  // `data-inset` lets the transport rail account for the padding around its
  // visible track, so the thumb lands exactly under the cursor at both ends.
  const scrubFrom = (clientX: number, el: HTMLElement) => {
    const inset = Number(el.dataset.inset ?? 0);
    const rect = el.getBoundingClientRect();
    const width = rect.width - inset * 2;
    if (width > 0) seekRef.current(((clientX - rect.left - inset) / width) * total);
  };
  const onScrubDown = (e: React.PointerEvent<HTMLElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    scrubFrom(e.clientX, e.currentTarget);
  };
  const onScrubMove = (e: React.PointerEvent<HTMLElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) scrubFrom(e.clientX, e.currentTarget);
  };
  const onScrubUp = (e: React.PointerEvent<HTMLElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const onRailKeyDown = (e: React.KeyboardEvent) => {
    const step = total / 50;
    const delta: Record<string, number> = {
      ArrowRight: step,
      ArrowUp: step,
      ArrowLeft: -step,
      ArrowDown: -step,
      PageUp: step * 10,
      PageDown: step * -10,
    };
    if (e.key === "Home") seekRef.current(0);
    else if (e.key === "End") seekRef.current(total);
    else if (e.key in delta) seekRef.current(timeRef.current + (delta[e.key] ?? 0));
    else return;
    e.preventDefault();
  };

  const onSpanSelectRef = React.useRef(onSpanSelect);
  onSpanSelectRef.current = onSpanSelect;
  const selectSpan = React.useCallback((span: LaidSpan) => {
    setSelected(span.id);
    seekRef.current(span.start);
    onSpanSelectRef.current?.(span);
  }, []);

  // The ruler, the gridlines, the playhead and the scrub surface all use this one
  // box, so everything lines up with the bars between the name gutter and the
  // result column.
  const trackBox = "absolute left-[calc(var(--gutter)+var(--pad))] right-[calc(var(--meta)+var(--pad))]";

  return (
    <div
      ref={(node) => {
        rootRef.current = node;
        if (typeof forwardedRef === "function") forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
      }}
      data-slot="agent-trace"
      style={
        {
          "--label-w": `${labelWidth}px`,
          "--row": `${rowHeight}px`,
          "--pad": "0.75rem",
          // Consumer styles merge on top, but they can no longer wipe the variables the layout needs.
          ...style,
        } as React.CSSProperties
      }
      className={cn(
        "group/trace @container/trace w-full overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm",
        className,
      )}
      {...rest}
    >
      {/* Header: which run this is, and where the playhead stands in it. */}
      <div data-slot="trace-header" className="flex items-center gap-2.5 border-b border-border px-3 py-2.5">
        <span
          aria-hidden="true"
          className="size-1.5 shrink-0 rounded-full bg-muted-foreground/40 transition-colors duration-300 group-data-[run=running]/trace:bg-primary"
        />
        <span className="font-mono text-[13px] font-medium leading-none text-foreground">{runId}</span>
        <span className="hidden truncate text-xs leading-none text-muted-foreground @sm/trace:inline">
          {subtitle ?? (
            <>
              {model ? `${model} · ` : ""}
              {rows.length} spans
            </>
          )}
        </span>
        <span
          ref={statusRef}
          className="ml-auto shrink-0 rounded-full border border-border px-2 py-0.5 font-mono text-[11px] leading-4 text-muted-foreground"
        >
          Complete
        </span>
      </div>

      <div
        className={cn(
          "relative",
          // The gutter and result columns answer to the card's own width, not the
          // viewport: this drops into a 320px settings column as readably as into
          // a full-width page.
          "[--gutter:96px] [--meta:3.75rem]",
          "@xs/trace:[--gutter:132px] @xs/trace:[--meta:5rem]",
          "@md/trace:[--gutter:var(--label-w)] @md/trace:[--meta:9rem]",
        )}
      >
        {/* Ruler — the only place the time axis is written down, and a scrub surface itself. */}
        {showRuler && (
          <div
            data-slot="trace-ruler"
            onPointerDown={onScrubDown}
            onPointerMove={onScrubMove}
            onPointerUp={onScrubUp}
            /* Hidden below 24rem of card width, written as a min-width variant
               on purpose: @tailwindcss/container-queries (the v3 plugin) has no
               `@max-*` variant, so `@max-sm/trace:hidden` compiles to nothing at
               all and the ruler would have stayed visible in narrow columns. */
            className="relative hidden h-7 cursor-ew-resize touch-none select-none border-b border-border @sm/trace:block"
          >
            <div className={cn(trackBox, "inset-y-0")}>
              {ticks.map((t) => (
                <span
                  key={t}
                  className="absolute top-2 -translate-x-1/2 font-mono text-[10px] leading-none tabular-nums text-muted-foreground"
                  style={{ left: `${(t / total) * 100}%` }}
                >
                  {formatTime(t)}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="relative py-1">
          {showRuler && (
            <div aria-hidden="true" className={cn(trackBox, "inset-y-0 hidden @sm/trace:block")}>
              {ticks.map((t) => (
                <span
                  key={t}
                  className="absolute inset-y-0 w-px bg-border/60"
                  style={{ left: `${(t / total) * 100}%` }}
                />
              ))}
            </div>
          )}

          <ol aria-label={`Spans in ${runId}`} className="relative">
            {rows.map((span, i) => (
              <li key={span.id}>
                <TraceSpanRow
                  span={span}
                  index={i}
                  total={total}
                  showTokens={showTokens}
                  selected={selected === span.id}
                  formatDuration={formatDuration}
                  onSelect={selectSpan}
                  register={registerRow}
                />
              </li>
            ))}
          </ol>

          {/* Playhead: one transform, driven by `--t` on the root. */}
          <div aria-hidden="true" className={cn(trackBox, "pointer-events-none inset-y-0")}>
            <div className="relative h-full w-full" style={{ transform: "translateX(calc(var(--t,0) * 100%))" }}>
              <span className="absolute inset-y-0 w-px bg-primary/70" />
              <span className="absolute top-0 size-1.5 -translate-x-[2.5px] rotate-45 bg-primary" />
            </div>
          </div>

          {/* Drag anywhere in the run to move the playhead. */}
          <div
            data-slot="trace-scrub"
            onPointerDown={onScrubDown}
            onPointerMove={onScrubMove}
            onPointerUp={onScrubUp}
            className={cn(trackBox, "inset-y-0 cursor-ew-resize touch-none select-none")}
          />
        </div>
      </div>

      {showTransport && (
        <div className="flex items-center gap-3 border-t border-border px-3 py-2">
          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? "Pause replay" : "Play replay"}
            className={cn(
              "relative flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground",
              "shadow-sm outline-none transition-[transform,box-shadow] duration-150 hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/50 active:scale-[0.98]",
              // The disc stays 36px; the touch target is 44px.
              "before:absolute before:-inset-1 before:content-['']",
            )}
          >
            {playing ? (
              <Pause aria-hidden="true" className="size-3.5 fill-current" />
            ) : (
              <Play aria-hidden="true" className="size-3.5 translate-x-px fill-current" />
            )}
          </button>

          <div
            ref={railRef}
            role="slider"
            tabIndex={0}
            aria-label="Playhead"
            aria-valuemin={0}
            aria-valuemax={Math.round(total)}
            aria-valuenow={Math.round(clamp(defaultTime, 0, total))}
            data-inset="6"
            onPointerDown={onScrubDown}
            onPointerMove={onScrubMove}
            onPointerUp={onScrubUp}
            onKeyDown={onRailKeyDown}
            className="relative h-9 flex-1 cursor-ew-resize touch-none select-none rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <div className="absolute inset-x-1.5 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-foreground/10">
              <div
                aria-hidden="true"
                className="h-full w-full origin-left bg-primary"
                style={{ transform: "scaleX(var(--t,0))" }}
              />
            </div>
            <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-1.5 right-1.5">
              <div className="relative h-full w-full" style={{ transform: "translateX(calc(var(--t,0) * 100%))" }}>
                <span className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-primary shadow-sm" />
              </div>
            </div>
          </div>

          <span
            ref={clockRef}
            className="w-[7rem] shrink-0 text-right font-mono text-[11px] tabular-nums text-muted-foreground"
          />
        </div>
      )}
    </div>
  );
});

export default AgentTrace;
