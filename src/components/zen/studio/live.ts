import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useDashboardData, type DashboardData } from "@/hooks/useDashboardData";
import { useRoutineClasses } from "@/hooks/routine/useRoutineData";
import { classesOnDay } from "@/lib/routine/derive";
import { useWeeklyCheckins, type WeeklyCheckinsData } from "@/hooks/useWeeklyCheckins";

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
};

let current: Live = { ready: false, rev: 0, d: null, deadlines: [], classesToday: [], hasTimetable: false, week: null };
const listeners = new Set<() => void>();

function set(next: Omit<Live, "rev">) {
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

/** Renders nothing; keeps `live` in step with the student's data. */
export function LiveData() {
  const d = useDashboardData();
  const { classes } = useRoutineClasses();
  const week = useWeeklyCheckins();
  const classesToday = useMemo(() => classesOnDay(classes, new Date()), [classes]);
  const deadlines = useMemo(
    () =>
      [...d.deadlines]
        .filter((x) => daysUntil(x.date) >= 0)
        .sort((a, b) => a.date.getTime() - b.date.getTime()),
    [d.deadlines],
  );
  useEffect(() => {
    set({ ready: !d.loading, d: d.loading ? null : d, deadlines, classesToday, hasTimetable: classes.length > 0, week });
  }, [d, deadlines, classesToday, classes.length, week]);
  return null;
}
