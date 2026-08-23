import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useJourneyData } from "@/hooks/useJourneyData";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useWeeklyCheckins } from "@/hooks/useWeeklyCheckins";
import { Seo } from "@/components/Seo";
import { EASE_OUT_EXPO } from "@/lib/motion";
import {
  CollegeList,
  CollegeNewsPanel,
  Ledger,
  NextMove,
  Reading,
  TimetableSnapshot,
  Upcoming,
} from "@/components/dashboard/panels";
import { WeeklyCheckIn } from "@/components/dashboard/WeeklyCheckIn";

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

export default function Dashboard() {
  const { user, profile } = useAuth();
  const reduced = useReducedMotion();
  const d = useDashboardData();
  const week = useWeeklyCheckins();
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
        body: "Fifteen levels, each proof-gated. It sets the plan everything on this page measures against.",
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
      <div className="flex min-h-[70svh] items-center justify-center">
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

      {/* max-w-[1180px] sits close to the landing page's 75rem/1200px measure,
          deliberately narrower than the app's max-w-7xl. */}
      <div className="pad-safe-x pad-safe-bottom mx-auto w-full max-w-[1180px] px-4 pb-24 pt-8 sm:px-6">
        <motion.header
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE_OUT_EXPO }}
          className="mb-6"
        >
          {/*
           * The page's one serif headline, matching the landing hero: Fraunces
           * at a sub-1 line-height with hard negative tracking, capped by
           * measure so it always breaks into two or three short lines instead of
           * running out as one long one. The lower clamp bound is what a 320px
           * phone gets.
           */}
          <h1 className="max-w-[14ch] text-balance font-serif text-[clamp(2rem,8vw,3.9rem)] leading-[0.95] tracking-[-0.035em]">
            {greeting()}, {name}.
          </h1>
          <div className="dash-double-rule mt-5" aria-hidden />
        </motion.header>

        {/* 0.65rem between cards against ~4rem between page blocks — the
            landing page's ratio, and most of why it reads as a printed spread
            rather than as a grid of widgets. */}
        <div className="space-y-[0.65rem]">
          <Reading calibration={d.calibration} />

          {/*
           * Asymmetric on purpose. Three equal thirds gave the one instruction
           * the same weight as a list of dates; on a 12-column bed the move gets
           * five, the list four, the calendar three.
           *
           * The md step is not cosmetic: without it the whole 640–1023px band
           * (iPad portrait, most Android tablets, a half-width desktop window)
           * fell back to the mobile stack and rendered three ~700px-wide panels
           * of 13px copy. There, the move takes the full width and the two
           * lists sit beside each other.
           */}
          <div className="grid gap-[0.65rem] md:grid-cols-2 lg:grid-cols-12">
            <div className="h-full md:col-span-2 lg:col-span-5">
              <NextMove {...move} priority={priority} />
            </div>
            <div className="h-full md:col-span-1 lg:col-span-4">
              <CollegeList colleges={d.colleges} />
            </div>
            <div className="h-full md:col-span-1 lg:col-span-3">
              <Upcoming deadlines={d.deadlines} />
            </div>
          </div>

          {/* The week the student is actually living in, under the cycle dates
              they are aiming at. It sits on its own row rather than as a fourth
              cell above because a timetable image has an aspect ratio of its
              own and would either be squeezed into a 3-column cell or force the
              other three panels to its height. */}
          <TimetableSnapshot />

          {/* One outward-looking panel on an otherwise entirely self-referential
              page — what's happening in admissions beyond this one file. */}
          <CollegeNewsPanel />

          {/* The page's one input, and it sits where it does for a reason: the
              reading, then the instruction, then the student's own account of
              whether any of it happened, then the file as countable progress.
              Measurement, order, testimony, inventory. */}
          <WeeklyCheckIn data={week} />

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
