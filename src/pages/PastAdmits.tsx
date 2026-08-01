import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Trophy, Search, ExternalLink, GraduationCap, MapPin, Award,
  Sparkles, ShieldCheck, School, Quote, ArrowUpDown,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Seo } from "@/components/Seo";
import { cn } from "@/lib/utils";
import { pastAdmits, admitSchools, admitMajors, type PastAdmit } from "@/data/pastAdmits";
import { CollegeLogo } from "@/components/CollegeLogo";
import { AdmitCard } from "@/components/admits/AdmitCard";
import { admitSimilarity } from "@/lib/admitSimilarity";
import { useAuth } from "@/contexts/AuthContext";
import { DetailOverlay, DetailSection } from "@/components/DetailOverlay";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { AnimatedCounter } from "@/components/animations/AnimatedCounter";
import { transition } from "@/lib/motion";

type SortKey = "similarity" | "acceptances" | "recent" | "name";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "similarity", label: "Most similar to me" },
  { key: "acceptances", label: "Most acceptances" },
  { key: "recent", label: "Most recent" },
  { key: "name", label: "A–Z" },
];

function Stat({ label, value, index = 0 }: { label: string; value: string; index?: number }) {
  // Only the leading number counts up. Everything after it — "/ 2400",
  // "(weighted %)" — stays put, since animating a scale or a qualifier reads
  // as a glitch rather than a flourish.
  const match = value.match(/^(\d+(?:\.\d+)?)(.*)$/);
  const lead = match?.[1];
  const rest = match?.[2] ?? "";
  const decimals = lead?.includes(".") ? lead.split(".")[1].length : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...transition.base, delay: 0.05 + index * 0.06 }}
      className="rounded-lg bg-muted/50 border border-border/60 px-3 py-2 text-center"
    >
      <div className="text-sm font-bold tabular-nums text-foreground">
        {lead ? (
          <>
            <AnimatedCounter target={Number(lead)} duration={1.1} decimals={decimals} />
            {rest && <span className="text-muted-foreground font-medium">{rest}</span>}
          </>
        ) : (
          value
        )}
      </div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground mt-0.5">{label}</div>
    </motion.div>
  );
}

function statsFor(a: PastAdmit) {
  const out: { label: string; value: string }[] = [];
  if (a.gpa) out.push({ label: "GPA", value: a.gpa });
  // Always the current 1600 scale — pre-2016 scores are converted in the data
  // layer so students never have to mentally rescale a 2250.
  if (a.sat) out.push({ label: "SAT", value: `${a.sat} / 1600` });
  if (a.act) out.push({ label: "ACT", value: `${a.act} / 36` });
  return out;
}

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
          ? "border-transparent text-accent-foreground"
          : "bg-background text-muted-foreground border-border hover:text-foreground hover:border-foreground/20",
      )}
    >
      {active &&
        (prefersReduced ? (
          <span className="absolute inset-0 rounded-full bg-accent" />
        ) : (
          <motion.span
            layoutId={layoutId}
            transition={transition.spring}
            className="absolute inset-0 rounded-full bg-accent"
          />
        ))}
      <span className="relative z-10 inline-flex items-center gap-1.5">{children}</span>
    </button>
  );
}

function AdmitDetail({
  admit,
  onClose,
  onPrev,
  onNext,
  position,
}: {
  admit: PastAdmit;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  position?: string;
}) {
  const stats = statsFor(admit);
  return (
    <DetailOverlay
      onClose={onClose}
      onPrev={onPrev}
      onNext={onNext}
      position={position}
      contentKey={admit.id}
      ariaLabel={`Admissions profile for ${admit.name}`}
    >
      {/* Right padding clears the floating nav/close controls. */}
      <DetailSection className="p-6 pb-4 pr-32 border-b border-border">
        <h2 className="text-xl font-bold tracking-tight text-foreground">{admit.name}</h2>
        <p className="text-sm text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="inline-flex items-center gap-1">
            <School className="h-3 w-3" />{admit.highSchool}
          </span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" />{admit.location}
          </span>
          <span>Class of {admit.gradYear}</span>
        </p>
      </DetailSection>

      <div className="p-6 space-y-5">
        <DetailSection>
          <div className="rounded-xl border border-accent/30 bg-accent/5 px-4 py-3">
            <p className="text-sm text-foreground font-medium">{admit.headline}</p>
          </div>
        </DetailSection>

        <DetailSection>
          {stats.length > 0 ? (
            <div className={cn("grid gap-2", stats.length === 1 ? "grid-cols-1" : stats.length === 2 ? "grid-cols-2" : "grid-cols-3")}>
              {stats.map((s, i) => <Stat key={s.label} {...s} index={i} />)}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              Test scores and GPA were not publicly reported for this student.
            </p>
          )}
          {admit.satConverted && admit.satOriginal && (
            <p className="text-[11px] text-muted-foreground mt-2">
              Reported as {admit.satOriginal} on the pre-2016 SAT; shown converted to the
              current 1600 scale so it's comparable to yours.
            </p>
          )}
        </DetailSection>

        <DetailSection>
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Accepted to · {acceptanceCount(admit)} total
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {admit.acceptedTo.map((c, i) => (
              <motion.div
                key={c}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ ...transition.fast, delay: 0.1 + i * 0.025 }}
              >
                <Badge variant="secondary" className="text-[10px] gap-1 pl-1">
                  <CollegeLogo name={c} size={12} />
                  {c}
                </Badge>
              </motion.div>
            ))}
          </div>
          {admit.alsoAccepted && admit.alsoAccepted.length > 0 && (
            <>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mt-3 mb-1.5">
                Also accepted
              </p>
              <div className="flex flex-wrap gap-1.5">
                {admit.alsoAccepted.map((c) => (
                  <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>
                ))}
              </div>
            </>
          )}
          {admit.acceptancesNote && (
            <p className="text-[11px] text-muted-foreground mt-2.5 leading-relaxed italic">
              {admit.acceptancesNote}
            </p>
          )}
        </DetailSection>

        <DetailSection>
          <div className="rounded-xl border border-border bg-muted/40 px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <GraduationCap className="h-4 w-4 text-accent" />
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Chose
              </span>
            </div>
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              <CollegeLogo name={admit.chose} size={20} />
              {admit.chose}
            </p>
            {admit.choiceReason && (
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                {admit.choiceReason}
              </p>
            )}
          </div>
        </DetailSection>

        {admit.intendedFocus && (
          <DetailSection>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Intended focus
            </h3>
            <p className="text-sm text-foreground">{admit.intendedFocus}</p>
          </DetailSection>
        )}

        {admit.activities.length > 0 && (
          <DetailSection>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Activities
            </h3>
            <ul className="space-y-1.5">
              {admit.activities.map((a) => (
                <li key={a} className="flex items-start gap-2 text-sm text-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{a}</span>
                </li>
              ))}
            </ul>
          </DetailSection>
        )}

        {admit.awards && admit.awards.length > 0 && (
          <DetailSection>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Awards & recognition
            </h3>
            <ul className="space-y-1.5">
              {admit.awards.map((a) => (
                <li key={a} className="flex items-start gap-2 text-sm text-foreground">
                  <Award className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{a}</span>
                </li>
              ))}
            </ul>
          </DetailSection>
        )}

        {admit.background && (
          <DetailSection>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Background
            </h3>
            <p className="text-sm text-foreground leading-relaxed">{admit.background}</p>
          </DetailSection>
        )}

        {admit.essayNote && (
          <DetailSection>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Their essay
            </h3>
            <blockquote className="relative rounded-xl bg-muted/50 border border-border/60 p-4 pl-10">
              <Quote className="absolute left-3 top-4 h-4 w-4 text-accent/60" />
              <p className="text-sm leading-relaxed text-foreground">{admit.essayNote}</p>
            </blockquote>
          </DetailSection>
        )}

        <DetailSection>
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            Sources
          </h3>
          <div className="space-y-1.5">
            {admit.sources.map((s) => (
              <motion.a
                key={s.url}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ x: 2 }}
                transition={transition.fast}
                className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors"
              >
                <span className="min-w-0">{s.label}</span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </motion.a>
            ))}
          </div>
        </DetailSection>
      </div>
    </DetailOverlay>
  );
}

export default function PastAdmits() {
  const { onboardingData } = useAuth();
  const [query, setQuery] = useState("");
  const [chose, setChose] = useState<string | null>(null);
  const [major, setMajor] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("similarity");
  const [activeId, setActiveId] = useState<string | null>(null);

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

  const activeIndex = filtered.findIndex((a) => a.id === activeId);
  const active = activeIndex >= 0 ? filtered[activeIndex] : null;

  const step = useCallback(
    (delta: number) => {
      const next = filtered[activeIndex + delta];
      if (next) setActiveId(next.id);
    },
    [filtered, activeIndex],
  );

  const totalAcceptances = useMemo(
    () => pastAdmits.reduce((sum, a) => sum + acceptanceCount(a), 0),
    [],
  );

  return (
    <div className="py-8 sm:py-12">
      <Seo
        title="Past Admits — Real Verified Admissions Outcomes | Pathforge"
        description="Real students, real acceptances, real stats — every profile sourced from published reporting, with citations you can check yourself."
        path="/past-admits"
      />
      {/* Wider than the site default: cards are one-per-row and the acceptance
          grid needs the horizontal room to stay on two lines. */}
      <div className="section-container max-w-5xl">
        {/* Header */}
        <ScrollReveal className="mb-8">
          <Badge variant="secondary" className="mb-3 gap-1.5">
            <Trophy className="h-3 w-3" /> Past Admits
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            What actually got them in
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
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
          <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
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
              </span>
              <AnimatePresence>
                {(query || chose || major) && (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => { setQuery(""); setChose(null); setMajor(null); }}
                    className="text-accent hover:underline font-medium"
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
          <div className="flex flex-col gap-4">
            {filtered.map((admit) => (
              <AdmitCard
                key={admit.id}
                admit={admit}
                similarity={similarityById[admit.id]}
                onOpen={() => setActiveId(admit.id)}
              />
            ))}
          </div>
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
