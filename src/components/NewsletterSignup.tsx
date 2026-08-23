import { useMemo, useState, useEffect } from "react";
import { Mail, Send, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { isLikelyEmail } from "@/lib/isLikelyEmail";

const STORAGE_KEY = "pathforge_newsletter_signed";

export function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(STORAGE_KEY) === "1") setSubmitted(true);
  }, []);

  const valid = useMemo(() => isLikelyEmail(email), [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) {
      toast({ variant: "destructive", title: "Invalid email", description: "Please enter a valid email." });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("newsletter-subscribe", {
        body: { email: email.trim().toLowerCase(), source: "dashboard" },
      });
      if (error) throw error;
      localStorage.setItem(STORAGE_KEY, "1");
      setSubmitted(true);
      toast({
        title: "You're on the list!",
        description: "Check your inbox for a confirmation email from Pathforge.",
      });
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Couldn't subscribe",
        description: "Please try again in a moment.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {submitted ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3.5"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent/12">
              <CheckCircle2 className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">You're on the list</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Check your inbox to confirm — that's the last click.
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-3"
          >
            <label htmlFor="newsletter-email" className="sr-only">
              Email address
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                id="newsletter-email"
                type="email"
                placeholder="you@school.edu"
                aria-label="Email address for newsletter signup"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-14 rounded-xl border-border/70 bg-background pl-11 pr-4 text-base shadow-sm"
                maxLength={255}
                required
              />
            </div>
            <Button
              type="submit"
              disabled={!valid || loading}
              className="btn-accent h-12 gap-2 rounded-xl text-base font-semibold"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              {loading ? "Signing up…" : "Subscribe"}
            </Button>
            <p className="text-xs text-muted-foreground">
              One email a week. Unsubscribe any time — no spam, ever.
            </p>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
