import { useMemo, useState, useEffect } from "react";
import { Mail, Send, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const STORAGE_KEY = "pathforge_newsletter_signed";
const emailSchema = z.string().trim().email().max(255);

export function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(STORAGE_KEY) === "1") setSubmitted(true);
  }, []);

  const valid = useMemo(() => emailSchema.safeParse(email).success, [email]);

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
    <div
      className="card-elevated rounded-2xl p-4 sm:p-5"
      style={{
        background:
          "linear-gradient(135deg, hsl(var(--accent) / 0.06), hsl(var(--accent) / 0.02))",
      }}
    >
      <AnimatePresence mode="wait">
        {submitted ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3"
          >
            <div className="h-9 w-9 rounded-xl bg-accent/15 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-accent" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">You're subscribed</h3>
              <p className="text-xs text-muted-foreground">
                We'll keep you posted on new Pathforge features and milestones.
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
            className="flex flex-col sm:flex-row sm:items-center gap-3"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="h-9 w-9 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                <Mail className="h-4 w-4 text-accent" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-foreground truncate">
                  Stay in the loop
                </h3>
                <p className="text-xs text-muted-foreground truncate">
                  Product updates, new features, and applicant insights — straight to your inbox.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:w-[360px]">
              <Input
                type="email"
                placeholder="you@school.edu"
                aria-label="Email address for newsletter signup"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-9 text-sm bg-background"
                maxLength={255}
                required
              />
              <Button type="submit" size="sm" disabled={!valid || loading} className="btn-accent gap-1.5 whitespace-nowrap">
                <Send className="h-3.5 w-3.5" />
                {loading ? "..." : "Sign up"}
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
