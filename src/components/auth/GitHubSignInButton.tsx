import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const safeRedirectPath = (value?: string) => {
  if (!value) return "/dashboard";
  const path = value.startsWith("/") ? value : `/${value}`;
  return path.startsWith("//") ? "/dashboard" : path;
};

export function GitHubSignInButton({
  label = "Continue with GitHub",
  redirectTo,
  className,
}: {
  label?: string;
  redirectTo?: string;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("github-oauth-init", {
        body: {
          mode: "signin",
          origin: window.location.origin,
          redirect_to: safeRedirectPath(redirectTo),
        },
      });
      if (error) throw error;
      const url = (data as { url?: string })?.url;
      if (!url) throw new Error("No authorization URL returned");
      window.location.assign(url);
    } catch (e) {
      toast.error("GitHub sign-in failed", {
        description: e instanceof Error ? e.message : "Please try again.",
      });
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handle}
      disabled={loading}
      className={`w-full gap-2 ${className ?? ""}`}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          <GitHubGlyph />
          {label}
        </>
      )}
    </Button>
  );
}

function GitHubGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}
