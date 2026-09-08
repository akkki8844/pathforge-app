import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Bell, Mail, MessageSquare, Loader2, Laptop } from "lucide-react";
import { toast } from "sonner";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { SettingsSection, SettingsCard, SettingsRow } from "../SettingsShell";
import { notifyTaskComplete } from "@/lib/notifyTask";
import { useSettingsForm, type SettingsDraft } from "../SettingsFormContext";

/**
 * All notification switches now live here.
 *
 * They used to be split across two sections: this one owned in-app alerts
 * (localStorage) plus a "weekly digest" and "product announcements" pair that
 * were pure `useState` and persisted nowhere, while Privacy owned a second,
 * differently-worded copy of the same four email preferences backed by
 * user_preferences. Toggling one never moved the other, so whichever you
 * looked at last appeared to be lying. One home, one source of truth.
 */
export function NotificationsSection() {
  const { draft, set, isDirty, loading } = useSettingsForm();
  const [testing, setTesting] = useState(false);

  const sendTest = async () => {
    setTesting(true);
    try {
      await notifyTaskComplete({
        title: "Test notification",
        message: "Pathforge alerts are working — you're all set.",
      });
    } catch {
      toast.error("Could not send test notification.");
    } finally {
      setTesting(false);
    }
  };

  return (
    <SettingsSection
      title="Notifications"
      description="Control how Pathforge keeps you in the loop on AI work and account activity."
    >
      <SettingsCard
        title="In-app alerts"
        description="Live updates that appear in the bell menu and as on-screen toasts. These are per-browser, so you can keep them loud on your laptop and quiet on a shared machine."
      >
        <SettingsRow
          label="AI task completion"
          description="Resume generation, essay refinement, evaluations and other AI work."
          dirty={isDirty("notify_ai_tasks")}
        >
          <div className="flex items-center gap-3">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <Switch
              checked={draft.notify_ai_tasks}
              onCheckedChange={(v) => set("notify_ai_tasks", v)}
              disabled={loading}
            />
          </div>
        </SettingsRow>
        <SettingsRow
          label="Pop-up toasts"
          description="Show a brief on-screen toast in addition to the notification bell."
          dirty={isDirty("notify_toasts")}
        >
          <div className="flex items-center gap-3">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <Switch
              checked={draft.notify_toasts}
              onCheckedChange={(v) => set("notify_toasts", v)}
              disabled={loading}
            />
          </div>
        </SettingsRow>
        <SettingsRow
          label="Send a test"
          description="Trigger a sample notification to verify everything is wired up. Uses your last saved settings, not unsaved edits."
        >
          <Button size="sm" variant="outline" onClick={sendTest} disabled={testing} className="gap-2">
            {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bell className="h-3.5 w-3.5" />}
            Send test
          </Button>
        </SettingsRow>
      </SettingsCard>

      {/*
        Reminders are the one category that can arrive on two channels, so they
        get their own card rather than being scattered between "in-app" and
        "email". Before this existed each reminder sender picked a channel by
        accident of how it was written — deadlines and planner nudges emailed
        and never reached the bell, recommender nudges reached the bell and
        never emailed — and the student had no say in either.
      */}
      <SettingsCard
        title="Reminders"
        description="Deadlines, planner activities and recommender follow-ups. Delivered in your own timezone, in the morning."
      >
        <SettingsRow
          label="How to reach you"
          description="Applies to every reminder below. Choose the bell, your inbox, or both."
          dirty={isDirty("reminder_channel")}
        >
          <Select
            value={draft.reminder_channel}
            onValueChange={(v) => set("reminder_channel", v as SettingsDraft["reminder_channel"])}
            disabled={loading}
          >
            <SelectTrigger className="w-[168px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="both">Email and in-app</SelectItem>
              <SelectItem value="email">Email only</SelectItem>
              <SelectItem value="in_app">In-app only</SelectItem>
              <SelectItem value="off">Don't remind me</SelectItem>
            </SelectContent>
          </Select>
        </SettingsRow>
        <SettingsRow
          label="Deadlines"
          description="Routine deadlines, application dates and recommender due dates."
          dirty={isDirty("notify_deadlines")}
        >
          <Switch
            checked={draft.notify_deadlines}
            onCheckedChange={(v) => set("notify_deadlines", v)}
            disabled={loading || draft.reminder_channel === "off"}
          />
        </SettingsRow>
        <SettingsRow
          label="Planner activities"
          description="A morning nudge for whatever you scheduled for the next day."
          dirty={isDirty("notify_activities")}
        >
          <Switch
            checked={draft.notify_activities}
            onCheckedChange={(v) => set("notify_activities", v)}
            disabled={loading || draft.reminder_channel === "off"}
          />
        </SettingsRow>
      </SettingsCard>

      <SettingsCard title="Email" description="Choose what hits your inbox. These follow your account across devices.">
        <SettingsRow
          label="Weekly progress digest"
          description="A Monday recap of completed activities, planner adherence, and CRS movement."
          dirty={isDirty("email_weekly_digest")}
        >
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <Switch
              checked={draft.email_weekly_digest}
              onCheckedChange={(v) => set("email_weekly_digest", v)}
              disabled={loading}
            />
          </div>
        </SettingsRow>
        <SettingsRow
          label="Weekly summary"
          description="A short recap of your weekly progress."
          dirty={isDirty("notify_weekly_summary")}
        >
          <Switch
            checked={draft.notify_weekly_summary}
            onCheckedChange={(v) => set("notify_weekly_summary", v)}
            disabled={loading}
          />
        </SettingsRow>
        {/* "Deadline reminders" used to live here as well. It now lives in the
            Reminders card above with its channel control — two switches bound
            to one column is exactly the split-source-of-truth bug this file's
            header describes. */}
        <SettingsRow
          label="Product announcements"
          description="New features, model upgrades, and meaningful platform changes."
          dirty={isDirty("notify_product_updates")}
        >
          <Switch
            checked={draft.notify_product_updates}
            onCheckedChange={(v) => set("notify_product_updates", v)}
            disabled={loading}
          />
        </SettingsRow>
        <SettingsRow
          label="Marketing emails"
          description="Promotions and partner content."
          dirty={isDirty("notify_marketing")}
        >
          <Switch
            checked={draft.notify_marketing}
            onCheckedChange={(v) => set("notify_marketing", v)}
            disabled={loading}
          />
        </SettingsRow>
      </SettingsCard>

      <p className="flex items-center gap-2 px-1 text-[12px] text-muted-foreground">
        <Laptop className="h-3.5 w-3.5" />
        In-app alerts apply to this browser only. Email preferences follow your account.
      </p>
    </SettingsSection>
  );
}
