import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Plus, Check, X, AlertTriangle, CalendarClock, Target } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCounselorDailyFocus } from "@/hooks/useCounselorDailyFocus";
import type { Followup } from "@/hooks/useCounselorFollowups";
import type { RosterStudent } from "@/hooks/useTeacherRoster";

interface Props {
  followups: Followup[];
  students: RosterStudent[];
  inactive: Array<{ user_id: string; display_name: string; daysInactive: number }>;
}

/**
 * Auto + manual "What should I work on today" panel.
 * Auto items: today's open follow-ups + behind students + 7d+ inactive students.
 * Manual: counselor-curated tasks for today (persisted).
 */
export function DailyFocusPanel({ followups, students, inactive }: Props) {
  const { items, add, toggle, remove } = useCounselorDailyFocus();
  const [draft, setDraft] = useState("");

  const today = new Date().toISOString().slice(0, 10);
  const nameMap = useMemo(
    () => new Map(students.map((s) => [s.user_id, s.username || s.email || "Student"])),
    [students],
  );

  const autoItems = useMemo(() => {
    const out: Array<{ id: string; label: string; href?: string; tone: "warn" | "accent" | "neutral"; icon: typeof Target }> = [];

    followups
      .filter((f) => f.status === "open" && f.due_date <= today)
      .slice(0, 6)
      .forEach((f) => {
        const overdue = f.due_date < today;
        out.push({
          id: `f-${f.id}`,
          label: `Follow up with ${nameMap.get(f.student_id) ?? "student"} — ${f.note}`,
          href: `/teacher/students/${f.student_id}`,
          tone: overdue ? "warn" : "accent",
          icon: CalendarClock,
        });
      });

    students
      .filter((s) => s.status === "behind")
      .slice(0, 3)
      .forEach((s) => {
        out.push({
          id: `b-${s.user_id}`,
          label: `Push next step for ${s.username || s.email} (${s.overall_score}/100)`,
          href: `/teacher/students/${s.user_id}`,
          tone: "warn",
          icon: AlertTriangle,
        });
      });

    inactive.slice(0, 3).forEach((s) => {
      out.push({
        id: `i-${s.user_id}`,
        label: `Re-engage ${s.display_name} — inactive ${s.daysInactive}d`,
        href: `/teacher/students/${s.user_id}`,
        tone: "neutral",
        icon: Target,
      });
    });

    return out;
  }, [followups, students, inactive, nameMap, today]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    await add(draft);
    setDraft("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="card-elevated overflow-hidden"
    >
      <div className="p-4 border-b border-border flex items-center gap-2">
        <Sun className="h-4 w-4 text-accent" />
        <h2 className="text-sm font-semibold text-foreground">Today's focus</h2>
        <span className="ml-auto text-xs text-muted-foreground">
          {new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* Auto-generated */}
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-2">
            Suggested by signals
          </p>
          {autoItems.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No urgent flags right now. Your roster looks calm.
            </p>
          ) : (
            <ul className="space-y-1.5">
              <AnimatePresence initial={false}>
                {autoItems.map((it) => {
                  const Icon = it.icon;
                  const tone =
                    it.tone === "warn"
                      ? "text-destructive"
                      : it.tone === "accent"
                      ? "text-accent"
                      : "text-muted-foreground";
                  return (
                    <motion.li
                      key={it.id}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.18 }}
                    >
                      {it.href ? (
                        <Link
                          to={it.href}
                          className="flex items-start gap-2 px-2 py-1.5 rounded-md text-xs hover:bg-muted/60 transition-colors"
                        >
                          <Icon className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${tone}`} />
                          <span className="text-foreground">{it.label}</span>
                        </Link>
                      ) : (
                        <div className="flex items-start gap-2 px-2 py-1.5 text-xs">
                          <Icon className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${tone}`} />
                          <span className="text-foreground">{it.label}</span>
                        </div>
                      )}
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          )}
        </div>

        {/* Manual list */}
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-2">
            Your list
          </p>
          {items.length > 0 && (
            <ul className="space-y-1 mb-2">
              <AnimatePresence initial={false}>
                {items.map((it) => (
                  <motion.li
                    key={it.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.18 }}
                    className="group flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/60"
                  >
                    <button
                      type="button"
                      onClick={() => toggle(it.id, !it.done)}
                      className={`h-4 w-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                        it.done
                          ? "bg-accent border-accent text-accent-foreground"
                          : "border-border hover:border-accent"
                      }`}
                      aria-label={it.done ? "Mark as not done" : "Mark as done"}
                    >
                      {it.done && <Check className="h-3 w-3" />}
                    </button>
                    <span
                      className={`flex-1 text-xs ${
                        it.done ? "line-through text-muted-foreground" : "text-foreground"
                      }`}
                    >
                      {it.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => remove(it.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      aria-label="Remove"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
          <form onSubmit={handleAdd} className="flex gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add a task for today…"
              className="h-8 text-xs"
              maxLength={200}
            />
            <Button type="submit" size="sm" variant="outline" className="h-8 px-2">
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </form>
        </div>
      </div>
    </motion.div>
  );
}
