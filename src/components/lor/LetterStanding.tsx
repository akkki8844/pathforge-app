import { useMemo } from "react";
import { CalendarClock, CircleAlert } from "lucide-react";
import { Feature } from "./lorSurface";
import { computeReadiness } from "@/lib/lorReadiness";
import { withoutHonorific } from "@/lib/personName";
import { cn } from "@/lib/utils";
import type { Recommender } from "@/hooks/useRecommenders";

/**
 * Where the student stands on letters.
 *
 * `computeReadiness` is a real model: roster size, subject coverage, request
 * progress, materials prepared, deadlines on track. The original page spent all
 * of it on a 64px ring reading "52 / Building", with the signals that produced
 * the 52 hidden behind a popover. So the one number a student could see was the
 * one thing they could not act on.
 *
 * This is the same model, inverted and then given the weight it earns. The
 * things you can do something about are the panel; the score is the figure they
 * sit under, large because it is the page's single summary and small in
 * information terms because it is derived from everything else.
 *
 * Still no ring, still no five progress bars with filled tracks. "2 of 5
 * submitted" is already the whole story, and a bar behind it would add a shape
 * without adding a fact.
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

  const urgent = nextDue !== null && nextDue.days <= 3;

  return (
    <Feature className="p-5">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          {/* The one place a big number is honest: it summarises the five
              signals listed underneath it, so it is a heading for them rather
              than a statistic on its own. */}
          <div className="flex items-baseline gap-1.5">
            <span className="font-cluely text-[40px] font-semibold leading-none tracking-[-0.04em] tabular-nums text-foreground">
              {score}
            </span>
            <span className="font-cluely text-[15px] font-medium text-muted-foreground">/ 100</span>
          </div>
          <p className="mt-1.5 text-[13px] font-medium text-foreground">{band}</p>
        </div>

        <div className="text-right">
          <div className="font-cluely text-[22px] font-semibold leading-none tabular-nums text-foreground">
            {submitted}
            <span className="text-muted-foreground">/{items.length}</span>
          </div>
          <p className="mt-1.5 text-[12px] text-muted-foreground">submitted</p>
        </div>
      </div>

      <dl className="mt-5 space-y-2.5 border-t border-primary/15 pt-4">
        <div className="flex items-start justify-between gap-4">
          <dt className="shrink-0 text-[12.5px] text-muted-foreground">Still to cover</dt>
          <dd className="min-w-0 text-right text-[12.5px] font-medium text-foreground">
            {missingRoles.length ? missingRoles.join(", ") : "Nothing missing"}
          </dd>
        </div>

        <div className="flex items-start justify-between gap-4">
          <dt className="shrink-0 text-[12.5px] text-muted-foreground">Next deadline</dt>
          <dd
            className={cn(
              "flex min-w-0 items-center justify-end gap-1.5 text-right text-[12.5px] font-medium",
              urgent ? "text-destructive" : "text-foreground",
            )}
          >
            {nextDue ? (
              <>
                {urgent ? (
                  <CircleAlert className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <CalendarClock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
                <span className="truncate">
                  {withoutHonorific(nextDue.r.name)},{" "}
                  {nextDue.days < 0
                    ? `${Math.abs(nextDue.days)} days overdue`
                    : nextDue.days === 0
                      ? "due today"
                      : `in ${nextDue.days} days`}
                </span>
              </>
            ) : (
              "None set"
            )}
          </dd>
        </div>
      </dl>

      <p className="mt-4 text-[11.5px] leading-relaxed text-muted-foreground">
        From roster size, subject coverage, request progress, materials and deadlines.
      </p>
    </Feature>
  );
}
