import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface StrengthResult {
  strength: "weak" | "average" | "strong";
  reasoning: string;
  analyzed_at: string;
}

export function useRecommenderStrength() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (recommenderId: string): Promise<StrengthResult> => {
      const { data, error } = await supabase.functions.invoke("lor-strength", {
        body: { recommenderId },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as StrengthResult;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recommenders"] });
    },
    onError: (e: Error) => {
      toast.error(e.message || "Could not analyze recommender");
    },
  });
}
