import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Invite {
  id: string;
  recommender_id: string;
  token: string;
  expires_at: string;
  revoked_at: string | null;
  last_used_at: string | null;
  created_at: string;
}

function randomToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function useRecommenderInvites(recommenderId: string) {
  const qc = useQueryClient();
  const key = ["recommender_invites", recommenderId];

  const list = useQuery({
    queryKey: key,
    enabled: !!recommenderId,
    queryFn: async (): Promise<Invite[]> => {
      const { data, error } = await supabase
        .from("recommender_invites" as any)
        .select("*")
        .eq("recommender_id", recommenderId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Invite[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const userId = u.user?.id;
      if (!userId) throw new Error("Not authenticated");
      const token = randomToken();
      const { data, error } = await supabase
        .from("recommender_invites" as any)
        .insert({
          recommender_id: recommenderId,
          user_id: userId,
          token,
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Invite;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast({ title: "Share link created" });
    },
    onError: (e: any) =>
      toast({ title: "Could not create link", description: e.message, variant: "destructive" }),
  });

  const revoke = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("recommender_invites" as any)
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast({ title: "Link revoked" });
    },
    onError: (e: any) =>
      toast({ title: "Could not revoke", description: e.message, variant: "destructive" }),
  });

  return { list, create, revoke };
}
