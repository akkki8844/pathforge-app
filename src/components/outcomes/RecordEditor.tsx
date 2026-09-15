import { useMemo, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RecordIdentity } from "./RecordIdentity";
import { RecordRail } from "./RecordRail";
import { RecordSectionCard, RecordSections } from "./RecordSections";
import { countSections, RECORD_SECTIONS } from "@/lib/outcomesSections";
import type { SignalStanding } from "@/lib/outcomesScoring";
import type { Course, OutcomesProfile } from "@/hooks/useOutcomesData";

/**
 * The record.
 *
 * Three parts, in the order a LinkedIn profile has them: whose file this is,
 * an index of its sections, and the sections themselves. Coursework is the
 * twelfth section and is assembled here rather than in `RecordSections`
 * because its rows are a timetable rather than logged entries, but it wears
 * the same card so that difference stays an implementation detail.
 *
 * Grade and testing are facts about the student, not filters. They used to sit
 * in a panel headed "Filters" beside the target tier, with a note explaining
 * that the reset button deliberately would not touch two of the four controls
 * in it. That explanation was the tell: they were never the same kind of
 * thing. They are the last row of the identity card now, on the card that
 * states who the student is.
 */

const SUBJECTS = [
  "Mathematics", "Physics", "Chemistry", "Biology", "Computer Science",
  "English", "History", "Economics", "Psychology", "Environmental Science",
  "Art", "Music", "Foreign Language", "Statistics", "Calculus",
];

const FIELD = "h-9 text-xs";

const TEST_OPTIONS = [
  { value: "none", label: "Not taken" },
  { value: "sat", label: "SAT" },
  { value: "act", label: "ACT" },
  { value: "psat", label: "PSAT/NMSQT" },
];

const COURSEWORK = RECORD_SECTIONS.find((s) => s.id === "coursework")!;

function newId(): string {
  return Math.random().toString(36).substring(2, 9);
}

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
  const reduced = useReducedMotion();
  const counts = useMemo(() => countSections(profile), [profile]);

  const editCourse = (id: string, patch: Partial<Course>) =>
    update((p) => ({
      ...p,
      courses: p.courses.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));

  const dropCourse = (id: string) =>
    update((p) => ({ ...p, courses: p.courses.filter((c) => c.id !== id) }));

  const addCourse = () => {
    update((p) => ({
      ...p,
      courses: [...p.courses, { id: newId(), subject: "", level: "regular" } as Course],
    }));
    requestAnimationFrame(() => {
      document.getElementById("record-coursework")?.scrollIntoView({
        behavior: reduced ? "auto" : "smooth",
        block: "center",
      });
    });
  };

  const courseCount = profile.courses.length;

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
       * Index and sections.
       *
       * The index is a column of its own from lg up, where there is room for
       * it beside the record without squeezing an entry row. Below that it is
       * dropped rather than folded into a horizontal strip of chips: on a
       * phone the sections are already one per screen, and a scrolling row of
       * category pills is exactly the "pick a category first" control this
       * redesign exists to remove.
       */}
      <div className="grid gap-3 lg:grid-cols-12 lg:items-start">
        <div className="hidden lg:col-span-3 lg:block">
          <RecordRail counts={counts} />
        </div>

        <div className="space-y-3 lg:col-span-9">
          <RecordSections profile={profile} update={update} ranked={ranked} />

          {/* Coursework: the twelfth section, in the same card. */}
          <RecordSectionCard
            section={COURSEWORK}
            reading={
              courseCount === 0
                ? "Nothing on file"
                : `${courseCount} ${courseCount === 1 ? "course" : "courses"} · AP and IB carry the rigour signal`
            }
            onAdd={addCourse}
            addLabel={COURSEWORK.addLabel}
          >
            {courseCount === 0 ? (
              <div className="border-t border-border px-4 py-4 sm:px-5">
                <p className="max-w-[64ch] text-[13.5px] leading-relaxed text-muted-foreground">
                  {COURSEWORK.blurb}
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
                  {COURSEWORK.addLabel}
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
        </div>
      </div>
    </div>
  );
}
