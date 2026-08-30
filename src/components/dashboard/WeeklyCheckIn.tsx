import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Loader2, PenLine } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { EASE_OUT_EXPO, transition } from "@/lib/motion";
import { Eyebrow, Panel, Reveal } from "./primitives";
import {
  MORALE_MAX,
  MORALE_MIN,
  MORALE_WORDS,
  weekLabel,
  type WeeklyCheckinsData,
} from "@/hooks/useWeeklyCheckins";

/**
 * The weekly check-in.
 *
 * Every other figure on this page is measured *about* the student. This is the
 * one block they write themselves: how the week landed, what they actually did,
 * and what got in the way — the founder-update shape, for a seventeen-year-old.
 *
 * It has exactly two states and no third. Unfiled, it is the form. Filed, it is
 * the record, with an edit affordance that disappears when the week closes.
 * It never nags twice for the same week.
 */

/** Every station on the scale, low to high — the slider's snap points. */
const MORALE_STATIONS = Array.from(
  { length: MORALE_MAX - MORALE_MIN + 1 },
  (_, i) => MORALE_MIN + i
);

/**
 * Where the thumb rests before anything is chosen.
 *
 * It is only ever a *starting position*. The form's morale state stays `null`
 * until the student moves the control, and `submit` refuses to file a week
 * while it is null — so this number can never be saved by default.
 */
const MORALE_DEFAULT = 4;

/** The chosen station said in words. A bare number on a mood scale means nothing. */
const moraleWord = (n: number) => MORALE_WORDS[n] ?? String(n);

// ── The trend ─────────────────────────────────────────────────────────

const CH_W = 240;
const CH_H = 64;
const PAD_X = 8;
const TOP = 8;
const BOT = 56;
/** The neutral station, drawn as a hairline so a point reads as above or below it. */
const NEUTRAL = 4;

function yFor(m: number): number {
  return BOT - ((m - MORALE_MIN) / (MORALE_MAX - MORALE_MIN)) * (BOT - TOP);
}

/**
 * Morale over the last twelve weeks.
 *
 * One measure, one axis, one hue — so there is no legend and nothing is
 * encoded by colour alone. Missing weeks break the line rather than being
 * interpolated across: drawing straight through a week nobody filed would
 * assert a mood that was never recorded. Every value here is also readable as
 * text in the weeks list below, so the chart enhances and never gates.
 */
function MoraleTrend({ trend }: { trend: WeeklyCheckinsData["trend"] }) {
  const reduced = useReducedMotion();
  const points = useMemo(
    () =>
      trend.map((t, i) => ({
        ...t,
        x: PAD_X + (i / Math.max(1, trend.length - 1)) * (CH_W - PAD_X * 2),
        y: t.morale === null ? null : yFor(t.morale),
      })),
    [trend]
  );

  // Contiguous runs of filed weeks. Each becomes its own polyline.
  const segments = useMemo(() => {
    const out: { x: number; y: number }[][] = [];
    let run: { x: number; y: number }[] = [];
    for (const p of points) {
      if (p.y === null) {
        if (run.length > 1) out.push(run);
        run = [];
      } else {
        run.push({ x: p.x, y: p.y });
      }
    }
    if (run.length > 1) out.push(run);
    return out;
  }, [points]);

  const filed = points.filter((p) => p.y !== null);
  const last = filed[filed.length - 1];

  if (filed.length === 0) {
    return (
      <p className="text-[12px] leading-relaxed text-muted-foreground">
        Your first check-in starts the line. Three weeks in, it starts telling you
        something.
      </p>
    );
  }

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${CH_W} ${CH_H}`}
        className="w-full overflow-visible"
        role="img"
        aria-label={`Morale over the last ${trend.length} weeks, on a scale of 1 to 7. Latest: ${last ? MORALE_WORDS[last.morale as number] : "none"}.`}
      >
        {/* Recessive hairlines: the floor and the neutral station. Solid, one
            shade off the surface — never dashed. */}
        <line x1={0} y1={BOT} x2={CH_W} y2={BOT} className="stroke-border" strokeWidth="1" />
        <line
          x1={0}
          y1={yFor(NEUTRAL)}
          x2={CH_W}
          y2={yFor(NEUTRAL)}
          className="stroke-border"
          strokeWidth="1"
        />

        {segments.map((seg, i) => (
          <motion.polyline
            key={i}
            points={seg.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="stroke-primary"
            initial={reduced ? false : { pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: reduced ? 0 : 0.7, ease: EASE_OUT_EXPO }}
          />
        ))}

        {points.map((p) =>
          p.y === null ? null : (
            <g key={p.weekKey}>
              {/* A 2px surface ring keeps a marker legible where it sits on the
                  neutral hairline or against its own line. */}
              <circle cx={p.x} cy={p.y} r={5.5} className="fill-card" />
              <circle
                cx={p.x}
                cy={p.y}
                r={p === last ? 4 : 3}
                className={p === last ? "fill-primary" : "fill-primary/55"}
              />
            </g>
          )
        )}

        {/* Hit targets wider than the marks, so a value is reachable without
            landing dead-centre on a 4px dot. */}
        {points.map((p) => (
          <rect
            key={`hit-${p.weekKey}`}
            x={p.x - 10}
            y={0}
            width={20}
            height={CH_H}
            fill="transparent"
          >
            <title>
              {weekLabel(p.weekKey)} —{" "}
              {p.morale === null ? "no check-in" : `${MORALE_WORDS[p.morale]} (${p.morale}/7)`}
            </title>
          </rect>
        ))}
      </svg>

      {/* The endpoint is direct-labelled; nothing else is. A number beside every
          dot on a twelve-point line is chaos and goes unread. */}
      <figcaption className="mt-2 flex items-baseline justify-between gap-3">
        <span className="font-display text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          Last {trend.length} weeks
        </span>
        {last && (
          <span className="text-[11px] text-muted-foreground">
            Now{" "}
            <span className="font-display font-semibold text-foreground">
              {MORALE_WORDS[last.morale as number]}
            </span>
          </span>
        )}
      </figcaption>
    </figure>
  );
}

// ── The mood control ──────────────────────────────────────────────────

/**
 * Where the week landed. At rest this is a line of text, not a control —
 * a track and a thumb sitting under a value nobody has set yet is the
 * loudest thing on the card. The slider only appears once the student
 * clicks in; from then on it behaves like the ordinary drag/keyboard
 * control it always was.
 */
function MoodSlider({
  value,
  onChange,
  defaultValue,
}: {
  value: number | null;
  onChange: (v: number) => void;
  defaultValue: number;
}) {
  const reduced = useReducedMotion();
  const [revealed, setRevealed] = useState(false);
  // The live drag position, continuous rather than station-quantized. Null
  // outside of an active drag, so the thumb reads straight off the committed
  // `value` and can spring to it — a whole-number jump per pixel read as
  // mechanical, where a real dial has slack before it catches a detent.
  const [dragValue, setDragValue] = useState<number | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const span = MORALE_MAX - MORALE_MIN;
  const hasValue = value !== null;
  const isDragging = dragValue !== null;
  // Unset, the thumb rests at the default station rather than at the floor.
  // Resting at MORALE_MIN put it under the "Rough" label, which reads as a
  // value the student did not choose.
  const liveValue = dragValue ?? (hasValue ? value! : defaultValue);
  const percentage = ((liveValue - MORALE_MIN) / span) * 100;

  /** Pulls a continuous position toward whichever station it's already close
   *  to, so a station reads as a resting point without fully quantizing the
   *  drag itself — a detent, not a stair-step. */
  const applyMagnet = (raw: number) => {
    const nearest = Math.round(raw);
    const distance = Math.abs(raw - nearest);
    const radius = 0.5;
    if (distance < 0.001 || distance > radius) return raw;
    const t = 1 - distance / radius;
    const strength = 0.68 + 0.42 * t;
    return raw - (raw - nearest) * strength * t * t;
  };

  const valueFromClientX = (clientX: number): number | null => {
    const track = trackRef.current;
    if (!track) return null;
    const rect = track.getBoundingClientRect();
    if (rect.width === 0) return null;
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return applyMagnet(ratio * span + MORALE_MIN);
  };

  /**
   * Compared against the committed `value`, not against a ref.
   *
   * This used to dedupe against `lastStationRef`, seeded to `value ?? defaultValue`
   * — so on an unfiled week the ref started at the default station (4, "Steady")
   * while `value` was still null. Clicking the middle of the track, which is the
   * obvious first move on a 1-to-7 mood scale, rounded to 4, matched the ref, and
   * returned without calling `onChange`. Morale stayed null, so no thumb and no
   * fill appeared, and submitting still refused with "Pick where the week landed".
   * The control looked completely dead for the one gesture most students make first.
   *
   * The ref also never resynced when the parent reset `morale` from a loaded
   * check-in, so after an edit it could reject a genuinely new station too.
   * `value` is a prop and is correct on every render, which is all the guard
   * against redundant onChange calls during a drag ever needed to be.
   */
  const commitStation = (raw: number) => {
    const station = Math.min(MORALE_MAX, Math.max(MORALE_MIN, Math.round(raw)));
    if (station !== value) onChange(station);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    draggingRef.current = true;
    const next = valueFromClientX(event.clientX);
    if (next !== null) {
      setDragValue(next);
      commitStation(next);
    }
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    const next = valueFromClientX(event.clientX);
    if (next !== null) {
      setDragValue(next);
      commitStation(next);
    }
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    // Releasing hands the thumb back to the committed value, which lets it
    // spring from wherever the magnet left it to the station's exact rest.
    setDragValue(null);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const current = value ?? defaultValue;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowUp":
        event.preventDefault();
        commitStation(Math.min(MORALE_MAX, current + 1));
        break;
      case "ArrowLeft":
      case "ArrowDown":
        event.preventDefault();
        commitStation(Math.max(MORALE_MIN, current - 1));
        break;
      case "Home":
        event.preventDefault();
        commitStation(MORALE_MIN);
        break;
      case "End":
        event.preventDefault();
        commitStation(MORALE_MAX);
        break;
      default:
        break;
    }
  };

  if (!revealed) {
    return (
      <button
        type="button"
        onClick={() => setRevealed(true)}
        className="-mx-1 block rounded px-1 py-1 text-left text-[13px] leading-relaxed text-foreground transition-colors hover:text-primary"
      >
        {hasValue ? (
          <span className="font-display font-semibold">{moraleWord(value!)}</span>
        ) : (
          <span className="text-muted-foreground">Click to rate the week</span>
        )}
      </button>
    );
  }

  // While dragging the thumb tracks the pointer with no lag; letting go hands
  // it to a spring so it settles into the station rather than snapping.
  const thumbTransition = isDragging || reduced ? { duration: 0 } : transition.spring;

  return (
    <div className="pb-1 pt-1">
      <div className="relative h-2">
        <div
          ref={trackRef}
          role="slider"
          tabIndex={0}
          aria-label="How the week landed"
          aria-valuemin={MORALE_MIN}
          aria-valuemax={MORALE_MAX}
          aria-valuenow={hasValue ? value! : undefined}
          aria-valuetext={hasValue ? moraleWord(value!) : "Not set"}
          aria-orientation="horizontal"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={handleKeyDown}
          // eslint-disable-next-line jsx-a11y/no-autofocus -- the click that
          // revealed this track was already a deliberate "I want to set this"
          // gesture, so carrying focus straight into it costs nothing.
          autoFocus
          className={cn(
            "absolute inset-0 cursor-pointer touch-none select-none rounded-sm",
            "before:absolute before:-top-3 before:inset-x-0 before:-bottom-5 before:content-['']",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
          )}
        >
          <div className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 overflow-hidden rounded-sm bg-primary/10">
            {(hasValue || isDragging) && (
              <motion.div
                className="absolute top-0 z-[1] h-full bg-primary"
                animate={{ width: `${percentage}%` }}
                transition={thumbTransition}
              />
            )}
            {MORALE_STATIONS.map((mark) => {
              if (mark === MORALE_MIN || mark === MORALE_MAX) return null;
              const markPercentage = ((mark - MORALE_MIN) / span) * 100;
              return (
                <div
                  key={mark}
                  className="absolute top-0 z-[2] h-full w-px -translate-x-1/2 bg-background"
                  style={{ left: `${markPercentage}%` }}
                />
              );
            })}
          </div>

          {/* The thumb is present from the moment the track is revealed. It used
              to render only once a value existed, so a student opening the
              control was handed a bare grey bar with nothing to grab — and if
              their first click landed on the station the old guard swallowed,
              nothing ever appeared. Hollow while unset, so it reads as a handle
              waiting to be placed rather than as a mood already recorded. */}
          <motion.div
            className={cn(
              "absolute top-1/2 z-[3] h-[10px] w-[10px] -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full shadow-sm active:cursor-grabbing",
              hasValue || isDragging
                ? "bg-primary"
                : "border-2 border-primary/45 bg-card"
            )}
            animate={{ left: `${percentage}%` }}
            transition={thumbTransition}
          />
        </div>
      </div>

      <div className="mt-2.5 flex items-baseline justify-between">
        <span className="text-[11px] text-muted-foreground">{moraleWord(MORALE_MIN)}</span>
        <span className="relative inline-block h-[1.3em] min-w-[4.5rem] text-center">
          <AnimatePresence initial={false}>
            <motion.span
              key={hasValue ? value : "unset"}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 5, filter: "blur(2px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, y: -5, filter: "blur(2px)" }}
              transition={transition.fast}
              className="absolute inset-0 font-display text-[13px] font-semibold text-foreground"
            >
              {hasValue ? moraleWord(value!) : "—"}
            </motion.span>
          </AnimatePresence>
        </span>
        <span className="text-[11px] text-muted-foreground">{moraleWord(MORALE_MAX)}</span>
      </div>
    </div>
  );
}

// ── The block ─────────────────────────────────────────────────────────

function Field({
  label,
  hint,
  value,
  onChange,
  placeholder,
  rows,
  autoFocus,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  rows: number;
  autoFocus?: boolean;
}) {
  return (
    <div>
      <label className="block">
        <span className="font-display text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </span>
        {hint && <span className="ml-2 text-[11px] text-muted-foreground/70">{hint}</span>}
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          maxLength={2000}
          autoFocus={autoFocus}
          className={cn(
            "mt-2 w-full resize-none rounded-xl border border-border bg-card/60 px-3.5 py-3",
            "text-[13px] leading-relaxed text-foreground placeholder:text-muted-foreground/55",
            "transition-colors focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/15"
          )}
        />
      </label>
    </div>
  );
}

function Answer({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <span className="font-display text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </span>
      <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed text-foreground">
        {body}
      </p>
    </div>
  );
}

export function WeeklyCheckIn({ data }: { data: WeeklyCheckinsData }) {
  const { current, currentWeekKey, streak, trend, checkins, save, saving, loading } = data;

  const [editing, setEditing] = useState(false);
  const [morale, setMorale] = useState<number | null>(null);
  const [progress, setProgress] = useState("");
  const [reflection, setReflection] = useState("");

  // Seed the form from the filed week whenever it arrives or changes, so
  // "Edit" opens on what was written rather than on an empty sheet.
  useEffect(() => {
    setMorale(current?.morale ?? null);
    setProgress(current?.progress ?? "");
    setReflection(current?.reflection ?? "");
  }, [current]);

  const past = useMemo(
    () => checkins.filter((c) => c.week_start !== currentWeekKey).slice(0, 4),
    [checkins, currentWeekKey]
  );

  const composing = !current || editing;

  const submit = async () => {
    if (morale === null) {
      toast.error("Pick where the week landed.");
      return;
    }
    if (!progress.trim()) {
      toast.error("Say what you did this week — a line is enough.");
      return;
    }
    const res = await save({ morale, progress, reflection });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setEditing(false);
    toast.success(current ? "Check-in updated." : "Week logged.");
  };

  if (loading) return null;

  return (
    <Reveal delay={0.18}>
      <Panel id="weekly-check-in" lift={false} className="overflow-hidden p-0">
        {/*
         * Two columns split by the container's own background showing through a
         * 1px grid gap — the Ledger's hairline trick, so this block is built the
         * same way as the strip beneath it. The account of the week gets seven
         * columns; the record of every week before it gets five.
         */}
        <div className="grid grid-cols-1 gap-px bg-border lg:grid-cols-12">
          {/* The week itself */}
          <div className="bg-card p-5 sm:p-6 lg:col-span-7">
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
              <div className="min-w-0">
                <Eyebrow>This week</Eyebrow>
                <h2 className="mt-2 font-display text-lg font-semibold leading-[1.15] tracking-[-0.015em]">
                  {composing ? "How did it actually go?" : "Logged"}
                </h2>
              </div>
              <span className="shrink-0 font-display text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                {weekLabel(currentWeekKey)}
              </span>
            </div>

            {composing ? (
              <div className="mt-5 space-y-5">
                <div>
                  <span className="font-display text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                    Where the week landed
                  </span>
                  <div className="mt-2">
                    <MoodSlider value={morale} onChange={setMorale} defaultValue={MORALE_DEFAULT} />
                  </div>
                </div>

                <Field
                  label="What you did"
                  value={progress}
                  onChange={setProgress}
                  placeholder="Finished the Kaggle write-up, sent two professor emails, sat a full timed section."
                  rows={3}
                  autoFocus={editing}
                />
                <Field
                  label="How it went"
                  hint="optional"
                  value={reflection}
                  onChange={setReflection}
                  placeholder="Lost most of Wednesday to a physics test. The essay draft is still where it was."
                  rows={2}
                />

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={submit}
                    disabled={saving}
                    className="btn-accent inline-flex items-center gap-1.5 text-[12px] tracking-tight disabled:opacity-60"
                  >
                    {saving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                    {current ? "Save changes" : "Log this week"}
                  </button>
                  {current && (
                    <button
                      type="button"
                      onClick={() => setEditing(false)}
                      className="font-display text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground"
                    >
                      Cancel
                    </button>
                  )}
                  <span className="text-[11px] text-muted-foreground">
                    You can rewrite this until Sunday.
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-5 space-y-5">
                {/* The serif numeral is the page's voice for a figure, and this
                    is the only number the student wrote themselves. */}
                <div className="flex items-baseline gap-3">
                  <span className="font-serif text-[clamp(2.4rem,9vw,3.2rem)] leading-none text-primary">
                    {current!.morale}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-display text-lg font-semibold leading-tight tracking-[-0.015em]">
                      {MORALE_WORDS[current!.morale]}
                    </span>
                    <span className="mt-0.5 block font-display text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                      out of {MORALE_MAX}
                    </span>
                  </span>
                </div>

                <Answer label="What you did" body={current!.progress} />
                {current!.reflection && (
                  <Answer label="How it went" body={current!.reflection} />
                )}

                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="group -m-2 inline-flex min-h-11 items-center gap-1.5 p-2 font-display text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-primary"
                >
                  <PenLine className="h-3 w-3" />
                  Edit while the week is open
                </button>
              </div>
            )}
          </div>

          {/* The record */}
          <div className="bg-card p-5 sm:p-6 lg:col-span-5">
            <div className="flex items-start justify-between gap-4">
              <Eyebrow>The record</Eyebrow>
              {streak > 0 && (
                <span className="shrink-0 text-right">
                  <span className="font-serif text-[22px] leading-none tabular-nums text-foreground">
                    {streak}
                  </span>
                  <span className="ml-1.5 font-display text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    {streak === 1 ? "week" : "weeks"} running
                  </span>
                </span>
              )}
            </div>

            <div className="mt-4">
              <MoraleTrend trend={trend} />
            </div>

            {past.length > 0 && (
              <ul className="mt-5 space-y-1 border-t border-border pt-3">
                {past.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-baseline justify-between gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/60"
                  >
                    <span className="min-w-0">
                      <span className="block font-display text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                        {weekLabel(c.week_start)}
                      </span>
                      <span className="mt-0.5 block truncate text-[12px] leading-snug text-foreground">
                        {c.progress}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="font-display text-[15px] font-semibold tabular-nums text-foreground">
                        {c.morale}
                      </span>
                      <span className="ml-1 text-[11px] text-muted-foreground">
                        {MORALE_WORDS[c.morale]}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Panel>
    </Reveal>
  );
}
