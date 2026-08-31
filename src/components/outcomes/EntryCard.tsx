import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { EASE_OUT_EXPO } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ColumnHead } from "./primitives";
import {
  datelineOf,
  durationFrom,
  num,
  str,
  type FieldSpec,
  type LoggedEntry,
} from "@/lib/outcomesRecord";
import type { EvidenceState } from "@/hooks/useOutcomesData";

/**
 * One entry in the record.
 *
 * It reads first and edits second: kind, dateline, title, who it was with, what
 * you did, what came of it — the order a stranger reads a line of a CV in. The
 * fields only appear when the student asks for them, because a record you are
 * meant to browse cannot be forty input boxes stacked on top of each other,
 * which is exactly what the eight-section form was.
 *
 * Nothing here knows which profile list the entry lives in. The spec it is
 * handed says which fields exist and what they are called; `outcomesRecord`
 * holds every one of those specs.
 */

/*
 * Proof, named as proof.
 *
 * The stored states are the same four the scorer has always credited; only the
 * words change. "Not started" made no sense against something the student has
 * already done and logged — what is not started is the evidence for it, which
 * is what these four states have always actually meant.
 */
const EVIDENCE_LABEL: Record<EvidenceState, string> = {
  not_started: "No proof yet",
  in_progress: "Gathering proof",
  evidence_submitted: "Evidence submitted",
  verified: "Verified",
};

const EVIDENCE_ORDER: EvidenceState[] = [
  "not_started",
  "in_progress",
  "evidence_submitted",
  "verified",
];

const FIELD = "h-9 text-xs";

/** Small label above a control. Same spec as the page's column heads. */
function FieldLabel({ children, htmlFor }: { children: string; htmlFor?: string }) {
  return (
    <Label
      htmlFor={htmlFor}
      className="font-cluely text-[11px] font-semibold uppercase tracking-[0.11em] text-muted-foreground"
    >
      {children}
    </Label>
  );
}

export interface EntryCardProps {
  entry: LoggedEntry;
  editing: boolean;
  onOpen: () => void;
  onClose: () => void;
  onPatch: (patch: Record<string, unknown>) => void;
  onRemove: () => void;
}

export function EntryCard({ entry, editing, onOpen, onClose, onPatch, onRemove }: EntryCardProps) {
  const reduced = useReducedMotion();
  const { spec, row, id } = entry;

  const title = str(row, spec.titleKey);
  const subtitle = spec.subtitle(row);
  const description = str(row, "description");
  const outcome = spec.outcomeKey ? str(row, spec.outcomeKey) : "";
  const link = str(row, "link").trim();
  const state = (str(row, "evidenceState") || "not_started") as EvidenceState;
  const fromPlan = str(row, "source") === "activity_checklist";

  /**
   * Dates write the derived duration back with them.
   *
   * The scorer has always read a free-text `duration`; keeping it in step here
   * means an entry dated with the month pickers scores exactly as one that was
   * typed as "1 year 3 months" before this record had dates.
   */
  const setDates = (next: { startDate?: string; endDate?: string; ongoing?: boolean }) => {
    const startDate = next.startDate ?? str(row, "startDate");
    const ongoing = next.ongoing ?? row.ongoing === true;
    const endDate = ongoing ? "" : (next.endDate ?? str(row, "endDate"));
    const duration = durationFrom(startDate, endDate, ongoing);
    onPatch({ startDate, endDate, ongoing, ...(duration ? { duration } : {}) });
  };

  const control = (field: FieldSpec) => {
    const inputId = `entry-${id}-${field.key}`;
    if (field.type === "textarea") {
      return (
        <Textarea
          id={inputId}
          className="mt-1.5 min-h-[76px] text-xs"
          placeholder={field.placeholder}
          value={str(row, field.key)}
          onChange={(e) => onPatch({ [field.key]: e.target.value })}
        />
      );
    }
    if (field.type === "select") {
      return (
        <Select
          value={str(row, field.key)}
          onValueChange={(v) => onPatch({ [field.key]: v })}
        >
          <SelectTrigger id={inputId} className={cn("mt-1.5 w-full min-w-0", FIELD)}>
            <SelectValue placeholder={field.placeholder} />
          </SelectTrigger>
          <SelectContent className="cly-scope font-cluely">
            {(field.options ?? []).map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    if (field.type === "number") {
      return (
        <Input
          id={inputId}
          className={cn("mt-1.5", FIELD)}
          type="number"
          inputMode="numeric"
          placeholder={field.placeholder}
          value={num(row, field.key) || ""}
          onChange={(e) => onPatch({ [field.key]: parseInt(e.target.value, 10) || 0 })}
        />
      );
    }
    return (
      <Input
        id={inputId}
        className={cn("mt-1.5", FIELD)}
        placeholder={field.placeholder}
        value={str(row, field.key)}
        onChange={(e) => onPatch({ [field.key]: e.target.value })}
      />
    );
  };

  return (
    <article className={cn("bg-card px-5 py-5 sm:px-6", editing && "bg-muted/30")}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <ColumnHead>{spec.label}</ColumnHead>
        <span className="font-cluely text-[11px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">
          {datelineOf(row)}
        </span>
      </div>

      <h3 className="mt-2 text-balance font-cluely text-[16px] font-semibold leading-snug tracking-[-0.01em] sm:text-base">
        {title || (
          <span className="text-muted-foreground">Untitled {spec.label.toLowerCase()}</span>
        )}
      </h3>

      {subtitle && <p className="mt-1 text-[15px] leading-snug text-muted-foreground">{subtitle}</p>}

      {description && (
        <p className="mt-2.5 max-w-[68ch] whitespace-pre-line text-[15px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}

      {outcome && (
        <div className="mt-3 border-l border-border pl-3.5">
          <ColumnHead className="block">{spec.outcomeLabel}</ColumnHead>
          <p className="mt-1 max-w-[60ch] text-[15px] leading-relaxed text-foreground">{outcome}</p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        <span
          className={cn(
            "font-cluely text-[11px] font-semibold uppercase tracking-[0.11em]",
            // One ink for proved, muted for everything short of it. Nothing here
            // is wrong, so nothing here is amber.
            state === "verified" ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {EVIDENCE_LABEL[state] ?? EVIDENCE_LABEL.not_started}
        </span>

        {link && (
          <a
            href={link}
            target="_blank"
            rel="noreferrer noopener"
            className="group inline-flex items-center gap-1 font-cluely text-[11px] font-semibold uppercase tracking-[0.11em] text-primary"
          >
            Open the evidence
            <ArrowUpRight className="h-3 w-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </a>
        )}

        {fromPlan && (
          <span className="font-cluely text-[11px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">
            From your plan
          </span>
        )}

        <button
          type="button"
          onClick={editing ? onClose : onOpen}
          aria-expanded={editing}
          aria-controls={`entry-${id}-fields`}
          className="ml-auto font-cluely text-[11px] font-semibold uppercase tracking-[0.11em] text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
        >
          {editing ? "Done" : "Edit"}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {editing && (
          <motion.div
            id={`entry-${id}-fields`}
            initial={reduced ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.24, ease: EASE_OUT_EXPO }}
            className="overflow-hidden"
          >
            <div className="mt-5 border-t border-border pt-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <FieldLabel htmlFor={`entry-${id}-title`}>{spec.label}</FieldLabel>
                  <Input
                    id={`entry-${id}-title`}
                    className={cn("mt-1.5", FIELD)}
                    placeholder={spec.titlePlaceholder}
                    value={title}
                    onChange={(e) => onPatch({ [spec.titleKey]: e.target.value })}
                  />
                </div>

                <div>
                  <FieldLabel htmlFor={`entry-${id}-start`}>Started</FieldLabel>
                  <Input
                    id={`entry-${id}-start`}
                    className={cn("mt-1.5", FIELD)}
                    type="month"
                    placeholder="YYYY-MM"
                    value={str(row, "startDate")}
                    onChange={(e) => setDates({ startDate: e.target.value })}
                  />
                </div>

                <div>
                  <FieldLabel htmlFor={`entry-${id}-end`}>Ended</FieldLabel>
                  <Input
                    id={`entry-${id}-end`}
                    className={cn("mt-1.5", FIELD)}
                    type="month"
                    placeholder="YYYY-MM"
                    disabled={row.ongoing === true}
                    value={str(row, "endDate")}
                    onChange={(e) => setDates({ endDate: e.target.value })}
                  />
                  <label className="mt-2 flex items-center gap-2 text-[13.5px] text-muted-foreground">
                    <Checkbox
                      checked={row.ongoing === true}
                      onCheckedChange={(v) => setDates({ ongoing: v === true })}
                      aria-label="Still going"
                    />
                    Still going
                  </label>
                </div>

                {/*
                 * Said once, where it matters: the scorer reads how long
                 * something ran, and an entry with no dates has no length to
                 * read. Only shown while the start month is empty, so it is a
                 * prompt rather than standing instructions.
                 */}
                {!str(row, "startDate") && (
                  <p className="-mt-1 max-w-[64ch] text-[12.5px] leading-snug text-muted-foreground sm:col-span-2">
                    Dates are how long this ran. Leadership, work and projects are read partly on
                    that, so an undated entry is read as a short one.
                  </p>
                )}

                {spec.fields.map((field) => (
                  <div
                    key={field.key}
                    className={cn(field.type === "textarea" || !field.half ? "sm:col-span-2" : "")}
                  >
                    <FieldLabel htmlFor={`entry-${id}-${field.key}`}>{field.label}</FieldLabel>
                    {control(field)}
                  </div>
                ))}

                <div className="sm:col-span-2">
                  <FieldLabel htmlFor={`entry-${id}-proof`}>How well it is proved</FieldLabel>
                  <Select
                    value={state}
                    onValueChange={(v) => onPatch({ evidenceState: v })}
                  >
                    <SelectTrigger id={`entry-${id}-proof`} className={cn("mt-1.5 w-full min-w-0", FIELD)}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="cly-scope font-cluely">
                      {EVIDENCE_ORDER.map((s) => (
                        <SelectItem key={s} value={s}>
                          {EVIDENCE_LABEL[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 px-2 font-cluely text-[11px] font-semibold uppercase tracking-[0.11em] text-muted-foreground hover:text-destructive"
                  onClick={onRemove}
                >
                  Remove this entry
                </Button>
                <Button variant="outline" size="sm" className="h-9 text-xs" onClick={onClose}>
                  Done
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}
