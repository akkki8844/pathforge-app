import { useMemo } from "react";
import { motion } from "framer-motion";
import { Zap, CheckCircle2, Circle } from "lucide-react";
import type { MilestoneItem } from "@/hooks/useJourneyData";

interface Props {
  milestones: MilestoneItem[];
  onToggle: (id: string) => void;
  grade: string;
}

export function WeeklyActionPlan({ milestones, onToggle, grade }: Props) {
  const weeklyTasks = useMemo(() => {
    // Pick top 3 incomplete milestones, prioritized by critical > high > recommended
    return milestones
      .filter(m => !m.completed)
      .sort((a, b) => {
        const order = { critical: 0, high: 1, recommended: 2 };
        return order[a.priority] - order[b.priority];
      })
      .slice(0, 3);
  }, [milestones]);

  if (weeklyTasks.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-elevated rounded-2xl p-5 border-l-4 border-l-accent"
    >
      <div className="flex items-center gap-2 mb-1">
        <Zap className="h-4 w-4 text-accent" />
        <h3 className="font-semibold text-foreground text-sm">This Week's Focus</h3>
      </div>
      <p className="text-[11px] text-muted-foreground mb-4">
        Your top priorities right now. Complete these to make the most progress.
      </p>
      <div className="space-y-2.5">
        {weeklyTasks.map((task, i) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="flex items-start gap-3 p-3 rounded-lg bg-card border border-border/50 hover:border-accent/30 transition-colors group"
          >
            <button
              onClick={() => onToggle(task.id)}
              className="mt-0.5 flex-shrink-0 transition-transform hover:scale-110"
            >
              {task.completed ? (
                <CheckCircle2 className="h-4 w-4 text-accent" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors" />
              )}
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-foreground">{task.title}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">{task.category.replace('_', ' ')} · {task.priority}</p>
            </div>
            <span className="text-[10px] font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded-full flex-shrink-0">
              {i + 1}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
