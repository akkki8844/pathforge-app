import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Wrench, ArrowRight } from "lucide-react";
import { Seo } from "@/components/Seo";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { Button } from "@/components/ui/button";

const CATEGORIES = [
  {
    title: "Application planning and deadline tracking",
    body:
      "A single view of every deadline — Common App, school-specific supplements, scholarships, test dates — is the tool that prevents the single most common Ivy League application mistake: a strong file submitted late, or a supplement finished in a rush the night it's due. Look for something that turns a deadline into a scheduled block of work, not just a date on a list.",
    pathforge: "Pathforge's Study Planner merges your calendar, tasks, reminders and goal deadlines into one agenda, so a supplement due date and the study block that gets it written sit on the same page.",
    link: { to: "/routine/study-planner", label: "See the Study Planner" },
  },
  {
    title: "Activity and evidence tracking",
    body:
      "Ivy League admissions reads for evidence, not adjectives — a project, a placement, a number, a link. The right tool for this is a running record you update as things happen, not a document you try to reconstruct from memory in November of senior year.",
    pathforge: "Pathforge's Activities and Outcomes sections hold a structured, evidence-gated record of everything you've built, so your application and resume pull from the same verified file.",
    link: { to: "/activities", label: "See Activities" },
  },
  {
    title: "Essay and writing tools",
    body:
      "A personal statement is a character document, not a résumé restatement — the tool that helps most is one that pushes you toward a concrete scene and honest reflection, and flags when a supplement could be pasted into any school's application unchanged.",
    pathforge: "Pathforge's Advisor reads your whole file — activities, essays, target schools — before it gives feedback, so notes are specific to your story rather than generic writing advice.",
    link: { to: "/advisor", label: "See the Advisor" },
  },
  {
    title: "Admissions research and school-fit tools",
    body:
      "Requirements, admitted-student data and deadlines change every cycle, so the tool that matters is one that keeps a current, school-by-school view rather than a static list you copied once and never revisited.",
    pathforge: "Pathforge's Journey and Requirements sections track what each target school actually asks for, phase by phase, from freshman year through submission.",
    link: { to: "/journey", label: "See the Journey" },
  },
  {
    title: "Study and time-management tools",
    body:
      "Grades and test scores still have to hold up while you build the rest of the file. A study tool earns its place if it turns your timetable and deadlines into an actual weekly plan — not another app you have to manually update to match your calendar.",
    pathforge: "Pathforge's Study Planner can suggest a full week of study blocks from your timetable, upcoming deadlines and past study time, then adjusts as your calendar changes.",
    link: { to: "/routine/timetable", label: "See the Timetable" },
  },
];

const FAQS = [
  {
    q: "What are the best study tools for Ivy League applicants?",
    a: "The tools that matter most are the ones that keep your whole application — deadlines, activities, essays, recommendations and study time — in one place rather than scattered across five apps. A spreadsheet can track deadlines; it can't tell you that your personal statement contradicts your activities list, or that a deadline needs a study block scheduled around it. That's the gap purpose-built tools like Pathforge are for.",
  },
  {
    q: "Do I need a paid tool, or can free apps do the job?",
    a: "Free calendar and notes apps handle scheduling fine. Where they fall short is anything that requires reading your file as a whole — checking that your essays, activities and target schools tell one coherent story. That's a harder problem than task-tracking, which is why dedicated college-admissions platforms exist.",
  },
  {
    q: "Is a study planner actually useful for Ivy League preparation, or just for grades?",
    a: "Both. Selective admissions still reads your transcript first — a study planner that protects your grades while you also build activities, essays and a coherent file is doing double duty, not a separate job.",
  },
  {
    q: "How early should I start using application and study tools?",
    a: "Grade 9 or 10, for the same reason a through-line is cheapest to build early: a tool that has been tracking your activities and study time for three years produces a far richer evidence file than one you open for the first time in senior year.",
  },
];

export default function IvyLeagueStudyTools() {
  const url = "https://pathforge.co.in/guides/ivy-league-study-tools";

  return (
    <div className="py-10 sm:py-16 relative overflow-hidden">
      <Seo
        title="Ivy League Study Tools — Pathforge"
        description="A practical guide to the best Ivy League study tools and apps — application planners, activity trackers, essay tools and study planners, and what each one should actually do."
        path="/guides/ivy-league-study-tools"
        type="article"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "Article",
            "@id": `${url}#article`,
            headline: "Ivy League Study Tools: A Buyer's Guide",
            description:
              "What to look for in Ivy League study tools and application planners: deadline tracking, activity and evidence tracking, essay tools, admissions research, and study time management.",
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
              {
                "@type": "ListItem",
                position: 2,
                name: "How to Get Into Ivy League Colleges",
                item: "https://pathforge.co.in/guides/ivy-league-admissions",
              },
              { "@type": "ListItem", position: 3, name: "Ivy League Study Tools", item: url },
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
            <Wrench className="h-3.5 w-3.5" /> Tools guide
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="text-3xl sm:text-4xl font-bold text-foreground"
          >
            Ivy League study tools: what actually helps
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-4 text-base text-muted-foreground leading-relaxed"
          >
            A search for "Ivy League study tools" turns up calendars, flashcard apps and generic
            planners. Almost none of them were built for the actual problem: keeping deadlines,
            activities, essays, recommendations and study time in one coherent, evidence-backed
            file. Here's what each category of tool needs to do, and why.
          </motion.p>
        </header>

        <ScrollReveal>
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-foreground mb-3">
              Why generic productivity apps fall short
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              A to-do list app can hold a deadline. It cannot tell you that your personal statement
              contradicts your activities list, that a target school's supplement wants something
              your file doesn't yet evidence, or that this week's study plan needs to protect time
              for an essay revision before a deadline. Ivy League preparation is a handful of
              interlocking problems — academics, activities, essays, recommendations, list strategy
              — and the tools that help most are the ones built to read across all of them at once.
            </p>
          </section>
        </ScrollReveal>

        <ScrollReveal>
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-foreground mb-5">
              Five categories of tool, and what each should do
            </h2>
            <div className="space-y-8">
              {CATEGORIES.map((c) => (
                <div key={c.title} className="rounded-2xl border border-border/60 p-5 sm:p-6">
                  <h3 className="text-base font-semibold text-foreground mb-1.5">{c.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-3">{c.body}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    <strong className="text-foreground">In Pathforge: </strong>
                    {c.pathforge}
                  </p>
                  <Link
                    to={c.link.to}
                    className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
                  >
                    {c.link.label} <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          </section>
        </ScrollReveal>

        <ScrollReveal>
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-foreground mb-3">
              What to check before you commit to a tool
            </h2>
            <ul className="space-y-2.5 text-sm text-muted-foreground leading-relaxed list-disc pl-5">
              <li>Does it connect your deadlines to actual scheduled work, or just display dates?</li>
              <li>Does it hold evidence — links, numbers, outcomes — or just a list of activity names?</li>
              <li>Does feedback on your essays account for what's already in your file, or is it generic?</li>
              <li>Does it stay current with each target school's requirements, or is the data static?</li>
              <li>Can you actually see your whole application picture in one place, on one page?</li>
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
            <h2 className="text-xl font-semibold text-foreground">
              One workspace instead of five apps
            </h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Pathforge is built around one file: a four-phase journey, a study planner and
              calendar, an evidence-gated activities record, essay and application builders, and an
              advisor that reads all of it before giving feedback. Free to start — no card required.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/auth?view=signup">
                  Start your application plan <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/guides/ivy-league-admissions">Read the Ivy League admissions guide</Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Also useful: <Link to="/pricing" className="underline hover:text-accent">plans and pricing</Link>{" "}
              · <Link to="/faq" className="underline hover:text-accent">frequently asked questions</Link>
            </p>
          </section>
        </ScrollReveal>
      </article>
    </div>
  );
}
