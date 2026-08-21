import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, CalendarDays, CheckCircle2, Sparkles } from "lucide-react";
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
 * downloaded and installed a 100MB desktop build is not that person, so the
 * pitch is gone and the only decision left on the screen is Continue.
 *
 * Continue leaves the app. Sign-in happens in the user's real browser and
 * comes back over the pathforge:// deep link — see `electron/main.cjs` for
 * why an embedded OAuth window is not an option.
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
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* ── Left: the only decision on the screen ───────────────────── */}
      <div className="relative flex flex-col items-center justify-center px-8 py-16">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="flex w-full max-w-sm flex-col items-center text-center"
        >
          <img
            src={pathforgeLogo}
            alt=""
            aria-hidden="true"
            className="mb-7 h-11 w-auto"
          />

          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-[2.75rem]">
            Welcome to PathForge
          </h1>
          <p className="mt-3 text-base text-muted-foreground">
            Your college application, planned week by week
          </p>

          <button
            type="button"
            onClick={handleContinue}
            disabled={signingIn}
            className="group mt-10 inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-primary to-primary/85 text-[17px] font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-70"
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
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
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
              className="mt-4 text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
            >
              Browser didn't open? Try again
            </button>
          )}
        </motion.div>

        <p className="absolute bottom-10 left-0 right-0 px-8 text-center text-xs text-muted-foreground">
          By continuing, you agree to our{" "}
          <a
            href="https://pathforge.co.in/terms"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-foreground/80 underline underline-offset-2 hover:text-foreground"
          >
            Terms of Service
          </a>{" "}
          and{" "}
          <a
            href="https://pathforge.co.in/privacy"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-foreground/80 underline underline-offset-2 hover:text-foreground"
          >
            Privacy Policy
          </a>
          .
        </p>
      </div>

      {/* ── Right: what the app is, shown rather than claimed ────────── */}
      <div className="relative hidden flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-muted/60 via-background to-primary/5 px-10 py-16 lg:flex">
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.12, ease: EASE }}
          className="w-full max-w-md"
        >
          <PreviewCard />
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.35 }}
          className="mt-12 max-w-sm text-center text-2xl font-semibold leading-snug tracking-tight text-foreground"
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
    <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-2xl shadow-foreground/10">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/25" />
        <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/25" />
        <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/25" />
      </div>

      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
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
          <span className="text-xs font-semibold tabular-nums text-foreground">62%</span>
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
