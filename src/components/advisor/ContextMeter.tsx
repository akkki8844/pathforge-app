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
 * Every figure it states is in thousands. Percent answered "how full", which is
 * the question the ring already answers by its shape; the number worth printing
 * is how much room is actually left, and tokens are the unit that is.
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
              "group hidden select-none items-center gap-1.5 rounded-md px-1.5 py-1 text-left sm:inline-flex",
              "transition-colors hover:bg-muted/60",
              className,
            )}
            aria-label={`Context window: ${formatContextTokens(used)} of ${formatContextTokens(
              windowSize,
            )} tokens used, ${formatContextTokens(remaining)} left. Compact the conversation.`}
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

            <span
              className={cn(
                "font-display text-[11px] font-bold uppercase leading-none tracking-[0.1em] tabular-nums transition-colors",
                toneText,
              )}
            >
              {/* Once it matters, say the thing to do rather than the number.
                  "4.2k left" is a fact; "compact" is the instruction. */}
              {level === "full" ? "Compact" : `${formatContextTokens(remaining)} left`}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[16rem]">
          <p className="font-display text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Context window
          </p>
          <p className="mt-1 text-xs tabular-nums">
            {formatContextTokens(used)} of {formatContextTokens(windowSize)} used ·{" "}
            {formatContextTokens(remaining)} left
          </p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
            This is how much of the conversation the advisor can still see — not your
            account balance. Nothing here spends credits. Run{" "}
            <span className="text-foreground">/compact</span> to replace the transcript with
            a summary and keep going.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
