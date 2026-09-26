// Inter, loaded by the route that uses it — the same font the student home
// pulls in, for the same reason: this surface is not selling anything.
import "@fontsource-variable/inter";
import { useMemo } from "react";
import { TeacherLayout } from "@/components/teacher/TeacherLayout";
import { Seo } from "@/components/Seo";
import { GridField, News } from "@/components/dashboard/deck";
import {
  CohortCard, CohortSummary, ColleaguesCard, FollowupsCard, Masthead, RosterCard,
  SignalsCard, TodayCard,
} from "@/components/teacher/counsellorDeck";
import {
  ApplyingCard, DeadlinesCard, QueueCard,
} from "@/components/teacher/counsellorPipeline";
import { useTeacherRoster } from "@/hooks/useTeacherRoster";
import { useCounselorActivity } from "@/hooks/useCounselorActivity";
import { useCounselorFollowups } from "@/hooks/useCounselorFollowups";
import { useCounsellorQueue } from "@/hooks/useCounsellorQueue";

/**
 * The counsellor home.
 *
 * Deliberately the student dashboard with different data in it: same Inter
 * subtree, same flat cards on the same grid field, same rule that exactly one
 * card is filled. A counsellor and a student who sit next to each other should
 * recognise the same product.
 *
 * The order is an argument about a counsellor's morning, and each row answers
 * one question:
 *
 *   1. Who am I and what day is it.
 *   2. What needs me first, and what is sitting in my own queue.
 *   3. The cohort in five numbers.
 *   4. Who I am responsible for, and what is dated soonest.
 *   5. Where the whole list is aiming — the view no single student page gives.
 *   6. What I promised to come back to.
 *   7. What the platform noticed on its own.
 *   8. What is happening in admissions, and who else is on this with me.
 *   9. The full roster, which is consulted rather than read.
 *
 * Every number on the page is counted from a row that exists. Nothing is
 * estimated to make a card look finished.
 */
export default function TeacherDashboard() {
  const { students, loading } = useTeacherRoster();

  const studentIds = useMemo(() => students.map((s) => s.user_id), [students]);
  const nameMap = useMemo(
    () => new Map(students.map((s) => [s.user_id, s.full_name || s.email || "Student"])),
    [students],
  );
  const scoreMap = useMemo(
    () => new Map(students.map((s) => [s.user_id, s.overall_score])),
    [students],
  );

  const { recent, deadlines, inactive, loading: activityLoading } =
    useCounselorActivity({ studentIds, nameMap, scoreMap });
  const { items: followups } = useCounselorFollowups();
  const { essays, meetings, loading: queueLoading } = useCounsellorQueue(studentIds);

  return (
    <TeacherLayout bare>
      <Seo
        title="Counsellor home"
        description="Your cohort, your queue, and what needs you today."
        path="/teacher"
        noindex
      />

      {/*
       * `data-dash` is the hook the stylesheet uses to set this subtree in
       * Inter and re-declare the neutrals cool. Scoped here so the rest of the
       * counsellor workspace is untouched.
       */}
      <div data-dash className="relative min-h-[100svh] bg-background">
        <GridField />

        <div className="pad-safe-x pad-safe-bottom relative mx-auto w-full max-w-[1200px] px-5 pb-28 pt-10 sm:px-8 sm:pt-14">
          <div className="space-y-4">
            <Masthead students={students} loading={loading} />

            <div className="grid gap-4 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <TodayCard
                  students={students}
                  followups={followups}
                  inactive={inactive}
                  essays={essays}
                />
              </div>
              <div className="lg:col-span-5">
                <QueueCard
                  essays={essays}
                  meetings={meetings}
                  students={students}
                  loading={queueLoading}
                />
              </div>
            </div>

            <CohortSummary
              students={students}
              inactiveCount={inactive.length}
              essayCount={essays.length}
            />

            <div className="grid gap-4 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <CohortCard students={students} loading={loading} />
              </div>
              <div className="lg:col-span-5">
                <DeadlinesCard deadlines={deadlines} loading={activityLoading} />
              </div>
            </div>

            <ApplyingCard students={students} loading={loading} />

            <FollowupsCard students={students} />

            <SignalsCard recent={recent} inactive={inactive} loading={activityLoading} />

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
