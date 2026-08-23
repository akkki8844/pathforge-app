import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Megaphone, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RatingScaleGroup, RatingScaleItem } from "@/components/ui/rating-scale-group";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { submitPublicForm } from "@/lib/publicContact";
import { toast } from "sonner";

/**
 * Floating Feedback widget — fixed bottom-left button. Opens a small dialog
 * where users can drop a quick message + optional contact email.
 *
 * Submissions:
 *  1) Insert into `admin_feedback` so it shows up under Admin → Feedback.
 *  2) Best-effort transactional email to pathforge.co@gmail.com so the team
 *     gets a real-time ping. Failure to email never blocks the in-app save.
 *
 * Hidden on /admin* and /auth so the widget doesn't get in the way of those
 * focused screens.
 */
export function FeedbackWidget() {
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [rating, setRating] = useState("7");
  const [submitting, setSubmitting] = useState(false);

  // Hide on routes where it would be disruptive or where the audience is wrong.
  // Counsellors (/teacher/*) shouldn't see the platform feedback widget — that
  // feedback goes to admins, not to them, and the duplication confuses the role.
  if (typeof window !== "undefined") {
    const path = window.location.pathname;
    if (path.startsWith("/admin") || path.startsWith("/auth") || path.startsWith("/teacher")) return null;
  }

  const submit = async () => {
    const trimmed = message.trim();
    if (trimmed.length < 5) {
      toast.error("Please share a bit more (at least 5 characters)");
      return;
    }
    setSubmitting(true);
    try {
      const contactEmail = email.trim() || profile?.email || user?.email || null;
      const withRating = `Satisfaction: ${rating}/10\n\n${trimmed}`;

      // 1) Save to admin_feedback if signed in (RLS requires auth.uid())
      if (user) {
        const { error } = await supabase.from("admin_feedback").insert({
          user_id: user.id,
          type: "general",
          title: trimmed.slice(0, 80),
          description: withRating,
          status: "pending",
          priority: "medium",
          admin_notes: contactEmail ? `Reply-to: ${contactEmail}` : null,
        });
        if (error) throw error;
      }

      // 2) Notify the team. Previously this called `send-transactional-email`
      // directly, which is service-role-only and not exempt from verify_jwt —
      // so from the browser it always failed, and the catch below reduced that
      // to a console warning nobody read. Guests, who never reach step 1, had
      // their feedback discarded entirely while being told it was sent.
      //
      // Still best-effort for signed-in users: their row is already saved, so a
      // mail problem shouldn't present as a lost submission.
      try {
        await submitPublicForm({
          kind: "feedback",
          email: contactEmail || undefined,
          message: withRating,
        });
      } catch (emailErr) {
        console.warn("Feedback notification failed:", emailErr);
        // A guest has no saved row, so for them this WAS the submission.
        if (!user) throw emailErr;
      }

      toast.success("Thanks — your feedback was sent to the team!");
      setMessage("");
      setEmail("");
      setRating("7");
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message || "Could not send feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Trigger — small white button docked immediately left of the support
          chatbot so the two sit side by side in the bottom-right corner. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-[4.25rem] z-40 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-700 shadow-lg ring-1 ring-black/10 hover:shadow-xl hover:-translate-y-0.5 transition-all"
        aria-label="Send feedback"
        title="Feedback"
      >
        <Megaphone className="h-[18px] w-[18px]" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:justify-start p-4 sm:p-8"
            onClick={() => !submitting && setOpen(false)}
          >
            <motion.div
              initial={{ y: 30, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.97 }}
              transition={{ type: "spring", damping: 22, stiffness: 240 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl p-5 sm:p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Send feedback</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Tell us what's working, what's broken, or what you wish existed.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={submitting}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3">
                {/* Sits directly above the textarea so it's read before typing,
                    not after. */}
                <div className="rounded-lg border border-accent/30 bg-accent/5 px-3 py-2.5">
                  <p className="text-xs font-medium text-foreground">
                    Got an idea? We pay for the good ones.
                  </p>
                  <p className="text-[11px] leading-relaxed text-muted-foreground mt-1">
                    If our team ships something you suggested, you get{" "}
                    <strong className="font-semibold text-foreground">$25 in cash</strong> plus{" "}
                    <strong className="font-semibold text-foreground">Pathforge Max free for a month</strong>.
                    Leave a contact email below so we can reach you.
                  </p>
                </div>

                <div>
                  <Label className="text-xs">How satisfied are you with Pathforge?</Label>
                  <RatingScaleGroup value={rating} onValueChange={setRating} className="mt-2 gap-0.5">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <RatingScaleItem
                        key={i}
                        value={(i + 1).toString()}
                        label={(i + 1).toString()}
                        className="h-8 w-8 text-xs"
                      />
                    ))}
                  </RatingScaleGroup>
                  <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                    <span>Not satisfied</span>
                    <span>Very satisfied</span>
                  </div>
                </div>

                <div>
                  <Label htmlFor="fb-message" className="text-xs">Your message *</Label>
                  <Textarea
                    id="fb-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="What's on your mind?"
                    rows={4}
                    maxLength={2000}
                    className="mt-1 resize-none"
                  />
                </div>
                <div>
                  <Label htmlFor="fb-email" className="text-xs">
                    Contact email (optional)
                  </Label>
                  <Input
                    id="fb-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={profile?.email || user?.email || "you@example.com"}
                    className="mt-1"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Leave blank to use the email on your account.
                  </p>
                </div>

                <Button
                  className="w-full"
                  onClick={submit}
                  disabled={submitting || message.trim().length < 5}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Send feedback
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
