import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  BarChart3, TrendingUp, Users, GraduationCap, FileText, Calendar,
  Target, Globe, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { TeacherLayout } from "@/components/teacher/TeacherLayout";
import { useTeacherRoster } from "@/hooks/useTeacherRoster";
import { useCounselorActivity } from "@/hooks/useCounselorActivity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function TeacherAnalytics() {
  const { students, loading } = useTeacherRoster();
  const studentIds = useMemo(() => students.map((s) => s.user_id), [students]);
  const nameMap = useMemo(
    () => new Map(students.map((s) => [s.user_id, s.username || s.email || "Student"])),
    [students],
  );
  const scoreMap = useMemo(
    () => new Map(students.map((s) => [s.user_id, s.overall_score])),
    [students],
  );
  const { recent, deadlines, inactive } = useCounselorActivity({ studentIds, nameMap, scoreMap });

  const stats = useMemo(() => {
    const scored = students.filter((s) => s.overall_score > 0);
    const avgScore = scored.length
      ? Math.round(scored.reduce((a, s) => a + s.overall_score, 0) / scored.length)
      : 0;
    const atRisk = students.filter((s) => s.status === "behind").length;
    const strong = students.filter((s) => s.status === "top").length;
    const engagementRate = students.length > 0
      ? Math.round(((students.length - inactive.length) / students.length) * 100)
      : 0;

    return { avgScore, atRisk, strong, engagementRate, total: students.length };
  }, [students, inactive]);

  const majorDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    students.forEach((s) => {
      const major = s.intended_major || "Undecided";
      counts[major] = (counts[major] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [students]);

  const gradeDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    students.forEach((s) => {
      const grade = s.grade || "Unknown";
      counts[grade] = (counts[grade] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0]));
  }, [students]);

  const maxMajor = majorDistribution.length > 0 ? majorDistribution[0][1] : 1;
  const maxGrade = gradeDistribution.length > 0 ? Math.max(...gradeDistribution.map(([, v]) => v)) : 1;

  return (
    <TeacherLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Insights across your student roster</p>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: "Total Students", value: stats.total, icon: Users, color: "text-accent" },
            { label: "Avg Score", value: stats.avgScore, suffix: "/100", icon: Target, color: "text-blue-600" },
            { label: "At Risk", value: stats.atRisk, icon: TrendingUp, color: "text-red-600" },
            { label: "Strong", value: stats.strong, icon: GraduationCap, color: "text-green-600" },
            { label: "Engagement", value: stats.engagementRate, suffix: "%", icon: BarChart3, color: "text-purple-600" },
          ].map((kpi, i) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card-elevated p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <kpi.icon className={cn("h-4 w-4", kpi.color)} />
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{kpi.label}</p>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {kpi.value}<span className="text-sm font-normal text-muted-foreground">{kpi.suffix || ""}</span>
              </p>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Major Distribution */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
                Intended Majors
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 w-24 bg-muted rounded mb-1" />
                    <div className="h-2 bg-muted rounded" />
                  </div>
                ))
              ) : majorDistribution.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
              ) : (
                majorDistribution.map(([major, count]) => (
                  <div key={major}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-foreground truncate mr-2">{major}</span>
                      <span className="text-xs text-muted-foreground font-medium">{count}</span>
                    </div>
                    <Progress value={(count / maxMajor) * 100} className="h-1.5" />
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Grade Distribution */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Grade Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-40 bg-muted rounded animate-pulse" />
              ) : gradeDistribution.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
              ) : (
                <div className="flex items-end gap-3 h-40">
                  {gradeDistribution.map(([grade, count]) => (
                    <div key={grade} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs font-medium text-foreground">{count}</span>
                      <div
                        className="w-full bg-accent/20 rounded-t"
                        style={{ height: `${(count / maxGrade) * 120}px` }}
                      />
                      <span className="text-[10px] text-muted-foreground">{grade}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Inactive Students */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Inactive Students
              </CardTitle>
            </CardHeader>
            <CardContent>
              {inactive.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">All students active</p>
              ) : (
                <div className="space-y-2">
                  {inactive.slice(0, 6).map((s) => (
                    <div key={s.user_id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30">
                      <span className="text-sm text-foreground">{s.display_name}</span>
                      <Badge variant="outline" className="text-xs bg-red-500/10 text-red-600 border-red-500/20">
                        {s.daysInactive}d inactive
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recent.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
              ) : (
                <div className="space-y-2">
                  {recent.slice(0, 6).map((r) => (
                    <div key={r.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30">
                      <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center text-accent text-xs font-bold shrink-0">
                        {r.display_name[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">{r.display_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{r.label}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {new Date(r.at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </TeacherLayout>
  );
}
