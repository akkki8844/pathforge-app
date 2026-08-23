import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ColumnHead, Eyebrow, Figure, IndexScale, Panel, Reveal } from "./primitives";
import {
  BAND_LABEL,
  BAND_TONE,
  CALIBRATION_LABEL,
  TIER_LABEL,
  calibrationOf,
  type Reading,
  type ProofLine,
  type Runway,
  type SignalStanding,
} from "@/lib/outcomesScoring";

/**
 * The verdict.
 *
 * This is the one thing the page exists to say, so it is set like it: a single
 * serif sentence at headline size, then the evidence for that sentence in
 * plain prose, then the instrument that shows the claim is measured rather
 * than asserted.
 *
 * The voice is the dashboard's "Where you stand" block — second person,
 * declarative, no hedging and no congratulation. A student reading this is
 * making a real decision about their next twelve months; the page's job is to
 * be accurate, not encouraging.
 */

/**
 * The sentence.
 *
 * Colour carries the stress on the tier name, never weight and never italics —
 * the same rule the landing page and the dashboard follow.
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

/**
 * The reasoning, assembled from what is actually on file.
 *
 * Never a template with the numbers swapped in — each clause only appears when
 * the fact behind it is true, so an empty file gets a short honest paragraph
 * rather than a long one padded with zeroes.
 */
function reasoning(
  reading: Reading,
  ranked: SignalStanding[],
  proof: { total: number; verified: number },
  runway: Runway
): ReactNode {
  const strongest = [...ranked].reverse().filter((s) => s.attainment >= 55).slice(0, 2);
  const weakest = ranked.filter((s) => s.attainment < 45).slice(0, 2);
  const list = (items: SignalStanding[]) =>
    items.map((s) => s.name.toLowerCase()).join(" and ");

  return (
    <>
      {strongest.length > 0 ? (
        <>
          <span className="text-foreground">{list(strongest)}</span>{" "}
          {strongest.length === 1 ? "is" : "are"} carrying this file.{" "}
        </>
      ) : (
        <>Nothing on file is yet at this tier's standard. </>
      )}
      {weakest.length > 0 && (
        <>
          The ground you are losing is in{" "}
          <span className="text-foreground">{list(weakest)}</span>.{" "}
        </>
      )}
      {proof.total > 0 ? (
        <>
          {proof.verified === 0 ? (
            <>
              None of your {proof.total} entries carry proof yet, so all of them are being
              read as claims.{" "}
            </>
          ) : (
            <>
              {proof.verified} of {proof.total} entries carry proof; the rest are being read
              as claims.{" "}
            </>
          )}
        </>
      ) : (
        <>There is nothing on file to read yet. </>
      )}
      {runway.monthsLeft > 0 ? (
        <>
          You have {runway.monthsLeft} months before applications close in autumn{" "}
          {runway.deadlineYear}.
        </>
      ) : (
        <>Applications for {runway.deadlineYear} have closed.</>
      )}
    </>
  );
}

/**
 * How well-supported the number is, sitting with the number.
 *
 * The score and its calibration answer two different questions — "how high" and
 * "how much of this is proved" — and a student acting on the first without the
 * second is acting on a file a reader would discount. It used to be three
 * panels further down under "the proof ledger", which is the wrong distance: by
 * the time you reach it you have already decided what the score means.
 *
 * The bar is the coverage figure drawn as a rule, not a second score. It is
 * deliberately thin and unlabelled by percentage — the sentence underneath
 * carries the count, which is the honest unit here.
 */
function CalibrationMeter({ reading, proof }: { reading: Reading; proof: ProofLine[] }) {
  const c = calibrationOf(proof);
  return (
    <div className="mt-6 border-t border-border/70 pt-5">
      <div className="flex items-baseline justify-between gap-3">
        <ColumnHead>Calibration</ColumnHead>
        <span
          className={cn(
            "font-display text-[12.5px] font-bold uppercase tracking-[0.08em]",
            c.level === "strong" && "text-emerald-600 dark:text-emerald-400",
            c.level === "partial" && "text-primary",
            c.level === "weak" && "text-amber-700 dark:text-amber-400",
            c.level === "none" && "text-muted-foreground"
          )}
        >
          {CALIBRATION_LABEL[c.level]}
        </span>
      </div>

      <div className="mt-2.5 flex h-[5px] w-full gap-px bg-muted">
        {c.verified > 0 && (
          <span className="bg-emerald-500" style={{ flexGrow: c.verified }} />
        )}
        {c.submitted > 0 && <span className="bg-primary/50" style={{ flexGrow: c.submitted }} />}
        {c.total - c.verified - c.submitted > 0 && (
          <span
            className="bg-muted-foreground/25"
            style={{ flexGrow: c.total - c.verified - c.submitted }}
          />
        )}
      </div>

      <p className="mt-2.5 max-w-[34ch] text-[12.5px] leading-relaxed text-muted-foreground">
        {c.total === 0 ? (
          <>
            Nothing is on file yet, so there is nothing for this reading to rest on.
          </>
        ) : (
          <>
            <Figure size="sm" className="text-foreground">
              {c.verified}
            </Figure>{" "}
            of {c.total} entries carry proof
            {c.submitted > 0 && `, ${c.submitted} awaiting checks`}. Unproved entries are
            discounted inside the {reading.index} above, not excluded from it.
          </>
        )}
      </p>
    </div>
  );
}

export function Verdict({
  reading,
  ranked,
  proof,
  runway,
}: {
  reading: Reading;
  ranked: SignalStanding[];
  proof: ProofLine[];
  runway: Runway;
}) {
  const tone = BAND_TONE[reading.band];
  const totals = proof.reduce(
    (acc, l) => ({ total: acc.total + l.total, verified: acc.verified + l.verified }),
    { total: 0, verified: 0 }
  );

  return (
    <Reveal>
      <Panel tone="feature" flush>
        <div className="grid gap-8 p-5 sm:p-8 md:grid-cols-[minmax(0,1fr)_minmax(0,17rem)] md:gap-10 lg:gap-14 lg:p-9">
          {/* The reading */}
          <div className="flex min-w-0 flex-col justify-center">
            <Eyebrow>The verdict</Eyebrow>
            {/*
             * The page's one headline. Fraunces at a sub-1.1 line height with
             * negative tracking, capped by measure so it always breaks into
             * two or three short lines. The lower clamp bound is what a 320px
             * phone renders.
             */}
            <p className="mt-3 max-w-[20ch] text-balance font-serif text-[clamp(1.7rem,6.5vw,3rem)] leading-[1.06] tracking-[-0.02em] text-foreground">
              {verdictSentence(reading)}
            </p>

            <p className="mt-5 max-w-[52ch] text-[15px] leading-relaxed text-muted-foreground">
              {reasoning(reading, ranked, totals, runway)}
            </p>

            {reading.priority && reading.priority.onOffer > 0 && (
              <div className="mt-7 border-t border-border/70 pt-6">
                <span className="font-display text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  Where the ground is
                </span>
                <p className="mt-2.5 max-w-[46ch] text-[15px] leading-relaxed text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    {reading.priority.label}
                  </span>{" "}
                  is worth{" "}
                  <Figure size="sm" className="text-primary">
                    {reading.priority.onOffer}
                  </Figure>{" "}
                  points of your reading — more than anything else you could work on. You are
                  at{" "}
                  <Figure size="sm" className="text-foreground">
                    {reading.priority.score}
                  </Figure>{" "}
                  against a bar of{" "}
                  <Figure size="sm" className="text-foreground">
                    {reading.priority.bar}
                  </Figure>
                  .
                </p>
              </div>
            )}
          </div>

          {/* The instrument */}
          <div className="flex flex-col justify-center border-t border-border/70 pt-7 md:border-l md:border-t-0 md:pl-8 md:pt-0 lg:pl-10">
            <div className="flex items-end gap-3">
              <Figure size="lg" className={tone}>
                {reading.index}
              </Figure>
              <span className="pb-1.5 font-display text-[11px] font-bold uppercase leading-tight tracking-[0.14em] text-muted-foreground">
                against the
                <br />
                {TIER_LABEL[reading.tier]} bar
              </span>
            </div>

            <span
              className={cn(
                "mt-3 inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 font-display text-[12.5px] font-bold uppercase tracking-[0.08em]",
                // Ink for the two bands that are fine, one warning hue for the
                // two that are not. Four saturated chips made the verdict read
                // as a status badge from a component library rather than as the
                // page's conclusion — and put green, blue, amber and red on a
                // page that also uses blue for its eyebrows and its bars.
                reading.band === "at" && "border-foreground/25 bg-transparent text-foreground",
                reading.band === "near" && "border-primary/35 bg-primary/10 text-primary",
                reading.band === "below" && "border-border bg-transparent text-muted-foreground",
                reading.band === "far" && "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
              )}
            >
              {BAND_LABEL[reading.band]}
            </span>

            <div className="mt-7">
              <IndexScale value={reading.index} barLabel="The bar" toneClass={tone} />
            </div>

            <p className="mt-5 max-w-[34ch] text-[12.5px] leading-relaxed text-muted-foreground/85">
              100 is the evidence profile Pathforge holds {TIER_LABEL[reading.tier]} applicants
              to — a published standard, not a measured admit cohort, and not a percentile.
              {reading.testingUnreported &&
                " Testing is left out of your reading rather than counted as a zero."}
            </p>

            <CalibrationMeter reading={reading} proof={proof} />

            <Link
              to="/admissions-probability"
              className="group mt-5 inline-flex items-center gap-1 font-display text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-primary"
            >
              See this against your list
              <ArrowUpRight className="h-3 w-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </Panel>
    </Reveal>
  );
}
