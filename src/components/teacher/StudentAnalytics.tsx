import { useMemo } from "react";
import {
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import { BarChart3, Activity, Scale } from "lucide-react";

interface JourneyScores {
  overall_score: number;
  academics_score: number;
  activities_score: number;
  leadership_score: number;
  competitions_score: number;
  test_prep_score: number;
}

interface OutcomesCounts {
  courses: number;
  projects: number;
  leadership_roles: number;
  competitions: number;
}

interface Props {
  scores: JourneyScores | null;
  outcomes: OutcomesCounts;
}

/**
 * Real, data-driven analytics for a single student.
 * - Radar: profile dimensions (academics, activities, leadership, competitions, test prep)
 * - Balance bars: academic vs extracurricular weight
 * - Activity impact: count breakdown across the 4 outcome areas
 *
 * No fake series, no synthetic timestamps — only what we actually have.
 */
export function StudentAnalytics({ scores, outcomes }: Props) {
  const radarData = useMemo(
    () => [
      { dim: "Academics", value: scores?.academics_score ?? 0 },
      { dim: "Activities", value: scores?.activities_score ?? 0 },
      { dim: "Leadership", value: scores?.leadership_score ?? 0 },
      { dim: "Competitions", value: scores?.competitions_score ?? 0 },
      { dim: "Test prep", value: scores?.test_prep_score ?? 0 },
    ],
    [scores],
  );

  const balance = useMemo(() => {
    const academic = scores ? Math.round((scores.academics_score + scores.test_prep_score) / 2) : 0;
    const extracurricular = scores
      ? Math.round((scores.activities_score + scores.leadership_score + scores.competitions_score) / 3)
      : 0;
    return [
      { name: "Academic", value: academic },
      { name: "Extracurricular", value: extracurricular },
    ];
  }, [scores]);

  const activityImpact = useMemo(
    () => [
      { name: "Courses", value: outcomes.courses },
      { name: "Projects", value: outcomes.projects },
      { name: "Leadership", value: outcomes.leadership_roles },
      { name: "Competitions", value: outcomes.competitions },
    ],
    [outcomes],
  );

  const totalOutcomes =
    outcomes.courses + outcomes.projects + outcomes.leadership_roles + outcomes.competitions;
  const hasScores = !!scores && scores.overall_score + scores.academics_score + scores.activities_score > 0;

  if (!hasScores && totalOutcomes === 0) {
    return (
      <div className="card-elevated p-8 text-center">
        <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          No analytics yet. Charts populate automatically as the student logs activity, completes
          journey milestones, or adds outcomes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card-elevated p-5">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-4 w-4 text-accent" />
            <h3 className="text-sm font-semibold text-foreground">Profile dimensions</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="75%">
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="dim" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                <Radar
                  dataKey="value"
                  stroke="hsl(var(--accent))"
                  fill="hsl(var(--accent))"
                  fillOpacity={0.25}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            Each axis is a 0–100 sub-score from the student's Journey progress.
          </p>
        </div>

        <div className="card-elevated p-5">
          <div className="flex items-center gap-2 mb-3">
            <Scale className="h-4 w-4 text-accent" />
            <h3 className="text-sm font-semibold text-foreground">Academic vs Extracurricular balance</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={balance} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid horizontal={false} stroke="hsl(var(--border))" />
                <XAxis type="number" domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={110}
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
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {balance.map((b, i) => (
                    <Cell key={i} fill={i === 0 ? "hsl(var(--accent))" : "hsl(var(--primary))"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            A healthy applicant typically lands within ~15 points on both axes.
          </p>
        </div>
      </div>

      <div className="card-elevated p-5">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold text-foreground">Activity impact (logged outcomes)</h3>
          <span className="ml-auto text-xs text-muted-foreground">{totalOutcomes} total</span>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={activityImpact} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
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
          </ResponsiveContainer>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          Counts come from the student's Outcomes page. Use these to spot where the profile is thin.
        </p>
      </div>
    </div>
  );
}
