import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  PenLine, Search, ExternalLink, Quote, BookOpen, Info, ChevronDown,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Seo } from "@/components/Seo";
import { cn } from "@/lib/utils";
import { CollegeLogo } from "@/components/CollegeLogo";
import { DetailOverlay, DetailSection } from "@/components/DetailOverlay";
import { AnimatedGrid } from "@/components/animations/AnimatedGrid";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { listItem, hoverLift, transition } from "@/lib/motion";
import {
  exemplarEssays, essaySchools, essayThemes, type ExemplarEssay,
} from "@/data/exemplarEssays";

function SourceBadge({ kind }: { kind: ExemplarEssay["analysisSource"] }) {
  const isAdmissions = kind === "admissions";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
        isAdmissions
          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300"
          : "bg-muted text-muted-foreground",
      )}
    >
      <Info className="h-2.5 w-2.5" />
      {isAdmissions ? "Admissions office commentary" : "Pathforge craft analysis"}
    </span>
  );
}

/** Pill that slides its active background between options rather than blinking. */
function FilterChip({
  active,
  onClick,
  layoutId,
  children,
  size = "md",
  tone = "accent",
}: {
  active: boolean;
  onClick: () => void;
  layoutId: string;
  children: React.ReactNode;
  size?: "sm" | "md";
  tone?: "accent" | "primary";
}) {
  const prefersReduced = useReducedMotion();
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative rounded-full font-medium transition-colors border",
        size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-3 py-1 text-xs",
        active
          ? "border-transparent text-accent-foreground"
          : "bg-background text-muted-foreground border-border hover:text-foreground hover:border-foreground/20",
      )}
    >
      {active && !prefersReduced && (
        <motion.span
          layoutId={layoutId}
          transition={transition.spring}
          className={cn(
            "absolute inset-0 rounded-full",
            tone === "accent" ? "bg-accent" : "bg-primary",
          )}
        />
      )}
      {active && prefersReduced && (
        <span
          className={cn(
            "absolute inset-0 rounded-full",
            tone === "accent" ? "bg-accent" : "bg-primary",
          )}
        />
      )}
      <span className={cn("relative z-10", active && tone === "primary" && "text-primary-foreground")}>
        {children}
      </span>
    </button>
  );
}

function EssayDetail({
  essay,
  onClose,
  onPrev,
  onNext,
  position,
}: {
  essay: ExemplarEssay;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  position?: string;
}) {
  return (
    <DetailOverlay
      onClose={onClose}
      onPrev={onPrev}
      onNext={onNext}
      position={position}
      contentKey={essay.id}
      ariaLabel={`${essay.title} — essay by ${essay.student}`}
    >
      {/* Right padding clears the floating nav/close controls. */}
      <DetailSection className="p-6 pb-4 pr-32 border-b border-border">
        <div className="flex items-start gap-3">
          <CollegeLogo name={essay.school} size={36} className="mt-0.5 shrink-0" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge variant="secondary" className="text-[10px]">{essay.schoolShort}</Badge>
              <Badge variant="outline" className="text-[10px]">{essay.classYear}</Badge>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">{essay.title}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {essay.student} · {essay.hometown}
              {essay.intendedMajor && <> · {essay.intendedMajor}</>}
            </p>
          </div>
        </div>
      </DetailSection>

      <div className="p-6 space-y-5">
        <DetailSection>
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
            How it opens
          </h3>
          <blockquote className="relative rounded-xl bg-muted/50 border border-border/60 p-4 pl-10">
            <Quote className="absolute left-3 top-4 h-4 w-4 text-accent/60" />
            <p className="text-[15px] leading-relaxed text-foreground italic">
              {essay.excerpt}
            </p>
          </blockquote>
          <p className="text-[11px] text-muted-foreground mt-2">
            Opening excerpt only — the full essay remains the student's own work. Read it in
            full at the official source below.
          </p>
        </DetailSection>

        <DetailSection>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Why it worked
            </h3>
            <SourceBadge kind={essay.analysisSource} />
          </div>
          <p className="text-sm leading-relaxed text-foreground">{essay.whyItWorked}</p>
        </DetailSection>

        <DetailSection>
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Themes
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {essay.themes.map((t) => (
              <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
            ))}
          </div>
        </DetailSection>

        <DetailSection>
          <motion.a
            href={essay.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ x: 2 }}
            whileTap={{ scale: 0.99 }}
            transition={transition.fast}
            className="flex items-center justify-between gap-2 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm font-medium text-foreground hover:bg-accent/10 transition-colors"
          >
            <span>Read the full essay at {essay.sourceName}</span>
            <ExternalLink className="h-4 w-4 shrink-0 text-accent" />
          </motion.a>
        </DetailSection>
      </div>
    </DetailOverlay>
  );
}

export default function ExemplarEssays() {
  const [query, setQuery] = useState("");
  const [school, setSchool] = useState<string | null>(null);
  const [theme, setTheme] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showAllThemes, setShowAllThemes] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exemplarEssays.filter((e) => {
      if (school && e.schoolShort !== school) return false;
      if (theme && !e.themes.includes(theme)) return false;
      if (!q) return true;
      return (
        e.title.toLowerCase().includes(q) ||
        e.excerpt.toLowerCase().includes(q) ||
        e.student.toLowerCase().includes(q) ||
        e.school.toLowerCase().includes(q) ||
        e.themes.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [query, school, theme]);

  // Stepping through the modal walks the *filtered* list, so arrow keys stay
  // inside whatever the reader is currently browsing.
  const activeIndex = filtered.findIndex((e) => e.id === activeId);
  const active = activeIndex >= 0 ? filtered[activeIndex] : null;

  const step = useCallback(
    (delta: number) => {
      const next = filtered[activeIndex + delta];
      if (next) setActiveId(next.id);
    },
    [filtered, activeIndex],
  );

  const visibleThemes = showAllThemes ? essayThemes : essayThemes.slice(0, 8);
  const hasFilters = Boolean(query || school || theme);

  return (
    <div className="py-8 sm:py-12">
      <Seo
        title="Exemplar Essays — Pathforge"
        description="Real college application essays officially published by admissions offices — with the committee's own notes on why each one worked."
        path="/exemplar-essays"
      />
      <div className="section-container max-w-6xl">
        {/* Header */}
        <ScrollReveal className="mb-8">
          <Badge variant="secondary" className="mb-3 gap-1.5">
            <PenLine className="h-3 w-3" /> Exemplar Essays
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Essays that actually got students in
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Every essay here was published by the college's own admissions office, with the
            student's permission — no scraped forums, no paywalled leaks. Where the committee
            explained their thinking, we quote them directly.
          </p>
        </ScrollReveal>

        {/* Sourcing note */}
        <ScrollReveal delay={0.06} className="mb-6">
          <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
            <BookOpen className="h-4 w-4 text-accent shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              We show <strong className="text-foreground">opening excerpts only</strong> and link to
              the official source for the full text. These essays belong to the students who wrote
              them. Read them to understand what strong writing looks like — never to copy.
              Admissions offices run plagiarism checks, and a recycled essay is the fastest way to
              lose an offer.
            </p>
          </div>
        </ScrollReveal>

        {/* Search + filters */}
        <ScrollReveal delay={0.1} className="mb-6">
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by topic, school, or a line you remember…"
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              <FilterChip active={!school} onClick={() => setSchool(null)} layoutId="essay-school-pill">
                All schools
              </FilterChip>
              {essaySchools.map((s) => (
                <FilterChip
                  key={s}
                  active={school === s}
                  onClick={() => setSchool(school === s ? null : s)}
                  layoutId="essay-school-pill"
                >
                  {s}
                </FilterChip>
              ))}
            </div>

            <div className="flex flex-wrap gap-1.5 items-center">
              <AnimatePresence initial={false}>
                {visibleThemes.map((t) => (
                  <motion.div
                    key={t}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={transition.fast}
                  >
                    <FilterChip
                      active={theme === t}
                      onClick={() => setTheme(theme === t ? null : t)}
                      layoutId="essay-theme-pill"
                      size="sm"
                      tone="primary"
                    >
                      {t}
                    </FilterChip>
                  </motion.div>
                ))}
              </AnimatePresence>
              {essayThemes.length > 8 && (
                <button
                  onClick={() => setShowAllThemes((v) => !v)}
                  className="text-[11px] font-medium text-accent hover:underline flex items-center gap-0.5"
                >
                  {showAllThemes ? "Show fewer" : `+${essayThemes.length - 8} more`}
                  <ChevronDown className={cn("h-3 w-3 transition-transform", showAllThemes && "rotate-180")} />
                </button>
              )}
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
                {filtered.length === 1 ? "essay" : "essays"}
              </span>
              <AnimatePresence>
                {hasFilters && (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => { setQuery(""); setSchool(null); setTheme(null); }}
                    className="text-accent hover:underline font-medium"
                  >
                    Clear filters
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>
        </ScrollReveal>

        {/* Grid */}
        {filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={transition.base}
            className="rounded-xl border border-dashed border-border py-16 text-center"
          >
            <p className="text-sm text-muted-foreground">
              No essays match that. Try a different school or theme.
            </p>
          </motion.div>
        ) : (
          <AnimatedGrid className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((essay) => (
              <motion.button
                key={essay.id}
                layout
                variants={listItem}
                exit="exit"
                {...hoverLift}
                onClick={() => setActiveId(essay.id)}
                className="card-elevated card-motion p-5 text-left flex flex-col group"
              >
                <div className="flex items-center gap-2 mb-3">
                  <CollegeLogo name={essay.school} size={20} className="shrink-0" />
                  <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                    <Badge variant="secondary" className="text-[10px]">{essay.schoolShort}</Badge>
                    <Badge variant="outline" className="text-[10px]">{essay.classYear}</Badge>
                  </div>
                </div>

                <h3 className="font-semibold text-foreground text-sm group-hover:text-accent transition-colors">
                  {essay.title}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {essay.student} · {essay.hometown}
                </p>

                {/* No wrapping quote marks — several excerpts already open with
                    dialogue, which would render as a doubled-up quote. */}
                <p className="mt-3 text-xs text-muted-foreground line-clamp-4 italic leading-relaxed flex-1">
                  {essay.excerpt}
                </p>

                <div className="mt-3 pt-3 border-t border-border flex flex-wrap items-center gap-1">
                  {essay.themes.slice(0, 2).map((t) => (
                    <Badge key={t} variant="outline" className="text-[9px]">{t}</Badge>
                  ))}
                  {essay.themes.length > 2 && (
                    <Badge variant="outline" className="text-[9px]">
                      +{essay.themes.length - 2}
                    </Badge>
                  )}
                  <span className="ml-auto text-[10px] font-medium text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                    Read →
                  </span>
                </div>
              </motion.button>
            ))}
          </AnimatedGrid>
        )}
      </div>

      <AnimatePresence>
        {active && (
          <EssayDetail
            essay={active}
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
