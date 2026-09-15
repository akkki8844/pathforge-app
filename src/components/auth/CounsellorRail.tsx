import { Users, CalendarClock, FileText, LineChart } from "lucide-react";
import { UniversityStrip } from "@/components/auth/UniversityStrip";
import { CounsellorWorkspaceWall } from "@/components/auth/CounsellorWorkspaceWall";

/**
 * The left-hand column of the counsellor sign-in screen.
 *
 * The student side of /auth runs real student reviews here. There is no
 * counsellor equivalent — none have been collected — and inventing testimonials
 * for a portal that schools are asked to trust is not a trade worth making. So
 * this column states what the workspace actually contains instead: every row
 * below is a page that exists behind the sign-in, named by what it does rather
 * than by a claim about how well it does it.
 *
 * Four rows, not six. The previous version listed every surface in the product,
 * which is a sitemap; this is the argument for signing in.
 */

const SURFACES = [
  {
    icon: Users,
    title: "Your cohort, ordered by who needs you",
    body: "Every linked student with their profile score, what moved this week, and who has gone quiet.",
  },
  {
    icon: FileText,
    title: "Drafts and applications in one queue",
    body: "Read essays in progress, leave feedback in place, and track where each application stands.",
  },
  {
    icon: CalendarClock,
    title: "Meetings, notes and follow-ups",
    body: "Book sessions, keep notes against a student, and carry open follow-ups day to day.",
  },
  {
    icon: LineChart,
    title: "Cohort analytics",
    body: "Outcomes, score distribution and activity over time, for your classes and your school.",
  },
] as const;

export function CounsellorRail() {
  return (
    <div className="w-full">
      <h2 className="text-[clamp(1.75rem,2.6vw,2.5rem)] font-semibold leading-[1.1] tracking-[-0.035em]">
        Everything you need to keep a cohort moving.
      </h2>
      <p className="mt-4 max-w-[46ch] text-[15px] leading-relaxed text-white/70">
        Sign in to the same file your students are building — read-only where it
        should be, actionable where it counts.
      </p>

      <ul className="mt-9 space-y-5">
        {SURFACES.map(({ icon: Icon, title, body }) => (
          <li key={title} className="flex gap-3.5">
            <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-white/20 bg-white/10">
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[15px] font-semibold leading-snug">{title}</p>
              <p className="mt-1 max-w-[52ch] text-[13.5px] leading-relaxed text-white/65">
                {body}
              </p>
            </div>
          </li>
        ))}
      </ul>

      {/* The four rows above are the argument; this is the shape of the thing
          they describe — every counsellor page, crawling past on a tilted
          plane. Hidden below xl, where the rail is already the shorter half of
          a split screen and a 26rem wall would push the university strip off
          the fold. */}
      <CounsellorWorkspaceWall className="mt-8 hidden xl:flex" />

      <UniversityStrip onDark className="mt-10" />

      <p className="mt-8 max-w-[52ch] text-[12px] leading-relaxed text-white/55">
        Counsellors never see student direct messages or private chat. What is
        visible is documented in the{" "}
        <a href="/privacy" className="underline hover:text-white">
          privacy policy
        </a>
        .
      </p>
    </div>
  );
}
