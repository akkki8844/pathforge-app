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
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SettingsSection, SettingsCard, SettingsRow } from "../SettingsShell";

export function PrivacySection() {
  const { prefs, save, loading } = useUserPreferences();
  const { user } = useAuth();
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);

  const update = async <K extends keyof typeof prefs>(k: K, v: (typeof prefs)[K]) => {
    try { await save({ [k]: v } as any); }
    catch (e: any) { toast({ variant: "destructive", title: "Couldn't save", description: e.message }); }
  };

  const exportData = async () => {
    if (!user) return;
    setExporting(true);
    try {
      const tables = ["profiles", "onboarding_data", "outcomes_data", "admissions_data", "application_entries", "journey_scores", "readiness_analyses"];
      const out: Record<string, any> = {};
      for (const t of tables) {
        const { data } = await supabase.from(t as any).select("*").eq("user_id", user.id);
        out[t] = data || [];
      }
      const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pathforge-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Export ready", description: "Your data has been downloaded." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Export failed", description: e.message });
    } finally {
      setExporting(false);
    }
  };

  return (
    <SettingsSection title="Privacy" description="Control who sees your profile and how your data is used.">
      <SettingsCard title="Visibility">
        <SettingsRow label="Profile visibility" description="Who can see your profile basics (name, school, major).">
          <Select value={prefs.profile_visibility} onValueChange={(v) => update("profile_visibility", v as any)} disabled={loading}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="private">Private</SelectItem>
              <SelectItem value="school">My school</SelectItem>
              <SelectItem value="public">Public</SelectItem>
            </SelectContent>
          </Select>
        </SettingsRow>
        <SettingsRow label="Activity visibility" description="Who can see your activities, projects, and outcomes.">
          <Select value={prefs.activity_visibility} onValueChange={(v) => update("activity_visibility", v as any)} disabled={loading}>
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
        >
          <Switch checked={prefs.ai_personalization} onCheckedChange={(v) => update("ai_personalization", v)} disabled={loading} />
        </SettingsRow>
      </SettingsCard>

      <SettingsCard title="Notifications">
        <SettingsRow label="Product updates" description="New features and improvements.">
          <Switch checked={prefs.notify_product_updates} onCheckedChange={(v) => update("notify_product_updates", v)} disabled={loading} />
        </SettingsRow>
        <SettingsRow label="Deadline reminders" description="Application and scholarship deadlines.">
          <Switch checked={prefs.notify_deadlines} onCheckedChange={(v) => update("notify_deadlines", v)} disabled={loading} />
        </SettingsRow>
        <SettingsRow label="Weekly summary" description="A short recap of your weekly progress.">
          <Switch checked={prefs.notify_weekly_summary} onCheckedChange={(v) => update("notify_weekly_summary", v)} disabled={loading} />
        </SettingsRow>
        <SettingsRow label="Marketing emails" description="Promotions and partner content.">
          <Switch checked={prefs.notify_marketing} onCheckedChange={(v) => update("notify_marketing", v)} disabled={loading} />
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
