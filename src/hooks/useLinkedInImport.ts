import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface LinkedInImport {
  id: string;
  linkedin_url: string;
  profile_text: string;
  grow_plan: unknown | null;
  grow_plan_updated_at: string | null;
  created_at: string;
  updated_at: string;
}

let cachedImport: LinkedInImport | null | undefined = undefined;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export function notifyLinkedInImported() {
  cachedImport = undefined;
  notify();
}

export function useLinkedInImport() {
  const { user } = useAuth();
  const [data, setData] = useState<LinkedInImport | null>(cachedImport ?? null);
  const [loading, setLoading] = useState(cachedImport === undefined);

  const refetch = useCallback(async () => {
    if (!user) {
      cachedImport = null;
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: row } = await supabase
      .from("linkedin_imports")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    cachedImport = (row as LinkedInImport | null) ?? null;
    setData(cachedImport);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    const cb = () => refetch();
    listeners.add(cb);
    if (cachedImport === undefined) refetch();
    return () => { listeners.delete(cb); };
  }, [refetch]);

  return { linkedinImport: data, loading, refetch };
}
