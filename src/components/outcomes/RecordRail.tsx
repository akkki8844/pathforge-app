import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { ColumnHead } from "./primitives";
import { RECORD_SECTIONS, type SectionCount } from "@/lib/outcomesSections";

/**
 * The record's index.
 *
 * Twelve sections is the right number of sections and the wrong number of
 * things to scroll past blind. This is the profile-nav a LinkedIn profile
 * has: every section named once, with how much is in it, and a click that
 * jumps there. It is navigation, not a filter. Nothing here hides a section,
 * changes what the page shows, or asks which category something belongs to.
 *
 * Sections with nothing in them are the ones a student is here to fix, so an
 * empty count is stated as a hollow marker rather than as "0", which reads as
 * a measurement rather than as a gap.
 *
 * The active marker follows the scroll through IntersectionObserver rather
 * than a scroll listener, so it costs nothing per frame.
 */
export function RecordRail({ counts }: { counts: Record<string, SectionCount> }) {
  const [active, setActive] = useState<string>(RECORD_SECTIONS[0].id);

  useEffect(() => {
    const nodes = RECORD_SECTIONS.map((s) => document.getElementById(`record-${s.id}`)).filter(
      (n): n is HTMLElement => n !== null
    );
    if (!nodes.length || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        // The topmost section currently crossing the band under the navbar
        // wins, so the marker never flickers between two visible sections.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id.replace("record-", ""));
      },
      { rootMargin: "-88px 0px -60% 0px", threshold: 0 }
    );
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, []);

  return (
    <nav aria-label="Record sections" className="lg:sticky lg:top-24">
      <ColumnHead>Sections</ColumnHead>
      <ul className="mt-3 space-y-px">
        {RECORD_SECTIONS.map((section) => {
          const count = counts[section.id] ?? { total: 0, verified: 0 };
          const isActive = active === section.id;
          return (
            <li key={section.id}>
              <a
                href={`#record-${section.id}`}
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "flex h-9 items-center gap-3 rounded-lg px-3 text-left transition-colors",
                  isActive
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium leading-none">
                  {section.title}
                </span>
                {count.total > 0 ? (
                  <span className="shrink-0 font-cluely text-[12px] font-semibold tabular-nums leading-none">
                    {count.total}
                  </span>
                ) : (
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full border border-current opacity-45"
                    aria-label="Nothing on file"
                  />
                )}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
