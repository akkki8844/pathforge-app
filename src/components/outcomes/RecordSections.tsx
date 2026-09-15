import { useMemo, useState, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
import type { EvidenceState, OutcomesProfile } from "@/hooks/useOutcomesData";

/**
 * The record, divided the way a LinkedIn profile is divided.
 *
 * One category per section, and exactly one way to add to it.
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
 * Twelve sections need an index, which is what `RecordRail` is, and they need
 * each section to be cheap to skim, which is what the card shape below is:
 * title, count, one add button, then rows. An empty section states in one
 * sentence what belongs in it and what clears the bar, rather than the two
 * paragraphs it used to print, which across twelve sections was a wall of
 * prose standing between a student and a text field.
 *
 * The storage is untouched. `outcomesRecord` still maps every kind onto the
 * same seven jsonb lists, so nothing that saved before stops saving, and
 * nothing that scored before scores differently.
 */

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
 * because coursework is stored as its own list with its own editor but is
 * still one of the twelve sections, and a section that looked different
 * because of where its rows happen to live would be an implementation detail
 * leaking into the page.
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

  return (
    <div className="space-y-3">
      {RECORD_SECTIONS.filter((s) => s.kind).map((section) => {
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
            key={section.id}
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
      })}
    </div>
  );
}

