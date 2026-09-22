import { useState } from "react";
import { useDraftPersistence } from "@/hooks/useDraftPersistence";
import { motion, AnimatePresence } from "framer-motion";
import { AnimatedCounter } from "@/components/animations/AnimatedCounter";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { fadeUp, staggerParent } from "@/lib/motion";
import { functionErrorMessage } from "@/lib/functionError";
import {
  CheckCircle2, Circle, RefreshCw, ArrowRight, Sparkles, Loader2, AlertTriangle, ThumbsUp, ThumbsDown, Wand2, BarChart3, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { essayTypes } from "@/lib/data";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { notifyTaskComplete } from "@/lib/notifyTask";
import { notifyUsageConsumed } from "@/contexts/UsageContext";
import { Seo } from "@/components/Seo";
import { AiGenerationNotice } from "@/components/AiGenerationNotice";
import { useAiGenerationGuard } from "@/hooks/useAiGenerationGuard";
import { Eyebrow, Panel, Title } from "@/components/cluely/primitives";

const checklistItems = [
  { key: "opening", label: "Strong opening hook" },
  { key: "narrative", label: "Clear, focused narrative" },
  { key: "voice", label: "Authentic personal voice" },
  { key: "impact", label: "Demonstrates impact and reflection" },
  { key: "conclusion", label: "Memorable conclusion" },
];

const tipsTopColleges = [
  "Open with a specific moment, not an abstract idea.",
  "Show growth — the version of you before vs. after.",
  "Use sensory detail sparingly but precisely.",
  "Reflect more than you describe; insight beats event.",
  "End with forward motion — what this means for what's next.",
];

const tipsMistakes = [
  "Listing achievements like a resume.",
  "Generic adjectives ('hardworking', 'passionate') with no proof.",
  "Topics that center the obstacle instead of your response to it.",
  "Trying to sound impressive instead of sounding like you.",
  "Wrapping up with a cliché ('and that's why I want to attend...').",
];

interface Analysis {
  overall_score: number;
  one_line_verdict: string;
  breakdown: {
    clarity: number;
    structure: number;
    originality: number;
    impact: number;
    storytelling: number;
  };
  did_well: string[];
  did_wrong: string[];
  how_to_improve: string[];
}

export default function Essays() {
  const [essayType, setEssayType] = useState("personal-statement");
  const [promptText, setPromptText] = useState("");
  const [originalEssay, setOriginalEssay] = useState("");
  const [refinedEssay, setRefinedEssay] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  const [isRefining, setIsRefining] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [tab, setTab] = useState("refine");
  useAiGenerationGuard(isRefining || isAnalyzing, "Essay generation");

  // Persist user-entered draft so refresh / navigation never wipes work
  useDraftPersistence(
    "essay",
    { essayType, promptText, originalEssay, refinedEssay, suggestions, checkedItems, analysis, tab },
    (saved) => {
      if (saved.essayType) setEssayType(saved.essayType);
      if (saved.promptText) setPromptText(saved.promptText);
      if (saved.originalEssay) setOriginalEssay(saved.originalEssay);
      if (saved.refinedEssay) setRefinedEssay(saved.refinedEssay);
      if (saved.suggestions) setSuggestions(saved.suggestions);
      if (saved.checkedItems) setCheckedItems(saved.checkedItems);
      if (saved.analysis) setAnalysis(saved.analysis);
      if (saved.tab) setTab(saved.tab);
    },
  );

  const toggleCheck = (key: string) => {
    setCheckedItems((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleRefine = async () => {
    if (!originalEssay.trim() || originalEssay.trim().length < 50) {
      toast.error("Please paste an essay (at least 50 characters).");
      return;
    }
    setIsRefining(true);
    try {
      const { data, error } = await supabase.functions.invoke("refine-text", {
        body: {
          section: `essay-${essayType}`,
          input: originalEssay,
          context: promptText ? `Essay prompt: ${promptText}` : undefined,
          language: localStorage.getItem("pf_language") || "en",
        },
      });
      if (error) {
        toast.error(await functionErrorMessage(error, "Failed to refine essay."));
        return;
      }
      if (data?.refined) {
        setRefinedEssay(data.refined);
        // derive lightweight suggestions client-side from diff in length & paragraph count
        const origParas = originalEssay.split(/\n\n+/).length;
        const newParas = data.refined.split(/\n\n+/).length;
        const sug: string[] = [];
        if (data.refined.length < originalEssay.length * 0.85)
          sug.push("Tightened wording — review cuts to make sure no key meaning was lost.");
        if (newParas !== origParas)
          sug.push("Paragraph structure adjusted — verify the new flow matches your intended arc.");
        sug.push("Read the refined version aloud to confirm it still sounds like you.");
        setSuggestions(sug);
        notifyUsageConsumed();
        toast.success("Essay refined.");
        void notifyTaskComplete({
          title: "Essay refinement complete",
          message: "Your refined draft is ready in the Essays workspace.",
          showToast: false,
        });
      } else if (data?.error) {
        toast.error(data.error);
      }
    } catch (e) {
      console.error(e);
      toast.error("Unexpected error.");
    } finally {
      setIsRefining(false);
    }
  };

  const handleAnalyze = async () => {
    if (!originalEssay.trim() || originalEssay.trim().length < 50) {
      toast.error("Please paste an essay (at least 50 characters).");
      return;
    }
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-essay", {
        body: { essay: originalEssay, essayType, prompt: promptText },
      });
      if (error) {
        toast.error(error.message || "Failed to analyze.");
        return;
      }
      if (data?.analysis) {
        setAnalysis(data.analysis);
        notifyUsageConsumed();
        toast.success("Analysis complete.");
        void notifyTaskComplete({
          title: "Essay analysis ready",
          message: "Pathforge AI finished evaluating your essay.",
          showToast: false,
        });
      } else if (data?.error) {
        toast.error(data.error);
      }
    } catch (e) {
      console.error(e);
      toast.error("Unexpected error.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const scoreColor = (n: number) =>
    n >= 80 ? "text-success" : n >= 60 ? "text-warning" : "text-destructive";

  return (
    <div data-cluely className="min-h-svh bg-background py-8 font-cluely sm:py-12">
      <Seo title='Essays' description='Polish your college essays with grounded AI feedback that preserves your voice — no hallucinations.' path='/essays' />
      <div className="section-container max-w-5xl">
        {/* Header */}
        <ScrollReveal className="mb-6">
          <Eyebrow>AI-assisted writing</Eyebrow>
          <h1 className="mt-2 max-w-[26ch] text-balance font-cluely text-[clamp(1.7rem,5vw,2.4rem)] font-semibold leading-[1.08] tracking-[-0.035em]">
            Essay refiner & analyzer
          </h1>
          <p className="mt-3 max-w-[52ch] text-[14px] leading-relaxed text-muted-foreground">
            Polish your essay and get an honest, structured evaluation from an admissions-trained AI.
          </p>
        </ScrollReveal>

        {/* Disclaimer */}
        <ScrollReveal delay={0.06} className="mb-8 flex gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-warning mt-0.5" />
          <p className="text-sm text-foreground">
            <strong>We do not promote plagiarism.</strong> Essays generated or refined using this tool should only be used as a reference. Submitting AI-generated or copied essays may lead to rejection by colleges.
          </p>
        </ScrollReveal>
        <AiGenerationNotice active={isRefining || isAnalyzing} className="mb-8" />

        {/* Essay metadata */}
        <motion.div
          className="grid sm:grid-cols-2 gap-4 mb-6"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Essay type</label>
            <Select value={essayType} onValueChange={setEssayType}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent className="bg-popover">
                {essayTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Prompt (optional)</label>
            <Input
              placeholder="e.g. Tell us about a challenge you overcame"
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
            />
          </div>
        </motion.div>

        {/* Essay input */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
        >
          <label className="block text-sm font-medium text-foreground mb-2">Your essay</label>
          <Textarea
            placeholder="Paste your essay here..."
            value={originalEssay}
            onChange={(e) => setOriginalEssay(e.target.value)}
            className="min-h-[240px] resize-y"
          />
          <motion.p
            className="mt-2 text-xs text-muted-foreground"
            key={originalEssay.length}
            initial={{ opacity: 0.6 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            {originalEssay.length} characters · {originalEssay.trim().split(/\s+/).filter(Boolean).length} words
          </motion.p>
        </motion.div>

        {/* Action tabs */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
        >
        <Tabs value={tab} onValueChange={setTab} className="mb-8">
          <TabsList className="grid w-full sm:w-[400px] grid-cols-2">
            <TabsTrigger value="refine"><Wand2 className="h-4 w-4 mr-2" />Refine</TabsTrigger>
            <TabsTrigger value="analyze"><BarChart3 className="h-4 w-4 mr-2" />Analyze</TabsTrigger>
          </TabsList>

          <TabsContent value="refine" className="mt-6">
            {isRefining && <AiGenerationNotice active className="mb-4" />}
            <Button onClick={handleRefine} disabled={isRefining || !originalEssay.trim()}>
              {isRefining ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Refining...</>) : (<><Sparkles className="mr-2 h-4 w-4" />Refine essay</>)}
            </Button>

            {refinedEssay && (
              <motion.div
                variants={staggerParent}
                custom={0.08}
                initial="hidden"
                animate="visible"
                className="mt-8 space-y-6"
              >
                <motion.div variants={fadeUp} className="grid md:grid-cols-2 gap-6">
                  <Panel>
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">Original</h4>
                    {/* break-words because this is arbitrary pasted text: one
                        long unbroken token (a URL, a run-on string) blows the
                        card out sideways at 320px. dark:prose-invert because
                        the prose plugin's child styles are light-mode until
                        told otherwise. */}
                    <div className="prose prose-sm dark:prose-invert break-words text-foreground whitespace-pre-wrap">
                      {originalEssay}
                    </div>
                  </Panel>
                  <Panel className="border-primary/30">
                    <h4 className="text-sm font-medium text-primary mb-3 flex items-center gap-2">
                      <PenLine className="h-4 w-4" />Refined
                    </h4>
                    <div className="prose prose-sm dark:prose-invert break-words text-foreground whitespace-pre-wrap">
                      {refinedEssay}
                    </div>
                  </Panel>
                </motion.div>

                {suggestions.length > 0 && (
                  <motion.div variants={fadeUp}>
                    <Panel>
                    <Title className="mb-3">Suggestions</Title>
                    <ul className="space-y-2">
                      {suggestions.map((s, i) => (
                        <li key={i} className="flex gap-2 text-sm text-foreground">
                          <ArrowRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                    </Panel>
                  </motion.div>
                )}

                <Button onClick={handleRefine} variant="outline" disabled={isRefining}>
                  <RefreshCw className="mr-2 h-4 w-4" />Refine again
                </Button>
              </motion.div>
            )}
          </TabsContent>

          <TabsContent value="analyze" className="mt-6">
            {isAnalyzing && <AiGenerationNotice active className="mb-4" />}
            <Button onClick={handleAnalyze} disabled={isAnalyzing || !originalEssay.trim()}>
              {isAnalyzing ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing...</>) : (<><BarChart3 className="mr-2 h-4 w-4" />Analyze essay</>)}
            </Button>

            {analysis && (
              <motion.div
                variants={staggerParent}
                custom={0.08}
                initial="hidden"
                animate="visible"
                className="mt-8 space-y-6"
              >
                {/* Overall */}
                <motion.div variants={fadeUp}>
                  <Panel className="flex flex-col sm:flex-row sm:items-center gap-6">
                  <div className="flex-shrink-0 text-center">
                    <div className={`text-5xl font-bold ${scoreColor(analysis.overall_score)}`}>
                      <AnimatedCounter target={analysis.overall_score} duration={1.2} />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Overall / 100</div>
                  </div>
                  <p className="text-foreground italic">"{analysis.one_line_verdict}"</p>
                  </Panel>
                </motion.div>

                {/* Breakdown */}
                <motion.div variants={fadeUp}>
                  <Panel>
                  <Title className="mb-4">Breakdown</Title>
                  <div className="space-y-3">
                    {Object.entries(analysis.breakdown).map(([k, v]) => (
                      <div key={k}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="capitalize text-foreground">{k}</span>
                          <span className={`font-semibold ${scoreColor(v)}`}>{v}/100</span>
                        </div>
                        <Progress value={v} className="h-2" />
                      </div>
                    ))}
                  </div>
                  </Panel>
                </motion.div>

                {/* Did well / wrong */}
                <motion.div variants={fadeUp} className="grid md:grid-cols-2 gap-6">
                  <Panel>
                    <h4 className="font-semibold text-foreground flex items-center gap-2 mb-3">
                      <ThumbsUp className="h-5 w-5 text-success" />What you did well
                    </h4>
                    <ul className="space-y-2">
                      {analysis.did_well.map((s, i) => (
                        <li key={i} className="text-sm text-foreground flex gap-2">
                          <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </Panel>
                  <Panel>
                    <h4 className="font-semibold text-foreground flex items-center gap-2 mb-3">
                      <ThumbsDown className="h-5 w-5 text-destructive" />What to fix
                    </h4>
                    <ul className="space-y-2">
                      {analysis.did_wrong.map((s, i) => (
                        <li key={i} className="text-sm text-foreground flex gap-2">
                          <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </Panel>
                </motion.div>

                {/* How to improve */}
                <motion.div variants={fadeUp}>
                  <Panel>
                  <Title className="mb-3">How to improve</Title>
                  <ol className="space-y-2 list-decimal list-inside">
                    {analysis.how_to_improve.map((s, i) => (
                      <li key={i} className="text-sm text-foreground">{s}</li>
                    ))}
                  </ol>
                  </Panel>
                </motion.div>
              </motion.div>
            )}
          </TabsContent>
        </Tabs>
        </motion.div>

        {/* Checklist + Tips. The sm step matters: 1 → 3 columns put three cards
            into ~230px each at tablet width. */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <ScrollReveal delay={0}>
            <Panel>
              <Title className="mb-4">Checklist</Title>
              <div className="space-y-3">
                {checklistItems.map((item, i) => (
                  <motion.button
                    key={item.key}
                    onClick={() => toggleCheck(item.key)}
                    // The row's height was set by a 20px icon and 14px text, so
                    // the page's only checklist had a ~24px tap target.
                    className="flex min-h-[44px] w-full items-center gap-3 py-1 text-left group"
                    initial={{ opacity: 0, x: -12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.06, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    whileHover={{ x: 3 }}
                  >
                    <AnimatePresence mode="wait">
                      {checkedItems.includes(item.key) ? (
                        <motion.div
                          key="checked"
                          initial={{ scale: 0, rotate: -90 }}
                          animate={{ scale: 1, rotate: 0 }}
                          exit={{ scale: 0, rotate: 90 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                        >
                          <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="unchecked"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                        >
                          <Circle className="h-5 w-5 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <span className={`text-sm ${checkedItems.includes(item.key) ? "text-foreground" : "text-muted-foreground"}`}>
                      {item.label}
                    </span>
                  </motion.button>
                ))}
              </div>
            </Panel>
          </ScrollReveal>

          <ScrollReveal delay={0.08}>
            <Panel>
              <Title className="mb-4">What top essays include</Title>
              <ul className="space-y-2">
                {tipsTopColleges.map((t, i) => (
                  <motion.li
                    key={i}
                    className="text-sm text-foreground flex gap-2"
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.06, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <ArrowRight className="h-4 w-4 text-primary shrink-0 mt-0.5" /><span>{t}</span>
                  </motion.li>
                ))}
              </ul>
            </Panel>
          </ScrollReveal>

          <ScrollReveal delay={0.16}>
            <Panel>
              <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
                <AlertTriangle className="h-5 w-5 text-warning" />Common mistakes
              </h3>
              <ul className="space-y-2">
                {tipsMistakes.map((t, i) => (
                  <motion.li
                    key={i}
                    className="text-sm text-foreground flex gap-2"
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.06, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <ArrowRight className="h-4 w-4 text-warning shrink-0 mt-0.5" /><span>{t}</span>
                  </motion.li>
                ))}
              </ul>
            </Panel>
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
}
