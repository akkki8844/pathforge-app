import { useState } from "react";
import { Mail, Loader2, Check, Unplug, Upload, ExternalLink, Lock, Sparkles, RefreshCw, Zap, KeyRound, Pencil } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLinkedInImport, notifyLinkedInImported } from "@/hooks/useLinkedInImport";
import { useGitHubConnection } from "@/hooks/useGitHubConnection";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { useComposioConnection } from "@/hooks/useComposioConnection";
import { useServiceApiKey } from "@/hooks/useServiceApiKey";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/hooks/useCredits";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { GoogleCalendarMark } from "@/components/GoogleCalendarCard";
import { ImportLinkedInModal } from "@/components/ImportLinkedInModal";
import { SettingsSection } from "../SettingsShell";
import linkedinLogo from "@/assets/linkedin-logo.png";
import { planTierFromString, tierSatisfies } from "@/lib/plans";
import { cn } from "@/lib/utils";

export function ConnectorsSection() {
  const { creditData, loading: creditsLoading } = useCredits();
  const plan = (creditData?.plan || "free").toLowerCase();
  const hasAccess = creditData?.isAdmin || tierSatisfies(planTierFromString(plan), "pro");

  // While credits are in flight `creditData` is undefined, which read as
  // plan="free" — so Pro and admin users watched the whole section render
  // locked behind an "upgrade" banner for a beat before it flipped. Treat
  // "not known yet" as neither locked nor unlocked.
  const locked = !creditsLoading && !hasAccess;

  return (
    <SettingsSection
      title="Connectors"
      description="All Pathforge integrations live here. Connect or disconnect external services in one place."
    >
      {locked && (
        <div className="mb-4 rounded-xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center flex-shrink-0">
              <Lock className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold text-foreground">Connectors are a Pro feature</h3>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                Here's what you'll unlock on Pro. Upgrade to connect LinkedIn, GitHub, Google Calendar, your Google account and email — your free plan still keeps full AI access for everything else.
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
      )}
      <div className="grid gap-4">
        <LinkedInConnector locked={locked} />
        <GitHubConnector locked={locked} />
        <GoogleCalendarConnector locked={locked} />
        <GoogleAccountConnector locked={locked} />
        <ComposioGmailConnector locked={locked} />
        <EmailConnector locked={locked} />
      </div>
    </SettingsSection>
  );
}

function LockedAction() {
  return (
    <Button asChild size="sm" variant="outline">
      <Link to="/pricing">
        <Lock className="h-3.5 w-3.5 mr-2" />
        Upgrade to unlock
      </Link>
    </Button>
  );
}

function ConnectorCard({
  icon,
  name,
  description,
  status,
  meta,
  actions,
  locked,
}: {
  icon: React.ReactNode;
  name: string;
  description: string;
  status: "connected" | "disconnected" | "info";
  meta?: string;
  actions: React.ReactNode;
  locked?: boolean;
}) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-5 sm:p-6", locked && "opacity-70")}>
      <div className="flex items-start gap-4">
        <div className="h-10 w-10 rounded-xl bg-muted/60 border border-border flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-foreground">{name}</h3>
            {locked ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">
                <Lock className="h-2.5 w-2.5" /> Pro
              </span>
            ) : (
              <>
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
              </>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
          {meta && !locked && <p className="text-[11px] text-muted-foreground mt-2">{meta}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-2">{locked ? <LockedAction /> : actions}</div>
        </div>
      </div>
    </div>
  );
}

function GitHubConnector({ locked }: { locked?: boolean }) {
  const { connection, loading, busy, connect, disconnect } = useGitHubConnection();
  const { toast } = useToast();

  const handleConnect = async () => {
    try {
      await connect();
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Couldn't start GitHub sign-in",
        description: e instanceof Error ? e.message : "Please try again.",
      });
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      toast({ title: "GitHub disconnected" });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Couldn't disconnect GitHub",
        description: e instanceof Error ? e.message : "Please try again.",
      });
    }
  };

  return (
    <ConnectorCard
      icon={<GitHubMark className="h-5 w-5 text-foreground" />}
      name="GitHub"
      description="Link your GitHub account so Pathforge can pull your repositories and projects into your profile and applications."
      status={loading ? "info" : connection ? "connected" : "disconnected"}
      meta={connection ? `Connected as @${connection.github_login ?? "unknown"}` : undefined}
      locked={locked}
      actions={
        <>
          <Button onClick={handleConnect} disabled={busy} size="sm" variant={connection ? "outline" : "default"}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <GitHubMark className="h-3.5 w-3.5 mr-2" />}
            {connection ? "Reconnect" : "Connect GitHub"}
          </Button>
          {connection && (
            <Button onClick={handleDisconnect} disabled={busy} variant="ghost" size="sm">
              <Unplug className="h-3.5 w-3.5 mr-2" />
              Disconnect
            </Button>
          )}
        </>
      }
    />
  );
}

function GitHubMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

/**
 * This card used to be a hardcoded "Coming Soon" badge — no hook, no state,
 * no way to connect — even though useGoogleCalendar, the google-oauth-init /
 * google-oauth-callback / google-calendar-sync edge functions and the
 * user_google_tokens table were all already live and working. Users on Pro
 * were paying for a connector the settings page refused to expose.
 */
function GoogleCalendarConnector({ locked }: { locked?: boolean }) {
  const { connection, loading, busy, connect, disconnect, syncEvents } = useGoogleCalendar();
  const { toast } = useToast();
  const [syncing, setSyncing] = useState(false);

  const handleConnect = async () => {
    try {
      await connect();
      toast({
        title: "Google sign-in opened",
        description: "Finish authorizing in the popup, then come back here.",
      });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Couldn't start Google authorization",
        description: e instanceof Error ? e.message : "Please try again.",
      });
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      toast({ title: "Google Calendar disconnected" });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Couldn't disconnect",
        description: e instanceof Error ? e.message : "Please try again.",
      });
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await syncEvents();
      toast({
        title: "Calendar synced",
        description: `Imported ${res.imported} event${res.imported === 1 ? "" : "s"} from the last ${res.weeks} weeks.`,
      });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Sync failed",
        description: e instanceof Error ? e.message : "Please try again.",
      });
    } finally {
      setSyncing(false);
    }
  };

  const needsReauth = !!connection && !connection.has_refresh_token;

  return (
    <ConnectorCard
      icon={<GoogleCalendarMark className="h-5 w-5" />}
      name="Google Calendar"
      description="Sync events from your Google Calendar into the Pathforge Weekly Planner, and push deadlines back to your calendar. Tokens are stored per-user and never leave the server."
      status={loading ? "info" : connection ? "connected" : "disconnected"}
      meta={
        connection
          ? needsReauth
            ? `Connected as ${connection.google_email ?? "your Google account"} — reconnect to restore background sync.`
            : `Connected as ${connection.google_email ?? "your Google account"}`
          : undefined
      }
      locked={locked}
      actions={
        <>
          <Button
            onClick={handleConnect}
            disabled={busy || loading}
            size="sm"
            variant={connection && !needsReauth ? "outline" : "default"}
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
            ) : (
              <GoogleCalendarMark className="h-3.5 w-3.5 mr-2" />
            )}
            {connection ? "Reconnect" : "Connect Google Calendar"}
          </Button>
          {connection && (
            <>
              <Button onClick={handleSync} disabled={syncing || busy} variant="outline" size="sm">
                {syncing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5 mr-2" />
                )}
                Sync now
              </Button>
              <Button onClick={handleDisconnect} disabled={busy} variant="ghost" size="sm">
                <Unplug className="h-3.5 w-3.5 mr-2" />
                Disconnect
              </Button>
            </>
          )}
        </>
      }
    />
  );
}

function LinkedInConnector({ locked }: { locked?: boolean }) {
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
        locked={locked}
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

function GoogleAccountConnector({ locked }: { locked?: boolean }) {
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
      locked={locked}
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

/**
 * A bring-your-own-key field for a third-party service Pathforge doesn't
 * hold a shared key for. The raw value is write-only from here on: once
 * saved, the DB never returns it to the client again (see
 * user_service_api_keys' column grants) — this just shows "saved, ending in
 * 8f2a" and lets the user overwrite or remove it.
 */
function ApiKeyField({
  service,
  label,
  helpUrl,
  disabled,
}: {
  service: string;
  label: string;
  helpUrl: string;
  disabled?: boolean;
}) {
  const { keyInfo, loading, busy, save, remove } = useServiceApiKey(service);
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");

  const handleSave = async () => {
    try {
      await save(value);
      setValue("");
      setEditing(false);
      toast({ title: `${label} saved` });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Couldn't save key",
        description: e instanceof Error ? e.message : "Please try again.",
      });
    }
  };

  const handleRemove = async () => {
    try {
      await remove();
      toast({ title: `${label} removed` });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Couldn't remove key",
        description: e instanceof Error ? e.message : "Please try again.",
      });
    }
  };

  if (loading) return null;

  if (keyInfo && !editing) {
    return (
      <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-2.5 py-1.5 text-xs">
        <KeyRound className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="flex-1 min-w-0 truncate text-muted-foreground">
          {label} saved · ending in <span className="font-mono text-foreground">{keyInfo.key_last4}</span>
        </span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          disabled={disabled}
          className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-background hover:text-foreground transition-colors disabled:opacity-50"
          aria-label={`Change ${label}`}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={handleRemove}
          disabled={disabled || busy}
          className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-background hover:text-destructive transition-colors disabled:opacity-50"
          aria-label={`Remove ${label}`}
        >
          <Unplug className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={label}
          disabled={disabled || busy}
          className="h-8 text-xs"
        />
        <Button onClick={handleSave} disabled={disabled || busy || !value.trim()} size="sm" className="shrink-0">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
        </Button>
        {keyInfo && (
          <Button onClick={() => setEditing(false)} disabled={busy} variant="ghost" size="sm" className="shrink-0">
            Cancel
          </Button>
        )}
      </div>
      <a
        href={helpUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
      >
        Get a key <ExternalLink className="h-2.5 w-2.5" />
      </a>
    </div>
  );
}

/**
 * Composio-managed Gmail connection. Distinct from `EmailConnector` below,
 * which just names the address Pathforge's own notifications go to — this
 * one lets the Advisor act as the user's Gmail account (e.g. sending a cold
 * email it drafted), via Composio's OAuth flow.
 *
 * Pathforge holds no shared Composio key: each user pastes their own (free)
 * key from composio.dev below, and everything after that runs on their
 * account, not ours.
 */
function ComposioGmailConnector({ locked }: { locked?: boolean }) {
  const { connection, loading, busy, connect, disconnect } = useComposioConnection("gmail");
  const { keyInfo: composioKey } = useServiceApiKey("composio");
  const { toast } = useToast();

  const isActive = connection?.status === "ACTIVE";
  const isPending = !!connection && !isActive;
  const hasKey = !!composioKey;

  const handleConnect = async () => {
    try {
      await connect();
      toast({
        title: "Gmail sign-in opened",
        description: "Finish authorizing in the popup, then come back here.",
      });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Couldn't start Gmail authorization",
        description: e instanceof Error ? e.message : "Please try again.",
      });
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      toast({ title: "Gmail disconnected from the Advisor" });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Couldn't disconnect",
        description: e instanceof Error ? e.message : "Please try again.",
      });
    }
  };

  return (
    <ConnectorCard
      icon={<Zap className="h-5 w-5 text-foreground" />}
      name="Gmail (for the Advisor)"
      description="Connect your Gmail through Composio so the Advisor can send email from your account — for example, cold-emailing professors it finds for you. Uses your own free Composio API key, not a shared one."
      status={loading ? "info" : isActive ? "connected" : "disconnected"}
      meta={
        connection
          ? isActive
            ? `Connected as ${connection.account_email ?? "your Gmail account"}`
            : isPending
              ? "Authorization not completed — reconnect to finish."
              : undefined
          : undefined
      }
      locked={locked}
      actions={
        <div className="w-full space-y-3">
          <ApiKeyField
            service="composio"
            label="Composio API key"
            helpUrl="https://app.composio.dev"
            disabled={locked}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={handleConnect}
              disabled={busy || loading || !hasKey}
              size="sm"
              variant={isActive ? "outline" : "default"}
              title={hasKey ? undefined : "Add your Composio API key above first"}
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <Zap className="h-3.5 w-3.5 mr-2" />}
              {isActive ? "Reconnect" : "Connect Gmail"}
            </Button>
            {connection && (
              <Button onClick={handleDisconnect} disabled={busy} variant="ghost" size="sm">
                <Unplug className="h-3.5 w-3.5 mr-2" />
                Disconnect
              </Button>
            )}
          </div>
        </div>
      }
    />
  );
}

function EmailConnector({ locked }: { locked?: boolean }) {
  const { user } = useAuth();
  return (
    <ConnectorCard
      icon={<Mail className="h-5 w-5 text-foreground" />}
      name="Email notifications"
      description="Pathforge sends important updates and deadline reminders to your verified email."
      status="connected"
      meta={`Delivering to ${user?.email}`}
      locked={locked}
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
