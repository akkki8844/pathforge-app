import { useState, useRef } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getProfile, getBookmarks } from "@/lib/storage";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { AiGenerationNotice } from "@/components/AiGenerationNotice";
import { useAiGenerationGuard } from "@/hooks/useAiGenerationGuard";

interface SectionInsight {
  content?: string;
  present?: boolean;
  working: string;
  missing: string;
  suggestions: string;
  collegeRelevance: string;
  activityAlignment?: string;
}

interface Rating {
  score: number;
  explanation: string;
}

interface AnalysisResult {
  profileName?: string;
  overallSummary: {
    overview: string;
    strengthsAndWeaknesses: string;
    collegeAlignment: string;
  };
  sectionInsights: {
    profilePhoto: SectionInsight;
    headline: SectionInsight;
    about: SectionInsight;
    experience: SectionInsight;
    skills: SectionInsight;
    posts: SectionInsight;
  };
  ratings: {
    profilePhoto: Rating;
    headline: Rating;
    about: Rating;
    experience: Rating;
    skills: Rating;
    overall: Rating;
  };
  collegeAlignmentAnalysis: {
    whatCollegeLooksFor: string;
    whereProfileAligns: string;
    whereProfileNeedsWork: string;
  };
  improvementPlan: Array<{
    area: string;
    issue: string;
    whyItMatters: string;
    howToFix: string;
  }>;
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
};

const sectionToBuilderMap: Record<string, string> = {
  headline: "headline",
  about: "about",
  experience: "experience",
  skills: "skills",
  posts: "posts",
};

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

export default function LinkedInAnalysis({ onNavigateToSection }: LinkedInAnalysisProps) {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState("");
  const [hasProfilePhoto, setHasProfilePhoto] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["overall"]));
  const fileInputRef = useRef<HTMLInputElement>(null);

  const profile = getProfile();
  const bookmarks = getBookmarks();
  useAiGenerationGuard(isAnalyzing, "LinkedIn analysis");

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

    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file", {
        description: "LinkedIn exports profiles as PDF. Follow the steps above to save yours."
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large", { description: "Maximum file size is 10MB." });
      return;
    }

    setPdfFile(file);
    setIsExtracting(true);
    setAnalysis(null);

    try {
      // Read the PDF as text (basic extraction from the file content)
      const text = await file.text();
      // For LinkedIn PDF exports, the text content is usually extractable
      // We send the raw file content to the analysis function
      setExtractedText(text);
      toast.success("PDF uploaded successfully!", { description: "Click 'Analyze' to get your profile insights." });
    } catch (err) {
      console.error("PDF extraction error:", err);
      toast.error("Could not read the PDF. Please try again.");
      setPdfFile(null);
    } finally {
      setIsExtracting(false);
    }
  };

  const removeFile = () => {
    setPdfFile(null);
    setExtractedText("");
    setAnalysis(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAnalyze = async () => {
    if (!pdfFile || !extractedText) {
      toast.error("Please upload your LinkedIn PDF first");
      return;
    }

    if (!profile?.targetCollege || !profile?.intendedMajor) {
      toast.error("Please complete your profile first", {
        description: "Set your target college and intended major in your profile settings."
      });
      return;
    }

    setIsAnalyzing(true);
    setAnalysis(null);

    try {
      const userActivities = bookmarks.map((b) => b.name);

      const { data, error } = await supabase.functions.invoke("analyze-linkedin", {
        body: {
          profileContent: extractedText,
          hasProfilePhoto,
          targetCollege: profile.targetCollege,
          intendedMajor: profile.intendedMajor,
          userActivities,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.analysis) {
        notifyCreditConsumed();
        setAnalysis(data.analysis);
        setExpandedSections(new Set(["overall"]));
        toast.success("Profile analysis complete!", {
          description: data.analysis.profileName ? `Analyzed: ${data.analysis.profileName}` : undefined
        });
      } else {
        throw new Error("No analysis received");
      }
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("Failed to analyze profile", {
        description: error instanceof Error ? error.message : "Please try again later."
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

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="card-elevated p-6">
        <h2 className="text-xl font-semibold text-foreground mb-2 flex items-center gap-2">
          <Search className="h-5 w-5 text-accent" />
          Analyze Your LinkedIn Profile
        </h2>
        <p className="text-muted-foreground mb-6">
          Upload your LinkedIn profile as a PDF for detailed, section-by-section insights tailored to your target college and major.
        </p>

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
        {pdfFile && (
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
        {profile && (
          <div className="p-3 rounded-lg bg-muted/50 text-sm mb-4">
            <p className="text-muted-foreground">
              Analysis will be tailored for: <span className="font-medium text-foreground">{profile.targetCollege}</span> | 
              Major: <span className="font-medium text-foreground">{profile.intendedMajor}</span>
            </p>
            {bookmarks.length > 0 && (
              <p className="text-muted-foreground mt-1">
                Using {bookmarks.length} bookmarked activities for experience alignment.
              </p>
            )}
          </div>
        )}

        <Button
          onClick={handleAnalyze}
          disabled={isAnalyzing || !pdfFile || isExtracting}
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
              Analyze My Profile
            </>
          )}
        </Button>
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
          <div className="card-elevated p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Star className="h-5 w-5 text-accent" />
              Section Ratings
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {Object.entries(analysis.ratings).map(([key, rating]) => (
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

          {/* Overall Summary */}
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
                    <div>
                      <h4 className="font-medium text-foreground mb-2">Overview</h4>
                      <p className="text-muted-foreground leading-relaxed">{analysis.overallSummary.overview}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground mb-2">Strengths & Areas for Improvement</h4>
                      <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {analysis.overallSummary.strengthsAndWeaknesses}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground mb-2">College Fit</h4>
                      <p className="text-muted-foreground leading-relaxed">{analysis.overallSummary.collegeAlignment}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Section-by-Section Insights */}
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
                    {Object.entries(analysis.sectionInsights).map(([key, insight]) => (
                      <div key={key} className="border-b border-border pb-6 last:border-0 last:pb-0">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-foreground flex items-center gap-2">
                            {sectionIcons[key]}
                            {sectionNames[key]}
                            <RatingBadge score={analysis.ratings[key as keyof typeof analysis.ratings]?.score || 0} />
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
                          <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/10">
                            <div className="flex items-center gap-1.5 mb-1">
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                              <span className="text-xs font-semibold text-green-600">What's Working</span>
                            </div>
                            <p className="text-sm text-muted-foreground">{insight.working}</p>
                          </div>

                          <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                            <div className="flex items-center gap-1.5 mb-1">
                              <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                              <span className="text-xs font-semibold text-amber-600">What's Missing</span>
                            </div>
                            <p className="text-sm text-muted-foreground">{insight.missing}</p>
                          </div>

                          <div className="p-3 rounded-lg bg-accent/5 border border-accent/10">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Lightbulb className="h-3.5 w-3.5 text-accent" />
                              <span className="text-xs font-semibold text-accent">Suggestions</span>
                            </div>
                            <p className="text-sm text-muted-foreground">{insight.suggestions}</p>
                          </div>

                          <div className="p-3 rounded-lg bg-muted/30">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Target className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-xs font-semibold text-foreground">College Relevance</span>
                            </div>
                            <p className="text-sm text-muted-foreground">{insight.collegeRelevance}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* College Alignment */}
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
                    <div>
                      <h4 className="font-medium text-foreground mb-2">What This College Looks For</h4>
                      <p className="text-muted-foreground leading-relaxed">{analysis.collegeAlignmentAnalysis.whatCollegeLooksFor}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground mb-2">Where Your Profile Aligns</h4>
                      <p className="text-muted-foreground leading-relaxed">{analysis.collegeAlignmentAnalysis.whereProfileAligns}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground mb-2">Where It Needs Work</h4>
                      <p className="text-muted-foreground leading-relaxed">{analysis.collegeAlignmentAnalysis.whereProfileNeedsWork}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Improvement Plan */}
          {analysis.improvementPlan && analysis.improvementPlan.length > 0 && (
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
                              <h5 className="font-medium text-foreground">{item.area}</h5>
                              <p className="text-sm text-destructive mt-1">{item.issue}</p>
                              <p className="text-sm text-muted-foreground mt-2">
                                <span className="font-medium text-foreground">Why it matters:</span> {item.whyItMatters}
                              </p>
                              <p className="text-sm text-muted-foreground mt-1">
                                <span className="font-medium text-foreground">How to fix:</span> {item.howToFix}
                              </p>
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
    </div>
  );
}
