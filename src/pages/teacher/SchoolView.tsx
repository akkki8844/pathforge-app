import { useEffect, useMemo, useState } from "react";
import { School, TrendingUp, AlertTriangle, Users, GraduationCap } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from "recharts";
import { TeacherLayout } from "@/components/teacher/TeacherLayout";
import { BackToCommand } from "@/components/teacher/BackToCommand";
import { useTeacherRoster } from "@/hooks/useTeacherRoster";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

/**
 * School-wide view for a counselor.
 * Aggregates the linked roster into trends the counselor can act on:
 * - Score distribution buckets
 * - Top intended majors at this school
 * - Grade-level spread
 * - Test-score coverage
 */
export default function CounselorSchoolView() {
  const { teacherProfile } = useAuth();
  const { students, loading } = useTeacherRoster();
  const [schoolName, setSchoolName] = useState<string>("");

  useEffect(() => {
    if (!teacherProfile?.school_id) return;
    supabase.from("schools").select("name").eq("id", teacherProfile.school_id).maybeSingle()
      .then(({ data }) => setSchoolName(data?.name ?? ""));
  }, [teacherProfile?.school_id]);

  const metrics = useMemo(() => {
    const scored = students.filter((s) => s.overall_score > 0);
    const avg = scored.length
      ? Math.round(scored.reduce((a, s) => a + s.overall_score, 0) / scored.length)
      : 0;
    const top = students.filter((s) => s.status === "top").length;
    const behind = students.filter((s) => s.status === "behind").length;
    return { avg, top, behind, hasScored: scored.length > 0 };
  }, [students]);

  const distribution = useMemo(() => {
    const buckets = [
      { range: "0–19", value: 0 },
      { range: "20–39", value: 0 },
      { range: "40–59", value: 0 },
      { range: "60–79", value: 0 },
      { range: "80–100", value: 0 },
    ];
    students.forEach((s) => {
      const i = Math.min(4, Math.floor(s.overall_score / 20));
      buckets[i].value++;
    });
    return buckets;
  }, [students]);

  const grades = useMemo(() => {
    const map = new Map<string, number>();
    students.forEach((s) => {
      const g = s.grade ?? "Unknown";
      map.set(g, (map.get(g) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name: name === "Unknown" ? "?" : `Grade ${name}`, value }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [students]);

  const majors = useMemo(() => {
    const map = new Map<string, number>();
    students.forEach((s) => {
      const m = s.intended_major?.trim() || "Undecided";
      map.set(m, (map.get(m) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [students]);

  if (!teacherProfile?.school_id) {
    return (
      <TeacherLayout>
        <div className="card-elevated p-8 text-center">
          <School className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <h1 className="text-lg font-semibold text-foreground">No school linked yet</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Connect to a school from your profile to unlock the school-wide view.
          </p>
        </div>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout>
      <BackToCommand />
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <School className="h-5 w-5 text-accent" />
            {schoolName || "Your school"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Aggregated view of every student linked to your school. Use it to spot trends and pick where to focus next.
          </p>
        </header>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat icon={Users} label="Linked students" value={students.length.toString()} />
          <Stat
            icon={GraduationCap}
            label="Average profile score"
            value={metrics.hasScored ? `${metrics.avg}/100` : "—"}
            sub={metrics.hasScored ? undefined : "No journey activity yet"}
          />
          <Stat icon={TrendingUp} label="On track" value={metrics.top.toString()} accent />
          <Stat icon={AlertTriangle} label="High priority" value={metrics.behind.toString()} warn />
        </section>

        {loading ? (
          <div className="card-elevated p-6 text-sm text-muted-foreground">Loading school data…</div>
        ) : students.length === 0 ? (
          <div className="card-elevated p-8 text-center text-sm text-muted-foreground">
            No students linked to this school yet. Students who select your school during onboarding will appear here automatically.
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-4">
            <ChartCard title="Profile score distribution" total={students.length}>
              <BarChart data={distribution}>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="range" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {distribution.map((d, i) => (
                    <Cell key={i} fill={i < 2 ? "hsl(var(--destructive))" : i < 4 ? "hsl(var(--primary))" : "hsl(var(--accent))"} />
                  ))}
                </Bar>
              </BarChart>
            </ChartCard>

            <ChartCard title="Grade-level spread" total={students.length}>
              <BarChart data={grades}>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="value" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartCard>

            <div className="lg:col-span-2">
              <ChartCard title="Top intended majors" total={majors.length} height={280}>
                <BarChart data={majors} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={170}
                    tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
                  />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ChartCard>
            </div>
          </div>
        )}
      </div>
    </TeacherLayout>
  );
}

function Stat({
  icon: Icon, label, value, sub, accent, warn,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="card-elevated p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className={`h-3.5 w-3.5 ${accent ? "text-accent" : warn ? "text-destructive" : ""}`} />
        {label}
      </div>
      <div className={`text-2xl font-bold mt-1 ${accent ? "text-accent" : warn ? "text-destructive" : "text-foreground"}`}>
        {value}
      </div>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

function ChartCard({
  title, total, children, height = 240,
}: {
  title: string;
  total: number;
  children: React.ReactElement;
  height?: number;
}) {
  return (
    <div className="card-elevated p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <span className="text-xs text-muted-foreground">{total}</span>
      </div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
