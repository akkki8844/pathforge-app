import { cn } from "@/lib/utils";

/**
 * The one usage readout for the whole product.
 *
 * Everything metered — the plan allowance, the advisor — is drawn by this
 * component, in the same shape, in the same unit. Before, each surface invented
 * its own: a credit count here, a token count there, a ring somewhere else, so
 * "how much have I got left" had three different answers in three different
 * currencies and none of them could be compared. A percentage is the only unit
 * that survives contact with a daily plan, a monthly plan and a token pool at
 * the same time.
 *
 * Shape: what is being measured on the left, the bar in the middle, the figure
 * on the right. The figure is stated as "used" rather than "left" because the
 * bar already fills as it is consumed — a bar that fills while a number counts
 * down makes the reader do the subtraction to check they agree.
 */
export function UsageMeter({
  label,
  sublabel,
  percent,
  unlimited = false,
  className,
}: {
  label: string;
  /** Usually when the window refills. Kept short — it sits under the label. */
  sublabel?: string;
  /** 0–100. Clamped here so a stale or over-spent figure can't overflow the track. */
  percent: number;
  /** Unmetered accounts have no ratio to draw; say so instead of showing 0%. */
  unlimited?: boolean;
  className?: string;
}) {
  const filled = Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0));
  // Rounding to the nearest whole percent would report 0% for a first request
  // that genuinely spent something. Anything above zero shows at least 1%.
  const shown = filled > 0 && filled < 1 ? 1 : Math.round(filled);

  return (
    <div
      className={cn(
        "flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6",
        className,
      )}
    >
      <div className="min-w-0 sm:w-52 sm:shrink-0">
        <p className="truncate text-sm font-medium text-foreground">{label}</p>
        {sublabel && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{sublabel}</p>
        )}
      </div>

      {unlimited ? (
        <p className="flex-1 text-sm text-muted-foreground">Unmetered on this plan</p>
      ) : (
        <>
          <div
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={shown}
            aria-label={`${label}: ${shown}% used`}
          >
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
              style={{ width: `${filled}%` }}
            />
          </div>
          <p className="text-sm tabular-nums text-muted-foreground sm:w-24 sm:shrink-0 sm:text-right">
            {shown}% used
          </p>
        </>
      )}
    </div>
  );
}
