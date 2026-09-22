import { useId, useRef, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Tabs whose indicator travels between them instead of teleporting.
 *
 * The movement is not decoration. When the marker slides, the eye follows it
 * and arrives at the newly selected tab already knowing which one it left; when
 * it cuts, you have to re-read the row to find out where you are. That matters
 * most on the surfaces this is used for, where the tab row is the primary
 * navigation for the page rather than a minor control.
 *
 * `layoutId` does the work: one shared element, two positions, Framer
 * interpolates. The alternative — measuring each trigger and animating a `left`
 * and `width` — has to be re-measured on every resize, every font load and
 * every label change, and is wrong in the window between them.
 *
 * Keyboard behaviour follows the ARIA tabs pattern rather than the DOM default:
 * arrows move between tabs, Home and End jump to the ends, and only the
 * selected tab is in the tab order, so Tab moves past the row into the panel
 * instead of through every tab in it.
 */

export interface SmoothTab<T extends string> {
  value: T;
  label: ReactNode;
  /** Optional trailing count. Rendered muted so it never competes with the label. */
  badge?: ReactNode;
  disabled?: boolean;
}

export interface SmoothTabsProps<T extends string> {
  tabs: SmoothTab<T>[];
  value: T;
  onValueChange: (value: T) => void;
  /**
   * `pill` floats a filled chip behind the active tab; `underline` draws a rule
   * beneath it. Pill for a standalone control, underline when the row sits
   * directly above the content it switches, where a second filled shape would
   * compete with the panel.
   */
  variant?: "pill" | "underline";
  /** Fills the width, dividing it evenly. Off by default. */
  fullWidth?: boolean;
  className?: string;
  "aria-label"?: string;
}

export function SmoothTabs<T extends string>({
  tabs,
  value,
  onValueChange,
  variant = "pill",
  fullWidth = false,
  className,
  "aria-label": ariaLabel,
}: SmoothTabsProps<T>) {
  const reduced = useReducedMotion();
  const layoutId = useId();
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const move = (dir: 1 | -1 | "first" | "last") => {
    const enabled = tabs.filter((t) => !t.disabled);
    if (enabled.length === 0) return;
    let next: SmoothTab<T>;
    if (dir === "first") next = enabled[0];
    else if (dir === "last") next = enabled[enabled.length - 1];
    else {
      const i = enabled.findIndex((t) => t.value === value);
      // Wraps, which is what the ARIA pattern specifies and what people expect
      // from a short row.
      next = enabled[(i + dir + enabled.length) % enabled.length];
    }
    onValueChange(next.value);
    refs.current[next.value]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={(e) => {
        const map = {
          ArrowRight: 1,
          ArrowDown: 1,
          ArrowLeft: -1,
          ArrowUp: -1,
          Home: "first",
          End: "last",
        } as const;
        const dir = map[e.key as keyof typeof map];
        if (dir === undefined) return;
        e.preventDefault();
        move(dir);
      }}
      className={cn(
        // inline-flex, so the group is as wide as its tabs. As a block-level
        // flex row the pill variant stretched to the container and left a band
        // of empty chrome to the right of the last tab, which reads as a
        // container someone forgot to fill rather than as a control.
        "relative items-center",
        fullWidth ? "flex w-full" : "inline-flex",
        variant === "pill"
          ? "gap-1 rounded-xl border border-border bg-muted/40 p-1"
          : "gap-1 border-b border-border",
        className,
      )}
    >
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            ref={(el) => {
              refs.current[tab.value] = el;
            }}
            role="tab"
            type="button"
            aria-selected={active}
            disabled={tab.disabled}
            // Roving tabindex: Tab enters the row once and then leaves it.
            tabIndex={active ? 0 : -1}
            onClick={() => !tab.disabled && onValueChange(tab.value)}
            className={cn(
              "relative isolate whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              variant === "underline" && "rounded-none pb-2.5",
              fullWidth && "flex-1",
              tab.disabled && "cursor-not-allowed opacity-40",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                aria-hidden
                // Behind the label: the marker is painted at -10 while the
                // button is `isolate`, so it cannot cover its own text.
                className={cn(
                  "absolute inset-0 -z-10",
                  variant === "pill"
                    ? "rounded-lg bg-background shadow-sm ring-1 ring-border/60"
                    : "top-auto h-0.5 rounded-full bg-foreground",
                )}
                transition={
                  reduced
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 420, damping: 36, mass: 0.7 }
                }
              />
            )}
            <span className="relative inline-flex items-center gap-1.5">
              {tab.label}
              {tab.badge !== undefined && tab.badge !== null && (
                <span
                  className={cn(
                    "text-[11px] tabular-nums",
                    active ? "text-muted-foreground" : "text-muted-foreground",
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
