import { useState } from "react";
import { Mail, Loader2, Check, Unplug, Upload, ExternalLink, Lock, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLinkedInImport, notifyLinkedInImported } from "@/hooks/useLinkedInImport";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/hooks/useCredits";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { GoogleCalendarMark } from "@/components/GoogleCalendarCard";
import { ImportLinkedInModal } from "@/components/ImportLinkedInModal";
import { SettingsSection } from "../SettingsShell";
import linkedinLogo from "@/assets/linkedin-logo.png";
import { planTierFromString, tierSatisfies } from "@/lib/plans";

export function ConnectorsSection() {
  const { creditData, loading } = useCredits();
  const plan = (creditData?.plan || "free").toLowerCase();
  const hasAccess = creditData?.isAdmin || tierSatisfies(planTierFromString(plan), "pro");

  if (!loading && !hasAccess) {
    return (
      <SettingsSection
        title="Connectors"
        description="LinkedIn, Google Calendar, email and more — connect external accounts to enrich your profile and sync your week."
      >
        <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center flex-shrink-0">
              <Lock className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold text-foreground">Connectors are a Pro feature</h3>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                Upgrade to Pro to link your LinkedIn, Google Calendar, Google account and email. Your free plan still keeps full AI access for everything else.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button asChild size="sm" className="btn-accent">
                  <Link to="/pricing">
                    <Sparkles className="h-4 w-4 mr-1.5" />
                    See plans
                  </Link>
                </Button>
                <span className="text-xs text-muted-foreground">
                  Current plan: <span className="capitalize font-medium text-foreground">{plan}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </SettingsSection>
    );
  }

  return (
    <SettingsSection title="Connectors" description="All Pathforge integrations live here. Connect or disconnect external services in one place.">
      <div className="grid gap-4">
        <LinkedInConnector />
        <GoogleCalendarConnector />
        <GoogleAccountConnector />
        <EmailConnector />
      </div>
    </SettingsSection>
  );
}

function ConnectorCard({
  icon,
  name,
  description,
  status,
  meta,
  actions,
}: {
  icon: React.ReactNode;
  name: string;
  description: string;
  status: "connected" | "disconnected" | "info";
  meta?: string;
  actions: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <div className="h-10 w-10 rounded-xl bg-muted/60 border border-border flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-foreground">{name}</h3>
            {status === "connected" && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Check className="h-2.5 w-2.5" /> Connected
              </span>
            )}
            {status === "disconnected" && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">
                Not connected
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
          {meta && <p className="text-[11px] text-muted-foreground mt-2">{meta}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-2">{actions}</div>
        </div>
      </div>
    </div>
  );
}

function GoogleCalendarConnector() {
  return (
    <ConnectorCard
      icon={<GoogleCalendarMark className="h-5 w-5 opacity-60" />}
      name="Google Calendar"
      description="Sync events from your Google Calendar into the Pathforge Weekly Planner."
      status="info"
      meta={undefined}
      actions={
        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-md bg-muted text-muted-foreground border border-border select-none">
          Coming Soon
        </span>
      }
    />
  );
}

function LinkedInConnector() {
  const { user } = useAuth();
  const { linkedinImport, loading, refetch } = useLinkedInImport();
  const { toast } = useToast();
  const [removing, setRemoving] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const remove = async () => {
    if (!user) return;
    setRemoving(true);
    const { error } = await supabase.from("linkedin_imports").delete().eq("user_id", user.id);
    setRemoving(false);
    if (error) return toast({ variant: "destructive", title: "Failed", description: error.message });
    notifyLinkedInImported();
    await refetch();
    toast({ title: "LinkedIn data removed" });
  };

  return (
    <>
      <ConnectorCard
        icon={<img src={linkedinLogo} alt="LinkedIn" className="h-5 w-5 rounded-sm" />}
        name="LinkedIn"
        description="Import your LinkedIn profile to auto-fill outcomes, applications, and recommendations."
        status={loading ? "info" : linkedinImport ? "connected" : "disconnected"}
        meta={
          linkedinImport
            ? `Last imported ${new Date(linkedinImport.updated_at).toLocaleDateString()}`
            : undefined
        }
        actions={
          <>
            <Button onClick={() => setShowImport(true)} size="sm" variant={linkedinImport ? "outline" : "default"}>
              <Upload className="h-3.5 w-3.5 mr-2" />
              {linkedinImport ? "Re-import" : "Import LinkedIn"}
            </Button>
            {linkedinImport && (
              <Button onClick={remove} disabled={removing} variant="ghost" size="sm">
                {removing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <Unplug className="h-3.5 w-3.5 mr-2" />}
                Remove
              </Button>
            )}
          </>
        }
      />
      <ImportLinkedInModal
        open={showImport}
        onOpenChange={setShowImport}
        onImported={() => { void refetch(); }}
      />
    </>
  );
}

function GoogleAccountConnector() {
  const { user } = useAuth();
  const isGoogle =
    !!user?.app_metadata?.providers?.includes?.("google") ||
    user?.app_metadata?.provider === "google";

  return (
    <ConnectorCard
      icon={<GoogleMark className="h-5 w-5" />}
      name="Google account"
      description={
        isGoogle
          ? "You sign in to Pathforge with Google."
          : "Use \u201CContinue with Google\u201D on the sign-in page to link your Google account."
      }
      status={isGoogle ? "connected" : "disconnected"}
      meta={isGoogle ? `Linked to ${user?.email}` : undefined}
      actions={
        <Button asChild variant="outline" size="sm">
          <Link to="/auth">
            Manage sign-in <ExternalLink className="h-3 w-3 ml-2" />
          </Link>
        </Button>
      }
    />
  );
}

function EmailConnector() {
  const { user } = useAuth();
  return (
    <ConnectorCard
      icon={<Mail className="h-5 w-5 text-foreground" />}
      name="Email notifications"
      description="Pathforge sends important updates and deadline reminders to your verified email."
      status="connected"
      meta={`Delivering to ${user?.email}`}
      actions={
        <Button asChild variant="outline" size="sm">
          <a href="mailto:pathforge.co@gmail.com?subject=Email%20notifications">
            Contact support
          </a>
        </Button>
      }
    />
  );
}

function GoogleMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.5-5.9 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.5-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.1l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.1z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.4-4.5 2.4-7.2 2.4-5.4 0-9.7-3.5-11.3-8l-6.5 5C9.6 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.6l6.2 5.2c-.4.4 6.7-4.9 6.7-14.8 0-1.3-.1-2.5-.4-3.5z" />
    </svg>
  );
}
