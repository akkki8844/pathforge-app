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

export async function getArtifactSignedUrl(artifact: AdvisorArtifact) {
  if (!artifact.file_path) return null;
  const { data } = await supabase.storage
    .from("advisor-artifacts")
    .createSignedUrl(artifact.file_path, 60 * 60);
  return data?.signedUrl || null;
}

export function useAdvisorArtifacts(conversationId: string | null) {
  const { user } = useAuth();
  const [artifacts, setArtifacts] = useState<AdvisorArtifact[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    // Artifacts belong to the conversation that produced them. With no
    // conversation open — a brand-new chat that hasn't been saved yet — the
    // filter used to be skipped entirely, so the badge counted and the panel
    // listed every artifact the user had ever generated, across every chat.
    // An unsaved chat has produced nothing, so the honest answer is none.
    if (!conversationId) {
      setArtifacts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("advisor_artifacts")
      .select("*")
      .eq("user_id", user.id)
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(50);
    setArtifacts((data as any) || []);
    setLoading(false);
  }, [user, conversationId]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!user || !conversationId) return;
    const suffix = Math.random().toString(36).slice(2, 8);
    const ch = supabase.channel(`advisor_artifacts:${user.id}:${suffix}`);
    try {
      ch.on(
        "postgres_changes" as any,
        { event: "INSERT", schema: "public", table: "advisor_artifacts", filter: `user_id=eq.${user.id}` },
        (payload: any) => {
          const a = payload.new as AdvisorArtifact;
          // Same scoping as the fetch: an artifact created in another tab, on
          // another conversation, must not appear in this one's list.
          if (a.conversation_id === conversationId) {
            setArtifacts((prev) => [a, ...prev.filter((x) => x.id !== a.id)]);
          }
        }
      ).subscribe();
    } catch (e) {
      console.warn('advisor_artifacts realtime unavailable', e);
    }
    return () => { supabase.removeChannel(ch); };
  }, [user, conversationId]);

  const getDownloadUrl = useCallback(getArtifactSignedUrl, []);

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
