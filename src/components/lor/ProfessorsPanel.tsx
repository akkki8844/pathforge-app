import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy, GraduationCap, Loader2, PenLine, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { MultiStateButton, type ButtonState } from "@/components/ui/multi-state-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useRecommenders } from "@/hooks/useRecommenders";
import { functionErrorMessage } from "@/lib/functionError";
import { useStagger } from "@/lib/lorMotion";
import { ComposeProfessorEmailDialog } from "./ComposeProfessorEmailDialog";
import { SectionRule } from "@/components/lor/lorSurface";
import { ProfessorCard } from "./ProfessorCard";
import type { Professor } from "./professorTypes";

type Level = "any" | "professor" | "associate" | "assistant" | "postdoc";

const LEVEL_LABEL: Record<Level, string> = {
  any: "Any rank",
  professor: "Full Professor",
  associate: "Associate Professor",
  assistant: "Assistant Professor",
  postdoc: "Postdoc",
};

/*
 * The six fields offered on the first-run state. Each one is a member of
 * FIELDS below, so a chip can never set a field the select cannot show.
 */
const QUICK_FIELDS = [
  "Computer Science",
  "Biology",
  "Mechanical Engineering",
  "Economics",
  "Psychology",
  "Physics",
] as const;

const FIELDS = [
  "Computer Science",
  "Electrical Engineering",
  "Mechanical Engineering",
  "Chemical Engineering",
  "Civil Engineering",
  "Biomedical Engineering",
  "Mathematics",
  "Statistics",
  "Physics",
  "Chemistry",
  "Biology",
  "Molecular Biology",
  "Neuroscience",
  "Environmental Science",
  "Earth Sciences",
  "Astronomy",
  "Economics",
  "Finance",
  "Business / Management",
  "Psychology",
  "Sociology",
  "Political Science",
  "International Relations",
  "History",
  "Philosophy",
  "English Literature",
  "Linguistics",
  "Anthropology",
  "Public Health",
  "Medicine",
  "Law",
  "Education",
  "Architecture",
  "Art History",
  "Music",
];

const UNIVERSITIES = [
  "Any university",
  "Harvard University",
  "Stanford University",
  "MIT",
  "Princeton University",
  "Yale University",
  "Columbia University",
  "University of Pennsylvania",
  "Cornell University",
  "Brown University",
  "Dartmouth College",
  "University of Chicago",
  "Caltech",
  "Johns Hopkins University",
  "Duke University",
  "Northwestern University",
  "UC Berkeley",
  "UCLA",
  "University of Michigan",
  "Carnegie Mellon University",
  "University of Toronto",
  "McGill University",
  "University of British Columbia",
  "University of Oxford",
  "University of Cambridge",
  "Imperial College London",
  "UCL",
  "LSE",
  "King's College London",
  "University of Edinburgh",
  "ETH Zurich",
  "EPFL",
  "TU Munich",
  "Sorbonne Université",
  "National University of Singapore",
  "NTU Singapore",
  "University of Tokyo",
  "Tsinghua University",
  "Peking University",
  "IIT Bombay",
  "IIT Delhi",
  "IISc Bangalore",
  "University of Melbourne",
  "University of Sydney",
  "ANU",
];

const COUNTRIES = [
  "Any country",
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "Switzerland",
  "France",
  "Netherlands",
  "Sweden",
  "Singapore",
  "Japan",
  "South Korea",
  "China",
  "Hong Kong",
  "India",
  "United Arab Emirates",
];

const KEYWORDS_BY_FIELD: Record<string, string[]> = {
  "Computer Science": ["Machine Learning", "AI / NLP", "Computer Vision", "Systems", "Theory", "Security", "HCI", "Robotics", "Graphics"],
  "Electrical Engineering": ["Signal Processing", "VLSI", "Power Systems", "Wireless / RF", "Control"],
  "Mechanical Engineering": ["Robotics", "Thermodynamics", "Fluid Mechanics", "Materials", "Manufacturing"],
  "Chemical Engineering": ["Catalysis", "Polymers", "Process Design", "Bioengineering"],
  "Civil Engineering": ["Structures", "Transportation", "Environmental", "Geotechnical"],
  "Biomedical Engineering": ["Medical Imaging", "Biomaterials", "Neural Engineering", "Tissue Engineering"],
  Mathematics: ["Algebra", "Analysis", "Topology", "Number Theory", "Applied Math"],
  Statistics: ["Bayesian", "Causal Inference", "High-Dimensional", "Biostatistics"],
  Physics: ["Quantum", "Condensed Matter", "Particle", "Astrophysics", "Biophysics"],
  Chemistry: ["Organic", "Inorganic", "Physical", "Computational", "Materials"],
  Biology: ["Genetics", "Ecology", "Evolution", "Cell Biology", "Microbiology"],
  "Molecular Biology": ["CRISPR", "Genomics", "Proteomics", "RNA Biology"],
  Neuroscience: ["Cognitive", "Computational", "Systems", "Cellular"],
  "Environmental Science": ["Climate", "Ecology", "Sustainability", "Conservation"],
  "Earth Sciences": ["Geology", "Oceanography", "Atmospheric"],
  Astronomy: ["Exoplanets", "Cosmology", "Galactic", "Instrumentation"],
  Economics: ["Behavioral", "Macro", "Micro", "Development", "Labor", "Econometrics"],
  Finance: ["Asset Pricing", "Corporate Finance", "Quantitative", "Behavioral"],
  "Business / Management": ["Strategy", "Marketing", "Operations", "Entrepreneurship"],
  Psychology: ["Cognitive", "Social", "Developmental", "Clinical"],
  Sociology: ["Inequality", "Urban", "Race & Ethnicity", "Networks"],
  "Political Science": ["Comparative", "International", "American Politics", "Theory"],
  "International Relations": ["Security", "Diplomacy", "Trade", "Global Governance"],
  History: ["Modern", "Ancient", "Asian", "European", "American"],
  Philosophy: ["Ethics", "Mind", "Logic", "Political"],
  "English Literature": ["Modernism", "Postcolonial", "Poetry", "Theory"],
  Linguistics: ["Syntax", "Phonology", "Computational", "Sociolinguistics"],
  Anthropology: ["Cultural", "Biological", "Archaeology"],
  "Public Health": ["Epidemiology", "Global Health", "Health Policy"],
  Medicine: ["Oncology", "Cardiology", "Neurology", "Immunology"],
  Law: ["Constitutional", "International", "Criminal", "IP"],
  Education: ["Policy", "Curriculum", "EdTech", "Equity"],
  Architecture: ["Sustainable Design", "Urbanism", "Computational Design"],
  "Art History": ["Modern", "Contemporary", "Renaissance", "Asian"],
  Music: ["Composition", "Musicology", "Theory", "Performance"],
};

export function ProfessorsPanel() {
  const { create } = useRecommenders();
  const stagger = useStagger();
  const [field, setField] = useState("");
  const [university, setUniversity] = useState("");
  const [country, setCountry] = useState("");
  const [keywordTags, setKeywordTags] = useState<string[]>([]);
  const [level, setLevel] = useState<Level>("any");
  const [loading, setLoading] = useState(false);
  /*
   * Drives the search button's four states from outside. `loading` alone can
   * only say "in flight"; this also remembers how the last search ended, so a
   * failure is visible on the control that caused it and not only in a toast
   * that has already gone.
   */
  const [searchState, setSearchState] = useState<ButtonState>("idle");
  const [results, setResults] = useState<Professor[]>([]);
  const [searched, setSearched] = useState(false);

  // Brag sheet dialog state
  const [bragOpen, setBragOpen] = useState(false);
  const [bragProf, setBragProf] = useState<Professor | null>(null);
  const [bragLoading, setBragLoading] = useState(false);
  const [bragResult, setBragResult] = useState<{ markdown: string; email: string } | null>(null);
  const [bragAnswers, setBragAnswers] = useState({
    why_this_professor: "",
    your_background: "",
    relevant_coursework: "",
    projects_or_research: "",
    achievements: "",
    intended_purpose: "research mentorship",
    contact_goal: "",
    extras: "",
  });
  const [copied, setCopied] = useState<string | null>(null);

  // Compose-mail dialog state
  const [composeProf, setComposeProf] = useState<Professor | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);

  /*
   * `fieldOverride` exists for the quick-start chips on the first-run state.
   * They call setField and runSearch in the same handler, and React has not
   * flushed the state by then, so reading `field` would search on the previous
   * value (on the very first press, the empty string, which fails validation
   * and toasts at a user who did nothing wrong).
   */
  const runSearch = async (fieldOverride?: string) => {
    const searchField = typeof fieldOverride === "string" ? fieldOverride : field;
    if (searchField.trim().length < 2) {
      toast({ title: "Add a field or department", description: "e.g. Computer Science, Biology", variant: "destructive" });
      return;
    }
    setLoading(true);
    setSearchState("loading");
    setSearched(true);
    try {
      const { data, error } = await supabase.functions.invoke("find-professors", {
        body: {
          field: searchField,
          university: university === "Any university" ? "" : university,
          country: country === "Any country" ? "" : country,
          keywords: keywordTags.join(", "),
          level,
          limit: 30,
        },
      });
      // `throw error` alone loses the reason: supabase-js gives every non-2xx
      // the same "Edge Function returned a non-2xx status code" message, so a
      // missing FIRECRAWL_API_KEY (500), an expired session (401) and running
      // out of credits (402) all surfaced as one indistinguishable toast. The
      // function's own message is on error.context; functionErrorMessage reads it.
      if (error) throw new Error(await functionErrorMessage(error, "Please try again."));
      if (data?.error) throw new Error(data.error);
      setResults(data?.professors ?? []);
      setSearchState("success");
      if (!data?.professors?.length) {
        toast({ title: "No verified matches", description: "Try a broader field, different university, or fewer keywords." });
      }
    } catch (e) {
      setSearchState("error");
      toast({
        title: "Search failed",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addAsRecommender = async (p: Professor) => {
    try {
      await create.mutateAsync({
        name: p.name,
        email: p.email,
        position: p.title,
        subject: p.department,
        school: p.university,
        relationship_duration: "",
        status: "not_requested",
        notes: `Research: ${p.research_interests.join(", ")}\nProfile: ${p.profile_url}\nSource: ${p.email_source_url}`,
        due_date: null,
        submitted_at: null,
      });
      toast({ title: "Added to your recommenders" });
    } catch {
      toast({ title: "Couldn't add", variant: "destructive" });
    }
  };

  const openBrag = (p: Professor) => {
    setBragProf(p);
    setBragResult(null);
    setBragAnswers((a) => ({
      ...a,
      why_this_professor: a.why_this_professor || (p.research_interests[0]
        ? `Your work on ${p.research_interests[0]} aligns with what I want to study.`
        : ""),
    }));
    setBragOpen(true);
  };

  const generateBrag = async () => {
    if (!bragProf) return;
    if (!bragAnswers.why_this_professor.trim() || !bragAnswers.your_background.trim()) {
      toast({ title: "Fill the first two questions", variant: "destructive" });
      return;
    }
    setBragLoading(true);
    setBragResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-professor-brag-sheet", {
        body: { professor: bragProf, answers: bragAnswers },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setBragResult({ markdown: data.markdown ?? "", email: data.email ?? "" });
    } catch (e) {
      toast({
        title: "Generation failed",
        description: e instanceof Error ? e.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setBragLoading(false);
    }
  };

  /*
   * Success and error are a beat, not a resting state: a button that still
   * reads "Results below" a minute later is describing the last search rather
   * than what pressing it now would do.
   */
  useEffect(() => {
    if (searchState !== "success" && searchState !== "error") return;
    const t = setTimeout(() => setSearchState("idle"), 1800);
    return () => clearTimeout(t);
  }, [searchState]);

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    /*
     * Two panes.
     *
     * This tab used to be a single form card centred in a 1024px column, with
     * roughly sixty percent of the viewport blank underneath it until you ran a
     * search. The query is a control surface you keep adjusting, so it belongs
     * in a rail you can see while reading results, and the results get the
     * width. Below xl it collapses to one column, form first, which is the
     * order you need it in anyway on a narrow screen.
     *
     * No heading here. The page is titled "Professors" and the tab above is
     * titled "Find professors"; a third heading reading "Professors to Email"
     * was the same noun three times in 200px of vertical space. The one thing
     * the heading carried that the tab does not is the constraint on what the
     * search returns, which now sits with the search button that returns it.
     */
    <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
      {/* min-w-0 for the same reason as the roster column: a grid item will
          not shrink below its content's min-content width without it. */}
      <div className="min-w-0 space-y-4 rounded-2xl border border-border/70 bg-card p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-16px_rgba(16,24,40,0.18)] sm:p-5 lg:sticky lg:top-6 lg:col-span-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Field or department <span className="text-destructive">*</span>
            </Label>
            <Select value={field} onValueChange={(v) => { setField(v); setKeywordTags([]); }}>
              <SelectTrigger><SelectValue placeholder="Select a field" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {FIELDS.map((f) => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">University</Label>
            <Select value={university} onValueChange={setUniversity}>
              <SelectTrigger><SelectValue placeholder="Any university" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {UNIVERSITIES.map((u) => (
                  <SelectItem key={u} value={u}>{u}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Country</Label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger><SelectValue placeholder="Any country" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {COUNTRIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Faculty rank</Label>
            <Select value={level} onValueChange={(v) => setLevel(v as Level)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(LEVEL_LABEL) as Level[]).map((k) => (
                  <SelectItem key={k} value={k}>{LEVEL_LABEL[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {field && KEYWORDS_BY_FIELD[field]?.length ? (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Research focus</Label>
            {/*
              * A multi-select of mutually compatible filters is what
              * ToggleGroup is, so it is what this is now. The hand-rolled
              * buttons it replaces marked the selected state with
              * `bg-foreground text-background` — a solid black fill, which on
              * a page whose single accent is the Cluely cyan is a second
              * accent introduced for one control.
              */}
            <ToggleGroup
              type="multiple"
              value={keywordTags}
              onValueChange={setKeywordTags}
              className="flex flex-wrap justify-start gap-1.5"
            >
              {KEYWORDS_BY_FIELD[field].map((k) => (
                <ToggleGroupItem
                  key={k}
                  value={k}
                  size="sm"
                  className="h-auto rounded-full border border-border bg-card px-2.5 py-1 text-xs font-normal text-muted-foreground data-[state=on]:border-primary/40 data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
                >
                  {k}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        ) : null}
        <div className="space-y-3 border-t border-border pt-4">
          {/*
            * The same MultiStateButton the other generate actions use, so a
            * search that fails says so on the control that started it instead
            * of only in a toast that has already slid away by the time you
            * look back at the form.
            */}
          <MultiStateButton
            size="lg"
            className="w-full"
            idleLabel="Find professors"
            loadingLabel="Searching the web"
            successLabel="Search done"
            errorLabel="Search failed"
            idleIcon={<Search className="h-4 w-4" />}
            state={loading ? "loading" : searchState}
            onClick={() => runSearch()}
          />
          {/*
            * Stated once. The old page said it here, again beside the result
            * count as "Emails verified from university pages", and a third
            * time in the first-run copy — one claim, three times, on one
            * screen.
            */}
          <p className="text-[11.5px] leading-relaxed text-muted-foreground">
            Only faculty whose email address appears verbatim on a university page are returned.
          </p>
        </div>
      </div>

      <div className="min-w-0 lg:col-span-8">

      {/* Results */}
      {loading ? (
        /* Skeletons in the shape of the result cards, on shadcn's own
           Skeleton rather than a hand-rolled `animate-pulse` div. A centred
           spinner tells you to wait; these tell you what is coming and stop
           the column collapsing to nothing and then jumping back. */
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-border/70 bg-card p-5">
              <div className="flex items-start gap-3">
                <Skeleton className="h-11 w-11 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3 w-44" />
                  <Skeleton className="h-3 w-36" />
                </div>
              </div>
              <div className="mt-4 flex gap-1.5">
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="mt-4 h-8 w-full rounded-lg" />
            </div>
          ))}
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-3">
          {/*
            * The same labelled rule the recommenders tab groups its stages
            * with, so both halves of this page count things the same way. It
            * used to be a bold sentence on the left and a second, unrelated
            * reassurance floated to the right of it.
            */}
          <SectionRule as="h2" className="mb-0 px-1">
            {results.length === 1 ? "1 professor" : `${results.length} professors`}
          </SectionRule>
          {/*
            * popLayout so a second search cross-fades the old grid out from
            * under the new one instead of unmounting thirty cards in a frame.
            */}
          <motion.div layout className="grid items-start gap-3 sm:grid-cols-2">
            <AnimatePresence mode="popLayout" initial={false}>
              {results.map((p, i) => (
                <motion.div
                  key={`${p.email}-${i}`}
                  {...stagger(i)}
                  exit={{ opacity: 0, scale: 0.97 }}
                  className="min-w-0"
                >
                  <ProfessorCard
                    p={p}
                    onCompose={() => {
                      setComposeProf(p);
                      setComposeOpen(true);
                    }}
                    onSave={() => addAsRecommender(p)}
                    onBragSheet={() => openBrag(p)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      ) : searched ? (
        <div className="rounded-2xl border border-border/70 bg-card px-6 py-14 text-center">
          <h3 className="text-[17px] font-semibold tracking-[-0.015em]">
            No verified professors found
          </h3>
          <p className="mx-auto mt-1.5 max-w-sm text-[13.5px] leading-relaxed text-muted-foreground">
            Try a different university, broaden the field, or remove research keywords.
          </p>
        </div>
      ) : (
        /*
         * First run.
         *
         * This was an empty column. A blank half-page is not restraint, it is
         * the moment a student decides the feature does not work. These are
         * real searches: pressing one fills the field and runs it, so the
         * fastest path to a result is one click rather than four selects.
         */
        <div className="flex min-h-[26rem] flex-col items-center justify-center rounded-2xl border border-border/70 bg-card px-6 py-12 text-center sm:px-10 lg:min-h-[30rem]">
          <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
            <GraduationCap className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <h3 className="text-[19px] font-semibold tracking-[-0.02em]">
            Find faculty worth emailing
          </h3>
          <p className="mx-auto mt-2 max-w-[46ch] text-[13.5px] leading-relaxed text-muted-foreground">
            Pick a field on the left, or start from one of these.
          </p>
          <div className="mx-auto mt-6 flex max-w-[34rem] flex-wrap justify-center gap-2">
            {QUICK_FIELDS.map((f, i) => (
              <motion.button
                key={f}
                type="button"
                {...stagger(i)}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  setField(f);
                  setKeywordTags([]);
                  runSearch(f);
                }}
                className="rounded-full border border-border bg-card px-3.5 py-1.5 text-[12.5px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {f}
              </motion.button>
            ))}
          </div>
        </div>
      )}
      </div>

      {/* Brag sheet dialog */}
      <Dialog open={bragOpen} onOpenChange={(o) => !o && setBragOpen(false)}>
        <DialogContent className="max-w-[70rem] max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Targeted brag sheet for {bragProf?.name}</DialogTitle>
            <DialogDescription>
              Answer briefly. This writes a brag sheet and a cold email addressed to their
              work, not a template with their name dropped into it.
            </DialogDescription>
          </DialogHeader>

          {!bragResult ? (
            <div className="space-y-4 py-2">
              <Q label="Why this professor specifically?">
                <Textarea
                  rows={2}
                  value={bragAnswers.why_this_professor}
                  onChange={(e) => setBragAnswers({ ...bragAnswers, why_this_professor: e.target.value })}
                  placeholder="What about their research grabs you?"
                />
              </Q>
              <Q label="Your background (school, grade/year, intended field)">
                <Textarea
                  rows={2}
                  value={bragAnswers.your_background}
                  onChange={(e) => setBragAnswers({ ...bragAnswers, your_background: e.target.value })}
                  placeholder="Grade 11 at Lincoln High, intending Computer Science…"
                />
              </Q>
              <Q label="Relevant coursework (exact names, comma-separated)">
                <Input
                  value={bragAnswers.relevant_coursework}
                  onChange={(e) => setBragAnswers({ ...bragAnswers, relevant_coursework: e.target.value })}
                  placeholder="AP Computer Science, Linear Algebra (coursera)…"
                />
              </Q>
              <Q label="Projects or research you've done">
                <Textarea
                  rows={3}
                  value={bragAnswers.projects_or_research}
                  onChange={(e) => setBragAnswers({ ...bragAnswers, projects_or_research: e.target.value })}
                  placeholder="One bullet per project: what it was, what you built, what came out of it."
                />
              </Q>
              <Q label="Achievements (awards, competitions, publications)">
                <Textarea
                  rows={2}
                  value={bragAnswers.achievements}
                  onChange={(e) => setBragAnswers({ ...bragAnswers, achievements: e.target.value })}
                  placeholder="USACO Gold, regional science fair 2nd place…"
                />
              </Q>
              <div className="grid sm:grid-cols-2 gap-3">
                <Q label="Purpose">
                  <Select
                    value={bragAnswers.intended_purpose}
                    onValueChange={(v) => setBragAnswers({ ...bragAnswers, intended_purpose: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="research mentorship">Research mentorship</SelectItem>
                      <SelectItem value="summer research position">Summer research position</SelectItem>
                      <SelectItem value="PhD inquiry">PhD inquiry</SelectItem>
                      <SelectItem value="undergrad research (REU)">Undergrad research (REU)</SelectItem>
                      <SelectItem value="general guidance / informational chat">Informational chat</SelectItem>
                      <SelectItem value="recommendation letter discussion">LOR discussion</SelectItem>
                    </SelectContent>
                  </Select>
                </Q>
                <Q label="Your specific ask">
                  <Input
                    value={bragAnswers.contact_goal}
                    onChange={(e) => setBragAnswers({ ...bragAnswers, contact_goal: e.target.value })}
                    placeholder="A 15-min Zoom, a reading list, a lab spot…"
                  />
                </Q>
              </div>
              <Q label="Anything else (optional)">
                <Textarea
                  rows={2}
                  value={bragAnswers.extras}
                  onChange={(e) => setBragAnswers({ ...bragAnswers, extras: e.target.value })}
                  placeholder="Constraints, timeline, prior contact…"
                />
              </Q>
            </div>
          ) : (
            <div className="space-y-5 py-2">
              <ResultBlock title="Brag sheet (Markdown)" text={bragResult.markdown} keyId="md" copied={copied} onCopy={copy} />
              <ResultBlock title="Cold email draft" text={bragResult.email} keyId="em" copied={copied} onCopy={copy} />
            </div>
          )}

          <DialogFooter className="gap-2">
            {!bragResult ? (
              <>
                <Button variant="ghost" onClick={() => setBragOpen(false)}>Cancel</Button>
                <Button onClick={generateBrag} disabled={bragLoading}>
                  {bragLoading ? (
                    <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Generating</>
                  ) : (
                    <><PenLine className="h-4 w-4 mr-1.5" /> Generate</>
                  )}
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => setBragResult(null)}>Edit answers</Button>
                <Button onClick={() => setBragOpen(false)}>Done</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ComposeProfessorEmailDialog
        professor={composeProf}
        open={composeOpen}
        onOpenChange={setComposeOpen}
      />
    </div>
  );
}

function Q({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ResultBlock({
  title, text, keyId, copied, onCopy,
}: {
  title: string;
  text: string;
  keyId: string;
  copied: string | null;
  onCopy: (t: string, k: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold">{title}</h4>
        <Button size="sm" variant="outline" onClick={() => onCopy(text, keyId)}>
          {copied === keyId ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
          {copied === keyId ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="rounded-lg border bg-muted/40 p-4 text-xs whitespace-pre-wrap font-mono leading-relaxed max-h-72 overflow-y-auto">
        {text || "Not stated"}
      </pre>
    </div>
  );
}
