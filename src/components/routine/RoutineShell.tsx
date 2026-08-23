import { type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Seo } from "@/components/Seo";
import { DURATION, EASE_OUT_EXPO, transition } from "@/lib/motion";
import { ROUTINE_DESTINATIONS } from "@/lib/routine/nav";
import { useRoutineRealtime, useRoutineTasks } from "@/hooks/routine/useRoutineData";
import { overdueTasks } from "@/lib/routine/derive";
import { QuickAddButton } from "@/components/routine/QuickAdd";

/**
 * The frame every Routine page renders inside.
 *
 * It exists so the nine pages agree on the things a user reads as "this is one
 * product area": the same sub-nav, the same header rhythm, the same place the
 * primary action sits, and one realtime subscription rather than nine. A page
 * supplies its own title, purpose line and actions, then its content — nothing
 * else about the chrome is a per-page decision.
 *
 * `useRoutineRealtime` is mounted here, once, for the same reason: nine
 * subscriptions to the same ten tables would be nine sockets doing identical
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
      <div className="section-container py-6 sm:py-8">
        <RoutineSubNav />

        <motion.header
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: DURATION.base, ease: EASE_OUT_EXPO }}
          className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
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
          {actions && (
            <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
          )}
        </motion.header>

        <div className="mt-6 sm:mt-8">{children}</div>
      </div>
    </>
  );
}

/**
 * The nine destinations as a scrollable rail.
 *
 * Horizontal scroll rather than a wrapped grid: nine pills wrapped onto three
 * rows pushes the page heading below the fold on a phone, and the rail keeps the
 * whole section reachable from any page in it without a menu round trip. The
 * active pill is marked by fill *and* weight, so it survives a colour-blind
 * reading.
 *
 * Today carries a count of what is already late. Overdue work is the one thing
 * in Routine that gets worse by being unseen, and until now it was only visible
 * once you were standing on the page that shows it — so a student on Habits or
 * Goals had no way to learn that three deadlines had passed. The task list is
 * the same cached query the pages themselves read, so on eight of the nine
 * pages this costs no extra request at all.
 */
function RoutineSubNav() {
  const location = useLocation();
  const { tasks } = useRoutineTasks();
  const overdueCount = overdueTasks(tasks).length;

  return (
    <nav
      aria-label="Routine sections"
      className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0"
    >
      <ul className="flex w-max items-center gap-1.5 sm:w-auto sm:flex-wrap">
        {ROUTINE_DESTINATIONS.map((d) => {
          const active = location.pathname === d.href;
          const Icon = d.icon;
          const overdue = d.href === "/routine/today" ? overdueCount : 0;
          return (
            <li key={d.href}>
              <Link
                to={d.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors",
                  active
                    ? "border-accent bg-accent/10 font-semibold text-accent"
                    : "border-border text-muted-foreground hover:border-accent/50 hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {d.label}
                {overdue > 0 && (
                  <span
                    className={cn(
                      "inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums",
                      // Late work is a warning, not an accent-coloured nicety —
                      // it should not look like the count of unread messages.
                      active
                        ? "bg-destructive/20 text-destructive"
                        : "bg-destructive text-destructive-foreground",
                    )}
                  >
                    <span aria-hidden="true">{overdue > 99 ? "99+" : overdue}</span>
                    <span className="sr-only">{overdue} overdue</span>
                  </span>
                )}
              </Link>
            </li>
          );
        })}
        <li className="pl-1">
          <QuickAddButton />
        </li>
      </ul>
    </nav>
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
