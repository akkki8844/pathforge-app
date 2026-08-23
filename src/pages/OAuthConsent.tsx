import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Seo } from "@/components/Seo";

// Supabase Auth (acting as OAuth 2.1 server) redirects here after a client
// like ChatGPT or Claude requests authorization. The user approves or denies,
// and we redirect back to the URL Supabase gives us. See
// `app-mcp-server-authoring` for the full protocol.

type OAuthNS = {
  getAuthorizationDetails: (id: string) => Promise<{
    data: { client?: { name?: string; logo_uri?: string }; redirect_url?: string; redirect_to?: string; scopes?: string[] } | null;
    error: { message: string } | null;
  }>;
  approveAuthorization: (id: string) => Promise<{
    data: { redirect_url?: string; redirect_to?: string } | null;
    error: { message: string } | null;
  }>;
  denyAuthorization: (id: string) => Promise<{
    data: { redirect_url?: string; redirect_to?: string } | null;
    error: { message: string } | null;
  }>;
};

function oauth(): OAuthNS {
  // The `auth.oauth` namespace is beta in @supabase/supabase-js and not fully
  // typed. Narrow it locally instead of touching the auto-generated client.
  return (supabase.auth as unknown as { oauth: OAuthNS }).oauth;
}

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<Awaited<ReturnType<OAuthNS["getAuthorizationDetails"]>>["data"]>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Missing authorization_id");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        // Preserve the FULL consent URL so auth returns the user here.
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?redirect=" + encodeURIComponent(next);
        return;
      }
      try {
        const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
        if (!active) return;
        if (error) return setError(error.message);
        const immediate = data?.redirect_url ?? data?.redirect_to;
        if (immediate && !data?.client) {
          window.location.href = immediate;
          return;
        }
        setDetails(data);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Failed to load authorization request");
      }
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    try {
      const { data, error } = approve
        ? await oauth().approveAuthorization(authorizationId)
        : await oauth().denyAuthorization(authorizationId);
      if (error) {
        setBusy(false);
        return setError(error.message);
      }
      const target = data?.redirect_url ?? data?.redirect_to;
      if (!target) {
        setBusy(false);
        return setError("No redirect returned by the authorization server.");
      }
      window.location.href = target;
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  const clientName = details?.client?.name ?? "an app";

  return (
    <main className="min-h-[100svh] flex items-center justify-center bg-background px-4">
      <Seo title="Connect App — Pathforge" description="Approve or deny an app requesting access to your Pathforge account." />
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-8 shadow-xl">
        {error ? (
          <>
            <h1 className="text-xl font-semibold text-foreground">Couldn't load this request</h1>
            <p className="mt-3 text-sm text-muted-foreground">{error}</p>
          </>
        ) : !details ? (
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading authorization request…</span>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-semibold text-foreground">
              Connect <span className="text-accent">{clientName}</span> to your Pathforge account
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              This lets {clientName} act on Pathforge as you — reading your profile, journey progress, subscription, and
              saved readiness reports through Pathforge's agent tools.
            </p>
            <div className="mt-6 flex gap-3">
              <Button className="flex-1" onClick={() => decide(true)} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve"}
              </Button>
              <Button className="flex-1" variant="outline" onClick={() => decide(false)} disabled={busy}>
                Deny
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              You can revoke access anytime from your account settings.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
