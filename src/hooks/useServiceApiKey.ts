import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ServiceApiKeyInfo {
  service: string;
  key_last4: string;
  updated_at: string;
}

/**
 * A user's own API key for a third-party service they connect themselves
 * (Composio today). `api_key` is deliberately never in this hook's surface
 * — the DB withholds that column from the client at the grant level (see
 * the user_service_api_keys migration), so there is nothing here to
 * accidentally read back or log. `save` sends the raw key once; after that
 * only `key_last4` comes back.
 */
export function useServiceApiKey(service: string) {
  const { user } = useAuth();
  const userId = user?.id;
  const [keyInfo, setKeyInfo] = useState<ServiceApiKeyInfo | null>(null);
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
      setKeyInfo(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("user_service_api_keys")
      .select("service, key_last4, updated_at")
      .eq("user_id", userId)
      .eq("service", service)
      .maybeSingle();
    setKeyInfo((data as ServiceApiKeyInfo | null) ?? null);
    setLoading(false);
  }, [service, userId]);

  useEffect(() => {
    // Drop the previous account's value before the new one is known, rather
    // than leaving it on screen for the length of a round trip.
    setKeyInfo(null);
    void refresh();
  }, [userId, refresh]);

  const save = useCallback(async (apiKey: string) => {
    const trimmed = apiKey.trim();
    if (!trimmed) throw new Error("Enter an API key.");
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("You're signed out.");
      const { error } = await supabase.from("user_service_api_keys").upsert(
        {
          user_id: user.id,
          service,
          api_key: trimmed,
          key_last4: trimmed.slice(-4),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,service" },
      );
      if (error) throw new Error(error.message);
      await refresh();
    } finally {
      setBusy(false);
    }
  }, [service, refresh]);

  const remove = useCallback(async () => {
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("You're signed out.");
      const { error } = await supabase
        .from("user_service_api_keys")
        .delete()
        .eq("user_id", user.id)
        .eq("service", service);
      if (error) throw new Error(error.message);
      await refresh();
    } finally {
      setBusy(false);
    }
  }, [service, refresh]);

  return { keyInfo, loading, busy, save, remove, refresh };
}
