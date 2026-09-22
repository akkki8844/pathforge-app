import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Search, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Seo } from "@/components/Seo";
import { cn } from "@/lib/utils";
import { pastAdmits, admitSchools, admitMajors, type PastAdmit } from "@/data/pastAdmits";
import { CollegeLogo } from "@/components/CollegeLogo";
import { AdmitCard } from "@/components/admits/AdmitCard";
import { AdmitDetail } from "@/components/admits/AdmitDetail";
import { admitSimilarity } from "@/lib/admitSimilarity";
import { useAuth } from "@/contexts/AuthContext";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { AnimatedCounter } from "@/components/animations/AnimatedCounter";
import { transition } from "@/lib/motion";
import { Eyebrow } from "@/components/cluely/primitives";
import { ListPager } from "@/components/activities/ListPager";

type SortKey = "similarity" | "acceptances" | "recent" | "name";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "similarity", label: "Most similar to me" },
  { key: "acceptances", label: "Most acceptances" },
  { key: "recent", label: "Most recent" },
  { key: "name", label: "A–Z" },
];

/**
 * Profiles per page.
 *
 * Ten rather than the Activities page's twelve, because these cards are one
 * per row and considerably taller — twelve of them is a scroll long enough
 * that the pager at the bottom stops being findable. Ten keeps the whole list
 * within about three screens on a laptop.
 */
const PAGE_SIZE = 10;

/** Named schools we can list, plus any unnamed extras the reporting counted. */
function acceptanceCount(a: PastAdmit) {
  return a.totalAccepted ?? a.acceptedTo.length + (a.alsoAccepted?.length ?? 0);
}

function FilterChip({
  active,
  onClick,
  layoutId,
  children,
}: {
  active: boolean;
  onClick: () => void;
  layoutId: string;
  children: React.ReactNode;
}) {
  const prefersReduced = useReducedMotion();
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative rounded-full px-3 py-1 text-xs font-medium transition-colors border",
        active
          ? "border-transparent text-primary-foreground"
          : "bg-background text-muted-foreground border-border hover:text-foreground hover:border-foreground/20",
      )}
    >
      {active &&
        (prefersReduced ? (
          <span className="absolute inset-0 rounded-full bg-primary" />
        ) : (
          <motion.span
            layoutId={layoutId}
            transition={transition.spring}
            className="absolute inset-0 rounded-full bg-primary"
          />
        ))}
      <span className="relative z-10 inline-flex items-center gap-1.5">{children}</span>
    </button>
  );
}

export default function PastAdmits() {
  const { onboardingData } = useAuth();
  const [query, setQuery] = useState("");
  const [chose, setChose] = useState<string | null>(null);
  const [major, setMajor] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("similarity");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Similarity is viewer-relative, so it's computed once per profile rather
  // than inside the card — sorting needs it before anything renders.
  const similarityById = useMemo(() => {
    const map: Record<string, number | null> = {};
    for (const a of pastAdmits) map[a.id] = admitSimilarity(a, onboardingData);
    return map;
  }, [onboardingData]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = pastAdmits.filter((a) => {
      if (chose && a.chose !== chose) return false;
      if (major && a.major !== major) return false;
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) ||
        a.highSchool.toLowerCase().includes(q) ||
        a.location.toLowerCase().includes(q) ||
        a.chose.toLowerCase().includes(q) ||
        a.major.toLowerCase().includes(q) ||
        a.acceptedTo.some((c) => c.toLowerCase().includes(q)) ||
        (a.intendedFocus?.toLowerCase().includes(q) ?? false) ||
        a.activities.some((x) => x.toLowerCase().includes(q))
      );
    });

    // Copy before sorting — sort() mutates, and pastAdmits is module state
    // shared with every other render.
    return [...matches].sort((a, b) => {
      if (sort === "similarity") {
        // Unscored profiles sink rather than sorting as 0 alongside genuine
        // low matches, then fall back to the acceptance ordering.
        const sa = similarityById[a.id];
        const sb = similarityById[b.id];
        if (sa !== null && sb !== null && sa !== sb) return sb - sa;
        if (sa !== null && sb === null) return -1;
        if (sa === null && sb !== null) return 1;
        return acceptanceCount(b) - acceptanceCount(a);
      }
      if (sort === "acceptances") return acceptanceCount(b) - acceptanceCount(a);
      if (sort === "recent") return Number(b.gradYear) - Number(a.gradYear);
      return a.name.localeCompare(b.name);
    });
  }, [query, chose, major, sort, similarityById]);

  /**
   * Page the list.
   *
   * The cursor is clamped on every render rather than corrected in an effect,
   * because a filter that shrinks the list from nine pages to two can leave
   * `page` at seven for one render, and an unclamped slice would return an
   * empty array — a list that looks like "no results" when there are results.
   * Clamping lands them on the last page of the new set instead.
   */
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const cursor = Math.min(page, pageCount);
  const pageItems = useMemo(
    () => filtered.slice((cursor - 1) * PAGE_SIZE, cursor * PAGE_SIZE),
    [filtered, cursor],
  );

  /**
   * Changing a filter or the sort order puts you back on page one — the
   * clamp above would otherwise drop you on the last page of the new set,
   * so a search meant to show you the best match would open on the worst.
   */
  useEffect(() => { setPage(1); }, [query, chose, major, sort]);

  const activeIndex = filtered.findIndex((a) => a.id === activeId);
  const active = activeIndex >= 0 ? filtered[activeIndex] : null;

  const step = useCallback(
    (delta: number) => {
      const nextIndex = activeIndex + delta;
      const next = filtered[nextIndex];
      if (!next) return;
      setActiveId(next.id);
      // The overlay walks the whole filtered list, not just the visible page,
      // so stepping past a page boundary has to move the page with it —
      // otherwise closing the overlay leaves you looking at a list that does
      // not contain the profile you were just reading.
      setPage(Math.floor(nextIndex / PAGE_SIZE) + 1);
    },
    [filtered, activeIndex],
  );

  /**
   * Moving page scrolls back to the top of the list. Without it, clicking "3"
   * from the bottom of page two leaves you looking at the last row of the new
   * page with no sign that anything changed.
   */
  const goToPage = useCallback((next: number) => {
    setPage(next);
    listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const totalAcceptances = useMemo(
    () => pastAdmits.reduce((sum, a) => sum + acceptanceCount(a), 0),
    [],
  );

  return (
    <div data-cluely className="min-h-svh bg-background py-8 font-cluely sm:py-12">
      <Seo
        title="Past Admits"
        description="Real students, real acceptances, real stats — every profile sourced from published reporting, with citations you can check yourself."
        path="/past-admits"
      />
      {/* Wider than the site default: cards are one-per-row and the acceptance
          grid needs the horizontal room to stay on two lines. */}
      <div className="section-container max-w-5xl">
        {/* Header */}
        <ScrollReveal className="mb-8">
          <Eyebrow>Real acceptances, verified</Eyebrow>
          <h1 className="mt-2 max-w-[26ch] text-balance font-cluely text-[clamp(1.7rem,5vw,2.4rem)] font-semibold leading-[1.08] tracking-[-0.035em]">
            What actually got them in
          </h1>
          <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-muted-foreground">
            Real students whose admissions results were publicly reported — stats, full acceptance
            lists, activities, and essays where they exist. Every claim links to its source so you
            can verify it yourself.
          </p>
        </ScrollReveal>

        {/* At-a-glance totals */}
        <ScrollReveal delay={0.05} className="mb-6">
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: pastAdmits.length, label: "Verified profiles" },
              { value: totalAcceptances, label: "Reported acceptances" },
              { value: admitSchools.length, label: "Schools chosen" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-border bg-card px-4 py-3 text-center">
                <div className="text-2xl font-bold tabular-nums text-foreground">
                  <AnimatedCounter target={s.value} duration={1.4} />
                </div>
                <div className="text-[10px] sm:text-[11px] uppercase tracking-wide text-muted-foreground mt-0.5">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </ScrollReveal>

        {/* Integrity note */}
        <ScrollReveal delay={0.08} className="mb-6">
          {/* A green shield used to sit here. A badge that says "trust this"
              is the weakest possible evidence for the claim beside it, so the
              claim stands on its own, marked as an aside by a rule. */}
          <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 border-l-[3px] border-l-emerald-500 dark:border-l-emerald-400">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Every profile here is publicly documented.</strong>{" "}
              These students went public with their results through named news outlets. We don't
              scrape private admissions databases or republish anyone who didn't choose to share.
              Where a stat wasn't reported, we say so rather than guessing — you'll never see an
              invented number on this page.
            </p>
          </div>
        </ScrollReveal>

        {/* Search + filters */}
        <ScrollReveal delay={0.12} className="mb-6">
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, school, state, or activity…"
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              <FilterChip active={!major} onClick={() => setMajor(null)} layoutId="admit-major-pill">
                All majors
              </FilterChip>
              {admitMajors.map((m) => (
                <FilterChip
                  key={m}
                  active={major === m}
                  onClick={() => setMajor(major === m ? null : m)}
                  layoutId="admit-major-pill"
                >
                  {m}
                </FilterChip>
              ))}
            </div>

            <div className="flex flex-wrap gap-1.5">
              <FilterChip active={!chose} onClick={() => setChose(null)} layoutId="admit-school-pill">
                All
              </FilterChip>
              {admitSchools.map((s) => (
                <FilterChip
                  key={s}
                  active={chose === s}
                  onClick={() => setChose(chose === s ? null : s)}
                  layoutId="admit-school-pill"
                >
                  <CollegeLogo name={s} size={12} />
                  Chose {s}
                </FilterChip>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground mr-0.5">
                <ArrowUpDown className="h-3 w-3" /> Sort
              </span>
              {SORTS.map((s) => (
                <FilterChip
                  key={s.key}
                  active={sort === s.key}
                  onClick={() => setSort(s.key)}
                  layoutId="admit-sort-pill"
                >
                  {s.label}
                </FilterChip>
              ))}
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                <motion.span
                  key={filtered.length}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={transition.fast}
                  className="inline-block font-semibold text-foreground tabular-nums"
                >
                  {filtered.length}
                </motion.span>{" "}
                {filtered.length === 1 ? "profile" : "profiles"}
                {pageCount > 1 && ` · page ${cursor} of ${pageCount}`}
              </span>
              <AnimatePresence>
                {(query || chose || major) && (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => { setQuery(""); setChose(null); setMajor(null); }}
                    className="text-primary hover:underline font-medium"
                  >
                    Clear filters
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>
        </ScrollReveal>

        {/* Ring legend — the outcome grid on each card is colour-coded. */}
        <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-muted-foreground">
          {[
            { cls: "border-amber-400", label: "Attending" },
            { cls: "border-emerald-500/70", label: "Accepted" },
            { cls: "border-rose-400/70", label: "Rejected" },
          ].map((l) => (
            <span key={l.label} className="inline-flex items-center gap-1.5">
              <span className={cn("h-3.5 w-3.5 rounded-[4px] border-2", l.cls)} />
              {l.label}
            </span>
          ))}
        </div>

        {/* List */}
        <div ref={listRef} className="scroll-mt-6" />
        {filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={transition.base}
            className="rounded-xl border border-dashed border-border py-16 text-center"
          >
            <p className="text-sm text-muted-foreground">
              No profiles match that search.
            </p>
          </motion.div>
        ) : (
          <>
            {/*
              Keyed on the page so moving page unmounts the old cards rather
              than re-labelling them in place — without the key, the ten cards
              of page two animate in as edits to page one's rows, which reads
              as a glitch rather than as a new page.
            */}
            <div key={cursor} className="flex flex-col gap-4">
              {pageItems.map((admit) => (
                <AdmitCard
                  key={admit.id}
                  admit={admit}
                  similarity={similarityById[admit.id]}
                  onOpen={() => setActiveId(admit.id)}
                />
              ))}
            </div>

            <ListPager
              page={cursor}
              pageCount={pageCount}
              onPageChange={goToPage}
              label="Past admits"
              className="mt-8"
            />
          </>
        )}

        {/* Honest limitation footer */}
        <ScrollReveal delay={0.05}>
          <p className="mt-8 text-[11px] text-muted-foreground leading-relaxed max-w-3xl">
            <strong className="text-foreground">A note on reading these:</strong> students who get
            into every Ivy make the news precisely because they're rare — they are not the baseline,
            and no set of stats guarantees an outcome. Admissions decisions weigh context,
            institutional priorities, and a great deal you can't see from the outside. Use these as
            evidence of what's possible, not as a formula.
          </p>
        </ScrollReveal>
      </div>

      <AnimatePresence>
        {active && (
          <AdmitDetail
            admit={active}
            onClose={() => setActiveId(null)}
            onPrev={activeIndex > 0 ? () => step(-1) : undefined}
            onNext={activeIndex < filtered.length - 1 ? () => step(1) : undefined}
            position={`${activeIndex + 1} of ${filtered.length}`}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
