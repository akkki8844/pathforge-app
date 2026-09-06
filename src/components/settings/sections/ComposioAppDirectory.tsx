import { Link } from "react-router-dom";
import { Check, Loader2, Lock, Plug, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useComposioConnection } from "@/hooks/useComposioConnection";
import { useServiceApiKey } from "@/hooks/useServiceApiKey";
import { useToast } from "@/hooks/use-toast";
import { COMPOSIO_APPS, COMPOSIO_GROUPS, type ComposioApp } from "@/lib/connectors/composioApps";
import { cn } from "@/lib/utils";

/**
 * Everything else Composio can connect.
 *
 * One API key — the one already pasted on the Gmail card in Connectors —
 * unlocks every app here, so they are listed together rather than as a dozen
 * more top-level cards. Each connection is the student's own: their Composio
 * account, their OAuth grant, their quota. All of them are free to connect,
 * and none of them cost Pathforge or the student anything.
 *
 * The slugs are checked again server-side in `composio-connect-init`; this
 * list is the menu, not the gate.
 */
export function ComposioAppDirectory({ locked }: { locked?: boolean }) {
  const { keyInfo } = useServiceApiKey("composio");
  const hasKey = !!keyInfo;

  return (
    <div className="mt-8">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-border bg-muted/60">
          <Plug className="h-4 w-4 text-foreground" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">More apps, via Composio</h3>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
            The same Composio API key you saved on the Gmail card connects all of these. Every one is
            free — Composio's free tier plus a free account on the service itself — and each
            connection runs on your own account, never a shared Pathforge key.
            {!hasKey && " Add your Composio API key above to enable them."}
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-6">
        {COMPOSIO_GROUPS.map((group) => {
          const apps = COMPOSIO_APPS.filter((a) => a.group === group);
          if (apps.length === 0) return null;
          return (
            <div key={group}>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {group}
              </p>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                {apps.map((app) => (
                  <ComposioAppCard key={app.slug} app={app} locked={locked} hasKey={hasKey} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ComposioAppCard({
  app,
  locked,
  hasKey,
}: {
  app: ComposioApp;
  locked?: boolean;
  hasKey: boolean;
}) {
  const { connection, loading, busy, connect, disconnect } = useComposioConnection(app.slug);
  const { toast } = useToast();
  const isActive = connection?.status === "ACTIVE";

  const handleConnect = async () => {
    try {
      await connect();
      toast({
        title: `${app.name} sign-in opened`,
        description: "Finish authorizing in the popup, then come back here.",
      });
    } catch (e) {
      toast({
        variant: "destructive",
        title: `Couldn't start ${app.name} authorization`,
        description: e instanceof Error ? e.message : "Please try again.",
      });
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      toast({ title: `${app.name} disconnected` });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Couldn't disconnect",
        description: e instanceof Error ? e.message : "Please try again.",
      });
    }
  };

  return (
    <div className={cn("rounded-xl border border-border bg-card p-4", (locked || !hasKey) && "opacity-70")}>
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-sm font-semibold text-foreground">{app.name}</h4>
        {!locked && isActive && (
          <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
            <Check className="h-2.5 w-2.5" /> Connected
          </span>
        )}
        {!locked && !isActive && !!connection && (
          <span className="rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            Authorization unfinished
          </span>
        )}
        <span className="ml-auto rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          Free
        </span>
      </div>

      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{app.use}</p>

      {isActive && connection?.account_email && (
        <p className="mt-2 truncate text-[11px] text-muted-foreground">
          Connected as {connection.account_email}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {locked ? (
          <Button asChild size="sm" variant="outline">
            <Link to="/pricing">
              <Lock className="mr-2 h-3.5 w-3.5" />
              Upgrade to unlock
            </Link>
          </Button>
        ) : (
          <>
            <Button
              onClick={handleConnect}
              disabled={!hasKey || busy || loading}
              size="sm"
              variant={isActive ? "outline" : "default"}
              title={hasKey ? undefined : "Add your Composio API key on the Gmail card first"}
            >
              {busy && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              {isActive ? "Reconnect" : `Connect ${app.name}`}
            </Button>
            {connection && (
              <Button onClick={handleDisconnect} disabled={busy} variant="ghost" size="sm">
                <Unplug className="mr-2 h-3.5 w-3.5" />
                Disconnect
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
