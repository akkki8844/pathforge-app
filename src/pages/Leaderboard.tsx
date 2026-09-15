import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  ChevronLeft, ChevronRight, Flame, Gem, Globe, GraduationCap, Heart,
  Loader2, School as SchoolIcon, Sparkles, Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Seo } from "@/components/Seo";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { fadeUp, staggerParent, staggerStep, transition } from "@/lib/motion";
import { CollegeLogo } from "@/components/CollegeLogo";
import { Eyebrow, Figure, Panel, Title } from "@/components/cluely/primitives";
import {
  AUTO_HANDLE_RE, STANDINGS_GRID, StandingRow, rankAccent, useLeaderboard,
  type LeaderboardRow, type LeaderboardScope,
} from "@/components/journey/JourneyLeaderboard";

/**
 * The standings, as their own page.
 *
 * This lived in a 260px sidebar column on /journey, where a five-column table
 * of student names, schools and three separate counters had roughly a third of
 * the width it needed. Everything below the top three was effectively invisible
 * — you had to page through ten at a time in a box the size of a business card.
 *
 * Given the full measure, the board can do what a leaderboard is for: state who
 * is ahead (the podium), let you find yourself (the pin), and let you change
 * the question you're asking (the scope tabs).
 */

const PAGE_SIZE = 12;

const SCOPES: { value: LeaderboardScope; label: string; icon: typeof Globe; blurb: string }[] = [
  { value: "global", label: "Global", icon: Globe, blurb: "Every student on Pathforge." },
  { value: "school", label: "My school", icon: SchoolIcon, blurb: "Only students at your school." },
  { value: "grade", label: "My grade", icon: GraduationCap, blurb: "Only students in your year." },
];

const EMPTY_COPY: Record<LeaderboardScope, { title: string; body: string; cta?: { to: string; label: string } }> = {
  global: {
    title: "Nobody has claimed the board yet",
    body: "Gems are awarded one per level completed. Finish a stage and the top spot is yours by default.",
    cta: { to: "/journey", label: "Open your journey" },
  },
  school: {
    title: "No school on your profile",
    body: "Add the school you attend and this tab fills with the classmates already on Pathforge.",
    cta: { to: "/profile?section=general", label: "Add your school" },
  },
  grade: {
    title: "No grade on your profile",
    body: "Set the year you're in and you'll be ranked against students applying on the same timeline.",
    cta: { to: "/profile?section=general", label: "Set your grade" },
  },
};

/* ── Podium ──────────────────────────────────────────────────────────── */

const PODIUM_ORDER = [1, 0, 2]; // second, first, third — left to right
const PODIUM_LABELS = ["Champion", "Runner-up", "Third"];

/**
 * The top three.
 *
 * The medal palette this used to carry — an amber ring over an amber glow, a
 * zinc one, an orange one — was three gradients and three hues restating the
 * ordinal printed directly beneath them. Cluely leads with a single lifted
 * surface instead of with colour, so first place is the page's one `lead`
 * panel and the other two are flat cards.
 */
function PodiumCard({ r, place }: { r: LeaderboardRow; place: number }) {
  const isFirst = place === 0;
  return (
    <motion.article variants={fadeUp}>
      <Panel
        tone={isFirst ? "lead" : "default"}
        className={cn(
          "flex h-full flex-col p-5 text-center",
          // The champion sits proud of the other two on desktop. On a phone the
          // three stack, so the lift is dropped rather than inverted.
          isFirst ? "sm:-mt-4 sm:pb-7" : "sm:mt-2",
          r.is_me && !isFirst && "border-primary/30",
        )}
      >
        <Eyebrow>{PODIUM_LABELS[place]}</Eyebrow>

        <p className={cn("mt-2", rankAccent(r.rank))}>
          <Figure className={isFirst ? "text-[2.75rem]" : "text-[2.25rem]"}>{r.rank}</Figure>
        </p>

        <p className="mt-3 truncate font-cluely text-base font-semibold tracking-[-0.01em] text-foreground">
          {r.display_name}
        </p>
        <p className="mt-1 flex h-4 items-center justify-center gap-1.5 truncate text-[11px] text-muted-foreground">
          {r.school_name && (
            <CollegeLogo name={r.school_name} size={12} className="rounded-[2px]" hideWhenUnknown />
          )}
          <span className="truncate">
            {[r.school_name, r.grade ? `Grade ${r.grade}` : null].filter(Boolean).join(" · ")}
          </span>
        </p>

        <div className="mt-4 flex items-center justify-center gap-5 border-t border-border pt-3">
          {[
            { icon: Gem, value: r.diamonds, cls: "text-primary", label: "Gems" },
            { icon: Flame, value: r.streak, cls: "text-muted-foreground", label: "Streak" },
            { icon: Heart, value: r.hearts, cls: "text-muted-foreground", label: "Hearts" },
          ].map((s) => (
            <span key={s.label} className="flex flex-col items-center gap-1" title={s.label}>
              <s.icon className={cn("h-3.5 w-3.5", s.cls)} />
              <span className="font-cluely text-sm font-semibold tabular-nums text-foreground">{s.value}</span>
            </span>
          ))}
        </div>

        {r.is_me && (
          <span className="mt-3 inline-block font-cluely text-[9px] font-semibold uppercase tracking-[0.16em] text-primary">
            That's you
          </span>
        )}
      </Panel>
    </motion.article>
  );
}

/* ── Page ────────────────────────────────────────────────────────────── */

export default function Leaderboard() {
  const { isGuest } = useAuth();
  const reduced = useReducedMotion();
  const [scope, setScope] = useState<LeaderboardScope>("global");
  const [page, setPage] = useState(1);

  const { rows, loading, error, me } = useLeaderboard(scope);

  // Changing the question resets the page, or you land on page 4 of a board
  // that now has two rows.
  useEffect(() => { setPage(1); }, [scope]);

  const podium = useMemo(() => rows.slice(0, 3), [rows]);
  const rest = useMemo(() => rows.slice(3), [rows]);

  const totalPages = Math.max(1, Math.ceil(rest.length / PAGE_SIZE));
  const pageRows = useMemo(
    () => rest.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [rest, page],
  );
  const meOnScreen = useMemo(
    () => !!me && (podium.some((r) => r.is_me) || pageRows.some((r) => r.is_me)),
    [me, podium, pageRows],
  );

  const empty = EMPTY_COPY[scope];
  const activeScope = SCOPES.find((s) => s.value === scope)!;

  return (
    <>
      <Seo
        title="Leaderboard"
        description="Where you stand against every student on Pathforge, your school, and your grade — ranked by gems earned on the journey."
        path="/leaderboard"
      />

      {/* A leaderboard is a table: every column on it is a number or a name,
          none of it is prose, and capping it at a reading measure left the
          standings squeezed into the middle of an empty page. */}
      <div data-cluely className="min-h-svh bg-background font-cluely">
      <div className="pad-safe-x pad-safe-bottom mx-auto w-full max-w-[1440px] px-4 pb-24 pt-8 sm:px-6 lg:px-8">
        <motion.header
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={transition.base}
          className="mb-8"
        >
          <Link
            to="/journey"
            className="inline-flex items-center font-cluely text-xs font-semibold text-muted-foreground transition-colors hover:text-primary"
          >
            ← Back to journey
          </Link>

          <h1 className="mt-3 max-w-[20ch] text-balance font-cluely text-[clamp(1.7rem,5vw,2.4rem)] font-semibold leading-[1.08] tracking-[-0.035em]">
            Where you stand
          </h1>
          <p className="mt-3 max-w-[70ch] text-[14px] leading-relaxed text-muted-foreground">
            One gem per level completed. The board counts gems first, then the streak you've held,
            then hearts remaining — so it rewards finishing work, not starting it.
          </p>
        </motion.header>

        {/* Scope — a segmented control rather than three tabs, because the
            three answer different questions about the same data. */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div
            role="tablist"
            aria-label="Leaderboard scope"
            className="inline-flex rounded-[0.625rem] border border-border bg-card p-1"
          >
            {SCOPES.map((s) => {
              const active = s.value === scope;
              return (
                <button
                  key={s.value}
                  role="tab"
                  type="button"
                  aria-selected={active}
                  onClick={() => setScope(s.value)}
                  className={cn(
                    "relative inline-flex min-h-[38px] items-center gap-1.5 rounded-lg px-3 py-1.5 font-cluely text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors sm:px-4",
                    active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="leaderboard-scope"
                      className="absolute inset-0 rounded-lg border border-border bg-background shadow-sm"
                      transition={transition.fast}
                    />
                  )}
                  <s.icon className="relative h-3.5 w-3.5" />
                  <span className="relative">{s.label}</span>
                </button>
              );
            })}
          </div>

          <p className="text-[11px] text-muted-foreground">
            {activeScope.blurb}
            {!loading && rows.length > 0 && (
              <span className="tabular-nums"> {rows.length} ranked.</span>
            )}
          </p>
        </div>

        {/* Guests are excluded server-side; say so instead of letting someone
            wonder why they never appear. */}
        {isGuest && (
          <div className="mb-6 flex items-start gap-2.5 rounded-[0.625rem] border border-border bg-muted/30 px-4 py-3">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              You're in a guest session, so you aren't ranked.{" "}
              <Link to="/auth" className="font-medium text-foreground underline underline-offset-2">
                Create an account
              </Link>{" "}
              to keep your gems and claim a place on the board.
            </p>
          </div>
        )}

        {/* A student showing as "Student-4F2A" is one profile field away from a
            real name — worth one line, not a permanent banner. */}
        {me && AUTO_HANDLE_RE.test(me.display_name) && (
          <Link
            to="/profile?section=general"
            className="mb-6 flex items-start gap-2.5 rounded-[0.625rem] border border-primary/25 bg-primary/[0.06] px-4 py-3 transition-colors hover:bg-primary/10"
          >
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-[13px] leading-relaxed text-foreground">
              You're showing up as <span className="font-semibold">{me.display_name}</span> — set a display
              name so your classmates know it's you.
            </p>
          </Link>
        )}

        {loading ? (
          <div className="flex min-h-[40svh] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : error ? (
          <Panel className="px-6 py-16 text-center">
            <p className="text-sm text-muted-foreground">{error}</p>
          </Panel>
        ) : rows.length === 0 ? (
          <Panel className="px-6 py-16 text-center">
            <Trophy className="mx-auto h-6 w-6 text-muted-foreground/60" />
            <Title className="mt-4">{empty.title}</Title>
            <p className="mx-auto mt-2 max-w-[46ch] text-sm leading-relaxed text-muted-foreground">
              {empty.body}
            </p>
            {empty.cta && (
              <Button asChild className="mt-5">
                <Link to={empty.cta.to}>{empty.cta.label}</Link>
              </Button>
            )}
          </Panel>
        ) : (
          <motion.div
            variants={staggerParent}
            initial="hidden"
            animate="visible"
            custom={staggerStep(4)}
            className="space-y-8"
          >
            {podium.length > 0 && (
              <section aria-label="Top three">
                <div className="grid gap-4 sm:grid-cols-3 sm:items-start">
                  {PODIUM_ORDER.filter((i) => i < podium.length).map((i) => (
                    <PodiumCard key={podium[i].display_name + podium[i].rank} r={podium[i]} place={i} />
                  ))}
                </div>
              </section>
            )}

            {rest.length > 0 && (
              <motion.section variants={fadeUp} aria-label="Standings" className="rounded-[0.875rem] border border-border bg-card p-2 sm:p-3">
                <div
                  className={cn(
                    STANDINGS_GRID,
                    "px-3 pb-2 pt-1 font-cluely text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground",
                  )}
                >
                  <span>#</span>
                  <span>Student</span>
                  <span className="text-right">Gems</span>
                  <span className="hidden text-right sm:block">Streak</span>
                  <span className="hidden text-right sm:block">Hearts</span>
                </div>

                <ul className="space-y-0.5 border-t border-border pt-2">
                  {pageRows.map((r) => (
                    <StandingRow key={`${r.rank}-${r.display_name}`} r={r} />
                  ))}
                </ul>

                {/* Pin the student's own row when it isn't on the visible page.
                    A mid-pack rank is otherwise unreachable without paging. */}
                {me && !meOnScreen && (
                  <>
                    <div className="my-2 flex items-center gap-2 px-3 font-cluely text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
                      <span className="h-px flex-1 bg-border" />
                      Your rank
                      <span className="h-px flex-1 bg-border" />
                    </div>
                    <ul>
                      <StandingRow r={me} dense />
                    </ul>
                  </>
                )}

                {totalPages > 1 && (
                  <div className="mt-3 flex items-center justify-between border-t border-border px-3 pt-3 text-[11px] text-muted-foreground">
                    <span className="tabular-nums">
                      {(page - 1) * PAGE_SIZE + 4}–{Math.min(page * PAGE_SIZE + 3, rows.length)} of {rows.length}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        aria-label="Previous page"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="px-1 font-cluely tabular-nums font-semibold text-foreground">
                        {page} / {totalPages}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        aria-label="Next page"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </motion.section>
            )}
          </motion.div>
        )}
      </div>
      </div>
    </>
  );
}
