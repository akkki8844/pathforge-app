import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  GraduationCap,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Building2,
  Globe,
  Award,
  Briefcase,
  Upload,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { SchoolPicker, type SchoolRow } from "@/components/SchoolPicker";
import { ALL_COUNTRY_NAMES } from "@/lib/countries";
import { useStepBackNavigation } from "@/hooks/useStepBackNavigation";
import { getMajorNames } from "@/lib/majors";
import { Search, X } from "lucide-react";
import pathforgeLogo from "@/assets/pathforge-logo.webp";
import { AuroraBackdrop } from "@/components/visual/AuroraBackdrop";

const ROLES = ["School Counselor", "College Counselor", "Teacher", "Dean", "Head of School", "Independent Counselor", "Consultant", "Other"];
const YEARS = ["0-2", "3-5", "6-10", "10+"];
const STUDENTS_HANDLED = ["1-10", "11-50", "51-200", "200+"];
const GRADE_LEVELS = ["Grade 9", "Grade 10", "Grade 11", "Grade 12", "Post-grad / Gap year"];
const CURRICULA = ["IB", "AP", "A-Levels", "CBSE / ISC", "State Boards", "Other"];
const SPECIALIZATIONS = ["Ivy League / T20 US", "UK (Oxbridge / Russell)", "Canada", "Europe", "Australia", "India top-tier", "Liberal Arts", "STEM-focused", "Business / Pre-Law", "Arts & Humanities"];
// Full ISO country list — searchable in step 2
const COUNTRIES = ALL_COUNTRY_NAMES;
const SERVICES = ["Application strategy", "Essay coaching", "Activity / extracurricular planning", "Test-prep guidance", "Interview prep", "Scholarship help", "Career counseling", "Profile building"];
const ALL_MAJORS = getMajorNames();

type Step = 0 | 1 | 2;

export default function TeacherCounselorOnboarding() {
  const { toast } = useToast();
  const { refreshTeacherStatus, user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(0);
  const [loading, setLoading] = useState(false);

  // Step 1 — school context
  const [fullName, setFullName] = useState("");
  const [school, setSchool] = useState<SchoolRow | null>(null);
  const [role, setRole] = useState("School Counselor");
  const [subject, setSubject] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [studentsHandled, setStudentsHandled] = useState("");
  const [schoolWebsite, setSchoolWebsite] = useState("");

  // Step 2 — what they cover
  const [gradeLevels, setGradeLevels] = useState<string[]>([]);
  const [curricula, setCurricula] = useState<string[]>([]);
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [countryQuery, setCountryQuery] = useState("");
  const [services, setServices] = useState<string[]>([]);
  const [preferredMajors, setPreferredMajors] = useState<string[]>([]);
  const [majorQuery, setMajorQuery] = useState("");

  // Step 3 — verification
  const [proofType, setProofType] = useState<"website" | "document">("website");
  const [proofUrl, setProofUrl] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofNotes, setProofNotes] = useState("");

  const toggle = (arr: string[], setArr: (v: string[]) => void, value: string) => {
    setArr(arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]);
  };

  const canNext = () => {
    if (step === 0) return fullName.trim().length >= 2 && !!school && !!role && !!yearsExperience;
    if (step === 1) return gradeLevels.length > 0 && (specializations.length > 0 || curricula.length > 0);
    if (step === 2) {
      if (proofType === "website") return proofUrl.trim().length > 4;
      return !!proofFile;
    }
    return false;
  };

  // Browser back: previous step or exit (back to home).
  useStepBackNavigation({
    step,
    onBack: () => setStep((s) => (s > 0 ? ((s - 1) as Step) : s)),
    onExitRequest: () => navigate("/", { replace: true }),
  });

  const submit = async () => {
    if (!user || !school) return;
    setLoading(true);
    try {
      // 1. Verify role + auto-link via teacher-verify edge function
      const verifyRes = await supabase.functions.invoke("teacher-verify", {
        body: { school_id: school.id, title: role, subject: subject.trim() || null },
      });
      if (verifyRes.error) throw verifyRes.error;
      const autoVerified = !!(verifyRes.data as { verified?: boolean })?.verified;

      // 2. Update teacher_profile with onboarding details
      // Pack preferred majors into the `subject` column (no dedicated col yet)
      const subjectPayload = [
        subject.trim(),
        preferredMajors.length ? `Majors: ${preferredMajors.join(", ")}` : "",
      ].filter(Boolean).join(" — ") || null;

      await supabase
        .from("teacher_profiles")
        .update({
          school_role: role,
          subject: subjectPayload,
          years_experience: yearsExperience,
          students_handled_range: studentsHandled || null,
          school_website: schoolWebsite.trim() || null,
          grade_levels_taught: gradeLevels,
          curriculum_expertise: curricula,
          specializations,
          countries_expertise: countries,
          services_offered: services,
          onboarding_completed: true,
        })
        .eq("user_id", user.id);

      // Save full name into profile (username acts as display name)
      if (fullName.trim()) {
        await supabase
          .from("profiles")
          .update({ username: fullName.trim() })
          .eq("user_id", user.id);
      }

      // 3. Submit verification proof if not auto-verified
      if (!autoVerified) {
        let proofFilePath: string | null = null;
        if (proofType === "document" && proofFile) {
          const ext = proofFile.name.split(".").pop() || "pdf";
          const path = `${user.id}/${Date.now()}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from("teacher-verification")
            .upload(path, proofFile, { upsert: false });
          if (upErr) throw upErr;
          proofFilePath = path;
        }
        await supabase.from("teacher_verification_requests").insert({
          teacher_user_id: user.id,
          school_id: school.id,
          proof_type: proofType,
          proof_url: proofType === "website" ? proofUrl.trim() : null,
          proof_file_path: proofFilePath,
          notes: proofNotes.trim() || null,
        });
      }

      toast({
        title: autoVerified ? "Verified instantly" : "Submitted for review",
        description: autoVerified
          ? `Email domain matched ${school.name}. Welcome aboard.`
          : "Our team will review your verification within 24 hours. You can explore the dashboard meanwhile.",
      });
      await refreshTeacherStatus();
      navigate("/teacher");
    } catch (e) {
      toast({ variant: "destructive", title: "Could not complete setup", description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const Pill = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
        active
          ? "bg-accent text-accent-foreground border-accent shadow-sm"
          : "bg-card border-border hover:border-accent/50 text-foreground"
      }`}
    >
      {children}
    </motion.button>
  );

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-start justify-center p-4 overflow-y-auto">
      <AuroraBackdrop />
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-2xl my-8"
      >
        <div className="card-elevated p-6 sm:p-8 space-y-6">
          {/* Header */}
          <div className="text-center">
            <img src={pathforgeLogo} alt="Pathforge logo" className="h-10 mx-auto mb-3" />
            <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
              <GraduationCap className="h-6 w-6 text-accent" /> Counselor setup
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              Three quick steps. We only ask about your school and practice — no personal information.
            </p>
          </div>

          {/* Progress */}
          <div className="flex items-center justify-center gap-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{
                  width: i === step ? 32 : 8,
                  backgroundColor: i <= step ? "hsl(var(--accent))" : "hsl(var(--muted))",
                }}
                transition={{ duration: 0.3 }}
                className="h-2 rounded-full"
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div
                key="step-0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Building2 className="h-4 w-4 text-accent" /> Your school context
                </div>

                <div className="space-y-2">
                  <Label>Full name *</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Jane Smith" maxLength={120} />
                </div>

                <div className="space-y-2">
                  <Label>School / Organization *</Label>
                  <SchoolPicker value={school} onChange={setSchool} />
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Your role *</Label>
                    <Select value={role} onValueChange={setRole}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ROLES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Years counseling *</Label>
                    <Select value={yearsExperience} onValueChange={setYearsExperience}>
                      <SelectTrigger><SelectValue placeholder="Select range" /></SelectTrigger>
                      <SelectContent>
                        {YEARS.map((y) => <SelectItem key={y} value={y}>{y} years</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Department (optional)</Label>
                    <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. College Counseling" maxLength={80} />
                  </div>
                  <div className="space-y-2">
                    <Label>Students per cycle</Label>
                    <Select value={studentsHandled} onValueChange={setStudentsHandled}>
                      <SelectTrigger><SelectValue placeholder="Select range" /></SelectTrigger>
                      <SelectContent>
                        {STUDENTS_HANDLED.map((s) => <SelectItem key={s} value={s}>{s} students</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>School website (optional)</Label>
                  <Input
                    value={schoolWebsite}
                    onChange={(e) => setSchoolWebsite(e.target.value)}
                    placeholder="https://yourschool.edu"
                    maxLength={200}
                  />
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-5"
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Award className="h-4 w-4 text-accent" /> What you cover
                </div>

                <div className="space-y-2">
                  <Label>Grade levels you support *</Label>
                  <div className="flex flex-wrap gap-2">
                    {GRADE_LEVELS.map((g) => (
                      <Pill key={g} active={gradeLevels.includes(g)} onClick={() => toggle(gradeLevels, setGradeLevels, g)}>
                        {g}
                      </Pill>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Curricula you work with</Label>
                  <div className="flex flex-wrap gap-2">
                    {CURRICULA.map((c) => (
                      <Pill key={c} active={curricula.includes(c)} onClick={() => toggle(curricula, setCurricula, c)}>
                        {c}
                      </Pill>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Specialization</Label>
                  <div className="flex flex-wrap gap-2">
                    {SPECIALIZATIONS.map((s) => (
                      <Pill key={s} active={specializations.includes(s)} onClick={() => toggle(specializations, setSpecializations, s)}>
                        {s}
                      </Pill>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" /> Countries you advise on</Label>
                  {countries.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-1">
                      {countries.map((c) => (
                        <Badge key={c} variant="secondary" className="gap-1">
                          {c}
                          <button type="button" onClick={() => toggle(countries, setCountries, c)} className="hover:text-destructive">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input placeholder="Search countries…" value={countryQuery} onChange={(e) => setCountryQuery(e.target.value)} className="pl-10" />
                  </div>
                  <div className="max-h-40 overflow-y-auto border border-border rounded-md p-2 bg-background/50">
                    <div className="flex flex-wrap gap-2">
                      {COUNTRIES
                        .filter((c) => c.toLowerCase().includes(countryQuery.trim().toLowerCase()))
                        .slice(0, 60)
                        .map((c) => (
                          <Pill key={c} active={countries.includes(c)} onClick={() => toggle(countries, setCountries, c)}>
                            {c}
                          </Pill>
                        ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Preferred student majors (optional)</Label>
                  {preferredMajors.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-1">
                      {preferredMajors.map((m) => (
                        <Badge key={m} variant="secondary" className="gap-1">
                          {m}
                          <button type="button" onClick={() => toggle(preferredMajors, setPreferredMajors, m)} className="hover:text-destructive">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input placeholder="Search majors…" value={majorQuery} onChange={(e) => setMajorQuery(e.target.value)} className="pl-10" />
                  </div>
                  <div className="max-h-40 overflow-y-auto border border-border rounded-md p-2 bg-background/50">
                    <div className="flex flex-wrap gap-2">
                      {ALL_MAJORS
                        .filter((m) => m.toLowerCase().includes(majorQuery.trim().toLowerCase()))
                        .slice(0, 40)
                        .map((m) => (
                          <Pill key={m} active={preferredMajors.includes(m)} onClick={() => toggle(preferredMajors, setPreferredMajors, m)}>
                            {m}
                          </Pill>
                        ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5" /> Services offered</Label>
                  <div className="flex flex-wrap gap-2">
                    {SERVICES.map((s) => (
                      <Pill key={s} active={services.includes(s)} onClick={() => toggle(services, setServices, s)}>
                        {s}
                      </Pill>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <ShieldCheck className="h-4 w-4 text-accent" /> Verification
                </div>

                <div className="rounded-lg border border-accent/30 bg-accent/5 p-4 text-sm">
                  <p className="font-medium text-foreground mb-1">Why we verify</p>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Verification keeps Pathforge safe for students. If your sign-up email domain matches your school's verified domain, you're approved instantly. Otherwise, share a quick proof and our team approves within 24 hours.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Choose proof type *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setProofType("website")}
                      className={`p-3 rounded-md border text-left transition-all ${proofType === "website" ? "border-accent bg-accent/5" : "border-border hover:border-accent/50"}`}
                    >
                      <div className="flex items-center gap-2 text-sm font-medium"><ExternalLink className="h-3.5 w-3.5" /> Staff page link</div>
                      <p className="text-xs text-muted-foreground mt-1">Link to your bio on the school site.</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setProofType("document")}
                      className={`p-3 rounded-md border text-left transition-all ${proofType === "document" ? "border-accent bg-accent/5" : "border-border hover:border-accent/50"}`}
                    >
                      <div className="flex items-center gap-2 text-sm font-medium"><Upload className="h-3.5 w-3.5" /> Upload ID</div>
                      <p className="text-xs text-muted-foreground mt-1">School ID or appointment letter (PDF/image).</p>
                    </button>
                  </div>
                </div>

                {proofType === "website" ? (
                  <div className="space-y-2">
                    <Label>Public link to your school staff profile *</Label>
                    <Input
                      value={proofUrl}
                      onChange={(e) => setProofUrl(e.target.value)}
                      placeholder="https://yourschool.edu/staff/your-name"
                      maxLength={300}
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Upload proof document *</Label>
                    <Input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                    />
                    {proofFile && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <CheckCircle2 className="h-3 w-3 text-accent" /> {proofFile.name}
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Anything we should know? (optional)</Label>
                  <Textarea
                    value={proofNotes}
                    onChange={(e) => setProofNotes(e.target.value)}
                    placeholder="e.g. I just joined, our directory updates next month."
                    maxLength={400}
                    rows={2}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Nav */}
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="ghost"
              onClick={() => setStep((s) => (s > 0 ? ((s - 1) as Step) : s))}
              disabled={step === 0 || loading}
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            {step < 2 ? (
              <Button
                className="btn-accent"
                onClick={() => setStep((s) => ((s + 1) as Step))}
                disabled={!canNext()}
              >
                Continue <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button className="btn-accent" onClick={submit} disabled={!canNext() || loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Finish setup <CheckCircle2 className="h-4 w-4 ml-1" /></>}
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
