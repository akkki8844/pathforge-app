import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Eyebrow, Gauge, Panel, PanelHead, PillarBar, Reveal, StandingChip, STANDING_TEXT } from "./primitives";
import type { CollegeItem, DeadlineItem, EssayProgress, PortfolioCounts } from "@/hooks/useDashboardData";
import { TIER_LABELS, type Calibration, type ListCalibration, type PillarGap } from "@/lib/collegeCalibration";

/**
 * Dashboard panels.
 *
 * Everything here answers one of three questions: where do I stand against the
 * schools I picked, what is the single highest-leverage thing I can do about
 * it, and what is coming. Anything that answered none of them is gone.
 */

function daysUntil(d: Date): number {
  const a = new Date();
  a.setHours(0, 0, 0, 0);
  const b = new Date(d);
  b.setHours(0, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

// ── The reading ───────────────────────────────────────────────────────

function attainmentSentence(c: Calibration, school: string | null): string {
  if (!school) return "Add a target school and this becomes a real comparison.";
  if (c.index >= 105) return `You are past the bar admitted students clear at ${school}.`;
  if (c.index >= 88) return `You are at the bar admitted students clear at ${school}.`;
  if (c.index >= 68) return `You are approaching the bar admitted students clear at ${school}.`;
  return `You are some way below the bar admitted students clear at ${school}.`;
}

/**
 * The single most important panel: readiness expressed against the schools the
 * student actually chose, not against an abstract 100. The same profile is a
 * strong regional applicant and a weak Ivy applicant, and only this framing
 * tells them which one they are.
 */
export function Reading({ calibration }: { calibration: ListCalibration }) {
  const { headline, headlineSchool, colleges, withinReach, unbalanced } = calibration;
  const standing = headlineSchool
    ? colleges.find((c) => c.name === headlineSchool)?.standing ?? "Reach"
    : "Reach";
  const tone = STANDING_TEXT[standing] || "text-primary";

  return (
    <Reveal>
      <Panel lift={false} className="overflow-hidden p-0">
        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-12">
          {/* Dial */}
          <div className="flex flex-col items-center justify-center">
            <Gauge
              value={headline.index}
              label="of the admitted bar"
              sublabel={headlineSchool ? TIER_LABELS[headline.tier] : "No target schools yet"}
              toneClass={tone}
            />
            {/* Stacked rather than inline: school names run long ("Massachusetts
                Institute of Technology") and spill out of the dial column. */}
            {headlineSchool && (
              <div className="mt-4 flex w-full min-w-0 flex-col items-center gap-1.5">
                <StandingChip standing={standing} />
                <span className="text-center text-[12px] leading-snug text-muted-foreground">
                  vs {headlineSchool}
                </span>
              </div>
            )}
          </div>

          {/* Reading + pillars */}
          <div className="flex flex-col justify-center">
            <Eyebrow>Where you stand</Eyebrow>
            <p className="mt-3 font-display text-xl font-semibold leading-snug tracking-tight sm:text-2xl">
              {attainmentSentence(headline, headlineSchool)}
            </p>

            {colleges.length > 0 && (
              <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
                {withinReach > 0 ? (
                  <>
                    <span className="font-semibold text-foreground">
                      {withinReach} of your {colleges.length}
                    </span>{" "}
                    {colleges.length === 1 ? "school is" : "schools are"} within reach on this
                    profile today.
                  </>
                ) : (
                  <>
                    None of your {colleges.length} schools sit within reach yet.
                    {unbalanced && " A list with no match school is a list with no floor."}
                  </>
                )}
              </p>
            )}

            <div className="mt-6 space-y-3.5 border-t border-border pt-5">
              {headline.gaps.map((g, i) => (
                <PillarBar
                  key={g.key}
                  label={g.label}
                  value={g.value}
                  bar={g.bar}
                  reported={g.reported}
                  index={i}
                />
              ))}
            </div>

            <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
              The notch on each bar is what an admitted student at this tier typically shows.
              {headline.unreported.length > 0 &&
                " Unreported pillars are left out of the index rather than counted as zero."}
            </p>
          </div>
        </div>
      </Panel>
    </Reveal>
  );
}

// ── The one instruction ───────────────────────────────────────────────

/**
 * A single next action. Deliberately singular: a list of five "priorities" is
 * not a priority, and the calibration can name which pillar actually buys the
 * most ground at this student's tier.
 */
export function NextMove({
  title,
  body,
  href,
  cta,
  priority,
}: {
  title: string;
  body: string;
  href: string;
  cta: string;
  priority?: PillarGap | null;
}) {
  return (
    <Reveal delay={0.05}>
      <Panel tone="accent" className="h-full">
        <Eyebrow>Do this next</Eyebrow>
        <h2 className="mt-3 font-display text-xl font-semibold leading-snug tracking-tight">
          {title}
        </h2>
        <p className="mt-2.5 text-[13px] leading-relaxed text-muted-foreground">{body}</p>

        {priority && (
          <div className="mt-5 rounded-xl border border-primary/20 bg-card/70 p-4">
            <Eyebrow className="text-muted-foreground">Highest leverage</Eyebrow>
            <p className="mt-2 text-[13px] leading-relaxed">
              <span className="font-semibold">{priority.label}</span> — you are at{" "}
              <span className="font-serif tabular-nums">{priority.value}</span> against a bar of{" "}
              <span className="font-serif tabular-nums">{priority.bar}</span>. Closing it is worth
              about{" "}
              <span className="font-serif tabular-nums text-primary">+{priority.upside}</span>{" "}
              points here.
            </p>
          </div>
        )}

        <Link
          to={href}
          className="btn-accent mt-5 inline-flex items-center gap-1.5 text-[12px] tracking-tight"
        >
          {cta}
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </Panel>
    </Reveal>
  );
}

// ── Your list ─────────────────────────────────────────────────────────

export function CollegeList({ colleges }: { colleges: CollegeItem[] }) {
  if (!colleges.length) {
    return (
      <Reveal delay={0.1}>
        <Panel className="h-full">
          <PanelHead eyebrow="Your list" title="No target schools yet" to="/profile" action="Add" />
          <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
            The index can't mean much until it has something to measure against. Add a few schools
            and every number on this page recalibrates to them.
          </p>
        </Panel>
      </Reveal>
    );
  }

  return (
    <Reveal delay={0.1}>
      <Panel className="h-full">
        <PanelHead eyebrow="Your list" title="Where you land" to="/admissions-probability" action="Detail" />
        <ul className="mt-4 space-y-1">
          {colleges.map((c) => (
            <li
              key={c.name}
              className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/60"
            >
              <span className="min-w-0">
                <span className="block text-[13px] font-medium leading-snug">{c.name}</span>
                <span className="mt-0.5 block font-display text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                  {TIER_LABELS[c.tier]}
                  {c.probability !== null && ` · ${Math.round(c.probability)}% odds`}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2.5">
                <StandingChip standing={c.fit} />
                <span
                  className={cn(
                    "w-8 text-right font-serif text-[17px] tabular-nums",
                    STANDING_TEXT[c.fit] || "text-muted-foreground"
                  )}
                >
                  {c.readinessIndex}
                </span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 border-t border-border pt-3 text-[11px] leading-relaxed text-muted-foreground">
          Each figure is your profile against that school's tier, where 100 is the typical admitted
          student.
        </p>
      </Panel>
    </Reveal>
  );
}

// ── What's next ───────────────────────────────────────────────────────

function urgency(days: number): string {
  if (days <= 14) return "text-rose-600 dark:text-rose-400";
  if (days <= 45) return "text-amber-600 dark:text-amber-400";
  return "text-foreground";
}

export function Upcoming({ deadlines }: { deadlines: DeadlineItem[] }) {
  const shown = deadlines.slice(0, 5);
  return (
    <Reveal delay={0.15}>
      <Panel className="h-full">
        <PanelHead eyebrow="What's next" title="Upcoming dates" to="/weekly-planner" action="Plan" />
        {shown.length === 0 ? (
          <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
            Nothing scheduled. Set your application year in your profile to see the cycle.
          </p>
        ) : (
          <>
            <ul className="mt-4 space-y-1">
              {shown.map((d) => {
                const days = daysUntil(d.date);
                return (
                  <li
                    key={d.id}
                    className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/60"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium">{d.label}</span>
                      <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                        {d.detail}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className={cn("font-serif text-[17px] tabular-nums", urgency(days))}>
                        {days}
                      </span>
                      <span className="ml-1 text-[11px] text-muted-foreground">
                        {days === 1 ? "day" : "days"}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 border-t border-border pt-3 text-[11px] leading-relaxed text-muted-foreground">
              Standard cycle dates, not per-school deadlines. Confirm each on the school's site.
            </p>
          </>
        )}
      </Panel>
    </Reveal>
  );
}

// ── Everything else ───────────────────────────────────────────────────

/**
 * The rest of the application, as figures that link to the tool that owns them.
 * Each one is a count the student can act on, not a decorative statistic.
 */
export function Ledger({
  essays,
  totalEssaySections,
  lettersRequested,
  lettersSubmitted,
  portfolio,
}: {
  essays: EssayProgress;
  totalEssaySections: number;
  lettersRequested: number;
  lettersSubmitted: number;
  portfolio: PortfolioCounts;
}) {
  const items = [
    {
      label: "Essay sections",
      value: `${essays.started}/${totalEssaySections}`,
      note: `${essays.refined} refined · ${essays.words.toLocaleString()} words`,
      to: "/essays",
    },
    {
      label: "Recommendations",
      value: `${lettersSubmitted}/${lettersRequested}`,
      note: lettersRequested ? "submitted" : "none requested yet",
      to: "/application-builder",
    },
    {
      label: "Record entries",
      value: String(portfolio.total),
      note: `${portfolio.projects} projects · ${portfolio.competitions} competitions`,
      to: "/outcomes",
    },
    {
      label: "Leadership roles",
      value: String(portfolio.leadership),
      note: `${portfolio.service} service · ${portfolio.research} research`,
      to: "/outcomes",
    },
  ];

  return (
    <Reveal delay={0.2}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((i) => (
          <Link key={i.label} to={i.to} className="group">
            <Panel className="h-full">
              <div className="font-display text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {i.label}
              </div>
              <div className="mt-2 font-serif text-3xl tabular-nums transition-colors group-hover:text-primary">
                {i.value}
              </div>
              <div className="mt-1 truncate text-[11px] text-muted-foreground">{i.note}</div>
            </Panel>
          </Link>
        ))}
      </div>
    </Reveal>
  );
}
