import { useMemo } from "react";
import { motion } from "framer-motion";
import { Flame, TrendingUp } from "lucide-react";

interface Props {
  completedMilestones: string[];
  journeyStartedAt?: string;
}

export function StreakTracker({ completedMilestones, journeyStartedAt }: Props) {
  const stats = useMemo(() => {
    const total = completedMilestones.length;
    const startDate = journeyStartedAt ? new Date(journeyStartedAt) : new Date();
    const daysSinceStart = Math.max(1, Math.ceil((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const weeksActive = Math.max(1, Math.ceil(daysSinceStart / 7));
    const avgPerWeek = (total / weeksActive).toFixed(1);

    // Simple streak: count consecutive weeks with at least 1 completion
    // For simplicity, we estimate based on activity
    const streak = total > 0 ? Math.min(weeksActive, Math.ceil(total / 1.5)) : 0;

    return { total, weeksActive, avgPerWeek, streak };
  }, [completedMilestones, journeyStartedAt]);

  return (
    <div className="card-elevated rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Flame className="h-4 w-4 text-accent" />
        <h3 className="font-semibold text-foreground text-sm">Your Streak</h3>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center p-3 rounded-xl bg-accent/10 border border-accent/20"
        >
          <div className="flex items-center justify-center gap-1">
            <Flame className="h-4 w-4 text-accent" />
            <span className="text-2xl font-bold text-accent">{stats.streak}</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Week Streak</p>
        </motion.div>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.05 }}
          className="text-center p-3 rounded-xl bg-card border border-border/50"
        >
          <div className="flex items-center justify-center gap-1">
            <TrendingUp className="h-4 w-4 text-foreground" />
            <span className="text-2xl font-bold text-foreground">{stats.total}</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Completed</p>
        </motion.div>
      </div>
      <div className="mt-3 p-2.5 rounded-lg bg-muted/50">
        <p className="text-[11px] text-muted-foreground text-center">
          Averaging <span className="font-semibold text-foreground">{stats.avgPerWeek}</span> milestones per week across <span className="font-semibold text-foreground">{stats.weeksActive}</span> weeks
        </p>
      </div>
    </div>
  );
}
