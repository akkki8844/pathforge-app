import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface UserPreferences {
  profile_visibility: "private" | "school" | "public";
  activity_visibility: "private" | "school" | "public";
  ai_personalization: boolean;
  notify_product_updates: boolean;
  notify_deadlines: boolean;
  notify_weekly_summary: boolean;
  notify_marketing: boolean;
}

const DEFAULTS: UserPreferences = {
  profile_visibility: "private",
  activity_visibility: "private",
  ai_personalization: true,
  notify_product_updates: true,
  notify_deadlines: true,
  notify_weekly_summary: true,
  notify_marketing: false,
};

export function useUserPreferences() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("user_preferences" as any)
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) setPrefs({ ...DEFAULTS, ...(data as any) });
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const save = useCallback(async (patch: Partial<UserPreferences>) => {
    if (!user) return;
    const next = { ...prefs, ...patch };
    setPrefs(next);
    setSaving(true);
    const { error } = await supabase
      .from("user_preferences" as any)
      .upsert({ user_id: user.id, ...next }, { onConflict: "user_id" });
    setSaving(false);
    if (error) throw error;
  }, [user, prefs]);

  return { prefs, loading, saving, save, refetch: fetch };
}
