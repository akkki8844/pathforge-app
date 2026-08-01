import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type ArtifactKind = "plan" | "document" | "pdf" | "slides" | "image";

export interface AdvisorArtifact {
  id: string;
  user_id: string;
  conversation_id: string | null;
  kind: ArtifactKind;
  title: string;
  content_markdown: string | null;
  content_json: any;
  file_path: string | null;
  file_mime: string | null;
  created_at: string;
}

export function useAdvisorArtifacts(conversationId: string | null) {
  const { user } = useAuth();
  const [artifacts, setArtifacts] = useState<AdvisorArtifact[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    let q = supabase.from("advisor_artifacts").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (conversationId) q = q.eq("conversation_id", conversationId);
    const { data } = await q.limit(50);
    setArtifacts((data as any) || []);
    setLoading(false);
  }, [user, conversationId]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!user) return;
    const suffix = Math.random().toString(36).slice(2, 8);
    const ch = supabase.channel(`advisor_artifacts:${user.id}:${suffix}`);
    try {
      ch.on(
        "postgres_changes" as any,
        { event: "INSERT", schema: "public", table: "advisor_artifacts", filter: `user_id=eq.${user.id}` },
        (payload: any) => {
          const a = payload.new as AdvisorArtifact;
          if (!conversationId || a.conversation_id === conversationId) {
            setArtifacts((prev) => [a, ...prev.filter((x) => x.id !== a.id)]);
          }
        }
      ).subscribe();
    } catch (e) {
      console.warn('advisor_artifacts realtime unavailable', e);
    }
    return () => { supabase.removeChannel(ch); };
  }, [user, conversationId]);

  const getDownloadUrl = useCallback(async (artifact: AdvisorArtifact) => {
    if (!artifact.file_path) return null;
    const { data } = await supabase.storage
      .from("advisor-artifacts")
      .createSignedUrl(artifact.file_path, 60 * 60);
    return data?.signedUrl || null;
  }, []);

  const remove = useCallback(async (id: string) => {
    const a = artifacts.find((x) => x.id === id);
    if (a?.file_path) {
      await supabase.storage.from("advisor-artifacts").remove([a.file_path]);
    }
    await supabase.from("advisor_artifacts").delete().eq("id", id);
    setArtifacts((prev) => prev.filter((x) => x.id !== id));
  }, [artifacts]);

  return { artifacts, loading, refresh, getDownloadUrl, remove };
}
