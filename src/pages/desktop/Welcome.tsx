import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight, Loader2, CalendarDays, CheckCircle2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  beginDesktopSignIn,
  consumeDesktopSignInState,
  desktop,
  type DesktopAuthPayload,
} from "@/lib/desktop";
import pathforgeLogo from "@/assets/pathforge-logo.png";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * The desktop app's first screen — the one thing it shows before sign-in.
 *
 * The web app opens on a landing page because it has to sell itself to a
 * stranger who arrived from a search result. Somebody who has already
 * downloaded and installed a native build is not that person, so the pitch is
 * gone and the only decision left on the screen is Continue.
 *
 * Continue leaves the app. Sign-in happens in the user's real browser and
 * comes back over the pathforge:// deep link — see `electron/main.cjs` for
 * why an embedded OAuth window is not an option.
 *
 * Set in Sora (`font-display`) throughout rather than the body sans: this
 * screen is four lines of type at poster size, and Sora is the face the
 * product already uses when type is doing the work.
 */
export default function Welcome() {
  const bridge = desktop();
  const navigate = useNavigate();
  const [waiting, setWaiting] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (!bridge) return;

    const handle = async (payload: DesktopAuthPayload) => {
      // A deep link that doesn't answer *our* pending attempt is ignored
      // outright — any process on this machine can fire pathforge://.
      if (!consumeDesktopSignInState(payload.state)) {
        setWaiting(false);
        toast.error("That sign-in link didn't match this window. Try Continue again.");
        return;
      }

      setSigningIn(true);
      const { error } = await supabase.auth.setSession({
        access_token: payload.accessToken,
        refresh_token: payload.refreshToken,
      });

      if (error) {
        setSigningIn(false);
        setWaiting(false);
        toast.error("Could not finish signing in", { description: error.message });
        return;
      }

      // AuthContext picks the session up through onAuthStateChange; `/` then
      // resolves to the dashboard on its own.
      navigate("/", { replace: true });
    };

    return bridge.onAuthCallback((payload) => {
      void handle(payload);
    });
  }, [bridge, navigate]);

  const handleContinue = async () => {
    if (!bridge) {
      navigate("/auth");
      return;
    }
    setWaiting(true);
    await bridge.openSignIn(beginDesktopSignIn());
  };

  return (
    <div className="grid min-h-screen grid-cols-1 font-display lg:grid-cols-2">
      {/* ── Left: the only decision on the screen ───────────────────── */}
      <div className="relative flex flex-col items-center justify-center bg-background px-8">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="flex w-full max-w-[28rem] flex-col items-center text-center"
        >
          {/* Mark and wordmark on one line, the way the app's own title bar
              carries it — not a floating logo with the name three lines down. */}
          <div className="mb-6 flex items-center gap-2.5">
            <img src={pathforgeLogo} alt="" aria-hidden="true" className="h-8 w-auto" />
            <span className="text-[1.75rem] font-bold tracking-[-0.03em] text-foreground">
              PathForge
            </span>
          </div>

          <h1 className="text-[3rem] font-bold leading-[1.05] tracking-[-0.035em] text-foreground">
            Welcome to PathForge
          </h1>
          <p className="mt-4 text-[1.3rem] font-normal leading-snug text-muted-foreground">
            Your college application, planned
          </p>

          <button
            type="button"
            onClick={handleContinue}
            disabled={signingIn}
            className="group mt-14 inline-flex h-[3.85rem] w-full items-center justify-center gap-1.5 rounded-[0.9rem] bg-[linear-gradient(100deg,hsl(226_80%_72%),hsl(226_65%_56%))] text-[1.2rem] font-medium tracking-[-0.01em] text-white shadow-[0_10px_30px_-12px_hsl(226_65%_46%_/_0.65)] transition-all hover:brightness-[1.06] hover:shadow-[0_14px_34px_-12px_hsl(226_65%_46%_/_0.7)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-70"
          >
            {signingIn ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Signing you in
              </>
            ) : waiting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Waiting for your browser
              </>
            ) : (
              <>
                Continue
                <ChevronRight
                  className="h-5 w-5 transition-transform group-hover:translate-x-0.5"
                  strokeWidth={2.5}
                />
              </>
            )}
          </button>

          {/* The escape hatch. A browser that opened behind the app window, a
              default-browser setting that silently failed, a link the user
              closed by accident — all of them look identical from in here, so
              the recovery is one visible click rather than a support email. */}
          {waiting && !signingIn && (
            <button
              type="button"
              onClick={handleContinue}
              className="mt-4 text-[0.95rem] text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
            >
              Browser didn't open? Try again
            </button>
          )}
        </motion.div>

        <p className="absolute bottom-12 left-0 right-0 px-8 text-center text-[0.9rem] font-normal text-muted-foreground/80">
          By signing up, you agree to our{" "}
          <a
            href="https://pathforge.co.in/terms"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-foreground/75 underline-offset-2 hover:underline"
          >
            Terms of Service
          </a>{" "}
          and{" "}
          <a
            href="https://pathforge.co.in/privacy"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-foreground/75 underline-offset-2 hover:underline"
          >
            Privacy Policy
          </a>
          .
        </p>
      </div>

      {/* ── Right: what the app is, shown rather than claimed ────────── */}
      <div className="relative hidden flex-col items-center justify-center overflow-hidden bg-muted/50 px-12 lg:flex">
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.12, ease: EASE }}
          className="w-full max-w-[30rem]"
        >
          <PreviewCard />
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.35 }}
          className="mt-14 max-w-[19ch] text-center text-[2rem] font-medium leading-[1.2] tracking-[-0.03em] text-foreground"
        >
          Every deadline, essay and activity in one plan
        </motion.p>
      </div>
    </div>
  );
}

/**
 * A composed preview, not a screenshot.
 *
 * A PNG of the dashboard would go stale the first time the dashboard changed,
 * and at this size it would be unreadable anyway. This is built from the same
 * tokens the real UI uses, so it can't drift out of the product's own look.
 */
function PreviewCard() {
  return (
    <div className="rounded-[1.25rem] border border-border/70 bg-card p-7 font-sans shadow-[0_30px_60px_-25px_hsl(222_38%_15%_/_0.35)]">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/25" />
        <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/25" />
        <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/25" />
      </div>

      <p className="mt-6 font-display text-[0.7rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">
        This week
      </p>

      <div className="mt-4 space-y-3">
        <PreviewRow
          icon={CheckCircle2}
          title="Draft the Common App personal statement"
          meta="Essays · due Friday"
          done
        />
        <PreviewRow
          icon={CalendarDays}
          title="Shortlist two summer research programs"
          meta="Activities · due Sunday"
        />
        <PreviewRow
          icon={Sparkles}
          title="Review your recommender list"
          meta="Recommendations · this month"
        />
      </div>

      <div className="mt-6 rounded-2xl bg-muted/60 p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-medium text-muted-foreground">Journey progress</span>
          <span className="font-display text-xs font-semibold tabular-nums text-foreground">62%</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
          <div className="h-full w-[62%] rounded-full bg-primary" />
        </div>
      </div>
    </div>
  );
}

function PreviewRow({
  icon: Icon,
  title,
  meta,
  done,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  meta: string;
  done?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-background/70 p-3.5">
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${done ? "text-primary" : "text-muted-foreground"}`} />
      <div className="min-w-0">
        <p
          className={`truncate text-sm font-medium ${
            done ? "text-muted-foreground line-through" : "text-foreground"
          }`}
        >
          {title}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{meta}</p>
      </div>
    </div>
  );
}
