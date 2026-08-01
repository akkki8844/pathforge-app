import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  TrendingUp, AlertTriangle, Users, GraduationCap, ArrowRight, Search,
  Activity, CalendarClock, MessageSquare, FileText, Mic, ClipboardList, Clock, Target,
} from "lucide-react";
import { TeacherLayout } from "@/components/teacher/TeacherLayout";
import { useTeacherRoster } from "@/hooks/useTeacherRoster";
import { useCounselorActivity, type RecentSignal } from "@/hooks/useCounselorActivity";
import { useCounselorFollowups } from "@/hooks/useCounselorFollowups";
import { DailyFocusPanel } from "@/components/teacher/DailyFocusPanel";
import { FollowupsPanel } from "@/components/teacher/FollowupsPanel";
import { InterventionAlertsPanel, buildInterventionAlerts } from "@/components/teacher/InterventionAlertsPanel";
import { WorkloadTiles } from "@/components/teacher/WorkloadTiles";
import { FellowCounsellorsWidget } from "@/components/teacher/FellowCounsellorsWidget";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type PriorityFilter = "all" | "high" | "needs" | "track";
type SortKey = "priority" | "score_asc" | "score_desc" | "name";

/**
 * Counsellor Command Center — quiet-luxury Notion/Apple aesthetic.
 * Flat hairline surfaces, monochrome icons, generous whitespace, real signals only.
 */
export default function TeacherDashboard() {
  const { students, loading } = useTeacherRoster();
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("priority");

  const studentIds = useMemo(() => students.map((s) => s.user_id), [students]);
  const nameMap = useMemo(
    () => new Map(students.map((s) => [s.user_id, s.username || s.email || "Student"])),
    [students],
  );
  const scoreMap = useMemo(
    () => new Map(students.map((s) => [s.user_id, s.overall_score])),
    [students],
  );
  const { recent, deadlines, inactive, loading: activityLoading } =
    useCounselorActivity({ studentIds, nameMap, scoreMap });
  const { items: followups } = useCounselorFollowups();

  const { top, behind, avg, hasAnyScore } = useMemo(() => {
    const top = students.filter((s) => s.status === "top");
    const behind = students.filter((s) => s.status === "behind");
    const scored = students.filter((s) => s.overall_score > 0);
    const avg = scored.length
      ? Math.round(scored.reduce((a, s) => a + s.overall_score, 0) / scored.length)
      : 0;
    return { top, behind, avg, hasAnyScore: scored.length > 0 };
  }, [students]);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = students.filter((s) => {
      if (q) {
        const hay = `${s.username ?? ""} ${s.email ?? ""} ${s.intended_major ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (priorityFilter === "high") return s.status === "behind";
      if (priorityFilter === "needs") return s.status === "steady";
      if (priorityFilter === "track") return s.status === "top";
      return true;
    });
    const priorityRank = (status: string) => (status === "behind" ? 0 : status === "steady" ? 1 : 2);
    list = [...list].sort((a, b) => {
      if (sortKey === "score_asc") return a.overall_score - b.overall_score;
      if (sortKey === "score_desc") return b.overall_score - a.overall_score;
      if (sortKey === "name") {
        const an = (a.username || a.email || "").toLowerCase();
        const bn = (b.username || b.email || "").toLowerCase();
        return an.localeCompare(bn);
      }
      const r = priorityRank(a.status) - priorityRank(b.status);
      return r !== 0 ? r : a.overall_score - b.overall_score;
    });
    return list;
  }, [students, search, priorityFilter, sortKey]);

  // Cohort-level goals — derived from real roster signals only.
  const cohortGoals = useMemo(() => {
    const total = students.length;
    const activeCount = Math.max(0, total - inactive.length);
    return [
      {
        label: "Cohort average score",
        current: hasAnyScore ? avg : 0,
        target: 60,
        unit: "/100",
        hint: hasAnyScore
          ? avg >= 60 ? "On target." : `${60 - avg} points to target.`
          : "Awaiting first scored profile.",
      },
      {
        label: "On-track ratio",
        current: total ? Math.round((top.length / total) * 100) : 0,
        target: 50,
        unit: "%",
        hint: total
          ? `${top.length} of ${total} students at score ≥ 70.`
          : "No linked students yet.",
      },
      {
        label: "High-priority cleared",
        current: total ? Math.round(((total - behind.length) / total) * 100) : 0,
        target: 100,
        unit: "%",
        hint: total
          ? behind.length === 0 ? "Nobody currently flagged." : `${behind.length} student${behind.length === 1 ? "" : "s"} still flagged.`
          : "—",
      },
      {
        label: "Active in last 14 days",
        current: total ? Math.round((activeCount / total) * 100) : 0,
        target: 80,
        unit: "%",
        hint: total
          ? `${activeCount} of ${total} touched the platform recently.`
          : "—",
      },
    ];
  }, [students.length, inactive.length, top.length, behind.length, avg, hasAnyScore]);

  return (
    <TeacherLayout>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-12"
      >
        {/* Page header — quiet, no gradient, no orbs */}
        <header className="pb-8 border-b border-border/60">
          <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="text-[11px] font-medium tracking-[0.18em] uppercase text-muted-foreground">
                Command centre
              </div>
              <h1 className="text-[2rem] lg:text-[2.5rem] font-semibold tracking-tight leading-[1.05] text-foreground">
                Good to see you back.
              </h1>
              <p className="text-[15px] text-muted-foreground leading-relaxed">
                Real signals across your linked students — who needs you now, what's moving, and what's due in the next sixty days.
              </p>
            </div>
            <div className="text-xs text-muted-foreground tabular-nums">
              {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </div>
          </div>
        </header>

        {/* KPI strip */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border/60 rounded-2xl overflow-hidden border border-border/60">
          {[
            { icon: Users, label: "Linked students", value: students.length.toString(), sub: students.length === 0 ? "Awaiting first student" : "Across your school" },
            {
              icon: GraduationCap,
              label: "Average profile score",
              value: hasAnyScore ? `${avg}` : "—",
              suffix: hasAnyScore ? "/100" : undefined,
              sub: hasAnyScore ? "Across all linked students" : "No journey activity yet",
            },
            { icon: TrendingUp, label: "On track", value: students.length === 0 ? "—" : top.length.toString(), sub: students.length === 0 ? "—" : "Profile score ≥ 70" },
            { icon: AlertTriangle, label: "High priority", value: students.length === 0 ? "—" : behind.length.toString(), warn: true, sub: students.length === 0 ? "—" : "Profile score < 30" },
          ].map((s) => <StatCard key={s.label} {...s} />)}
        </section>

        {/* Goal tracker — cohort-level */}
        <SectionBlock
          eyebrow="Goals"
          title="Cohort goals"
          subtitle="Where your roster stands against the targets that matter — updated live from real signals."
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border/60 rounded-2xl overflow-hidden border border-border/60">
            {cohortGoals.map((g) => (
              <GoalRow key={g.label} {...g} />
            ))}
          </div>
        </SectionBlock>

        {/* Workload + Intervention alerts */}
        <SectionBlock
          eyebrow="Workload"
          title="Your control room"
          subtitle="Where your time should go this week — backed by real signals across your roster."
        >
          <div className="space-y-5">
            <WorkloadTiles
              students={students}
              inactive={inactive}
              followups={followups}
              alerts={buildInterventionAlerts({ students, inactive, deadlines, followups })}
            />
            <InterventionAlertsPanel
              students={students}
              inactive={inactive}
              deadlines={deadlines}
              followups={followups}
              loading={activityLoading}
            />
          </div>
        </SectionBlock>

        {/* Today's plan — daily focus + follow-ups */}
        <SectionBlock
          eyebrow="Today's plan"
          title="What needs your attention"
          subtitle="Your daily focus list and tracked follow-ups, in one view."
        >
          <div className="grid xl:grid-cols-3 gap-5">
            <div className="xl:col-span-1 space-y-5">
              <DailyFocusPanel followups={followups} students={students} inactive={inactive} />
              <FellowCounsellorsWidget />
            </div>
            <div className="xl:col-span-2">
              <FollowupsPanel students={students} />
            </div>
          </div>
        </SectionBlock>

        {/* Priority focus */}
        <SectionBlock
          eyebrow="Roster pulse"
          title="High-priority and on-track students"
          subtitle="Quick triage — who needs intervention, who you can lean on as a model."
        >
          <div className="grid lg:grid-cols-2 gap-5">
            <FocusList
              title="High priority"
              emptyText="Nobody's flagged right now."
              students={behind}
              tone="warn"
              loading={loading}
            />
            <FocusList
              title="On track"
              emptyText="No standout performers yet — guide one student to the top of the cohort."
              students={top}
              tone="accent"
              loading={loading}
            />
          </div>
        </SectionBlock>

        {/* Live signals */}
        <SectionBlock
          eyebrow="Live signals"
          title="What's happening across your students"
          subtitle="Activity from the past two weeks, deadlines in the next sixty days, and at-risk profiles."
        >
          <div className="grid lg:grid-cols-3 gap-5">
            <PanelCard icon={Activity} title="Recent activity" meta="last 14d">
              {activityLoading ? (
                <PanelSkeleton />
              ) : recent.length === 0 ? (
                <PanelEmpty>
                  No student activity in the last 14 days. Send a check-in note from a student profile.
                </PanelEmpty>
              ) : (
                <ul className="divide-y divide-border/60">
                  {recent.map((r) => <ActivityRow key={r.id} signal={r} />)}
                </ul>
              )}
            </PanelCard>

            <PanelCard icon={CalendarClock} title="Upcoming deadlines" meta="next 60d">
              {activityLoading ? (
                <PanelSkeleton />
              ) : deadlines.length === 0 ? (
                <PanelEmpty>
                  No deadlines tracked. Add target colleges with deadlines from a student's Applications tab.
                </PanelEmpty>
              ) : (
                <ul className="divide-y divide-border/60">
                  {deadlines.map((d) => (
                    <li key={d.id}>
                      <Link
                        to={`/teacher/students/${d.student_id}`}
                        className="block px-5 py-3.5 hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-medium text-foreground truncate">{d.college_name}</div>
                          <DeadlineChip days={d.daysAway} />
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 truncate">
                          {d.display_name} • {d.stage}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </PanelCard>

            <PanelCard
              icon={AlertTriangle}
              title="At risk: inactive 7d+"
              meta={inactive.length.toString()}
            >
              {activityLoading ? (
                <PanelSkeleton />
              ) : inactive.length === 0 ? (
                <PanelEmpty>
                  No at-risk students. Everyone with a weak profile has touched the platform recently.
                </PanelEmpty>
              ) : (
                <ul className="divide-y divide-border/60">
                  {inactive.map((s) => (
                    <li key={s.user_id}>
                      <Link
                        to={`/teacher/students/${s.user_id}`}
                        className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-muted/40 transition-colors text-sm"
                      >
                        <div className="min-w-0">
                          <div className="font-medium text-foreground truncate">{s.display_name}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                            <Clock className="h-3 w-3" />
                            {s.daysInactive >= 999 ? "never active" : `${s.daysInactive}d inactive`} • {s.overall_score}/100
                          </div>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </PanelCard>
          </div>
        </SectionBlock>

        {/* Roster table */}
        <SectionBlock
          eyebrow="Roster"
          title="All linked students"
          subtitle="Search, filter and sort the complete list. Click any row to open their profile."
        >
          <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
            <div className="p-5 border-b border-border/60 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-foreground">Full roster</h3>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {filteredStudents.length} of {students.length}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-6 relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name, email, or major"
                    className="h-10 pl-9 text-sm bg-background"
                  />
                </div>
                <div className="md:col-span-3">
                  <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as PriorityFilter)}>
                    <SelectTrigger className="h-10 text-sm bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All priorities</SelectItem>
                      <SelectItem value="high">High priority only</SelectItem>
                      <SelectItem value="needs">Needs attention only</SelectItem>
                      <SelectItem value="track">On track only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-3">
                  <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
                    <SelectTrigger className="h-10 text-sm bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="priority">Sort: Priority</SelectItem>
                      <SelectItem value="score_asc">Sort: Score ↑</SelectItem>
                      <SelectItem value="score_desc">Sort: Score ↓</SelectItem>
                      <SelectItem value="name">Sort: Name</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="p-10 text-center text-sm text-muted-foreground">Loading roster…</div>
            ) : students.length === 0 ? (
              <div className="p-12 text-center">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted/60 mb-3">
                  <Users className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">No students linked yet</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                  Students who select your school during onboarding will appear here automatically.
                </p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">
                No students match the current filters.
              </div>
            ) : (
              <>
                <div className="hidden md:grid grid-cols-12 gap-3 px-5 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground bg-muted/30 border-b border-border/60">
                  <div className="col-span-4">Student</div>
                  <div className="col-span-5">Profile score</div>
                  <div className="col-span-3 text-right">Status</div>
                </div>
                <div className="divide-y divide-border/60">
                  {filteredStudents.map((s) => (
                    <Link
                      key={s.user_id}
                      to={`/teacher/students/${s.user_id}`}
                      className="grid grid-cols-12 gap-3 items-center px-5 py-4 hover:bg-muted/30 transition-colors text-sm group"
                    >
                      <div className="col-span-12 md:col-span-4 min-w-0 flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-muted/60 border border-border/60 flex items-center justify-center flex-shrink-0 text-xs font-semibold text-foreground">
                          {(s.username || s.email || "S").slice(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-foreground truncate">
                            {s.username || s.email || "Student"}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {s.intended_major || "Major TBD"} • Grade {s.grade ?? "?"}
                          </div>
                        </div>
                      </div>
                      <div className="col-span-8 md:col-span-5">
                        <div className="flex items-center gap-3">
                          <Progress value={s.overall_score} className="h-1 flex-1" />
                          <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">
                            {s.overall_score > 0 ? s.overall_score : "—"}
                          </span>
                        </div>
                      </div>
                      <div className="col-span-4 md:col-span-3 flex justify-end">
                        {s.status === "top" && (
                          <Badge variant="outline" className="text-[11px] font-normal">On track</Badge>
                        )}
                        {s.status === "behind" && (
                          <Badge variant="outline" className="text-[11px] font-normal text-destructive border-destructive/40">High priority</Badge>
                        )}
                        {s.status === "steady" && (
                          <Badge variant="outline" className="text-[11px] font-normal text-muted-foreground">Needs attention</Badge>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </SectionBlock>
      </motion.div>
    </TeacherLayout>
  );
}

/* ────────────────────────── helpers ────────────────────────── */

function SectionBlock({
  eyebrow, title, subtitle, children,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-5">
      <div className="space-y-1.5">
        <div className="text-[11px] font-medium tracking-[0.18em] uppercase text-muted-foreground">
          {eyebrow}
        </div>
        <h2 className="text-xl lg:text-[1.625rem] font-semibold text-foreground tracking-tight">{title}</h2>
        {subtitle && (
          <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">{subtitle}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function PanelCard({
  icon: Icon, title, meta, children,
}: {
  icon: React.ComponentType<any>;
  title: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden flex flex-col">
      <div className="px-5 py-4 border-b border-border/60 flex items-center gap-2.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.75} />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {meta && <span className="ml-auto text-[11px] text-muted-foreground tabular-nums">{meta}</span>}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function PanelSkeleton() {
  return (
    <div className="p-5 space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex gap-3 animate-pulse">
          <div className="h-3 w-3 rounded-full bg-muted mt-1" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-3/4 bg-muted rounded" />
            <div className="h-2 w-1/2 bg-muted/60 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

function PanelEmpty({ children }: { children: React.ReactNode }) {
  return <div className="p-6 text-xs text-muted-foreground leading-relaxed">{children}</div>;
}

const KIND_ICON = {
  advisor: Mic,
  readiness: ClipboardList,
  application: FileText,
  outcomes: GraduationCap,
  journey: TrendingUp,
} as const;

function ActivityRow({ signal }: { signal: RecentSignal }) {
  const Icon = KIND_ICON[signal.kind] ?? MessageSquare;
  return (
    <li>
      <Link
        to={`/teacher/students/${signal.user_id}`}
        className="flex items-start gap-3 px-5 py-3.5 hover:bg-muted/40 transition-colors"
      >
        <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-1" strokeWidth={1.75} />
        <div className="min-w-0 flex-1">
          <div className="text-sm text-foreground truncate">
            <span className="font-medium">{signal.display_name}</span>
            <span className="text-muted-foreground"> — {signal.label}</span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">{relativeTime(signal.at)}</div>
        </div>
      </Link>
    </li>
  );
}

function DeadlineChip({ days }: { days: number }) {
  if (days < 0) return <Badge variant="outline" className="text-[10px] font-normal text-destructive border-destructive/40">Overdue</Badge>;
  if (days <= 7) return <Badge variant="outline" className="text-[10px] font-normal text-destructive border-destructive/40">{days}d</Badge>;
  if (days <= 30) return <Badge variant="outline" className="text-[10px] font-normal">{days}d</Badge>;
  return <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground">{days}d</Badge>;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - +new Date(iso);
  const m = Math.round(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

function FocusList({
  title, emptyText, students, tone, loading,
}: {
  title: string;
  emptyText: string;
  students: Array<{ user_id: string; username: string | null; email: string | null; grade: string | null; intended_major: string | null; overall_score: number }>;
  tone: "warn" | "accent";
  loading: boolean;
}) {
  const dotTone = tone === "warn" ? "bg-destructive" : "bg-foreground/70";
  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className={`h-1.5 w-1.5 rounded-full ${dotTone}`} />
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          {students.length}
        </span>
      </div>
      {loading ? (
        <PanelSkeleton />
      ) : students.length === 0 ? (
        <PanelEmpty>{emptyText}</PanelEmpty>
      ) : (
        <ul className="divide-y divide-border/60">
          {students.slice(0, 5).map((s) => (
            <li key={s.user_id}>
              <Link
                to={`/teacher/students/${s.user_id}`}
                className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-muted/40 text-sm group transition-colors"
              >
                <div className="min-w-0">
                  <div className="font-medium text-foreground truncate">
                    {s.username || s.email || "Student"}
                  </div>
                  <div className="text-xs text-muted-foreground truncate mt-0.5">
                    {s.intended_major || "Major TBD"} • Grade {s.grade ?? "?"} • {s.overall_score > 0 ? `${s.overall_score}/100` : "no score yet"}
                  </div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon, label, value, suffix, sub, warn,
}: {
  icon: React.ComponentType<any>;
  label: string;
  value: string;
  suffix?: string;
  sub?: string;
  warn?: boolean;
}) {
  return (
    <div className="bg-card p-6 lg:p-7 flex flex-col">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </span>
        <Icon
          className={`h-3.5 w-3.5 ${warn ? "text-destructive/80" : "text-muted-foreground"}`}
          strokeWidth={1.75}
        />
      </div>
      <div className="mt-5 flex items-baseline gap-1">
        <div className="text-[2.25rem] lg:text-[2.5rem] font-semibold tracking-tight text-foreground tabular-nums leading-none">
          {value}
        </div>
        {suffix && <div className="text-sm text-muted-foreground">{suffix}</div>}
      </div>
      {sub && <div className="text-xs text-muted-foreground mt-2">{sub}</div>}
    </div>
  );
}

function GoalRow({
  label, current, target, unit, hint,
}: {
  label: string;
  current: number;
  target: number;
  unit: string;
  hint: string;
}) {
  const pct = Math.max(0, Math.min(100, target ? Math.round((current / target) * 100) : 0));
  const reached = current >= target;
  return (
    <div className="bg-card p-6 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Target className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" strokeWidth={1.75} />
          <span className="text-sm font-medium text-foreground truncate">{label}</span>
        </div>
        <span className="text-[11px] text-muted-foreground tabular-nums whitespace-nowrap">
          target {target}{unit}
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <div className="text-3xl font-semibold tracking-tight text-foreground tabular-nums leading-none">
          {current}
        </div>
        <div className="text-sm text-muted-foreground">{unit}</div>
        {reached && (
          <Badge variant="outline" className="ml-auto text-[10px] font-normal">Reached</Badge>
        )}
      </div>
      <div className="h-1 w-full bg-muted/60 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${reached ? "bg-foreground/70" : "bg-foreground/40"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}
