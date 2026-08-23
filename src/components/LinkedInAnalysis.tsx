import { useEffect, useRef, useState } from "react";
import { notifyCreditConsumed } from "@/hooks/useCredits";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Loader2,
  Star,
  TrendingUp,
  Target,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  User,
  FileText,
  Briefcase,
  Award,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Upload,
  X,
  RefreshCw,
  ShieldCheck,
  Linkedin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { getBookmarks } from "@/lib/storage";
import { useAuth } from "@/contexts/AuthContext";
import { useLinkedInImport } from "@/hooks/useLinkedInImport";
import { readEdgeError } from "@/lib/edgeFunctionError";
import { parseLinkedInPdf, validateLinkedInPdf, LINKEDIN_TEXT_MAX_CHARS } from "@/lib/parseLinkedInPdf";
import { toast } from "sonner";
import { AiGenerationNotice } from "@/components/AiGenerationNotice";
import { useAiGenerationGuard } from "@/hooks/useAiGenerationGuard";

/** What `analyze-linkedin` charges, per its `consume_credits({ amount: 2 })`. */
const ANALYSIS_CREDIT_COST = 2;

/** The edge function refuses anything shorter, so don't let the user pay to find out. */
const MIN_PROFILE_CHARS = 50;

interface SectionInsight {
  working: string;
  missing: string;
  suggestions: string;
  collegeRelevance: string;
}

interface Rating {
  score: number;
  explanation: string;
}

interface ImprovementItem {
  area: string;
  issue: string;
  whyItMatters: string;
  howToFix: string;
}

interface AnalysisResult {
  profileName: string;
  overallSummary: {
    overview: string;
    strengthsAndWeaknesses: string;
    collegeAlignment: string;
  };
  /** Keyed by section id. Open-ended so a stored analysis from an older shape still renders. */
  sectionInsights: Record<string, SectionInsight>;
  ratings: Record<string, Rating>;
  collegeAlignmentAnalysis: {
    whatCollegeLooksFor: string;
    whereProfileAligns: string;
    whereProfileNeedsWork: string;
  };
  improvementPlan: ImprovementItem[];
}

interface LinkedInAnalysisProps {
  onNavigateToSection: (sectionId: string) => void;
}

const sectionIcons: Record<string, React.ReactNode> = {
  profilePhoto: <User className="h-5 w-5" />,
  headline: <FileText className="h-5 w-5" />,
  about: <FileText className="h-5 w-5" />,
  experience: <Briefcase className="h-5 w-5" />,
  skills: <Award className="h-5 w-5" />,
  posts: <MessageSquare className="h-5 w-5" />,
};

const sectionNames: Record<string, string> = {
  profilePhoto: "Profile Photo",
  headline: "Headline",
  about: "About",
  experience: "Experience",
  skills: "Skills",
  posts: "Posts",
  overall: "Overall",
};

const sectionToBuilderMap: Record<string, string> = {
  headline: "headline",
  about: "about",
  experience: "experience",
  skills: "skills",
  posts: "posts",
};

/** Canonical display order. Anything unrecognised is appended, never dropped. */
const SECTION_ORDER = ["profilePhoto", "headline", "about", "experience", "skills", "posts"];
const RATING_ORDER = ["profilePhoto", "headline", "about", "experience", "skills", "overall"];

/* ------------------------------------------------------------------------- *
 * Normalisation
 *
 * The analysis is now read back out of the database, which means it can be an
 * object written by an older version of the edge function (or a model response
 * that quietly dropped a key). The render path used to dereference
 * `analysis.overallSummary.overview`, `Object.entries(analysis.ratings)` and
 * friends unconditionally — one missing key there is a white screen on a page
 * the user has already paid for.
 *
 * Everything therefore goes through this normaliser once, on the way in, from
 * both sources: whatever survives is rendered, whatever doesn't is simply not
 * rendered. There is no partially-valid state downstream.
 * ------------------------------------------------------------------------- */

type LooseRecord = Record<string, unknown>;

const isRecord = (v: unknown): v is LooseRecord => !!v && typeof v === "object" && !Array.isArray(v);

const text = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

function normalizeInsight(value: unknown): SectionInsight | null {
  if (!isRecord(value)) return null;
  const insight: SectionInsight = {
    working: text(value.working),
    missing: text(value.missing),
    suggestions: text(value.suggestions),
    collegeRelevance: text(value.collegeRelevance),
  };
  const hasAnything =
    insight.working || insight.missing || insight.suggestions || insight.collegeRelevance;
  return hasAnything ? insight : null;
}

function normalizeRating(value: unknown): Rating | null {
  if (!isRecord(value)) return null;
  const raw = value.score;
  if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
  return {
    score: Math.max(0, Math.min(10, Math.round(raw))),
    explanation: text(value.explanation),
  };
}

/** Rebuild a keyed record in canonical order, keeping unknown keys at the end. */
function orderedRecord<T>(
  source: unknown,
  order: string[],
  pick: (value: unknown) => T | null,
): Record<string, T> {
  if (!isRecord(source)) return {};
  const out: Record<string, T> = {};
  const keys = [...order.filter((k) => k in source), ...Object.keys(source).filter((k) => !order.includes(k))];
  for (const key of keys) {
    const value = pick(source[key]);
    if (value) out[key] = value;
  }
  return out;
}

function normalizeAnalysis(value: unknown): AnalysisResult | null {
  if (!isRecord(value)) return null;

  const summary = isRecord(value.overallSummary) ? value.overallSummary : {};
  const college = isRecord(value.collegeAlignmentAnalysis) ? value.collegeAlignmentAnalysis : {};

  const result: AnalysisResult = {
    profileName: text(value.profileName),
    overallSummary: {
      overview: text(summary.overview),
      strengthsAndWeaknesses: text(summary.strengthsAndWeaknesses),
      collegeAlignment: text(summary.collegeAlignment),
    },
    sectionInsights: orderedRecord(value.sectionInsights, SECTION_ORDER, normalizeInsight),
    ratings: orderedRecord(value.ratings, RATING_ORDER, normalizeRating),
    collegeAlignmentAnalysis: {
      whatCollegeLooksFor: text(college.whatCollegeLooksFor),
      whereProfileAligns: text(college.whereProfileAligns),
      whereProfileNeedsWork: text(college.whereProfileNeedsWork),
    },
    improvementPlan: (Array.isArray(value.improvementPlan) ? value.improvementPlan : [])
      .map((item): ImprovementItem | null => {
        if (!isRecord(item)) return null;
        const entry: ImprovementItem = {
          area: text(item.area),
          issue: text(item.issue),
          whyItMatters: text(item.whyItMatters),
          howToFix: text(item.howToFix),
        };
        return entry.area || entry.issue || entry.whyItMatters || entry.howToFix ? entry : null;
      })
      .filter((item): item is ImprovementItem => item !== null),
  };

  // A husk with nothing worth showing is treated as "no analysis", so the user
  // sees the upload prompt rather than a page of empty headings.
  const hasContent =
    Object.keys(result.sectionInsights).length > 0 ||
    Object.keys(result.ratings).length > 0 ||
    result.improvementPlan.length > 0 ||
    !!result.overallSummary.overview;

  return hasContent ? result : null;
}

function formatAnalyzedAt(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function RatingBadge({ score }: { score: number }) {
  const getColor = (s: number) => {
    if (s >= 8) return "bg-green-500/20 text-green-600 border-green-500/30";
    if (s >= 6) return "bg-amber-500/20 text-amber-600 border-amber-500/30";
    return "bg-red-500/20 text-red-600 border-red-500/30";
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-semibold border ${getColor(score)}`}>
      <Star className="h-3.5 w-3.5" />
      {score}/10
    </span>
  );
}

/** One labelled paragraph, rendered only when the model actually filled it in. */
function Field({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <h4 className="font-medium text-foreground mb-2">{label}</h4>
      <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{value}</p>
    </div>
  );
}

export default function LinkedInAnalysis({ onNavigateToSection }: LinkedInAnalysisProps) {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState("");
  const [hasProfilePhoto, setHasProfilePhoto] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analyzedAt, setAnalyzedAt] = useState<string | null>(null);
  const [showUploader, setShowUploader] = useState(false);
  const [confirmReanalyze, setConfirmReanalyze] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["overall"]));
  const fileInputRef = useRef<HTMLInputElement>(null);

  // `getProfile()` reads localStorage key `pathforge_profile`, which is
  // written by exactly one component — OnboardingModal — and that component
  // is imported by nothing and rendered nowhere. So getProfile() returned
  // null for every real user, and the guard below rejected every analysis
  // with "Please complete your profile first" no matter how complete the
  // profile actually was. This is why LinkedIn Analysis never ran. The real
  // profile lives in onboarding_data, via AuthContext.
  const { onboardingData } = useAuth();
  const targetCollege = onboardingData?.target_universities?.[0] || "";
  const intendedMajor = onboardingData?.intended_major || "";

  const { linkedinImport, loading: importLoading, refetch: refetchImport } = useLinkedInImport();

  const bookmarks = getBookmarks();
  useAiGenerationGuard(isAnalyzing, "LinkedIn analysis");

  // Render the analysis the user already paid for instead of billing them
  // another 2 credits to regenerate it. Hydrates at most once, from the first
  // settled read, so it can never overwrite a fresher in-page result (the
  // `refetchImport()` after a successful run would otherwise race it).
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current || importLoading) return;
    hydratedRef.current = true;

    const stored = normalizeAnalysis(linkedinImport?.analysis);
    if (!stored) return;

    setAnalysis(stored);
    setAnalyzedAt(typeof linkedinImport?.analyzed_at === "string" ? linkedinImport.analyzed_at : null);
    setExpandedSections(new Set(["overall"]));
  }, [linkedinImport, importLoading]);

  // Re-analysing does not require another upload: the imported profile text is
  // already on the account. A freshly uploaded PDF always wins over it.
  const storedProfileText = (linkedinImport?.profile_text || "").slice(0, LINKEDIN_TEXT_MAX_CHARS);
  const sourceText = extractedText || storedProfileText;
  const usingStoredProfile = !extractedText && !!storedProfileText;
  const canAnalyze = sourceText.trim().length >= MIN_PROFILE_CHARS;
  const uploaderVisible = !analysis || showUploader;

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const invalid = validateLinkedInPdf(file);
    if (invalid) {
      toast.error(invalid);
      return;
    }

    setPdfFile(file);
    setIsExtracting(true);

    try {
      // Was `await file.text()`, which decodes the PDF's raw bytes as UTF-8 —
      // i.e. it sent the binary container ("%PDF-1.7", object tables,
      // compressed streams) to the analyzer instead of the profile, and
      // usually tripped the function's 50k-character cap before the model saw
      // anything. Real text extraction via pdfjs, same as the import modal.
      const parsed = await parseLinkedInPdf(file);
      if (!parsed.trim()) {
        toast.error("Couldn't read any text from that PDF", {
          description: "Re-export from LinkedIn (More → Save to PDF) and try again.",
        });
        setPdfFile(null);
        return;
      }
      setExtractedText(parsed.slice(0, LINKEDIN_TEXT_MAX_CHARS));
      toast.success("PDF read successfully", {
        description: `${parsed.length.toLocaleString()} characters extracted. Click Analyze for your insights.`,
      });
    } catch (err) {
      console.error("PDF extraction error:", err);
      toast.error("Could not read the PDF. Please re-export from LinkedIn and try again.");
      setPdfFile(null);
    } finally {
      setIsExtracting(false);
    }
  };

  const removeFile = () => {
    setPdfFile(null);
    setExtractedText("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const runAnalysis = async () => {
    if (!canAnalyze) {
      toast.error("Please upload your LinkedIn PDF first");
      return;
    }

    if (!targetCollege || !intendedMajor) {
      toast.error("Add your target university and intended major first", {
        description: "Settings → General. They shape what this analysis is graded against.",
      });
      return;
    }

    setIsAnalyzing(true);

    try {
      const userActivities = bookmarks.map((b) => b.name);

      const result = await supabase.functions.invoke("analyze-linkedin", {
        body: {
          profileContent: sourceText,
          hasProfilePhoto,
          targetCollege,
          intendedMajor,
          userActivities,
        },
      });

      // supabase-js resolves on non-2xx with data:null, so the previous
      // `if (data?.error)` line was unreachable and every failure surfaced as
      // "Edge Function returned a non-2xx status code".
      const failure = await readEdgeError(result);
      if (failure) throw new Error(failure.message);

      const data = result.data as { analysis?: unknown; persisted?: boolean } | null;
      const normalized = normalizeAnalysis(data?.analysis);

      if (!normalized) throw new Error("No analysis received");

      notifyCreditConsumed();
      setAnalysis(normalized);
      setAnalyzedAt(new Date().toISOString());
      setShowUploader(false);
      setExpandedSections(new Set(["overall"]));
      void refetchImport();
      toast.success("Profile analysis complete", {
        description: normalized.profileName ? `Analyzed: ${normalized.profileName}` : undefined,
      });

      // The tab gate means there is always an import row to write to, so this
      // is now a genuinely exceptional case rather than a normal one: the row
      // was removed from another tab mid-session, or the write itself failed.
      // It gets a one-off warning, not a standing piece of UI for a state the
      // user can no longer walk into.
      if (data?.persisted === false) {
        toast.warning("This analysis wasn't saved to your account", {
          description: "It's on screen now but won't survive a reload. Check that your LinkedIn is still imported, then re-analyze.",
          duration: 8000,
        });
      }
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("Failed to analyze profile", {
        description: error instanceof Error ? error.message : "Please try again later.",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleNavigateToBuilder = (section: string) => {
    const builderId = sectionToBuilderMap[section];
    if (builderId) {
      onNavigateToSection(builderId);
    }
  };

  const analyzedLabel = formatAnalyzedAt(analyzedAt);
  const ratingEntries = Object.entries(analysis?.ratings ?? {});
  const insightEntries = Object.entries(analysis?.sectionInsights ?? {});
  const collegeBlock = analysis?.collegeAlignmentAnalysis;
  const hasCollegeBlock =
    !!collegeBlock &&
    (!!collegeBlock.whatCollegeLooksFor || !!collegeBlock.whereProfileAligns || !!collegeBlock.whereProfileNeedsWork);
  const summaryBlock = analysis?.overallSummary;
  const hasSummaryBlock =
    !!summaryBlock &&
    (!!summaryBlock.overview || !!summaryBlock.strengthsAndWeaknesses || !!summaryBlock.collegeAlignment);

  // Don't flash either the uploader or the locked card while we're still
  // finding out whether this account has an import.
  if (importLoading && !linkedinImport) {
    return (
      <div className="card-elevated p-12 text-center">
        <Loader2 className="h-8 w-8 text-accent animate-spin mx-auto" />
      </div>
    );
  }

  // Same gate as Grow, enforced here too and not only on the tab that leads
  // here: the analysis costs 2 credits and lives on the linkedin_imports row,
  // so with no row there is nowhere to keep it and the charge would buy
  // something that dies on the next reload.
  if (!linkedinImport) {
    return (
      <div className="card-elevated p-8 text-center">
        <Linkedin className="h-12 w-12 text-accent mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-foreground mb-2">Import your LinkedIn first</h2>
        <p className="text-muted-foreground max-w-md mx-auto mb-6">
          The analysis runs on the profile saved to your account and stores the result there, so you pay for
          it once and can read it whenever you like. Import your LinkedIn PDF to unlock it.
        </p>
        <Button
          onClick={() => { window.location.href = "/profile?section=connectors"; }}
          size="lg"
          className="btn-accent"
        >
          <Upload className="mr-2 h-4 w-4" />
          Import my LinkedIn
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Saved-analysis bar — shown once there is a result on screen, so the
          cost of getting a new one is stated before anything is clicked. */}
      {analysis && (
        <div className="card-elevated p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <h3 className="font-medium text-foreground">Saved analysis</h3>
              </div>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                {analyzedLabel ? `Analyzed ${analyzedLabel}. ` : ""}
                Viewing it again is free — you're only charged when you choose to re-analyze.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowUploader((v) => !v)}
                disabled={isAnalyzing}
              >
                <Upload className="mr-2 h-3.5 w-3.5" />
                {showUploader ? "Hide upload" : "New PDF"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmReanalyze(true)}
                disabled={isAnalyzing || isExtracting || !canAnalyze}
              >
                {isAnalyzing ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-3.5 w-3.5" />
                )}
                Re-analyze · {ANALYSIS_CREDIT_COST} credits
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Section */}
      {uploaderVisible && (
        <div className="card-elevated p-6">
          <h2 className="text-xl font-semibold text-foreground mb-2 flex items-center gap-2">
            <Search className="h-5 w-5 text-accent" />
            Analyze Your LinkedIn Profile
          </h2>
          <p className="text-muted-foreground mb-6">
            Section-by-section insights on your LinkedIn profile, graded against your target college and major.
          </p>

          {/* No upload needed when the account already holds an imported
              profile — which, past the gate above, it always does. */}
          {usingStoredProfile && !pdfFile && (
            <div className="mb-6 p-3 rounded-lg bg-accent/5 border border-accent/15 text-sm text-muted-foreground">
              We'll use the LinkedIn profile already imported to your account. Upload a PDF below only if you
              want to analyze a newer version of it.
            </div>
          )}

          {/* Step-by-step instructions */}
          <div className="mb-6 p-4 rounded-xl bg-muted/30 border border-border/50">
            <h4 className="text-sm font-semibold text-foreground mb-3">How to export your LinkedIn profile</h4>
            <div className="space-y-3">
              {[
                { step: 1, text: "Go to your LinkedIn profile page" },
                { step: 2, text: 'Click the "More" button (below your profile photo)' },
                { step: 3, text: 'Select "Save to PDF"' },
                { step: 4, text: "Upload the downloaded PDF below" },
              ].map(({ step, text }) => (
                <div key={step} className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-accent">{step}</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* PDF Upload Area */}
          <div className="mb-6">
            {pdfFile ? (
              <div className="flex items-center gap-3 p-4 rounded-xl border border-accent/20 bg-accent/5">
                <FileText className="h-8 w-8 text-accent flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{pdfFile.name}</p>
                  <p className="text-xs text-muted-foreground">{(pdfFile.size / 1024).toFixed(0)} KB · Ready to analyze</p>
                </div>
                <button
                  onClick={removeFile}
                  className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors"
                >
                  <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-accent/50 hover:bg-accent/5 transition-all group"
              >
                <Upload className="h-10 w-10 mx-auto text-muted-foreground group-hover:text-accent transition-colors mb-3" />
                <p className="text-sm font-medium text-foreground mb-1">Upload your LinkedIn PDF</p>
                <p className="text-xs text-muted-foreground">
                  Click to browse or drag & drop · PDF only, max 10MB
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {isExtracting && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              Reading PDF...
            </div>
          )}

          {/* Profile Photo Toggle */}
          {canAnalyze && (
            <div className="mb-4 p-3 rounded-lg bg-muted/30 border border-border/50">
              <label className="block text-sm font-medium text-foreground mb-2">
                Do you have a professional profile photo on LinkedIn?
              </label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="hasPhoto"
                    checked={hasProfilePhoto}
                    onChange={() => setHasProfilePhoto(true)}
                    className="text-accent"
                  />
                  <span className="text-sm text-foreground">Yes</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="hasPhoto"
                    checked={!hasProfilePhoto}
                    onChange={() => setHasProfilePhoto(false)}
                    className="text-accent"
                  />
                  <span className="text-sm text-foreground">No / Default avatar</span>
                </label>
              </div>
            </div>
          )}

          {/* Context Info */}
          {(targetCollege || intendedMajor) && (
            <div className="p-3 rounded-lg bg-muted/50 text-sm mb-4">
              <p className="text-muted-foreground">
                Analysis will be tailored for:{" "}
                <span className="font-medium text-foreground">{targetCollege || "no target university set"}</span>
                {" | "}
                Major: <span className="font-medium text-foreground">{intendedMajor || "not set"}</span>
              </p>
              {bookmarks.length > 0 && (
                <p className="text-muted-foreground mt-1">
                  Using {bookmarks.length} bookmarked activities for experience alignment.
                </p>
              )}
            </div>
          )}

          <Button
            onClick={() => (analysis ? setConfirmReanalyze(true) : runAnalysis())}
            disabled={isAnalyzing || !canAnalyze || isExtracting}
            className="btn-accent"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing Profile...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                {analysis ? "Re-analyze My Profile" : "Analyze My Profile"}
              </>
            )}
          </Button>
          {/* The edge function calls consume_credits with amount: 2. */}
          <p className="text-xs text-muted-foreground mt-3">
            Uses {ANALYSIS_CREDIT_COST} credits each time it runs. Your saved analysis stays free to read.
          </p>
          <AiGenerationNotice active={isAnalyzing} className="mt-4" />

          {/* Loading State */}
          {isAnalyzing && (
            <div className="mt-6 p-8 rounded-lg border border-border bg-muted/20 text-center">
              <Loader2 className="h-10 w-10 animate-spin mx-auto text-accent mb-4" />
              <p className="text-foreground font-medium">Analyzing your LinkedIn profile...</p>
              <p className="text-muted-foreground text-sm mt-1">
                This may take a moment as we evaluate each section.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Analysis Results */}
      {analysis && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {analysis.profileName && (
            <div className="card-elevated p-4 bg-accent/5 border-accent/20">
              <p className="text-lg font-medium text-foreground">
                Analysis for: <span className="text-accent">{analysis.profileName}</span>
              </p>
            </div>
          )}

          {/* Ratings Overview */}
          {ratingEntries.length > 0 && (
            <div className="card-elevated p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Star className="h-5 w-5 text-accent" />
                Section Ratings
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {ratingEntries.map(([key, rating]) => (
                  <div key={key} className="text-center p-3 rounded-lg bg-muted/30">
                    <div className="flex justify-center mb-2">
                      {sectionIcons[key] || <Star className="h-5 w-5 text-muted-foreground" />}
                    </div>
                    <p className="text-xs text-muted-foreground mb-1 capitalize">
                      {sectionNames[key] || key}
                    </p>
                    <RatingBadge score={rating.score} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Overall Summary */}
          {hasSummaryBlock && summaryBlock && (
            <div className="card-elevated overflow-hidden">
              <button
                onClick={() => toggleSection("overall")}
                className="w-full p-6 flex items-center justify-between hover:bg-muted/20 transition-colors"
              >
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-accent" />
                  Overall Summary
                </h3>
                {expandedSections.has("overall") ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </button>
              <AnimatePresence>
                {expandedSections.has("overall") && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6 space-y-4">
                      <Field label="Overview" value={summaryBlock.overview} />
                      <Field label="Strengths & Areas for Improvement" value={summaryBlock.strengthsAndWeaknesses} />
                      <Field label="College Fit" value={summaryBlock.collegeAlignment} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Section-by-Section Insights */}
          {insightEntries.length > 0 && (
            <div className="card-elevated overflow-hidden">
              <button
                onClick={() => toggleSection("sections")}
                className="w-full p-6 flex items-center justify-between hover:bg-muted/20 transition-colors"
              >
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <FileText className="h-5 w-5 text-accent" />
                  Section-by-Section Insights
                </h3>
                {expandedSections.has("sections") ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </button>
              <AnimatePresence>
                {expandedSections.has("sections") && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6 space-y-6">
                      {insightEntries.map(([key, insight]) => {
                        const rating = analysis.ratings[key];
                        return (
                          <div key={key} className="border-b border-border pb-6 last:border-0 last:pb-0">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium text-foreground flex items-center gap-2">
                                {sectionIcons[key]}
                                {sectionNames[key] || key}
                                {rating && <RatingBadge score={rating.score} />}
                              </h4>
                              {sectionToBuilderMap[key] && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleNavigateToBuilder(key)}
                                  className="text-xs"
                                >
                                  Improve this <ArrowRight className="ml-1 h-3 w-3" />
                                </Button>
                              )}
                            </div>

                            <div className="grid gap-3">
                              {insight.working && (
                                <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/10">
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                                    <span className="text-xs font-semibold text-green-600">What's Working</span>
                                  </div>
                                  <p className="text-sm text-muted-foreground">{insight.working}</p>
                                </div>
                              )}

                              {insight.missing && (
                                <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                                    <span className="text-xs font-semibold text-amber-600">What's Missing</span>
                                  </div>
                                  <p className="text-sm text-muted-foreground">{insight.missing}</p>
                                </div>
                              )}

                              {insight.suggestions && (
                                <div className="p-3 rounded-lg bg-accent/5 border border-accent/10">
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <Lightbulb className="h-3.5 w-3.5 text-accent" />
                                    <span className="text-xs font-semibold text-accent">Suggestions</span>
                                  </div>
                                  <p className="text-sm text-muted-foreground">{insight.suggestions}</p>
                                </div>
                              )}

                              {insight.collegeRelevance && (
                                <div className="p-3 rounded-lg bg-muted/30">
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <Target className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="text-xs font-semibold text-foreground">College Relevance</span>
                                  </div>
                                  <p className="text-sm text-muted-foreground">{insight.collegeRelevance}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* College Alignment */}
          {hasCollegeBlock && collegeBlock && (
            <div className="card-elevated overflow-hidden">
              <button
                onClick={() => toggleSection("college")}
                className="w-full p-6 flex items-center justify-between hover:bg-muted/20 transition-colors"
              >
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Target className="h-5 w-5 text-accent" />
                  College Alignment Analysis
                </h3>
                {expandedSections.has("college") ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </button>
              <AnimatePresence>
                {expandedSections.has("college") && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6 space-y-4">
                      <Field label="What This College Looks For" value={collegeBlock.whatCollegeLooksFor} />
                      <Field label="Where Your Profile Aligns" value={collegeBlock.whereProfileAligns} />
                      <Field label="Where It Needs Work" value={collegeBlock.whereProfileNeedsWork} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Improvement Plan */}
          {analysis.improvementPlan.length > 0 && (
            <div className="card-elevated overflow-hidden">
              <button
                onClick={() => toggleSection("plan")}
                className="w-full p-6 flex items-center justify-between hover:bg-muted/20 transition-colors"
              >
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-accent" />
                  Improvement Plan
                </h3>
                {expandedSections.has("plan") ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </button>
              <AnimatePresence>
                {expandedSections.has("plan") && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6 space-y-4">
                      {analysis.improvementPlan.map((item, i) => (
                        <div key={i} className="p-4 rounded-lg border border-border">
                          <div className="flex items-start gap-3">
                            <div className="h-6 w-6 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-xs font-bold text-accent">{i + 1}</span>
                            </div>
                            <div className="flex-1">
                              {item.area && <h5 className="font-medium text-foreground">{item.area}</h5>}
                              {item.issue && <p className="text-sm text-destructive mt-1">{item.issue}</p>}
                              {item.whyItMatters && (
                                <p className="text-sm text-muted-foreground mt-2">
                                  <span className="font-medium text-foreground">Why it matters:</span> {item.whyItMatters}
                                </p>
                              )}
                              {item.howToFix && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  <span className="font-medium text-foreground">How to fix:</span> {item.howToFix}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      )}

      {/* Explicit, priced opt-in. Re-analysing is the only path that spends
          credits once an analysis exists, and it never happens without this. */}
      <AlertDialog open={confirmReanalyze} onOpenChange={setConfirmReanalyze}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Re-analyze your profile?</AlertDialogTitle>
            <AlertDialogDescription>
              This runs a fresh analysis and costs {ANALYSIS_CREDIT_COST} credits, replacing the analysis you
              already have. You don't need to re-analyze just to read your current one — that's free.
              {usingStoredProfile
                ? " It will use the LinkedIn profile already imported to your account."
                : pdfFile
                  ? ` It will use the PDF you just uploaded (${pdfFile.name}).`
                  : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep my current analysis</AlertDialogCancel>
            <AlertDialogAction onClick={() => void runAnalysis()}>
              Use {ANALYSIS_CREDIT_COST} credits & re-analyze
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
