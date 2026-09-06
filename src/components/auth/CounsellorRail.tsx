import { Users, CalendarClock, FileText, ClipboardList, LineChart, Megaphone } from "lucide-react";

/**
 * The left-hand column of the counsellor sign-in screen.
 *
 * The student side of /auth runs real student reviews here. There is no
 * counsellor equivalent — we have not collected any — and inventing
 * testimonials for a portal that schools are asked to trust is not a trade
 * worth making. So this column states what the workspace actually contains
 * instead: every row below is a page that exists behind the sign-in, named
 * by what it does rather than by a claim about how well it does it.
 */

const SURFACES = [
  {
    icon: Users,
    title: "Your cohort, ranked by who needs you",
    body: "Every linked student with their profile score, what moved this week, and who has gone quiet.",
  },
  {
    icon: CalendarClock,
    title: "Meetings and follow-ups",
    body: "Schedule sessions, keep notes against a student, and carry open follow-ups day to day.",
  },
  {
    icon: FileText,
    title: "Essay and application review",
    body: "Read drafts in progress, leave feedback in place, and track where each application stands.",
  },
  {
    icon: ClipboardList,
    title: "Assignments and resources",
    body: "Set work for a class, share material, and see what came back.",
  },
  {
    icon: LineChart,
    title: "Cohort analytics",
    body: "Outcomes, score distribution and activity over time — for your classes and your school.",
  },
  {
    icon: Megaphone,
    title: "Announcements",
    body: "One message to a class or the whole cohort, delivered in-app and by email.",
  },
] as const;

export function CounsellorRail() {
  return (
    <div className="w-full max-w-lg">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Counsellor workspace
      </p>
      <h2 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-foreground">
        Everything you need to keep a cohort moving.
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Sign in to the same file your students are building — read-only where it
        should be, actionable where it counts.
      </p>

      <ul className="mt-8 space-y-5">
        {SURFACES.map(({ icon: Icon, title, body }) => (
          <li key={title} className="flex gap-3.5">
            <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground">
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{title}</p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{body}</p>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-xs leading-relaxed text-muted-foreground">
        Counsellors never see student direct messages or private chat. What is
        visible is documented in the{" "}
        <a href="/privacy" className="underline hover:text-foreground">
          privacy policy
        </a>
        .
      </p>
    </div>
  );
}
