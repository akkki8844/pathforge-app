/**
 * The counsellor workspace's destinations, declared once.
 *
 * The counsellor bar, its mega-menu and its mobile drawer all read this list,
 * so a page cannot exist in one and be missing from another — the same rule
 * `lib/routine/nav.ts` follows for the student side.
 *
 * Order is the reading order of the job, not alphabetical: the six things a
 * counsellor opens every day sit in the bar, and everything they open weekly
 * or monthly sits one level down under "Other".
 */
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  FileText,
  CalendarClock,
  BarChart3,
  Bot,
  School,
  Target,
  Megaphone,
  Mail,
  MessagesSquare,
  BookOpen,
  Award,
  Settings,
} from "lucide-react";

export interface CounsellorDestination {
  href: string;
  label: string;
  /** One line, shown under the label in the mega-menu. Says what the page is for. */
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Match this path exactly rather than as a prefix. */
  end?: boolean;
}

/** The bar itself. Six, so the row still breathes at 1280px. */
export const COUNSELLOR_MAIN: CounsellorDestination[] = [
  {
    href: "/teacher",
    label: "Today",
    description: "What needs you this morning",
    icon: LayoutDashboard,
    end: true,
  },
  {
    href: "/teacher/students",
    label: "Students",
    description: "Every student linked to you",
    icon: Users,
  },
  {
    href: "/teacher/applications",
    label: "Applications",
    description: "Where each application stands",
    icon: ClipboardList,
  },
  {
    href: "/teacher/essays",
    label: "Essays",
    description: "Drafts waiting on your read",
    icon: FileText,
  },
  {
    href: "/teacher/meetings",
    label: "Meetings",
    description: "Sessions booked and logged",
    icon: CalendarClock,
  },
  {
    href: "/teacher/analytics",
    label: "Analytics",
    // Not "over time": the page has no time series. It reports the cohort as
    // it stands - score spread, risk split, engagement, grade and major
    // distribution - and a menu line promising trends sends a counsellor
    // looking for a chart that is not there.
    description: "Score spread, risk and engagement",
    icon: BarChart3,
  },
];

export interface CounsellorGroup {
  title: string;
  links: CounsellorDestination[];
}

/** Everything that is not in the bar, grouped into the one "Other" menu. */
export const COUNSELLOR_OTHER: CounsellorGroup[] = [
  {
    title: "Cohort",
    links: [
      {
        href: "/teacher/school",
        label: "School view",
        description: "The whole school, not just your list",
        icon: School,
      },
      {
        href: "/teacher/classes",
        label: "Cohorts",
        description: "Groups you have made",
        icon: Users,
      },
      {
        href: "/teacher/assignments",
        label: "Action plan",
        description: "Work set per student",
        icon: Target,
      },
    ],
  },
  {
    title: "Reach out",
    links: [
      {
        href: "/teacher/announcements",
        label: "Announcements",
        description: "One message to a class or the cohort",
        icon: Megaphone,
      },
      {
        href: "/teacher/messages",
        label: "Messages",
        description: "Direct messages with a student",
        icon: Mail,
      },
      {
        href: "/teacher/feedback",
        label: "Feedback log",
        description: "Everything you have sent a student",
        icon: MessagesSquare,
      },
    ],
  },
  {
    /*
     * Copilot used to sit under "Reach out", beside Announcements and
     * Messages. It does not reach out to anybody — it reads the cohort and
     * answers questions about it, which is the same job as the two reference
     * surfaces below it. Grouping is the only thing telling a new counsellor
     * what a page is for before they open it, so it has to be right.
     */
    title: "Tools",
    links: [
      {
        href: "/teacher/copilot",
        label: "Copilot",
        description: "Ask about your own cohort's data",
        icon: Bot,
      },
      {
        href: "/teacher/scholarships",
        label: "Scholarships",
        description: "Awards to point students at",
        icon: Award,
      },
      {
        href: "/teacher/resources",
        label: "Resources",
        description: "Material you share with a class",
        icon: BookOpen,
      },
      {
        href: "/teacher/settings",
        label: "Settings",
        description: "Your profile and school link",
        icon: Settings,
      },
    ],
  },
];

/** Flat list of every counsellor destination, bar and menu together. */
export const COUNSELLOR_ALL: CounsellorDestination[] = [
  ...COUNSELLOR_MAIN,
  ...COUNSELLOR_OTHER.flatMap((g) => g.links),
];

/**
 * Which destination a path belongs to.
 *
 * `/teacher/students/:id` has no nav item of its own, so it resolves to
 * Students; `/teacher/onboarding` resolves to Today. Anything unmatched
 * returns null and the bar simply shows nothing as current, which is honest.
 */
export function activeCounsellorHref(pathname: string): string | null {
  if (pathname === "/teacher" || pathname === "/teacher/onboarding") return "/teacher";
  const match = COUNSELLOR_ALL.filter((d) => !d.end)
    .filter((d) => pathname === d.href || pathname.startsWith(d.href + "/"))
    // Longest prefix wins, so /teacher/students/:id does not also match a
    // shorter sibling if one is ever added.
    .sort((a, b) => b.href.length - a.href.length)[0];
  return match?.href ?? null;
}
