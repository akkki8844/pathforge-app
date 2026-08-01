import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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
    const { data } = await supabase
      .from("user_google_tokens")
      .select("google_email, expires_at, scope, refresh_token")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) {
      setConnection({
        google_email: data.google_email,
        expires_at: data.expires_at,
        scope: data.scope,
        has_refresh_token: !!data.refresh_token,
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
      if (!user) return;
      await supabase.from("user_google_tokens").delete().eq("user_id", user.id);
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
    const { data, error } = await supabase.functions.invoke("google-calendar-add-event", {
      body: event,
    });
    if (error) throw error;
    return data as { ok: boolean; htmlLink: string; id: string };
  }, []);

  const syncEvents = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke("google-calendar-sync", {
      body: {},
    });
    if (error) throw error;
    return data as { ok: boolean; imported: number; scanned: number; weeks: number };
  }, []);

  return { connection, loading, busy, connect, disconnect, refresh, addEvent, syncEvents };
}
