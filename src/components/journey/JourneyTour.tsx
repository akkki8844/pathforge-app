import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { DURATION, EASE_OUT_EXPO } from "@/lib/motion";

/**
 * Guided walkthrough of the Journey page.
 *
 * Deliberately hand-rolled rather than pulling in a tour library: the page's
 * path scrolls inside its own container, and some targets only exist in some
 * page states (the current-stage node, everything behind the start screen). A
 * dependency would have to be fought on both counts. It is ~200 lines of rect
 * maths instead.
 *
 * Anchoring is by `data-tour="..."` only. Class names and nth-child selectors
 * break the first time someone reflows the header.
 */

export type TourPlacement = "top" | "bottom" | "left" | "right" | "center";

export interface TourStep {
  /** CSS selector — always a `[data-tour="…"]` attribute in practice. */
  target: string;
  title: string;
  body: string;
  placement?: TourPlacement;
}

/** localStorage flag for the once-per-user auto-run. */
export const JOURNEY_TOUR_SEEN_KEY = "pf_journey_tour_seen";

/**
 * The script. Any step whose target is missing at open time is dropped, so
 * these can safely describe things that only exist in some page states.
 */
export const JOURNEY_TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="journey-banner"]',
    title: "This is your journey",
    body: "Fifteen levels, three hundred quests. The banner always names the level you're on and the single action that matters right now — read it first every time you land here.",
    placement: "bottom",
  },
  {
    target: '[data-tour="journey-stats"]',
    title: "Streak, gems, hearts",
    body: "Streak counts consecutive days you completed something. Gems are one per level finished. Hearts are your monthly budget — you lose one for every week that passes without a completed level.",
    placement: "bottom",
  },
  {
    target: '[data-tour="journey-path"]',
    title: "The path",
    body: "Every quest in the programme, in order, scrolling inside its own panel. Completed stages stay lit behind you and locked ones stay dim ahead — you always unlock the next one by finishing the one before it.",
    placement: "right",
  },
  {
    target: '[data-tour="path-level-banner"]',
    title: "Level markers",
    body: "Each block of twenty stages is one level. Finish all twenty and a report chip appears here with an AI evaluation of how you actually did — not just that you ticked the boxes.",
    placement: "right",
  },
  {
    // Ordered after the level marker so the inner scroller only travels one
    // way: top of the path, then down to wherever the student actually is.
    target: '[data-tour="current-stage"]',
    title: "Your next quest",
    body: "The glowing node is the only one you can open. Tap it to see the tasks, upload your proof, and claim the stage once the evidence passes verification.",
    placement: "right",
  },
  {
    target: '[data-tour="journey-leaderboard"]',
    title: "Where you stand",
    body: "The standings have their own page — this opens it. Everyone is ranked by gems, and you can narrow the board to your school or your grade. Your own row stays pinned wherever you land.",
    placement: "bottom",
  },
  {
    target: '[data-tour="place-level"]',
    title: "Skip ahead honestly",
    body: "Already past the foundations? Take the placement test and start at the level that matches your profile instead of grinding through work you've done.",
    placement: "bottom",
  },
  {
    target: '[data-tour="tour-button"]',
    title: "Replay any time",
    body: "That's the whole page. This button reruns the walkthrough whenever you want it — nothing here is a one-shot.",
    placement: "bottom",
  },
];

// Distance from the highlighted element to the card, and the minimum gutter
// between the card and the viewport edge.
const GAP = 14;
const MARGIN = 12;
/** Breathing room drawn around the highlighted element. */
const PAD = 8;

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

function clamp(v: number, min: number, max: number) {
  // max can fall below min on very small viewports; the low edge wins so the
  // card is never pushed off the top/left.
  return Math.max(min, Math.min(v, Math.max(min, max)));
}

export function JourneyTour({
  open,
  onOpenChange,
  steps = JOURNEY_TOUR_STEPS,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  steps?: TourStep[];
}) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [spot, setSpot] = useState<Box | null>(null);
  const [cardPos, setCardPos] = useState<{ top: number; left: number } | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  /**
   * Resolved once per opening. Steps whose element isn't in the DOM are dropped
   * rather than pointed at — the page has a loading state and a start screen,
   * and either can legitimately remove a target. Freezing the list here also
   * keeps the "3 of 7" counter honest.
   */
  const activeSteps = useMemo(() => {
    if (!open || typeof document === "undefined") return [];
    return steps.filter((s) => document.querySelector(s.target));
  }, [open, steps]);

  const total = activeSteps.length;
  const step = activeSteps[index];

  // Restart from the top each time it opens, including re-runs from the button.
  useEffect(() => {
    if (open) {
      setIndex(0);
      setSpot(null);
      setCardPos(null);
    }
  }, [open]);

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  // Nothing survived the filter (start screen, mid-load) — don't render an
  // empty scrim over the page.
  useEffect(() => {
    if (open && total === 0) close();
  }, [open, total, close]);

  const goNext = useCallback(() => {
    setIndex((i) => {
      if (i >= total - 1) {
        close();
        return i;
      }
      return i + 1;
    });
  }, [total, close]);

  const goBack = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  // ── Scroll the target into frame ────────────────────────────────────
  useEffect(() => {
    if (!open || !step) return;
    const el = document.querySelector(step.target);
    if (!el) {
      // Vanished between resolution and display (a re-render dropped it).
      goNext();
      return;
    }
    el.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
  }, [open, step, reduced, goNext]);

  // ── Position the spotlight and the card ─────────────────────────────
  const place = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(step.target);
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const box: Box = {
      top: r.top - PAD,
      left: r.left - PAD,
      width: r.width + PAD * 2,
      height: r.height + PAD * 2,
    };
    // Bail out of identical updates: `place` runs on a ~1s rAF loop while the
    // smooth scroll settles, and re-rendering 60 times on an unmoved rect is
    // pure waste.
    setSpot((p) =>
      p && p.top === box.top && p.left === box.left && p.width === box.width && p.height === box.height
        ? p
        : box
    );

    const card = cardRef.current;
    const cw = card?.offsetWidth ?? 300;
    const ch = card?.offsetHeight ?? 180;

    let placement: TourPlacement = step.placement ?? "bottom";

    // Auto-flip when the requested side has no room. A card half off-screen is
    // worse than one on the other side of the element.
    if (placement === "bottom" && box.top + box.height + GAP + ch > vh - MARGIN) placement = "top";
    else if (placement === "top" && box.top - GAP - ch < MARGIN) placement = "bottom";
    if (placement === "right" && box.left + box.width + GAP + cw > vw - MARGIN) placement = "left";
    else if (placement === "left" && box.left - GAP - cw < MARGIN) placement = "right";
    // On phones the side placements never fit; fall back to stacking.
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
  }, [step]);

  useLayoutEffect(() => {
    if (!open || !step) return;
    place();
    // The page scrolls smoothly into position, and the path has its own inner
    // scroller — `capture` catches both, and the frame loop covers the smooth
    // scroll's intermediate frames plus any late layout (fonts, images).
    let raf = 0;
    let frames = 0;
    const tick = () => {
      place();
      // ~1s of tracking at 60fps, which outlasts a smooth scroll.
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
  }, [open, step, place]);

  // ── Keyboard ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      } else if (e.key === "ArrowRight") {
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
  // keeps working while the student can't scroll away from the step.
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

  // Move focus to the card so Tab and the arrow keys land somewhere sensible.
  useEffect(() => {
    if (open && step) cardRef.current?.focus();
  }, [open, step]);

  if (typeof document === "undefined") return null;

  const dur = reduced ? 0 : DURATION.base;

  return createPortal(
    <AnimatePresence>
      {open && step && (
        <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="Journey walkthrough">
          {/* Click blocker. Sits under the spotlight so the page can't be
              operated mid-tour, and swallows taps rather than closing — an
              accidental brush shouldn't end the walkthrough. */}
          <motion.div
            className="absolute inset-0"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduced ? undefined : { opacity: 0 }}
            transition={{ duration: dur, ease: EASE_OUT_EXPO }}
            onClick={(e) => e.stopPropagation()}
          />

          {/* The cutout. One element with an enormous spread shadow is a single
              composited layer — cheaper and sharper than four edge divs, and it
              rounds the corner correctly. The wash is navy, not black. */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute rounded-2xl ring-2 ring-primary/70"
            style={{ boxShadow: "0 0 0 9999px hsl(222 47% 16% / 0.62)" }}
            initial={
              reduced
                ? false
                : { opacity: 0, top: spot?.top ?? 0, left: spot?.left ?? 0, width: spot?.width ?? 0, height: spot?.height ?? 0 }
            }
            animate={{
              opacity: spot ? 1 : 0,
              top: spot?.top ?? 0,
              left: spot?.left ?? 0,
              width: spot?.width ?? 0,
              height: spot?.height ?? 0,
            }}
            exit={reduced ? undefined : { opacity: 0 }}
            transition={{ duration: reduced ? 0 : DURATION.fast, ease: EASE_OUT_EXPO }}
          />

          {/* Step card */}
          <motion.div
            ref={cardRef}
            tabIndex={-1}
            key={index}
            initial={reduced ? false : { opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: cardPos ? 1 : 0, y: 0, scale: 1 }}
            exit={reduced ? undefined : { opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: dur, ease: EASE_OUT_EXPO }}
            style={{
              top: cardPos?.top ?? 0,
              left: cardPos?.left ?? 0,
              visibility: cardPos ? "visible" : "hidden",
            }}
            className={cn(
              // 20rem, but never wider than the viewport less both gutters —
              // at 320px that resolves to 288px and the page still doesn't
              // scroll sideways.
              "absolute w-[min(20rem,calc(100vw-1.5rem))] rounded-2xl border border-border bg-card p-4 shadow-[0_18px_40px_rgba(33,48,88,0.22)] outline-none"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <span className="font-display text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
                {index + 1} of {total}
              </span>
              <button
                type="button"
                onClick={close}
                // -m-2/p-2 keeps the glyph small while the tap target isn't.
                className="-m-2 shrink-0 rounded-md p-2 text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Skip the tour"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <h2 className="mt-2 font-display text-base font-semibold leading-tight tracking-[-0.015em]">
              {step.title}
            </h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{step.body}</p>

            <div className="mt-4 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={close}
                className="font-display text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground"
              >
                Skip
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={goBack}
                  disabled={index === 0}
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1.5 font-display text-[10px] font-bold uppercase tracking-[0.14em] text-foreground transition-colors hover:bg-muted/50 disabled:pointer-events-none disabled:opacity-40"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Back
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 font-display text-[10px] font-bold uppercase tracking-[0.14em] text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  {index === total - 1 ? "Done" : "Next"}
                  {index < total - 1 && <ArrowRight className="h-3 w-3" />}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
