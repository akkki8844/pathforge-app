import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Seo } from "@/components/Seo";
import { DURATION, EASE_OUT_EXPO, transition } from "@/lib/motion";
import { useRoutineRealtime } from "@/hooks/routine/useRoutineData";
import { QuickAddButton } from "@/components/routine/QuickAdd";

/**
 * The frame every Routine page renders inside.
 *
 * It exists so the six pages agree on the things a user reads as "this is one
 * product area": the same header rhythm, the same place the primary action
 * sits, and one realtime subscription rather than six. A page supplies its
 * own title, purpose line and actions, then its content — nothing else about
 * the chrome is a per-page decision.
 *
 * There used to be a second navigation surface here too — a row of pills
 * repeating every Routine page, on every Routine page. The Navbar's Routine
 * dropdown and the mobile drawer already read the same `ROUTINE_DESTINATIONS`
 * list, so the pill row was a second, always-visible copy of navigation the
 * user already had one click away — chrome for chrome's sake. It's gone;
 * Quick Add now lives in the header instead of at the end of that row.
 *
 * `useRoutineRealtime` is mounted here, once, for the same reason: six
 * subscriptions to the same ten tables would be six sockets doing identical
 * work, and the invalidations they trigger are already global to the query cache.
 */
export function RoutineShell({
  title,
  purpose,
  icon: Icon,
  seoTitle,
  seoDescription,
  path,
  actions,
  wide = false,
  children,
}: {
  title: string;
  /** One line under the title. What this page is *for* — not a greeting. */
  purpose: string;
  icon: React.ComponentType<{ className?: string }>;
  seoTitle?: string;
  seoDescription?: string;
  path: string;
  /** Page-level controls: view switchers, primary create button. */
  actions?: ReactNode;
  /**
   * Drops the 7xl reading measure. Only for pages whose content *is* a grid
   * that gets better the wider it gets — the calendar's month view. Prose and
   * cards stay inside the measure, where a line length is still readable.
   */
  wide?: boolean;
  children: ReactNode;
}) {
  useRoutineRealtime();

  return (
    <>
      <Seo
        title={seoTitle ?? `${title} · Routine · Pathforge`}
        description={seoDescription ?? purpose}
        path={path}
        noindex
      />
      <div
        className={cn(
          "py-6 sm:py-8",
          wide ? "w-full px-3 sm:px-5 lg:px-6" : "section-container",
        )}
      >
        <motion.header
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: DURATION.base, ease: EASE_OUT_EXPO }}
          className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
        >
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card">
              <Icon className="h-5 w-5 text-accent" />
            </span>
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {title}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">{purpose}</p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
            <QuickAddButton />
          </div>
        </motion.header>

        <div className="mt-6 sm:mt-8">{children}</div>
      </div>
    </>
  );
}

/**
 * A titled panel. The card shape used across the section, so a "card" on Tasks
 * and a "card" on Goals are the same object with different contents.
 */
export function RoutinePanel({
  title,
  description,
  icon: Icon,
  actions,
  className,
  bodyClassName,
  children,
}: {
  title?: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  actions?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px 10% 0px" }}
      transition={{ duration: DURATION.base, ease: EASE_OUT_EXPO }}
      className={cn(
        "rounded-2xl border border-border bg-card/60 backdrop-blur-sm",
        className,
      )}
    >
      {(title || actions) && (
        <header className="flex items-start justify-between gap-3 border-b border-border/70 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            {title && (
              <h2 className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-[0.12em] text-foreground">
                {Icon && <Icon className="h-4 w-4 text-accent" />}
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-1 text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn("p-4 sm:p-5", bodyClassName)}>{children}</div>
    </motion.section>
  );
}

/** A single figure with a label. The stat tile used on Today, Focus and Habits. */
export function RoutineStat({
  label,
  value,
  hint,
  icon: Icon,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={transition.fast}
      className={cn(
        "rounded-xl border border-border bg-card/60 px-3 py-3 sm:px-4",
        className,
      )}
    >
      <p className="flex items-center gap-1.5 font-display text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </p>
      <p className="mt-1.5 font-display text-xl font-bold tabular-nums text-foreground sm:text-2xl">
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
    </motion.div>
  );
}
