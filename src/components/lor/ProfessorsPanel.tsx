import { useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Loader2,
  Mail,
  ExternalLink,
  Plus,
  PenLine,
  Copy,
  Check,
  Building2,
  GraduationCap,
  Globe2,
  FlaskConical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { safeExternalUrl } from "@/lib/safeUrl";

interface Professor {
  name: string;
  title: string;
  department: string;
  university: string;
  email: string;
  profile_url: string;
  research_interests: string[];
  country: string;
  email_source_url: string;
  /** Optional one-line background/bio, if the search returned one. */
  bio?: string;
}

/**
 * The institution's web domain, used to fetch its logo. The email domain is the
 * most reliable signal (prof@stanford.edu → stanford.edu); the profile URL host
 * is the fallback.
 */
function institutionDomain(p: Professor): string | null {
  const emailHost = p.email?.split("@")[1]?.trim().toLowerCase();
  if (emailHost && emailHost.includes(".")) return emailHost;
  try {
    return new URL(p.profile_url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

/** College logo tile with a unavatar → Google favicon → DuckDuckGo → monogram
 *  fallback chain (same reliable sources the scholarships page uses). */
function CollegeLogo({ p, size = 48 }: { p: Professor; size?: number }) {
  const domain = institutionDomain(p);
  const candidates = domain
    ? [
        `https://unavatar.io/${domain}?fallback=false`,
        `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
        `https://icons.duckduckgo.com/ip3/${domain}.ico`,
      ]
    : [];
  const [idx, setIdx] = useState(0);
  const [failed, setFailed] = useState(false);
  const initials =
    (p.university || p.name)
      .split(/\s+/)
      .filter((w) => /^[A-Za-z]/.test(w))
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "?";
  const dim = { width: size, height: size };

  if (failed || candidates.length === 0) {
    return (
      <div
        style={dim}
        className="shrink-0 rounded-xl bg-gradient-to-br from-muted to-muted/60 border border-border flex items-center justify-center font-bold text-foreground/70"
      >
        <span style={{ fontSize: size * 0.34 }}>{initials}</span>
      </div>
    );
  }
  return (
    <div
      style={dim}
      className="shrink-0 rounded-xl bg-background border border-border flex items-center justify-center overflow-hidden p-1.5 shadow-sm"
    >
      <img
        key={candidates[idx]}
        src={candidates[idx]}
        alt={`${p.university} logo`}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => (idx + 1 < candidates.length ? setIdx(idx + 1) : setFailed(true))}
        className="max-w-full max-h-full object-contain"
      />
    </div>
  );
}

type Level = "any" | "professor" | "associate" | "assistant" | "postdoc";

const LEVEL_LABEL: Record<Level, string> = {
  any: "Any rank",
  professor: "Full Professor",
  associate: "Associate Professor",
  assistant: "Assistant Professor",
  postdoc: "Postdoc",
};

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
  const [field, setField] = useState("");
  const [university, setUniversity] = useState("");
  const [country, setCountry] = useState("");
  const [keywordTags, setKeywordTags] = useState<string[]>([]);
  const [level, setLevel] = useState<Level>("any");
  const [loading, setLoading] = useState(false);
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

  const runSearch = async () => {
    if (field.trim().length < 2) {
      toast({ title: "Add a field or department", description: "e.g. Computer Science, Biology", variant: "destructive" });
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const { data, error } = await supabase.functions.invoke("find-professors", {
        body: {
          field,
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
      if (!data?.professors?.length) {
        toast({ title: "No verified matches", description: "Try a broader field, different university, or fewer keywords." });
      }
    } catch (e) {
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

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Professors to Email</h2>
        <p className="text-sm text-muted-foreground">
          Live, web-sourced faculty contacts. Only professors whose email we found verbatim on their university page are shown.
        </p>
      </div>

      {/* Filters */}
      <div className="rounded-xl border bg-card p-4 sm:p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <GraduationCap className="h-3 w-3" /> Field / department <span className="text-destructive">*</span>
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
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Building2 className="h-3 w-3" /> University
            </Label>
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
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Globe2 className="h-3 w-3" /> Country
            </Label>
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
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <FlaskConical className="h-3 w-3" /> Research focus (tap to toggle)
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {KEYWORDS_BY_FIELD[field].map((k) => {
                const active = keywordTags.includes(k);
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() =>
                      setKeywordTags((prev) =>
                        active ? prev.filter((x) => x !== k) : [...prev, k]
                      )
                    }
                    className={
                      "rounded-full border px-2.5 py-1 text-xs transition " +
                      (active
                        ? "bg-foreground text-background border-foreground"
                        : "bg-card hover:bg-muted border-border text-muted-foreground")
                    }
                  >
                    {k}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
        <div className="flex justify-end">
          <Button onClick={runSearch} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
            {loading ? "Searching the web" : "Find professors"}
          </Button>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="rounded-xl border bg-card/50 px-6 py-16 text-center">
          <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Searching faculty directories and verifying emails…</p>
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <p className="text-sm font-medium text-foreground">
              {results.length} {results.length === 1 ? "professor" : "professors"} found
            </p>
            <p className="text-xs text-muted-foreground">Emails verified from university pages</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {results.map((p, i) => (
              <motion.div
                key={p.email + i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(i, 12) * 0.025 }}
                className="group relative flex flex-col rounded-2xl border bg-card p-4 sm:p-5 transition-all hover:shadow-md hover:border-foreground/20"
              >
                {/* Header: logo + identity + rank */}
                <div className="flex items-start gap-3">
                  <CollegeLogo p={p} />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold leading-tight truncate">{p.name}</div>
                    <div className="text-sm text-muted-foreground truncate">
                      {[p.title, p.department].filter(Boolean).join(" · ")}
                    </div>
                    {p.university && (
                      <div className="mt-0.5 flex items-center gap-1 text-xs font-medium text-foreground/80">
                        <Building2 className="h-3 w-3 shrink-0" />
                        <span className="truncate">{p.university}</span>
                        {p.country && <span className="text-muted-foreground">· {p.country}</span>}
                      </div>
                    )}
                  </div>
                </div>

                {/* Background / bio */}
                {p.bio && (
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground line-clamp-2">{p.bio}</p>
                )}

                {/* Research interests */}
                {p.research_interests.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {p.research_interests.slice(0, 5).map((r) => (
                      <Badge key={r} variant="secondary" className="font-normal">{r}</Badge>
                    ))}
                  </div>
                )}

                {/* Email row */}
                <div className="mt-3 flex items-center gap-2 rounded-lg border bg-muted/40 px-2.5 py-1.5">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <a
                    href={`mailto:${p.email}`}
                    className="min-w-0 flex-1 truncate text-sm font-medium hover:underline"
                    title={p.email}
                  >
                    {p.email}
                  </a>
                  <button
                    onClick={() => copy(p.email, `e-${i}`)}
                    className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-background hover:text-foreground transition-colors"
                    aria-label="Copy email"
                  >
                    {copied === `e-${i}` ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>

                {/* Links */}
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  {/* These two addresses were found by the find-professors
                      function crawling the open web, so they get the same
                      scheme check as any other untrusted link. */}
                  {safeExternalUrl(p.profile_url) && (
                    <a
                      href={safeExternalUrl(p.profile_url)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 hover:text-foreground"
                    >
                      <ExternalLink className="h-3 w-3" /> Faculty profile
                    </a>
                  )}
                  {safeExternalUrl(p.email_source_url) && p.email_source_url !== p.profile_url && (
                    <a
                      href={safeExternalUrl(p.email_source_url)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 hover:text-foreground"
                      title="Page where this email was verified"
                    >
                      <ExternalLink className="h-3 w-3" /> Email source
                    </a>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-4 flex gap-2 border-t pt-3">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => addAsRecommender(p)}>
                    <Plus className="h-3.5 w-3.5 mr-1.5" /> Add
                  </Button>
                  <Button size="sm" className="flex-1" onClick={() => openBrag(p)}>
                    <FlaskConical className="h-3.5 w-3.5 mr-1.5" /> Brag sheet
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      ) : searched ? (
        <div className="rounded-xl border border-dashed bg-card/50 px-6 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            No verified professors found. Try a different university, broaden the field, or remove keywords.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed bg-card/50 px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Enter a field above and run a search to see real, web-verified faculty contacts.
          </p>
        </div>
      )}

      {/* Brag sheet dialog */}
      <Dialog open={bragOpen} onOpenChange={(o) => !o && setBragOpen(false)}>
        <DialogContent className="max-w-[70rem] max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Targeted brag sheet — {bragProf?.name}</DialogTitle>
            <DialogDescription>
              Answer briefly. We'll generate a brag sheet + cold email tailored to this professor.
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
                  placeholder="One bullet per project — what it was, what you built, what came out of it."
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
        {text || "—"}
      </pre>
    </div>
  );
}
