import { type ReactNode } from "react";
import { RotateCcw, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ColumnHead } from "./primitives";
import { KIND_SPECS, type RecordKind } from "@/lib/outcomesRecord";
import type { OutcomesProfile } from "@/hooks/useOutcomesData";

/**
 * Everything you can change, on one side of the page.
 *
 * The page used to scatter its controls: the tier and grade selects lived
 * inside the record editor, the record's kind filter was a row of eleven pills
 * halfway down a feed, and the view switch sat under the masthead. A student
 * wanting to see their file read against a different tier had to find a
 * dropdown inside the thing they were trying to re-read. All of it is here now,
 * and the right-hand side of the page contains only the answer.
 *
 * The grouping is the important part, and it is not cosmetic. **Compare
 * against** holds the choices that change the reading without changing the
 * student — those are filters in the ordinary sense, and Reset restores them.
 * **Your profile** holds facts about the student. Resetting a typed SAT score
 * because a button said "reset filters" would be destroying data to tidy a
 * panel, so Reset does not touch that group, and the labels say which is which.
 */

export type RecordFilter = RecordKind | "all";

export interface OutcomesFilters {
  view: "record" | "reading";
  targetTier: string;
  gradeLevel: string;
  testType: string;
  testScore: string;
  recordFilter: RecordFilter;
}

const TIER_OPTIONS = [
  { value: "ivy", label: "Ivy / Top 10" },
  { value: "top-20", label: "Top 20" },
  { value: "top-50", label: "Top 50" },
  { value: "state", label: "State flagships" },
];

const TEST_OPTIONS = [
  { value: "none", label: "Not taken" },
  { value: "sat", label: "SAT" },
  { value: "act", label: "ACT" },
  { value: "psat", label: "PSAT/NMSQT" },
];

/** What Reset returns the comparison controls to. */
const COMPARISON_DEFAULTS = {
  targetTier: "top-20",
  recordFilter: "all" as RecordFilter,
};

const FIELD = "h-9 text-xs";

/**
 * One labelled control.
 *
 * Label above, current value inside the trigger, one to a row. The sidebar is
 * read down as a list of questions, so nothing here is put side by side — two
 * half-width selects would make the eye scan in two directions to answer one
 * question.
 */
function Control({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <Label className="text-[12.5px] font-medium text-muted-foreground">{label}</Label>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1.5 text-[12.5px] leading-snug text-muted-foreground/80">{hint}</p>}
    </div>
  );
}

/** A titled run of controls, ruled off from the one above it. */
function Group({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <div className="border-t border-border px-5 py-5">
      <ColumnHead>{title}</ColumnHead>
      {note && <p className="mt-1.5 text-[12.5px] leading-snug text-muted-foreground/80">{note}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </div>
  );
}

/**
 * One active choice, and the way to undo it.
 *
 * Only non-default choices appear, so an untouched sidebar shows nothing here
 * rather than a row of chips restating its own defaults. Chips for profile
 * facts carry no dismiss button — there is no "no grade".
 */
function ActiveChip({
  label,
  onClear,
}: {
  label: string;
  onClear?: () => void;
}) {
  return (
    <span className="inline-flex min-h-[26px] items-center gap-1 rounded-full border border-foreground/[0.14] bg-card px-2.5 py-0.5 font-display text-[11px] font-bold uppercase tracking-[0.08em] text-foreground">
      {label}
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="-mr-1 rounded-full p-0.5 text-muted-foreground transition-colors hover:text-foreground"
          aria-label={`Clear ${label}`}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

export interface FilterSidebarProps {
  filters: OutcomesFilters;
  /** Counts per record kind, so each option says how much it will show. */
  counts: Map<RecordKind, number>;
  entryTotal: number;
  onView: (view: "record" | "reading") => void;
  onRecordFilter: (filter: RecordFilter) => void;
  /** Writes straight through to the saved profile — the page owns persistence. */
  onProfile: (updater: (prev: OutcomesProfile) => OutcomesProfile) => void;
}

export function FilterSidebar({
  filters,
  counts,
  entryTotal,
  onView,
  onRecordFilter,
  onProfile,
}: FilterSidebarProps) {
  const tierLabel =
    TIER_OPTIONS.find((t) => t.value === filters.targetTier)?.label ?? "Top 20";
  const kindLabel =
    filters.recordFilter === "all"
      ? "Everything"
      : KIND_SPECS.find((s) => s.id === filters.recordFilter)?.label ?? "Everything";

  const tierChanged = filters.targetTier !== COMPARISON_DEFAULTS.targetTier;
  const kindChanged = filters.recordFilter !== COMPARISON_DEFAULTS.recordFilter;
  const dirty = tierChanged || kindChanged;

  const resetTier = () =>
    onProfile((p) => ({ ...p, targetTier: COMPARISON_DEFAULTS.targetTier }));

  const resetAll = () => {
    resetTier();
    onRecordFilter(COMPARISON_DEFAULTS.recordFilter);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-foreground/[0.14] bg-card/70">
      {/* ── View ─────────────────────────────────────────────────────────
          Not a filter but the first question the sidebar answers, so it sits
          above the rule rather than inside a group: everything below it
          configures whichever of the two is showing. */}
      <div className="px-5 py-5">
        <ColumnHead>View</ColumnHead>
        <div
          role="tablist"
          aria-label="Outcomes view"
          className="mt-3 grid grid-cols-2 gap-1 rounded-full border border-border bg-background p-1"
        >
          {(["record", "reading"] as const).map((v) => (
            <button
              key={v}
              role="tab"
              aria-selected={filters.view === v}
              onClick={() => onView(v)}
              className={cn(
                "min-h-[34px] rounded-full font-display text-[12.5px] font-bold uppercase tracking-[0.1em] transition-colors",
                filters.view === v
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {v === "record" ? "Record" : "Reading"}
            </button>
          ))}
        </div>
        <p className="mt-3 text-[12.5px] leading-snug text-muted-foreground">
          {filters.view === "record"
            ? "Everything you have logged, most recent first."
            : "What that record scores against the tier you picked."}
        </p>
      </div>

      {/* ── Compare against ──────────────────────────────────────────────
          The genuine filters: they change the answer without changing the
          student. These are what Reset restores. */}
      <Group
        title="Compare against"
        note="Changes what the reading is measured against. Your record is untouched."
      >
        <Control
          label="Selectivity"
          hint={`Every bar on the page is the standard Pathforge holds ${tierLabel} applicants to.`}
        >
          <Select
            value={filters.targetTier}
            onValueChange={(v) => onProfile((p) => ({ ...p, targetTier: v }))}
          >
            <SelectTrigger aria-label="Target tier" className={FIELD}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIER_OPTIONS.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Control>

        {/* Only meaningful against the record feed, so it is only offered
            there — a control that visibly does nothing teaches people to
            distrust the whole panel. */}
        {filters.view === "record" && (
          <Control label="Show entries" hint="Filters the record feed only.">
            <Select
              value={filters.recordFilter}
              onValueChange={(v) => onRecordFilter(v as RecordFilter)}
            >
              <SelectTrigger aria-label="Record filter" className={FIELD}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Everything ({entryTotal})</SelectItem>
                {KIND_SPECS.filter((s) => (counts.get(s.id) ?? 0) > 0).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label} ({counts.get(s.id) ?? 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Control>
        )}
      </Group>

      {/* ── Your profile ─────────────────────────────────────────────────
          Facts, not filters. Same panel because a student thinks of them as
          the same act of configuring; a different group and a different note
          because Reset must not touch them. */}
      <Group title="Your profile" note="Saved to your file. Reset leaves these alone.">
        <Control label="Grade">
          <Select
            value={filters.gradeLevel}
            onValueChange={(v) => onProfile((p) => ({ ...p, gradeLevel: v }))}
          >
            <SelectTrigger aria-label="Grade level" className={FIELD}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["9", "10", "11", "12"].map((g) => (
                <SelectItem key={g} value={g}>
                  Grade {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Control>

        <Control label="Test">
          <Select
            value={filters.testType}
            onValueChange={(v) => onProfile((p) => ({ ...p, testType: v, testScore: "" }))}
          >
            <SelectTrigger aria-label="Test type" className={FIELD}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TEST_OPTIONS.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Control>

        {filters.testType !== "none" && (
          <Control
            label="Score"
            hint="Left out of the reading entirely while blank — never counted as a zero."
          >
            <Input
              className={FIELD}
              type="number"
              inputMode="numeric"
              aria-label="Test score"
              placeholder={filters.testType === "act" ? "36" : "1600"}
              value={filters.testScore}
              onChange={(e) => onProfile((p) => ({ ...p, testScore: e.target.value }))}
            />
          </Control>
        )}
      </Group>

      {/* ── Active filters, and the way out ──────────────────────────────
          So the current configuration is legible without opening four
          dropdowns to check it. */}
      <div className="border-t border-border px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <ColumnHead>Active</ColumnHead>
          <Button
            variant="ghost"
            size="sm"
            disabled={!dirty}
            onClick={resetAll}
            className="-mr-2 h-7 gap-1.5 px-2 text-[12.5px] text-muted-foreground disabled:opacity-40"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <ActiveChip label={tierLabel} onClear={tierChanged ? resetTier : undefined} />
          {kindChanged && (
            <ActiveChip
              label={kindLabel}
              onClear={() => onRecordFilter(COMPARISON_DEFAULTS.recordFilter)}
            />
          )}
          <ActiveChip label={`Grade ${filters.gradeLevel}`} />
          {filters.testType !== "none" && (
            <ActiveChip
              label={`${filters.testType.toUpperCase()}${
                filters.testScore ? ` ${filters.testScore}` : ""
              }`}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * The mobile entry point.
 *
 * A single bar rather than the sidebar stacked above the result: on a phone the
 * answer has to be the first thing on screen, and eight controls above it would
 * put the score below the fold on every visit. The summary line carries the
 * current configuration so the common case — glance, confirm, read the score —
 * never needs the drawer opened at all.
 */
export function FilterBar({
  filters,
  onOpen,
}: {
  filters: OutcomesFilters;
  onOpen: () => void;
}) {
  const tierLabel =
    TIER_OPTIONS.find((t) => t.value === filters.targetTier)?.label ?? "Top 20";
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-foreground/[0.14] bg-card/70 px-4 py-3 text-left transition-colors hover:border-foreground/25"
    >
      <span className="min-w-0">
        <ColumnHead>
          {filters.view === "record" ? "The record" : "The reading"}
        </ColumnHead>
        <span className="mt-1 block truncate text-[15px] font-medium text-foreground">
          {tierLabel} · Grade {filters.gradeLevel}
          {filters.testType !== "none" && ` · ${filters.testType.toUpperCase()}`}
        </span>
      </span>
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 font-display text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
        <SlidersHorizontal className="h-3 w-3" />
        Filters
      </span>
    </button>
  );
}
