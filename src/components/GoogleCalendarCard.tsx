import { Loader2, Check, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { toast } from "sonner";
import googleCalendarLogo from "@/assets/google-calendar-logo.png";

/**
 * Per-user Google Calendar connection card.
 * Each student authorizes their own Google account; tokens are stored per-user with RLS.
 */
export function GoogleCalendarCard() {
  const { connection, loading, busy, connect, disconnect } = useGoogleCalendar();

  const handleConnect = async () => {
    try {
      await connect();
      toast.info("A Google sign-in tab opened. Complete authorization, then return here.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start Google authorization.");
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      toast.success("Disconnected from Google Calendar.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not disconnect.");
    }
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6">
      <div className="flex items-start gap-4">
        <div className="h-10 w-10 rounded-xl bg-muted/60 border border-border/60 flex items-center justify-center flex-shrink-0">
          <GoogleCalendarMark className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-foreground">Google Calendar</h3>
            {connection && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Check className="h-3 w-3" /> Connected
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            Connect your own Google Calendar so deadlines, planner blocks, and scholarship dates can be added to your calendar with one click. Your tokens are stored privately and only you can use them.
          </p>
          {connection?.google_email && (
            <p className="text-xs text-muted-foreground mt-2">
              Connected as <span className="font-medium text-foreground">{connection.google_email}</span>
            </p>
          )}
          <div className="mt-4 flex items-center gap-2">
            {loading ? (
              <Button disabled variant="outline" size="sm">
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> Checking…
              </Button>
            ) : connection ? (
              <Button onClick={handleDisconnect} disabled={busy} variant="outline" size="sm">
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <Unplug className="h-3.5 w-3.5 mr-2" />}
                Disconnect
              </Button>
            ) : (
              <Button onClick={handleConnect} disabled={busy} size="sm">
                {busy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                ) : (
                  <GoogleCalendarMark className="h-3.5 w-3.5 mr-2" />
                )}
                Connect Google Calendar
              </Button>
            )}
            {!connection && !loading && (
              <span className="text-[11px] text-muted-foreground">
                Opens Google in a new tab.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Official Google Calendar mark — minimal, monochrome-friendly fallback to colored. */
function GoogleCalendarMark({ className = "" }: { className?: string }) {
  return <img src={googleCalendarLogo} alt="Google Calendar" className={className} />;
}

export { GoogleCalendarMark };

/** Smaller "Add to Google Calendar" inline button — used elsewhere. */
export function AddToGoogleCalendarButton({
  event,
  size = "sm",
  variant = "outline",
  label = "Add to Google Calendar",
}: {
  event: {
    summary: string;
    description?: string;
    location?: string;
    start: string;
    end?: string;
    allDay?: boolean;
    url?: string;
  };
  size?: "sm" | "default";
  variant?: "default" | "outline" | "ghost";
  label?: string;
}) {
  const { connection, addEvent, connect } = useGoogleCalendar();

  const handle = async () => {
    if (!connection) {
      toast.info("Connect your Google Calendar first (Profile → Integrations).");
      try { await connect(); } catch { /* ignore */ }
      return;
    }
    try {
      const res = await addEvent(event);
      toast.success("Added to your Google Calendar.", {
        action: res.htmlLink ? { label: "Open", onClick: () => window.open(res.htmlLink, "_blank", "noopener") } : undefined,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add to calendar.");
    }
  };

  return (
    <Button onClick={handle} size={size} variant={variant}>
      <GoogleCalendarMark className="h-3.5 w-3.5 mr-2" />
      {label}
    </Button>
  );
}
