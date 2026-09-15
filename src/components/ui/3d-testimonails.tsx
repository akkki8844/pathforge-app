import React, { ComponentPropsWithoutRef, useMemo } from "react";
import { cn } from "@/lib/utils";

/**
 * A repeating strip that crawls in one direction forever.
 *
 * Two notes on how this differs from the upstream 21st.dev component it was
 * copied from, both forced by this repo rather than by taste:
 *
 * 1. The animation utilities are `animate-marquee-x` / `animate-marquee-y`,
 *    not `animate-marquee` / `animate-marquee-vertical`. `animate-marquee`
 *    already exists here — it is the fixed 50s, `-50%` translate that
 *    `CollegeLogosMarquee` runs on — and redefining it to the `--duration`
 *    driven version would silently change that component's timing. The two
 *    keyframe sets live side by side in `tailwind.config.ts` instead.
 *
 * 2. This project is on Tailwind 3, so the keyframes are declared in
 *    `tailwind.config.ts`, not in an `@theme inline` block. `--duration` and
 *    `--gap` still come from the element, so `[--duration:40s]` on a caller
 *    works exactly as documented upstream.
 *
 * The children are rendered `repeat` times so the strip is wider than the
 * viewport and the `-100% - gap` translate lands on an identical frame, which
 * is what makes the loop invisible.
 */
interface MarqueeProps extends ComponentPropsWithoutRef<"div"> {
  className?: string;
  /** Run the strip backwards. */
  reverse?: boolean;
  /** Freeze while the pointer is over the strip. */
  pauseOnHover?: boolean;
  children: React.ReactNode;
  /** Crawl top-to-bottom instead of left-to-right. */
  vertical?: boolean;
  /** How many copies of `children` to lay end to end. */
  repeat?: number;
  ariaLabel?: string;
  ariaLive?: "off" | "polite" | "assertive";
  ariaRole?: string;
}

export function Marquee({
  className,
  reverse = false,
  pauseOnHover = false,
  children,
  vertical = false,
  repeat = 4,
  ariaLabel,
  ariaLive = "off",
  ariaRole = "marquee",
  ...props
}: MarqueeProps) {
  // Memoised on the inputs that actually change the markup. Without it every
  // parent render rebuilds `repeat` copies of the child tree — and the whole
  // point of a marquee is that it sits on screen for a long time.
  const strips = useMemo(
    () => (
      <>
        {Array.from({ length: repeat }, (_, i) => (
          <div
            key={i}
            className={cn(
              "flex shrink-0 justify-around [gap:var(--gap)]",
              vertical ? "animate-marquee-y flex-col" : "animate-marquee-x flex-row",
              pauseOnHover && "group-hover:[animation-play-state:paused]",
              reverse && "[animation-direction:reverse]",
            )}
          >
            {children}
          </div>
        ))}
      </>
    ),
    [repeat, children, vertical, pauseOnHover, reverse],
  );

  return (
    <div
      {...props}
      data-slot="marquee"
      className={cn(
        "group flex overflow-hidden p-2 [--duration:40s] [--gap:1rem] [gap:var(--gap)]",
        vertical ? "flex-col" : "flex-row",
        // The strip is decoration wrapped around real content. Announcing an
        // infinite loop to a screen reader, or putting it in the tab order,
        // adds nothing a reader can act on — `motion-reduce` stops it outright
        // for anyone who asked the OS for that.
        "motion-reduce:[&_[class*=animate-marquee]]:animate-none",
        className,
      )}
      aria-label={ariaLabel}
      aria-live={ariaLive}
      role={ariaRole}
    >
      {strips}
    </div>
  );
}

export default Marquee;
