import { useEffect, useMemo, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { InteractionKind } from "@/hooks/useCounsellorInteractions";
import type { RosterStudent } from "@/hooks/useTeacherRoster";

/**
 * Booking a session.
 *
 * /teacher/meetings rendered a calendar of sessions and gave a counsellor no
 * way to put one on it. The page imported a `Plus` icon it never used and
 * called `useCounsellorInteractions()` without a student id, which meant the
 * `log` it got back rejected every write with "Not signed in" - the hook bound
 * the student to its own argument. Sessions could only be created from a
 * student's own page, so the calendar was a read-only view of work done
 * somewhere else.
 *
 * This is the missing half. It writes the same `counsellor_interactions` row
 * the student timeline writes, so a session booked here shows up there and
 * vice versa; there is no second store and no second idea of what a meeting
 * is.
 */

const KINDS: { value: InteractionKind; label: string }[] = [
  { value: "meeting", label: "Meeting" },
  { value: "call", label: "Call" },
  { value: "chat", label: "Chat" },
  { value: "email", label: "Email" },
  { value: "other", label: "Other" },
];

/** `2026-09-21`, in the browser's own timezone rather than UTC. */
function dateInputValue(d: Date): string {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

/** Next round half-hour, which is what a counsellor almost always wants. */
function defaultTime(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() > 30 ? 60 : 30, 0, 0);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export interface MeetingDraft {
  /** Pre-selected day, when the dialog was opened from a calendar cell. */
  date?: Date;
  /** Pre-selected student, when opened from a student's row. */
  studentId?: string;
}

export function MeetingComposer({
  open,
  onOpenChange,
  students,
  draft,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: RosterStudent[];
  draft?: MeetingDraft;
  /**
   * Writes the row and reports what happened.
   *
   * The error is typed by its message alone rather than as `Error`: what
   * comes back from PostgREST is a `PostgrestError`, which is a plain object
   * and not an `Error` subclass, while `useCounsellorInteractions.log` also
   * returns a real `Error` when there is no student to write against. The
   * message is the part this dialog shows either way.
   */
  onSubmit: (input: {
    student_id: string;
    kind: InteractionKind;
    summary: string;
    occurred_at: string;
  }) => Promise<{ error: { message: string } | null }>;
}) {
  const { toast } = useToast();

  const [studentId, setStudentId] = useState("");
  const [kind, setKind] = useState<InteractionKind>("meeting");
  const [date, setDate] = useState(dateInputValue(new Date()));
  const [time, setTime] = useState(defaultTime());
  const [summary, setSummary] = useState("");
  const [saving, setSaving] = useState(false);

  // Reopening with a different cell or student has to reset the form, or the
  // second booking silently keeps the first one's day.
  useEffect(() => {
    if (!open) return;
    setStudentId(draft?.studentId ?? "");
    setKind("meeting");
    setDate(dateInputValue(draft?.date ?? new Date()));
    setTime(defaultTime());
    setSummary("");
  }, [open, draft?.studentId, draft?.date]);

  const sorted = useMemo(
    () =>
      [...students].sort((a, b) =>
        (a.full_name || a.email || "").localeCompare(b.full_name || b.email || ""),
      ),
    [students],
  );

  const submit = async () => {
    if (!studentId) {
      toast({ variant: "destructive", title: "Pick a student" });
      return;
    }
    const at = new Date(`${date}T${time}`);
    if (Number.isNaN(at.getTime())) {
      toast({ variant: "destructive", title: "That date and time are not valid" });
      return;
    }

    setSaving(true);
    try {
      const { error } = await onSubmit({
        student_id: studentId,
        kind,
        summary: summary.trim(),
        occurred_at: at.toISOString(),
      });
      if (error) {
        toast({ variant: "destructive", title: "Could not save", description: error.message });
        return;
      }
      toast({
        title: "Session booked",
        description: at.toLocaleString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[26rem]">
        <DialogHeader>
          <DialogTitle>Book a session</DialogTitle>
          <DialogDescription>
            This goes on your calendar and on the student's own contact history.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="meeting-student">Student</Label>
            {sorted.length === 0 ? (
              <p className="rounded-md border border-border bg-muted/40 p-2.5 text-[12.5px] text-muted-foreground">
                No students are linked to you yet, so there is nobody to book with.
              </p>
            ) : (
              <Select value={studentId} onValueChange={setStudentId}>
                <SelectTrigger id="meeting-student">
                  <SelectValue placeholder="Choose a student" />
                </SelectTrigger>
                <SelectContent>
                  {sorted.map((s) => (
                    <SelectItem key={s.user_id} value={s.user_id}>
                      {s.full_name || s.email || "Unnamed student"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="meeting-date">Date</Label>
              <Input
                id="meeting-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meeting-time">Time</Label>
              <Input
                id="meeting-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="meeting-kind">Type</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as InteractionKind)}>
              <SelectTrigger id="meeting-kind">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KINDS.map((k) => (
                  <SelectItem key={k.value} value={k.value}>
                    {k.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="meeting-summary">What it is about</Label>
            <Textarea
              id="meeting-summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Finalise the college list, review the Common App draft..."
              rows={3}
              maxLength={500}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving || !sorted.length}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Book session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
