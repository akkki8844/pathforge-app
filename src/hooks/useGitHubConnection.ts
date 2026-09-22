import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { invokeEdgeFunction } from "@/lib/edgeFunctionError";
import { isTrustedOAuthMessage } from "@/lib/oauthPopupMessage";

export interface GitHubConnection {
  github_login: string | null;
  github_name: string | null;
  github_avatar_url: string | null;
  scope: string | null;
  updated_at: string;
}

/*
 * WHY THIS HOOK WATCHES THE SIGNED-IN USER
 *
 * It used to read `supabase.auth.getUser()` inside its fetch and hold the
 * result in state that nothing invalidated. Sign out and sign in as someone
 * else in the same tab - a shared laptop, a school machine, a demo - and this
 * card kept rendering the previous person's connected account, including their
 * username, until something happened to refetch. Nothing was leaking out of the
 * database (RLS scopes every row to its owner), but the screen was still
 * showing one person another person's account.
 *
 * Binding to `user?.id` from auth makes the identity change a render, so the
 * stale value is dropped the moment the account does.
 */
export function useGitHubConnection() {
  const { user } = useAuth();
  const userId = user?.id;
  const [connection, setConnection] = useState<GitHubConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) {
      setConnection(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("user_github_connections")
      .select("github_login, github_name, github_avatar_url, scope, updated_at")
      .eq("user_id", userId)
      .maybeSingle();
    setConnection((data as GitHubConnection | null) ?? null);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    // Drop the previous account's connection before the new one is known,
    // rather than leaving it on screen for the length of a round trip.
    setConnection(null);
    void refresh();
  }, [userId, refresh]);

  useEffect(() => {
    const onFocus = () => void refresh();
    const onMessage = (e: MessageEvent) => {
      if (!isTrustedOAuthMessage(e)) return;
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
      if (!userId) throw new Error("You're signed out.");
      // Surfacing this matters: a silently-failed delete left the card
      // claiming "Disconnected" while the token row was still there.
      const { error } = await supabase
        .from("user_github_connections")
        .delete()
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
      await refresh();
    } finally {
      setBusy(false);
    }
  }, [refresh, userId]);

  return { connection, loading, busy, connect, disconnect, refresh };
}
