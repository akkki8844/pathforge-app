import { motion } from "framer-motion";
import { ArrowRight, Target, ExternalLink } from "lucide-react";
import { LevelTask } from "@/lib/journeyLevels";

interface Props {
  task: LevelTask | null;
  onAction: (task: LevelTask) => void;
}

/** Single, prominent "Do this next →" CTA. */
export function NextStepCTA({ task, onAction }: Props) {
  if (!task) return null;

  const isExternal = task.link?.startsWith("http");

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border-2 border-primary/30 bg-gradient-to-r from-primary/10 via-accent/5 to-primary/10 p-5 sm:p-6"
    >
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative flex items-start gap-4 flex-wrap sm:flex-nowrap">
        <div className="shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
          <Target className="w-6 h-6 text-primary-foreground" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-bold text-primary uppercase tracking-wider">
            Do this next →
          </div>
          <h3 className="text-base sm:text-lg font-bold text-foreground mt-0.5 leading-tight">
            {task.title}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {task.timeEstimate} · {task.outcome}
          </p>
        </div>

        <button
          onClick={() => onAction(task)}
          className="shrink-0 inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-sm px-5 py-2.5 rounded-xl shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5 w-full sm:w-auto justify-center"
        >
          Start now
          {isExternal ? <ExternalLink className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
        </button>
      </div>
    </motion.div>
  );
}
