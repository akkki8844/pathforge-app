import React from "react";
import { motion } from "framer-motion";
import { Quote, Star } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A wall of reviews, scrolling in columns.
 *
 * Two things about this component are deliberate and should not be "fixed".
 *
 * 1. **It ships with no reviews of its own.** The quotes are a required prop.
 *    A testimonial component carrying a default cast of named, photographed
 *    customers is how invented reviews end up in production: someone drops it
 *    on a page to see the layout and the placeholder people go live. There is
 *    nothing to leave behind here.
 *
 * 2. **It renders reviews anonymously.** No name, no photograph, no class year
 *    — the quote, its rating, and the neutral label the caller passes. Pathforge's
 *    reviewers are school students, so an attributed wall of quotes is a wall of
 *    minors' names next to statements about their grades and their applications.
 *    The quote is the part that carries information; the identity is the part
 *    that carries risk.
 *
 * What the caller still owes: every quote must come from a real person who used
 * the product, in their own words, published with their consent (and a parent's,
 * under 18). Anonymity removes the disclosure problem, not the honesty one. See
 * the note at the top of `src/data/reviews.ts`.
 */

export interface WallQuote {
  /** The review, in the reviewer's own words. */
  body: string;
  /** Out of 5, when one was given. */
  rating?: number;
  /** Neutral, non-identifying context: "Grade 12", "Applying to the US". */
  label?: string;
}

function Stars({ rating }: { rating: number }) {
  const rounded = Math.round(rating);
  return (
    <span className="flex items-center gap-0.5" aria-label={`${rating} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cn(
            "h-3.5 w-3.5",
            i < rounded ? "fill-amber-400 text-amber-400" : "text-neutral-300 dark:text-neutral-700"
          )}
          aria-hidden
        />
      ))}
    </span>
  );
}

/**
 * One scrolling column.
 *
 * The list is rendered twice and translated by half its height, which is what
 * makes the loop seamless; the second copy is hidden from assistive technology
 * and taken out of the tab order so a screen reader hears each quote once.
 */
export function TestimonialsColumn(props: {
  className?: string;
  quotes: WallQuote[];
  duration?: number;
}) {
  return (
    <div className={props.className}>
      <motion.ul
        animate={{ translateY: "-50%" }}
        transition={{
          duration: props.duration || 10,
          repeat: Infinity,
          ease: "linear",
          repeatType: "loop",
        }}
        className="m-0 flex list-none flex-col gap-6 bg-transparent p-0 pb-6 transition-colors duration-300"
      >
        {new Array(2).fill(0).map((_, index) => (
          <React.Fragment key={index}>
            {props.quotes.map((quote, i) => (
              <motion.li
                key={`${index}-${i}`}
                aria-hidden={index === 1 ? "true" : "false"}
                tabIndex={index === 1 ? -1 : 0}
                whileHover={{
                  scale: 1.03,
                  y: -8,
                  transition: { type: "spring", stiffness: 400, damping: 17 },
                }}
                whileFocus={{
                  scale: 1.03,
                  y: -8,
                  transition: { type: "spring", stiffness: 400, damping: 17 },
                }}
                className="group w-full max-w-xs cursor-default select-none rounded-3xl border border-neutral-200 bg-white p-10 shadow-lg shadow-black/5 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-neutral-800 dark:bg-neutral-900"
              >
                <blockquote className="m-0 p-0">
                  <Quote
                    className="h-4 w-4 text-neutral-300 transition-colors duration-300 dark:text-neutral-700"
                    aria-hidden
                  />
                  <p className="m-0 mt-4 font-normal leading-relaxed text-neutral-600 transition-colors duration-300 dark:text-neutral-400">
                    {quote.body}
                  </p>
                  <footer className="mt-6 flex items-center gap-3">
                    {quote.rating !== undefined && <Stars rating={quote.rating} />}
                    {quote.label && (
                      <span className="text-sm leading-5 tracking-tight text-neutral-500 transition-colors duration-300 dark:text-neutral-500">
                        {quote.label}
                      </span>
                    )}
                  </footer>
                </blockquote>
              </motion.li>
            ))}
          </React.Fragment>
        ))}
      </motion.ul>
    </div>
  );
}

export interface TestimonialsSectionProps {
  /** Real, consented reviews. Nothing renders without them. */
  quotes: WallQuote[];
  eyebrow?: string;
  heading?: string;
  blurb?: string;
  className?: string;
}

export function TestimonialsSection({
  quotes,
  eyebrow = "Reviews",
  heading = "What students say",
  blurb,
  className,
}: TestimonialsSectionProps) {
  // No quotes, no wall. A review section with nothing in it is an invitation
  // to fill it with something invented.
  if (!quotes.length) return null;

  // Dealt round-robin so no column is one run of the list, and so a short list
  // still fills every column it is given.
  const columns: WallQuote[][] = [[], [], []];
  quotes.forEach((q, i) => columns[i % 3].push(q));

  return (
    <section
      aria-labelledby="testimonials-heading"
      className={cn("relative overflow-hidden bg-transparent py-24", className)}
    >
      <motion.div
        initial={{ opacity: 0, y: 50, rotate: -2 }}
        whileInView={{ opacity: 1, y: 0, rotate: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{
          duration: 1.2,
          ease: [0.16, 1, 0.3, 1],
          opacity: { duration: 0.8 },
        }}
        className="container z-10 mx-auto px-4"
      >
        <div className="mx-auto mb-16 flex max-w-[540px] flex-col items-center justify-center">
          <div className="flex justify-center">
            <div className="rounded-full border border-neutral-300 bg-neutral-100/50 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-neutral-600 transition-colors dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-neutral-400">
              {eyebrow}
            </div>
          </div>

          <h2
            id="testimonials-heading"
            className="mt-6 text-center text-4xl font-extrabold tracking-tight text-neutral-900 transition-colors dark:text-white md:text-5xl"
          >
            {heading}
          </h2>
          {blurb && (
            <p className="mt-5 max-w-sm text-center text-lg leading-relaxed text-neutral-500 transition-colors dark:text-neutral-400">
              {blurb}
            </p>
          )}
        </div>

        <div
          className="mt-10 flex max-h-[740px] justify-center gap-6 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_10%,black_90%,transparent)]"
          role="region"
          aria-label="Scrolling reviews"
        >
          <TestimonialsColumn quotes={columns[0]} duration={15} />
          <TestimonialsColumn quotes={columns[1]} className="hidden md:block" duration={19} />
          <TestimonialsColumn quotes={columns[2]} className="hidden lg:block" duration={17} />
        </div>
      </motion.div>
    </section>
  );
}

export default TestimonialsSection;
