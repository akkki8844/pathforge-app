import {
  Award,
  BadgeCheck,
  BookOpen,
  Briefcase,
  Flag,
  GraduationCap,
  HeartHandshake,
  Microscope,
  Palette,
  Trophy,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { listEntries, type LoggedEntry, type RecordKind } from "@/lib/outcomesRecord";
import type { SignalId } from "@/lib/outcomesScoring";
import type { OutcomesProfile } from "@/hooks/useOutcomesData";

/**
 * How the Outcomes record is divided: one category per section.
 *
 * The version before this merged eleven kinds into eight sections, so three of
 * them carried two add buttons: "Add leadership" beside "Add activity", "Add
 * competition" beside "Add award", "Add research" beside "Add publication".
 * A student wanting to log a club had to first decide whether a club is a
 * leadership role, and then found that decision expressed as a choice between
 * two buttons in a section header. That is a taxonomy question asked at the
 * exact moment someone is trying to write down a thing they did. Each category
 * is its own section now: the kind is settled by which section you are in, and
 * every section has one add control.
 *
 * The table lives here rather than beside the components so the index rail,
 * the identity card and the sections themselves all read the same list, and so
 * none of them has to know the kind-to-section mapping twice.
 *
 * Nothing here changes storage. `outcomesRecord` still maps every kind onto
 * the same seven jsonb lists, so a record saved before this split loads and
 * scores exactly as it did.
 */
export interface RecordSectionSpec {
  id: string;
  title: string;
  icon: LucideIcon;
  /**
   * What the add control says.
   *
   * Written out rather than derived from the title: stripping a trailing "s"
   * turns "Activities" into "Add activitie", and every pluralisation rule that
   * fixes that one breaks another. Twelve strings is cheaper than a rule.
   */
  addLabel: string;
  /** Shown when the section is empty: one sentence on what belongs here. */
  blurb: string;
  /** The single kind this section adds. Absent for coursework, which is a timetable. */
  kind?: RecordKind;
  /**
   * The scorer signal this section drives, when it drives one on its own.
   *
   * Deliberately absent on Activities, Awards and Publications: each shares a
   * stored list, and so a signal, with the section above it. Printing the same
   * "40% of bar" on both halves of one signal would report it twice and read
   * as two independent measurements.
   */
  signal?: SignalId;
}

/** Order runs strongest-evidence-first the way a CV does. */
export const RECORD_SECTIONS: RecordSectionSpec[] = [
  {
    id: "experience",
    title: "Experience",
    icon: Briefcase,
    addLabel: "Add experience",
    blurb: "Internships, placements, shadowing, studio time and paid work.",
    kind: "work",
    signal: "internships",
  },
  {
    id: "leadership",
    title: "Leadership",
    icon: Users,
    addLabel: "Add leadership role",
    blurb: "Roles where a team answered to you.",
    kind: "leadership",
    signal: "leadership",
  },
  {
    id: "activities",
    title: "Activities",
    icon: Flag,
    addLabel: "Add activity",
    blurb: "The clubs, sports and ensembles you are part of.",
    kind: "activity",
  },
  {
    id: "projects",
    title: "Projects",
    icon: Wrench,
    addLabel: "Add project",
    blurb: "Things you built, wrote or ran on your own initiative.",
    kind: "project",
    signal: "initiative",
  },
  {
    id: "competitions",
    title: "Competitions",
    icon: Trophy,
    addLabel: "Add competition",
    blurb: "Anything an outside body ran, judged and published a result for.",
    kind: "competition",
    signal: "competition",
  },
  {
    id: "awards",
    title: "Awards",
    icon: Award,
    addLabel: "Add award",
    blurb: "Honours handed to you rather than entered for.",
    kind: "award",
  },
  {
    id: "research",
    title: "Research",
    icon: Microscope,
    addLabel: "Add research",
    blurb: "Papers, posters, preprints and work under a mentor.",
    kind: "research",
    signal: "research_output",
  },
  {
    id: "publications",
    title: "Publications",
    icon: BookOpen,
    addLabel: "Add publication",
    blurb: "Anything of yours that ran under an editor.",
    kind: "publication",
  },
  {
    id: "volunteering",
    title: "Volunteering",
    icon: HeartHandshake,
    addLabel: "Add volunteering",
    blurb: "Community, civic and charitable work. Say what changed with a number.",
    kind: "service",
    signal: "service_impact",
  },
  {
    id: "portfolio",
    title: "Portfolio",
    icon: Palette,
    addLabel: "Add portfolio piece",
    blurb: "Writing, design, music, film or software with an actual audience.",
    kind: "portfolio",
    signal: "creative_portfolio",
  },
  {
    id: "certifications",
    title: "Certifications",
    icon: BadgeCheck,
    addLabel: "Add certification",
    blurb: "Credentials an external body examined you for and issued.",
    kind: "certification",
  },
  {
    id: "coursework",
    title: "Coursework",
    icon: GraduationCap,
    addLabel: "Add course",
    blurb: "Your timetable, and the level each class is taught at.",
  },
];

/** The section list, for anything that needs to jump into the record. */
export const RECORD_SECTION_IDS = RECORD_SECTIONS.map((s) => s.id);

/** How much of a section is on file, and how much of it is proved. */
export interface SectionCount {
  total: number;
  verified: number;
}

/**
 * Entry counts per section, for the index rail and the identity card.
 *
 * Computed here so the rail can be told what is filled in without mounting
 * the sections themselves or restating the kind-to-section mapping.
 */
export function countSections(profile: OutcomesProfile): Record<string, SectionCount> {
  const byKind = new Map<RecordKind, LoggedEntry[]>();
  for (const e of listEntries(profile)) {
    const list = byKind.get(e.spec.id);
    if (list) list.push(e);
    else byKind.set(e.spec.id, [e]);
  }

  const out: Record<string, SectionCount> = {};
  for (const section of RECORD_SECTIONS) {
    if (section.id === "coursework") {
      out.coursework = { total: profile.courses.length, verified: 0 };
      continue;
    }
    const rows = section.kind ? (byKind.get(section.kind) ?? []) : [];
    out[section.id] = {
      total: rows.length,
      verified: rows.filter((e) => e.row.evidenceState === "verified").length,
    };
  }
  return out;
}
