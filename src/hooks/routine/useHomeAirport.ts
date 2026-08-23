/**
 * The student's home airport.
 *
 * Written to `user_preferences.focus_home_airport` so it follows them between
 * devices, and mirrored into localStorage so the Focus page can render the
 * right departure code on first paint rather than flashing a placeholder while
 * a round trip resolves.
 *
 * The mirror is a cache, never the truth: the database wins on load, and the
 * mirror is only consulted before the first response arrives. Every write path
 * is wrapped — a student who cannot reach the preferences table should still be
 * able to fly, they just have to pick their airport again next session.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { airportByCode, type Airport } from "@/lib/focus-flight/airports";

const CACHE_KEY = "pf_focus_home_airport";

function readCache(): Airport | undefined {
  try {
    return airportByCode(localStorage.getItem(CACHE_KEY));
  } catch {
    return undefined;
  }
}

export function useHomeAirport() {
  const { user } = useAuth();
  const [airport, setAirport] = useState<Airport | undefined>(readCache);
  /** False until the database has had its say, so the picker knows to wait. */
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    void (async () => {
      try {
        const { data, error } = await supabase
          .from("user_preferences" as never)
          .select("focus_home_airport")
          .eq("user_id", user.id)
          .maybeSingle();
        if (cancelled) return;
        if (!error && data) {
          const stored = (data as { focus_home_airport?: string | null }).focus_home_airport;
          const found = airportByCode(stored);
          if (found) {
            setAirport(found);
            try {
              localStorage.setItem(CACHE_KEY, found.code);
            } catch {
              /* private mode; the database still holds it */
            }
          }
        }
      } catch {
        /* preferences unreachable — the cached value, if any, stands */
      } finally {
        if (!cancelled) setResolved(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const choose = useCallback(
    async (next: Airport) => {
      // Optimistic: picking an airport is a direct-manipulation gesture and
      // should not wait on a network round trip to take effect.
      setAirport(next);
      try {
        localStorage.setItem(CACHE_KEY, next.code);
      } catch {
        /* non-fatal */
      }
      if (!user?.id) return;
      try {
        // Upsert, because a student who has never opened Settings has no
        // preferences row yet and should still get a saved home airport.
        await supabase
          .from("user_preferences" as never)
          .upsert(
            { user_id: user.id, focus_home_airport: next.code } as never,
            { onConflict: "user_id" } as never,
          );
      } catch {
        /* stays local for this session */
      }
    },
    [user?.id],
  );

  return { airport, resolved, choose };
}
