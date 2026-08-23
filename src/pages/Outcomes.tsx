import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Seo } from "@/components/Seo";
import { EASE_OUT_EXPO } from "@/lib/motion";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
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
  proofLedger,
  rankSignals,
  readCoursework,
  readRunway,
  readShape,
  TIER_LABEL,
  tierOf,
} from "@/lib/outcomesScoring";
import { listEntries, type RecordKind } from "@/lib/outcomesRecord";
import { ColumnHead } from "@/components/outcomes/primitives";
import { Verdict } from "@/components/outcomes/Verdict";
import { SignalStandings } from "@/components/outcomes/Standings";
import { SupportingDetail } from "@/components/outcomes/SupportingDetail";
import { RecordEditor } from "@/components/outcomes/RecordEditor";
import {
  FilterBar,
  FilterSidebar,
  type OutcomesFilters,
  type RecordFilter,
} from "@/components/outcomes/FilterSidebar";

/**
 * Outcomes.
 *
 * A student's evidence file, and the reading taken from it.
 *
 * The page is split down the middle by the two questions it answers, and each
 * side only ever answers one of them. On the left, *what do I want to compare?*
 * — every control on the page, as labelled dropdowns in one panel. On the
 * right, *what is my result?* — the verdict, then what justifies it, and
 * nothing you can adjust.
 *
 * The version before this had the two interleaved: the tier and grade selects
 * were buried inside the record editor, the record's own filter was a row of
 * eleven pills partway down the feed, and the reading arrived as seven panels
 * of figures competing for the same glance. A student wanting to re-read their
 * file against a different tier had to find a dropdown inside the thing they
 * were re-reading, and a student wanting their score had to identify it among
 * five other large numbers. Both problems were layout, not data: every
 * calculation here is the one that was here before.
 *
 * All scoring lives in `@/lib/outcomesScoring` — see that file for what each
 * scale is calibrated against and why.
 */

export default function Outcomes() {
  const reduced = useReducedMotion();
  const { profile, loading, saving, updateProfile } = useOutcomesData();
  const { weights } = useScoringWeights();
  const {
    repos: githubRepos,
    connected: githubConnected,
    loading: githubLoading,
    refresh: refreshGithub,
  } = useGitHubRepos();
  const [githubMerged, setGithubMerged] = useState(false);
  // The page opens on the record, and the choice holds for the visit once they
  // switch to the reading.
  const [view, setView] = useState<"record" | "reading">("record");
  const [recordFilter, setRecordFilter] = useState<RecordFilter>("all");
  // Mobile only: the sidebar as a drawer. Closed on every load — a filter panel
  // that opens itself is a filter panel between you and your score.
  const [filtersOpen, setFiltersOpen] = useState(false);

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
  const academicsBar = reading.categories.find((c) => c.key === "academics")?.bar ?? 95;

  // Counts per kind, for the record filter's options. Computed here rather than
  // inside the editor because the control that needs them now lives elsewhere.
  const entries = useMemo(() => listEntries(profile), [profile]);
  const counts = useMemo(() => {
    const map = new Map<RecordKind, number>();
    for (const e of entries) map.set(e.spec.id, (map.get(e.spec.id) ?? 0) + 1);
    return map;
  }, [entries]);

  const update = useCallback(
    (updater: (prev: OutcomesProfile) => OutcomesProfile) => updateProfile(updater),
    [updateProfile]
  );

  const filters: OutcomesFilters = {
    view,
    targetTier: profile.targetTier,
    gradeLevel: profile.gradeLevel,
    testType: profile.testType,
    testScore: profile.testScore,
    recordFilter,
  };

  const sidebar = (
    <FilterSidebar
      filters={filters}
      counts={counts}
      entryTotal={entries.length}
      onView={setView}
      onRecordFilter={setRecordFilter}
      onProfile={update}
    />
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

      {saving && (
        <div className="fixed right-4 top-20 z-50 flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 shadow-sm">
          <Save className="h-3.5 w-3.5 animate-pulse text-primary" />
          <span className="font-display text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Saving
          </span>
        </div>
      )}

      {/* Matches the dashboard's measure — deliberately narrower than the app's
          max-w-7xl, so long lines of reasoning stay readable. */}
      <div className="pad-safe-x pad-safe-bottom mx-auto w-full max-w-[1180px] px-4 pb-24 pt-8 sm:px-6">
        <motion.header
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE_OUT_EXPO }}
          className="mb-6"
        >
          <h1 className="max-w-[16ch] text-balance font-serif text-[clamp(2rem,8vw,3.9rem)] leading-[0.95] tracking-[-0.035em]">
            Your record, read honestly.
          </h1>

          <div className="dash-double-rule mt-5" aria-hidden />
        </motion.header>

        {/*
         * The split.
         *
         * 12 columns, four to the controls and eight to the answer — the
         * dashboard's bed and its ratio, so the two pages read as one product.
         * Below `lg` there is no split at all: the controls collapse to a
         * single summary bar and the answer takes the full width, because a
         * stacked sidebar on a phone is just the old page with extra scrolling.
         */}
        <div className="lg:grid lg:grid-cols-12 lg:gap-[0.65rem]">
          {/* ── Left: what do I want to compare? ──────────────────────── */}
          <aside className="hidden lg:col-span-4 lg:block xl:col-span-3">
            {/* Sticky under the app's own navigation so the controls stay
                reachable while the answer is scrolled. */}
            <div className="sticky top-[calc(env(safe-area-inset-top,0px)+5rem)]">{sidebar}</div>
          </aside>

          <div className="mb-3 lg:hidden">
            <FilterBar filters={filters} onOpen={() => setFiltersOpen(true)} />
          </div>

          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetContent
              side="left"
              className="w-[min(22rem,88vw)] overflow-y-auto p-4"
            >
              <SheetTitle className="sr-only">Outcomes filters</SheetTitle>
              {sidebar}
            </SheetContent>
          </Sheet>

          {/* ── Right: what is my result? ─────────────────────────────── */}
          <main className="min-w-0 lg:col-span-8 xl:col-span-9">
            {view === "record" ? (
              <div className="space-y-[0.65rem]">
                <RecordEditor
                  profile={profile}
                  update={update}
                  githubLoading={githubLoading}
                  onSyncGithub={syncGithub}
                  filter={recordFilter}
                  onFilter={setRecordFilter}
                />
                <p className="px-1 pt-1 text-[13.5px] leading-relaxed text-muted-foreground">
                  Everything saves as you type. Switch to{" "}
                  <button
                    type="button"
                    onClick={() => setView("reading")}
                    className="text-foreground underline underline-offset-2"
                  >
                    the reading
                  </button>{" "}
                  to see what this record scores against your target tier.
                </p>
              </div>
            ) : (
              <div className="space-y-[0.65rem]">
                {/* The answer, and the confidence in it. Everything below this
                    is subordinate to it by construction: one hero panel, then
                    the standings, then one detail panel at a time. */}
                <Verdict reading={reading} ranked={ranked} proof={proof} runway={runway} />

                <SignalStandings ranked={ranked} tier={reading.tier} />

                <div className="pt-1">
                  <SupportingDetail
                    reading={reading}
                    proof={proof}
                    shape={shape}
                    coursework={coursework}
                    runway={runway}
                    academicsBar={academicsBar}
                  />
                </div>

                {/*
                 * How the reading is built. A student is entitled to know what
                 * the number is doing before they act on it. Last on the page
                 * and set as running prose rather than as a panel of figures,
                 * because it is the footnote to everything above, not another
                 * reading.
                 */}
                <div className="rounded-2xl border border-foreground/[0.14] bg-card/70 p-5 sm:p-6">
                  <ColumnHead>How this is calculated</ColumnHead>
                  <div className="mt-4 grid gap-x-10 gap-y-4 sm:grid-cols-2">
                    <p className="max-w-[46ch] text-[13.5px] leading-relaxed text-muted-foreground">
                      <span className="text-foreground">100 is the bar, not the maximum.</span>{" "}
                      Every figure is scored against the evidence profile Pathforge holds{" "}
                      {TIER_LABEL[reading.tier]} applicants to. Change your target tier on the
                      left and the bars move; your file does not.
                    </p>
                    <p className="max-w-[46ch] text-[13.5px] leading-relaxed text-muted-foreground">
                      <span className="text-foreground">Nothing here is a percentile.</span>{" "}
                      Pathforge holds no admitted-student cohort, so it cannot rank you inside
                      one. The bars are a published standard and are named as such.
                    </p>
                    <p className="max-w-[46ch] text-[13.5px] leading-relaxed text-muted-foreground">
                      <span className="text-foreground">Proof beats claims.</span> A verified
                      entry counts in full, submitted-but-unchecked proof at 40%, and a typed
                      claim at almost nothing — which is what calibration is reporting.
                    </p>
                    <p className="max-w-[46ch] text-[13.5px] leading-relaxed text-muted-foreground">
                      <span className="text-foreground">Time is not a score.</span> Being in an
                      earlier grade gives you runway, not readiness, so it is reported
                      separately and never added to your reading.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}
