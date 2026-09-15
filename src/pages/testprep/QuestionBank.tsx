import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Bookmark, Check, ChevronDown, ChevronUp, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { SAT, blueprintFor, domainName, skillName, subjectName } from "@/lib/testprep/blueprints";
import { SAT_QUESTIONS, questionById } from "@/lib/testprep/questions";
import {
  BANK_SORTS,
  EMPTY_FILTERS,
  filterQuestions,
  historyIndex,
  sortQuestions,
} from "@/lib/testprep/select";
import type { BankFilters, BankSort } from "@/lib/testprep/select";
import { toggleBookmark, useTestPrep } from "@/lib/testprep/store";
import { sessionHref } from "@/lib/testprep/nav";
import { EYEBROW, FOCUS, ROW_HOVER, SURFACE } from "@/lib/testprep/ui";
import { PageHeader, TestPrepShell } from "@/components/testprep/TestPrepShell";
import { DifficultyBar } from "@/components/testprep/primitives";
import { Collapse, Reveal } from "@/components/testprep/motion";
import { TestNotAvailable } from "@/components/testprep/TestNotAvailable";
import type { Difficulty, SubjectId } from "@/lib/testprep/types";

/** Compact select trigger used across the filter row — pill, not a form field. */
const FILTER_TRIGGER = "h-8 rounded-full border-border/60 bg-muted/30 px-3 text-xs shadow-none";
const FILTER_TRIGGER_ACTIVE = "border-[hsl(var(--bb-blue)/0.5)] bg-[hsl(var(--bb-blue)/0.1)] text-[hsl(var(--bb-blue))]";

const PAGE = 50;

/**
 * The question bank.
 *
 * A results table, not a gallery: choose a section, narrow by domain, then
 * work a dense list where difficulty, domain and skill are columns you can
 * scan straight down rather than a sentence you re-read on every row. Select
 * a batch and act on the batch — bookmark it, or start practising it — the
 * same two moves a single row offers, just at once.
 *
 * Every question in the bank today is Pathforge-written; the panel says so
 * rather than leaving it implied.
 */
export default function TestPrepQuestionBank() {
  const { testId = "sat" } = useParams();
  const blueprint = blueprintFor(testId);
  const profile = useTestPrep();
  const [filters, setFilters] = useState<BankFilters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<BankSort>("bank");
  const [limit, setLimit] = useState(PAGE);
  const [openId, setOpenId] = useState<string | null>(null);
  /**
   * The order Back/Next walk through, frozen at the moment a question opens.
   *
   * `results` keeps changing while the panel is open (answering, bookmarking),
   * so navigation reads from a snapshot rather than the live list — the same
   * reasoning that already kept the panel's own content decoupled from it.
   */
  const [navIds, setNavIds] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [view, setView] = useState<"all" | "selected">("all");
  // Open on a desktop, closed on a phone: the filter block stacked above the
  // table would push every result off a small screen before it had been
  // filtered.
  const [filtersOpen, setFiltersOpen] = useState(
    () => typeof window !== "undefined" && window.innerWidth >= 1024,
  );

  const history = useMemo(() => historyIndex(profile), [profile]);
  const filtered = useMemo(() => filterQuestions(profile, filters), [profile, filters]);
  const sorted = useMemo(() => sortQuestions(filtered, sort, history), [filtered, sort, history]);
  const results = view === "selected" ? sorted.filter((q) => selected.has(q.id)) : sorted;

  const domains = useMemo(
    () =>
      SAT.subjects
        .filter((s) => filters.subjectId === "all" || s.id === filters.subjectId)
        .flatMap((s) => s.domains),
    [filters.subjectId],
  );
  const activeDomains = filters.domainIds.length > 0 ? filters.domainIds : domains.map((d) => d.id);
  const skills = useMemo(
    () =>
      domains
        .filter((d) => activeDomains.includes(d.id))
        .flatMap((d) => d.skills),
    [domains, activeDomains],
  );

  const set = <K extends keyof BankFilters>(key: K, value: BankFilters[K]) => {
    setFilters((f) => {
      const next = { ...f, [key]: value };
      // Narrowing the subject invalidates domain/skill selections made under
      // the old subject; leaving them set would silently return zero results
      // with no visible cause.
      if (key === "subjectId") {
        next.domainIds = [];
        next.skillId = "all";
      }
      return next;
    });
    setLimit(PAGE);
  };

  const toggleDomain = (id: string) => {
    setFilters((f) => {
      const current = f.domainIds.length > 0 ? f.domainIds : domains.map((d) => d.id);
      const next = current.includes(id) ? current.filter((d) => d !== id) : [...current, id];
      // All boxes checked is equivalent to no filter — keep the array empty so
      // a newly-added domain (a longer list next season) starts checked too.
      return { ...f, domainIds: next.length === domains.length ? [] : next, skillId: "all" };
    });
    setLimit(PAGE);
  };

  const toggleRow = (id: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const cycleDifficultySort = () => {
    setSort((s) => (s === "hardest" ? "easiest" : s === "easiest" ? "bank" : "hardest"));
  };

  if (!blueprint) return <TestNotAvailable name="Test Prep" subtitle="Unknown test" />;
  if (!blueprint.available)
    return <TestNotAvailable name={blueprint.name} subtitle={blueprint.subtitle} />;

  /*
   * The opened question is looked up in the bank, not in the current results.
   *
   * Answering inside the panel changes the profile, which re-runs the filters —
   * so under a status or outcome filter the row you are reading stops matching
   * and, if the panel were bound to the result set, would vanish mid-sentence.
   */
  const open = openId ? questionById(openId) ?? null : null;

  /** Opens a question and snapshots the current result order for Back/Next. */
  const openQuestion = (id: string) => {
    setNavIds(results.map((q) => q.id));
    setOpenId(id);
  };

  const activeCount = countActive(filters);
  const answeredCount = profile.answers.length;
  const correctCount = profile.answers.filter((a) => a.correct).length;
  const accuracyLabel = answeredCount > 0 ? `${Math.round((correctCount / answeredCount) * 100)}%` : "—";

  const visibleIds = results.slice(0, limit).map((q) => q.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));

  return (
    <TestPrepShell
      testId={blueprint.id}
      testName={blueprint.name}
      testSubtitle={blueprint.subtitle}
      title="Question Bank"
      path={`/test-prep/${blueprint.id}/question-bank`}
    >
      <div className="space-y-6">
        <div className="space-y-2.5">
          <PageHeader
            title="Question Bank"
            purpose="Every question in the bank, filterable by section, domain and skill."
          />
          <Reveal delay={0.04}>
            <dl className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
              {[
                ["Questions", SAT_QUESTIONS.length.toLocaleString()],
                ["Completed", history.size.toLocaleString()],
                ["Accuracy", accuracyLabel],
                ["Bookmarked", profile.bookmarks.length.toLocaleString()],
              ].map(([label, value]) => (
                <div key={label} className="flex items-baseline gap-1.5">
                  <dd className="font-display text-sm font-bold tabular-nums text-foreground">
                    {value}
                  </dd>
                  <dt className={EYEBROW}>{label}</dt>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>

        <Reveal delay={0.08} className="space-y-3">
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={filters.search}
                onChange={(e) => set("search", e.target.value)}
                placeholder="Search questions, skills, concepts…"
                className="h-11 rounded-xl border-border/60 bg-card pl-10 pr-9 text-[15px] shadow-none"
                aria-label="Search questions"
              />
              {filters.search && (
                <button
                  type="button"
                  onClick={() => set("search", "")}
                  aria-label="Clear search"
                  className={cn(
                    "absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground",
                    FOCUS,
                  )}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-expanded={filtersOpen}
              aria-controls="tp-bank-filters"
              onClick={() => setFiltersOpen((o) => !o)}
              className={cn(
                "h-11 shrink-0 rounded-xl px-3.5 text-xs",
                activeCount > 0 && "border-[hsl(var(--bb-blue))] text-[hsl(var(--bb-blue))]",
              )}
            >
              Filters{activeCount > 0 && ` · ${activeCount}`}
              <ChevronDown
                className={cn("ml-1.5 h-3.5 w-3.5 transition-transform", filtersOpen && "rotate-180")}
              />
            </Button>
          </div>

          <Collapse open={filtersOpen}>
            <div id="tp-bank-filters" className={cn(SURFACE, "space-y-4 p-4")}>
              <div className="space-y-1.5">
                <p className={EYEBROW}>1 · Section</p>
                <Select
                  value={filters.subjectId}
                  onValueChange={(v) => set("subjectId", v as SubjectId | "all")}
                >
                  <SelectTrigger className="h-9 w-full max-w-xs rounded-lg text-sm sm:w-64" aria-label="Section">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Both sections</SelectItem>
                    {SAT.subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <p className={EYEBROW}>2 · Domain</p>
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  {domains.map((d) => {
                    const checked = activeDomains.includes(d.id);
                    return (
                      <label
                        key={d.id}
                        className={cn("flex items-center gap-2 text-sm text-foreground", FOCUS, "rounded-md")}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleDomain(d.id)}
                          className="h-4 w-4 rounded-[4px] data-[state=checked]:border-[hsl(var(--bb-blue))] data-[state=checked]:bg-[hsl(var(--bb-blue))]"
                        />
                        {d.name}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <p className={EYEBROW}>3 · More filters</p>
                <div className="flex flex-wrap gap-1.5">
                  <Select value={filters.skillId} onValueChange={(v) => set("skillId", v)}>
                    <SelectTrigger
                      className={cn(FILTER_TRIGGER, filters.skillId !== "all" && FILTER_TRIGGER_ACTIVE)}
                      aria-label="Skill"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All skills</SelectItem>
                      {skills.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={filters.difficulty}
                    onValueChange={(v) => set("difficulty", v as Difficulty | "all")}
                  >
                    <SelectTrigger
                      className={cn(FILTER_TRIGGER, filters.difficulty !== "all" && FILTER_TRIGGER_ACTIVE)}
                      aria-label="Difficulty"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any difficulty</SelectItem>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={filters.completion}
                    onValueChange={(v) => set("completion", v as BankFilters["completion"])}
                  >
                    <SelectTrigger
                      className={cn(FILTER_TRIGGER, filters.completion !== "all" && FILTER_TRIGGER_ACTIVE)}
                      aria-label="Status"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any status</SelectItem>
                      <SelectItem value="unseen">Not attempted</SelectItem>
                      <SelectItem value="seen">Attempted</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={filters.outcome}
                    onValueChange={(v) => set("outcome", v as BankFilters["outcome"])}
                  >
                    <SelectTrigger
                      className={cn(FILTER_TRIGGER, filters.outcome !== "all" && FILTER_TRIGGER_ACTIVE)}
                      aria-label="Last result"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any result</SelectItem>
                      <SelectItem value="correct">Last answered correctly</SelectItem>
                      <SelectItem value="incorrect">Last answered incorrectly</SelectItem>
                    </SelectContent>
                  </Select>

                  <button
                    type="button"
                    onClick={() => set("bookmarkedOnly", !filters.bookmarkedOnly)}
                    aria-pressed={filters.bookmarkedOnly}
                    className={cn(
                      "inline-flex h-8 items-center justify-center gap-1.5 rounded-full border px-3 text-xs transition-colors",
                      FOCUS,
                      filters.bookmarkedOnly
                        ? FILTER_TRIGGER_ACTIVE
                        : "border-border/60 bg-muted/30 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Bookmark className={cn("h-3.5 w-3.5", filters.bookmarkedOnly && "fill-current")} />
                    Bookmarked ({profile.bookmarks.length})
                  </button>

                  <Select value={sort} onValueChange={(v) => setSort(v as BankSort)}>
                    <SelectTrigger className={cn(FILTER_TRIGGER, "ml-auto")} aria-label="Sort">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BANK_SORTS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {activeCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setFilters(EMPTY_FILTERS);
                    setLimit(PAGE);
                  }}
                  className={cn("rounded-md text-xs text-[hsl(var(--bb-blue))] hover:underline", FOCUS)}
                >
                  Clear all filters
                </button>
              )}
            </div>
          </Collapse>
        </Reveal>

        <Reveal delay={0.12} className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-foreground">
            <span className="font-display font-bold tabular-nums">{results.length}</span>{" "}
            <span className="text-muted-foreground">
              question{results.length === 1 ? "" : "s"} in results set
              {selected.size > 0 && ` · ${selected.size} selected`}
            </span>
          </p>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-full border border-border/60 bg-muted/30 p-0.5 text-xs">
              {(["all", "selected"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  disabled={v === "selected" && selected.size === 0}
                  className={cn(
                    "rounded-full px-3 py-1 font-medium capitalize transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                    view === v
                      ? "bg-[hsl(var(--bb-blue))] text-[hsl(var(--bb-blue-foreground))]"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 rounded-full text-xs">
                  Manage selection
                  <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => setSelected((s) => new Set([...s, ...visibleIds]))}
                  disabled={visibleIds.length === 0}
                >
                  Select all in view
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelected(new Set())} disabled={selected.size === 0}>
                  Clear selection
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    for (const id of selected) {
                      if (!profile.bookmarks.includes(id)) toggleBookmark(id);
                    }
                  }}
                  disabled={selected.size === 0}
                >
                  Bookmark selected
                </DropdownMenuItem>
                <DropdownMenuItem asChild disabled={selected.size === 0}>
                  <Link
                    to={sessionHref(blueprint.id, {
                      kind: "custom",
                      ids: [...selected],
                    })}
                  >
                    Practise selected
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </Reveal>

        <Reveal delay={0.16} className={cn(SURFACE, "overflow-hidden")}>
          {results.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <p className="text-sm font-medium text-foreground">No questions match.</p>
              <p className="mx-auto mt-1.5 max-w-sm text-sm leading-snug text-muted-foreground">
                {filters.search
                  ? `Nothing in the bank mentions “${filters.search.trim()}” under these filters.`
                  : "Nothing in the bank matches this combination of filters."}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-5"
                onClick={() => {
                  setFilters(EMPTY_FILTERS);
                  setLimit(PAGE);
                  setView("all");
                }}
              >
                Clear filters
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className={cn(EYEBROW, "border-b border-border/60 text-left")}>
                    <th className="w-10 px-4 py-2.5 sm:px-5">
                      <Checkbox
                        checked={allVisibleSelected}
                        onCheckedChange={(c) =>
                          setSelected((s) => {
                            const next = new Set(s);
                            if (c) visibleIds.forEach((id) => next.add(id));
                            else visibleIds.forEach((id) => next.delete(id));
                            return next;
                          })
                        }
                        aria-label="Select all in view"
                        className="h-4 w-4 rounded-[4px] data-[state=checked]:border-[hsl(var(--bb-blue))] data-[state=checked]:bg-[hsl(var(--bb-blue))]"
                      />
                    </th>
                    <th className="px-2 py-2.5">ID</th>
                    <th className="px-2 py-2.5">
                      <button
                        type="button"
                        onClick={cycleDifficultySort}
                        className={cn("inline-flex items-center gap-1 normal-case tracking-normal", FOCUS)}
                      >
                        Difficulty
                        {sort === "easiest" && <ChevronUp className="h-3 w-3" />}
                        {sort === "hardest" && <ChevronDown className="h-3 w-3" />}
                      </button>
                    </th>
                    <th className="hidden px-2 py-2.5 sm:table-cell">Domain</th>
                    <th className="hidden px-2 py-2.5 md:table-cell">Skill</th>
                    <th className="px-4 py-2.5 text-right sm:px-5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {results.slice(0, limit).map((q) => {
                    const h = history.get(q.id);
                    const bookmarked = profile.bookmarks.includes(q.id);
                    const isSelected = selected.has(q.id);
                    return (
                      <tr
                        key={q.id}
                        className={cn(
                          "cursor-pointer border-b border-border/50 last:border-b-0",
                          ROW_HOVER,
                          isSelected && "bg-[hsl(var(--bb-blue-soft))]",
                        )}
                        onClick={() => openQuestion(q.id)}
                      >
                        <td className="px-4 py-3 sm:px-5" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleRow(q.id)}
                            aria-label={`Select ${q.id}`}
                            className="h-4 w-4 rounded-[4px] data-[state=checked]:border-[hsl(var(--bb-blue))] data-[state=checked]:bg-[hsl(var(--bb-blue))]"
                          />
                        </td>
                        <td className="px-2 py-3">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openQuestion(q.id);
                            }}
                            className={cn(
                              "font-mono text-xs text-[hsl(var(--bb-blue))] underline underline-offset-2",
                              FOCUS,
                            )}
                          >
                            {q.id}
                          </button>
                        </td>
                        <td className="px-2 py-3">
                          <DifficultyBar value={q.difficulty} />
                        </td>
                        <td className="hidden truncate px-2 py-3 text-muted-foreground sm:table-cell">
                          {domainName(q.domainId)}
                        </td>
                        <td className="hidden truncate px-2 py-3 text-muted-foreground md:table-cell">
                          {skillName(q.skillId)}
                        </td>
                        <td className="px-4 py-3 sm:px-5">
                          <div className="flex items-center justify-end gap-2">
                            {bookmarked && (
                              <Bookmark
                                aria-label="Bookmarked"
                                className="h-3.5 w-3.5 fill-current text-[hsl(var(--bb-blue))]"
                              />
                            )}
                            {h && (
                              <span
                                aria-hidden="true"
                                className={cn(
                                  "flex h-4 w-4 items-center justify-center rounded-full text-[hsl(var(--bb-blue-foreground))]",
                                  h.lastCorrect ? "bg-success" : "bg-destructive",
                                )}
                              >
                                {h.lastCorrect ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {results.length > limit && (
            <div className="border-t border-border/60 p-3 text-center">
              <Button variant="ghost" size="sm" onClick={() => setLimit((l) => l + PAGE)}>
                Show {Math.min(PAGE, results.length - limit)} more
              </Button>
            </div>
          )}
        </Reveal>
      </div>

      <QuestionPreview
        questionId={open?.id ?? null}
        navIds={navIds}
        onNavigate={openQuestion}
        onClose={() => setOpenId(null)}
        selected={open ? selected.has(open.id) : false}
        onAddToSelection={(id) => setSelected((s) => new Set(s).add(id))}
      />
    </TestPrepShell>
  );
}

/** How many filters are narrowing the list, for the count next to the results. */
function countActive(filters: BankFilters): number {
  let n = 0;
  if (filters.search.trim()) n += 1;
  if (filters.subjectId !== "all") n += 1;
  if (filters.domainIds.length > 0) n += 1;
  if (filters.skillId !== "all") n += 1;
  if (filters.difficulty !== "all") n += 1;
  if (filters.completion !== "all") n += 1;
  if (filters.outcome !== "all") n += 1;
  if (filters.bookmarkedOnly) n += 1;
  return n;
}

/**
 * One question, previewed from the table.
 *
 * A static preview, not a practice attempt: the choices are read, not
 * answered. Browsing the bank and attempting a question are different jobs —
 * folding them together would mean every glance at a row counts against
 * mastery figures whether or not the student meant to attempt it. Real
 * practice happens in the session runner; Back and Next walk the exact result
 * order the table was showing when this opened (see `openQuestion`), and
 * "Add to PDF" adds to the same selection the table's checkboxes use — there
 * is no PDF export yet, so the button is honest about what it actually does
 * via its title rather than silently doing nothing.
 */
function QuestionPreview({
  questionId,
  navIds,
  onNavigate,
  onClose,
  selected,
  onAddToSelection,
}: {
  questionId: string | null;
  navIds: string[];
  onNavigate: (id: string) => void;
  onClose: () => void;
  selected: boolean;
  onAddToSelection: (id: string) => void;
}) {
  const profile = useTestPrep();
  const question = questionId ? questionById(questionId) ?? null : null;
  const [showAnswer, setShowAnswer] = useState(false);

  useEffect(() => {
    setShowAnswer(false);
  }, [questionId]);

  const index = questionId ? navIds.indexOf(questionId) : -1;
  const prevId = index > 0 ? navIds[index - 1] : null;
  const nextId = index >= 0 && index < navIds.length - 1 ? navIds[index + 1] : null;
  const bookmarked = question ? profile.bookmarks.includes(question.id) : false;

  return (
    <Dialog open={!!question} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex h-[92vh] w-[95vw] max-w-[110rem] flex-col gap-0 overflow-hidden p-0 sm:p-0">
        {question && (
          <>
            <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-8 py-5">
              <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
                Question ID: <span className="font-mono">{question.id}</span>
              </h2>
              <button
                type="button"
                onClick={() => toggleBookmark(question.id)}
                aria-label={bookmarked ? "Remove bookmark" : "Bookmark this question"}
                className={cn(
                  "mr-8 rounded-md p-2 text-muted-foreground transition-colors hover:text-[hsl(var(--bb-blue))]",
                  FOCUS,
                )}
              >
                <Bookmark className={cn("h-5 w-5", bookmarked && "fill-current text-[hsl(var(--bb-blue))]")} />
              </button>
            </div>

            <div className="shrink-0 border-b border-border/60">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 bg-[hsl(var(--bb-navy))] px-8 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-[hsl(var(--bb-navy-foreground))] sm:grid-cols-5">
                <span>Assessment</span>
                <span>Section</span>
                <span>Domain</span>
                <span>Skill</span>
                <span>Difficulty</span>
              </div>
              <div className="grid grid-cols-2 items-center gap-x-4 gap-y-2 px-8 py-4 text-base text-foreground sm:grid-cols-5">
                <span>SAT</span>
                <span>{subjectName(question.subjectId)}</span>
                <span className="truncate pr-2">{domainName(question.domainId)}</span>
                <span className="truncate pr-2">{skillName(question.skillId)}</span>
                <DifficultyBar value={question.difficulty} />
              </div>
            </div>

            <div className="grid flex-1 grid-cols-1 divide-y divide-border overflow-y-auto md:grid-cols-2 md:divide-x md:divide-y-0">
              <div className="p-10">
                <p className="text-lg font-semibold text-foreground">{subjectName(question.subjectId)}</p>
                <p className="mt-1.5 text-lg font-semibold capitalize text-foreground">
                  Difficulty: {question.difficulty}
                </p>
                {question.stimulus && (
                  <p className="mt-6 whitespace-pre-line text-base leading-loose text-foreground">
                    {question.stimulus}
                  </p>
                )}
                <p className="mt-6 whitespace-pre-line text-base leading-loose text-foreground">
                  {question.prompt}
                </p>
              </div>

              <div className="p-10">
                {!showAnswer ? (
                  <>
                    <p className="text-lg font-semibold text-foreground">Answer</p>
                    {question.choices && question.choices.length > 0 ? (
                      <ul className="mt-5 space-y-4 text-base text-foreground">
                        {question.choices.map((c) => (
                          <li key={c.id}>
                            {c.id}. {c.text}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-5 text-base text-muted-foreground">
                        Student-produced response — no answer choices.
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-lg font-semibold text-foreground">Rationale</p>
                    <p className="mt-5 text-lg font-semibold text-foreground">
                      Correct Answer: {question.answer}
                    </p>
                    <p className="mt-5 whitespace-pre-line text-base leading-loose text-muted-foreground">
                      {question.explanation}
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border/60 px-8 py-5">
              <Button variant="ghost" size="default" disabled={!prevId} onClick={() => prevId && onNavigate(prevId)}>
                Back
              </Button>

              <label className={cn("flex items-center gap-2.5 text-base text-foreground", FOCUS)}>
                <Checkbox checked={showAnswer} onCheckedChange={(v) => setShowAnswer(!!v)} />
                Show correct answer and explanation
              </label>

              <Button
                size="default"
                className="rounded-full bg-[hsl(var(--bb-blue))] text-[hsl(var(--bb-blue-foreground))] hover:bg-[hsl(var(--bb-blue)/0.9)]"
                onClick={() => onAddToSelection(question.id)}
                title={
                  selected
                    ? "Already in your selection — PDF export isn't available yet"
                    : "Adds this question to your selection (PDF export isn't available yet)"
                }
              >
                {selected ? "Added" : "Add to PDF"}
              </Button>

              <Button
                variant="outline"
                size="default"
                className="rounded-full"
                disabled={!nextId}
                onClick={() => nextId && onNavigate(nextId)}
              >
                Next
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
