import { useState } from "react";
import { Plus, Calendar, Target } from "lucide-react";
import { TeacherLayout } from "@/components/teacher/TeacherLayout";
import { BackToCommand } from "@/components/teacher/BackToCommand";
import { useTeacherAssignments } from "@/hooks/useAssignments";
import { useTeacherClasses } from "@/hooks/useTeacherClasses";
import { useTeacherRoster } from "@/hooks/useTeacherRoster";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const KINDS: Array<{ value: "activity" | "project" | "competition" | "task"; label: string }> = [
  { value: "task", label: "Task" },
  { value: "activity", label: "Activity" },
  { value: "project", label: "Project" },
  { value: "competition", label: "Competition" },
];

export default function TeacherAssignments() {
  const { assignments, loading, createAssignment } = useTeacherAssignments();
  const { classes } = useTeacherClasses();
  const { students } = useTeacherRoster();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [kind, setKind] = useState<"activity" | "project" | "competition" | "task">("task");
  const [targetType, setTargetType] = useState<"student" | "class">("class");
  const [targetId, setTargetId] = useState("");
  const [deadline, setDeadline] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (title.trim().length < 2 || !targetId) return;
    setSubmitting(true);
    const { error } = await createAssignment({
      title: title.trim(),
      instructions: instructions.trim() || undefined,
      kind, target_type: targetType, target_id: targetId,
      deadline: deadline ? new Date(deadline).toISOString() : null,
    });
    setSubmitting(false);
    if (error) toast({ variant: "destructive", title: "Could not save", description: error.message });
    else {
      toast({ title: "Assignment created" });
      setTitle(""); setInstructions(""); setDeadline(""); setTargetId(""); setOpen(false);
    }
  };

  return (
    <TeacherLayout>
      <BackToCommand />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Assignments</h1>
          <p className="text-sm text-muted-foreground mt-1">Push tasks, activities, projects, or competitions into your students' Journey.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> New assignment</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New assignment</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Type</Label>
                  <Select value={kind} onValueChange={(v) => setKind(v as typeof kind)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Deadline (optional)</Label>
                  <Input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Assign to</Label>
                  <Select value={targetType} onValueChange={(v) => { setTargetType(v as typeof targetType); setTargetId(""); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="class">A class</SelectItem>
                      <SelectItem value="student">A specific student</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>{targetType === "class" ? "Class" : "Student"}</Label>
                  <Select value={targetId} onValueChange={setTargetId}>
                    <SelectTrigger><SelectValue placeholder="Choose…" /></SelectTrigger>
                    <SelectContent>
                      {targetType === "class"
                        ? classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)
                        : students.map((s) => <SelectItem key={s.user_id} value={s.user_id}>{s.username || s.email || s.user_id.slice(0, 8)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Instructions (optional)</Label>
                <Textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={4} maxLength={2000} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={submit} disabled={submitting || title.trim().length < 2 || !targetId}>
                {submitting ? "Saving…" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : assignments.length === 0 ? (
        <div className="card-elevated p-8 text-center">
          <Target className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No assignments yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {assignments.map((a) => (
            <div key={a.id} className="card-elevated p-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-foreground truncate">{a.title}</h3>
                  <Badge variant="outline" className="capitalize">{a.kind}</Badge>
                  <Badge variant="secondary" className="capitalize">{a.target_type}</Badge>
                </div>
                {a.instructions && <p className="text-sm text-muted-foreground line-clamp-2">{a.instructions}</p>}
                {a.deadline && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Due {new Date(a.deadline).toLocaleString()}
                  </p>
                )}
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">{new Date(a.created_at).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      )}
    </TeacherLayout>
  );
}
