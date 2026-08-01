import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { notifyCreditConsumed } from "@/hooks/useCredits";

export interface DraftedEmail {
  subject: string;
  body: string;
}

export function useRequestEmail() {
  return useMutation({
    mutationFn: async ({
      recommenderId,
      deadline,
    }: {
      recommenderId: string;
      deadline?: string | null;
    }): Promise<DraftedEmail> => {
      const { data, error } = await supabase.functions.invoke("lor-request-email", {
        body: { recommenderId, deadline: deadline ?? null },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      notifyCreditConsumed();
      return data as DraftedEmail;
    },
    onError: (e: any) =>
      toast({ title: "Couldn't draft email", description: e.message, variant: "destructive" }),
  });
}
