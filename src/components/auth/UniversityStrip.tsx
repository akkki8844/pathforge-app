import { CollegeLogo } from "@/components/CollegeLogo";
import { cn } from "@/lib/utils";

/**
 * A row of real university marks.
 *
 * Every name below is an entry in `lib/colleges.ts`, and the logo comes from
 * the domain stored on that entry — so this is a sample of the college database
 * the product actually ships, not a wall of crests chosen to impress. The
 * caption says exactly that, because "universities our students got into" would
 * be a claim about outcomes and this component has no idea what those are.
 *
 * Each mark sits on a white tile: a logo drawn for a white page loses its
 * counters on a dark panel, and the tile is cheaper than sourcing inverted
 * artwork for thirty institutions.
 */

const SAMPLE = [
  "Harvard University",
  "Stanford University",
  "Massachusetts Institute of Technology",
  "University of Oxford",
  "University of Cambridge",
  "Princeton University",
  "Yale University",
  "Columbia University",
  "National University of Singapore",
  "University of Toronto",
  "Imperial College London",
  "ETH Zurich",
] as const;

export function UniversityStrip({
  caption = "A sample of the universities in the Pathforge college database.",
  onDark = false,
  className,
}: {
  caption?: string;
  /** Draws the caption for a coloured panel rather than a page. */
  onDark?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <ul className="flex flex-wrap gap-2">
        {SAMPLE.map((name) => (
          <li key={name}>
            <span
              title={name}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl bg-white",
                onDark ? "ring-1 ring-white/15" : "ring-1 ring-border",
              )}
            >
              <CollegeLogo name={name} size={22} className="rounded" />
            </span>
          </li>
        ))}
      </ul>
      <p
        className={cn(
          "mt-3 text-[12px] leading-relaxed",
          onDark ? "text-white/55" : "text-muted-foreground",
        )}
      >
        {caption}
      </p>
    </div>
  );
}
