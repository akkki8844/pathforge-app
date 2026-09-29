import { COMMUNICATIONS_DESTINATIONS } from "@/lib/comms/nav";
import { ROUTINE_DESTINATIONS } from "@/lib/routine/nav";
import { TEST_PREP_TESTS } from "@/lib/testprep/nav";
import type { StationId } from "./stage";

/*
 * Where each part of the app lives in the room.
 *
 * Every page the navigation bar reaches is filed under the object it belongs
 * with, so the room is a map of the app: essays and the application builders
 * at the binder on the desk, messages on the phone, the college tools on the
 * pinboard, test prep on the shelf. A station's panel lists its pages under
 * its own figures, and the directory by the door says where each page lives.
 * Descriptions reuse each section's own nav copy where it has one.
 */

export type PageLink = { label: string; href: string; note: string };

const routine = (href: string): PageLink => {
  const d = ROUTINE_DESTINATIONS.find((x) => x.href === href);
  return { label: d?.label ?? href, href, note: d?.description ?? "" };
};

export const PAGES: Partial<Record<StationId, PageLink[]>> = {
  laptop: [routine("/routine/study-planner")],
  board: [routine("/routine/reminders")],
  notebook: [
    { label: "Essay Builder", href: "/essays", note: "Draft, refine and track every essay" },
    { label: "Application Builder", href: "/application-builder", note: "Each school's application, section by section" },
    { label: "Exemplar Essays", href: "/exemplar-essays", note: "Essays that worked, and why" },
    { label: "Resume Builder", href: "/resume", note: "Your activities as a one-page resume" },
    { label: "LinkedIn Builder", href: "/profile-builder", note: "A profile built from your record" },
  ],
  phone: [
    ...COMMUNICATIONS_DESTINATIONS.map((d) => ({ label: d.label, href: d.href, note: d.description })),
    { label: "Professors", href: "/professors", note: "Reach out to faculty in your field" },
  ],
  compass: [
    { label: "Journey", href: "/journey", note: "Your quests, level by level" },
    { label: "Outcomes", href: "/outcomes", note: "Where your profile stands, and what moves it" },
    { label: "Readiness", href: "/college-readiness", note: "Your record against each school's bar" },
  ],
  clock: [routine("/routine/timetable"), { label: "Requirements", href: "/requirements", note: "Deadlines and what each school asks for" }],
  calendar: [routine("/routine/calendar")],
  pinboard: [
    { label: "Dashboard", href: "/dashboard", note: "Add schools and see the full picture" },
    { label: "Admissions", href: "/admissions-probability", note: "Your chances at each school" },
    { label: "Past Admits", href: "/past-admits", note: "Who got in, with what" },
    { label: "Scholarships", href: "/scholarships", note: "Funding you can apply for" },
  ],
  shelves: [{ label: "Documents", href: "/docs", note: "Everything you have written or uploaded" }],
  books: TEST_PREP_TESTS.filter((t) => t.available).map((t) => ({
    label: t.label,
    href: t.href,
    note: "Practice, question bank and full exams",
  })),
  trophy: [
    { label: "Activities", href: "/activities", note: "Your activities, honours and roles" },
    { label: "Outcomes", href: "/outcomes", note: "How they add up" },
  ],
  reader: [{ label: "Advisor", href: "/advisor", note: "Talk it through with your advisor" }],
};

/** The station a page lives at, for the directory's "at the ..." notes. */
export function stationOfPage(href: string): StationId | undefined {
  for (const [id, pages] of Object.entries(PAGES) as Array<[StationId, PageLink[]]>) {
    if (pages.some((p) => p.href === href)) return id;
  }
  return undefined;
}
