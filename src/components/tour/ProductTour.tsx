import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { DURATION, EASE_OUT_EXPO } from "@/lib/motion";
import { Bloub, type BloubState } from "@/components/support/Bloub";
import { TOUR_STOPS, TOUR_TOTAL_STEPS, navAnchorFor, type TourStep } from "@/lib/tour/steps";

/**
 * The product tour: Bloub walks a new student through the seven pages in the
 * nav bar, one route at a time.
 *
 * Why this is not `JourneyTour` with a longer script: that component tours one
 * page. This one drives the router. Every stop navigates, waits for the route's
 * lazy chunk and its first data to land, and only then measures anything — a
 * rect taken while a `Suspense` fallback is still mounted points at a spinner.
 * The chapter card that flips over between stops is what covers that wait, so
 * it is load-bearing rather than decoration: without it the tour would sit on a
 * blank overlay for as long as the chunk takes.
 *
 * Everything animates on transform and opacity only — the spotlight is one
 * element with a 9999px spread shadow rather than four edge divs, the card and
 * the mascot are composited layers, and nothing here animates a property that
 * costs layout. A tour that stutters is worse than no tour.
 *
 * Under `prefers-reduced-motion` the 3D is dropped wholesale: no rotation, no
 * bob, no flip — the tour still runs, it just cuts between states.
 */

const PAD = 8;
const GAP = 14;
const MARGIN = 12;
/** How long the chapter card holds while the next route mounts. */
const CHAPTER_MS = 780;

type Box = { top: number; left: number; width: number; height: number };

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

/** Springy but settled — the tour's house transition for anything that moves. */
const SPRING = { type: "spring", stiffness: 420, damping: 34, mass: 0.9 } as const;

export function ProductTour({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const reduced = useReducedMotion();
  const navigate = useNavigate();
  const location = useLocation();

  const [stopIndex, setStopIndex] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  /** True while the chapter card covers a route change. */
  const [chapter, setChapter] = useState(true);

  const [spot, setSpot] = useState<Box | null>(null);
  const [cardPos, setCardPos] = useState<{ top: number; left: number } | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const stop = TOUR_STOPS[stopIndex];
  const step: TourStep | undefined = stop?.steps[stepIndex];

  /** 1-based position in the flat run, for the "4 of 17" readout. */
  const flatIndex = useMemo(
    () => TOUR_STOPS.slice(0, stopIndex).reduce((n, s) => n + s.steps.length, 0) + stepIndex + 1,
    [stopIndex, stepIndex],
  );

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  // Restart from the top on each opening, including re-runs from the launcher.
  useEffect(() => {
    if (!open) return;
    setStopIndex(0);
    setStepIndex(0);
    setChapter(true);
    setSpot(null);
    setCardPos(null);
  }, [open]);

  // ── Drive the router ────────────────────────────────────────────────
  // The tour owns the location while it runs. Navigating is what makes this a
  // product tour rather than a page tour, and `replace` keeps seven entries out
  // of the student's back history.
  useEffect(() => {
    if (!open || !stop) return;
    setChapter(true);
    setSpot(null);
    setCardPos(null);
    if (location.pathname !== stop.href) navigate(stop.href, { replace: true });
    const t = window.setTimeout(() => setChapter(false), reduced ? 120 : CHAPTER_MS);
    return () => window.clearTimeout(t);
    // location.pathname is deliberately NOT a dependency: reacting to it would
    // restart the chapter every time the route settles, which is a loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, stopIndex, reduced]);

  // ── Movement ────────────────────────────────────────────────────────
  const goNext = useCallback(() => {
    if (!stop) return;
    if (stepIndex < stop.steps.length - 1) {
      setStepIndex((i) => i + 1);
      return;
    }
    if (stopIndex < TOUR_STOPS.length - 1) {
      setStopIndex((i) => i + 1);
      setStepIndex(0);
      return;
    }
    close();
  }, [stop, stepIndex, stopIndex, close]);

  const goBack = useCallback(() => {
    if (stepIndex > 0) {
      setStepIndex((i) => i - 1);
      return;
    }
    if (stopIndex > 0) {
      const prev = stopIndex - 1;
      setStopIndex(prev);
      setStepIndex(TOUR_STOPS[prev].steps.length - 1);
    }
  }, [stepIndex, stopIndex]);

  const jumpToStop = useCallback(
    (i: number) => {
      if (i === stopIndex) return;
      setStopIndex(i);
      setStepIndex(0);
    },
    [stopIndex],
  );

  // ── Resolve and place the spotlight + card ──────────────────────────
  /**
   * A step points at its own target when it has one, and otherwise at the stop's
   * item in the nav bar — so even a step with nothing to highlight still tells
   * the student where in the bar this page lives. Only when neither is on screen
   * does it fall through to a centred card.
   */
  const selectorFor = useCallback(
    (s: TourStep | undefined): string | null => {
      if (!s || !stop) return null;
      if (s.target && document.querySelector(s.target)) return s.target;
      const nav = navAnchorFor(stop.href);
      return document.querySelector(nav) ? nav : null;
    },
    [stop],
  );

  const place = useCallback(() => {
    if (!step) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const card = cardRef.current;
    const cw = card?.offsetWidth ?? 320;
    const ch = card?.offsetHeight ?? 200;

    const selector = selectorFor(step);
    const el = selector ? document.querySelector(selector) : null;

    if (!el) {
      // Centred card, no cutout. The scrim stays whole.
      setSpot((p) => (p === null ? p : null));
      const next = { top: vh / 2 - ch / 2, left: vw / 2 - cw / 2 };
      setCardPos((p) => (p && p.top === next.top && p.left === next.left ? p : next));
      return;
    }

    const r = el.getBoundingClientRect();
    const box: Box = {
      top: r.top - PAD,
      left: r.left - PAD,
      width: r.width + PAD * 2,
      height: r.height + PAD * 2,
    };
    // Bail out of identical updates: this runs on a ~1s rAF loop while a smooth
    // scroll settles, and re-rendering 60 times on an unmoved rect is waste.
    setSpot((p) =>
      p &&
      p.top === box.top &&
      p.left === box.left &&
      p.width === box.width &&
      p.height === box.height
        ? p
        : box,
    );

    let placement = step.placement ?? "bottom";
    // Auto-flip when the requested side has no room. A card half off-screen is
    // worse than one on the other side of the element.
    if (placement === "bottom" && box.top + box.height + GAP + ch > vh - MARGIN) placement = "top";
    else if (placement === "top" && box.top - GAP - ch < MARGIN) placement = "bottom";
    if (placement === "right" && box.left + box.width + GAP + cw > vw - MARGIN) placement = "left";
    else if (placement === "left" && box.left - GAP - cw < MARGIN) placement = "right";
    if ((placement === "left" || placement === "right") && cw + box.width + GAP * 2 > vw) {
      placement = box.top + box.height + GAP + ch < vh - MARGIN ? "bottom" : "top";
    }

    let top: number;
    let left: number;
    switch (placement) {
      case "top":
        top = box.top - GAP - ch;
        left = box.left + box.width / 2 - cw / 2;
        break;
      case "left":
        top = box.top + box.height / 2 - ch / 2;
        left = box.left - GAP - cw;
        break;
      case "right":
        top = box.top + box.height / 2 - ch / 2;
        left = box.left + box.width + GAP;
        break;
      case "center":
        top = vh / 2 - ch / 2;
        left = vw / 2 - cw / 2;
        break;
      default:
        top = box.top + box.height + GAP;
        left = box.left + box.width / 2 - cw / 2;
    }

    const next = {
      top: clamp(top, MARGIN, vh - ch - MARGIN),
      left: clamp(left, MARGIN, vw - cw - MARGIN),
    };
    setCardPos((p) => (p && p.top === next.top && p.left === next.left ? p : next));
  }, [step, selectorFor]);

  // Scroll the target into frame before measuring it.
  useEffect(() => {
    if (!open || chapter || !step) return;
    const selector = selectorFor(step);
    const el = selector ? document.querySelector(selector) : null;
    el?.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
  }, [open, chapter, step, reduced, selectorFor]);

  useLayoutEffect(() => {
    if (!open || chapter || !step) return;
    place();
    // The page scrolls smoothly into position and the route may still be
    // hydrating. `capture` catches nested scrollers; the frame loop covers the
    // smooth scroll's intermediate frames plus late layout (fonts, images).
    let raf = 0;
    let frames = 0;
    const tick = () => {
      place();
      if (frames++ < 60) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, chapter, step, place]);

  // ── Keyboard ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goBack();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close, goNext, goBack]);

  // ── Body scroll lock ────────────────────────────────────────────────
  // `overflow: hidden` still permits programmatic scrolling, so scrollIntoView
  // keeps working while the student cannot scroll away from the step.
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    const prevPad = body.style.paddingRight;
    const barWidth = window.innerWidth - html.clientWidth;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    if (barWidth > 0) body.style.paddingRight = `${barWidth}px`;
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
      body.style.paddingRight = prevPad;
    };
  }, [open]);

  useEffect(() => {
    if (open && !chapter) cardRef.current?.focus();
  }, [open, chapter, stepIndex, stopIndex]);

  if (typeof document === "undefined" || !stop) return null;

  const dur = reduced ? 0 : DURATION.base;
  const mood: BloubState = chapter ? "thinking" : step?.mood ?? "idle";
  const StopIcon = stop.icon;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[110]"
          role="dialog"
          aria-modal="true"
          aria-label="Pathforge product tour"
        >
          {/* Click blocker. Swallows taps rather than closing — an accidental
              brush should not end the walkthrough. */}
          <motion.div
            className="absolute inset-0"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduced ? undefined : { opacity: 0 }}
            transition={{ duration: dur, ease: EASE_OUT_EXPO }}
            onClick={(e) => e.stopPropagation()}
          />

          {/* Scrim. Whole when there is no target, cut out when there is. One
              element with an enormous spread shadow is a single composited
              layer — cheaper and sharper than four edge divs. */}
          {spot ? (
            <motion.div
              aria-hidden
              className="pointer-events-none absolute rounded-2xl ring-2 ring-accent/80"
              style={{ boxShadow: "0 0 0 9999px hsl(222 47% 16% / 0.66)" }}
              initial={false}
              animate={{
                opacity: chapter ? 0 : 1,
                top: spot.top,
                left: spot.left,
                width: spot.width,
                height: spot.height,
              }}
              transition={reduced ? { duration: 0 } : SPRING}
            />
          ) : (
            <motion.div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[hsl(222_47%_16%/0.66)]"
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduced ? undefined : { opacity: 0 }}
              transition={{ duration: dur, ease: EASE_OUT_EXPO }}
            />
          )}

          {/* ── Chapter card: covers the route change between stops ────── */}
          <AnimatePresence mode="wait">
            {chapter && (
              <motion.div
                key={`chapter-${stopIndex}`}
                className="pointer-events-none absolute inset-0 flex items-center justify-center [perspective:1200px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduced ? 0 : DURATION.fast }}
              >
                <motion.div
                  className="flex flex-col items-center gap-4 rounded-3xl border border-white/15 bg-[hsl(222_47%_14%/0.92)] px-10 py-9 text-center text-white shadow-[0_40px_120px_-40px_rgba(0,0,0,0.8)]"
                  style={{ transformStyle: "preserve-3d" }}
                  initial={reduced ? false : { rotateX: -55, y: 40, scale: 0.9, opacity: 0 }}
                  animate={{ rotateX: 0, y: 0, scale: 1, opacity: 1 }}
                  exit={reduced ? undefined : { rotateX: 42, y: -30, scale: 0.94, opacity: 0 }}
                  transition={reduced ? { duration: 0 } : SPRING}
                >
                  <motion.span
                    className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/20 bg-white/10"
                    initial={reduced ? false : { rotateY: -90, opacity: 0 }}
                    animate={{ rotateY: 0, opacity: 1 }}
                    transition={reduced ? { duration: 0 } : { ...SPRING, delay: 0.06 }}
                  >
                    <StopIcon className="h-7 w-7" />
                  </motion.span>
                  <div>
                    <p className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
                      Stop {stopIndex + 1} of {TOUR_STOPS.length}
                    </p>
                    <h2 className="mt-1.5 font-display text-2xl font-semibold tracking-[-0.02em]">
                      {stop.label}
                    </h2>
                    {stop.tagline && (
                      <p className="mt-1 text-[13px] text-white/60">{stop.tagline}</p>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Step card ───────────────────────────────────────────────── */}
          <AnimatePresence>
            {!chapter && step && (
              <div
                className="pointer-events-none absolute inset-0 [perspective:1400px]"
                aria-hidden={false}
              >
                <motion.div
                  ref={cardRef}
                  tabIndex={-1}
                  key={`${stopIndex}-${stepIndex}`}
                  className={cn(
                    "pointer-events-auto absolute w-[min(22rem,calc(100vw-1.5rem))] rounded-2xl border border-border bg-card p-4 shadow-[0_28px_70px_-30px_rgba(18,28,54,0.55)] outline-none",
                  )}
                  style={{
                    top: cardPos?.top ?? 0,
                    left: cardPos?.left ?? 0,
                    visibility: cardPos ? "visible" : "hidden",
                    transformStyle: "preserve-3d",
                  }}
                  initial={
                    reduced ? false : { opacity: 0, rotateY: -16, rotateX: 8, y: 18, scale: 0.94 }
                  }
                  animate={{
                    opacity: cardPos ? 1 : 0,
                    rotateY: 0,
                    rotateX: 0,
                    y: 0,
                    scale: 1,
                  }}
                  exit={reduced ? undefined : { opacity: 0, rotateY: 12, y: -10, scale: 0.96 }}
                  transition={reduced ? { duration: 0 } : SPRING}
                >
                  {/* Bloub rides the top-left corner of the card and pops
                      forward in Z, so it reads as standing in front of the card
                      rather than being pasted onto it. */}
                  <motion.div
                    className="absolute -left-3 -top-7 h-14 w-14 rounded-full border border-border bg-card p-1.5 shadow-lg"
                    style={{ transform: "translateZ(40px)" }}
                    initial={reduced ? false : { scale: 0, rotate: -25 }}
                    animate={
                      reduced
                        ? { scale: 1, rotate: 0 }
                        : { scale: 1, rotate: 0, y: [0, -4, 0] }
                    }
                    transition={
                      reduced
                        ? { duration: 0 }
                        : {
                            scale: SPRING,
                            rotate: SPRING,
                            y: { duration: 2.6, repeat: Infinity, ease: "easeInOut" },
                          }
                    }
                  >
                    <Bloub state={mood} title="Bloub, your guide" className="h-full w-full" />
                  </motion.div>

                  <div className="flex items-start justify-between gap-3 pl-11">
                    <span className="font-display text-[10px] font-bold uppercase tracking-[0.14em] text-accent">
                      {flatIndex} of {TOUR_TOTAL_STEPS}
                    </span>
                    <button
                      type="button"
                      onClick={close}
                      // -m-2/p-2 keeps the glyph small while the tap target is not.
                      className="-m-2 shrink-0 rounded-md p-2 text-muted-foreground transition-colors hover:text-foreground"
                      aria-label="Skip the tour"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <motion.h2
                    className="mt-2 font-display text-base font-semibold leading-tight tracking-[-0.015em]"
                    initial={reduced ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={reduced ? { duration: 0 } : { delay: 0.06, duration: DURATION.base, ease: EASE_OUT_EXPO }}
                  >
                    {step.title}
                  </motion.h2>
                  <motion.p
                    className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground"
                    initial={reduced ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={reduced ? { duration: 0 } : { delay: 0.11, duration: DURATION.base, ease: EASE_OUT_EXPO }}
                  >
                    {step.body}
                  </motion.p>

                  <div className="mt-4 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={close}
                      className="font-display text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground"
                    >
                      Skip
                    </button>
                    <div className="flex items-center gap-2">
                      <motion.button
                        type="button"
                        onClick={goBack}
                        disabled={stopIndex === 0 && stepIndex === 0}
                        whileHover={reduced ? undefined : { y: -1 }}
                        whileTap={reduced ? undefined : { scale: 0.97 }}
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1.5 font-display text-[10px] font-bold uppercase tracking-[0.14em] text-foreground transition-colors hover:bg-muted/50 disabled:pointer-events-none disabled:opacity-40"
                      >
                        <ArrowLeft className="h-3 w-3" />
                        Back
                      </motion.button>
                      <motion.button
                        type="button"
                        onClick={goNext}
                        whileHover={reduced ? undefined : { y: -1 }}
                        whileTap={reduced ? undefined : { scale: 0.97 }}
                        className="inline-flex items-center gap-1 rounded-md bg-accent px-2.5 py-1.5 font-display text-[10px] font-bold uppercase tracking-[0.14em] text-accent-foreground transition-colors hover:bg-accent/90"
                      >
                        {flatIndex === TOUR_TOTAL_STEPS ? "Done" : "Next"}
                        {flatIndex < TOUR_TOTAL_STEPS && <ArrowRight className="h-3 w-3" />}
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* ── Chapter rail ────────────────────────────────────────────── */}
          {/* One chip per nav page, so the student can see the shape of the
              tour and jump. Hidden on phones, where seven chips and a card do
              not both fit above the fold. */}
          <motion.nav
            aria-label="Tour stops"
            className="pointer-events-auto absolute inset-x-0 bottom-4 hidden justify-center px-4 sm:flex"
            initial={reduced ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: 12 }}
            transition={reduced ? { duration: 0 } : { ...SPRING, delay: 0.1 }}
          >
            <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-white/15 bg-[hsl(222_47%_14%/0.9)] p-1.5 backdrop-blur-sm">
              {TOUR_STOPS.map((s, i) => {
                const Icon = s.icon;
                const isCurrent = i === stopIndex;
                return (
                  <button
                    key={s.href}
                    type="button"
                    onClick={() => jumpToStop(i)}
                    aria-current={isCurrent ? "step" : undefined}
                    className={cn(
                      "relative flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors",
                      isCurrent ? "text-white" : "text-white/55 hover:text-white/85",
                    )}
                  >
                    {isCurrent && (
                      <motion.span
                        layoutId="tour-rail-pill"
                        className="absolute inset-0 rounded-full bg-accent"
                        transition={reduced ? { duration: 0 } : SPRING}
                      />
                    )}
                    <Icon className="relative h-3.5 w-3.5" />
                    <span className="relative">{s.label}</span>
                  </button>
                );
              })}
            </div>
          </motion.nav>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export default ProductTour;
