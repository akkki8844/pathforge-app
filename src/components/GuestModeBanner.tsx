import { useAuth } from "@/contexts/AuthContext";
import { AlertTriangle, LogIn } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function GuestModeBanner() {
  const { isGuest } = useAuth();
  const navigate = useNavigate();
  if (!isGuest) return null;

  // Deliberately do NOT sign out here — this session's data (and any
  // in-progress onboarding answers) is tied to the guest's anonymous user
  // id. Signing up while still in that session converts it in place
  // (see Auth.tsx's isGuest branch) instead of orphaning everything.
  const handleSignUp = () => navigate("/auth?view=signup");

  return (
    <div className="sticky top-0 z-40 bg-amber-50 border-b border-amber-300 text-amber-950 backdrop-blur-md dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-100">
      <div className="section-container py-2 flex items-center justify-between gap-3 flex-wrap text-xs sm:text-sm">
        <div className="flex items-center gap-2 min-w-0">
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="truncate">
            You're exploring as a guest — closing this tab or clearing your browser data will
            permanently lose your progress.{" "}
            <Link to="/auth?view=signup" className="underline font-medium hover:opacity-80">
              Sign up
            </Link>{" "}
            to keep it.
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleSignUp}
          className="h-7 px-2.5 text-xs gap-1.5 shrink-0 border-amber-400 hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900/40"
        >
          <LogIn className="h-3 w-3" />
          Sign In
        </Button>
      </div>
    </div>
  );
}
