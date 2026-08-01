import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Target, CheckCircle2, Circle, ChevronRight, Wand2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { MilestoneItem, JourneyScores } from "@/hooks/useJourneyData";
import { hoverLift, hoverNudge } from "@/lib/motion";

interface SubTask {
  id: string;
  label: string;
  dueRel: string; // e.g. "Week 1", "By Day 14"
}

interface Props {
  milestones: MilestoneItem[];
  scores: JourneyScores;
  grade: string;
  completedMilestones: string[];
  onToggle: (milestoneId: string) => void;
}

// Deterministic sub-task decomposition — no AI call.
function decomposeMilestone(m: MilestoneItem): SubTask[] {
  const id = m.id;
  const cat = m.category;
  const isCompetition = cat === "competitions" || /compete|competition|olympiad|hackathon|amc/i.test(m.title);
  const isProject = cat === "activities" && /project|build|create|develop|launch/i.test(m.title);
  const isApplication = cat === "application";
  const isLeadership = cat === "leadership";
  const isTest = cat === "test_prep";

  if (isCompetition) {
    return [
      { id: `${id}-s1`, label: "Register on the official site", dueRel: "Week 1" },
      { id: `${id}-s2`, label: "Study syllabus & past papers (5+ hours)", dueRel: "Week 1–2" },
      { id: `${id}-s3`, label: "Complete a timed mock attempt", dueRel: "Week 3" },
      { id: `${id}-s4`, label: "Review weak topics & retry mistakes", dueRel: "Week 4" },
      { id: `${id}-s5`, label: "Submit final attempt / appear for the round", dueRel: "By month-end" },
    ];
  }
  if (isProject) {
    return [
      { id: `${id}-s1`, label: "Pick a specific problem & write a 1-page brief", dueRel: "Week 1" },
      { id: `${id}-s2`, label: "Build a minimum viable version (prototype/draft)", dueRel: "Week 2" },
      { id: `${id}-s3`, label: "Get feedback from 2 peers or a teacher", dueRel: "Week 3" },
      { id: `${id}-s4`, label: "Document outcomes with a quantified result", dueRel: "Week 4" },
      { id: `${id}-s5`, label: "Publish on LinkedIn or a personal site", dueRel: "By month-end" },
    ];
  }
  if (isApplication) {
    return [
      { id: `${id}-s1`, label: "Outline structure & key talking points", dueRel: "Week 1" },
      { id: `${id}-s2`, label: "Write a complete first draft", dueRel: "Week 2" },
      { id: `${id}-s3`, label: "Get reviews from 2 trusted readers", dueRel: "Week 3" },
      { id: `${id}-s4`, label: "Revise and finalize", dueRel: "Week 4" },
    ];
  }
  if (isLeadership) {
    return [
      { id: `${id}-s1`, label: "Identify the role or initiative to take", dueRel: "Week 1" },
      { id: `${id}-s2`, label: "Pitch it to the club/teacher and confirm scope", dueRel: "Week 2" },
      { id: `${id}-s3`, label: "Run the first event/meeting/initiative", dueRel: "Week 3" },
      { id: `${id}-s4`, label: "Document attendance, outcomes & next steps", dueRel: "Week 4" },
    ];
  }
  if (isTest) {
    return [
      { id: `${id}-s1`, label: "Take a full-length diagnostic test", dueRel: "Week 1" },
      { id: `${id}-s2`, label: "Identify weakest 3 topics from the diagnostic", dueRel: "Week 1" },
      { id: `${id}-s3`, label: "Study 30–45 min daily on weak areas", dueRel: "Week 2–3" },
      { id: `${id}-s4`, label: "Take a second timed mock & compare", dueRel: "Week 4" },
    ];
  }
  // Generic academics or other
  return [
    { id: `${id}-s1`, label: "Plan & gather what you need", dueRel: "Week 1" },
    { id: `${id}-s2`, label: "Take the first concrete action", dueRel: "Week 1–2" },
    { id: `${id}-s3`, label: "Make measurable progress (track it)", dueRel: "Week 3" },
    { id: `${id}-s4`, label: "Review, refine, and complete", dueRel: "Week 4" },
  ];
}

// Smart pick: weakest scoring category × highest priority incomplete milestone in current/next phase.
function pickFocus(milestones: MilestoneItem[], scores: JourneyScores): MilestoneItem | null {
  const incomplete = milestones.filter(m => !m.completed);
  if (incomplete.length === 0) return null;

  // Identify weakest category
  const cats: Array<{ key: keyof JourneyScores; cat: MilestoneItem["category"] }> = [
    { key: "competitions_score", cat: "competitions" },
    { key: "leadership_score", cat: "leadership" },
    { key: "activities_score", cat: "activities" },
    { key: "academics_score", cat: "academics" },
    { key: "test_prep_score", cat: "test_prep" },
  ];
  const weakest = [...cats].sort((a, b) => (scores[a.key] as number) - (scores[b.key] as number));

  for (const w of weakest) {
    const candidate = incomplete
      .filter(m => m.category === w.cat)
      .sort((a, b) => {
        const order = { critical: 0, high: 1, recommended: 2 };
        return order[a.priority] - order[b.priority];
      })[0];
    if (candidate) return candidate;
  }
  // Fallback: any highest-priority incomplete
  return incomplete.sort((a, b) => {
    const order = { critical: 0, high: 1, recommended: 2 };
    return order[a.priority] - order[b.priority];
  })[0];
}

const FOCUS_KEY = "pathforge_monthly_focus_v1";

function readSavedFocus(): { id: string; subDone: string[]; month: string } | null {
  try {
    const raw = localStorage.getItem(FOCUS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const monthKey = new Date().toISOString().slice(0, 7);
    if (parsed.month !== monthKey) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveFocus(id: string, subDone: string[]) {
  const monthKey = new Date().toISOString().slice(0, 7);
  localStorage.setItem(FOCUS_KEY, JSON.stringify({ id, subDone, month: monthKey }));
}

export function MonthlyFocus({ milestones, scores, completedMilestones, onToggle }: Props) {
  const saved = useMemo(readSavedFocus, []);
  const [focusId, setFocusId] = useState<string | null>(saved?.id || null);
  const [subDone, setSubDone] = useState<string[]>(saved?.subDone || []);
  const [pickerOpen, setPickerOpen] = useState(false);

  const focusMilestone = useMemo(
    () => milestones.find(m => m.id === focusId) || null,
    [milestones, focusId]
  );

  const subTasks = useMemo(
    () => (focusMilestone ? decomposeMilestone(focusMilestone) : []),
    [focusMilestone]
  );

  const subProgress = subTasks.length > 0
    ? Math.round((subDone.filter(id => subTasks.some(s => s.id === id)).length / subTasks.length) * 100)
    : 0;

  const handlePickForMe = () => {
    const pick = pickFocus(milestones, scores);
    if (pick) {
      setFocusId(pick.id);
      setSubDone([]);
      saveFocus(pick.id, []);
    }
  };

  const handleManualPick = (m: MilestoneItem) => {
    setFocusId(m.id);
    setSubDone([]);
    saveFocus(m.id, []);
    setPickerOpen(false);
  };

  const toggleSub = (subId: string) => {
    const next = subDone.includes(subId)
      ? subDone.filter(s => s !== subId)
      : [...subDone, subId];
    setSubDone(next);
    if (focusId) saveFocus(focusId, next);

    // If all sub-tasks done, mark the parent milestone complete
    if (focusId && next.length === subTasks.length && !completedMilestones.includes(focusId)) {
      onToggle(focusId);
    }
  };

  const eligible = useMemo(
    () =>
      milestones
        .filter(m => !m.completed)
        .sort((a, b) => {
          const order = { critical: 0, high: 1, recommended: 2 };
          return order[a.priority] - order[b.priority];
        })
        .slice(0, 12),
    [milestones]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      {...hoverLift}
      className="card-elevated rounded-2xl p-5 border-l-4 border-l-accent"
    >
      <div className="flex items-start justify-between gap-3 mb-1">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-accent" />
          <h3 className="font-semibold text-foreground text-sm">This Month's Focus</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-[11px] gap-1"
            onClick={() => setPickerOpen(true)}
          >
            Choose
          </Button>
          <Button
            size="sm"
            className="h-7 text-[11px] gap-1 btn-accent"
            onClick={handlePickForMe}
          >
            <Wand2 className="h-3 w-3" />
            Pick for me
          </Button>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground mb-4">
        One realistic goal for the next 30 days. We'll break it into weekly steps so you don't have to.
      </p>

      <AnimatePresence mode="wait">
        {focusMilestone ? (
          <motion.div
            key={focusMilestone.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-3"
          >
            <div className="p-3 rounded-lg bg-accent/5 border border-accent/20">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap mb-1">
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 capitalize">
                      {focusMilestone.category.replace("_", " ")}
                    </Badge>
                    {focusMilestone.priority === "critical" && (
                      <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4">Critical</Badge>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-foreground leading-snug">
                    {focusMilestone.title}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={subProgress} className="h-1.5 flex-1" />
                <span className="text-[10px] font-bold text-accent">{subProgress}%</span>
              </div>
            </div>

            <div className="space-y-1.5">
              {subTasks.map((s, i) => {
                const done = subDone.includes(s.id);
                return (
                  <motion.button
                    key={s.id}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    {...hoverNudge}
                    onClick={() => toggleSub(s.id)}
                    className="w-full flex items-start gap-2.5 p-2.5 rounded-lg bg-card border border-border/50 hover:border-accent/40 transition-colors text-left group"
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      {done ? (
                        <CheckCircle2 className="h-4 w-4 text-accent" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-medium ${done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        {s.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{s.dueRel}</p>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 rounded-lg border border-dashed border-border text-center"
          >
            <Target className="h-5 w-5 text-accent mx-auto mb-2" />
            <p className="text-xs text-muted-foreground mb-3">
              Pick a monthly focus and we'll do the planning for you.
            </p>
            <Button size="sm" className="btn-accent text-xs h-8" onClick={handlePickForMe}>
              <Wand2 className="mr-1.5 h-3 w-3" />
              Pick the best focus for me
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Picker dialog */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Choose your monthly focus</DialogTitle>
            <DialogDescription>
              Pick one goal to commit to for the next 30 days. We'll break it down into weekly steps.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 max-h-[55vh] overflow-y-auto pr-1">
            {eligible.map(m => (
              <button
                key={m.id}
                onClick={() => handleManualPick(m)}
                className="w-full text-left p-3 rounded-lg border border-border/60 hover:border-accent hover:bg-accent/5 transition-all group"
              >
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 capitalize">
                    {m.category.replace("_", " ")}
                  </Badge>
                  {m.priority === "critical" && (
                    <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4">Critical</Badge>
                  )}
                  {m.priority === "high" && (
                    <Badge className="text-[9px] px-1.5 py-0 h-4 bg-accent/15 text-accent border-accent/30">High</Badge>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-foreground">{m.title}</p>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-accent transition-colors flex-shrink-0" />
                </div>
              </button>
            ))}
            {eligible.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">
                No eligible focuses available — you've completed everything in this phase!
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
