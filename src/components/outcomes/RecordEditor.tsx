import { type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import { Github, Linkedin, Loader2, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Panel, PanelHead, Reveal } from "./primitives";
import { RecordSections } from "./RecordSections";
import type { SignalStanding } from "@/lib/outcomesScoring";
import type { Course, OutcomesProfile } from "@/hooks/useOutcomesData";

/**
 * The record.
 *
 * Two things live here: the handful of facts a student states about
 * themselves (grade, testing, coursework), and the record proper — which is
 * now a set of titled sections rather than one undifferentiated feed. See
 * `RecordSections` for why that division is the whole point.
 *
 * What this file used to be, and why none of it survived: a sticky "Log
 * something" bar, a grid of eleven kind buttons that had to be opened before
 * anything could be added, and a filter dropdown over a single mixed feed.
 * Three controls between a student and writing down a thing they did, plus a
 * flat list in which an empty section is invisible. The sections carry their
 * own add buttons now, so the kind is implied by where you press.
 *
 * The storage is untouched: `outcomesRecord` maps every kind onto the same
 * seven jsonb lists this file always wrote to, so nothing that saved before
 * stops saving, and nothing that scored before scores differently.
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

function newId(): string {
  return Math.random().toString(36).substring(2, 9);
}

/**
 * One labelled field in the profile strip. Label above, control below, so the
 * three read as a row of questions rather than as a toolbar.
 */
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
  githubLoading: boolean;
  onSyncGithub: () => void;
  linkedinLoading: boolean;
  onImportLinkedIn: () => void;
}

export function RecordEditor({
  profile,
  update,
  ranked,
  githubLoading,
  onSyncGithub,
  linkedinLoading,
  onImportLinkedIn,
}: RecordEditorProps) {
  const reduced = useReducedMotion();

  type ListKey = {
    [K in keyof OutcomesProfile]: OutcomesProfile[K] extends { id: string }[] ? K : never;
  }[keyof OutcomesProfile];

  const add = <K extends ListKey>(key: K, item: OutcomesProfile[K][number]) =>
    update((p) => ({ ...p, [key]: [...(p[key] as OutcomesProfile[K]), item] }));

  const edit = <K extends ListKey>(key: K, id: string, patch: Partial<OutcomesProfile[K][number]>) =>
    update((p) => ({
      ...p,
      [key]: (p[key] as { id: string }[]).map((i) => (i.id === id ? { ...i, ...patch } : i)),
    }));

  const drop = <K extends ListKey>(key: K, id: string) =>
    update((p) => ({ ...p, [key]: (p[key] as { id: string }[]).filter((i) => i.id !== id) }));

  const addCourse = () => {
    add("courses", { id: newId(), subject: "", level: "regular" } as Course);
    requestAnimationFrame(() => {
      document.getElementById("record-courses")?.scrollIntoView({
        behavior: reduced ? "auto" : "smooth",
        block: "center",
      });
    });
  };

  return (
    <div className="space-y-3">
      {/* ── Who you are, and where the record can fill itself in from ────── */}
      <Reveal delay={0.05}>
        <Panel flush>
          <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4 p-5 sm:p-6">
            <div className="min-w-0">
              <PanelHead eyebrow="The record" title="Everything you have done" />
              <p className="mt-2 max-w-[68ch] text-[14px] leading-relaxed text-muted-foreground">
                Sectioned like a profile, so what is missing is as visible as what is
                there. Everything saves as you type, and the reading above is computed
                from this and nothing else.
              </p>
            </div>

            {/*
             * The two imports, as one control group.
             *
             * Both write into this same record — GitHub fills projects from your
             * repositories, LinkedIn parses an exported profile and fills work,
             * leadership, competitions, service and research. Same size, same
             * weight, side by side, because a student choosing between them is
             * choosing a source and not a feature.
             */}
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-xs"
                disabled={githubLoading}
                onClick={onSyncGithub}
              >
                {githubLoading ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Github className="mr-1.5 h-3.5 w-3.5" />
                )}
                Import from GitHub
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-xs"
                disabled={linkedinLoading}
                onClick={onImportLinkedIn}
              >
                {linkedinLoading ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Linkedin className="mr-1.5 h-3.5 w-3.5" />
                )}
                Import from LinkedIn
              </Button>
            </div>
          </div>

          {/*
           * Grade and testing.
           *
           * These are facts about the student, not filters, and they used to be
           * grouped with the target tier inside a panel headed "Filters" — with
           * a note explaining that the reset button deliberately would not
           * touch two of the four controls in it. That explanation was the tell:
           * they were never the same kind of thing.
           */}
          <div className="grid gap-4 border-t border-border p-5 sm:grid-cols-3 sm:p-6">
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
        </Panel>
      </Reveal>

      {/* ── The record, in sections ─────────────────────────────────────── */}
      <RecordSections profile={profile} update={update} ranked={ranked} />

      {/* ── Coursework ──────────────────────────────────────────────────── */}
      <Reveal delay={0.05}>
        <Panel flush>
          <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 p-5 sm:p-6">
            <div className="min-w-0">
              <PanelHead title="Coursework" />
              <p className="mt-1 text-[13px] leading-snug text-muted-foreground">
                {profile.courses.length === 0
                  ? "Nothing on file"
                  : `${profile.courses.length} ${profile.courses.length === 1 ? "course" : "courses"}`}
                {" · "}
                AP and IB carry the rigour signal; honors counts at roughly two-fifths of one
              </p>
            </div>
            <Button variant="outline" size="sm" className="h-9 shrink-0 text-xs" onClick={addCourse}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add course
            </Button>
          </div>

          <div id="record-courses" className="border-t border-border p-5 sm:p-6">
            {profile.courses.length === 0 ? (
              <p className="max-w-[72ch] text-[13.5px] leading-relaxed text-muted-foreground">
                Your timetable, and the level each class is taught at. Kept apart from the
                sections above because a timetable is a list rather than a run of events.
              </p>
            ) : (
              <div className="space-y-2">
                {profile.courses.map((c) => (
                  <div key={c.id} className="flex flex-wrap items-center gap-2">
                    <Select
                      value={c.subject}
                      onValueChange={(v) => edit("courses", c.id, { subject: v } as Partial<Course>)}
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
                      onValueChange={(v) => edit("courses", c.id, { level: v } as Partial<Course>)}
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
                      onClick={() => drop("courses", c.id)}
                      aria-label="Remove course"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Panel>
      </Reveal>
    </div>
  );
}
