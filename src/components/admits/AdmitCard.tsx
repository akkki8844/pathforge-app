import { motion } from "framer-motion";
import { Check, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { CollegeLogo } from "@/components/CollegeLogo";
import { AdmitAvatar } from "@/components/admits/AdmitAvatar";
import { schoolOutcomes, type PastAdmit, type AdmitOutcome } from "@/data/pastAdmits";
import { transition } from "@/lib/motion";

/**
 * One past admit, rendered full-width. Deliberately one per row: the value of
 * this page is the acceptance grid, and two-up columns squeezed it down to a
 * "+9" overflow chip that hid the whole point.
 */

/** Ring colour encodes the outcome, so the grid is readable without a legend. */
const RING: Record<AdmitOutcome, string> = {
  attending: "border-amber-400 dark:border-amber-500",
  accepted: "border-emerald-500/70 dark:border-emerald-400/70",
  rejected: "border-rose-400/70 dark:border-rose-400/60",
};

const OUTCOME_LABEL: Record<AdmitOutcome, string> = {
  attending: "Attending",
  accepted: "Accepted",
  rejected: "Rejected",
};

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-border bg-muted/60 px-3 py-1 text-xs font-medium text-foreground">
      {children}
    </span>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="text-lg font-bold tabular-nums text-foreground">{value}</span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </span>
  );
}

/**
 * Illustrated character in place of a photo. These are real, named students; we
 * link to the reporting about them but do not republish their faces. The
 * character is generated from the admit's id, not from any image of them.
 */
function AvatarTile({ id }: { id: string }) {
  return (
    <div className="relative shrink-0">
      <AdmitAvatar seed={id} className="h-20 w-20 sm:h-[86px] sm:w-[86px] rounded-2xl" />
      <span
        className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-primary ring-2 ring-card flex items-center justify-center"
        title="Publicly documented outcome"
      >
        <Check className="h-3.5 w-3.5 text-primary-foreground" strokeWidth={3} />
      </span>
    </div>
  );
}

interface Props {
  admit: PastAdmit;
  similarity: number | null;
  onOpen: () => void;
}

export function AdmitCard({ admit, similarity, onOpen }: Props) {
  const schools = schoolOutcomes(admit);
  const ecCount = admit.activities.length;
  const awardCount = admit.awards?.length ?? 0;

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={transition.base}
      onClick={onOpen}
      className="card-elevated w-full rounded-2xl p-5 sm:p-6 text-left transition-shadow hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {/* Demographic pills + similarity */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <Pill>Class of {admit.gradYear}</Pill>
        <Pill>{admit.major}</Pill>
        <Pill>{admit.country}</Pill>
        {admit.ethnicity && <Pill>{admit.ethnicity}</Pill>}
        {admit.gender && <Pill>{admit.gender}</Pill>}
        {similarity !== null && (
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border-2 border-primary px-3 py-1 text-xs font-semibold text-primary">
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
            Similarity {similarity}%
          </span>
        )}
      </div>

      {/* Identity + stats */}
      <div className="flex items-start gap-4 sm:gap-5">
        <AvatarTile id={admit.id} />
        <div className="min-w-0 flex-1">
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            {admit.name}
          </h3>
          <p className="mt-1 text-sm sm:text-base text-muted-foreground leading-relaxed">
            {admit.headline}
          </p>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-1">
            {admit.gpa && <Stat value={admit.gpa.split(" ")[0]} label="GPA" />}
            {admit.sat && <Stat value={String(admit.sat)} label="SAT" />}
            {admit.act && <Stat value={String(admit.act)} label="ACT" />}
            {ecCount > 0 && <Stat value={String(ecCount)} label={ecCount === 1 ? "EC" : "ECs"} />}
            {awardCount > 0 && (
              <Stat value={String(awardCount)} label={awardCount === 1 ? "Award" : "Awards"} />
            )}
          </div>
        </div>
      </div>

      {/* Outcome grid */}
      <div className="mt-5 flex flex-wrap gap-2.5">
        {schools.map((s) => (
          <span
            key={s.name}
            title={`${s.name} — ${OUTCOME_LABEL[s.outcome]}`}
            className={cn(
              "relative h-12 w-12 rounded-xl border-2 bg-background flex items-center justify-center",
              RING[s.outcome],
            )}
          >
            <CollegeLogo name={s.name} size={26} className="rounded" />
            {s.outcome === "attending" && (
              <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-amber-400 ring-2 ring-card flex items-center justify-center">
                <Star className="h-3 w-3 text-white" fill="currentColor" strokeWidth={0} />
              </span>
            )}
          </span>
        ))}
        {admit.totalAccepted && admit.totalAccepted > schools.length && (
          <span className="h-12 px-3 rounded-xl border-2 border-dashed border-border flex items-center text-xs font-semibold text-muted-foreground">
            +{admit.totalAccepted - schools.filter((s) => s.outcome !== "rejected").length} unnamed
          </span>
        )}
      </div>
    </motion.button>
  );
}
