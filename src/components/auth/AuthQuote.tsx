import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { AuthQuote as AuthQuoteData } from "@/data/authQuotes";

/**
 * The rotating editorial line beside a sign-in form.
 *
 * WHY IT IS HERE
 *
 * Both sign-in panels used to open with a heading and then go straight into a
 * grid of feature rows. The landing page opens its editorial section with a
 * single large blockquote instead, and that line is the clearest statement of
 * what the product is for anywhere in the site. A counsellor arriving from a
 * school email, or a student arriving from a search result, was getting the
 * feature list without the sentence that explains why the feature list is
 * arranged the way it is.
 *
 * So this is that sentence, and it rotates so the panel is not one fixed
 * slogan for everyone forever.
 *
 * HOW IT IS SET
 *
 * Fraunces, not the app's display sans. The sans is what the form beside it is
 * set in, so a quote in the same face at a slightly larger size reads as a
 * heading for the form rather than as a different kind of writing. The serif is
 * already loaded and preloaded for the landing page, so it costs nothing.
 *
 * The rest is ordinary pull-quote typesetting, all of which the first version
 * skipped:
 *
 *  - The measure is capped at 34 characters. Left to the panel's width the
 *    line ran to nearly fifty, which is a paragraph measure — at display size
 *    the eye loses the start of the next line.
 *  - Leading is 1.18 rather than 1.35. Display type needs less, and a wide
 *    leading at this size is what made the block read as spaced-out body copy.
 *  - Weight is regular. The old medium at a smaller size was neither one thing
 *    nor the other: too heavy to be quiet, too small to be a statement.
 *  - The quote marks are real typographic ones, and the opening one hangs into
 *    the margin so the left edge stays flush.
 *  - `text-pretty` keeps the last line from ending on a single word.
 *
 * WHAT IT IS NOT
 *
 * Not a testimonial. Every line is Pathforge's own editorial voice, signed as
 * such. `src/data/authQuotes.ts` sets out why that distinction is load-bearing
 * and what may and may not be added to the list.
 *
 * MOTION
 *
 * One transition, and it does one thing: the outgoing line falls away and the
 * incoming one rises into place, opacity and eight pixels of travel, on the
 * same easing curve the rest of the site uses. `mode="wait"` so the two are
 * never on top of each other mid-swap — a crossfade of two different sentences
 * at this size is unreadable for its whole duration.
 *
 * It holds for eight seconds, which is long enough to read a forty-word line
 * twice and short enough that a visitor who is typing a password will see two
 * of them. The timer pauses while the pointer is over the block or while
 * anything inside it has keyboard focus, so a line can never change out from
 * under somebody who is reading it or tabbing through the dots.
 *
 * Under `prefers-reduced-motion` there is no travel, no fade and no timer: the
 * first line is rendered and stays. A rotating billboard is exactly the thing
 * that setting exists to turn off, and the dots still work for anyone who wants
 * the rest.
 */

const HOLD_MS = 8000;

/*
 * EMPHASIS
 *
 * Words wrapped in asterisks in `src/data/authQuotes.ts` are the ones the line
 * turns on. They get a heavier weight and an accent colour. The accents
 * alternate, so two emphases in one sentence read as two separate beats rather
 * than as one long highlighted run.
 *
 * Weight and colour, not italics: only the upright Fraunces face is shipped, and
 * a browser-slanted serif at display size looks broken rather than emphatic.
 */
const ACCENTS = {
  light: ["text-primary", "text-amber-600 dark:text-amber-400"],
  onDark: ["text-amber-300", "text-cyan-200"],
} as const;

function renderEmphasis(text: string, tone: "light" | "onDark") {
  let n = 0;
  return text.split(/(\*[^*]+\*)/g).map((part, i) => {
    if (part.length > 2 && part.startsWith("*") && part.endsWith("*")) {
      const accent = ACCENTS[tone][n++ % 2];
      return (
        <span key={i} className={cn("font-medium", accent)}>
          {part.slice(1, -1)}
        </span>
      );
    }
    return part;
  });
}

/** Plain text of a line, for keys and labels. */
function plain(text: string) {
  return text.replace(/\*/g, "");
}

export function AuthQuote({
  quotes,
  /**
   * Which panel this is sitting on. The counsellor page runs a deep indigo
   * field, the student page a quiet neutral one, and the type has to invert
   * between them.
   */
  tone = "light",
  /**
   * "lg" when the quote is the whole panel, as it is beside the forms on the
   * wide layout. "md" under the form on a phone, where it is a footnote to
   * the page rather than its subject.
   */
  size = "md",
  className,
}: {
  quotes: AuthQuoteData[];
  tone?: "light" | "onDark";
  size?: "md" | "lg";
  className?: string;
}) {
  const reduced = useReducedMotion() ?? false;
  const [index, setIndex] = useState(0);
  const [held, setHeld] = useState(false);

  // Rotation stops entirely when there is nothing to rotate to, when the
  // visitor has asked for reduced motion, or while they are reading it.
  const running = quotes.length > 1 && !reduced && !held;

  // A timeout keyed on the current line rather than one long-lived interval:
  // the dwell then restarts whenever the line changes, so clicking a dot or
  // releasing a hover gives you the full eight seconds on the line you are
  // now looking at instead of whatever was left of the last one's slot.
  useEffect(() => {
    if (!running) return;
    const id = window.setTimeout(
      () => setIndex((i) => (i + 1) % quotes.length),
      HOLD_MS,
    );
    return () => window.clearTimeout(id);
  }, [running, index, quotes.length]);

  if (!quotes.length) return null;

  const quote = quotes[index];
  const onDark = tone === "onDark";
  const lg = size === "lg";

  return (
    <figure
      className={cn("w-full", className)}
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocusCapture={() => setHeld(true)}
      onBlurCapture={() => setHeld(false)}
    >
      {/* The height is reserved for the longest line in the set, so the rows
          below do not jump every eight seconds between a five-line quote and a
          four-line one. The two floors are the two column widths this renders
          in: the panel on the wide layout, the form column on the narrow one,
          where the type is smaller but the measure is much shorter. */}
      <div className={lg ? "min-h-[20rem] 2xl:min-h-[24rem]" : "min-h-[11rem]"}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.blockquote
            key={index}
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
            /* The opening quote mark hangs into the margin. Left in the text
               flow it pushes the first line about half an em to the right of
               every line under it, which reads as a broken indent rather than
               as a quotation — the flush left edge is the whole reason a pull
               quote looks set rather than typed. */
            style={{ textIndent: "-0.42em" }}
            className={cn(
              "text-pretty font-serif font-light",
              lg
                ? "max-w-[24ch] text-[clamp(2rem,3.2vw,3.6rem)] leading-[1.1] tracking-[-0.03em]"
                : "max-w-[30ch] text-[1.65rem] leading-[1.16] tracking-[-0.022em]",
              onDark ? "text-white" : "text-foreground",
            )}
          >
            {"“"}
            {renderEmphasis(quote.text, tone)}
            {"”"}
          </motion.blockquote>
        </AnimatePresence>
      </div>

      {/* The attribution is the sans, small and wide-tracked, against the
          serif above it. Same word in the same face at a smaller size would
          read as the quote trailing off; the change of face is what makes it
          a signature. The rule gives it something to sit against. */}
      <figcaption
        className={cn(
          "flex items-center gap-4 border-t font-semibold uppercase tracking-[0.2em]",
          lg ? "mt-10 pt-5 text-[12px]" : "mt-7 pt-4 text-[11px]",
          onDark ? "border-white/15 text-white/60" : "border-border text-muted-foreground",
        )}
      >
        <span className="min-w-0 truncate">{quote.by}</span>

        {quotes.length > 1 && (
          // Dots, not arrows: there is no order to these lines worth stepping
          // through, only a position in a short loop worth showing.
          <span className="ml-auto flex items-center gap-1.5">
            {quotes.map((q, i) => (
              <button
                key={plain(q.text)}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show quote ${i + 1} of ${quotes.length}`}
                aria-current={i === index}
                className={cn(
                  "h-1.5 rounded-full transition-[width,background-color] duration-300",
                  i === index ? "w-5" : "w-1.5",
                  onDark
                    ? i === index
                      ? "bg-white/80"
                      : "bg-white/30 hover:bg-white/50"
                    : i === index
                      ? "bg-foreground/70"
                      : "bg-foreground/20 hover:bg-foreground/40",
                )}
              />
            ))}
          </span>
        )}
      </figcaption>
    </figure>
  );
}
