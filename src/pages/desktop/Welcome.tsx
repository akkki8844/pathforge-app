// This screen is set in Inter rather than the app's Sora. It is the only
// screen a user sees before signing in, and it is deliberately typeset to
// match the reference the product owner specified — Inter is the metric
// match for SF Pro, which is what that reference is set in. Scoped to this
// route's chunk; the rest of the app is untouched.
import "@fontsource-variable/inter";
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

const INTER = '"Inter Variable", Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

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
    <div
      className="grid min-h-screen grid-cols-1 lg:grid-cols-2"
      style={{ fontFamily: INTER }}
    >
      {/* ── Left: the only decision on the screen ───────────────────── */}
      <div className="relative flex min-h-screen flex-col items-center bg-background px-8 py-10">
        <div className="flex w-full flex-1 flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="flex w-full max-w-[30rem] flex-col items-center text-center"
        >
          {/* Mark and wordmark on one line, the way the app's own title bar
              carries it — not a floating logo with the name three lines down. */}
          <div className="mb-10 flex items-center gap-3">
            <img src={pathforgeLogo} alt="" aria-hidden="true" className="h-9 w-auto" />
            <span
              className="text-[2rem] font-semibold tracking-[-0.025em] text-foreground"
              style={{ fontFamily: INTER }}
            >
              PathForge
            </span>
          </div>

          {/* Two-tone, the way the reference sets it: the greeting recedes and
              the product name is what the eye lands on.
              `fontFamily` is set inline because index.css applies `font-display`
              (Sora) to every h1 globally, which a class on this element loses to. */}
          <h1
            className="font-medium leading-[1.06] tracking-[-0.032em] text-foreground"
            style={{ fontFamily: INTER, fontSize: "clamp(2.5rem, 4.6vw, 3.75rem)" }}
          >
            Welcome to{" "}
            <span className="text-muted-foreground/70">PathForge</span>
          </h1>
          <p
            className="mt-5 font-normal leading-snug tracking-[-0.011em] text-muted-foreground"
            style={{ fontSize: "clamp(1.15rem, 1.7vw, 1.5rem)" }}
          >
            Your college application, planned
          </p>

          <button
            type="button"
            onClick={handleContinue}
            disabled={signingIn}
            style={{ marginTop: "clamp(2.75rem, 9vh, 6.5rem)" }}
            className="group inline-flex h-[3.9rem] w-full items-center justify-center gap-1.5 rounded-[1rem] bg-[linear-gradient(100deg,hsl(226_80%_72%),hsl(226_65%_56%))] text-[1.3rem] font-medium tracking-[-0.014em] text-white shadow-[0_10px_30px_-12px_hsl(226_65%_46%_/_0.65)] transition-all hover:brightness-[1.06] hover:shadow-[0_14px_34px_-12px_hsl(226_65%_46%_/_0.7)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-70"
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
        </div>

        <div className="w-full shrink-0">
          <p className="px-8 text-center text-[0.9rem] font-normal text-muted-foreground/80">
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

          {/* The reference puts press logos here. Press logos are a claim
              PathForge has not earned yet; the universities its users are
              actually applying to are the honest version of the same beat. */}
          <div className="mt-7">
            <CollegeMarquee />
          </div>
        </div>
      </div>

      {/* ── Right: what the app is, shown rather than claimed ────────── */}
      <div className="relative hidden flex-col items-center justify-center overflow-hidden bg-muted px-12 lg:flex">
        {/* Faint engineering grid, as in the reference — it reads as a
            workspace rather than a marketing panel, and keeps the product
            shot from floating on dead space. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.5]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse 75% 65% at 50% 42%, #000 55%, transparent 100%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 75% 65% at 50% 42%, #000 55%, transparent 100%)",
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.12, ease: EASE }}
          className="relative w-full max-w-[34rem]"
        >
          <ProductShot />
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.35 }}
          className="relative mt-14 max-w-[19ch] text-center font-medium leading-[1.2] tracking-[-0.03em] text-foreground"
          style={{ fontFamily: INTER, fontSize: "clamp(1.5rem, 2.3vw, 2rem)" }}
        >
          Every deadline, essay and activity in one plan
        </motion.p>
      </div>
    </div>
  );
}

/**
 * The same "forged for these universities" strip as the marketing site's
 * landing page (`CollegeLogosMarquee`), rebuilt here rather than shared —
 * this app and pathforge-tech are separate codebases with no shared
 * component package, and this screen's font-display context (Sora, poster
 * scale) calls for its own sizing anyway.
 */
const MARQUEE_COLLEGES = [
  { name: "Harvard", domain: "harvard.edu" },
  { name: "Stanford", domain: "stanford.edu" },
  { name: "MIT", domain: "mit.edu" },
  { name: "Princeton", domain: "princeton.edu" },
  { name: "Yale", domain: "yale.edu" },
  { name: "Columbia", domain: "columbia.edu" },
  { name: "Caltech", domain: "caltech.edu" },
  { name: "UChicago", domain: "uchicago.edu" },
  { name: "UPenn", domain: "upenn.edu" },
  { name: "Cornell", domain: "cornell.edu" },
  { name: "Brown", domain: "brown.edu" },
  { name: "Dartmouth", domain: "dartmouth.edu" },
  { name: "Duke", domain: "duke.edu" },
  { name: "Oxford", domain: "ox.ac.uk" },
  { name: "Cambridge", domain: "cam.ac.uk" },
];

function CollegeMarquee() {
  const loop = [...MARQUEE_COLLEGES, ...MARQUEE_COLLEGES];
  return (
    <section className="relative" aria-label="Top universities worldwide">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-background to-transparent" />
        <div className="flex w-max animate-marquee items-center gap-10 px-6">
          {loop.map((c, i) => (
            <div
              key={`${c.domain}-${i}`}
              className="flex h-7 shrink-0 items-center gap-2 opacity-40 grayscale transition-all hover:opacity-80 hover:grayscale-0"
              title={c.name}
            >
              <img
                src={`https://www.google.com/s2/favicons?domain=${c.domain}&sz=32`}
                alt=""
                aria-hidden="true"
                loading="lazy"
                width={18}
                height={18}
                className="h-[1.125rem] w-[1.125rem] rounded-sm object-contain"
              />
              <span className="whitespace-nowrap text-[0.9rem] font-semibold tracking-[-0.01em] text-foreground/80">
                {c.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * The product shot, framed as the real desktop window it is.
 *
 * To swap in a real captured screenshot, drop the file in `src/assets/` and
 * replace `<PreviewCard />` below with an `<img>` of it — the chrome, shadow
 * and grid backdrop around it stay exactly as they are.
 */
function ProductShot() {
  return (
    <div className="overflow-hidden rounded-[0.9rem] border border-border/70 bg-card shadow-[0_40px_80px_-30px_hsl(222_38%_15%_/_0.45)]">
      {/* Window chrome — the same title bar the installed app actually has. */}
      <div className="flex items-center gap-2 border-b border-border/60 bg-muted/60 px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
        <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
        <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        <span className="ml-3 text-[0.8rem] font-medium text-muted-foreground">PathForge</span>
      </div>
      <PreviewCard />
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
    <div className="bg-card p-7">
      <p className="text-[0.7rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">
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
