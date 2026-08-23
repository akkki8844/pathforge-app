/**
 * The Focus Flight state machine.
 *
 * Three rules hold this together, and every awkward-looking decision below is
 * one of them being enforced:
 *
 * 1. **Elapsed time is `Date.now() - startedAt`. Always.** Never an accumulator,
 *    never an interval that decrements. Browsers throttle timers in background
 *    tabs to once a minute or stop them entirely, which is exactly the state a
 *    focus timer spends its whole life in. The interval in here fires only to
 *    provoke a re-render; deleting it would change how smoothly the page
 *    updates and nothing else about how much time has passed.
 *
 * 2. **The flight row is written at takeoff, the session row at landing.** A
 *    flight in the air has no `actual_minutes` yet — inventing one would mean
 *    writing a number that is wrong for the entire duration of the flight. So
 *    the airborne row carries `focus_session_id = null`, which doubles as the
 *    "restore me after a refresh" marker, and landing is the single moment both
 *    the session and the link are created.
 *
 * 3. **Minutes are recorded exactly once, through the existing Focus API.**
 *    `recordSession` and `logStudyMinutes` are the same calls the old timer
 *    made. Focus Flight adds a journey on top of the existing focus record; it
 *    does not become a second, parallel way for minutes to reach the database.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { routineDb } from "@/integrations/supabase/routine";
import { useAuth } from "@/contexts/AuthContext";
import { routineKeys } from "@/hooks/routine/useRoutineData";
import { airportByCode, type Airport } from "@/lib/focus-flight/airports";
import { routeDistanceKm, type Cabin, type FocusFlight, type FocusIntent } from "@/lib/focus-flight/flight";
import type { RoutineFocusFlight } from "@/lib/routine/types";

/** How the page is currently presenting itself. */
export type FlightStage =
  | "terminal"
  | "booking"
  | "boarding"
  | "departing"
  | "flying"
  | "landed";

export interface BookingDraft {
  origin: Airport;
  destination: Airport;
  minutes: number;
  intent: FocusIntent;
  cabin: Cabin;
  objective: string;
  targetType: FocusFlight["targetType"];
  targetId: string | null;
  targetLabel: string | null;
}

/** Turns a database row back into the in-memory flight the UI flies. */
function rowToFlight(row: RoutineFocusFlight): FocusFlight | null {
  const origin: Airport = {
    code: row.origin_code,
    name: row.origin_name,
    city: row.origin_city,
    country: row.origin_country,
    lat: row.origin_lat,
    lon: row.origin_lon,
    // Region is presentational only and is not stored; recover it from the
    // atlas when the code is still known, and fall back to something harmless
    // rather than failing to restore a flight over a label.
    region: airportByCode(row.origin_code)?.region ?? "Europe",
  };
  const destination: Airport = {
    code: row.destination_code,
    name: row.destination_name,
    city: row.destination_city,
    country: row.destination_country,
    lat: row.destination_lat,
    lon: row.destination_lon,
    region: airportByCode(row.destination_code)?.region ?? "Europe",
  };
  const startedAt = new Date(row.started_at).getTime();
  if (Number.isNaN(startedAt)) return null;

  return {
    id: row.id,
    origin,
    destination,
    distanceKm: row.distance_km,
    plannedMinutes: row.planned_minutes,
    intent: row.intent,
    cabin: row.cabin,
    objective: row.objective,
    // Target linkage lives on the focus session, which does not exist yet for
    // an airborne flight. A restored flight therefore logs to "none" unless the
    // objective text carries it, which is the honest outcome: we cannot invent
    // a link we never stored.
    targetType: "none",
    targetId: null,
    targetLabel: null,
    flightNumber: row.flight_number,
    seat: row.seat,
    gate: row.gate,
    startedAt,
    status: row.status,
  };
}

const flightsKey = (userId: string | undefined) =>
  ["routine", "focus-flights", userId ?? "anon"] as const;

/** Every flight this user has taken, newest first. Drives the log and the map. */
export function useFlightHistory() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: flightsKey(user?.id),
    enabled: !!user?.id,
    queryFn: async (): Promise<RoutineFocusFlight[]> => {
      const { data, error } = await routineDb
        .from("routine_focus_flights")
        .select("*")
        .eq("user_id", user!.id)
        .order("started_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    // The table is additive-only in normal use, and the migration may not be
    // applied yet in a given environment. A failure here must never take the
    // Focus page down with it — the timer works without any of this.
    retry: false,
  });

  return {
    flights: useMemo(() => query.data ?? [], [query.data]),
    isLoading: query.isLoading,
    /** True when the flights table is unreachable — e.g. migration not applied. */
    unavailable: !!query.error,
  };
}

export interface UseFocusFlightOptions {
  /** The existing Focus session writer. Minutes go through this, and only this. */
  recordSession: (input: {
    mode: "pomodoro" | "custom";
    target_type: FocusFlight["targetType"];
    target_id: string | null;
    target_label: string | null;
    planned_minutes: number;
    actual_minutes: number;
    started_at: string;
    ended_at: string;
    was_completed: boolean;
  }) => Promise<{ id: string }>;
  /** Pushes minutes onto a study block when that is what the flight was for. */
  onStudyMinutes?: (blockId: string, minutes: number) => Promise<void>;
}

export function useFocusFlight({ recordSession, onStudyMinutes }: UseFocusFlightOptions) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [stage, setStage] = useState<FlightStage>("terminal");
  const [flight, setFlight] = useState<FocusFlight | null>(null);
  const [draft, setDraft] = useState<BookingDraft | null>(null);
  /** Set while paused: ms already flown when the hold began. */
  const [pausedAtMs, setPausedAtMs] = useState<number | null>(null);
  /** The completed flight being celebrated on the landing screen. */
  const [arrival, setArrival] = useState<{ flight: FocusFlight; minutes: number; completed: boolean } | null>(null);
  const [, setTick] = useState(0);

  // Guards a landing from firing twice — the completion effect watches a value
  // that keeps changing after the threshold is crossed.
  const landingRef = useRef(false);

  const invalidate = useCallback(() => {
    void qc.invalidateQueries({ queryKey: flightsKey(user?.id) });
    void qc.invalidateQueries({ queryKey: routineKeys.table("routine_focus_sessions", user?.id) });
  }, [qc, user?.id]);

  // ── Restore ─────────────────────────────────────────────────────────────

  /**
   * Look for a flight that was still airborne when the page went away.
   *
   * Runs once, on mount. If the student refreshed mid-flight — or closed the
   * laptop and came back — the aircraft is exactly where the wall clock says it
   * should be, because position was never stored, only derived.
   */
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current || !user?.id) return;
    restored.current = true;

    let cancelled = false;
    void (async () => {
      const { data, error } = await routineDb
        .from("routine_focus_flights")
        .select("*")
        .eq("user_id", user.id)
        .in("status", ["boarding", "in_flight"])
        .order("started_at", { ascending: false })
        .limit(1);
      if (cancelled || error || !data?.length) return;

      const found = rowToFlight(data[0]);
      if (!found) return;

      const elapsed = Date.now() - found.startedAt;
      const total = found.plannedMinutes * 60_000;

      if (elapsed >= total) {
        // It finished while the tab was closed. Land it rather than showing a
        // flight that is somehow still in the air an hour after it arrived.
        void completeFlight(found, found.plannedMinutes, true);
        return;
      }
      setFlight(found);
      setStage("flying");
    })();

    return () => {
      cancelled = true;
    };
    // `completeFlight` is defined below and is stable for the life of the hook.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // ── The re-render pulse ─────────────────────────────────────────────────

  useEffect(() => {
    if (stage !== "flying" || pausedAtMs !== null) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 500);
    return () => window.clearInterval(id);
  }, [stage, pausedAtMs]);

  // ── Derived time ────────────────────────────────────────────────────────

  const totalMs = (flight?.plannedMinutes ?? 0) * 60_000;
  const elapsedMs = flight
    ? pausedAtMs !== null
      ? pausedAtMs
      : Math.max(0, Date.now() - flight.startedAt)
    : 0;
  const remainingMs = Math.max(0, totalMs - elapsedMs);
  const progress = totalMs > 0 ? Math.min(1, elapsedMs / totalMs) : 0;

  // ── Writes ──────────────────────────────────────────────────────────────

  const persistFlight = useMutation({
    mutationFn: async (f: FocusFlight) => {
      if (!user?.id) throw new Error("not signed in");
      const { data, error } = await routineDb
        .from("routine_focus_flights")
        .insert({
          user_id: user.id,
          focus_session_id: null,
          origin_code: f.origin.code,
          origin_name: f.origin.name,
          origin_city: f.origin.city,
          origin_country: f.origin.country,
          origin_lat: f.origin.lat,
          origin_lon: f.origin.lon,
          destination_code: f.destination.code,
          destination_name: f.destination.name,
          destination_city: f.destination.city,
          destination_country: f.destination.country,
          destination_lat: f.destination.lat,
          destination_lon: f.destination.lon,
          distance_km: f.distanceKm,
          planned_minutes: f.plannedMinutes,
          intent: f.intent,
          cabin: f.cabin,
          objective: f.objective,
          flight_number: f.flightNumber,
          seat: f.seat,
          gate: f.gate,
          status: "in_flight",
          started_at: new Date(f.startedAt).toISOString(),
          ended_at: null,
        } as never)
        .select("id")
        .single();
      if (error) throw error;
      return (data as { id: string } | null)?.id ?? f.id;
    },
  });

  /**
   * Land a flight: write the focus session, link it, and push minutes onward.
   *
   * Ordered so that the *focus record* is the thing that must succeed. If the
   * flights table write fails — an unapplied migration, a dropped connection —
   * the student still gets their minutes logged and their streak intact, and
   * only the collectible boarding pass is lost. The reverse would be
   * unacceptable.
   */
  const completeFlight = useCallback(
    async (f: FocusFlight, minutes: number, completed: boolean, options?: { silent?: boolean }) => {
      landingRef.current = true;
      // A silent landing is for the student leaving the page entirely — tab
      // close, refresh, or navigating elsewhere in the app. There is no
      // arrival screen to show because there is no page left to show it on;
      // touching UI state here would just be work React throws away.
      if (!options?.silent) {
        setArrival({ flight: f, minutes, completed });
        setStage("landed");
        setFlight(null);
        setPausedAtMs(null);
      }

      if (minutes < 1) {
        // Under a minute is not a session. Discard the flight row rather than
        // leaving a permanently airborne ghost behind.
        try {
          await routineDb.from("routine_focus_flights").delete().eq("id", f.id);
        } catch {
          /* nothing to recover; the row is inert either way */
        }
        invalidate();
        return;
      }

      let sessionId: string | null = null;
      try {
        const session = await recordSession({
          mode: f.plannedMinutes === 25 ? "pomodoro" : "custom",
          target_type: f.targetType,
          target_id: f.targetId,
          target_label: f.targetLabel,
          planned_minutes: f.plannedMinutes,
          actual_minutes: minutes,
          started_at: new Date(f.startedAt).toISOString(),
          ended_at: new Date().toISOString(),
          was_completed: completed,
        });
        sessionId = session.id;

        if (f.targetType === "study_block" && f.targetId && onStudyMinutes) {
          await onStudyMinutes(f.targetId, minutes);
        }
      } catch (err) {
        console.warn("focus session write failed", err);
      }

      try {
        await routineDb
          .from("routine_focus_flights")
          .update({
            focus_session_id: sessionId,
            status: completed ? "landed" : "diverted",
            ended_at: new Date().toISOString(),
          } as never)
          .eq("id", f.id);
      } catch (err) {
        console.warn("flight record update failed", err);
      }

      invalidate();
    },
    [recordSession, onStudyMinutes, invalidate],
  );

  // ── Landing watcher ─────────────────────────────────────────────────────

  /**
   * Watched, not scheduled.
   *
   * A `setTimeout` for the arrival instant does not survive a throttled tab, so
   * the flight would keep "flying" long past its arrival time. Checking the
   * wall clock on every render pulse instead means the worst case is landing
   * half a second late, and a tab that was asleep lands the moment it wakes.
   */
  useEffect(() => {
    if (stage !== "flying" || !flight || pausedAtMs !== null) return;
    if (remainingMs > 0 || landingRef.current) return;
    void completeFlight(flight, flight.plannedMinutes, true);
  }, [stage, flight, remainingMs, pausedAtMs, completeFlight]);

  // ── Leaving the page ────────────────────────────────────────────────────

  /**
   * Ending a flight because the student left, not because it landed.
   *
   * Refs, not state, back this: it must read the *current* flight without
   * re-subscribing every render, both for `pagehide` (real tab close/refresh)
   * and for the effect's own cleanup (leaving `/routine/focus` for any other
   * route unmounts this hook, which is "leaving the page" just as much as
   * closing the tab). Registered once — landing silently, never the arrival
   * screen, since there is no page left to put one on.
   */
  const flightRef = useRef(flight);
  const stageRef = useRef(stage);
  const elapsedRef = useRef(elapsedMs);
  const completeFlightRef = useRef(completeFlight);
  useEffect(() => {
    flightRef.current = flight;
    stageRef.current = stage;
    elapsedRef.current = elapsedMs;
    completeFlightRef.current = completeFlight;
  });

  useEffect(() => {
    const endBecauseLeft = () => {
      if (stageRef.current !== "flying" || !flightRef.current || landingRef.current) return;
      const flown = Math.floor(elapsedRef.current / 60_000);
      void completeFlightRef.current(flightRef.current, flown, false, { silent: true });
    };
    window.addEventListener("pagehide", endBecauseLeft);
    return () => {
      window.removeEventListener("pagehide", endBecauseLeft);
      endBecauseLeft();
    };
    // Runs once: this must fire only on a genuine unmount of the whole hook,
    // not on every re-render that happens to change `completeFlight`'s
    // identity (e.g. the caller passing a fresh `recordSession` closure).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Commands ────────────────────────────────────────────────────────────

  const beginBooking = useCallback(() => setStage("booking"), []);

  const confirmBooking = useCallback((next: BookingDraft) => {
    setDraft(next);
    setStage("boarding");
  }, []);

  /**
   * Leave the gate.
   *
   * The flight starts the instant this is called — the row is written after,
   * asynchronously — because the student's clock should not depend on a network
   * round trip. If the insert fails the flight still flies and still logs its
   * minutes; only the pass is missing from the collection.
   */
  const takeOff = useCallback(
    (pending: FocusFlight) => {
      landingRef.current = false;
      const started: FocusFlight = { ...pending, startedAt: Date.now(), status: "in_flight" };
      setFlight(started);
      setStage("departing");
      setPausedAtMs(null);

      persistFlight.mutate(started, {
        onSuccess: (id) => setFlight((f) => (f ? { ...f, id } : f)),
        onError: (e) => console.warn("flight record insert failed", e),
      });
    },
    [persistFlight],
  );

  /** Departure animation finished; hand control to the in-flight screen. */
  const enterCruise = useCallback(() => {
    setStage((s) => (s === "departing" ? "flying" : s));
  }, []);

  /**
   * Hold.
   *
   * Pausing rewrites `startedAt` on resume rather than tracking a separate
   * accumulator, so rule 1 keeps holding: elapsed is still just
   * `now - startedAt`, and a refresh during a pause resumes the flight as
   * though it had been running — the honest outcome, since the pause was never
   * persisted and pretending otherwise would hand out free time.
   */
  const pause = useCallback(() => {
    if (!flight || pausedAtMs !== null) return;
    setPausedAtMs(Math.max(0, Date.now() - flight.startedAt));
  }, [flight, pausedAtMs]);

  const resume = useCallback(() => {
    if (!flight || pausedAtMs === null) return;
    setFlight({ ...flight, startedAt: Date.now() - pausedAtMs });
    setPausedAtMs(null);
  }, [flight, pausedAtMs]);

  /** End early. Records what was actually flown, marked incomplete. */
  const endFlight = useCallback(() => {
    if (!flight) return;
    const flown = Math.floor(elapsedMs / 60_000);
    void completeFlight(flight, flown, false);
  }, [flight, elapsedMs, completeFlight]);

  const backToTerminal = useCallback(() => {
    setArrival(null);
    setDraft(null);
    setStage("terminal");
  }, []);

  /** "Take off again" — straight back to booking with the last route prefilled. */
  const flyAgain = useCallback(() => {
    setArrival(null);
    setStage("booking");
  }, []);

  const cancelBooking = useCallback(() => {
    setDraft(null);
    setStage("terminal");
  }, []);

  return {
    stage,
    flight,
    draft,
    arrival,
    elapsedMs,
    remainingMs,
    totalMs,
    progress,
    isPaused: pausedAtMs !== null,
    beginBooking,
    confirmBooking,
    cancelBooking,
    takeOff,
    enterCruise,
    pause,
    resume,
    endFlight,
    backToTerminal,
    flyAgain,
  };
}

/** Builds the flight a boarding pass describes, from a confirmed booking. */
export function draftToFlight(draft: BookingDraft, bookedAt: number, pass: {
  flightNumber: string;
  seat: string;
  gate: string;
}): FocusFlight {
  return {
    id: `pending-${bookedAt}`,
    origin: draft.origin,
    destination: draft.destination,
    distanceKm: routeDistanceKm(draft.origin, draft.destination),
    plannedMinutes: draft.minutes,
    intent: draft.intent,
    cabin: draft.cabin,
    objective: draft.objective.trim() || null,
    targetType: draft.targetType,
    targetId: draft.targetId,
    targetLabel: draft.targetLabel,
    flightNumber: pass.flightNumber,
    seat: pass.seat,
    gate: pass.gate,
    startedAt: bookedAt,
    status: "boarding",
  };
}
