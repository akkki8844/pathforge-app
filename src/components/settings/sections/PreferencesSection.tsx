import { Link } from "react-router-dom";
import { Languages } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SettingsSection, SettingsCard, SettingsRow } from "../SettingsShell";
import { useSettingsForm } from "../SettingsFormContext";

/**
 * Every control in this section used to be plain `useState` with no write
 * path at all — the switches moved and nothing was persisted anywhere. They
 * now read and write the shared settings draft and are committed by the
 * page-level Save button.
 *
 * The language picker that used to live here has been removed: it was a
 * second, competing copy of the Language section's picker writing the same
 * localStorage key, which is exactly the kind of duplicate that made the
 * page feel unreliable. One control, one home.
 */
export function PreferencesSection() {
  const { draft, set, isDirty, loading } = useSettingsForm();

  return (
    <SettingsSection
      title="Preferences"
      description="Tune how Pathforge tailors recommendations, AI output, and on-screen guidance to your style."
    >
      <SettingsCard title="AI behavior" description="How the AI advisor and refiners respond to you.">
        <SettingsRow
          label="Refinement tone"
          description="Sets the voice the AI uses when rewriting essays, projects, and bullets."
          dirty={isDirty("ai_tone")}
        >
          <Select value={draft.ai_tone} onValueChange={(v) => set("ai_tone", v)} disabled={loading}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="precise">Precise &amp; academic</SelectItem>
              <SelectItem value="balanced">Balanced</SelectItem>
              <SelectItem value="bold">Bold &amp; narrative</SelectItem>
            </SelectContent>
          </Select>
        </SettingsRow>
        <SettingsRow
          label="Recommendation ambition"
          description="Bias the activity and college engine toward safer or more reach-focused picks."
          dirty={isDirty("rec_rigor")}
        >
          <Select value={draft.rec_rigor} onValueChange={(v) => set("rec_rigor", v)} disabled={loading}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="grounded">Grounded</SelectItem>
              <SelectItem value="ambitious">Ambitious</SelectItem>
              <SelectItem value="reach">Reach-heavy</SelectItem>
            </SelectContent>
          </Select>
        </SettingsRow>
      </SettingsCard>

      <SettingsCard title="Productivity" description="Small behaviors that keep your workflow on rails.">
        <SettingsRow
          label="Auto-sync calendar each visit"
          description="Pull new Google Calendar events into the planner whenever you open it."
          dirty={isDirty("auto_sync_calendar")}
        >
          <Switch
            checked={draft.auto_sync_calendar}
            onCheckedChange={(v) => set("auto_sync_calendar", v)}
            disabled={loading}
          />
        </SettingsRow>
        <SettingsRow
          label="Show contextual tips"
          description="Surface short coaching prompts when you reach a new section."
          dirty={isDirty("show_tips")}
        >
          <Switch
            checked={draft.show_tips}
            onCheckedChange={(v) => set("show_tips", v)}
            disabled={loading}
          />
        </SettingsRow>
      </SettingsCard>

      <SettingsCard title="Language &amp; region">
        <SettingsRow
          label="Display &amp; AI language"
          description="Lives in its own section, because changing it re-renders the whole workspace immediately."
        >
          <Link
            to="/profile?section=language"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-[13px] font-medium text-foreground transition-colors hover:bg-muted/60"
          >
            <Languages className="h-3.5 w-3.5" />
            Open Language
          </Link>
        </SettingsRow>
      </SettingsCard>
    </SettingsSection>
  );
}
