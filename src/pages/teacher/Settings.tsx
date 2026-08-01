import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Loader2, Save, ShieldCheck, KeyRound, Briefcase, Globe, Award,
  GraduationCap, Building2, AlertCircle,
} from "lucide-react";
import { TeacherLayout } from "@/components/teacher/TeacherLayout";
import { BackToCommand } from "@/components/teacher/BackToCommand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MultiCountryCombobox } from "@/components/MultiCountryCombobox";
import { AvatarPicker } from "@/components/avatar/AvatarPicker";
import { PathforgeAvatar } from "@/components/avatar/PathforgeAvatar";
import { resolveAvatar, serializeAvatar, type AvatarId } from "@/lib/avatars";
import { X } from "lucide-react";

const ROLES = [
  "School Counselor", "College Counselor", "Teacher", "Dean",
  "Head of School", "Independent Counselor", "Consultant", "Other",
];
const YEARS = ["0-2", "3-5", "6-10", "10+"];
const SPECIALIZATIONS = [
  "Ivy League / T20 US", "UK (Oxbridge / Russell)", "Canada", "Europe",
  "Australia", "India top-tier", "Liberal Arts", "STEM-focused",
  "Business / Pre-Law", "Arts & Humanities",
];
const SERVICES = [
  "Application strategy", "Essay coaching", "Activity / extracurricular planning",
  "Test-prep guidance", "Interview prep", "Scholarship help",
  "Career counseling", "Profile building",
];

export default function CounsellorSettings() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, teacherProfile, refreshTeacherStatus } = useAuth();

  // Profile state
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("");
  const [subject, setSubject] = useState("");
  const [years, setYears] = useState("");
  const [website, setWebsite] = useState("");
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [services, setServices] = useState<string[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [schoolName, setSchoolName] = useState<string>("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Avatar state
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const selectedAvatar: AvatarId = resolveAvatar(avatarUrl, user?.id || "");

  // Password state
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    if (!user) return;
    // Pull the full teacher_profiles row (AuthContext only exposes a subset).
    supabase
      .from("teacher_profiles")
      .select("school_role,subject,years_experience,school_website,specializations,services_offered,countries_expertise,school_id,title")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setRole((data.school_role as string) || (data.title as string) || "");
        setSubject((data.subject as string) || "");
        setYears((data.years_experience as string) || "");
        setWebsite((data.school_website as string) || "");
        setSpecializations((data.specializations as string[]) || []);
        setServices((data.services_offered as string[]) || []);
        setCountries((data.countries_expertise as string[]) || []);
        if (data.school_id) {
          supabase
            .from("schools")
            .select("name")
            .eq("id", data.school_id as string)
            .maybeSingle()
            .then(({ data: s }) => setSchoolName(s?.name || ""));
        }
      });

    supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setFullName(data?.username || "");
        setAvatarUrl((data as any)?.avatar_url || null);
      });
  }, [user]);

  const toggle = (arr: string[], setArr: (v: string[]) => void, value: string) => {
    setArr(arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]);
  };

  const handleAvatarSelect = async (next: AvatarId) => {
    if (!user) return;
    setSavingAvatar(true);
    try {
      const serialized = serializeAvatar(next);
      setAvatarUrl(serialized);
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: serialized })
        .eq("user_id", user.id);
      if (error) throw error;
      toast({ title: "Avatar updated" });
    } catch (e) {
      toast({ variant: "destructive", title: "Could not save avatar", description: (e as Error).message });
    } finally {
      setSavingAvatar(false);
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      const { error: tpErr } = await supabase
        .from("teacher_profiles")
        .update({
          school_role: role,
          subject: subject.trim() || null,
          years_experience: years || null,
          school_website: website.trim() || null,
          specializations,
          services_offered: services,
          countries_expertise: countries,
        })
        .eq("user_id", user.id);
      if (tpErr) throw tpErr;

      if (fullName.trim()) {
        const { error: pErr } = await supabase
          .from("profiles")
          .update({ username: fullName.trim() })
          .eq("user_id", user.id);
        if (pErr) throw pErr;
      }

      await refreshTeacherStatus();
      toast({ title: "Settings saved", description: "Your counsellor profile is up to date." });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Could not save",
        description: (e as Error).message,
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async () => {
    if (!user?.email) return;
    if (newPw.length < 8) {
      toast({ variant: "destructive", title: "Password too short", description: "Use at least 8 characters." });
      return;
    }
    if (newPw !== confirmPw) {
      toast({ variant: "destructive", title: "Passwords don't match" });
      return;
    }
    if (newPw === currentPw) {
      toast({ variant: "destructive", title: "Choose a different password", description: "New password must differ from current." });
      return;
    }
    setSavingPw(true);
    try {
      // Verify current password using an ephemeral client so we don't disturb the active session.
      const { createClient } = await import("@supabase/supabase-js");
      const url = import.meta.env.VITE_SUPABASE_URL as string;
      const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
      const ephemeral = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false, storageKey: "pf-pw-verify" },
      });
      const { error: signInErr } = await ephemeral.auth.signInWithPassword({
        email: user.email,
        password: currentPw,
      });
      try { await ephemeral.auth.signOut(); } catch { /* ignore */ }
      if (signInErr) {
        throw new Error("Current password is incorrect.");
      }

      const { error: updErr } = await supabase.auth.updateUser({ password: newPw });
      if (updErr) throw updErr;

      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      toast({
        title: "Password updated",
        description: "Use your new password the next time you sign in.",
      });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Could not change password",
        description: (e as Error).message,
      });
    } finally {
      setSavingPw(false);
    }
  };

  const Pill = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
        active
          ? "bg-accent text-accent-foreground border-accent shadow-sm"
          : "bg-card border-border hover:border-accent/50 text-foreground"
      }`}
    >
      {children}
    </button>
  );

  return (
    <TeacherLayout>
      <BackToCommand />
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-8 max-w-4xl"
      >
        <header className="space-y-2">
          <span className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.16em] uppercase text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Account
          </span>
          <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight">Settings</h1>
          <p className="text-[15px] text-muted-foreground">
            Update your counsellor profile and change your password. Changes are saved to your account.
          </p>
        </header>

        {/* Avatar card */}
        <Card className="p-6 lg:p-8 space-y-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <GraduationCap className="h-4 w-4 text-accent" /> Avatar
          </div>
          <div className="flex items-start gap-6">
            <PathforgeAvatar
              avatar={selectedAvatar}
              size={80}
              className="rounded-2xl shrink-0"
              cutout="hsl(var(--card))"
              selected
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-4">
                Choose a character and colour for your counsellor avatar. This is visible to students and fellow counsellors.
              </p>
              <AvatarPicker
                value={selectedAvatar}
                onChange={handleAvatarSelect}
                disabled={savingAvatar}
              />
            </div>
          </div>
        </Card>

        {/* Profile card */}
        <Card className="p-6 lg:p-8 space-y-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Briefcase className="h-4 w-4 text-accent" /> Profile details
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Full name</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
                maxLength={120}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> Organization / School</Label>
              <Input value={schoolName} disabled placeholder="Linked by admin" />
              <p className="text-[11px] text-muted-foreground">
                School linkage is managed by an admin. Contact support to change.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Role / Title</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Years of experience</Label>
              <Select value={years} onValueChange={setYears}>
                <SelectTrigger><SelectValue placeholder="Select range" /></SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => <SelectItem key={y} value={y}>{y} years</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Department / Specialization area (optional)</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. College Counseling"
                maxLength={80}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>School website (optional)</Label>
              <Input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://yourschool.edu"
                maxLength={200}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><Award className="h-3.5 w-3.5" /> Specializations</Label>
            <div className="flex flex-wrap gap-2">
              {SPECIALIZATIONS.map((s) => (
                <Pill key={s} active={specializations.includes(s)} onClick={() => toggle(specializations, setSpecializations, s)}>
                  {s}
                </Pill>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><GraduationCap className="h-3.5 w-3.5" /> Services offered</Label>
            <div className="flex flex-wrap gap-2">
              {SERVICES.map((s) => (
                <Pill key={s} active={services.includes(s)} onClick={() => toggle(services, setServices, s)}>
                  {s}
                </Pill>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" /> Countries of expertise</Label>
            <p className="text-xs text-muted-foreground">Search the full ISO list — you can pick as many as you like.</p>
            <MultiCountryCombobox
              values={countries}
              onChange={setCountries}
              placeholder="Add a country"
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={saveProfile} disabled={savingProfile}>
              {savingProfile ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save profile
            </Button>
          </div>
        </Card>

        {/* Password card */}
        <Card className="p-6 lg:p-8 space-y-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <KeyRound className="h-4 w-4 text-accent" /> Change password
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label>Current password</Label>
              <Input
                type="password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <div className="space-y-2">
              <Label>New password</Label>
              <Input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                autoComplete="new-password"
                placeholder="At least 8 characters"
              />
            </div>
            <div className="space-y-2">
              <Label>Confirm new password</Label>
              <Input
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>
          <div className="rounded-md border border-border/60 bg-muted/40 p-3 flex gap-2 text-xs text-muted-foreground">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
            We re-verify your current password before applying changes. You'll stay signed in on this device.
          </div>
          <div className="flex justify-end">
            <Button
              onClick={changePassword}
              disabled={savingPw || !currentPw || !newPw || !confirmPw}
            >
              {savingPw ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
              Update password
            </Button>
          </div>
        </Card>
      </motion.div>
    </TeacherLayout>
  );
}
