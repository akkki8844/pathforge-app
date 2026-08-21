import { Star } from "lucide-react";
import { TestimonialsColumn } from "@/components/ui/testimonials-columns-1";
import { studentReviews } from "@/data/reviews";

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

// Split into columns that each crawl at a slightly different speed. Equal
// speeds read as one rigid sheet sliding past; the offset is what makes it
// look like separate columns of independent reviews.
const columnA = studentReviews.slice(0, 4);
const columnB = studentReviews.slice(4, 8);
const columnC = studentReviews.slice(8, 12);

/**
 * The left-hand column of the auth screen: the aggregate rating, then columns
 * of review cards crawling slowly upward under a top-and-bottom fade.
 *
 * Previously this rotated one card at a time on a 4-second timer, which put a
 * moving element next to a form and gave the eye something to chase while
 * typing a password. A continuous slow crawl reads as texture instead — there
 * is no "next" moment to wait for, so nothing competes with the form.
 */
export function ReviewsRail() {
  return (
    <div className="w-full max-w-lg">
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

      {/* The mask is what sells the loop: cards fade out before they reach
          either edge, so neither the seam nor a half-clipped card is ever
          visible at the boundary. */}
      <div className="flex max-h-[30rem] justify-start gap-5 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_12%,black_88%,transparent)]">
        <TestimonialsColumn testimonials={columnA} duration={26} />
        <TestimonialsColumn testimonials={columnB} className="hidden xl:block" duration={32} />
        <TestimonialsColumn testimonials={columnC} className="hidden 2xl:block" duration={29} />
      </div>
    </div>
  );
}
