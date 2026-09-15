import { NAVBAR_MAIN_LINKS, type NavItem } from "@/components/layout/Navbar";

/**
 * The script for the product tour Bloub gives a new student.
 *
 * Scope is deliberately exactly the nav bar: the seven top-level destinations
 * in `NAVBAR_MAIN_LINKS`, in the order they appear there. Nothing under
 * "Other", nothing off the bar. The stops below are keyed by href and the
 * running order is read off the nav array itself, so adding a page to the bar
 * adds a stop to the tour and reordering the bar reorders the tour.
 *
 * A step may name a `target` — always a `[data-tour="…"]` attribute, never a
 * class or an nth-child, which break the first time someone reflows a header.
 * A step with no target, or whose target is not in the DOM when the stop
 * opens, is shown as a centred card instead of being dropped. That matters
 * here in a way it does not in `JourneyTour`: this tour crosses seven routes,
 * each of which can be mid-fetch, and a student who signed up ninety seconds
 * ago has empty state on most of them. A tour that silently skipped every page
 * with no data yet would show a new user almost nothing.
 */

export type TourMood = "idle" | "happy" | "wink" | "thinking";

export interface TourStep {
  /** CSS selector for the element to spotlight. Omit for a centred card. */
  target?: string;
  title: string;
  body: string;
  /** Which side of the target the card prefers. Auto-flips when it won't fit. */
  placement?: "top" | "bottom" | "left" | "right" | "center";
  /** Bloub's expression while this step is on screen. */
  mood?: TourMood;
}

export interface TourStop {
  href: string;
  label: string;
  icon: NavItem["icon"];
  /** One line under the page name on the chapter card between stops. */
  tagline: string;
  steps: TourStep[];
}

/**
 * Per-page scripts, keyed by the href in the nav bar.
 *
 * Bodies are written for someone on their first day, so they name the action
 * to take rather than describing the feature.
 */
const SCRIPT: Record<string, { tagline: string; steps: TourStep[] }> = {
  "/journey": {
    tagline: "Fifteen levels. Start here.",
    steps: [
      {
        title: "Journey is the spine of all of this",
        body: "Fifteen levels and three hundred quests, ordered so that finishing one makes the next easier. When you do not know what to do next, this page always has an answer.",
        mood: "happy",
      },
      {
        target: '[data-tour="journey-banner"]',
        title: "The banner names your one next action",
        body: "It always shows the level you are on and the single thing that moves you forward. Read it first every time you land here — everything else on the page is detail.",
        placement: "bottom",
      },
      {
        target: '[data-tour="journey-stats"]',
        title: "Streak, gems and hearts",
        body: "Streak counts consecutive days you finished something. Gems are one per level. Hearts are a monthly budget — a week with nothing completed costs one.",
        placement: "bottom",
        mood: "wink",
      },
    ],
  },
  "/advisor": {
    tagline: "The one that talks back.",
    steps: [
      {
        title: "Advisor has already read your file",
        body: "Your profile, your activities, your essays and your targets. So you can ask whether your list is realistic instead of pasting your whole life in first.",
        mood: "thinking",
      },
      {
        title: "Talk to it, do not prompt it",
        body: "Hold the mic and speak, or type. Ask it to tear an essay apart, argue with its shortlist, make it explain why it said what it said. It is meant to push back.",
        mood: "happy",
      },
    ],
  },
  "/outcomes": {
    tagline: "The record, not the intention.",
    steps: [
      {
        title: "Outcomes is what actually happened",
        body: "Results, awards, published work, placements — the things a reader can verify. Everything logged here feeds your profile score and the admissions estimates.",
        mood: "idle",
      },
      {
        title: "Add one now, even a small one",
        body: "A single logged outcome changes what the Advisor and the Admissions page can tell you. An empty record is the reason most first estimates come back vague.",
        mood: "happy",
      },
    ],
  },
  "/lor": {
    tagline: "Recommenders, managed.",
    steps: [
      {
        title: "Professors is where recommendations live",
        body: "Track who you have asked, what you sent them, and where each letter stands — instead of finding out in December that one was never started.",
        mood: "idle",
      },
      {
        title: "Give them something to write from",
        body: "Each recommender gets a brief built from your own record: what you did with them, when, and what you would like the letter to carry. Vague asks produce vague letters.",
        mood: "thinking",
      },
    ],
  },
  "/communications/chats": {
    tagline: "You, your teams, your counsellor.",
    steps: [
      {
        title: "Chats is the messaging side of Pathforge",
        body: "Direct messages, group chats and your team workspaces, all in one thread list. Your counsellor can reach you here, and you can reach them.",
        mood: "happy",
      },
      {
        title: "What your counsellor can and cannot see",
        body: "Counsellors see team names, objectives and a summary. They never see your direct messages or private chat. That is enforced in the database, not by a hidden button.",
        mood: "idle",
      },
    ],
  },
  "/activities": {
    tagline: "Everything you do, in one list.",
    steps: [
      {
        title: "Activities is the long version of your CV",
        body: "Clubs, jobs, research, sport, the thing you built at 2am. Log it here once and it feeds your resume, your applications and your profile score.",
        mood: "idle",
      },
      {
        title: "Depth beats length",
        body: "Six activities you can talk about for ten minutes each read better than twenty you joined. Write the description as if someone will ask a follow-up — because they will.",
        mood: "thinking",
      },
    ],
  },
  "/weekly-planner": {
    tagline: "Where the deadlines land.",
    steps: [
      {
        title: "Calendar is the deadline surface",
        body: "Application dates, meetings, and anything you accepted as an objective all land here. If a date matters and it is not on this page, it will be missed.",
        mood: "idle",
      },
      {
        title: "That is the tour",
        body: "Seven pages, one file. Everything else lives under Other in the bar — Routine, the builders, scholarships, past admits. Go and break something.",
        mood: "happy",
      },
    ],
  },
};

/**
 * The tour, in nav-bar order.
 *
 * Any bar item with no script yet still becomes a stop, with a single generic
 * step naming the page — better a thin stop than a tour that quietly skips a
 * page the student can see in the bar the whole time.
 */
export const TOUR_STOPS: TourStop[] = NAVBAR_MAIN_LINKS.map((link) => {
  const scripted = SCRIPT[link.href];
  return {
    href: link.href,
    label: link.label,
    icon: link.icon,
    tagline: scripted?.tagline ?? "",
    steps: scripted?.steps ?? [
      {
        title: link.label,
        body: `${link.label} is one of the pages in your top bar. Have a look around.`,
        mood: "idle" as TourMood,
      },
    ],
  };
});

/** Flat step count, for the progress readout. */
export const TOUR_TOTAL_STEPS = TOUR_STOPS.reduce((n, s) => n + s.steps.length, 0);

// Re-exported so callers of this module get the keys alongside the script.
// They are declared in `keys.ts`, which imports nothing, so `TourProvider` can
// read them without pulling this file (and Navbar, and the whole script) in.
export { PRODUCT_TOUR_PENDING_KEY, PRODUCT_TOUR_SEEN_KEY } from "@/lib/tour/keys";

/** The anchor a stop falls back to: its own item in the nav bar. */
export function navAnchorFor(href: string) {
  return `[data-tour="nav:${href}"]`;
}
