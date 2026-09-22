import { motion } from "framer-motion";
import { DetailOverlay, DetailSection } from "@/components/DetailOverlay";
import { CollegeLogo } from "@/components/CollegeLogo";
import { AdmitAvatar } from "@/components/admits/AdmitAvatar";
import { schoolOutcomes, type AdmitOutcome, type PastAdmit } from "@/data/pastAdmits";
import { cn } from "@/lib/utils";

/**
 * One past admit, opened.
 *
 * WHAT THIS REPLACED, AND WHY
 *
 * The previous panel gave every line of content an icon: a sparkle beside each
 * activity, an amber trophy beside each award, a graduation cap over the school
 * the student chose, a shield over the word "Sources". None of them carried
 * information - the heading above each list already said what the list was -
 * and a column of coloured glyphs down the left of a page is the house style of
 * generated UI, not of a document anyone would keep. The university badges also
 * popped in one by one on a scale spring, which is a lot of movement to say
 * "here are some universities".
 *
 * So it is set as a dossier instead. Emphasis comes from typography and from
 * one saturated field of brand colour at the top, and the only images left are
 * the universities' own marks, which are content. Rank, rule and scale do the
 * work the icons were doing:
 *
 *  - the masthead states who this is, in the largest type on the page;
 *  - measurements sit in a row of numerals, not in three bordered tiles;
 *  - each list is numbered, so "five activities" can be counted at a glance;
 *  - an outcome is a coloured rule under a logo, which is the same encoding the
 *    card in the list uses, so the two read as one thing.
 *
 * The indigo is written as a fixed pair of hues rather than as `--primary`, for
 * the reason `AuthShell` gives: that token lightens to 65% in dark mode and
 * white body copy on it falls under 3:1.
 */

const OUTCOME_RULE: Record<AdmitOutcome, string> = {
  attending: "bg-amber-400",
  accepted: "bg-emerald-500 dark:bg-emerald-400",
  rejected: "bg-rose-400",
};

const OUTCOME_LABEL: Record<AdmitOutcome, string> = {
  attending: "Attending",
  accepted: "Accepted",
  rejected: "Rejected",
};

/** Named schools we can list, plus any unnamed extras the reporting counted. */
function acceptanceCount(a: PastAdmit) {
  return a.totalAccepted ?? a.acceptedTo.length + (a.alsoAccepted?.length ?? 0);
}

/** The host of a source URL, which is what tells a reader who published it. */
function publisher(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** A section: a small label, a hairline, and the content under it. */
function Block({
  label,
  aside,
  children,
  className,
}: {
  label: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <DetailSection className={className}>
      <div className="mb-3 flex items-baseline gap-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </h3>
        <span className="h-px flex-1 bg-border" />
        {aside && <span className="text-[11px] tabular-nums text-muted-foreground">{aside}</span>}
      </div>
      {children}
    </DetailSection>
  );
}

/**
 * A numbered list.
 *
 * The number is the whole ornament: it ranks the line, it counts the list, and
 * unlike a repeated sparkle it is different on every row.
 */
function Numbered({ items, accent }: { items: string[]; accent?: boolean }) {
  return (
    <ol className="space-y-0">
      {items.map((item, i) => (
        <li
          // Index-keyed on purpose: two lines in one list can read identically
          // ("Volunteer work" appears twice on some profiles), and the list is
          // static, so there is no reorder for the index to get wrong.
          key={`${i}-${item}`}
          className="flex gap-4 border-t border-border/60 py-2.5 first:border-t-0 first:pt-0"
        >
          <span
            className={cn(
              "w-5 shrink-0 pt-px text-[11px] font-semibold tabular-nums",
              accent ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground",
            )}
          >
            {String(i + 1).padStart(2, "0")}
          </span>
          <span className="text-[14.5px] leading-relaxed text-foreground">{item}</span>
        </li>
      ))}
    </ol>
  );
}

export function AdmitDetail({
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
  const schools = schoolOutcomes(admit);
  const named = schools.filter((s) => s.outcome !== "rejected").length;
  const unnamed =
    admit.totalAccepted && admit.totalAccepted > named ? admit.totalAccepted - named : 0;

  const measures: { value: string; unit?: string; label: string }[] = [];
  if (admit.gpa) measures.push({ value: admit.gpa.split(" ")[0], label: "GPA" });
  // Always the current 1600 scale: pre-2016 scores are converted in the data
  // layer so students never have to mentally rescale a 2250.
  if (admit.sat) measures.push({ value: String(admit.sat), unit: "/1600", label: "SAT" });
  if (admit.act) measures.push({ value: String(admit.act), unit: "/36", label: "ACT" });
  if (admit.activities.length)
    measures.push({ value: String(admit.activities.length), label: "Activities" });
  if (admit.awards?.length) measures.push({ value: String(admit.awards.length), label: "Awards" });

  return (
    <DetailOverlay
      onClose={onClose}
      onPrev={onPrev}
      onNext={onNext}
      position={position}
      contentKey={admit.id}
      ariaLabel={`Admissions profile for ${admit.name}`}
      className="overflow-hidden"
    >
      {/* Masthead */}
      <DetailSection className="relative bg-[hsl(226_62%_44%)] px-6 pb-6 pt-7 text-white dark:bg-[hsl(226_44%_15%)]">
        {/* Right padding on the first line only, so the overlay's own controls
            have room without indenting the whole masthead. */}
        <p className="pr-32 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
          Class of {admit.gradYear} &middot; {admit.country}
        </p>

        <div className="mt-3 flex items-start gap-4">
          {/* Illustrated, generated from the id. These are real students; the
              page links to the reporting rather than republishing their faces. */}
          <AdmitAvatar
            seed={admit.id}
            className="h-14 w-14 shrink-0 rounded-xl ring-1 ring-white/25"
          />
          <div className="min-w-0">
            <h2 className="text-[1.75rem] font-bold leading-[1.1] tracking-[-0.03em]">
              {admit.name}
            </h2>
            <p className="mt-1 text-[13px] text-white/70">
              {admit.highSchool} &middot; {admit.location}
            </p>
          </div>
        </div>

        <p className="mt-4 max-w-[52ch] text-[15px] leading-relaxed text-white/90">
          {admit.headline}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-2 text-[13px]">
          <span className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 font-semibold">
            <CollegeLogo name={admit.chose} size={18} className="rounded-[3px]" />
            {admit.chose}
          </span>
          <span className="text-white/60">is where they went</span>
        </div>
      </DetailSection>

      {/* Measurements */}
      <DetailSection className="border-b border-border bg-muted/30 px-6 py-4">
        {measures.length > 0 ? (
          <div className="flex flex-wrap items-baseline gap-x-8 gap-y-3">
            {measures.map((m) => (
              <div key={m.label} className="flex items-baseline gap-1.5">
                <span className="text-[1.4rem] font-bold leading-none tabular-nums text-foreground">
                  {m.value}
                </span>
                {m.unit && (
                  <span className="text-[13px] font-medium tabular-nums text-muted-foreground">
                    {m.unit}
                  </span>
                )}
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {m.label}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-muted-foreground">
            Test scores and GPA were not publicly reported for this student.
          </p>
        )}
        {admit.satConverted && admit.satOriginal && (
          <p className="mt-2.5 text-[11.5px] leading-relaxed text-muted-foreground">
            Reported as {admit.satOriginal} on the pre-2016 SAT, shown converted to the current
            1600 scale so it is comparable to yours.
          </p>
        )}
      </DetailSection>

      <div className="space-y-7 px-6 py-6">
        {/* Where they applied */}
        <Block label="Where they applied" aside={`${acceptanceCount(admit)} acceptances`}>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 sm:grid-cols-3">
            {schools.map((s) => (
              <div key={s.name} className="min-w-0">
                <div className="flex items-center gap-2">
                  <CollegeLogo name={s.name} size={20} className="shrink-0 rounded-[3px]" />
                  <span className="truncate text-[13.5px] font-medium text-foreground">
                    {s.name}
                  </span>
                </div>
                {/* The rule under the name carries the outcome, the same
                    encoding the list card uses. */}
                <div className="mt-1.5 flex items-center gap-2">
                  <span className={cn("h-[3px] w-6 rounded-full", OUTCOME_RULE[s.outcome])} />
                  <span className="text-[10.5px] uppercase tracking-[0.1em] text-muted-foreground">
                    {OUTCOME_LABEL[s.outcome]}
                  </span>
                </div>
              </div>
            ))}
            {unnamed > 0 && (
              <div className="min-w-0">
                <span className="text-[13.5px] font-medium text-muted-foreground">
                  {unnamed} more, unnamed
                </span>
                <div className="mt-2.5 w-6 border-t-2 border-dashed border-border" />
              </div>
            )}
          </div>
          {admit.acceptancesNote && (
            <p className="mt-3.5 text-[12.5px] leading-relaxed text-muted-foreground">
              {admit.acceptancesNote}
            </p>
          )}
          {admit.choiceReason && (
            <p className="mt-3.5 border-l-2 border-border pl-3.5 text-[13.5px] leading-relaxed text-foreground">
              <span className="font-semibold">Why {admit.chose}: </span>
              {admit.choiceReason}
            </p>
          )}
        </Block>

        {admit.intendedFocus && (
          <Block label="Intended focus">
            <p className="text-[14.5px] leading-relaxed text-foreground">{admit.intendedFocus}</p>
          </Block>
        )}

        {admit.activities.length > 0 && (
          <Block label="What they did" aside={`${admit.activities.length} listed`}>
            <Numbered items={admit.activities} />
          </Block>
        )}

        {admit.awards && admit.awards.length > 0 && (
          <Block label="Awards and recognition" aside={`${admit.awards.length} listed`}>
            <Numbered items={admit.awards} accent />
          </Block>
        )}

        {admit.background && (
          <Block label="Background">
            <p className="text-[14.5px] leading-relaxed text-foreground">{admit.background}</p>
          </Block>
        )}

        {admit.essayNote && (
          <Block label="Their essay">
            <blockquote className="relative pl-8">
              {/* A real quotation mark, set in Fraunces at the size a pull
                  quote is set at: the punctuation the sentence already needs,
                  doing the job the lucide quote icon was doing badly. Fraunces
                  is preloaded site-wide, so it costs nothing here. */}
              <span
                aria-hidden
                className="absolute left-0 top-[-0.6rem] select-none font-serif text-[3.25rem] leading-none text-[hsl(226_62%_44%)]/30 dark:text-white/25"
              >
                &ldquo;
              </span>
              <p className="text-[14.5px] leading-relaxed text-foreground">{admit.essayNote}</p>
            </blockquote>
          </Block>
        )}

        {/* Sources */}
        <Block label="Sources" aside={`${admit.sources.length}`}>
          <ol className="space-y-0">
            {admit.sources.map((s, i) => (
              <li key={s.url} className="border-t border-border/60 first:border-t-0">
                <motion.a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ x: 2 }}
                  transition={{ duration: 0.15 }}
                  className="group flex gap-4 py-2.5 first:pt-0"
                >
                  <span className="w-5 shrink-0 pt-px text-[11px] font-semibold tabular-nums text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] leading-snug text-foreground group-hover:underline">
                      {s.label}
                    </span>
                    <span className="mt-0.5 block text-[11.5px] text-muted-foreground">
                      {publisher(s.url)} &#8599;
                    </span>
                  </span>
                </motion.a>
              </li>
            ))}
          </ol>
        </Block>
      </div>
    </DetailOverlay>
  );
}
