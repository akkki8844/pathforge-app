import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { majors } from "@/lib/data";
import { CountryCombobox } from "@/components/CountryCombobox";
import { MultiCountryCombobox } from "@/components/MultiCountryCombobox";
import { MultiUniversityCombobox } from "@/components/UniversityCombobox";
import { SchoolPicker, type SchoolRow } from "@/components/SchoolPicker";
import { SettingsSection, SettingsCard, SettingsRow } from "../SettingsShell";
import { PathforgeAvatar } from "@/components/avatar/PathforgeAvatar";
import { AvatarPicker } from "@/components/avatar/AvatarPicker";
import { resolveAvatar, serializeAvatar, type AvatarId } from "@/lib/avatars";

const grades = ["9th Grade", "10th Grade", "11th Grade", "12th Grade"];

export function GeneralSection() {
  const { user, onboardingData, refreshOnboardingData, updateUsername } = useAuth();
  const { toast } = useToast();
  
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [savingUsername, setSavingUsername] = useState(false);
  const [grade, setGrade] = useState(onboardingData?.grade || "");
  const [intendedMajor, setIntendedMajor] = useState(onboardingData?.intended_major || "");
  const [country, setCountry] = useState(onboardingData?.country || "");
  const [studyDest, setStudyDest] = useState<string[]>(
    (onboardingData as any)?.study_destinations || []
  );
  const [targetUniversities, setTargetUniversities] = useState<string[]>(
    (onboardingData as any)?.target_universities || []
  );
  const [school, setSchool] = useState<SchoolRow | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, avatar_url, username")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setFullName((data as any).full_name || "");
          setAvatarUrl((data as any).avatar_url || null);
          setUsername((data as any).username || "");
        }
      });
  }, [user]);

  const handleSaveUsername = async () => {
    const trimmed = username.trim();
    if (!trimmed) {
      toast({ variant: "destructive", title: "Display name can't be empty" });
      return;
    }
    setSavingUsername(true);
    const { error } = await updateUsername(trimmed);
    setSavingUsername(false);
    if (error) {
      toast({ variant: "destructive", title: "Couldn't save display name", description: error.message });
    } else {
      toast({ title: "Display name saved", description: "This is what other students see on the leaderboard." });
    }
  };

  useEffect(() => {
    const sid = (onboardingData as any)?.school_id;
    if (!sid) return;
    supabase
      .from("schools")
      .select("id,name,city,country,domain")
      .eq("id", sid)
      .maybeSingle()
      .then(({ data }) => data && setSchool(data as SchoolRow));
  }, [(onboardingData as any)?.school_id]);

  /**
   * Persist an avatar choice. Stored in the existing `avatar_url` column as a
   * `pf:face:palette` token rather than a URL — no upload, no image hosting.
   */
  const handleAvatarSelect = async (next: AvatarId) => {
    if (!user) return;
    const previous = avatarUrl;
    const serialized = serializeAvatar(next);
    setAvatarUrl(serialized); // optimistic: the picker should feel instant
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: serialized })
      .eq("user_id", user.id);
    if (error) {
      setAvatarUrl(previous);
      toast({ variant: "destructive", title: "Couldn't save avatar", description: error.message });
    }
  };


  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error: pErr } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim() || null })
        .eq("user_id", user.id);
      if (pErr) throw pErr;

      if (onboardingData) {
        const { error } = await supabase
          .from("onboarding_data")
          .update({
            grade,
            intended_major: intendedMajor,
            country,
            study_destinations: studyDest,
            target_universities: targetUniversities,
            high_school_name: school?.name || onboardingData.high_school_name,
            school_id: school?.id ?? (onboardingData as any)?.school_id ?? null,
          })
          .eq("user_id", user.id);
        if (error) throw error;
        await refreshOnboardingData();
      }

      toast({ title: "Saved", description: "Your changes are live." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Save failed", description: e.message });
    } finally {
      setSaving(false);
    }
  };

  // Falls back to a stable per-user default, so the picker always opens on the
  // avatar the rest of the app is already showing.
  const selectedAvatar: AvatarId = resolveAvatar(avatarUrl, user?.id ?? "");

  return (
    <SettingsSection
      title="General"
      description="Your profile basics flow into recommendations across the app."
    >
      <SettingsCard
        title="Your avatar"
        description="Pick a Pathforge character. We don't host profile photos — most of our users are under 18, so there's nothing to leak and nothing to moderate."
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="shrink-0">
            <PathforgeAvatar
              avatar={selectedAvatar}
              className="h-20 w-20"
              cutout="hsl(var(--card))"
            />
          </div>
          <div className="min-w-0 flex-1">
            <AvatarPicker value={selectedAvatar} onChange={handleAvatarSelect} />
          </div>
        </div>
      </SettingsCard>

      <SettingsCard
        title="Display name"
        description="Shown on the Journey leaderboard instead of an auto-generated handle."
      >
        <div className="flex items-end gap-2 max-w-sm">
          <Field label="Display name" hint="Visible to other students on the leaderboard.">
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Pick a display name"
              maxLength={24}
            />
          </Field>
          <Button onClick={handleSaveUsername} disabled={savingUsername} size="sm" className="h-9">
            {savingUsername ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
          </Button>
        </div>
      </SettingsCard>

      <SettingsCard title="Profile">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Full name">
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
          </Field>
          <Field label="Grade">
            <Select value={grade} onValueChange={setGrade}>
              <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
              <SelectContent>
                {grades.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Intended major">
            <Select value={intendedMajor} onValueChange={setIntendedMajor}>
              <SelectTrigger><SelectValue placeholder="Select major" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {majors.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Country of residence">
            <CountryCombobox value={country} onChange={setCountry} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="School">
              <SchoolPicker
                value={school}
                initialQuery={onboardingData?.high_school_name}
                onChange={setSchool}
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field
              label="Countries of study"
              hint="Where you're considering applying for university."
            >
              <MultiCountryCombobox
                values={studyDest}
                onChange={setStudyDest}
                placeholder="Add a destination"
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field
              label="Target universities"
              hint="Pick up to 5 — drives college fit, essays, and admissions probability."
            >
              <MultiUniversityCombobox
                values={targetUniversities}
                onChange={setTargetUniversities}
                countries={studyDest}
                max={5}
                placeholder="Search universities"
              />
            </Field>
          </div>
        </div>
      </SettingsCard>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save changes
        </Button>
      </div>
    </SettingsSection>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
