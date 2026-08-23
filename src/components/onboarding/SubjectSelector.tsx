import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { fadeUp, staggerParent, staggerStep, transition } from "@/lib/motion";
import { getCurriculumConfig, levelsForSubject, subjectsInGroup } from "@/lib/curriculumSubjects";

/**
 * A type alias rather than an interface on purpose: this gets persisted to a
 * jsonb column, and only aliases pick up the implicit index signature that
 * makes them assignable to Supabase's `Json`.
 */
export type SelectedSubject = {
  name: string;
  level?: string;
};

interface SubjectSelectorProps {
  /** A CurriculumKey, e.g. "IB-MYP". Resolve with getCurriculumConfig(). */
  curriculum: string;
  value: SelectedSubject[];
  onChange: (next: SelectedSubject[]) => void;
  /** Cap on selections. Default 12. */
  max?: number;
  /** Floor on selections before the parent step will let the user continue. Default 2. */
  min?: number;
}

export function SubjectSelector({ curriculum, value, onChange, max = 12, min = 2 }: SubjectSelectorProps) {
  const [query, setQuery] = useState("");
  const config = useMemo(() => getCurriculumConfig(curriculum), [curriculum]);
  const selected = useMemo(() => new Map(value.map((s) => [s.name, s])), [value]);
  const atCap = value.length >= max;

  /**
   * Levels are only meaningful against the programme they came from — an IGCSE
   * "Extended" carried into IB DP is not a level, it's bad data that would then
   * resolve the wrong grade scale via gradeScaleFor(subject, level). Re-derive
   * whenever the programme (or a subject's own tiering) no longer accepts the
   * stored value.
   */
  useEffect(() => {
    let changed = false;
    const next = value.map((s) => {
      const levels = levelsForSubject(config, s.name);
      if (levels.length === 0) {
        if (s.level === undefined) return s;
        changed = true;
        return { name: s.name };
      }
      if (s.level && levels.includes(s.level)) return s;
      changed = true;
      return { ...s, level: levels[0] };
    });
    if (changed) onChange(next);
  }, [config, value, onChange]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return config.groups
      .map((name) => ({
        name,
        subjects: subjectsInGroup(config, name).filter((s) => !q || s.name.toLowerCase().includes(q)),
      }))
      .filter((g) => g.subjects.length > 0);
  }, [config, query]);

  const toggle = (name: string) => {
    if (selected.has(name)) {
      onChange(value.filter((s) => s.name !== name));
      return;
    }
    if (atCap) return;
    const [defaultLevel] = levelsForSubject(config, name);
    onChange([...value, defaultLevel ? { name, level: defaultLevel } : { name }]);
  };

  const setLevel = (name: string, level: string) => {
    onChange(value.map((s) => (s.name === name ? { ...s, level } : s)));
  };

  if (config.subjects.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
        No subject list is available for {config.shortLabel}. You can add your grades on the Admissions page instead.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="font-display text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            {config.shortLabel} subjects
          </span>
          {config.selectionHint && (
            <p className="mt-1 text-[11px] text-muted-foreground">{config.selectionHint}</p>
          )}
        </div>
        <span
          className={cn(
            "shrink-0 text-xs tabular-nums",
            value.length < min ? "text-destructive font-medium" : "text-muted-foreground",
          )}
        >
          {value.length}/{max}
        </span>
      </div>

      <p className={cn("text-[11px]", value.length < min ? "text-destructive" : "text-muted-foreground")}>
        {value.length < min
          ? `Select at least ${min} subjects to continue (${min - value.length} more needed).`
          : `You're set — pick more any time, up to ${max}.`}
      </p>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((s) => (
            <motion.div key={s.name} variants={fadeUp} initial="hidden" animate="visible">
              <Badge variant="secondary" className="gap-1">
                {s.level ? `${s.name} · ${s.level}` : s.name}
                <button
                  type="button"
                  onClick={() => toggle(s.name)}
                  className="hover:text-destructive"
                  aria-label={`Remove ${s.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            </motion.div>
          ))}
        </div>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search subjects…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10"
          aria-label="Search subjects"
        />
      </div>

      {groups.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
          No subjects match “{query.trim()}”.
        </p>
      ) : (
        <motion.div
          variants={staggerParent}
          custom={staggerStep(groups.length)}
          initial="hidden"
          animate="visible"
          className="max-h-96 space-y-4 overflow-y-auto rounded-lg border border-border bg-background/50 p-3"
        >
          {groups.map((group) => (
            <motion.section key={group.name} variants={fadeUp} className="space-y-2">
              <h4 className="font-display text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                {group.name}
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {group.subjects.map((subject) => {
                  const picked = selected.get(subject.name);
                  const isSelected = picked !== undefined;
                  const disabled = !isSelected && atCap;
                  const levels = levelsForSubject(config, subject.name);
                  return (
                    <motion.div
                      key={subject.name}
                      layout
                      transition={transition.fast}
                      className={cn(
                        "rounded-2xl border transition-colors",
                        isSelected
                          ? "border-accent bg-accent/15"
                          : disabled
                            ? "border-border bg-muted/40"
                            : "border-border bg-card hover:border-accent/60",
                      )}
                    >
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isSelected}
                        aria-label={subject.name}
                        disabled={disabled}
                        onClick={() => toggle(subject.name)}
                        className={cn(
                          "flex w-full items-center gap-1.5 rounded-2xl px-3 py-1.5 text-left text-xs transition-colors",
                          isSelected
                            ? "font-medium text-foreground"
                            : disabled
                              ? "cursor-not-allowed text-muted-foreground/60"
                              : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3 shrink-0 text-accent" />}
                        <span>{subject.name}</span>
                        {subject.core && (
                          <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
                            Core
                          </span>
                        )}
                      </button>

                      {isSelected && levels.length > 0 && (
                        <div
                          role="group"
                          aria-label={`${config.levelLabel ?? "Level"} for ${subject.name}`}
                          className="px-2 pb-2"
                        >
                          {config.levelLabel && (
                            <span className="mb-1 block text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                              {config.levelLabel}
                            </span>
                          )}
                          <div className="flex flex-wrap gap-1 rounded-full border border-border/60 bg-background/70 p-0.5">
                            {levels.map((level) => {
                              const active = picked.level === level;
                              return (
                                <button
                                  key={level}
                                  type="button"
                                  aria-pressed={active}
                                  aria-label={`${subject.name}: ${level}`}
                                  onClick={() => setLevel(subject.name, level)}
                                  className={cn(
                                    "rounded-full px-2 py-0.5 text-[10px] transition-colors",
                                    active
                                      ? "bg-accent text-accent-foreground font-semibold"
                                      : "text-muted-foreground hover:text-foreground",
                                  )}
                                >
                                  {level}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.section>
          ))}
        </motion.div>
      )}
    </div>
  );
}
