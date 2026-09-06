// Inter, loaded by the route that uses it — the same font the student home
// pulls in, for the same reason: this surface is not selling anything.
import "@fontsource-variable/inter";
import { useMemo } from "react";
import { TeacherLayout } from "@/components/teacher/TeacherLayout";
import { GridField, News } from "@/components/dashboard/deck";
import {
  CohortCard, CohortSummary, ColleaguesCard, FollowupsCard, RosterCard,
  SignalsCard, TodayCard,
} from "@/components/teacher/counsellorDeck";
import { useTeacherRoster } from "@/hooks/useTeacherRoster";
import { useCounselorActivity } from "@/hooks/useCounselorActivity";
import { useCounselorFollowups } from "@/hooks/useCounselorFollowups";

/**
 * The counsellor home.
 *
 * Deliberately the student dashboard with different data in it: same Inter
 * subtree, same flat cards on the same grid field, same rule that exactly one
 * card is filled. A counsellor and a student who sit next to each other should
 * recognise the same product.
 *
 * The order is the argument, as it is on the student side: what needs you
 * today, who you are responsible for, what you have promised to come back to,
 * what the platform noticed on its own, and then the full roster you consult
 * rather than read.
 */
export default function TeacherDashboard() {
  const { students, loading } = useTeacherRoster();

  const studentIds = useMemo(() => students.map((s) => s.user_id), [students]);
  const nameMap = useMemo(
    () => new Map(students.map((s) => [s.user_id, s.username || s.email || "Student"])),
    [students],
  );
  const scoreMap = useMemo(
    () => new Map(students.map((s) => [s.user_id, s.overall_score])),
    [students],
  );

  const { recent, deadlines, inactive, loading: activityLoading } =
    useCounselorActivity({ studentIds, nameMap, scoreMap });
  const { items: followups } = useCounselorFollowups();

  return (
    <TeacherLayout>
      {/*
       * `data-dash` is the hook the stylesheet uses to set this subtree in
       * Inter and re-declare the neutrals cool. Scoped here so the rest of the
       * counsellor workspace is untouched.
       */}
      <div data-dash className="relative -mx-5 -my-6 min-h-screen bg-background lg:-mx-8 lg:-my-8 xl:-mx-12">
        <GridField />

        <div className="pad-safe-x pad-safe-bottom relative mx-auto w-full max-w-[1200px] px-5 pb-28 pt-10 sm:px-8 sm:pt-14">
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <TodayCard students={students} followups={followups} inactive={inactive} />
              </div>
              <div className="lg:col-span-5">
                <CohortCard students={students} loading={loading} />
              </div>
            </div>

            <CohortSummary students={students} inactiveCount={inactive.length} />

            <FollowupsCard students={students} />

            <SignalsCard
              recent={recent}
              deadlines={deadlines}
              inactive={inactive}
              loading={activityLoading}
            />

            <div className="grid gap-4 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <News />
              </div>
              <div className="lg:col-span-5">
                <ColleaguesCard />
              </div>
            </div>

            <RosterCard students={students} loading={loading} />
          </div>
        </div>
      </div>
    </TeacherLayout>
  );
}
