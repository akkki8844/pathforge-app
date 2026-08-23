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
      // Minting goes through the security-definer RPC rather than a table
      // insert: the token is generated server-side, the expiry window is set
      // there (a client-chosen `expires_at` would defeat the point of an
      // expiring link), ownership of the recommender is verified, and any
      // previously live link for the same recommender is retired in the same
      // transaction so a forwarded stale URL stops working.
      const { data, error } = await supabase.rpc("create_recommender_invite" as any, {
        _recommender_id: recommenderId,
      });
      if (error) throw error;
      const res = data as { ok?: boolean; error?: string } | null;
      if (res?.error) {
        throw new Error(
          res.error === "not_found"
            ? "That recommender no longer exists."
            : "You need to be signed in to create a link.",
        );
      }
      return res;
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
