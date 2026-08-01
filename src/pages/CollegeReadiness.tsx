import { useState } from "react";
import { useDraftPersistence } from "@/hooks/useDraftPersistence";
import { notifyCreditConsumed } from "@/hooks/useCredits";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileText, Upload, Target, Sparkles, GraduationCap, Loader2, X, ChevronDown, History, Trash2, Clock, Pencil, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getMajorNames } from "@/lib/majors";
import { getCollegeNames } from "@/lib/colleges";
import { useReadinessHistory, type AnalysisResult } from "@/hooks/useReadinessHistory";
import { useAuth } from "@/contexts/AuthContext";
import { Seo } from "@/components/Seo";
import { ReadinessReport } from "@/components/readiness/ReadinessReport";
import { CollegeLogo } from "@/components/CollegeLogo";

export default function CollegeReadiness() {
  const { user } = useAuth();
  const { analyses, saveAnalysis, renameAnalysis, deleteAnalysis, loading: historyLoading } = useReadinessHistory();
  
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfText, setPdfText] = useState<string>("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(null);
  const [showGoalsForm, setShowGoalsForm] = useState(false);
  
  // Goal inputs - now using selectors
  const [intendedMajor, setIntendedMajor] = useState("");
  const [targetUniversities, setTargetUniversities] = useState<string[]>([]);
  const [shortTermGoals, setShortTermGoals] = useState("");

  // Persist goal inputs + extracted PDF text so refresh never wipes work
  useDraftPersistence(
    "college-readiness",
    { pdfText, intendedMajor, targetUniversities, shortTermGoals, showGoalsForm },
    (saved) => {
      if (saved.pdfText) setPdfText(saved.pdfText);
      if (saved.intendedMajor) setIntendedMajor(saved.intendedMajor);
      if (saved.targetUniversities) setTargetUniversities(saved.targetUniversities);
      if (saved.shortTermGoals) setShortTermGoals(saved.shortTermGoals);
      if (typeof saved.showGoalsForm === "boolean") setShowGoalsForm(saved.showGoalsForm);
    },
  );

  // Rename state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const majorOptions = getMajorNames();
  const collegeOptions = getCollegeNames();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File must be less than 10MB");
      return;
    }

    setPdfFile(file);
    setIsExtracting(true);
    setAnalysis(null);
    setShowGoalsForm(true);

    try {
      // Convert PDF to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Send to edge function for extraction
      const { data, error } = await supabase.functions.invoke("analyze-report-card", {
        body: { pdfBase64: base64, action: "extract" },
      });

      if (error) throw error;

      if (data.extractedText) {
        setPdfText(data.extractedText);
        notifyCreditConsumed();
        toast.success("Report card uploaded successfully!");
      } else {
        throw new Error("Could not extract text from PDF");
      }
    } catch (err) {
      console.error("PDF extraction error:", err);
      toast.error("Failed to process PDF. Please try again.");
      setPdfFile(null);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleAnalyze = async () => {
    if (!pdfText || !intendedMajor.trim()) {
      toast.error("Please upload a report card and select your intended major");
      return;
    }

    setIsAnalyzing(true);

    try {
      const { data, error } = await supabase.functions.invoke("analyze-report-card", {
        body: {
          action: "analyze",
          reportCardText: pdfText,
          intendedMajor: intendedMajor.trim(),
          targetUniversities: targetUniversities.join(", "),
          shortTermGoals: shortTermGoals.trim(),
        },
      });

      if (error) throw error;

      if (data.analysis) {
        setAnalysis(data.analysis);
        notifyCreditConsumed();
        toast.success("Analysis complete!");
        
        // Save to history if user is logged in
        if (user) {
          const saved = await saveAnalysis(
            intendedMajor,
            targetUniversities.join(", "),
            shortTermGoals,
            pdfText,
            data.analysis
          );
          if (saved?.id) setCurrentAnalysisId(saved.id);
        }
      } else {
        throw new Error("Analysis failed");
      }
    } catch (err) {
      console.error("Analysis error:", err);
      toast.error("Failed to analyze report card. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const removeFile = () => {
    setPdfFile(null);
    setPdfText("");
    setShowGoalsForm(false);
    setAnalysis(null);
    setCurrentAnalysisId(null);
  };

  const loadAnalysis = (savedAnalysis: typeof analyses[0]) => {
    setIntendedMajor(savedAnalysis.intended_major);
    setTargetUniversities(savedAnalysis.target_universities?.split(", ").filter(Boolean) || []);
    setShortTermGoals(savedAnalysis.short_term_goals || "");
    setAnalysis(savedAnalysis.analysis_result);
    setCurrentAnalysisId(savedAnalysis.id);
    setShowGoalsForm(true);
    if (savedAnalysis.report_card_text) {
      setPdfText(savedAnalysis.report_card_text);
    }
  };

  const getAlignmentColor = (score: string) => {
    switch (score) {
      case "Strong":
        return "text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400";
      case "Moderate":
        return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "Needs Work":
        return "text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "text-muted-foreground bg-muted";
    }
  };

  const addUniversity = (uni: string) => {
    if (!targetUniversities.includes(uni) && targetUniversities.length < 5) {
      setTargetUniversities([...targetUniversities, uni]);
    }
  };

  const removeUniversity = (uni: string) => {
    setTargetUniversities(targetUniversities.filter(u => u !== uni));
  };

  // Rename handlers
  const startRename = (id: string, currentName: string) => {
    setEditingId(id);
    setEditName(currentName);
  };

  const cancelRename = () => {
    setEditingId(null);
    setEditName("");
  };

  const confirmRename = async (id: string) => {
    if (editName.trim()) {
      await renameAnalysis(id, editName.trim());
    }
    cancelRename();
  };

  return (
    <div className="py-8 sm:py-12">
      <Seo title='College readiness analysis | Pathforge' description='Upload your report card and goals to see where you stand for top colleges and what to improve next.' path='/college-readiness' />
      <div className="section-container">
        {/* Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <motion.div
                  initial={{ rotate: -15, scale: 0.8 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 250, damping: 18, delay: 0.1 }}
                >
                  <GraduationCap className="h-8 w-8 text-accent" />
                </motion.div>
                College Readiness Analysis
              </h1>
              <motion.p
                className="mt-2 text-muted-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15, duration: 0.3 }}
              >
                Upload your report card and get personalized insights for your college goals
              </motion.p>
            </div>
            
            <div className="flex items-center gap-2">
            {/* History Button */}
            {user && (
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <History className="h-4 w-4" />
                    History
                    {analyses.length > 0 && (
                      <span className="ml-1 text-xs bg-accent/20 text-accent px-1.5 py-0.5 rounded-full">
                        {analyses.length}
                      </span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Analysis History</SheetTitle>
                    <SheetDescription>
                      View and load your past readiness analyses
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mt-6 space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto">
                    {historyLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : analyses.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <History className="h-10 w-10 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">No analyses yet</p>
                        <p className="text-xs mt-1">Complete an analysis to see it here</p>
                      </div>
                    ) : (
                      analyses.map((a) => (
                        <div
                          key={a.id}
                          className="p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              {editingId === a.id ? (
                                <div className="flex items-center gap-2 mb-2">
                                  <Input
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="h-8 text-sm"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') confirmRename(a.id);
                                      if (e.key === 'Escape') cancelRename();
                                    }}
                                  />
                                  <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="h-8 w-8"
                                    onClick={() => confirmRename(a.id)}
                                  >
                                    <Check className="h-4 w-4 text-green-500" />
                                  </Button>
                                  <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="h-8 w-8"
                                    onClick={cancelRename}
                                  >
                                    <X className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium text-foreground">{a.name}</h4>
                                  <button 
                                    onClick={() => startRename(a.id, a.name)}
                                    className="text-muted-foreground hover:text-accent"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </button>
                                </div>
                              )}
                              <p className="text-sm text-muted-foreground mt-1">
                                {a.intended_major}
                              </p>
                              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(a.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            {editingId !== a.id && (
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => loadAnalysis(a)}
                                >
                                  Load
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => deleteAnalysis(a.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            )}
            </div>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Upload & Goals */}
          <div className="space-y-6">
            {/* PDF Upload */}
            <motion.div
              className="card-elevated p-6"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            >
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-accent" />
                Upload Report Card
              </h2>

              {!pdfFile ? (
                <label className="block cursor-pointer">
                  <motion.div
                    className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-accent/50 hover:bg-accent/5 transition-all"
                    whileHover={{ scale: 1.01, borderColor: 'hsl(var(--accent))' }}
                    whileTap={{ scale: 0.99 }}
                  >
                    {isExtracting ? (
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="h-10 w-10 text-accent animate-spin" />
                        <p className="text-muted-foreground">Processing PDF...</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                        <p className="text-foreground font-medium mb-1">
                          Click to upload your report card
                        </p>
                        <p className="text-muted-foreground text-sm">
                          PDF format, up to 10MB
                        </p>
                      </>
                    )}
                  </motion.div>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isExtracting}
                  />
                </label>
              ) : (
                <div className="flex items-center justify-between p-4 bg-accent/5 rounded-lg border border-accent/20">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-accent" />
                    <div>
                      <p className="font-medium text-foreground">{pdfFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(pdfFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={removeFile}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              )}

              {/* Instructions */}
              <Collapsible className="mt-4">
                <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <ChevronDown className="h-4 w-4" />
                  Tips for best results
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 text-sm text-muted-foreground space-y-1 pl-6">
                  <p>• Ensure the PDF is clear and readable</p>
                  <p>• Include all pages with grades and subjects</p>
                  <p>• Teacher remarks help provide better insights</p>
                  <p>• Works best with standard report card formats</p>
                </CollapsibleContent>
              </Collapsible>
            </motion.div>

            {/* College Goals Form */}
            <AnimatePresence>
              {showGoalsForm && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="card-elevated p-6"
                >
                  <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Target className="h-5 w-5 text-accent" />
                    Your College Goals
                  </h2>

                  <div className="space-y-4">
                    {/* Intended Major - Dropdown */}
                    <div>
                      <Label htmlFor="major" className="text-foreground">
                        Intended Major / Field of Study *
                      </Label>
                      <Select value={intendedMajor} onValueChange={setIntendedMajor}>
                        <SelectTrigger className="mt-1.5">
                          <SelectValue placeholder="Select your intended major" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {majorOptions.map((major) => (
                            <SelectItem key={major} value={major}>
                              {major}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Target Universities - Multi-select */}
                    <div>
                      <Label className="text-foreground">
                        Target Universities (Optional, max 5)
                      </Label>
                      <Select 
                        value="" 
                        onValueChange={addUniversity}
                        disabled={targetUniversities.length >= 5}
                      >
                        <SelectTrigger className="mt-1.5">
                          <SelectValue placeholder={
                            targetUniversities.length >= 5 
                              ? "Maximum 5 universities selected" 
                              : "Add a target university"
                          } />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {collegeOptions
                            .filter(c => !targetUniversities.includes(c))
                            .map((college) => (
                              <SelectItem key={college} value={college}>
                                <span className="flex items-center gap-2">
                                  <CollegeLogo name={college} size={16} />
                                  {college}
                                </span>
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      
                      {/* Selected universities */}
                      {targetUniversities.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {targetUniversities.map((uni) => (
                            <span
                              key={uni}
                              className="inline-flex items-center gap-1.5 pl-1 pr-2 py-1 text-xs rounded-full bg-accent/10 text-accent"
                            >
                              <CollegeLogo name={uni} size={14} />
                              {uni}
                              <button
                                onClick={() => removeUniversity(uni)}
                                className="hover:text-destructive"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Short-term Goals */}
                    <div>
                      <Label htmlFor="goals" className="text-foreground">
                        Short-term Academic Goals (Next 6-12 months)
                      </Label>
                      <Textarea
                        id="goals"
                        placeholder="e.g., Improve math grades, take AP classes, join STEM club"
                        value={shortTermGoals}
                        onChange={(e) => setShortTermGoals(e.target.value)}
                        className="mt-1.5 min-h-[80px]"
                      />
                    </div>

                    <Button
                      onClick={handleAnalyze}
                      disabled={!intendedMajor.trim() || isAnalyzing}
                      className="w-full btn-accent"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Analyze My Readiness
                        </>
                      )}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Column - Analysis Results */}
          <div>
            <AnimatePresence mode="wait">
              {isAnalyzing ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="card-elevated p-8 text-center"
                >
                  <Loader2 className="h-12 w-12 text-accent animate-spin mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Analyzing Your Report Card
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Evaluating academic performance and alignment with your goals...
                  </p>
                  <Progress value={66} className="mt-6 h-2" />
                </motion.div>
              ) : analysis ? (
                <div key="results">
                  <ReadinessReport analysis={analysis} analysisId={currentAnalysisId ?? undefined} />
                </div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="card-elevated p-8 text-center"
                >
                  <GraduationCap className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Ready to Analyze
                  </h3>
                  <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                    Upload your report card and enter your college goals to receive
                    personalized insights and recommendations.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
