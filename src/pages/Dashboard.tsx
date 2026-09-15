// Inter, loaded by the route that uses it. The app is set in Sora and
// Fraunces everywhere else; this is the one surface that is not, and scoping
// the import to this chunk means no other page pays for the file.
import "@fontsource-variable/inter";
import { Loader2 } from "lucide-react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useWeeklyCheckins } from "@/hooks/useWeeklyCheckins";
import { Seo } from "@/components/Seo";
import { CollegeList, GridField, News, Timetable } from "@/components/dashboard/deck";
import { WeeklyCheckIn } from "@/components/dashboard/WeeklyCheckIn";

/**
 * The signed-in home.
 *
 * Four blocks and nothing else: today's classes, the college list, the news,
 * and the weekly check-in. Everything else this page used to carry — a
 * readiness index, a next task, a deadline column, counts of essays and
 * letters and portfolio entries — was a restatement of a page that already
 * owns that data, and a home screen that restates six other pages is a
 * directory rather than a home screen.
 *
 * The order is the argument: what is happening today, what you are aiming at,
 * what is happening in the world you are aiming at, and then your own account
 * of the week.
 *
 * Everything is set in Inter and drawn in flat colour. See
 * `components/dashboard/deck.tsx` for why.
 */
export default function Dashboard() {
  const d = useDashboardData();
  const week = useWeeklyCheckins();

  if (d.loading) {
    return (
      <div className="flex min-h-[70svh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <Seo
        title="Dashboard"
        description="Your day, your list, and what's happening in admissions."
      />

      {/*
       * `data-dash` is the hook the stylesheet uses to set this whole subtree
       * in Inter, including the weekly check-in, which still carries
       * `font-display` / `font-serif` classes of its own. Scoped to this
       * element so no other route changes.
       *
       * `relative` is what the grid field positions against — it covers the
       * page's own box rather than the viewport, so it scrolls with the
       * content instead of sitting still behind it.
       */}
      {/* `bg-background` is not redundant: the token is re-declared inside
        this subtree, but the page body behind it is painted by the app's own
        warm paper colour, so without this the neutral cards sat on cream. */}
      <div data-dash className="relative min-h-screen bg-background">
        <GridField />

        {/* The measure is wide because every block on this page is a list or a
          grid, not prose — a timetable, a college list and a news column all
          read better with the horizontal room, and capping them at a reading
          measure left a band of empty paper down both sides. */}
        <div className="pad-safe-x pad-safe-bottom relative mx-auto w-full max-w-[1440px] px-4 pb-28 pt-8 sm:px-6 sm:pt-10 lg:px-8">
          <div className="space-y-4">
            {/*
             * Today is the wider of the pair because it is the block you read
             * at a glance every morning; the list is a reference you consult.
             * Both are full height so the row has one baseline.
             */}
            <div className="grid gap-4 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <Timetable />
              </div>
              <div className="lg:col-span-5">
                <CollegeList colleges={d.colleges} />
              </div>
            </div>

            <News />

            <WeeklyCheckIn data={week} />
          </div>
        </div>
      </div>
    </>
  );
}
