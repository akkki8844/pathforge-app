import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * The student's weekly check-in — one short structured entry per ISO week.
 *
 * Weeks are anchored to the *local* Monday, not to UTC. A student in IST
 * writing on Monday morning is still in Sunday UTC, and bucketing that entry
 * into the previous week would put two consecutive check-ins in one row and
 * leave a hole in the streak. The database stores the same Monday as a DATE,
 * so the two agree without either of them doing timezone arithmetic.
 */

export const MORALE_MIN = 1;
export const MORALE_MAX = 7;

/** The word that goes with each station on the rail. Never shown as a bare number. */
export const MORALE_WORDS: Record<number, string> = {
  1: "Rough",
  2: "Draining",
  3: "Patchy",
  4: "Steady",
  5: "Good",
  6: "Strong",
  7: "Flying",
};

export interface WeeklyCheckin {
  id: string;
  /** Monday of the week this entry covers, as `YYYY-MM-DD`. */
  week_start: string;
  morale: number;
  progress: string;
  reflection: string | null;
  created_at: string;
  updated_at: string;
}

/** Local midnight, so week bucketing is never skewed by the UTC offset. */
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Monday-anchored week start, in local time. Mirrors `useDashboardData`. */
export function startOfWeek(d: Date): Date {
  const s = startOfDay(d);
  const dow = (s.getDay() + 6) % 7; // Mon = 0
  s.setDate(s.getDate() - dow);
  return s;
}

/** `YYYY-MM-DD` from local date parts — never `toISOString`, which shifts to UTC. */
export function toDateKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Parse a `YYYY-MM-DD` key back to a local Date (not UTC midnight). */
export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** "4–10 Aug" / "28 Jul – 3 Aug" — the span the entry covers, not just its start. */
export function weekLabel(weekStartKey: string): string {
  const start = fromDateKey(weekStartKey);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const day = new Intl.DateTimeFormat(undefined, { day: "numeric" });
  const dayMonth = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" });
  return start.getMonth() === end.getMonth()
    ? `${day.format(start)}–${dayMonth.format(end)}`
    : `${dayMonth.format(start)} – ${dayMonth.format(end)}`;
}

export interface WeeklyCheckinsData {
  loading: boolean;
  /** Newest first. */
  checkins: WeeklyCheckin[];
  /** `YYYY-MM-DD` Monday of the week currently running. */
  currentWeekKey: string;
  /** This week's entry, if it has been filed. */
  current: WeeklyCheckin | null;
  /** Consecutive weeks checked in, counted back from this week or the last one. */
  streak: number;
  /** Last 12 weeks oldest-first; `morale` is null for a week with no entry. */
  trend: { weekKey: string; morale: number | null }[];
  save: (input: {
    morale: number;
    progress: string;
    reflection: string;
    // `error?: undefined` on the success branch is load-bearing: this project
    // compiles with `strict: false`, and without strictNullChecks TypeScript
    // will not narrow a union by a *boolean* discriminant, so `if (!res.ok)`
    // does not make `res.error` reachable. Declaring the key on both branches
    // keeps the call sites honest without turning on strict mode repo-wide.
  }) => Promise<{ ok: true; error?: undefined } | { ok: false; error: string }>;
  saving: boolean;
  refresh: () => Promise<void>;
}

const HISTORY_WEEKS = 12;

export function useWeeklyCheckins(): WeeklyCheckinsData {
  const { user } = useAuth();
  const [checkins, setCheckins] = useState<WeeklyCheckin[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const currentWeekKey = useMemo(() => toDateKey(startOfWeek(new Date())), []);

  const load = useCallback(async () => {
    if (!user) {
      setCheckins([]);
      setLoading(false);
      return;
    }
    // `weekly_checkins` is newer than the generated Supabase types, so the
    // client is untyped for it until types are regenerated. The shape is
    // pinned by the migration's constraints, not by this cast.
    const { data } = await (supabase as any)
      .from("weekly_checkins")
      .select("id,week_start,morale,progress,reflection,created_at,updated_at")
      .eq("user_id", user.id)
      .order("week_start", { ascending: false })
      .limit(52);
    setCheckins((data ?? []) as WeeklyCheckin[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const byWeek = useMemo(() => {
    const m = new Map<string, WeeklyCheckin>();
    for (const c of checkins) m.set(c.week_start, c);
    return m;
  }, [checkins]);

  const current = byWeek.get(currentWeekKey) ?? null;

  /**
   * Consecutive filed weeks.
   *
   * The count starts at last week when this week is still open, so a student
   * who checks in every Friday doesn't watch their streak read zero every
   * Monday morning. Missing *last* week is what breaks it.
   */
  const streak = useMemo(() => {
    const cursor = startOfWeek(new Date());
    if (!byWeek.has(toDateKey(cursor))) cursor.setDate(cursor.getDate() - 7);
    let n = 0;
    while (byWeek.has(toDateKey(cursor))) {
      n += 1;
      cursor.setDate(cursor.getDate() - 7);
    }
    return n;
  }, [byWeek]);

  /**
   * Twelve weeks of morale, oldest first, with `null` for weeks never filed.
   * The gaps are kept rather than closed up: a line drawn straight through a
   * missing week would assert a mood that was never recorded.
   */
  const trend = useMemo(() => {
    const thisWeek = startOfWeek(new Date());
    const out: { weekKey: string; morale: number | null }[] = [];
    for (let i = HISTORY_WEEKS - 1; i >= 0; i--) {
      const w = new Date(thisWeek);
      w.setDate(w.getDate() - i * 7);
      const key = toDateKey(w);
      out.push({ weekKey: key, morale: byWeek.get(key)?.morale ?? null });
    }
    return out;
  }, [byWeek]);

  const save: WeeklyCheckinsData["save"] = useCallback(
    async ({ morale, progress, reflection }) => {
      if (!user) return { ok: false as const, error: "Not signed in" };
      const trimmedProgress = progress.trim();
      if (!trimmedProgress) return { ok: false as const, error: "Say what you did this week." };
      if (morale < MORALE_MIN || morale > MORALE_MAX) {
        return { ok: false as const, error: "Pick where the week landed." };
      }

      setSaving(true);
      const row = {
        user_id: user.id,
        week_start: currentWeekKey,
        morale,
        progress: trimmedProgress.slice(0, 2000),
        reflection: reflection.trim().slice(0, 2000) || null,
      };
      // Upsert on the (user_id, week_start) unique constraint — the same call
      // files the week and rewrites it, so the UI has one code path and the
      // "one entry per week" rule stays where it belongs, in the database.
      const { error } = await (supabase as any)
        .from("weekly_checkins")
        .upsert(row, { onConflict: "user_id,week_start" });
      setSaving(false);

      if (error) return { ok: false as const, error: error.message };
      await load();
      return { ok: true as const };
    },
    [user, currentWeekKey, load]
  );

  return {
    loading,
    checkins,
    currentWeekKey,
    current,
    streak,
    trend,
    save,
    saving,
    refresh: load,
  };
}
