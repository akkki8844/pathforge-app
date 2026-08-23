import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/edgeFunctionError";

export interface GitHubConnection {
  github_login: string | null;
  github_name: string | null;
  github_avatar_url: string | null;
  scope: string | null;
  updated_at: string;
}

export function useGitHubConnection() {
  const [connection, setConnection] = useState<GitHubConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setConnection(null);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("user_github_connections")
      .select("github_login, github_name, github_avatar_url, scope, updated_at")
      .eq("user_id", user.id)
      .maybeSingle();
    setConnection((data as GitHubConnection | null) ?? null);
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    const onFocus = () => void refresh();
    const onMessage = (e: MessageEvent) => {
      if (e?.data && (e.data as { type?: string }).type === "github-oauth-complete") void refresh();
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("message", onMessage);
    };
  }, [refresh]);

  const connect = useCallback(async () => {
    setBusy(true);
    const popup = window.open(
      "about:blank",
      "github-oauth",
      "width=520,height=680,menubar=no,toolbar=no,location=no,status=no",
    );
    try {
      const data = await invokeEdgeFunction<{ url?: string }>(
        supabase.functions.invoke("github-oauth-init", {
          body: { redirect_to: window.location.pathname + window.location.search },
        }),
      );
      const url = data?.url;
      if (!url) throw new Error("No authorization URL returned");
      if (popup && !popup.closed) popup.location.href = url;
      else window.location.assign(url);
    } catch (e) {
      try { popup?.close(); } catch { /* ignore */ }
      throw e;
    } finally {
      setBusy(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("You're signed out.");
      // Surfacing this matters: a silently-failed delete left the card
      // claiming "Disconnected" while the token row was still there.
      const { error } = await supabase
        .from("user_github_connections")
        .delete()
        .eq("user_id", user.id);
      if (error) throw new Error(error.message);
      await refresh();
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  return { connection, loading, busy, connect, disconnect, refresh };
}
