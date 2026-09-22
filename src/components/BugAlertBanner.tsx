import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Check, Loader2, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  addBreadcrumb,
  getBreadcrumbs,
  getRecentErrors,
  onBugCaptured,
  reportBug,
  USER_SEVERITIES,
  type CapturedBug,
} from "@/lib/bugs/reporter";
import { BUG_SOURCE_LABELS, type BugSeverity } from "@/lib/bugs/types";

/**
 * The red bar that appears when something breaks, with Report inside it.
 *
 * This replaces a permanent "Report a bug" button in the corner. That button
 * was wrong in both directions: on a working page it was a piece of furniture
 * advertising that the app expects to be broken, and at the moment a page
 * actually did break it looked exactly the same as always, so nothing drew the
 * user's eye to it. A report button is only useful when there is something to
 * report, and that is a moment the app already knows about.
 *
 * So nothing renders until the capture engine announces a failure. Then a red
 * bar says what happened, in one line, and carries the button. The report it
 * files already has the error, the stack, the route and the trail of clicks
 * attached — what the user adds is the one thing the machine cannot know: what
 * they were trying to do.
 *
 * Not every captured failure raises this. The engine decides (see
 * `LOUD_SOURCES` and `userWasInvolved` in `@/lib/bugs/reporter`); background
 * log noise is still filed to Admin -> Bugs without interrupting anyone. A red
 * banner that cries wolf is worse than no banner.
 */
export function BugAlertBanner() {
  const { user, profile } = useAuth();
  const { pathname: path } = useLocation();

  const [bugs, setBugs] = useState<CapturedBug[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [open, setOpen] = useState(false);

  const [what, setWhat] = useState("");
  const [expected, setExpected] = useState("");
  const [email, setEmail] = useState("");
  const [severity, setSeverity] = useState<BugSeverity>("high");
  const [attachErrors, setAttachErrors] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  /*
   * The snapshot is taken when the banner APPEARS, not when the dialog opens
   * or submits. Opening the dialog is a click, typing is more events, and the
   * breadcrumb buffer holds only the last 25 — read any later and the trail
   * would describe the user filling in the form, having pushed the actual
   * failure out of the window.
   */
  const [snapshot, setSnapshot] = useState<{
    breadcrumbs: ReturnType<typeof getBreadcrumbs>;
    errors: ReturnType<typeof getRecentErrors>;
    route: string;
  } | null>(null);

  const handleCapture = useCallback((bug: CapturedBug) => {
    setBugs((prev) => {
      // Same fingerprinted failure firing again should not stack up bars.
      if (prev.some((b) => b.title === bug.title)) return prev;
      return [...prev, bug].slice(-5);
    });
    setSnapshot((prev) =>
      prev ?? {
        breadcrumbs: getBreadcrumbs(),
        errors: getRecentErrors(),
        route: window.location.pathname,
      },
    );
    setDismissed(false);
  }, []);

  useEffect(() => onBugCaptured(handleCapture), [handleCapture]);

  // Severity follows the worst thing that happened, so the report arrives
  // pre-classified instead of defaulting to the middle of the scale.
  useEffect(() => {
    if (bugs.some((b) => b.severity === "critical")) setSeverity("critical");
    else if (bugs.length) setSeverity("high");
  }, [bugs]);

  const severityMeta = useMemo(
    () => USER_SEVERITIES.find((s) => s.value === severity)!,
    [severity],
  );

  const hiddenRoute = path.startsWith("/auth") || path.startsWith("/admin");
  const latest = bugs[bugs.length - 1];
  const showBanner = !hiddenRoute && !dismissed && bugs.length > 0;

  if (hiddenRoute) return null;

  const clear = () => {
    setBugs([]);
    setSnapshot(null);
    setDismissed(false);
  };

  const submit = async () => {
    const trimmed = what.trim();
    if (trimmed.length < 5) {
      toast.error("Tell us a bit more about what you were doing");
      return;
    }
    setSubmitting(true);
    try {
      const contactEmail = email.trim() || profile?.email || user?.email || null;
      const description = [
        `What happened: ${trimmed}`,
        expected.trim() ? `What was expected: ${expected.trim()}` : null,
      ]
        .filter(Boolean)
        .join("\n\n");

      const id = await reportBug({
        source: "user_report",
        severity,
        title: trimmed.slice(0, 160),
        description,
        route: snapshot?.route,
        reporter_email: contactEmail,
        breadcrumbs: snapshot?.breadcrumbs,
        error_message:
          attachErrors && snapshot?.errors.length
            ? snapshot.errors
                .map((e) => `[${BUG_SOURCE_LABELS[e.source]}] ${e.message}`)
                .join("\n")
            : null,
        context: {
          reported_from: snapshot?.route,
          attached_errors: attachErrors ? (snapshot?.errors.length ?? 0) : 0,
          // The rows the engine already filed for the same incident, so an
          // admin reading this report can jump straight to the stack traces
          // rather than guessing which automatic captures belong to it.
          related_reports: bugs.map((b) => b.id).filter(Boolean),
          signed_in: Boolean(user),
        },
      });

      // `reportBug` returns null when the write was refused. Saying "thanks,
      // sent!" in that case would be a lie, and the user would never mention
      // the bug again.
      if (!id) {
        toast.error("Could not send that report. Please try again in a moment.");
        return;
      }

      toast.success("Bug reported. Thank you — the team can see it now.");
      addBreadcrumb("note", "User filed a bug report");
      setWhat("");
      setExpected("");
      setEmail("");
      setOpen(false);
      clear();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ x: 24, y: 8, opacity: 0, scale: 0.98 }}
            animate={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            exit={{ x: 24, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", damping: 24, stiffness: 260 }}
            role="alert"
            /* A notification in the bottom-right corner, not a bar across the
               page. The full-width centred bar read as a system-level outage
               notice for what is usually one component failing, and it sat
               across the middle of whatever the student was doing.
 
               Bottom rather than top: the top of the app is already a stack of
               banners (announcements, email verification, usage limits), and a
               failure notice that queues behind them arrives after the user has
               stopped looking. Right rather than centre: that is where this app
               already puts transient messages, so it lands where the eye
               already goes for one.
 
               The 5rem bottom offset clears the corner cluster — support chat
               at right-5 and feedback at right-[4.25rem], both 2.75rem tall at
               1.25rem from the bottom — so this stacks above them instead of
               burying their controls. Unconditional rather than behind a
               breakpoint: they are in that corner at every width, and a
               breakpoint tuned to today's two buttons would silently be wrong
               the day a third is added. */
            className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+5rem)] right-3 z-[45] w-[calc(100vw-1.5rem)] max-w-sm sm:right-5 sm:w-full"
          >
            {/* Stacked rather than one row: at notification width a row of
                icon + message + two controls crushes the message to a few
                characters, which is the one part worth reading. */}
            <div className="w-full rounded-xl border border-destructive/30 bg-destructive p-3.5 text-destructive-foreground shadow-2xl">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />

                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold leading-snug">
                    Something went wrong on this page
                  </p>
                  {/* The raw message, clamped to two lines. Not hidden behind a
                      "details" toggle: a user who recognises the error can say
                      so, and one who does not loses nothing by seeing it. */}
                  <p className="mt-0.5 line-clamp-2 break-words text-[11.5px] leading-snug opacity-80">
                    {latest?.message}
                    {bugs.length > 1 && (
                      <span className="ml-1 opacity-90">
                        (+{bugs.length - 1} more {bugs.length === 2 ? "error" : "errors"})
                      </span>
                    )}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setDismissed(true)}
                  className="-mr-1 -mt-1 shrink-0 rounded-md p-1.5 opacity-80 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive-foreground"
                  aria-label="Dismiss"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-2.5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  className="rounded-md bg-destructive-foreground px-3 py-1.5 text-[12.5px] font-semibold text-destructive transition-transform hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-destructive"
                >
                  Report this
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-background/60 p-4 backdrop-blur-sm sm:items-center sm:p-8"
            onClick={() => !submitting && setOpen(false)}
          >
            <motion.div
              initial={{ y: 30, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.97 }}
              transition={{ type: "spring", damping: 22, stiffness: 240 }}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-2xl sm:p-6"
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Report this bug</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    We already have the error. Tell us what you were trying to do and we can work
                    out why it failed.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={submitting}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3.5">
                <div>
                  <Label htmlFor="bug-what" className="text-xs">
                    What were you doing? *
                  </Label>
                  <Textarea
                    id="bug-what"
                    value={what}
                    onChange={(e) => setWhat(e.target.value)}
                    placeholder="I clicked Generate on the essay page."
                    rows={3}
                    maxLength={1500}
                    className="mt-1 resize-none"
                  />
                </div>

                <div>
                  <Label htmlFor="bug-expected" className="text-xs">
                    What did you expect instead? (optional)
                  </Label>
                  <Textarea
                    id="bug-expected"
                    value={expected}
                    onChange={(e) => setExpected(e.target.value)}
                    placeholder="A draft should have appeared."
                    rows={2}
                    maxLength={1000}
                    className="mt-1 resize-none"
                  />
                </div>

                <div>
                  <Label className="text-xs">How badly does it affect you?</Label>
                  <div className="mt-1.5 grid grid-cols-4 gap-1.5">
                    {USER_SEVERITIES.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setSeverity(s.value)}
                        className={cn(
                          "rounded-md border px-2 py-2 text-[11px] font-medium transition-colors",
                          severity === s.value
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border text-muted-foreground hover:bg-muted",
                        )}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">{severityMeta.hint}</p>
                </div>

                {(snapshot?.errors.length ?? 0) > 0 && (
                  <button
                    type="button"
                    onClick={() => setAttachErrors((v) => !v)}
                    className="flex w-full items-start gap-2.5 rounded-lg border border-border px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                        attachErrors
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border",
                      )}
                    >
                      {attachErrors && <Check className="h-3 w-3" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-medium text-foreground">
                        Attach the {snapshot!.errors.length} error
                        {snapshot!.errors.length === 1 ? "" : "s"} the app caught
                      </span>
                      <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                        {snapshot!.errors[0].message}
                      </span>
                    </span>
                  </button>
                )}

                <div>
                  <Label htmlFor="bug-email" className="text-xs">
                    Contact email (optional)
                  </Label>
                  <Input
                    id="bug-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={profile?.email || user?.email || "you@example.com"}
                    className="mt-1"
                  />
                </div>

                <p className="text-[10px] leading-relaxed text-muted-foreground">
                  We automatically attach the page you were on ({snapshot?.route ?? path}), your
                  browser and screen size, the app build, and your last{" "}
                  {snapshot?.breadcrumbs.length ?? 0} actions. No form contents or personal data
                  from the page are included.
                </p>

                <Button
                  className="w-full"
                  onClick={submit}
                  disabled={submitting || what.trim().length < 5}
                >
                  {submitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Send bug report
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
