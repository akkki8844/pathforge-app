/**
 * The Interview Simulator, held back.
 *
 * The feature is built and deployed — tables, edge functions, voice, portraits
 * — but it has had exactly one end-to-end run and is not ready for students.
 * Rather than unpublish the routes (which would lose the ability to test on the
 * real origin with a real session), everything is gated here and admins pass
 * straight through.
 *
 * When it ships, delete `InterviewGate` from `App.tsx` and this file with it.
 */
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { DURATION, EASE_OUT_EXPO, fadeUp, staggerParent, staggerStep } from "@/lib/motion";

const WHAT_IT_DOES = [
  {
    title: "It knows the school's format",
    body: "Georgetown requires an evaluative alumni interview of every applicant and the interviewer files a rated report. Penn's Alumni Conversations explicitly do not affect the decision. Stanford and Caltech do not interview at all. The session is shaped to whichever one is coming.",
  },
  {
    title: "It has read your application",
    body: "The questions come from your own essays and your own activities list, so the follow-ups are about the thing you actually wrote — not a list of twenty questions handed to everyone.",
  },
  {
    title: "It tells you where you contradicted yourself",
    body: "Afterwards you get a score on clarity, specificity, authenticity and confidence — and, separately, every place what you said out loud stopped matching what your application already claims. That is the thing real interviewers notice.",
  },
];

export default function InterviewComingSoon() {
  return (
    <>
      <Seo
        title="Interview Simulator"
        description="A mock interview built on your own application and shaped to the format your school actually runs. Coming soon to Pathforge."
        path="/interview"
        noindex
      />

      <div className="relative overflow-hidden border-b border-border bg-gradient-to-br from-highlight via-accent to-[hsl(262_60%_52%)]">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(0 0% 100% / 0.6) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 100% / 0.6) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse at 30% 0%, black, transparent 72%)",
          }}
        />
        <div className="section-container relative py-14 sm:py-20">
          <motion.div initial="hidden" animate="visible" variants={staggerParent} custom={staggerStep(3)} className="max-w-3xl">
            <motion.p
              variants={fadeUp}
              className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-3 py-1 font-display text-[11px] font-bold uppercase tracking-[0.16em] text-white/90 backdrop-blur-sm"
            >
              Coming soon
            </motion.p>
            <motion.h1
              variants={fadeUp}
              className="mt-4 text-balance font-display text-3xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl"
            >
              The interview you're actually walking into.
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-4 max-w-2xl text-pretty text-base leading-relaxed text-white/85 sm:text-lg">
              A real conversation with someone who has read your essays and your activities
              list, shaped to the format your school runs — and afterwards, a straight answer
              on how it went. We're still testing it. It'll open here when it's ready.
            </motion.p>
          </motion.div>
        </div>
      </div>

      <div className="section-container py-10 sm:py-14">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerParent}
          custom={staggerStep(WHAT_IT_DOES.length)}
          className="grid gap-4 sm:grid-cols-3"
        >
          {WHAT_IT_DOES.map((item) => (
            <motion.section
              key={item.title}
              variants={fadeUp}
              className="rounded-2xl border border-border bg-card p-5"
            >
              <h2 className="font-display text-base font-bold leading-snug tracking-tight text-foreground">
                {item.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
            </motion.section>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: DURATION.slow, ease: EASE_OUT_EXPO, delay: 0.2 }}
          className="mt-8 rounded-2xl border border-border bg-muted/50 p-5 sm:p-6"
        >
          <p className="font-display text-sm font-bold text-foreground">
            In the meantime
          </p>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            The interview draws on your essays and your activities list, so the most useful
            thing you can do before it opens is make sure both are actually written down.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild size="sm"><Link to="/application-builder">Application Builder</Link></Button>
            <Button asChild size="sm" variant="secondary"><Link to="/outcomes">Outcomes</Link></Button>
            <Button asChild size="sm" variant="secondary"><Link to="/essays">Essay Builder</Link></Button>
          </div>
        </motion.div>
      </div>
    </>
  );
}
