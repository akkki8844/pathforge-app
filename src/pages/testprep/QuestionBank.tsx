import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Bookmark,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Minus,
  Search,
  X,
} from "lucide-react";
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
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
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
import { QuestionFigure, RichText } from "@/components/testprep/Figure";
import type { Difficulty, SubjectId } from "@/lib/testprep/types";

/** Compact select trigger used across the filter row — pill, not a form field. */
const FILTER_TRIGGER = "h-8 w-auto min-w-[8.5rem] gap-2 rounded-full border-border/60 bg-muted/30 px-3 text-xs shadow-none";
const FILTER_TRIGGER_ACTIVE = "border-[hsl(var(--bb-blue)/0.5)] bg-[hsl(var(--bb-blue)/0.1)] text-[hsl(var(--bb-blue))]";

/** Rows per page. The bank is read a page at a time, not scrolled endlessly. */
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
  /**
   * The page being read, 1-based.
   *
   * Held raw and clamped below rather than corrected in an effect: narrowing
   * the filters while on page 4 of 5 shortens the result set, and a page number
   * that fixes itself one render late shows an empty table in between.
   */
  const [pageRaw, setPage] = useState(1);
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
    setPage(1);
  };

  const toggleDomain = (id: string) => {
    setFilters((f) => {
      const current = f.domainIds.length > 0 ? f.domainIds : domains.map((d) => d.id);
      const next = current.includes(id) ? current.filter((d) => d !== id) : [...current, id];
      // All boxes checked is equivalent to no filter — keep the array empty so
      // a newly-added domain (a longer list next season) starts checked too.
      return { ...f, domainIds: next.length === domains.length ? [] : next, skillId: "all" };
    });
    setPage(1);
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

  const pageCount = Math.max(1, Math.ceil(results.length / PAGE));
  const page = Math.min(pageRaw, pageCount);
  const pageStart = (page - 1) * PAGE;
  const pageRows = results.slice(pageStart, pageStart + PAGE);

  const visibleIds = pageRows.map((q) => q.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));

  /**
   * Turning a page puts the student back at the head of the table.
   *
   * Without it, clicking page 3 from the foot of page 2 leaves them looking at
   * the pager of a table whose top they never saw. The offset clears the global
   * navbar, which is `sticky top-0`.
   */
  const goToPage = (next: number) => {
    setPage(Math.min(Math.max(1, next), pageCount));
    const table = document.getElementById("tp-bank-results");
    if (!table) return;
    window.scrollTo({
      top: table.getBoundingClientRect().top + window.scrollY - 96,
      behavior: "smooth",
    });
  };

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
            <dl className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Questions", SAT_QUESTIONS.length.toLocaleString(), "in the bank"],
                ["Completed", history.size.toLocaleString(), `${Math.round((history.size / SAT_QUESTIONS.length) * 100)}% of the bank`],
                ["Accuracy", accuracyLabel, "last answers"],
                ["Bookmarked", profile.bookmarks.length.toLocaleString(), "saved for later"],
              ].map(([label, value, sub]) => (
                <div key={label} className="flex flex-col-reverse rounded-2xl border border-border/70 bg-card px-4 py-3">
                  <dt className="text-[11px] text-muted-foreground">
                    <span className={cn(EYEBROW, "block")}>{label}</span>
                  </dt>
                  <dd className="order-first">
                    <span className="font-display text-2xl font-bold tabular-nums text-foreground">{value}</span>
                    <span className="ml-1.5 text-[11px] text-muted-foreground">{sub}</span>
                  </dd>
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
                  <SelectContent className="bluebook">
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
                <div className="flex flex-wrap gap-1.5">
                  {domains.map((d) => {
                    const checked = activeDomains.includes(d.id);
                    return (
                      <button
                        key={d.id}
                        type="button"
                        role="checkbox"
                        aria-checked={checked}
                        onClick={() => toggleDomain(d.id)}
                        className={cn(
                          "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors",
                          FOCUS,
                          checked
                            ? "border-[hsl(var(--bb-blue))] bg-[hsl(var(--bb-blue))] text-[hsl(var(--bb-blue-foreground))]"
                            : "border-border/60 bg-muted/30 text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {checked && <Check className="h-3 w-3" strokeWidth={3} />}
                        {d.name}
                      </button>
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
                    <SelectContent className="bluebook">
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
                    <SelectContent className="bluebook">
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
                    <SelectContent className="bluebook">
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
                    <SelectContent className="bluebook">
                      <SelectItem value="all">Any result</SelectItem>
                      <SelectItem value="correct">Last answered correctly</SelectItem>
                      <SelectItem value="incorrect">Last answered incorrectly</SelectItem>
                      <SelectItem value="skipped">Last left unanswered</SelectItem>
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
                    <SelectContent className="bluebook">
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
                    setPage(1);
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
              <DropdownMenuContent align="end" className="bluebook">
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
                  setPage(1);
                  setView("all");
                }}
              >
                Clear filters
              </Button>
            </div>
          ) : (
            <div id="tp-bank-results" className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  {/* The column head is the bank's one blue field, closed with
                      the section's yellow rule. A bare grey header row on white
                      was the only part of this page that could have belonged to
                      any table in the product. */}
                  <tr
                    className={cn(
                      EYEBROW,
                      "border-b-2 border-[hsl(var(--bb-rule))] bg-[hsl(var(--bb-blue-soft))] text-left text-[hsl(var(--bb-blue))]",
                    )}
                  >
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
                        aria-label="Select all on this page"
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
                  {pageRows.map((q) => {
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
                              /*
                                This used to be `aria-hidden`, which meant the
                                only thing in the row saying whether you got the
                                question right was invisible to a screen reader.
                                The glyph is now the visual half of a label, not
                                the whole signal — which also matters sighted,
                                since the palette has no red and "wrong" is a
                                black dot next to a blue one.
                              */
                              <span
                                title={
                                  h.lastOutcome === "correct"
                                    ? "Last attempt: correct"
                                    : h.lastOutcome === "skipped"
                                      ? "Last attempt: skipped"
                                      : "Last attempt: incorrect"
                                }
                                className={cn(
                                  "flex h-4 w-4 items-center justify-center rounded-full",
                                  h.lastOutcome === "correct"
                                    ? "bg-success text-success-foreground"
                                    : h.lastOutcome === "skipped"
                                      ? "border border-border bg-muted text-muted-foreground"
                                      : "bg-destructive text-destructive-foreground",
                                )}
                              >
                                <span className="sr-only">
                                  {h.lastOutcome === "correct"
                                    ? "Last attempt: correct"
                                    : h.lastOutcome === "skipped"
                                      ? "Last attempt: skipped"
                                      : "Last attempt: incorrect"}
                                </span>
                                {h.lastOutcome === "correct" ? (
                                  <Check aria-hidden className="h-2.5 w-2.5" strokeWidth={3} />
                                ) : h.lastOutcome === "skipped" ? (
                                  <Minus aria-hidden className="h-2.5 w-2.5" strokeWidth={3} />
                                ) : (
                                  <X aria-hidden className="h-2.5 w-2.5" strokeWidth={3} />
                                )}
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

          {pageCount > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 px-3 py-3 sm:px-5">
              <p className="text-xs text-muted-foreground">
                Showing{" "}
                <span className="font-medium tabular-nums text-foreground">
                  {pageStart + 1}–{Math.min(pageStart + PAGE, results.length)}
                </span>{" "}
                of <span className="font-medium tabular-nums text-foreground">{results.length}</span>
              </p>

              <nav aria-label="Question bank pages" className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  disabled={page === 1}
                  onClick={() => goToPage(page - 1)}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                {pageWindow(page, pageCount).map((n, i) =>
                  n === null ? (
                    <span
                      key={`gap-${i}`}
                      aria-hidden="true"
                      className="px-1 text-xs text-muted-foreground"
                    >
                      …
                    </span>
                  ) : (
                    <Button
                      key={n}
                      variant="ghost"
                      size="sm"
                      aria-label={`Page ${n}`}
                      aria-current={n === page ? "page" : undefined}
                      onClick={() => goToPage(n)}
                      className={cn(
                        "h-8 min-w-[2rem] px-2 text-xs tabular-nums",
                        n === page &&
                          "bg-[hsl(var(--bb-blue))] font-semibold text-[hsl(var(--bb-blue-foreground))] hover:bg-[hsl(var(--bb-blue))] hover:text-[hsl(var(--bb-blue-foreground))]",
                      )}
                    >
                      {n}
                    </Button>
                  ),
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  disabled={page === pageCount}
                  onClick={() => goToPage(page + 1)}
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </nav>
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

/**
 * The page numbers to draw, with `null` where a run is elided.
 *
 * First and last stay reachable, plus the current page and its two neighbours.
 * The bank is five pages today and will be many more later, so the pager is
 * sized by that window rather than by the number of pages.
 */
function pageWindow(page: number, count: number): (number | null)[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);

  const out: (number | null)[] = [1];
  const from = Math.max(2, page - 1);
  const to = Math.min(count - 1, page + 1);
  if (from > 2) out.push(null);
  for (let i = from; i <= to; i += 1) out.push(i);
  if (to < count - 1) out.push(null);
  out.push(count);
  return out;
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
 * "Add to selection" adds to the same selection the table's checkboxes use.
 *
 * That button used to read "Add to PDF", which named a feature that does not
 * exist anywhere in the repo, and admitted as much only in a `title` nobody
 * reads. The action itself was always real — the selection can be practised as
 * a set or bookmarked in bulk — so the fix was to call it what it does rather
 * than to remove it.
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
      <DialogContent
        className="bluebook flex h-[92vh] w-[95vw] max-w-[110rem] flex-col gap-0 overflow-hidden p-0 sm:p-0"
        aria-describedby={undefined}
      >
        {question && (
          <>
            <div className="flex shrink-0 items-center justify-between border-b-[3px] border-[hsl(var(--bb-rule))] bg-[hsl(var(--bb-blue-soft))] px-8 py-5">
              <DialogTitle asChild>
                <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
                  Question ID: <span className="font-mono">{question.id}</span>
                </h2>
              </DialogTitle>
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
                {question.figure && <QuestionFigure figure={question.figure} className="mt-6" />}
                {question.stimulus && (
                  <p className="mt-6 text-base leading-loose text-foreground">
                    <RichText text={question.stimulus} />
                  </p>
                )}
                <p className="mt-6 text-base leading-loose text-foreground">
                  <RichText text={question.prompt} />
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
                            {c.id}. <RichText text={c.text} />
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
                    ? "Already in your selection"
                    : "Adds this question to your selection, to practise or bookmark as a set"
                }
              >
                {selected ? "Added" : "Add to selection"}
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
