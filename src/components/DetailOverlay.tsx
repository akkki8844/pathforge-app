import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, ReactNode } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { overlay, modalPanel, staggerParent, transition } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface DetailOverlayProps {
  children: ReactNode;
  onClose: () => void;
  /** Omit to hide the arrow; both are wired to ← / → as well. */
  onPrev?: () => void;
  onNext?: () => void;
  /** e.g. "3 of 14" — shown between the arrows. */
  position?: string;
  className?: string;
  ariaLabel?: string;
  /**
   * Identifies the entry being shown. Changing it replays the section stagger
   * without remounting the overlay, so prev/next doesn't re-run the scroll
   * lock or flash the backdrop.
   */
  contentKey?: string;
}

/**
 * The overlay shared by the Exemplar Essays and Past Admits detail views.
 *
 * Beyond the animation it handles the things a hand-rolled modal usually
 * forgets: Escape closes it, the page behind stops scrolling, focus returns to
 * whatever opened it, and arrow keys move between entries.
 */
export function DetailOverlay({
  children,
  onClose,
  onPrev,
  onNext,
  position,
  className,
  ariaLabel,
  contentKey,
}: DetailOverlayProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();

  // Stepping to the next entry from halfway down a long profile would
  // otherwise drop you into the middle of the new one.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [contentKey]);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowLeft" && onPrev) {
        onPrev();
      } else if (e.key === "ArrowRight" && onNext) {
        onNext();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    // Lock the page behind the overlay. Padding compensates for the scrollbar
    // that disappears with it, otherwise the whole layout jumps sideways.
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    const prevOverflow = document.body.style.overflow;
    const prevPadding = document.body.style.paddingRight;
    document.body.style.overflow = "hidden";
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;

    panelRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPadding;
      opener?.focus?.();
    };
  }, [onClose, onPrev, onNext]);

  const hasNav = Boolean(onPrev || onNext);

  return (
    <motion.div
      ref={scrollRef}
      variants={overlay}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div className="min-h-full flex items-start justify-center p-4 py-10">
        <motion.div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel}
          tabIndex={-1}
          variants={modalPanel}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "relative w-full max-w-2xl bg-card rounded-2xl border border-border shadow-xl outline-none",
            className,
          )}
        >
          <div className="absolute right-3 top-3 z-20 flex items-center gap-1">
            {hasNav && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onPrev}
                  disabled={!onPrev}
                  className="h-8 w-8 rounded-full"
                  aria-label="Previous"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {position && (
                  <span className="text-[11px] tabular-nums text-muted-foreground px-1 select-none">
                    {position}
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onNext}
                  disabled={!onNext}
                  className="h-8 w-8 rounded-full"
                  aria-label="Next"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-full"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Sections inside stagger in as children of this group. */}
          <motion.div
            key={contentKey}
            variants={prefersReduced ? undefined : staggerParent}
            custom={0.045}
            initial="hidden"
            animate="visible"
          >
            {children}
          </motion.div>

          {hasNav && (
            <p className="px-6 pb-4 text-[10px] text-muted-foreground text-center select-none">
              Use ← and → to move between entries · Esc to close
            </p>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

/** A block inside a DetailOverlay that fades up as part of the panel stagger. */
export function DetailSection({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0, transition: transition.base },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
