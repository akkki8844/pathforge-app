import {
  ScrollReelTestimonials,
  type ScrollReelTestimonial,
} from "@/components/ui/scroll-reel-testimonials";
import { cn } from "@/lib/utils";

/**
 * The review reel, as it appears beside a sign-in form.
 *
 * Both sign-in pages run the same split shell, so they run the same reel: a
 * strip of portraits that steps one reviewer at a time, with the quote rising
 * in character by character beside it. The two pages differ only in whose
 * reviews they read and in the panel colour behind them.
 *
 * WHAT MAKES THIS RENDER
 *
 * Nothing, yet. It is fed from `src/data/reviews.ts`, whose two arrays are
 * empty on purpose - the long note in that file sets out what has to be true of
 * a quote before it can appear on this screen, and no reviews meeting that bar
 * have been collected. A review also needs a `portrait`, separately consented,
 * because the reel's tile is a photograph of the person and there is nothing
 * honest to put there otherwise.
 *
 * So this returns null today and the rail that calls it falls through to the
 * panel below it, which describes the product rather than quoting anybody. The
 * moment a real review with a real face goes into that file, this appears and
 * the fallback stands down. That is the whole arrangement: the surface exists,
 * and the only way to fill it is to go and collect some.
 */
export function ReviewReel({
  testimonials,
  eyebrow,
  title,
  caption,
  tone = "light",
  className,
}: {
  testimonials: ScrollReelTestimonial[];
  /** Small caps label over the reel. */
  eyebrow: string;
  title: string;
  /** One line under the title, saying how the quotes were obtained. */
  caption: string;
  /**
   * Which panel the reel is sitting on. The reel itself is a light card in
   * both cases - only the heading above it has to invert, because on the
   * counsellor side it sits on a deep indigo field.
   */
  tone?: "light" | "onDark";
  className?: string;
}) {
  if (!testimonials.length) return null;

  const onDark = tone === "onDark";

  return (
    <div className={cn("w-full", className)}>
      <p
        className={cn(
          "text-[11px] font-semibold uppercase tracking-[0.14em]",
          onDark ? "text-white/60" : "text-muted-foreground",
        )}
      >
        {eyebrow}
      </p>
      <h2
        className={cn(
          "mt-2 text-2xl font-semibold leading-tight",
          onDark ? "text-white" : "text-foreground",
        )}
      >
        {title}
      </h2>
      <p
        className={cn(
          "mt-1.5 max-w-[52ch] text-sm leading-relaxed",
          onDark ? "text-white/65" : "text-muted-foreground",
        )}
      >
        {caption}
      </p>

      <ScrollReelTestimonials testimonials={testimonials} className="mt-7" />
    </div>
  );
}
