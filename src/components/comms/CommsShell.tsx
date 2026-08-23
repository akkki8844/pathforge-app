import { type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Seo } from "@/components/Seo";
import { DURATION, EASE_OUT_EXPO } from "@/lib/motion";
import { COMMUNICATIONS_DESTINATIONS, commsDestination } from "@/lib/comms/nav";
import { useCommsRealtime } from "@/hooks/comms/useCommsRealtime";
import { useCommsBadges } from "@/hooks/comms/useCommsBadges";

/**
 * The frame every Communications page renders inside.
 *
 * Same job as `RoutineShell`: the four pages agree on the sub-nav, the header
 * rhythm, where the primary action sits, and — importantly — they share *one*
 * realtime subscription rather than opening four that do identical work.
 *
 * The one structural difference from Routine is `fill`. Routine's pages are all
 * documents that scroll; Chats and a team's Chat tab are application panes that
 * must be exactly viewport-height so the message list scrolls inside them rather
 * than scrolling the page out from under the composer. `fill` swaps the padded
 * document container for a fixed-height flex column and lets the page own its
 * own overflow.
 */
export function CommsShell({
  title,
  purpose,
  icon: Icon,
  seoTitle,
  seoDescription,
  path,
  actions,
  fill = false,
  children,
}: {
  title: string;
  /** One line under the title. What this page is *for* — not a greeting. */
  purpose: string;
  icon: React.ComponentType<{ className?: string }>;
  seoTitle?: string;
  seoDescription?: string;
  path: string;
  /** Page-level controls: filters, primary create button. */
  actions?: ReactNode;
  /**
   * Height-constrained mode for the chat panes. The child becomes the only
   * scrolling region; the page itself does not scroll.
   */
  fill?: boolean;
  children: ReactNode;
}) {
  useCommsRealtime();

  return (
    <>
      <Seo
        title={seoTitle ?? `${title} · Communications · Pathforge`}
        description={seoDescription ?? purpose}
        path={path}
        noindex
      />
      <div
        className={cn(
          "section-container",
          fill ? "flex min-h-0 flex-col py-4 sm:py-6" : "py-6 sm:py-8",
        )}
      >
        <CommsSubNav />

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

        <div className={cn(fill ? "mt-4 flex min-h-0 flex-1 flex-col" : "mt-6 sm:mt-8")}>
          {children}
        </div>
      </div>
    </>
  );
}

/**
 * The four destinations as a rail.
 *
 * Only four, so unlike Routine's nine these wrap rather than needing horizontal
 * scroll on a phone. The active pill is marked by fill *and* weight so it
 * survives a colour-blind reading, and it is prefix-matched so a team workspace
 * still lights up "Teams".
 *
 * Three of the four carry a count, for the reason every messaging product
 * carries one: a section you have to open to discover it wanted something from
 * you is a section people stop opening.
 */
function CommsSubNav() {
  const location = useLocation();
  const active = commsDestination(location.pathname);
  const badges = useCommsBadges();

  const countFor = (href: string): number => {
    if (href === "/communications/chats") return badges.chats;
    if (href === "/communications/teams") return badges.teams;
    if (href === "/communications/objectives") return badges.objectives;
    return 0;
  };

  return (
    <nav aria-label="Communications sections">
      <ul className="flex flex-wrap items-center gap-1.5">
        {COMMUNICATIONS_DESTINATIONS.map((d) => {
          const isActive = active?.href === d.href;
          const Icon = d.icon;
          const count = countFor(d.href);
          return (
            <li key={d.href}>
              <Link
                to={d.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors",
                  isActive
                    ? "border-accent bg-accent/10 font-semibold text-accent"
                    : "border-border text-muted-foreground hover:border-accent/50 hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {d.label}
                {count > 0 && <NavCount value={count} muted={isActive} />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * The number on a sub-nav pill.
 *
 * Spelled out to a screen reader rather than left as a bare digit beside a
 * label, because "Chats 3" read aloud is ambiguous in a way "Chats, 3 unread"
 * is not. On the active pill it goes quiet — you are already looking at the
 * thing, so the count is context, not a summons.
 */
function NavCount({ value, muted }: { value: number; muted?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums",
        muted ? "bg-accent/20 text-accent" : "bg-accent text-accent-foreground",
      )}
    >
      <span aria-hidden="true">{value > 99 ? "99+" : value}</span>
      <span className="sr-only">{value} needing attention</span>
    </span>
  );
}

/**
 * A titled panel — the card shape used across the section, so a "card" on Teams
 * and a "card" on Objectives are the same object with different contents.
 */
export function CommsPanel({
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
    <section
      className={cn(
        "rounded-2xl border border-border bg-card shadow-sm",
        className,
      )}
    >
      {(title || actions) && (
        <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex min-w-0 items-start gap-2.5">
            {Icon && (
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <div className="min-w-0">
              {title && (
                <h2 className="truncate text-sm font-semibold text-foreground">{title}</h2>
              )}
              {description && (
                <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
              )}
            </div>
          </div>
          {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
        </header>
      )}
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

/**
 * The section's empty state.
 *
 * Icon in a bordered tile, not a giant emoji — the spec is explicit about that,
 * and it also keeps the empty state looking like the rest of the product rather
 * than like a placeholder.
 */
export function CommsEmpty({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-muted/40">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </span>
      <h3 className="mt-4 font-display text-base font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
