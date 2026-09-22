import { useMemo, useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RecordIdentity } from "./RecordIdentity";
import { RecordRail, RecordTabStrip } from "./RecordRail";
import { RecordSections } from "./RecordSections";
import { countSections, RECORD_SECTIONS } from "@/lib/outcomesSections";
import type { SignalStanding } from "@/lib/outcomesScoring";
import type { OutcomesProfile } from "@/hooks/useOutcomesData";

/**
 * The record.
 *
 * Three parts, in the order a LinkedIn profile has them: whose file this is,
 * the list of its categories, and the one category you picked. The list used
 * to be an index into a twelve-section stack; it is a tab list now, and the
 * selection lives here because both the desktop rail and the phone strip read
 * it.
 *
 * Grade and testing are facts about the student, not filters. They used to sit
 * in a panel headed "Filters" beside the target tier, with a note explaining
 * that the reset button deliberately would not touch two of the four controls
 * in it. That explanation was the tell: they were never the same kind of
 * thing. They are the last row of the identity card now, on the card that
 * states who the student is.
 */

const FIELD = "h-9 text-xs";

const TEST_OPTIONS = [
  { value: "none", label: "Not taken" },
  { value: "sat", label: "SAT" },
  { value: "act", label: "ACT" },
  { value: "psat", label: "PSAT/NMSQT" },
];

/** One labelled field: label above, control below, so it reads as a question. */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <Label className="text-[12.5px] font-medium text-muted-foreground">{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

export interface RecordEditorProps {
  profile: OutcomesProfile;
  update: (updater: (prev: OutcomesProfile) => OutcomesProfile) => void;
  /** Every signal against its tier bar, for the per-section readings. */
  ranked: SignalStanding[];
  /** The signed-in student, for the identity card. */
  student: { name: string; avatarUrl?: string | null; id?: string | null };
  /** The tier the reading is computed against, spelled the way the picker spells it. */
  tierLabel: string;
  githubLoading: boolean;
  onSyncGithub: () => void;
  linkedinLoading: boolean;
  onImportLinkedIn: () => void;
}

export function RecordEditor({
  profile,
  update,
  ranked,
  student,
  tierLabel,
  githubLoading,
  onSyncGithub,
  linkedinLoading,
  onImportLinkedIn,
}: RecordEditorProps) {
  const counts = useMemo(() => countSections(profile), [profile]);

  /*
   * Which category is open.
   *
   * Held here rather than inside the tab list because two tab lists read it —
   * the rail from lg up and the pill strip below that — and they have to agree.
   * Experience is first for the same reason it is first in the table: it is the
   * strongest evidence a file carries.
   */
  const [active, setActive] = useState<string>(RECORD_SECTIONS[0].id);

  return (
    <div className="space-y-3">
      <RecordIdentity
        name={student.name}
        avatarUrl={student.avatarUrl}
        seed={student.id}
        tierLabel={tierLabel}
        counts={counts}
        githubLoading={githubLoading}
        onSyncGithub={onSyncGithub}
        linkedinLoading={linkedinLoading}
        onImportLinkedIn={onImportLinkedIn}
        controls={
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Grade">
              <Select
                value={profile.gradeLevel}
                onValueChange={(v) => update((p) => ({ ...p, gradeLevel: v }))}
              >
                <SelectTrigger aria-label="Grade level" className={FIELD}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="cly-scope font-cluely">
                  {["9", "10", "11", "12"].map((g) => (
                    <SelectItem key={g} value={g}>
                      Grade {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Test">
              <Select
                value={profile.testType}
                onValueChange={(v) => update((p) => ({ ...p, testType: v, testScore: "" }))}
              >
                <SelectTrigger aria-label="Test type" className={FIELD}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="cly-scope font-cluely">
                  {TEST_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {/* Only rendered once a test is named, so an untested student is
                never shown an empty box that looks like a missing answer. A
                blank score is left out of the reading entirely rather than
                counted as a zero. */}
            {profile.testType !== "none" && (
              <Field label="Score">
                <Input
                  className={FIELD}
                  type="number"
                  inputMode="numeric"
                  aria-label="Test score"
                  placeholder={profile.testType === "act" ? "36" : "1600"}
                  value={profile.testScore}
                  onChange={(e) => update((p) => ({ ...p, testScore: e.target.value }))}
                />
              </Field>
            )}
          </div>
        }
      />

      {/*
       * The tab list and the category it selects.
       *
       * The list is a column of its own from lg up, where there is room for it
       * beside the record without squeezing an entry row. Below that the same
       * twelve run as a scrolling row of pills above the card, because a
       * vertical list of twelve names costs a whole phone screen before the
       * record starts.
       */}
      <div className="lg:hidden">
        <RecordTabStrip counts={counts} active={active} onSelect={setActive} />
      </div>

      <div className="grid gap-3 lg:grid-cols-12 lg:items-start">
        <div className="hidden lg:col-span-3 lg:block">
          <RecordRail counts={counts} active={active} onSelect={setActive} />
        </div>

        <div className="lg:col-span-9">
          <RecordSections
            profile={profile}
            update={update}
            ranked={ranked}
            active={active}
          />
        </div>
      </div>
    </div>
  );
}
