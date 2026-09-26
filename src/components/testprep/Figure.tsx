import { Fragment, useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type {
  BarFigure,
  DiagramFigure,
  Figure,
  PlotFigure,
  TableFigure,
} from "@/lib/testprep/types";

/**
 * Question text and question figures.
 *
 * The digital SAT leans on three things plain strings cannot carry: a blank
 * the student completes, an underlined sentence a question asks about, and
 * the tables, graphs and diagrams a third of the Math section is built on.
 * This file is where both are drawn, so the practice runner, the exam, the
 * Question Bank preview and the answer review all show a question the same way.
 */

/* ------------------------------------------------------------------ */
/* Rich text                                                           */
/* ------------------------------------------------------------------ */

/**
 * The markup the bank is written in. Deliberately tiny:
 *
 *   ______        a blank, drawn as a rule (four or more underscores)
 *   [u]...[/u]    underlined, for "the underlined sentence"
 *   **...**       bold, for "Text 1" / "Text 2" headings
 *   *...*         italic, for titles of works and variables
 *   ^{...}        superscript, for exponents longer than a square or cube
 *   _{...}        subscript
 */
const TOKEN = /(_{4,}|\[u\][\s\S]*?\[\/u\]|\*\*[\s\S]*?\*\*|\*[^*\n]+\*|\^\{[^}]*\}|_\{[^}]*\})/g;

export function RichText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(TOKEN);
  return (
    <span className={cn("whitespace-pre-line", className)}>
      {parts.map((part, i) => {
        if (!part) return null;
        if (/^_{4,}$/.test(part))
          return (
            <span
              key={i}
              aria-label="blank"
              className="mx-0.5 inline-block w-[4.5em] translate-y-[-0.2em] border-b-[1.5px] border-current align-baseline"
            />
          );
        if (part.startsWith("[u]"))
          return (
            <span key={i} className="underline decoration-[1.5px] underline-offset-[3px]">
              {part.slice(3, -4)}
            </span>
          );
        if (part.startsWith("**"))
          return (
            <strong key={i} className="font-semibold">
              {part.slice(2, -2)}
            </strong>
          );
        if (part.startsWith("^{"))
          return (
            <sup key={i} className="text-[0.72em]">
              {part.slice(2, -1)}
            </sup>
          );
        if (part.startsWith("_{"))
          return (
            <sub key={i} className="text-[0.72em]">
              {part.slice(2, -1)}
            </sub>
          );
        if (part.startsWith("*") && part.endsWith("*") && part.length > 2)
          return <em key={i}>{part.slice(1, -1)}</em>;
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Figures                                                             */
/* ------------------------------------------------------------------ */

export function QuestionFigure({ figure, className }: { figure: Figure; className?: string }) {
  return (
    <figure className={cn("my-1 w-full", className)}>
      {figure.kind === "table" ? (
        <TableView fig={figure} />
      ) : figure.kind === "plot" ? (
        <PlotView fig={figure} />
      ) : figure.kind === "bar" ? (
        <BarView fig={figure} />
      ) : (
        <DiagramView fig={figure} />
      )}
    </figure>
  );
}

function Title({ children }: { children: ReactNode }) {
  return <figcaption className="mb-2 text-center text-[13px] font-semibold text-foreground">{children}</figcaption>;
}

function TableView({ fig }: { fig: TableFigure }) {
  return (
    <div>
      {fig.title && <Title>{fig.title}</Title>}
      <div className="overflow-x-auto">
        <table className="mx-auto border-collapse text-[13px] tabular-nums text-foreground">
          <thead>
            <tr>
              {fig.head.map((h, i) => (
                <th
                  key={i}
                  scope="col"
                  className="border border-foreground/60 bg-muted/50 px-3 py-1.5 text-center font-semibold leading-snug"
                >
                  <RichText text={h} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fig.rows.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) =>
                  fig.rowHeaders && c === 0 ? (
                    <th key={c} scope="row" className="border border-foreground/60 px-3 py-1.5 text-left font-semibold">
                      <RichText text={cell} />
                    </th>
                  ) : (
                    <td key={c} className="border border-foreground/60 px-3 py-1.5 text-center">
                      <RichText text={cell} />
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Tick values from min to max inclusive, without float drift. */
function ticks(min: number, max: number, step: number): number[] {
  const out: number[] = [];
  const n = Math.round((max - min) / step);
  for (let i = 0; i <= n; i += 1) out.push(Number((min + i * step).toFixed(6)));
  return out;
}

function fmt(n: number): string {
  const s = Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2)));
  // A true minus sign, as the rest of the question text uses.
  return s.replace("-", String.fromCharCode(0x2212));
}

const INK = "currentColor";
const GRID = "hsl(var(--muted-foreground) / 0.28)";
const SERIES = ["hsl(var(--bb-blue))", "hsl(var(--foreground))"];

function PlotView({ fig }: { fig: PlotFigure }) {
  const clipId = `pf-clip-${useId().replace(/:/g, "")}`;
  const [x0, x1, xs] = fig.x;
  const [y0, y1, ys] = fig.y;
  const plane = !!fig.axesAtOrigin;
  // A coordinate plane keeps one unit the same length on both axes, as the
  // test's own grids do; a data chart fills a landscape box.
  const innerW = 300;
  const innerH = plane ? Math.min(340, Math.max(160, (innerW * (y1 - y0)) / (x1 - x0))) : 200;
  const m = { l: plane ? 16 : 48, r: 16, t: 12, b: plane ? 16 : 40 };
  const W = innerW + m.l + m.r;
  const H = innerH + m.t + m.b;
  const X = (x: number) => m.l + ((x - x0) / (x1 - x0)) * innerW;
  const Y = (y: number) => m.t + innerH - ((y - y0) / (y1 - y0)) * innerH;
  const every = fig.labelEvery ?? 1;
  const xt = ticks(x0, x1, xs);
  const yt = ticks(y0, y1, ys);
  const ax = plane ? Math.min(Math.max(0, x0), x1) : x0;
  const ay = plane ? Math.min(Math.max(0, y0), y1) : y0;

  return (
    <div className="text-foreground">
      {fig.title && <Title>{fig.title}</Title>}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={fig.alt ?? fig.title ?? "Graph"}
        className="mx-auto block h-auto w-full max-w-[380px]"
      >
        {xt.map((t) => (
          <line key={`gx${t}`} x1={X(t)} x2={X(t)} y1={Y(y0)} y2={Y(y1)} stroke={GRID} strokeWidth={0.8} />
        ))}
        {yt.map((t) => (
          <line key={`gy${t}`} x1={X(x0)} x2={X(x1)} y1={Y(t)} y2={Y(t)} stroke={GRID} strokeWidth={0.8} />
        ))}
        <line x1={X(x0)} x2={X(x1)} y1={Y(ay)} y2={Y(ay)} stroke={INK} strokeWidth={1.3} />
        <line x1={X(ax)} x2={X(ax)} y1={Y(y0)} y2={Y(y1)} stroke={INK} strokeWidth={1.3} />

        {xt.map((t) =>
          Math.round(t / xs) % every !== 0 || (plane && t === 0) ? null : (
            <text
              key={`lx${t}`}
              x={X(t)}
              y={Y(ay) + 13}
              textAnchor="middle"
              fontSize={10}
              fill={INK}
            >
              {fmt(t)}
            </text>
          ),
        )}
        {yt.map((t) =>
          Math.round(t / ys) % every !== 0 || (plane && t === 0) ? null : (
            <text
              key={`ly${t}`}
              x={X(ax) - 5}
              y={Y(t) + 3.5}
              textAnchor="end"
              fontSize={10}
              fill={INK}
            >
              {fmt(t)}
            </text>
          ),
        )}
        {plane && (
          <>
            <text x={X(ax) - 5} y={Y(ay) + 13} textAnchor="end" fontSize={10} fill={INK}>
              0
            </text>
            <text x={X(x1) - 2} y={Y(ay) - 5} textAnchor="end" fontSize={11} fontStyle="italic" fill={INK}>
              {fig.xLabel ?? "x"}
            </text>
            <text x={X(ax) + 6} y={Y(y1) + 10} fontSize={11} fontStyle="italic" fill={INK}>
              {fig.yLabel ?? "y"}
            </text>
          </>
        )}
        {!plane && fig.xLabel && (
          <text x={m.l + innerW / 2} y={H - 6} textAnchor="middle" fontSize={11} fill={INK}>
            {fig.xLabel}
          </text>
        )}
        {!plane && fig.yLabel && (
          <text
            x={12}
            y={m.t + innerH / 2}
            textAnchor="middle"
            fontSize={11}
            fill={INK}
            transform={`rotate(-90 12 ${m.t + innerH / 2})`}
          >
            {fig.yLabel}
          </text>
        )}

        <defs>
          <clipPath id={clipId}>
            <rect x={X(x0)} y={Y(y1)} width={innerW} height={innerH} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`}>
          {fig.series.map((s, si) => {
            const color = SERIES[si % SERIES.length];
            if (s.type === "points")
              return (
                <g key={si}>
                  {s.pts.map(([px, py], i) => (
                    <circle key={i} cx={X(px)} cy={Y(py)} r={3.2} fill={color} />
                  ))}
                </g>
              );
            const pts =
              s.type === "polyline"
                ? s.pts
                : (() => {
                    const [a, b] = s.domain ?? [x0, x1];
                    const out: [number, number][] = [];
                    const N = 240;
                    for (let i = 0; i <= N; i += 1) {
                      const x = a + ((b - a) * i) / N;
                      const y = s.f(x);
                      if (Number.isFinite(y)) out.push([x, Math.max(y0 - (y1 - y0), Math.min(y1 + (y1 - y0), y))]);
                    }
                    return out;
                  })();
            return (
              <polyline
                key={si}
                points={pts.map(([px, py]) => `${X(px)},${Y(py)}`).join(" ")}
                fill="none"
                stroke={color}
                strokeWidth={2}
                strokeDasharray={s.dashed ? "5 4" : undefined}
                strokeLinejoin="round"
              />
            );
          })}
        </g>
      </svg>
      {fig.series.some((s) => s.label) && (
        <ul className="mt-1 flex flex-wrap justify-center gap-x-5 gap-y-1 text-[12px] text-foreground">
          {fig.series.map((s, si) =>
            s.label ? (
              <li key={si} className="flex items-center gap-1.5">
                <svg width="22" height="10" aria-hidden="true">
                  {s.type === "points" ? (
                    <circle cx="11" cy="5" r="3.2" fill={SERIES[si % SERIES.length]} />
                  ) : (
                    <line
                      x1="1"
                      x2="21"
                      y1="5"
                      y2="5"
                      stroke={SERIES[si % SERIES.length]}
                      strokeWidth="2"
                      strokeDasharray={"dashed" in s && s.dashed ? "4 3" : undefined}
                    />
                  )}
                </svg>
                {s.label}
              </li>
            ) : null,
          )}
        </ul>
      )}
    </div>
  );
}

function BarView({ fig }: { fig: BarFigure }) {
  const [y0, y1, ys] = fig.y;
  const innerW = 320;
  const innerH = 190;
  const m = { l: 48, r: 12, t: 12, b: 46 };
  const W = innerW + m.l + m.r;
  const H = innerH + m.t + m.b + (fig.series.length > 1 ? 18 : 0);
  const Y = (y: number) => m.t + innerH - ((y - y0) / (y1 - y0)) * innerH;
  const band = innerW / fig.categories.length;
  const barW = Math.min(34, (band * 0.7) / fig.series.length);
  const fills = ["hsl(var(--bb-blue))", "hsl(var(--muted-foreground) / 0.55)"];

  return (
    <div className="text-foreground">
      {fig.title && <Title>{fig.title}</Title>}
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={fig.alt ?? fig.title ?? "Bar graph"} className="mx-auto block h-auto w-full max-w-[400px]">
        {ticks(y0, y1, ys).map((t) => (
          <g key={t}>
            <line x1={m.l} x2={m.l + innerW} y1={Y(t)} y2={Y(t)} stroke={GRID} strokeWidth={0.8} />
            <text x={m.l - 5} y={Y(t) + 3.5} textAnchor="end" fontSize={10} fill={INK}>
              {fmt(t)}
            </text>
          </g>
        ))}
        <line x1={m.l} x2={m.l + innerW} y1={Y(y0)} y2={Y(y0)} stroke={INK} strokeWidth={1.3} />
        <line x1={m.l} x2={m.l} y1={Y(y0)} y2={Y(y1)} stroke={INK} strokeWidth={1.3} />
        {fig.categories.map((c, ci) => {
          const cx = m.l + band * ci + band / 2;
          const groupW = barW * fig.series.length;
          return (
            <g key={c}>
              {fig.series.map((s, si) => {
                const v = s.values[ci];
                const x = cx - groupW / 2 + si * barW;
                return (
                  <rect
                    key={si}
                    x={x + 1}
                    y={Y(v)}
                    width={barW - 2}
                    height={Math.max(0, Y(y0) - Y(v))}
                    fill={fills[si % fills.length]}
                  />
                );
              })}
              <text x={cx} y={Y(y0) + 14} textAnchor="middle" fontSize={10} fill={INK}>
                {c}
              </text>
            </g>
          );
        })}
        {fig.xLabel && (
          <text x={m.l + innerW / 2} y={m.t + innerH + 34} textAnchor="middle" fontSize={11} fill={INK}>
            {fig.xLabel}
          </text>
        )}
        {fig.yLabel && (
          <text x={12} y={m.t + innerH / 2} textAnchor="middle" fontSize={11} fill={INK} transform={`rotate(-90 12 ${m.t + innerH / 2})`}>
            {fig.yLabel}
          </text>
        )}
        {fig.series.length > 1 &&
          fig.series.map((s, si) => (
            <g key={s.name} transform={`translate(${m.l + si * 150}, ${H - 12})`}>
              <rect width={10} height={10} y={-9} fill={fills[si % fills.length]} />
              <text x={15} fontSize={10} fill={INK}>
                {s.name}
              </text>
            </g>
          ))}
      </svg>
    </div>
  );
}

function DiagramView({ fig }: { fig: DiagramFigure }) {
  const pad = 14;
  return (
    <div className="text-foreground">
      <svg
        viewBox={`${-pad} ${-pad} ${fig.w + pad * 2} ${fig.h + pad * 2}`}
        role="img"
        aria-label={fig.alt ?? "Diagram"}
        className="mx-auto block h-auto w-full"
        style={{ maxWidth: Math.min(340, fig.w + pad * 2) }}
      >
        <defs>
          <marker id="pf-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={INK} />
          </marker>
        </defs>
        {fig.items.map((it, i) => {
          const dash = "dashed" in it && it.dashed ? "4 4" : undefined;
          switch (it.t) {
            case "poly":
              return (
                <polyline
                  key={i}
                  points={[...it.pts, ...(it.closed === false ? [] : [it.pts[0]])].map((p) => p.join(",")).join(" ")}
                  fill="none"
                  stroke={INK}
                  strokeWidth={1.6}
                  strokeLinejoin="round"
                  strokeDasharray={dash}
                />
              );
            case "line":
              return (
                <line
                  key={i}
                  x1={it.a[0]}
                  y1={it.a[1]}
                  x2={it.b[0]}
                  y2={it.b[1]}
                  stroke={INK}
                  strokeWidth={1.6}
                  strokeDasharray={dash}
                  markerEnd={it.arrow ? "url(#pf-arrow)" : undefined}
                  markerStart={it.arrow ? "url(#pf-arrow)" : undefined}
                />
              );
            case "circle":
              return <circle key={i} cx={it.c[0]} cy={it.c[1]} r={it.r} fill="none" stroke={INK} strokeWidth={1.6} strokeDasharray={dash} />;
            case "arc": {
              const a = (it.from * Math.PI) / 180;
              const b = (it.to * Math.PI) / 180;
              const p = (t: number) => [it.c[0] + it.r * Math.cos(t), it.c[1] - it.r * Math.sin(t)];
              const [ax, ay] = p(a);
              const [bx, by] = p(b);
              const large = Math.abs(it.to - it.from) > 180 ? 1 : 0;
              return <path key={i} d={`M ${ax} ${ay} A ${it.r} ${it.r} 0 ${large} 0 ${bx} ${by}`} fill="none" stroke={INK} strokeWidth={1.2} />;
            }
            case "dot":
              return <circle key={i} cx={it.at[0]} cy={it.at[1]} r={2.6} fill={INK} />;
            case "text":
              return (
                <text
                  key={i}
                  x={it.at[0]}
                  y={it.at[1]}
                  textAnchor={it.anchor ?? "middle"}
                  dominantBaseline="middle"
                  fontSize={13}
                  fontStyle={it.italic ? "italic" : undefined}
                  fill={INK}
                >
                  {it.s}
                </text>
              );
            case "right": {
              const s = 9;
              const unit = (to: [number, number]) => {
                const dx = to[0] - it.at[0];
                const dy = to[1] - it.at[1];
                const len = Math.hypot(dx, dy) || 1;
                return [dx / len, dy / len];
              };
              const [ux, uy] = unit(it.a);
              const [vx, vy] = unit(it.b);
              const p1 = [it.at[0] + ux * s, it.at[1] + uy * s];
              const p2 = [it.at[0] + (ux + vx) * s, it.at[1] + (uy + vy) * s];
              const p3 = [it.at[0] + vx * s, it.at[1] + vy * s];
              return <polyline key={i} points={`${p1} ${p2} ${p3}`} fill="none" stroke={INK} strokeWidth={1.2} />;
            }
          }
        })}
      </svg>
      {fig.note && <p className="mt-1.5 text-center text-[11px] italic text-muted-foreground">{fig.note}</p>}
    </div>
  );
}
