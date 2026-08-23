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
 * Deliberately a hairline rather than a filled bar. It shares a row with the
 * model and effort pickers — tracked-caps micro-labels — and the send button,
 * and a solid meter there reads as the most important control in the composer,
 * which it very much is not.
 */
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

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onCompact}
            className={cn(
              "group hidden select-none flex-col gap-1 rounded-md px-1 py-0.5 text-left sm:flex",
              "transition-colors hover:bg-muted/60",
              className,
            )}
            aria-label={`Context window ${pct}% full. ${formatContextTokens(remaining)} tokens left. Compact the conversation.`}
          >
            <span
              className={cn(
                "font-display text-[11px] font-bold uppercase leading-none tracking-[0.1em] tabular-nums transition-colors",
                level === "full"
                  ? "text-destructive"
                  : level === "warn"
                    ? "text-amber-600 dark:text-amber-500"
                    : "text-muted-foreground",
              )}
            >
              {/* Once it matters, say the thing to do rather than the number.
                  "8% left" is a fact; "compact" is the instruction. */}
              {level === "full" ? "Compact" : `${pct}% context`}
            </span>
            <span className="block h-px w-16 overflow-hidden rounded-full bg-foreground/15">
              <span
                className={cn(
                  "block h-full rounded-full transition-[width,background-color] duration-500 ease-out",
                  level === "full"
                    ? "bg-destructive"
                    : level === "warn"
                      ? "bg-amber-500"
                      : "bg-accent",
                )}
                style={{ width: `${pct}%` }}
              />
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
