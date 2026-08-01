import { useState } from "react";
import { Plus, Copy, Users } from "lucide-react";
import { TeacherLayout } from "@/components/teacher/TeacherLayout";
import { BackToCommand } from "@/components/teacher/BackToCommand";
import { useTeacherClasses } from "@/hooks/useTeacherClasses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export default function TeacherClasses() {
  const { classes, loading, createClass } = useTeacherClasses();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  const submit = async () => {
    if (name.trim().length < 2) return;
    setCreating(true);
    const { error } = await createClass(name.trim(), grade.trim() || undefined);
    setCreating(false);
    if (error) {
      toast({ variant: "destructive", title: "Could not create class", description: error.message });
    } else {
      toast({ title: "Class created" });
      setName(""); setGrade(""); setOpen(false);
    }
  };

  const copy = (code: string) => {
    navigator.clipboard.writeText(code).then(() => toast({ title: "Invite code copied" }));
  };

  return (
    <TeacherLayout>
      <BackToCommand />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Cohorts</h1>
          <p className="text-sm text-muted-foreground mt-1">Group students for analytics. Share the invite code so they can join.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> New class</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create a class</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. AP Chemistry — Period 3" maxLength={80} />
              </div>
              <div className="space-y-1">
                <Label>Grade level (optional)</Label>
                <Input value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="e.g. 11th Grade" maxLength={40} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={submit} disabled={creating || name.trim().length < 2}>
                {creating ? "Creating…" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading classes…</p>
      ) : classes.length === 0 ? (
        <div className="card-elevated p-8 text-center">
          <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No classes yet. Create one to start grouping students.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {classes.map((c) => (
            <div key={c.id} className="card-elevated p-4 space-y-3">
              <div>
                <h3 className="font-semibold text-foreground">{c.name}</h3>
                <p className="text-xs text-muted-foreground">{c.grade_level || "All grades"} • {c.member_count} students</p>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm font-mono px-2 py-1.5 rounded-md bg-muted text-foreground">{c.invite_code}</code>
                <Button size="sm" variant="ghost" onClick={() => copy(c.invite_code)}><Copy className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </TeacherLayout>
  );
}
