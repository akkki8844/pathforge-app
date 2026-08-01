import { Lightbulb, AlertTriangle, ArrowUpRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { CounsellorInsight } from "@/lib/counsellorInsights";

interface Props {
  insight: CounsellorInsight;
  dimensions: {
    label: string;
    value: number;
  }[];
}

/**
 * Profile Optimization — surfaces weak dimensions with a clear improvement
 * suggestion the counsellor can hand to the student. Pulls from the same
 * rule-based insight engine, no AI calls.
 */
export function ProfileOptimizationPanel({ insight, dimensions }: Props) {
  const weakDims = dimensions
    .filter((d) => d.value < 60)
    .sort((a, b) => a.value - b.value)
    .slice(0, 4);

  const opportunities = [
    ...insight.weaknesses.map((w) => ({ kind: "weakness" as const, text: w })),
    ...insight.missing.map((m) => ({ kind: "missing" as const, text: m })),
  ].slice(0, 6);

  return (
    <div className="card-elevated p-5 space-y-4">
      <div>
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-accent" /> Profile optimization
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          The lowest-scoring dimensions and the highest-leverage moves to lift them.
        </p>
      </div>

      {weakDims.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          All profile dimensions are above 60/100. Push for depth and signature wins.
        </p>
      ) : (
        <div className="space-y-2.5">
          {weakDims.map((d) => (
            <div key={d.label}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-foreground font-medium flex items-center gap-1.5">
                  <AlertTriangle className="h-3 w-3 text-destructive" />
                  {d.label}
                </span>
                <span className="text-muted-foreground">{d.value}/100</span>
              </div>
              <Progress value={d.value} className="h-1.5" />
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-border pt-3">
        <div className="text-xs font-semibold text-foreground mb-2">Highest-leverage moves</div>
        {insight.suggestions.length === 0 && opportunities.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Nothing urgent — focus on deepening signature strengths.
          </p>
        ) : (
          <ul className="space-y-2">
            {insight.suggestions.slice(0, 4).map((s, i) => (
              <li key={`s-${i}`} className="flex gap-2 text-sm text-foreground">
                <ArrowUpRight className="h-3.5 w-3.5 text-accent mt-0.5 flex-shrink-0" />
                <span>{s}</span>
              </li>
            ))}
            {insight.suggestions.length === 0 && opportunities.map((o, i) => (
              <li key={`o-${i}`} className="flex gap-2 text-sm text-foreground">
                <ArrowUpRight className="h-3.5 w-3.5 text-accent mt-0.5 flex-shrink-0" />
                <span>{o.text}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
