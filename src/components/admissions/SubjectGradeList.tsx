import { useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
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
import { CURRICULA, getCurriculumConfig } from "@/lib/curriculumSubjects";

export interface SubjectEntry {
  id: string;
  subject: string;
  level?: string; // HL/SL or Higher/Standard etc
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
    onChange([
      ...entries,
      {
        id: crypto.randomUUID(),
        subject: "",
        level: config.hasLevels ? config.levelOptions?.[0] : undefined,
        grade: "",
      },
    ]);
  };

  const removeEntry = (id: string) => {
    onChange(entries.filter((e) => e.id !== id));
  };

  const updateEntry = (id: string, patch: Partial<SubjectEntry>) => {
    onChange(entries.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };

  const usedSubjects = new Set(entries.map((e) => e.subject).filter(Boolean));

  const validateGrade = (val: string): boolean => {
    if (!val) return true;
    if (config.gradeScale.options) {
      return config.gradeScale.options.includes(val);
    }
    const num = parseFloat(val);
    if (isNaN(num)) return false;
    return num >= config.gradeScale.min && num <= config.gradeScale.max;
  };

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
            const gradeValid = validateGrade(entry.grade);
            return (
              <div
                key={entry.id}
                className="grid gap-2 sm:grid-cols-[1fr_120px_120px_40px] items-start p-3 rounded-lg border border-border bg-muted/20"
              >
                <div className="space-y-1">
                  <Select
                    value={entry.subject}
                    onValueChange={(v) => updateEntry(entry.id, { subject: v })}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Choose subject" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {config.subjects
                        .filter((s) => s === entry.subject || !usedSubjects.has(s))
                        .map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {config.hasLevels && config.levelOptions ? (
                  <Select
                    value={entry.level || ""}
                    onValueChange={(v) => updateEntry(entry.id, { level: v })}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Level" />
                    </SelectTrigger>
                    <SelectContent>
                      {config.levelOptions.map((lv) => (
                        <SelectItem key={lv} value={lv}>
                          {lv}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div />
                )}

                {config.gradeScale.options ? (
                  <Select
                    value={entry.grade}
                    onValueChange={(v) => updateEntry(entry.id, { grade: v })}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Grade" />
                    </SelectTrigger>
                    <SelectContent>
                      {config.gradeScale.options.map((g) => (
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
                      min={config.gradeScale.min}
                      max={config.gradeScale.max}
                      step={config.gradeScale.step}
                      value={entry.grade}
                      onChange={(e) => updateEntry(entry.id, { grade: e.target.value })}
                      className={`h-9 text-sm ${entry.grade && !gradeValid ? "border-destructive" : ""}`}
                      placeholder={`${config.gradeScale.min}–${config.gradeScale.max}`}
                    />
                    {entry.grade && !gradeValid && (
                      <p className="text-[10px] text-destructive">
                        {config.gradeScale.min}–{config.gradeScale.max}
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
