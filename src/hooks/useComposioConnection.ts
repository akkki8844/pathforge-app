import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/edgeFunctionError";

export interface ComposioConnection {
  toolkit: string;
  status: string;
  account_email: string | null;
  updated_at: string;
}

/** Composio-managed connectors this app currently knows how to offer. */
export type ComposioToolkit = "gmail";

export function useComposioConnection(toolkit: ComposioToolkit = "gmail") {
  const [connection, setConnection] = useState<ComposioConnection | null>(null);
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
      .from("user_composio_connections")
      .select("toolkit, status, account_email, updated_at")
      .eq("user_id", user.id)
      .eq("toolkit", toolkit)
      .maybeSingle();
    setConnection((data as ComposioConnection | null) ?? null);
    setLoading(false);
  }, [toolkit]);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    const onFocus = () => void refresh();
    const onMessage = (e: MessageEvent) => {
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
