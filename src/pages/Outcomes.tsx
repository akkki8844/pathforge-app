import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronDown, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Seo } from "@/components/Seo";
import { EASE_OUT_EXPO } from "@/lib/motion";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useOutcomesData,
  type EvidenceState,
  type OutcomesProfile,
  type Project,
} from "@/hooks/useOutcomesData";
import { useScoringWeights } from "@/hooks/useScoringWeights";
import {
  useGitHubRepos,
  repoDuration,
  repoOutcome,
  repoSummary,
  repoTitle,
} from "@/hooks/useGitHubRepos";
import {
  computeReading,
  computeSignals,
  generateGapTasks,
  proofLedger,
  rankSignals,
  readCoursework,
  readRunway,
  readShape,
  TIER_LABEL,
} from "@/lib/outcomesScoring";
import { ColumnHead, Eyebrow, Title } from "@/components/outcomes/primitives";
import { Verdict } from "@/components/outcomes/Verdict";
import { GapWork } from "@/components/outcomes/GapWork";
import {
  CourseworkStanding,
  FileShape,
  PointsLedger,
  ProofLedger,
  SignalStandings,
} from "@/components/outcomes/Standings";
import { RecordEditor, type RecordFilter } from "@/components/outcomes/RecordEditor";

/**
 * Outcomes.
 *
 * Four blocks: the verdict, the work it implies, the signals behind it, and
 * the record it is all computed from. The method is a fifth, closed.
 *
 * The version before this had eight — a verdict panel carrying its own
 * calibration meter, the work, the standings, a "depth against breadth"
 * reading, a runway reading, the record, and a method section holding three
 * more — every one of them a full ruled card in Atlas cream with a serif
 * headline, an explanatory paragraph and, in several cases, a second paragraph
 * explaining why the first one is not a score. The information was right and
 * the page was unusable: a student asking "am I on track, and what do I do"
 * had to read about two thousand words of typeset argument to find out.
 *
 * The cuts. Shape, runway and proof coverage were three panels stating one
 * number each; they are three figures in a row inside the verdict now. The
 * work printed every task fully open — objective, scope, four proof bullets,
 * horizon, a status control — so its three-item shortlist ran to two screens;
 * the tasks are one line each with the detail behind a chevron. Every signal
 * row carried a sentence of explanation under its bar, which is a page of
 * prose pretending to be a table. Nothing was removed from the model: every
 * figure the old page computed is still computed and still shown.
 *
 * The look is Cluely's, using their own tokens and their own typeface — see
 * `[data-cluely]` in `index.css` and `components/outcomes/primitives.tsx`.
 * That attribute is on the wrapper below, which is the whole mechanism: every
 * shadcn control inside this route inherits the palette, and nothing outside
 * it changes.
 *
 * All scoring lives in `@/lib/outcomesScoring` — see that file for what each
 * scale is calibrated against and why.
 */

const TIER_OPTIONS = [
  { value: "ivy", label: "Ivy / Top 10" },
  { value: "top-20", label: "Top 20" },
  { value: "top-50", label: "Top 50" },
  { value: "state", label: "State flagships" },
];

export default function Outcomes() {
  const reduced = useReducedMotion();
  const {
    profile,
    taskStates,
    loading,
    saving,
    updateProfile,
    updateTaskStates,
  } = useOutcomesData();
  const { weights } = useScoringWeights();
  const {
    repos: githubRepos,
    connected: githubConnected,
    loading: githubLoading,
    refresh: refreshGithub,
  } = useGitHubRepos();
  const [githubMerged, setGithubMerged] = useState(false);
  const [recordFilter, setRecordFilter] = useState<RecordFilter>("all");
  const [methodOpen, setMethodOpen] = useState(false);

  // Pull GitHub repositories into the projects list, deduped by URL.
  const importGithubRepos = useCallback(
    (list: typeof githubRepos, silent: boolean) => {
      if (!list.length) {
        if (!silent) toast.info("No GitHub repositories found to import.");
        return;
      }
      let added = 0;
      updateProfile((prev) => {
        const existing = new Set(
          prev.projects.map((p) => (p.link || "").trim().toLowerCase()).filter(Boolean)
        );
        const fresh = list
          .filter((r) => !existing.has(r.url.toLowerCase()))
          .map<Project>((r) => ({
            id: `gh-${r.id}`,
            title: repoTitle(r),
            description: repoSummary(r),
            duration: repoDuration(r),
            outcome: repoOutcome(r),
            link: r.url,
            evidenceState: "evidence_submitted" as EvidenceState,
          }));
        added = fresh.length;
        if (!fresh.length) return prev;
        return { ...prev, projects: [...prev.projects, ...fresh] };
      });
      if (!silent) {
        toast.success(
          added ? `Imported ${added} repositor${added === 1 ? "y" : "ies"}` : "Projects already up to date"
        );
      }
    },
    [updateProfile]
  );

  useEffect(() => {
    if (githubMerged || loading || githubLoading || !githubConnected || !githubRepos.length) return;
    setGithubMerged(true);
    importGithubRepos(githubRepos, true);
  }, [githubMerged, loading, githubLoading, githubConnected, githubRepos, importGithubRepos]);

  const syncGithub = useCallback(async () => {
    const list = await refreshGithub();
    importGithubRepos(list, false);
  }, [refreshGithub, importGithubRepos]);

  // ── The reading ────────────────────────────────────────────────────────
  const signals = useMemo(() => computeSignals(profile), [profile]);
  const reading = useMemo(
    () => computeReading(signals, weights, profile.targetTier),
    [signals, weights, profile.targetTier]
  );
  const ranked = useMemo(() => rankSignals(signals, profile.targetTier), [signals, profile.targetTier]);
  const proof = useMemo(() => proofLedger(profile), [profile]);
  const shape = useMemo(() => readShape(signals, profile), [signals, profile]);
  const runway = useMemo(() => readRunway(profile.gradeLevel), [profile.gradeLevel]);
  const coursework = useMemo(() => readCoursework(profile), [profile]);
  const tasks = useMemo(() => generateGapTasks(signals, reading), [signals, reading]);
  const academicsBar = reading.categories.find((c) => c.key === "academics")?.bar ?? 95;

  const update = useCallback(
    (updater: (prev: OutcomesProfile) => OutcomesProfile) => updateProfile(updater),
    [updateProfile]
  );

  const setTaskState = useCallback(
    (taskId: string, state: EvidenceState) =>
      updateTaskStates((prev) => ({ ...prev, [taskId]: state })),
    [updateTaskStates]
  );

  if (loading) {
    return (
      <div className="flex min-h-[70svh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Seo
        title="Outcomes — Pathforge"
        description="Your evidence file, read against the standard your target tier expects, with the gaps ranked by what closing them recovers."
        path="/outcomes"
      />

      {/*
       * `data-cluely` is the entire theming mechanism — see `index.css`.
       *
       * Custom properties inherit down the *DOM* tree, and Radix portals its
       * popovers to `document.body`, which is outside this element. So the
       * same token block is also published under `.cly-scope`, and every
       * `SelectContent` on this route carries that class — without it a
       * dropdown opened from a Cluely-white panel renders in the app's cream.
       */}
      <div data-cluely className="min-h-svh bg-background font-cluely">
        {saving && (
          <div className="fixed right-4 top-20 z-50 flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 shadow-sm">
            <Save className="h-3.5 w-3.5 animate-pulse text-primary" />
            <span className="font-cluely text-[11px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">
              Saving
            </span>
          </div>
        )}

        <div className="pad-safe-x pad-safe-bottom mx-auto w-full max-w-[1120px] px-4 pb-24 pt-8 sm:px-6">
          <motion.header
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
            className="mb-6 flex flex-wrap items-end justify-between gap-x-8 gap-y-5"
          >
            <div className="min-w-0">
              <Eyebrow>Outcomes</Eyebrow>
              <h1 className="mt-2 max-w-[16ch] text-balance font-cluely text-[clamp(1.9rem,6.5vw,2.9rem)] font-semibold leading-[1.05] tracking-[-0.04em]">
                Your record, read honestly.
              </h1>
            </div>

            {/*
             * The page's one control.
             *
             * Target tier is the only thing here that changes the answer
             * without changing the student. It used to share a permanent
             * left-hand panel with grade, test type, test score, a view
             * switch, a record filter, a reset button and a row of state
             * chips — eight controls for a page with one real setting.
             */}
            <div className="shrink-0">
              <ColumnHead>Read against</ColumnHead>
              <div className="mt-1.5">
                <Select
                  value={profile.targetTier}
                  onValueChange={(v) => update((p) => ({ ...p, targetTier: v }))}
                >
                  <SelectTrigger
                    aria-label="Target tier"
                    className="h-10 w-[13.5rem] rounded-[0.625rem] font-cluely text-[14px] font-medium tracking-[-0.01em]"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="cly-scope font-cluely">
                    {TIER_OPTIONS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </motion.header>

          {/*
           * Four blocks, in argument order: what the file says, what to do
           * about it, what is behind that, and the file itself. The method is
           * last and closed.
           */}
          <div className="space-y-3">
            <Verdict
              reading={reading}
              ranked={ranked}
              proof={proof}
              runway={runway}
              shape={shape}
            />

            <GapWork tasks={tasks} states={taskStates} onStateChange={setTaskState} />

            <SignalStandings ranked={ranked} tier={reading.tier} />

            <div id="your-record" className="scroll-mt-24">
              <RecordEditor
                profile={profile}
                update={update}
                githubLoading={githubLoading}
                onSyncGithub={syncGithub}
                filter={recordFilter}
                onFilter={setRecordFilter}
              />
            </div>

            {/*
             * The method, closed.
             *
             * Everything in here answers "how did you get that number", which
             * a student asks once and then stops asking. Closed is not hidden:
             * the trigger says exactly what is inside, and nothing in here is
             * needed in order to act on the page.
             */}
            <Collapsible open={methodOpen} onOpenChange={setMethodOpen}>
              <CollapsibleTrigger className="group flex w-full items-center justify-between gap-4 rounded-[0.875rem] border border-border bg-card px-5 py-4 text-left transition-colors hover:bg-muted/50 sm:px-6">
                <span className="min-w-0">
                  <Eyebrow>The method</Eyebrow>
                  <Title className="mt-1.5">How this reading is calculated</Title>
                  <span className="mt-1 block text-[13px] leading-snug text-muted-foreground">
                    Where the points sit, what carries proof, your coursework, and what the bar
                    actually is.
                  </span>
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                    methodOpen && "rotate-180"
                  )}
                  aria-hidden
                />
              </CollapsibleTrigger>

              <CollapsibleContent className="space-y-3 pt-3">
                <PointsLedger reading={reading} />

                <div className="grid gap-3 lg:grid-cols-2">
                  <ProofLedger lines={proof} />
                  <CourseworkStanding
                    coursework={coursework}
                    bar={academicsBar}
                    tier={reading.tier}
                  />
                </div>

                {/* Shape is named in the verdict as one word; this is the
                    paragraph behind that word, which is advice rather than a
                    reading and so belongs with the method. */}
                <FileShape shape={shape} />

                <div className="rounded-[0.875rem] border border-border bg-card p-5 sm:p-6">
                  <ColumnHead>What the bar is</ColumnHead>
                  <div className="mt-4 grid gap-x-10 gap-y-4 sm:grid-cols-2">
                    <p className="max-w-[46ch] text-[13px] leading-relaxed text-muted-foreground">
                      <span className="text-foreground">100 is the bar, not the maximum.</span>{" "}
                      Every figure is scored against the evidence profile Pathforge holds{" "}
                      {TIER_LABEL[reading.tier]} applicants to. Change the tier at the top of the
                      page and the bars move; your file does not.
                    </p>
                    <p className="max-w-[46ch] text-[13px] leading-relaxed text-muted-foreground">
                      <span className="text-foreground">Nothing here is a percentile.</span>{" "}
                      Pathforge holds no admitted-student cohort, so it cannot rank you inside
                      one. The bars are a published standard and are named as such.
                    </p>
                    <p className="max-w-[46ch] text-[13px] leading-relaxed text-muted-foreground">
                      <span className="text-foreground">Proof beats claims.</span> A verified
                      entry counts in full, submitted-but-unchecked proof at 40%, and a typed
                      claim at almost nothing — which is what calibration is reporting.
                    </p>
                    <p className="max-w-[46ch] text-[13px] leading-relaxed text-muted-foreground">
                      <span className="text-foreground">Time is not a score.</span> Being in an
                      earlier grade gives you runway, not readiness, so it is reported separately
                      and never added to your reading.
                    </p>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
      </div>
    </>
  );
}
