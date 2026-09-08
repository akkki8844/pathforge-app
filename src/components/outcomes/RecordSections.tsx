import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel, Reveal, Title } from "./primitives";
import { EntryCard } from "./EntryCard";
import {
  blankEntry,
  listEntries,
  specOf,
  type HostKey,
  type LoggedEntry,
  type RecordKind,
} from "@/lib/outcomesRecord";
import type { SignalId, SignalStanding } from "@/lib/outcomesScoring";
import type { EvidenceState, OutcomesProfile } from "@/hooks/useOutcomesData";

/**
 * The record, divided the way a profile is divided.
 *
 * This replaces a single reverse-chronological feed of all eleven kinds mixed
 * together behind a filter dropdown. That feed was honest about time and
 * useless for the thing people actually come here to do: fill in a section.
 * You cannot see that you have no work experience in a list sorted by date —
 * an absence has no row. Sections make absence visible, which is the whole
 * point of keeping a record you intend to act on.
 *
 * Each section is one kind of claim, carries its own add button, and states
 * its own reading: how many entries, how many are actually proved, and where
 * the signal it feeds sits against the bar for the tier the student picked.
 * Those three numbers are read from the existing scorer — nothing here
 * computes a new metric, and a section whose signal the student has not
 * reported says so rather than printing a zero.
 */

interface SectionSpec {
  id: string;
  title: string;
  /** Shown when the section is empty: what goes here, and why it counts. */
  blurb: string;
  /** Kinds this section holds. The first is what its main button adds. */
  kinds: RecordKind[];
  /** The scorer signal this section feeds, when it feeds exactly one. */
  signal?: SignalId;
}

/**
 * Order matters: it runs strongest-evidence-first the way a CV does, not in
 * the order the underlying jsonb columns happen to be declared.
 */
const SECTIONS: SectionSpec[] = [
  {
    id: "experience",
    title: "Experience",
    blurb:
      "Internships, placements, shadowing, studio time, paid work. The clearest evidence that someone outside your school trusted you with something.",
    kinds: ["work"],
    signal: "internships",
  },
  {
    id: "leadership",
    title: "Leadership & activities",
    blurb:
      "Roles where the team answered to you, and the clubs, sports and ensembles you are part of. Sustained commitment reads louder than a title.",
    kinds: ["leadership", "activity"],
    signal: "leadership",
  },
  {
    id: "projects",
    title: "Projects",
    blurb:
      "Things you built, wrote or ran on your own initiative. This is where a file stops being a list of memberships and starts showing what you do unprompted.",
    kinds: ["project"],
    signal: "initiative",
  },
  {
    id: "competitions",
    title: "Competitions & awards",
    blurb:
      "Anything an outside body ran, judged and published a result for — and the honours handed to you rather than entered for.",
    kinds: ["competition", "award"],
    signal: "competition",
  },
  {
    id: "research",
    title: "Research & publications",
    blurb:
      "Papers, posters, preprints, work under a mentor, and anything of yours that ran under an editor. Rare at school age, and weighted accordingly.",
    kinds: ["research", "publication"],
    signal: "research_output",
  },
  {
    id: "service",
    title: "Volunteering",
    blurb:
      "Community, civic and charitable work. Hours matter less than what changed because you were there — say it with a number.",
    kinds: ["service"],
    signal: "service_impact",
  },
  {
    id: "portfolio",
    title: "Portfolio",
    blurb:
      "Writing, design, music, film or software with an actual audience. A link a stranger can open is worth more than any description of it.",
    kinds: ["portfolio"],
    signal: "creative_portfolio",
  },
  {
    id: "certifications",
    title: "Certifications",
    blurb:
      "Credentials an external body examined you for and issued. Kept apart from awards because they are earned to a published standard.",
    kinds: ["certification"],
  },
];

function newId(): string {
  return Math.random().toString(36).substring(2, 9);
}

/** Proof state of one section, counted from the entries themselves. */
function proofOf(entries: LoggedEntry[]) {
  let verified = 0;
  let submitted = 0;
  for (const e of entries) {
    const state = (e.row.evidenceState as EvidenceState) ?? "not_started";
    if (state === "verified") verified += 1;
    else if (state === "evidence_submitted") submitted += 1;
  }
  return { verified, submitted, total: entries.length };
}

/**
 * The one-line reading under a section head.
 *
 * Three facts, each of which the page already computes elsewhere: how much is
 * on file, how much of it is proved, and how the signal it feeds stands. It
 * never invents a per-section score — the scorer has no such thing — and it
 * says "not reported" rather than "0%" when a signal has no data behind it,
 * because those are different statements about a student.
 */
function readingOf(entries: LoggedEntry[], standing?: SignalStanding): string {
  if (entries.length === 0) return "Nothing on file";
  const { verified, submitted, total } = proofOf(entries);
  const parts = [`${total} ${total === 1 ? "entry" : "entries"}`];
  if (verified > 0) parts.push(`${verified} verified`);
  else if (submitted > 0) parts.push(`${submitted} awaiting review`);
  else parts.push("none proved yet");
  if (standing?.reported) parts.push(`${Math.round(standing.attainment)}% of bar`);
  return parts.join(" · ");
}

export interface RecordSectionsProps {
  profile: OutcomesProfile;
  update: (updater: (prev: OutcomesProfile) => OutcomesProfile) => void;
  /** Every signal against its tier bar — the source of each section's reading. */
  ranked: SignalStanding[];
}

export function RecordSections({ profile, update, ranked }: RecordSectionsProps) {
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
   * are seven different interfaces. These three casts are that seam — the same
   * one RecordEditor carries, and for the same reason: expressing the pairing
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
   * Add one entry of a named kind and open it.
   *
   * No picker and no modal: the button that creates the entry is inside the
   * section the entry belongs to, so the kind is already known and the new row
   * appears directly under the button that made it.
   */
  const addOfKind = (kind: RecordKind) => {
    const spec = specOf(kind);
    const id = newId();
    addRow(spec.host, blankEntry(spec, id));
    setEditingId(id);
  };

  return (
    <div className="space-y-3">
      {SECTIONS.map((section, i) => {
        const rows = section.kinds.flatMap((k) => byKind.get(k) ?? []);
        // Within a section the record still reads newest first.
        const sorted = [...rows].sort((a, b) => {
          if (a.ordinal !== null && b.ordinal !== null) return b.ordinal - a.ordinal;
          if (a.ordinal === null && b.ordinal !== null) return -1;
          if (a.ordinal !== null && b.ordinal === null) return 1;
          return 0;
        });
        const standing = section.signal ? standings.get(section.signal) : undefined;
        const primary = specOf(section.kinds[0]);
        const secondary = section.kinds[1] ? specOf(section.kinds[1]) : null;

        return (
          <Reveal key={section.id} delay={Math.min(i * 0.02, 0.1)}>
            <div id={`record-${section.id}`} className="scroll-mt-24">
              <Panel flush>
                <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 p-5 sm:p-6">
                  <div className="min-w-0">
                    <Title>{section.title}</Title>
                    <p className="mt-1 text-[13px] leading-snug text-muted-foreground">
                      {readingOf(sorted, standing)}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 text-xs"
                      onClick={() => addOfKind(section.kinds[0])}
                    >
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      {secondary ? `Add ${primary.label.toLowerCase()}` : "Add"}
                    </Button>
                    {secondary && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-9 text-xs text-muted-foreground"
                        onClick={() => addOfKind(section.kinds[1])}
                      >
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        Add {secondary.label.toLowerCase()}
                      </Button>
                    )}
                  </div>
                </div>

                {sorted.length === 0 ? (
                  <div className="border-t border-border px-5 py-5 sm:px-6">
                    <p className="max-w-[72ch] text-[13.5px] leading-relaxed text-muted-foreground">
                      {section.blurb}
                    </p>
                    {/* What clearing this signal actually takes, straight from the
                        scorer — an empty section that only says "nothing here" is
                        a section nobody fills in. */}
                    {standing?.requirement && (
                      <p className="mt-2 max-w-[72ch] text-[13.5px] leading-relaxed text-foreground">
                        {standing.requirement}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-px border-t border-border bg-border">
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
              </Panel>
            </div>
          </Reveal>
        );
      })}
    </div>
  );
}

/** The section list, for anything that needs to jump into the record. */
export const RECORD_SECTION_IDS = SECTIONS.map((s) => s.id);
