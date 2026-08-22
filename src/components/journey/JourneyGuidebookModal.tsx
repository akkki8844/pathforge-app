import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { X, BookOpen, Target, Upload, ShieldCheck, Gem, Heart, Send, Trophy, AlertTriangle, ListChecks, Map, Compass, Lightbulb, Flame, Lock, CheckCircle2, GraduationCap, Clock, HelpCircle } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

/**
 * Detailed in-product guide for the Journey page. Replaces the previous
 * placement-test pop-up that used to open from this button.
 */
export function JourneyGuidebookModal({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden gap-0 [&>button]:hidden">
        <div className="relative bg-gradient-to-br from-primary to-accent p-6 text-primary-foreground">
          <DialogClose
            className="absolute top-4 right-4 h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </DialogClose>
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold">Journey Guidebook</DialogTitle>
              <DialogDescription className="text-sm opacity-90 mt-1 text-primary-foreground">
                Everything you need to know to play the Journey — how levels, proofs, gems and hearts work.
              </DialogDescription>
            </div>
          </div>
        </div>

        <ScrollArea className="max-h-[70vh]">
          <div className="p-6 space-y-7 text-sm leading-relaxed">

            <Section icon={Target} title="What the Journey is">
              The Journey is your full college-prep roadmap — split into <b>15 Levels</b> with <b>20 Stages each</b>
              (300 total). Each stage is a real, concrete action tailored to your major, country, grade and curriculum.
              You move forward by finishing stages, not by reading.
            </Section>

            <Section icon={Map} title="The 15 Levels — at a glance">
              <ol className="list-decimal pl-5 space-y-1">
                <li><b>Foundation</b> — set the academic and identity baseline.</li>
                <li><b>Exploration</b> — sample your major through podcasts, courses and projects.</li>
                <li><b>Building</b> — pick a sub-niche and ship your first artifact.</li>
                <li><b>Differentiation</b> — own a measurable spike that sets you apart.</li>
                <li><b>Elite</b> — top-tier signal and a coherent narrative.</li>
                <li><b>Mastery</b> — teach, mentor, build repeatable systems.</li>
                <li><b>Pioneer</b> — original work: prototypes, papers, products.</li>
                <li><b>Authority</b> — outside recognition: press, citations, awards.</li>
                <li><b>Legacy</b> — build systems that outlast you.</li>
                <li><b>Apex</b> — operate like a college sophomore: final apps, originals, send.</li>
                <li><b>Interview & Decision</b> — own the room, then the wait.</li>
                <li><b>Commit</b> — choose, and mean it.</li>
                <li><b>Bridge</b> — close every loop before you leave.</li>
                <li><b>Launch Prep</b> — get campus-ready.</li>
                <li><b>Matriculation</b> — arrive. The next chapter starts.</li>
              </ol>
            </Section>

            <Section icon={Compass} title="How to read the path">
              <ul className="list-disc pl-5 space-y-1.5">
                <li><b>Green pulsing node with a "Start" badge</b> = your current stage. Tap it to play.</li>
                <li><b>Green node with a check</b> = completed. You can re-open it any time to review proofs.</li>
                <li><b>Grey node with a lock</b> = locked. Finish the previous stage to unlock it.</li>
                <li><b>The vertical glowing trail</b> visualizes how far down the path you've scrolled.</li>
                <li><b>The trophy at the end</b> is your final submission — submitting university applications.</li>
              </ul>
            </Section>

            <Section icon={ListChecks} title="How a stage works">
              <ol className="list-decimal pl-5 space-y-1.5">
                <li><b>Open the stage.</b> Tap any unlocked node on the path.</li>
                <li><b>Read why it matters + the outcome to deliver.</b> Don't skip this — the outcome is what you'll prove.</li>
                <li><b>Follow the micro-steps</b> (Research → Select → Execute → Present). They turn a goal into 4 small actions.</li>
                <li><b>Upload proof for each verification task.</b> Certificate, screenshot, link or PDF — see below.</li>
                <li><b>Press "Submit for verification".</b> Our AI auto-verifies high-confidence proofs in under a minute. Edge cases go to admin review.</li>
                <li><b>Press "Submit level"</b> once every task has been submitted. You move on even if a proof is still being reviewed.</li>
              </ol>
            </Section>

            <Section icon={Lock} title="Sequential unlock rule" iconClassName="text-muted-foreground">
              Stages unlock <b>one at a time</b>, in order. Stage 2.1 only opens after every task in stage 1.20 is
              checked off and submitted. This is intentional — it prevents skipping ahead and keeps the story you'll
              show admissions officers truthful and chronological.
            </Section>

            <Section icon={GraduationCap} title="Placement — already done a lot?">
              Tap <b>Place My Level</b> (top right) to take a short placement test. Based on your answers we'll jump
              your Journey forward to the level that matches your real profile, so you don't have to grind through
              early stages you've already lived. You can re-take the placement any time.
            </Section>

            <Section icon={Upload} title="Uploading proof">
              <ul className="list-disc pl-5 space-y-1.5">
                <li>PNG, JPG, WEBP or PDF — up to 10 MB.</li>
                <li>A short note is <b>required</b> (1–2 sentences explaining what the proof shows).</li>
                <li>Public links are accepted for things like GitHub repos, Devpost, Kaggle, LinkedIn posts, school pages, official olympiad sites.</li>
                <li>If something looks unrelated, the AI will reject it. Re-upload a clearer version — same task, no penalty if you fix it before the level is submitted.</li>
                <li>Screenshots must be unedited. Cropping is fine; whiting out names/grades is fine. Anything pasted in Photoshop is not.</li>
              </ul>
            </Section>

            <Section icon={ShieldCheck} title="Verification statuses">
              <ul className="space-y-1.5">
                <li><Badge variant="outline" className="border-amber-500/40 text-amber-600">Verifying</Badge> — AI is checking now. Usually under a minute.</li>
                <li><Badge variant="outline" className="border-emerald-500/40 text-emerald-600">Approved</Badge> — counts toward stage completion.</li>
                <li><Badge variant="outline" className="border-rose-500/40 text-rose-600">Rejected</Badge> — read the AI's reason and re-upload. This costs you nothing; hearts are a pace budget, not an accuracy one.</li>
                <li><Badge variant="outline" className="border-blue-500/40 text-blue-600">Needs review</Badge> — sent to a human admin.</li>
              </ul>
            </Section>

            <Section icon={Gem} title="Gems — one per level" iconClassName="text-sky-500">
              <p>
                <b>Completing a level awards you 1 gem.</b> That's the whole rule. Gems are permanent, they power
                the leaderboard, and they unlock cosmetic and bonus rewards later.
              </p>
              <p className="mt-2">
                Re-submitting a level you've already cleared does <i>not</i> award a second gem — your gem count is
                a plain, honest count of how many levels you have actually finished. Work the next level instead.
              </p>
            </Section>

            <Section icon={Heart} title="Hearts — your weekly pace budget" iconClassName="text-rose-500">
              <p>Hearts measure momentum, not accuracy. The rules:</p>
              <ul className="list-disc pl-5 space-y-1.5 mt-2">
                <li>You get <b>5 hearts at the start of every month</b>. They don't carry over — each month starts fresh at 5.</li>
                <li>
                  <b>Every full week that passes without you completing a level costs 1 heart.</b> Finish a level and
                  the week-clock restarts from that moment, so a steady one-level-a-week pace never costs you anything.
                </li>
                <li>
                  You can <b>reset your hearts back to 5 twice per calendar month</b>. Tap <b>Reset</b> next to the
                  heart counter. Both resets refresh on the 1st.
                </li>
                <li>Running out of hearts doesn't lock you out or erase progress. Nothing stops you from working — hearts are a pace signal, and a visible one on the leaderboard.</li>
              </ul>
              <p className="mt-2">
                Why the resets are capped at two: an unlimited reset would make the weekly deadline meaningless, and
                no reset at all would punish a student for one bad month. Two is enough to absorb exam weeks and
                illness while keeping the pressure to keep moving real. <b>Nobody is stopping you from doing more.</b>
              </p>
            </Section>

            <Section icon={Flame} title="Streak — daily momentum" iconClassName="text-orange-500">
              Your streak counts the number of consecutive days you've completed at least one verifiable action on
              the platform (any stage task, weekly planner check-in, or proof upload). Don't break the chain —
              streaks are the single strongest predictor of who actually finishes the Journey.
            </Section>

            <Section icon={Send} title="Submitting a level">
              The <b>Submit level</b> button activates once every proof-required task has at least <i>been submitted</i>
              for verification and every manual task is checked off. You can move on even before a proof is approved —
              this prevents waiting on review from blocking momentum.
            </Section>

            <Section icon={Trophy} title="Leaderboard">
              Live ranking based first on <b>gems</b>, then on <b>hearts</b> as a tiebreaker, then on <b>streak</b>.
              Filter by <b>Global</b>, your <b>School</b>, or your <b>Grade</b>. Numbers are real — only students who
              have actually played show up.
            </Section>

            <Section icon={Clock} title="How long it takes">
              Most students clear 1–2 stages per week during the school term, and 3–5 per week over holidays. At that
              pace, a Grade-9 student finishes the Journey before Grade-12 application deadlines with room to spare.
              You can also burst — there's no daily cap on stages, and finishing several levels in one week is
              perfectly fine. <b>One completed level per week keeps all 5 hearts.</b>
            </Section>

            <Section icon={AlertTriangle} title="Credits on the Journey" iconClassName="text-amber-500">
              The only thing on this page that consumes a credit is pressing <b>Submit for verification</b>
              (1 credit per submission). Browsing the path, opening stages and toggling manual tasks are free.
            </Section>

            <Section icon={CheckCircle2} title="What admissions readers will see">
              Every approved proof becomes a row in your <b>Outcomes</b> profile and feeds your Admissions probability
              and Requirements reports. There is no separate "essay" of your activities to write later — the Journey
              <i> is</i> the activity list, time-stamped and verified.
            </Section>

            <Section icon={HelpCircle} title="FAQ">
              <ul className="list-disc pl-5 space-y-1.5">
                <li><b>I made a mistake on an approved proof — can I edit?</b> Yes, open the stage and re-upload. The latest approved proof is the one that counts.</li>
                <li><b>Can I do stages out of order?</b> No. Sequential unlock is enforced so the chronology is honest.</li>
                <li><b>What if my country/curriculum doesn't have a specific contest a stage suggests?</b> Use the closest equivalent and explain in the proof note. The AI is trained to accept regional alternatives.</li>
                <li><b>Does the Journey reset?</b> Your levels and gems never reset — they persist across sessions and devices. Only hearts are periodic: they refill to 5 on the 1st of each month.</li>
                <li><b>I lost a heart but I was working the whole week.</b> Hearts track <i>completed levels</i>, not effort. If a level is taking more than a week, that's usually a sign to break it up — or spend one of your two monthly resets.</li>
              </ul>
            </Section>

            <Section icon={Lightbulb} title="Tips">
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Don't game stages. Admissions readers will compare your Outcomes to your story.</li>
                <li>Re-read the outcome before you upload — it's the single best predictor of approval.</li>
                <li>Use <b>Place My Level</b> at the top if you've already done a lot of the early work.</li>
                <li>Pair the Journey with the <b>Weekly Planner</b> — it auto-suggests time blocks for your current stage.</li>
              </ul>
            </Section>

          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function Section({
  icon: Icon, title, iconClassName, children,
}: { icon: any; title: string; iconClassName?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-2 text-base font-bold text-foreground">
        <Icon className={`h-4 w-4 ${iconClassName ?? "text-primary"}`} />
        {title}
      </h3>
      <div className="text-muted-foreground">{children}</div>
    </section>
  );
}
