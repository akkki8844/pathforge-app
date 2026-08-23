import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
import { SettingsSection, SettingsCard, SettingsRow } from "../SettingsShell";
import { useSettingsForm } from "../SettingsFormContext";

/**
 * The duplicate "Notifications" card that used to sit at the bottom of this
 * section has moved to the Notifications section, where the rest of the
 * notification switches live. It was the same four user_preferences columns
 * rendered a second time with different copy.
 */
export function PrivacySection() {
  const { draft, set, isDirty, loading } = useSettingsForm();
  const { user } = useAuth();
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);

  const exportData = async () => {
    if (!user) return;
    setExporting(true);
    try {
      const tables = [
        "profiles",
        "onboarding_data",
        "outcomes_data",
        "admissions_data",
        "application_entries",
        "journey_scores",
        "readiness_analyses",
      ];
      const out: Record<string, unknown> = {};
      const failed: string[] = [];
      for (const t of tables) {
        // A denied or missing table used to be swallowed, producing an export
        // that silently omitted whole sections of the user's data.
        const { data, error } = await supabase.from(t as never).select("*").eq("user_id", user.id);
        if (error) failed.push(t);
        out[t] = data || [];
      }
      const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pathforge-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      if (failed.length) {
        toast({
          variant: "destructive",
          title: "Export incomplete",
          description: `Couldn't read: ${failed.join(", ")}. Everything else was downloaded.`,
        });
      } else {
        toast({ title: "Export ready", description: "Your data has been downloaded." });
      }
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Export failed",
        description: e instanceof Error ? e.message : "Please try again.",
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <SettingsSection title="Privacy" description="Control who sees your profile and how your data is used.">
      <SettingsCard title="Visibility">
        <SettingsRow
          label="Profile visibility"
          description="Who can see your profile basics (name, school, major)."
          dirty={isDirty("profile_visibility")}
        >
          <Select
            value={draft.profile_visibility}
            onValueChange={(v) => set("profile_visibility", v as typeof draft.profile_visibility)}
            disabled={loading}
          >
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="private">Private</SelectItem>
              <SelectItem value="school">My school</SelectItem>
              <SelectItem value="public">Public</SelectItem>
            </SelectContent>
          </Select>
        </SettingsRow>
        <SettingsRow
          label="Activity visibility"
          description="Who can see your activities, projects, and outcomes."
          dirty={isDirty("activity_visibility")}
        >
          <Select
            value={draft.activity_visibility}
            onValueChange={(v) => set("activity_visibility", v as typeof draft.activity_visibility)}
            disabled={loading}
          >
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="private">Private</SelectItem>
              <SelectItem value="school">My school</SelectItem>
              <SelectItem value="public">Public</SelectItem>
            </SelectContent>
          </Select>
        </SettingsRow>
      </SettingsCard>

      <SettingsCard title="AI personalization">
        <SettingsRow
          label="Personalize AI responses"
          description="Use your profile, major, and goals to tailor recommendations and analyses."
          dirty={isDirty("ai_personalization")}
        >
          <Switch
            checked={draft.ai_personalization}
            onCheckedChange={(v) => set("ai_personalization", v)}
            disabled={loading}
          />
        </SettingsRow>
      </SettingsCard>

      <SettingsCard title="Your data" description="Download a copy of everything Pathforge stores about you.">
        <SettingsRow label="Export data" description="A JSON file with your profile, applications, and progress.">
          <Button variant="outline" onClick={exportData} disabled={exporting}>
            {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Download
          </Button>
        </SettingsRow>
      </SettingsCard>
    </SettingsSection>
  );
}
