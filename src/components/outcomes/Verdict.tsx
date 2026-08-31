import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Eyebrow, Figure, IndexScale, Panel, Reveal, Stat } from "./primitives";
import {
  BAND_LABEL,
  BAND_TONE,
  CALIBRATION_LABEL,
  TIER_LABEL,
  calibrationOf,
  type Reading,
  type ProofLine,
  type Runway,
  type ShapeReading,
  type SignalStanding,
} from "@/lib/outcomesScoring";

/**
 * The verdict.
 *
 * The whole answer, in one screen: the number, what it is measured against,
 * the sentence it produces, and the four facts that qualify it.
 *
 * What came out. The previous version of this panel carried the headline, a
 * four-clause reasoning paragraph, a band chip, the scale, a testing caveat, a
 * calibration meter with its own heading, its own stacked bar and its own
 * three-line explanation, and a link — and the three panels *below* it then
 * restated the file's shape, its runway and its proof coverage at full card
 * size with a paragraph each. Six separate places on one page told the student
 * how well-evidenced their file is.
 *
 * It is one row of four figures now. Anything that needed a paragraph to
 * justify itself has moved to the method section at the foot of the page,
 * where a student who wants it can find it once.
 */

/**
 * The sentence.
 *
 * Colour carries the stress on the tier name, never weight and never italics.
 */
function verdictSentence(reading: Reading): ReactNode {
  const tier = <span className="text-primary">{TIER_LABEL[reading.tier]}</span>;
  switch (reading.band) {
    case "at":
      return <>Your evidence meets the bar {tier} applicants clear.</>;
    case "near":
      return <>You are approaching the bar {tier} applicants clear.</>;
    case "below":
      return <>You are some way below the bar {tier} applicants clear.</>;
    default:
      return <>Your file is a long way short of what {tier} asks for.</>;
  }
}

const SHAPE_LABEL: Record<ShapeReading["verdict"], string> = {
  spike: "Spiked",
  even: "Even",
  thin: "Thin",
  empty: "Empty",
};

const SHAPE_HINT: Record<ShapeReading["verdict"], string> = {
  spike: "One signal clearly ahead",
  even: "Broad, no standout",
  thin: "Broad but shallow",
  empty: "Nothing substantial yet",
};

export function Verdict({
  reading,
  ranked,
  proof,
  runway,
  shape,
}: {
  reading: Reading;
  ranked: SignalStanding[];
  proof: ProofLine[];
  runway: Runway;
  shape: ShapeReading;
}) {
  const tone = BAND_TONE[reading.band];
  const c = calibrationOf(proof);
  const strongest = [...ranked].reverse().find((s) => s.reported && s.score > 0);
  const weakest = ranked.find((s) => s.attainment < 100);

  return (
    <Reveal>
      <Panel tone="lead" flush>
        <div className="grid gap-8 p-6 sm:p-8 md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] md:gap-12 lg:p-10">
          {/* The instrument */}
          <div className="flex min-w-0 flex-col justify-center">
            <Eyebrow>Readiness</Eyebrow>

            <div className="mt-2 flex items-end gap-3">
              <Figure size="lg" className={tone}>
                {reading.index}
              </Figure>
              <span
                className={cn(
                  "mb-2 inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 font-cluely text-[11.5px] font-semibold uppercase tracking-[0.06em]",
                  reading.band === "at" && "border-foreground/25 text-foreground",
                  reading.band === "near" && "border-primary/40 bg-primary/10 text-primary",
                  reading.band === "below" && "border-border text-muted-foreground",
                  reading.band === "far" && "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                )}
              >
                {BAND_LABEL[reading.band]}
              </span>
            </div>

            <div className="mt-6">
              <IndexScale
                value={reading.index}
                barLabel={`${TIER_LABEL[reading.tier]} bar`}
                toneClass={tone}
              />
            </div>
          </div>

          {/* The reading */}
          <div className="flex min-w-0 flex-col justify-center">
            <p className="max-w-[22ch] text-balance font-cluely text-[clamp(1.55rem,5.2vw,2.35rem)] font-semibold leading-[1.12] tracking-[-0.035em] text-foreground">
              {verdictSentence(reading)}
            </p>

            {/*
             * The four facts that qualify the number, and nothing else.
             *
             * Each of these replaced a whole panel: shape was "Depth against
             * breadth", runway was "How long is left", calibration was a meter
             * with a stacked bar and a paragraph, and the strongest/weakest
             * pair was a four-clause sentence that restated the standings
             * table sitting directly below it.
             */}
            <div className="mt-7 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-border pt-6 sm:grid-cols-4">
              <Stat
                label="Carrying"
                value={strongest ? strongest.name : "—"}
                hint={strongest ? `${Math.round(strongest.attainment)}% of bar` : "Nothing on file"}
              />
              <Stat
                label="Losing"
                value={weakest ? weakest.name : "—"}
                hint={weakest ? `${Math.round(weakest.attainment)}% of bar` : "Every signal at bar"}
              />
              <Stat
                label="Proof"
                value={CALIBRATION_LABEL[c.level]}
                hint={c.total === 0 ? "Nothing on file" : `${c.verified} of ${c.total} verified`}
              />
              <Stat
                label="Runway"
                value={runway.monthsLeft > 0 ? `${runway.monthsLeft} months` : "Closed"}
                hint={
                  runway.monthsLeft > 0
                    ? `${SHAPE_LABEL[shape.verdict]} file · ${SHAPE_HINT[shape.verdict]}`
                    : `Applications for ${runway.deadlineYear}`
                }
              />
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2">
              <Link
                to="/admissions-probability"
                className="group inline-flex items-center gap-1 font-cluely text-[12.5px] font-semibold tracking-[-0.01em] text-primary transition-opacity hover:opacity-80"
              >
                See this against your list
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>

              {/* The one caveat that is about this file rather than the scale. */}
              {reading.testingUnreported && (
                <span className="text-[12.5px] leading-snug text-muted-foreground">
                  Testing is left out of this reading, not counted as a zero.
                </span>
              )}
            </div>
          </div>
        </div>
      </Panel>
    </Reveal>
  );
}
