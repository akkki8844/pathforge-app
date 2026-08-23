import { useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getCurriculumConfig,
  gradeScaleFor,
  levelsForSubject,
  subjectsInGroup,
} from "@/lib/curriculumSubjects";

export interface SubjectEntry {
  id: string;
  subject: string;
  level?: string; // HL/SL, Core/Extended, Standard/Basic — board-dependent
  grade: string;
}

interface SubjectGradeListProps {
  curriculum: string;
  entries: SubjectEntry[];
  onChange: (entries: SubjectEntry[]) => void;
}

export function SubjectGradeList({ curriculum, entries, onChange }: SubjectGradeListProps) {
  const config = useMemo(() => getCurriculumConfig(curriculum), [curriculum]);

  const addEntry = () => {
    onChange([...entries, { id: crypto.randomUUID(), subject: "", grade: "" }]);
  };

  const removeEntry = (id: string) => {
    onChange(entries.filter((e) => e.id !== id));
  };

  const updateEntry = (id: string, patch: Partial<SubjectEntry>) => {
    onChange(entries.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };

  /**
   * Changing the subject can change which levels are legal, so the old level
   * has to be re-derived rather than carried over — otherwise picking IGCSE
   * Art after IGCSE Maths would leave a stale "Extended" tier attached to a
   * subject that has no tiers.
   */
  const selectSubject = (id: string, subject: string) => {
    const levels = levelsForSubject(config, subject);
    updateEntry(id, { subject, level: levels[0], grade: "" });
  };

  const usedSubjects = new Set(entries.map((e) => e.subject).filter(Boolean));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium">Subjects & Grades</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            {config.label} · grading scale {config.gradeScale.label}
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={addEntry} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Add subject
        </Button>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
          No subjects added yet. Click <span className="font-medium">Add subject</span> to begin.
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => {
            const levels = entry.subject ? levelsForSubject(config, entry.subject) : [];
            const scale = gradeScaleFor(config, entry.subject, entry.level);
            const gradeValid = (() => {
              if (!entry.grade) return true;
              if (scale.options) return scale.options.includes(entry.grade);
              const num = parseFloat(entry.grade);
              return !isNaN(num) && num >= scale.min && num <= scale.max;
            })();

            return (
              <div
                key={entry.id}
                className="grid gap-2 sm:grid-cols-[1fr_130px_130px_40px] items-start p-3 rounded-lg border border-border bg-muted/20"
              >
                <Select value={entry.subject} onValueChange={(v) => selectSubject(entry.id, v)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Choose subject" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {config.groups.map((groupName) => {
                      const available = subjectsInGroup(config, groupName).filter(
                        (s) => s.name === entry.subject || !usedSubjects.has(s.name),
                      );
                      if (available.length === 0) return null;
                      return (
                        <SelectGroup key={groupName}>
                          <SelectLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
                            {groupName}
                          </SelectLabel>
                          {available.map((s) => (
                            <SelectItem key={s.name} value={s.name}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      );
                    })}
                  </SelectContent>
                </Select>

                {levels.length > 0 ? (
                  <Select
                    value={entry.level || ""}
                    onValueChange={(v) => updateEntry(entry.id, { level: v, grade: "" })}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder={config.levelLabel ?? "Level"} />
                    </SelectTrigger>
                    <SelectContent>
                      {levels.map((lv) => (
                        <SelectItem key={lv} value={lv}>
                          {lv}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div />
                )}

                {scale.options ? (
                  <Select
                    value={entry.grade}
                    onValueChange={(v) => updateEntry(entry.id, { grade: v })}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Grade" />
                    </SelectTrigger>
                    <SelectContent>
                      {scale.options.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="space-y-0.5">
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={scale.min}
                      max={scale.max}
                      step={scale.step}
                      value={entry.grade}
                      onChange={(e) => updateEntry(entry.id, { grade: e.target.value })}
                      className={`h-9 text-sm ${entry.grade && !gradeValid ? "border-destructive" : ""}`}
                      placeholder={`${scale.min}–${scale.max}`}
                    />
                    {entry.grade && !gradeValid && (
                      <p className="text-[10px] text-destructive">
                        {scale.min}–{scale.max}
                      </p>
                    )}
                  </div>
                )}

                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 text-muted-foreground hover:text-destructive"
                  onClick={() => removeEntry(entry.id)}
                  aria-label="Remove subject"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
