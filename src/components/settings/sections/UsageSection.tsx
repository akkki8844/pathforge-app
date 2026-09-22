import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { useUsage } from "@/contexts/UsageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { planDisplayName } from "@/lib/plans";
import { UsageMeter } from "@/components/usage/UsageMeter";
import { AgentTrace } from "@/components/ui/agent-trace";
import { buildUsageTrace, type UsageLogRow } from "@/lib/usage/trace";
import { SettingsSection, SettingsCard } from "../SettingsShell";

interface FeatureUsage {
  feature_type: string;
  count: number;
  tokens: number;
  cost: number;
}

interface DayUsage {
  date: string;
  count: number;
  tokens: number;
  cost: number;
}

/** Whole-number requests, but tokens read better abbreviated once they are big. */
function compactNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

/**
 * Cost, at a precision that does not overstate what we know.
 *
 * `estimated_cost` is derived from list prices in _shared/usageLog.ts, not from
 * a provider invoice. Printing it to the cent implies a precision that is not
 * there, so anything under a cent reads as "<$0.01" rather than as "$0.00",
 * which would suggest the call was free.
 */
function formatCost(n: number): string {
  if (n <= 0) return "$0.00";
  if (n < 0.01) return "<$0.01";
  return `$${n.toFixed(2)}`;
}

/** "just now", "3 min ago" — a timestamp nobody has to parse. */
function agoLabel(at: Date | null): string {
  if (!at) return "—";
  const secs = Math.max(0, Math.round((Date.now() - at.getTime()) / 1000));
  if (secs < 45) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  return `${hours} h ago`;
}

export function UsageSection() {
  const {
    usageData, percentUsed, loading, unlimited, periodLabel,
    getResetTime, getResetLabel, refreshUsage,
  } = useUsage();
  const { user } = useAuth();
  const [byFeature, setByFeature] = useState<FeatureUsage[]>([]);
  const [last7, setLast7] = useState<DayUsage[]>([]);
  /*
   * The raw rows, kept rather than thrown away after aggregation.
   *
   * The old chart only ever needed seven day-totals, so the rows were reduced
   * on arrival and discarded. The trace needs the timestamps themselves: a day
   * total cannot tell you that Thursday was one long sitting and Friday was six
   * scattered minutes, which is the whole thing somebody opens this page to
   * find out.
   */
  const [logRows, setLogRows] = useState<UsageLogRow[]>([]);
  const [totals, setTotals] = useState({ requests: 0, tokens: 0, cost: 0, week: 0, weekCost: 0 });
  /*
   * Whether any row carries a real measurement.
   *
   * `tokens_used` is not tokens. `consume_credits()` writes one row per metered
   * call as `(user, feature, needed)`, where `needed` is that feature's CREDIT
   * cost — so a voice session that burned thousands of tokens is stored as 1,
   * and `estimated_cost` is never set at all. The request counts and the
   * per-feature breakdown built from these rows are correct; the token and cost
   * figures were this page reading a credit counter as if it were a token
   * counter, and reporting $0.00 for work that costs real money.
   *
   * So the page shows token and cost figures only once something has actually
   * measured them. Edge functions that call `logAiUsage` write a real
   * `estimated_cost`; until one has, this stays false and the page says the
   * figure is not measured instead of inventing a confident zero. It needs no
   * further change when that logging lands — the numbers appear on their own.
   */
  const [measured, setMeasured] = useState(false);
  const [busy, setBusy] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadActivity = useCallback(async () => {
    if (!user) return;
    setBusy(true);
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    /*
     * Two real bugs fixed here.
     *
     * 1. The select asked for `feature_type, created_at` only, and threw away
     *    `tokens_used`, `estimated_cost` and `request_metadata` — three columns
     *    that have existed on this table since it was created. The page could
     *    not show cost because it never asked for it.
     *
     * 2. `.limit(2000)` with no `.order()`. Postgres is free to return any
     *    2000 of the matching rows, so on a heavy account the 2000 returned
     *    could all be from the far end of the 30-day window and the "last 7
     *    days" chart would render empty while the data sat in the table.
     *    Ordering newest-first makes the cap drop the oldest rows, which is the
     *    only truncation that leaves both panels correct.
     */
    const { data } = await supabase
      .from("ai_usage_logs" as any)
      .select("feature_type, created_at, tokens_used, estimated_cost, request_metadata")
      .eq("user_id", user.id)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(2000);

    const rows = (data as any[]) || [];
    const map = new Map<string, FeatureUsage>();
    for (const r of rows) {
      const f = r.feature_type || "other";
      const cur = map.get(f) || { feature_type: f, count: 0, tokens: 0, cost: 0 };
      cur.count += 1;
      cur.tokens += Number(r.tokens_used) || 0;
      cur.cost += Number(r.estimated_cost) || 0;
      map.set(f, cur);
    }
    setByFeature([...map.values()].sort((a, b) => b.count - a.count));
    setLogRows(rows as UsageLogRow[]);

    const days: DayUsage[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push({ date: d.toISOString().slice(0, 10), count: 0, tokens: 0, cost: 0 });
    }
    for (const r of rows) {
      const k = (r.created_at as string).slice(0, 10);
      const d = days.find((x) => x.date === k);
      if (d) {
        d.count += 1;
        d.tokens += Number(r.tokens_used) || 0;
        d.cost += Number(r.estimated_cost) || 0;
      }
    }
    setLast7(days);

    // A real measurement is a non-zero cost: consume_credits never writes one.
    setMeasured(rows.some((r) => Number(r.estimated_cost) > 0));

    setTotals({
      requests: rows.length,
      tokens: rows.reduce((t, r) => t + (Number(r.tokens_used) || 0), 0),
      cost: rows.reduce((t, r) => t + (Number(r.estimated_cost) || 0), 0),
      week: days.reduce((t, d) => t + d.count, 0),
      weekCost: days.reduce((t, d) => t + d.cost, 0),
    });
    setUpdatedAt(new Date());
    setBusy(false);
  }, [user]);

  useEffect(() => { void loadActivity(); }, [loadActivity]);

  const refreshAll = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await Promise.all([refreshUsage(), loadActivity()]);
    } finally {
      setRefreshing(false);
    }
  };

  /*
   * Rebuilt only when the rows change. `buildUsageTrace` reads the clock, so
   * the window is fixed at load and stays put while the page is open instead of
   * sliding under the playhead on every render.
   */
  const trace = useMemo(() => buildUsageTrace(logRows, 7), [logRows]);

  return (
    <SettingsSection
      title="Usage"
      description="How much of your plan you've used, and where it went."
    >
      <SettingsCard title={`Plan usage limits · ${planDisplayName(usageData?.plan)}`}>
        <div className="space-y-5">
          <UsageMeter
            label={periodLabel === "monthly" ? "Monthly allowance" : "Daily allowance"}
            sublabel={
              loading
                ? "Loading…"
                : unlimited
                  ? undefined
                  : `${getResetLabel()} · in ${getResetTime()}`
            }
            percent={percentUsed}
            unlimited={unlimited}
          />
        </div>

        <div className="mt-6 flex items-center gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
          <span>Last updated: {agoLabel(updatedAt)}</span>
          <button
            type="button"
            onClick={refreshAll}
            disabled={refreshing}
            aria-label="Refresh usage"
            className="rounded-md p-1 transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </SettingsCard>

      <SettingsCard
        title="Last 7 days"
        description="Every AI request you made, on a timeline you can scrub."
      >
        {busy ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : trace.featureCount === 0 ? (
          /*
           * An explicit empty state. An empty timeline is indistinguishable
           * from one that failed to load, which is exactly how the old flat
           * seven-bar chart read whenever there was no activity to draw.
           */
          <div className="flex h-32 items-center justify-center rounded-md border border-dashed border-border">
            <p className="text-xs text-muted-foreground">No AI requests in the last 7 days.</p>
          </div>
        ) : (
          <>
            <AgentTrace
              spans={trace.spans}
              duration={trace.duration}
              ticks={trace.ticks}
              formatTime={trace.formatTime}
              formatDuration={trace.formatDuration}
              runId="Last 7 days"
              subtitle={`${planDisplayName(usageData?.plan)} · ${trace.featureCount} ${
                trace.featureCount === 1 ? "feature" : "features"
              } · ${trace.requestCount} ${trace.requestCount === 1 ? "request" : "requests"}`}
              /* Credits, not tokens, live in `tokens_used`; the result column
                 shows request counts instead. See lib/usage/trace.ts. */
              showTokens={false}
              labelWidth={188}
              rowHeight={32}
              speed={trace.duration / 9000}
              className="rounded-lg border-border/60 bg-background/50 shadow-none"
            />
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              {trace.showsSessions
                ? "Each feature spans your first to your last request in the week; the rows beneath it are the individual sittings, split wherever you went more than half an hour without asking for anything."
                : `Each bar spans your first to your last request for that feature. Individual sittings are hidden here because ${trace.featureCount} features across ${trace.sessionCount} sittings is more rows than this card can show at once.`}
            </p>
          </>
        )}

        {/* The week in numbers. The chart shows shape; these are the figures
            somebody actually wants to read off it. */}
        {!busy && (
          <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-border pt-4">
            <div>
              <dt className="text-[11px] text-muted-foreground">Requests this week</dt>
              <dd className="mt-0.5 text-base font-semibold tabular-nums text-foreground">
                {totals.week}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] text-muted-foreground">Features used</dt>
              <dd className="mt-0.5 text-base font-semibold tabular-nums text-foreground">
                {byFeature.length}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] text-muted-foreground">Est. cost this week</dt>
              <dd className="mt-0.5 text-base font-semibold tabular-nums text-foreground">
                {measured ? formatCost(totals.weekCost) : <span className="text-muted-foreground">Not measured</span>}
              </dd>
            </div>
          </dl>
        )}
      </SettingsCard>

      <SettingsCard title="By feature" description="Where your usage went over the past 30 days.">
        {busy ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : byFeature.length === 0 ? (
          <p className="text-xs text-muted-foreground">No AI activity yet.</p>
        ) : (
          <div className="space-y-3">
            {byFeature.slice(0, 8).map((f) => {
              const max = Math.max(...byFeature.map((x) => x.count));
              return (
                <div key={f.feature_type}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                    <span className="min-w-0 truncate font-medium capitalize text-foreground">
                      {f.feature_type.replace(/_/g, " ")}
                    </span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {f.count} requests
                      {measured && f.tokens > 0 ? ` · ${compactNumber(f.tokens)} tokens` : ""}
                      {f.cost > 0 ? ` · ${formatCost(f.cost)}` : ""}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-foreground/40"
                      style={{ width: `${(f.count / max) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!busy && byFeature.length > 0 && (
          <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-border pt-4">
            <div>
              <dt className="text-[11px] text-muted-foreground">Requests (30 days)</dt>
              <dd className="mt-0.5 text-base font-semibold tabular-nums text-foreground">
                {totals.requests}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] text-muted-foreground">Busiest day</dt>
              <dd className="mt-0.5 text-base font-semibold tabular-nums text-foreground">
                {last7.reduce((m, d) => Math.max(m, d.count), 0)}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] text-muted-foreground">Est. cost (30 days)</dt>
              <dd className="mt-0.5 text-base font-semibold tabular-nums text-foreground">
                {measured ? formatCost(totals.cost) : <span className="text-muted-foreground">Not measured</span>}
              </dd>
            </div>
          </dl>
        )}

        {/*
          * Said plainly rather than left for someone to discover.
          *
          * estimated_cost is computed from published list prices, not from a
          * provider invoice, and every row written before cost tracking existed
          * legitimately reads as zero. Presenting the figure without that
          * caveat would be presenting a guess as a bill.
          */}
        {!busy && byFeature.length > 0 && (
          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
            {measured
              ? "Cost is estimated from published model prices, not billed amounts. Requests made before usage cost tracking was added show as zero."
              : "Your request history is complete. Token and cost figures read “Not measured” because these requests were recorded before per-request cost tracking reached the features you used — they are not zero, they are unknown."}
          </p>
        )}
      </SettingsCard>
    </SettingsSection>
  );
}
