import { CREDLY_PATH } from "@/components/icons/brandPaths";
import { cn } from "@/lib/utils";

/**
 * Credly's wordmark, in Credly orange.
 *
 * The source path is a wide wordmark centred in a 24x24 square, so the
 * viewBox is cropped to the lettering and the box is drawn at its aspect
 * ratio; in a square it would be a smudge a few pixels tall.
 */
export function CredlyMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 6 24 12" className={cn("h-5 w-10 shrink-0", className)} fill="#FF6B00" aria-hidden="true">
      <path d={CREDLY_PATH} />
    </svg>
  );
}
