import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { GraduationCap, ArrowRight, ExternalLink } from "lucide-react";
import { Seo } from "@/components/Seo";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { Button } from "@/components/ui/button";

const IVIES = [
  { name: "Brown University", city: "Providence, RI", url: "https://admission.brown.edu/", note: "Open Curriculum — admissions reads for students who can justify designing their own course of study." },
  { name: "Columbia University", city: "New York, NY", url: "https://undergrad.admissions.columbia.edu/", note: "Core Curriculum plus list-style short answers; reading and intellectual habits are explicitly asked for." },
  { name: "Cornell University", city: "Ithaca, NY", url: "https://admissions.cornell.edu/", note: "You apply to a specific undergraduate college, so fit with that college's major is assessed directly." },
  { name: "Dartmouth College", city: "Hanover, NH", url: "https://admissions.dartmouth.edu/", note: "Small, undergraduate-focused; community contribution and teaching-facing recommendations carry weight." },
  { name: "Harvard University", city: "Cambridge, MA", url: "https://college.harvard.edu/admissions", note: "Short supplemental answers reward depth in one or two areas over a long, flat activity list." },
  { name: "Princeton University", city: "Princeton, NJ", url: "https://admission.princeton.edu/", note: "Service and civic engagement are named prompts, not subtext." },
  { name: "University of Pennsylvania", city: "Philadelphia, PA", url: "https://admissions.upenn.edu/", note: "Pre-professional and interdisciplinary; 'why this program' answers must be specific to a school within Penn." },
  { name: "Yale University", city: "New Haven, CT", url: "https://admissions.yale.edu/", note: "Community and collaborative intellect; short 'why Yale' answers leave no room for generic praise." },
];

const STEPS = [
  {
    title: "1. Pick a through-line before you pick activities",
    body:
      "Ivy readers see thousands of applications with strong grades. What separates files is coherence: a recognisable through-line that shows up in coursework, activities, essays and recommendations. Choose one intellectual question or problem you actually care about, then judge every commitment by whether it advances that line. Two deep commitments beat nine shallow ones.",
  },
  {
    title: "2. Make the academic record match the story",
    body:
      "Highly selective admissions is contextual: committees read your transcript against what your school offers. Take the most demanding sequence available in the subjects your through-line depends on, and be able to explain any gap. If your school caps AP/IB access, say so in the additional-information section — unexplained gaps get read as choices.",
  },
  {
    title: "3. Build evidence, not adjectives",
    body:
      "Every claim in an application should be attached to something a stranger could verify: a placement, a publication, a launched project, a headcount you led, a dataset you published, a measurable outcome. 'Passionate about biology' is unverifiable. 'Ran a 14-week soil-microbe study, presented at the state science fair, dataset public on GitHub' is evidence.",
  },
  {
    title: "4. Go niche where competition is thin",
    body:
      "National olympiads are legible but crowded. Selective research programmes, subject-specific competitions, open-source contributions, published writing, small-scale but genuinely useful community projects and paid work all read as adult, and far fewer applicants have them. Depth in an unusual lane distinguishes you faster than a rank in a crowded one.",
  },
  {
    title: "5. Write essays that only you could have written",
    body:
      "The personal statement is a character document, not a résumé restatement. Use one concrete scene and let the reflection do the analytical work. Supplements are a fit test — name courses, labs, professors, traditions and programmes that exist at that specific school, and connect each to something already evidenced elsewhere in your file.",
  },
  {
    title: "6. Manage recommendations deliberately",
    body:
      "Teacher letters at this level are read for specificity. Give each recommender a brag sheet: the through-line, two or three concrete moments from their classroom, and what you hope the letter demonstrates. Ask junior-year teachers in subjects central to your intended major, and ask early.",
  },
  {
    title: "7. Apply strategically across the whole list",
    body:
      "Single-digit admit rates mean no Ivy is a target school for anyone. Build a list where the majority of applications go to schools where your academic profile sits at or above the admitted middle 50%, and treat every Ivy application as an upside bet on a file you would be proud of regardless. Understand each school's early-decision or early-action rules before committing — they are binding at some, not at others.",
  },
];

const FAQS = [
  {
    q: "What GPA and test scores do you need to get into an Ivy League college?",
    a: "There is no cut-off. Admitted students cluster near the top of their school's grading scale and, where scores are submitted, in the top few percentiles — but every Ivy publishes a range, not a threshold, and reads it against your school's context. Check the current Common Data Set on each school's institutional research page for the exact admitted middle 50% before you plan around a number.",
  },
  {
    q: "Do you need to be a national-level competitor to get in?",
    a: "No. National recognition helps because it is easy to verify, but it is one form of evidence among many. Sustained, documented work — research, publications, launched projects, paid roles, community impact with real numbers — is read as seriously, and is available to far more students.",
  },
  {
    q: "Does applying early improve your chances at Ivy League schools?",
    a: "Early rounds usually report higher admit rates, but the early pool includes recruited athletes and legacy applicants, so the raw gap overstates the advantage. Early is worth it when a school is a clear first choice and your file is already strong in the autumn; it is not worth submitting an unfinished application.",
  },
  {
    q: "How early should you start preparing?",
    a: "Grade 9 or 10 is when the through-line is cheapest to build, because commitments have time to compound into evidence. Starting in grade 11 is still workable — it just means being far more selective about what you take on.",
  },
  {
    q: "Do international students face different odds?",
    a: "Generally yes: most Ivies admit a smaller share of international applicants and financial-aid policies differ by school, with only a few need-blind for international students. Verify each school's current international aid policy directly on its admissions site.",
  },
];

export default function IvyLeagueAdmissions() {
  const url = "https://pathforge.co.in/guides/ivy-league-admissions";

  return (
    <div className="py-10 sm:py-16 relative overflow-hidden">
      <Seo
        title="Ivy League Admissions — Pathforge"
        description="A practical, evidence-based guide to how to get into Ivy League colleges and schools — building a coherent profile, choosing niche activities, essays, recommendations and list strategy."
        path="/guides/ivy-league-admissions"
        type="article"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "Article",
            "@id": `${url}#article`,
            headline: "How to Get Into Ivy League Colleges",
            description:
              "A step-by-step guide to getting into Ivy League colleges: building a coherent through-line, evidencing it, niche activities, essays, recommendations and list strategy.",
            author: { "@type": "Organization", name: "Pathforge" },
            publisher: { "@type": "Organization", name: "Pathforge" },
            mainEntityOfPage: url,
            inLanguage: "en",
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "@id": `${url}#faq`,
            mainEntity: FAQS.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "@id": `${url}#breadcrumbs`,
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: "https://pathforge.co.in/" },
              { "@type": "ListItem", position: 2, name: "How to Get Into Ivy League Colleges", item: url },
            ],
          },
        ]}
      />

      <div className="absolute top-20 right-0 w-72 h-72 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

      <article className="section-container max-w-3xl relative z-10">
        <header className="mb-10">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-1.5 text-accent text-xs font-semibold uppercase tracking-wide mb-3"
          >
            <GraduationCap className="h-3.5 w-3.5" /> Admissions guide
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="text-3xl sm:text-4xl font-bold text-foreground"
          >
            How to get into Ivy League colleges
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-4 text-base text-muted-foreground leading-relaxed"
          >
            Every Ivy League college or university admits a single-digit share of applicants, and
            almost all of those applicants have strong grades. The deciding factor is rarely one
            more award — it is whether the file reads as one coherent person with verifiable
            evidence behind every claim. This is the method Pathforge builds around, written out
            in full.
          </motion.p>
        </header>

        <ScrollReveal>
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-foreground mb-3">
              What Ivy League admissions actually evaluates
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              All eight Ivies read holistically: the transcript in the context of your school, then
              the activities, essays, recommendations and any additional context you supply. Two
              applicants with identical grades are separated by what the rest of the file proves
              about them.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              In practice, that means two things do the heavy lifting.{" "}
              <strong className="text-foreground">Coherence</strong> — the file argues one thing
              about you rather than five — and{" "}
              <strong className="text-foreground">evidence</strong> — every claim is attached to
              something a reader could independently check. Everything below is downstream of those
              two ideas.
            </p>
          </section>
        </ScrollReveal>

        <ScrollReveal>
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-foreground mb-5">
              Seven steps to a competitive Ivy League application
            </h2>
            <ol className="space-y-6">
              {STEPS.map((s) => (
                <li key={s.title}>
                  <h3 className="text-base font-semibold text-foreground mb-1.5">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
                </li>
              ))}
            </ol>
          </section>
        </ScrollReveal>

        <ScrollReveal>
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-foreground mb-2">
              The eight Ivy League schools, and what each one reads for
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-5">
              Requirements, deadlines and admitted-student data change every cycle. Each school
              below links to its official admissions site — verify numbers there rather than from
              third-party summaries.
            </p>
            <div className="overflow-x-auto rounded-xl border border-border/60">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">
                  The eight Ivy League universities, their locations and what their applications
                  emphasise
                </caption>
                <thead className="bg-muted/40">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold text-foreground">School</th>
                    <th scope="col" className="px-4 py-3 font-semibold text-foreground">Location</th>
                    <th scope="col" className="px-4 py-3 font-semibold text-foreground">What the application emphasises</th>
                  </tr>
                </thead>
                <tbody>
                  {IVIES.map((s) => (
                    <tr key={s.name} className="border-t border-border/50 align-top">
                      <th scope="row" className="px-4 py-3 font-medium text-foreground whitespace-nowrap">
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 hover:text-accent"
                        >
                          {s.name}
                          <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        </a>
                      </th>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{s.city}</td>
                      <td className="px-4 py-3 text-muted-foreground">{s.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </ScrollReveal>

        <ScrollReveal>
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-foreground mb-3">
              A grade-by-grade timeline
            </h2>
            <dl className="space-y-4">
              {[
                ["Grade 9", "Try widely, then cut. End the year with two or three commitments you would defend, plus the hardest course load you can sustain honestly."],
                ["Grade 10", "Turn commitments into output: a project, a role with responsibility, a first competition or a first piece of published work. Start recording evidence as you go — dates, numbers, links."],
                ["Grade 11", "The heaviest year. Peak rigour, standardised testing if you plan to submit scores, a summer programme or research placement, and the leadership step in your main activity. Identify recommenders by spring."],
                ["Grade 12", "Finalise the list, write and revise essays over the summer before senior year, brief your recommenders, then submit early where a school is a genuine first choice."],
              ].map(([term, def]) => (
                <div key={term} className="rounded-xl border border-border/60 p-4">
                  <dt className="text-sm font-semibold text-foreground">{term}</dt>
                  <dd className="mt-1 text-sm text-muted-foreground leading-relaxed">{def}</dd>
                </div>
              ))}
            </dl>
          </section>
        </ScrollReveal>

        <ScrollReveal>
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-foreground mb-3">Mistakes that cost strong applicants</h2>
            <ul className="space-y-2.5 text-sm text-muted-foreground leading-relaxed list-disc pl-5">
              <li>A long activity list with no through-line — it reads as résumé-padding, not interest.</li>
              <li>Essays that restate the activities section instead of revealing character.</li>
              <li>Supplements that could be pasted into any school's application unchanged.</li>
              <li>Claims with no evidence: founded clubs with no members, initiatives with no outcome.</li>
              <li>Recommenders asked late, with no context about what the letter should demonstrate.</li>
              <li>A list weighted towards reaches, with no schools where the profile sits comfortably above the admitted middle.</li>
            </ul>
          </section>
        </ScrollReveal>

        <ScrollReveal>
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-foreground mb-5">Frequently asked questions</h2>
            <div className="space-y-5">
              {FAQS.map((f) => (
                <div key={f.q}>
                  <h3 className="text-base font-semibold text-foreground mb-1.5">{f.q}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.a}</p>
                </div>
              ))}
            </div>
          </section>
        </ScrollReveal>

        <ScrollReveal>
          <section className="rounded-2xl border border-border/60 bg-card/60 p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-foreground">Build your plan in the workspace</h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Pathforge turns this method into a working plan: a four-phase journey, a curated
              activity and competition database, evidence-gated progress, essay and application
              builders, and a calibrated admissions estimate that only counts what you can prove.
              Free to start — no card required.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/auth?view=signup">
                  Start your application plan <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/about">How Pathforge works</Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Also useful: <Link to="/guides/ivy-league-study-tools" className="underline hover:text-accent">Ivy League study tools</Link>{" "}
              · <Link to="/pricing" className="underline hover:text-accent">plans and pricing</Link>{" "}
              · <Link to="/faq" className="underline hover:text-accent">frequently asked questions</Link>
            </p>
          </section>
        </ScrollReveal>
      </article>
    </div>
  );
}
