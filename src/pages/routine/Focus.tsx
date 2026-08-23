/**
 * Focus — the departure hall for Focus Flight.
 *
 * The page has one job in the terminal state: make booking a flight the obvious
 * thing to do, and make the record of flights already taken worth coming back
 * for. Everything past that is a takeover — booking, the gate, departure, the
 * deck and arrival each own the screen in turn, because a journey that happens
 * inside a card on a dashboard is not a journey.
 *
 * Two invariants are worth stating because they constrain everything else:
 *
 * - **Minutes are still just focus sessions.** `routine_focus_sessions` is
 *   written by the same `recordSession` the previous timer used, so
 *   `focusStats()`, the streak, Today, and study-block progress all keep
 *   working without knowing this feature exists. The flight is decoration
 *   around a real record, not a replacement for it.
 * - **Nothing here spends AI credits.** Booking, flying, landing and logging
 *   are arithmetic and one insert. There is no model in the loop.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Building2,
  Flame,
  Globe2,
  History,
  MapPin,
  Plane,
  Ticket,
  Timer,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { RoutineShell, RoutineStat } from "@/components/routine/RoutineShell";
import { RoutineAsync } from "@/components/routine/RoutineStates";
import { useRoutineSources } from "@/hooks/routine/useRoutineData";
import { useHomeAirport } from "@/hooks/routine/useHomeAirport";
import {
  draftToFlight,
  useFlightHistory,
  useFocusFlight,
  type BookingDraft,
} from "@/hooks/routine/useFocusFlight";
import { focusStats, knownSubjects } from "@/lib/routine/derive";
import { dateKey, formatDuration, startOfDay } from "@/lib/routine/dates";
import { EASE_OUT_EXPO } from "@/lib/motion";
import { AirportPicker } from "@/components/routine/focus/AirportPicker";
import { BoardingGate } from "@/components/routine/focus/BoardingGate";
import { BoardingPass } from "@/components/routine/focus/BoardingPass";
import { BookingFlow, type FlightTarget } from "@/components/routine/focus/BookingFlow";
import { SeatMap, type FocusCategory } from "@/components/routine/focus/SeatMap";
import { TakeoffGate } from "@/components/routine/focus/TakeoffGate";
import { DepartureSequence } from "@/components/routine/focus/DepartureSequence";
import { FlightDeck } from "@/components/routine/focus/FlightDeck";
import { ArrivalScreen } from "@/components/routine/focus/ArrivalScreen";
import { FlightLog, RouteNetwork } from "@/components/routine/focus/FlightLog";
import { useCabinAudio } from "@/components/routine/focus/CabinAudio";
import { FlightMap } from "@/components/routine/focus/FlightMap";
import { airportByCode } from "@/lib/focus-flight/airports";
import { formatKm } from "@/lib/focus-flight/geo";
import { generatePass } from "@/lib/focus-flight/flight";

export default function Focus() {
  const { sources, loading, error, focus, study, goals } = useRoutineSources();
  const { airport: home, resolved: homeResolved, choose: chooseHome } = useHomeAirport();
  const { flights, unavailable } = useFlightHistory();
  const audio = useCabinAudio();

  const [homePickerOpen, setHomePickerOpen] = useState(false);
  /** Which terminal-stage record sheet is open. Never more than one, and
      never a tab — each is a button that peeks off the bottom of the map,
      the way the reference app's "History" bar does. */
  const [openSheet, setOpenSheet] = useState<"map" | "passes" | "history" | null>(null);

  const stats = useMemo(() => focusStats(focus.sessions, new Date()), [focus.sessions]);

  /**
   * Everything in Routine a flight can be logged against.
   *
   * Same construction the previous timer used, so a flight booked against a
   * study block moves that block's progress — and its goal's percentage —
   * exactly as before.
   */
  const subjects = useMemo(
    () => knownSubjects(null, sources.classes ?? [], study.studyBlocks),
    [sources.classes, study.studyBlocks],
  );

  const targets = useMemo<FlightTarget[]>(() => {
    const todayKey = dateKey(startOfDay(new Date()));
    const out: FlightTarget[] = [{ type: "none", id: null, label: "Just focus", group: "General" }];

    for (const b of study.studyBlocks) {
      if (b.status === "completed" || b.status === "skipped") continue;
      if (b.scheduled_date < todayKey) continue;
      out.push({
        type: "study_block",
        id: b.id,
        label: b.topic ? `${b.subject}: ${b.topic}` : b.subject,
        group: "Study blocks",
      });
    }
    for (const t of sources.tasks ?? []) {
      if (t.status === "done") continue;
      out.push({ type: "task", id: t.id, label: t.title, group: "Tasks" });
    }
    for (const g of goals.goals) {
      if (g.status !== "active") continue;
      out.push({ type: "goal", id: g.id, label: g.title, group: "Goals" });
    }
    for (const s of subjects) {
      out.push({ type: "subject", id: null, label: s, group: "Subjects" });
    }
    return out;
  }, [study.studyBlocks, sources.tasks, goals.goals, subjects]);

  const onStudyMinutes = useCallback(
    async (blockId: string, minutes: number) => {
      const block = study.studyBlocks.find((b) => b.id === blockId);
      if (block) await study.logStudyMinutes(block, minutes);
    },
    [study],
  );

  const flightApi = useFocusFlight({
    recordSession: focus.recordSession,
    onStudyMinutes,
  });

  const {
    stage,
    flight,
    draft,
    arrival,
    remainingMs,
    progress,
    isPaused,
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
  } = flightApi;

  /** The flight the boarding pass describes, built once per confirmed booking. */
  const [pendingFlight, setPendingFlight] = useState<ReturnType<typeof draftToFlight> | null>(null);

  /**
   * Booking hands off to the seat map before the pass is printed.
   *
   * The draft is held rather than confirmed here, because the seat and the
   * focus category are still missing and both belong on the pass. Confirming
   * early would print a pass and then mutate it, which is exactly the sort of
   * thing that makes an object feel like a form.
   */
  const [seatDraft, setSeatDraft] = useState<BookingDraft | null>(null);
  const [readyForTakeoff, setReadyForTakeoff] = useState(false);

  const handleConfirm = (next: BookingDraft) => {
    setSeatDraft(next);
  };

  const handleSeatConfirm = (seat: string, category: FocusCategory) => {
    if (!seatDraft) return;
    const next: BookingDraft = {
      ...seatDraft,
      intent: category.intent,
      objective: seatDraft.objective?.trim() ? seatDraft.objective : category.label,
    };
    const bookedAt = Date.now();
    const pass = generatePass(next.origin, next.destination, next.minutes, bookedAt);
    // The chosen seat replaces the generated one — it was the student's pick.
    setPendingFlight({ ...draftToFlight(next, bookedAt, pass), seat });
    setSeatDraft(null);
    confirmBooking(next);
  };

  /**
   * Ambience starts at takeoff, never before.
   *
   * This is the first point in the flow guaranteed to be inside a user gesture
   * chain, which is what browser autoplay policy requires — and it is also the
   * moment where sound starting means something.
   */
  const handleBoard = () => {
    if (!pendingFlight) return;
    if (audio.bed === "off") audio.select("cabin");
    setReadyForTakeoff(true);
  };

  const handleGo = () => {
    if (!pendingFlight) return;
    setReadyForTakeoff(false);
    takeOff(pendingFlight);
  };

  // Landing deserves a toast in the background too, so the record is visible
  // even after the arrival screen is dismissed.
  useEffect(() => {
    if (stage !== "landed" || !arrival) return;
    if (arrival.minutes < 1) return;
    audio.select("off");
    toast.success(
      arrival.completed
        ? `Landed at ${arrival.flight.destination.code}`
        : `Diverted — ${formatDuration(arrival.minutes)} logged`,
      {
        description: arrival.completed
          ? `${formatDuration(arrival.minutes)} of focus logged.`
          : "Recorded as an incomplete session.",
      },
    );
    // `audio` is a stable API object; depending on it would re-fire the toast.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, arrival]);

  const visitedCodes = useMemo(
    () => new Set(flights.flatMap((f) => [f.origin_code, f.destination_code])),
    [flights],
  );
  const recentCodes = useMemo(() => flights.map((f) => f.destination_code), [flights]);

  /** Seats already flown. The cabin fills up over a term. */
  const takenSeats = useMemo(() => new Set(flights.map((f) => f.seat).filter(Boolean)), [flights]);

  const flightStats = useMemo(() => {
    const landed = flights.filter((f) => f.status === "landed");
    const destinations = new Set(landed.map((f) => f.destination_code));
    const longest = flights.reduce((max, f) => Math.max(max, f.planned_minutes), 0);
    const km = landed.reduce((sum, f) => sum + f.distance_km, 0);
    return { taken: flights.length, landed: landed.length, destinations: destinations.size, longest, km };
  }, [flights]);

  // ── Takeovers ───────────────────────────────────────────────────────────

  if (readyForTakeoff && pendingFlight) {
    return <TakeoffGate onGo={handleGo} />;
  }

  if (stage === "departing" && flight) {
    return <DepartureSequence flight={flight} onComplete={enterCruise} />;
  }

  if (stage === "flying" && flight) {
    return (
      <FlightDeck
        flight={flight}
        progress={progress}
        remainingMs={remainingMs}
        isPaused={isPaused}
        audio={audio}
        onPause={pause}
        onResume={resume}
        onEnd={endFlight}
      />
    );
  }

  if (stage === "landed" && arrival) {
    return (
      <ArrivalScreen
        flight={arrival.flight}
        minutes={arrival.minutes}
        completed={arrival.completed}
        sessionNumber={stats.sessionCount + 1}
        onFlyAgain={flyAgain}
        onBack={backToTerminal}
      />
    );
  }

  // ── The page ────────────────────────────────────────────────────────────

  return (
    <RoutineShell
      title="Focus"
      purpose="Board a flight. Leave distractions behind. Land with your work done."
      icon={Timer}
      path="/routine/focus"
      actions={
        stage === "terminal" && home ? (
          <Button onClick={beginBooking} className="gap-2 rounded-xl">
            <Plane className="h-4 w-4" aria-hidden="true" />
            Book a flight
          </Button>
        ) : undefined
      }
    >
      <RoutineAsync loading={loading} error={error} loadingVariant="grid-tall" loadingRows={2}>
        {/* Booking and the gate share the cinematic dark surface. */}
        {seatDraft && (
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0a0b0d]">
            <div className="border-b border-white/[0.07] px-5 py-4">
              <p className="font-display text-[10px] font-bold uppercase tracking-[0.24em] text-flight-yellow">
                Choose your seat
              </p>
              <h2 className="mt-1.5 font-display text-xl font-bold tracking-tight text-white">
                {seatDraft.origin.code} → {seatDraft.destination.code} · {seatDraft.minutes} min
              </h2>
            </div>
            <div className="h-[68vh] min-h-[30rem]">
              <SeatMap
                takenSeats={takenSeats}
                onConfirm={handleSeatConfirm}
                onBack={() => setSeatDraft(null)}
              />
            </div>
          </div>
        )}

        {!seatDraft && (stage === "booking" || stage === "boarding") && (
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950 p-4 sm:p-7">
            {stage === "booking" && home && (
              <BookingFlow
                homeAirport={home}
                onChangeHome={() => setHomePickerOpen(true)}
                recentCodes={recentCodes}
                targets={targets}
                initial={draft}
                onCancel={cancelBooking}
                onConfirm={handleConfirm}
              />
            )}
            {stage === "boarding" && pendingFlight && (
              <BoardingGate
                flight={pendingFlight}
                onBoard={handleBoard}
                onBack={beginBooking}
              />
            )}
          </div>
        )}

        {stage === "terminal" && (
          <div className="space-y-5">
            {/* Hero ---------------------------------------------------- */}
            <motion.section
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
              className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950"
            >
              {/* Aerial ground texture behind the route: muted terrain tones
                  rather than flat slate, so the map reads as a place viewed
                  from above rather than a diagram on a dark panel. */}
              <div
                aria-hidden="true"
                className="absolute inset-0 opacity-70"
                style={{
                  background:
                    "radial-gradient(120% 90% at 15% 20%, hsl(150 28% 22%) 0%, transparent 55%), " +
                    "radial-gradient(100% 80% at 75% 15%, hsl(38 32% 30%) 0%, transparent 50%), " +
                    "radial-gradient(90% 100% at 60% 90%, hsl(200 45% 20%) 0%, transparent 55%), " +
                    "hsl(222 47% 8%)",
                }}
              />
              {/* The map is the backdrop, not an illustration: it draws the
                  student's own last route, or a default long-haul if they have
                  never flown. */}
              <div className="absolute inset-0 opacity-[0.55]">
                <HeroMap flights={flights} homeCode={home?.code} visitedCodes={visitedCodes} />
              </div>
              <div
                aria-hidden="true"
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(100deg, rgba(2,6,23,0.96) 8%, rgba(2,6,23,0.72) 46%, rgba(2,6,23,0.35) 100%)",
                }}
              />

              {/* Minimal, native — a greeting and a city name, not a
                  marketing hero. The map and the button are the whole
                  screen; a headline and a body paragraph would just be
                  copy competing with the thing it's describing. Sized to
                  make the map the dominant surface, the way the reference
                  app gives the map almost the entire screen. */}
              <div className="relative flex min-h-[26rem] flex-col justify-between px-5 py-6 sm:min-h-[34rem] sm:px-7 sm:py-8">
                <div>
                  <p className="font-sans text-sm font-normal text-white/70">{greeting()}!</p>
                  {home ? (
                    <button
                      type="button"
                      onClick={() => setHomePickerOpen(true)}
                      className="mt-0.5 block text-left font-sans text-4xl font-bold tracking-tight text-white sm:text-5xl"
                    >
                      {home.city ?? home.country}
                    </button>
                  ) : (
                    <p className="mt-0.5 font-sans text-4xl font-bold tracking-tight text-white sm:text-5xl">
                      Where to?
                    </p>
                  )}
                </div>

                {home && (stats.currentStreak > 0 || stats.weekMinutes > 0 || flights[0]) && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/55">
                    {stats.currentStreak > 0 && (
                      <span className="inline-flex items-center gap-1.5">
                        <Flame className="h-3.5 w-3.5 text-flight-yellow" aria-hidden="true" />
                        {stats.currentStreak} day streak
                      </span>
                    )}
                    {stats.weekMinutes > 0 && (
                      <>
                        <span className="text-white/25" aria-hidden="true">·</span>
                        <span>{formatDuration(stats.weekMinutes)} this week</span>
                      </>
                    )}
                    {flights[0] && (
                      <>
                        <span className="text-white/25" aria-hidden="true">·</span>
                        <span>
                          Last flight to{" "}
                          {airportByCode(flights[0].destination_code)?.city ?? flights[0].destination_code}
                        </span>
                      </>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2.5">
                  {home ? (
                    <button
                      type="button"
                      onClick={beginBooking}
                      className="h-12 rounded-full bg-white px-8 font-sans text-base font-semibold text-slate-950 shadow-[0_10px_40px_-14px_rgba(0,0,0,0.6)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                      Start Journey
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setHomePickerOpen(true)}
                      className="inline-flex h-12 items-center rounded-full bg-white px-8 font-sans text-base font-semibold text-slate-950 transition-transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <MapPin className="mr-2 h-4 w-4" aria-hidden="true" />
                      Set your home airport
                    </button>
                  )}
                </div>

                {!homeResolved && !home && (
                  <p className="text-xs text-white/35">Looking up your home airport…</p>
                )}
              </div>

              {/* Record, off the bottom edge of the map — buttons, not tabs.
                  Each opens its own sheet rather than uncovering a section
                  inline, so the map stays the thing filling the screen. */}
              {home && (flights.length > 0 || focus.sessions.length > 0) && (
                <div className="relative z-10 flex divide-x divide-white/10 border-t border-white/10 bg-black/45 backdrop-blur-sm">
                  {flights.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setOpenSheet("map")}
                      className="flex flex-1 items-center justify-center gap-2 px-3 py-3 font-sans text-sm font-medium text-white/80 transition-colors hover:bg-white/[0.06] hover:text-white"
                    >
                      <Globe2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                      Places
                    </button>
                  )}
                  {flights.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setOpenSheet("passes")}
                      className="flex flex-1 items-center justify-center gap-2 px-3 py-3 font-sans text-sm font-medium text-white/80 transition-colors hover:bg-white/[0.06] hover:text-white"
                    >
                      <Ticket className="h-4 w-4 shrink-0" aria-hidden="true" />
                      Boarding passes
                    </button>
                  )}
                  {focus.sessions.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setOpenSheet("history")}
                      className="flex flex-1 items-center justify-center gap-2 px-3 py-3 font-sans text-sm font-medium text-white/80 transition-colors hover:bg-white/[0.06] hover:text-white"
                    >
                      <History className="h-4 w-4 shrink-0" aria-hidden="true" />
                      History
                    </button>
                  )}
                </div>
              )}
            </motion.section>

            {unavailable && (
              <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-600 dark:text-amber-300">
                Your flight log is unavailable right now, so passes will not be saved. Focus
                sessions still record normally and your minutes are safe.
              </p>
            )}

            {/* Focus record — the existing analytics, unchanged. -------- */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <RoutineStat
                label="Total focus"
                value={formatDuration(stats.totalMinutes)}
                hint={`${stats.sessionCount} session${stats.sessionCount === 1 ? "" : "s"}`}
                icon={Timer}
              />
              <RoutineStat
                label="This week"
                value={formatDuration(stats.weekMinutes)}
                hint={`${formatDuration(stats.todayMinutes)} today`}
                icon={TrendingUp}
              />
              <RoutineStat
                label="Streak"
                value={`${stats.currentStreak}d`}
                hint={`${stats.activeDaysLast14}/14 days active`}
                icon={Flame}
              />
              {/* Distance flown, expressed the way it actually lands: not as a
                  number of kilometres nobody has intuition for, but as a
                  fraction of the way round the planet. */}
              <RoutineStat
                label="Around Earth"
                value={`${(flightStats.km / 40075).toFixed(flightStats.km >= 40075 ? 1 : 2)}×`}
                hint={
                  flightStats.km > 0
                    ? `${formatKm(flightStats.km)} flown`
                    : `Average ${formatDuration(stats.averageMinutes)}`
                }
                icon={Globe2}
              />
            </div>

          </div>
        )}
      </RoutineAsync>

      {/* Places you have focused — behind the "Places" button, not inline. */}
      <Sheet open={openSheet === "map"} onOpenChange={(o) => setOpenSheet(o ? "map" : null)}>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto bg-slate-950 text-white">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-white">
              <Globe2 className="h-4 w-4 text-accent" aria-hidden="true" />
              Places you have focused
            </SheetTitle>
            <SheetDescription className="text-white/50">
              {flightStats.destinations} destination{flightStats.destinations === 1 ? "" : "s"} across{" "}
              {flightStats.taken} flight{flightStats.taken === 1 ? "" : "s"} · {formatKm(flightStats.km)} flown
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 h-64 w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-950 sm:h-96">
            <RouteNetwork flights={flights} />
          </div>
          <p className="mt-3 text-[11px] text-white/40">
            Virtual focus destinations — every line is a session you actually flew.
          </p>
        </SheetContent>
      </Sheet>

      {/* Boarding pass collection — behind "Boarding passes". */}
      <Sheet open={openSheet === "passes"} onOpenChange={(o) => setOpenSheet(o ? "passes" : null)}>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto bg-slate-950 text-white">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-white">
              <Ticket className="h-4 w-4 text-accent" aria-hidden="true" />
              Your boarding passes
            </SheetTitle>
            {flights.length > 0 && (
              <SheetDescription className="text-white/50">
                {flightStats.landed} completed of {flightStats.taken}
              </SheetDescription>
            )}
          </SheetHeader>
          <div className="mt-4">
            <FlightLog
              flights={flights}
              renderPass={(f, outcome) => <BoardingPass flight={f} outcome={outcome} />}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Recent sessions, flights included — behind "History". */}
      <Sheet open={openSheet === "history"} onOpenChange={(o) => setOpenSheet(o ? "history" : null)}>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto bg-slate-950 text-white">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-white">
              <History className="h-4 w-4 text-accent" aria-hidden="true" />
              Focus history
            </SheetTitle>
            <SheetDescription className="text-white/50">
              Every timed session, flights included.
            </SheetDescription>
          </SheetHeader>
          <ul className="mt-4 divide-y divide-white/10">
            {focus.sessions.slice(0, 8).map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-1 py-2.5">
                <span
                  className={cn(
                    "h-1.5 w-1.5 shrink-0 rounded-full",
                    s.was_completed ? "bg-emerald-500" : "bg-amber-500",
                  )}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-white/90">
                    {s.target_label ?? "Focus session"}
                  </span>
                  <span className="block text-xs text-white/40">
                    {new Date(s.started_at).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-sm tabular-nums text-white/90">
                  {formatDuration(s.actual_minutes)}
                </span>
              </li>
            ))}
          </ul>
        </SheetContent>
      </Sheet>

      {/* Home airport ------------------------------------------------------ */}
      <Dialog open={homePickerOpen} onOpenChange={setHomePickerOpen}>
        <DialogContent className="sm:max-w-[42rem] bg-slate-950 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <MapPin className="h-4 w-4 text-accent" aria-hidden="true" />
              Your home airport
            </DialogTitle>
            <DialogDescription className="text-white/50">
              Every flight departs from here. Use your location to find the nearest, or search —
              your coordinates are matched on this device and never sent anywhere.
            </DialogDescription>
          </DialogHeader>
          <AirportPicker
            value={home}
            showLocate
            autoFocus
            onSelect={(a) => {
              void chooseHome(a);
              setHomePickerOpen(false);
              toast.success(`Home airport set to ${a.code}`, { description: a.name });
            }}
          />
        </DialogContent>
      </Dialog>
    </RoutineShell>
  );
}

/** Time-of-day greeting, matching the departure-hall's "walk up and go" feel. */
function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "Still up";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/**
 * The hero backdrop.
 *
 * Shows the student's most recent route when they have one — their own history
 * as the artwork — and otherwise a long-haul default so the hero is never
 * empty. Rendered in preview mode: no aircraft, no flown-path highlight, since
 * nothing is in progress.
 */
function HeroMap({
  flights,
  homeCode,
  visitedCodes,
}: {
  flights: { origin_code: string; destination_code: string }[];
  homeCode?: string;
  visitedCodes: Set<string>;
}) {
  const route = useMemo(() => {
    const last = flights[0];
    const origin = airportByCode(last?.origin_code ?? homeCode ?? "DEL") ?? airportByCode("DEL")!;
    const fallback = origin.code === "LHR" ? "JFK" : "LHR";
    const destination =
      airportByCode(last?.destination_code ?? fallback) ?? airportByCode("JFK")!;
    return { origin, destination };
  }, [flights, homeCode]);

  return (
    <FlightMap
      origin={route.origin}
      destination={route.destination}
      progress={0}
      visitedCodes={visitedCodes}
      preview
    />
  );
}
