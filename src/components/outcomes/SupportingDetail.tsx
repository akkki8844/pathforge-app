import { useState } from "react";
import { cn } from "@/lib/utils";
import { ColumnHead } from "./primitives";
import {
  CourseworkStanding,
  FileShape,
  PointsLedger,
  ProofLedger,
  RunwayStanding,
} from "./Standings";
import type {
  CourseworkReading,
  ProofLine,
  Reading,
  Runway,
  ShapeReading,
} from "@/lib/outcomesScoring";

/**
 * The five secondary readings, one at a time.
 *
 * All of them were on screen at once: a two-column pair of ledgers under a
 * three-column row of standings, five panels of figures competing with each
 * other and with the verdict above them. Each one is worth having and none is
 * worth having simultaneously — they answer five separate follow-up questions,
 * and a student only ever has one of those at a time.
 *
 * So the panels themselves are untouched, and only their *arrangement*
 * changes: a strip of names, then whichever one was asked for. Nothing is
 * removed, nothing is collapsed behind a click that hides what is inside it —
 * the names are the questions, so the strip is legible without opening
 * anything.
 *
 * `key` on the wrapper is what makes each panel's entrance animation replay on
 * switch; without it React reuses the mounted subtree and the new figures
 * appear fully drawn, which reads as the tab not having worked.
 */

type DetailTab = "points" | "proof" | "coursework" | "shape" | "runway";

const TABS: { id: DetailTab; label: string }[] = [
  { id: "points", label: "Where the points are" },
  { id: "proof", label: "Proof" },
  { id: "coursework", label: "Coursework" },
  { id: "shape", label: "Shape" },
  { id: "runway", label: "Runway" },
];

export function SupportingDetail({
  reading,
  proof,
  shape,
  coursework,
  runway,
  academicsBar,
}: {
  reading: Reading;
  proof: ProofLine[];
  shape: ShapeReading;
  coursework: CourseworkReading;
  runway: Runway;
  academicsBar: number;
}) {
  const [tab, setTab] = useState<DetailTab>("points");

  return (
    <section>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pb-3">
        <ColumnHead>Why</ColumnHead>
        {/* Scrolls rather than wraps on a narrow screen: five names on two
            lines makes the strip look like a paragraph of links. */}
        <div className="-mx-4 min-w-0 flex-1 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0">
          <div
            role="tablist"
            aria-label="Supporting detail"
            className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1"
          >
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "min-h-[32px] whitespace-nowrap rounded-full px-3 font-display text-[11px] font-bold uppercase tracking-[0.1em] transition-colors",
                  tab === t.id
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div key={tab}>
        {tab === "points" && <PointsLedger reading={reading} />}
        {tab === "proof" && <ProofLedger lines={proof} />}
        {tab === "coursework" && (
          <CourseworkStanding
            coursework={coursework}
            bar={academicsBar}
            tier={reading.tier}
          />
        )}
        {tab === "shape" && <FileShape shape={shape} />}
        {tab === "runway" && <RunwayStanding runway={runway} />}
      </div>
    </section>
  );
}
