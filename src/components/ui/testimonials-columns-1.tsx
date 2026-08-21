import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Star } from "lucide-react";
import type { StudentReview } from "@/data/reviews";

/**
 * A single infinitely-scrolling column of review cards.
 *
 * The loop is the standard duplicate-and-translate trick: the same list is
 * rendered twice inside one track, and the track animates from 0 to -50% of
 * its own height. At the moment it snaps back, the second copy is sitting
 * exactly where the first one started, so the seam is invisible.
 *
 * Cards carry a generated initials avatar rather than a photo — the reviewers
 * are minors, and `@/data/reviews` deliberately ships no images. See that file.
 */

const AVATAR_PALETTE = [
  "#1a73e8", "#d93025", "#188038", "#f9ab00",
  "#9334e6", "#e52592", "#12a4af", "#f29900",
];

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" role="img" aria-label={`${rating} out of 5 stars`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Star
          key={i}
          aria-hidden="true"
          className={
            i < rating ? "h-3.5 w-3.5 fill-[#f5b400] text-[#f5b400]" : "h-3.5 w-3.5 fill-muted text-muted"
          }
        />
      ))}
    </div>
  );
}

export function TestimonialsColumn({
  className,
  testimonials,
  duration = 10,
}: {
  className?: string;
  testimonials: StudentReview[];
  duration?: number;
}) {
  // Reduced motion stops the crawl outright. A slow scroll is still motion,
  // and this column is decorative — the reviews are readable standing still.
  const prefersReduced = useReducedMotion();

  return (
    <div className={className}>
      <motion.div
        animate={prefersReduced ? undefined : { translateY: "-50%" }}
        transition={
          prefersReduced
            ? undefined
            : { duration, repeat: Infinity, ease: "linear", repeatType: "loop" }
        }
        className="flex flex-col gap-5 pb-5"
      >
        {[0, 1].map((copy) => (
          <React.Fragment key={copy}>
            {testimonials.map((review, i) => (
              <figure
                key={`${copy}-${i}`}
                // `aria-hidden` on the duplicate copy: the same quotes read
                // twice is noise for a screen reader, and the first copy
                // already carries the full list.
                aria-hidden={copy === 1 || undefined}
                className="w-full max-w-xs rounded-2xl border border-border/70 bg-card p-6 shadow-lg shadow-primary/5"
              >
                <Stars rating={review.rating} />
                <blockquote className="mt-3 text-sm leading-relaxed text-foreground">
                  {review.body}
                </blockquote>
                <figcaption className="mt-5 flex items-center gap-2.5">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-medium text-white"
                    style={{ backgroundColor: avatarColor(review.name) }}
                    aria-hidden="true"
                  >
                    {review.name.trim().charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium leading-5 tracking-tight text-foreground">
                      {review.name}
                    </div>
                    <div className="truncate text-xs leading-5 tracking-tight text-muted-foreground">
                      {review.context}
                    </div>
                  </div>
                </figcaption>
              </figure>
            ))}
          </React.Fragment>
        ))}
      </motion.div>
    </div>
  );
}
