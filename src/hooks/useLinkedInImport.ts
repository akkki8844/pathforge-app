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
  /**
   * Last analysis produced by the `analyze-linkedin` edge function, which the
   * function now writes back itself (it costs the user 2 credits, so it must
   * survive a reload rather than be re-bought). Optional here on purpose — see
   * the cast in `refetch` below for why these two are not on the generated Row
   * type, and so that a row saved before the column existed still type-checks.
   */
  analysis?: unknown;
  analyzed_at?: string | null;
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
    // `select("*")` already returns `analysis` and `analyzed_at` at runtime —
    // they exist on the live table as of
    // supabase/migrations/20260809110000_linkedin_import_analysis.sql. They are
    // missing only from the COMPILE-TIME row type, because
    // src/integrations/supabase/types.ts is generated output that cannot be
    // regenerated right now (it needs an interactive `npx supabase login` the
    // repo owner has to run), and hand-editing generated output would be
    // silently reverted by the next regeneration.
    //
    // So the stale Row is widened once, here, at the single point where this
    // table enters the app — rather than every consumer doing its own `as any`.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cachedImport = ((row as any) as LinkedInImport | null) ?? null;
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
