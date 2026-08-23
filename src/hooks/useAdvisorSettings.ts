import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DEFAULT_ADVISOR_MODEL } from "@/lib/advisorModels";

export type AdvisorSettings = {
  user_id?: string;
  nickname: string;
  occupation: string;
  traits: string;
  extra_notes: string;
  model: string;
  reasoning_effort: "none" | "low" | "medium" | "high" | "extra" | "max" | "ultracode";
  temperature: number;
  max_response_tokens: number;
  memory_enabled: boolean;
  voice_name: string;
  autoplay_voice: boolean;
  show_suggestions: boolean;
  show_artifact_previews: boolean;
  history_retention_days: number;
};

const DEFAULTS: AdvisorSettings = {
  nickname: "",
  occupation: "",
  traits: "",
  extra_notes: "",
  // Gateway id for PFA 5.5 (see src/lib/advisorModels.ts). A GA id on purpose:
  // the previous default was a `-preview` model, and preview ids get retired
  // upstream, which left every account on a dead model until they touched the
  // picker. Legacy stored values are mapped back onto a live tier by
  // `modelFromGateway`, so nothing breaks for accounts already holding one.
  model: DEFAULT_ADVISOR_MODEL.gateway,
  reasoning_effort: "none",
  temperature: 0.4,
  max_response_tokens: 1500,
  memory_enabled: true,
  voice_name: "default",
  autoplay_voice: false,
  show_suggestions: true,
  show_artifact_previews: true,
  history_retention_days: 0,
};

export function useAdvisorSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AdvisorSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("advisor_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) setSettings({ ...DEFAULTS, ...(data as any) });
      setLoading(false);
    })();
  }, [user]);

  const save = useCallback(
    async (patch: Partial<AdvisorSettings>) => {
      if (!user) return;
      setSaving(true);
      const next = { ...settings, ...patch };
      setSettings(next);
      const { error } = await supabase
        .from("advisor_settings")
        .upsert({ user_id: user.id, ...next, updated_at: new Date().toISOString() });
      setSaving(false);
      if (error) throw error;
    },
    [settings, user]
  );

  return { settings, loading, saving, save };
}
