import { useEffect, useState } from "react";
import { Activity, Zap, Clock, Loader2 } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { planDisplayName } from "@/lib/plans";
import { SettingsSection, SettingsCard } from "../SettingsShell";

interface FeatureUsage { feature_type: string; count: number; tokens: number; }

export function UsageSection() {
  const {
    creditData, creditsRemaining, totalCapacity, totalUsed, usagePercent,
    getResetTime, loading, unlimited, periodLabel,
  } = useCredits();
  const { user } = useAuth();
  const [byFeature, setByFeature] = useState<FeatureUsage[]>([]);
  const [last7, setLast7] = useState<{ date: string; count: number }[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setBusy(true);
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("ai_usage_logs" as any)
        .select("feature_type, tokens_used, created_at")
        .eq("user_id", user.id)
        .gte("created_at", since)
        .limit(2000);

      const rows = (data as any[]) || [];
      const map = new Map<string, FeatureUsage>();
      for (const r of rows) {
        const f = r.feature_type || "other";
        const cur = map.get(f) || { feature_type: f, count: 0, tokens: 0 };
        cur.count += 1;
        cur.tokens += r.tokens_used || 0;
        map.set(f, cur);
      }
      setByFeature([...map.values()].sort((a, b) => b.count - a.count));

      // last 7 days
      const days: { date: string; count: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        days.push({ date: key, count: 0 });
      }
      for (const r of rows) {
        const k = (r.created_at as string).slice(0, 10);
        const d = days.find((x) => x.date === k);
        if (d) d.count += 1;
      }
      setLast7(days);
      setBusy(false);
    })();
  }, [user]);

  const maxDay = Math.max(1, ...last7.map((d) => d.count));

  return (
    <SettingsSection title="Usage" description="Your AI activity, credit limits, and reset windows.">
      {/* A paid plan is not metered, so the three figures that describe a cap —
          remaining, percent-of-cap, time-to-reset — have nothing to describe.
          Showing them anyway is what made this page look broken to subscribers. */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Stat
          icon={Zap}
          label="Credits remaining"
          value={loading ? "—" : unlimited ? "Unlimited" : `${creditsRemaining}`}
          hint={unlimited ? "Included with your plan" : `of ${totalCapacity}`}
        />
        <Stat
          icon={Activity}
          label="Used this cycle"
          value={loading ? "—" : `${totalUsed}`}
          hint={unlimited ? "Not counted against a cap" : `${Math.round(usagePercent)}%`}
        />
        <Stat
          icon={Clock}
          label={unlimited ? "Billing" : `${periodLabel === "monthly" ? "Monthly" : "Daily"} reset in`}
          value={unlimited ? "No cap" : getResetTime() || "—"}
          hint={`Plan: ${planDisplayName(creditData?.plan)}`}
        />
      </div>

      <SettingsCard title="Usage capacity">
        {unlimited ? (
          <p className="text-xs text-muted-foreground">
            Your plan includes unlimited credits and advisor tokens. Everything below is a record of
            what you've used, not a balance you're spending down.
          </p>
        ) : (
          <>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-foreground transition-all"
                style={{ width: `${Math.min(100, usagePercent)}%` }}
              />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              You're using {totalUsed} of {totalCapacity} credits. Free credits reset every 24 hours;
              bonus credits stay until you spend them.
            </p>
          </>
        )}
      </SettingsCard>

      <SettingsCard title="Last 7 days" description="AI requests across the last week.">
        {busy ? (
          <div className="h-32 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="flex items-end gap-2 h-32">
            {last7.map((d) => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-2 min-w-0">
                <div className="w-full bg-muted rounded-md relative overflow-hidden flex-1">
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-foreground/80 transition-all rounded-md"
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

      <SettingsCard title="By feature" description="Where your AI credits went over the past 30 days.">
        {busy ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : byFeature.length === 0 ? (
          <p className="text-xs text-muted-foreground">No AI activity yet.</p>
        ) : (
          <div className="space-y-3">
            {byFeature.slice(0, 8).map((f) => {
              const max = Math.max(...byFeature.map((x) => x.count));
              const pct = (f.count / max) * 100;
              return (
                <div key={f.feature_type}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-foreground capitalize">{f.feature_type.replace(/_/g, " ")}</span>
                    <span className="text-muted-foreground">{f.count} requests</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-foreground/70" style={{ width: `${pct}%` }} />
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

function Stat({ icon: Icon, label, value, hint }: { icon: typeof Activity; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="text-2xl font-semibold text-foreground tracking-tight">{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}
