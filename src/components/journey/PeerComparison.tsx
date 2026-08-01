import { useMemo } from "react";
import { motion } from "framer-motion";
import { Users, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { JourneyScores } from "@/hooks/useJourneyData";

// Anonymous benchmark data (representative averages)
const BENCHMARKS: Record<string, { foundation: number; build: number; excel: number; launch: number }> = {
  academics: { foundation: 35, build: 55, excel: 75, launch: 85 },
  activities: { foundation: 15, build: 40, excel: 65, launch: 75 },
  leadership: { foundation: 10, build: 30, excel: 55, launch: 70 },
  competitions: { foundation: 5, build: 25, excel: 50, launch: 65 },
  test_prep: { foundation: 10, build: 35, excel: 60, launch: 80 },
};

interface Props {
  scores: JourneyScores;
  phase: string;
}

export function PeerComparison({ scores, phase }: Props) {
  const comparisons = useMemo(() => {
    const phaseKey = phase as keyof typeof BENCHMARKS.academics;
    return [
      { label: "Academics", yours: scores.academics_score, avg: BENCHMARKS.academics[phaseKey] },
      { label: "Activities", yours: scores.activities_score, avg: BENCHMARKS.activities[phaseKey] },
      { label: "Leadership", yours: scores.leadership_score, avg: BENCHMARKS.leadership[phaseKey] },
      { label: "Competitions", yours: scores.competitions_score, avg: BENCHMARKS.competitions[phaseKey] },
      { label: "Test Prep", yours: scores.test_prep_score, avg: BENCHMARKS.test_prep[phaseKey] },
    ];
  }, [scores, phase]);

  return (
    <div className="card-elevated rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <Users className="h-4 w-4 text-accent" />
        <h3 className="font-semibold text-foreground text-sm">How You Compare</h3>
      </div>
      <p className="text-[10px] text-muted-foreground mb-4">
        Anonymous benchmarks from students targeting similar universities
      </p>
      <div className="space-y-2.5">
        {comparisons.map((c, i) => {
          const diff = c.yours - c.avg;
          const Icon = diff > 5 ? TrendingUp : diff < -5 ? TrendingDown : Minus;
          const color = diff > 5 ? "text-accent" : diff < -5 ? "text-destructive" : "text-muted-foreground";

          return (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center justify-between"
            >
              <span className="text-xs text-foreground">{c.label}</span>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">Avg: {c.avg}</span>
                  <span className="text-xs font-bold text-foreground">You: {c.yours}</span>
                </div>
                <Icon className={`h-3 w-3 ${color}`} />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
