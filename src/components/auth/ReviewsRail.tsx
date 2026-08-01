import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Star } from "lucide-react";
import { studentReviews } from "@/data/reviews";

const ROTATE_MS = 4000;

/** Google-style star row. Half-stars aren't worth the complexity here. */
function Stars({ rating, className = "" }: { rating: number; className?: string }) {
  return (
    <div
      className={`flex items-center gap-0.5 ${className}`}
      role="img"
      aria-label={`${rating} out of 5 stars`}
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <Star
          key={i}
          aria-hidden="true"
          className={
            i < rating
              ? "h-4 w-4 fill-[#f5b400] text-[#f5b400]"
              : "h-4 w-4 fill-muted text-muted"
          }
        />
      ))}
    </div>
  );
}

// Google's own "no photo" fallback is a flat-colored circle with the first
// initial — never a real photo. These are minors, so a generated initial
// avatar (not a real photo) is the right amount of realism here.
const AVATAR_PALETTE = [
  "#1a73e8", "#d93025", "#188038", "#f9ab00",
  "#9334e6", "#e52592", "#12a4af", "#f29900",
];

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

function Avatar({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase();
  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-medium text-white"
      style={{ backgroundColor: avatarColor(name) }}
      aria-hidden="true"
    >
      {initial}
    </div>
  );
}

function GoogleGlyph({ className = "" }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true" className={className}>
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </svg>
  );
}

const average =
  studentReviews.reduce((sum, r) => sum + r.rating, 0) / studentReviews.length;

/**
 * The left-hand column of the auth screen: one review at a time, rolling
 * upward every 4 seconds, styled as an actual Google-review card — border,
 * shadow, generated initials avatar, star row, and a small Google mark.
 */
export function ReviewsRail() {
  const prefersReduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    // Under reduced motion we still rotate — it's the content that matters —
    // but the transition below becomes a plain cross-fade.
    if (paused) return;
    const id = window.setInterval(
      () => setIndex((i) => (i + 1) % studentReviews.length),
      ROTATE_MS,
    );
    return () => window.clearInterval(id);
  }, [paused]);

  const review = studentReviews[index];

  return (
    <div
      className="w-full max-w-lg"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="mb-6 flex items-center gap-3">
        <GoogleGlyph className="h-6 w-6" />
        <span className="text-4xl font-semibold leading-none text-foreground">
          {average.toFixed(1)}
        </span>
        <div>
          <Stars rating={Math.round(average)} />
          <p className="mt-1 text-xs text-muted-foreground">
            {studentReviews.length} student reviews
          </p>
        </div>
      </div>

      {/* Fixed height so the sign-in card beside it never shifts as reviews of
          different lengths cycle through. */}
      <div className="relative h-64 overflow-hidden" aria-live="polite">
        {/* Deliberately NOT mode="wait": that empties the column for the length
            of the exit animation, which reads as a rendering bug. Both entries
            are absolutely positioned, so they can cross over instead. */}
        <AnimatePresence initial={false}>
          <motion.div
            key={index}
            initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 28 }}
            animate={prefersReduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: -28 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 rounded-xl border border-border/70 bg-card p-5 shadow-md"
          >
            <div className="flex items-start gap-3">
              <Avatar name={review.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{review.name}</p>
                <p className="truncate text-xs text-muted-foreground">{review.context}</p>
              </div>
              <GoogleGlyph className="mt-0.5 h-4 w-4 shrink-0" />
            </div>
            <Stars rating={review.rating} className="mb-3 mt-3" />
            <blockquote className="line-clamp-6 text-sm leading-relaxed text-foreground">
              {review.body}
            </blockquote>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
