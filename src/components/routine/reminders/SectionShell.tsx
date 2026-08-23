import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

/**
 * The panel the three Reminders sections share.
 *
 * It mirrors `RoutinePanel`'s shape deliberately — a section here has to read as
 * the same object as a card anywhere else in Routine — but adds one thing that
 * component can't do: collapsing.
 *
 * Collapsing is *mobile only*, and that asymmetry is the point of the page. On a
 * desktop the brief is explicit that Upcoming, Recurring and Completed must all
 * be visible at once rather than hidden behind tabs, so on that breakpoint the
 * header is a plain heading with no affordance to hide anything. On a phone three
 * full lists stacked would push Completed a screen and a half below the input, so
 * there the header becomes a real `<button>` with `aria-expanded` and
 * `aria-controls`, and the body is unmounted rather than visually hidden so it
 * doesn't sit in the tab order while closed.
 */
export function SectionShell({
  title,
  icon: Icon,
  description,
  count,
  defaultOpenOnMobile = true,
  className,
  bodyClassName,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  /** What this section is for. One line. */
  description?: string;
  /** Rendered in the header so the count is readable while collapsed. */
  count?: number;
  defaultOpenOnMobile?: boolean;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  const isMobile = useIsMobile();
  const [openOnMobile, setOpenOnMobile] = useState(defaultOpenOnMobile);
  const bodyId = useId();

  const open = isMobile ? openOnMobile : true;

  const heading = (
    <>
      <span className="flex min-w-0 items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-accent" aria-hidden />
        <span className="font-display text-sm font-bold uppercase tracking-[0.12em] text-foreground">
          {title}
        </span>
        {typeof count === "number" && (
          <span className="rounded-full border border-border bg-muted/50 px-1.5 py-0.5 font-display text-[10px] font-bold tabular-nums text-muted-foreground">
            {count}
          </span>
        )}
      </span>
      {description && (
        <span className="mt-1 block text-xs font-normal text-muted-foreground">
          {description}
        </span>
      )}
    </>
  );

  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-card/60 backdrop-blur-sm",
        className,
      )}
      aria-label={title}
    >
      {isMobile ? (
        <h2>
          <button
            type="button"
            onClick={() => setOpenOnMobile((v) => !v)}
            aria-expanded={open}
            aria-controls={bodyId}
            className="flex min-h-[52px] w-full items-start justify-between gap-3 px-4 py-3 text-left"
          >
            <span className="min-w-0">{heading}</span>
            <ChevronDown
              aria-hidden
              className={cn(
                "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                open && "rotate-180",
              )}
            />
          </button>
        </h2>
      ) : (
        <h2 className="border-b border-border/70 px-5 py-3">{heading}</h2>
      )}

      {open && (
        <div
          id={bodyId}
          className={cn("border-t border-border/70 p-3 sm:border-t-0 sm:p-4", bodyClassName)}
        >
          {children}
        </div>
      )}
    </section>
  );
}
