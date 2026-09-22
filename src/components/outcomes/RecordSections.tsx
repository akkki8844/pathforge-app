import { useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DURATION, EASE_OUT_EXPO } from "@/lib/motion";
import { Panel, Title } from "./primitives";
import { EntryCard } from "./EntryCard";
import {
  blankEntry,
  listEntries,
  specOf,
  type HostKey,
  type LoggedEntry,
  type RecordKind,
} from "@/lib/outcomesRecord";
import {
  RECORD_SECTIONS,
  type RecordSectionSpec,
} from "@/lib/outcomesSections";
import type { SignalId, SignalStanding } from "@/lib/outcomesScoring";
import type { Course, EvidenceState, OutcomesProfile } from "@/hooks/useOutcomesData";

/**
 * The record, one category at a time.
 *
 * One category per section, exactly one way to add to it, and only the section
 * you picked on screen.
 *
 * The version before this merged eleven kinds into eight sections, so three of
 * them carried two add buttons: "Add leadership" beside "Add activity", "Add
 * competition" beside "Add award", "Add research" beside "Add publication".
 * A student wanting to log a club had to first decide whether a club is a
 * leadership role, then find that decision expressed as a choice between two
 * buttons in a header. That is a taxonomy question asked at the exact moment
 * someone is trying to write down a thing they did. The categories are now
 * divided into their own sections instead: the kind is settled by which
 * section you are in, and every section has one add control.
 *
 * The version after that printed all twelve, stacked, with the rail beside
 * them as an anchor list. Twelve open sections is a page you scroll rather
 * than a record you work in — reaching Publications meant passing eleven
 * categories you were not editing. The rail is a tab list now and this renders
 * the selected section alone; switching crossfades, so the page reads as one
 * surface changing its contents rather than as a jump to somewhere else.
 *
 * Coursework is the twelfth tab and lives here too, even though its rows are a
 * timetable rather than logged entries. It wears the same card so that
 * difference stays an implementation detail.
 *
 * The storage is untouched. `outcomesRecord` still maps every kind onto the
 * same seven jsonb lists, so nothing that saved before stops saving, and
 * nothing that scored before scores differently.
 */

const SUBJECTS = [
  "Mathematics", "Physics", "Chemistry", "Biology", "Computer Science",
  "English", "History", "Economics", "Psychology", "Environmental Science",
  "Art", "Music", "Foreign Language", "Statistics", "Calculus",
];

const FIELD = "h-9 text-xs";

function newId(): string {
  return Math.random().toString(36).substring(2, 9);
}

/**
 * The one-line reading under a section title.
 *
 * Three facts the page already computes: how much is on file, how much of it
 * is proved, and where the signal it drives stands. It never invents a
 * per-section score, and it says "not reported" rather than "0%" for a signal
 * with no data behind it, because those are different statements.
 */
function readingOf(entries: LoggedEntry[], standing?: SignalStanding): string {
  if (entries.length === 0) return "Nothing on file";
  let verified = 0;
  let submitted = 0;
  for (const e of entries) {
    const state = (e.row.evidenceState as EvidenceState) ?? "not_started";
    if (state === "verified") verified += 1;
    else if (state === "evidence_submitted") submitted += 1;
  }
  const total = entries.length;
  const parts = [`${total} ${total === 1 ? "entry" : "entries"}`];
  if (verified > 0) parts.push(`${verified} verified`);
  else if (submitted > 0) parts.push(`${submitted} awaiting review`);
  else parts.push("none proved yet");
  if (standing?.reported) parts.push(`${Math.round(standing.attainment)}% of bar`);
  return parts.join(" · ");
}

/**
 * The shell every record section wears.
 *
 * Header carries the section's icon, its title, its one-line reading and a
 * single add control; the body is whatever that section holds. Exported
 * because the Outcomes page composes the record from this shell in more than
 * one place, and a section that looked different because of where its rows
 * happen to live would be an implementation detail leaking into the page.
 */
export function RecordSectionCard({
  section,
  reading,
  onAdd,
  addLabel,
  children,
}: {
  section: RecordSectionSpec;
  reading: string;
  onAdd: () => void;
  /** Spoken label for the icon-only add control. */
  addLabel: string;
  children: ReactNode;
}) {
  const Icon = section.icon;
  return (
    <section id={`record-${section.id}`} className="scroll-mt-24">
      <Panel flush>
        <div className="flex items-start gap-3 p-4 sm:gap-4 sm:p-5">
          <span
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.625rem] border border-border text-muted-foreground"
            aria-hidden
          >
            <Icon className="h-[18px] w-[18px]" />
          </span>

          <div className="min-w-0 flex-1">
            <Title>{section.title}</Title>
            <p className="mt-1 text-[13px] leading-snug text-muted-foreground">{reading}</p>
          </div>

          {/*
           * One add control, icon only.
           *
           * Icon-only is safe here precisely because the section split removed
           * the ambiguity it used to resolve: there is nothing left for a
           * label to disambiguate, the section title above it already names
           * what gets added, and an empty section repeats the action as a
           * labelled button in its body.
           */}
          <Button
            size="icon"
            variant="outline"
            className="h-9 w-9 shrink-0 rounded-full"
            onClick={onAdd}
            aria-label={addLabel}
            title={addLabel}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {children}
      </Panel>
    </section>
  );
}

/** The empty body: what belongs here, what clears the bar, and the way in. */
function EmptySection({
  section,
  requirement,
  onAdd,
}: {
  section: RecordSectionSpec;
  requirement?: string;
  onAdd: () => void;
}) {
  return (
    <div className="border-t border-border px-4 py-4 sm:px-5">
      <p className="max-w-[64ch] text-[13.5px] leading-relaxed text-muted-foreground">
        {section.blurb}
      </p>
      {/* Straight from the scorer. A section that only says "nothing here" is
          a section nobody fills in. */}
      {requirement && (
        <p className="mt-1.5 max-w-[64ch] text-[13.5px] leading-relaxed text-foreground">
          {requirement}
        </p>
      )}
      <Button
        size="sm"
        variant="ghost"
        className="-ml-2 mt-2 h-8 px-2 text-xs text-primary hover:text-primary"
        onClick={onAdd}
      >
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        {section.addLabel}
      </Button>
    </div>
  );
}

export interface RecordSectionsProps {
  profile: OutcomesProfile;
  update: (updater: (prev: OutcomesProfile) => OutcomesProfile) => void;
  /** Every signal against its tier bar, the source of each section's reading. */
  ranked: SignalStanding[];
  /** The section id the tab list has selected. */
  active: string;
}

export function RecordSections({ profile, update, ranked, active }: RecordSectionsProps) {
  const reduced = useReducedMotion();
  const [editingId, setEditingId] = useState<string | null>(null);

  const entries = useMemo(() => listEntries(profile), [profile]);

  const byKind = useMemo(() => {
    const map = new Map<RecordKind, LoggedEntry[]>();
    for (const e of entries) {
      const list = map.get(e.spec.id);
      if (list) list.push(e);
      else map.set(e.spec.id, [e]);
    }
    return map;
  }, [entries]);

  const standings = useMemo(() => {
    const map = new Map<SignalId, SignalStanding>();
    for (const s of ranked) map.set(s.id, s);
    return map;
  }, [ranked]);

  /*
   * The record is handled through one spec table, while the lists underneath
   * are seven different interfaces. These three casts are that seam, the same
   * one RecordEditor carries and for the same reason: expressing the pairing
   * in the type system needs a discriminated union per kind, which is the
   * eleven-branch switch the spec table exists to delete.
   */
  const addRow = (host: HostKey, item: Record<string, unknown>) =>
    update((p) => ({ ...p, [host]: [...((p[host] as unknown[]) ?? []), item] }));

  const editRow = (host: HostKey, id: string, patch: Record<string, unknown>) =>
    update((p) => ({
      ...p,
      [host]: ((p[host] as unknown as { id: string }[]) ?? []).map((i) =>
        i.id === id ? { ...i, ...patch } : i
      ),
    }));

  const dropRow = (host: HostKey, id: string) =>
    update((p) => ({
      ...p,
      [host]: ((p[host] as unknown as { id: string }[]) ?? []).filter((i) => i.id !== id),
    }));

  /**
   * Add one entry and open it.
   *
   * No picker and no modal: the control that creates the entry lives in the
   * section the entry belongs to, so the kind is already settled and the new
   * row appears directly under the control that made it.
   */
  const addOfKind = (kind: RecordKind) => {
    const spec = specOf(kind);
    const id = newId();
    addRow(spec.host, blankEntry(spec, id));
    setEditingId(id);
  };

  // ── Coursework, the one section stored as a timetable ──────────────────
  const editCourse = (id: string, patch: Partial<Course>) =>
    update((p) => ({
      ...p,
      courses: p.courses.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));

  const dropCourse = (id: string) =>
    update((p) => ({ ...p, courses: p.courses.filter((c) => c.id !== id) }));

  const addCourse = () =>
    update((p) => ({
      ...p,
      courses: [...p.courses, { id: newId(), subject: "", level: "regular" } as Course],
    }));

  // An unknown id falls back to the first tab rather than rendering nothing,
  // so a stale selection can never leave the record blank.
  const section =
    RECORD_SECTIONS.find((s) => s.id === active) ?? RECORD_SECTIONS[0];

  const courseCount = profile.courses.length;

  function body() {
    if (section.id === "coursework") {
      return (
        <RecordSectionCard
          section={section}
          reading={
            courseCount === 0
              ? "Nothing on file"
              : `${courseCount} ${courseCount === 1 ? "course" : "courses"} · AP and IB carry the rigour signal`
          }
          onAdd={addCourse}
          addLabel={section.addLabel}
        >
          {courseCount === 0 ? (
            <div className="border-t border-border px-4 py-4 sm:px-5">
              <p className="max-w-[64ch] text-[13.5px] leading-relaxed text-muted-foreground">
                {section.blurb}
              </p>
              <p className="mt-1.5 max-w-[64ch] text-[13.5px] leading-relaxed text-foreground">
                AP and IB carry the rigour signal; honors counts at roughly two-fifths of one.
              </p>
              <Button
                size="sm"
                variant="ghost"
                className="-ml-2 mt-2 h-8 px-2 text-xs text-primary hover:text-primary"
                onClick={addCourse}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                {section.addLabel}
              </Button>
            </div>
          ) : (
            <div className="space-y-2 border-t border-border px-4 py-4 sm:px-5">
              {profile.courses.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center gap-2">
                  <Select
                    value={c.subject}
                    onValueChange={(v) => editCourse(c.id, { subject: v } as Partial<Course>)}
                  >
                    {/* min-w-0 so the select can shrink below the intrinsic
                        width of its longest option on a 320px screen. */}
                    <SelectTrigger aria-label="Course subject" className={cn("min-w-0 flex-1", FIELD)}>
                      <SelectValue placeholder="Subject" />
                    </SelectTrigger>
                    <SelectContent className="cly-scope font-cluely">
                      {SUBJECTS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={c.level}
                    onValueChange={(v) => editCourse(c.id, { level: v } as Partial<Course>)}
                  >
                    <SelectTrigger aria-label="Course level" className={cn("w-28", FIELD)}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="cly-scope font-cluely">
                      <SelectItem value="regular">Regular</SelectItem>
                      <SelectItem value="honors">Honors</SelectItem>
                      <SelectItem value="ap">AP</SelectItem>
                      <SelectItem value="ib">IB</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-muted-foreground hover:text-destructive"
                    onClick={() => dropCourse(c.id)}
                    aria-label="Remove course"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </RecordSectionCard>
      );
    }

    const kind = section.kind!;
    const rows = byKind.get(kind) ?? [];
    // Within a section the record still reads newest first.
    const sorted = [...rows].sort((a, b) => {
      if (a.ordinal !== null && b.ordinal !== null) return b.ordinal - a.ordinal;
      if (a.ordinal === null && b.ordinal !== null) return -1;
      if (a.ordinal !== null && b.ordinal === null) return 1;
      return 0;
    });
    const standing = section.signal ? standings.get(section.signal) : undefined;

    return (
      <RecordSectionCard
        section={section}
        reading={readingOf(sorted, standing)}
        onAdd={() => addOfKind(kind)}
        addLabel={section.addLabel}
      >
        {sorted.length === 0 ? (
          <EmptySection
            section={section}
            requirement={standing?.requirement}
            onAdd={() => addOfKind(kind)}
          />
        ) : (
          <div className={cn("grid grid-cols-1 gap-px border-t border-border bg-border")}>
            {sorted.map((entry) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                editing={editingId === entry.id}
                onOpen={() => setEditingId(entry.id)}
                onClose={() => setEditingId(null)}
                onPatch={(patch) => editRow(entry.host, entry.id, patch)}
                onRemove={() => {
                  setEditingId(null);
                  dropRow(entry.host, entry.id);
                }}
              />
            ))}
          </div>
        )}
      </RecordSectionCard>
    );
  }

  /*
   * One panel at a time.
   *
   * `mode="wait"` rather than a crossfade of both: the sections are full-width
   * cards of different heights, so overlapping them mid-switch makes the page
   * jump under the cursor. The outgoing card leaves faster than the incoming
   * one arrives, which is what stops the pair reading as a pause.
   *
   * The wrapper animates its own height for the same reason. Waiting means
   * there is a moment with no card in the box at all, and without this the box
   * collapsed to nothing and everything below it — the method panel, the page
   * footer — jumped up and then back down on every switch. Animating the
   * height carries the box from the old card's size to the new one instead, so
   * the only thing that moves is the card being replaced. Coursework is twelve
   * rows and Publications is often empty, so this is the difference between a
   * switch and a jolt.
   */
  return (
    <motion.div
      layout={reduced ? false : "size"}
      transition={{ duration: DURATION.base, ease: EASE_OUT_EXPO }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={section.id}
          id={`record-panel-${section.id}`}
          role="tabpanel"
          aria-labelledby={`record-tab-${section.id}`}
          initial={reduced ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={
            reduced
              ? { opacity: 1 }
              : {
                  opacity: 0,
                  y: -6,
                  transition: { duration: DURATION.fast, ease: EASE_OUT_EXPO },
                }
          }
          transition={{ duration: DURATION.base, ease: EASE_OUT_EXPO }}
        >
          {body()}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
