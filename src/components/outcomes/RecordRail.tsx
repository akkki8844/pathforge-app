import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ColumnHead } from "./primitives";
import { RECORD_SECTIONS, type SectionCount } from "@/lib/outcomesSections";

/**
 * The record's index, which is now the record's control.
 *
 * Twelve sections is the right number of categories and the wrong number of
 * cards to scroll past. This used to be a list of anchors: every section was
 * rendered, one under another, and clicking a name jumped down the page. So
 * "Publications" meant scrolling past eleven other sections, and the page was
 * eleven sections tall no matter which one you came to edit.
 *
 * It is a tab list instead. One category is shown at a time and this picks it,
 * so the page is the height of the section you are working in.
 *
 * Sections with nothing in them are the ones a student is here to fix, so an
 * empty count is stated as a hollow marker rather than as "0", which reads as
 * a measurement rather than as a gap.
 *
 * The selected marker is a single `layoutId` element, so it slides from the
 * old tab to the new one instead of blinking out and in. The vertical rail and
 * the phone strip carry different ids because both are in the DOM at once —
 * only ever one visible — and two live elements sharing a `layoutId` would
 * fight over the same projection.
 */

const SPRING = { type: "spring", stiffness: 520, damping: 42, mass: 0.9 } as const;

export interface RecordRailProps {
  counts: Record<string, SectionCount>;
  /** The section id currently shown. */
  active: string;
  onSelect: (id: string) => void;
}

/** The count, or a hollow marker when the section is empty. */
function Marker({ count }: { count: SectionCount }) {
  if (count.total > 0) {
    return (
      <span className="relative shrink-0 font-cluely text-[12px] font-semibold tabular-nums leading-none">
        {count.total}
      </span>
    );
  }
  return (
    <span
      className="relative h-1.5 w-1.5 shrink-0 rounded-full border border-current opacity-45"
      aria-label="Nothing on file"
    />
  );
}

export function RecordRail({ counts, active, onSelect }: RecordRailProps) {
  const reduced = useReducedMotion();

  return (
    <nav aria-label="Record sections" className="lg:sticky lg:top-24">
      <ColumnHead>Sections</ColumnHead>
      <div role="tablist" aria-orientation="vertical" className="mt-3 space-y-px">
        {RECORD_SECTIONS.map((section) => {
          const count = counts[section.id] ?? { total: 0, verified: 0 };
          const isActive = active === section.id;
          return (
            <button
              key={section.id}
              type="button"
              role="tab"
              id={`record-tab-${section.id}`}
              aria-selected={isActive}
              aria-controls={`record-panel-${section.id}`}
              onClick={() => onSelect(section.id)}
              className={cn(
                "relative flex h-9 w-full items-center gap-3 rounded-lg px-3 text-left transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              {isActive &&
                (reduced ? (
                  <span className="absolute inset-0 rounded-lg bg-muted" aria-hidden />
                ) : (
                  <motion.span
                    layoutId="record-rail-selected"
                    className="absolute inset-0 rounded-lg bg-muted"
                    transition={SPRING}
                    aria-hidden
                  />
                ))}
              <span className="relative min-w-0 flex-1 truncate text-[13.5px] font-medium leading-none">
                {section.title}
              </span>
              <Marker count={count} />
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/**
 * The same tab list on a phone.
 *
 * A vertical rail of twelve names costs a screen of its own below lg, so the
 * categories run as one scrolling row of pills there. The selected pill is
 * scrolled into view when it changes, otherwise picking a tab from the far end
 * of the row leaves the selection off-screen.
 */
export function RecordTabStrip({ counts, active, onSelect }: RecordRailProps) {
  const reduced = useReducedMotion();

  return (
    <nav aria-label="Record sections" className="-mx-4 px-4 sm:-mx-5 sm:px-5">
      <div
        role="tablist"
        aria-orientation="horizontal"
        className="flex gap-1.5 overflow-x-auto pb-1"
      >
        {RECORD_SECTIONS.map((section) => {
          const count = counts[section.id] ?? { total: 0, verified: 0 };
          const isActive = active === section.id;
          const Icon = section.icon;
          return (
            <button
              key={section.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`record-panel-${section.id}`}
              onClick={(e) => {
                onSelect(section.id);
                e.currentTarget.scrollIntoView({
                  behavior: reduced ? "auto" : "smooth",
                  block: "nearest",
                  inline: "center",
                });
              }}
              className={cn(
                "relative flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                isActive ? "border-transparent text-foreground" : "border-border text-muted-foreground"
              )}
            >
              {isActive &&
                (reduced ? (
                  <span className="absolute inset-0 rounded-full bg-muted" aria-hidden />
                ) : (
                  <motion.span
                    layoutId="record-strip-selected"
                    className="absolute inset-0 rounded-full bg-muted"
                    transition={SPRING}
                    aria-hidden
                  />
                ))}
              <Icon className="relative h-[15px] w-[15px] shrink-0" aria-hidden />
              <span className="relative whitespace-nowrap text-[13px] font-medium leading-none">
                {section.title}
              </span>
              <Marker count={count} />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
