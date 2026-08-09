import { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Flame, Gem, Loader2, Trophy } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useJourneyData } from "@/hooks/useJourneyData";
import { useDashboardData } from "@/hooks/useDashboardData";
import { Seo } from "@/components/Seo";
import { EASE_OUT_EXPO } from "@/lib/motion";
import { CollegeList, Ledger, NextMove, Reading, Upcoming } from "@/components/dashboard/panels";

/**
 * The signed-in home.
 *
 * Guests get the marketing landing at `/`; a student who has finished
 * onboarding gets this instead. It is read-only by design — every figure links
 * to the tool that owns that data, so there is one place to edit anything.
 *
 * The information hierarchy is fixed: where you stand against your own list,
 * the one thing to do about it, then the list and the calendar, then the rest
 * of the file as countable progress.
 */

const LONG_DATE = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric",
});

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Still up";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function firstName(full: string | null | undefined, email: string | null | undefined): string {
  const n = (full || "").trim().split(/\s+/)[0];
  if (n) return n;
  const e = (email || "").split("@")[0];
  return e ? e.charAt(0).toUpperCase() + e.slice(1) : "there";
}

/** Compact status pill for the header strip. */
function Pill({
  icon: Icon,
  value,
  label,
  className,
}: {
  icon: typeof Flame;
  value: number | string;
  label: string;
  className?: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1"
      title={label}
    >
      <Icon className={className || "h-3.5 w-3.5 text-muted-foreground"} />
      <span className="font-serif text-[13px] tabular-nums leading-none">{value}</span>
      <span className="font-display text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
    </span>
  );
}

export default function Dashboard() {
  const { user, profile } = useAuth();
  const reduced = useReducedMotion();
  const d = useDashboardData();
  // The journey hook owns milestone generation and the insight engine; reusing
  // it here keeps a single source of truth for "what should this student do
  // next" rather than duplicating that logic on the dashboard.
  const { insights, nextTask, journeyStarted, loading: journeyLoading } = useJourneyData();

  const name = firstName(profile?.full_name, profile?.email || user?.email);
  const priority = d.calibration.headline.priority;

  const move = useMemo(() => {
    if (!journeyStarted) {
      return {
        title: "Start your journey",
        body: "Ten levels, each proof-gated. It sets the plan everything on this page measures against.",
        href: "/journey",
        cta: "Begin",
      };
    }
    if (nextTask) {
      return {
        title: nextTask.title,
        body: nextTask.why,
        href: "/journey",
        cta: nextTask.linkLabel || "Open the task",
      };
    }
    const gap = insights.find((i) => i.type === "gap" || i.type === "warning");
    if (gap) {
      return {
        title: gap.title,
        body: gap.body,
        href: gap.actionLink || "/journey",
        cta: gap.action || "Fix this",
      };
    }
    return {
      title: "You're clear for now",
      body: "Nothing is overdue. A good use of a quiet week is deepening one activity rather than starting another.",
      href: "/activities",
      cta: "Browse activities",
    };
  }, [journeyStarted, nextTask, insights]);

  if (d.loading && journeyLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const lettersSubmitted = d.recommenders.filter((r) => r.submitted_at).length;

  return (
    <>
      <Seo
        title="Dashboard — Pathforge"
        description="Your college application in one view: how you compare to the schools on your list, and what to do next."
      />

      <div className="mx-auto w-full max-w-[1180px] px-4 pb-24 pt-8 sm:px-6">
        <motion.header
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE_OUT_EXPO }}
          className="mb-6 flex flex-wrap items-end justify-between gap-4"
        >
          <div className="min-w-0">
            <span className="font-display text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              {LONG_DATE.format(new Date())}
            </span>
            <h1 className="mt-1.5 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              {greeting()}, {name}.
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {d.currentLevel > 0 && (
              <Pill icon={Trophy} value={d.currentLevel} label="Level" className="h-3.5 w-3.5 text-primary" />
            )}
            {d.currentStreak > 0 && (
              <Pill
                icon={Flame}
                value={d.currentStreak}
                label={d.currentStreak === 1 ? "day" : "days"}
                className="h-3.5 w-3.5 text-amber-500"
              />
            )}
            <Pill icon={Gem} value={d.gems} label="Gems" className="h-3.5 w-3.5 text-primary" />
            <Link
              to="/profile"
              className="rounded-full border border-border bg-card px-3 py-1.5 font-display text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
            >
              Profile
            </Link>
          </div>
        </motion.header>

        <div className="space-y-3">
          <Reading calibration={d.calibration} />

          <div className="grid gap-3 lg:grid-cols-3">
            <NextMove {...move} priority={priority} />
            <CollegeList colleges={d.colleges} />
            <Upcoming deadlines={d.deadlines} />
          </div>

          <Ledger
            essays={d.essays}
            totalEssaySections={d.totalEssaySections}
            lettersRequested={d.recommenders.length}
            lettersSubmitted={lettersSubmitted}
            portfolio={d.portfolio}
          />
        </div>
      </div>
    </>
  );
}
