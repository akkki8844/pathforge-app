import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface RankedRecommender {
  recommender_id: string;
  name: string;
  rank: number;
  rating: "strong" | "average" | "weak";
  reasoning: string;
}
export interface StrategyGap {
  title: string;
  why: string;
  severity: "low" | "medium" | "high";
}
export interface StrategyResult {
  summary: string;
  ranked: RankedRecommender[];
  gaps: StrategyGap[];
}

export function useLorStrategy() {
  const [result, setResult] = useState<StrategyResult | null>(null);

  const run = useMutation({
    mutationFn: async (): Promise<StrategyResult> => {
      const { data, error } = await supabase.functions.invoke("lor-strategy", {
        body: {},
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as StrategyResult;
    },
    onSuccess: (data) => {
      setResult(data);
    },
    onError: (e: Error) => {
      toast.error(e.message || "Strategy failed");
    },
  });

  return { run, result };
}
