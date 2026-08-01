import { useMemo } from "react";
import { motion } from "framer-motion";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import type { JourneyScores } from "@/hooks/useJourneyData";
import { AlertIcon } from "@/components/icons/FlatIcons";

interface Props {
  scores: JourneyScores;
  onboardingData: any;
}

export function ProgressRadar({ scores, onboardingData }: Props) {
  const data = useMemo(() => {
    // Add research and community/impact as derived scores
    const researchScore = Math.min(100, scores.activities_score * 0.6 + scores.competitions_score * 0.4);
    const communityScore = Math.min(100, scores.leadership_score * 0.7 + scores.activities_score * 0.3);

    return [
      { category: "Academics", value: scores.academics_score, fullMark: 100 },
      { category: "Competitions", value: scores.competitions_score, fullMark: 100 },
      { category: "Research", value: Math.round(researchScore), fullMark: 100 },
      { category: "Leadership", value: scores.leadership_score, fullMark: 100 },
      { category: "Community", value: Math.round(communityScore), fullMark: 100 },
      { category: "Test Prep", value: scores.test_prep_score, fullMark: 100 },
    ];
  }, [scores]);

  const weakAreas = data.filter(d => d.value < 30).map(d => d.category);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-elevated rounded-2xl p-5"
    >
      <h3 className="font-semibold text-foreground text-sm mb-1">Profile Radar</h3>
      <p className="text-[11px] text-muted-foreground mb-3">
        Visual breakdown across key admissions dimensions
      </p>

      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis
              dataKey="category"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }}
            />
            <Radar
              name="Score"
              dataKey="value"
              stroke="hsl(var(--accent))"
              fill="hsl(var(--accent))"
              fillOpacity={0.2}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {weakAreas.length > 0 && (
        <div className="mt-2 p-2.5 rounded-lg bg-destructive/5 border border-destructive/20">
          <p className="text-[11px] text-foreground font-medium inline-flex items-center gap-1">
            <AlertIcon className="h-4 w-4 shrink-0" /> Weak areas: {weakAreas.join(", ")}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Focus on these to build a well-rounded application profile.
          </p>
        </div>
      )}

      {/* Score breakdown */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        {data.map(d => (
          <div key={d.category} className="text-center p-1.5 rounded-lg bg-muted/30">
            <p className="text-[10px] text-muted-foreground">{d.category}</p>
            <p className={`text-sm font-bold ${d.value < 30 ? "text-destructive" : d.value < 60 ? "text-accent" : "text-green-600 dark:text-green-400"}`}>
              {d.value}<span className="text-[9px] text-muted-foreground">/100</span>
            </p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
