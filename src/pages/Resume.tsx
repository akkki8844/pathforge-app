import { useEffect, useMemo, useRef, useState } from "react";
// Lazy-load the serif family only on this route (used inside the resume card).
if (typeof window !== "undefined") {
  import("@fontsource/instrument-serif/400.css");
  import("@fontsource/instrument-serif/400-italic.css");
}
import { motion, AnimatePresence } from "framer-motion";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import {
  Sparkles, GraduationCap, Briefcase, Trophy, Award, BookOpen, Wrench, FlaskConical, FolderGit2, Plus, Trash2, Download, Loader2, ArrowRight, ArrowLeft, Check, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { ResumeOutput } from "@/lib/resumeExport";
import { notifyCreditConsumed, useCredits } from "@/hooks/useCredits";
import { planTierFromString, tierSatisfies } from "@/lib/plans";
import { AiGenerationNotice } from "@/components/AiGenerationNotice";
import { useAiGenerationGuard } from "@/hooks/useAiGenerationGuard";
import { Seo } from "@/components/Seo";

/* ─────────────────────────────────────────────────────────────────────
   Types
   ────────────────────────────────────────────────────────────────── */
interface ExperienceItem { role: string; organization: string; location: string; startDate: string; endDate: string; description: string; }
interface ActivityItem { role: string; organization: string; startDate: string; endDate: string; description: string; }
interface ProjectItem { name: string; tech: string; link: string; description: string; }
interface ResearchItem { title: string; advisor: string; organization: string; startDate: string; endDate: string; description: string; }
interface HonorItem { title: string; level: string; year: string; description: string; }
interface CertItem { name: string; issuer: string; year: string; }

const STEPS = ["Target", "Header", "Education", "Experience & Activities", "Bonus", "Honors & Skills", "Generate"] as const;

/* ─────────────────────────────────────────────────────────────────────
   Page
   ────────────────────────────────────────────────────────────────── */
export default function Resume() {
  const { user, onboardingData } = useAuth();
  const [step, setStep] = useState(0);

  // ── Major-aware question hints (drives placeholders + summary cue) ──
  const majorEmphasis = useMemo(() => {
    const m = (onboardingData?.intended_major || "").toLowerCase();
    if (/(business|economic|finance|management|marketing|entrepreneur|account)/.test(m))
      return {
        label: "Business / Economics",
        summary: "e.g., Aspiring economics major leading school's investment club, building data-backed market research projects.",
        activityHint: "Led 12-person committee; raised $4,500 sponsorship; ran 6 events with 200+ attendees",
        projectHint: "Built 3-month market analysis on EV sector; modeled cash flow in Excel; presented to local founders",
        coachLine: "Highlight initiatives you led, entrepreneurship, finance / strategy work, DECA / FBLA / Model UN.",
      };
    if (/(computer|software|engineer|robot|data|ai|machine learning|\bcs\b|tech|math|physics|chem|bio|stem|science)/.test(m))
      return {
        label: "STEM",
        summary: "e.g., Aspiring CS major shipping ML tools used by 1k+ peers; 2x national olympiad finalist.",
        activityHint: "Captained 8-person robotics team to state finals; mentored 15 juniors in Python",
        projectHint: "Built React + FastAPI study planner used by 600 students; cut planning time 40%",
        coachLine: "Highlight research, projects, technical tools / languages, olympiads (USACO, IOI, IMO, science fairs).",
      };
    if (/(english|history|philosophy|political|government|literature|writing|journal|art|humanit|liberal|language|classic)/.test(m))
      return {
        label: "Humanities",
        summary: "e.g., Aspiring humanities major: published essayist, varsity debater, founder of school literary magazine.",
        activityHint: "Editor-in-Chief of school journal (12 issues, 2,400+ readers); coordinated 9 contributors",
        projectHint: "Wrote 8,000-word research paper on post-colonial literature; presented at state symposium",
        coachLine: "Highlight writing, publications, debate, MUN, languages, qualitative / archival research.",
      };
    if (/(med|pre-?med|nursing|health|public health|biomed|neuro)/.test(m))
      return {
        label: "Pre-Med / Health",
        summary: "e.g., Aspiring pre-med: 200+ clinical hours, lab assistant, founder of school health-equity club.",
        activityHint: "Logged 220 hours volunteering at city hospital; trained 6 new volunteers on intake protocol",
        projectHint: "Conducted independent project on antibiotic resistance; ran 30 plate assays; wrote 5-page report",
        coachLine: "Highlight lab work, clinical / volunteer hours, research methods, certifications (CPR, BLS).",
      };
    return {
      label: "General",
      summary: "e.g., Aspiring undergraduate: top-decile academics, founder of school initiative, regional honors.",
      activityHint: "Led 10-person team to regional finals; organized 4 events with 150+ attendees",
      projectHint: "Built capstone project that reached 300 users; iterated on weekly user feedback",
      coachLine: "Highlight your strongest 2-3 areas (academics, leadership, projects, awards).",
    };
  }, [onboardingData?.intended_major]);

  // Target / framing — asked
  const [targetRole, setTargetRole] = useState("");
  const [summaryHint, setSummaryHint] = useState("");

  // Header — auto-prefilled, user can tweak
  const [header, setHeader] = useState({ name: "", email: "", phone: "", city: "", linkedin: "", website: "" });

  // Education — asked
  const [education, setEducation] = useState([{
    school: "", location: "", graduationDate: "", gpa: "", curriculum: "", classRank: "", courses: "",
    apCount: "", honorsCount: "",
  }]);

  // Experience & activities — asked
  const [experience, setExperience] = useState<ExperienceItem[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([
    { role: "", organization: "", startDate: "", endDate: "", description: "" },
  ]);

  // Bonus from outcomes — asked but optional
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [research, setResearch] = useState<ResearchItem[]>([]);

  // Honors / certs / skills — asked
  const [honors, setHonors] = useState<HonorItem[]>([{ title: "", level: "", year: "", description: "" }]);
  const [certifications, setCertifications] = useState<CertItem[]>([]);
  const [coursework, setCoursework] = useState("");
  const [skillsTech, setSkillsTech] = useState("");
  const [skillsLang, setSkillsLang] = useState("");
  const [skillsInterests, setSkillsInterests] = useState("");

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [output, setOutput] = useState<ResumeOutput | null>(null);
  useAiGenerationGuard(generating, "Resume generation");

  // Auto-save draft to localStorage so users never lose work on refresh/navigation
  const draftKey = user ? `pf:resume-draft:${user.id}` : null;
  const [draftHydrated, setDraftHydrated] = useState(false);

  /* ── Restore draft from localStorage (runs once per user) ── */
  useEffect(() => {
    if (!draftKey) return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const d = JSON.parse(raw);
        if (d.targetRole) setTargetRole(d.targetRole);
        if (d.summaryHint) setSummaryHint(d.summaryHint);
        if (d.header) setHeader(d.header);
        if (d.education) setEducation(d.education);
        if (d.experience) setExperience(d.experience);
        if (d.activities) setActivities(d.activities);
        if (d.projects) setProjects(d.projects);
        if (d.research) setResearch(d.research);
        if (d.honors) setHonors(d.honors);
        if (d.certifications) setCertifications(d.certifications);
        if (typeof d.coursework === "string") setCoursework(d.coursework);
        if (typeof d.skillsTech === "string") setSkillsTech(d.skillsTech);
        if (typeof d.skillsLang === "string") setSkillsLang(d.skillsLang);
        if (typeof d.skillsInterests === "string") setSkillsInterests(d.skillsInterests);
        if (typeof d.step === "number") setStep(d.step);
        if (d.output) setOutput(d.output);
      }
    } catch (e) {
      console.warn("[Resume] failed to restore draft", e);
    }
    setDraftHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  /* ── Persist draft on every change (debounced microtask) ── */
  useEffect(() => {
    if (!draftKey || !draftHydrated) return;
    const payload = {
      targetRole, summaryHint, header, education, experience, activities,
      projects, research, honors, certifications, coursework,
      skillsTech, skillsLang, skillsInterests, step, output,
    };
    try {
      localStorage.setItem(draftKey, JSON.stringify(payload));
    } catch {
      /* quota or private mode — silent */
    }
  }, [
    draftKey, draftHydrated, targetRole, summaryHint, header, education,
    experience, activities, projects, research, honors, certifications,
    coursework, skillsTech, skillsLang, skillsInterests, step, output,
  ]);

  /* ── Auto-prefill from onboarding + outcomes (basic only, never overrides user input) ── */
  useEffect(() => {
    if (!draftHydrated) return;
    (async () => {
      if (!user) return;
      // profile
      const { data: pData } = await supabase
        .from("profiles").select("username, email").eq("user_id", user.id).maybeSingle();
      if (pData) {
        setHeader((h) => ({
          ...h,
          name: h.name || pData.username || (pData.email?.split("@")[0] ?? ""),
          email: h.email || pData.email || "",
        }));
      }
      // onboarding
      if (onboardingData) {
        setHeader((h) => ({ ...h, city: h.city || onboardingData.country || "" }));
        setEducation((eds) => {
          const e = eds[0];
          return [{
            ...e,
            school: e.school || onboardingData.high_school_name || "",
            curriculum: e.curriculum || onboardingData.curriculum || "",
            gpa: e.gpa || onboardingData.gpa || onboardingData.gpa_range || "",
          }];
        });
        setTargetRole((t) => t || `Undergraduate Admission — ${onboardingData.intended_major || "Undergraduate Studies"}`);
      }
      // outcomes (projects, leadership, research)
      const { data: outcomes } = await supabase
        .from("outcomes_data")
        .select("projects, leadership_roles, competitions, courses")
        .eq("user_id", user.id).maybeSingle();
      if (outcomes) {
        const oProjects = (outcomes.projects as any[]) || [];
        if (oProjects.length && projects.length === 0) {
          setProjects(oProjects.slice(0, 4).map((p: any) => ({
            name: p.title || p.name || "",
            tech: p.skills || p.tech || "",
            link: p.link || "",
            description: p.description || p.outcome || "",
          })));
        }
        const oLeadership = (outcomes.leadership_roles as any[]) || [];
        if (oLeadership.length && activities.every((a) => !a.role && !a.organization)) {
          setActivities(oLeadership.slice(0, 5).map((l: any) => ({
            role: l.role || l.title || "",
            organization: l.organization || l.org || "",
            startDate: l.startDate || "",
            endDate: l.endDate || "",
            description: l.description || l.impact || "",
          })));
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, onboardingData, draftHydrated]);

  /* ── Helpers ── */
  const upd = <T,>(arr: T[], i: number, patch: Partial<T>) => arr.map((x, idx) => (idx === i ? { ...x, ...patch } : x));
  const remove = <T,>(arr: T[], i: number) => arr.filter((_, idx) => idx !== i);

  /* ── Validation ── */
  const validateStep = (s: number): string | null => {
    if (s === 0 && !targetRole.trim()) return "Tell us what this resume is for.";
    if (s === 1) {
      if (!header.name.trim()) return "Add your full name.";
      if (!header.email.trim()) return "Add an email.";
    }
    if (s === 2) {
      const e = education[0];
      if (!e.school.trim()) return "Add your high school name.";
      if (!e.graduationDate.trim()) return "Add your expected graduation (e.g., May 2026).";
    }
    if (s === 3) {
      const filledAct = activities.filter((a) => a.role.trim() && a.organization.trim());
      if (filledAct.length < 1) return "Add at least 1 activity (with role + organization).";
    }
    if (s === 5) {
      const filledHonors = honors.filter((h) => h.title.trim());
      if (filledHonors.length < 1) return "Add at least 1 honor or remove all and continue with a clear note.";
    }
    return null;
  };

  const next = () => {
    const err = validateStep(step);
    if (err) { toast.error(err); return; }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const back = () => setStep((s) => Math.max(s - 1, 0));

  /* ── Generate ── */
  const handleGenerate = async () => {
    for (let s = 0; s < STEPS.length - 1; s++) {
      const err = validateStep(s);
      if (err) { toast.error(`Step ${s + 1}: ${err}`); setStep(s); return; }
    }
    setGenerating(true);
    setProgress(8);
    const tick = setInterval(() => setProgress((p) => Math.min(p + Math.random() * 8, 92)), 900);

    try {
      const payload = {
        targetRole,
        intendedMajor: onboardingData?.intended_major || "",
        summaryHint,
        header,
        education: education.filter((e) => e.school.trim()),
        experience: experience.filter((x) => x.role.trim() && x.organization.trim()).map((x) => ({
          ...x, bullets: splitBullets(x.description),
        })),
        activities: activities.filter((a) => a.role.trim() && a.organization.trim()).map((a) => ({
          ...a, bullets: splitBullets(a.description),
        })),
        projects: projects.filter((p) => p.name.trim()).map((p) => ({
          ...p, bullets: splitBullets(p.description),
        })),
        research: research.filter((r) => r.title.trim()).map((r) => ({
          ...r, bullets: splitBullets(r.description),
        })),
        honors: honors.filter((h) => h.title.trim()),
        certifications: certifications.filter((c) => c.name.trim()),
        coursework: coursework.split(",").map((s) => s.trim()).filter(Boolean),
        skills: {
          technical: skillsTech.split(",").map((s) => s.trim()).filter(Boolean),
          languages: skillsLang.split(",").map((s) => s.trim()).filter(Boolean),
          interests: skillsInterests.split(",").map((s) => s.trim()).filter(Boolean),
        },
      };

      const { data, error } = await supabase.functions.invoke("generate-resume", { body: payload });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setOutput(data as ResumeOutput);
      setProgress(100);
      notifyCreditConsumed();
      toast.success("Your resume is ready");
    } catch (e: any) {
      const msg = e?.message || "Generation failed";
      if (msg.includes("credit")) toast.error("Daily credit limit reached. Please upgrade your plan.");
      else if (msg.toLowerCase().includes("rate")) toast.error("Rate limited. Try again in a moment.");
      else toast.error(msg);
    } finally {
      clearInterval(tick);
      setTimeout(() => setGenerating(false), 400);
    }
  };

  const downloadPDF = async () => {
    if (!output) return;
    const { exportResumePDF } = await import("@/lib/resumeExport");
    exportResumePDF(output);
    toast.success("Resume PDF downloaded");
  };

  /* ─────────────────────────────────────────────────────────────────
     Output view
     ────────────────────────────────────────────────────────────── */
  if (output) {
    return (
      <div className="container mx-auto max-w-4xl p-6">
        <Seo title="Resume Builder | Pathforge" description="Build a polished, ATS-friendly one-page resume for college applications — auto-filled from your profile, you confirm and refine." path="/resume" />
        <ScrollReveal className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <Badge variant="secondary" className="mb-2">{targetRole}</Badge>
            <h1 className="text-3xl font-bold tracking-tight">Your one-page resume</h1>
            <p className="text-muted-foreground mt-1">ATS-friendly, classic format. Edit by re-running the wizard or download as PDF.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setOutput(null); setStep(0); if (draftKey) localStorage.removeItem(draftKey); }}>Start over</Button>
            <Button onClick={downloadPDF} className="gap-2"><Download className="h-4 w-4" /> Download PDF</Button>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.08}>
          <ResumePreview r={output} />
        </ScrollReveal>
      </div>
    );
  }

  /* ─────────────────────────────────────────────────────────────────
     Generating overlay
     ────────────────────────────────────────────────────────────── */
  if (generating) {
    return (
      <div className="container mx-auto max-w-2xl p-6">
        <Seo title="Resume Builder | Pathforge" description="Build a polished, ATS-friendly one-page resume for college applications — auto-filled from your profile, you confirm and refine." path="/resume" />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <Card className="p-10 text-center">
            <motion.div
              className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 mb-5"
              animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <FileText className="h-7 w-7 text-accent" />
            </motion.div>
            <h2 className="text-2xl font-bold mb-2">Building your resume…</h2>
            <p className="text-muted-foreground mb-6 text-sm">
              Polishing every bullet, tightening to one page, formatting for ATS. ~30–60 seconds.
            </p>
            <AiGenerationNotice active className="mb-6 text-left" />
            <Progress value={progress} className="h-2 mb-4" />
            <AnimatePresence mode="wait">
              <motion.p
                key={progress < 30 ? 'a' : progress < 65 ? 'b' : progress < 95 ? 'c' : 'd'}
                className="text-xs text-muted-foreground"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                {progress < 30 && "Reading your profile…"}
                {progress >= 30 && progress < 65 && "Writing summary + experience bullets…"}
                {progress >= 65 && progress < 95 && "Tightening to one page…"}
                {progress >= 95 && "Finalizing…"}
              </motion.p>
            </AnimatePresence>
          </Card>
        </motion.div>
      </div>
    );
  }

  /* ─────────────────────────────────────────────────────────────────
     Wizard
     ────────────────────────────────────────────────────────────── */
  return (
    <div className="container mx-auto max-w-3xl p-6">
      <Seo title="Resume Builder | Pathforge" description="Build a polished, ATS-friendly one-page resume for college applications — auto-filled from your profile, you confirm and refine." path="/resume" />
      <ScrollReveal className="mb-6">
        <Badge variant="secondary" className="mb-2 gap-1.5"><FileText className="h-3 w-3" /> Resume Builder</Badge>
        <h1 className="text-3xl font-bold tracking-tight">Build a perfect one-page resume</h1>
        <p className="text-muted-foreground mt-1.5">Classic ATS format. We auto-fill what we know — you confirm and add the rest.</p>
      </ScrollReveal>

      {/* Build-from-LinkedIn — Pro/Enterprise only */}
      <LinkedInImportButton
        onPrefill={(patch) => {
          setHeader((h) => ({
            ...h,
            name: patch.name || h.name,
            linkedin: patch.linkedin || h.linkedin,
            city: patch.city || h.city,
          }));
          if (patch.education) {
            setEducation((eds) => {
              const e = eds[0] || { school: "", location: "", graduationDate: "", gpa: "", curriculum: "", classRank: "", courses: "", apCount: "", honorsCount: "" };
              return [{
                ...e,
                school: patch.education!.school || e.school,
                graduationDate: patch.education!.graduationDate || e.graduationDate,
                gpa: patch.education!.gpa || e.gpa,
              }, ...eds.slice(1)];
            });
          }
          if (patch.experience?.length) {
            setExperience((prev) => {
              const seen = new Set(prev.map((p) => (p.role + "|" + p.organization).toLowerCase().trim()));
              const merged = patch.experience!.filter((x) => !seen.has((x.role + "|" + x.organization).toLowerCase().trim()));
              return [...merged, ...prev];
            });
          }
          if (patch.activities?.length) {
            setActivities((prev) => {
              const filled = prev.filter((a) => a.role.trim() || a.organization.trim());
              const seen = new Set(filled.map((p) => (p.role + "|" + p.organization).toLowerCase().trim()));
              const merged = patch.activities!.filter((x) => !seen.has((x.role + "|" + x.organization).toLowerCase().trim()));
              return [...merged, ...filled];
            });
          }
          if (patch.projects?.length) {
            setProjects((prev) => {
              const seen = new Set(prev.map((p) => p.name.toLowerCase().trim()));
              const merged = patch.projects!.filter((x) => !seen.has(x.name.toLowerCase().trim()));
              return [...merged, ...prev];
            });
          }
          if (patch.research?.length) {
            setResearch((prev) => {
              const seen = new Set(prev.map((p) => p.title.toLowerCase().trim()));
              const merged = patch.research!.filter((x) => !seen.has(x.title.toLowerCase().trim()));
              return [...merged, ...prev];
            });
          }
          if (patch.honors?.length) {
            setHonors((prev) => {
              const filled = prev.filter((h) => h.title.trim());
              const seen = new Set(filled.map((p) => p.title.toLowerCase().trim()));
              const merged = patch.honors!.filter((x) => !seen.has(x.title.toLowerCase().trim()));
              return [...merged, ...filled];
            });
          }
          if (patch.certifications?.length) {
            setCertifications((prev) => {
              const seen = new Set(prev.map((p) => p.name.toLowerCase().trim()));
              const merged = patch.certifications!.filter((x) => !seen.has(x.name.toLowerCase().trim()));
              return [...merged, ...prev];
            });
          }
          if (patch.skillsTech) setSkillsTech((s) => (s.trim() ? s : patch.skillsTech!));
          if (patch.skillsLang) setSkillsLang((s) => (s.trim() ? s : patch.skillsLang!));
          toast.success("Resume autofilled from your LinkedIn — review every section below.");
        }}
      />


      {/* Stepper */}
      <motion.div
        className="flex items-center gap-2 mb-8 overflow-x-auto pb-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      >
        {STEPS.map((label, i) => (
          <motion.div
            key={label}
            className="flex items-center gap-2 flex-shrink-0"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 + i * 0.05, type: 'spring', stiffness: 300, damping: 20 }}
          >
            <motion.div
              className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold ${i === step ? "bg-accent text-accent-foreground" : i < step ? "bg-accent/20 text-accent" : "bg-muted text-muted-foreground"}`}
              animate={i === step ? { scale: [1, 1.12, 1] } : {}}
              transition={{ duration: 0.3 }}
            >
              {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </motion.div>
            <span className={`text-xs ${i === step ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{label}</span>
            {i < STEPS.length - 1 && <div className="w-4 h-px bg-border" />}
          </motion.div>
        ))}
      </motion.div>

      <Card className="p-6">
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.2 }}>

            {/* STEP 0 — Target */}
            {step === 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2"><FileText className="h-5 w-5 text-accent" /> What is this resume for?</h2>
                {onboardingData?.intended_major && (
                  <div className="rounded-md border bg-accent/5 p-3 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Tailored for {majorEmphasis.label}.</span> {majorEmphasis.coachLine}
                  </div>
                )}
                <Field label="Target role / context*">
                  <Input value={targetRole} onChange={(e) => setTargetRole(e.target.value)} placeholder="e.g., Undergraduate Admission — Computer Science (Top-20 US)" />
                </Field>
                <Field label="One-line summary hint (optional)">
                  <Input value={summaryHint} onChange={(e) => setSummaryHint(e.target.value)} placeholder={majorEmphasis.summary} />
                  <p className="text-xs text-muted-foreground mt-1">We'll polish this into your professional summary.</p>
                </Field>
              </div>
            )}

            {/* STEP 1 — Header */}
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2"><FileText className="h-5 w-5 text-accent" /> Contact information</h2>
                <p className="text-xs text-muted-foreground -mt-2">Auto-filled from your profile. Confirm or edit.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Full name*"><Input value={header.name} onChange={(e) => setHeader({ ...header, name: e.target.value })} /></Field>
                  <Field label="Email*"><Input type="email" value={header.email} onChange={(e) => setHeader({ ...header, email: e.target.value })} /></Field>
                  <Field label="Phone"><Input value={header.phone} onChange={(e) => setHeader({ ...header, phone: e.target.value })} placeholder="+1 555 123 4567" /></Field>
                  <Field label="City / Country"><Input value={header.city} onChange={(e) => setHeader({ ...header, city: e.target.value })} placeholder="Mumbai, India" /></Field>
                  <Field label="LinkedIn URL"><Input value={header.linkedin} onChange={(e) => setHeader({ ...header, linkedin: e.target.value })} placeholder="linkedin.com/in/yourname" /></Field>
                  <Field label="Portfolio / website"><Input value={header.website} onChange={(e) => setHeader({ ...header, website: e.target.value })} placeholder="yourname.com" /></Field>
                </div>
              </div>
            )}

            {/* STEP 2 — Education */}
            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2"><GraduationCap className="h-5 w-5 text-accent" /> Education</h2>
                {education.map((e, i) => (
                  <div key={i} className="space-y-3 rounded-lg border p-4 bg-card">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Field label="High school*"><Input value={e.school} onChange={(ev) => setEducation(upd(education, i, { school: ev.target.value }))} /></Field>
                      <Field label="Location"><Input value={e.location} onChange={(ev) => setEducation(upd(education, i, { location: ev.target.value }))} placeholder="City, Country" /></Field>
                      <Field label="Expected graduation*"><Input value={e.graduationDate} onChange={(ev) => setEducation(upd(education, i, { graduationDate: ev.target.value }))} placeholder="May 2026" /></Field>
                      <Field label="Curriculum"><Input value={e.curriculum} onChange={(ev) => setEducation(upd(education, i, { curriculum: ev.target.value }))} placeholder="IB / AP / A-Levels / CBSE" /></Field>
                      <Field label="GPA (or range)"><Input value={e.gpa} onChange={(ev) => setEducation(upd(education, i, { gpa: ev.target.value }))} placeholder="3.95 / 4.0" /></Field>
                      <Field label="Class rank"><Input value={e.classRank} onChange={(ev) => setEducation(upd(education, i, { classRank: ev.target.value }))} placeholder="Top 5%" /></Field>
                      <Field label="# AP / IB HL courses"><Input value={e.apCount} onChange={(ev) => setEducation(upd(education, i, { apCount: ev.target.value }))} placeholder="6" /></Field>
                      <Field label="# Honors courses"><Input value={e.honorsCount} onChange={(ev) => setEducation(upd(education, i, { honorsCount: ev.target.value }))} placeholder="4" /></Field>
                    </div>
                    <Field label="Relevant courses (comma-separated)">
                      <Input value={e.courses} onChange={(ev) => setEducation(upd(education, i, { courses: ev.target.value }))} placeholder="AP Calculus BC, AP Computer Science A, Linear Algebra…" />
                    </Field>
                  </div>
                ))}
              </div>
            )}

            {/* STEP 3 — Experience + Activities */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2 mb-3"><Briefcase className="h-5 w-5 text-accent" /> Work experience (internships, jobs)</h2>
                  {experience.length === 0 && <p className="text-xs text-muted-foreground mb-2">Optional — add if you've done internships or paid work.</p>}
                  {experience.map((x, i) => (
                    <ItemBox key={i} onRemove={() => setExperience(remove(experience, i))}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Field label="Role"><Input value={x.role} onChange={(ev) => setExperience(upd(experience, i, { role: ev.target.value }))} /></Field>
                        <Field label="Organization"><Input value={x.organization} onChange={(ev) => setExperience(upd(experience, i, { organization: ev.target.value }))} /></Field>
                        <Field label="Location"><Input value={x.location} onChange={(ev) => setExperience(upd(experience, i, { location: ev.target.value }))} /></Field>
                        <div className="grid grid-cols-2 gap-2">
                          <Field label="Start"><Input value={x.startDate} onChange={(ev) => setExperience(upd(experience, i, { startDate: ev.target.value }))} placeholder="Jun 2024" /></Field>
                          <Field label="End"><Input value={x.endDate} onChange={(ev) => setExperience(upd(experience, i, { endDate: ev.target.value }))} placeholder="Aug 2024 / Present" /></Field>
                        </div>
                      </div>
                      <Field label="What you did (one bullet per line)">
                        <Textarea rows={3} value={x.description} onChange={(ev) => setExperience(upd(experience, i, { description: ev.target.value }))} placeholder={"Built X feature shipped to 500 users\nAnalyzed Y dataset, cut runtime 40%"} />
                      </Field>
                    </ItemBox>
                  ))}
                  <AddButton onClick={() => setExperience([...experience, { role: "", organization: "", location: "", startDate: "", endDate: "", description: "" }])} label="Add experience" />
                </div>

                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2 mb-3"><Trophy className="h-5 w-5 text-accent" /> Activities & leadership*</h2>
                  {activities.map((a, i) => (
                    <ItemBox key={i} onRemove={() => setActivities(remove(activities, i))}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Field label="Role"><Input value={a.role} onChange={(ev) => setActivities(upd(activities, i, { role: ev.target.value }))} placeholder="President, Captain, Founder…" /></Field>
                        <Field label="Organization"><Input value={a.organization} onChange={(ev) => setActivities(upd(activities, i, { organization: ev.target.value }))} /></Field>
                        <div className="grid grid-cols-2 gap-2">
                          <Field label="Start"><Input value={a.startDate} onChange={(ev) => setActivities(upd(activities, i, { startDate: ev.target.value }))} placeholder="Aug 2023" /></Field>
                          <Field label="End"><Input value={a.endDate} onChange={(ev) => setActivities(upd(activities, i, { endDate: ev.target.value }))} placeholder="Present" /></Field>
                        </div>
                      </div>
                      <Field label="What you did (one bullet per line)">
                        <Textarea rows={3} value={a.description} onChange={(ev) => setActivities(upd(activities, i, { description: ev.target.value }))} placeholder={majorEmphasis.activityHint} />
                      </Field>
                    </ItemBox>
                  ))}
                  <AddButton onClick={() => setActivities([...activities, { role: "", organization: "", startDate: "", endDate: "", description: "" }])} label="Add activity" />
                </div>
              </div>
            )}

            {/* STEP 4 — Bonus (Projects + Research) */}
            {step === 4 && (
              <div className="space-y-6">
                <p className="text-xs text-muted-foreground -mt-1">Optional bonus sections. We auto-pulled from Outcomes if you've added items there.</p>

                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2 mb-3"><FolderGit2 className="h-5 w-5 text-accent" /> Projects</h2>
                  {projects.map((p, i) => (
                    <ItemBox key={i} onRemove={() => setProjects(remove(projects, i))}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Field label="Project name"><Input value={p.name} onChange={(ev) => setProjects(upd(projects, i, { name: ev.target.value }))} /></Field>
                        <Field label="Tech / tools"><Input value={p.tech} onChange={(ev) => setProjects(upd(projects, i, { tech: ev.target.value }))} placeholder="React, Python, TensorFlow" /></Field>
                        <Field label="Link (optional)"><Input value={p.link} onChange={(ev) => setProjects(upd(projects, i, { link: ev.target.value }))} placeholder="github.com/you/project" /></Field>
                      </div>
                      <Field label="Description (one bullet per line)">
                        <Textarea rows={3} value={p.description} onChange={(ev) => setProjects(upd(projects, i, { description: ev.target.value }))} placeholder={majorEmphasis.projectHint} />
                      </Field>
                    </ItemBox>
                  ))}
                  <AddButton onClick={() => setProjects([...projects, { name: "", tech: "", link: "", description: "" }])} label="Add project" />
                </div>

                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2 mb-3"><FlaskConical className="h-5 w-5 text-accent" /> Research / publications</h2>
                  {research.map((r, i) => (
                    <ItemBox key={i} onRemove={() => setResearch(remove(research, i))}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Field label="Title"><Input value={r.title} onChange={(ev) => setResearch(upd(research, i, { title: ev.target.value }))} /></Field>
                        <Field label="Advisor"><Input value={r.advisor} onChange={(ev) => setResearch(upd(research, i, { advisor: ev.target.value }))} /></Field>
                        <Field label="Organization / Lab"><Input value={r.organization} onChange={(ev) => setResearch(upd(research, i, { organization: ev.target.value }))} /></Field>
                        <div className="grid grid-cols-2 gap-2">
                          <Field label="Start"><Input value={r.startDate} onChange={(ev) => setResearch(upd(research, i, { startDate: ev.target.value }))} /></Field>
                          <Field label="End"><Input value={r.endDate} onChange={(ev) => setResearch(upd(research, i, { endDate: ev.target.value }))} /></Field>
                        </div>
                      </div>
                      <Field label="What you did / found (one bullet per line)">
                        <Textarea rows={3} value={r.description} onChange={(ev) => setResearch(upd(research, i, { description: ev.target.value }))} />
                      </Field>
                    </ItemBox>
                  ))}
                  <AddButton onClick={() => setResearch([...research, { title: "", advisor: "", organization: "", startDate: "", endDate: "", description: "" }])} label="Add research" />
                </div>
              </div>
            )}

            {/* STEP 5 — Honors / Certs / Coursework / Skills */}
            {step === 5 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2 mb-3"><Award className="h-5 w-5 text-accent" /> Honors & awards*</h2>
                  {honors.map((h, i) => (
                    <ItemBox key={i} onRemove={() => setHonors(remove(honors, i))}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Field label="Title*"><Input value={h.title} onChange={(ev) => setHonors(upd(honors, i, { title: ev.target.value }))} /></Field>
                        <Field label="Level"><Input value={h.level} onChange={(ev) => setHonors(upd(honors, i, { level: ev.target.value }))} placeholder="School / State / National / International" /></Field>
                        <Field label="Year"><Input value={h.year} onChange={(ev) => setHonors(upd(honors, i, { year: ev.target.value }))} placeholder="2025" /></Field>
                      </div>
                      <Field label="Brief description (optional)">
                        <Input value={h.description} onChange={(ev) => setHonors(upd(honors, i, { description: ev.target.value }))} />
                      </Field>
                    </ItemBox>
                  ))}
                  <AddButton onClick={() => setHonors([...honors, { title: "", level: "", year: "", description: "" }])} label="Add honor" />
                </div>

                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2 mb-3"><BookOpen className="h-5 w-5 text-accent" /> Certifications & coursework</h2>
                  {certifications.map((c, i) => (
                    <ItemBox key={i} onRemove={() => setCertifications(remove(certifications, i))}>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Field label="Certification"><Input value={c.name} onChange={(ev) => setCertifications(upd(certifications, i, { name: ev.target.value }))} /></Field>
                        <Field label="Issuer"><Input value={c.issuer} onChange={(ev) => setCertifications(upd(certifications, i, { issuer: ev.target.value }))} /></Field>
                        <Field label="Year"><Input value={c.year} onChange={(ev) => setCertifications(upd(certifications, i, { year: ev.target.value }))} /></Field>
                      </div>
                    </ItemBox>
                  ))}
                  <AddButton onClick={() => setCertifications([...certifications, { name: "", issuer: "", year: "" }])} label="Add certification" />

                  <div className="mt-4">
                    <Field label="Relevant coursework (comma-separated)">
                      <Textarea rows={2} value={coursework} onChange={(e) => setCoursework(e.target.value)} placeholder="AP Calculus BC, Multivariable Calculus, Data Structures, Linear Algebra" />
                    </Field>
                  </div>
                </div>

                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2 mb-3"><Wrench className="h-5 w-5 text-accent" /> Skills</h2>
                  <div className="space-y-3">
                    <Field label="Technical (comma-separated)">
                      <Input value={skillsTech} onChange={(e) => setSkillsTech(e.target.value)} placeholder="Python, JavaScript, SQL, Figma…" />
                    </Field>
                    <Field label="Languages (comma-separated)">
                      <Input value={skillsLang} onChange={(e) => setSkillsLang(e.target.value)} placeholder="English (native), Spanish (B2)" />
                    </Field>
                    <Field label="Interests (comma-separated)">
                      <Input value={skillsInterests} onChange={(e) => setSkillsInterests(e.target.value)} placeholder="Chess, Long-distance running, Astronomy" />
                    </Field>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 6 — Generate */}
            {step === 6 && (
              <div className="space-y-4 text-center py-6">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 mb-2">
                  <FileText className="h-7 w-7 text-accent" />
                </div>
                <h2 className="text-xl font-semibold">Ready to generate your resume</h2>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  We'll polish every bullet, write your summary, tighten to one page, and format it for ATS. Costs 1 credit.
                </p>
                <AiGenerationNotice className="mx-auto max-w-md text-left" />
                <Button onClick={handleGenerate} className="gap-2" size="lg">
                  <FileText className="h-4 w-4" /> Generate resume
                </Button>
              </div>
            )}

          </motion.div>
        </AnimatePresence>

        {step < STEPS.length - 1 && (
          <div className="flex justify-between mt-6 pt-6 border-t">
            <Button variant="outline" onClick={back} disabled={step === 0} className="gap-2"><ArrowLeft className="h-4 w-4" /> Back</Button>
            <Button onClick={next} className="gap-2">Next <ArrowRight className="h-4 w-4" /></Button>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   Helpers + small components
   ────────────────────────────────────────────────────────────────── */
function splitBullets(s: string): string[] {
  return s.split(/\n+/).map((x) => x.trim()).filter(Boolean);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function ItemBox({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <div className="rounded-lg border p-4 bg-card mb-3 space-y-3 relative">
      <Button size="icon" variant="ghost" onClick={onRemove} className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-destructive">
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
      {children}
    </div>
  );
}

function AddButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <Button variant="outline" size="sm" onClick={onClick} className="gap-2">
      <Plus className="h-3.5 w-3.5" /> {label}
    </Button>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   On-screen preview (matches PDF layout reasonably)
   ────────────────────────────────────────────────────────────────── */
function ResumePreview({ r }: { r: ResumeOutput }) {
  return (
    <Card className="p-10 bg-white text-zinc-900 shadow-sm font-serif">
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight">{r.header.name}</h2>
        <p className="text-xs mt-1 text-zinc-700">
          {[r.header.city, r.header.phone, r.header.email, r.header.linkedin, r.header.website].filter(Boolean).join("  •  ")}
        </p>
      </div>
      <div className="border-t border-zinc-900 my-3" />
      {r.summary && <p className="italic text-sm text-zinc-800 mb-4">{r.summary}</p>}

      <Section title="Education">
        {r.education.map((e, i) => (
          <div key={i} className="mb-2">
            <Row left={<b>{e.school}</b>} right={<i>{e.location || ""}</i>} />
            <p className="text-xs italic text-zinc-700">
              {[e.curriculum, e.graduationDate && `Grad: ${e.graduationDate}`, e.gpa && `GPA: ${e.gpa}`, e.classRank && `Rank: ${e.classRank}`].filter(Boolean).join("  •  ")}
            </p>
            {e.relevantCourses && <p className="text-sm">Relevant coursework: {e.relevantCourses}</p>}
          </div>
        ))}
      </Section>

      <ItemSection title="Experience" items={r.experience} render={(x) => (
        <>
          <Row left={<b>{x.role} — {x.organization}</b>} right={<i>{[x.startDate, x.endDate].filter(Boolean).join(" – ")}</i>} />
          {x.location && <p className="text-xs italic">{x.location}</p>}
          <Bullets bullets={x.bullets} />
        </>
      )} />

      <ItemSection title="Activities & Leadership" items={r.activities} render={(a) => (
        <>
          <Row left={<b>{a.role} — {a.organization}</b>} right={<i>{[a.startDate, a.endDate].filter(Boolean).join(" – ")}</i>} />
          <Bullets bullets={a.bullets} />
        </>
      )} />

      <ItemSection title="Projects" items={r.projects} render={(p) => (
        <>
          <Row left={<b>{p.name}</b>} right={<i>{p.link || ""}</i>} />
          {p.tech && <p className="text-xs italic">{p.tech}</p>}
          <Bullets bullets={p.bullets} />
        </>
      )} />

      <ItemSection title="Research & Publications" items={r.research} render={(rs) => (
        <>
          <Row left={<b>{rs.title}</b>} right={<i>{[rs.startDate, rs.endDate].filter(Boolean).join(" – ")}</i>} />
          <p className="text-xs italic">{[rs.advisor && `Advisor: ${rs.advisor}`, rs.organization].filter(Boolean).join("  •  ")}</p>
          <Bullets bullets={rs.bullets} />
        </>
      )} />

      <ItemSection title="Honors & Awards" items={r.honors} render={(h) => (
        <>
          <Row left={<b>{h.title}</b>} right={<i>{[h.level, h.year].filter(Boolean).join(" • ")}</i>} />
          {h.description && <p className="text-sm">{h.description}</p>}
        </>
      )} />

      <ItemSection title="Certifications" items={r.certifications} render={(c) => (
        <Row left={<b>{c.name}</b>} right={<i>{[c.issuer, c.year].filter(Boolean).join(" • ")}</i>} />
      )} />

      {r.coursework?.length ? (
        <Section title="Relevant Coursework"><p className="text-sm">{r.coursework.join(" • ")}</p></Section>
      ) : null}

      {(r.skills?.technical?.length || r.skills?.languages?.length || r.skills?.interests?.length) ? (
        <Section title="Skills & Interests">
          {r.skills?.technical?.length ? <p className="text-sm"><b>Technical:</b> {r.skills.technical.join(", ")}</p> : null}
          {r.skills?.languages?.length ? <p className="text-sm"><b>Languages:</b> {r.skills.languages.join(", ")}</p> : null}
          {r.skills?.interests?.length ? <p className="text-sm"><b>Interests:</b> {r.skills.interests.join(", ")}</p> : null}
        </Section>
      ) : null}
    </Card>
  );
}

/* ─────────────────────────────────────────────────────────────────
   LinkedIn import — Pro/Enterprise gated. Uploads the user's
   LinkedIn PDF export, parses it via pdfjs, sends the raw text to
   the linkedin-extract edge function (Gemini), and maps the strict
   structured response straight into every relevant resume field.
   ────────────────────────────────────────────────────────────── */
type LinkedInPatch = {
  linkedin?: string;
  name?: string;
  city?: string;
  experience?: ExperienceItem[];
  activities?: ActivityItem[];
  projects?: ProjectItem[];
  research?: ResearchItem[];
  honors?: HonorItem[];
  certifications?: CertItem[];
  education?: { school?: string; graduationDate?: string; gpa?: string };
  skillsTech?: string;
  skillsLang?: string;
};

async function parseLinkedInPdf(file: File): Promise<string> {
  const pdfjs: any = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url" as string)).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  let out = "";
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    out += content.items.map((it: any) => it.str).join(" ") + "\n\n";
  }
  return out.trim();
}

function LinkedInImportButton({ onPrefill }: { onPrefill: (patch: LinkedInPatch) => void }) {
  const { user } = useAuth();
  const { creditData } = useCredits();
  const plan = (creditData?.plan || "free").toLowerCase();
  const hasAccess = creditData?.isAdmin || tierSatisfies(planTierFromString(plan), "pro");

  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!f) return;
    if (!user) { toast.error("Please sign in first."); return; }
    if (f.type !== "application/pdf") {
      toast.error("Please upload a LinkedIn PDF (Profile → More → Save to PDF).");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error("Max file size is 10MB.");
      return;
    }

    setBusy(true);
    try {
      const text = await parseLinkedInPdf(f);
      if (text.replace(/\s+/g, " ").trim().length < 200) {
        toast.error("Could not read enough text from this PDF. Re-export from LinkedIn → More → Save to PDF.");
        return;
      }

      // Persist the raw import so other features can reuse it.
      await supabase.from("linkedin_imports").upsert(
        { user_id: user.id, linkedin_url: "https://www.linkedin.com/in/imported-from-pdf", profile_text: text.slice(0, 50000) },
        { onConflict: "user_id" },
      );

      const { data: res, error } = await supabase.functions.invoke("linkedin-extract", {
        body: { profile_text: text },
      });
      const errMsg = (res as any)?.error || error?.message;
      if (errMsg) { toast.error(errMsg); return; }
      const d = (res as any)?.data || {};

      // Map the strict AI response into resume fields — no heuristics, just direct field mapping.
      const patch: LinkedInPatch = {};

      // Header — name from "headline" line is risky; use first non-empty experience-adjacent line in raw text instead.
      const nameMatch = text.split(/\r?\n/).map((l) => l.trim()).find((l) => /^[A-Z][a-z]+(?:\s+[A-Z][a-z\-']+){1,3}$/.test(l) && l.length < 60);
      if (nameMatch) patch.name = nameMatch;

      const edu = Array.isArray(d.education) ? d.education[0] : null;
      if (edu) {
        patch.education = {
          school: edu.school || "",
          graduationDate: edu.end || "",
          gpa: edu.grade || "",
        };
      }

      patch.experience = (Array.isArray(d.experiences) ? d.experiences : [])
        .filter((e: any) => e?.title || e?.organization)
        .map((e: any) => ({
          role: String(e.title || "").slice(0, 200),
          organization: String(e.organization || "").slice(0, 200),
          location: "",
          startDate: String(e.start || "").slice(0, 50),
          endDate: String(e.end || "").slice(0, 50),
          description: String(e.description || "").slice(0, 1500),
        }));

      // Volunteering + leadership both flow into "activities".
      const leadership = (Array.isArray(d.leadership) ? d.leadership : []).map((l: any) => ({
        role: String(l.title || "").slice(0, 200),
        organization: String(l.organization || "").slice(0, 200),
        startDate: "",
        endDate: "",
        description: l.team_size ? `Led team of ${l.team_size}.` : "",
      }));
      const volunteer = (Array.isArray(d.volunteer) ? d.volunteer : []).map((v: any) => ({
        role: String(v.role || "").slice(0, 200),
        organization: String(v.organization || "").slice(0, 200),
        startDate: "",
        endDate: String(v.duration || "").slice(0, 100),
        description: "",
      }));
      patch.activities = [...leadership, ...volunteer].filter((a) => a.role || a.organization);

      patch.projects = (Array.isArray(d.projects) ? d.projects : [])
        .filter((p: any) => p?.title)
        .map((p: any) => ({
          name: String(p.title).slice(0, 200),
          tech: "",
          link: p.link ? String(p.link).slice(0, 500) : "",
          description: String(p.description || p.outcome || "").slice(0, 1500),
        }));

      // Research lifted from projects/awards whose text reads like a publication.
      const isResearch = (p: any) => /paper|publication|journal|conference|preprint|arxiv|research/i.test(`${p.title || ""} ${p.description || ""} ${p.outcome || ""}`);
      patch.research = (Array.isArray(d.projects) ? d.projects : [])
        .filter(isResearch)
        .map((p: any) => ({
          title: String(p.title || "").slice(0, 200),
          advisor: "",
          organization: "",
          startDate: "",
          endDate: String(p.duration || "").slice(0, 50),
          description: String(p.description || p.outcome || "").slice(0, 1500),
        }));

      const competitionHonors = (Array.isArray(d.competitions) ? d.competitions : [])
        .filter((c: any) => c?.name)
        .map((c: any) => ({
          title: String(c.name).slice(0, 200),
          level: String(c.level || "school"),
          year: "",
          description: c.result ? `Result: ${String(c.result).slice(0, 200)}` : "",
        }));
      const awardHonors = (Array.isArray(d.awards) ? d.awards : [])
        .filter((a: any) => a?.title)
        .map((a: any) => ({
          title: String(a.title).slice(0, 200),
          level: "",
          year: String(a.date || "").slice(0, 20),
          description: [a.issuer, a.description].filter(Boolean).join(" — ").slice(0, 500),
        }));
      patch.honors = [...competitionHonors, ...awardHonors];

      patch.certifications = (Array.isArray(d.certifications) ? d.certifications : [])
        .filter((c: any) => c?.name)
        .map((c: any) => ({
          name: String(c.name).slice(0, 200),
          issuer: String(c.issuer || "").slice(0, 200),
          year: String(c.date || "").slice(0, 20),
        }));

      const skills = (Array.isArray(d.skills) ? d.skills : []).filter(Boolean).map(String);
      if (skills.length) patch.skillsTech = skills.slice(0, 20).join(", ");

      onPrefill(patch);
    } catch (err: any) {
      console.error("linkedin import failed", err);
      toast.error(err?.message || "Could not import LinkedIn PDF.");
    } finally {
      setBusy(false);
    }
  };

  if (!hasAccess) {
    return (
      <Card className="mb-6 p-4 border-accent/30 bg-accent/5">
        <div className="flex items-start gap-3 flex-wrap">
          <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
            <FileText className="h-5 w-5 text-accent" />
          </div>
          <div className="flex-1 min-w-[200px]">
            <p className="text-sm font-semibold text-foreground">Import from LinkedIn — Pro feature</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Upload your LinkedIn PDF and we'll auto-fill your header, education, experience, activities, projects, honors, certifications, and skills exactly as they appear — no manual retyping.
            </p>
          </div>
          <Button asChild size="sm">
            <a href="/pricing">Upgrade to Pro</a>
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="mb-6 p-4 border-accent/30 bg-accent/5">
      <div className="flex items-start gap-3 flex-wrap">
        <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
          <FileText className="h-5 w-5 text-accent" />
        </div>
        <div className="flex-1 min-w-[200px]">
          <p className="text-sm font-semibold text-foreground">Import from LinkedIn</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Upload your LinkedIn PDF (Profile → <span className="font-medium text-foreground">More</span> → <span className="font-medium text-foreground">Save to PDF</span>). We'll autofill every section using the exact data from your profile.
          </p>
        </div>
        <Button onClick={() => fileRef.current?.click()} disabled={busy} size="sm" className="gap-1.5">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
          {busy ? "Reading PDF…" : "Import LinkedIn PDF"}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFile}
          className="hidden"
        />
      </div>
    </Card>
  );
}


function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <h3 className="text-[11px] font-bold tracking-widest uppercase border-b border-zinc-900 pb-1 mb-2">{title}</h3>
      {children}
    </div>
  );
}

function ItemSection<T>({ title, items, render }: { title: string; items?: T[]; render: (it: T) => React.ReactNode }) {
  if (!items?.length) return null;
  return (
    <Section title={title}>
      {items.map((it, i) => <div key={i} className="mb-2">{render(it)}</div>)}
    </Section>
  );
}

function Row({ left, right }: { left: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex justify-between items-baseline gap-3">
      <span className="text-sm">{left}</span>
      {right && <span className="text-xs text-zinc-700">{right}</span>}
    </div>
  );
}

function Bullets({ bullets }: { bullets?: string[] }) {
  if (!bullets?.length) return null;
  return (
    <ul className="list-disc pl-5 mt-1 space-y-0.5">
      {bullets.map((b, i) => <li key={i} className="text-sm leading-snug">{b}</li>)}
    </ul>
  );
}
