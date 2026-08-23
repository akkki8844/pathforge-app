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
import { majors } from "@/lib/data";
import { CountryCombobox } from "@/components/CountryCombobox";
import { MultiCountryCombobox } from "@/components/MultiCountryCombobox";
import { MultiUniversityCombobox } from "@/components/UniversityCombobox";
import { SchoolPicker } from "@/components/SchoolPicker";
import { SettingsSection, SettingsCard } from "../SettingsShell";
import { PathforgeAvatar } from "@/components/avatar/PathforgeAvatar";
import { AvatarPicker } from "@/components/avatar/AvatarPicker";
import { resolveAvatar, serializeAvatar, type AvatarId } from "@/lib/avatars";
import { useSettingsForm } from "../SettingsFormContext";
import { cn } from "@/lib/utils";

const grades = ["9th Grade", "10th Grade", "11th Grade", "12th Grade"];

export function GeneralSection() {
  const { user } = useAuth();
  const { draft, set, isDirty, school, setSchool, loading } = useSettingsForm();

  // Falls back to a stable per-user default so the picker always opens on the
  // avatar the rest of the app is already showing.
  const selectedAvatar: AvatarId = resolveAvatar(draft.avatar_url, user?.id ?? "");

  return (
    <SettingsSection
      title="General"
      description="Your profile basics flow into recommendations across the app. Changes are staged here and committed with the Save button at the bottom of the page."
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
            <AvatarPicker
              value={selectedAvatar}
              onChange={(next) => set("avatar_url", serializeAvatar(next))}
            />
          </div>
        </div>
      </SettingsCard>

      <SettingsCard title="Identity">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Display name"
            hint="Shown on the Journey leaderboard instead of an auto-generated handle."
            dirty={isDirty("username")}
          >
            <Input
              value={draft.username}
              onChange={(e) => set("username", e.target.value)}
              placeholder="Pick a display name"
              maxLength={24}
              disabled={loading}
            />
          </Field>
          <Field label="Full name" dirty={isDirty("full_name")}>
            <Input
              value={draft.full_name}
              onChange={(e) => set("full_name", e.target.value)}
              placeholder="Your name"
              disabled={loading}
            />
          </Field>
        </div>
      </SettingsCard>

      <SettingsCard title="Academics">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Grade" dirty={isDirty("grade")}>
            <Select value={draft.grade} onValueChange={(v) => set("grade", v)} disabled={loading}>
              <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
              <SelectContent>
                {grades.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Intended major" dirty={isDirty("intended_major")}>
            <Select
              value={draft.intended_major}
              onValueChange={(v) => set("intended_major", v)}
              disabled={loading}
            >
              <SelectTrigger><SelectValue placeholder="Select major" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {majors.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Country of residence" dirty={isDirty("country")}>
            <CountryCombobox value={draft.country} onChange={(v) => set("country", v)} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="School" dirty={isDirty("school_id")}>
              <SchoolPicker
                value={school}
                initialQuery={draft.high_school_name}
                onChange={setSchool}
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field
              label="Countries of study"
              hint="Where you're considering applying for university."
              dirty={isDirty("study_destinations")}
            >
              <MultiCountryCombobox
                values={draft.study_destinations}
                onChange={(v) => set("study_destinations", v)}
                placeholder="Add a destination"
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field
              label="Target universities"
              hint="Pick up to 5 — drives college fit, essays, and admissions probability."
              dirty={isDirty("target_universities")}
            >
              <MultiUniversityCombobox
                values={draft.target_universities}
                onChange={(v) => set("target_universities", v)}
                countries={draft.study_destinations}
                max={5}
                placeholder="Search universities"
              />
            </Field>
          </div>
        </div>
      </SettingsCard>
    </SettingsSection>
  );
}

function Field({
  label,
  hint,
  dirty,
  children,
}: {
  label: string;
  hint?: string;
  dirty?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </Label>
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full bg-primary transition-opacity duration-200",
            dirty ? "opacity-100" : "opacity-0",
          )}
          title={dirty ? "Unsaved" : undefined}
          aria-hidden={!dirty}
        />
      </div>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
