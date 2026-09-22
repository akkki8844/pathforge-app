import { useMemo, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, CalendarClock, FileText, Flame, Paperclip, PenLine, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUsage } from "@/contexts/UsageContext";
import { usePlanTier } from "@/hooks/usePlanTier";
import { useDocuments } from "@/hooks/useDocuments";
import type { DashboardData } from "@/hooks/useDashboardData";
import type { WidgetItem, WidgetSize } from "@/components/ui/draggable-widget-grid";

/**
 * The dashboard's widget board.
 *
 * Every number on these tiles is this student's own, read from the same hooks
 * the rest of the page reads: `useDashboardData` for the file itself,
 * `UsageContext` for the plan allowance, `useDocuments` for the drive. Nothing
 * here is seeded, sampled or simulated — a widget with no data says it has none
 * rather than drawing a plausible shape.
 *
 * Two conventions worth keeping:
 *
 * • Allowance is a percentage, never a unit count. The server still meters in
 *   discrete units but `UsageContext` deliberately keeps `used` and `capacity`
 *   internal, and a widget printing "12,300 tokens" would be the credit system
 *   this product removed, coming back through a tile. See the note at the top
 *   of `contexts/UsageContext.tsx`.
 *
 * • The Docs tile is Pathforge's own drive, not the Google Docs connector.
 *   Those are two different things and the tile used to show the wrong one: a
 *   brand mark and a connection status, where a student expected their files.
 *   It now lists rows from `public.documents`, and it is the only way into
 *   Documents — deliberately not a navbar entry — so it carries a coloured
 *   document mark and reads as a place rather than a label.
 */

/** The board, in its default reading order. Students rearrange it themselves. */
export const DASHBOARD_WIDGETS: WidgetItem[] = [
  { id: "readiness", size: "wide", label: "Profile readiness" },
  { id: "deadline", size: "sm", label: "Next deadline" },
  { id: "streak", size: "sm", label: "Your streak" },
  { id: "essays", size: "sm", label: "Essays" },
  { id: "docs", size: "sm", label: "Your Docs" },
  { id: "usage", size: "wide", label: "AI usage" },
];

/** One tile: a quiet heading, an optional right-hand note, then the content. */
function Tile({
  title,
  meta,
  children,
  to,
}: {
  title: string;
  meta?: ReactNode;
  children: ReactNode;
  /** Where the tile goes when clicked. Tiles without one are not links. */
  to?: string;
}) {
  const body = (
    <div className="flex h-full flex-col gap-3 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="truncate text-[11.5px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
          {title}
        </h3>
        {meta && <span className="shrink-0 text-[12px] text-muted-foreground">{meta}</span>}
      </div>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );

  if (!to) return body;
  return (
    <Link
      to={to}
      className="group flex h-full flex-col rounded-[inherit] transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {body}
    </Link>
  );
}

/** The one big number on a tile. */
function Figure({ children, unit }: { children: ReactNode; unit?: string }) {
  return (
    <p className="text-[30px] font-semibold leading-none tracking-[-0.03em] text-foreground tabular-nums">
      {children}
      {unit && (
        <span className="ml-1 text-[13px] font-normal tracking-normal text-muted-foreground">
          {unit}
        </span>
      )}
    </p>
  );
}

function Bar({ value, className }: { value: number; className?: string }) {
  return (
    <span className="block h-[3px] w-full rounded-full bg-foreground/10">
      <span
        className={cn("block h-full rounded-full bg-primary", className)}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </span>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="mt-auto text-[13px] leading-relaxed text-muted-foreground">{children}</p>
  );
}

/* ── Readiness ──────────────────────────────────────────────────────── */

const PILLARS: { key: keyof DashboardData["pillars"]; name: string }[] = [
  { key: "academics", name: "Academics" },
  { key: "activities", name: "Activities" },
  { key: "leadership", name: "Leadership" },
  { key: "competitions", name: "Competitions" },
  { key: "testPrep", name: "Test prep" },
];

function Readiness({ d }: { d: DashboardData }) {
  return (
    <Tile title="Profile readiness" meta="Against your list" to="/outcomes">
      <div className="flex items-baseline gap-2">
        <Figure unit="/ 100">{Math.round(d.overall)}</Figure>
      </div>
      <dl className="mt-auto grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
        {PILLARS.map((p) => {
          const value = Math.round(d.pillars[p.key] ?? 0);
          return (
            <div key={p.key} className="flex items-center gap-3 text-[13px]">
              <dt className="w-[92px] shrink-0 truncate text-foreground">{p.name}</dt>
              <dd className="flex min-w-0 flex-1 items-center gap-2">
                <Bar value={value} />
                <span className="w-8 shrink-0 text-right text-muted-foreground tabular-nums">
                  {value}
                </span>
              </dd>
            </div>
          );
        })}
      </dl>
    </Tile>
  );
}

/* ── Next deadline ──────────────────────────────────────────────────── */

function daysUntil(date: Date): number {
  const today = new Date();
  const a = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const b = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

function NextDeadline({ d }: { d: DashboardData }) {
  const next = useMemo(
    () =>
      [...d.deadlines]
        .filter((x) => daysUntil(x.date) >= 0)
        .sort((a, b) => a.date.getTime() - b.date.getTime())[0],
    [d.deadlines],
  );

  if (!next) {
    return (
      <Tile title="Next deadline">
        <Empty>
          No dates on file yet. Add your application year in your profile and the standard
          rounds appear here.
        </Empty>
      </Tile>
    );
  }

  const days = daysUntil(next.date);
  return (
    <Tile
      title="Next deadline"
      meta={<CalendarClock className="h-3.5 w-3.5" aria-hidden />}
      to="/requirements"
    >
      <Figure unit={days === 1 ? "day" : "days"}>{days}</Figure>
      <div className="mt-auto">
        <p className="truncate text-[13.5px] font-medium text-foreground">{next.label}</p>
        <p className="mt-0.5 truncate text-[12.5px] text-muted-foreground">
          {next.date.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </div>
    </Tile>
  );
}

/* ── Streak ─────────────────────────────────────────────────────────── */

function Streak({ d }: { d: DashboardData }) {
  const peak = Math.max(1, ...d.momentum.map((w) => w.count));
  return (
    <Tile title="Your streak" meta={<Flame className="h-3.5 w-3.5" aria-hidden />} to="/journey">
      <Figure unit={d.currentStreak === 1 ? "day" : "days"}>{d.currentStreak}</Figure>
      <p className="mt-1 text-[12.5px] text-muted-foreground tabular-nums">
        {d.activeDays} active {d.activeDays === 1 ? "day" : "days"} in 12 weeks
      </p>
      <div
        role="img"
        aria-label={`Activity over the last ${d.momentum.length} weeks, up to ${peak} in a week.`}
        className="mt-auto flex h-8 items-end gap-[3px]"
      >
        {d.momentum.map((w) => (
          <span
            key={w.weekStart.toISOString()}
            className={cn(
              "flex-1 rounded-full",
              w.count > 0 ? "bg-primary" : "bg-foreground/10",
            )}
            style={{ height: `${Math.max(8, (w.count / peak) * 100)}%` }}
          />
        ))}
      </div>
    </Tile>
  );
}

/* ── Essays ─────────────────────────────────────────────────────────── */

function Essays({ d }: { d: DashboardData }) {
  const total = d.totalEssaySections || 0;
  return (
    <Tile title="Essays" meta={<PenLine className="h-3.5 w-3.5" aria-hidden />} to="/essays">
      <Figure unit={total ? `/ ${total}` : undefined}>{d.essays.started}</Figure>
      <p className="mt-1 text-[12.5px] text-muted-foreground">started</p>
      <dl className="mt-auto space-y-1.5 text-[13px]">
        <div className="flex items-center justify-between gap-2">
          <dt className="text-foreground">Refined</dt>
          <dd className="text-muted-foreground tabular-nums">{d.essays.refined}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-foreground">Words written</dt>
          <dd className="text-muted-foreground tabular-nums">
            {d.essays.words.toLocaleString()}
          </dd>
        </div>
      </dl>
    </Tile>
  );
}

/* ── Your Docs ──────────────────────────────────────────────────────── */

/**
 * The document mark.
 *
 * A page with a folded corner and ruled lines, drawn here rather than taken
 * from an icon set, so it reads as "a document" at 28px instead of as a
 * generic outline glyph. It carries its own colour — a blue page on a tinted
 * square, the way an app icon does — because this tile is the only way into
 * Documents and it has to look like a place, not a label.
 */
function DocMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-blue-50 ring-1 ring-inset ring-blue-200/70 dark:bg-blue-500/15 dark:ring-blue-400/30",
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="h-[17px] w-[17px]" fill="none">
        <path
          d="M6 3h7.5L19 8.5V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"
          className="fill-blue-500 dark:fill-blue-400"
        />
        <path d="M13.5 3 19 8.5h-4.5a1 1 0 0 1-1-1V3Z" className="fill-blue-700 dark:fill-blue-200" />
        <g className="stroke-white" strokeWidth="1.4" strokeLinecap="round">
          <path d="M8.25 12h7.5" />
          <path d="M8.25 15h7.5" />
          <path d="M8.25 18h4.5" />
        </g>
      </svg>
    </span>
  );
}

/**
 * The student's own drive, as it actually stands.
 *
 * Pathforge Documents is Pathforge's: folders, documents written in the app and
 * files uploaded to it, all in `public.documents` and the private
 * `user-documents` bucket. This tile used to report the Google Docs connector
 * instead, which is a different thing entirely — that connector reads documents
 * living in a Google account and Pathforge holds no copy of them.
 *
 * The counts are this student's real rows. An empty drive says it is empty
 * rather than drawing a plausible shape.
 */
function Docs() {
  const { live, loading } = useDocuments();

  const recent = useMemo(
    () =>
      live
        .filter((node) => node.kind !== "folder")
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
        .slice(0, 2),
    [live],
  );

  const docs = live.filter((node) => node.kind === "doc").length;
  const files = live.filter((node) => node.kind === "file").length;

  return (
    <Tile title="Your Docs" to="/docs">
      <div className="flex items-center gap-2.5">
        <DocMark />
        <span className="truncate text-[14px] font-medium text-foreground">Documents</span>
      </div>

      {loading ? (
        <p className="text-[13px] text-muted-foreground">Loading…</p>
      ) : recent.length ? (
        <>
          <ul className="space-y-1.5">
            {recent.map((node) => (
              <li key={node.id} className="flex items-center gap-2">
                {node.kind === "doc" ? (
                  <FileText className="h-4 w-4 shrink-0 text-blue-500 dark:text-blue-400" aria-hidden />
                ) : (
                  <Paperclip className="h-4 w-4 shrink-0 text-amber-500 dark:text-amber-400" aria-hidden />
                )}
                <span className="truncate text-[13.5px] font-medium text-foreground">
                  {node.title}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-auto">
            <p className="text-[12.5px] text-muted-foreground">
              {docs} document{docs === 1 ? "" : "s"} · {files} file{files === 1 ? "" : "s"}
            </p>
            <span className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-medium text-primary">
              Open Documents
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </span>
          </div>
        </>
      ) : (
        <div className="mt-auto">
          <p className="text-[13px] font-medium text-foreground">Nothing saved yet</p>
          <p className="mt-0.5 text-[12.5px] leading-snug text-muted-foreground">
            Write a document or upload a file. It stays in Pathforge, in your own folders.
          </p>
          <span className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-medium text-primary">
            Open Documents
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </span>
        </div>
      )}
    </Tile>
  );
}

/* ── AI usage ───────────────────────────────────────────────────────── */

/**
 * The plan allowance.
 *
 * A percentage, not a token count — see the file header. Admins are the one
 * account with no meter, and the tile says so rather than drawing an empty bar.
 */
function Usage() {
  const { percentUsed, percentRemaining, unlimited, periodLabel, getResetTime } = useUsage();
  const { tier } = usePlanTier();
  const planName = tier === "max" ? "Max" : tier === "pro" ? "Pro" : "Free";

  return (
    <Tile title="AI usage" meta={`${planName} · ${periodLabel}`} to="/pricing">
      {unlimited ? (
        <>
          <Figure>Unlimited</Figure>
          <p className="mt-auto text-[13px] text-muted-foreground">
            This account is not metered.
          </p>
        </>
      ) : (
        <>
          <div className="flex items-baseline gap-3">
            <Figure unit="used">{Math.round(percentUsed)}%</Figure>
            <span className="text-[13px] text-muted-foreground tabular-nums">
              {Math.round(percentRemaining)}% left
            </span>
          </div>
          <div className="mt-4">
            <Bar value={percentUsed} />
          </div>
          <div className="mt-auto flex items-center justify-between gap-3 pt-4 text-[13px]">
            <span className="flex items-center gap-2 text-foreground">
              <Target className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              {planName} plan
            </span>
            <span className="text-muted-foreground tabular-nums">
              Resets in {getResetTime()}
            </span>
          </div>
        </>
      )}
    </Tile>
  );
}

/* ── The renderer the grid calls ────────────────────────────────────── */

export function renderDashboardWidget(
  item: WidgetItem,
  _size: WidgetSize,
  d: DashboardData,
): ReactNode {
  switch (item.id) {
    case "readiness":
      return <Readiness d={d} />;
    case "deadline":
      return <NextDeadline d={d} />;
    case "streak":
      return <Streak d={d} />;
    case "essays":
      return <Essays d={d} />;
    case "docs":
      return <Docs />;
    case "usage":
      return <Usage />;
    default:
      return null;
  }
}
