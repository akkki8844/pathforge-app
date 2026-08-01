import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Activity, Zap, AlertCircle, CheckCircle2, TrendingUp, MousePointerClick } from "lucide-react";
import { format, subDays } from "date-fns";

interface FeatureRow { feature: string; count: number; }
interface PageRow { page: string; visits: number; }

export function AdminPlatformAnalytics() {
  const [loading, setLoading] = useState(true);
  const [featureUsage, setFeatureUsage] = useState<FeatureRow[]>([]);
  const [topPages, setTopPages] = useState<PageRow[]>([]);
  const [emailHealth, setEmailHealth] = useState({ sent: 0, failed: 0, queued: 0 });
  const [aiHealth, setAiHealth] = useState({ totalReq: 0, last24h: 0, errors: 0 });
  const [activityLast7d, setActivityLast7d] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const since7 = subDays(new Date(), 7).toISOString();
        const since1 = subDays(new Date(), 1).toISOString();

        // Feature usage (action_type counts)
        const { data: actions } = await supabase
          .from("user_activity_logs")
          .select("action_type, page_path, created_at")
          .gte("created_at", since7)
          .limit(5000);

        const featureMap = new Map<string, number>();
        const pageMap = new Map<string, number>();
        (actions ?? []).forEach((row: any) => {
          if (row.action_type) featureMap.set(row.action_type, (featureMap.get(row.action_type) ?? 0) + 1);
          if (row.page_path) pageMap.set(row.page_path, (pageMap.get(row.page_path) ?? 0) + 1);
        });
        setFeatureUsage(
          Array.from(featureMap.entries())
            .map(([feature, count]) => ({ feature, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10)
        );
        setTopPages(
          Array.from(pageMap.entries())
            .map(([page, visits]) => ({ page, visits }))
            .sort((a, b) => b.visits - a.visits)
            .slice(0, 10)
        );
        setActivityLast7d(actions?.length ?? 0);

        // Email health
        const { data: emails } = await supabase
          .from("email_send_log")
          .select("status")
          .gte("created_at", since7)
          .limit(2000);
        const eh = { sent: 0, failed: 0, queued: 0 };
        (emails ?? []).forEach((e: any) => {
          if (e.status === "sent" || e.status === "delivered") eh.sent++;
          else if (e.status === "failed" || e.status === "bounced") eh.failed++;
          else eh.queued++;
        });
        setEmailHealth(eh);

        // AI health
        const { data: ai } = await supabase
          .from("ai_usage_logs")
          .select("created_at, request_metadata")
          .gte("created_at", since7)
          .limit(5000);
        let last24 = 0;
        let errors = 0;
        (ai ?? []).forEach((row: any) => {
          if (new Date(row.created_at) >= new Date(since1)) last24++;
          if (row.request_metadata?.error) errors++;
        });
        setAiHealth({ totalReq: ai?.length ?? 0, last24h: last24, errors });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  const healthScore = (() => {
    const total = emailHealth.sent + emailHealth.failed;
    const emailOk = total === 0 ? 100 : Math.round((emailHealth.sent / total) * 100);
    const aiOk = aiHealth.totalReq === 0 ? 100 : Math.round(((aiHealth.totalReq - aiHealth.errors) / aiHealth.totalReq) * 100);
    return Math.round((emailOk + aiOk) / 2);
  })();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Platform Analytics</h2>
        <p className="text-muted-foreground">Feature usage, system health, and engagement (last 7 days)</p>
      </div>

      {/* System health row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">System Health</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{healthScore}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <MousePointerClick className="h-4 w-4 text-accent" />
              <span className="text-xs text-muted-foreground">Actions (7d)</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{activityLast7d}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-purple-500" />
              <span className="text-xs text-muted-foreground">AI Calls (24h)</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{aiHealth.last24h}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-xs text-muted-foreground">Email Failures</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{emailHealth.failed}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Feature usage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" /> Feature Usage
            </CardTitle>
            <CardDescription>Top tracked actions across the platform</CardDescription>
          </CardHeader>
          <CardContent>
            {featureUsage.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {featureUsage.map((f) => {
                  const max = featureUsage[0].count;
                  const pct = (f.count / max) * 100;
                  return (
                    <div key={f.feature}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-foreground truncate">{f.feature}</span>
                        <span className="text-muted-foreground">{f.count}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded">
                        <div className="h-full bg-accent rounded" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top pages */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" /> Top Pages
            </CardTitle>
            <CardDescription>Most visited routes (last 7 days)</CardDescription>
          </CardHeader>
          <CardContent>
            {topPages.length === 0 ? (
              <p className="text-sm text-muted-foreground">No page visits recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {topPages.map((p) => (
                  <div key={p.page} className="flex items-center justify-between py-1 border-b border-border last:border-0">
                    <span className="text-sm text-foreground truncate">{p.page}</span>
                    <Badge variant="secondary">{p.visits}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Email + AI health detail */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Email Delivery (7d)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between"><span className="text-muted-foreground">Delivered</span><Badge variant="secondary">{emailHealth.sent}</Badge></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Failed</span><Badge variant="destructive">{emailHealth.failed}</Badge></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Queued / Other</span><Badge variant="outline">{emailHealth.queued}</Badge></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">AI Gateway (7d)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between"><span className="text-muted-foreground">Total Requests</span><span className="font-medium">{aiHealth.totalReq}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Last 24h</span><span className="font-medium">{aiHealth.last24h}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Errors</span><Badge variant={aiHealth.errors > 0 ? "destructive" : "secondary"}>{aiHealth.errors}</Badge></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
