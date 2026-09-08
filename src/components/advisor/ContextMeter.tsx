import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatContextTokens, type ContextUsage } from "@/lib/advisorContext";

/**
 * How full this conversation's context window is.
 *
 * Replaces the monthly token meter that used to sit here. The difference is not
 * cosmetic: the old meter counted down to a paywall and the only remedy was to
 * pay or to wait for the month to roll, so watching it fill was purely bad
 * news. This one counts down to `/compact`, which is a button, and which the
 * student can press.
 *
 * The dial is Claude Code desktop's: a ring that fills clockwise from twelve
 * o'clock as the window is consumed. A ring reads as a gauge at 14px, which a
 * hairline bar does not — and it takes the width of a glyph rather than the
 * width of a word, so it can sit in the composer's control row without
 * competing with the send button.
 *
 * The ring carries no printed label. A standing "60.7K LEFT" next to it stated
 * in words what the ring already states by its shape, and it was the widest
 * thing in a control row that also holds the model picker and the send button —
 * so the row wrapped and looked broken. The figures moved into the tooltip,
 * where both units live together: percent for "how full", tokens for "how much
 * room", because neither answers the other's question.
 */

/** Ring geometry. Stroke sits inside the box, so r + stroke/2 must clear it. */
const SIZE = 16;
const STROKE = 2.5;
const R = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

export function ContextMeter({
  usage,
  onCompact,
  className,
}: {
  usage: ContextUsage;
  /** Offered inline once the window is nearly full. */
  onCompact: () => void;
  className?: string;
}) {
  const { pct, level, remaining, used, window: windowSize } = usage;

  // A hair of fill at 0% so the ring never looks broken, and never a full
  // circle short of actually full — an unclosed gap is the honest signal.
  const filled = Math.max(0, Math.min(100, pct));
  const offset = CIRCUMFERENCE * (1 - filled / 100);

  const toneText =
    level === "full"
      ? "text-destructive"
      : level === "warn"
        ? "text-amber-600 dark:text-amber-500"
        : "text-muted-foreground";

  const toneRing =
    level === "full"
      ? "text-destructive"
      : level === "warn"
        ? "text-amber-500"
        : "text-accent";

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onCompact}
            className={cn(
              "group hidden select-none items-center justify-center rounded-md p-1.5 sm:inline-flex",
              "transition-colors hover:bg-muted/60",
              className,
            )}
            aria-label={`Context window ${Math.round(filled)}% full: ${formatContextTokens(
              used,
            )} of ${formatContextTokens(windowSize)} tokens used, ${formatContextTokens(
              remaining,
            )} left. Compact the conversation.`}
          >
            <svg
              width={SIZE}
              height={SIZE}
              viewBox={`0 0 ${SIZE} ${SIZE}`}
              className={cn("shrink-0 -rotate-90", toneRing)}
              aria-hidden
            >
              <circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R}
                fill="none"
                strokeWidth={STROKE}
                className="stroke-foreground/15"
              />
              <circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R}
                fill="none"
                stroke="currentColor"
                strokeWidth={STROKE}
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={offset}
                className="transition-[stroke-dashoffset,color] duration-500 ease-out"
              />
            </svg>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[16rem]">
          <p className="font-display text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Context remaining
          </p>
          {/* Both units, because they answer different questions: the percentage
              is how full the window is, the tokens are how much room is left. */}
          <p className={cn("mt-1 text-sm font-semibold tabular-nums", toneText)}>
            {Math.max(0, 100 - Math.round(filled))}% · {formatContextTokens(remaining)} tokens
          </p>
          <p className="mt-1 text-[11px] tabular-nums text-muted-foreground">
            {formatContextTokens(used)} of {formatContextTokens(windowSize)} used
          </p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
            This is how much of the conversation the advisor can still see — not your
            plan usage. Run <span className="text-foreground">/compact</span> to replace
            the transcript with a summary and keep going.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
