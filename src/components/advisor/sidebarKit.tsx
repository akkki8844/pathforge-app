import * as React from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The advisor sidebar's design system, in one file.
 *
 * Every row in the sidebar — New chat, Library, a project, a conversation,
 * Archived, Settings — is the same primitive at the same height with the same
 * gutter, icon size, radius and type scale. That is the whole point of this
 * file: the previous sidebar had a 36px nav row, a 36px-min chat row that grew,
 * a 44px identity row and a 28px project row, each with its own padding and
 * radius, which is what made it read as unrelated components stacked up rather
 * than one navigation system.
 *
 * Nothing here is advisor-specific logic. It is only the shell vocabulary, so
 * SessionNavBar and ConversationList cannot drift apart.
 */

/** 32px. Dense enough for a long chat list, tall enough to hit comfortably. */
export const ROW_HEIGHT = "h-8";

/**
 * One icon size and one stroke weight for the entire sidebar.
 *
 * lucide defaults to 2. At 16px that reads heavier than the 13px label beside
 * it and drags the eye to the icons instead of the words, which is backwards
 * for a list you navigate by reading.
 */
export const ICON_SIZE = 16;
export const ICON_STROKE = 1.75;

/**
 * The shared gutter.
 *
 * Applied to every section wrapper AND to the row itself, so a row's icon sits
 * 16px from the sidebar edge whether it is a nav item, a project or a chat.
 */
export const GUTTER = "px-2";

/**
 * A section heading.
 *
 * Sentence case at 11px, not the bold uppercase 10px letter-spaced eyebrow the
 * old rail used in five places. A heading that shouts is a heading competing
 * with the rows underneath it; these only need to be findable, not read.
 */
export function SidebarLabel({
  children,
  action,
  className,
}: {
  children: React.ReactNode;
  /** Optional trailing control, e.g. "new project". Revealed on section hover. */
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("group/label flex h-7 items-center gap-1 px-2", className)}>
      <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-muted-foreground">
        {children}
      </span>
      {action}
    </div>
  );
}

/** The small ghost control used for collapse, add, and row overflow. */
export const SidebarIconButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(function SidebarIconButton({ className, ...rest }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        "flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground",
        "transition-colors duration-100 hover:bg-foreground/[0.06] hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      {...rest}
    />
  );
});

export interface SidebarRowProps {
  icon?: LucideIcon;
  /** Replaces the icon slot entirely — an avatar, a colour dot, a spinner. */
  leading?: React.ReactNode;
  label: React.ReactNode;
  /** In-flow right-hand slot for something always visible: a count, a chevron. */
  trailing?: React.ReactNode;
  /**
   * Hover-revealed controls, laid OVER the row's right edge rather than inside
   * its flow.
   *
   * In flow they reserve their width permanently, so a chat row was truncating
   * its title ~56px early to leave room for two buttons that are invisible at
   * rest. The title is the only thing in that row anybody reads; it gets the
   * whole width until the pointer arrives.
   */
  actions?: React.ReactNode;
  active?: boolean;
  /** Icon-rail mode: label and trailing are dropped, the icon centres. */
  collapsed?: boolean;
  onClick?: () => void;
  /** Renders as a router Link instead of a button. */
  to?: string;
  title?: string;
  "aria-label"?: string;
  /**
   * Shared id for the sliding active fill. Rows that pass the same id hand the
   * highlight between them instead of cross-fading. Only worth it inside a
   * group that is always on screen — a fill sliding out of a scrolled-away row
   * animates from a position the reader cannot see.
   */
  indicatorId?: string;
  /**
   * Chrome or content.
   *
   * Nav rows are signposts and sit back at muted contrast. A conversation title
   * is the substance of the list, not a label for it, so it reads at near-full
   * contrast — the same distinction the chat pane makes between its own header
   * and the messages under it.
   */
  tone?: "nav" | "content";
  /** Extra indent, in steps of 12px, for nested rows. */
  depth?: number;
  className?: string;
  children?: React.ReactNode;
}

/**
 * One sidebar row.
 *
 * The row is a <div>; only the icon-and-label area is the control. That split
 * is not cosmetic — a chat row carries an archive button and an overflow menu,
 * and nesting those inside the row's own <button> is invalid HTML that React
 * warns about and that makes the inner controls unreachable in some assistive
 * tech. The control stretches with `flex-1`, so the whole row is still a click
 * target everywhere except on an action.
 *
 * `text-left` is load-bearing: a <button> centres its label under the
 * user-agent stylesheet, which is what threw the old "Library"/"Skills"/
 * "Plugins" rows into the middle of the rail while the <a>-rendered "Dashboard"
 * sat correctly at the left.
 */
export function SidebarRow({
  icon: Icon,
  leading,
  label,
  trailing,
  actions,
  active,
  collapsed,
  onClick,
  to,
  title,
  "aria-label": ariaLabel,
  indicatorId,
  tone = "nav",
  depth = 0,
  className,
  children,
}: SidebarRowProps) {
  const reduceMotion = useReducedMotion();

  // `data-sidebar-row` is the hook the mobile drawer uses to relax every row to
  // a 36px touch target in one declaration, rather than threading a density
  // prop through every call site.
  const shell = cn(
    "group/row relative flex w-full items-center rounded-md transition-colors duration-100",
    ROW_HEIGHT,
    "text-[13px] leading-none",
    active ? "text-foreground" : tone === "content" ? "text-foreground" : "text-muted-foreground",
    // The resting hover is a tint of the foreground rather than a named
    // surface: it sits correctly on both the light card and the dark one
    // without needing a second token, and it never reads as a filled chip.
    !active && "hover:bg-foreground/[0.045] hover:text-foreground",
    className,
  );

  const control = cn(
    "relative z-10 flex h-full min-w-0 flex-1 items-center rounded-md text-left outline-none",
    "focus-visible:ring-2 focus-visible:ring-ring",
    collapsed ? "justify-center px-0" : cn("gap-2.5 pl-2", trailing ? "pr-1" : "pr-2"),
    tone === "content" && !active && "group-hover/row:text-foreground",
  );

  const inner = (
    <>
      <span
        className="flex shrink-0 items-center justify-center"
        style={!collapsed && depth > 0 ? { marginLeft: depth * 12 } : undefined}
      >
        {leading ?? (Icon ? <Icon size={ICON_SIZE} strokeWidth={ICON_STROKE} /> : null)}
      </span>
      {!collapsed && (
        <span className={cn("min-w-0 flex-1 truncate", active ? "font-medium" : "font-normal")}>
          {label}
        </span>
      )}
    </>
  );

  return (
    <div data-sidebar-row="" className={shell}>
      {/* The active fill. Behind the content, so the label keeps full contrast. */}
      {active &&
        (indicatorId && !reduceMotion ? (
          <motion.span
            layoutId={indicatorId}
            aria-hidden="true"
            className="absolute inset-0 rounded-md bg-foreground/[0.07]"
            transition={{ type: "spring", stiffness: 560, damping: 42 }}
          />
        ) : (
          <span aria-hidden="true" className="absolute inset-0 rounded-md bg-foreground/[0.07]" />
        ))}

      {to ? (
        <Link to={to} onClick={onClick} title={title} aria-label={ariaLabel} className={control}>
          {inner}
        </Link>
      ) : (
        <button
          type="button"
          onClick={onClick}
          title={title}
          aria-label={ariaLabel}
          className={control}
        >
          {inner}
        </button>
      )}

      {!collapsed && trailing && (
        <span className="relative z-10 flex shrink-0 items-center pr-2">{trailing}</span>
      )}

      {/* Actions sit over the row's right edge, faded in from the sidebar's own
          surface so a long title runs underneath them instead of being cropped
          for them. Always present for the keyboard (`focus-within`) and always
          visible on touch, where there is no hover to reveal anything. */}
      {!collapsed && actions && (
        <span
          className={cn(
            "absolute inset-y-0 right-0 z-20 flex items-center gap-0.5 rounded-r-md pl-8 pr-2",
            "bg-gradient-to-l from-card from-65% to-transparent",
            "transition-opacity duration-100",
            "md:opacity-0 md:group-hover/row:opacity-100 md:group-focus-within/row:opacity-100",
            "[&:has([data-state=open])]:opacity-100",
          )}
        >
          {actions}
        </span>
      )}
      {children}
    </div>
  );
}

/**
 * A right-aligned count.
 *
 * Plain tabular digits, not a filled pill. Six pills down the left edge of a
 * product is six things asking to be looked at, and none of these numbers is
 * news — they are reference values you read once and then ignore.
 */
export function SidebarCount({ value }: { value: number }) {
  if (!value) return null;
  return (
    <span className="text-[11px] tabular-nums text-muted-foreground transition-colors group-hover/row:text-muted-foreground">
      {value}
    </span>
  );
}
