import { Quote, Star, UserRound } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { WallQuote } from "@/components/ui/testimonial-v2";
import { cn } from "@/lib/utils";

/**
 * A row of review cards, stepped down like a stair.
 *
 * Two rules this component inherits from the rest of the review code, and
 * which should not be "fixed" by giving it nicer defaults:
 *
 * 1. **It ships with no reviews of its own.** The quotes are a required prop
 *    and there is no sample cast to leave behind. The upstream version of this
 *    layout shipped with three named, photographed executives and invented
 *    quotes attributed to them; that is impersonation of real people, and it is
 *    also exactly how placeholder testimonials reach production — someone drops
 *    the component on a page to look at the layout and the fake people go live.
 *
 * 2. **It renders reviews anonymously.** The quote, its rating, and the neutral
 *    label the caller passes — no name, no photograph, no class year. Pathforge's
 *    reviewers are school students, so an attributed wall is a wall of minors'
 *    names beside statements about their grades and their applications.
 *
 * What the caller still owes: every quote must come from a real person who used
 * the product, in their own words, published with their consent (and a parent's,
 * under 18). Anonymity removes the disclosure problem, not the honesty one. See
 * the note at the top of `src/data/reviews.ts`.
 */

export interface TestimonialsSectionProps extends React.ComponentProps<"div"> {
  /** The reviews to show. Nothing renders when this is empty. */
  quotes: WallQuote[];
  /**
   * The panel this sits on. The counsellor rail is a field of deep indigo with
   * white copy, where `muted-foreground` and `border` are both invisible.
   */
  tone?: "default" | "onDark";
}

export function TestimonialsSection({
  quotes,
  tone = "default",
  className,
  ...props
}: TestimonialsSectionProps) {
  if (!quotes.length) return null;

  return (
    <div
      className={cn(
        // Three across only where the panel is genuinely wide. The rail it
        // sits in is the narrow half of a split screen, and at 1280 three
        // columns are 181px each — a twelve-word quote became eleven lines.
        // Below that the same cards stack, without the stair.
        "mx-auto grid w-full max-w-5xl gap-8 2xl:grid-cols-3 2xl:gap-6",
        className,
      )}
      {...props}
    >
      {quotes.map((quote, index) => (
        <TestimonialCard
          key={`${index}-${quote.body.slice(0, 24)}`}
          index={index}
          quote={quote}
          tone={tone}
        />
      ))}
    </div>
  );
}

function DecorIcon({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <svg
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute left-0 top-0 z-[1] h-3.5 w-3.5 flex-shrink-0 -translate-x-[calc(50%+0.5px)] -translate-y-[calc(50%+0.5px)] stroke-current stroke-1",
        className,
      )}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function Stars({ rating, tone }: { rating: number; tone: "default" | "onDark" }) {
  const rounded = Math.round(rating);
  return (
    <span className="flex items-center gap-0.5" aria-label={`${rating} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cn(
            "h-3 w-3",
            i < rounded
              ? "fill-amber-400 text-amber-400"
              : tone === "onDark"
                ? "text-white/25"
                : "text-neutral-300 dark:text-neutral-700",
          )}
          aria-hidden
        />
      ))}
    </span>
  );
}

function TestimonialCard({
  quote,
  index,
  tone,
  className,
  ...props
}: React.ComponentProps<"figure"> & {
  quote: WallQuote;
  index: number;
  tone: "default" | "onDark";
}) {
  const dark = tone === "onDark";
  // The stair repeats every three cards, so a fourth review starts the run
  // again rather than dropping half a panel below the fold.
  const step = index % 3;

  return (
    <figure
      className={cn(
        // `self-start`: a grid item stretches to its row by default, and the
        // row here is as tall as whatever panel the rail hands it — which made
        // every card 474px of mostly empty rule for three lines of quote.
        "group relative flex flex-col justify-between gap-5 self-start px-5 pb-5 pt-6 shadow-sm xl:gap-6 xl:px-7 xl:pb-6 xl:pt-7",
        // Stacked, the cards are the full width of the rail and a third one
        // pushes the sign-in form's own column off a laptop screen. The stair
        // shows all of them; the stack shows the first two.
        index > 1 && "hidden 2xl:flex",
        "2xl:translate-y-[calc(3rem*var(--pf-card-step))]",
        dark ? "text-white" : "dark:bg-[radial-gradient(50%_80%_at_25%_0%,hsl(var(--foreground)/0.1),transparent)]",
        className,
      )}
      style={{ "--pf-card-step": step } as React.CSSProperties}
      {...props}
    >
      {/* The rules are drawn as four elements rather than as a border so they
          can run past the card's corners, which is what makes the row read as
          one ruled sheet instead of three boxes. */}
      <div className={cn("absolute -inset-y-4 -left-px w-px", dark ? "bg-white/20" : "bg-border")} />
      <div className={cn("absolute -inset-y-4 -right-px w-px", dark ? "bg-white/20" : "bg-border")} />
      <div className={cn("absolute -inset-x-4 -top-px h-px", dark ? "bg-white/20" : "bg-border")} />
      <div className={cn("absolute -bottom-px -left-4 -right-4 h-px", dark ? "bg-white/20" : "bg-border")} />
      <DecorIcon className={dark ? "text-white/40" : "text-muted-foreground"} />

      <blockquote className="flex gap-4">
        <Quote
          aria-hidden="true"
          className={cn("h-6 w-6 flex-shrink-0 stroke-1", dark ? "text-white/50" : "text-muted-foreground")}
        />
        <p
          className={cn(
            "flex-1 text-base font-normal leading-relaxed",
            dark ? "text-white/80" : "text-muted-foreground",
          )}
        >
          {quote.body}
        </p>
      </blockquote>

      {/* No name and no photograph: see the note at the top of the file. The
          avatar is a placeholder mark, not a person. */}
      <figcaption className="flex items-center gap-3">
        <Avatar
          className={cn(
            "h-10 w-10 rounded-full ring-2 ring-offset-2 transition-shadow",
            dark
              ? "ring-white/20 ring-offset-transparent group-hover:ring-white/35"
              : "ring-border ring-offset-background group-hover:ring-foreground/20",
          )}
        >
          <AvatarFallback className={dark ? "bg-white/10" : undefined}>
            <UserRound className={cn("h-4 w-4", dark ? "text-white/70" : "text-muted-foreground")} aria-hidden />
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-1">
          <cite className={cn("text-sm font-medium not-italic", dark ? "text-white" : "text-foreground")}>
            {quote.label ?? "Verified review"}
          </cite>
          {typeof quote.rating === "number" && <Stars rating={quote.rating} tone={tone} />}
        </div>
      </figcaption>
    </figure>
  );
}

export default TestimonialsSection;
