import { useMemo, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";
import { CollegeLogo } from "@/components/CollegeLogo";
import { useRoutineClasses, useTimetableImage } from "@/hooks/routine/useRoutineData";
import { useCollegeNews, type CollegeNewsItem } from "@/hooks/useCollegeNews";
import { AddUniversityDialog } from "./AddUniversityDialog";
import { TimetableEmptyNotice } from "@/components/routine/TimetableEmptyNotice";
import { TimetableImageView } from "@/components/routine/TimetableImage";
import { classesOnDay } from "@/lib/routine/derive";
import { formatTime } from "@/lib/routine/dates";
import type { CollegeItem } from "@/hooks/useDashboardData";
import { TIER_LABELS } from "@/lib/collegeCalibration";

/**
 * The dashboard.
 *
 * Four blocks, and deliberately only four: today's classes, the news, the
 * college list, and the weekly check-in. Everything a previous version showed
 * here — the readiness index, the next task, the deadline column, the counts
 * of essays and letters and portfolio entries — lives on the page that owns it
 * and was only ever being restated here. A home screen that restates six other
 * pages is a directory, not a home screen.
 *
 * Two rules on the look:
 *
 * 1. One typeface. The app pairs Sora with Fraunces to sell itself to a
 *    stranger; a student who is already signed in is not being sold anything,
 *    so this surface is Inter and nothing else. Size, weight and space carry
 *    the hierarchy two families used to carry.
 *
 * 2. No gradients. Every surface is one flat colour. Exactly one card is
 *    filled — the timetable, because it is the block you actually read every
 *    morning — and the rest are white on a hairline. One filled card in a group
 *    of quiet ones is the whole visual hierarchy.
 */

// ── Type scale ────────────────────────────────────────────────────────

/*
 * The page is drawn from these steps, kept here as constants so the ratios stay
 * visible rather than scattered as ad-hoc class strings. Tracking tightens as
 * size grows, which is most of what separates Inter set well from Inter at
 * defaults.
 */
const T = {
  /** A card's own title. The largest type on the page. */
  title: "text-[clamp(1.5rem,2.6vw,2rem)] font-semibold leading-[1.1] tracking-[-0.03em]",
  /** The lead story's headline. */
  lead: "text-[clamp(1.15rem,2vw,1.5rem)] font-semibold leading-[1.2] tracking-[-0.025em]",
  /** One row in a list. */
  row: "text-[15px] font-medium leading-[1.35] tracking-[-0.012em]",
  /** Running text. */
  body: "text-[14.5px] font-normal leading-[1.6] tracking-[-0.006em]",
  /** The quiet line under a block. */
  note: "text-[12.5px] font-normal leading-[1.5] tracking-[-0.003em]",
} as const;

// ── Motion ────────────────────────────────────────────────────────────

/**
 * A block arriving. 12px and 420ms, once, on entry.
 *
 * Returns a plain div when the user asks for reduced motion — not a motion
 * component with the animation disabled, so nothing about framer-motion is in
 * the tree at all for those users.
 */
export function Rise({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.42, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────

/**
 * One surface.
 *
 * `tone="filled"` is the accent card. There is only ever one on the page: two
 * competing fills read as two competing priorities, and the point of filling
 * one is that your eye lands there first.
 */
export function Card({
  children,
  className,
  tone = "plain",
  as: As = "section",
}: {
  children: ReactNode;
  className?: string;
  tone?: "plain" | "filled";
  as?: "section" | "div";
}) {
  return (
    <As
      className={cn(
        "rounded-[22px] p-6 transition-colors duration-200 sm:p-7",
        tone === "filled"
          ? "bg-[hsl(var(--primary))] text-white"
          : "border border-border bg-card hover:border-foreground/20",
        className
      )}
    >
      {children}
    </As>
  );
}

/**
 * A card's title and its one line of explanation, with an optional way out.
 *
 * The subtitle is not decoration: each of these blocks is a view onto a page
 * that owns the data, and the subtitle is where that gets said, so the title
 * itself can stay two or three words.
 */
export function CardHead({
  title,
  sub,
  to,
  action = "Open",
  filled = false,
}: {
  title: string;
  sub?: string;
  to?: string;
  action?: string;
  filled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-5">
      <div className="min-w-0">
        <h2 className={T.title}>{title}</h2>
        {sub && (
          <p className={cn("mt-2 max-w-[42ch]", T.body, filled ? "text-white/70" : "text-muted-foreground")}>
            {sub}
          </p>
        )}
      </div>
      {to && (
        <Link
          to={to}
          // Negative margin keeps an 11px label visually where it belongs while
          // giving it a 44px tap target. At 13px tall it is a miss on touch.
          className={cn(
            "group -m-2 mt-0 inline-flex min-h-[44px] shrink-0 items-center gap-1 p-2 text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors",
            filled ? "text-white/70 hover:text-white" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {action}
          <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-px group-hover:-translate-y-px" />
        </Link>
      )}
    </div>
  );
}

// ── Today's classes ───────────────────────────────────────────────────

/**
 * The one filled card, because it is the one block whose answer changes every
 * morning and is read at a glance rather than studied.
 *
 * A student who uploaded a photo of their school timetable instead of entering
 * classes gets the photo — the data is the same commitment either way, and
 * re-typing it into a form was never the point.
 */
export function Timetable() {
  const { classes } = useRoutineClasses();
  const { image, imageUrl, urlLoading } = useTimetableImage();
  const today = useMemo(() => classesOnDay(classes, new Date()), [classes]);

  return (
    <Rise className="h-full">
      <Card tone="filled" className="flex h-full flex-col">
        <CardHead
          title="Today"
          sub={
            image
              ? "Your timetable, as you uploaded it."
              : today.length > 0
                ? "Your classes, from your weekly timetable."
                : undefined
          }
          to="/routine/timetable"
          filled
        />

        {image ? (
          <div className="mt-6">
            <TimetableImageView
              url={imageUrl}
              loading={urlLoading}
              maxHeightClass="max-h-56"
              alt="Your uploaded timetable"
            />
          </div>
        ) : today.length > 0 ? (
          <ul className="mt-6 divide-y divide-white/15">
            {today.slice(0, 6).map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-4 py-3.5 first:pt-0">
                <span className="min-w-0">
                  <span className={cn("block truncate", T.row)}>{c.subject}</span>
                  {c.location && (
                    <span className="mt-1 block truncate text-[12.5px] text-white/60">
                      {c.location}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-[15px] font-medium tabular-nums text-white/75">
                  {formatTime(c.start_time)}
                </span>
              </li>
            ))}
          </ul>
        ) : classes.length > 0 ? (
          <p className={cn("mt-6", T.body, "text-white/70")}>
            No classes today. Your week is set — open the timetable to see the rest of it.
          </p>
        ) : (
          <div className="mt-6">
            <TimetableEmptyNotice tone="bare" />
          </div>
        )}
      </Card>
    </Rise>
  );
}

// ── The list ──────────────────────────────────────────────────────────

/**
 * The schools, each with its own mark.
 *
 * The logo is doing real work rather than decorating: a list of eight
 * institutions is scanned by shape long before it is read, and a row of
 * identical grey text is the slowest possible way to find the one you meant.
 * `CollegeLogo` resolves the domain from the college database and degrades to a
 * lettered tile, so a blocked or missing logo never leaves a hole.
 */
export function CollegeList({ colleges }: { colleges: CollegeItem[] }) {
  if (!colleges.length) {
    return (
      <Rise delay={0.06} className="h-full">
        <Card className="flex h-full flex-col">
          <CardHead
            title="Your list"
            sub="Nothing on it yet. Add a few schools and the rest of the app calibrates to them."
          />
          {/* The empty state used to send the student to /profile to find the
              picker. Adding a school is the entire job of this card when it is
              empty, so the picker opens here instead of costing a navigation. */}
          <div className="mt-6">
            <AddUniversityDialog />
          </div>
        </Card>
      </Rise>
    );
  }

  return (
    <Rise delay={0.06} className="h-full">
      <Card className="flex h-full flex-col">
        <CardHead title="Your list" to="/admissions-probability" action="Detail" />
        <ul className="mt-6 divide-y divide-border">
          {colleges.map((c) => (
            <li key={c.name} className="flex items-center gap-3.5 py-3.5 first:pt-0">
              <CollegeLogo name={c.name} size={30} className="rounded-[8px]" />
              <span className="min-w-0 flex-1">
                <span className={cn("block truncate", T.row)}>{c.name}</span>
                <span className="mt-1 block truncate text-[12.5px] text-muted-foreground">
                  {TIER_LABELS[c.tier]}
                </span>
              </span>
              <span className="shrink-0 text-[12.5px] font-medium text-muted-foreground">
                {c.fit}
              </span>
            </li>
          ))}
        </ul>
        {/* `mt-auto` pins this to the bottom of the card so the button lines up
            with the foot of the timetable beside it rather than floating
            wherever the list happens to end. */}
        <div className="mt-auto pt-6">
          <AddUniversityDialog />
        </div>
      </Card>
    </Rise>
  );
}

// ── The news ──────────────────────────────────────────────────────────

function since(iso: string): string {
  const hours = Math.round((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/** Source and time on one line — the only metadata a headline needs. */
function Meta({ source, at }: { source: string; at: string | null }) {
  return (
    <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
      <span className="truncate">{source}</span>
      {at && (
        <>
          <span className="h-px w-3 shrink-0 bg-border" aria-hidden />
          <span className="shrink-0 font-normal normal-case tracking-normal">{since(at)}</span>
        </>
      )}
    </span>
  );
}

/**
 * College and admissions news, pulled daily from real outlets' RSS by the
 * fetch-college-news cron function — see `useCollegeNews`. Nothing here is
 * AI-written or invented; a headline this section cannot source, it does not
 * show.
 *
 * Laid out as a front page rather than a card of links: one lead story with its
 * image at size, and the rest as a ruled column beside it. This is the only
 * outward-looking block on an otherwise entirely self-referential page, and
 * giving it a full row is what makes it read as news rather than as a widget.
 */
export function News({ fixture }: { fixture?: CollegeNewsItem[] }) {
  // The hook is called unconditionally — `fixture` exists only so the dev
  // preview route can render this block without a session, and it must not
  // change hook order for the real page.
  const { data, isLoading, isError } = useCollegeNews(6);
  const items = fixture ?? data;
  const lead = items?.[0];
  const rest = items?.slice(1, 6) ?? [];

  return (
    <Rise delay={0.06}>
      <Card>
        <CardHead title="Today in admissions" sub="Fresh from the outlets that cover it, once a day." />

        {isLoading && !fixture ? (
          <div className="mt-7 grid gap-x-10 gap-y-8 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <div className="aspect-[16/9] animate-pulse rounded-[16px] bg-muted" />
              <div className="mt-5 h-5 w-3/4 animate-pulse rounded bg-muted" />
            </div>
            <div className="space-y-5 lg:col-span-5">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-[10px] bg-muted" />
              ))}
            </div>
          </div>
        ) : isError && !fixture ? (
          /* A failed read and an empty table are not the same thing, and
             saying "no fresh stories yet" for a failed read tells the student
             the outlets were quiet when in fact the feed never loaded. */
          <p className={cn("mt-6 text-muted-foreground", T.body)}>
            The news feed didn't load. It'll try again on your next visit.
          </p>
        ) : !lead ? (
          <p className={cn("mt-6 text-muted-foreground", T.body)}>
            No fresh stories yet — this refreshes once a day.
          </p>
        ) : (
          <div className="mt-7 grid gap-x-10 gap-y-10 lg:grid-cols-12">
            {/* Lead */}
            <a
              href={lead.url}
              target="_blank"
              rel="noreferrer noopener"
              className="group lg:col-span-7"
            >
              {lead.image_url ? (
                <div className="overflow-hidden rounded-[16px] border border-border">
                  <img
                    src={lead.image_url}
                    alt=""
                    loading="lazy"
                    className="aspect-[16/9] w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                  />
                </div>
              ) : (
                <div className="flex aspect-[16/9] w-full items-center justify-center rounded-[16px] border border-border bg-muted text-muted-foreground">
                  <Newspaper className="h-7 w-7" strokeWidth={1.5} />
                </div>
              )}
              <div className="mt-5">
                <Meta source={lead.source} at={lead.published_at} />
                <h3
                  className={cn(
                    "mt-3 max-w-[32ch] text-balance decoration-1 underline-offset-4 group-hover:underline",
                    T.lead
                  )}
                >
                  {lead.title}
                </h3>
                {lead.summary && (
                  <p className={cn("mt-3 line-clamp-2 max-w-[58ch] text-muted-foreground", T.body)}>
                    {lead.summary}
                  </p>
                )}
              </div>
            </a>

            {/* The rest */}
            <ul className="divide-y divide-border lg:col-span-5 lg:-mt-1">
              {rest.map((item) => (
                <li key={item.id}>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="group flex items-start gap-4 py-4 first:pt-0"
                  >
                    <span className="min-w-0 flex-1">
                      <Meta source={item.source} at={item.published_at} />
                      <span className="mt-2 line-clamp-2 block text-[14.5px] font-medium leading-[1.35] tracking-[-0.014em] decoration-1 underline-offset-4 group-hover:underline">
                        {item.title}
                      </span>
                    </span>
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt=""
                        loading="lazy"
                        className="h-14 w-20 shrink-0 rounded-[10px] border border-border object-cover"
                      />
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    </Rise>
  );
}

// ── The backdrop ──────────────────────────────────────────────────────

const CELL = 72;

/**
 * The grid, as an SVG data URI rather than the conventional pair of
 * `linear-gradient()` hairlines — this page has no gradients in it, including
 * the ones nobody would notice.
 */
function gridUrl(stroke: string): string {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${CELL}' height='${CELL}'>` +
    `<path d='M${CELL} 0H0v${CELL}' fill='none' stroke='${stroke}' stroke-width='1'/></svg>`;
  const encoded = svg.replace(/#/g, "%23").replace(/</g, "%3C").replace(/>/g, "%3E");
  return `url("data:image/svg+xml,${encoded}")`;
}

/** Faint engineering grid behind the page. Two layers so it can invert. */
export function GridField() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.05] dark:hidden"
        style={{ backgroundImage: gridUrl("#000000"), backgroundSize: `${CELL}px ${CELL}px` }}
      />
      <div
        className="absolute inset-0 hidden opacity-[0.07] dark:block"
        style={{ backgroundImage: gridUrl("#ffffff"), backgroundSize: `${CELL}px ${CELL}px` }}
      />
    </div>
  );
}
