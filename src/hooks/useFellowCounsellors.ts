import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface FellowCounsellor {
  user_id: string;
  title: string | null;
  school_role: string | null;
  subject: string | null;
  years_experience: string | null;
  username: string | null;
  email: string | null;
  school_name: string | null;
  created_at: string;
}

export function useFellowCounsellors() {
  const { user } = useAuth();
  const [items, setItems] = useState<FellowCounsellor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)("list_fellow_counsellors");
      if (cancelled) return;
      if (error) {
        setError(error.message);
        setItems([]);
      } else {
        setItems((data as FellowCounsellor[] | null) ?? []);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return { items, loading, error };
}
