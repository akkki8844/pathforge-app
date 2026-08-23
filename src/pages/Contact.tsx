import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fadeUp, staggerParent, transition } from "@/lib/motion";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { Mail, Send, Check, User, MessageSquare, Tag, Clock, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { submitPublicForm } from "@/lib/publicContact";
import { useDraftPersistence } from "@/hooks/useDraftPersistence";
import { z } from "zod";
import { Seo } from "@/components/Seo";
import { FAQS } from "@/data/faq";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Please enter a valid email").max(255),
  subject: z.string().min(1, "Please select a subject"),
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(2000),
});

const SUBJECTS = [
  { value: "general", label: "General inquiry" },
  { value: "support", label: "Technical support" },
  { value: "enterprise", label: "Enterprise / schools" },
  { value: "bug", label: "Report a bug" },
  { value: "feedback", label: "Product feedback" },
];

export default function Contact() {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("general");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Persist contact form draft so users don't lose work on refresh
  const { clear: clearContactDraft } = useDraftPersistence(
    "contact",
    { name, email, subject, message },
    (saved) => {
      if (saved.name) setName(saved.name);
      if (saved.email) setEmail(saved.email);
      if (saved.subject) setSubject(saved.subject);
      if (saved.message) setMessage(saved.message);
    },
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const result = contactSchema.safeParse({ name, email, subject, message });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    const subjectLabel = SUBJECTS.find((s) => s.value === subject)?.label || subject;

    try {
      // Throws on failure — including the non-2xx responses that invoke()
      // otherwise resolves through, which is why this form used to report
      // "Message sent!" for messages it never sent.
      await submitPublicForm({ kind: "contact", name, email, subject: subjectLabel, message });

      setShowConfirmation(true);
      clearContactDraft();
      toast({ title: "Message sent!", description: "We'll be in touch within 2–3 business days." });
    } catch (err: any) {
      toast({ title: "Couldn't send message", description: err?.message || "Please try again or email us directly.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const reset = () => {
    setShowConfirmation(false);
    setName(""); setEmail(""); setSubject("general"); setMessage("");
  };

  return (
    <div className="py-10 sm:py-16 relative overflow-hidden">
      <Seo
        title='Contact — Pathforge'
        description='Reach the Pathforge team for support, refunds, school and counsellor partnerships, bug reports and press. Most messages get a personal reply within 2–3 business days.'
        path='/contact'
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "@id": "https://pathforge.co.in/contact#faq",
          mainEntity: FAQS.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }}
      />
      <div className="absolute top-20 right-0 w-72 h-72 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

      <div className="section-container max-w-5xl relative z-10">
        <div className="text-center mb-10">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-1.5 text-accent text-xs font-semibold uppercase tracking-wide mb-3">
            <Star className="h-3.5 w-3.5" /> We typically reply within 2–3 business days
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...transition.base, delay: 0.06 }}
            className="text-3xl sm:text-4xl font-bold text-foreground"
          >
            Get in touch
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...transition.base, delay: 0.12 }}
            className="mt-2 text-muted-foreground max-w-xl mx-auto"
          >
            Have a question, feedback, or partnership idea? We'd love to hear from you.
          </motion.p>
        </div>

        <div className="grid lg:grid-cols-[1fr_2fr] gap-6">
          {/* Left: contact info */}
          <motion.div
            variants={staggerParent}
            custom={0.08}
            initial="hidden"
            animate="visible"
            className="space-y-4"
          >
            <motion.div variants={fadeUp} className="rounded-2xl border border-border/50 bg-card p-5">
              <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center mb-3">
                <Mail className="h-5 w-5 text-accent" />
              </div>
              <h2 className="font-semibold text-foreground text-sm">Email us directly</h2>
              <a href="mailto:pathforge.co@gmail.com" className="text-sm text-accent hover:underline block mt-1">
                pathforge.co@gmail.com
              </a>
            </motion.div>

            <motion.div variants={fadeUp} className="rounded-2xl border border-border/50 bg-card p-5">
              <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center mb-3">
                <Clock className="h-5 w-5 text-accent" />
              </div>
              <h2 className="font-semibold text-foreground text-sm">Response time</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Most messages get a personal reply within 2–3 business days.
              </p>
            </motion.div>

            <motion.div variants={fadeUp} className="rounded-2xl border border-border/50 bg-card p-5">
              <h2 className="font-semibold text-foreground text-sm mb-2">Looking for…</h2>
              <ul className="text-sm text-muted-foreground space-y-1.5">
                <li>· Schools & counsellor partnerships</li>
                <li>· Bug reports & feature requests</li>
                <li>· Press & media inquiries</li>
                <li>· Account or billing help</li>
              </ul>
            </motion.div>
          </motion.div>

          {/* Right: form OR confirmation */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border/50 bg-card p-6 sm:p-8">
            <AnimatePresence mode="wait">
              {showConfirmation ? (
                <motion.div
                  key="confirm"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-8"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 250 }}
                    className="mx-auto mb-5 h-16 w-16 rounded-2xl bg-green-100 dark:bg-green-500/15 flex items-center justify-center"
                  >
                    <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </motion.div>
                  <h2 className="text-xl font-bold text-foreground mb-2">Your response has been submitted</h2>
                  <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                    You will receive a reply within 2–3 business days at <span className="font-medium text-foreground">{email}</span>.
                  </p>
                  <Button onClick={reset} variant="outline">Send another message</Button>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleSubmit}
                  className="space-y-5"
                >
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="name" className="flex items-center gap-1.5 text-xs">
                        <User className="h-3 w-3 text-muted-foreground" /> Name
                      </Label>
                      <Input id="name" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} className={errors.name ? "border-destructive" : ""} />
                      {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="flex items-center gap-1.5 text-xs">
                        <Mail className="h-3 w-3 text-muted-foreground" /> Email
                      </Label>
                      <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className={errors.email ? "border-destructive" : ""} />
                      {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="subject" className="flex items-center gap-1.5 text-xs">
                      <Tag className="h-3 w-3 text-muted-foreground" /> Subject
                    </Label>
                    <Select value={subject} onValueChange={setSubject}>
                      <SelectTrigger id="subject"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-popover">
                        {SUBJECTS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="message" className="flex items-center gap-1.5 text-xs">
                      <MessageSquare className="h-3 w-3 text-muted-foreground" /> Message
                    </Label>
                    <Textarea
                      id="message" placeholder="Tell us how we can help…" value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className={`min-h-[160px] resize-y ${errors.message ? "border-destructive" : ""}`}
                    />
                    <div className="flex items-center justify-between">
                      {errors.message ? (
                        <p className="text-xs text-destructive">{errors.message}</p>
                      ) : <span />}
                      <span className="text-[10px] text-muted-foreground">{message.length} / 2000</span>
                    </div>
                  </div>

                  <Button type="submit" disabled={isSubmitting} className="w-full h-11 btn-accent gap-2">
                    {isSubmitting ? (
                      <span className="animate-pulse">Sending…</span>
                    ) : (
                      <><Send className="h-4 w-4" /> Send message</>
                    )}
                  </Button>

                  <p className="text-[10px] text-muted-foreground text-center">
                    By submitting this form, you agree we may contact you about your inquiry.
                  </p>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Before you write — the questions we answer most often. This is also
            the on-page counterpart to the FAQPage JSON-LD above: the markup is
            only valid while every question and answer here is visible to the
            reader, so both are rendered from the same FAQS array rather than
            being maintained as two copies that can drift apart. */}
        <ScrollReveal className="mt-16">
          <h2 className="text-2xl font-bold text-foreground text-center mb-2">
            Before you write
          </h2>
          <p className="text-sm text-muted-foreground text-center max-w-xl mx-auto mb-8">
            These are the questions we get most. If yours is here, you have your answer
            immediately instead of in two days.
          </p>
          <div className="grid sm:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {FAQS.map((faq) => (
              <div key={faq.q} className="rounded-2xl border border-border/50 bg-card p-5">
                <h3 className="font-semibold text-foreground text-sm mb-2">{faq.q}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
