import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { invokeEdgeFunction } from "@/lib/edgeFunctionError";
import { isTrustedOAuthMessage } from "@/lib/oauthPopupMessage";

export interface ComposioConnection {
  toolkit: string;
  status: string;
  account_email: string | null;
  updated_at: string;
}

/**
 * Composio-managed connectors this app knows how to offer.
 *
 * The catalogue of everything except Gmail lives in
 * `src/lib/connectors/composioApps.ts`; the same slugs are re-checked
 * server-side in `composio-connect-init`, which is the list that actually
 * decides what can be connected.
 */
export type ComposioToolkit = string;

export function useComposioConnection(toolkit: ComposioToolkit = "gmail") {
  const { user } = useAuth();
  const userId = user?.id;
  const [connection, setConnection] = useState<ComposioConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  /*
   * Bound to the signed-in user rather than read from `auth.getUser()` inside
   * the fetch. This state used to outlive a change of account within one tab,
   * so after signing out and signing in as someone else - a shared laptop, a
   * school machine - the card went on showing the previous person's connected
   * account until something happened to refetch it. No row ever left its owner
   * (RLS sees to that), but the screen was still showing one person another
   * person's account.
   */
  const refresh = useCallback(async () => {
    if (!userId) {
      setConnection(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("user_composio_connections")
      .select("toolkit, status, account_email, updated_at")
      .eq("user_id", userId)
      .eq("toolkit", toolkit)
      .maybeSingle();
    setConnection((data as ComposioConnection | null) ?? null);
    setLoading(false);
  }, [toolkit, userId]);

  useEffect(() => {
    // Drop the previous account's value before the new one is known, rather
    // than leaving it on screen for the length of a round trip.
    setConnection(null);
    void refresh();
  }, [userId, refresh]);

  useEffect(() => {
    const onFocus = () => void refresh();
    const onMessage = (e: MessageEvent) => {
      if (!isTrustedOAuthMessage(e)) return;
      if (e?.data && (e.data as { type?: string }).type === "composio-oauth-complete") void refresh();
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
      "composio-oauth",
      "width=520,height=680,menubar=no,toolbar=no,location=no,status=no",
    );
    try {
      const data = await invokeEdgeFunction<{ url?: string }>(
        supabase.functions.invoke("composio-connect-init", {
          body: { toolkit, redirect_to: window.location.pathname + window.location.search },
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
  }, [toolkit]);

  const disconnect = useCallback(async () => {
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("You're signed out.");
      const { error } = await supabase
        .from("user_composio_connections")
        .delete()
        .eq("user_id", user.id)
        .eq("toolkit", toolkit);
      if (error) throw new Error(error.message);
      await refresh();
    } finally {
      setBusy(false);
    }
  }, [toolkit, refresh]);

  return { connection, loading, busy, connect, disconnect, refresh };
}
