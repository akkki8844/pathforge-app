import type { TourStep } from "@/components/ui/product-tour";

/**
 * The Pathforge product tour script: one flat list of stops across the whole
 * signed-in app.
 *
 * WHY FLAT AND NOT NESTED BY PAGE
 *
 * The `Tour` component in `components/ui/product-tour.tsx` is a single-list
 * component — it owns one `index` into one `steps` array, and its Back/Next and
 * its "4 / 23" readout all count that one array. Keeping the script flat means
 * the component's own navigation is the tour's navigation, with nothing
 * reimplemented on top of it. The only thing this file adds over its `TourStep`
 * is `route`: which page the step belongs to. `PathforgeTour` reads that and
 * drives the router, so the component itself never learns that routing exists.
 *
 * SCOPE
 *
 * Every department of the product, in the order the navbar presents it: the
 * seven top-level pages first, then each group under "Other" — Builders,
 * Preparation, Resources, Routine, Test Prep, the rest of Communications —
 * then notifications, the account menu and Settings. A student who sits
 * through this has been shown every section of Pathforge that exists.
 *
 * TARGETS
 *
 * Always a `[data-tour="…"]` attribute, never a class or an nth-child, both of
 * which break the first time someone reflows a header. A step whose target is
 * missing is not dropped — the component falls back to a centred card over a
 * dimmed page, which is the right outcome for a student who signed up ninety
 * seconds ago and has empty state on half these pages. The navbar targets are
 * inside a `hidden lg:flex` container, so on a phone they resolve to nothing
 * and those steps centre themselves. That is deliberate, not a gap.
 *
 * COPY
 *
 * Written for someone on their first day, so each one names the thing to do
 * rather than describing the feature. Nothing here claims a number or a
 * behaviour the app does not actually have.
 */

export interface PathforgeTourStep extends TourStep {
  /** The route this step is shown on. The host navigates before it opens. */
  route: string;
}

export const PATHFORGE_TOUR: PathforgeTourStep[] = [
  // ── Orientation ──────────────────────────────────────────────────────
  {
    route: "/dashboard",
    placement: "center",
    title: "Welcome to Pathforge",
    content:
      "Two minutes and you will know where everything is. You can leave at any point with Esc or the cross — nothing here is required.",
  },
  {
    route: "/dashboard",
    target: '[data-tour="nav:bar"]',
    placement: "bottom",
    title: "Seven pages live up here",
    content:
      "Journey, Advisor, Outcomes, Professors, Chats, Activities and Calendar. Everything else in the product sits under Other, at the end of the bar.",
  },

  // ── Journey ──────────────────────────────────────────────────────────
  {
    route: "/journey",
    target: '[data-tour="journey-banner"]',
    placement: "bottom",
    title: "Journey names your next action",
    content:
      "Fifteen levels of quests, ordered so finishing one makes the next easier. When you do not know what to do next, read this banner first — the rest of the page is detail.",
  },
  {
    route: "/journey",
    target: '[data-tour="journey-stats"]',
    placement: "bottom",
    title: "Streak, gems and hearts",
    content:
      "Streak counts consecutive days you finished something. Gems are one per level. Hearts are a monthly budget — a week with nothing completed costs one.",
  },
  {
    route: "/journey",
    target: '[data-tour="journey-path"]',
    placement: "top",
    title: "Every quest is proof-gated",
    content:
      "A task is not done because you ticked it. You upload something that shows you did it, which is what makes a finished level worth putting in front of an admissions officer.",
  },
  {
    route: "/journey",
    target: '[data-tour="journey-leaderboard"]',
    placement: "left",
    title: "Where you stand",
    content:
      "Ranked against other students working the same path. Useful as a pace check, not as a score — someone ahead of you started earlier.",
  },

  // ── Advisor ──────────────────────────────────────────────────────────
  {
    route: "/advisor",
    placement: "center",
    title: "The Advisor has already read your file",
    content:
      "Your profile, activities, essays and target schools. So you can ask whether your list is realistic instead of pasting your whole life in first. Type, or hold the mic and talk.",
  },
  {
    route: "/advisor",
    placement: "center",
    title: "Argue with it",
    content:
      "Ask it to tear an essay apart, challenge its shortlist, make it explain why it said what it said. It is built to push back, and it can take you straight to the page you need.",
  },

  // ── Outcomes ─────────────────────────────────────────────────────────
  {
    route: "/outcomes",
    placement: "center",
    title: "Outcomes is what actually happened",
    content:
      "Results, awards, published work, placements — things a reader can verify. Log one now, even a small one: an empty record is why most first admissions estimates come back vague.",
  },

  // ── Professors ───────────────────────────────────────────────────────
  {
    route: "/professors",
    placement: "center",
    title: "Professors tracks your recommenders",
    content:
      "Who you asked, what you sent them, and where each letter stands — instead of finding out in December that one was never started. Each recommender gets a brief built from your own record.",
  },

  // ── Chats ────────────────────────────────────────────────────────────
  {
    route: "/communications/chats",
    placement: "center",
    title: "Chats is the messaging side",
    content:
      "Direct messages, group chats and team workspaces in one thread list. Your counsellor can reach you here, and you can reach them.",
  },
  {
    route: "/communications/chats",
    placement: "center",
    title: "What your counsellor cannot see",
    content:
      "Counsellors see team names, objectives and a summary. Never your direct messages. That is enforced in the database itself, not by a hidden button.",
  },

  // ── Activities ───────────────────────────────────────────────────────
  {
    route: "/activities",
    placement: "center",
    title: "Activities is the long version of your CV",
    content:
      "Clubs, jobs, research, sport, the thing you built at 2am. Logged once here, it feeds your resume, your applications and your profile score. Depth beats length every time.",
  },

  // ── Calendar ─────────────────────────────────────────────────────────
  {
    route: "/routine/calendar",
    placement: "center",
    title: "Calendar holds every date that matters",
    content:
      "Application dates, meetings and anything you accepted as an objective. Drag an event to reschedule it and it saves everywhere. Task deadlines stay put on purpose.",
  },

  // ── Other ────────────────────────────────────────────────────────────
  {
    route: "/routine/calendar",
    target: '[data-tour="nav:other"]',
    placement: "bottom",
    title: "Everything else is under Other",
    content:
      "Six departments: Builders, Preparation, Resources, Routine, Test Prep and the rest of Communications. The next few stops walk one page from each.",
  },
  {
    route: "/application-builder",
    placement: "center",
    title: "Builders write the documents",
    content:
      "Application Builder, Resume, Essays and LinkedIn. They all read the profile and activities you have already entered, so none of them start from a blank page.",
  },
  {
    route: "/admissions-probability",
    placement: "center",
    title: "Preparation tells you where you stand",
    content:
      "Admissions odds per school, the requirements each one actually asks for, and a readiness check. The more you have logged, the less hedged these get.",
  },
  {
    route: "/scholarships",
    placement: "center",
    title: "Resources is the research shelf",
    content:
      "Scholarships you may be eligible for, past admits with real profiles, and exemplar essays. Read a few exemplars before you draft anything.",
  },
  {
    route: "/routine/today",
    placement: "center",
    title: "Routine runs your week",
    content:
      "Today, a timetable, a study planner, focus sessions, reminders and goals. This is the day-to-day layer under the long-term plan that Journey holds.",
  },
  {
    route: "/test-prep/sat",
    placement: "center",
    title: "Test Prep",
    content:
      "The SAT section is built — drills, a question bank and score tracking. The other tests are listed in the menu so you can see what is coming, and open when they are ready.",
  },
  {
    route: "/communications/objectives",
    placement: "center",
    title: "Objectives, Teams and Announcements",
    content:
      "Commitments picked out of your team chats become objectives, and an accepted objective becomes a real deadline on your Calendar. One record, not two.",
  },

  // ── The chrome ───────────────────────────────────────────────────────
  {
    route: "/communications/objectives",
    target: '[data-tour="nav:notifications"]',
    placement: "bottom",
    title: "Notifications",
    content:
      "Deadlines coming up, replies, counsellor announcements and anything that changed while you were away. Worth a look each time you sign in.",
  },
  {
    route: "/profile",
    target: '[data-tour="nav:account"]',
    placement: "bottom",
    title: "Your account and settings",
    content:
      "Profile, connectors and billing live here. Settings › Usage shows what is left of your plan allowance as a percentage — free plans refill daily, paid plans monthly.",
  },
  {
    route: "/profile",
    placement: "center",
    title: "That is the whole product",
    content:
      "You can run this tour again any time from Settings. Now go and put something real in Outcomes — everything else on this site gets sharper once you do.",
  },
];

export const PATHFORGE_TOUR_LENGTH = PATHFORGE_TOUR.length;
