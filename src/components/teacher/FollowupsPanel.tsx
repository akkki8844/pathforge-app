import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Plus, Check, X, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useCounselorFollowups, type Followup } from "@/hooks/useCounselorFollowups";
import type { RosterStudent } from "@/hooks/useTeacherRoster";
import { toast } from "sonner";

interface Props {
  students: RosterStudent[];
  /** Lifted state for parent (Daily focus needs the same data). */
  onChange?: (items: Followup[]) => void;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

export function FollowupsPanel({ students, onChange }: Props) {
  const { items, add, setStatus, remove } = useCounselorFollowups();
  const [expanded, setExpanded] = useState(true);
  const [studentId, setStudentId] = useState("");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");

  // Notify parent when items change
  useMemo(() => onChange?.(items), [items, onChange]);

  const today = todayISO();
  const open = items.filter((i) => i.status === "open");
  const overdue = open.filter((i) => i.due_date < today);
  const dueToday = open.filter((i) => i.due_date === today);
  const upcoming = open.filter((i) => i.due_date > today).slice(0, 8);

  const nameMap = useMemo(
    () => new Map(students.map((s) => [s.user_id, s.username || s.email || "Student"])),
    [students],
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !note.trim()) {
      toast.error("Pick a student and add a note");
      return;
    }
    const { error } = (await add({ student_id: studentId, due_date: date, note: note.trim() })) ?? {};
    if (error) toast.error(error.message);
    else {
      toast.success("Follow-up added");
      setNote("");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.05 }}
      className="card-elevated overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full p-4 border-b border-border flex items-center gap-2 hover:bg-muted/30 transition-colors"
      >
        <Bell className="h-4 w-4 text-accent" />
        <h2 className="text-sm font-semibold text-foreground">Follow-ups</h2>
        <div className="ml-auto flex items-center gap-2">
          {overdue.length > 0 && (
            <Badge variant="destructive" className="text-[10px]">{overdue.length} overdue</Badge>
          )}
          {dueToday.length > 0 && (
            <Badge className="text-[10px] bg-accent text-accent-foreground">{dueToday.length} today</Badge>
          )}
          <span className="text-xs text-muted-foreground">{open.length} open</span>
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-4">
              {/* Add new */}
              <form onSubmit={submit} className="grid grid-cols-12 gap-2">
                <Select value={studentId} onValueChange={setStudentId}>
                  <SelectTrigger className="col-span-12 md:col-span-4 h-9 text-xs">
                    <SelectValue placeholder="Student…" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.length === 0 ? (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">No students yet</div>
                    ) : (
                      students.map((s) => (
                        <SelectItem key={s.user_id} value={s.user_id}>
                          {s.username || s.email || "Student"}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="col-span-6 md:col-span-2 h-9 text-xs"
                />
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="What to follow up on…"
                  className="col-span-12 md:col-span-5 h-9 text-xs"
                  maxLength={300}
                />
                <Button type="submit" size="sm" className="col-span-6 md:col-span-1 h-9">
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </form>

              {/* Lists */}
              {open.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">
                  No open follow-ups. Add one above to set a reminder.
                </p>
              ) : (
                <div className="space-y-3">
                  <Group title="Overdue" tone="warn" items={overdue} nameMap={nameMap} setStatus={setStatus} remove={remove} />
                  <Group title="Due today" tone="accent" items={dueToday} nameMap={nameMap} setStatus={setStatus} remove={remove} />
                  <Group title="Upcoming" tone="neutral" items={upcoming} nameMap={nameMap} setStatus={setStatus} remove={remove} />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Group({
  title, tone, items, nameMap, setStatus, remove,
}: {
  title: string;
  tone: "warn" | "accent" | "neutral";
  items: Followup[];
  nameMap: Map<string, string>;
  setStatus: (id: string, status: Followup["status"]) => Promise<void>;
  remove: (id: string) => Promise<void>;
}) {
  if (items.length === 0) return null;
  const dot =
    tone === "warn" ? "bg-destructive" : tone === "accent" ? "bg-accent" : "bg-muted-foreground/40";
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {title} · {items.length}
        </p>
      </div>
      <ul className="space-y-1">
        <AnimatePresence initial={false}>
          {items.map((f) => (
            <motion.li
              key={f.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18 }}
              className="group flex items-start gap-2 px-2 py-1.5 rounded-md hover:bg-muted/60"
            >
              <button
                type="button"
                onClick={() => setStatus(f.id, "done")}
                className="mt-0.5 h-4 w-4 rounded border border-border hover:border-accent flex items-center justify-center flex-shrink-0"
                aria-label="Mark done"
              >
                <Check className="h-3 w-3 text-transparent group-hover:text-muted-foreground" />
              </button>
              <Link
                to={`/teacher/students/${f.student_id}`}
                className="flex-1 min-w-0 text-xs"
              >
                <span className="font-medium text-foreground">
                  {nameMap.get(f.student_id) ?? "Student"}
                </span>
                <span className="text-muted-foreground"> — {f.note}</span>
                <span className="block text-[10px] text-muted-foreground mt-0.5">
                  Due {new Date(f.due_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
              </Link>
              <button
                type="button"
                onClick={() => remove(f.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive mt-0.5"
                aria-label="Remove"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}
