/**
 * How much of the student's application the interviewer will actually have.
 *
 * The whole premise of this feature is an interviewer who has read your essays
 * and your activities list. `interview-start` assembles that server-side and
 * degrades gracefully when it finds nothing — a student with no essays still
 * gets a real conversation about their activities, and one with neither still
 * gets a real conversation. But "real conversation" with nothing to draw on
 * means generic questions, which is the one thing this was built not to be,
 * and the student finds that out sixty seconds into a session they were told
 * would be about them.
 *
 * So the lobby asks the same question the edge function will, before they
 * start rather than after.
 *
 * This deliberately does NOT reimplement the grounding logic. It counts the
 * same rows from the same tables and stops there: exact parity with the
 * server's text-length thresholds and per-section parsing would be a second
 * copy of that logic to keep in step, and the number here only has to be right
 * enough to distinguish "nothing", "thin" and "plenty". Anything finer would
 * be false precision about a warning.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface InterviewGrounding {
  loading: boolean;
  essays: number;
  activities: number;
  /** Nothing at all to ask about. The session would be entirely generic. */
  empty: boolean;
  /** Something, but little enough that the interview will thin out fast. */
  thin: boolean;
}

/** Below this, `interview-start` ignores the row as too short to quote. */
const MIN_TEXT = 60;

export function useInterviewGrounding(userId: string | undefined): InterviewGrounding {
  const [state, setState] = useState<Omit<InterviewGrounding, "loading">>({
    essays: 0,
    activities: 0,
    empty: false,
    thin: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    void (async () => {
      let essays = 0;
      let activities = 0;

      // Two independent best-effort reads, matching how the edge function
      // treats them: one empty table must not hide what the other holds.
      try {
        const { data } = await supabase
          .from("application_entries")
          .select("section_id, input_text, refined_text")
          .eq("user_id", userId)
          .limit(48);
        for (const row of (data ?? []) as Record<string, unknown>[]) {
          const id = typeof row.section_id === "string" ? row.section_id : "";
          const text = String(row.refined_text || row.input_text || "").trim();
          if (!id || text.length < MIN_TEXT) continue;
          if (id.startsWith("essay-")) essays += 1;
          else activities += 1;
        }
      } catch {
        /* leave the counts as they are; a failed read must not become a warning */
      }

      try {
        const { data } = await supabase
          .from("outcomes_data")
          .select("projects, leadership_roles, competitions")
          .eq("user_id", userId)
          .maybeSingle();
        const d = (data ?? {}) as Record<string, unknown>;
        for (const key of ["leadership_roles", "projects", "competitions"] as const) {
          if (Array.isArray(d[key])) activities += (d[key] as unknown[]).length;
        }
      } catch {
        /* as above */
      }

      if (cancelled) return;
      setState({
        essays,
        activities,
        empty: essays === 0 && activities === 0,
        // One essay and one activity is enough for an opening and a follow-up
        // and then the interviewer is improvising. Worth saying so.
        thin: essays + activities > 0 && essays + activities < 3,
      });
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [userId]);

  return { ...state, loading };
}
