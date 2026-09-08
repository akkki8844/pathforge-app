import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { useUsage } from "@/contexts/UsageContext";
import { useAdvisorTokens } from "@/hooks/useAdvisorTokens";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { planDisplayName } from "@/lib/plans";
import { UsageMeter } from "@/components/usage/UsageMeter";
import { SettingsSection, SettingsCard } from "../SettingsShell";

interface FeatureUsage { feature_type: string; count: number }

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
  const { status: advisor, loading: advisorLoading, refresh: refreshAdvisor } = useAdvisorTokens();
  const { user } = useAuth();
  const [byFeature, setByFeature] = useState<FeatureUsage[]>([]);
  const [last7, setLast7] = useState<{ date: string; count: number }[]>([]);
  const [busy, setBusy] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadActivity = useCallback(async () => {
    if (!user) return;
    setBusy(true);
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from("ai_usage_logs" as any)
      .select("feature_type, created_at")
      .eq("user_id", user.id)
      .gte("created_at", since)
      .limit(2000);

    const rows = (data as any[]) || [];
    const map = new Map<string, FeatureUsage>();
    for (const r of rows) {
      const f = r.feature_type || "other";
      const cur = map.get(f) || { feature_type: f, count: 0 };
      cur.count += 1;
      map.set(f, cur);
    }
    setByFeature([...map.values()].sort((a, b) => b.count - a.count));

    const days: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push({ date: d.toISOString().slice(0, 10), count: 0 });
    }
    for (const r of rows) {
      const k = (r.created_at as string).slice(0, 10);
      const d = days.find((x) => x.date === k);
      if (d) d.count += 1;
    }
    setLast7(days);
    setUpdatedAt(new Date());
    setBusy(false);
  }, [user]);

  useEffect(() => { void loadActivity(); }, [loadActivity]);

  const refreshAll = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await Promise.all([refreshUsage(), refreshAdvisor(), loadActivity()]);
    } finally {
      setRefreshing(false);
    }
  };

  const maxDay = Math.max(1, ...last7.map((d) => d.count));

  // The advisor is metered in tokens server-side, but it is reported here in
  // the same unit as everything else. Two meters in two currencies is what this
  // page used to show, and it left no way to tell which limit you were about to
  // hit first.
  const advisorPercent =
    advisor.allowance > 0 ? (advisor.used / advisor.allowance) * 100 : 0;
  const advisorReset = advisor.resetsAt
    ? `Resets ${advisor.resetsAt.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
    : undefined;

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

          <UsageMeter
            label="Advisor"
            sublabel={advisorLoading ? "Loading…" : advisor.unlimited ? undefined : advisorReset}
            percent={advisorPercent}
            unlimited={advisor.unlimited}
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

      <SettingsCard title="Last 7 days" description="AI requests across the last week.">
        {busy ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex h-32 items-end gap-2">
            {last7.map((d) => (
              <div key={d.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                <div className="relative w-full flex-1 overflow-hidden rounded-md bg-muted">
                  <div
                    className="absolute bottom-0 left-0 right-0 rounded-md bg-accent/80 transition-all"
                    style={{ height: `${(d.count / maxDay) * 100}%` }}
                    title={`${d.count} requests`}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(d.date).toLocaleDateString(undefined, { weekday: "short" })}
                </span>
              </div>
            ))}
          </div>
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
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium capitalize text-foreground">
                      {f.feature_type.replace(/_/g, " ")}
                    </span>
                    <span className="tabular-nums text-muted-foreground">{f.count} requests</span>
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
      </SettingsCard>
    </SettingsSection>
  );
}
