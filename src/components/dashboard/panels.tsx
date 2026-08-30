import { useMemo, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Newspaper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRoutineClasses, useTimetableImage } from "@/hooks/routine/useRoutineData";
import { useCollegeNews } from "@/hooks/useCollegeNews";
import { TimetableEmptyNotice } from "@/components/routine/TimetableEmptyNotice";
import { TimetableImageView } from "@/components/routine/TimetableImage";
import { classesOnDay } from "@/lib/routine/derive";
import { formatTime } from "@/lib/routine/dates";
import {
  Eyebrow,
  Gauge,
  Panel,
  PanelHead,
  PillarBar,
  Reveal,
  StandingChip,
  STANDING_TEXT,
} from "./primitives";
import type { CollegeItem, DeadlineItem, EssayProgress, PortfolioCounts } from "@/hooks/useDashboardData";
import { TIER_LABELS, type Calibration, type ListCalibration, type PillarGap } from "@/lib/collegeCalibration";
import { AddUniversityDialog } from "./AddUniversityDialog";

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

/**
 * The one sentence the page exists to say.
 *
 * The school name comes back as a coloured span rather than as plain text: on
 * the landing page every emphasis is `em { color: accent; font-weight: inherit }`
 * — colour carries the stress, never weight and never italics — and this is the
 * dashboard's equivalent of that move.
 */
function attainmentSentence(c: Calibration, school: string | null): ReactNode {
  if (!school) return "Add a target school and this becomes a real comparison.";
  const at = <span className="text-primary">{school}</span>;
  const verb =
    c.index >= 105
      ? "past"
      : c.index >= 88
        ? "at"
        : c.index >= 68
          ? "approaching"
          : "some way below";
  return (
    <>
      You are {verb} the bar admitted students clear at {at}.
    </>
  );
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
      <Panel tone="feature" lift={false} className="overflow-hidden p-0">
        {/* The md step matters: between 640 and 1024 this used to be a single
            stacked column with the dial centred over a full-width paragraph,
            which left a tall dead band on every tablet. */}
        <div className="grid gap-7 p-5 sm:gap-8 sm:p-8 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] md:gap-10 lg:gap-14 lg:p-9">
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
                <span className="max-w-full break-words text-center text-[13.5px] leading-snug text-muted-foreground">
                  vs {headlineSchool}
                </span>
              </div>
            )}
          </div>

          {/* Reading + pillars */}
          <div className="flex min-w-0 flex-col justify-center">
            <Eyebrow>Where you stand</Eyebrow>
            {/* Serif and large: this is the one sentence the page exists to say,
                and at the old 20px semibold sans it read as a caption. The lower
                clamp bound is what it renders at on a 320px phone. */}
            <p className="mt-3 max-w-[22ch] font-serif text-[clamp(1.65rem,6vw,2.9rem)] leading-[1.06] tracking-[-0.02em] text-foreground">
              {attainmentSentence(headline, headlineSchool)}
            </p>

            {colleges.length > 0 && (
              <p className="mt-4 max-w-[46ch] text-[15px] leading-relaxed text-muted-foreground">
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

            <div className="mt-7 grid gap-x-8 gap-y-3.5 border-t border-border/70 pt-6 sm:grid-cols-2">
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

            <p className="mt-5 max-w-[62ch] text-[12.5px] leading-relaxed text-muted-foreground/80">
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
    <Reveal delay={0.05} className="h-full">
      {/* Flex column with the CTA pushed to the bottom so this card's button
          lines up with the foot of the two beside it instead of floating
          wherever the copy happens to end. */}
      <Panel tone="accent" className="flex h-full flex-col">
        <Eyebrow>Do this next</Eyebrow>
        {/* Sora 600, -0.015em — the landing page's card-title spec. */}
        <h2 className="mt-3 text-balance font-display text-[clamp(1.4rem,5vw,1.75rem)] font-semibold leading-[1.05] tracking-[-0.015em]">
          {title}
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{body}</p>

        {priority && (
          <div className="mt-5 rounded-xl border border-primary/20 bg-card/70 p-4">
            <Eyebrow className="text-muted-foreground">Highest leverage</Eyebrow>
            <div className="mt-2.5 flex items-baseline gap-2.5">
              <span className="font-display text-3xl font-semibold leading-none tracking-[-0.02em] tabular-nums text-primary">
                +{priority.upside}
              </span>
              <span className="font-display text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                points on offer
              </span>
            </div>
            <p className="mt-2.5 text-[13.5px] leading-relaxed text-muted-foreground">
              <span className="font-semibold text-foreground">{priority.label}</span> — you are at{" "}
              <span className="font-display font-semibold tabular-nums text-foreground">
                {priority.value}
              </span>{" "}
              against a bar of{" "}
              <span className="font-display font-semibold tabular-nums text-foreground">
                {priority.bar}
              </span>
              .
            </p>
          </div>
        )}

        <div className="mt-auto pt-6">
          <Link
            to={href}
            className="btn-accent inline-flex items-center gap-1.5 text-[13.5px] tracking-tight"
          >
            {cta}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </Panel>
    </Reveal>
  );
}

// ── Your list ─────────────────────────────────────────────────────────

export function CollegeList({ colleges }: { colleges: CollegeItem[] }) {
  if (!colleges.length) {
    return (
      <Reveal delay={0.1} className="h-full">
        <Panel className="h-full">
          <PanelHead eyebrow="Your list" title="No target schools yet" />
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
            The index can't mean much until it has something to measure against. Add a few schools
            and every number on this page recalibrates to them.
          </p>
          {/* The empty state used to send the student to /profile to find the
              picker. Adding a school is the entire job of this panel when it is
              empty, so the picker opens here instead of costing a navigation. */}
          <div className="mt-4">
            <AddUniversityDialog />
          </div>
        </Panel>
      </Reveal>
    );
  }

  return (
    <Reveal delay={0.1} className="h-full">
      <Panel className="h-full">
        <PanelHead eyebrow="Your list" title="Where you land" to="/admissions-probability" action="Detail" />
        <ul className="mt-4 space-y-1">
          {colleges.map((c) => (
            <li
              key={c.name}
              className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/60"
            >
              <span className="min-w-0">
                <span className="block text-[15px] font-medium leading-snug">{c.name}</span>
                <span className="mt-0.5 block font-display text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                  {TIER_LABELS[c.tier]}
                  {c.probability !== null && ` · ${Math.round(c.probability)}% odds`}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2.5">
                <StandingChip standing={c.fit} />
                <span
                  className={cn(
                    "w-8 text-right font-display text-[18px] font-semibold tracking-[-0.02em] tabular-nums",
                    STANDING_TEXT[c.fit] || "text-muted-foreground"
                  )}
                >
                  {c.readinessIndex}
                </span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 border-t border-border pt-3 text-[12.5px] leading-relaxed text-muted-foreground">
          Each figure is your profile against that school's tier, where 100 is the typical admitted
          student.
        </p>
        <div className="mt-4">
          <AddUniversityDialog />
        </div>
      </Panel>
    </Reveal>
  );
}

// ── What's next ───────────────────────────────────────────────────────

/**
 * One warning colour, not two.
 *
 * A red band at 14 days and an amber one at 45 meant most of a normal cycle
 * rendered coloured, which is the same as none of it being coloured. Inside a
 * fortnight is the only window where the count changes what a student does
 * today, so it is the only one that spends a hue.
 */
function urgency(days: number): string {
  return days <= 14 ? "text-amber-700 dark:text-amber-400" : "text-foreground";
}

export function Upcoming({ deadlines }: { deadlines: DeadlineItem[] }) {
  const shown = deadlines.slice(0, 5);
  return (
    <Reveal delay={0.15} className="h-full">
      <Panel className="h-full">
        <PanelHead eyebrow="What's next" title="Upcoming dates" to="/weekly-planner" action="Plan" />
        {shown.length === 0 ? (
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
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
                      <span className="block truncate text-[15px] font-medium">{d.label}</span>
                      <span className="mt-0.5 block truncate text-[12.5px] text-muted-foreground">
                        {d.detail}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span
                        className={cn(
                          "font-display text-[18px] font-semibold tracking-[-0.02em] tabular-nums",
                          urgency(days)
                        )}
                      >
                        {days}
                      </span>
                      <span className="ml-1 text-[12.5px] text-muted-foreground">
                        {days === 1 ? "day" : "days"}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 border-t border-border pt-3 text-[12.5px] leading-relaxed text-muted-foreground">
              Standard cycle dates, not per-school deadlines. Confirm each on the school's site.
            </p>
          </>
        )}
      </Panel>
    </Reveal>
  );
}

// ── This week's shape ─────────────────────────────────────────────────

/**
 * The student's timetable, on the dashboard.
 *
 * Unlike its neighbours this panel reads its own data rather than taking it
 * from `useDashboardData`. That is deliberate: it is a window onto Routine,
 * which has its own query layer and its own realtime channel, and threading two
 * more fields through the admissions-shaped dashboard hook to reach it would
 * couple two subsystems that otherwise share nothing. Both queries are the same
 * React Query keys the Routine pages use, so a student who has been in Routine
 * this session pays nothing for this.
 *
 * Three states, in the order a student is likely to be in them:
 *   * an uploaded image — show *that image*, compact, not a redrawing of it;
 *   * structured classes — show today's, since a dashboard answers "today";
 *   * neither — the one fixed sentence, with the way to fix it in it.
 */
export function TimetableSnapshot() {
  const { classes } = useRoutineClasses();
  const { image, imageUrl, urlLoading } = useTimetableImage();
  const today = useMemo(() => classesOnDay(classes, new Date()), [classes]);

  return (
    <Reveal delay={0.15} className="h-full">
      <Panel className="flex h-full flex-col">
        <PanelHead
          eyebrow="Your week"
          title="Timetable"
          to="/routine/timetable"
          action="Open"
        />

        {image ? (
          <div className="mt-4 space-y-2">
            <TimetableImageView
              url={imageUrl}
              loading={urlLoading}
              maxHeightClass="max-h-44"
              alt="Your uploaded timetable"
            />
            <p className="text-[12.5px] leading-relaxed text-muted-foreground">
              Your uploaded timetable. Click to see it full size.
            </p>
          </div>
        ) : today.length > 0 ? (
          <>
            <ul className="mt-4 space-y-1">
              {today.slice(0, 5).map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/60"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-medium">{c.subject}</span>
                    {c.location && (
                      <span className="mt-0.5 block truncate text-[12.5px] text-muted-foreground">
                        {c.location}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 font-display text-[15px] font-semibold tabular-nums text-muted-foreground">
                    {formatTime(c.start_time)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 border-t border-border pt-3 text-[12.5px] leading-relaxed text-muted-foreground">
              {today.length > 5
                ? `Today's first five of ${today.length} classes.`
                : "Today's classes, from your weekly timetable."}
            </p>
          </>
        ) : classes.length > 0 ? (
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
            No classes today. Your week is set — open the timetable to see the rest of it.
          </p>
        ) : (
          <div className="mt-3">
            <TimetableEmptyNotice tone="bare" />
          </div>
        )}

        {/* The panel above answers "what does my week look like"; this is the
            one unambiguous way out of it. `PanelHead`'s "Open" label is a
            13px caption meant to sit beside a title, not to read as an
            action on its own — a student asked for something that actually
            looks pressable. */}
        <Button asChild className="mt-4 w-full">
          <Link to="/routine/timetable">Open Timetable</Link>
        </Button>
      </Panel>
    </Reveal>
  );
}

/**
 * College/academic news, pulled daily from real outlets' RSS by the
 * fetch-college-news cron function — see `useCollegeNews`. Nothing here is
 * AI-written or invented; a headline this panel can't source, it doesn't show.
 */
export function CollegeNewsPanel() {
  const { data: items, isLoading, isError } = useCollegeNews(6);

  return (
    <Reveal delay={0.18} className="h-full">
      <Panel className="flex h-full flex-col">
        <PanelHead eyebrow="Today in admissions" title="College News" />

        {isLoading ? (
          <div className="mt-4 space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-muted/60" />
            ))}
          </div>
        ) : isError || !items || items.length === 0 ? (
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
            No fresh stories yet — this refreshes once a day.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {items.map((item) => (
              <li key={item.id}>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="group flex items-start gap-3 rounded-lg p-1.5 transition-colors hover:bg-muted/60"
                >
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt=""
                      loading="lazy"
                      className="h-14 w-14 shrink-0 rounded-md object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <Newspaper className="h-5 w-5" />
                    </div>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-[12.5px] font-semibold uppercase tracking-wide text-primary">
                      {item.source}
                    </span>
                    <span className="line-clamp-2 text-[14.5px] font-medium leading-snug text-foreground group-hover:underline">
                      {item.title}
                    </span>
                    {item.published_at && (
                      <span className="mt-0.5 block text-[12px] text-muted-foreground">
                        {newsRelativeTime(item.published_at)}
                      </span>
                    )}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </Reveal>
  );
}

function newsRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.round(diffMs / (1000 * 60 * 60));
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
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

  // One ruled strip rather than four floating cards. Four identical boxes is the
  // house style of every SaaS dashboard ever shipped; a single surface split by
  // hairlines reads as the index at the foot of a page, which is what it is.
  return (
    <Reveal delay={0.2}>
      <Panel lift={false} className="overflow-hidden p-0">
        {/*
         * One column before 480px. At 320px a two-up split left ~103px of
         * content per cell, which is narrower than the word "Recommendations"
         * set in tracked caps and narrower than a figure like "12/145" — both
         * overflowed their cell.
         *
         * The hairlines are the grid's own 1px gap showing the container's
         * background through, not borders on the cells. Per-cell borders would
         * need a different "is this cell first in its row" rule at each of the
         * three column counts, which means emitting border-t and border-t-0 at
         * the same breakpoint and relying on Tailwind's internal ordering to
         * decide which wins. This is correct at any column count for free.
         */}
        <div className="grid grid-cols-1 gap-px bg-border min-[480px]:grid-cols-2 lg:grid-cols-4">
          {items.map((i) => (
            <Link
              key={i.label}
              to={i.to}
              className="group relative bg-card p-5 transition-colors hover:bg-muted/50 sm:p-6"
            >
              <div className="font-display text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {i.label}
              </div>
              {/*
               * Sora, not the serif. On the landing page every standing numeral
               * ("01"–"05", "I."–"III.") is display-sans in editorial blue with
               * font-style forced upright — the serif is reserved for the one
               * hero headline. Clamped so a four-character figure fits a 320px
               * cell.
               */}
              <div className="mt-2.5 font-display text-[clamp(2rem,8vw,2.6rem)] font-semibold leading-none tracking-[-0.02em] tabular-nums transition-colors group-hover:text-primary">
                {i.value}
              </div>
              {/* line-clamp rather than truncate: at one column the note fits on
                  one line, and where it doesn't, losing the word count to an
                  ellipsis loses real information. */}
              <div className="mt-2 line-clamp-2 text-[12.5px] leading-snug text-muted-foreground">
                {i.note}
              </div>
              {/* Visible by default, brighter on hover. As an opacity-0
                  group-hover reveal it was the only signal these figures are
                  links, and it never appeared on a touch device. */}
              <ArrowUpRight className="absolute right-4 top-5 h-3.5 w-3.5 text-muted-foreground/50 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary group-hover:opacity-100" />
            </Link>
          ))}
        </div>
      </Panel>
    </Reveal>
  );
}
