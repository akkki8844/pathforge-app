import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2, Users, UserCheck, TrendingUp, MessagesSquare, AlertTriangle, Activity, RefreshCw, CircleDollarSign, TicketPercent, Brain, BarChart3 } from "lucide-react";
import { format } from "date-fns";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";
import { AdminRecentActivity } from "./AdminRecentActivity";

interface ComprehensiveStats {
  overview: {
    total_users: number;
    onboarded_users: number;
    pending_onboarding: number;
    new_users_today: number;
    new_users_week: number;
    new_users_month: number;
    suspended_users: number;
  };
  engagement: {
    advisor_sessions_total: number;
    advisor_sessions_today: number;
    advisor_sessions_week: number;
    readiness_analyses_total: number;
    application_entries_total: number;
    outcomes_data_total: number;
  };
  ai_usage: {
    total_requests: number;
    requests_today: number;
    requests_week: number;
    total_tokens: number;
    estimated_cost: number;
    by_feature: { feature: string; count: number; tokens: number }[] | null;
  };
  demographics: {
    by_grade: { grade: string; count: number }[] | null;
    by_country: { country: string; count: number }[] | null;
    by_major: { major: string; count: number }[] | null;
    by_curriculum: { curriculum: string; count: number }[] | null;
  };
  feedback: {
    total: number;
    pending: number;
    resolved: number;
    by_type: { type: string; count: number }[] | null;
  };
  moderation: {
    active_flags: number;
    warnings: number;
    suspensions: number;
    bans: number;
  };
  user_growth: { date: string; count: number }[] | null;
}

interface CouponStats {
  totals: {
    coupons_total: number;
    coupons_active: number;
    coupons_expired: number;
    redemptions_total: number;
    credits_distributed: number;
  };
}

interface ExtraStats {
  active_today: number;
  active_week: number;
  active_month: number;
  credits_used_today: number;
  bonus_credits_outstanding: number;
  paid_subscribers: number;
}

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(220 70% 60%)",
  "hsl(160 65% 45%)",
  "hsl(280 65% 60%)",
  "hsl(30 90% 55%)",
];

export function AdminDashboard() {
  const [stats, setStats] = useState<ComprehensiveStats | null>(null);
  const [couponStats, setCouponStats] = useState<CouponStats | null>(null);
  const [extra, setExtra] = useState<ExtraStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = async () => {
    const [a, b, activeToday, activeWeek, activeMonth, credits, subs] = await Promise.all([
      supabase.rpc("get_comprehensive_admin_stats"),
      supabase.rpc("admin_get_coupon_stats" as any),
      supabase.from("user_activity_logs").select("user_id", { count: "exact", head: false })
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      supabase.from("user_activity_logs").select("user_id", { count: "exact", head: false })
        .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      supabase.from("user_activity_logs").select("user_id", { count: "exact", head: false })
        .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      supabase.from("user_credits").select("credits_used_today, bonus_credits"),
      supabase.from("subscriptions").select("id", { count: "exact", head: true })
        .in("status", ["active", "trialing"]),
    ]);

    if (a.data) setStats(a.data as unknown as ComprehensiveStats);
    if (b.data) setCouponStats(b.data as unknown as CouponStats);

    // Distinct active users
    const distinct = (rows: { user_id: string }[] | null) =>
      rows ? new Set(rows.map((r) => r.user_id)).size : 0;

    const usedToday = (credits.data ?? []).reduce((acc: number, r: any) => acc + (r.credits_used_today || 0), 0);
    const outstandingBonus = (credits.data ?? []).reduce((acc: number, r: any) => acc + (r.bonus_credits || 0), 0);

    setExtra({
      active_today: distinct(activeToday.data as { user_id: string }[] | null),
      active_week: distinct(activeWeek.data as { user_id: string }[] | null),
      active_month: distinct(activeMonth.data as { user_id: string }[] | null),
      credits_used_today: usedToday,
      bonus_credits_outstanding: outstandingBonus,
      paid_subscribers: subs.count ?? 0,
    });
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try { await fetchAll(); } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    try { await fetchAll(); } finally { setRefreshing(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!stats) {
    return <div className="text-muted-foreground">Failed to load statistics.</div>;
  }

  const overviewCards = [
    { title: "Total Users", value: stats.overview.total_users, icon: Users, hint: `${stats.overview.new_users_week} new this week` },
    { title: "Onboarded", value: stats.overview.onboarded_users, icon: UserCheck, hint: `${stats.overview.pending_onboarding} pending` },
    { title: "Active Today", value: extra?.active_today ?? 0, icon: Activity, hint: `${extra?.active_week ?? 0} this week` },
    { title: "Paid Subscribers", value: extra?.paid_subscribers ?? 0, icon: TrendingUp, hint: "Active or trialing" },
    { title: "AI Requests Today", value: stats.ai_usage.requests_today, icon: BarChart3, hint: `${stats.ai_usage.total_requests} total` },
    { title: "Credits Used Today", value: extra?.credits_used_today ?? 0, icon: CircleDollarSign, hint: `${extra?.bonus_credits_outstanding ?? 0} bonus outstanding` },
    { title: "Coupon Redemptions", value: couponStats?.totals.redemptions_total ?? 0, icon: TicketPercent, hint: `${couponStats?.totals.credits_distributed ?? 0} credits given` },
    { title: "Active Flags", value: stats.moderation.active_flags, icon: AlertTriangle, hint: `${stats.moderation.bans} bans` },
  ];

  const featureUsage = stats.ai_usage.by_feature ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
          <p className="text-muted-foreground">Real-time platform overview and insights</p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing}>
          {refreshing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Refresh
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {overviewCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">{card.title}</span>
                </div>
                <div className="text-2xl font-bold text-foreground tabular-nums">{card.value}</div>
                <div className="text-[11px] text-muted-foreground mt-1">{card.hint}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-5 w-5 text-primary" />
              User Growth (30 Days)
            </CardTitle>
            <CardDescription>New signups per day</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.user_growth && stats.user_growth.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={stats.user_growth}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tickFormatter={(v) => format(new Date(v), "MMM d")} className="text-xs" />
                  <YAxis className="text-xs" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    labelFormatter={(v) => format(new Date(String(v)), "MMM d, yyyy")}
                  />
                  <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm">No growth data available</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Brain className="h-5 w-5 text-primary" />
              Feature Usage
            </CardTitle>
            <CardDescription>
              {stats.ai_usage.total_requests} AI requests total
            </CardDescription>
          </CardHeader>
          <CardContent>
            {featureUsage.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={featureUsage}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="feature" className="text-xs" interval={0} angle={-15} textAnchor="end" height={60} />
                  <YAxis className="text-xs" allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm">No AI usage data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Demographics charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Students by Grade</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.demographics.by_grade?.length ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={stats.demographics.by_grade}
                    dataKey="count"
                    nameKey="grade"
                    outerRadius={80}
                    label={(e: any) => e.grade || "Unknown"}
                  >
                    {stats.demographics.by_grade.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground">No data</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Countries</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.demographics.by_country?.length ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats.demographics.by_country.slice(0, 8)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" allowDecimals={false} />
                  <YAxis type="category" dataKey="country" className="text-xs" width={110} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Bar dataKey="count" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground">No data</p>}
          </CardContent>
        </Card>
      </div>

      {/* Recent platform activity */}
      <AdminRecentActivity />

      {/* Engagement quick stats */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessagesSquare className="h-4 w-4 text-primary" /> Engagement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Advisor Sessions" value={stats.engagement.advisor_sessions_total} sub={`${stats.engagement.advisor_sessions_today} today`} />
            <Row label="Readiness Analyses" value={stats.engagement.readiness_analyses_total} />
            <Row label="Application Entries" value={stats.engagement.application_entries_total} />
            <Row label="Outcomes Tracked" value={stats.engagement.outcomes_data_total} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TicketPercent className="h-4 w-4 text-primary" /> Coupons
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Total Coupons" value={couponStats?.totals.coupons_total ?? 0} />
            <Row label="Active" value={couponStats?.totals.coupons_active ?? 0} />
            <Row label="Expired" value={couponStats?.totals.coupons_expired ?? 0} />
            <Row label="Credits Distributed" value={couponStats?.totals.credits_distributed ?? 0} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-primary" /> Moderation & Feedback
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Warnings</span>
              <Badge variant="outline">{stats.moderation.warnings}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Suspensions</span>
              <Badge variant="secondary">{stats.moderation.suspensions}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Bans</span>
              <Badge variant="destructive">{stats.moderation.bans}</Badge>
            </div>
            <div className="flex justify-between pt-2 border-t border-border">
              <span className="text-muted-foreground">Pending Feedback</span>
              <Badge variant="outline">{stats.feedback.pending}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-muted-foreground">{label}</span>
      <div className="text-right">
        <span className="font-semibold tabular-nums">{value}</span>
        {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
      </div>
    </div>
  );
}
