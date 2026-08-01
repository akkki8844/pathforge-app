// Admin Settings hub. Combines existing admin controls (plan limits, AI usage,
// feature flags) into one navigation surface and adds a small platform_settings
// row for sender name + default announcement audience/priority + signup gating.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, Settings as SettingsIcon, Gauge, ToggleLeft, ShieldAlert, ArrowRight, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import type { AdminSection } from "./AdminSidebar";
import { SlidersHorizontal as SlidersAlias } from "lucide-react";

interface PlatformSettings {
  email_sender_name: string;
  default_announcement_audience: string;
  default_announcement_priority: string;
  signups_enabled: boolean;
  guest_mode_enabled: boolean;
}

interface Props {
  onNavigate: (section: AdminSection) => void;
}

const DEFAULTS: PlatformSettings = {
  email_sender_name: "Pathforge",
  default_announcement_audience: "all",
  default_announcement_priority: "info",
  signups_enabled: true,
  guest_mode_enabled: true,
};

export function AdminSettings({ onNavigate }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULTS);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase.from as any)("platform_settings").select("*").eq("id", 1).maybeSingle();
      if (data) setSettings(data as PlatformSettings);
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await (supabase.from as any)("platform_settings")
      .update({
        email_sender_name: settings.email_sender_name.trim() || "Pathforge",
        default_announcement_audience: settings.default_announcement_audience,
        default_announcement_priority: settings.default_announcement_priority,
        signups_enabled: settings.signups_enabled,
        guest_mode_enabled: settings.guest_mode_enabled,
      })
      .eq("id", 1);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Settings saved");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  const hubLinks: { id: AdminSection; label: string; description: string; icon: React.ElementType }[] = [
    { id: "ai-control", label: "AI Plan Limits", description: "Default daily credits per plan tier (free/pro).", icon: SlidersHorizontal },
    { id: "ai-usage-control", label: "AI Usage Control", description: "Per-user credit overrides, resets, and bonus grants.", icon: Gauge },
    { id: "ai-usage", label: "AI Usage Logs", description: "All AI requests, tokens used, and per-feature breakdown.", icon: SlidersHorizontal },
    { id: "feature-flags", label: "Feature Flags", description: "Enable, disable, or roll out features to specific users.", icon: ToggleLeft },
    { id: "moderation", label: "Roles & Moderation", description: "Suspend, ban, or warn users; manage role assignments.", icon: ShieldAlert },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 text-accent" /> Platform Settings
        </h2>
        <p className="text-sm text-muted-foreground">
          Configure global defaults and jump to deeper controls.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Email & Branding</CardTitle>
          <CardDescription>Used across transactional emails sent by the platform.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 max-w-md">
            <Label>Email sender name</Label>
            <Input
              value={settings.email_sender_name}
              onChange={(e) => setSettings({ ...settings, email_sender_name: e.target.value })}
              placeholder="Pathforge"
              maxLength={60}
            />
            <p className="text-xs text-muted-foreground">Shown as the "From" name on outgoing emails.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Announcement Defaults</CardTitle>
          <CardDescription>Pre-fill values when an admin or counsellor opens the announcement composer.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4 max-w-2xl">
            <div className="space-y-2">
              <Label>Default audience</Label>
              <Select
                value={settings.default_announcement_audience}
                onValueChange={(v) => setSettings({ ...settings, default_announcement_audience: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All users</SelectItem>
                  <SelectItem value="onboarded">Onboarded only</SelectItem>
                  <SelectItem value="new">New users only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Default priority</Label>
              <Select
                value={settings.default_announcement_priority}
                onValueChange={(v) => setSettings({ ...settings, default_announcement_priority: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Access</CardTitle>
          <CardDescription>Gate platform entry without code changes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between max-w-2xl">
            <div>
              <Label className="text-sm font-medium">New signups enabled</Label>
              <p className="text-xs text-muted-foreground">When off, only existing users can sign in.</p>
            </div>
            <Switch
              checked={settings.signups_enabled}
              onCheckedChange={(v) => setSettings({ ...settings, signups_enabled: v })}
            />
          </div>
          <div className="flex items-center justify-between max-w-2xl">
            <div>
              <Label className="text-sm font-medium">Guest mode</Label>
              <p className="text-xs text-muted-foreground">Allow anonymous browsing without an account.</p>
            </div>
            <Switch
              checked={settings.guest_mode_enabled}
              onCheckedChange={(v) => setSettings({ ...settings, guest_mode_enabled: v })}
            />
          </div>
        </CardContent>
      </Card>

      <div>
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save settings
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">More controls</CardTitle>
          <CardDescription>Open dedicated panels for fine-grained configuration.</CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-3">
          {hubLinks.map((link) => {
            const Icon = link.icon;
            return (
              <button
                key={link.id}
                onClick={() => onNavigate(link.id)}
                className="text-left p-4 rounded-lg border border-border hover:border-accent hover:bg-muted/40 transition-colors group"
              >
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-md bg-accent/10 text-accent flex items-center justify-center flex-shrink-0">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-sm">{link.label}</div>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-accent transition-colors" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{link.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
