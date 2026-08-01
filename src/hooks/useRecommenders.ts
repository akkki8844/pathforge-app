import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export type RecommenderStatus =
  | "not_requested"
  | "requested"
  | "accepted"
  | "drafting"
  | "submitted";

export interface Recommender {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  position: string | null;
  subject: string | null;
  school: string | null;
  relationship_duration: string | null;
  status: RecommenderStatus;
  notes: string | null;
  brag_sheet_id: string | null;
  last_packet_artifact_id: string | null;
  last_packet_at: string | null;
  strength: "weak" | "average" | "strong" | null;
  strength_reasoning: string | null;
  strength_analyzed_at: string | null;
  requested_at: string | null;
  due_date: string | null;
  submitted_at: string | null;
  last_reminder_at: string | null;
  reminder_stage: string | null;
  letter_file_path: string | null;
  letter_uploaded_at: string | null;
  letter_notes: string | null;
  created_at: string;
  updated_at: string;
}

export type RecommenderInput = Omit<
  Recommender,
  | "id"
  | "user_id"
  | "created_at"
  | "updated_at"
  | "brag_sheet_id"
  | "last_packet_artifact_id"
  | "last_packet_at"
  | "strength"
  | "strength_reasoning"
  | "strength_analyzed_at"
  | "requested_at"
  | "last_reminder_at"
  | "reminder_stage"
  | "letter_file_path"
  | "letter_uploaded_at"
  | "letter_notes"
>;

const KEY = ["recommenders"];

export function useRecommenders() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: KEY,
    enabled: !!user,
    queryFn: async (): Promise<Recommender[]> => {
      const { data, error } = await supabase
        .from("recommenders" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Recommender[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: RecommenderInput) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("recommenders" as any)
        .insert({ ...input, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast({ title: "Recommender added" });
    },
    onError: (e: any) =>
      toast({ title: "Could not add recommender", description: e.message, variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<RecommenderInput> }) => {
      const { data, error } = await supabase
        .from("recommenders" as any)
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast({ title: "Saved" });
    },
    onError: (e: any) =>
      toast({ title: "Could not save", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("recommenders" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast({ title: "Removed" });
    },
    onError: (e: any) =>
      toast({ title: "Could not remove", description: e.message, variant: "destructive" }),
  });

  return { list, create, update, remove };
}

export const STATUS_LABELS: Record<RecommenderStatus, string> = {
  not_requested: "Not requested",
  requested: "Requested",
  accepted: "Accepted",
  drafting: "Drafting",
  submitted: "Submitted",
};

export const STATUS_ORDER: RecommenderStatus[] = [
  "not_requested",
  "requested",
  "accepted",
  "drafting",
  "submitted",
];
