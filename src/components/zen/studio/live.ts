import { memo, useEffect, useMemo, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { documentsDb } from "@/integrations/supabase/documents";
import { useDashboardData, type DashboardData } from "@/hooks/useDashboardData";
import { useRoutineClasses } from "@/hooks/routine/useRoutineData";
import { classesOnDay } from "@/lib/routine/derive";
import { useWeeklyCheckins, type WeeklyCheckinsData } from "@/hooks/useWeeklyCheckins";
import { useCollegeNews, type CollegeNewsItem } from "@/hooks/useCollegeNews";
import { useCommsBadges } from "@/hooks/comms/useCommsBadges";

/*
 * The dashboard's data, as the study sees it.
 *
 * One leaf component (<LiveData />) reads the same hooks the dashboard page
 * reads and writes the result here. The index, the panels and the objects in
 * the room (the pinboard's cards, the clock's note) all read from this one
 * record, so the data loads once per visit and a change to it never
 * re-renders the scene: painted objects compare `rev` in their frame loop.
 */

type Classes = ReturnType<typeof useRoutineClasses>["classes"];

export type Live = {
  /** False until the dashboard's batched read has come back. */
  ready: boolean;
  rev: number;
  d: DashboardData | null;
  /** Upcoming dates, soonest first. */
  deadlines: DashboardData["deadlines"];
  classesToday: Classes;
  /** Whether a weekly timetable exists at all. */
  hasTimetable: boolean;
  /** The weekly check-in, shared so the index sees a save the panel makes. */
  week: WeeklyCheckinsData | null;
  /** Admissions news, newest first: the paper she reads and the stories she tells. */
  news: CollegeNewsItem[];
  /** "loading" until the feed answers; "error" if it could not be read. */
  newsState: "loading" | "ready" | "error";
  /** The latest documents, newest first: the binders on the library shelf. */
  shelf: Array<{ id: string; title: string }>;
  /** What wants an answer in Communications: the counts the navbar wears. */
  comms: { chats: number; teams: number; objectives: number };
};

let current: Live = { ready: false, rev: 0, d: null, deadlines: [], classesToday: [], hasTimetable: false, week: null, news: [], newsState: "loading", shelf: [], comms: { chats: 0, teams: 0, objectives: 0 } };
const listeners = new Set<() => void>();

/** Same keys holding the same values; one level deep. */
function shallowSame(a: unknown, b: unknown) {
  if (a === b) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  const ka = Object.keys(a);
  if (ka.length !== Object.keys(b).length) return false;
  return ka.every((k) => (a as Record<string, unknown>)[k] === (b as Record<string, unknown>)[k]);
}

/**
 * Publishes only a real change. The dashboard hooks hand back a fresh object
 * on every render even when nothing in it moved, and every `rev` repaints and
 * re-uploads each canvas in the room (the cork board alone is 9,000 strokes),
 * so a no-op here used to cost a long frame on every hover.
 */
function set(next: Omit<Live, "rev">) {
  const same = (Object.keys(next) as Array<keyof typeof next>).every((k) => shallowSame(next[k], current[k]));
  if (same) return;
  current = { ...next, rev: current.rev + 1 };
  listeners.forEach((l) => l());
}

export const live = { get: () => current };

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useLive(): Live {
  return useSyncExternalStore(subscribe, live.get, live.get);
}

/** Whole days from today to a date, by the local calendar. */
export function daysUntil(date: Date): number {
  const t = new Date();
  const a = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  const b = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

const NO_SHELF: Live["shelf"] = [];

/**
 * Titles only, eight at most. The Library panel loads the whole drive when it
 * opens; the shelf needs spines, not bodies, so it asks for no more.
 */
function useShelf(): Live["shelf"] {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ["zen-shelf", user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await documentsDb
        .from("documents")
        .select("id, title")
        .eq("user_id", user!.id)
        .is("trashed_at", null)
        .neq("kind", "folder")
        .order("updated_at", { ascending: false })
        .limit(SHELF_LIMIT);
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; title: string }>;
    },
  });
  return q.data ?? NO_SHELF;
}

/** Binders on the library shelf. */
export const SHELF_LIMIT = 8;

/** Stories on the desk: the front page holds two, the back page four more. */
export const NEWS_LIMIT = 6;

/**
 * Renders nothing; keeps `live` in step with the student's data. Memoised, so
 * the study's own re-renders (a hover, a station) never re-run these hooks.
 */
export const LiveData = memo(function LiveData() {
  const d = useDashboardData();
  const { classes } = useRoutineClasses();
  const week = useWeeklyCheckins();
  const feed = useCollegeNews(NEWS_LIMIT);
  const newsState = feed.isLoading ? "loading" : feed.isError ? "error" : "ready";
  const shelf = useShelf();
  const badges = useCommsBadges();
  // The chats count is an RPC's scalar; anything but a number is "none".
  const chats = Number(badges.chats) || 0;
  const comms = useMemo(
    () => ({ chats, teams: Number(badges.teams) || 0, objectives: Number(badges.objectives) || 0 }),
    [chats, badges.teams, badges.objectives],
  );
  const classesToday = useMemo(() => classesOnDay(classes, new Date()), [classes]);
  const deadlines = useMemo(
    () =>
      [...d.deadlines]
        .filter((x) => daysUntil(x.date) >= 0)
        .sort((a, b) => a.date.getTime() - b.date.getTime()),
    [d.deadlines],
  );
  useEffect(() => {
    set({
      ready: !d.loading,
      d: d.loading ? null : d,
      deadlines,
      classesToday,
      hasTimetable: classes.length > 0,
      week,
      news: feed.data ?? [],
      newsState,
      shelf,
      comms,
    });
  }, [d, deadlines, classesToday, classes.length, week, feed.data, newsState, shelf, comms]);
  return null;
});
