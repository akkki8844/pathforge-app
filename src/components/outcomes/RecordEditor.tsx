import { Fragment, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Github, Loader2, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { EASE_OUT_EXPO } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ColumnHead, Figure, Panel, PanelHead, Reveal } from "./primitives";
import { EntryCard } from "./EntryCard";
import {
  KIND_SPECS,
  blankEntry,
  groupByYear,
  listEntries,
  type KindSpec,
  type RecordKind,
} from "@/lib/outcomesRecord";
import type { Course, OutcomesProfile } from "@/hooks/useOutcomesData";

/**
 * The record.
 *
 * Before this, the record was eight collapsed forms — one per array on the
 * profile — and a student had to know which of them a debate final belonged in
 * before they could write it down. It read as settings, not as an account of a
 * person, and the thing the page exists for was the hardest thing on it to do.
 *
 * It is now one dated run of entries, most recent first, of every kind a
 * student actually does: projects, work, leadership, activities, volunteering,
 * competitions, awards, research, publications, portfolio, certifications.
 * Adding one is a single button that is on screen wherever you have scrolled
 * to, and every entry reads as a line of a CV until you ask to edit it, at
 * which point its fields open underneath it.
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

/** Which kinds the feed shows. `all` is not a kind, so it is spelled out. */
export type RecordFilter = RecordKind | "all";

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
  githubLoading: boolean;
  onSyncGithub: () => void;
  /**
   * Which kinds the feed shows. Owned by the page because logging a new entry
   * has to clear it, but presented here — a filter belongs on the thing it
   * filters, not in a panel on the far side of the page.
   */
  filter: RecordFilter;
  onFilter: (filter: RecordFilter) => void;
}

export function RecordEditor({
  profile,
  update,
  githubLoading,
  onSyncGithub,
  filter,
  onFilter,
}: RecordEditorProps) {
  const reduced = useReducedMotion();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);

  // Generic list helpers. One set for all eight lists rather than the
  // twenty-four near-identical handlers this file used to carry.
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

  /*
   * The three casts below are the seam between a record that is handled by one
   * spec table and lists that are eight different interfaces. The spec pairs
   * each kind with the list that holds it and the shape that list expects; the
   * generic helpers cannot express that pairing without a discriminated union
   * per category, which is the eight-branch switch this file was written to
   * delete.
   */
  const addRow = add as (key: ListKey, item: unknown) => void;
  const editRow = edit as (key: ListKey, id: string, patch: unknown) => void;
  const dropRow = drop as (key: ListKey, id: string) => void;

  const entries = useMemo(() => listEntries(profile), [profile]);
  // How many of each kind are on file, so every filter option can say what it
  // will show before it is chosen.
  const kindCounts = useMemo(() => {
    const map = new Map<RecordKind, number>();
    for (const e of entries) map.set(e.spec.id, (map.get(e.spec.id) ?? 0) + 1);
    return map;
  }, [entries]);
  const shown = filter === "all" ? entries : entries.filter((e) => e.spec.id === filter);
  const groups = useMemo(() => groupByYear(shown), [shown]);

  /**
   * Log one of anything.
   *
   * The entry is created blank, opened for editing, and the record is scrolled
   * to — a row appearing somewhere off screen is indistinguishable from the
   * button not working, which is most of what was wrong with adding into a
   * collapsed section.
   */
  const logSomething = (spec: KindSpec) => {
    const id = newId();
    addRow(spec.host, blankEntry(spec, id));
    setEditingId(id);
    setPicking(false);
    // Clear the filter as well: logging a competition while the feed is showing
    // only projects would otherwise open an editor for a row that is not there.
    onFilter("all");
    // rAF rather than a timeout: the scroll has to happen after the new row has
    // laid out, and one frame is that moment.
    requestAnimationFrame(() => {
      document.getElementById("record-feed")?.scrollIntoView({
        behavior: reduced ? "auto" : "smooth",
        block: "start",
      });
    });
  };

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
      {/* ── Who you are, and what you are aiming at ─────────────────────── */}
      <Reveal delay={0.05}>
        <Panel flush>
          <div className="p-5 sm:p-6">
            <PanelHead
              eyebrow="The record"
              title="Everything you have done, most recent first"
              note={
                <>
                  <Figure size="sm" className="text-foreground">
                    {entries.length}
                  </Figure>
                  <span className="ml-1 font-cluely text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    entries
                  </span>
                </>
              }
            />
            <p className="mt-2.5 max-w-[64ch] text-[14px] leading-relaxed text-muted-foreground">
              Projects, jobs, clubs, competitions, awards, papers, volunteering. Everything saves
              as you type, and the reading above is computed from this and nothing else.
            </p>
          </div>

          {/*
           * Grade and testing.
           *
           * These are facts about the student, not filters, and they used to be
           * grouped with the target tier inside a panel headed "Filters" — with
           * a note explaining that the reset button deliberately would not
           * touch two of the four controls in it. That explanation was the tell:
           * they were never the same kind of thing. They belong with the rest
           * of the record, which is the only other place on this page a student
           * states a fact about themselves.
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

      {/*
       * Log something, from anywhere.
       *
       * Sticky rather than parked at the top of the page: the record is meant to
       * be read down, and the page's primary verb should not scroll off the
       * moment a student starts reading. It sits below the app's own sticky
       * navigation, and deliberately outside the panel below — a panel with
       * `overflow-hidden` would clip it out of its own sticky behaviour.
       */}
      {/* 4rem is the navbar's own height; the inset keeps it clear of the
          notch, where the navbar pads itself by the same amount. */}
      <div className="sticky top-[calc(env(safe-area-inset-top,0px)+4rem)] z-20 rounded-[0.875rem] border border-border bg-card/95 backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-5 py-3.5 sm:px-6">
          <div className="min-w-0">
            <ColumnHead>Log something</ColumnHead>
            <p className="mt-1 max-w-[46ch] text-[13.5px] leading-snug text-muted-foreground">
              {KIND_SPECS.length} kinds of entry, and coursework. It lands at the top of your
              record.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              className="h-9 text-xs"
              aria-expanded={picking}
              aria-controls="record-kinds"
              onClick={() => setPicking((p) => !p)}
            >
              {picking ? (
                <X className="mr-1.5 h-3.5 w-3.5" />
              ) : (
                <Plus className="mr-1.5 h-3.5 w-3.5" />
              )}
              {picking ? "Close" : "Add an entry"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-xs text-muted-foreground"
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
          </div>
        </div>

        <AnimatePresence initial={false}>
          {picking && (
            <motion.div
              id="record-kinds"
              initial={reduced ? false : { height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.24, ease: EASE_OUT_EXPO }}
              className="overflow-hidden rounded-b-2xl"
            >
              <div className="grid grid-cols-1 gap-px border-t border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
                {KIND_SPECS.map((spec) => (
                  <button
                    key={spec.id}
                    type="button"
                    onClick={() => logSomething(spec)}
                    className="bg-card px-5 py-3.5 text-left transition-colors hover:bg-muted/50 sm:px-6"
                  >
                    <span className="font-cluely text-[15px] font-semibold tracking-tight">
                      {spec.label}
                    </span>
                    <span className="mt-1 block max-w-[38ch] text-[13.5px] leading-snug text-muted-foreground">
                      {spec.hint}
                    </span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setPicking(false);
                    addCourse();
                  }}
                  className="bg-card px-5 py-3.5 text-left transition-colors hover:bg-muted/50 sm:px-6"
                >
                  <span className="font-cluely text-[15px] font-semibold tracking-tight">
                    Course
                  </span>
                  <span className="mt-1 block max-w-[38ch] text-[13.5px] leading-snug text-muted-foreground">
                    A class on your timetable, with the level it is taught at.
                  </span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── The record itself ───────────────────────────────────────────── */}
      <div id="record-feed" className="scroll-mt-32">
        <Reveal delay={0.05}>
          <Panel flush>
            {entries.length === 0 ? (
              <div className="p-5 sm:p-8">
                <ColumnHead>Nothing logged yet</ColumnHead>
                <p className="mt-3 max-w-[46ch] text-balance font-cluely text-[clamp(1.3rem,4.5vw,1.9rem)] leading-[1.1] tracking-[-0.02em]">
                  Start with the thing you would tell someone about first.
                </p>
                <p className="mt-3 max-w-[58ch] text-[14px] leading-relaxed text-muted-foreground">
                  It does not have to be finished or impressive. Get it down, then say what came
                  of it — an empty record reads as an empty file.
                </p>
                <Button size="sm" className="mt-6 h-9 text-xs" onClick={() => setPicking(true)}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Log your first entry
                </Button>
              </div>
            ) : (
              <>
                {/*
                 * One dropdown, on the feed it filters.
                 *
                 * This has now been a row of eleven pills and then a select in
                 * a panel on the other side of the page. One control, sitting
                 * on the thing it acts on, with the count of what each option
                 * will show — a filter that is far from its list is a filter
                 * you forget you left on.
                 *
                 * Kinds with nothing on file are left out rather than offered
                 * and then showing nothing.
                 */}
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-3 sm:px-6">
                  <ColumnHead>Showing</ColumnHead>
                  <Select value={filter} onValueChange={(v) => onFilter(v as RecordFilter)}>
                    <SelectTrigger
                      aria-label="Filter the record by kind"
                      className={cn("w-[13.5rem]", FIELD)}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="cly-scope font-cluely">
                      <SelectItem value="all">Everything ({entries.length})</SelectItem>
                      {KIND_SPECS.filter((s) => (kindCounts.get(s.id) ?? 0) > 0).map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.label} ({kindCounts.get(s.id) ?? 0})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 gap-px border-t border-border bg-border">
                  {groups.map((group) => (
                    <Fragment key={group.year ?? "undated"}>
                      {/*
                       * The dateline for a run of entries. Undated entries are
                       * grouped first, not last: they are the ones asking for
                       * something, and a freshly logged entry has no date yet —
                       * it would otherwise appear at the bottom of a long record
                       * the moment it was created.
                       */}
                      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 bg-card px-5 py-2.5 sm:px-6">
                        {group.year === null ? (
                          <ColumnHead>Undated</ColumnHead>
                        ) : (
                          <Figure size="sm" className="text-[19px] tracking-[-0.01em] text-foreground">
                            {group.year}
                          </Figure>
                        )}
                        <span className="font-cluely text-[11px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">
                          {group.year === null
                            ? "Add a month and these file themselves"
                            : `${group.entries.length} ${group.entries.length === 1 ? "entry" : "entries"}`}
                        </span>
                      </div>

                      {group.entries.map((entry) => (
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
                    </Fragment>
                  ))}

                  {shown.length === 0 && (
                    <div className="bg-card px-5 py-8 text-center sm:px-6">
                      <p className="text-[15px] leading-relaxed text-muted-foreground">
                        Nothing of that kind on file yet.
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </Panel>
        </Reveal>
      </div>

      {/* ── Coursework ──────────────────────────────────────────────────── */}
      <Reveal delay={0.05}>
        <Panel flush>
          <div className="p-5 sm:p-6">
            <PanelHead
              eyebrow="Coursework"
              title="Your timetable, and the level of each"
              note={
                <>
                  <Figure size="sm" className="text-foreground">
                    {profile.courses.length}
                  </Figure>
                  <span className="ml-1 font-cluely text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    courses
                  </span>
                </>
              }
            />
            <p className="mt-3 max-w-[64ch] text-[15px] leading-relaxed text-muted-foreground">
              Kept apart from the record above because a timetable is a list rather than a run of
              events. AP and IB carry the rigour signal; honors counts at roughly two-fifths of
              one.
            </p>
          </div>

          <div id="record-courses" className="border-t border-border p-5 sm:p-6">
            {profile.courses.length === 0 ? (
              <p className="text-[15px] leading-relaxed text-muted-foreground">
                No courses recorded yet.
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

            <Button variant="outline" size="sm" className="mt-3 h-9 w-full text-xs" onClick={addCourse}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add course
            </Button>
          </div>
        </Panel>
      </Reveal>
    </div>
  );
}
