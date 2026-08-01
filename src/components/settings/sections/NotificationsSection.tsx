import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Bell, Mail, MessageSquare, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { SettingsSection, SettingsCard, SettingsRow } from "../SettingsShell";
import { getNotifPrefs, setNotifPrefs, notifyTaskComplete } from "@/lib/notifyTask";

export function NotificationsSection() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState({ aiTasks: true, toasts: true });
  const [emailDigest, setEmailDigest] = useState(false);
  const [productUpdates, setProductUpdates] = useState(true);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (!user) return;
    setPrefs(getNotifPrefs(user.id));
  }, [user]);

  const update = (next: Partial<typeof prefs>) => {
    if (!user) return;
    const merged = { ...prefs, ...next };
    setPrefs(merged);
    setNotifPrefs(user.id, merged);
  };

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
        description="Live updates that appear in the bell menu and as on-screen toasts."
      >
        <SettingsRow
          label="AI task completion"
          description="Resume generation, essay refinement, evaluations and other AI work."
        >
          <div className="flex items-center gap-3">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <Switch checked={prefs.aiTasks} onCheckedChange={(v) => update({ aiTasks: v })} />
          </div>
        </SettingsRow>
        <SettingsRow
          label="Pop-up toasts"
          description="Show a brief on-screen toast in addition to the notification bell."
        >
          <div className="flex items-center gap-3">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <Switch checked={prefs.toasts} onCheckedChange={(v) => update({ toasts: v })} />
          </div>
        </SettingsRow>
        <SettingsRow
          label="Send a test"
          description="Trigger a sample notification to verify everything is wired up."
        >
          <Button size="sm" variant="outline" onClick={sendTest} disabled={testing} className="gap-2">
            {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bell className="h-3.5 w-3.5" />}
            Send test
          </Button>
        </SettingsRow>
      </SettingsCard>

      <SettingsCard title="Email" description="Choose what hits your inbox.">
        <SettingsRow
          label="Weekly progress digest"
          description="A Monday recap of completed activities, planner adherence, and CRS movement."
        >
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <Switch checked={emailDigest} onCheckedChange={setEmailDigest} />
          </div>
        </SettingsRow>
        <SettingsRow
          label="Product announcements"
          description="New features, model upgrades, and meaningful platform changes."
        >
          <Switch checked={productUpdates} onCheckedChange={setProductUpdates} />
        </SettingsRow>
      </SettingsCard>
    </SettingsSection>
  );
}
