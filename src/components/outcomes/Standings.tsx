import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { EASE_OUT_EXPO } from "@/lib/motion";
import {
  ColumnHead,
  Figure,
  Ledger,
  LedgerCell,
  MeasuredRow,
  Panel,
  PanelHead,
  Reveal,
} from "./primitives";
import {
  TIER_LABEL,
  type CourseworkReading,
  type ProofLine,
  type Reading,
  type ShapeReading,
  type SignalStanding,
} from "@/lib/outcomesScoring";

/**
 * The standings.
 *
 * Six readings, each answering "where do I stand" from a different angle, and
 * every one of them computed from data the student has actually entered. None
 * of them is a percentile, because the app holds no cohort to compute one
 * against; where a comparison is made, it is against a bar this product
 * publishes and names as its own.
 */

// ─── 1. Signal standings ─────────────────────────────────────────────────

/**
 * Every signal against its tier bar, weakest first.
 *
 * The ordering is the information. The previous "Signal Breakdown" listed ten
 * signals in source order, tinted each one of four colours by a status enum,
 * and left the student to work out which of the four reds to touch first.
 */
export function SignalStandings({
  ranked,
  tier,
}: {
  ranked: SignalStanding[];
  tier: Reading["tier"];
}) {
  const atBar = ranked.filter((s) => s.attainment >= 100).length;

  return (
    <Reveal delay={0.05}>
      <Panel flush>
        <PanelHead
          className="p-5 pb-4 sm:p-6 sm:pb-4"
          eyebrow="Standings"
          title="Every signal against the bar"
          note={
            <>
              <Figure size="sm" className="text-foreground">
                {atBar}
              </Figure>
              <span className="ml-1 font-cluely text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                of {ranked.length} at bar
              </span>
            </>
          }
        />
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(4rem,7rem)_3rem] items-center gap-x-3 px-5 pb-2 sm:gap-x-4 sm:px-6">
          <ColumnHead>Weakest first</ColumnHead>
          <ColumnHead className="text-center">{TIER_LABEL[tier]}</ColumnHead>
          <ColumnHead className="text-right">Of bar</ColumnHead>
        </div>
        <Ledger className="border-t border-border">
          {ranked.map((s, i) => (
            <LedgerCell key={s.id}>
              <MeasuredRow
                label={s.name}
                score={s.score}
                bar={s.bar}
                attainment={s.attainment}
                index={i}
                muted={!s.reported}
              />
            </LedgerCell>
          ))}
        </Ledger>
        <p className="border-t border-border bg-card px-5 py-3 text-[12px] leading-relaxed text-muted-foreground sm:px-6">
          The notch on each row is what this tier expects of that signal. Passing it is worth
          something, but capped — overshooting one signal does not repair a hole in another.
        </p>
      </Panel>
    </Reveal>
  );
}

// ─── 2. Where the points are ─────────────────────────────────────────────

/**
 * The index, decomposed.
 *
 * This is the only place a student can see what the weights are doing, which
 * matters because those weights are admin-tunable: two students with identical
 * files can get different readings if the weighting changed between them, and
 * hiding that would be indefensible. `Carrying` is what the category delivers
 * today; `on offer` is what closing it to the bar would add.
 */
export function PointsLedger({ reading }: { reading: Reading }) {
  const reduced = useReducedMotion();
  const ordered = [...reading.categories].sort((a, b) => b.onOffer - a.onOffer);

  return (
    <Reveal delay={0.1} className="h-full">
      <Panel flush className="flex h-full flex-col">
        <div className="p-5 pb-4 sm:p-6 sm:pb-4">
          <PanelHead
            eyebrow="Where the points are"
            title="What each category is worth to you"
          />
        </div>
        <div className="grid grid-cols-[1fr_auto_auto] items-baseline gap-x-4 px-5 pb-2 sm:px-6">
          <ColumnHead>Category</ColumnHead>
          <ColumnHead className="text-right">Carrying</ColumnHead>
          <ColumnHead className="text-right">On offer</ColumnHead>
        </div>
        <Ledger className="border-t border-border">
          {ordered.map((c, i) => (
            <LedgerCell key={c.key} className="px-5 py-3 sm:px-6">
              <div className="grid grid-cols-[1fr_auto_auto] items-baseline gap-x-4">
                <span
                  className={cn(
                    "min-w-0 truncate font-cluely text-[15px] font-semibold tracking-tight",
                    !c.counted && "text-muted-foreground"
                  )}
                >
                  {c.label}
                </span>
                <span className="w-10 text-right">
                  <Figure size="sm" className={c.counted ? "text-foreground" : "text-muted-foreground"}>
                    {c.counted ? c.contribution : "—"}
                  </Figure>
                </span>
                <span className="w-10 text-right">
                  <Figure size="sm" className={c.onOffer > 0 ? "text-primary" : "text-muted-foreground/60"}>
                    {c.counted ? (c.onOffer > 0 ? `+${c.onOffer}` : "0") : "—"}
                  </Figure>
                </span>
              </div>
              {/* A two-part rule: what you hold, then what is still available.
                  Together they always span this category's full weight, so the
                  row's total length is the weight itself. */}
              <div className="mt-2 flex h-[5px] w-full gap-px">
                <motion.span
                  className="bg-primary"
                  initial={reduced ? false : { width: 0 }}
                  animate={{ width: `${c.counted ? c.contribution : 0}%` }}
                  transition={{ duration: reduced ? 0 : 0.6, delay: reduced ? 0 : i * 0.04, ease: EASE_OUT_EXPO }}
                />
                <motion.span
                  className="bg-primary/20"
                  initial={reduced ? false : { width: 0 }}
                  animate={{ width: `${c.counted ? c.onOffer : 0}%` }}
                  transition={{ duration: reduced ? 0 : 0.6, delay: reduced ? 0 : i * 0.04, ease: EASE_OUT_EXPO }}
                />
              </div>
              <p className="mt-1.5 text-[12.5px] leading-snug text-muted-foreground">
                {c.counted
                  ? `${c.score} against a bar of ${c.bar} · ${Math.round(c.weight * 100)}% of your reading`
                  : "Not reported, so its weight is shared out across the rest."}
              </p>
            </LedgerCell>
          ))}
        </Ledger>
      </Panel>
    </Reveal>
  );
}

// ─── 3. The proof ledger ─────────────────────────────────────────────────

/**
 * What is proved against what is merely typed.
 *
 * The most honest ranking on the page, because no model touches it: it is a
 * count. Everything else here is an estimate of how a reader would weigh the
 * file; this is a fact about the file.
 */
export function ProofLedger({ lines }: { lines: ProofLine[] }) {
  const total = lines.reduce((s, l) => s + l.total, 0);
  const verified = lines.reduce((s, l) => s + l.verified, 0);
  const submitted = lines.reduce((s, l) => s + l.submitted, 0);

  return (
    <Reveal delay={0.15} className="h-full">
      <Panel flush className="flex h-full flex-col">
        <div className="p-5 pb-4 sm:p-6 sm:pb-4">
          <PanelHead eyebrow="The proof ledger" title="What actually carries evidence" />
          <div className="mt-4 flex items-end gap-2">
            <Figure size="md" className="text-foreground">
              {verified}
            </Figure>
            <span className="pb-1 font-cluely text-[12.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              of {total} entries verified
            </span>
          </div>
          {submitted > 0 && (
            <p className="mt-1.5 text-[12.5px] text-muted-foreground">
              {submitted} more {submitted === 1 ? "is" : "are"} awaiting verification.
            </p>
          )}
        </div>

        {total === 0 ? (
          <p className="border-t border-border px-5 py-5 text-[14px] leading-relaxed text-muted-foreground sm:px-6">
            Nothing on file yet. Every reading on this page starts from your record.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-[1fr_auto] gap-x-4 px-5 pb-2 sm:px-6">
              <ColumnHead>Category</ColumnHead>
              <ColumnHead className="text-right">Verified</ColumnHead>
            </div>
            <Ledger className="border-t border-border">
              {lines.map((l) => (
                <LedgerCell key={l.label} className="px-5 py-3 sm:px-6">
                  <div className="grid grid-cols-[1fr_auto] items-baseline gap-x-4">
                    <span className="truncate font-cluely text-[15px] font-semibold tracking-tight">
                      {l.label}
                    </span>
                    <span className="shrink-0">
                      <Figure
                        size="sm"
                        className={
                          l.verified > 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-muted-foreground"
                        }
                      >
                        {l.verified}
                      </Figure>
                      <span className="text-[13.5px] text-muted-foreground"> / {l.total}</span>
                    </span>
                  </div>
                  {/* Three segments in evidence order, so the eye reads the
                      proportion proved without needing a legend. */}
                  <div className="mt-2 flex h-[5px] w-full gap-px">
                    {l.verified > 0 && (
                      <span className="bg-emerald-500" style={{ flexGrow: l.verified }} />
                    )}
                    {l.submitted > 0 && (
                      <span className="bg-primary/50" style={{ flexGrow: l.submitted }} />
                    )}
                    {l.unproven > 0 && (
                      <span className="bg-muted-foreground/25" style={{ flexGrow: l.unproven }} />
                    )}
                  </div>
                </LedgerCell>
              ))}
            </Ledger>
            <p className="border-t border-border bg-card px-5 py-4 text-[12.5px] leading-relaxed text-muted-foreground sm:px-6">
              Verified entries count in full. Submitted-but-unchecked proof counts at 40%, and a
              typed claim with no proof counts at almost nothing — which is roughly how a reader
              treats it.
            </p>
          </>
        )}
      </Panel>
    </Reveal>
  );
}

// ─── 4. Shape of the file ────────────────────────────────────────────────

const SHAPE_COPY: Record<ShapeReading["verdict"], { title: string; body: string }> = {
  spike: {
    title: "You have a spike",
    body: "One thing on this file is clearly ahead of the rest. That is the shape selective admissions rewards — keep feeding it rather than spreading yourself to fill the other rows.",
  },
  even: {
    title: "You are broad, not sharp",
    body: "Your record is even across several areas and outstanding in none. Even files read as diligent; they rarely read as memorable. Pick the one you would keep if you had to drop the others and go deeper on it.",
  },
  thin: {
    title: "The file is still thin",
    body: "There is something here, but nothing yet has the depth to carry an application. Depth beats another category — finish one thing properly before opening a second.",
  },
  empty: {
    title: "Nothing to read yet",
    body: "The record below is where every figure on this page comes from. Start with whatever you have actually done, however small it looks.",
  },
};

/**
 * Depth against breadth.
 *
 * Classifies; does not score, and does not feed the index. Included because
 * "how good is my file" and "what shape is my file" are different questions,
 * and a student optimising the first can easily wreck the second by adding
 * shallow entries in empty categories.
 */
export function FileShape({ shape }: { shape: ShapeReading }) {
  const copy = SHAPE_COPY[shape.verdict];
  return (
    <Reveal delay={0.05} className="h-full">
      <Panel className="flex h-full flex-col">
        <PanelHead eyebrow="Shape of the file" title={copy.title} />
        <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">{copy.body}</p>
        <div className="mt-auto grid grid-cols-2 gap-4 border-t border-border pt-5">
          <div>
            <div className="flex items-end gap-1.5">
              <Figure size="md" className="text-foreground">
                {shape.deepest ? shape.deepest.score : 0}
              </Figure>
            </div>
            <ColumnHead className="mt-1.5 block">Deepest signal</ColumnHead>
            <p className="mt-1 truncate text-[12.5px] text-muted-foreground">
              {shape.deepest ? shape.deepest.name : "None yet"}
            </p>
          </div>
          <div>
            <div className="flex items-end gap-1.5">
              <Figure size="md" className="text-foreground">
                {shape.breadth}
              </Figure>
              <span className="pb-0.5 text-[15px] text-muted-foreground">
                / {shape.breadthOf}
              </span>
            </div>
            <ColumnHead className="mt-1.5 block">Categories proved</ColumnHead>
            <p className="mt-1 text-[12.5px] text-muted-foreground">
              At least one verified entry
            </p>
          </div>
        </div>
      </Panel>
    </Reveal>
  );
}

// ─── 5. Coursework ───────────────────────────────────────────────────────

/**
 * The academic load, in rigorous-course equivalents.
 *
 * An AP or IB course counts 1.0 and an honors course 0.4 — an honors course
 * carries much of the workload signal without the external exam that makes an
 * AP verifiable to a reader who has never heard of your school.
 */
export function CourseworkStanding({
  coursework,
  bar,
  tier,
}: {
  coursework: CourseworkReading;
  bar: number;
  tier: Reading["tier"];
}) {
  const reduced = useReducedMotion();
  const rows = [
    { label: "AP", n: coursework.ap },
    { label: "IB", n: coursework.ib },
    { label: "Honors", n: coursework.honors },
    { label: "Regular", n: coursework.regular },
  ].filter((r) => r.n > 0);

  // The bar is expressed on the category's 0–100 scale, so it converts back to
  // equivalents through the same full-load constant the score uses.
  const barRce = Math.round((bar / 100) * coursework.rceFull * 10) / 10;
  const pct = Math.min(100, (coursework.rce / (coursework.rceFull * 1.15)) * 100);
  const barPct = (barRce / (coursework.rceFull * 1.15)) * 100;

  return (
    <Reveal delay={0.1} className="h-full">
      <Panel className="flex h-full flex-col">
        <PanelHead eyebrow="Coursework" title="Rigour, in equivalents" />

        <div className="mt-4 flex items-end gap-2">
          <Figure size="md" className={coursework.rce >= barRce ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}>
            {coursework.rce}
          </Figure>
          <span className="pb-1 font-cluely text-[12.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            against {barRce} for {TIER_LABEL[tier]}
          </span>
        </div>

        <div className="relative mt-3 h-[6px] w-full bg-muted">
          <motion.div
            className={cn(
              "absolute inset-y-0 left-0",
              coursework.rce >= barRce ? "bg-emerald-500" : "bg-primary"
            )}
            initial={reduced ? false : { width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: reduced ? 0 : 0.6, ease: EASE_OUT_EXPO }}
          />
          <span
            className="absolute -top-[3px] h-[12px] w-px bg-foreground/60"
            style={{ left: `${barPct}%` }}
            aria-hidden
          />
        </div>

        {rows.length > 0 ? (
          <div className="mt-auto grid grid-cols-2 gap-x-6 gap-y-2.5 border-t border-border pt-5 sm:grid-cols-4">
            {rows.map((r) => (
              <div key={r.label}>
                <Figure size="sm" className="text-foreground">
                  {r.n}
                </Figure>
                <ColumnHead className="mt-1 block">{r.label}</ColumnHead>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-auto border-t border-border pt-5 text-[13.5px] leading-relaxed text-muted-foreground">
            No courses recorded. Add your timetable in your record — it is the cheapest
            evidence on the page to enter and it carries the largest single weight.
          </p>
        )}
      </Panel>
    </Reveal>
  );
}
