import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FlowButton } from "@/components/ui/flow-button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { DURATION, EASE_OUT_EXPO } from "@/lib/motion";

/**
 * The four states every Routine page has to render, in one place.
 *
 * Not a stylistic nicety: a first-time student hits the empty state on all nine
 * pages in a row, so the empty state *is* the onboarding for this section. Each
 * one therefore says what the feature is for and offers exactly one obvious
 * action, rather than the usual "no items found" dead end.
 */

export function RoutineEmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  /** What the feature does and why it's worth filling in. Two sentences at most. */
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION.base, ease: EASE_OUT_EXPO }}
      className={cn(
        "flex flex-col items-center rounded-2xl border border-dashed border-border bg-card/40 px-6 py-12 text-center",
        className,
      )}
    >
      <motion.span
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: DURATION.slow, ease: EASE_OUT_EXPO, delay: 0.05 }}
        className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-background"
      >
        <Icon className="h-6 w-6 text-accent" />
      </motion.span>
      <h3 className="mt-4 font-display text-lg font-bold text-foreground">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>
      {(actionLabel || secondaryLabel) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {actionLabel && onAction && <FlowButton text={actionLabel} onClick={onAction} />}
          {secondaryLabel && onSecondary && (
            <Button variant="ghost" size="sm" onClick={onSecondary}>
              {secondaryLabel}
            </Button>
          )}
        </div>
      )}
    </motion.div>
  );
}

/**
 * Loading placeholder shaped like the content it stands in for, so the layout
 * doesn't jump when the data lands. `rows` should roughly match what the page
 * usually shows.
 */
export function RoutineLoading({
  rows = 4,
  variant = "list",
  className,
}: {
  rows?: number;
  variant?: "list" | "grid" | "grid-tall";
  className?: string;
}) {
  if (variant === "grid" || variant === "grid-tall") {
    return (
      <div
        className={cn(
          "grid gap-4 sm:grid-cols-2 lg:grid-cols-3",
          className,
        )}
        aria-busy="true"
      >
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className={variant === "grid-tall" ? "h-44 rounded-2xl" : "h-28 rounded-2xl"} />
        ))}
      </div>
    );
  }
  return (
    <div className={cn("space-y-3", className)} aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-16 rounded-xl" />
      ))}
    </div>
  );
}

/**
 * Failure state.
 *
 * Shows the message rather than a generic apology, because on this section the
 * realistic cause is a dropped connection or a not-yet-applied migration, and
 * both are things the student's own next action depends on knowing.
 */
export function RoutineError({
  error,
  onRetry,
  className,
}: {
  error: Error | null;
  onRetry?: () => void;
  className?: string;
}) {
  if (!error) return null;
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
        <div>
          <p className="text-sm font-medium text-foreground">Couldn't load this</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{error.message}</p>
        </div>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />
          Try again
        </Button>
      )}
    </div>
  );
}

/**
 * Convenience wrapper: renders the right one of the three states, or the
 * content. Saves every page from repeating the same three-branch ladder.
 */
export function RoutineAsync({
  loading,
  error,
  onRetry,
  loadingVariant = "list",
  loadingRows,
  children,
}: {
  loading: boolean;
  error: Error | null;
  onRetry?: () => void;
  loadingVariant?: "list" | "grid" | "grid-tall";
  loadingRows?: number;
  children: ReactNode;
}) {
  if (error) return <RoutineError error={error} onRetry={onRetry} />;
  if (loading) return <RoutineLoading variant={loadingVariant} rows={loadingRows} />;
  return <>{children}</>;
}
