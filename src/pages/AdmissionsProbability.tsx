import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, } from "recharts";
import {
  TrendingUp, TrendingDown, Target, GraduationCap, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Zap, FileText, BookOpen, Award, Users, AlertCircle, Loader2, Sparkles, History, Trash2, Pencil, Check, X as XIcon, ArrowRight, ArrowLeft, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useDraftPersistence } from "@/hooks/useDraftPersistence";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { CollegeLogo } from "@/components/CollegeLogo";
import { AnimatedCounter } from "@/components/animations/AnimatedCounter";
import { fadeUp, staggerParent } from "@/lib/motion";
import { useToast } from "@/hooks/use-toast";
import { notifyCreditConsumed } from "@/hooks/useCredits";
import { useAdmissionsData, type AdmissionsFormData, defaultFormData } from "@/hooks/useAdmissionsData";
import { useOutcomesData } from "@/hooks/useOutcomesData";
import {
  GPA_SYSTEMS, defaultGpaSystem, psatVersionForGrade, getCurriculumConfig, CURRICULUM_ORDER,
  type GpaSystem,
} from "@/lib/curriculumSubjects";
import { SubjectGradeList } from "@/components/admissions/SubjectGradeList";
import { TestScoreInput } from "@/components/admissions/TestScoreInput";
import { Seo } from "@/components/Seo";

interface AdmissionsProbabilityResult {
  collegeName: string;
  collegeId: string;
  probability: number;
  tier: string;
  strengths: string[];
  weaknesses: string[];
  improvements: { action: string; impact: string; priority: 'high' | 'medium' | 'low' }[];
  breakdown: {
    academic: number; testScores: number; apExams: number; extracurriculars: number;
    academicRigor: number; classRank: number; majorFit: number; timeline: number;
  };
  summary?: string;
}

const extracurricularLevelOptions = [
  { value: "national", label: "National/International Recognition" },
  { value: "state", label: "State Level Recognition" },
  { value: "regional", label: "Regional Recognition" },
  { value: "local", label: "Local/School Level" },
  { value: "beginner", label: "Beginner/Limited" },
];

/**
 * Where a probability sits *for the tier it was computed against*.
 *
 * The page previously called anything under 15% a reach school and coloured
 * bars at flat 30/15 cuts, which was wrong in both directions: 15% at a
 * university that admits 4% of applicants is an unusually strong position,
 * and 15% at a regional university that admits 60% is a crisis. The same
 * number cannot mean the same thing at both.
 *
 * The cuts below are set against the acceptance-rate bands this product's
 * model is calibrated to and states in its own prompt — roughly 3–7% for the
 * most selective globals, 10–40% national, 30–75% regional. `likely` sits
 * comfortably above the published rate for the tier, `competitive` sits around
 * it, and everything under is a reach.
 */
const TIER_STANDING: Record<string, { likely: number; competitive: number }> = {
  global: { likely: 15, competitive: 7 },
  national: { likely: 35, competitive: 18 },
  regional: { likely: 55, competitive: 32 },
};

type Standing = 'likely' | 'competitive' | 'reach';

function standingFor(probability: number, tier: string): Standing {
  const band = TIER_STANDING[tier] ?? TIER_STANDING.national;
  if (probability >= band.likely) return 'likely';
  if (probability >= band.competitive) return 'competitive';
  return 'reach';
}

const STANDING_LABEL: Record<Standing, string> = {
  likely: 'Likely',
  competitive: 'Competitive',
  reach: 'Reach',
};

const STEPS = [
  { id: 1, title: "Academic Information", icon: BookOpen, desc: "Curriculum, GPA, subjects & rigor" },
  { id: 2, title: "Test Scores", icon: Award, desc: "SAT, ACT, PSAT — all optional" },
  { id: 3, title: "Activities & Achievements", icon: Users, desc: "Self-reported + verified proofs" },
  { id: 4, title: "Review & Analyze", icon: ShieldCheck, desc: "Confirm targets and run analysis" },
] as const;

export default function AdmissionsProbability() {
  const { onboardingData, user } = useAuth();
  const { profile: outcomesProfile } = useOutcomesData();
  const { toast } = useToast();
  const [results, setResults] = useState<AdmissionsProbabilityResult[]>([]);
  const [expandedCollege, setExpandedCollege] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [step, setStep] = useState(1);

  const { history, saveAnalysis, renameAnalysis, deleteAnalysis, isAuthenticated } = useAdmissionsData();
  const [formData, setFormData] = useState<AdmissionsFormData>(defaultFormData);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [verifiedProofs, setVerifiedProofs] = useState<{
    totalApproved: number;
    byCategory: Record<string, number>;
    titles: string[];
  }>({ totalApproved: 0, byCategory: {}, titles: [] });

  // Persist wizard state so users never lose progress on refresh / navigation
  useDraftPersistence(
    "admissions-probability",
    { formData, step },
    (saved) => {
      if (saved.formData) setFormData((prev) => ({ ...prev, ...saved.formData }));
      if (typeof saved.step === "number") setStep(saved.step);
    },
  );

  const curriculum = formData.curriculum || onboardingData?.curriculum || "US";
  const curriculumConfig = useMemo(() => getCurriculumConfig(curriculum), [curriculum]);
  const gpaConfig = GPA_SYSTEMS.find((s) => s.value === formData.gpaSystem)!;
  const psat = useMemo(() => psatVersionForGrade(onboardingData?.grade), [onboardingData?.grade]);

  // Pre-fill from onboarding. Everything the student already told onboarding
  // is filled in here; anything onboarding never asked for (grades, test
  // scores, class rank, extracurricular level) is left blank for them to
  // enter — pre-filling those would mean inventing data, not reusing it.
  useEffect(() => {
    if (!onboardingData) return;
    let gpaSystem: GpaSystem = defaultGpaSystem(onboardingData.curriculum);
    let gpaValue = onboardingData.gpa || "";
    if (onboardingData.gpa_range && onboardingData.gpa_range.includes(":")) {
      const [sys, val] = onboardingData.gpa_range.split(":");
      if (["gpa-4", "gpa-10", "percentage"].includes(sys)) gpaSystem = sys as GpaSystem;
      if (val) gpaValue = val;
    }
    // curriculum_programme (e.g. "IB-MYP") is the precise programme key onboarding's
    // subject-selection step wrote; the legacy `curriculum` column is only a free-text
    // board name ("IB") and is kept solely as the fallback for rows written before it existed.
    const programme = onboardingData.curriculum_programme;
    const curriculum =
      programme && (CURRICULUM_ORDER as string[]).includes(programme)
        ? programme
        : onboardingData.curriculum || "";
    setFormData((prev) => ({
      ...prev,
      curriculum: curriculum || prev.curriculum,
      gpaSystem,
      gpaValue: prev.gpaValue || gpaValue,
      // Names/levels are known from onboarding; grade is not — leave it blank for the student to fill.
      subjects: prev.subjects.length > 0
        ? prev.subjects
        : (onboardingData.subjects || []).map((s) => ({
            id: crypto.randomUUID(),
            subject: s.name,
            level: s.level,
            grade: "",
          })),
      psat: { ...prev.psat, outOf: psat.max },
    }));
  }, [onboardingData, psat.max]);

  // Fetch verified (approved) proof submissions for credibility multiplier
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("proof_submissions")
        .select("task_title, task_context, stage_id")
        .eq("user_id", user.id)
        .eq("status", "approved");
      if (cancelled || error || !data) return;
      const byCategory: Record<string, number> = {};
      const titles: string[] = [];
      for (const row of data) {
        const cat = (row.task_context || "general").toLowerCase();
        byCategory[cat] = (byCategory[cat] || 0) + 1;
        if (row.task_title) titles.push(row.task_title);
      }
      setVerifiedProofs({ totalApproved: data.length, byCategory, titles });
    })();
    return () => { cancelled = true; };
  }, [user]);

  const updateField = <K extends keyof AdmissionsFormData>(field: K, value: AdmissionsFormData[K]) => {
    setFormData((p) => ({ ...p, [field]: value }));
    setShowResults(false);
  };

  // Per-step validation
  const stepErrors = useMemo(() => {
    const e: Record<number, string[]> = { 1: [], 2: [], 3: [], 4: [] };
    // Step 1
    if (!formData.curriculum) e[1].push("Curriculum is required");
    if (!formData.gpaValue) e[1].push("GPA / percentage is required");
    else {
      const v = parseFloat(formData.gpaValue);
      if (isNaN(v) || v < gpaConfig.min || v > gpaConfig.max)
        e[1].push(`GPA must be between ${gpaConfig.min} and ${gpaConfig.max}`);
    }
    // Step 2 (optional, but validate ranges if taken)
    if (formData.sat.taken) {
      const s = parseFloat(formData.sat.score);
      if (!formData.sat.score || isNaN(s)) e[2].push("SAT score is required");
      else if (s > formData.sat.outOf) e[2].push("SAT score exceeds 1600");
      else if (s < 400) e[2].push("SAT minimum is 400");
    }
    if (formData.act.taken) {
      const s = parseFloat(formData.act.score);
      if (!formData.act.score || isNaN(s)) e[2].push("ACT score is required");
      else if (s > formData.act.outOf) e[2].push("ACT score exceeds 36");
      else if (s < 1) e[2].push("ACT minimum is 1");
    }
    if (formData.psat.taken) {
      const s = parseFloat(formData.psat.score);
      if (!formData.psat.score || isNaN(s)) e[2].push("PSAT score is required");
      else if (s > formData.psat.outOf) e[2].push(`PSAT score exceeds ${formData.psat.outOf}`);
    }
    // Step 3
    if (!formData.extracurricularLevel) e[3].push("Extracurricular level is required");
    // Step 4
    if (!onboardingData?.target_universities?.length) e[4].push("No target universities selected in your profile");
    return e;
  }, [formData, onboardingData, gpaConfig]);

  const allErrors = useMemo(
    () => [...stepErrors[1], ...stepErrors[2], ...stepErrors[3], ...stepErrors[4]],
    [stepErrors],
  );
  const isFormValid = allErrors.length === 0;
  const stepValid = stepErrors[step].length === 0;

  const loadFromHistory = (entry: typeof history[0]) => {
    setFormData(entry.form_data);
    setResults(entry.analysis_results);
    setShowResults(true);
    setStep(4);
  };

  const handleCalculate = async () => {
    if (!isFormValid || !onboardingData) return;
    setAnalyzing(true);
    setShowResults(false);
    try {
      const outcomesEvidence = outcomesProfile
        ? {
            courses: outcomesProfile.courses?.length || 0,
            projects: (outcomesProfile.projects || []).map((p: any) => ({
              title: p.title, evidence: p.evidence, hours: p.hours,
            })),
            leadership: (outcomesProfile.leadershipRoles || []).map((l: any) => ({
              role: l.role, organization: l.organization, evidence: l.evidence,
            })),
            competitions: (outcomesProfile.competitions || []).map((c: any) => ({
              name: c.name, level: c.level, placement: c.placement,
            })),
          }
        : null;

      const { data, error } = await supabase.functions.invoke('analyze-admissions', {
        body: {
          gpaSystem: formData.gpaSystem,
          gpaValue: formData.gpaValue,
          curriculum: formData.curriculum,
          subjects: formData.subjects,
          grade: onboardingData.grade,
          applicationYear: onboardingData.application_year,
          satScore: formData.sat.taken ? formData.sat.score : null,
          actScore: formData.act.taken ? formData.act.score : null,
          psatScore: formData.psat.taken ? formData.psat.score : null,
          psatVersion: formData.psat.taken ? psat.version : null,
          apCourseCount: parseInt(formData.apCourseCount) || 0,
          honorsCourseCount: parseInt(formData.honorsCourseCount) || 0,
          classRank: formData.classRank ? parseInt(formData.classRank) : null,
          classSize: formData.classSize ? parseInt(formData.classSize) : null,
          intendedMajor: onboardingData.intended_major,
          extracurricularLevel: formData.extracurricularLevel,
          outcomesEvidence,
          verifiedProofs,
          targetUniversities: onboardingData.target_universities || [],
          country: onboardingData.country,
        },
      });

      if (error) throw error;
      if (data?.error) {
        toast({ variant: "destructive", title: "Analysis failed", description: data.error });
        return;
      }
      if (data?.results) {
        setResults(data.results);
        setShowResults(true);
        notifyCreditConsumed();
        if (isAuthenticated) saveAnalysis(formData, data.results);
      }
    } catch (err: any) {
      console.error("Admissions analysis error:", err);
      toast({ variant: "destructive", title: "Analysis failed", description: err.message || "Could not analyze. Please try again." });
    } finally {
      setAnalyzing(false);
    }
  };

  const chartData = results.map((r) => ({
    name: r.collegeName.length > 20 ? r.collegeName.substring(0, 18) + '...' : r.collegeName,
    fullName: r.collegeName,
    probability: r.probability,
    tier: r.tier,
  }));

  const getBarColor = (p: number, tier: string) => {
    const s = standingFor(p, tier);
    return s === 'likely' ? 'hsl(var(--chart-2))' : s === 'competitive' ? 'hsl(var(--chart-4))' : 'hsl(var(--chart-1))';
  };
  const getTierBadgeVariant = (tier: string): "default" | "secondary" | "destructive" | "outline" =>
    tier === 'global' ? 'destructive' : tier === 'national' ? 'default' : tier === 'regional' ? 'secondary' : 'outline';
  const getPriorityColor = (p: 'high' | 'medium' | 'low') =>
    p === 'high' ? 'text-destructive' : p === 'medium' ? 'text-amber-500' : 'text-muted-foreground';

  if (!onboardingData) {
    return (
      <div className="py-8 sm:py-12">
        <div className="section-container max-w-6xl">
          <Card>
            <CardContent className="py-12 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto text-amber-500 mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">Profile Data Required</h2>
              <p className="text-muted-foreground">Complete your profile to access the admissions probability calculator.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const pct = Math.round(((step - 1) / (STEPS.length - 1)) * 100);

  return (
    <div className="py-8 sm:py-12">
      <Seo title='Admissions Probability — Pathforge' description='Get a calibrated AI estimate of your chances at top universities, grounded in your real profile.' path='/admissions-probability' />
      <div className="section-container max-w-6xl">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-accent/10 p-2.5">
                <GraduationCap className="h-7 w-7 text-accent" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground tracking-tight">Admissions Probability</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Guided 4-step analysis · Verified proofs boost credibility
                </p>
              </div>
            </div>
            {isAuthenticated && (
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <History className="h-4 w-4" />
                    History ({history.length})
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader><SheetTitle>Analysis History</SheetTitle></SheetHeader>
                  <div className="mt-4 space-y-3 overflow-y-auto max-h-[calc(100dvh-120px)]">
                    {history.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No saved analyses yet. Run an analysis to save it automatically.
                      </p>
                    ) : (
                      history.map((entry) => (
                        <Card key={entry.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              {renamingId === entry.id ? (
                                <div className="flex items-center gap-1 flex-1 mr-2">
                                  <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} className="h-7 text-sm" autoFocus />
                                  <Button size="icon" variant="ghost" className="h-10 w-10 sm:h-8 sm:w-8" onClick={() => { renameAnalysis(entry.id, renameValue); setRenamingId(null); }} aria-label="Save name">
                                    <Check className="h-3 w-3" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-10 w-10 sm:h-8 sm:w-8" onClick={() => setRenamingId(null)} aria-label="Cancel rename">
                                    <XIcon className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <span className="font-medium text-sm text-foreground">{entry.name}</span>
                              )}
                              <div className="flex items-center gap-1">
                                <Button size="icon" variant="ghost" className="h-10 w-10 sm:h-8 sm:w-8" onClick={(e) => { e.stopPropagation(); setRenamingId(entry.id); setRenameValue(entry.name); }} aria-label="Rename analysis">
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-10 w-10 text-destructive sm:h-8 sm:w-8" onClick={(e) => { e.stopPropagation(); deleteAnalysis(entry.id); }} aria-label="Delete analysis">
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">
                              {new Date(entry.created_at).toLocaleDateString()} · {entry.analysis_results.length} universities
                            </p>
                            <Button size="sm" variant="secondary" className="w-full" onClick={() => loadFromHistory(entry)}>Load Analysis</Button>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            )}
          </div>

          {/* Stepper */}
          <Card className="border-border/60">
            <CardContent className="py-5">
              <div className="flex items-center justify-between gap-2 mb-4">
                {STEPS.map((s, i) => {
                  const Icon = s.icon;
                  const completed = step > s.id;
                  const active = step === s.id;
                  return (
                    <motion.div
                      key={s.id}
                      className="flex items-center flex-1 min-w-0"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + i * 0.08, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <motion.button
                        type="button"
                        onClick={() => setStep(s.id)}
                        className={cn(
                          "flex items-center gap-2 sm:gap-3 group transition-all min-w-0",
                          "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg p-1",
                        )}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        <motion.div
                          className={cn(
                            "flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border-2 transition-all shrink-0",
                            completed && "bg-accent border-accent text-accent-foreground",
                            active && "border-accent bg-accent/10 text-accent ring-4 ring-accent/15",
                            !completed && !active && "border-border bg-muted text-muted-foreground",
                          )}
                          animate={active ? { scale: [1, 1.08, 1] } : {}}
                          transition={{ duration: 0.4 }}
                        >
                          <AnimatePresence mode="wait">
                            {completed ? (
                              <motion.div
                                key="check"
                                initial={{ scale: 0, rotate: -90 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                              >
                                <Check className="h-4 w-4" />
                              </motion.div>
                            ) : (
                              <motion.div
                                key="icon"
                                initial={{ scale: 0.8 }}
                                animate={{ scale: 1 }}
                              >
                                <Icon className="h-4 w-4" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                        <div className="text-left hidden sm:block min-w-0">
                          <p className={cn(
                            "text-xs font-semibold uppercase tracking-wider truncate",
                            active ? "text-accent" : completed ? "text-foreground" : "text-muted-foreground",
                          )}>Step {s.id}</p>
                          <p className={cn(
                            "text-sm font-medium truncate",
                            active || completed ? "text-foreground" : "text-muted-foreground",
                          )}>{s.title}</p>
                        </div>
                      </motion.button>
                      {i < STEPS.length - 1 && (
                        <motion.div
                          className={cn(
                            "h-0.5 flex-1 mx-2 sm:mx-3",
                            step > s.id ? "bg-accent" : "bg-border",
                          )}
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          transition={{ delay: 0.2 + i * 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                          style={{ transformOrigin: 'left' }}
                        />
                      )}
                    </motion.div>
                  );
                })}
              </div>
              <Progress value={pct} className="h-1.5" />
            </CardContent>
          </Card>
        </motion.div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  {(() => {
                    const Icon = STEPS[step - 1].icon;
                    return <Icon className="h-5 w-5 text-accent" />;
                  })()}
                  {STEPS[step - 1].title}
                </CardTitle>
                <p className="text-sm text-muted-foreground">{STEPS[step - 1].desc}</p>
              </CardHeader>
              <CardContent className="space-y-6">

                {/* ─── STEP 1: Academic Info ─── */}
                {step === 1 && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Curriculum *</Label>
                        <Select value={formData.curriculum} onValueChange={(v) => updateField("curriculum", v)}>
                          <SelectTrigger><SelectValue placeholder="Select curriculum" /></SelectTrigger>
                          <SelectContent>
                            {/* Driven off the shared order so this page and
                                onboarding always offer the same programmes and
                                write the same keys. */}
                            {CURRICULUM_ORDER.map((c) => (
                              <SelectItem key={c} value={c}>{getCurriculumConfig(c).label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>GPA / Percentage *</Label>
                        {/* Stacked until there is room: the fixed 140px value
                            field left the system select ~92px, narrower than
                            its own option text. */}
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_140px]">
                          <Select value={formData.gpaSystem} onValueChange={(v) => { updateField("gpaSystem", v as GpaSystem); updateField("gpaValue", ""); }}>
                            <SelectTrigger className="min-w-0"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {GPA_SYSTEMS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <div className="relative">
                            <Input
                              type="number" inputMode="decimal"
                              min={gpaConfig.min} max={gpaConfig.max} step={gpaConfig.step}
                              value={formData.gpaValue}
                              onChange={(e) => updateField("gpaValue", e.target.value)}
                              className={gpaConfig.suffix ? "pr-7" : ""}
                              placeholder={`${gpaConfig.min}–${gpaConfig.max}`}
                            />
                            {gpaConfig.suffix && (
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">{gpaConfig.suffix}</span>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Scale: {gpaConfig.min}–{gpaConfig.max}
                          {curriculumConfig.key.startsWith("IB-") && " · IB diploma is graded 0–45 (use percentage equivalent)"}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-lg border border-border bg-muted/20 p-4">
                      <SubjectGradeList
                        curriculum={formData.curriculum || "US"}
                        entries={formData.subjects}
                        onChange={(s) => updateField("subjects", s)}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>AP / IB Courses Taken</Label>
                        <Input type="number" inputMode="numeric" min="0" max="30"
                          value={formData.apCourseCount}
                          onChange={(e) => updateField("apCourseCount", e.target.value)}
                          placeholder="0" />
                      </div>
                      <div className="space-y-2">
                        <Label>Honors Courses</Label>
                        <Input type="number" inputMode="numeric" min="0" max="30"
                          value={formData.honorsCourseCount}
                          onChange={(e) => updateField("honorsCourseCount", e.target.value)}
                          placeholder="0" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Class Rank (optional)</Label>
                        <Input type="number" inputMode="numeric" min="1"
                          value={formData.classRank}
                          onChange={(e) => updateField("classRank", e.target.value)}
                          placeholder="e.g. 15" />
                      </div>
                      <div className="space-y-2">
                        <Label>Total Class Size</Label>
                        <Input type="number" inputMode="numeric" min="1"
                          value={formData.classSize}
                          onChange={(e) => updateField("classSize", e.target.value)}
                          placeholder="e.g. 400" />
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── STEP 2: Test Scores ─── */}
                {step === 2 && (
                  <div className="space-y-4">
                    <div className="rounded-lg bg-accent/5 border border-accent/20 p-3">
                      <p className="text-xs text-foreground">
                        All tests optional. Scores are validated against their max — invalid entries are blocked.
                      </p>
                    </div>
                    <TestScoreInput label="SAT" value={formData.sat} onChange={(v) => updateField("sat", v)} defaultOutOf={1600} minScore={400} />
                    <TestScoreInput label="ACT" value={formData.act} onChange={(v) => updateField("act", v)} defaultOutOf={36} minScore={1} />
                    <TestScoreInput
                      label={`PSAT (${psat.version})`}
                      helper={`PSAT version is auto-set from your grade (${onboardingData.grade}). Max ${psat.max}.`}
                      value={{ ...formData.psat, outOf: psat.max }}
                      onChange={(v) => updateField("psat", { ...v, outOf: psat.max })}
                      defaultOutOf={psat.max}
                      minScore={320}
                    />
                  </div>
                )}

                {/* ─── STEP 3: Activities & Achievements ─── */}
                {step === 3 && (
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label>Highest Level of Achievement *</Label>
                      <Select value={formData.extracurricularLevel} onValueChange={(v) => updateField("extracurricularLevel", v)}>
                        <SelectTrigger><SelectValue placeholder="Select achievement level" /></SelectTrigger>
                        <SelectContent>
                          {extracurricularLevelOptions.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="rounded-lg border border-accent/20 bg-accent/5 p-4">
                      <div className="flex items-start gap-3">
                        <FileText className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-foreground mb-1">Outcomes Evidence</p>
                          {outcomesProfile ? (
                            <p className="text-xs text-muted-foreground">
                              {(outcomesProfile.projects?.length || 0)} projects · {(outcomesProfile.leadershipRoles?.length || 0)} leadership · {(outcomesProfile.competitions?.length || 0)} competitions tracked. The AI factors these in automatically.
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground">No Outcomes data yet — visit the Outcomes page to log activities.</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className={cn(
                      "rounded-lg border p-4",
                      verifiedProofs.totalApproved > 0
                        ? "border-emerald-500/30 bg-emerald-500/5"
                        : "border-amber-500/30 bg-amber-500/5",
                    )}>
                      <div className="flex items-start gap-3">
                        <ShieldCheck className={cn(
                          "h-5 w-5 shrink-0 mt-0.5",
                          verifiedProofs.totalApproved > 0 ? "text-emerald-500" : "text-amber-500",
                        )} />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-foreground mb-1">
                            Verified Proofs · {verifiedProofs.totalApproved} approved
                          </p>
                          {verifiedProofs.totalApproved > 0 ? (
                            <>
                              {/* Was stated as an exact "2× weighting, up to +6
                                  percentage points". Those figures are prompt
                                  guidance to a language model, not arithmetic
                                  the app performs, so they cannot be promised
                                  to the student as a number. */}
                              <p className="text-xs text-muted-foreground mb-2">
                                Verified achievements carry materially more weight than self-reported ones, and a profile with none is discounted for credibility.
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {Object.entries(verifiedProofs.byCategory).map(([k, v]) => (
                                  <Badge key={k} variant="secondary" className="text-[10px]">{k}: {v}</Badge>
                                ))}
                              </div>
                            </>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              No verified proofs yet. Upload certificates in the Journey page to earn a credibility boost.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── STEP 4: Review & Analyze ─── */}
                {step === 4 && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="rounded-lg border border-border p-3">
                        <p className="text-xs text-muted-foreground mb-1">Curriculum / GPA</p>
                        <p className="font-medium text-foreground">
                          {curriculumConfig.label} · {formData.gpaValue || "—"}{gpaConfig.suffix || ""}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border p-3">
                        <p className="text-xs text-muted-foreground mb-1">Course Rigor</p>
                        <p className="font-medium text-foreground">
                          {formData.apCourseCount || 0} AP/IB · {formData.honorsCourseCount || 0} Honors
                        </p>
                      </div>
                      <div className="rounded-lg border border-border p-3">
                        <p className="text-xs text-muted-foreground mb-1">Test Scores</p>
                        <p className="font-medium text-foreground">
                          {[
                            formData.sat.taken && `SAT ${formData.sat.score}`,
                            formData.act.taken && `ACT ${formData.act.score}`,
                            formData.psat.taken && `PSAT ${formData.psat.score}`,
                          ].filter(Boolean).join(" · ") || "None reported"}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border p-3">
                        <p className="text-xs text-muted-foreground mb-1">Verified Proofs</p>
                        <p className="font-medium text-foreground">{verifiedProofs.totalApproved} approved</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <Target className="h-4 w-4 text-accent" />
                        Target Universities (from profile)
                      </h3>
                      {onboardingData.target_universities?.length ? (
                        <div className="flex flex-wrap gap-2">
                          {onboardingData.target_universities.map((uni) => (
                            <Badge key={uni} variant="secondary">{uni}</Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-destructive">No target universities selected. Update in your profile.</p>
                      )}
                    </div>

                    {allErrors.length > 0 && (
                      <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                        <h4 className="text-sm font-medium text-destructive flex items-center gap-2 mb-2">
                          <AlertCircle className="h-4 w-4" />
                          Fix before analyzing
                        </h4>
                        <ul className="text-sm text-destructive/80 space-y-1">
                          {allErrors.map((e, i) => <li key={i}>• {e}</li>)}
                        </ul>
                      </div>
                    )}

                    <Button onClick={handleCalculate} disabled={!isFormValid || analyzing} className="w-full btn-accent" size="lg">
                      {analyzing ? (
                        <><Loader2 className="mr-2 h-5 w-5 animate-spin" />AI is analyzing your profile...</>
                      ) : (
                        <><Sparkles className="mr-2 h-5 w-5" />Analyze with AI</>
                      )}
                    </Button>
                  </div>
                )}

                {/* Step-level inline errors */}
                {step < 4 && stepErrors[step].length > 0 && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <ul className="text-xs text-destructive/90 space-y-0.5">
                      {stepErrors[step].map((e, i) => <li key={i}>• {e}</li>)}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Wizard nav */}
            <div className="flex items-center justify-between gap-3 mb-8">
              <Button
                variant="outline"
                onClick={() => setStep((s) => Math.max(1, s - 1))}
                disabled={step === 1}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <p className="text-xs text-muted-foreground">
                Step {step} of {STEPS.length}
              </p>
              {step < STEPS.length && (
                <Button
                  onClick={() => setStep((s) => Math.min(STEPS.length, s + 1))}
                  disabled={!stepValid}
                  className="gap-2 btn-accent"
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
              {step === STEPS.length && <div className="w-[88px]" />}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Results */}
        {showResults && results.length > 0 && (
          <>
            <motion.div
              variants={staggerParent}
              custom={0.06}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
            >
              <motion.div variants={fadeUp}><Card><CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Highest Chance</p>
                    <p className="text-2xl font-bold text-foreground tabular-nums">
                      <AnimatedCounter target={results[0]?.probability || 0} suffix="%" duration={1.2} />
                    </p>
                    <p className="text-xs text-muted-foreground truncate max-w-[150px]">{results[0]?.collegeName || '-'}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-chart-2" />
                </div>
              </CardContent></Card></motion.div>
              <motion.div variants={fadeUp}><Card><CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    {/* Was "Average Chance" — the mean of a 4% global and a 70%
                        regional is a number with no referent. A count of how
                        many schools you are competitive at is the question that
                        card was standing in for. */}
                    <p className="text-sm text-muted-foreground">Competitive or better</p>
                    <p className="text-2xl font-bold text-foreground tabular-nums">
                      <AnimatedCounter
                        target={results.filter(r => standingFor(r.probability, r.tier) !== 'reach').length}
                        duration={1.2}
                      />
                    </p>
                    <p className="text-xs text-muted-foreground">Of {results.length} universities</p>
                  </div>
                  <Target className="h-8 w-8 text-accent" />
                </div>
              </CardContent></Card></motion.div>
              <motion.div variants={fadeUp}><Card><CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Reach Schools</p>
                    <p className="text-2xl font-bold text-foreground tabular-nums">
                      <AnimatedCounter
                        target={results.filter(r => standingFor(r.probability, r.tier) === 'reach').length}
                        duration={1}
                      />
                    </p>
                    {/* Counted against each school's own tier, not a flat 15%. */}
                    <p className="text-xs text-muted-foreground">Below this tier's competitive band</p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-destructive" />
                </div>
              </CardContent></Card></motion.div>
            </motion.div>

            <motion.div variants={fadeUp} initial="hidden" animate="visible">
              <Card className="mb-8">
                <CardHeader><CardTitle>Probability Comparison</CardTitle></CardHeader>
                {/* interval={0} forces every college label to render, so at
                    320px they overlapped into an unreadable smear with no way
                    to scroll. Give the chart a floor and let the card scroll. */}
                <CardContent className="overflow-x-auto">
                  <div className="h-[280px] min-w-[520px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 10, bottom: 50, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="name" angle={-25} textAnchor="end" interval={0} className="text-xs" />
                        <YAxis className="text-xs" domain={[0, 100]} unit="%" />
                        <Tooltip
                          formatter={(value: any) => [`${value}%`, 'Probability']}
                          labelFormatter={(label, items) => (items[0]?.payload as any)?.fullName || label}
                          contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                        />
                        <Bar dataKey="probability" radius={[6, 6, 0, 0]}>
                          {chartData.map((d, i) => <Cell key={i} fill={getBarColor(d.probability, d.tier)} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  {/*
                   * Provenance. These figures come from a language model reading
                   * the profile against published acceptance-rate bands, not
                   * from a closed-form formula, so two runs of the same profile
                   * can differ by a point or two. Presenting them without saying
                   * so implies a precision the method does not have.
                   */}
                  <p className="mt-4 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
                    These are model estimates read against each university's published acceptance
                    band — not a guarantee, and not a percentile among applicants. Re-running the
                    same profile can move a figure by a point or two. Treat the ordering as the
                    signal, not the decimal.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              variants={staggerParent}
              custom={0.06}
              initial="hidden"
              animate="visible"
              className="space-y-4"
            >
              {results.map((r, i) => (
                <motion.div key={r.collegeId} variants={fadeUp}>
                <Collapsible open={expandedCollege === r.collegeId} onOpenChange={(o) => setExpandedCollege(o ? r.collegeId : null)}>
                  <Card>
                    <CollapsibleTrigger className="w-full text-left">
                      <CardHeader>
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-muted-foreground">#{i + 1}</span>
                            <CollegeLogo name={r.collegeName} size={22} />
                            <CardTitle className="text-base">{r.collegeName}</CardTitle>
                            <Badge variant={getTierBadgeVariant(r.tier)}>{r.tier}</Badge>
                          </div>
                          <div className="flex items-center gap-3">
                            {/* The percentage alone is unreadable without the
                                tier it was computed against. */}
                            <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                              {STANDING_LABEL[standingFor(r.probability, r.tier)]}
                            </Badge>
                            <span className="text-xl font-bold text-foreground tabular-nums">
                              <AnimatedCounter target={r.probability} suffix="%" duration={1} />
                            </span>
                            {expandedCollege === r.collegeId ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </div>
                        </div>
                        <Progress value={r.probability} className="h-1.5 mt-2" />
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="space-y-4 pt-0">
                        {r.summary && <p className="text-sm text-muted-foreground italic">"{r.summary}"</p>}
                        {r.strengths?.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-1.5"><CheckCircle2 className="h-4 w-4 text-chart-2" />Strengths</h4>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              {r.strengths.map((s, j) => <li key={j}>• {s}</li>)}
                            </ul>
                          </div>
                        )}
                        {r.weaknesses?.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-1.5"><AlertTriangle className="h-4 w-4 text-amber-500" />Gaps</h4>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              {r.weaknesses.map((s, j) => <li key={j}>• {s}</li>)}
                            </ul>
                          </div>
                        )}
                        {r.improvements?.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-1.5"><Zap className="h-4 w-4 text-accent" />Improvements</h4>
                            <div className="space-y-2">
                              {r.improvements.map((imp, j) => (
                                <div key={j} className="text-sm border-l-2 border-accent/30 pl-3">
                                  <p className="text-foreground font-medium">{imp.action}</p>
                                  <p className="text-xs text-muted-foreground">{imp.impact}</p>
                                  {/* This ranks what to do first — not a
                                    decorative label, so not 10px. */}
                                <span className={`text-xs uppercase font-bold ${getPriorityColor(imp.priority)}`}>{imp.priority} priority</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
                </motion.div>
              ))}
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
