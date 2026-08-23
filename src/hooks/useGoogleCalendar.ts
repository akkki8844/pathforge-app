import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/edgeFunctionError";

export interface GoogleConnection {
  google_email: string | null;
  expires_at: string;
  scope: string | null;
  has_refresh_token: boolean;
}

export function useGoogleCalendar() {
  const [connection, setConnection] = useState<GoogleConnection | null>(null);
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
    // `refresh_token` used to be in this select purely to compute
    // `has_refresh_token`, which meant a long-lived Google refresh token was
    // shipped to the browser (and into any error/telemetry that captured the
    // response) on every settings render. `.not(...)` answers the same
    // question server-side without the value ever crossing the wire.
    const [{ data }, { count: refreshCount }] = await Promise.all([
      supabase
        .from("user_google_tokens")
        .select("google_email, expires_at, scope")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("user_google_tokens")
        .select("user_id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .not("refresh_token", "is", null),
    ]);

    if (data) {
      setConnection({
        google_email: data.google_email,
        expires_at: data.expires_at,
        scope: data.scope,
        has_refresh_token: (refreshCount ?? 0) > 0,
      });
    } else {
      setConnection(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Refresh on window focus and on postMessage from the OAuth popup
  useEffect(() => {
    const onFocus = () => refresh();
    const onMessage = (e: MessageEvent) => {
      if (e?.data && (e.data as any).type === "google-oauth-complete") refresh();
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
    // Open the popup synchronously inside the click handler so the browser
    // does not flag it as a popup. We navigate it to the auth URL once the
    // edge function returns. This prevents the previous "two windows" issue
    // where a popup AND a same-tab redirect both fired.
    const popup = window.open(
      "about:blank",
      "google-oauth",
      "width=520,height=640,menubar=no,toolbar=no,location=no,status=no",
    );
    try {
      const { data, error } = await supabase.functions.invoke("google-oauth-init", {
        body: { redirect_to: window.location.href },
      });
      if (error) throw error;
      const url = (data as { url?: string })?.url;
      if (!url) throw new Error("No authorization URL returned");
      if (popup && !popup.closed) {
        popup.location.href = url;
      } else {
        // Popup blocked — fall back to a clean same-tab redirect.
        window.location.assign(url);
      }
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
      // An RLS denial here used to be discarded, so "Disconnected from Google
      // Calendar" was shown for a delete that removed nothing and the card
      // flipped straight back to Connected on the next refresh.
      const { error } = await supabase
        .from("user_google_tokens")
        .delete()
        .eq("user_id", user.id);
      if (error) throw new Error(error.message);
      await refresh();
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  const addEvent = useCallback(async (event: {
    summary: string;
    description?: string;
    location?: string;
    start: string;
    end?: string;
    allDay?: boolean;
    url?: string;
  }) => {
    // invokeEdgeFunction unwraps the JSON error body — `error.message` alone
    // is always the constant "Edge Function returned a non-2xx status code".
    return invokeEdgeFunction<{ ok: boolean; htmlLink: string; id: string }>(
      supabase.functions.invoke("google-calendar-add-event", { body: event }),
    );
  }, []);

  const syncEvents = useCallback(async () => {
    return invokeEdgeFunction<{ ok: boolean; imported: number; scanned: number; weeks: number }>(
      supabase.functions.invoke("google-calendar-sync", { body: {} }),
    );
  }, []);

  return { connection, loading, busy, connect, disconnect, refresh, addEvent, syncEvents };
}
