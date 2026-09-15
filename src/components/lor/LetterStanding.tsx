import { useMemo } from "react";
import { Panel } from "@/components/cluely/primitives";
import { computeReadiness } from "@/lib/lorReadiness";
import { withoutHonorific } from "@/lib/personName";
import type { Recommender } from "@/hooks/useRecommenders";

/**
 * Where the student stands on letters, stated rather than gauged.
 *
 * `computeReadiness` is a real model: roster size, subject coverage, request
 * progress, materials prepared, deadlines on track. The page used to spend all
 * of it on a 64px ring reading "52 / Building" in the header, with the signals
 * that produced the 52 hidden behind a popover. So the one number a student
 * could see was the one thing they could not act on, and the five facts they
 * could act on took a click to find.
 *
 * This is the same model, inverted: the things you can do something about are
 * on the page, and the score is a footnote to them. No ring, no five progress
 * bars with filled tracks, no band colour. The score still appears because it
 * is computed and honest, but it is the smallest thing here rather than the
 * largest.
 */

function daysUntil(date: string): number {
  const due = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}

export function LetterStanding({ items }: { items: Recommender[] }) {
  const { score, band, missingRoles } = useMemo(() => computeReadiness(items), [items]);

  /** The next letter that still needs chasing, and how long there is. */
  const nextDue = useMemo(() => {
    const open = items
      .filter((r) => r.due_date && r.status !== "submitted")
      .map((r) => ({ r, days: daysUntil(r.due_date!) }))
      .sort((a, b) => a.days - b.days);
    return open[0] ?? null;
  }, [items]);

  const submitted = items.filter((r) => r.status === "submitted").length;

  if (items.length === 0) return null;

  /*
   * Three facts, each a sentence a student can act on. Written out rather than
   * charted: "2 of 5 submitted" is already the whole story, and a bar behind it
   * would add a shape without adding a fact.
   */
  const lines: { label: string; value: string }[] = [
    {
      label: "Letters",
      value: `${submitted} of ${items.length} submitted`,
    },
    {
      label: "Still to cover",
      value: missingRoles.length ? missingRoles.join(", ") : "Nothing missing",
    },
    {
      label: "Next deadline",
      value: nextDue
        ? `${withoutHonorific(nextDue.r.name)}, ${
            nextDue.days < 0
              ? `${Math.abs(nextDue.days)} days overdue`
              : nextDue.days === 0
                ? "due today"
                : `due in ${nextDue.days} days`
          }`
        : "None set",
    },
  ];

  return (
    <Panel flush>
      <dl className="grid divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {lines.map((l) => (
          <div key={l.label} className="min-w-0 px-4 py-3 sm:px-5">
            <dt className="font-cluely text-[11px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">
              {l.label}
            </dt>
            <dd className="mt-1 truncate font-cluely text-[14px] font-medium tracking-[-0.01em] text-foreground">
              {l.value}
            </dd>
          </div>
        ))}
      </dl>
      <p className="border-t border-border px-4 py-2.5 text-[12.5px] text-muted-foreground sm:px-5">
        Readiness {score} of 100 ({band.toLowerCase()}), from roster size, subject coverage,
        request progress, materials and deadlines.
      </p>
    </Panel>
  );
}
