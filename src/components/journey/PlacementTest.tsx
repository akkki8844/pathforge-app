import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Gauge, ArrowRight, ArrowLeft, Check, GraduationCap, Rocket, Trophy, Users, Award, Loader2 } from "lucide-react";
import {
  PlacementAnswers, placeUserAtLevel, getLevelById,
  type Tier, type YesNoNA,
} from "@/lib/journeyLevels";
import { useCredits } from "@/hooks/useCredits";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grade: string;
  overallScore: number;
  onPlace: (level: number) => void;
}

// ── Question schema ──────────────────────────────────────────────────────
type Opt<V extends string | number> = { value: V; label: string; helper?: string };

type Question =
  | { key: keyof PlacementAnswers; type: "select"; q: string; sub: string; options: Opt<string>[] }
  | { key: keyof PlacementAnswers; type: "number_select"; q: string; sub: string; options: Opt<number>[] };

interface Section {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  intro: string;
  questions: Question[];
}

// Tier options reused for several questions
const tierOpts: Opt<Tier>[] = [
  { value: "none",          label: "None / not yet" },
  { value: "school",        label: "School level" },
  { value: "district",      label: "District / city level" },
  { value: "state",         label: "State / regional level" },
  { value: "national",      label: "National level" },
  { value: "international", label: "International level" },
];

const yesNoNa: Opt<YesNoNA>[] = [
  { value: "yes", label: "Yes" },
  { value: "no",  label: "No" },
  { value: "na",  label: "Not applicable" },
];

const SECTIONS: Section[] = [
  {
    id: "academics",
    title: "Academics",
    icon: GraduationCap,
    intro: "Your coursework load, GPA, test progress, math rigor, and study habits. We use this to gauge how strong your academic foundation is right now — pick 'Not applicable' only when your curriculum genuinely doesn't map to the option (e.g. no GPA system, no SAT in your country).",
    questions: [
      {
        key: "apIbCount", type: "number_select",
        q: "How many AP / IB HL / A-Level / Honours-equivalent subjects are you currently enrolled in?",
        sub: "Count courses considered the most rigorous track at your school this academic year.",
        options: [
          { value: 0, label: "0" }, { value: 1, label: "1" }, { value: 2, label: "2" },
          { value: 3, label: "3" }, { value: 4, label: "4" }, { value: 5, label: "5+" },
        ],
      },
      {
        key: "gpaTier", type: "select",
        q: "Which GPA range best describes you on an unweighted 4.0 scale?",
        sub: "Convert percentages roughly: 90%+ ≈ 3.8+, 80–89% ≈ 3.5–3.8, 70–79% ≈ 3.0–3.5.",
        options: [
          { value: "below_3",     label: "Below 3.0 (under 75%)" },
          { value: "3_to_3_5",    label: "3.0 – 3.5 (75–84%)" },
          { value: "3_5_to_3_8",  label: "3.5 – 3.8 (85–89%)" },
          { value: "3_8_plus",    label: "3.8 + (90%+)" },
          { value: "na",          label: "Not applicable to my system" },
        ],
      },
      {
        key: "mathRigor", type: "select",
        q: "What's the highest math course you're currently in or have completed?",
        sub: "We weight math rigor heavily because every quantitative major (CS, engineering, econ, finance, sciences) screens on it first.",
        options: [
          { value: "none",          label: "Below the school standard" },
          { value: "standard",      label: "Standard / regular math track" },
          { value: "honors",        label: "Honours / accelerated math" },
          { value: "ap_ib_hl",      label: "AP Calc AB or IB HL Math or A-Level Maths" },
          { value: "beyond_calc",   label: "Beyond Calc BC / Further Maths / Multivariable" },
        ],
      },
      {
        key: "testReadiness", type: "select",
        q: "Where are you with standardised tests (SAT / ACT / equivalent)?",
        sub: "If your country/system doesn't use SAT/ACT, choose 'Not applicable'.",
        options: [
          { value: "none",              label: "Not taken / not started" },
          { value: "prep_started",      label: "Started preparing — no score yet" },
          { value: "mock_strong",       label: "Mock score is strong (SAT 1400+ / ACT 31+)" },
          { value: "official_strong",   label: "Official score is strong (SAT 1400+ / ACT 31+)" },
          { value: "na",                label: "Not applicable to my system" },
        ],
      },
      {
        key: "studyHoursWeek", type: "select",
        q: "Outside of school assignments, how many hours a week do you study or build skills for your intended major?",
        sub: "Honest self-reporting only — averaged across the past 4 weeks.",
        options: [
          { value: "lt2",      label: "Less than 2 hours" },
          { value: "2_5",      label: "2 – 5 hours" },
          { value: "5_10",     label: "5 – 10 hours" },
          { value: "10_plus",  label: "More than 10 hours" },
        ],
      },
      {
        key: "subjectMastery", type: "select",
        q: "Are you in the top 10% of your year in at least one subject relevant to your intended major?",
        sub: "Use class rank, teacher's verbal confirmation, or external test percentile.",
        options: yesNoNa as Opt<string>[],
      },
      {
        key: "selfStudyHabit", type: "select",
        q: "Do you regularly learn beyond the school syllabus on your own initiative?",
        sub: "Online courses (Coursera, MIT OCW), technical books, research papers, side projects.",
        options: yesNoNa as Opt<string>[],
      },
    ],
  },
  {
    id: "projects",
    title: "Activities & Projects",
    icon: Rocket,
    intro: "Self-initiated work that exists outside the classroom — apps, articles, performances, products, portfolios. We're measuring real shipped output, audience reach, and the sustained effort behind it.",
    questions: [
      {
        key: "shippedProjectTier", type: "select",
        q: "What's the highest level a personal project of yours has reached?",
        sub: "'Reach' = where the work was shown, used, distributed, or recognised — not just where it was made.",
        options: tierOpts as Opt<string>[],
      },
      {
        key: "projectAudience", type: "select",
        q: "How many real people have actually used, read, or interacted with your work?",
        sub: "Real users, readers, listeners, or viewers — not just classmates required to look.",
        options: [
          { value: "none",     label: "None yet" },
          { value: "lt10",     label: "Under 10" },
          { value: "10_100",   label: "10 – 100" },
          { value: "100_1k",   label: "100 – 1,000" },
          { value: "1k_plus",  label: "1,000 +" },
        ],
      },
      {
        key: "publicArtifact", type: "select",
        q: "Is there a public artefact a stranger could open right now?",
        sub: "Live GitHub repo, deployed website, app store listing, PDF on the web, portfolio site, published video.",
        options: yesNoNa as Opt<string>[],
      },
      {
        key: "consistencyMonths", type: "select",
        q: "What's the longest you've sustained one single project or activity continuously?",
        sub: "Continuous engagement — not one weekend hackathon, not a 2-week summer course.",
        options: [
          { value: "lt3",      label: "Less than 3 months" },
          { value: "3_6",      label: "3 – 6 months" },
          { value: "6_12",     label: "6 – 12 months" },
          { value: "12_plus",  label: "More than 12 months" },
        ],
      },
      {
        key: "portfolioDepth", type: "select",
        q: "How many distinct shipped projects / works are in your public portfolio today?",
        sub: "Each one finished enough that you'd link it on a CV.",
        options: [
          { value: "none",        label: "None" },
          { value: "one",         label: "1" },
          { value: "two_three",   label: "2 – 3" },
          { value: "four_plus",   label: "4 or more" },
        ],
      },
      {
        key: "certCount", type: "select",
        q: "How many structured online courses have you completed with a verifiable certificate?",
        sub: "Coursera, edX, Udacity Nanodegree, Google certs, CS50 — anything with a final assessment.",
        options: [
          { value: "none",        label: "None" },
          { value: "one",         label: "1" },
          { value: "two_three",   label: "2 – 3" },
          { value: "four_plus",   label: "4 or more" },
        ],
      },
      {
        key: "publishedExternally", type: "select",
        q: "Has any of your work been featured externally by someone other than you?",
        sub: "Press article, journal, app store feature, conference selection, magazine, podcast guest spot.",
        options: yesNoNa as Opt<string>[],
      },
    ],
  },
  {
    id: "competitions",
    title: "Competitions",
    icon: Trophy,
    intro: "Olympiads, debate, hackathons, robotics, MUN, business case competitions, sports, performing arts — anything externally judged. We weight competition depth + repeated participation, not just one-off entries.",
    questions: [
      {
        key: "competitionTier", type: "select",
        q: "What's the highest level competition you've entered?",
        sub: "School-only round through international final.",
        options: tierOpts as Opt<string>[],
      },
      {
        key: "competitionResult", type: "select",
        q: "What's your best result at any level you competed at?",
        sub: "Be precise: top-50% honourable mention is different from top-10 / finalist.",
        options: [
          { value: "none",          label: "Haven't competed yet" },
          { value: "participated",  label: "Participated, no placement" },
          { value: "top50",         label: "Top 50% / honourable mention" },
          { value: "top10",         label: "Top 10 / finalist" },
          { value: "winner",        label: "Winner / 1st – 3rd place" },
        ],
      },
      {
        key: "competitionFrequency", type: "select",
        q: "How often do you enter competitions?",
        sub: "Across your full high-school career.",
        options: [
          { value: "none",     label: "Never" },
          { value: "one",      label: "Once" },
          { value: "few",      label: "A few times total" },
          { value: "regular",  label: "Regularly (multiple per year)" },
        ],
      },
      {
        key: "yearsCompeting", type: "select",
        q: "Across how many years have you been competing in your strongest competition track?",
        sub: "Consistency over time signals real commitment to admissions.",
        options: [
          { value: "none",     label: "Not yet competing" },
          { value: "lt1",      label: "Less than 1 year" },
          { value: "1_2",      label: "1 – 2 years" },
          { value: "3_plus",   label: "3+ years" },
        ],
      },
      {
        key: "competitionDomain", type: "select",
        q: "Do your strongest competitions directly align with your intended major?",
        sub: "E.g. CS major + ICPC/hackathons. Pure debate without a CS link wouldn't count for CS.",
        options: yesNoNa as Opt<string>[],
      },
      {
        key: "teamCompetition", type: "select",
        q: "Have you competed as part of a team where roles were divided?",
        sub: "Robotics team, debate squad, business case team, Model UN delegation, sports team.",
        options: yesNoNa as Opt<string>[],
      },
      {
        key: "qualifiedForNext", type: "select",
        q: "Have you ever qualified from one round to a higher one?",
        sub: "Regional → national, national → international, qualifying selection → finals.",
        options: yesNoNa as Opt<string>[],
      },
    ],
  },
  {
    id: "leadership",
    title: "Leadership & Impact",
    icon: Users,
    intro: "Roles where other people depended on you and a measurable result came out of it. We separate titular roles from real leadership by measuring team size, tenure, and quantified outcomes.",
    questions: [
      {
        key: "leadershipTier", type: "select",
        q: "What's the highest level you've held a real leadership role at?",
        sub: "Class group through national-level organisation.",
        options: tierOpts as Opt<string>[],
      },
      {
        key: "teamSizeLed", type: "select",
        q: "What's the largest team you've actually led — where people reported to you?",
        sub: "Direct decision authority, not just being in a big group.",
        options: [
          { value: "none",     label: "Haven't led a team" },
          { value: "lt5",      label: "Under 5 people" },
          { value: "5_15",     label: "5 – 15 people" },
          { value: "15_50",    label: "15 – 50 people" },
          { value: "50_plus",  label: "50 + people" },
        ],
      },
      {
        key: "leadershipDurationMonths", type: "select",
        q: "How long have you held your most significant leadership role continuously?",
        sub: "Single continuous tenure in one role.",
        options: [
          { value: "lt3",      label: "Less than 3 months" },
          { value: "3_6",      label: "3 – 6 months" },
          { value: "6_12",     label: "6 – 12 months" },
          { value: "12_plus",  label: "More than 12 months" },
        ],
      },
      {
        key: "collaboratorsManaged", type: "select",
        q: "How many people do you currently work with on a recurring basis on your initiatives?",
        sub: "Active collaborators / direct reports / committee members who depend on your coordination.",
        options: [
          { value: "none",      label: "None — I work alone" },
          { value: "1_2",       label: "1 – 2 people" },
          { value: "3_5",       label: "3 – 5 people" },
          { value: "6_plus",    label: "6 or more" },
        ],
      },
      {
        key: "measurableOutcome", type: "select",
        q: "Did your leadership produce a documented outcome (event ran, members recruited, money raised)?",
        sub: "Anything you can prove with numbers, attendance, or photos.",
        options: yesNoNa as Opt<string>[],
      },
      {
        key: "numericOutcome", type: "select",
        q: "Can you state that outcome as a specific number (e.g. 'raised $4,200' or '230 attendees')?",
        sub: "Quantified outcomes are dramatically stronger admissions signal than qualitative ones.",
        options: yesNoNa as Opt<string>[],
      },
      {
        key: "startedSomething", type: "select",
        q: "Have you personally founded a club, project, or initiative from scratch?",
        sub: "You built it from zero — not just inherited an existing role.",
        options: yesNoNa as Opt<string>[],
      },
    ],
  },
  {
    id: "research",
    title: "Research, Internships & Recognition",
    icon: Award,
    intro: "Mentored research work, real internships, professional network, and external validation. These are the strongest single signals at the elite tier — even one of them dramatically raises placement.",
    questions: [
      {
        key: "researchTier", type: "select",
        q: "Have you done any research, mentored or independent?",
        sub: "Literature reviews count, but professor-mentored or published work weighs far more.",
        options: [
          { value: "none",                 label: "None" },
          { value: "self_study",           label: "Self-study / literature review only" },
          { value: "school_mentor",        label: "Mentored by a school teacher" },
          { value: "professor_mentored",   label: "Mentored by a professor / industry researcher" },
          { value: "published",            label: "Published a paper / poster / preprint" },
        ],
      },
      {
        key: "internshipTier", type: "select",
        q: "Have you held an internship in a field relevant to your major?",
        sub: "Even short ones count if they were structured with real deliverables.",
        options: [
          { value: "none",                  label: "None" },
          { value: "shadowing",             label: "Shadowing / observation only" },
          { value: "short",                 label: "Short (< 4 weeks, light deliverables)" },
          { value: "structured_4w_plus",    label: "Structured (4 + weeks with real deliverables)" },
          { value: "paid_or_competitive",   label: "Paid or competitive selection" },
        ],
      },
      {
        key: "recommenderStrength", type: "select",
        q: "Who would write your strongest letter of recommendation today?",
        sub: "Choose the strongest who actually knows your work — not the easiest ask.",
        options: [
          { value: "none",                    label: "No one yet" },
          { value: "teacher",                 label: "A school teacher who knows me well" },
          { value: "mentor_external",         label: "An external mentor or coach" },
          { value: "professor_or_industry",   label: "A university professor or industry leader" },
        ],
      },
      {
        key: "professionalNetwork", type: "select",
        q: "How many real professionals in your intended field are you actively connected with?",
        sub: "LinkedIn connections you've had a real conversation with — not just accepted requests.",
        options: [
          { value: "none",       label: "None" },
          { value: "1_5",        label: "1 – 5" },
          { value: "6_15",       label: "6 – 15" },
          { value: "16_plus",    label: "16 or more" },
        ],
      },
      {
        key: "publicAudience", type: "select",
        q: "Do you maintain a public following on any platform tied to your major (newsletter, LinkedIn, GitHub, YouTube)?",
        sub: "Followers / subscribers / readers tied to your professional work — not personal social media.",
        options: [
          { value: "none",       label: "None / not yet public" },
          { value: "lt100",      label: "Under 100 followers" },
          { value: "100_1k",     label: "100 – 1,000 followers" },
          { value: "1k_plus",    label: "1,000+ followers" },
        ],
      },
      {
        key: "externalRecognition", type: "select",
        q: "Have you received any external recognition?",
        sub: "Award, scholarship, press mention, professional certification, ranking, prize.",
        options: yesNoNa as Opt<string>[],
      },
      {
        key: "reachedNationalOrIntl", type: "select",
        q: "Has any work or activity of yours reached national or international level?",
        sub: "Across any pillar — competitions, leadership, research, projects, performance.",
        options: yesNoNa as Opt<string>[],
      },
    ],
  },
];

// Defaults — every question must have a value before we score.
const DEFAULTS: PlacementAnswers = {
  apIbCount: 0,
  gpaTier: "na",
  testReadiness: "none",
  subjectMastery: "no",
  selfStudyHabit: "no",
  mathRigor: "standard",
  studyHoursWeek: "lt2",
  shippedProjectTier: "none",
  projectAudience: "none",
  publicArtifact: "no",
  consistencyMonths: "lt3",
  publishedExternally: "no",
  portfolioDepth: "none",
  certCount: "none",
  competitionTier: "none",
  competitionResult: "none",
  competitionFrequency: "none",
  teamCompetition: "no",
  qualifiedForNext: "no",
  competitionDomain: "no",
  yearsCompeting: "none",
  leadershipTier: "none",
  teamSizeLed: "none",
  leadershipDurationMonths: "lt3",
  measurableOutcome: "no",
  startedSomething: "no",
  numericOutcome: "no",
  collaboratorsManaged: "none",
  researchTier: "none",
  internshipTier: "none",
  recommenderStrength: "none",
  externalRecognition: "no",
  reachedNationalOrIntl: "no",
  professionalNetwork: "none",
  publicAudience: "none",
};

export function PlacementTest({ open, onOpenChange, grade, overallScore, onPlace }: Props) {
  const { consumeCredit } = useCredits();
  const [sectionIdx, setSectionIdx] = useState(0);
  const [answers, setAnswers] = useState<PlacementAnswers>(DEFAULTS);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const totalSections = SECTIONS.length;
  const section = SECTIONS[sectionIdx];
  const totalQuestions = useMemo(() => SECTIONS.reduce((n, s) => n + s.questions.length, 0), []);
  const answeredCount = touched.size;
  const isLastSection = sectionIdx === totalSections - 1;
  const allAnswered = answeredCount === totalQuestions;

  const setAnswer = (key: keyof PlacementAnswers, value: string | number) => {
    setAnswers((prev) => ({ ...prev, [key]: value as never }));
    setTouched((prev) => new Set(prev).add(key));
  };

  const reset = () => {
    setSectionIdx(0);
    setAnswers(DEFAULTS);
    setTouched(new Set());
    setResult(null);
  };

  const handleClose = (o: boolean) => {
    onOpenChange(o);
    if (!o) setTimeout(reset, 300);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const ok = await consumeCredit();
    if (!ok) {
      setSubmitting(false);
      toast.error("Out of credits — running placement test costs 1 credit.");
      return;
    }
    const lvl = placeUserAtLevel(answers, grade, overallScore);
    setResult(lvl);
    setSubmitting(false);
  };

  const next = () => {
    if (sectionIdx < totalSections - 1) setSectionIdx(sectionIdx + 1);
    else handleSubmit();
  };

  const prev = () => {
    if (sectionIdx > 0) setSectionIdx(sectionIdx - 1);
  };

  const confirm = () => {
    if (result) {
      onPlace(result);
      handleClose(false);
    }
  };

  const Icon = section?.icon;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[70rem] max-h-[92dvh] overflow-y-auto p-0">
        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-6 sm:px-8 pt-6 pb-4">
          <DialogHeader className="space-y-2">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Gauge className="w-5 h-5 text-primary" />
              Place Me on the Journey
            </DialogTitle>
            <DialogDescription>
              35 detailed questions across 5 sections — about 4 minutes. The deeper your answers, the more accurately we place you on the path. <span className="text-foreground font-medium">Costs 1 credit when submitted.</span>
            </DialogDescription>
          </DialogHeader>

          {/* Section pips */}
          {result === null && (
            <div className="mt-4 flex items-center gap-2">
              {SECTIONS.map((s, i) => (
                <div key={s.id} className="flex-1">
                  <div
                    className={`h-1.5 rounded-full transition-all ${
                      i < sectionIdx ? "bg-primary" : i === sectionIdx ? "bg-primary" : "bg-muted"
                    }`}
                  />
                  <div className={`mt-1.5 text-[10px] uppercase tracking-wider font-semibold text-center ${i === sectionIdx ? "text-primary" : "text-muted-foreground"}`}>
                    {s.title.split(" ")[0]}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 sm:px-8 py-6">
          <AnimatePresence mode="wait">
            {result === null ? (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Section intro */}
                <div className="flex items-start gap-3">
                  {Icon && <div className="shrink-0 w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><Icon className="w-5 h-5" /></div>}
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Section {sectionIdx + 1} of {totalSections}
                    </div>
                    <h3 className="text-lg font-bold text-foreground">{section.title}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">{section.intro}</p>
                  </div>
                </div>

                {/* Questions */}
                <div className="space-y-6">
                  {section.questions.map((qq, idx) => {
                    const value = String(answers[qq.key]);
                    return (
                      <div key={qq.key} className="rounded-xl border border-border bg-card p-4 sm:p-5">
                        <Label className="text-sm font-semibold text-foreground leading-snug block">
                          {idx + 1}. {qq.q}
                        </Label>
                        {qq.sub && <p className="text-xs text-muted-foreground mt-1">{qq.sub}</p>}
                        <RadioGroup
                          value={value}
                          onValueChange={(v) =>
                            setAnswer(qq.key, qq.type === "number_select" ? Number(v) : v)
                          }
                          className="mt-3 grid sm:grid-cols-2 gap-2"
                        >
                          {qq.options.map((opt) => {
                            const id = `${qq.key}-${opt.value}`;
                            const checked = value === String(opt.value);
                            return (
                              <label
                                key={id}
                                htmlFor={id}
                                className={`flex items-start gap-2.5 rounded-lg border p-2.5 text-sm cursor-pointer transition-all ${
                                  checked
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-primary/40 hover:bg-muted/30"
                                }`}
                              >
                                <RadioGroupItem value={String(opt.value)} id={id} className="mt-0.5" />
                                <span className="leading-snug">{opt.label}</span>
                              </label>
                            );
                          })}
                        </RadioGroup>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6 space-y-5"
              >
                <div className="mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-xl">
                  <span className="text-4xl font-bold text-primary-foreground">{result}</span>
                </div>
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Your placement
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-bold text-foreground mt-1">
                    Level {result}: {getLevelById(result as any).name}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto leading-relaxed">
                    {getLevelById(result as any).tagline}. We've unlocked everything below — start where you are, skip what you've already proven.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sticky footer */}
        <div className="sticky bottom-0 z-10 bg-background/95 backdrop-blur border-t border-border px-6 sm:px-8 py-4">
          {result === null ? (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="text-xs text-muted-foreground">
                {answeredCount} / {totalQuestions} answered
                {isLastSection && !allAnswered && (
                  <span className="text-amber-600"> — answer every question to calculate your level</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={prev} disabled={sectionIdx === 0 || submitting} className="gap-2">
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button
                  onClick={next}
                  disabled={submitting || (isLastSection && !allAnswered)}
                  className="gap-2"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : sectionIdx === totalSections - 1 ? <Check className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                  {sectionIdx === totalSections - 1 ? "Calculate Level (1 credit)" : "Next Section"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={reset}>Re-take</Button>
              <Button onClick={confirm} className="gap-2">
                Skip ahead to Level {result} <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
