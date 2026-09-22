import { useEffect, useState } from "react";
import { counsellorDb } from "@/integrations/supabase/counsellor";
import { useAuth } from "@/contexts/AuthContext";

/**
 * The two queues a counsellor is personally the bottleneck for: essays waiting
 * on a read, and sessions they have booked.
 *
 * Both already have a page of their own — /teacher/essays and
 * /teacher/meetings — but neither is visible from the home screen, so a draft
 * submitted on Monday sits unread until somebody opens the right tab. This
 * reads the same two tables those pages read, scoped the same way, and returns
 * only what is still outstanding.
 *
 * Nothing is estimated. An empty result is an empty queue, not a zero to be
 * filled in with something plausible.
 */

export interface PendingEssay {
  id: string;
  student_id: string;
  title: string;
  status: "pending" | "flagged" | "revision_requested";
  created_at: string;
  /** Whole days since submission, floored. */
  waitingDays: number;
}

export interface UpcomingMeeting {
  id: string;
  student_id: string;
  summary: string;
  occurred_at: string;
}

function daysSince(iso: string): number {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 0;
  return Math.max(0, Math.floor((Date.now() - then) / 86_400_000));
}

export function useCounsellorQueue(studentIds: string[]) {
  const { user, isTeacher, teacherProfile } = useAuth();
  const [essays, setEssays] = useState<PendingEssay[]>([]);
  const [meetings, setMeetings] = useState<UpcomingMeeting[]>([]);
  const [loading, setLoading] = useState(true);

  // Joined rather than passed as an array: the caller rebuilds `studentIds`
  // on every roster render, and a new array identity would re-fire this on
  // every one of them.
  const idKey = studentIds.join(",");

  useEffect(() => {
    if (!user || !isTeacher || !teacherProfile?.verified) {
      setEssays([]);
      setMeetings([]);
      setLoading(false);
      return;
    }
    const ids = idKey ? idKey.split(",") : [];
    if (ids.length === 0) {
      setEssays([]);
      setMeetings([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      // Meetings logged for a future date are the ones still to happen. The
      // window opens at the start of today so a session earlier this morning
      // still shows until the day turns over.
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const [essayRes, meetingRes] = await Promise.all([
        counsellorDb.from("essay_submissions")
          .select("id,student_id,title,status,created_at")
          .in("student_id", ids)
          .in("status", ["pending", "flagged", "revision_requested"])
          .order("created_at", { ascending: true })
          .limit(50),
        counsellorDb.from("counsellor_interactions")
          .select("id,student_id,summary,occurred_at,kind")
          .eq("counsellor_id", user.id)
          .eq("kind", "meeting")
          .gte("occurred_at", startOfDay.toISOString())
          .order("occurred_at", { ascending: true })
          .limit(20),
      ]);

      if (cancelled) return;

      setEssays(
        (essayRes.data ?? [])
          // The query already excludes "reviewed", but the row type covers
          // every status the column can hold, so the narrowing has to be
          // stated here too. Repeating it is the point: if the `.in()` filter
          // above is ever widened, this is what stops a reviewed essay
          // silently appearing in the outstanding queue.
          .filter(
            (e): e is typeof e & { status: PendingEssay["status"] } =>
              e.status !== "reviewed",
          )
          .map((e) => ({
            id: e.id,
            student_id: e.student_id,
            title: e.title,
            status: e.status,
            created_at: e.created_at,
            waitingDays: daysSince(e.created_at),
          })),
      );
      setMeetings(
        (meetingRes.data ?? []).map((m) => ({
          id: m.id,
          student_id: m.student_id,
          summary: m.summary,
          occurred_at: m.occurred_at,
        })),
      );
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user, isTeacher, teacherProfile?.verified, idKey]);

  return { essays, meetings, loading };
}
