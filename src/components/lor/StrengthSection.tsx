import { Gauge, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useRecommenderStrength } from "@/hooks/useRecommenderStrength";
import type { Recommender } from "@/hooks/useRecommenders";

const tone: Record<string, string> = {
  strong: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  average: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
  weak: "bg-rose-500/10 text-rose-600 dark:text-rose-300",
};

export function StrengthSection({ recommender }: { recommender: Recommender }) {
  const analyze = useRecommenderStrength();

  return (
    <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Strength analysis</span>
          {recommender.strength && (
            <Badge variant="secondary" className={cn("text-[10px]", tone[recommender.strength])}>
              {recommender.strength}
            </Badge>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => analyze.mutate(recommender.id)}
          disabled={analyze.isPending}
        >
          {analyze.isPending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Analyzing…
            </>
          ) : recommender.strength ? (
            "Re-analyze"
          ) : (
            "Analyze"
          )}
        </Button>
      </div>

      {recommender.strength_reasoning ? (
        <p className="text-xs text-muted-foreground leading-relaxed">
          {recommender.strength_reasoning}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          1 credit. Rates subject fit, recency, and alignment with your major.
        </p>
      )}

      {recommender.strength_analyzed_at && (
        <p className="text-[10px] text-muted-foreground">
          Analyzed {formatDistanceToNow(new Date(recommender.strength_analyzed_at), { addSuffix: true })}
        </p>
      )}
    </div>
  );
}
