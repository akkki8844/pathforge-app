import { motion } from "framer-motion";
import { Target, Shield, BookOpen, Star, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { StaggerContainer, staggerItemVariants } from "@/components/animations/StaggerContainer";
import { Seo } from "@/components/Seo";
import { AwardSection } from "@/components/about/AwardSection";
import pathforgeLogo from "@/assets/pathforge-logo.webp";

/**
 * /about — the page a parent reads before letting a fifteen-year-old put a
 * year of work into a platform, and the page a student reads when deciding
 * whether this is a tool or a shortcut.
 *
 * It is set as a document, not as a deck. The previous version stacked six
 * near-identical glowing cards down the page, which flattened the hierarchy —
 * the mission statement, a list of four principles and the anti-hallucination
 * stance all arrived in the same box at the same weight, so none of them read
 * as more important than the others. Here the sections are separated by rules
 * and by their own typography, and a card is spent only where the content is
 * genuinely a panel rather than a passage: the AI stance, and the award.
 *
 * The type follows AwardSection, which follows the dashboard: `font-display`
 * for headings and tracked uppercase micro-labels, `font-serif` for numerals
 * and pull quotes, ink and one accent for everything else.
 */

/** The four Journey phases, in the order the product walks a student through them. */
const phases = [
  {
    name: "Discover",
    description:
      "Set your intended major and target countries, then see which activities, Olympiads and research programmes actually carry weight for that path — instead of collecting whatever was nearest.",
  },
  {
    name: "Build",
    description:
      "Do the work and record it as you go. Weekly planning tracks intended hours against real ones, so a year of effort ends up as evidence rather than a memory you have to reconstruct in August.",
  },
  {
    name: "Apply",
    description:
      "Turn what you have built into applications — refined essays, Common App and supplemental statements, a LinkedIn profile, and letters of recommendation requested through a portal your recommenders can actually use.",
  },
  {
    name: "Decide",
    description:
      "See where you realistically stand at each school on your list, with reach, match and safety bands calibrated to that school's selectivity rather than to a national average.",
  },
];

const principles: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Target,
    title: "Personalised guidance",
    description:
      "Every recommendation adapts to your target college and intended major. No generic advice — only what matters for your specific path.",
  },
  {
    icon: Star,
    title: "Clarity over complexity",
    description:
      "College preparation can be overwhelming. We cut through the noise to show you exactly what matters and how to present it effectively.",
  },
  {
    icon: Shield,
    title: "Ethical presentation",
    description:
      "We help you present your genuine self. No fabrication, no exaggeration — just clear, professional communication of your real experiences.",
  },
  {
    icon: BookOpen,
    title: "Structured learning",
    description:
      "Whether it is essays, activities or profiles, we give step-by-step guidance that builds understanding, not just outputs.",
  },
];

const notThis = [
  "We don't write your essays for you",
  "We don't fabricate or exaggerate experiences",
  "We don't guarantee admission anywhere",
  "We don't replace genuine effort and achievement",
];

/** An eyebrow and a heading, in the one pairing used across the whole page. */
function SectionHead({ eyebrow, title, id }: { eyebrow: string; title: string; id?: string }) {
  return (
    <>
      <p className="font-display text-[11px] font-bold uppercase tracking-[0.16em] text-accent">
        {eyebrow}
      </p>
      <h2
        id={id}
        className="mt-3 font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
      >
        {title}
      </h2>
    </>
  );
}

export default function About() {
  return (
    <div className="py-8 sm:py-12">
      <Seo
        title="About — Pathforge"
        description="Why we built Pathforge, how the four-phase Journey works, who it is for, the rules we hold our AI to, and the 2026 Global Recognition Award it won for Innovation."
        path="/about"
      />

      <div className="section-container max-w-4xl">
        {/* Masthead. One logo, at rest — it used to spin on hover, which is a
            thing a page does when it has nothing to say in the first screen. */}
        <ScrollReveal>
          <header className="border-b border-border/60 pb-10">
            <img
              src={pathforgeLogo}
              alt="Pathforge logo"
              className="h-12 w-auto object-contain"
            />
            <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              We built the guidance we could not find.
            </h1>
            <p className="mt-5 max-w-2xl font-serif text-xl leading-relaxed text-muted-foreground sm:text-2xl">
              Pathforge exists to help students understand what actually matters in a college
              application — and to present it clearly, in their own words.
            </p>
          </header>
        </ScrollReveal>

        {/* Mission */}
        <ScrollReveal>
          <section aria-labelledby="mission-heading" className="border-b border-border/60 py-12">
            <SectionHead id="mission-heading" eyebrow="Why we built it" title="College preparation is confusing" />
            <div className="mt-6 grid gap-8 md:grid-cols-[1.15fr_1fr]">
              <div className="space-y-4 text-base leading-relaxed text-muted-foreground">
                <p>
                  Students spend years wondering which activities count, how to write an essay that
                  sounds like a person, and how to describe what they have done without either
                  underselling it or inventing it. The advice they get back is generic when it is
                  not contradictory, and the students who get good advice are usually the ones who
                  could already afford it.
                </p>
                <p>
                  That gap is the whole reason this exists. Not a shortcut around the work — a
                  clear view of which work is worth doing, and a way to show it honestly at the
                  end.
                </p>
              </div>
              <ul className="space-y-3 border-l border-border/60 pl-6 text-sm leading-relaxed text-muted-foreground">
                <li>
                  Activities that carry weight for <span className="text-foreground">your</span>{" "}
                  intended path, not a generic list
                </li>
                <li>Essays refined for structure and clarity, written by you</li>
                <li>Informal descriptions turned into application-ready entries</li>
                <li>A LinkedIn profile that a reader takes seriously</li>
              </ul>
            </div>
          </section>
        </ScrollReveal>

        {/* The four phases. A numbered sequence rather than four cards: the
            order is the point, and a grid of equal boxes hides it. */}
        <ScrollReveal>
          <section aria-labelledby="journey-heading" className="border-b border-border/60 py-12">
            <SectionHead id="journey-heading" eyebrow="How it works" title="Four phases, in order" />
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
              The Journey is the spine of the product. A ninth grader starts at the top of it; a
              twelfth grader applying this cycle lives in the last two phases.
            </p>
            <ol className="mt-8 divide-y divide-border/60 border-y border-border/60">
              {phases.map((phase, i) => (
                <li key={phase.name} className="grid gap-x-6 gap-y-2 py-6 sm:grid-cols-[auto_10rem_1fr]">
                  {/* Serif numerals, as everywhere else a figure appears. */}
                  <span className="font-serif text-2xl leading-none text-muted-foreground/70 tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="font-display text-lg font-semibold tracking-tight text-foreground">
                    {phase.name}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground sm:col-start-3 sm:row-start-1">
                    {phase.description}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </ScrollReveal>

        {/* Principles */}
        <section aria-labelledby="principles-heading" className="border-b border-border/60 py-12">
          <ScrollReveal>
            <SectionHead id="principles-heading" eyebrow="Principles" title="What we hold to" />
          </ScrollReveal>
          <StaggerContainer className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {principles.map((principle) => (
              <motion.div key={principle.title} variants={staggerItemVariants} className="min-w-0">
                <principle.icon className="h-4 w-4 text-accent" aria-hidden="true" />
                <h3 className="mt-3 font-display text-base font-semibold tracking-tight text-foreground">
                  {principle.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {principle.description}
                </p>
              </motion.div>
            ))}
          </StaggerContainer>
        </section>

        {/* Who it's for */}
        <ScrollReveal>
          <section aria-labelledby="audience-heading" className="border-b border-border/60 py-12">
            <SectionHead id="audience-heading" eyebrow="Who it is for" title="Grades nine through twelve — and the people advising them" />
            <div className="mt-6 max-w-2xl space-y-4 text-base leading-relaxed text-muted-foreground">
              <p>
                Pathforge is built for students applying to undergraduate programmes — most often in
                the United States, United Kingdom, Canada and India, though the platform is
                country-aware and adapts its recommendations to wherever you are applying.
              </p>
              <p>
                A ninth grader uses it differently from a twelfth grader, and that is the point. If
                you are early, the value is in direction: knowing which activities are worth four
                years of your time before you have spent them. If you are applying this cycle, the
                value is in execution — refining essays, turning a messy list of achievements into
                application-ready statements, and understanding honestly where each school on your
                list actually sits for you.
              </p>
              <p>
                School counsellors and independent advisers use the counsellor portal to manage a
                roster: student deep-dives, intervention alerts when someone stalls, and broadcast
                announcements to a whole cohort. One counsellor covering four hundred students
                cannot read four hundred essay drafts, but they can see which twenty students need
                them this week.
              </p>
            </div>
          </section>
        </ScrollReveal>

        {/* How we use AI. This one gets a panel: it is the claim a reader is
            most likely to want to hold us to, and setting it apart is the
            honest way to say "read this part". */}
        <ScrollReveal>
          <section
            aria-labelledby="ai-heading"
            className="my-12 rounded-2xl border border-border/60 bg-card p-6 sm:p-10"
          >
            <SectionHead id="ai-heading" eyebrow="How we use AI" title="The model is never allowed to invent you" />
            <div className="mt-6 max-w-2xl space-y-4 text-base leading-relaxed text-muted-foreground">
              <p>
                Pathforge runs on frontier language models from Google and OpenAI, accessed through
                a managed gateway. What matters more than which model we use is the constraint we
                put around it: the AI is never permitted to invent a credential, inflate an
                achievement, or assert a fact about you that you did not give it.
              </p>
              <p>
                That constraint is why our essay tool refines rather than writes. It will
                restructure a paragraph, cut a sentence that is doing no work, and tell you where
                your argument goes slack — but the experience on the page has to be yours, because
                an admissions officer reading it will assume it is.
              </p>
              <p>
                The same discipline applies to our scores. The College Readiness Score, Admissions
                Probability, Outcome Bands and Journey Score are all calibrated to your target
                university list, and strictness scales with selectivity. They are directional
                estimates built from verifiable inputs — useful for deciding where to aim, and not
                official assessments. No university sees them, and none of them carry weight with
                any institution.
              </p>
              <p className="text-foreground">
                Your work is not used to train third-party models. What you write stays yours.
              </p>
            </div>
          </section>
        </ScrollReveal>

        {/* What we're not. Previously a raw `whileInView` list, which left every
            line at opacity 0 for anyone with prefers-reduced-motion set — and
            baked that zero into the prerendered HTML. StaggerContainer drops
            out to a plain div in both of those cases. */}
        <ScrollReveal>
          <section aria-labelledby="limits-heading" className="border-l-2 border-accent py-2 pl-6 sm:pl-8">
            <h2
              id="limits-heading"
              className="font-display text-2xl font-semibold tracking-tight text-foreground"
            >
              What we're not
            </h2>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              Pathforge is a guidance and presentation tool — not a shortcut.
            </p>
            <StaggerContainer className="mt-5 space-y-3">
              {notThis.map((item) => (
                <motion.div
                  key={item}
                  variants={staggerItemVariants}
                  className="flex items-start gap-2.5 text-sm text-muted-foreground"
                >
                  <X className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/70" aria-hidden="true" />
                  <span>{item}</span>
                </motion.div>
              ))}
            </StaggerContainer>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground">
              What we <em>do</em> is help you understand what matters, and present your authentic
              self with clarity and confidence.
            </p>
          </section>
        </ScrollReveal>

        {/* Recognition closes the page: it is the one section a first-time
            visitor is most likely to want corroborated, and it earns the last
            word by being checkable rather than by being a claim. */}
        <AwardSection />
      </div>
    </div>
  );
}
