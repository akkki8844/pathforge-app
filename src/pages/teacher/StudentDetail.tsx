import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, MessageSquare, Trophy, BookOpen, FileDown } from "lucide-react";
import { TeacherLayout } from "@/components/teacher/TeacherLayout";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useTeacherFeedback } from "@/hooks/useTeacherFeedback";
import { useCounsellorRoadmap } from "@/hooks/useCounsellorRoadmap";
import { useAuth } from "@/contexts/AuthContext";
import { computeInsight } from "@/lib/counsellorInsights";
import { StudentStrategyView } from "@/components/teacher/StudentStrategyView";
import { AppStrategyTracker } from "@/components/teacher/AppStrategyTracker";
import { ProfileOptimizationPanel } from "@/components/teacher/ProfileOptimizationPanel";
import { StudentAnalytics } from "@/components/teacher/StudentAnalytics";
import { PrivateNotesPanel } from "@/components/teacher/PrivateNotesPanel";
import { InteractionTimelinePanel } from "@/components/teacher/InteractionTimelinePanel";
import { CounsellorOverridePanel } from "@/components/teacher/CounsellorOverridePanel";
import { StudentDeepDive } from "@/components/teacher/StudentDeepDive";


interface StudentSnapshot {
  email: string | null;
  username: string | null;
  grade: string | null;
  intended_major: string | null;
  high_school_name: string | null;
  country: string | null;
  curriculum: string | null;
  gpa: string | null;
  application_year: string | null;
  target_universities: string[] | null;
  standardized_test_score: string | null;
}

interface JourneyScores {
  overall_score: number;
  academics_score: number;
  activities_score: number;
  leadership_score: number;
  competitions_score: number;
  test_prep_score: number;
}

interface OutcomesData {
  courses: unknown[];
  projects: unknown[];
  leadership_roles: unknown[];
  competitions: unknown[];
}

export default function StudentDetail() {
  const { studentId, id: idParam } = useParams<{ studentId?: string; id?: string }>();
  const id = studentId ?? idParam;
  const { toast } = useToast();
  const [snap, setSnap] = useState<StudentSnapshot | null>(null);
  const [scores, setScores] = useState<JourneyScores | null>(null);
  const [outcomes, setOutcomes] = useState<OutcomesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedbackBody, setFeedbackBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { items: feedback, create } = useTeacherFeedback(id);
  const { roadmap } = useCounsellorRoadmap(id);
  const { user, teacherProfile } = useAuth();

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: ob }, { data: pr }, { data: sc }, { data: oc }] = await Promise.all([
        supabase.from("onboarding_data")
          .select("grade,intended_major,high_school_name,country,curriculum,gpa,application_year,target_universities,standardized_test_score")
          .eq("user_id", id).maybeSingle(),
        supabase.from("profiles").select("email,username").eq("user_id", id).maybeSingle(),
        supabase.from("journey_scores")
          .select("overall_score,academics_score,activities_score,leadership_score,competitions_score,test_prep_score")
          .eq("user_id", id).maybeSingle(),
        supabase.from("outcomes_data")
          .select("courses,projects,leadership_roles,competitions")
          .eq("user_id", id).maybeSingle(),
      ]);
      if (cancelled) return;
      setSnap({
        email: pr?.email ?? null,
        username: pr?.username ?? null,
        grade: ob?.grade ?? null,
        intended_major: ob?.intended_major ?? null,
        high_school_name: ob?.high_school_name ?? null,
        country: ob?.country ?? null,
        curriculum: ob?.curriculum ?? null,
        gpa: ob?.gpa ?? null,
        application_year: ob?.application_year ?? null,
        target_universities: ob?.target_universities ?? null,
        standardized_test_score: ob?.standardized_test_score ?? null,
      });
      setScores(sc as JourneyScores | null);
      setOutcomes(oc as OutcomesData | null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id]);

  const sendFeedback = async () => {
    if (!id || feedbackBody.trim().length < 4) return;
    setSubmitting(true);
    const { error } = await create({
      student_id: id,
      subject_type: "general",
      subject_ref: null,
      body: feedbackBody.trim(),
      rating: null,
    });
    setSubmitting(false);
    if (error) {
      toast({ variant: "destructive", title: "Could not save", description: error.message });
    } else {
      setFeedbackBody("");
      toast({ title: "Note sent to student" });
    }
  };

  const insight = useMemo(
    () =>
      computeInsight({
        scores,
        outcomes,
        onboarding: snap
          ? {
              grade: snap.grade,
              intended_major: snap.intended_major,
              standardized_test_score: snap.standardized_test_score,
              target_universities: snap.target_universities,
            }
          : null,
      }),
    [scores, outcomes, snap],
  );

  const initials = (snap?.username || snap?.email || "S").slice(0, 2).toUpperCase();

  return (
    <TeacherLayout>
      <Link
        to="/teacher"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-3 w-3" /> Back to roster
      </Link>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading student…</div>
      ) : !snap ? (
        <div className="text-sm text-muted-foreground">
          Student not found or you don't have access.
        </div>
      ) : (
        <div className="space-y-8">
          {/* Premium hero */}
          <header className="rounded-3xl border border-border/60 bg-gradient-to-br from-card via-card to-muted/30 overflow-hidden">
            <div className="p-6 lg:p-8 flex flex-col lg:flex-row gap-6 lg:items-end lg:justify-between">
              <div className="flex items-start gap-5 min-w-0">
                <div className="h-16 w-16 lg:h-20 lg:w-20 rounded-2xl bg-gradient-to-br from-primary/20 via-accent/15 to-transparent border border-border/60 flex items-center justify-center flex-shrink-0 text-2xl font-semibold text-foreground tracking-tight">
                  {initials}
                </div>
                <div className="min-w-0 space-y-1.5">
                  <div className="text-[11px] font-medium tracking-[0.18em] uppercase text-muted-foreground">
                    Student profile
                  </div>
                  <h1 className="text-[1.875rem] lg:text-[2.25rem] font-semibold tracking-tight text-foreground truncate leading-[1.05]">
                    {snap.username || snap.email || "Student"}
                  </h1>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                    <span className="text-foreground font-medium">
                      {snap.intended_major || "Major TBD"}
                    </span>
                    <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                    <span>Grade {snap.grade ?? "?"}</span>
                    {snap.curriculum && (
                      <>
                        <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                        <span>{snap.curriculum}</span>
                      </>
                    )}
                  </div>
                  {(snap.high_school_name || snap.country) && (
                    <p className="text-xs text-muted-foreground">
                      {[snap.high_school_name, snap.country].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-start lg:items-end gap-3">
                <PriorityBadge priority={insight.priority} />
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                    Profile score
                  </span>
                  <span className="text-2xl font-semibold tabular-nums text-foreground">
                    {insight.profileScore}
                  </span>
                  <span className="text-xs text-muted-foreground">/100</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    if (!snap || !id) return;
                    const { downloadStudentReport } = await import("@/lib/counsellorReport");
                    downloadStudentReport({
                      studentName: snap.username || snap.email || "Student",
                      studentEmail: snap.email,
                      grade: snap.grade,
                      major: snap.intended_major,
                      curriculum: snap.curriculum,
                      highSchool: snap.high_school_name,
                      country: snap.country,
                      counsellorName:
                        teacherProfile?.title || user?.email || "Counsellor",
                      profileScore: insight.profileScore,
                      scores: {
                        academics: scores?.academics_score ?? 0,
                        activities: scores?.activities_score ?? 0,
                        leadership: scores?.leadership_score ?? 0,
                        competitions: scores?.competitions_score ?? 0,
                        testPrep: scores?.test_prep_score ?? 0,
                      },
                      strengths: insight.strengths,
                      weaknesses: insight.weaknesses,
                      missing: insight.missing,
                      recommendations: insight.suggestions,
                      monthlyFocus: roadmap?.monthly_focus ?? null,
                      longTermPlan: roadmap?.long_term_plan ?? null,
                      focusAreas: roadmap?.focus_areas ?? [],
                      targetUniversities: snap.target_universities ?? [],
                      outcomes: {
                        courses: (outcomes?.courses ?? []).length,
                        projects: (outcomes?.projects ?? []).length,
                        leadershipRoles: (outcomes?.leadership_roles ?? []).length,
                        competitions: (outcomes?.competitions ?? []).length,
                      },
                    });
                    toast({ title: "Report downloaded" });
                  }}
                >
                  <FileDown className="h-3.5 w-3.5 mr-1.5" />
                  Export PDF report
                </Button>
              </div>
            </div>
          </header>

          <Tabs defaultValue="strategy">
            {/* Grouped tab strip — quiet sectioning instead of one giant row */}
            <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
              <TabsList className="flex flex-wrap h-auto gap-0 p-1.5 bg-transparent w-full justify-start">
                {[
                  { v: "strategy", l: "Strategy", group: "primary" },
                  { v: "deepdive", l: "Deep dive", group: "primary" },
                  { v: "analytics", l: "Analytics", group: "primary" },
                  { v: "overrides", l: "Overrides", group: "actions" },
                  { v: "notes-private", l: "Private notes", group: "actions" },
                  { v: "notes", l: "Notes to student", group: "actions" },
                  { v: "timeline", l: "Timeline", group: "actions" },
                  { v: "optimize", l: "Optimization", group: "data" },
                  { v: "applications", l: "Applications", group: "data" },
                  { v: "journey", l: "Journey", group: "data" },
                  { v: "academics", l: "Academics", group: "data" },
                  { v: "activities", l: "Activities", group: "data" },
                ].map((t) => (
                  <TabsTrigger
                    key={t.v}
                    value={t.v}
                    className="text-xs px-3.5 py-1.5 rounded-md data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:shadow-none text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t.l}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <TabsContent value="strategy" className="mt-4">
              <StudentStrategyView
                studentId={id!}
                insight={insight}
                academicSummary={{
                  gpa: snap.gpa,
                  curriculum: snap.curriculum,
                  intendedMajor: snap.intended_major,
                  targetUniversities: snap.target_universities,
                }}
                ecSummary={{
                  projects: (outcomes?.projects ?? []).length,
                  leadershipRoles: (outcomes?.leadership_roles ?? []).length,
                  competitions: (outcomes?.competitions ?? []).length,
                  courses: (outcomes?.courses ?? []).length,
                }}
                scoreBreakdown={
                  scores
                    ? {
                        academics: scores.academics_score ?? 0,
                        activities: scores.activities_score ?? 0,
                        leadership: scores.leadership_score ?? 0,
                        competitions: scores.competitions_score ?? 0,
                        testPrep: scores.test_prep_score ?? 0,
                      }
                    : null
                }
              />
            </TabsContent>

            <TabsContent value="deepdive" className="mt-4">
              <StudentDeepDive studentId={id!} />
            </TabsContent>

            <TabsContent value="analytics" className="mt-4">
              <StudentAnalytics
                scores={scores}
                outcomes={{
                  courses: (outcomes?.courses ?? []).length,
                  projects: (outcomes?.projects ?? []).length,
                  leadership_roles: (outcomes?.leadership_roles ?? []).length,
                  competitions: (outcomes?.competitions ?? []).length,
                }}
              />
            </TabsContent>

            <TabsContent value="overrides" className="mt-4">
              <CounsellorOverridePanel studentId={id!} />
            </TabsContent>

            <TabsContent value="notes-private" className="mt-4">
              <PrivateNotesPanel studentId={id!} />
            </TabsContent>

            <TabsContent value="timeline" className="mt-4">
              <InteractionTimelinePanel studentId={id!} />
            </TabsContent>

            <TabsContent value="optimize" className="mt-4">
              <ProfileOptimizationPanel
                insight={insight}
                dimensions={[
                  { label: "Academics", value: scores?.academics_score ?? 0 },
                  { label: "Activities", value: scores?.activities_score ?? 0 },
                  { label: "Leadership", value: scores?.leadership_score ?? 0 },
                  { label: "Competitions", value: scores?.competitions_score ?? 0 },
                  { label: "Test prep", value: scores?.test_prep_score ?? 0 },
                ]}
              />
            </TabsContent>

            <TabsContent value="applications" className="mt-4">
              <AppStrategyTracker studentId={id!} />
            </TabsContent>

            <TabsContent value="journey" className="space-y-3 mt-4">
              {scores ? (
                <div className="card-elevated p-5 space-y-3">
                  <ScoreBar label="Overall" v={scores.overall_score} />
                  <ScoreBar label="Academics" v={scores.academics_score} />
                  <ScoreBar label="Activities" v={scores.activities_score} />
                  <ScoreBar label="Leadership" v={scores.leadership_score} />
                  <ScoreBar label="Competitions" v={scores.competitions_score} />
                  <ScoreBar label="Test prep" v={scores.test_prep_score} />
                </div>
              ) : <p className="text-sm text-muted-foreground">No journey data yet.</p>}
            </TabsContent>

            <TabsContent value="academics" className="space-y-3 mt-4">
              <div className="card-elevated p-5 space-y-2 text-sm">
                <Row icon={BookOpen} label="GPA" value={snap.gpa ?? "—"} />
                <Row icon={BookOpen} label="Curriculum" value={snap.curriculum ?? "—"} />
                <Row icon={Trophy} label="Application year" value={snap.application_year ?? "—"} />
                <Row icon={Trophy} label="Target universities" value={(snap.target_universities ?? []).join(", ") || "—"} />
              </div>
            </TabsContent>

            <TabsContent value="activities" className="space-y-3 mt-4">
              <div className="card-elevated p-5 space-y-2 text-sm">
                <Row icon={Trophy} label="Courses" value={String((outcomes?.courses ?? []).length)} />
                <Row icon={Trophy} label="Projects" value={String((outcomes?.projects ?? []).length)} />
                <Row icon={Trophy} label="Leadership roles" value={String((outcomes?.leadership_roles ?? []).length)} />
                <Row icon={Trophy} label="Competitions" value={String((outcomes?.competitions ?? []).length)} />
              </div>
            </TabsContent>

            <TabsContent value="notes" className="space-y-3 mt-4">
              <div className="card-elevated p-5 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Send a note to this student</p>
                <Textarea value={feedbackBody} onChange={(e) => setFeedbackBody(e.target.value)} placeholder="Share guidance, suggestions, or encouragement…" rows={4} maxLength={2000} />
                <div className="flex justify-end">
                  <Button size="sm" onClick={sendFeedback} disabled={submitting || feedbackBody.trim().length < 4}>
                    {submitting ? "Sending…" : "Send"}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                {feedback.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No notes sent to this student yet.</p>
                ) : feedback.map((f) => (
                  <div key={f.id} className="card-elevated p-3 text-sm">
                    <div className="text-xs text-muted-foreground mb-1">{new Date(f.created_at).toLocaleString()} • {f.subject_type}</div>
                    <p className="text-foreground whitespace-pre-wrap">{f.body}</p>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </TeacherLayout>
  );
}

function ScoreBar({ label, v }: { label: string; v: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-muted-foreground mb-1">
        <span>{label}</span><span>{v}/100</span>
      </div>
      <Progress value={v} className="h-1.5" />
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
      <div className="flex-1">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-foreground">{value}</div>
      </div>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: "high_priority" | "needs_attention" | "on_track" }) {
  if (priority === "high_priority")
    return <Badge variant="destructive" className="flex-shrink-0">High priority</Badge>;
  if (priority === "needs_attention")
    return <Badge variant="secondary" className="flex-shrink-0">Needs attention</Badge>;
  return <Badge variant="secondary" className="bg-accent/10 text-accent flex-shrink-0">On track</Badge>;
}
