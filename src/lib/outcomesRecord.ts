import type { EvidenceState, OutcomesProfile } from "@/hooks/useOutcomesData";

/**
 * The record's model.
 *
 * The Outcomes record used to be eight forms, one per array on the profile, and
 * a student read it as eight settings panels rather than as an account of what
 * they had done. This file is the layer that turns those same arrays into one
 * dated, browsable record: every kind of entry described once, in a table, so
 * the editor can render, sort and group them without knowing anything about
 * which array a given entry happens to live in.
 *
 * ─── Why nothing here changes the stored shape ───────────────────────────
 *
 * `outcomes_data` stores each list as a jsonb column, and the profile's entry
 * interfaces are the columns' contract with the scorer, the résumé builder, the
 * recommender packet and the teacher view. So this file adds *only* optional
 * keys to entries that already exist — never a new top-level list, which would
 * need a column that is not there and would fail the whole save.
 *
 * Every added key is optional, so an entry written before any of this existed
 * loads and scores exactly as it did. `duration` is the one key that is written
 * rather than only read: when a student sets a start and end month, the derived
 * "1 year 3 months" is written back into the entry's own `duration` field, so
 * `parseDuration` in the scorer — and anything else reading that string — keeps
 * working without being taught about dates.
 *
 * `completedActivitiesSync` already writes a `source` key onto entries it
 * creates, so extra keys round-tripping through jsonb is settled behaviour
 * rather than an assumption being made here.
 */

// ─── The shapes an entry can carry ───────────────────────────────────────

/** Keys this file adds to entries. All optional, all absent on legacy rows. */
export interface EntryMeta {
  /** Sub-kind, when one list holds more than one kind of thing. */
  kind?: string;
  description?: string;
  /** "YYYY-MM". Month precision — nobody remembers the day they joined a club. */
  startDate?: string;
  endDate?: string;
  ongoing?: boolean;
  /** ISO timestamp, set when the entry is created. Orders undated entries. */
  loggedAt?: string;
  link?: string;
  /** Derived from the dates, kept in sync for the scorer. */
  duration?: string;
  /** Set by `completedActivitiesSync` on entries added from the plan. */
  source?: string;
}

/** An entry as this file handles it: an id, and a bag of fields the spec names. */
export type EntryRow = { id: string } & Record<string, unknown>;

/** The profile lists a logged entry can live in. Courses are kept apart. */
export type HostKey =
  | "projects"
  | "internships"
  | "leadershipRoles"
  | "competitions"
  | "serviceRoles"
  | "researchOutputs"
  | "creativeWorks";

export type RecordKind =
  | "project"
  | "work"
  | "leadership"
  | "activity"
  | "service"
  | "competition"
  | "award"
  | "research"
  | "publication"
  | "portfolio"
  | "certification";

export function str(row: EntryRow, key: string): string {
  const v = row[key];
  return typeof v === "string" ? v : typeof v === "number" ? String(v) : "";
}

export function num(row: EntryRow, key: string): number {
  const v = row[key];
  return typeof v === "number" ? v : typeof v === "string" ? parseInt(v, 10) || 0 : 0;
}

/**
 * The sub-kind written on an entry, if any.
 *
 * An entry with no `kind` is the default kind for its list, which is what every
 * entry saved before this file existed is.
 */
export function tagOf(entry: unknown): string | undefined {
  const k = (entry as EntryMeta | null)?.kind;
  return typeof k === "string" && k.length > 0 ? k : undefined;
}

// ─── Fields ──────────────────────────────────────────────────────────────

export interface FieldSpec {
  key: string;
  label: string;
  placeholder?: string;
  type: "text" | "textarea" | "number" | "select";
  options?: { value: string; label: string }[];
  /** Takes half the row on wide screens; text areas always take the whole. */
  half?: boolean;
}

export const LEVEL_OPTIONS = [
  { value: "school", label: "School" },
  { value: "regional", label: "Regional" },
  { value: "state", label: "State" },
  { value: "national", label: "National" },
  { value: "international", label: "International" },
];

const LEVEL_LABEL: Record<string, string> = Object.fromEntries(
  LEVEL_OPTIONS.map((o) => [o.value, o.label])
);

const DESCRIPTION: FieldSpec = {
  key: "description",
  label: "Description",
  placeholder: "What it was, what you actually did, and who it was for.",
  type: "textarea",
};

const LINK: FieldSpec = {
  key: "link",
  label: "Link",
  placeholder: "Something a stranger can open",
  type: "text",
};

/** Joins the parts of a subtitle, dropping the ones that are empty. */
function line(...parts: (string | number | false | undefined)[]): string {
  return parts.filter((p) => p !== undefined && p !== false && p !== "").join(" · ");
}

// ─── The kinds ───────────────────────────────────────────────────────────

export interface KindSpec {
  id: RecordKind;
  host: HostKey;
  /** Written to the entry's `kind`. Absent means "the default kind of this list". */
  tag?: string;
  label: string;
  /** One line, shown in the picker. Says what belongs here, not what it is. */
  hint: string;
  titleKey: string;
  titlePlaceholder: string;
  /** The muted line under the title. */
  subtitle: (row: EntryRow) => string;
  /** The "what came of it" line, when this kind has one. */
  outcomeKey?: string;
  outcomeLabel?: string;
  /** Everything the editor shows besides the title, the dates and the proof. */
  fields: FieldSpec[];
  blank: () => Record<string, unknown>;
}

const NOT_STARTED: EvidenceState = "not_started";

/**
 * Every kind of thing a student can log, in the order the picker offers them.
 *
 * One row per kind, and the row is the whole definition: which list it is
 * stored in, how it reads back, and which fields the editor draws. Adding a
 * twelfth kind is a row here — not another section, another set of handlers and
 * another blank object scattered through the editor, which is what the previous
 * eight-form record cost.
 */
export const KIND_SPECS: KindSpec[] = [
  {
    id: "project",
    host: "projects",
    label: "Project",
    hint: "Something you built, wrote, or ran on your own initiative.",
    titleKey: "title",
    titlePlaceholder: "What you made",
    subtitle: () => "",
    outcomeKey: "outcome",
    outcomeLabel: "Result",
    fields: [
      DESCRIPTION,
      { key: "outcome", label: "Result", placeholder: "Say it with a number", type: "text", half: true },
      { ...LINK, half: true },
    ],
    blank: () => ({ title: "", description: "", duration: "", outcome: "", evidenceState: NOT_STARTED }),
  },
  {
    id: "work",
    host: "internships",
    label: "Work",
    hint: "An internship, placement, shadowing, studio time, or paid work.",
    titleKey: "title",
    titlePlaceholder: "Your role or job title",
    subtitle: (r) => str(r, "organization"),
    outcomeKey: "outcome",
    outcomeLabel: "What came of it",
    fields: [
      { key: "organization", label: "Organisation", placeholder: "Where you worked", type: "text", half: true },
      { key: "outcome", label: "What came of it", placeholder: "What you shipped, found, or were trusted with", type: "text", half: true },
      DESCRIPTION,
      LINK,
    ],
    blank: () => ({ title: "", organization: "", duration: "", outcome: "", evidenceState: NOT_STARTED }),
  },
  {
    id: "leadership",
    host: "leadershipRoles",
    label: "Leadership",
    hint: "A role where you were the person the team answered to.",
    titleKey: "title",
    titlePlaceholder: "Founder, President, Captain, Editor",
    subtitle: (r) => line(str(r, "organization"), num(r, "teamSize") > 0 && `${num(r, "teamSize")} led`),
    fields: [
      { key: "organization", label: "Organisation", placeholder: "Club, team, or company", type: "text", half: true },
      { key: "teamSize", label: "People led", placeholder: "0", type: "number", half: true },
      DESCRIPTION,
      LINK,
    ],
    blank: () => ({ title: "", organization: "", duration: "", teamSize: 0, evidenceState: NOT_STARTED }),
  },
  {
    id: "activity",
    host: "leadershipRoles",
    tag: "activity",
    label: "Activity",
    hint: "A club, sport, ensemble, or society you are part of without running it.",
    titleKey: "title",
    titlePlaceholder: "Varsity swim, Debate club, Orchestra",
    subtitle: (r) => str(r, "organization"),
    fields: [
      { key: "organization", label: "Where", placeholder: "School, club, or league", type: "text", half: true },
      DESCRIPTION,
      LINK,
    ],
    blank: () => ({ title: "", organization: "", duration: "", teamSize: 0, evidenceState: NOT_STARTED }),
  },
  {
    id: "service",
    host: "serviceRoles",
    label: "Volunteering",
    hint: "Community, civic, or charitable work you gave time to.",
    titleKey: "role",
    titlePlaceholder: "What you did there",
    subtitle: (r) => line(str(r, "organization"), num(r, "hours") > 0 && `${num(r, "hours")} hours`),
    outcomeKey: "impact",
    outcomeLabel: "Outcome",
    fields: [
      { key: "organization", label: "Organisation", placeholder: "Who you did it with", type: "text", half: true },
      { key: "hours", label: "Hours", placeholder: "0", type: "number", half: true },
      { key: "impact", label: "Outcome", placeholder: "Say it with a number", type: "text" },
      DESCRIPTION,
      LINK,
    ],
    blank: () => ({ role: "", organization: "", hours: 0, impact: "", evidenceState: NOT_STARTED }),
  },
  {
    id: "competition",
    host: "competitions",
    label: "Competition",
    hint: "Anything an outside body ran and published results for.",
    titleKey: "name",
    titlePlaceholder: "Competition name",
    subtitle: (r) => LEVEL_LABEL[str(r, "level")] ?? "",
    outcomeKey: "result",
    outcomeLabel: "Placement",
    fields: [
      { key: "level", label: "Level", type: "select", options: LEVEL_OPTIONS, half: true },
      { key: "result", label: "Placement", placeholder: "Gold, Finalist, Top 5%", type: "text", half: true },
      DESCRIPTION,
      LINK,
    ],
    blank: () => ({ name: "", level: "school", result: "", evidenceState: NOT_STARTED }),
  },
  {
    id: "award",
    host: "competitions",
    tag: "award",
    label: "Award",
    hint: "An honour, prize, or scholarship given to you rather than entered for.",
    titleKey: "name",
    titlePlaceholder: "What the award is called",
    subtitle: (r) => LEVEL_LABEL[str(r, "level")] ?? "",
    outcomeKey: "result",
    outcomeLabel: "Citation",
    fields: [
      { key: "level", label: "Recognised at", type: "select", options: LEVEL_OPTIONS, half: true },
      { key: "result", label: "Citation", placeholder: "Who gave it, and for what", type: "text", half: true },
      DESCRIPTION,
      LINK,
    ],
    blank: () => ({ name: "", level: "school", result: "", kind: "award", evidenceState: NOT_STARTED }),
  },
  {
    id: "research",
    host: "researchOutputs",
    label: "Research",
    hint: "A paper, poster, preprint, or a project run under a mentor.",
    titleKey: "title",
    titlePlaceholder: "What the work was about",
    subtitle: (r) => line(str(r, "venue"), str(r, "role")),
    fields: [
      { key: "venue", label: "Venue or mentor", placeholder: "Journal, symposium, or supervisor", type: "text", half: true },
      { key: "role", label: "Your role", placeholder: "Author, co-author, assistant", type: "text", half: true },
      DESCRIPTION,
      { ...LINK, label: "Link or DOI" },
    ],
    blank: () => ({ title: "", venue: "", role: "", link: "", evidenceState: NOT_STARTED }),
  },
  {
    id: "publication",
    host: "researchOutputs",
    tag: "publication",
    label: "Publication",
    hint: "Work of yours that ran under your name somewhere with an editor.",
    titleKey: "title",
    titlePlaceholder: "The title as it was published",
    subtitle: (r) => line(str(r, "venue"), str(r, "role")),
    fields: [
      { key: "venue", label: "Published in", placeholder: "Publication, press, or imprint", type: "text", half: true },
      { key: "role", label: "Your role", placeholder: "Author, co-author, editor", type: "text", half: true },
      DESCRIPTION,
      { ...LINK, label: "Link or DOI" },
    ],
    blank: () => ({ title: "", venue: "", role: "", link: "", kind: "publication", evidenceState: NOT_STARTED }),
  },
  {
    id: "portfolio",
    host: "creativeWorks",
    label: "Portfolio",
    hint: "Writing, design, music, film, or software with an audience.",
    titleKey: "title",
    titlePlaceholder: "What the piece is called",
    subtitle: (r) => str(r, "platform"),
    outcomeKey: "reach",
    outcomeLabel: "Reach",
    fields: [
      { key: "platform", label: "Platform", placeholder: "Where it lives", type: "text", half: true },
      { key: "reach", label: "Reach", placeholder: "Say it with a number", type: "text", half: true },
      DESCRIPTION,
      LINK,
    ],
    blank: () => ({ title: "", platform: "", reach: "", link: "", evidenceState: NOT_STARTED }),
  },
  {
    id: "certification",
    host: "competitions",
    tag: "certification",
    label: "Certification",
    hint: "A credential an external body examined you for and issued.",
    titleKey: "name",
    titlePlaceholder: "What the certificate is called",
    subtitle: (r) => str(r, "result"),
    fields: [
      { key: "result", label: "Issued by", placeholder: "The body that awarded it", type: "text", half: true },
      { ...LINK, label: "Verification link", half: true },
      DESCRIPTION,
    ],
    // `level` is carried at its lowest value because the column's shape expects
    // it; the scorer reads the tag, not the level, for a certification.
    blank: () => ({ name: "", level: "school", result: "", kind: "certification", evidenceState: NOT_STARTED }),
  },
];

const BY_ID = new Map(KIND_SPECS.map((s) => [s.id, s]));

export function specOf(kind: RecordKind): KindSpec {
  const spec = BY_ID.get(kind);
  // Every caller passes an id that came out of this table, so the fallback is
  // unreachable — it exists so the return type is not nullable.
  return spec ?? KIND_SPECS[0];
}

/** Which kind an entry is, from the list it lives in and the tag it carries. */
export function specFor(host: HostKey, entry: unknown): KindSpec {
  const tag = tagOf(entry);
  return (
    KIND_SPECS.find((s) => s.host === host && s.tag === tag) ??
    KIND_SPECS.find((s) => s.host === host && s.tag === undefined) ??
    KIND_SPECS[0]
  );
}

// ─── Dates ───────────────────────────────────────────────────────────────

const MONTH_LABEL = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "YYYY-MM" as a count of months, so two dates compare with one subtraction. */
export function ordinalOf(value?: string): number | null {
  const m = /^(\d{4})-(\d{2})$/.exec((value || "").trim());
  if (!m) return null;
  const year = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  if (month < 1 || month > 12) return null;
  return year * 12 + (month - 1);
}

export function yearOf(value?: string): number | null {
  const ord = ordinalOf(value);
  return ord === null ? null : Math.floor(ord / 12);
}

export function formatMonth(value?: string): string {
  const ord = ordinalOf(value);
  if (ord === null) return "";
  return `${MONTH_LABEL[ord % 12]} ${Math.floor(ord / 12)}`;
}

function nowOrdinal(): number {
  const now = new Date();
  return now.getFullYear() * 12 + now.getMonth();
}

/**
 * The dateline shown on an entry.
 *
 * Falls back to whatever free-text duration the entry already carries, so a
 * record kept before there were date fields still reads as dated rather than
 * as a wall of "No date".
 */
export function datelineOf(row: EntryRow): string {
  const start = formatMonth(str(row, "startDate"));
  const end = formatMonth(str(row, "endDate"));
  const ongoing = row.ongoing === true;
  if (start && ongoing) return `${start} — Present`;
  if (start && end) return start === end ? start : `${start} — ${end}`;
  if (start) return start;
  if (end) return end;
  if (ongoing) return "Present";
  const legacy = str(row, "duration").trim();
  return legacy || "No date yet";
}

/**
 * Months of commitment, written back into the entry's own `duration` string.
 *
 * The scorer reads `duration` as free text ("1 year 3 months") and has done
 * since before this record had dates. Deriving that string here rather than
 * teaching every reader about `startDate` is what keeps leadership, projects
 * and work scoring identically for entries logged either way.
 */
export function durationFrom(start?: string, end?: string, ongoing?: boolean): string {
  const from = ordinalOf(start);
  if (from === null) return "";
  const to = ongoing ? nowOrdinal() : ordinalOf(end);
  if (to === null) return ongoing ? "ongoing" : "";
  const months = Math.max(1, to - from + 1);
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const parts: string[] = [];
  if (years) parts.push(`${years} year${years === 1 ? "" : "s"}`);
  if (rest) parts.push(`${rest} month${rest === 1 ? "" : "s"}`);
  const text = parts.join(" ");
  return ongoing ? `${text} ongoing` : text;
}

// ─── The record, in order ────────────────────────────────────────────────

export interface LoggedEntry {
  id: string;
  host: HostKey;
  spec: KindSpec;
  row: EntryRow;
  /** Calendar year this entry is filed under, or null when it carries no date. */
  year: number | null;
  /** Bigger is more recent. Undated entries sort below every dated one. */
  ordinal: number | null;
}

const HOSTS: HostKey[] = [
  "projects",
  "internships",
  "leadershipRoles",
  "competitions",
  "serviceRoles",
  "researchOutputs",
  "creativeWorks",
];

/**
 * Everything on the profile as one reverse-chronological record.
 *
 * An entry is filed by when it *ended*, because that is the date a reader scans
 * for; something still running files under today so it stays at the top of the
 * dated run.
 *
 * What carries no date is never guessed at — it is grouped on its own, ahead of
 * the dated run rather than behind it, for two reasons: a date is the one thing
 * those entries are missing, and an entry logged a second ago has no date yet,
 * so filing undated last would drop every new entry at the bottom of a long
 * record the moment it was created.
 */
export function listEntries(profile: OutcomesProfile): LoggedEntry[] {
  const out: { entry: LoggedEntry; seq: number }[] = [];
  let seq = 0;

  for (const host of HOSTS) {
    // The profile's lists are seven different interfaces; this file handles
    // them by the spec table rather than by type, so they are read through one
    // indexable shape. The cast is the only place that happens.
    const rows = (profile[host] as unknown as EntryRow[]) || [];
    for (const row of rows) {
      if (!row || typeof row.id !== "string") continue;
      const ongoing = row.ongoing === true;
      const end = ordinalOf(str(row, "endDate"));
      const start = ordinalOf(str(row, "startDate"));
      const ordinal = ongoing ? nowOrdinal() : (end ?? start);
      out.push({
        seq: seq++,
        entry: {
          id: row.id,
          host,
          spec: specFor(host, row),
          row,
          year: ordinal === null ? null : Math.floor(ordinal / 12),
          ordinal,
        },
      });
    }
  }

  out.sort((a, b) => {
    const ao = a.entry.ordinal;
    const bo = b.entry.ordinal;
    if (ao !== null && bo !== null) return bo - ao || b.seq - a.seq;
    if (ao === null && bo !== null) return -1;
    if (ao !== null && bo === null) return 1;
    // Undated: most recently logged first, then most recently added.
    const at = Date.parse(str(a.entry.row, "loggedAt")) || 0;
    const bt = Date.parse(str(b.entry.row, "loggedAt")) || 0;
    return bt - at || b.seq - a.seq;
  });

  return out.map((o) => o.entry);
}

export interface EntryGroup {
  /** The year, or null for the undated run at the end. */
  year: number | null;
  entries: LoggedEntry[];
}

export function groupByYear(entries: LoggedEntry[]): EntryGroup[] {
  const groups: EntryGroup[] = [];
  for (const entry of entries) {
    const last = groups[groups.length - 1];
    if (last && last.year === entry.year) last.entries.push(entry);
    else groups.push({ year: entry.year, entries: [entry] });
  }
  return groups;
}

/** A blank entry of one kind, stamped so the record can order it. */
export function blankEntry(spec: KindSpec, id: string): Record<string, unknown> {
  return { id, ...spec.blank(), loggedAt: new Date().toISOString() };
}
