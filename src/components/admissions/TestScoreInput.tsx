import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

export interface TestScore {
  taken: boolean;
  score: string;
  outOf: number;
}

interface TestScoreInputProps {
  label: string;
  helper?: string;
  value: TestScore;
  onChange: (next: TestScore) => void;
  /** Default "out of" value. If outOfEditable=false the field is locked. */
  defaultOutOf: number;
  outOfEditable?: boolean;
  minScore?: number;
}

export function TestScoreInput({
  label,
  helper,
  value,
  onChange,
  defaultOutOf,
  outOfEditable = false,
  minScore = 0,
}: TestScoreInputProps) {
  const scoreNum = parseFloat(value.score);
  const outOfNum = value.outOf || defaultOutOf;
  const overMax = !isNaN(scoreNum) && scoreNum > outOfNum;
  const underMin = !isNaN(scoreNum) && scoreNum < minScore;
  const invalid = value.taken && (overMax || underMin);

  return (
    <div className="p-4 bg-muted/30 rounded-lg border border-border">
      <div className="flex items-center gap-3 mb-3">
        <Checkbox
          id={`taken-${label}`}
          checked={value.taken}
          onCheckedChange={(c) => onChange({ ...value, taken: c === true })}
        />
        <Label htmlFor={`taken-${label}`} className="font-medium cursor-pointer">
          {label}
        </Label>
      </div>
      {value.taken && (
        <div className="grid grid-cols-2 gap-3 ml-7">
          <div className="space-y-1">
            <Label className="text-xs">Score</Label>
            <Input
              type="number"
              inputMode="numeric"
              min={minScore}
              max={outOfNum}
              value={value.score}
              onChange={(e) => onChange({ ...value, score: e.target.value })}
              className={`h-9 ${invalid ? "border-destructive" : ""}`}
              placeholder={`${minScore}–${outOfNum}`}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Out of</Label>
            <Input
              type="number"
              value={value.outOf || defaultOutOf}
              readOnly={!outOfEditable}
              onChange={(e) =>
                outOfEditable && onChange({ ...value, outOf: parseInt(e.target.value) || defaultOutOf })
              }
              className={`h-9 ${outOfEditable ? "" : "bg-muted/40 cursor-not-allowed"}`}
            />
          </div>
          {invalid && (
            <p className="col-span-2 text-[11px] text-destructive">
              {overMax
                ? `Score cannot exceed ${outOfNum}.`
                : `Score must be at least ${minScore}.`}
            </p>
          )}
          {helper && <p className="col-span-2 text-[11px] text-muted-foreground">{helper}</p>}
        </div>
      )}
    </div>
  );
}
