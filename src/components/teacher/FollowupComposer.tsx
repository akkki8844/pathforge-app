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
import { useCounselorFollowups } from "@/hooks/useCounselorFollowups";
import type { RosterStudent } from "@/hooks/useTeacherRoster";
import { todayValue } from "@/lib/teacher/followups";

/**
 * "Chase this", from wherever the counsellor noticed it.
 *
 * Follow-ups could only be created in one place: the form inside the Today
 * card on the counsellor home. So a counsellor looking at Applications, seeing
 * a deadline five days out with two documents missing, had to remember the
 * student's name, go to Today, find the form, and retype what they had just
 * been reading. Every step in that is a chance to lose the thing.
 *
 * This is the same table and the same `add` the home card writes to - there is
 * one follow-up list, and an item created here appears there. It only exists
 * so the action can sit next to the thing that prompted it.
 */

export interface FollowupDraft {
  studentId?: string;
  /** Seeds the note. The counsellor can still rewrite it. */
  note?: string;
  dueDate?: string;
  /** Shown above the form, to say what this follow-up came off. */
  context?: string;
}

export function FollowupComposer({
  open,
  onOpenChange,
  students,
  draft,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: RosterStudent[];
  draft?: FollowupDraft;
  onAdded?: () => void;
}) {
  const { toast } = useToast();
  const { add } = useCounselorFollowups();

  const [studentId, setStudentId] = useState("");
  const [dueDate, setDueDate] = useState(todayValue());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  // Reopening against a different row has to reseed, or the second follow-up
  // silently carries the first one's note.
  useEffect(() => {
    if (!open) return;
    setStudentId(draft?.studentId ?? "");
    setDueDate(draft?.dueDate ?? todayValue());
    setNote(draft?.note ?? "");
  }, [open, draft?.studentId, draft?.dueDate, draft?.note]);

  const sorted = useMemo(
    () =>
      [...students].sort((a, b) =>
        (a.full_name || a.email || "").localeCompare(b.full_name || b.email || ""),
      ),
    [students],
  );

  const submit = async () => {
    const body = note.trim();
    if (!studentId) {
      toast({ variant: "destructive", title: "Pick a student" });
      return;
    }
    if (!body) {
      toast({
        variant: "destructive",
        title: "Say what to follow up on",
        description: "A dated reminder with no subject is not one.",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = (await add({ student_id: studentId, due_date: dueDate, note: body })) ?? {};
      if (error) {
        toast({ variant: "destructive", title: "Not saved", description: error.message });
        return;
      }
      toast({
        title: "Follow-up added",
        description: "It appears on Today when it comes due.",
      });
      onAdded?.();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[26rem]">
        <DialogHeader>
          <DialogTitle>Add a follow-up</DialogTitle>
          <DialogDescription>
            {draft?.context ?? "It appears on your Today screen when it comes due."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="followup-student">Student</Label>
            {sorted.length === 0 ? (
              <p className="rounded-md border border-border bg-muted/40 p-2.5 text-[12.5px] text-muted-foreground">
                No students are linked to you yet.
              </p>
            ) : (
              <Select value={studentId} onValueChange={setStudentId}>
                <SelectTrigger id="followup-student">
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

          <div className="space-y-2">
            <Label htmlFor="followup-due">Due</Label>
            <Input
              id="followup-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="followup-note">What to follow up on</Label>
            <Textarea
              id="followup-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Chase the transcript for the Common App..."
              rows={3}
              maxLength={300}
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
            Add follow-up
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
