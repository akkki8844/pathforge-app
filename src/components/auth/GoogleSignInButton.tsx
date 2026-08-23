import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";

const PENDING_OAUTH_REDIRECT_KEY = "pathforge_pending_oauth_redirect";

const safeRedirectPath = (value?: string) => {
  if (!value) return "/dashboard";
  const path = value.startsWith("/") ? value : `/${value}`;
  return path.startsWith("//") ? "/dashboard" : path;
};

export function GoogleSignInButton({
  label = "Continue with Google",
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
      const nextPath = safeRedirectPath(redirectTo);
      window.localStorage.setItem(PENDING_OAUTH_REDIRECT_KEY, nextPath);

      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
        extraParams: { prompt: "select_account" },
      });

      if (result.error) {
        window.localStorage.removeItem(PENDING_OAUTH_REDIRECT_KEY);
        toast.error("Google sign-in failed", {
          description: result.error.message || "Please try again.",
        });
        setLoading(false);
        return;
      }
      // If redirected, the browser is leaving — keep loading state.
    } catch (e: any) {
      toast.error("Google sign-in failed", { description: e?.message });
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
          <GoogleGlyph />
          {label}
        </>
      )}
    </Button>
  );
}

function GoogleGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}
