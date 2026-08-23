import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type State =
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "already" }
  | { kind: "invalid" }
  | { kind: "submitting" }
  | { kind: "done" }
  | { kind: "error"; msg: string };

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    if (!token) {
      setState({ kind: "invalid" });
      return;
    }
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_KEY } }
        );
        const data = await res.json();
        if (data.valid) setState({ kind: "ready" });
        else if (data.reason === "already_unsubscribed") setState({ kind: "already" });
        else setState({ kind: "invalid" });
      } catch {
        setState({ kind: "error", msg: "Could not validate this link." });
      }
    })();
  }, [token]);

  const confirm = async () => {
    if (!token) return;
    setState({ kind: "submitting" });
    const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
      body: { token },
    });
    if (error) setState({ kind: "error", msg: error.message });
    else if (data?.success) setState({ kind: "done" });
    else if (data?.reason === "already_unsubscribed") setState({ kind: "already" });
    else setState({ kind: "error", msg: "Unsubscribe failed." });
  };

  return (
    <div className="min-h-[100svh] flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Email preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {state.kind === "loading" && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Validating link…
            </div>
          )}
          {state.kind === "ready" && (
            <>
              <p className="text-sm text-muted-foreground">
                Click below to unsubscribe from Pathforge emails.
              </p>
              <Button onClick={confirm} className="w-full">Confirm Unsubscribe</Button>
            </>
          )}
          {state.kind === "submitting" && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Processing…
            </div>
          )}
          {state.kind === "done" && (
            <div className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
              <p>You've been unsubscribed. You won't receive further emails from Pathforge.</p>
            </div>
          )}
          {state.kind === "already" && (
            <div className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
              <p>This email address is already unsubscribed.</p>
            </div>
          )}
          {state.kind === "invalid" && (
            <div className="flex items-start gap-2 text-sm">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
              <p>This unsubscribe link is invalid or has expired.</p>
            </div>
          )}
          {state.kind === "error" && (
            <div className="flex items-start gap-2 text-sm">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
              <p>{state.msg}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
