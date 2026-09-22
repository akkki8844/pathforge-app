import { forwardRef, type ReactNode } from "react";
import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * The visual layer shared across the Professors page.
 *
 * The page it replaces was white cards on a white page, one hairline apart,
 * with the brand accent spent entirely on a single button in the corner. That
 * is not restraint, it is absence: nothing on the screen told you where to
 * look, so everything read as equally unimportant and the whole page read as
 * flat.
 *
 * Depth here comes from two layers, not from colour:
 *
 *   `Surface`  - the default. A card that sits ON the page.
 *   `Feature`  - the accent surface. Exactly one per column, never more.
 *
 * `Liftable` adds pointer feedback to either, and `SectionRule` is the one
 * heading shape the route uses.
 *
 * The accent is the brand indigo, unchanged from every other route, and it is
 * the only hue on the page. Deadlines still borrow `destructive`, because
 * "overdue" is the one state a student acts on differently, and that was true
 * before this redesign. No per-status colours: the stage a row sits under
 * already names its status, and nine hues saying the same thing is what this
 * page looked like two revisions ago.
 */

const BASE = "rounded-2xl border transition-colors";

export function Surface({
  className,
  children,
  ...rest
}: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        BASE,
        // A tinted shadow rather than a black one: a neutral drop shadow on a
        // near-white page reads as grey haze, not as elevation.
        "border-border/70 bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-16px_rgba(16,24,40,0.18)]",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

/**
 * The one accent surface per column.
 *
 * A very low-saturation indigo wash, not a gradient banner. The tint is doing
 * one job: marking which panel is the page's answer to "where do I look
 * first". At 6% in light and 10% in dark it reads as a material change rather
 * than as decoration, and the text on it stays on the normal foreground token
 * so contrast is unchanged.
 */
export function Feature({
  className,
  children,
  ...rest
}: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        BASE,
        "relative overflow-hidden border-primary/20 bg-primary/[0.06] dark:bg-primary/[0.10]",
        className,
      )}
      {...rest}
    >
      {/* A single soft light source in the top-left corner. Static, no
          animation: a panel that breathes forever is a panel you learn to
          ignore. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 -top-24 h-56 w-56 rounded-full bg-primary/15 blur-3xl"
      />
      <div className="relative">{children}</div>
    </div>
  );
}

/**
 * A row or card that lifts slightly under the pointer.
 *
 * Feedback, not decoration: these are all clickable and nothing else about
 * them says so. 2px, because the point is to acknowledge the pointer, not to
 * launch the card off the page.
 */
export const Liftable = forwardRef<HTMLDivElement, HTMLMotionProps<"div">>(
  function Liftable({ className, children, ...rest }, ref) {
    const reduced = useReducedMotion();
    return (
      <motion.div
        ref={ref}
        whileHover={reduced ? undefined : { y: -2 }}
        whileTap={reduced ? undefined : { scale: 0.995 }}
        transition={{ type: "spring", stiffness: 420, damping: 32 }}
        className={className}
        {...rest}
      >
        {children}
      </motion.div>
    );
  },
);

/**
 * A section heading, as a name and a hairline running to the edge.
 *
 * This is the one heading shape the route uses, and it exists as a component
 * because it was previously written out four times — twice here as
 * `text-xs uppercase tracking-widest` micro-labels, once by hand in the roster
 * and once more above the professor results with a second, unrelated sentence
 * floated to the right of it. Stacked uppercase tracking labels down a column
 * are the templated rhythm that makes a page read as generated; a name, an
 * optional count, and a rule does the same job and gives the column structure.
 */
export function SectionRule({
  count,
  as: Tag = "h3",
  className,
  children,
}: {
  count?: number;
  as?: "h2" | "h3" | "h4";
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("mb-2.5 flex items-center gap-3", className)}>
      <Tag className="shrink-0 text-[13px] font-semibold tracking-[-0.01em] text-foreground">
        {children}
      </Tag>
      {count !== undefined && (
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
          {count}
        </span>
      )}
      <span aria-hidden className="h-px flex-1 bg-border" />
    </div>
  );
}
