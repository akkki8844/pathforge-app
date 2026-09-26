// Inter, loaded by the route that uses it. The app is set in Sora and
// Fraunces everywhere else; this is the one surface that is not, and scoping
// the import to this chunk means no other page pays for the file.
import { useCallback, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useAuth } from "@/contexts/AuthContext";
import { useWeeklyCheckins } from "@/hooks/useWeeklyCheckins";
import { Seo } from "@/components/Seo";
import { CollegeList, GridField, News, Timetable } from "@/components/dashboard/deck";
import { WeeklyCheckIn } from "@/components/dashboard/WeeklyCheckIn";
import { DraggableWidgetGrid, type WidgetItem } from "@/components/ui/draggable-widget-grid";
import { DASHBOARD_WIDGETS, renderDashboardWidget } from "@/components/dashboard/widgets";
import { useZenMode } from "@/lib/zen";

/**
 * The signed-in home.
 *
 * Five blocks: today's classes, the college list, the widget board, the news,
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
/**
 * Where a student's own arrangement of the board is kept.
 *
 * Per account, so two people sharing a browser do not inherit each other's
 * layout, and local rather than a table because it is a preference about this
 * screen on this device — losing it costs a drag, not data.
 */
function layoutKey(userId: string | undefined): string {
  return `pf_dash_widgets_${userId ?? "anon"}`;
}

/**
 * The saved order, checked against the widgets that actually exist.
 *
 * A saved list is only an order: sizes and labels always come from the code, so
 * renaming or resizing a widget takes effect for everyone. Ids that no longer
 * exist are dropped and new ones are appended, which is what stops a release
 * that adds a widget from hiding it from every existing student.
 */
function readLayout(userId: string | undefined): WidgetItem[] {
  try {
    const raw = localStorage.getItem(layoutKey(userId));
    if (!raw) return DASHBOARD_WIDGETS;
    const ids = JSON.parse(raw) as unknown;
    if (!Array.isArray(ids)) return DASHBOARD_WIDGETS;
    const known = new Map(DASHBOARD_WIDGETS.map((w) => [w.id, w]));
    const ordered = ids
      .map((id) => (typeof id === "string" ? known.get(id) : undefined))
      .filter((w): w is WidgetItem => w !== undefined);
    const rest = DASHBOARD_WIDGETS.filter((w) => !ordered.includes(w));
    return [...ordered, ...rest];
  } catch {
    return DASHBOARD_WIDGETS;
  }
}

export default function Dashboard() {
  const d = useDashboardData();
  const week = useWeeklyCheckins();
  const { user } = useAuth();
  const [zen, setZen] = useZenMode();

  const initialWidgets = useMemo(() => readLayout(user?.id), [user?.id]);
  const [widgetKey] = useState(() => Math.random().toString(36).slice(2));

  const saveLayout = useCallback(
    (next: WidgetItem[]) => {
      try {
        localStorage.setItem(layoutKey(user?.id), JSON.stringify(next.map((w) => w.id)));
      } catch {
        // A browser with storage blocked keeps the arrangement for this visit
        // only. Nothing else depends on it.
      }
    },
    [user?.id],
  );

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
      <div data-dash className="relative min-h-[100svh] bg-background">
        {!zen && <GridField />}

        {/* The measure is wide because every block on this page is a list or a
          grid, not prose — a timetable, a college list and a news column all
          read better with the horizontal room, and capping them at a reading
          measure left a band of empty paper down both sides. */}
        <div className="pad-safe-x pad-safe-bottom relative mx-auto w-full max-w-[1440px] px-4 pb-28 pt-8 sm:px-6 sm:pt-10 lg:px-8">
          {zen ? (
            /* Zen mode: today, and the one date that matters next. The list,
               the widgets and the news are one keypress away, not gone. */
            <div className="mx-auto max-w-4xl space-y-4">
              <Timetable />
              <div className="max-w-sm rounded-[22px] border border-border bg-card">
                {renderDashboardWidget(DASHBOARD_WIDGETS.find((w) => w.id === "deadline")!, "sm", d)}
              </div>
              <p className="pt-2 text-center text-[13px] text-muted-foreground">
                Zen mode is on, so your list, widgets and news are tucked away.{" "}
                <button type="button" onClick={() => setZen(false)} className="font-medium text-foreground underline underline-offset-4">
                  Show everything
                </button>
              </p>
            </div>
          ) : (
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

            {/*
             * The board.
             *
             * Above the news because it is about this student and the news is
             * about the world; below today and the list because those are the
             * two blocks read every morning. Every tile is drawn from the same
             * data the rest of the page uses — see `dashboard/widgets.tsx`.
             */}
            <DraggableWidgetGrid
              key={`${widgetKey}-${user?.id ?? "anon"}`}
              items={initialWidgets}
              onChange={saveLayout}
              renderItem={(item, size) => renderDashboardWidget(item, size, d)}
              maxColumns={4}
              cellSize={260}
              rowHeight={190}
              gap={16}
              radius={16}
            />

            <News />

            <WeeklyCheckIn data={week} />
          </div>
          )}
        </div>
      </div>
    </>
  );
}
