import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity, CircleDollarSign, CalendarClock, Bell, Eye, LogIn, Target, TrendingUp, AlertCircle, LineChart } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  AreaChart,
  Area,
} from "recharts";

type DeepDive = {
  activity_summary: {
    total_30d: number;
    total_7d: number;
    total_1d: number;
    logins_30d: number;
    page_views_30d: number;
    ai_requests_30d: number;
    credits_consumed_30d: number;
    last_seen: string | null;
  };
  activity_by_day: Array<{ day: string; count: number }>;
  recent_activity: Array<{
    action_type: string;
    page_path: string | null;
    details: Record<string, unknown> | null;
    created_at: string;
  }>;
  ai_by_feature: Array<{ feature: string; count: number; tokens: number }>;
  credits: {
    plan?: string | null;
    credits_used_today?: number | null;
    daily_limit?: number | null;
    bonus_credits?: number | null;
  };
  scores: Record<string, number>;
  outcomes: { courses: number; projects: number; leadership_roles: number; competitions: number };
  planner: Array<{
    week_start: string;
    planned_hours: number;
    actual_hours: number;
    activity_count: number;
  }>;
  notifications: Array<{
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
  }>;
  engagement: {
    applications?: number;
    full_applications?: number;
    linkedin_imports?: number;
    readiness_analyses?: number;
    admissions_evals?: number;
  };
  admissions_recent: Array<{
    college: string;
    probability: number | null;
    verdict: string | null;
    created_at: string;
  }>;
};

const ACTION_ICONS: Record<string, typeof Activity> = {
  login: LogIn,
  page_view: Eye,
  ai_request: LineChart,
  credit_consumed: CircleDollarSign,
};

export function StudentDeepDive({ studentId }: { studentId: string }) {
  const [data, setData] = useState<DeepDive | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { data: rpc, error: err } = await supabase.rpc(
        "get_student_deep_dive" as any,
        { _student_id: studentId }
      );
      if (cancelled) return;
      if (err) setError("Could not load deep-dive data.");
      else setData(rpc as unknown as DeepDive);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  const plannerSeries = useMemo(
    () =>
      (data?.planner ?? [])
        .slice()
        .reverse()
        .map((w) => ({
          week: format(new Date(w.week_start), "MMM d"),
          planned: Number(w.planned_hours) || 0,
          actual: Number(w.actual_hours) || 0,
        })),
    [data]
  );

  const dailySeries = useMemo(
    () =>
      (data?.activity_by_day ?? []).map((d) => ({
        day: format(new Date(d.day + "T00:00:00"), "MMM d"),
        events: d.count,
      })),
    [data],
  );

  const radarData = useMemo(() => {
    const s = data?.scores ?? {};
    return [
      { dim: "Academics", value: Number(s.academics_score) || 0 },
      { dim: "Activities", value: Number(s.activities_score) || 0 },
      { dim: "Leadership", value: Number(s.leadership_score) || 0 },
      { dim: "Competitions", value: Number(s.competitions_score) || 0 },
      { dim: "Test prep", value: Number(s.test_prep_score) || 0 },
    ];
  }, [data]);

  const engagementTiles = useMemo(() => {
    const e = data?.engagement ?? {};
    return [
      { label: "Target colleges", value: e.applications ?? 0, hint: "Saved application entries" },
      { label: "Full apps drafted", value: e.full_applications ?? 0, hint: "Common-app style drafts" },
      { label: "LinkedIn imports", value: e.linkedin_imports ?? 0, hint: "Profile snapshots analysed" },
      { label: "Readiness reports", value: e.readiness_analyses ?? 0, hint: "Report-card analyses run" },
      { label: "Admissions checks", value: e.admissions_evals ?? 0, hint: "AI probability evaluations" },
    ];
  }, [data]);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
        <Skeleton className="h-64 col-span-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
          <AlertCircle className="h-4 w-4" /> {error ?? "No data."}
        </CardContent>
      </Card>
    );
  }

  const a = data.activity_summary;
  const c = data.credits ?? {};
  const dailyUsedPct =
    c.daily_limit && c.daily_limit > 0
      ? Math.min(100, Math.round(((c.credits_used_today ?? 0) / c.daily_limit) * 100))
      : 0;

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi
          icon={Activity}
          label="Last seen"
          value={a.last_seen ? formatDistanceToNow(new Date(a.last_seen), { addSuffix: true }) : "—"}
          hint={`${a.total_1d} events today`}
        />
        <Kpi icon={Eye} label="Page views (30d)" value={a.page_views_30d} hint={`${a.total_7d} events this week`} />
        <Kpi icon={LineChart} label="AI requests (30d)" value={a.ai_requests_30d} hint={`${a.credits_consumed_30d} credits consumed`} />
        <Kpi icon={LogIn} label="Logins (30d)" value={a.logins_30d} hint={`${a.total_30d} total events`} />
      </div>

      {/* Engagement milestones — real product usage signals */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" /> Product engagement
          </CardTitle>
          <CardDescription>
            What this student has actually built or run on Pathforge — counted from their saved work.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {engagementTiles.map((t) => (
            <div
              key={t.label}
              className="rounded-xl border border-border/60 bg-muted/20 p-4"
            >
              <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                {t.label}
              </div>
              <div className="text-2xl font-semibold tabular-nums text-foreground mt-1">
                {t.value}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1 leading-snug">
                {t.hint}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Daily activity sparkline — real, last 30 days */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" /> Daily engagement (last 30 days)
          </CardTitle>
          <CardDescription>One bar per day — total tracked events. Quiet stretches are obvious here.</CardDescription>
        </CardHeader>
        <CardContent>
          {dailySeries.every((d) => d.events === 0) ? (
            <p className="text-sm text-muted-foreground py-4">No tracked events in the last 30 days.</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={dailySeries} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="dd-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                <XAxis
                  dataKey="day"
                  className="text-[10px]"
                  interval="preserveStartEnd"
                  minTickGap={24}
                />
                <YAxis className="text-[10px]" allowDecimals={false} width={28} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="events"
                  stroke="hsl(var(--primary))"
                  strokeWidth={1.5}
                  fill="url(#dd-grad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">

        {/* Recent activity feed */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> Activity timeline
            </CardTitle>
            <CardDescription>Last 100 events, newest first</CardDescription>
          </CardHeader>
          <CardContent>
            {data.recent_activity.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No activity recorded yet.</p>
            ) : (
              <ScrollArea className="h-[360px] pr-3">
                <ul className="divide-y divide-border/50">
                  {data.recent_activity.map((it, i) => {
                    const Icon = ACTION_ICONS[it.action_type] ?? Activity;
                    return (
                      <li key={i} className="py-2 flex items-start gap-3">
                        <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
                              {it.action_type.replace(/_/g, " ")}
                            </Badge>
                            {it.page_path && (
                              <span className="text-[11px] text-muted-foreground font-mono truncate">
                                {it.page_path}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {formatDistanceToNow(new Date(it.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Credits */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CircleDollarSign className="h-4 w-4 text-primary" /> Credits & plan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Row label="Plan" value={(c.plan ?? "free").toString().toUpperCase()} />
            <Row label="Daily limit" value={c.daily_limit ?? "—"} />
            <Row label="Used today" value={`${c.credits_used_today ?? 0} / ${c.daily_limit ?? 0}`} />
            <div>
              <Progress value={dailyUsedPct} className="h-1.5" />
              <p className="text-[11px] text-muted-foreground mt-1">{dailyUsedPct}% of today's limit</p>
            </div>
            <Row label="Bonus credits" value={c.bonus_credits ?? 0} />
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* AI usage by feature */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <LineChart className="h-4 w-4 text-primary" /> AI usage by feature (30d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.ai_by_feature.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No AI requests yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.ai_by_feature}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="feature" className="text-xs" interval={0} angle={-15} textAnchor="end" height={60} />
                  <YAxis className="text-xs" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Planner adherence */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-primary" /> Planner adherence (last 6 weeks)
            </CardTitle>
            <CardDescription>Planned vs actual hours per week</CardDescription>
          </CardHeader>
          <CardContent>
            {plannerSeries.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No planner data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={plannerSeries}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="week" className="text-xs" />
                  <YAxis className="text-xs" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="planned" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="actual" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Score breakdown radar — real journey sub-scores */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Profile score breakdown
            </CardTitle>
            <CardDescription>The five dimensions Pathforge scores from this student's verified journey work.</CardDescription>
          </CardHeader>
          <CardContent>
            {radarData.every((r) => r.value === 0) ? (
              <p className="text-sm text-muted-foreground py-4">No journey score recorded yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={radarData} outerRadius="75%">
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="dim" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                  <Radar
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.25}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Admissions probability history */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" /> Recent admissions checks
            </CardTitle>
            <CardDescription>Last five AI admissions probability evaluations this student ran.</CardDescription>
          </CardHeader>
          <CardContent>
            {(data.admissions_recent ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No admissions evaluations recorded yet.</p>
            ) : (
              <ul className="space-y-2">
                {data.admissions_recent.map((r, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{r.college}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                        {r.verdict ? ` • ${r.verdict}` : ""}
                      </p>
                    </div>
                    {typeof r.probability === "number" && (
                      <Badge
                        variant="outline"
                        className="tabular-nums text-[11px] flex-shrink-0"
                      >
                        {Math.round(r.probability)}%
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">

        {/* Outcomes counts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" /> Verifiable outcomes
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Tile label="Courses" value={data.outcomes.courses} />
            <Tile label="Projects" value={data.outcomes.projects} />
            <Tile label="Leadership" value={data.outcomes.leadership_roles} />
            <Tile label="Competitions" value={data.outcomes.competitions} />
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" /> Recent notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No notifications yet.</p>
            ) : (
              <ScrollArea className="h-[220px] pr-3">
                <ul className="space-y-2">
                  {data.notifications.map((n, i) => (
                    <li key={i} className="rounded-lg border border-border/60 p-2.5">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground truncate">{n.title}</p>
                        {!n.is_read && <Badge className="text-[9px] px-1.5 py-0">new</Badge>}
                      </div>
                      <p className="text-[12px] text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </p>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Activity;
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon className="h-4 w-4 text-primary" />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <div className="text-xl font-semibold text-foreground tabular-nums truncate">{value}</div>
        {hint && <div className="text-[11px] text-muted-foreground mt-1">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex justify-between items-baseline text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums text-foreground">{value}</span>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/30 p-3 flex items-center gap-3">
      <TrendingUp className="h-4 w-4 text-primary" />
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-lg font-semibold tabular-nums">{value}</div>
      </div>
    </div>
  );
}
