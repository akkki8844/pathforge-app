import { Gauge, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useRecommenderStrength } from "@/hooks/useRecommenderStrength";
import type { Recommender } from "@/hooks/useRecommenders";

/*
 * Three ratings, drawn from the palette this route already has rather than
 * from emerald / amber / rose, which were three hues imported for one badge
 * and appear nowhere else on the page. Strong reads as the accent, weak as
 * the same destructive tint the overdue deadline uses, and average — the
 * rating you do nothing about — stays neutral, which is the point of it.
 */
const tone: Record<string, string> = {
  strong: "border-primary/30 bg-primary/10 text-primary",
  average: "border-border bg-muted text-muted-foreground",
  weak: "border-destructive/30 bg-destructive/10 text-destructive",
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
