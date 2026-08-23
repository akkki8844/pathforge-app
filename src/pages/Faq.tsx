import { motion } from "framer-motion";
import { HelpCircle } from "lucide-react";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { FaqAccordion } from "@/components/ui/faq-chat-accordion";
import { Seo } from "@/components/Seo";
import { FAQS } from "@/data/faq";

export default function Faq() {
  return (
    <div className="py-10 sm:py-16 relative overflow-hidden">
      <Seo
        title="FAQ — Pathforge"
        description="Answers to the most common questions about Pathforge: pricing, credits, refunds, school/counsellor access, and data privacy."
        path="/faq"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "@id": "https://pathforge.co.in/faq#faq",
          mainEntity: FAQS.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }}
      />
      <div className="absolute top-20 right-0 w-72 h-72 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

      <div className="section-container max-w-3xl relative z-10">
        <div className="text-center mb-10">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-1.5 text-accent text-xs font-semibold uppercase tracking-wide mb-3"
          >
            <HelpCircle className="h-3.5 w-3.5" /> Frequently asked questions
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="text-3xl sm:text-4xl font-bold text-foreground"
          >
            Questions, answered
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-3 text-sm text-muted-foreground max-w-xl mx-auto"
          >
            Still stuck? Reach out on the Contact page and we'll get back to you within 2–3
            business days.
          </motion.p>
        </div>

        <ScrollReveal>
          <FaqAccordion
            data={FAQS.map((f) => ({
              question: f.q,
              answer: f.a,
              reaction: f.reaction,
              reactOn: f.reactOn as "question" | "answer" | undefined,
            }))}
            className="max-w-2xl mx-auto"
          />
        </ScrollReveal>
      </div>
    </div>
  );
}
