import { useId, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { swatch } from "@/lib/routine/colors";
import {
  PRIORITIES,
  ROUTINE_COLORS,
  WEEKDAY_LABELS,
  type Priority,
  type RoutineColor,
  type Weekday,
} from "@/lib/routine/types";

/**
 * The editor chrome every Routine page shares.
 *
 * Eight of the nine pages need "open a panel, fill four fields, save" — and if
 * each built its own, a class dialog and a goal dialog would drift into two
 * different products inside one section. So the dialog, the field row, the
 * colour picker, the weekday picker and the priority control live here once.
 *
 * Two deliberate choices worth knowing:
 *
 *   * Controls are native `<input type="date">` / `type="time">` /
 *     `type="datetime-local">` rather than a custom calendar popover. A native
 *     control on a phone opens the platform's own picker, which is faster than
 *     anything rendered in the page and already respects the device's locale and
 *     timezone — and Routine's whole date discipline is "the user's local wall
 *     clock, never UTC".
 *   * `datetime-local` values are converted with {@link toLocalInput} /
 *     {@link fromLocalInput}, never `toISOString().slice(0,16)` — that shortcut
 *     is the single most common way a scheduling UI silently shifts everything
 *     by the UTC offset.
 */

// ── Local ⇄ input-value conversion ───────────────────────────────────────

function pad(n: number): string {
  return `${n}`.padStart(2, "0");
}

/** ISO instant → "YYYY-MM-DDTHH:MM" in the *viewer's* zone. */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

/** "YYYY-MM-DDTHH:MM" in the viewer's zone → ISO instant. */
export function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** "HH:MM:SS" or "HH:MM" → the "HH:MM" an `<input type="time">` wants. */
export function toTimeInput(time: string | null | undefined): string {
  return time ? time.slice(0, 5) : "";
}

/** "HH:MM" → the "HH:MM:SS" Postgres `time` expects. Empty stays null. */
export function fromTimeInput(value: string): string | null {
  if (!value) return null;
  return value.length === 5 ? `${value}:00` : value;
}

// ── Dialog ───────────────────────────────────────────────────────────────

export function RoutineDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel = "Save",
  onSubmit,
  saving = false,
  canSubmit = true,
  destructive,
  className,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** What saving this will do. One line — not a restatement of the title. */
  description?: string;
  submitLabel?: string;
  onSubmit: () => void;
  saving?: boolean;
  canSubmit?: boolean;
  /** A delete affordance, rendered on the left of the footer. */
  destructive?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-h-[90vh] overflow-y-auto sm:max-w-[46rem]", className)}>
        <DialogHeader>
          <DialogTitle className="font-display">{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit && !saving) onSubmit();
          }}
        >
          {children}

          <DialogFooter className="gap-2 sm:justify-between">
            <div className="flex items-center">{destructive}</div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={!canSubmit || saving} className="gap-1.5">
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {submitLabel}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Fields ───────────────────────────────────────────────────────────────

/** Label + control + optional hint, with the label wired to the control. */
export function Field({
  label,
  hint,
  required,
  className,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  className?: string;
  /** Receives the generated id so the label points at the real control. */
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id} className="text-xs font-semibold">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children(id)}
      {hint && <p className="text-[11px] leading-snug text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Two fields side by side on anything wider than a phone. */
export function FieldRow({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

// ── Shared controls ──────────────────────────────────────────────────────

/**
 * Colour choice as swatches rather than a select.
 *
 * Colour is decoration in Routine — never the sole carrier of meaning — so this
 * is intentionally a small, quiet row. Selection is marked by a ring *and* by
 * `aria-pressed`, so it survives both a colour-blind reading and a screen reader.
 */
export function ColorPicker({
  value,
  onChange,
  label = "Colour",
}: {
  value: RoutineColor;
  onChange: (color: RoutineColor) => void;
  label?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold">{label}</Label>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
        {ROUTINE_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            aria-pressed={value === c}
            aria-label={c}
            title={c}
            className={cn(
              "h-7 w-7 rounded-full border transition-transform hover:scale-110",
              swatch(c).dot,
              value === c
                ? "ring-2 ring-foreground ring-offset-2 ring-offset-background"
                : "border-transparent opacity-70",
            )}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Weekday multi-select, Monday first because a school week is.
 *
 * Values are 0=Sunday to match `Date.getDay()` and the `days_of_week` column;
 * only the *display order* is rotated.
 */
export const WEEKDAYS_MONDAY_FIRST: Weekday[] = [1, 2, 3, 4, 5, 6, 0];

export function WeekdayPicker({
  value,
  onChange,
  label = "Days",
}: {
  value: Weekday[];
  onChange: (days: Weekday[]) => void;
  label?: string;
}) {
  const toggle = (d: Weekday) =>
    onChange(value.includes(d) ? value.filter((x) => x !== d) : [...value, d]);

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold">{label}</Label>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
        {WEEKDAYS_MONDAY_FIRST.map((d) => {
          const on = value.includes(d);
          return (
            <button
              key={d}
              type="button"
              onClick={() => toggle(d)}
              aria-pressed={on}
              className={cn(
                "min-h-[36px] min-w-[44px] rounded-lg border px-2 text-xs font-semibold transition-colors",
                on
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-border text-muted-foreground hover:border-accent/50 hover:text-foreground",
              )}
            >
              {WEEKDAY_LABELS[d]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const PRIORITY_LABEL: Record<Priority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export function PrioritySelect({
  value,
  onChange,
  id,
}: {
  value: Priority;
  onChange: (p: Priority) => void;
  id?: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Priority)}>
      <SelectTrigger id={id}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PRIORITIES.map((p) => (
          <SelectItem key={p} value={p}>
            {PRIORITY_LABEL[p]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** A select over a fixed list of string literals, with title-cased labels. */
export function EnumSelect<T extends string>({
  value,
  onChange,
  options,
  labels,
  id,
  placeholder,
}: {
  value: T;
  onChange: (v: T) => void;
  options: readonly T[];
  labels?: Partial<Record<T, string>>;
  id?: string;
  placeholder?: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as T)}>
      <SelectTrigger id={id}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {labels?.[o] ?? o.charAt(0).toUpperCase() + o.slice(1).replace(/_/g, " ")}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * The destructive slot for {@link RoutineDialog}.
 *
 * Two-step by design: the first click arms it, the second commits. A one-click
 * delete inside a dialog that the user opened to *edit* something is how records
 * get lost, and a nested confirm dialog on top of an open dialog is worse.
 */
export function DeleteAction({
  armed,
  onArm,
  onConfirm,
  label = "Delete",
}: {
  armed: boolean;
  onArm: () => void;
  onConfirm: () => void;
  label?: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={armed ? onConfirm : onArm}
      className={cn(
        "text-destructive hover:bg-destructive/10 hover:text-destructive",
        armed && "bg-destructive/10 font-semibold",
      )}
    >
      {armed ? "Tap again to confirm" : label}
    </Button>
  );
}
